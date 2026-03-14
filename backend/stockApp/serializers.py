from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from decimal import Decimal, InvalidOperation
from django.db import models

from .models import Stock, StockMovement, StockAlert
from userApp.models import CustomUser
from .translations import nt


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for nested serialization."""
    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'phone_number', 'role']


class StockSerializer(serializers.ModelSerializer):
    """Comprehensive stock serializer with nested farmer info."""
    farmer_details = UserMinimalSerializer(source='farmer', read_only=True)
    location = serializers.SerializerMethodField()
    movements_count = serializers.SerializerMethodField()
    total_movements_in = serializers.SerializerMethodField()
    total_movements_out = serializers.SerializerMethodField()
    current_value = serializers.SerializerMethodField()
    
    class Meta:
        model = Stock
        fields = [
            'id', 'farmer', 'farmer_details', 'product_name', 'quantity',
            'unit', 'quality_grade', 'location', 'description', 'is_active',
            'movements_count', 'total_movements_in', 'total_movements_out',
            'current_value', 'created_at', 'updated_at'
        ]
        read_only_fields = ['farmer', 'created_at', 'updated_at']

    def get_location(self, obj):
        """Return full location as a structured object."""
        return {
            'location': obj.location,
        
        }

    def get_movements_count(self, obj):
        """Get total number of movements for this stock."""
        return obj.movements.count()

    def get_total_movements_in(self, obj):
        """Calculate total quantity added to stock."""
        total = obj.movements.filter(movement_type='in').aggregate(
            total=models.Sum('quantity')
        )['total']
        return float(total) if total else 0

    def get_total_movements_out(self, obj):
        """Calculate total quantity removed from stock."""
        total = obj.movements.filter(
            movement_type__in=['out', 'transfer']
        ).aggregate(total=models.Sum('quantity'))['total']
        return float(total) if total else 0

    def get_current_value(self, obj):
        """Estimate current stock value (customize based on your pricing)."""
        # This is a placeholder - implement your own pricing logic
        return {
            'estimated': float(obj.quantity) * 1000,  # Example: 1000 RWF per kg
            'currency': 'RWF'
        }

    def validate_quantity(self, value):
        """Validate quantity is positive."""
        try:
            quantity = Decimal(str(value))
            if quantity <= 0:
                raise serializers.ValidationError(
                    nt('quantity_positive', self.context.get('lang', 'en'))
                )
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError(
                nt('quantity_required', self.context.get('lang', 'en'))
            )
        return value

    def validate(self, data):
        """Additional validation."""
        request = self.context.get('request')
        if request and request.method == 'POST':
            # Ensure only farmers can create stocks
            if request.user.role != 'farmer':
                raise serializers.ValidationError(
                    nt('farmer_only', self.context.get('lang', 'en'))
                )
        
        return data


class StockMovementSerializer(serializers.ModelSerializer):
    """Comprehensive movement serializer."""
    stock_details = StockSerializer(source='stock', read_only=True)
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    from_location = serializers.SerializerMethodField()
    to_location = serializers.SerializerMethodField()
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'stock', 'stock_details', 'movement_type', 'quantity',
            'to_location',
            'from_location', 'to_location', 'reference_number', 'notes',
            'created_by', 'created_by_details', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_from_location(self, obj):
        """Get source location from the stock."""
        return {
            'location': obj.stock.location,
        }

    def get_to_location(self, obj):
        """Get destination location for transfers."""
        if obj.movement_type == 'transfer':
            return {
                'location': obj.to_location,
            }
        return None

    def validate_quantity(self, value):
        """Validate quantity is positive."""
        try:
            quantity = Decimal(str(value))
            if quantity <= 0:
                raise serializers.ValidationError(
                    nt('quantity_positive', self.context.get('lang', 'en'))
                )
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError(
                nt('quantity_required', self.context.get('lang', 'en'))
            )
        return value

    def validate(self, data):
        """Movement-specific validation."""
        movement_type = data.get('movement_type')
        stock = data.get('stock')
        
        # For outgoing movements on existing stock
        if movement_type in ['out', 'transfer'] and stock:
            quantity = data.get('quantity', 0)
            
            # Check if this is an update to existing movement
            if self.instance:
                original_qty = self.instance.quantity
                quantity_diff = quantity - original_qty
                if quantity_diff > 0 and quantity_diff > stock.quantity:
                    raise serializers.ValidationError(
                        nt('insufficient_stock', self.context.get('lang', 'en'),
                           available=stock.quantity)
                    )
            else:
                # New movement
                if quantity > stock.quantity:
                    raise serializers.ValidationError(
                        nt('insufficient_stock', self.context.get('lang', 'en'),
                           available=stock.quantity)
                    )

        # Validate transfer destination
        if movement_type == 'transfer':
            if not all([
                data.get('to_location')
            ]):
                raise serializers.ValidationError(
                    nt('location_required', self.context.get('lang', 'en'))
                )

        return data


class StockAlertSerializer(serializers.ModelSerializer):
    """Serializer for stock alerts."""
    stock_details = StockSerializer(source='stock', read_only=True)
    resolved_by_details = UserMinimalSerializer(source='resolved_by', read_only=True)
    
    class Meta:
        model = StockAlert
        fields = [
            'id', 'stock', 'stock_details', 'alert_type', 'severity',
            'message', 'is_resolved', 'resolved_at', 'resolved_by',
            'resolved_by_details', 'created_at'
        ]
        read_only_fields = ['created_at']


class StockSummarySerializer(serializers.Serializer):
    """Serializer for stock summary statistics."""
    total_stocks = serializers.IntegerField()
    total_quantity = serializers.FloatField()
    active_stocks = serializers.IntegerField()
    low_stock_alerts = serializers.IntegerField()
    total_movements = serializers.IntegerField()
    recent_movements = StockMovementSerializer(many=True)
    stocks_by_quality = serializers.DictField()
    stocks_by_location = serializers.DictField()