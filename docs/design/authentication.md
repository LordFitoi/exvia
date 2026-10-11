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
| `signup/` | `apps.users.views.SignupView` | Public self-serve registration; creates a user from `username`, `email`, `password` |
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

## Signup

`POST /api/auth/signup/` with `username`, `email` and `password` (all
required) creates a `django.contrib.auth.models.User` via
`SignupSerializer` ([serializers.py](../../apps/users/serializers.py)) and
returns `201` with `id`, `username`, `email`. The password is write-only
and hashed through `create_user`. It does not log the user in; the client
calls `token/` afterwards.

- **Public**: the view sets `AllowAny` and empty `authentication_classes`,
  so an expired or invalid `Authorization` header cannot cause a 401 on
  this endpoint.
- **Unique username**: enforced by the `UniqueValidator` that
  `ModelSerializer` derives from the model's `unique=True` field
  (case-sensitive, matching Django's default).
- **Unique email**: Django's built-in `User.email` is not unique at the
  database level, so uniqueness is checked in the serializer
  (`email__iexact`, i.e. case-insensitive). Two simultaneous requests with
  the same email could in theory both pass this check; closing that gap
  needs a custom user model with a unique email column, which was
  deliberately not introduced here (swapping `AUTH_USER_MODEL` on an
  existing project is a disruptive migration).
- **Password**: checked against `AUTH_PASSWORD_VALIDATORS` with the
  candidate username/email, so similarity checks apply. Failures are
  reported under the `password` key.

## Usage

```bash
# sign up
curl -X POST http://localhost:8000/api/auth/signup/ \
  -d "username=<user>&email=<email>&password=<password>"

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
- No email verification, rate limiting or CAPTCHA on signup — add them if
  the public endpoint is abused.
