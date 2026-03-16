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

    # ── READ-ONLY computed fields ───────────────────────────────────────────
    # Rename the SerializerMethodField so it doesn't shadow the writable
    # 'location' model field.  The frontend receives both:
    #   "location"        → the raw string (writable, from the model field)
    #   "location_detail" → the structured dict (read-only, for display)
    location_detail = serializers.SerializerMethodField()
    movements_count = serializers.SerializerMethodField()
    total_movements_in = serializers.SerializerMethodField()
    total_movements_out = serializers.SerializerMethodField()
    current_value = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = [
            'id', 'farmer', 'farmer_details',
            'product_name', 'quantity', 'unit',
            'quality_grade', 'price_per_kg',
            # 'location' is the plain CharField on the model – writable
            'location',
            # 'location_detail' is the structured read-only version
            'location_detail',
            'description', 'is_active',
            'movements_count', 'total_movements_in', 'total_movements_out',
            'current_value', 'created_at', 'updated_at',
        ]
        read_only_fields = ['farmer', 'created_at', 'updated_at']

    # ── SerializerMethodField implementations ───────────────────────────────

    def get_location_detail(self, obj):
        """Return the location as a structured object for display."""
        return {
            'location': obj.location,
        }

    def get_movements_count(self, obj):
        return obj.movements.count()

    def get_total_movements_in(self, obj):
        total = obj.movements.filter(movement_type='in').aggregate(
            total=models.Sum('quantity')
        )['total']
        return float(total) if total else 0

    def get_total_movements_out(self, obj):
        total = obj.movements.filter(
            movement_type__in=['out', 'transfer']
        ).aggregate(total=models.Sum('quantity'))['total']
        return float(total) if total else 0

    def get_current_value(self, obj):
        """Estimate current stock value using the stock's own price_per_kg."""
        price = float(obj.price_per_kg) if obj.price_per_kg else 1000
        return {
            'estimated': float(obj.quantity) * price,
            'currency': 'RWF',
        }

    # ── Field-level validation ──────────────────────────────────────────────

    def validate_location(self, value):
        """Ensure the combined location string is not blank."""
        if not value or not value.strip():
            raise serializers.ValidationError(
                nt('location_required', self.context.get('lang', 'en'))
            )
        return value.strip()

    def validate_quantity(self, value):
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

    def validate_price_per_kg(self, value):
        if value is not None:
            try:
                price = Decimal(str(value))
                if price < 0:
                    raise serializers.ValidationError(
                        nt('price_positive', self.context.get('lang', 'en'))
                    )
            except (InvalidOperation, TypeError):
                raise serializers.ValidationError(
                    nt('price_required', self.context.get('lang', 'en'))
                )
        return value

    def validate(self, data):
        request = self.context.get('request')
        if request and request.method == 'POST':
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
    to_location_detail = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = [
            'id', 'stock', 'stock_details', 'movement_type', 'quantity',
            # 'to_location' is the plain CharField – writable for transfers
            'to_location',
            # structured read-only versions
            'from_location', 'to_location_detail',
            'reference_number', 'notes',
            'created_by', 'created_by_details', 'created_at',
        ]
        read_only_fields = ['created_by', 'created_at']

    def get_from_location(self, obj):
        return {
            'location': obj.stock.location,
        }

    def get_to_location_detail(self, obj):
        if obj.movement_type == 'transfer':
            return {
                'location': obj.to_location,
            }
        return None

    def validate_quantity(self, value):
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
        movement_type = data.get('movement_type')
        stock = data.get('stock')

        if movement_type in ['out', 'transfer'] and stock:
            quantity = data.get('quantity', 0)
            if self.instance:
                original_qty = self.instance.quantity
                quantity_diff = quantity - original_qty
                if quantity_diff > 0 and quantity_diff > stock.quantity:
                    raise serializers.ValidationError(
                        nt('insufficient_stock', self.context.get('lang', 'en'),
                           available=stock.quantity)
                    )
            else:
                if quantity > stock.quantity:
                    raise serializers.ValidationError(
                        nt('insufficient_stock', self.context.get('lang', 'en'),
                           available=stock.quantity)
                    )

        if movement_type == 'transfer':
            to_loc = data.get('to_location', '').strip()
            if not to_loc:
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
            'resolved_by_details', 'created_at',
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