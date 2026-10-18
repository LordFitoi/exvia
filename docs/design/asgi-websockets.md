# ASGI and WebSockets

The backend runs as an ASGI app so it can serve WebSockets next to HTTP.
No consumer exists yet; this is the groundwork.

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

## Adding a WebSocket endpoint

1. Write a consumer in the owning app (`apps/<app>/consumers.py`).
2. Add its `path("ws/<name>/", Consumer.as_asgi())` to
   `websocket_urlpatterns`; apps contribute their own list to the one in
   `apps/core/routing.py`.

## Not decided yet

- **Authentication.** The API uses JWT in the `Authorization` header, which
  browsers cannot set on a WebSocket. A consumer needs its own scheme (a
  short-lived token in the query string or first message).
- **Frontend proxy.** The browser reaches the backend through Next rewrites
  ([frontend.md](frontend.md)). Whether `next start` forwards WebSocket
  upgrades through them is unverified; the fallback is exposing the backend
  on its own public domain.
- **Unrouted paths.** `URLRouter` raises `ValueError` for a WebSocket path with
  no route, so uvicorn answers HTTP 500 (and logs a traceback) instead of a
  clean rejection.
