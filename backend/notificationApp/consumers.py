"""
notificationApp/consumers.py
─────────────────────────────────────────────────────────────────────────────
WebSocket consumer that:
  • Authenticates the user from the JWT access token sent in the WS URL query
  • Adds the socket to two Channel groups:
      - user_{id}            → receives notifications addressed to that user
      - role_{role}          → receives broadcast notifications for that role
      - broadcast_all        → receives broadcast notifications for everyone
  • Listens for notification.send channel events and pushes them to the client
  • Handles mark-as-read messages from the client
─────────────────────────────────────────────────────────────────────────────
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db             import database_sync_to_async
from django.utils.timezone   import now
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class NotificationConsumer(AsyncWebsocketConsumer):

    # ── Connection ─────────────────────────────────────────────────────────

    async def connect(self):
        """
        Authenticate via ?token=<access_jwt> in the WS URL query string.
        Reject immediately if the token is missing or invalid.
        """
        token_str = self._get_token_from_query()
        user = await self._get_user_from_token(token_str)

        if user is None:
            await self.close(code=4001)          # 4001 = unauthorized
            return

        self.user       = user
        self.user_group = f"user_{user.id}"
        self.role_group = f"role_{user.role}"    # farmer / buyer / admin

        # Join personal group
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        # Join role-based broadcast group
        await self.channel_layer.group_add(self.role_group, self.channel_name)
        # Join "all users" broadcast group
        await self.channel_layer.group_add("broadcast_all", self.channel_name)

        await self.accept()

        # Send unread count immediately after connect
        unread = await self._get_unread_count()
        await self.send(text_data=json.dumps({
            "event":        "connected",
            "unread_count": unread,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)
        if hasattr(self, "role_group"):
            await self.channel_layer.group_discard(self.role_group, self.channel_name)
        await self.channel_layer.group_discard("broadcast_all", self.channel_name)

    # ── Messages FROM the client ────────────────────────────────────────────

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        action = data.get("action")

        if action == "mark_read":
            notif_id = data.get("notification_id")
            if notif_id:
                success = await self._mark_notification_read(notif_id)
                if success:
                    unread = await self._get_unread_count()
                    await self.send(text_data=json.dumps({
                        "event":           "marked_read",
                        "notification_id": notif_id,
                        "unread_count":    unread,
                    }))

        elif action == "mark_all_read":
            await self._mark_all_read()
            await self.send(text_data=json.dumps({
                "event":        "all_marked_read",
                "unread_count": 0,
            }))

        elif action == "fetch_notifications":
            notifications = await self._get_notifications()
            await self.send(text_data=json.dumps({
                "event":         "notifications_list",
                "notifications": notifications,
            }))

    # ── Channel Layer event handler ─────────────────────────────────────────

    async def notification_send(self, event):
        """
        Called when notification.send is dispatched to any group this
        socket belongs to.  Forwards the payload to the WebSocket client.
        """
        await self.send(text_data=json.dumps({
            "event":        "new_notification",
            "notification": event["notification"],
            "unread_count": await self._get_unread_count(),
        }))

    # ── Database helpers (run in thread pool) ──────────────────────────────

    def _get_token_from_query(self):
        query_string = self.scope.get("query_string", b"").decode()
        params = dict(p.split("=") for p in query_string.split("&") if "=" in p)
        return params.get("token")

    @database_sync_to_async
    def _get_user_from_token(self, token_str):
        if not token_str:
            return None
        try:
            token   = AccessToken(token_str)
            user_id = token["user_id"]
            from userApp.models import CustomUser
            return CustomUser.objects.get(id=user_id, is_active=True)
        except (InvalidToken, TokenError, Exception):
            return None

    @database_sync_to_async
    def _get_unread_count(self):
        from .models import Notification
        return Notification.objects.filter(
            receiver=self.user,
            status=Notification.STATUS_UNREAD,
        ).count()

    @database_sync_to_async
    def _mark_notification_read(self, notif_id):
        from .models import Notification
        updated = Notification.objects.filter(
            id=notif_id,
            receiver=self.user,
        ).update(status=Notification.STATUS_READ, read_at=now())
        return updated > 0

    @database_sync_to_async
    def _mark_all_read(self):
        from .models import Notification
        Notification.objects.filter(
            receiver=self.user,
            status=Notification.STATUS_UNREAD,
        ).update(status=Notification.STATUS_READ, read_at=now())

    @database_sync_to_async
    def _get_notifications(self):
        from .models import Notification
        from .serializers import NotificationSerializer
        notifications = Notification.objects.filter(
            receiver=self.user
        ).order_by("-created_at")[:30]
        return NotificationSerializer(notifications, many=True).data