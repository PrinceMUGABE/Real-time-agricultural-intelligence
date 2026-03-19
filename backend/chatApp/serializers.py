# chatApp/serializers.py
import os

from django.conf import settings
from rest_framework import serializers
from django.utils.timezone import now
from .models import (
    ChatRoom, ChatParticipant, Message, ChatRoomSettings,
    ChatRoomType, MessageVisibilityOverride, MediaFile, MediaFileType
)
from userApp.models import CustomUser
from .translations import ct  # Message translations


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for chat - hides admin users from non-admins"""
    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'role', 'phone_number']
        read_only_fields = fields


class ChatParticipantSerializer(serializers.ModelSerializer):
    """Serializer for chat participants"""
    user = UserBasicSerializer(read_only=True)
    is_online = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatParticipant
        fields = [
            'id', 'user', 'role', 'joined_at', 
            'last_read_at', 'is_muted', 'is_blocked',
            'is_online'
        ]
        read_only_fields = fields
    
    def get_is_online(self, obj):
        # You can implement online tracking via Redis/cache
        return False


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for messages"""
    sender = UserBasicSerializer(read_only=True)
    is_own_message = serializers.SerializerMethodField()
    formatted_time = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    read_by_count = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'message_type', 'content', 'attachment',
            'created_at', 'updated_at', 'is_own_message', 'formatted_time',
            'can_delete', 'read_by_count', 'is_deleted', 'visibility'
        ]
        read_only_fields = fields

    def get_is_own_message(self, obj):
        request = self.context.get('request')
        return request and request.user == obj.sender

    def get_formatted_time(self, obj):
        return obj.created_at.strftime('%H:%M')

    def get_can_delete(self, obj):
        request = self.context.get('request')
        return request and obj.can_delete(request.user)

    def get_read_by_count(self, obj):
        if not obj.is_deleted:
            return obj.read_by.count()
        return 0


class ChatRoomSerializer(serializers.ModelSerializer):
    """Serializer for chat rooms"""
    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    is_participant = serializers.SerializerMethodField()
    settings = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()  # For one-on-one chats

    class Meta:
        model = ChatRoom
        fields = [
            'id', 'name', 'chat_type', 'participants', 'is_active',
            'created_at', 'updated_at', 'last_message', 'unread_count',
            'can_manage', 'is_participant', 'settings', 'other_user'
        ]
        read_only_fields = fields

    def get_participants(self, obj):
        """Get participants, hiding admins from non-admins"""
        request = self.context.get('request')
        if not request:
            return []
        
        participants = obj.chat_participants.select_related('user')
        
        # Hide admin participants from non-admin users
        if request.user.role != 'admin':
            participants = participants.exclude(user__role='admin')
        
        return ChatParticipantSerializer(
            participants, many=True, context=self.context
        ).data

    def get_last_message(self, obj):
        """Get last non-deleted message visible to user"""
        request = self.context.get('request')
        if not request:
            return None
        
        messages = obj.messages.filter(is_deleted=False)
        for message in messages.order_by('-created_at'):
            if message.can_view(request.user):
                return {
                    'content': message.content[:100],
                    'sender': message.sender.full_name,
                    'time': message.created_at,
                    'message_id': message.id
                }
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request:
            return 0
            
        user = request.user
        try:
            participant = ChatParticipant.objects.get(chat_room=obj, user=user)
            if not participant.last_read_at:
                # Count all messages user can view
                messages = obj.messages.filter(is_deleted=False)
                count = 0
                for msg in messages:
                    if msg.can_view(user):
                        count += 1
                return count
            
            # Count unread messages user can view
            messages = obj.messages.filter(
                created_at__gt=participant.last_read_at,
                is_deleted=False
            ).exclude(sender=user)
            
            count = 0
            for msg in messages:
                if msg.can_view(user):
                    count += 1
            return count
            
        except ChatParticipant.DoesNotExist:
            return 0

    def get_can_manage(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return request.user.role == 'admin'

    def get_is_participant(self, obj):
        request = self.context.get('request')
        if not request:
            return False
        return obj.participants.filter(id=request.user.id).exists()

    def get_settings(self, obj):
        """Get chat room settings (for admin only)"""
        request = self.context.get('request')
        if not request or request.user.role != 'admin':
            return None
        
        try:
            settings = obj.settings
            return {
                'allowed_senders': settings.allowed_senders,
                'updated_at': settings.updated_at
            }
        except ChatRoomSettings.DoesNotExist:
            return None

    def get_other_user(self, obj):
        """For one-on-one chats, return the other participant"""
        request = self.context.get('request')
        if not request or obj.chat_type != ChatRoomType.ONE_ON_ONE:
            return None
        
        other = obj.user2 if obj.user1 == request.user else obj.user1
        return UserBasicSerializer(other).data if other else None


class CreateChatRoomSerializer(serializers.Serializer):
    """Serializer for creating chat rooms"""
    chat_type = serializers.ChoiceField(choices=ChatRoomType.choices)
    user_id = serializers.IntegerField(required=False)  # For one-on-one chats

    def validate(self, data):
        chat_type = data['chat_type']
        request = self.context.get('request')
        
        if chat_type == ChatRoomType.ONE_ON_ONE:
            if not data.get('user_id'):
                raise serializers.ValidationError(
                    "user_id is required for one-on-one chats"
                )
            
            # Check if user exists and is approved
            try:
                other_user = CustomUser.objects.get(
                    id=data['user_id'],
                    status='approved',
                    is_active=True
                )
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError("User not found or not approved")
            
            if other_user.id == request.user.id:
                raise serializers.ValidationError("Cannot chat with yourself")
            
            data['other_user'] = other_user
        
        elif chat_type in [ChatRoomType.GLOBAL, ChatRoomType.FARMERS, ChatRoomType.BUYERS]:
            # Only admin can create these
            if request.user.role != 'admin':
                raise serializers.ValidationError(
                    "Only admins can create system chats"
                )
        
        return data


class SendMessageSerializer(serializers.Serializer):
    """Serializer for sending messages"""
    chat_room_id = serializers.IntegerField()
    content = serializers.CharField(required=False, allow_blank=True)
    message_type = serializers.ChoiceField(
        choices=Message.MESSAGE_TYPES,
        default='text'
    )
    attachment = serializers.FileField(required=False)

    def validate(self, data):
        if data.get('message_type') == 'text' and not data.get('content'):
            raise serializers.ValidationError(
                "Content is required for text messages"
            )
        return data


class DeleteMessageSerializer(serializers.Serializer):
    """Serializer for deleting messages"""
    delete_type = serializers.ChoiceField(
        choices=Message.DELETE_OPTIONS,
        default='for_me'
    )


class UpdateChatSettingsSerializer(serializers.Serializer):
    """Serializer for updating chat settings (admin only)"""
    allowed_senders = serializers.ChoiceField(
        choices=ChatRoomSettings.ALLOWED_SENDERS_CHOICES
    )


class BlockParticipantSerializer(serializers.Serializer):
    """Serializer for blocking/unblocking participants"""
    user_id = serializers.IntegerField()
    action = serializers.ChoiceField(choices=['block', 'unblock'])
    
    
    

class AdminChatListSerializer(serializers.ModelSerializer):
    """Serializer for admin chat list view"""
    participant_count = serializers.IntegerField(read_only=True)
    message_count = serializers.IntegerField(read_only=True)
    chat_type_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = [
            'id', 'name', 'chat_type', 'chat_type_display',
            'is_active', 'status_display', 'created_at', 'updated_at',
            'participant_count', 'message_count'
        ]
    
    def get_chat_type_display(self, obj):
        return dict(ChatRoomType.choices).get(obj.chat_type, obj.chat_type)
    
    def get_status_display(self, obj):
        return 'active' if obj.is_active else 'inactive'


class AdminParticipantDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for participants in admin view"""
    user_details = UserBasicSerializer(source='user', read_only=True)
    blocked_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatParticipant
        fields = [
            'id', 'user_details', 'role', 'joined_at', 'last_read_at',
            'is_muted', 'is_blocked', 'blocked_at', 'blocked_by_name'
        ]
    
    def get_blocked_by_name(self, obj):
        return obj.blocked_by.full_name if obj.blocked_by else None


class AdminChatDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for admin chat view"""
    participants = AdminParticipantDetailSerializer(
        source='chat_participants', many=True, read_only=True
    )
    settings = serializers.SerializerMethodField()
    user1_details = UserBasicSerializer(source='user1', read_only=True)
    user2_details = UserBasicSerializer(source='user2', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = [
            'id', 'name', 'chat_type', 'is_active',
            'created_at', 'updated_at', 'created_by_name',
            'user1_details', 'user2_details',
            'participants', 'settings'
        ]
    
    def get_settings(self, obj):
        try:
            settings = obj.settings
            return {
                'allowed_senders': settings.allowed_senders,
                'updated_at': settings.updated_at,
                'updated_by': settings.updated_by.full_name if settings.updated_by else None
            }
        except ChatRoomSettings.DoesNotExist:
            return None
    
    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None


class AdminUpdateParticipantRoleSerializer(serializers.Serializer):
    """Serializer for updating participant role"""
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=['admin', 'member', 'observer'])


class AdminBlockParticipantSerializer(serializers.Serializer):
    """Serializer for blocking/unblocking participants"""
    user_id = serializers.IntegerField()
    block = serializers.BooleanField(default=True)


class AdminChatStatsSerializer(serializers.Serializer):
    """Serializer for chat statistics"""
    total_chats = serializers.IntegerField()
    active_chats = serializers.IntegerField()
    inactive_chats = serializers.IntegerField()
    global_chats = serializers.IntegerField()
    farmers_chats = serializers.IntegerField()
    buyers_chats = serializers.IntegerField()
    one_on_one_chats = serializers.IntegerField()
    total_participants = serializers.IntegerField()
    total_messages = serializers.IntegerField()
    
    
    
    
    

class MediaFileSerializer(serializers.ModelSerializer):
    """Serializer for media files"""
    human_readable_size = serializers.SerializerMethodField()
    file_icon           = serializers.SerializerMethodField()
    file_url            = serializers.SerializerMethodField()
    thumbnail_url       = serializers.SerializerMethodField()
    uploaded_by_name    = serializers.SerializerMethodField()
    message_id          = serializers.SerializerMethodField()   # ← add this

    class Meta:
        model = MediaFile
        fields = [
            'id', 'file_type', 'file_name', 'file_size', 'human_readable_size',
            'mime_type', 'duration', 'dimensions', 'page_count',
            'word_count', 'file_icon', 'file_url', 'thumbnail_url',
            'uploaded_at', 'uploaded_by_name', 'message_id',              # ← add here
        ]

    def get_human_readable_size(self, obj):
        return obj.get_human_readable_size()

    def get_file_icon(self, obj):
        return obj.get_file_icon()

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        if not request or not obj.thumbnail:
            return None
        import os
        from django.conf import settings as django_settings
        thumb_path = os.path.join(django_settings.MEDIA_ROOT, str(obj.thumbnail))
        if not os.path.exists(thumb_path):
            # Thumbnail missing on disk — fall back to full file URL
            if obj.file:
                return request.build_absolute_uri(obj.file.url)
            return None
        return request.build_absolute_uri(obj.thumbnail.url)

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.full_name if obj.uploaded_by else None

    def get_message_id(self, obj):
        """Return the FK message id (most reliable link back to the message)"""
        if obj.message_id:
            return obj.message_id
        # Fall back: check M2M reverse
        try:
            first = obj.messages.first()
            return first.id if first else None
        except Exception:
            return None

class EnhancedMessageSerializer(MessageSerializer):
    """Enhanced message serializer with media files"""
    media = serializers.SerializerMethodField()

    class Meta(MessageSerializer.Meta):
        fields = MessageSerializer.Meta.fields + ['has_media', 'media']

    def get_media(self, obj):
        """
        Collect media from both relationships and deduplicate by ID.
        - obj.media_files  → M2M (related_name on MediaFile = 'messages')
        - obj.media_file   → FK reverse (related_name='media_file', singular)
        """
        seen = set()
        collected = []

        # Source 1: M2M
        try:
            m2m_items = list(obj.media_files.all())
            for mf in m2m_items:
                if mf.id not in seen:
                    seen.add(mf.id)
                    collected.append(mf)
        except Exception as e:
            print(f"[get_media] M2M error for msg {obj.id}: {e}")

        # Source 2: FK reverse
        try:
            fk_items = list(obj.media_file.all())
            for mf in fk_items:
                if mf.id not in seen:
                    seen.add(mf.id)
                    collected.append(mf)
        except Exception as e:
            print(f"[get_media] FK error for msg {obj.id}: {e}")

        if obj.has_media:
            print(f"[get_media] msg.id={obj.id} has_media=True → collected {len(collected)} file(s)")

        if not collected:
            return []

        return MediaFileSerializer(collected, many=True, context=self.context).data
    
     
    
class MessageFilterSerializer(serializers.Serializer):
    """Serializer for message filtering"""
    message_type = serializers.ChoiceField(
        choices=Message.MESSAGE_TYPES, required=False
    )
    media_type = serializers.ChoiceField(
        choices=MediaFileType.choices, required=False
    )
    sender_id = serializers.IntegerField(required=False)
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    search = serializers.CharField(required=False, allow_blank=True)
    has_media = serializers.BooleanField(required=False)