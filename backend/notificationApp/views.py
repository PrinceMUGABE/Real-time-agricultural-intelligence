"""
notificationApp/views.py
"""

import logging
from django.utils import timezone
from django.db.models import Q, Count

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


def _paginate(request, qs):
    """
    Apply pagination to a queryset and return (page_qs, total, total_pages).
    Query params: page (default 1), page_size (default 10, max 100).
    """
    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except (ValueError, TypeError):
        page = 1

    try:
        page_size = min(100, max(1, int(request.query_params.get("page_size", 10))))
    except (ValueError, TypeError):
        page_size = 10

    total       = qs.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    page        = min(page, total_pages)          # clamp to valid range
    offset      = (page - 1) * page_size

    return qs[offset : offset + page_size], total, total_pages, page, page_size


def _apply_filters(request, qs):
    """
    Apply type / status / audience / search / date-range filters to a queryset.
    All params are optional query-string values.
    """
    # ── type filter ──────────────────────────────────────────────────────────
    ntype = request.query_params.get("type", "").strip().lower()
    if ntype in ("system", "broadcast", "direct", "custom"):
        qs = qs.filter(notification_type=ntype)

    # ── status filter ────────────────────────────────────────────────────────
    status = request.query_params.get("status", "").strip().lower()
    if status in ("read", "unread"):
        qs = qs.filter(status=status)

    # ── audience filter ──────────────────────────────────────────────────────
    audience = request.query_params.get("audience", "").strip().lower()
    if audience in ("all", "farmers", "buyers", "admins"):
        qs = qs.filter(audience=audience)

    # ── full-text search (title or description) ──────────────────────────────
    search = request.query_params.get("search", "").strip()
    if search:
        qs = qs.filter(
            Q(title__icontains=search) | Q(description__icontains=search)
        )

    # ── date range ───────────────────────────────────────────────────────────
    start_date = request.query_params.get("start_date", "").strip()
    end_date   = request.query_params.get("end_date",   "").strip()
    if start_date:
        try:
            qs = qs.filter(created_at__date__gte=start_date)
        except Exception:
            pass   # ignore malformed dates
    if end_date:
        try:
            qs = qs.filter(created_at__date__lte=end_date)
        except Exception:
            pass

    return qs


def _apply_sort(request, qs):
    """
    Apply ordering.  sort_by: created_at | title | status | notification_type
    sort_dir: asc | desc  (default: desc)
    """
    ALLOWED_SORT_FIELDS = {
        "created_at":        "created_at",
        "title":             "title",
        "status":            "status",
        "notification_type": "notification_type",
    }
    sort_by  = request.query_params.get("sort_by",  "created_at").strip().lower()
    sort_dir = request.query_params.get("sort_dir", "desc").strip().lower()

    field  = ALLOWED_SORT_FIELDS.get(sort_by, "created_at")
    prefix = "" if sort_dir == "asc" else "-"
    return qs.order_by(f"{prefix}{field}")


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
# ADMIN – READ (with pagination, filtering, sorting)
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_notifications(request):
    """
    Admin: all notifications in the system.

    Query params (all optional):
      page        int   – page number, default 1
      page_size   int   – rows per page, default 10, max 100
      type        str   – system | broadcast | direct | custom
      status      str   – read | unread
      audience    str   – all | farmers | buyers | admins
      search      str   – searches title and description (case-insensitive)
      start_date  date  – YYYY-MM-DD  lower bound on created_at
      end_date    date  – YYYY-MM-DD  upper bound on created_at
      sort_by     str   – created_at | title | status | notification_type
      sort_dir    str   – asc | desc  (default desc)
    """
    lang = _lang(request)
    err  = _admin_required(request, lang)
    if err:
        return err

    try:
        qs = Notification.objects.select_related("sender", "receiver").all()

        # Apply filters → sort → paginate  (order matters)
        qs = _apply_filters(request, qs)
        qs = _apply_sort(request, qs)
        page_qs, total, total_pages, page, page_size = _paginate(request, qs)

        return Response({
            "notifications": _many(page_qs),
            "total":         total,
            "total_pages":   total_pages,
            "page":          page,
            "page_size":     page_size,
        }, status=200)

    except Exception as exc:
        logger.exception("get_all_notifications: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_sent_notifications(request):
    """Admin: notifications sent by the logged-in admin (paginated)."""
    lang = _lang(request)
    err  = _admin_required(request, lang)
    if err:
        return err

    try:
        qs = (
            Notification.objects
            .select_related("sender", "receiver")
            .filter(sender=request.user)
        )
        qs = _apply_filters(request, qs)
        qs = _apply_sort(request, qs)
        page_qs, total, total_pages, page, page_size = _paginate(request, qs)

        return Response({
            "notifications": _many(page_qs),
            "total":         total,
            "total_pages":   total_pages,
            "page":          page,
            "page_size":     page_size,
        }, status=200)

    except Exception as exc:
        logger.exception("get_sent_notifications: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN – STATS  (new endpoint – GET /notifications/stats/)
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_notification_stats(request):
    """
    Admin: aggregated counts across ALL notifications.

    Returns:
      { total, unread, read, system, broadcast, direct, custom }
    """
    lang = _lang(request)
    err  = _admin_required(request, lang)
    if err:
        return err

    try:
        qs = Notification.objects.all()

        # Single-query aggregation for status counts
        status_counts = (
            qs.values("status")
              .annotate(count=Count("id"))
        )
        status_map = {row["status"]: row["count"] for row in status_counts}

        # Single-query aggregation for type counts
        type_counts = (
            qs.values("notification_type")
              .annotate(count=Count("id"))
        )
        type_map = {row["notification_type"]: row["count"] for row in type_counts}

        total = qs.count()

        return Response({
            "total":     total,
            "unread":    status_map.get("unread", 0),
            "read":      status_map.get("read",   0),
            "system":    type_map.get("system",    0),
            "broadcast": type_map.get("broadcast", 0),
            "direct":    type_map.get("direct",    0),
            "custom":    type_map.get("custom",    0),
        }, status=200)

    except Exception as exc:
        logger.exception("get_notification_stats: %s", exc)
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
        qs = Notification.objects.select_related("sender", "receiver").filter(
            receiver=request.user, status="unread"
        )
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


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """
    Mark all notifications as read.
    - Regular users: marks all their unread notifications.
    - Admin users:   marks ALL unread notifications in the system.
    """
    lang = _lang(request)
    try:
        user = request.user
        if user.role == "admin":
            updated = Notification.objects.filter(status="unread").update(
                status="read", read_at=timezone.now()
            )
            message = nt("all_system_notifications_marked_read", lang)
        else:
            updated = Notification.objects.filter(
                receiver=user, status="unread"
            ).update(status="read", read_at=timezone.now())
            message = nt("all_marked_read", lang)

        return Response({"message": message, "updated_count": updated}, status=200)

    except Exception as exc:
        logger.exception("mark_all_notifications_read: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)


# ══════════════════════════════════════════════════════════════════════════════
# MARK AS READ
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """
    Mark a notification as read.
    - Regular users: can only mark their own notifications.
    - Admin users:   can mark any notification.
    """
    lang = _lang(request)
    try:
        user = request.user
        lookup = {"id": notification_id}
        if user.role != "admin":
            lookup["receiver"] = user

        try:
            n = Notification.objects.get(**lookup)
        except Notification.DoesNotExist:
            return Response({"error": nt("notification_not_found", lang)}, status=404)

        if n.status != "read":
            n.status  = "read"
            n.read_at = timezone.now()
            n.save(update_fields=["status", "read_at"])

        return Response({
            "message":      nt("notification_marked_read", lang),
            "notification": _one(n),
        }, status=200)

    except Exception as exc:
        logger.exception("mark_notification_read: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)


# ══════════════════════════════════════════════════════════════════════════════
# DELETE
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """
    Delete a notification.
    - Regular users: can only delete their own READ notifications.
    - Admin users:   can delete any notification.
    """
    lang = _lang(request)
    try:
        user   = request.user
        lookup = {"id": notification_id}
        if user.role != "admin":
            lookup["receiver"] = user

        try:
            n = Notification.objects.get(**lookup)
        except Notification.DoesNotExist:
            return Response({"error": nt("notification_not_found", lang)}, status=404)

        if user.role != "admin" and n.status != "read":
            return Response({"error": nt("cannot_delete_unread", lang)}, status=400)

        n.delete()
        return Response({"message": nt("notification_deleted", lang)}, status=200)

    except Exception as exc:
        logger.exception("delete_notification: %s", exc)
        return Response({"error": nt("server_error", lang)}, status=500)