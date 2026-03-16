from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import CropStandard
from .translations import nt
from notificationApp.services import notify_user


@receiver(post_save, sender=CropStandard)
def check_standard_expiry(sender, instance, **kwargs):
    """
    Signal to check if a standard should be marked as expired
    based on season and harvest year.
    """
    if instance.status == 'active':
        instance.update_status_from_season()
        if instance.status == 'expired' and instance.pk:
            # Notify the buyer that their standard has expired
            lang = getattr(instance.created_by, 'language', 'en')
            notify_user(
                receiver=instance.created_by,
                title=nt('standard_expired_title', lang),
                description=nt('standard_expired_desc', lang,
                             crop=instance.crop_name,
                             season=instance.get_season_display(),
                             year=instance.harvest_year),
                sender=None  # System notification
            )
            # Save the status change
            CropStandard.objects.filter(pk=instance.pk).update(status='expired')