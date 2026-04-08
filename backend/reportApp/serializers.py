from rest_framework import serializers


class ReportDataSerializer(serializers.Serializer):
    """Serializer for report data"""
    labels = serializers.ListField(child=serializers.CharField())
    values = serializers.ListField(child=serializers.FloatField())
    datasets = serializers.ListField(child=serializers.DictField(), required=False)
    summary = serializers.DictField(required=False)
    metadata = serializers.DictField(required=False)


class DashboardSummarySerializer(serializers.Serializer):
    """Serializer for dashboard summary data"""
    total_count = serializers.IntegerField()
    total_value = serializers.FloatField(required=False)
    percentage_change = serializers.FloatField(required=False)
    breakdown = serializers.DictField(required=False)


class DateRangeSerializer(serializers.Serializer):
    """Serializer for date range filters"""
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    period = serializers.ChoiceField(
        choices=['day', 'week', 'month', 'quarter', 'year'],
        required=False,
        default='month'
    )


class ReportFilterSerializer(serializers.Serializer):
    """Serializer for report filters"""
    date_range = DateRangeSerializer(required=False, default=dict)
    farmer_id = serializers.IntegerField(required=False, allow_null=True)
    buyer_id = serializers.IntegerField(required=False, allow_null=True)
    product_name = serializers.CharField(required=False, allow_null=True)
    location = serializers.CharField(required=False, allow_null=True)
    quality_grade = serializers.ChoiceField(
        choices=['A', 'B', 'C'],
        required=False,
        allow_null=True
    )
    status = serializers.CharField(required=False, allow_null=True)
    
    
