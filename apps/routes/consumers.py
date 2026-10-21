import asyncio
import logging
import time
from typing import Any

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core.exceptions import ValidationError
from django.db import DatabaseError
from django.utils import timezone

from apps.core.websocket_auth import AUTH_TIMEOUT_SECONDS, CLOSE_UNAUTHORIZED, read_user_id
from apps.routes import group_meta, group_service
from apps.routes.live import group_channel_name

MIN_POSITION_INTERVAL_SECONDS = 1
# How often each rider is sent the positions that changed, all in one message.
POSITIONS_INTERVAL_SECONDS = 4
CLOSE_FORBIDDEN = 4403
PRESENCE_JOINED = 'joined'
PRESENCE_LEFT = 'left'

logger = logging.getLogger(__name__)


class RouteGroupConsumer(AsyncJsonWebsocketConsumer):
    """The live channel of one route group: riders report their position and receive everyone else's.

    The first message must be `{"type": "auth", "token": <access JWT>}`, because browsers cannot set
    headers on a websocket and a token in the URL ends up in logs. Close codes: 4401 for a missing,
    bad or late token, 4403 for a user who has not accepted the group. After `{"type": "ready",
    "user_id", "positions", "server_time"}` (the server's clock, to age the saved positions), a rider sends
    `{"type": "position", "lng", "lat", ...}`, which is saved and not answered. Every `POSITIONS_INTERVAL_SECONDS`
    each rider is sent one `{"type": "positions", "positions": {"<user id>": {...position}}, "server_time"}` with
    the positions of the other riders that changed since the last one, so the number of messages a rider
    receives does not grow with the size of the group; nothing is sent when nothing changed. Everyone else also hears
    `{"type": "presence", "user_id", "status": "joined" | "left"}` when a rider signs in or drops, and
    `{"type": "route_changed"}` when the leader changes the route (read the group again for the new one),
    and `{"type": "leader_changed", "user_id"}` with the new leader when the leader hands the group over.
    """

    user_id: int | None = None
    last_position_at = float('-inf')
    positions_task: asyncio.Task[None] | None = None
    # The `recorded_at` of the position of each other rider (by user id) that this rider was last sent.
    sent_recorded_at: dict[str, str]

    @property
    def channel_group(self) -> str:
        return group_channel_name(self.scope['url_route']['kwargs']['group_id'])

    async def connect(self) -> None:
        await self.accept()
        self.auth_deadline = asyncio.create_task(self._close_unless_authenticated())

    async def disconnect(self, code: int) -> None:
        self.auth_deadline.cancel()
        if self.positions_task is not None:
            self.positions_task.cancel()
        if self.user_id is not None:
            await self.channel_layer.group_discard(self.channel_group, self.channel_name)
            await self._announce_presence(PRESENCE_LEFT)

    async def receive_json(self, content: Any, **kwargs: Any) -> None:
        if not isinstance(content, dict):
            return await self._send_error('Messages must be JSON objects.')
        if self.user_id is None:
            return await self._authenticate(content)
        if content.get('type') == 'position':
            return await self._share_position(content)
        await self._send_error(f'Unknown message type {content.get("type")!r}.')

    async def group_presence(self, event: dict[str, Any]) -> None:
        """Delivers a rider's arrival or departure to the group, except to that rider."""
        if event['user_id'] != self.user_id:
            await self.send_json({'type': 'presence', 'user_id': event['user_id'], 'status': event['status']})

    async def group_route(self, event: dict[str, Any]) -> None:
        """Tells the group the leader changed its route, except the leader, who has the answer already."""
        if event['user_id'] != self.user_id:
            await self.send_json({'type': 'route_changed'})

    async def group_leader(self, event: dict[str, Any]) -> None:
        """Tells the group who leads it now, except the former leader, who has the answer already."""
        if event['user_id'] != self.user_id:
            await self.send_json({'type': 'leader_changed', 'user_id': event['leader_id']})

    async def _announce_presence(self, status: str) -> None:
        await self.channel_layer.group_send(
            self.channel_group, {'type': 'group.presence', 'user_id': self.user_id, 'status': status},
        )

    async def _close_unless_authenticated(self) -> None:
        await asyncio.sleep(AUTH_TIMEOUT_SECONDS)
        if self.user_id is None:
            await self.close(code=CLOSE_UNAUTHORIZED)

    async def _authenticate(self, content: dict[str, Any]) -> None:
        user_id = await read_user_id(content.get('token')) if content.get('type') == 'auth' else None
        if user_id is None:
            return await self.close(code=CLOSE_UNAUTHORIZED)
        group_id = self.scope['url_route']['kwargs']['group_id']
        positions = await database_sync_to_async(group_service.load_positions)(group_id, user_id)
        if positions is None:
            return await self.close(code=CLOSE_FORBIDDEN)
        self.user_id = user_id
        self.sent_recorded_at = {rider_id: position['recorded_at'] for rider_id, position in positions.items()}
        await self.channel_layer.group_add(self.channel_group, self.channel_name)
        await self.send_json({
            'type': 'ready', 'user_id': user_id, 'positions': positions, 'server_time': timezone.now().isoformat(),
        })
        self.positions_task = asyncio.create_task(self._send_positions_forever())
        await self._announce_presence(PRESENCE_JOINED)

    async def _share_position(self, content: dict[str, Any]) -> None:
        now = time.monotonic()
        if now - self.last_position_at < MIN_POSITION_INTERVAL_SECONDS:
            return
        self.last_position_at = now
        try:
            position = group_meta.clean_position(content, timezone.now())
        except ValidationError as error:
            return await self._send_error(' '.join(error.messages))
        group_id = self.scope['url_route']['kwargs']['group_id']
        if not await database_sync_to_async(group_service.save_position)(group_id, self.user_id, position):
            return await self.close(code=CLOSE_FORBIDDEN)

    async def _send_positions_forever(self) -> None:
        while True:
            await asyncio.sleep(POSITIONS_INTERVAL_SECONDS)
            try:
                if not await self._send_changed_positions():
                    return
            except DatabaseError:
                group_id = self.scope['url_route']['kwargs']['group_id']
                logger.exception('The positions of group %s could not be read', group_id)

    async def _send_changed_positions(self) -> bool:
        """Sends the other riders' positions that changed since the last time in one message, none when nothing
        changed. False, after closing the socket with 4403, when the rider no longer has a place in the group
        (the leader removed them): the riders hear it as "left"."""
        group_id = self.scope['url_route']['kwargs']['group_id']
        positions = await database_sync_to_async(group_service.load_positions)(group_id, self.user_id)
        if positions is None:
            await self.close(code=CLOSE_FORBIDDEN)
            return False
        changed = {
            rider_id: position
            for rider_id, position in positions.items()
            if rider_id != str(self.user_id) and self.sent_recorded_at.get(rider_id) != position['recorded_at']
        }
        if changed:
            self.sent_recorded_at.update({rider_id: position['recorded_at'] for rider_id, position in changed.items()})
            await self.send_json({
                'type': 'positions', 'positions': changed, 'server_time': timezone.now().isoformat(),
            })
        return True

    async def _send_error(self, detail: str) -> None:
        await self.send_json({'type': 'error', 'detail': detail})
