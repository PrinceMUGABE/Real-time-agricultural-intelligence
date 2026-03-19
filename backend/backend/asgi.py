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
from chatApp import routing as chat_routing
from notificationApp import routing as notification_routing

# Initialize Django ASGI application early to ensure AppRegistry is populated
django_asgi_app = get_asgi_application()




print("=" * 50)
print("INITIALIZING ASGI APPLICATION WITH WEB SOCKETS")
print("=" * 50)

# Combine WebSocket URL patterns from both apps
websocket_urlpatterns = []

# Add chatApp WebSocket patterns
try:
    websocket_urlpatterns += chat_routing.websocket_urlpatterns
    print(f"✅ Added {len(chat_routing.websocket_urlpatterns)} chatApp WebSocket patterns")
except AttributeError as e:
    print(f"❌ Error loading chatApp routing: {e}")

# Add assistanceApp WebSocket patterns
try:
    websocket_urlpatterns += notification_routing.websocket_urlpatterns
    print(f"✅ Added {len(notification_routing.websocket_urlpatterns)} notificationApp WebSocket patterns")
except AttributeError as e:
    print(f"❌ Error loading notificationApp routing: {e}")

print(f"\n📋 TOTAL WebSocket patterns: {len(websocket_urlpatterns)}")
for i, pattern in enumerate(websocket_urlpatterns, 1):
    print(f"  {i}. {pattern.pattern}")

print("=" * 50)

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})


