# ASGI and WebSockets

The backend runs as an ASGI app so it can serve WebSockets next to HTTP.
There are two consumers: the live channel of a route group ([route-groups.md](route-groups.md#live-channel)) and
the live notifications of a user ([notifications.md](notifications.md#live-channel)).

## Architecture

- [config/asgi.py](../../config/asgi.py) exposes a Channels
  `ProtocolTypeRouter`:
  - `http` goes to Django's ASGI handler. Views, DRF and middleware are
    unchanged; sync code runs in Django's thread pool.
  - `websocket` goes through `AllowedHostsOriginValidator` (rejects origins
    outside `ALLOWED_HOSTS`) and then a `URLRouter` over
    `websocket_urlpatterns` in [apps/core/routing.py](../../apps/core/routing.py).
- The server is `uvicorn` (`uvicorn[standard]` for `websockets`, `httptools`
  and `uvloop`) instead of gunicorn. `config/wsgi.py` and `WSGI_APPLICATION`
  were removed.
- Locally, `make run_server` runs `uvicorn config.asgi:application --reload`.
  `manage.py runserver` is WSGI-only here (no `daphne`), so it does not serve
  WebSockets.
- On Railway the `Server` start command is
  `collectstatic && uvicorn config.asgi:application --host 0.0.0.0 --port $PORT`
  ([railway.ts](../../.railway/railway.ts)). One uvicorn process per replica.
- `asgiref` moved from the `3.8.1` pin to `^3.9.0`, required by `channels`.

## Channel layer

`CHANNEL_LAYERS` in [settings.py](../../config/settings.py) uses
`channels_redis.core.RedisChannelLayer` at `REDIS_URL`, so consumers and
HTTP views can message every connection across replicas. On Railway
`REDIS_URL` references the `Redis` service ([railway.ts](../../.railway/railway.ts)).
Locally `make redis_setup` installs Redis, `make run_redis` starts it, `make stop_redis` stops it, and the Makefile exports
`REDIS_URL=redis://localhost:6379`. Like the `PG*` variables it has no
default in settings, so it must be exported.

The host is a dict with `socket_timeout` set to `REDIS_SOCKET_TIMEOUT_SECONDS` (15 s). A connection waits for its
next message with a blocking Redis read of 5 s (`brpop_timeout` of channels_redis) and redis-py 8 times out any
read after 5 s by default, so the two ended together and an idle connection (nothing in the channel layer for a
few seconds, which is normal now that positions do not go through it) died with
`redis.exceptions.TimeoutError: Timeout reading from localhost:6379`. The read timeout has to be longer than the
blocking wait; `apps/core/test_channel_layer.py` checks it.

## Through the frontend

The browser only talks to the frontend's domain ([frontend.md](frontend.md)), so the websocket goes
through Next's rewrites too: `ws` is one of the proxied prefixes in
[next.config.ts](../../frontend/next.config.ts), so `/ws/...` reaches Django's `/ws/...`. Next
forwards the upgrade: checked with a client that sends a rejected token and gets Django's own close
code `4401` back, with `next dev` and with a production build served by `next start`. No separate
public domain or `NEXT_PUBLIC_*` websocket URL is needed, and the origin check passes because
`ALLOWED_HOSTS` allows the frontend's host.

## Tests

Consumers are tested with `apps.core.websocket_testing.WebsocketClient`, a small client over
`asgiref.testing.ApplicationCommunicator`, with the in-memory channel layer
(`override_settings(CHANNEL_LAYERS=...)`) and `TransactionTestCase`, because the consumer's
database calls run in other threads. `channels.testing.WebsocketCommunicator` is not used: importing `channels.testing` requires
`daphne`, which is not installed (the server is uvicorn).

## Adding a WebSocket endpoint

1. Write a consumer in the owning app (`apps/<app>/consumers.py`).
2. Add its `path("ws/<name>/", Consumer.as_asgi())` to
   `websocket_urlpatterns`; apps contribute their own list to the one in
   `apps/core/routing.py`.

## Not decided yet

- **Reauthentication.** The first-message JWT scheme is in use
  ([route-groups.md](route-groups.md#live-channel)); a socket is not closed when the
  15-minute access token expires.
- **Unrouted paths.** `URLRouter` raises `ValueError` for a WebSocket path with
  no route, so uvicorn answers HTTP 500 (and logs a traceback) instead of a
  clean rejection.
