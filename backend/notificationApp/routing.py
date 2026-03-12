"""
notificationApp/routing.py
─────────────────────────────────────────────────────────────────────────────
WebSocket URL patterns for the notification consumer.
─────────────────────────────────────────────────────────────────────────────
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"^ws/notifications/$", consumers.NotificationConsumer.as_asgi()),
]