from rest_framework import serializers
from django.utils.timezone import now
from .models import Contract, PaymentRecord, ContractActivity
from userApp.models import CustomUser
from django.db.models import Q
from django.db import models


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'full_name', 'phone_number', 'email', 'role', 'location', 'language']


class PaymentRecordSerializer(serializers.ModelSerializer):
    recorded_by_detail = UserBriefSerializer(source='recorded_by', read_only=True)
    confirmed_by_detail = UserBriefSerializer(source='confirmed_by', read_only=True)

    class Meta:
        model = PaymentRecord
        fields = [
            'id', 'contract', 'amount', 'payment_method', 'reference_number',
            'status', 'notes', 'paid_at', 'created_at',
            'confirmed_at', 'confirmed_by', 'confirmed_by_detail',
            'recorded_by', 'recorded_by_detail',
        ]
        read_only_fields = ['id', 'created_at', 'confirmed_at', 'confirmed_by', 'status']


class ContractActivitySerializer(serializers.ModelSerializer):
    performed_by_detail = UserBriefSerializer(source='performed_by', read_only=True)
    
    class Meta:
        model = ContractActivity
        fields = ['id', 'activity_type', 'performed_by', 'performed_by_detail', 'details', 'created_at']


class ContractSerializer(serializers.ModelSerializer):
    buyer_detail = UserBriefSerializer(source='buyer', read_only=True)
    farmer_detail = UserBriefSerializer(source='farmer', read_only=True)
    deliver_detail = UserBriefSerializer(source='deliver', read_only=True)
    created_by_detail = UserBriefSerializer(source='created_by', read_only=True)
    admin_confirmed_by_detail = UserBriefSerializer(source='admin_confirmed_by', read_only=True)

    payment_records = PaymentRecordSerializer(many=True, read_only=True)
    activities = ContractActivitySerializer(many=True, read_only=True)

    balance_due = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    is_fully_paid = serializers.BooleanField(read_only=True)
    both_parties_accepted = serializers.BooleanField(read_only=True)
    can_proceed_to_payment = serializers.BooleanField(read_only=True)
    can_start_delivery = serializers.BooleanField(read_only=True)
    needs_admin_confirmation = serializers.BooleanField(read_only=True)

    class Meta:
        model = Contract
        fields = [
            'id', 'buyer', 'buyer_detail', 'farmer', 'farmer_detail',
            'deliver', 'deliver_detail', 'stock',
            'crop_name', 'price_per_kg', 'quantity_kg', 'total_amount',
            'delivery_location',
            'status', 'farmer_status', 'buyer_status',
            'admin_confirmed', 'admin_confirmed_at', 'admin_confirmed_by', 'admin_confirmed_by_detail',
            'payment_option', 'payment_status', 'amount_paid', 'balance_due', 
            'is_fully_paid', 'payment_due_date',
            'delivery_status', 'delivery_notes', 'delivery_date', 'delivery_completed_at',
            'stock_movement_created',
            'notes', 'created_at', 'updated_at',
            'created_by', 'created_by_detail',
            'both_parties_accepted', 'can_proceed_to_payment', 
            'can_start_delivery', 'needs_admin_confirmation',
            'payment_records', 'activities',
        ]
        read_only_fields = [
            'id', 'total_amount', 'amount_paid', 'created_at', 'updated_at',
            'status', 'payment_status', 'delivery_status', 'delivery_completed_at',
            'farmer_status', 'buyer_status', 'created_by', 'admin_confirmed',
            'admin_confirmed_at', 'admin_confirmed_by', 'stock_movement_created',
        ]


class CreateContractSerializer(serializers.Serializer):
    """Serializer for creating a new contract"""
    buyer = serializers.IntegerField()
    farmer = serializers.IntegerField()
    stock = serializers.IntegerField(required=False, allow_null=True)
    crop_name = serializers.CharField(max_length=255)
    price_per_kg = serializers.DecimalField(max_digits=12, decimal_places=2)
    quantity_kg = serializers.DecimalField(max_digits=12, decimal_places=2)
    deliver = serializers.IntegerField(required=False, allow_null=True)
    delivery_location = serializers.CharField(required=False, allow_blank=True, default='')
    delivery_date = serializers.DateField(required=False, allow_null=True)
    payment_option = serializers.ChoiceField(choices=Contract.PAYMENT_OPTION_CHOICES, default='full')
    payment_due_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    delivery_notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_buyer(self, value):
        try:
            user = CustomUser.objects.get(id=value, is_active=True)
            if user.role != 'buyer':
                raise serializers.ValidationError("Specified user is not a buyer.")
            return user
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Buyer not found or inactive.")

    def validate_farmer(self, value):
        try:
            user = CustomUser.objects.get(id=value, is_active=True)
            if user.role != 'farmer':
                raise serializers.ValidationError("Specified user is not a farmer.")
            return user
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Farmer not found or inactive.")

    def validate_price_per_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price per kg must be greater than zero.")
        return value

    def validate_quantity_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate(self, data):
        buyer = data.get('buyer')
        farmer = data.get('farmer')
        crop_name = data.get('crop_name', '').strip().lower()

        if buyer and farmer and buyer.id == farmer.id:
            raise serializers.ValidationError("Buyer and farmer cannot be the same user.")
        
        # ── Duplicate active contract check ───────────────────────────────────
        ACTIVE_STATUSES = [Contract.STATUS_PENDING, Contract.STATUS_ACCEPTED]

        duplicate_qs = Contract.objects.filter(
            crop_name__iexact=crop_name,
            status__in=ACTIVE_STATUSES,
        ).filter(
            models.Q(buyer=buyer) | models.Q(farmer=farmer)
        )

        if duplicate_qs.exists():
            conflicting = duplicate_qs.first()
            parties = []
            if conflicting.buyer_id == buyer.id:
                parties.append("buyer")
            if conflicting.farmer_id == farmer.id:
                parties.append("farmer")

            raise serializers.ValidationError(
                f"An active contract for '{data.get('crop_name')}' already exists "
                f"involving this {' and '.join(parties)} (Contract #{conflicting.id}, "
                f"status: {conflicting.status})."
            )

        # ── Stock validation ───────────────────────────────────────────────────
        if data.get('stock'):
            from stockApp.models import Stock
            try:
                stock = Stock.objects.get(id=data['stock'], is_active=True)
                if stock.farmer_id != farmer.id:
                    raise serializers.ValidationError("Stock does not belong to the specified farmer.")
                if data['quantity_kg'] > stock.quantity:
                    raise serializers.ValidationError(
                        f"Insufficient stock. Available: {stock.quantity}kg, Requested: {data['quantity_kg']}kg"
                    )
            except Stock.DoesNotExist:
                raise serializers.ValidationError("Stock not found or inactive.")
        
        if data.get('payment_option') == 'partial' and not data.get('payment_due_date'):
            raise serializers.ValidationError("Payment due date is required for partial payments.")
        
        return data


class UpdateContractSerializer(serializers.Serializer):
    """Serializer for updating contract details"""
    crop_name = serializers.CharField(max_length=255, required=False)
    price_per_kg = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    quantity_kg = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    deliver = serializers.IntegerField(required=False, allow_null=True)
    delivery_location = serializers.CharField(required=False, allow_blank=True)
    delivery_date = serializers.DateField(required=False, allow_null=True)
    delivery_notes = serializers.CharField(required=False, allow_blank=True)
    payment_due_date = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_price_per_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price per kg must be greater than zero.")
        return value

    def validate_quantity_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value


class UpdateDeliverySerializer(serializers.Serializer):
    """Serializer for updating delivery details"""
    delivery_status = serializers.CharField(required=False, allow_blank=True)
    delivery_date = serializers.DateField(required=False, allow_null=True)
    delivery_notes = serializers.CharField(required=False, allow_blank=True)

class AddPaymentSerializer(serializers.Serializer):
    """Serializer for adding a payment"""
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=PaymentRecord.METHOD_CHOICES)
    reference_number = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    paid_at = serializers.DateTimeField(required=False)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value


class StartDeliverySerializer(serializers.Serializer):
    """Serializer for starting delivery"""
    delivery_notes = serializers.CharField(required=False, allow_blank=True, default='')
    deliver_person = serializers.IntegerField(required=False, allow_null=True, help_text="Assign a deliver person")


class CompleteDeliverySerializer(serializers.Serializer):
    """Serializer for completing delivery"""
    delivery_notes = serializers.CharField(required=False, allow_blank=True, default='')
    create_stock_movement = serializers.BooleanField(default=True, help_text="Create stock movement record")