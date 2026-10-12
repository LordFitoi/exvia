from typing import Any

from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.users.models import UserProfile


@receiver(post_save, sender=User)
def create_profile_for_new_user(
    sender: type[User], instance: User, created: bool, raw: bool, **kwargs: Any
) -> None:
    """Attach an empty profile to every newly created user (fixtures bring their own)."""
    if created and not raw:
        UserProfile.objects.create(user=instance)
