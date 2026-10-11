# Authentication

JWT-based authentication for the API, built on `djangorestframework` and
`djangorestframework-simplejwt` rather than a hand-rolled token scheme.
Both are the standard, actively maintained community packages for this —
`djangorestframework-simplejwt` is the de facto JWT backend for DRF and
wraps `PyJWT` for the actual token encoding/verification.

## App

`apps/users` — thin wiring only, no custom models. Identity is
still `django.contrib.auth.models.User`; JWT replaces session cookies as
the transport for proving who the caller is on API requests.

## Endpoints

Mounted at `/api/auth/` (see [config/urls.py](../../config/urls.py)):

| Path | View | Purpose |
|------|------|---------|
| `token/` | `TokenObtainPairView` (simplejwt) | Exchange username/password for an access + refresh token pair |
| `token/refresh/` | `TokenRefreshView` (simplejwt) | Exchange a refresh token for a new access token |
| `token/verify/` | `TokenVerifyView` (simplejwt) | Check whether a token is still valid |
| `me/` | `apps.users.views.CurrentUserView` | Example protected endpoint; returns the authenticated caller's identity |

## Configuration

In [config/settings.py](../../config/settings.py):

- `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES` is set to
  `rest_framework_simplejwt.authentication.JWTAuthentication`, so every DRF
  view authenticates via the `Authorization: Bearer <access_token>` header
  by default.
- `REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES` defaults to
  `IsAuthenticated` — new API views require a valid token unless a view
  opts out explicitly.
- `SIMPLE_JWT` sets a 15-minute access token lifetime, a 1-day refresh
  token lifetime, and `ROTATE_REFRESH_TOKENS = True` so each refresh call
  issues a new refresh token.

## Usage

```bash
# obtain a token pair
curl -X POST http://localhost:8000/api/auth/token/ \
  -d "username=<user>&password=<password>"

# call a protected endpoint
curl http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer <access_token>"

# refresh an expired access token
curl -X POST http://localhost:8000/api/auth/token/refresh/ \
  -d "refresh=<refresh_token>"
```

## Seeding

`apps/users/management/commands/seed.py` provides the `seed`
management command, run via `make db_seed`. It is safe to run repeatedly:
each seed step checks for existing data before writing.

The first and only seed step today, `seed_admin_user`, creates a default
admin superuser (`admin` / `ChangeMe123!`, overridable via the
`SEED_ADMIN_PASSWORD` env var) if a user with that username doesn't
already exist. Future seed steps are added as another `() -> str`
function appended to the `SEEDS` tuple in that file.

## Not included

- No token blacklist/logout endpoint (`rest_framework_simplejwt.token_blacklist`)
  — add it if revocation before natural expiry becomes a requirement.
- No user registration endpoint — out of scope for this change; add it as
  its own endpoint when self-serve signup is needed.
