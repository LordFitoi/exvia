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
| `signup/` | `apps.users.views.SignupView` | Public self-serve registration; creates an inactive user from `username`, `email`, `password`, pending admin approval |
| `me/` | `apps.users.views.CurrentUserView` | Example protected endpoint; returns the authenticated caller's `id`, `username`, `email` and `is_staff` |
| `users/lookup/?username=` | `apps.users.views.UserLookupView` | `{id, username, avatar}` of the active user with exactly that username, `404` otherwise |
| `users/search/?q=` | `apps.users.views.UserSearchView` | `[{id, username, avatar}]`: up to 5 (`SUGGESTION_LIMIT`) active users, other than the caller, whose username starts with `q` (case-insensitive, ordered by username); a blank `q` gives `[]`. Feeds the username autocomplete of the invite dialogs |

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
and hashed through `create_user`. It does not log the user in.

- **Admin approval**: the account is created with `is_active=False`. Django's
  `ModelBackend` and simplejwt's `JWTAuthentication` both reject inactive
  users, so `token/` answers `401` until an admin approves the account. In
  the Django admin, the Users list shows `is_active` (filterable) and the
  "Approve selected accounts" action sets it to `True` for the selected
  pending users ([admin.py](../../apps/users/admin.py)). Inactive users are
  also hidden from `users/lookup/` and group invitations. Unchecking
  `is_active` in the admin remains the way to suspend an account, so a
  suspended account is indistinguishable from a pending one.

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

## Tests

`TEST_RUNNER` is `config.test_runner.FastPasswordTestRunner`, which swaps
`PASSWORD_HASHERS` for MD5 while `manage.py test` runs. The default PBKDF2
hasher costs ~0.5s per `create_user`, which made the suite take many minutes
(295 tests now run in ~20s). Production keeps the default hashers.

## Not included

- No token blacklist/logout endpoint (`rest_framework_simplejwt.token_blacklist`)
  — add it if revocation before natural expiry becomes a requirement.
- No email or push notice to admins about new requests, nor to the user on
  approval; admins review the inactive users in the admin.
- No email verification, rate limiting or CAPTCHA on signup — add them if
  the public endpoint is abused.
