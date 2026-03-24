import logging
import functools
from decimal import Decimal, InvalidOperation
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction, models
from django.db.models import Q, Sum, Count, Avg
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Stock, StockMovement, StockAlert
from .serializers import (
    StockSerializer,
    StockMovementSerializer,
    StockAlertSerializer,
    StockSummarySerializer,
)
from .translations import nt
from notificationApp.services import notify_user, notify_system

logger = logging.getLogger(__name__)


# ==================== HELPERS ====================

SUPPORTED_LANGUAGES = {'en', 'fr', 'sw', 'rw'}


def get_language(request):
    """
    Resolve the preferred language for the request.
    Priority: Accept-Language header → user.language → 'en'.
    Handles full locale strings like 'fr-FR,fr;q=0.9' by extracting the base tag.
    """
    raw_header = request.headers.get('Accept-Language', '')
    if raw_header:
        # Take the first entry in a comma-separated list, then strip the region suffix.
        first_tag = raw_header.split(',')[0].strip()
        base_lang = first_tag.split('-')[0].lower().split(';')[0]
        if base_lang in SUPPORTED_LANGUAGES:
            return base_lang

    if request.user.is_authenticated:
        user_lang = getattr(request.user, 'language', 'en')
        if user_lang in SUPPORTED_LANGUAGES:
            return user_lang

    return 'en'


def _log_and_respond(exc, func_name, lang, http_status, message_key=None, message=None):
    """
    Central place to log an exception and build an error Response.
    Exactly one of message_key or message must be supplied.
    """
    print("Error in %s: %s", func_name, exc, exc_info=True)
    error_text = nt(message_key, lang) if message_key else message
    return Response({'error': error_text}, status=http_status)


# ==================== STOCK MANAGEMENT ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_stock(request):
    """
    Create a new stock entry.
    Only farmers and admins can create stocks.
    """
    print("User %s is creating stock with data: %s", request.user.phone_number, request.data)
    lang = get_language(request)

    if request.user.role != 'farmer' and request.user.role != 'admin':
        return Response({'error': nt('farmer_only', lang)}, status=status.HTTP_403_FORBIDDEN)

    serializer = StockSerializer(
        data=request.data,
        context={'request': request, 'lang': lang},
    )

    if not serializer.is_valid():
        print("Validation failed in create_stock: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            stock = serializer.save(farmer=request.user)

            notify_system(
                receiver=request.user,
                title=nt('stock_created', lang),
                description=f"{stock.quantity}kg of {stock.product_name} added to your stocks",
            )

            if stock.quantity < 100:
                StockAlert.objects.create(
                    stock=stock,
                    alert_type='low_stock',
                    severity='warning',
                    message=nt('low_stock_message', lang,
                               product=stock.product_name,
                               quantity=stock.quantity),
                )
                notify_system(
                    receiver=request.user,
                    title=nt('low_stock_alert', lang),
                    description=nt('low_stock_message', lang,
                                   product=stock.product_name,
                                   quantity=stock.quantity),
                )
    except ValidationError as exc:
        print("ValidationError in create_stock: %s", exc)
        return Response(
            {
                'error': exc.message if hasattr(exc, 'message') else str(exc),
                'details': exc.error_dict if hasattr(exc, 'error_dict') else None,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        return _log_and_respond(exc, 'create_stock', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')

    return Response(
        {
            'message': nt('stock_created', lang),
            'stock': StockSerializer(stock, context={'request': request, 'lang': lang}).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_stocks(request):
    """
    List stocks with filtering options.
    Farmers see their own stocks; admins see all.
    """
    lang = get_language(request)

    try:
        stocks = Stock.objects.all() if request.user.role == 'admin' \
            else Stock.objects.filter(farmer=request.user)

        product = request.query_params.get('product')
        if product:
            stocks = stocks.filter(product_name__icontains=product)

        location = request.query_params.get('location')
        if location:
            stocks = stocks.filter(location__icontains=location)

        quality = request.query_params.get('quality')
        if quality:
            stocks = stocks.filter(quality_grade=quality)

        min_quantity = request.query_params.get('min_quantity')
        if min_quantity:
            try:
                stocks = stocks.filter(quantity__gte=Decimal(min_quantity))
            except (InvalidOperation, ValueError):
                logger.debug("Invalid min_quantity value: %s — filter skipped.", min_quantity)

        max_quantity = request.query_params.get('max_quantity')
        if max_quantity:
            try:
                stocks = stocks.filter(quantity__lte=Decimal(max_quantity))
            except (InvalidOperation, ValueError):
                logger.debug("Invalid max_quantity value: %s — filter skipped.", max_quantity)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = stocks.count()
        stocks_page = stocks.select_related('farmer').prefetch_related('movements')[start:end]

        serializer = StockSerializer(
            stocks_page, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'stocks': serializer.data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'list_stocks', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_stock_detail(request, stock_id):
    """
    Get detailed information about a specific stock.
    """
    lang = get_language(request)

    try:
        stock = get_object_or_404(
            Stock.objects.select_related('farmer').prefetch_related('movements'),
            id=stock_id,
        )

        if request.user.role != 'admin' and stock.farmer != request.user:
            return Response({'error': nt('not_owner', lang)}, status=status.HTTP_403_FORBIDDEN)

        serializer = StockSerializer(stock, context={'request': request, 'lang': lang})

        recent_movements = stock.movements.select_related('created_by').order_by('-created_at')[:10]
        movements_serializer = StockMovementSerializer(
            recent_movements, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'stock': serializer.data,
            'recent_movements': movements_serializer.data,
        })

    except Stock.DoesNotExist:
        return _log_and_respond('DoesNotExist', 'get_stock_detail', lang,
                                status.HTTP_404_NOT_FOUND, 'stock_not_found')
    except Exception as exc:
        return _log_and_respond(exc, 'get_stock_detail', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_stock(request, stock_id):
    """
    Update stock information.
    Only the owner or admin can update.
    """
    lang = get_language(request)

    try:
        stock = get_object_or_404(Stock, id=stock_id)

        if request.user.role != 'admin' and stock.farmer != request.user:
            return Response({'error': nt('not_owner', lang)}, status=status.HTTP_403_FORBIDDEN)

        serializer = StockSerializer(
            stock,
            data=request.data,
            partial=request.method == 'PATCH',
            context={'request': request, 'lang': lang},
        )

        if not serializer.is_valid():
            print("Validation failed in update_stock: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            updated_stock = serializer.save()
            notify_system(
                receiver=stock.farmer,
                title=nt('stock_updated', lang),
                description=f"{updated_stock.product_name} stock details updated",
            )

        return Response({
            'message': nt('stock_updated', lang),
            'stock': StockSerializer(updated_stock, context={'request': request, 'lang': lang}).data,
        })

    except ValidationError as exc:
        print("ValidationError in update_stock: %s", exc)
        return Response(
            {
                'error': exc.message if hasattr(exc, 'message') else str(exc),
                'details': exc.error_dict if hasattr(exc, 'error_dict') else None,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        return _log_and_respond(exc, 'update_stock', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_stock(request, stock_id):
    """
    Delete a stock.
    Only the owner or admin can delete.
    Cannot delete a stock that has existing movements.
    """
    lang = get_language(request)

    try:
        stock = get_object_or_404(Stock, id=stock_id)

        if request.user.role != 'admin' and stock.farmer != request.user:
            return Response({'error': nt('not_owner', lang)}, status=status.HTTP_403_FORBIDDEN)

        if stock.movements.exists():
            return Response(
                {'error': 'Cannot delete stock with existing movements. Consider deactivating it instead.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product_name = stock.product_name

        with transaction.atomic():
            stock.delete()
            notify_system(
                receiver=request.user,
                title=nt('stock_deleted', lang),
                description=f"{product_name} stock has been deleted",
            )

        return Response({'message': nt('stock_deleted', lang)}, status=status.HTTP_200_OK)

    except Exception as exc:
        return _log_and_respond(exc, 'delete_stock', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


# ==================== STOCK MOVEMENTS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_movement(request):
    """
    Create a new stock movement (in / out / transfer / adjustment).
    """
    print(f"User {request.user.phone_number} is creating movement with data: {request.data}")
    lang = get_language(request)

    stock_id = request.data.get('stock')
    if not stock_id:
        return Response({'error': 'Stock ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        stock = Stock.objects.get(id=stock_id)
    except Stock.DoesNotExist:
        return Response({'error': nt('stock_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

    if request.user.role != 'admin' and stock.farmer != request.user:
        return Response({'error': nt('not_owner', lang)}, status=status.HTTP_403_FORBIDDEN)

    serializer = StockMovementSerializer(
        data=request.data,
        context={'request': request, 'lang': lang},
    )

    if not serializer.is_valid():
        print("Validation failed in create_movement: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            movement = serializer.save(created_by=request.user)
    except ValidationError as exc:
        print("ValidationError in create_movement: %s", exc)
        return Response(
            {
                'error': exc.message if hasattr(exc, 'message') else str(exc),
                'details': exc.error_dict if hasattr(exc, 'error_dict') else None,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        return _log_and_respond(exc, 'create_movement', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')

    return Response(
        {
            'message': nt('movement_created', lang),
            'movement': StockMovementSerializer(
                movement, context={'request': request, 'lang': lang}
            ).data,
            'updated_stock_quantity': str(movement.stock.quantity),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_movements(request):
    """
    List stock movements with optional filtering.
    """
    lang = get_language(request)

    try:
        movements = StockMovement.objects.all() if request.user.role == 'admin' \
            else StockMovement.objects.filter(stock__farmer=request.user)

        stock_id = request.query_params.get('stock')
        if stock_id:
            movements = movements.filter(stock_id=stock_id)

        movement_type = request.query_params.get('type')
        if movement_type:
            movements = movements.filter(movement_type=movement_type)

        from_date = request.query_params.get('from_date')
        if from_date:
            movements = movements.filter(created_at__date__gte=from_date)

        to_date = request.query_params.get('to_date')
        if to_date:
            movements = movements.filter(created_at__date__lte=to_date)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = movements.count()
        movements_page = movements.select_related(
            'stock', 'stock__farmer', 'created_by'
        ).order_by('-created_at')[start:end]

        serializer = StockMovementSerializer(
            movements_page, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'movements': serializer.data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'list_movements', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_movement_detail(request, movement_id):
    """
    Get detailed information about a specific movement.
    """
    lang = get_language(request)

    try:
        movement = get_object_or_404(
            StockMovement.objects.select_related('stock', 'stock__farmer', 'created_by'),
            id=movement_id,
        )

        if request.user.role != 'admin' and movement.stock.farmer != request.user:
            return Response({'error': nt('not_owner', lang)}, status=status.HTTP_403_FORBIDDEN)

        serializer = StockMovementSerializer(movement, context={'request': request, 'lang': lang})
        return Response(serializer.data)

    except StockMovement.DoesNotExist:
        return _log_and_respond('DoesNotExist', 'get_movement_detail', lang,
                                status.HTTP_404_NOT_FOUND, 'movement_not_found')
    except Exception as exc:
        return _log_and_respond(exc, 'get_movement_detail', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_movement(request, movement_id):
    """
    Update a stock movement.
    Only the creator (if farmer) or admin can update.
    """
    lang = get_language(request)

    try:
        movement = get_object_or_404(
            StockMovement.objects.select_related('stock', 'stock__farmer'),
            id=movement_id,
        )

        if request.user.role != 'admin' and movement.created_by != request.user:
            return Response(
                {'error': 'You can only modify movements you created'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = StockMovementSerializer(
            movement,
            data=request.data,
            partial=request.method == 'PATCH',
            context={'request': request, 'lang': lang},
        )

        if not serializer.is_valid():
            print("Validation failed in update_movement: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            updated_movement = serializer.save()

        return Response({
            'message': nt('movement_updated', lang),
            'movement': StockMovementSerializer(
                updated_movement, context={'request': request, 'lang': lang}
            ).data,
        })

    except ValidationError as exc:
        print("ValidationError in update_movement: %s", exc)
        return Response(
            {
                'error': exc.message if hasattr(exc, 'message') else str(exc),
                'details': exc.error_dict if hasattr(exc, 'error_dict') else None,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        return _log_and_respond(exc, 'update_movement', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_movement(request, movement_id):
    """
    Delete a stock movement (reverts the stock quantity change via model signal/override).
    """
    lang = get_language(request)

    try:
        movement = get_object_or_404(
            StockMovement.objects.select_related('stock', 'stock__farmer'),
            id=movement_id,
        )

        if request.user.role != 'admin' and movement.created_by != request.user:
            return Response(
                {'error': 'You can only delete movements you created'},
                status=status.HTTP_403_FORBIDDEN,
            )

        farmer = movement.stock.farmer
        qty = movement.quantity
        movement_type_display = movement.get_movement_type_display()

        with transaction.atomic():
            movement.delete()
            notify_system(
                receiver=farmer,
                title=nt('movement_deleted', lang),
                description=f"{qty}kg {movement_type_display} has been deleted",
            )

        return Response({'message': nt('movement_deleted', lang)}, status=status.HTTP_200_OK)

    except Exception as exc:
        return _log_and_respond(exc, 'delete_movement', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


# ==================== DASHBOARD & ANALYTICS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_summary(request):
    """
    Get summary statistics for the user's dashboard.
    """
    lang = get_language(request)

    try:
        if request.user.role == 'admin':
            stocks = Stock.objects.all()
            movements = StockMovement.objects.all()
        else:
            stocks = Stock.objects.filter(farmer=request.user)
            movements = StockMovement.objects.filter(stock__farmer=request.user)

        total_stocks = stocks.count()
        total_quantity = stocks.aggregate(total=models.Sum('quantity'))['total'] or 0
        active_stocks = stocks.filter(is_active=True).count()
        low_stock_count = stocks.filter(quantity__lt=100).count()
        total_movements = movements.count()

        recent_movements = movements.select_related(
            'stock', 'created_by'
        ).order_by('-created_at')[:10]

        stocks_by_quality = {}
        for grade, _ in Stock.QUALITY_GRADES:
            count = stocks.filter(quality_grade=grade).count()
            if count > 0:
                stocks_by_quality[grade] = count

        stocks_by_location = dict(
            stocks.values_list('location').annotate(count=models.Count('id'))
        )

        summary = {
            'total_stocks': total_stocks,
            'total_quantity': float(total_quantity),
            'active_stocks': active_stocks,
            'low_stock_alerts': low_stock_count,
            'total_movements': total_movements,
            'recent_movements': StockMovementSerializer(
                recent_movements, many=True, context={'request': request, 'lang': lang}
            ).data,
            'stocks_by_quality': stocks_by_quality,
            'stocks_by_location': stocks_by_location,
        }

        serializer = StockSummarySerializer(data=summary)
        serializer.is_valid()
        return Response(serializer.data)

    except Exception as exc:
        return _log_and_respond(exc, 'get_dashboard_summary', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


# ==================== ALERTS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_alerts(request):
    """
    List stock alerts for the current user.
    """
    lang = get_language(request)

    try:
        alerts = StockAlert.objects.all() if request.user.role == 'admin' \
            else StockAlert.objects.filter(stock__farmer=request.user)

        resolved = request.query_params.get('resolved')
        if resolved is not None:
            alerts = alerts.filter(is_resolved=resolved.lower() == 'true')

        alerts = alerts.select_related('stock', 'resolved_by').order_by('-severity', '-created_at')

        serializer = StockAlertSerializer(
            alerts, many=True, context={'request': request, 'lang': lang}
        )

        return Response({'total': alerts.count(), 'alerts': serializer.data})

    except Exception as exc:
        return _log_and_respond(exc, 'list_alerts', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_alert(request, alert_id):
    """
    Mark an alert as resolved.
    """
    lang = get_language(request)

    try:
        alert = get_object_or_404(StockAlert.objects.select_related('stock'), id=alert_id)

        if request.user.role != 'admin' and alert.stock.farmer != request.user:
            return Response({'error': nt('not_owner', lang)}, status=status.HTTP_403_FORBIDDEN)

        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.user
        alert.save()

        return Response({
            'message': 'Alert resolved successfully',
            'alert': StockAlertSerializer(alert, context={'request': request, 'lang': lang}).data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'resolve_alert', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


# ==================== FARMER-SPECIFIC ENDPOINTS ====================

def _require_farmer(request, lang):
    """Return a 403 Response if the user is not a farmer, else None."""
    if request.user.role != 'farmer' and request.user.role != 'admin' and request.user.is_authenticated:
        return Response(
            {'error': 'This endpoint is only for farmers'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farmer_stocks(request):
    """
    Get all stocks for the logged-in farmer with optional filters and pagination.
    """
    lang = get_language(request)
    guard = _require_farmer(request, lang)
    if guard:
        return guard

    try:
        stocks = Stock.objects.filter(farmer=request.user)

        product = request.query_params.get('product')
        if product:
            stocks = stocks.filter(product_name__icontains=product)

        quality = request.query_params.get('quality')
        if quality:
            stocks = stocks.filter(quality_grade=quality)

        location = request.query_params.get('location')
        if location:
            stocks = stocks.filter(location__icontains=location)

        is_active = request.query_params.get('is_active')
        if is_active is not None:
            stocks = stocks.filter(is_active=is_active.lower() == 'true')

        low_stock = request.query_params.get('low_stock')
        if low_stock and low_stock.lower() == 'true':
            stocks = stocks.filter(quantity__lt=100)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = stocks.count()
        total_quantity = stocks.aggregate(total=models.Sum('quantity'))['total'] or 0
        active_count = stocks.filter(is_active=True).count()
        low_stock_count = stocks.filter(quantity__lt=100).count()

        stocks_page = (
            stocks.select_related('farmer')
            .prefetch_related('movements')
            .order_by('-created_at')[start:end]
        )

        serializer = StockSerializer(
            stocks_page, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'status': 'success',
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'summary': {
                'total_quantity': float(total_quantity),
                'active_stocks': active_count,
                'low_stock_alerts': low_stock_count,
                'total_stocks': total,
            },
            'stocks': serializer.data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'get_farmer_stocks', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farmer_stock_summary(request):
    """
    Get aggregated stock summary for the logged-in farmer (no pagination).
    """
    lang = get_language(request)
    guard = _require_farmer(request, lang)
    if guard:
        return guard

    try:
        stocks = Stock.objects.filter(farmer=request.user)

        products = stocks.values('product_name').annotate(
            total_quantity=models.Sum('quantity'),
            stock_count=models.Count('id'),
            avg_quantity=models.Avg('quantity'),
        ).order_by('-total_quantity')

        locations = stocks.values('location').annotate(
            total_quantity=models.Sum('quantity'),
            stock_count=models.Count('id'),
        ).order_by('-total_quantity')

        quality_grades = stocks.values('quality_grade').annotate(
            total_quantity=models.Sum('quantity'),
            stock_count=models.Count('id'),
        )

        total_stocks = stocks.count()
        total_quantity = stocks.aggregate(total=models.Sum('quantity'))['total'] or 0
        active_stocks = stocks.filter(is_active=True).count()
        low_stock_count = stocks.filter(quantity__lt=100).count()

        return Response({
            'status': 'success',
            'overall': {
                'total_stocks': total_stocks,
                'total_quantity': float(total_quantity),
                'active_stocks': active_stocks,
                'low_stock_alerts': low_stock_count,
                'average_stock_per_product': float(total_quantity / total_stocks) if total_stocks > 0 else 0,
            },
            'by_product': list(products),
            'by_location': list(locations),
            'by_quality': [
                {
                    'grade': item['quality_grade'],
                    'grade_display': dict(Stock.QUALITY_GRADES).get(
                        item['quality_grade'], item['quality_grade']
                    ),
                    'total_quantity': float(item['total_quantity']),
                    'stock_count': item['stock_count'],
                }
                for item in quality_grades
            ],
        })

    except Exception as exc:
        return _log_and_respond(exc, 'get_farmer_stock_summary', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farmer_stock_detail(request, stock_id):
    """
    Get detailed information (including movements and alerts) for a specific farmer stock.
    """
    lang = get_language(request)
    guard = _require_farmer(request, lang)
    if guard:
        return guard

    try:
        stock = get_object_or_404(
            Stock.objects.filter(farmer=request.user).select_related('farmer'),
            id=stock_id,
        )

        movements = stock.movements.select_related('created_by').order_by('-created_at')
        alerts = stock.alerts.all().order_by('-created_at')

        total_in = movements.filter(
            movement_type='in'
        ).aggregate(total=models.Sum('quantity'))['total'] or 0

        total_out = movements.filter(
            movement_type__in=['out', 'transfer']
        ).aggregate(total=models.Sum('quantity'))['total'] or 0

        total_adjustments = movements.filter(movement_type='adjustment').count()

        recent_movements = movements[:20]

        return Response({
            'status': 'success',
            'stock': StockSerializer(stock, context={'request': request, 'lang': lang}).data,
            'statistics': {
                'total_movements': movements.count(),
                'total_quantity_added': float(total_in),
                'total_quantity_removed': float(total_out),
                'net_change': float(total_in - total_out),
                'adjustment_count': total_adjustments,
                'current_quantity': float(stock.quantity),
            },
            'recent_movements': StockMovementSerializer(
                recent_movements, many=True, context={'request': request, 'lang': lang}
            ).data,
            'alerts': StockAlertSerializer(
                alerts, many=True, context={'request': request, 'lang': lang}
            ).data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'get_farmer_stock_detail', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farmer_stock_movements(request, stock_id):
    """
    Get paginated movements for a specific stock belonging to the logged-in farmer.
    """
    lang = get_language(request)
    guard = _require_farmer(request, lang)
    if guard:
        return guard

    try:
        stock = get_object_or_404(
            Stock.objects.filter(farmer=request.user),
            id=stock_id,
        )

        movements = stock.movements.select_related('created_by')

        movement_type = request.query_params.get('type')
        if movement_type:
            movements = movements.filter(movement_type=movement_type)

        from_date = request.query_params.get('from_date')
        if from_date:
            movements = movements.filter(created_at__date__gte=from_date)

        to_date = request.query_params.get('to_date')
        if to_date:
            movements = movements.filter(created_at__date__lte=to_date)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = movements.count()
        movements_page = movements.order_by('-created_at')[start:end]

        serializer = StockMovementSerializer(
            movements_page, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'status': 'success',
            'stock_id': stock_id,
            'stock_name': stock.product_name,
            'current_quantity': float(stock.quantity),
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'movements': serializer.data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'get_farmer_stock_movements', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_stock_movements(request, stock_id):
    lang = get_language(request)
    
    if not lang:
        print("Language not specified in request")
        return Response({'error': 'Language not specified'}, status=status.HTTP_400_BAD_REQUEST)

    guard = _require_farmer(request, lang)
    if guard:
        print("User is not a farmer or not authenticated")
        return guard

    try:
        from django.shortcuts import get_object_or_404
        
        print(f"\nFetching stock with ID {stock_id}\n")

        stock = get_object_or_404(Stock, id=stock_id)
        if not stock:
            print(f"Stock with ID {stock_id} not found")
            return Response({'error': _( 'stock_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        movements = stock.movements.all()
        if not movements.exists():
            print(f"No movements found for stock ID {stock_id}")
            return Response({'error': _('no_movements_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        movement_type = request.query_params.get('type')
        if movement_type:
            movements = movements.filter(movement_type=movement_type)

        from_date = request.query_params.get('from_date')
        if from_date:
            movements = movements.filter(created_at__date__gte=from_date)

        to_date = request.query_params.get('to_date')
        if to_date:
            movements = movements.filter(created_at__date__lte=to_date)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = movements.count()
        movements_page = movements.order_by('-created_at')[start:end]

        serializer = StockMovementSerializer(
            movements_page, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'status': 'success',
            'stock_id': stock_id,
            'stock_name': stock.product_name,
            'current_quantity': float(stock.quantity),
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'movements': serializer.data,
        })

    except Exception as exc:
        print(f"Error in list_stock_movements for stock ID {stock_id}: {exc}")
        return _log_and_respond(
            exc, 'get_farmer_stock_movements', lang,
            status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error'
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farmer_movements(request):
    """
    Get all movements across all stocks for the logged-in farmer.
    """
    lang = get_language(request)
    guard = _require_farmer(request, lang)
    if guard:
        return guard

    try:
        movements = StockMovement.objects.filter(
            stock__farmer=request.user
        ).select_related('stock', 'created_by')

        movement_type = request.query_params.get('type')
        if movement_type:
            movements = movements.filter(movement_type=movement_type)

        product = request.query_params.get('product')
        if product:
            movements = movements.filter(stock__product_name__icontains=product)

        from_date = request.query_params.get('from_date')
        if from_date:
            movements = movements.filter(created_at__date__gte=from_date)

        to_date = request.query_params.get('to_date')
        if to_date:
            movements = movements.filter(created_at__date__lte=to_date)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = movements.count()
        movements_page = movements.order_by('-created_at')[start:end]

        serializer = StockMovementSerializer(
            movements_page, many=True, context={'request': request, 'lang': lang}
        )

        total_in = movements.filter(
            movement_type='in'
        ).aggregate(total=models.Sum('quantity'))['total'] or 0

        total_out = movements.filter(
            movement_type__in=['out', 'transfer']
        ).aggregate(total=models.Sum('quantity'))['total'] or 0

        return Response({
            'status': 'success',
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'summary': {
                'total_in': float(total_in),
                'total_out': float(total_out),
                'net_change': float(total_in - total_out),
                'unique_products': movements.values('stock__product_name').distinct().count(),
            },
            'movements': serializer.data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'get_farmer_movements', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farmer_recent_movements(request):
    """
    Get movements from the last 30 days for the logged-in farmer, with daily chart stats.
    """
    lang = get_language(request)
    guard = _require_farmer(request, lang)
    if guard:
        return guard

    try:
        thirty_days_ago = timezone.now() - timedelta(days=30)  # fixed: was datetime.timedelta

        movements = StockMovement.objects.filter(
            stock__farmer=request.user,
            created_at__gte=thirty_days_ago,
        ).select_related('stock', 'created_by').order_by('-created_at')[:50]

        serializer = StockMovementSerializer(
            movements, many=True, context={'request': request, 'lang': lang}
        )

        daily_stats = (
            StockMovement.objects.filter(
                stock__farmer=request.user,
                created_at__gte=thirty_days_ago,
            )
            .annotate(date=TruncDate('created_at'))
            .values('date', 'movement_type')
            .annotate(
                total_quantity=Sum('quantity'),
                count=Count('id'),
            )
            .order_by('date')
        )

        return Response({
            'status': 'success',
            'count': len(serializer.data),
            'period': 'last_30_days',
            'movements': serializer.data,
            'daily_stats': list(daily_stats),
        })

    except Exception as exc:
        return _log_and_respond(exc, 'get_farmer_recent_movements', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farmer_dashboard(request):
    """
    Comprehensive dashboard endpoint for farmers.
    """
    lang = get_language(request)
    guard = _require_farmer(request, lang)
    if guard:
        return guard

    try:
        stocks = Stock.objects.filter(farmer=request.user)

        total_stocks = stocks.count()
        total_quantity = stocks.aggregate(total=models.Sum('quantity'))['total'] or 0
        active_stocks = stocks.filter(is_active=True).count()

        low_stock_stocks = stocks.filter(quantity__lt=100)
        low_stock_count = low_stock_stocks.count()

        recent_movements = StockMovement.objects.filter(
            stock__farmer=request.user
        ).select_related('stock', 'created_by').order_by('-created_at')[:10]

        unresolved_alerts = StockAlert.objects.filter(
            stock__farmer=request.user,
            is_resolved=False,
        ).select_related('stock').order_by('-severity', '-created_at')[:5]

        top_products = stocks.values('product_name').annotate(
            total_quantity=models.Sum('quantity'),
            stock_count=models.Count('id'),
        ).order_by('-total_quantity')[:5]

        seven_days_ago = timezone.now() - timedelta(days=7)  # fixed: was datetime.timedelta
        recent_activity_count = StockMovement.objects.filter(
            stock__farmer=request.user,
            created_at__gte=seven_days_ago,
        ).count()

        by_location = stocks.values('location').annotate(
            total_quantity=models.Sum('quantity'),
            stock_count=models.Count('id'),
        ).order_by('-total_quantity')

        movements_serializer = StockMovementSerializer(
            recent_movements, many=True, context={'request': request, 'lang': lang}
        )
        alerts_serializer = StockAlertSerializer(
            unresolved_alerts, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'status': 'success',
            'welcome_message': nt('welcome_back', lang, name=request.user.full_name),
            'summary': {
                'total_stocks': total_stocks,
                'total_quantity': float(total_quantity),
                'active_stocks': active_stocks,
                'low_stock_alerts': low_stock_count,
                'recent_activity': recent_activity_count,
            },
            'alerts': {
                'count': low_stock_count,
                'low_stock_stocks': [
                    {
                        'id': s.id,
                        'product': s.product_name,
                        'quantity': float(s.quantity),
                        'location': s.location_string,
                    }
                    for s in low_stock_stocks[:5]
                ],
                'unresolved_alerts': alerts_serializer.data,
            },
            'recent_movements': movements_serializer.data,
            'top_products': list(top_products),
            'distribution': {'by_location': list(by_location)},
            'quick_actions': [
                {'label': 'Add Stock',         'url': '/api/stock/stocks/create/',      'method': 'POST'},
                {'label': 'Record Movement',   'url': '/api/stock/movements/create/',   'method': 'POST'},
                {'label': 'View All Stocks',   'url': '/api/stock/farmer/stocks/',      'method': 'GET'},
                {'label': 'View All Movements','url': '/api/stock/farmer/movements/',   'method': 'GET'},
            ],
        })

    except Exception as exc:
        return _log_and_respond(exc, 'get_farmer_dashboard', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farmer_alerts(request):
    """
    Get paginated alerts for the logged-in farmer.
    """
    lang = get_language(request)
    guard = _require_farmer(request, lang)
    if guard:
        return guard

    try:
        alerts = StockAlert.objects.filter(
            stock__farmer=request.user
        ).select_related('stock', 'resolved_by').order_by('-severity', '-created_at')

        resolved = request.query_params.get('resolved')
        if resolved is not None:
            alerts = alerts.filter(is_resolved=resolved.lower() == 'true')

        alert_type = request.query_params.get('type')
        if alert_type:
            alerts = alerts.filter(alert_type=alert_type)

        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = alerts.count()
        unresolved_count = alerts.filter(is_resolved=False).count()
        alerts_page = alerts[start:end]

        serializer = StockAlertSerializer(
            alerts_page, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'status': 'success',
            'total': total,
            'unresolved': unresolved_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'alerts': serializer.data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'get_farmer_alerts', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farmer_unresolved_alerts(request):
    """
    Get all unresolved alerts for the logged-in farmer, grouped by severity.
    """
    lang = get_language(request)
    guard = _require_farmer(request, lang)
    if guard:
        return guard

    try:
        alerts = StockAlert.objects.filter(
            stock__farmer=request.user,
            is_resolved=False,
        ).select_related('stock').order_by('-severity', '-created_at')

        serializer = StockAlertSerializer(
            alerts, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'status': 'success',
            'total': alerts.count(),
            'breakdown': {
                'critical': alerts.filter(severity='critical').count(),
                'warning':  alerts.filter(severity='warning').count(),
                'info':     alerts.filter(severity='info').count(),
            },
            'alerts': serializer.data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'get_farmer_unresolved_alerts', lang,
                                status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')