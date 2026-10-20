"""Tells the riders connected to a group that something about it changed, through its websocket."""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)


def group_channel_name(group_id: object) -> str:
    return f'route_group_{group_id}'


def broadcast_route_change(group_id: object, user_id: int) -> None:
    """Best effort: a rider who is not connected finds the new route when they read the group again.
    `user_id` is the leader who changed it; their own channel is not told."""
    try:
        async_to_sync(get_channel_layer().group_send)(
            group_channel_name(group_id), {'type': 'group.route', 'user_id': user_id},
        )
    except (OSError, RedisError) as error:
        logger.warning('The route change of group %s could not be sent: %s', group_id, error)


def broadcast_leader_change(group_id: object, user_id: int, leader_id: int) -> None:
    """Best effort: a rider who is not connected finds the new leader when they read the group again.
    `user_id` is the former leader who handed the group over; their own channel is not told."""
    try:
        async_to_sync(get_channel_layer().group_send)(
            group_channel_name(group_id), {'type': 'group.leader', 'user_id': user_id, 'leader_id': leader_id},
        )
    except (OSError, RedisError) as error:
        logger.warning('The new leader of group %s could not be sent: %s', group_id, error)
