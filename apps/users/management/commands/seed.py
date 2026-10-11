import os
from collections.abc import Callable
from typing import Any

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

DEFAULT_ADMIN_USERNAME = 'admin'
DEFAULT_ADMIN_EMAIL = 'admin@example.com'
DEFAULT_ADMIN_PASSWORD = os.environ.get('SEED_ADMIN_PASSWORD', 'ChangeMe123!')


def seed_admin_user() -> str:
    """Create the default admin superuser if it doesn't already exist."""
    if User.objects.filter(username=DEFAULT_ADMIN_USERNAME).exists():
        return f"Admin user '{DEFAULT_ADMIN_USERNAME}' already exists, skipped."

    User.objects.create_superuser(
        username=DEFAULT_ADMIN_USERNAME,
        email=DEFAULT_ADMIN_EMAIL,
        password=DEFAULT_ADMIN_PASSWORD,
    )
    return f"Created admin user '{DEFAULT_ADMIN_USERNAME}'."


SEEDS: tuple[Callable[[], str], ...] = (
    seed_admin_user,
)


class Command(BaseCommand):
    help = 'Seed the database with baseline records (safe to run repeatedly).'

    def handle(self, *args: Any, **options: Any) -> None:
        for seed_fn in SEEDS:
            self.stdout.write(seed_fn())
