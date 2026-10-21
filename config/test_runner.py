from django.test.runner import DiscoverRunner
from django.test.utils import override_settings

FAST_PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']


class FastPasswordTestRunner(DiscoverRunner):
    """Hash passwords with MD5 during tests; PBKDF2 costs ~0.5s per user."""

    def setup_test_environment(self, **kwargs: object) -> None:
        super().setup_test_environment(**kwargs)
        self._hasher_override = override_settings(PASSWORD_HASHERS=FAST_PASSWORD_HASHERS)
        self._hasher_override.enable()

    def teardown_test_environment(self, **kwargs: object) -> None:
        self._hasher_override.disable()
        super().teardown_test_environment(**kwargs)
