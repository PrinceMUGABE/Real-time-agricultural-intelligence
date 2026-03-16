from django.contrib import admin
from django.utils.html import format_html
from .models import CropStandard, CropStandardHistory


@admin.register(CropStandard)
class CropStandardAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'crop_name', 'created_by', 'season', 'harvest_year',
        'quality_grade', 'price_per_kg', 'status', 'created_at'
    ]
    list_filter = ['status', 'season', 'quality_grade', 'crop_type', 'harvest_year']
    search_fields = ['crop_name', 'created_by__full_name', 'created_by__phone_number', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('crop_name', 'crop_type', 'created_by')
        }),
        ('Season Information', {
            'fields': ('season', 'harvest_year')
        }),
        ('Quality & Price', {
            'fields': ('quality_grade', 'price_per_kg')
        }),
        ('Quantity Requirements', {
            'fields': ('min_quantity', 'max_quantity')
        }),
        ('Additional Details', {
            'fields': ('description', 'preferred_location', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        colors = {
            'active': 'green',
            'inactive': 'orange',
            'expired': 'red'
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, 'black'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    actions = ['mark_as_active', 'mark_as_inactive', 'mark_as_expired']
    
    def mark_as_active(self, request, queryset):
        updated = queryset.update(status='active')
        self.message_user(request, f'{updated} standards marked as active.')
    mark_as_active.short_description = "Mark selected standards as Active"
    
    def mark_as_inactive(self, request, queryset):
        updated = queryset.update(status='inactive')
        self.message_user(request, f'{updated} standards marked as inactive.')
    mark_as_inactive.short_description = "Mark selected standards as Inactive"
    
    def mark_as_expired(self, request, queryset):
        updated = queryset.update(status='expired')
        self.message_user(request, f'{updated} standards marked as expired.')
    mark_as_expired.short_description = "Mark selected standards as Expired"


@admin.register(CropStandardHistory)
class CropStandardHistoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'crop_standard', 'action', 'changed_by', 'created_at']
    list_filter = ['action', 'created_at']
    search_fields = ['crop_standard__crop_name', 'changed_by__full_name']
    readonly_fields = ['created_at']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False