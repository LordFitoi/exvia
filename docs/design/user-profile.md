# User Profile

Profile information attached to a user account: avatar, description, blood
type, emergency contacts and a vehicle garage. Models only for now: no
serializers, endpoints or admin registration exist yet.

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
  user model. Profiles are not created automatically (no signal, and signup
  does not create one); the code that first needs a profile must create it.
- **Blood type** is a closed set of eight values (`A+ ... O-`) validated
  by `full_clean()`/serializers, stored as a short string. Blank means
  "not provided".
- **Phone numbers** are free-form strings (max 32 chars); no format
  validation yet.

## Media storage

`avatar` is an `ImageField` (requires Pillow) uploading to `avatars/`
under `MEDIA_ROOT` (`<project>/media/`, git-ignored), exposed at
`MEDIA_URL` (`/media/`). In `DEBUG`, [config/urls.py](../../config/urls.py)
serves it through Django.

Local filesystem storage is **not durable on Railway**: the container
disk is wiped on each deploy. Before relying on avatars in production,
attach a Railway volume mounted at `MEDIA_ROOT` or switch the default
storage to an object store (S3-compatible, via `django-storages`).
Outside `DEBUG`, something other than Django must serve `/media/`.
