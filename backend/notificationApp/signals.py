"""
notificationApp/signals.py
─────────────────────────────────────────────────────────────────────────────
Auto-fire notifications when important things happen in the system.
Register this in NotificationAppConfig.ready() (see apps.py).
─────────────────────────────────────────────────────────────────────────────
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch          import receiver


# ── User events ────────────────────────────────────────────────────────────

@receiver(post_save, sender='userApp.CustomUser')
def on_user_created(sender, instance, created, **kwargs):
    if not created:
        return
    from .services import notify_system, notify_broadcast
    from userApp.models import CustomUser

    # Welcome the new user
    notify_system(
        receiver    = instance,
        title       = "Welcome to FMMROP",
        description = (
            f"Hi {instance.full_name}, your account has been created. "
            "Complete your profile to get started."
        ),
    )

    # Alert admins about the new registration
    admins = CustomUser.objects.filter(role='admin', is_active=True)
    for admin in admins:
        notify_system(
            receiver    = admin,
            title       = "New user registered",
            description = (
                f"{instance.full_name} ({instance.role}) just registered "
                f"and is awaiting approval."
            ),
        )


@receiver(pre_save, sender='userApp.CustomUser')
def on_user_status_changed(sender, instance, **kwargs):
    """Notify user when admin activates or deactivates their account."""
    if not instance.pk:
        return                      # new object — handled by post_save above
    try:
        previous = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    if previous.status == instance.status:
        return                      # status unchanged

    from .services import notify_system

    if instance.status == 'Active':
        notify_system(
            receiver    = instance,
            title       = "Account Activated ✅",
            description = (
                "Your FMMROP account has been activated. "
                "You now have full access to the platform."
            ),
        )
    else:
        notify_system(
            receiver    = instance,
            title       = "Account Deactivated",
            description = (
                "Your account has been deactivated. "
                "Please contact support if you believe this is a mistake."
            ),
        )