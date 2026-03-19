# chatApp/models.py

from django.db import models
from django.utils.timezone import now
from userApp.models import CustomUser
from django.core.exceptions import ValidationError


class MediaFileType(models.TextChoices):
    IMAGE = 'image', 'Image'
    VIDEO = 'video', 'Video'
    AUDIO = 'audio', 'Audio'
    VOICE_NOTE = 'voice_note', 'Voice Note'
    DOCUMENT = 'document', 'Document'
    PDF = 'pdf', 'PDF'
    WORD = 'word', 'Word Document'
    EXCEL = 'excel', 'Excel Spreadsheet'
    OTHER = 'other', 'Other'


class MediaFile(models.Model):
    """Model for tracking media files in messages"""
    message = models.ForeignKey(
        'Message',
        on_delete=models.CASCADE,
        related_name='media_file',
        null=True,  # Allow null temporarily
        blank=True
    )
    file_type = models.CharField(max_length=20, choices=MediaFileType.choices)
    file = models.FileField(upload_to='chat_media/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField()  # Size in bytes
    mime_type = models.CharField(max_length=100)
    duration = models.FloatField(null=True, blank=True)  # For audio/video in seconds
    thumbnail = models.FileField(upload_to='chat_thumbnails/%Y/%m/%d/', null=True, blank=True)
    dimensions = models.CharField(max_length=20, null=True, blank=True)  # For images (e.g., "1920x1080")
    
    # For document pages/word count
    page_count = models.IntegerField(null=True, blank=True)
    word_count = models.IntegerField(null=True, blank=True)
    
    # Metadata
    uploaded_at = models.DateTimeField(default=now)
    uploaded_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_media'
    )
    
    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['message', 'file_type']),
            models.Index(fields=['uploaded_by']),
        ]

    def __str__(self):
        return f"{self.file_name} ({self.file_type})"

    def get_human_readable_size(self):
        """Convert bytes to human readable format"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"

    def get_file_icon(self):
        """Get appropriate icon class based on file type"""
        icons = {
            'image': 'fa-image',
            'video': 'fa-video',
            'audio': 'fa-music',
            'voice_note': 'fa-microphone',
            'pdf': 'fa-file-pdf',
            'word': 'fa-file-word',
            'excel': 'fa-file-excel',
            'document': 'fa-file-alt',
        }
        return icons.get(self.file_type, 'fa-file')
    
    
class ChatRoomType(models.TextChoices):
    GLOBAL = 'global', 'Global Chat'
    FARMERS = 'farmers', 'Farmers Chat'
    BUYERS = 'buyers', 'Buyers Chat'
    ONE_ON_ONE = 'one_on_one', 'One-on-One Chat'


class MessageVisibility(models.TextChoices):
    EVERYONE = 'everyone', 'Visible to Everyone'
    SENDER_ONLY = 'sender_only', 'Visible to Sender Only'
    ADMIN_ONLY = 'admin_only', 'Visible to Admin Only'


class ChatRoom(models.Model):
    """Unified chat room model"""
    name = models.CharField(max_length=200, blank=True, null=True)
    chat_type = models.CharField(max_length=50, choices=ChatRoomType.choices)
    
    # For one-on-one chats, track the two users
    user1 = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='chat_rooms_as_user1',
        null=True,
        blank=True
    )
    user2 = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='chat_rooms_as_user2',
        null=True,
        blank=True
    )
    
    # Participants through join table - specify through_fields to resolve ambiguity
    participants = models.ManyToManyField(
        CustomUser,
        related_name='chat_rooms',
        through='ChatParticipant',
        through_fields=('chat_room', 'user')  # Specify which fields to use
    )
    
    # Metadata
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_chats'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['chat_type']),
            models.Index(fields=['is_active']),
        ]
        unique_together = [
            ('user1', 'user2', 'chat_type'),  # Ensure unique one-on-one chats
        ]

    def __str__(self):
        return f"{self.name or self.get_chat_type_display()} ({self.id})"

    def clean(self):
        """Validate chat room creation"""
        if self.chat_type == ChatRoomType.ONE_ON_ONE:
            if not self.user1 or not self.user2:
                raise ValidationError("One-on-one chat requires both users")
            if self.user1 == self.user2:
                raise ValidationError("Cannot create chat with yourself")
        elif self.chat_type in [ChatRoomType.GLOBAL, ChatRoomType.FARMERS, ChatRoomType.BUYERS]:
            if self.user1 or self.user2:
                raise ValidationError(f"{self.chat_type} chat cannot have user1/user2")

    def save(self, *args, **kwargs):
        self.clean()
        if not self.name:
            if self.chat_type == ChatRoomType.GLOBAL:
                self.name = "Global Chat"
            elif self.chat_type == ChatRoomType.FARMERS:
                self.name = "Farmers Chat"
            elif self.chat_type == ChatRoomType.BUYERS:
                self.name = "Buyers Chat"
            elif self.chat_type == ChatRoomType.ONE_ON_ONE and self.user1 and self.user2:
                self.name = f"Chat: {self.user1.full_name} & {self.user2.full_name}"
        super().save(*args, **kwargs)

    def get_participant_roles(self):
        """Get all participant roles in this chat"""
        return set(self.participants.values_list('role', flat=True))

    def can_user_send_message(self, user):
        """Check if user can send messages based on chat settings"""
        if user.role == 'admin':
            return True
            
        participant = self.chat_participants.filter(user=user).first()
        if not participant or participant.is_blocked:
            return False
            
        # Get room settings
        settings = ChatRoomSettings.objects.filter(chat_room=self).first()
        if not settings:
            return True
            
        if settings.allowed_senders == 'admins_only':
            return False
        return True


class ChatParticipant(models.Model):
    """Tracks participants in chat rooms"""
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member'),
        ('observer', 'Observer'),  # Can view but not send messages
    ]
    
    chat_room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='chat_participants'
    )
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='chat_participations'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(default=now)
    last_read_at = models.DateTimeField(null=True, blank=True)
    is_muted = models.BooleanField(default=False)
    is_blocked = models.BooleanField(default=False)
    blocked_at = models.DateTimeField(null=True, blank=True)
    blocked_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,  # Add blank=True to make it optional
        related_name='blocked_participants'
    )

    class Meta:
        unique_together = ['chat_room', 'user']
        ordering = ['joined_at']
        indexes = [
            models.Index(fields=['chat_room', 'user']),
            models.Index(fields=['is_blocked']),
        ]

    def __str__(self):
        return f"{self.user.full_name} in {self.chat_room.name}"


class ChatRoomSettings(models.Model):
    """Settings for admin-managed chat rooms"""
    ALLOWED_SENDERS_CHOICES = [
        ('everyone', 'Everyone'),
        ('admins_only', 'Admins Only'),
    ]
    
    chat_room = models.OneToOneField(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='settings'
    )
    allowed_senders = models.CharField(
        max_length=20,
        choices=ALLOWED_SENDERS_CHOICES,
        default='everyone'
    )
    updated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.chat_room.name}"


class Message(models.Model):
    """Unified message model with deletion options"""
    MESSAGE_TYPES = [
        ('text', 'Text'),
        ('file', 'File'),
        ('image', 'Image'),
        ('system', 'System'),
    ]
    
    DELETE_OPTIONS = [
        ('for_me', 'Delete for Me'),
        ('for_everyone', 'Delete for Everyone'),
    ]
    
    chat_room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    content = models.TextField()
    attachment = models.FileField(
        upload_to='chat_attachments/',
        null=True,
        blank=True
    )
    
    media_files = models.ManyToManyField(
        MediaFile,
        related_name='messages',
        blank=True
    )
    has_media = models.BooleanField(default=False)
    
    # Deletion tracking
    is_deleted = models.BooleanField(default=False)
    deleted_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_messages'
    )
    deleted_at = models.DateTimeField(null=True, blank=True)
    deletion_type = models.CharField(
        max_length=20,
        choices=DELETE_OPTIONS,
        null=True,
        blank=True
    )
    visibility = models.CharField(
        max_length=20,
        choices=MessageVisibility.choices,
        default=MessageVisibility.EVERYONE
    )
    
    # For tracking who has seen this message
    read_by = models.ManyToManyField(
        CustomUser,
        related_name='read_messages',
        blank=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['chat_room', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['visibility']),
            models.Index(fields=['is_deleted']),
        ]

    def __str__(self):
        return f"Message from {self.sender.full_name}"

    def can_view(self, user):
        """Check if user can view this message"""
        if user.role == 'admin':
            return True
            
        if self.visibility == MessageVisibility.EVERYONE:
            return True
        elif self.visibility == MessageVisibility.SENDER_ONLY:
            return user == self.sender
        elif self.visibility == MessageVisibility.ADMIN_ONLY:
            return user.role == 'admin'
        return False

    def can_delete(self, user):
        """Check if user can delete this message"""
        if user.role == 'admin':
            return True  # Admin can delete any message permanently
        return user == self.sender  # Sender can delete their own messages

    def delete_for_user(self, user, delete_type='for_me'):
        """Delete message for specific user"""
        if user.role == 'admin':
            # Admin deletion is permanent
            self.is_deleted = True
            self.deleted_by = user
            self.deleted_at = now()
            self.deletion_type = delete_type
            self.visibility = MessageVisibility.ADMIN_ONLY
            self.save()
        elif user == self.sender:
            if delete_type == 'for_everyone':
                self.is_deleted = True
                self.deleted_by = user
                self.deleted_at = now()
                self.deletion_type = 'for_everyone'
                self.visibility = MessageVisibility.ADMIN_ONLY
                self.save()
            else:  # for_me
                # Create a visibility override for this user
                MessageVisibilityOverride.objects.create(
                    message=self,
                    user=user,
                    is_hidden=True
                )
        else:
            # Other users can only hide for themselves
            MessageVisibilityOverride.objects.create(
                message=self,
                user=user,
                is_hidden=True
            )


class MessageVisibilityOverride(models.Model):
    """Track per-user message visibility"""
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='visibility_overrides'
    )
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE
    )
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['message', 'user']
        indexes = [
            models.Index(fields=['message', 'user']),
        ]