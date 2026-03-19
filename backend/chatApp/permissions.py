# chatApp/permissions.py

from rest_framework import permissions
from .models import ChatRoom, ChatParticipant, Message, ChatRoomType


class IsAdminUser(permissions.BasePermission):
    """Allow only admin users"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'admin'
    
    def has_object_permission(self, request, view, obj):
        return request.user.role == 'admin'


class IsChatParticipant(permissions.BasePermission):
    """Allow participants to access chat room"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin can access any chat
        if user.role == 'admin':
            return True
        
        # Check if user is participant and not blocked
        if isinstance(obj, ChatRoom):
            participant = obj.chat_participants.filter(user=user).first()
            return participant and not participant.is_blocked
        
        # For Message objects
        if isinstance(obj, Message):
            participant = obj.chat_room.chat_participants.filter(user=user).first()
            return participant and not participant.is_blocked
        
        return False


class CanSendMessages(permissions.BasePermission):
    """Check if user can send messages in chat"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin can always send
        if user.role == 'admin':
            return True
        
        # For ChatRoom objects
        if isinstance(obj, ChatRoom):
            # Check if user is participant and not blocked
            participant = obj.chat_participants.filter(user=user).first()
            if not participant or participant.is_blocked:
                return False
            
            # Check chat settings
            try:
                settings = obj.settings
                if settings.allowed_senders == 'admins_only':
                    return False
            except:
                pass
            
            return True
        
        return False


class CanDeleteMessage(permissions.BasePermission):
    """Check if user can delete a message"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Admin can delete any message
        if user.role == 'admin':
            return True
        
        # Sender can delete their own messages
        if isinstance(obj, Message):
            return obj.sender == user
        
        return False


class CanManageParticipants(permissions.BasePermission):
    """Check if user can manage participants (add/remove/block)"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Only admin can manage participants
        return request.user.role == 'admin'


class CanViewChatList(permissions.BasePermission):
    """Check if user can view list of available chats"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsNotBlocked(permissions.BasePermission):
    """Check if user is not blocked from the chat"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if isinstance(obj, ChatRoom):
            participant = obj.chat_participants.filter(user=user).first()
            return not (participant and participant.is_blocked)
        
        if isinstance(obj, Message):
            participant = obj.chat_room.chat_participants.filter(user=user).first()
            return not (participant and participant.is_blocked)
        
        return True