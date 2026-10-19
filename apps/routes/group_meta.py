"""The shape of `RouteGroup.meta_json`, and the only code that reads or writes it.

```
{"version": 1,
 "participants": {"<user id>": {"status": "invited" | "accepted" | "rejected",
                                "position": null | {"lng", "lat", "heading", "speed", "accuracy", "recorded_at"}}}}
```

Only the latest position of each participant is kept, so the blob never grows. An empty `{}` is a
group nobody has joined yet.
"""
from datetime import datetime
from typing import Any

from django.core.exceptions import ValidationError
from django.db import models

from apps.routes.validators import validate_point

META_VERSION = 1
MAX_HEADING_DEGREES = 360
# Optional fields of a position and their highest allowed value (None: no ceiling); speed is km/h, accuracy metres.
OPTIONAL_POSITION_FIELDS: dict[str, float | None] = {'heading': MAX_HEADING_DEGREES, 'speed': None, 'accuracy': None}


class ParticipantStatus(models.TextChoices):
    INVITED = 'invited', 'Invited'
    ACCEPTED = 'accepted', 'Accepted'
    REJECTED = 'rejected', 'Rejected'


def clean_position(raw: object, recorded_at: datetime) -> dict[str, Any]:
    """The position a rider reported, checked and stamped with the time the server received it."""
    if not isinstance(raw, dict):
        raise ValidationError(f'A position must be an object, got {type(raw).__name__}.')
    validate_point([raw.get('lng'), raw.get('lat')])
    position: dict[str, Any] = {'lng': raw['lng'], 'lat': raw['lat']}
    for field, ceiling in OPTIONAL_POSITION_FIELDS.items():
        position[field] = _clean_optional_number(raw.get(field), field, ceiling)
    position['recorded_at'] = recorded_at.isoformat()
    return position


def _clean_optional_number(value: object, field: str, ceiling: float | None) -> float | None:
    if value is None:
        return None
    is_number = isinstance(value, (int, float)) and not isinstance(value, bool)
    if not is_number or value < 0 or (ceiling is not None and value > ceiling):
        limit = f' and at most {ceiling}' if ceiling is not None else ''
        raise ValidationError(f'The {field} must be a number of at least 0{limit}, got {value!r}.')
    return value


def validate_group_meta(value: object) -> None:
    """Accept only a `meta_json` of the shape described at the top of this module."""
    if not isinstance(value, dict):
        raise ValidationError(f'The group meta must be an object, got {type(value).__name__}.')
    if value.get('version', META_VERSION) != META_VERSION:
        raise ValidationError(f'Unknown group meta version {value["version"]!r}; expected {META_VERSION}.')
    participants = value.get('participants', {})
    if not isinstance(participants, dict):
        raise ValidationError(f'The participants must be an object, got {type(participants).__name__}.')
    for user_id, entry in participants.items():
        _validate_participant(user_id, entry)


def _validate_participant(user_id: str, entry: object) -> None:
    if not user_id.isdigit():
        raise ValidationError(f'A participant key must be a user id, got {user_id!r}.')
    if not isinstance(entry, dict):
        raise ValidationError(f'Participant {user_id} must be an object, got {type(entry).__name__}.')
    if entry.get('status') not in ParticipantStatus.values:
        raise ValidationError(f'Participant {user_id} has an unknown status {entry.get("status")!r}.')
    position = entry.get('position')
    if position is not None:
        _validate_stored_position(user_id, position)


def _validate_stored_position(user_id: str, position: object) -> None:
    recorded_at = position.get('recorded_at') if isinstance(position, dict) else None
    try:
        parsed_at = datetime.fromisoformat(recorded_at)
    except (TypeError, ValueError) as error:
        raise ValidationError(f'Participant {user_id} has a position without a valid recorded_at.') from error
    clean_position(position, parsed_at)


def set_status(meta: dict[str, Any], user_id: int, status: ParticipantStatus) -> None:
    """Records the answer of a user; a user not in the meta yet is added without a position."""
    meta.setdefault('version', META_VERSION)
    participants = meta.setdefault('participants', {})
    participants.setdefault(str(user_id), {'position': None})['status'] = status.value


def remove_participant(meta: dict[str, Any], user_id: int) -> None:
    """Forgets a user, with their status and last position; a user the meta does not know is ignored."""
    meta.get('participants', {}).pop(str(user_id), None)


def get_status(meta: dict[str, Any], user_id: int) -> ParticipantStatus | None:
    entry = meta.get('participants', {}).get(str(user_id))
    return ParticipantStatus(entry['status']) if entry else None


def set_position(meta: dict[str, Any], user_id: int, position: dict[str, Any]) -> None:
    """Replaces the latest position of a user the meta already knows; raises KeyError for any other."""
    meta['participants'][str(user_id)]['position'] = position


def get_positions(meta: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """The latest position of every participant that has reported one, by user id."""
    return {
        user_id: entry['position']
        for user_id, entry in meta.get('participants', {}).items()
        if entry.get('position') is not None
    }


def has_connected_rider(meta: dict[str, Any], excluding_user_id: int, since: datetime) -> bool:
    """Whether an accepted rider other than `excluding_user_id` reported a position at or after `since`."""
    return any(
        user_id != str(excluding_user_id)
        and entry['status'] == ParticipantStatus.ACCEPTED
        and entry.get('position') is not None
        and datetime.fromisoformat(entry['position']['recorded_at']) >= since
        for user_id, entry in meta.get('participants', {}).items()
    )
