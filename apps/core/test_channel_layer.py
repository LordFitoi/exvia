from channels_redis.core import RedisChannelLayer
from django.conf import settings
from django.test import SimpleTestCase


class ChannelLayerSettingsTests(SimpleTestCase):
    def test_the_redis_read_timeout_outlasts_the_blocking_wait_for_a_message(self) -> None:
        """Equal timeouts end together, and an idle websocket then dies with a redis `TimeoutError`."""
        host = settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'][0]
        self.assertGreater(host['socket_timeout'], RedisChannelLayer.brpop_timeout)
