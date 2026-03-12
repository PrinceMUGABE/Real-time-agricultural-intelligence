"""
notificationApp/notification_service.py
─────────────────────────────────────────────────────────────────────────────
Call these functions from anywhere in your Django code (views, signals,
management commands, Celery tasks) to create a notification AND push it
in real-time to connected WebSocket clients.

Usage examples
──────────────
from notificationApp.notification_service import (
    notify_user,
    notify_broadcast,
    notify_system,
)

# Direct notification to a specific user
notify_user(
    receiver   = farmer_user,
    title      = "Your contract was approved",
    description= "Contract #0042 has been approved by the buyer.",
    sender     = admin_user,        # optional
)

# Broadcast to all farmers
notify_broadcast(
    audience   = "farmers",
    title      = "New market prices available",
    description= "Check the latest commodity prices.",
    sender     = admin_user,
)

# System notification (no sender) to a specific user
notify_system(
    receiver   = user,
    title      = "Welcome to FMMROP",
    description= "Your account has been verified.",
)
─────────────────────────────────────────────────────────────────────────────
"""

from asgiref.sync      import async_to_sync
from channels.layers   import get_channel_layer
from .models           import Notification
from .serializers      import NotificationSerializer


def _push_to_channel(group_name: str, notification: Notification):
    """
    Push a serialized notification to a channel-layer group.
    Safe to call from synchronous Django code.
    """
    channel_layer = get_channel_layer()
    payload = NotificationSerializer(notification).data
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type":         "notification.send",   # maps to consumer.notification_send()
            "notification": payload,
        },
    )


# ── Public helpers ─────────────────────────────────────────────────────────

def notify_user(receiver, title: str, description: str, sender=None) -> Notification:
    """
    Create a direct notification for a single user and push it via WebSocket.
    """
    notif = Notification.objects.create(
        notification_type = Notification.TYPE_DIRECT,
        sender            = sender,
        receiver          = receiver,
        title             = title,
        description       = description,
    )
    _push_to_channel(f"user_{receiver.id}", notif)
    return notif


def notify_broadcast(
    audience: str,
    title: str,
    description: str,
    sender=None,
) -> Notification:
    """
    Create a broadcast notification and push it to all connected users
    in the target audience group.

    audience choices: 'all' | 'farmers' | 'buyers' | 'admins'
    """
    notif = Notification.objects.create(
        notification_type = Notification.TYPE_BROADCAST,
        sender            = sender,
        receiver          = None,           # no single receiver for broadcasts
        audience          = audience,
        title             = title,
        description       = description,
    )

    # Map audience → channel group name
    group_map = {
        Notification.AUDIENCE_ALL:     "broadcast_all",
        Notification.AUDIENCE_FARMERS: "role_farmer",
        Notification.AUDIENCE_BUYERS:  "role_buyer",
        Notification.AUDIENCE_ADMINS:  "role_admin",
    }
    group = group_map.get(audience, "broadcast_all")
    _push_to_channel(group, notif)
    return notif


def notify_system(receiver, title: str, description: str) -> Notification:
    """
    Create a system notification (no sender) for a specific user.
    """
    notif = Notification.objects.create(
        notification_type = Notification.TYPE_SYSTEM,
        sender            = None,
        receiver          = receiver,
        title             = title,
        description       = description,
    )
    _push_to_channel(f"user_{receiver.id}", notif)
    return notif