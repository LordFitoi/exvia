from channels.db import database_sync_to_async
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

AUTH_TIMEOUT_SECONDS = 5
CLOSE_UNAUTHORIZED = 4401


@database_sync_to_async
def read_user_id(token: object) -> int | None:
    """The id of the user an access JWT belongs to, or None when it is not a valid token."""
    if not isinstance(token, str):
        return None
    authentication = JWTAuthentication()
    try:
        return authentication.get_user(authentication.get_validated_token(token)).pk
    except (InvalidToken, AuthenticationFailed):
        return None
