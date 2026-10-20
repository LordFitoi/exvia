import asyncio
import time
from typing import Any

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.core.websocket_auth import AUTH_TIMEOUT_SECONDS, CLOSE_UNAUTHORIZED, read_user_id
from apps.routes import group_meta, group_service

MIN_POSITION_INTERVAL_SECONDS = 1
CLOSE_FORBIDDEN = 4403
PRESENCE_JOINED = 'joined'
PRESENCE_LEFT = 'left'


class RouteGroupConsumer(AsyncJsonWebsocketConsumer):
    """The live channel of one route group: riders report their position and receive everyone else's.

    The first message must be `{"type": "auth", "token": <access JWT>}`, because browsers cannot set
    headers on a websocket and a token in the URL ends up in logs. Close codes: 4401 for a missing,
    bad or late token, 4403 for a user who has not accepted the group. After `{"type": "ready",
    "user_id", "positions", "server_time"}` (the server's clock, to age the saved positions), a rider sends `{"type": "position", "lng", "lat", ...}` and everyone
    else gets `{"type": "position", "user_id", ...position}`. Everyone else also hears
    `{"type": "presence", "user_id", "status": "joined" | "left"}` when a rider signs in or drops.
    """

    user_id: int | None = None
    last_position_at = float('-inf')

    @property
    def channel_group(self) -> str:
        return f'route_group_{self.scope["url_route"]["kwargs"]["group_id"]}'

    async def connect(self) -> None:
        await self.accept()
        self.auth_deadline = asyncio.create_task(self._close_unless_authenticated())

    async def disconnect(self, code: int) -> None:
        self.auth_deadline.cancel()
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

    async def group_position(self, event: dict[str, Any]) -> None:
        """Delivers a position broadcast to the group, except to the rider who reported it."""
        if event['user_id'] != self.user_id:
            await self.send_json({'type': 'position', 'user_id': event['user_id'], **event['position']})

    async def group_presence(self, event: dict[str, Any]) -> None:
        """Delivers a rider's arrival or departure to the group, except to that rider."""
        if event['user_id'] != self.user_id:
            await self.send_json({'type': 'presence', 'user_id': event['user_id'], 'status': event['status']})

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
        await self.channel_layer.group_add(self.channel_group, self.channel_name)
        await self.send_json({
            'type': 'ready', 'user_id': user_id, 'positions': positions, 'server_time': timezone.now().isoformat(),
        })
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
        await self.channel_layer.group_send(
            self.channel_group, {'type': 'group.position', 'user_id': self.user_id, 'position': position},
        )

    async def _send_error(self, detail: str) -> None:
        await self.send_json({'type': 'error', 'detail': detail})
