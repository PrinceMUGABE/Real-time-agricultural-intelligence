"""
notificationApp/notification_utils.py

Utility functions for creating system notifications automatically when
key user events happen (register, login, password change, etc.).

These are called from userApp/views.py after successful operations.
"""

import logging
from django.apps import apps

from .translations import nt

logger = logging.getLogger(__name__)


def _get_models():
    """Lazy-import to avoid circular imports."""
    Notification = apps.get_model('notificationApp', 'Notification')
    CustomUser   = apps.get_model('userApp', 'CustomUser')
    return Notification, CustomUser


def _get_admins():
    """Return all admin users."""
    _, CustomUser = _get_models()
    return CustomUser.objects.filter(role='admin', is_active=True)


def _safe_create(**kwargs):
    """Create a Notification, swallowing errors so they never break user flows."""
    try:
        Notification, _ = _get_models()
        return Notification.objects.create(**kwargs)
    except Exception as exc:
        logger.error("[NOTIFICATION] Failed to create notification: %s", exc)
        return None


# ══════════════════════════════════════════════════════════════════════════════
#  PUBLIC HELPERS  –  called from userApp views
# ══════════════════════════════════════════════════════════════════════════════

def notify_user_registered(user):
    """
    Fired after a user completes OTP-verified registration.
    • Sends a welcome notification to the new user.
    • Notifies all admins that a new user has registered.
    """
    Notification, _ = _get_models()
    lang = getattr(user, 'language', 'en') or 'en'

    # ── Welcome notification to the new user ──────────────────────────────
    _safe_create(
        sender            = None,
        receiver          = user,
        notification_type = Notification.TYPE_SYSTEM,
        title             = nt("sys_title_registered", lang),
        description       = nt("sys_body_registered", lang, name=user.full_name),
    )

    # ── Admin alert ───────────────────────────────────────────────────────
    for admin in _get_admins():
        admin_lang = getattr(admin, 'language', 'en') or 'en'
        _safe_create(
            sender            = None,
            receiver          = admin,
            notification_type = Notification.TYPE_SYSTEM,
            title             = nt("sys_title_admin_new_user", admin_lang),
            description       = nt(
                "sys_body_admin_new_user", admin_lang,
                role  = user.role,
                name  = user.full_name,
                phone = user.phone_number,
            ),
        )


def notify_login(user):
    """
    Fired after a successful login.
    Sends a login-detected notification to the user.
    """
    Notification, _ = _get_models()
    lang = getattr(user, 'language', 'en') or 'en'

    _safe_create(
        sender            = None,
        receiver          = user,
        notification_type = Notification.TYPE_SYSTEM,
        title             = nt("sys_title_login", lang),
        description       = nt("sys_body_login", lang),
    )


def notify_password_changed(user):
    """Fired after a user successfully changes their own password."""
    Notification, _ = _get_models()
    lang = getattr(user, 'language', 'en') or 'en'

    _safe_create(
        sender            = None,
        receiver          = user,
        notification_type = Notification.TYPE_SYSTEM,
        title             = nt("sys_title_password_changed", lang),
        description       = nt("sys_body_password_changed", lang),
    )


def notify_password_reset(user):
    """Fired after a user successfully resets their password via OTP."""
    Notification, _ = _get_models()
    lang = getattr(user, 'language', 'en') or 'en'

    _safe_create(
        sender            = None,
        receiver          = user,
        notification_type = Notification.TYPE_SYSTEM,
        title             = nt("sys_title_password_reset", lang),
        description       = nt("sys_body_password_reset", lang),
    )


def notify_profile_updated(user):
    """Fired after a user updates their own profile."""
    Notification, _ = _get_models()
    lang = getattr(user, 'language', 'en') or 'en'

    _safe_create(
        sender            = None,
        receiver          = user,
        notification_type = Notification.TYPE_SYSTEM,
        title             = nt("sys_title_profile_updated", lang),
        description       = nt("sys_body_profile_updated", lang),
    )


def notify_account_activated(user):
    """Fired when an admin activates a user account."""
    Notification, _ = _get_models()
    lang = getattr(user, 'language', 'en') or 'en'

    _safe_create(
        sender            = None,
        receiver          = user,
        notification_type = Notification.TYPE_SYSTEM,
        title             = nt("sys_title_account_activated", lang),
        description       = nt("sys_body_account_activated", lang),
    )


def notify_account_deactivated(user):
    """Fired when an admin deactivates a user account."""
    Notification, _ = _get_models()
    lang = getattr(user, 'language', 'en') or 'en'

    _safe_create(
        sender            = None,
        receiver          = user,
        notification_type = Notification.TYPE_SYSTEM,
        title             = nt("sys_title_account_deactivated", lang),
        description       = nt("sys_body_account_deactivated", lang),
    )


def notify_admin_created_user(user):
    """
    Fired when an admin creates a user directly.
    • Notifies the new user.
    • Notifies all admins.
    """
    Notification, _ = _get_models()
    user_lang = getattr(user, 'language', 'en') or 'en'

    # ── Notify the new user ───────────────────────────────────────────────
    _safe_create(
        sender            = None,
        receiver          = user,
        notification_type = Notification.TYPE_SYSTEM,
        title             = nt("sys_title_admin_user_created", user_lang),
        description       = nt("sys_body_admin_user_created", user_lang),
    )

    # ── Notify all admins ─────────────────────────────────────────────────
    for admin in _get_admins():
        admin_lang = getattr(admin, 'language', 'en') or 'en'
        _safe_create(
            sender            = None,
            receiver          = admin,
            notification_type = Notification.TYPE_SYSTEM,
            title             = nt("sys_title_admin_new_user", admin_lang),
            description       = nt(
                "sys_body_admin_new_user", admin_lang,
                role  = user.role,
                name  = user.full_name,
                phone = user.phone_number,
            ),
        )


def notify_admin_updated_user(user):
    """Fired when an admin updates another user's profile."""
    Notification, _ = _get_models()
    lang = getattr(user, 'language', 'en') or 'en'

    _safe_create(
        sender            = None,
        receiver          = user,
        notification_type = Notification.TYPE_SYSTEM,
        title             = nt("sys_title_admin_user_updated", lang),
        description       = nt("sys_body_admin_user_updated", lang),
    )


def notify_admin_deleted_user(email, full_name, language='en'):
    """
    Fired when an admin deletes a user.
    Since the user is deleted we cannot do a FK – we just log it.
    (Optional: send email instead via user_utils.send_account_deleted_email)
    """
    # User already deleted – notification FK would fail.
    # We intentionally skip DB notification here; email handles it.
    pass