import asyncio
from typing import Any

from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.core.websocket_auth import AUTH_TIMEOUT_SECONDS, CLOSE_UNAUTHORIZED, read_user_id


def user_channel_group(user_id: int) -> str:
    return f'user_notifications_{user_id}'


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """The live channel of one user: every notification addressed to them arrives while the app is open.

    The first message must be `{"type": "auth", "token": <access JWT>}`; a missing, bad or late token
    closes with 4401. After `{"type": "ready"}` the user hears `{"type": "notification", "id", "title",
    "body"}` for each new notification. The client sends nothing else.
    """

    user_id: int | None = None

    async def connect(self) -> None:
        await self.accept()
        self.auth_deadline = asyncio.create_task(self._close_unless_authenticated())

    async def disconnect(self, code: int) -> None:
        self.auth_deadline.cancel()
        if self.user_id is not None:
            await self.channel_layer.group_discard(user_channel_group(self.user_id), self.channel_name)

    async def receive_json(self, content: Any, **kwargs: Any) -> None:
        if self.user_id is not None:
            return
        token = content.get('token') if isinstance(content, dict) and content.get('type') == 'auth' else None
        user_id = await read_user_id(token)
        if user_id is None:
            return await self.close(code=CLOSE_UNAUTHORIZED)
        self.user_id = user_id
        await self.channel_layer.group_add(user_channel_group(user_id), self.channel_name)
        await self.send_json({'type': 'ready'})

    async def notification_created(self, event: dict[str, Any]) -> None:
        """Delivers a notification broadcast to this user's group."""
        await self.send_json({'type': 'notification', **event['notification']})

    async def _close_unless_authenticated(self) -> None:
        await asyncio.sleep(AUTH_TIMEOUT_SECONDS)
        if self.user_id is None:
            await self.close(code=CLOSE_UNAUTHORIZED)
