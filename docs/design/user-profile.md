# User Profile

Profile information attached to a user account: avatar, description, blood
type, emergency contacts and a vehicle garage. Models and Django admin only
for now: no serializers or endpoints exist yet.

## Base model

`apps.core.models.TimeStampedModel` ([models.py](../../apps/core/models.py))
is an abstract model adding `created_at` (`auto_now_add`) and `updated_at`
(`auto_now`). Every model in the project that needs timestamps inherits
from it; `apps.core` is registered in `INSTALLED_APPS` but owns no tables.

## Data model

All models live in [apps/users/models.py](../../apps/users/models.py) and
inherit `TimeStampedModel`.

| Model | Fields | Relation |
|-------|--------|----------|
| `UserProfile` | `avatar` (image, optional), `description` (text, optional), `blood_type` (choices `BloodType`, optional) | `OneToOne` to `auth.User`, `related_name='profile'` |
| `Contact` | `name`, `phone_number`, `relationship` (optional) | `ForeignKey` to `UserProfile`, `related_name='emergency_contacts'` |
| `Vehicle` | `brand`, `model`, `year` (optional), `license_plate` (optional), `color` (optional) | `ForeignKey` to `UserProfile`, `related_name='vehicles'` |

`UserProfile` exposes the one-to-many relations as `emergency_contacts`
and `vehicles`. Django only allows the `ForeignKey` on the "many" side, so
the owning fields are `Contact.profile` and `Vehicle.profile`; the reverse
managers are declared as type-annotated attributes on `UserProfile` so the
relations are visible in the model (annotations only, no extra fields or
migrations).

Deleting a user cascades to their profile, and deleting a profile cascades
to its contacts and vehicles.

## Key decisions

- **`Vehicle`, not `Vehicles`**: Django model names are singular; the
  admin and querysets pluralize automatically.
- **Profile is separate from `User`**: the project uses Django's built-in
  `User`, so profile data hangs off a one-to-one instead of replacing the
  user model. Every user always has a profile (see "Profile creation").
- **Blood type** is a closed set of eight values (`A+ ... O-`) validated
  by `full_clean()`/serializers, stored as a short string. Blank means
  "not provided".
- **Phone numbers** are free-form strings (max 32 chars); no format
  validation yet.

## Profile creation

A `post_save` receiver on `User`
([signals.py](../../apps/users/signals.py), connected in
`UsersConfig.ready`) creates an empty `UserProfile` whenever a user is
created, whatever the entry point: the signup endpoint, `createsuperuser`,
the `seed` command, the admin or `User.objects.create_user`. It ignores
updates and `raw` saves (fixtures such as `loaddata` carry their own
profile rows).

Migration `0003_backfill_user_profiles` gives a profile to users that
existed before the signal. It is idempotent and its reverse is a no-op.

Caveats: `bulk_create` on `User` does not fire `post_save`, so it bypasses
the signal; call it only if profiles are created separately.

## Media storage

`avatar` is an `ImageField` (requires Pillow) uploading to `avatars/`
under `MEDIA_ROOT`, exposed at `MEDIA_URL` (`/media/`). `MEDIA_ROOT` is read
from the `MEDIA_ROOT` environment variable and defaults to `<project>/media/`
(git-ignored) locally. In `DEBUG`, [config/urls.py](../../config/urls.py)
serves it through Django.

On Railway the container disk is wiped on each deploy, so `Server` mounts
the `media-volume` volume at `/data/media` and sets `MEDIA_ROOT` to that path
([railway.ts](../../.railway/railway.ts), see
[frontend.md](frontend.md#deployment-railway)). Uploads survive redeploys.
The frontend proxies `/media/...` to Django; Django serves it only while
`DEBUG` is on, so turning `DEBUG` off in production needs a different way to
serve `/media/` first.

## Admin

[apps/users/admin.py](../../apps/users/admin.py) wires the profile data
into Django admin. The dashboard shows a "Users" section (Profiles)
next to Django's own "Authentication and Authorization" section (Users and
Groups).

- `UserProfile.Meta` sets `verbose_name = 'Profile'` and
  `verbose_name_plural = 'Profiles'`, so the admin shows "Profiles" instead
  of Django's default "User profiles". This is a model option, so it has
  its own migration (`0002`), with no schema change.
- `UserProfile` is registered with `Contact` and `Vehicle` as tabular
  inlines, since they only make sense in the context of a profile. The list
  shows user, blood type and timestamps, filters by blood type and searches
  by username, email and description. The user is picked with
  `autocomplete_fields` and the timestamps are read-only.
- The stock `User` admin is replaced by `ProfileUserAdmin` (a `UserAdmin`
  subclass) with `UserProfile` as a stacked inline, so a profile can be
  edited from the user page. The inline is hidden on the add form, since
  the profile is created by the signal when the user is saved.

## Runtime requirements

Django is pinned to the 5.2 LTS line (`~5.2`). The previous pin (5.0.6)
crashed on every admin page that uses an inclusion tag (user list, change
and add forms) when run on Python 3.14: `Context.__copy__` raised
`AttributeError`. 5.2 supports Python 3.10 to 3.14, so it works with both
the local 3.14 venv and the 3.11 in [runtime.txt](../../runtime.txt).
