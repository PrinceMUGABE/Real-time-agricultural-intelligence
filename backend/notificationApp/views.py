"""
notificationApp/views.py
"""

import logging
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from userApp.models import CustomUser
from .models import Notification
from .serializers import NotificationSerializer
from .translations import nt

logger = logging.getLogger(__name__)


# ── Internal helpers ──────────────────────────────────────────────────────────

def _lang(request):
    header = request.headers.get("Accept-Language", "").strip().lower()
    if header in ("en", "fr", "sw", "rw"):
        return header
    user = getattr(request, "user", None)
    if user and user.is_authenticated:
        saved = getattr(user, "language", "")
        if saved in ("en", "fr", "sw", "rw"):
            return saved
    return "en"


def _admin_required(request, lang):
    if request.user.role != "admin":
        return Response({"error": nt("admin_required", lang)}, status=403)
    return None


def _many(qs):
    return NotificationSerializer(qs, many=True).data


def _one(obj):
    return NotificationSerializer(obj).data


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN – SEND
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_notification(request):
    """
    Admin sends a custom notification.
    Body: { title, description, audience, receiver_id? }
    """
    lang = _lang(request)
    err  = _admin_required(request, lang)
    if err:
        return err

    title       = request.data.get("title", "").strip()
    description = request.data.get("description", "").strip()
    audience    = request.data.get("audience", "").strip().lower()
    receiver_id = request.data.get("receiver_id")

    if not title:
        return Response({"error": nt("title_required", lang)}, status=400)
    if not description:
        return Response({"error": nt("description_required", lang)}, status=400)
    if audience not in ("all", "farmers", "buyers", "single"):
        return Response({"error": nt("audience_invalid", lang)}, status=400)

    try:
        if audience == "single":
            if not receiver_id:
                return Response({"error": nt("receiver_required", lang)}, status=400)
            try:
                receiver = CustomUser.objects.get(id=receiver_id)
            except CustomUser.DoesNotExist:
                return Response({"error": nt("receiver_not_found", lang)}, status=404)
            recipients = [receiver]
        elif audience == "all":
            recipients = list(CustomUser.objects.filter(is_active=True))
        elif audience == "farmers":
            recipients = list(CustomUser.objects.filter(is_active=True, role="farmer"))
        else:  # buyers
            recipients = list(CustomUser.objects.filter(is_active=True, role="buyer"))

        notifications = Notification.objects.bulk_create([
            Notification(
                sender            = request.user,
                receiver          = recipient,
                notification_type = "custom",
                audience          = audience,
                title             = title,
                description       = description,
            )
            for recipient in recipients
        ])

        return Response({
            "message":          nt("notification_sent", lang),
            "recipients_count": len(notifications),
        }, status=201)

    except Exception as exc:
        logger.exception("send_notification error: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN – READ
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_notifications(request):
    """Admin: all notifications in the system."""
    lang = _lang(request)
    err  = _admin_required(request, lang)
    if err:
        return err
    try:
        qs = Notification.objects.select_related("sender", "receiver").all()
        return Response({"notifications": _many(qs)}, status=200)
    except Exception as exc:
        logger.exception("get_all_notifications: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_sent_notifications(request):
    """Admin: notifications sent by the logged-in admin."""
    lang = _lang(request)
    err  = _admin_required(request, lang)
    if err:
        return err
    try:
        qs = Notification.objects.select_related("sender", "receiver").filter(sender=request.user)
        return Response({"notifications": _many(qs)}, status=200)
    except Exception as exc:
        logger.exception("get_sent_notifications: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)


# ══════════════════════════════════════════════════════════════════════════════
# USER INBOX
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_my_notifications(request):
    lang = _lang(request)
    try:
        qs = Notification.objects.select_related("sender", "receiver").filter(receiver=request.user)
        return Response({"notifications": _many(qs)}, status=200)
    except Exception as exc:
        logger.exception("get_my_notifications: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)
    
    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_my_unread_notifications(request):
    lang = _lang(request)
    try:
        qs = Notification.objects.select_related("sender", "receiver").filter(receiver=request.user, status="unread")
        return Response({"notifications": _many(qs)}, status=200)
    except Exception as exc:
        logger.exception("get_my_un_read_notifications: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_unread_notifications(request):
    lang = _lang(request)
    try:
        qs = Notification.objects.select_related("sender", "receiver").filter(
            receiver=request.user, status="unread"
        )
        return Response({"notifications": _many(qs)}, status=200)
    except Exception as exc:
        logger.exception("get_unread_notifications: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_read_notifications(request):
    lang = _lang(request)
    try:
        qs = Notification.objects.select_related("sender", "receiver").filter(
            receiver=request.user, status="read"
        )
        return Response({"notifications": _many(qs)}, status=200)
    except Exception as exc:
        logger.exception("get_read_notifications: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)


# ══════════════════════════════════════════════════════════════════════════════
# MARK AS READ
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    lang = _lang(request)
    try:
        try:
            n = Notification.objects.get(id=notification_id, receiver=request.user)
        except Notification.DoesNotExist:
            return Response({"error": nt("notification_not_found", lang)}, status=404)

        if n.status != "read":
            n.status  = "read"
            n.read_at = timezone.now()
            n.save(update_fields=["status", "read_at"])

        return Response({"message": nt("notification_marked_read", lang), "notification": _one(n)}, status=200)
    except Exception as exc:
        logger.exception("mark_notification_read: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    lang = _lang(request)
    try:
        updated = Notification.objects.filter(
            receiver=request.user, status="unread"
        ).update(status="read", read_at=timezone.now())
        return Response({"message": nt("all_marked_read", lang), "updated_count": updated}, status=200)
    except Exception as exc:
        logger.exception("mark_all_notifications_read: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)


# ══════════════════════════════════════════════════════════════════════════════
# DELETE
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """Only READ notifications belonging to the logged-in user may be deleted."""
    lang = _lang(request)
    try:
        try:
            n = Notification.objects.get(id=notification_id, receiver=request.user)
        except Notification.DoesNotExist:
            return Response({"error": nt("notification_not_found", lang)}, status=404)

        if n.status != "read":
            return Response({"error": nt("cannot_delete_unread", lang)}, status=400)

        n.delete()
        return Response({"message": nt("notification_deleted", lang)}, status=200)
    except Exception as exc:
        logger.exception("delete_notification: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)