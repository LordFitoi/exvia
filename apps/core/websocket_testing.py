"""A small websocket test client over `asgiref`.

`channels.testing.WebsocketCommunicator` is the usual choice, but importing `channels.testing`
pulls in `daphne`, which this project does not install (the server is uvicorn).
"""
import json
from typing import Any

from asgiref.testing import ApplicationCommunicator

DEFAULT_TIMEOUT_SECONDS = 1


class WebsocketClient:
    def __init__(self, application: Any, path: str) -> None:
        scope = {'type': 'websocket', 'path': path, 'headers': [], 'subprotocols': []}
        self._communicator = ApplicationCommunicator(application, scope)

    async def connect(self) -> bool:
        """Opens the socket; True when the application accepted it."""
        await self._communicator.send_input({'type': 'websocket.connect'})
        output = await self._communicator.receive_output(DEFAULT_TIMEOUT_SECONDS)
        return output['type'] == 'websocket.accept'

    async def send_json(self, content: object) -> None:
        await self._communicator.send_input({'type': 'websocket.receive', 'text': json.dumps(content)})

    async def receive_json(self, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> Any:
        output = await self._communicator.receive_output(timeout)
        assert output['type'] == 'websocket.send', f'Expected a message, got {output}.'
        return json.loads(output['text'])

    async def receive_close_code(self, timeout: float = DEFAULT_TIMEOUT_SECONDS) -> int:
        output = await self._communicator.receive_output(timeout)
        assert output['type'] == 'websocket.close', f'Expected a close, got {output}.'
        return output['code']

    async def receive_nothing(self, timeout: float) -> bool:
        """True when nothing arrives within the timeout."""
        return await self._communicator.receive_nothing(timeout)

    async def disconnect(self) -> None:
        await self._communicator.send_input({'type': 'websocket.disconnect', 'code': 1000})
        await self._communicator.wait()
