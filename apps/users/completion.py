from typing import TypedDict

from apps.users.models import UserProfile

PERCENT = 100


class ProfileCompletion(TypedDict):
    percentage: int
    missing: list[str]


def calculate_completion(profile: UserProfile) -> ProfileCompletion:
    """How much of the profile is filled in: five equal steps, each done or missing.
    `missing` lists the keys of the steps left, in the order the profile asks for them."""
    steps = {
        'avatar': bool(profile.avatar),
        'description': bool(profile.description.strip()),
        'blood_type': bool(profile.blood_type),
        'emergency_contact': bool(profile.emergency_contacts.all()),
        'vehicle': bool(profile.vehicles.all()),
    }
    missing = [step for step, is_done in steps.items() if not is_done]
    done_count = len(steps) - len(missing)
    return {'percentage': round(PERCENT * done_count / len(steps)), 'missing': missing}
