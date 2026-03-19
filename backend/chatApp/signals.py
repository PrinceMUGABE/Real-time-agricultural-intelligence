# chatApp/signals.py

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.db import IntegrityError
from .models import ChatRoom, ChatRoomType, ChatParticipant, ChatRoomSettings
from userApp.models import CustomUser


@receiver(post_save, sender=CustomUser)
def add_user_to_system_chats(sender, instance, created, **kwargs):
    """Add new users to appropriate system chats"""
    if instance.status == 'approved' and instance.is_active:
        # Add to global chat
        global_chat, _ = ChatRoom.objects.get_or_create(
            chat_type=ChatRoomType.GLOBAL,
            defaults={'name': 'Global Chat', 'created_by': instance}
        )
        
        # Determine role in chat
        chat_role = 'admin' if instance.role == 'admin' else 'member'
        
        ChatParticipant.objects.get_or_create(
            chat_room=global_chat,
            user=instance,
            defaults={'role': chat_role}
        )
        
        # Add to farmers chat if farmer
        if instance.role == 'farmer':
            farmers_chat, _ = ChatRoom.objects.get_or_create(
                chat_type=ChatRoomType.FARMERS,
                defaults={'name': 'Farmers Chat', 'created_by': instance}
            )
            ChatParticipant.objects.get_or_create(
                chat_room=farmers_chat,
                user=instance,
                defaults={'role': chat_role}
            )
        
        # Add to buyers chat if buyer
        if instance.role == 'buyer':
            buyers_chat, _ = ChatRoom.objects.get_or_create(
                chat_type=ChatRoomType.BUYERS,
                defaults={'name': 'Buyers Chat', 'created_by': instance}
            )
            ChatParticipant.objects.get_or_create(
                chat_room=buyers_chat,
                user=instance,
                defaults={'role': chat_role}
            )


@receiver(post_save, sender=ChatRoom)
def create_chat_settings(sender, instance, created, **kwargs):
    """Create settings for system chats"""
    if created and instance.chat_type in [
        ChatRoomType.GLOBAL,
        ChatRoomType.FARMERS,
        ChatRoomType.BUYERS
    ]:
        ChatRoomSettings.objects.get_or_create(
            chat_room=instance,
            defaults={'allowed_senders': 'everyone'}
        )


# Ensure all admins are in all system chats
@receiver(post_save, sender=CustomUser)
def add_admins_to_all_chats(sender, instance, **kwargs):
    """Ensure admins are in all system chats"""
    if instance.role == 'admin' and instance.is_active:
        for chat_type in [ChatRoomType.GLOBAL, ChatRoomType.FARMERS, ChatRoomType.BUYERS]:
            chat, _ = ChatRoom.objects.get_or_create(
                chat_type=chat_type,
                defaults={'name': f'{chat_type.capitalize()} Chat'}
            )
            ChatParticipant.objects.get_or_create(
                chat_room=chat,
                user=instance,
                defaults={'role': 'admin'}
            )