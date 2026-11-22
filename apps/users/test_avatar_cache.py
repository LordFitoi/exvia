import importlib
import tempfile
from pathlib import Path

from django.test import SimpleTestCase, override_settings
from django.urls import clear_url_caches

import config.urls
from apps.users.models import AVATAR_UPLOAD_DIR


class AvatarCacheHeaderTests(SimpleTestCase):
    """Avatars are served long-lived (`DEBUG` serves media); other uploads keep the default headers."""

    def setUp(self) -> None:
        media = tempfile.TemporaryDirectory()
        self.addCleanup(media.cleanup)
        self.media_root = Path(media.name)
        for folder in (AVATAR_UPLOAD_DIR, 'clans/'):
            (self.media_root / folder).mkdir()
            (self.media_root / folder / 'a.jpg').write_bytes(b'image')
        # Cleanups run last in, first out: the settings go back first, then the URLs are rebuilt from them.
        self.addCleanup(self.reload_urls)
        settings_override = override_settings(DEBUG=True, MEDIA_ROOT=self.media_root, ROOT_URLCONF='config.urls')
        settings_override.enable()
        self.addCleanup(settings_override.disable)
        self.reload_urls()

    def reload_urls(self) -> None:
        importlib.reload(config.urls)
        clear_url_caches()

    def test_avatar_is_cached_for_a_year_and_marked_immutable(self) -> None:
        response = self.client.get('/media/avatars/a.jpg')
        self.assertEqual(response.status_code, 200)
        cache_header = response.headers['Cache-Control']
        self.assertIn('max-age=31536000', cache_header)
        self.assertIn('immutable', cache_header)
        self.assertIn('public', cache_header)

    def test_other_media_has_no_long_cache(self) -> None:
        response = self.client.get('/media/clans/a.jpg')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('immutable', response.headers.get('Cache-Control', ''))
