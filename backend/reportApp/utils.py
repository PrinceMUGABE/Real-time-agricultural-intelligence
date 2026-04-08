from datetime import datetime, timedelta
from calendar import monthrange
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Q
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


def get_date_range_from_period(period, start_date=None, end_date=None):
    """
    Get date range based on period or explicit dates.
    Returns (start_date, end_date)
    """
    now = timezone.now().date()
    
    if start_date and end_date:
        return start_date, end_date
    
    if period == 'day':
        start = now
        end = now
    elif period == 'week':
        start = now - timedelta(days=7)
        end = now
    elif period == 'month':
        start = now.replace(day=1)
        end = now
    elif period == 'quarter':
        quarter_start_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=quarter_start_month, day=1)
        end = now
    elif period == 'year':
        start = now.replace(month=1, day=1)
        end = now
    else:
        start = now - timedelta(days=30)
        end = now
    
    return start, end


def get_previous_period_dates(start_date, end_date):
    """Get dates for the same duration previous period"""
    duration = (end_date - start_date).days
    prev_end = start_date - timedelta(days=1)
    prev_start = prev_end - timedelta(days=duration)
    return prev_start, prev_end


def calculate_percentage_change(current, previous):
    """Calculate percentage change between current and previous values"""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 2)


def format_currency(value):
    """Format value as currency string"""
    if value is None:
        return "0 RWF"
    return f"{value:,.0f} RWF"


def format_number(value):
    """Format number with commas"""
    if value is None:
        return "0"
    return f"{value:,.0f}"


def safe_divide(numerator, denominator):
    """Safe division returning 0 if denominator is 0"""
    if denominator == 0:
        return 0
    return numerator / denominator


def group_by_key(data, key, value_key='value'):
    """Group data by a specific key"""
    grouped = {}
    for item in data:
        group_key = item.get(key)
        if group_key not in grouped:
            grouped[group_key] = 0
        grouped[group_key] += item.get(value_key, 0)
    return grouped


def get_top_items(data, key, value_key='value', limit=10):
    """Get top N items from grouped data"""
    if isinstance(data, dict):
        items = [(k, v) for k, v in data.items()]
    else:
        items = [(item.get(key), item.get(value_key, 0)) for item in data]
    
    items.sort(key=lambda x: x[1], reverse=True)
    return items[:limit]


def safe_decimal_to_float(value):
    """Convert Decimal to float safely"""
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value) if value else 0.0



