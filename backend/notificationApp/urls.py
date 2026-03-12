from django.urls import path
from notificationApp import views

urlpatterns = [
    # ── Admin ──────────────────────────────────────────────────────────────────
    path("send/",          views.send_notification),        # POST
    path("all/",           views.get_all_notifications),    # GET – admin only
    path("sent/",          views.get_sent_notifications),   # GET – admin only

    # ── User inbox ─────────────────────────────────────────────────────────────
    path("",               views.get_my_notifications),     # GET
    path("unread/",        views.get_unread_notifications), # GET
    path("read/",          views.get_read_notifications),   # GET
    path("mark-all-read/", views.mark_all_notifications_read),  # PATCH

    # ── Per-notification actions ───────────────────────────────────────────────
    path("<int:notification_id>/mark-read/", views.mark_notification_read),  # PATCH
    path("<int:notification_id>/delete/",    views.delete_notification),     # DELETE
]