from django.urls import path
from notificationApp import views

urlpatterns = [
    # ── Admin ──────────────────────────────────────────────────────────────────
    path("send/",          views.send_notification),         # POST
    path("all/",           views.get_all_notifications),     # GET – paginated, filtered, sorted
    path("sent/",          views.get_sent_notifications),    # GET – paginated, filtered, sorted
    path("stats/",         views.get_notification_stats),    # GET – aggregated counts

    # ── User inbox ─────────────────────────────────────────────────────────────
    path("",               views.get_my_notifications),      # GET
    path("unread/",        views.get_unread_notifications),  # GET
    path("read/",          views.get_read_notifications),    # GET
    path("mark-all-read/", views.mark_all_notifications_read),   # PATCH
    path("get_my_unread_notifications/", views.get_my_unread_notifications),  # GET

    # ── Per-notification actions ───────────────────────────────────────────────
    path("<int:notification_id>/mark-read/", views.mark_notification_read),  # PATCH
    path("<int:notification_id>/delete/",    views.delete_notification),     # DELETE
]