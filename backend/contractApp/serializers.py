from rest_framework import serializers
from django.utils.timezone import now
from .models import Contract, PaymentRecord
from userApp.models import CustomUser


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CustomUser
        fields = ['id', 'full_name', 'phone_number', 'email', 'role', 'location']


class PaymentRecordSerializer(serializers.ModelSerializer):
    recorded_by_detail = UserBriefSerializer(source='recorded_by', read_only=True)
    confirmed_by_detail = UserBriefSerializer(source='confirmed_by', read_only=True)

    class Meta:
        model  = PaymentRecord
        fields = [
            'id', 'contract', 'amount', 'payment_method', 'reference_number',
            'status', 'notes', 'paid_at', 'created_at',
            'confirmed_at', 'confirmed_by', 'confirmed_by_detail',
            'recorded_by', 'recorded_by_detail',
        ]
        read_only_fields = ['id', 'created_at', 'confirmed_at', 'confirmed_by', 'status']


class ContractSerializer(serializers.ModelSerializer):
    buyer_detail   = UserBriefSerializer(source='buyer',   read_only=True)
    farmer_detail  = UserBriefSerializer(source='farmer',  read_only=True)
    deliver_detail = UserBriefSerializer(source='deliver', read_only=True)
    created_by_detail = UserBriefSerializer(source='created_by', read_only=True)

    payment_records = PaymentRecordSerializer(many=True, read_only=True)

    balance_due      = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    is_fully_paid    = serializers.BooleanField(read_only=True)
    both_parties_accepted = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Contract
        fields = [
            'id', 'buyer', 'buyer_detail', 'farmer', 'farmer_detail',
            'deliver', 'deliver_detail', 'stock',
            'crop_name', 'price_per_kg', 'quantity_kg', 'total_amount',
            'status', 'farmer_status', 'buyer_status',
            'payment_status', 'amount_paid', 'balance_due', 'is_fully_paid',
            'delivery_status', 'delivery_notes', 'delivery_date',
            'notes', 'created_at', 'updated_at',
            'created_by', 'created_by_detail',
            'both_parties_accepted',
            'payment_records',
        ]
        read_only_fields = [
            'id', 'total_amount', 'amount_paid', 'created_at', 'updated_at',
            'status', 'payment_status', 'delivery_status',
            'farmer_status', 'buyer_status', 'created_by',
        ]


class CreateContractSerializer(serializers.Serializer):
    buyer        = serializers.IntegerField()
    farmer       = serializers.IntegerField()
    stock        = serializers.IntegerField(required=False, allow_null=True)
    crop_name    = serializers.CharField(max_length=255)
    price_per_kg = serializers.DecimalField(max_digits=12, decimal_places=2)
    quantity_kg  = serializers.DecimalField(max_digits=12, decimal_places=2)
    deliver      = serializers.IntegerField(required=False, allow_null=True)
    delivery_date = serializers.DateField(required=False, allow_null=True)
    notes        = serializers.CharField(required=False, allow_blank=True, default='')

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
        buyer  = data.get('buyer')
        farmer = data.get('farmer')
        if buyer and farmer and buyer.id == farmer.id:
            raise serializers.ValidationError("Buyer and farmer cannot be the same user.")
        return data


class UpdateContractSerializer(serializers.Serializer):
    crop_name     = serializers.CharField(max_length=255, required=False)
    price_per_kg  = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    quantity_kg   = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    deliver       = serializers.IntegerField(required=False, allow_null=True)
    delivery_date = serializers.DateField(required=False, allow_null=True)
    delivery_notes = serializers.CharField(required=False, allow_blank=True)
    notes         = serializers.CharField(required=False, allow_blank=True)

    def validate_price_per_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price per kg must be greater than zero.")
        return value

    def validate_quantity_kg(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value


class AddPaymentSerializer(serializers.Serializer):
    amount           = serializers.DecimalField(max_digits=14, decimal_places=2)
    payment_method   = serializers.ChoiceField(choices=PaymentRecord.METHOD_CHOICES)
    reference_number = serializers.CharField(required=False, allow_blank=True, default='')
    notes            = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value