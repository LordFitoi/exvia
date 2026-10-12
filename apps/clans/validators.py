from urllib.parse import urlparse

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator

ALLOWED_SOCIAL_HOSTS = frozenset({
    'wa.me',
    'whatsapp.com',
    'chat.whatsapp.com',
    'instagram.com',
})
WWW_PREFIX = 'www.'

_url_validator = URLValidator(schemes=['http', 'https'])


def validate_social_links(value: object) -> None:
    """Accept only a list of valid WhatsApp or Instagram URLs."""
    if not isinstance(value, list):
        raise ValidationError(f'Social links must be a list of URLs, got {type(value).__name__}.')
    for link in value:
        _validate_social_link(link)


def _validate_social_link(link: object) -> None:
    if not isinstance(link, str):
        raise ValidationError(f'Social link must be a string, got {link!r}.')
    _url_validator(link)
    host = (urlparse(link).hostname or '').removeprefix(WWW_PREFIX)
    if host not in ALLOWED_SOCIAL_HOSTS:
        allowed = ', '.join(sorted(ALLOWED_SOCIAL_HOSTS))
        raise ValidationError(f'Social link {link!r} is not allowed. Allowed hosts: {allowed}.')
