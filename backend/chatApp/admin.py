# chatApp/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    ChatRoom, ChatParticipant, Message, 
    ChatRoomSettings, MessageVisibilityOverride
)


class ChatParticipantInline(admin.TabularInline):
    """Inline for viewing participants in ChatRoom admin"""
    model = ChatParticipant
    extra = 0
    readonly_fields = ['joined_at', 'last_read_at', 'blocked_at']
    fields = [
        'user', 'role', 'joined_at', 'last_read_at', 
        'is_muted', 'is_blocked', 'blocked_at', 'blocked_by'
    ]
    raw_id_fields = ['user', 'blocked_by']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'blocked_by'
        )


class MessageVisibilityOverrideInline(admin.TabularInline):
    """Inline for message visibility overrides"""
    model = MessageVisibilityOverride
    extra = 0
    readonly_fields = ['created_at']
    fields = ['user', 'is_hidden', 'created_at']
    raw_id_fields = ['user']


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'name', 'chat_type', 'user1', 'user2',
        'is_active', 'created_by', 'created_at', 'participant_count'
    ]
    list_filter = ['chat_type', 'is_active', 'created_at']
    search_fields = [
        'name', 'user1__full_name', 'user2__full_name',
        'user1__phone_number', 'user2__phone_number'
    ]
    readonly_fields = ['created_at', 'updated_at', 'participant_count_display']
    inlines = [ChatParticipantInline]
    raw_id_fields = ['user1', 'user2', 'created_by']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'chat_type', 'is_active')
        }),
        ('One-on-One Chat', {
            'fields': ('user1', 'user2'),
            'classes': ('collapse',),
            'description': 'Only for one-on-one chats'
        }),
        ('Creator', {
            'fields': ('created_by',)
        }),
        ('Statistics', {
            'fields': ('participant_count_display',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user1', 'user2', 'created_by'
        ).prefetch_related('participants')
    
    def participant_count(self, obj):
        """Display participant count in list view"""
        count = obj.participants.count()
        return format_html('<b>{}</b>', count)
    participant_count.short_description = 'Participants'
    participant_count.admin_order_field = 'participants'
    
    def participant_count_display(self, obj):
        """Display participant count in detail view"""
        participants = obj.chat_participants.select_related('user').all()
        result = []
        for p in participants:
            status = '🚫' if p.is_blocked else '✅'
            result.append(f"{status} {p.user.full_name} ({p.role})")
        return format_html('<br>'.join(result)) if result else 'No participants'
    participant_count_display.short_description = 'Participants List'


@admin.register(ChatRoomSettings)
class ChatRoomSettingsAdmin(admin.ModelAdmin):
    list_display = ['chat_room', 'allowed_senders', 'updated_by', 'updated_at']
    list_filter = ['allowed_senders', 'updated_at']
    search_fields = ['chat_room__name']
    raw_id_fields = ['chat_room', 'updated_by']


@admin.register(ChatParticipant)
class ChatParticipantAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'chat_room', 'role', 'joined_at', 
        'last_read_at', 'is_muted', 'is_blocked'
    ]
    list_filter = ['role', 'is_muted', 'is_blocked', 'joined_at']
    search_fields = ['user__full_name', 'chat_room__name']
    list_select_related = ['user', 'chat_room', 'blocked_by']
    readonly_fields = ['joined_at', 'last_read_at', 'blocked_at']
    raw_id_fields = ['user', 'blocked_by']
    
    fieldsets = (
        ('Participant Information', {
            'fields': ('user', 'chat_room', 'role')
        }),
        ('Status', {
            'fields': ('is_muted', 'is_blocked', 'blocked_at', 'blocked_by')
        }),
        ('Timestamps', {
            'fields': ('joined_at', 'last_read_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'chat_room', 'blocked_by'
        )


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'chat_room', 'sender', 'message_type', 
        'content_preview', 'is_deleted', 'visibility', 'created_at'
    ]
    list_filter = [
        'message_type', 'is_deleted', 'visibility', 
        'created_at', 'chat_room__chat_type'
    ]
    search_fields = ['content', 'sender__full_name', 'chat_room__name']
    readonly_fields = ['created_at', 'updated_at', 'deleted_at']
    raw_id_fields = ['chat_room', 'sender', 'deleted_by']
    inlines = [MessageVisibilityOverrideInline]
    
    fieldsets = (
        ('Message Information', {
            'fields': ('chat_room', 'sender', 'message_type', 'content')
        }),
        ('Attachments', {
            'fields': ('attachment',),
            'classes': ('collapse',)
        }),
        ('Deletion', {
            'fields': ('is_deleted', 'deleted_by', 'deleted_at', 'deletion_type', 'visibility'),
            'classes': ('collapse',)
        }),
        ('Read Receipts', {
            'fields': ('read_by',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'chat_room', 'sender', 'deleted_by'
        ).prefetch_related('read_by')
    
    def content_preview(self, obj):
        """Show preview of message content"""
        if obj.is_deleted:
            return format_html('<span style="color: gray;">[DELETED]</span>')
        preview = obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
        return format_html('<span style="color: {};">{}</span>', 
                          'green' if obj.visibility == 'everyone' else 'orange',
                          preview)
    content_preview.short_description = 'Content'


@admin.register(MessageVisibilityOverride)
class MessageVisibilityOverrideAdmin(admin.ModelAdmin):
    list_display = ['message', 'user', 'is_hidden', 'created_at']
    list_filter = ['is_hidden', 'created_at']
    search_fields = ['message__content', 'user__full_name']
    readonly_fields = ['created_at']
    raw_id_fields = ['message', 'user']