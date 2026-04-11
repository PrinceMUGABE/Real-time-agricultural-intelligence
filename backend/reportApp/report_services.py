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
        """Get user growth over time with detailed user list"""
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
        
        # Get detailed user list for table (ADDITIONAL DATA - preserves existing structure)
        detailed_users = list(CustomUser.objects.all().values(
            'id', 'full_name', 'phone_number', 'email', 'role', 'location', 'status', 'language', 'created_at'
        ).order_by('-created_at'))
        
        # Convert boolean status to string for display
        for user in detailed_users:
            user['status'] = 'Active' if user.get('status') else 'Inactive'
            if user.get('created_at'):
                user['created_at'] = user['created_at'].isoformat() if hasattr(user['created_at'], 'isoformat') else str(user['created_at'])
        
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
            },
            'users': detailed_users  # ADDED: detailed users for table
        }

    @staticmethod
    def get_stock_report(filters=None):
        """Generate stock report with filters and detailed stock list"""
        filters = filters or {}
        stocks = Stock.objects.filter(is_active=True).select_related('farmer')
        
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
        
        # Get detailed stock list for table (ADDITIONAL DATA)
        detailed_stocks = []
        for stock in stocks:
            detailed_stocks.append({
                'id': stock.id,
                'product_name': stock.product_name,
                'farmer_name': stock.farmer.full_name if stock.farmer else 'N/A',
                'quantity': float(stock.quantity),
                'price_per_kg': float(stock.price_per_kg),
                'total_value': float(stock.quantity * stock.price_per_kg),
                'location': stock.location,
                'quality_grade': stock.quality_grade,
                'is_active': stock.is_active,
                'created_at': stock.created_at.isoformat() if stock.created_at else None
            })
        
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
            },
            'stocks': detailed_stocks  # ADDED: detailed stocks for table
        }

    
    @staticmethod
    def get_contract_report(filters=None):
        """Enhanced contract report with professional summaries"""
        filters = filters or {}
        contracts = Contract.objects.all().select_related('farmer', 'buyer')
        
        # Apply filters
        if filters.get('farmer_id'):
            contracts = contracts.filter(farmer_id=filters['farmer_id'])
        if filters.get('buyer_id'):
            contracts = contracts.filter(buyer_id=filters['buyer_id'])
        if filters.get('status'):
            contracts = contracts.filter(status=filters['status'])
        
        # Get detailed contracts
        detailed_contracts = []
        total_by_status = {}
        total_by_product = {}
        completed_value = 0
        pending_value = 0
        
        for contract in contracts:
            contract_data = {
                'id': contract.id,
                'crop_name': contract.crop_name,
                'farmer_name': contract.farmer.full_name if contract.farmer else 'N/A',
                'buyer_name': contract.buyer.full_name if contract.buyer else 'N/A',
                'quantity_kg': float(contract.quantity_kg),
                'price_per_kg': float(contract.price_per_kg),
                'total_amount': float(contract.total_amount),
                'status': contract.status,
                'delivery_status': contract.delivery_status,
                'payment_status': contract.payment_status,
                'amount_paid': float(contract.amount_paid) if contract.amount_paid else 0,
                'balance_due': float(contract.balance_due) if hasattr(contract, 'balance_due') else 0,
                'created_at': contract.created_at.isoformat() if contract.created_at else None
            }
            detailed_contracts.append(contract_data)
            
            # Aggregate by status
            status = contract.status
            if status not in total_by_status:
                total_by_status[status] = {'amount': 0, 'count': 0}
            total_by_status[status]['amount'] += float(contract.total_amount)
            total_by_status[status]['count'] += 1
            
            # Aggregate by product
            product = contract.crop_name
            if product not in total_by_product:
                total_by_product[product] = {'amount': 0, 'count': 0, 'quantity': 0}
            total_by_product[product]['amount'] += float(contract.total_amount)
            total_by_product[product]['count'] += 1
            total_by_product[product]['quantity'] += float(contract.quantity_kg)
            
            # Track completed vs pending
            if contract.status == Contract.STATUS_COMPLETED:
                completed_value += float(contract.total_amount)
            elif contract.status in [Contract.STATUS_PENDING, Contract.STATUS_ACCEPTED]:
                pending_value += float(contract.total_amount)
        
        total_value = sum(c['total_amount'] for c in detailed_contracts)
        
        summary = {
            'total_contracts': len(detailed_contracts),
            'total_value': total_value,
            'completed_count': total_by_status.get(Contract.STATUS_COMPLETED, {}).get('count', 0),
            'completed_value': completed_value,
            'pending_count': total_by_status.get(Contract.STATUS_PENDING, {}).get('count', 0) + total_by_status.get(Contract.STATUS_ACCEPTED, {}).get('count', 0),
            'pending_value': pending_value,
            'accepted_count': total_by_status.get(Contract.STATUS_ACCEPTED, {}).get('count', 0),
            'rejected_count': total_by_status.get(Contract.STATUS_REJECTED, {}).get('count', 0),
            'avg_contract_value': total_value / len(detailed_contracts) if detailed_contracts else 0,
            'total_quantity': sum(c['quantity_kg'] for c in detailed_contracts),
            'avg_price_per_kg': sum(c['price_per_kg'] for c in detailed_contracts) / len(detailed_contracts) if detailed_contracts else 0,
            'completion_rate': (total_by_status.get(Contract.STATUS_COMPLETED, {}).get('count', 0) / len(detailed_contracts) * 100) if detailed_contracts else 0
        }
        
        # Top products
        top_products = sorted(total_by_product.items(), key=lambda x: x[1]['amount'], reverse=True)[:10]
        
        return {
            'contracts': detailed_contracts,
            'summary': summary,
            'analytics': {
                'by_status': {
                    'labels': list(total_by_status.keys()),
                    'values': [v['amount'] for v in total_by_status.values()],
                    'details': [
                        {
                            'status': k,
                            'count': v['count'],
                            'total_value': v['amount'],
                            'percentage': (v['amount'] / total_value * 100) if total_value > 0 else 0
                        }
                        for k, v in total_by_status.items()
                    ]
                },
                'top_products': [
                    {
                        'product': k,
                        'contracts_count': v['count'],
                        'total_quantity': v['quantity'],
                        'total_value': v['amount']
                    }
                    for k, v in top_products
                ],
                'performance_metrics': {
                    'average_contract_size': summary['avg_contract_value'],
                    'value_per_kg': summary['avg_price_per_kg'],
                    'success_rate': summary['completion_rate']
                }
            }
        }
    
    @staticmethod
    def get_payment_report(filters=None):
        """Enhanced payment report with professional financial summaries"""
        filters = filters or {}
        payments = PaymentRecord.objects.filter(status=PaymentRecord.STATUS_CONFIRMED).select_related('contract__farmer', 'contract__buyer')
        
        # Apply date filters
        if filters.get('start_date') and filters.get('end_date'):
            payments = payments.filter(paid_at__date__gte=filters['start_date'], paid_at__date__lte=filters['end_date'])
        
        # Get detailed payment list
        detailed_payments = []
        total_by_method = {}
        total_by_month = {}
        
        for payment in payments:
            payment_data = {
                'id': payment.id,
                'contract_id': payment.contract.id if payment.contract else None,
                'crop_name': payment.contract.crop_name if payment.contract else 'N/A',
                'payer_name': payment.contract.buyer.full_name if payment.contract and payment.contract.buyer else 'N/A',
                'receiver_name': payment.contract.farmer.full_name if payment.contract and payment.contract.farmer else 'N/A',
                'amount': float(payment.amount),
                'payment_method': payment.payment_method,
                'status': payment.status,
                'paid_at': payment.paid_at.isoformat() if payment.paid_at else None,
                'reference_number': payment.reference_number or 'N/A',
                'notes': payment.notes or '-'
            }
            detailed_payments.append(payment_data)
            
            # Aggregate by method
            method = payment.payment_method
            if method not in total_by_method:
                total_by_method[method] = {'amount': 0, 'count': 0}
            total_by_method[method]['amount'] += float(payment.amount)
            total_by_method[method]['count'] += 1
            
            # Aggregate by month
            if payment.paid_at:
                month_key = payment.paid_at.strftime('%Y-%m')
                if month_key not in total_by_month:
                    total_by_month[month_key] = {'amount': 0, 'count': 0, 'month': payment.paid_at.strftime('%B %Y')}
                total_by_month[month_key]['amount'] += float(payment.amount)
                total_by_month[month_key]['count'] += 1
        
        # Calculate comprehensive summary
        total_amount = sum(p['amount'] for p in detailed_payments)
        transaction_count = len(detailed_payments)
        
        # Payment method labels
        method_labels = {
            'bank_transfer': 'Bank Transfer',
            'mobile_money': 'Mobile Money'
        }
        
        # Top payers
        payer_totals = {}
        for payment in detailed_payments:
            payer = payment['payer_name']
            if payer not in payer_totals:
                payer_totals[payer] = 0
            payer_totals[payer] += payment['amount']
        
        top_payers = sorted(payer_totals.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Top receivers
        receiver_totals = {}
        for payment in detailed_payments:
            receiver = payment['receiver_name']
            if receiver not in receiver_totals:
                receiver_totals[receiver] = 0
            receiver_totals[receiver] += payment['amount']
        
        top_receivers = sorted(receiver_totals.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Monthly trend - FIXED: Convert to list of dictionaries properly
        monthly_trend_list = []
        for month_key, month_data in sorted(total_by_month.items(), key=lambda x: x[0]):
            monthly_trend_list.append({
                'month': month_data['month'],
                'amount': month_data['amount'],
                'count': month_data['count']
            })
        
        summary = {
            'total_payments': total_amount,
            'total_transactions': transaction_count,
            'avg_payment_per_transaction': total_amount / transaction_count if transaction_count > 0 else 0,
            'largest_payment': max([p['amount'] for p in detailed_payments]) if detailed_payments else 0,
            'smallest_payment': min([p['amount'] for p in detailed_payments]) if detailed_payments else 0,
            'unique_payers': len(payer_totals),
            'unique_receivers': len(receiver_totals),
        }
        
        return {
            'payments': detailed_payments,
            'summary': summary,
            'analytics': {
                'by_method': {
                    'labels': [method_labels.get(k, k) for k in total_by_method.keys()],
                    'values': [v['amount'] for v in total_by_method.values()],
                    'details': [
                        {
                            'method': method_labels.get(k, k),
                            'total_amount': v['amount'],
                            'transaction_count': v['count'],
                            'percentage': (v['amount'] / total_amount * 100) if total_amount > 0 else 0
                        }
                        for k, v in total_by_method.items()
                    ]
                },
                'monthly_trend': {
                    'labels': [item['month'] for item in monthly_trend_list],
                    'values': [item['amount'] for item in monthly_trend_list],
                    'details': monthly_trend_list  # Now properly structured as list of dicts
                },
                'top_payers': [
                    {'name': name, 'total': amount}
                    for name, amount in top_payers
                ],
                'top_receivers': [
                    {'name': name, 'total': amount}
                    for name, amount in top_receivers
                ],
                'financial_insights': {
                    'average_daily_payment': total_amount / 30 if total_amount > 0 else 0,
                    'transaction_frequency': transaction_count,
                    'payment_concentration': (top_payers[0][1] / total_amount * 100) if top_payers and total_amount > 0 else 0
                }
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
        

class StandardsReportService:
    """Service for generating crop standards reports"""
    
    @staticmethod
    def get_standards_report(filters=None):
        """
        Generate comprehensive crop standards report
        Returns detailed standards data with professional summaries
        """
        filters = filters or {}
        standards = CropStandard.objects.all().select_related('created_by')
        
        # Apply filters
        if filters.get('buyer_id'):
            standards = standards.filter(created_by_id=filters['buyer_id'])
        if filters.get('crop_name'):
            standards = standards.filter(crop_name__icontains=filters['crop_name'])
        if filters.get('status'):
            standards = standards.filter(status=filters['status'])
        if filters.get('season'):
            standards = standards.filter(season=filters['season'])
        
        # Get detailed standards list
        detailed_standards = []
        for standard in standards:
            detailed_standards.append({
                'id': standard.id,
                'crop_name': standard.crop_name,
                'crop_type': standard.get_crop_type_display(),
                'season': standard.get_season_display(),
                'harvest_year': standard.harvest_year,
                'quality_grade': standard.get_quality_grade_display(),
                'price_per_kg': float(standard.price_per_kg),
                'min_quantity': float(standard.min_quantity),
                'max_quantity': float(standard.max_quantity) if standard.max_quantity else None,
                'preferred_location': standard.preferred_location or 'Any',
                'status': standard.status,
                'buyer_name': standard.created_by.full_name if standard.created_by else 'N/A',
                'buyer_location': standard.created_by.location if standard.created_by else 'N/A',
                'buyer_phone': standard.created_by.phone_number if standard.created_by else 'N/A',
                'description': standard.description or '-',
                'created_at': standard.created_at.isoformat() if standard.created_at else None
            })
        
        # Comprehensive summaries
        summary = {
            'total_standards': standards.count(),
            'active_standards': standards.filter(status='active').count(),
            'inactive_standards': standards.filter(status='inactive').count(),
            'expired_standards': standards.filter(status='expired').count(),
            'total_buyers': standards.values('created_by').distinct().count(),
            'unique_crops': standards.values('crop_name').distinct().count(),
            'total_potential_value': float(standards.aggregate(
                total=Sum(F('min_quantity') * F('price_per_kg'))
            )['total'] or 0),
            'avg_price_per_kg': float(standards.aggregate(avg=Avg('price_per_kg'))['avg'] or 0),
            'total_min_quantity': float(standards.aggregate(total=Sum('min_quantity'))['total'] or 0),
        }
        
        # Group by crop
        by_crop = standards.values('crop_name').annotate(
            count=Count('id'),
            total_min_quantity=Sum('min_quantity'),
            total_value=Sum(F('min_quantity') * F('price_per_kg')),
            avg_price=Avg('price_per_kg'),
            active_count=Count('id', filter=Q(status='active'))
        ).order_by('-total_value')
        
        # Group by season
        by_season = standards.values('season').annotate(
            count=Count('id'),
            total_value=Sum(F('min_quantity') * F('price_per_kg')),
            avg_price=Avg('price_per_kg')
        ).order_by('season')
        
        # Group by quality
        by_quality = standards.values('quality_grade').annotate(
            count=Count('id'),
            total_value=Sum(F('min_quantity') * F('price_per_kg')),
            avg_price=Avg('price_per_kg')
        ).order_by('quality_grade')
        
        # Group by buyer
        by_buyer = standards.values(
            'created_by__id', 'created_by__full_name'
        ).annotate(
            count=Count('id'),
            total_value=Sum(F('min_quantity') * F('price_per_kg')),
            active_count=Count('id', filter=Q(status='active'))
        ).order_by('-total_value')[:10]
        
        # Top crops by demand (highest potential value)
        top_crops = by_crop[:10]
        
        # Seasonal analysis
        seasonal_analysis = []
        season_names = {
            'A': 'Season A (Sep-Jan)',
            'B': 'Season B (Feb-May)',
            'C': 'Season C (Jun-Aug)',
            'D': 'Season D (Long rains)'
        }
        for item in by_season:
            seasonal_analysis.append({
                'season': season_names.get(item['season'], item['season']),
                'code': item['season'],
                'standards_count': item['count'],
                'total_value': float(item['total_value'] or 0),
                'avg_price': float(item['avg_price'] or 0)
            })
        
        # Price distribution
        price_ranges = {
            'Low (0-500 RWF)': standards.filter(price_per_kg__lte=500).count(),
            'Medium (501-1000 RWF)': standards.filter(price_per_kg__gt=500, price_per_kg__lte=1000).count(),
            'High (1001-2000 RWF)': standards.filter(price_per_kg__gt=1000, price_per_kg__lte=2000).count(),
            'Premium (2000+ RWF)': standards.filter(price_per_kg__gt=2000).count(),
        }
        
        # Quality demand analysis
        quality_demand = []
        quality_names = {'A': 'Premium', 'B': 'Standard', 'C': 'Economy'}
        for item in by_quality:
            quality_demand.append({
                'grade': item['quality_grade'],
                'name': quality_names.get(item['quality_grade'], item['quality_grade']),
                'standards_count': item['count'],
                'total_value': float(item['total_value'] or 0),
                'avg_price': float(item['avg_price'] or 0)
            })
        
        return {
            'standards': detailed_standards,
            'summary': summary,
            'analytics': {
                'by_crop': {
                    'labels': [item['crop_name'] for item in by_crop],
                    'values': [float(item['total_value'] or 0) for item in by_crop],
                    'details': [
                        {
                            'crop': item['crop_name'],
                            'standards_count': item['count'],
                            'min_quantity': float(item['total_min_quantity']),
                            'potential_value': float(item['total_value'] or 0),
                            'avg_price': float(item['avg_price'] or 0),
                            'active_standards': item['active_count']
                        }
                        for item in by_crop
                    ]
                },
                'by_season': seasonal_analysis,
                'by_quality': quality_demand,
                'by_buyer': [
                    {
                        'buyer_id': item['created_by__id'],
                        'buyer_name': item['created_by__full_name'],
                        'standards_count': item['count'],
                        'potential_value': float(item['total_value'] or 0),
                        'active_standards': item['active_count']
                    }
                    for item in by_buyer
                ],
                'top_crops': [
                    {
                        'crop': item['crop_name'],
                        'demand_score': item['count'],
                        'potential_value': float(item['total_value'] or 0),
                        'avg_price': float(item['avg_price'] or 0)
                    }
                    for item in top_crops
                ],
                'price_distribution': price_ranges,
                'market_health': {
                    'active_percentage': round((summary['active_standards'] / summary['total_standards'] * 100), 1) if summary['total_standards'] > 0 else 0,
                    'avg_price_per_kg': summary['avg_price_per_kg'],
                    'crop_diversity': summary['unique_crops'],
                    'buyer_participation': summary['total_buyers']
                }
            }
        }