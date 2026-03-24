from rest_framework import serializers
from userApp.serializers import UserSerializer
from stockApp.serializers import StockSerializer
from standardApp.serializers import CropStandardSerializer


class MatchDetailSerializer(serializers.Serializer):
    """Serializer for match details breakdown"""
    criterion = serializers.CharField()
    message = serializers.CharField()


class MatchDetailsSerializer(serializers.Serializer):
    """Serializer for complete match details"""
    matches = MatchDetailSerializer(many=True, required=False, default=list)
    mismatches = MatchDetailSerializer(many=True, required=False, default=list)
    warnings = MatchDetailSerializer(many=True, required=False, default=list)


class MarketMatchSerializer(serializers.Serializer):
    """Serializer for market match results"""
    # Related objects
    stock = StockSerializer(read_only=True)
    crop_standard = CropStandardSerializer(read_only=True)
    farmer = UserSerializer(read_only=True)
    buyer = UserSerializer(read_only=True)
    
    # Match data
    match_score = serializers.IntegerField(min_value=0, max_value=100)
    match_details = MatchDetailsSerializer()
    match_percentage = serializers.CharField()
    
    # Quantity data
    available_quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    requested_quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    # Price data
    farmer_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    buyer_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    price_difference = serializers.DecimalField(max_digits=10, decimal_places=2)
    
    # Favorable indicators
    favorable_for_farmer = serializers.BooleanField()
    favorable_for_buyer = serializers.BooleanField()
    
    # Metadata (added by views)
    viewed_at = serializers.DateTimeField(required=False, allow_null=True)
    notified_at = serializers.DateTimeField(required=False, allow_null=True)


class ProductMatchSummarySerializer(serializers.Serializer):
    """Serializer for product-wise match summary"""
    count = serializers.IntegerField()
    total_quantity = serializers.FloatField()
    avg_score = serializers.FloatField()


class LocationMatchSummarySerializer(serializers.Serializer):
    """Serializer for location-wise match summary"""
    count = serializers.IntegerField()
    total_quantity = serializers.FloatField()


class MatchSummarySerializer(serializers.Serializer):
    """Serializer for overall match summary statistics"""
    total_matches = serializers.IntegerField(default=0)
    average_score = serializers.FloatField(default=0)
    high_quality_matches = serializers.IntegerField(default=0)
    total_potential_value = serializers.FloatField(default=0)
    by_product = serializers.DictField(child=serializers.IntegerField(), default=dict)
    by_location = serializers.DictField(child=serializers.IntegerField(), default=dict)


class MarketMatchFilterSerializer(serializers.Serializer):
    """Serializer for market match filter parameters"""
    product_name = serializers.CharField(required=False, allow_blank=True)
    crop_name = serializers.CharField(required=False, allow_blank=True)
    min_quantity = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    quality_grade = serializers.ChoiceField(
        choices=['A', 'B', 'C'], required=False, allow_blank=True
    )
    location = serializers.CharField(required=False, allow_blank=True)
    farmer_id = serializers.IntegerField(required=False, allow_null=True)
    buyer_id = serializers.IntegerField(required=False, allow_null=True)
    min_match_score = serializers.IntegerField(
        min_value=0, max_value=100, required=False, allow_null=True
    )
    season = serializers.CharField(required=False, allow_blank=True)
    
    def validate_min_match_score(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("Match score must be between 0 and 100")
        return value