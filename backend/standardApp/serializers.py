from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from decimal import Decimal, InvalidOperation
from django.db import models
from django.utils import timezone

from .models import CropStandard, CropStandardHistory
from userApp.models import CustomUser
from .translations import nt


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for nested serialization."""
    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'phone_number', 'role', 'location']


class CropStandardSerializer(serializers.ModelSerializer):
    """Comprehensive crop standard serializer."""
    created_by_details = UserMinimalSerializer(source='created_by', read_only=True)
    season_display = serializers.CharField(source='get_season_display', read_only=True)
    quality_display = serializers.CharField(source='get_quality_grade_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    crop_type_display = serializers.CharField(source='get_crop_type_display', read_only=True)
    is_accepting = serializers.BooleanField(source='is_accepting_offers', read_only=True)
    estimated_value = serializers.DecimalField(
        source='estimated_total_value', 
        max_digits=10, 
        decimal_places=2, 
        read_only=True
    )
    age_in_days = serializers.SerializerMethodField()

    class Meta:
        model = CropStandard
        fields = [
            'id', 'crop_name', 'crop_type', 'crop_type_display',
            'season', 'season_display', 'harvest_year', 'season_display_with_year',
            'quality_grade', 'quality_display', 'price_per_kg',
            'min_quantity', 'max_quantity', 'description', 'status', 'status_display',
            'preferred_location', 'is_accepting', 'estimated_value', 'age_in_days',
            'created_by', 'created_by_details', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_age_in_days(self, obj):
        """Get age of this standard in days."""
        delta = timezone.now() - obj.created_at
        return delta.days

    def validate_crop_name(self, value):
        """Validate crop name is not empty and properly formatted."""
        if not value or not value.strip():
            raise serializers.ValidationError(
                nt('crop_name_required', self.context.get('lang', 'en'))
            )
        return value.strip().title()

    def validate_harvest_year(self, value):
        """Validate harvest year is within reasonable range."""
        current_year = timezone.now().year
        if value < 2000 or value > current_year + 1:
            raise serializers.ValidationError(
                nt('invalid_harvest_year', self.context.get('lang', 'en'),
                   min_year=2000, max_year=current_year + 1)
            )
        return value

    def validate_price_per_kg(self, value):
        """Validate price is positive."""
        try:
            price = Decimal(str(value))
            if price <= 0:
                raise serializers.ValidationError(
                    nt('price_positive', self.context.get('lang', 'en'))
                )
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError(
                nt('price_required', self.context.get('lang', 'en'))
            )
        return value

    def validate_min_quantity(self, value):
        """Validate minimum quantity is positive."""
        try:
            quantity = Decimal(str(value))
            if quantity <= 0:
                raise serializers.ValidationError(
                    nt('min_quantity_positive', self.context.get('lang', 'en'))
                )
        except (InvalidOperation, TypeError):
            raise serializers.ValidationError(
                nt('quantity_required', self.context.get('lang', 'en'))
            )
        return value

    def validate(self, data):
        """Cross-field validation."""
        # Validate quantity range
        min_qty = data.get('min_quantity')
        max_qty = data.get('max_quantity')
        
        if min_qty and max_qty:
            try:
                if Decimal(str(max_qty)) < Decimal(str(min_qty)):
                    raise serializers.ValidationError({
                        'max_quantity': nt('max_less_than_min', self.context.get('lang', 'en'))
                    })
            except (InvalidOperation, TypeError):
                pass

        # Validate buyer role on creation
        request = self.context.get('request')
        if request and request.method == 'POST':
            if request.user.role != 'buyer':
                raise serializers.ValidationError(
                    nt('buyer_only', self.context.get('lang', 'en'))
                )

        return data


class CropStandardHistorySerializer(serializers.ModelSerializer):
    """Serializer for crop standard history."""
    crop_standard_name = serializers.CharField(source='crop_standard.crop_name', read_only=True)
    changed_by_details = UserMinimalSerializer(source='changed_by', read_only=True)

    class Meta:
        model = CropStandardHistory
        fields = [
            'id', 'crop_standard', 'crop_standard_name', 'action',
            'changed_by', 'changed_by_details', 'changes', 'created_at',
        ]
        read_only_fields = ['created_at']


class CropStandardSummarySerializer(serializers.Serializer):
    """Serializer for summary statistics."""
    total_standards = serializers.IntegerField()
    active_standards = serializers.IntegerField()
    inactive_standards = serializers.IntegerField()
    expired_standards = serializers.IntegerField()
    total_value_potential = serializers.DecimalField(max_digits=15, decimal_places=2)
    avg_price_per_kg = serializers.DecimalField(max_digits=10, decimal_places=2)
    standards_by_crop = serializers.DictField()
    standards_by_season = serializers.DictField()
    standards_by_quality = serializers.DictField()
    recent_standards = CropStandardSerializer(many=True)