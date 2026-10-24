# User Profile

Profile information attached to a user account: avatar, description, blood
type, emergency contacts and a vehicle garage, with an API under
`/api/auth/profile/` and the Profile tab of the app that shows and edits it.

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

## API

All endpoints are under `/api/auth/` and need a JWT; the caller only ever
sees and changes their own profile.

| Path | Methods | Purpose |
|------|---------|---------|
| `profile/` | `GET`, `PATCH` | The profile: `avatar` (path under `/media/`, or `null`), `description`, `blood_type`, `emergency_contacts`, `vehicles` and `completion`. `PATCH` takes JSON, or multipart when it carries the `avatar` image; contacts and vehicles are read-only here |
| `profile/contacts/` | `POST` | Adds a contact (`name`, `phone_number` required; `relationship` optional) |
| `profile/contacts/<id>/` | `GET`, `PATCH`, `DELETE` | Another user's contact is `404` |
| `profile/vehicles/` | `POST` | Adds a vehicle (`brand`, `model` required; `year`, `license_plate`, `color` optional) |
| `profile/vehicles/<id>/` | `GET`, `PATCH`, `DELETE` | Another user's vehicle is `404` |
| `users/<username>/profile/` | `GET` | What any signed-in rider sees of another rider (`SharedProfileSerializer`): `username`, `avatar`, `description` and `vehicles` without the license plate. `404` for an unknown or inactive user. Read only |

- The avatar is sent back as a relative path (`RelativeImageField`), like
  `UserBriefSerializer` does, so it resolves through the frontend's
  `/media/` proxy instead of the backend host.
- There is no endpoint to remove the photo, only to replace it.
- **Privacy of the shared profile.** Blood type, emergency contacts (their phone
  numbers belong to other people) and license plates are only ever in the
  owner's `profile/`; the shared serializer does not list them, and a test
  asserts the exact set of keys. Any signed-in rider can read the shared
  profile of any active user, so what it holds must be fine to show them all.
- Contacts and vehicles have no list endpoints: the profile already carries
  them (prefetched, two queries).

## Completion

[completion.py](../../apps/users/completion.py) `calculate_completion`
scores the profile in five equal steps, 20% each: photo, bio (not just
whitespace), blood type, at least one emergency contact and at least one
vehicle. The profile returns `completion: {percentage, missing}`, where
`missing` lists the keys left (`avatar`, `description`, `blood_type`,
`emergency_contact`, `vehicle`) in that order. It is computed on every
read, not stored, so it can never go stale.

## Frontend

The `/profile` tab ([frontend-screens.md](frontend-screens.md)) is built in
`frontend/src/views/profile/`, following the profile pattern of the style
guide ([patterns.html](../ui-ux/patterns.html)):

- **Header**: photo (initials when none) with the round edit button that
  opens the image picker and uploads at once, name and bio.
- **Actions row** under the header: **Edit profile** and **Share profile** as
  two equal soft buttons (the guide's even button row, each with an icon). Share copies
  `<origin>/profile/<username>/` to the clipboard and shows the "Link copied"
  toast (the same messages as route sharing).
- **Completion card**: "Profile N% complete", the steps left, a progress bar
  and one link for the next missing step (add a photo, write a bio, add a
  contact...) that opens the matching picker or form.
- **Blood type** (a read-only row, changed in the Edit profile sheet),
  **Garage** (sideways-scrolling vehicle cards) and
  **Emergency contacts** (call button and edit button per row). Garage and
  contacts each have an **Add** link and an empty message.
- **Edit profile** opens a sheet with the bio and blood type, which is the
  only place to change the blood type (the completion card's "Add your blood
  type" opens it too). The blood type field is the guide's compact custom
  dropdown (`DropdownField`, not the native `select`): "Not set" on a row of
  its own and the eight types in four columns, so all show without scrolling.
  The menu opens in the top layer under the field, and flips above only when
  there is no room below, as in this sheet near the bottom of the screen.
- Contacts and vehicles open their own sheet from Add or their edit button;
  editing one also offers **Delete**, which asks first.
- **Shared profile** (`/profile/<username>/`, `SharedProfileScreen`, inside the
  authenticated app group, so a signed-out visitor is sent to `/login`): the
  same header and garage components without their edit controls, a back
  button, "Rider not found" for a 404 and a retry for other failures.
  The username is URL-encoded in the link (`encodeURIComponent`), since
  usernames may contain `.`, `+` and `@`. After logging in the visitor lands
  on Home, not on the profile they were sent.
- Every save reloads the profile (`useProfile.reload`), keeping the old one
  on screen meanwhile, so the completion always comes from the server.
- `apiClient.requestJson` sends a `FormData` body as multipart (no
  `Content-Type` header, so the browser adds the boundary); everything else
  is still JSON.

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
