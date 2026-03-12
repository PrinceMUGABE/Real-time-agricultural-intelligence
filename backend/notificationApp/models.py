from django.db import models
from django.utils.timezone import now


class Notification(models.Model):
    """
    Unified notification model.

    System notifications  → sender is None  (TYPE_SYSTEM)
    Admin-broadcast       → sender is an admin user, receiver is None (broadcast)
    Direct notifications  → sender is an admin user, receiver is a specific user
    """

    TYPE_SYSTEM    = 'system'
    TYPE_BROADCAST = 'broadcast'
    TYPE_DIRECT    = 'direct'

    TYPE_CHOICES = [
        (TYPE_SYSTEM,    'System'),
        (TYPE_BROADCAST, 'Broadcast'),
        (TYPE_DIRECT,    'Direct'),
    ]

    STATUS_UNREAD = 'unread'
    STATUS_READ   = 'read'

    STATUS_CHOICES = [
        (STATUS_UNREAD, 'Unread'),
        (STATUS_READ,   'Read'),
    ]

    # ── Target audience for broadcast notifications ───────────────────────
    AUDIENCE_ALL     = 'all'
    AUDIENCE_FARMERS = 'farmers'
    AUDIENCE_BUYERS  = 'buyers'
    AUDIENCE_ADMINS  = 'admins'

    AUDIENCE_CHOICES = [
        (AUDIENCE_ALL,     'All Users'),
        (AUDIENCE_FARMERS, 'Farmers Only'),
        (AUDIENCE_BUYERS,  'Buyers Only'),
        (AUDIENCE_ADMINS,  'Admins Only'),
    ]

    sender = models.ForeignKey(
        'userApp.CustomUser',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='sent_notifications',
        help_text="Null for system-generated notifications.",
    )
    receiver = models.ForeignKey(
        'userApp.CustomUser',
        null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='received_notifications',
        help_text="Null for broadcast notifications.",
    )

    notification_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default=TYPE_SYSTEM,
    )
    audience = models.CharField(
        max_length=20,
        choices=AUDIENCE_CHOICES,
        null=True, blank=True,
        help_text="Only relevant for broadcast notifications.",
    )

    title       = models.CharField(max_length=255)
    description = models.TextField()

    status  = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=STATUS_UNREAD,
    )
    read_at    = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        receiver_label = self.receiver.full_name if self.receiver else 'broadcast'
        sender_label   = self.sender.full_name if self.sender else 'system'
        return f"[{self.notification_type}] {self.title} → {receiver_label} (from {sender_label})"

    @property
    def is_read(self):
        return self.status == self.STATUS_READ