# chatApp/utils.py

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils.timezone import now
from datetime import timedelta

from userApp.models import CustomUser
from .models import ChatRoom, ChatParticipant, Message, ChatRoomType
from .serializers import MessageSerializer
from .translations import ct


def send_realtime_notification(user_id, notification_data):
    """
    Send real-time notification to a specific user via WebSocket
    """
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}",
            {
                'type': 'notification',
                'data': notification_data
            }
        )
        return True
    except Exception as e:
        print(f"Error sending realtime notification: {e}")
        return False


def broadcast_to_chat_room(chat_room_id, message_type, data):
    """
    Broadcast data to all participants in a chat room
    """
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{chat_room_id}",
            {
                'type': message_type,
                'data': data
            }
        )
        return True
    except Exception as e:
        print(f"Error broadcasting to chat room: {e}")
        return False


def create_system_message(chat_room, content, language='en'):
    """
    Create a system message in a chat room
    """
    try:
        # Get or create system user
        system_user, created = CustomUser.objects.get_or_create(
            phone_number='system',
            defaults={
                'full_name': 'System',
                'role': 'admin',
                'email': 'system@example.com',
                'status': True,
                'is_active': True
            }
        )
        
        message = Message.objects.create(
            chat_room=chat_room,
            sender=system_user,
            content=content,
            message_type='system'
        )
        
        # Broadcast via WebSocket
        serializer = MessageSerializer(message)
        broadcast_to_chat_room(
            chat_room.id,
            'chat_message',
            {'message': serializer.data}
        )
        
        return message
    except Exception as e:
        print(f"Error creating system message: {e}")
        return None


def get_user_chat_stats(user):
    """
    Get comprehensive chat statistics for a user
    """
    stats = {
        'total_chats': 0,
        'unread_messages': 0,
        'active_participants': 0,
        'total_messages_sent': 0,
        'chats_by_type': {
            'global': 0,
            'farmers': 0,
            'buyers': 0,
            'one_on_one': 0
        }
    }
    
    try:
        # Get user's chats
        chats = ChatRoom.objects.filter(
            participants=user,
            is_active=True
        )
        
        stats['total_chats'] = chats.count()
        
        # Count by type
        for chat_type, _ in ChatRoomType.choices:
            stats['chats_by_type'][chat_type] = chats.filter(
                chat_type=chat_type
            ).count()
        
        # Calculate unread messages
        total_unread = 0
        for chat in chats:
            participant = chat.chat_participants.filter(user=user).first()
            if participant and not participant.is_blocked:
                messages = chat.messages.filter(
                    is_deleted=False
                ).exclude(sender=user)
                
                if participant.last_read_at:
                    messages = messages.filter(
                        created_at__gt=participant.last_read_at
                    )
                
                # Filter by visibility
                for msg in messages:
                    if msg.can_view(user):
                        total_unread += 1
        
        stats['unread_messages'] = total_unread
        
        # Count messages sent
        stats['total_messages_sent'] = Message.objects.filter(
            sender=user,
            is_deleted=False
        ).count()
        
        # Count active participants (where user has chatted in last 30 days)
        thirty_days_ago = now() - timedelta(days=30)
        active_chats = chats.filter(
            messages__created_at__gte=thirty_days_ago
        ).distinct()
        
        stats['active_participants'] = active_chats.count()
        
    except Exception as e:
        print(f"Error getting chat stats: {e}")
    
    return stats


def validate_file_upload(file):
    """
    Validate file uploads for chat attachments
    """
    max_size = 50 * 1024 * 1024  # 50MB
    allowed_types = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    if file.size > max_size:
        return False, ct("file_too_large")
    
    if file.content_type not in allowed_types:
        return False, ct("file_type_not_allowed")
    
    return True, ct("file_valid")


def get_online_users(chat_room_id):
    """
    Get list of online users in a chat room
    This requires Redis/cache implementation for real tracking
    """
    # Placeholder - implement with Redis in production
    return []


def format_chat_room_name(chat_room, user=None):
    """
    Generate a formatted name for chat room
    """
    if chat_room.name:
        return chat_room.name
    
    if chat_room.chat_type == ChatRoomType.ONE_ON_ONE and user:
        other = chat_room.user2 if chat_room.user1 == user else chat_room.user1
        return f"Chat with {other.full_name}"
    
    return dict(ChatRoomType.choices).get(chat_room.chat_type, 'Chat')


def get_recent_chat_activity(user, limit=10):
    """
    Get recent chat activity for a user
    """
    recent_activity = []
    
    try:
        chats = ChatRoom.objects.filter(
            participants=user,
            is_active=True
        )
        
        for chat in chats:
            # Get last 3 messages from each chat
            messages = chat.messages.filter(
                is_deleted=False
            ).order_by('-created_at')[:3]
            
            for msg in messages:
                if msg.can_view(user):
                    recent_activity.append({
                        'chat_id': chat.id,
                        'chat_name': format_chat_room_name(chat, user),
                        'chat_type': chat.chat_type,
                        'message_id': msg.id,
                        'content': msg.content[:100],
                        'sender': msg.sender.full_name,
                        'sender_id': msg.sender.id,
                        'timestamp': msg.created_at,
                        'is_own': msg.sender == user
                    })
        
        # Sort by timestamp and limit
        recent_activity.sort(
            key=lambda x: x['timestamp'],
            reverse=True
        )
        return recent_activity[:limit]
        
    except Exception as e:
        print(f"Error getting recent activity: {e}")
        return []