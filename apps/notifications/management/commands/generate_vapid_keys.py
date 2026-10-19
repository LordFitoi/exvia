from base64 import urlsafe_b64encode
from typing import Any

from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from django.core.management.base import BaseCommand
from py_vapid import Vapid

PRIVATE_KEY_BYTES = 32


def _encode(raw: bytes) -> str:
    return urlsafe_b64encode(raw).rstrip(b'=').decode()


def generate_vapid_keys() -> tuple[str, str]:
    """A new (public key, private key) pair, each URL-safe base64: the public key as the browser wants
    it (`applicationServerKey`), the private one as `webpush` accepts it."""
    vapid = Vapid()
    vapid.generate_keys()
    private_value = vapid.private_key.private_numbers().private_value.to_bytes(PRIVATE_KEY_BYTES, 'big')
    public_point = vapid.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    return _encode(public_point), _encode(private_value)


class Command(BaseCommand):
    help = 'Prints a new VAPID key pair for Web Push; keep the private key secret.'

    def handle(self, *args: Any, **options: Any) -> None:
        public_key, private_key = generate_vapid_keys()
        self.stdout.write(f'VAPID_PUBLIC_KEY={public_key}')
        self.stdout.write(f'VAPID_PRIVATE_KEY={private_key}')
