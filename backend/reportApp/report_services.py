from datetime import datetime, timedelta
from django.db.models import Sum, Count, Avg, Q, F, DecimalField
from django.db.models.functions import TruncMonth, TruncWeek, TruncDate
from django.utils import timezone
from decimal import Decimal
from userApp.models import CustomUser
from stockApp.models import Stock, StockMovement
from standardApp.models import CropStandard
from contractApp.models import Contract, PaymentRecord
from notificationApp.models import Notification
from .utils import (
    get_date_range_from_period, calculate_percentage_change,
    safe_decimal_to_float, group_by_key, get_top_items
)
import logging

logger = logging.getLogger(__name__)


class AdminReportService:
    """Service for generating admin reports and dashboard data"""
    
    @staticmethod
    def get_dashboard_summary(date_range_filter=None):
        """
        Get summary statistics for admin dashboard
        Returns summary data for frontend to display
        """
        start_date, end_date = get_date_range_from_period(
            date_range_filter.get('period', 'month') if date_range_filter else 'month',
            date_range_filter.get('start_date') if date_range_filter else None,
            date_range_filter.get('end_date') if date_range_filter else None
        )
        
        # Get previous period for comparison
        duration = (end_date - start_date).days
        prev_end = start_date - timedelta(days=1)
        prev_start = prev_end - timedelta(days=duration)
        
        # Current period stats
        current_users = CustomUser.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        current_stocks = Stock.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        current_contracts = Contract.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        current_contracts_accepted = current_contracts.filter(status=Contract.STATUS_ACCEPTED)
        
        # Previous period stats
        prev_users = CustomUser.objects.filter(
            created_at__date__gte=prev_start,
            created_at__date__lte=prev_end
        )
        
        prev_stocks = Stock.objects.filter(
            created_at__date__gte=prev_start,
            created_at__date__lte=prev_end
        )
        
        prev_contracts = Contract.objects.filter(
            created_at__date__gte=prev_start,
            created_at__date__lte=prev_end
        )
        
        return {
            'total_users': {
                'current': current_users.count(),
                'previous': prev_users.count(),
                'percentage_change': calculate_percentage_change(
                    current_users.count(), prev_users.count()
                )
            },
            'total_farmers': {
                'current': current_users.filter(role='farmer').count(),
                'previous': prev_users.filter(role='farmer').count(),
                'percentage_change': calculate_percentage_change(
                    current_users.filter(role='farmer').count(),
                    prev_users.filter(role='farmer').count()
                )
            },
            'total_buyers': {
                'current': current_users.filter(role='buyer').count(),
                'previous': prev_users.filter(role='buyer').count(),
                'percentage_change': calculate_percentage_change(
                    current_users.filter(role='buyer').count(),
                    prev_users.filter(role='buyer').count()
                )
            },
            'total_stocks': {
                'current': current_stocks.count(),
                'previous': prev_stocks.count(),
                'percentage_change': calculate_percentage_change(
                    current_stocks.count(), prev_stocks.count()
                )
            },
            'total_stock_value': {
                'current': float(current_stocks.aggregate(
                    total=Sum(F('quantity') * F('price_per_kg'))
                )['total'] or 0),
                'previous': float(prev_stocks.aggregate(
                    total=Sum(F('quantity') * F('price_per_kg'))
                )['total'] or 0)
            },
            'total_contracts': {
                'current': current_contracts.count(),
                'previous': prev_contracts.count(),
                'percentage_change': calculate_percentage_change(
                    current_contracts.count(), prev_contracts.count()
                )
            },
            'active_contracts': {
                'current': current_contracts_accepted.count(),
                'previous': prev_contracts.filter(status=Contract.STATUS_ACCEPTED).count()
            },
            'contracts_value': {
                'current': float(current_contracts.aggregate(
                    total=Sum('total_amount')
                )['total'] or 0),
                'previous': float(prev_contracts.aggregate(
                    total=Sum('total_amount')
                )['total'] or 0)
            },
            'total_payments': {
                'current': float(PaymentRecord.objects.filter(
                    paid_at__date__gte=start_date,
                    paid_at__date__lte=end_date,
                    status=PaymentRecord.STATUS_CONFIRMED
                ).aggregate(total=Sum('amount'))['total'] or 0),
                'previous': float(PaymentRecord.objects.filter(
                    paid_at__date__gte=prev_start,
                    paid_at__date__lte=prev_end,
                    status=PaymentRecord.STATUS_CONFIRMED
                ).aggregate(total=Sum('amount'))['total'] or 0)
            },
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        }
    
    @staticmethod
    def get_user_growth_report(period='month'):
        """Get user growth over time"""
        now = timezone.now()
        
        if period == 'week':
            start_date = now - timedelta(days=30)
            trunc_func = TruncWeek('created_at')
            interval = 'week'
        elif period == 'month':
            start_date = now - timedelta(days=180)
            trunc_func = TruncMonth('created_at')
            interval = 'month'
        else:
            start_date = now - timedelta(days=365)
            trunc_func = TruncMonth('created_at')
            interval = 'month'
        
        users_by_period = CustomUser.objects.filter(
            created_at__gte=start_date
        ).annotate(
            period_date=trunc_func
        ).values('period_date').annotate(
            total=Count('id'),
            farmers=Count('id', filter=Q(role='farmer')),
            buyers=Count('id', filter=Q(role='buyer')),
            admins=Count('id', filter=Q(role='admin'))
        ).order_by('period_date')
        
        labels = []
        total_data = []
        farmers_data = []
        buyers_data = []
        
        for item in users_by_period:
            if item['period_date']:
                if interval == 'week':
                    label = f"Week {item['period_date'].isocalendar()[1]}"
                else:
                    label = item['period_date'].strftime('%B %Y')
                labels.append(label)
                total_data.append(item['total'])
                farmers_data.append(item['farmers'])
                buyers_data.append(item['buyers'])
        
        return {
            'labels': labels,
            'datasets': [
                {
                    'label': 'Total Users',
                    'data': total_data,
                    'borderColor': '#2d5a2d',
                    'backgroundColor': 'rgba(45, 90, 45, 0.1)'
                },
                {
                    'label': 'Farmers',
                    'data': farmers_data,
                    'borderColor': '#1565c0',
                    'backgroundColor': 'rgba(21, 101, 192, 0.1)'
                },
                {
                    'label': 'Buyers',
                    'data': buyers_data,
                    'backgroundColor': 'rgba(183, 110, 10, 0.1)'
                }
            ],
            'summary': {
                'total_users': CustomUser.objects.count(),
                'total_farmers': CustomUser.objects.filter(role='farmer').count(),
                'total_buyers': CustomUser.objects.filter(role='buyer').count()
            }
        }
    
    @staticmethod
    def get_stock_report(filters=None):
        """Generate stock report with filters"""
        filters = filters or {}
        stocks = Stock.objects.filter(is_active=True)
        
        # Apply filters
        if filters.get('farmer_id'):
            stocks = stocks.filter(farmer_id=filters['farmer_id'])
        if filters.get('product_name'):
            stocks = stocks.filter(product_name__icontains=filters['product_name'])
        if filters.get('location'):
            stocks = stocks.filter(location__icontains=filters['location'])
        if filters.get('quality_grade'):
            stocks = stocks.filter(quality_grade=filters['quality_grade'])
        
        # Group by product
        by_product = stocks.values('product_name').annotate(
            total_quantity=Sum('quantity'),
            total_value=Sum(F('quantity') * F('price_per_kg')),
            avg_price=Avg('price_per_kg'),
            count=Count('id')
        ).order_by('-total_quantity')
        
        # Group by location
        by_location = stocks.values('location').annotate(
            total_quantity=Sum('quantity'),
            total_value=Sum(F('quantity') * F('price_per_kg')),
            count=Count('id')
        ).order_by('-total_quantity')
        
        # Group by quality
        by_quality = stocks.values('quality_grade').annotate(
            total_quantity=Sum('quantity'),
            total_value=Sum(F('quantity') * F('price_per_kg')),
            count=Count('id')
        ).order_by('quality_grade')
        
        # Summary
        summary = stocks.aggregate(
            total_quantity=Sum('quantity'),
            total_value=Sum(F('quantity') * F('price_per_kg')),
            avg_price=Avg('price_per_kg'),
            total_stocks=Count('id')
        )
        
        return {
            'by_product': {
                'labels': [item['product_name'] for item in by_product],
                'values': [float(item['total_quantity']) for item in by_product],
                'details': [
                    {
                        'product': item['product_name'],
                        'quantity': float(item['total_quantity']),
                        'value': float(item['total_value']),
                        'avg_price': float(item['avg_price']),
                        'count': item['count']
                    }
                    for item in by_product
                ]
            },
            'by_location': {
                'labels': [item['location'] for item in by_location],
                'values': [float(item['total_quantity']) for item in by_location],
                'details': [
                    {
                        'location': item['location'],
                        'quantity': float(item['total_quantity']),
                        'value': float(item['total_value']),
                        'count': item['count']
                    }
                    for item in by_location
                ]
            },
            'by_quality': {
                'labels': [item['quality_grade'] for item in by_quality],
                'values': [float(item['total_quantity']) for item in by_quality],
                'details': [
                    {
                        'grade': item['quality_grade'],
                        'quantity': float(item['total_quantity']),
                        'value': float(item['total_value']),
                        'count': item['count']
                    }
                    for item in by_quality
                ]
            },
            'summary': {
                'total_quantity': float(summary['total_quantity'] or 0),
                'total_value': float(summary['total_value'] or 0),
                'avg_price': float(summary['avg_price'] or 0),
                'total_stocks': summary['total_stocks'] or 0
            }
        }
    
    @staticmethod
    def get_contract_report(filters=None):
        """Generate contract report with filters"""
        filters = filters or {}
        contracts = Contract.objects.all()
        
        # Apply filters
        if filters.get('farmer_id'):
            contracts = contracts.filter(farmer_id=filters['farmer_id'])
        if filters.get('buyer_id'):
            contracts = contracts.filter(buyer_id=filters['buyer_id'])
        if filters.get('status'):
            contracts = contracts.filter(status=filters['status'])
        
        # Group by status
        by_status = contracts.values('status').annotate(
            count=Count('id'),
            total_value=Sum('total_amount'),
            avg_value=Avg('total_amount')
        ).order_by('status')
        
        # Group by product
        by_product = contracts.values('crop_name').annotate(
            count=Count('id'),
            total_quantity=Sum('quantity_kg'),
            total_value=Sum('total_amount'),
            avg_price=Avg('price_per_kg')
        ).order_by('-total_value')[:10]
        
        # Completed vs pending
        completed = contracts.filter(status=Contract.STATUS_COMPLETED)
        pending = contracts.filter(status__in=[Contract.STATUS_PENDING, Contract.STATUS_ACCEPTED])
        
        return {
            'by_status': {
                'labels': [item['status'] for item in by_status],
                'values': [item['count'] for item in by_status],
                'details': [
                    {
                        'status': item['status'],
                        'count': item['count'],
                        'total_value': float(item['total_value'] or 0),
                        'avg_value': float(item['avg_value'] or 0)
                    }
                    for item in by_status
                ]
            },
            'by_product': {
                'labels': [item['crop_name'] for item in by_product],
                'values': [float(item['total_value'] or 0) for item in by_product],
                'details': [
                    {
                        'product': item['crop_name'],
                        'count': item['count'],
                        'quantity': float(item['total_quantity'] or 0),
                        'value': float(item['total_value'] or 0),
                        'avg_price': float(item['avg_price'] or 0)
                    }
                    for item in by_product
                ]
            },
            'summary': {
                'total_contracts': contracts.count(),
                'total_value': float(contracts.aggregate(total=Sum('total_amount'))['total'] or 0),
                'completed_count': completed.count(),
                'completed_value': float(completed.aggregate(total=Sum('total_amount'))['total'] or 0),
                'pending_count': pending.count(),
                'pending_value': float(pending.aggregate(total=Sum('total_amount'))['total'] or 0),
                'avg_contract_value': float(contracts.aggregate(avg=Avg('total_amount'))['avg'] or 0)
            }
        }
    
    @staticmethod
    def get_payment_report(filters=None):
        """Generate payment report"""
        filters = filters or {}
        payments = PaymentRecord.objects.filter(status=PaymentRecord.STATUS_CONFIRMED)
        
        # Group by payment method
        by_method = payments.values('payment_method').annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        )
        
        # Payments over time
        payments_over_time = payments.annotate(
            month=TruncMonth('paid_at')
        ).values('month').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('month')
        
        return {
            'by_method': {
                'labels': [item['payment_method'] for item in by_method],
                'values': [float(item['total_amount'] or 0) for item in by_method],
                'details': [
                    {
                        'method': item['payment_method'],
                        'amount': float(item['total_amount'] or 0),
                        'count': item['count']
                    }
                    for item in by_method
                ]
            },
            'over_time': {
                'labels': [item['month'].strftime('%B %Y') for item in payments_over_time if item['month']],
                'values': [float(item['total'] or 0) for item in payments_over_time],
                'details': [
                    {
                        'month': item['month'].strftime('%Y-%m') if item['month'] else None,
                        'amount': float(item['total'] or 0),
                        'count': item['count']
                    }
                    for item in payments_over_time
                ]
            },
            'summary': {
                'total_payments': float(payments.aggregate(total=Sum('amount'))['total'] or 0),
                'total_transactions': payments.count(),
                'avg_payment': float(payments.aggregate(avg=Avg('amount'))['avg'] or 0)
            }
        }


class FarmerReportService:
    """Service for generating farmer-specific reports"""
    
    @staticmethod
    def get_dashboard_summary(farmer_id, date_range_filter=None):
        """Get summary statistics for farmer dashboard"""
        start_date, end_date = get_date_range_from_period(
            date_range_filter.get('period', 'month') if date_range_filter else 'month',
            date_range_filter.get('start_date') if date_range_filter else None,
            date_range_filter.get('end_date') if date_range_filter else None
        )
        
        # Get farmer's data
        stocks = Stock.objects.filter(farmer_id=farmer_id)
        contracts = Contract.objects.filter(farmer_id=farmer_id)
        
        # Current period stats
        current_stocks = stocks.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        current_contracts = contracts.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        current_payments = PaymentRecord.objects.filter(
            contract__farmer_id=farmer_id,
            paid_at__date__gte=start_date,
            paid_at__date__lte=end_date,
            status=PaymentRecord.STATUS_CONFIRMED
        )
        
        return {
            'total_stocks': {
                'current': stocks.count(),
                'active': stocks.filter(is_active=True).count()
            },
            'total_quantity': {
                'current': float(stocks.aggregate(total=Sum('quantity'))['total'] or 0),
                'value': float(stocks.aggregate(
                    total=Sum(F('quantity') * F('price_per_kg'))
                )['total'] or 0)
            },
            'total_contracts': {
                'current': contracts.count(),
                'accepted': contracts.filter(status=Contract.STATUS_ACCEPTED).count(),
                'completed': contracts.filter(status=Contract.STATUS_COMPLETED).count()
            },
            'contracts_value': {
                'current': float(contracts.aggregate(total=Sum('total_amount'))['total'] or 0),
                'received': float(current_payments.aggregate(total=Sum('amount'))['total'] or 0)
            },
            'avg_price_per_kg': float(stocks.aggregate(avg=Avg('price_per_kg'))['avg'] or 0),
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        }
    
    @staticmethod
    def get_stock_performance(farmer_id):
        """Get stock performance metrics for a farmer"""
        stocks = Stock.objects.filter(farmer_id=farmer_id, is_active=True)
        
        # Top selling products
        top_products = stocks.values('product_name').annotate(
            total_quantity=Sum('quantity'),
            avg_price=Avg('price_per_kg'),
            count=Count('id')
        ).order_by('-total_quantity')[:5]
        
        # Stock by location
        by_location = stocks.values('location').annotate(
            total_quantity=Sum('quantity'),
            total_value=Sum(F('quantity') * F('price_per_kg')),
            count=Count('id')
        ).order_by('-total_quantity')
        
        # Stock by quality
        by_quality = stocks.values('quality_grade').annotate(
            total_quantity=Sum('quantity'),
            avg_price=Avg('price_per_kg'),
            count=Count('id')
        ).order_by('quality_grade')
        
        return {
            'top_products': {
                'labels': [item['product_name'] for item in top_products],
                'values': [float(item['total_quantity']) for item in top_products],
                'details': [
                    {
                        'product': item['product_name'],
                        'quantity': float(item['total_quantity']),
                        'avg_price': float(item['avg_price']),
                        'count': item['count']
                    }
                    for item in top_products
                ]
            },
            'by_location': {
                'labels': [item['location'] for item in by_location],
                'values': [float(item['total_quantity']) for item in by_location],
                'details': [
                    {
                        'location': item['location'],
                        'quantity': float(item['total_quantity']),
                        'value': float(item['total_value']),
                        'count': item['count']
                    }
                    for item in by_location
                ]
            },
            'by_quality': {
                'labels': [item['quality_grade'] for item in by_quality],
                'values': [float(item['total_quantity']) for item in by_quality],
                'details': [
                    {
                        'grade': item['quality_grade'],
                        'quantity': float(item['total_quantity']),
                        'avg_price': float(item['avg_price']),
                        'count': item['count']
                    }
                    for item in by_quality
                ]
            },
            'summary': {
                'total_products': stocks.values('product_name').distinct().count(),
                'total_quantity': float(stocks.aggregate(total=Sum('quantity'))['total'] or 0),
                'total_value': float(stocks.aggregate(
                    total=Sum(F('quantity') * F('price_per_kg'))
                )['total'] or 0),
                'avg_price': float(stocks.aggregate(avg=Avg('price_per_kg'))['avg'] or 0)
            }
        }
    
    @staticmethod
    def get_contract_history(farmer_id, filters=None):
        """Get contract history for a farmer"""
        filters = filters or {}
        contracts = Contract.objects.filter(farmer_id=farmer_id)
        
        if filters.get('status'):
            contracts = contracts.filter(status=filters['status'])
        
        # Group by status
        by_status = contracts.values('status').annotate(
            count=Count('id'),
            total_value=Sum('total_amount')
        )
        
        # Group by buyer
        by_buyer = contracts.values('buyer__full_name', 'buyer_id').annotate(
            count=Count('id'),
            total_value=Sum('total_amount')
        ).order_by('-total_value')[:5]
        
        return {
            'contracts': [
                {
                    'id': c.id,
                    'crop_name': c.crop_name,
                    'quantity': float(c.quantity_kg),
                    'price_per_kg': float(c.price_per_kg),
                    'total_amount': float(c.total_amount),
                    'status': c.status,
                    'buyer_name': c.buyer.full_name,
                    'created_at': c.created_at.isoformat(),
                    'delivery_status': c.delivery_status
                }
                for c in contracts.order_by('-created_at')
            ],
            'by_status': {
                'labels': [item['status'] for item in by_status],
                'values': [item['count'] for item in by_status],
                'details': [
                    {
                        'status': item['status'],
                        'count': item['count'],
                        'value': float(item['total_value'] or 0)
                    }
                    for item in by_status
                ]
            },
            'top_buyers': [
                {
                    'name': item['buyer__full_name'],
                    'contracts': item['count'],
                    'value': float(item['total_value'] or 0)
                }
                for item in by_buyer
            ],
            'summary': {
                'total_contracts': contracts.count(),
                'total_value': float(contracts.aggregate(total=Sum('total_amount'))['total'] or 0),
                'completed_count': contracts.filter(status=Contract.STATUS_COMPLETED).count(),
                'active_count': contracts.filter(status=Contract.STATUS_ACCEPTED).count()
            }
        }


class BuyerReportService:
    """Service for generating buyer-specific reports"""
    
    @staticmethod
    def get_dashboard_summary(buyer_id, date_range_filter=None):
        """Get summary statistics for buyer dashboard"""
        start_date, end_date = get_date_range_from_period(
            date_range_filter.get('period', 'month') if date_range_filter else 'month',
            date_range_filter.get('start_date') if date_range_filter else None,
            date_range_filter.get('end_date') if date_range_filter else None
        )
        
        # Get buyer's data
        crop_standards = CropStandard.objects.filter(created_by_id=buyer_id)
        contracts = Contract.objects.filter(buyer_id=buyer_id)
        
        # Current period stats
        current_standards = crop_standards.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        current_contracts = contracts.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        current_payments = PaymentRecord.objects.filter(
            contract__buyer_id=buyer_id,
            paid_at__date__gte=start_date,
            paid_at__date__lte=end_date,
            status=PaymentRecord.STATUS_CONFIRMED
        )
        
        return {
            'total_standards': {
                'current': crop_standards.count(),
                'active': crop_standards.filter(status='active').count()
            },
            'total_contracts': {
                'current': contracts.count(),
                'accepted': contracts.filter(status=Contract.STATUS_ACCEPTED).count(),
                'completed': contracts.filter(status=Contract.STATUS_COMPLETED).count()
            },
            'contracts_value': {
                'current': float(contracts.aggregate(total=Sum('total_amount'))['total'] or 0),
                'paid': float(current_payments.aggregate(total=Sum('amount'))['total'] or 0),
                'pending': float(contracts.filter(
                    status=Contract.STATUS_ACCEPTED
                ).aggregate(total=Sum('balance_due'))['total'] or 0)
            },
            'avg_price_paid': float(contracts.aggregate(avg=Avg('price_per_kg'))['avg'] or 0),
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        }
    
    @staticmethod
    def get_crop_standards_report(buyer_id, filters=None):
        """Get crop standards report for a buyer"""
        filters = filters or {}
        standards = CropStandard.objects.filter(created_by_id=buyer_id)
        
        if filters.get('status'):
            standards = standards.filter(status=filters['status'])
        if filters.get('crop_name'):
            standards = standards.filter(crop_name__icontains=filters['crop_name'])
        
        # Group by crop
        by_crop = standards.values('crop_name').annotate(
            count=Count('id'),
            avg_price=Avg('price_per_kg'),
            total_min_quantity=Sum('min_quantity')
        ).order_by('-count')
        
        # Group by status
        by_status = standards.values('status').annotate(
            count=Count('id')
        )
        
        return {
            'standards': [
                {
                    'id': s.id,
                    'crop_name': s.crop_name,
                    'price_per_kg': float(s.price_per_kg),
                    'min_quantity': float(s.min_quantity),
                    'max_quantity': float(s.max_quantity) if s.max_quantity else None,
                    'quality_grade': s.quality_grade,
                    'season': s.season,
                    'status': s.status,
                    'created_at': s.created_at.isoformat()
                }
                for s in standards.order_by('-created_at')
            ],
            'by_crop': {
                'labels': [item['crop_name'] for item in by_crop],
                'values': [item['count'] for item in by_crop],
                'details': [
                    {
                        'crop': item['crop_name'],
                        'count': item['count'],
                        'avg_price': float(item['avg_price']),
                        'total_min_quantity': float(item['total_min_quantity'])
                    }
                    for item in by_crop
                ]
            },
            'by_status': {
                'labels': [item['status'] for item in by_status],
                'values': [item['count'] for item in by_status]
            },
            'summary': {
                'total_standards': standards.count(),
                'active_standards': standards.filter(status='active').count(),
                'avg_price': float(standards.aggregate(avg=Avg('price_per_kg'))['avg'] or 0)
            }
        }
    
    @staticmethod
    def get_purchase_history(buyer_id, filters=None):
        """Get purchase history for a buyer"""
        filters = filters or {}
        contracts = Contract.objects.filter(buyer_id=buyer_id)
        
        if filters.get('status'):
            contracts = contracts.filter(status=filters['status'])
        
        # Group by farmer
        by_farmer = contracts.values('farmer__full_name', 'farmer_id').annotate(
            count=Count('id'),
            total_value=Sum('total_amount'),
            total_quantity=Sum('quantity_kg')
        ).order_by('-total_value')[:5]
        
        return {
            'purchases': [
                {
                    'id': c.id,
                    'crop_name': c.crop_name,
                    'quantity': float(c.quantity_kg),
                    'price_per_kg': float(c.price_per_kg),
                    'total_amount': float(c.total_amount),
                    'status': c.status,
                    'farmer_name': c.farmer.full_name,
                    'created_at': c.created_at.isoformat(),
                    'delivery_status': c.delivery_status,
                    'payment_status': c.payment_status
                }
                for c in contracts.order_by('-created_at')
            ],
            'top_farmers': [
                {
                    'name': item['farmer__full_name'],
                    'purchases': item['count'],
                    'quantity': float(item['total_quantity']),
                    'value': float(item['total_value'] or 0)
                }
                for item in by_farmer
            ],
            'summary': {
                'total_purchases': contracts.count(),
                'total_value': float(contracts.aggregate(total=Sum('total_amount'))['total'] or 0),
                'total_quantity': float(contracts.aggregate(total=Sum('quantity_kg'))['total'] or 0),
                'avg_price': float(contracts.aggregate(avg=Avg('price_per_kg'))['avg'] or 0),
                'completed_count': contracts.filter(status=Contract.STATUS_COMPLETED).count(),
                'pending_count': contracts.filter(status=Contract.STATUS_PENDING).count()
            }
        }
        
