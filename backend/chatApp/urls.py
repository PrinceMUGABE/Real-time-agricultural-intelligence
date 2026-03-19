# chatApp/urls.py - Add all new endpoints

from django.urls import path
from . import views

urlpatterns = [
    # Existing endpoints
    path('my-chats/', views.get_my_chats, name='get_my_chats'),
    path('create/', views.create_chat_room, name='create_chat_room'),
    path('<int:room_id>/', views.get_chat_room, name='get_chat_room'),
    
    # Messages
    path('messages/send/', views.send_message, name='send_message'),
    path('messages/<int:message_id>/delete/', views.delete_message, name='delete_message'),
    path('messages/<int:message_id>/read/', views.mark_message_read, name='mark_message_read'),
    path('<int:room_id>/mark-read/', views.mark_all_read, name='mark_all_read'),
    
    # Statistics
    path('unread-counts/', views.get_unread_counts, name='get_unread_counts'),
    path('<int:room_id>/stats/', views.get_chat_stats, name='get_chat_stats'),
    
    # Admin management
    path('<int:room_id>/settings/', views.update_chat_settings, name='update_chat_settings'),
    path('<int:room_id>/participants/manage/', views.manage_participant, name='manage_participant'),
    path('<int:room_id>/participants/block/', views.block_participant, name='block_participant'),
    
    # NEW MEDIA ENDPOINTS
    path('media/upload/', views.upload_media, name='upload_media'),
    path('<int:room_id>/messages/', views.get_chat_messages, name='get_chat_messages'),
    path('<int:room_id>/media/', views.get_chat_media, name='get_chat_media'),
    path('media/<int:media_id>/', views.get_media_info, name='get_media_info'),
    path('media/<int:media_id>/download/', views.download_media, name='download_media'),
    path('media/<int:media_id>/stream/', views.stream_media, name='stream_media'),
    path('media/<int:media_id>/delete/', views.delete_media, name='delete_media'),
    
    # NEW ADMIN ENDPOINTS
    path('admin/chats/', views.admin_get_all_chats, name='admin_get_all_chats'),
    path('admin/chats/create/', views.admin_create_chat, name='admin_create_chat'),
    path('admin/chats/<int:room_id>/', views.admin_get_chat_details, name='admin_get_chat_details'),
    path('admin/chats/<int:room_id>/settings/', views.admin_update_chat_settings, name='admin_update_chat_settings'),
    path('admin/chats/<int:room_id>/participants/update/', views.admin_update_participant_role, name='admin_update_participant_role'),
    path('admin/chats/<int:room_id>/participants/block/', views.admin_block_participant, name='admin_block_participant'),
    path('admin/chats/<int:room_id>/delete/', views.admin_delete_chat, name='admin_delete_chat'),
]