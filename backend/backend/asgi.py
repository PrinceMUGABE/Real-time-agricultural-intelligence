"""
fmmrop/asgi.py
─────────────────────────────────────────────────────────────────────────────
Routes:
  • HTTP          → Django ASGI application  (all existing REST API endpoints)
  • ws/notifications/ → NotificationConsumer
─────────────────────────────────────────────────────────────────────────────
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "fmmrop.settings")
django.setup()

from channels.auth     import AuthMiddlewareStack
from channels.routing  import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi  import get_asgi_application

from notificationApp.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    # ── Standard HTTP (all your DRF views stay exactly as-is) ──────────────
    "http": get_asgi_application(),

    # ── WebSocket ───────────────────────────────────────────────────────────
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})