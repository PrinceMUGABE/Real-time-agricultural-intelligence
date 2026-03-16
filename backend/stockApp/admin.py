from django.contrib import admin
from django.utils.html import format_html
from .models import Stock, StockMovement, StockAlert


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ['id', 'product_name', 'farmer', 'quantity', 'quality_grade', 'price_per_kg', 
                   'location', 'is_active', 'created_at']
    list_filter = ['quality_grade', 'is_active', 'location', 'created_at']
    search_fields = ['product_name', 'farmer__full_name', 'farmer__phone_number']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('farmer', 'product_name', 'quantity', 'unit', 'quality_grade', 'price_per_kg')
        }),
        ('Location', {
            'fields': ('location',)
        }),
        ('Additional Info', {
            'fields': ('description', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def stock_status(self, obj):
        if obj.quantity < 100:
            return format_html('<span style="color: red;">Low ({})</span>', obj.quantity)
        return format_html('<span style="color: green;">OK ({})</span>', obj.quantity)
    stock_status.short_description = 'Status'


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['id', 'stock', 'movement_type', 'quantity', 'created_by', 'created_at']
    list_filter = ['movement_type', 'created_at']
    search_fields = ['stock__product_name', 'reference_number', 'notes']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Movement Details', {
            'fields': ('stock', 'movement_type', 'quantity')
        }),
        ('Transfer Destination', {
            'fields': ('to_location',),
            'classes': ('collapse',)
        }),
        ('Additional Info', {
            'fields': ('reference_number', 'notes', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )


@admin.register(StockAlert)
class StockAlertAdmin(admin.ModelAdmin):
    list_display = ['id', 'stock', 'alert_type', 'severity', 'is_resolved', 'created_at']
    list_filter = ['alert_type', 'severity', 'is_resolved', 'created_at']
    search_fields = ['stock__product_name', 'message']
    readonly_fields = ['created_at']