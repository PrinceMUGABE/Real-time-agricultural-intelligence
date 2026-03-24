import logging
import traceback
from decimal import Decimal, InvalidOperation

from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from userApp.models import CustomUser
from stockApp.models import Stock
from standardApp.models import CropStandard
from notificationApp.services import notify_user

from .matching_utils import (
    find_matches_for_farmer,
    find_matches_for_buyer,
    find_matches_for_admin,
    get_match_summary
)
from .serializers import (
    MarketMatchSerializer,
    MatchSummarySerializer,
    MarketMatchFilterSerializer
)
from .translations import nt

logger = logging.getLogger(__name__)


# Helper functions
def get_language(request):
    """Get user's preferred language"""
    if request.user.is_authenticated:
        return getattr(request.user, 'language', 'en')
    return request.headers.get('Accept-Language', 'en')[:2].lower() or 'en'


def log_error(func_name, error, request=None):
    """Log error with details"""
    logger.error(f"Error in {func_name}: {str(error)}")
    logger.error(traceback.format_exc())
    if request and request.user.is_authenticated:
        logger.error(f"User: {request.user.id} - {request.user.phone_number}")


def validate_filters(request):
    """Validate and clean filter parameters"""
    serializer = MarketMatchFilterSerializer(data=request.query_params)
    if not serializer.is_valid():
        return None, serializer.errors
    return serializer.validated_data, None


def send_match_notification(user, matches, match_type='farmer'):
    """
    Send notification about new matches to user
    """
    try:
        lang = user.language or 'en'
        count = len(matches)
        
        if count == 0:
            return
        
        if match_type == 'farmer':
            # Group matches by product for better notification
            products = {}
            for match in matches[:5]:  # Limit to first 5 for notification
                product = match['stock'].product_name
                if product not in products:
                    products[product] = 0
                products[product] += 1
            
            if len(products) == 1:
                product = list(products.keys())[0]
                title = nt('new_matches_found_title', lang)
                description = nt('new_matches_found_desc', lang, 
                               count=count, 
                               product=product,
                               plural='s' if count > 1 else '')
            else:
                title = nt('new_matches_found_title', lang)
                description = nt('new_matches_found_desc', lang,
                               count=count,
                               product='multiple products',
                               plural='s' if count > 1 else '')
            
            # Check for high-quality matches
            high_quality = [m for m in matches if m['match_score'] >= 80]
            if high_quality:
                best_match = high_quality[0]
                notify_user(
                    receiver=user,
                    title=nt('high_quality_match_title', lang),
                    description=nt('high_quality_match_desc', lang,
                                 product=best_match['stock'].product_name,
                                 buyer_name=best_match['buyer'].full_name,
                                 score=best_match['match_score']),
                    sender=None  # System notification
                )
            
        else:  # buyer
            title = nt('buyer_matches_found_title', lang)
            description = nt('buyer_matches_found_desc', lang,
                           count=count,
                           product=matches[0]['crop_standard'].crop_name if matches else 'your criteria',
                           plural='s' if count > 1 else '')
        
        # Send main notification
        notify_user(
            receiver=user,
            title=title,
            description=description,
            sender=None  # System notification
        )
        
        # Update notification timestamp (we'd need a model for this, but for now just log)
        logger.info(f"Sent match notification to user {user.id} - {count} matches")
        
    except Exception as e:
        logger.error(f"Error sending match notification: {str(e)}")


# ==================== FARMER MATCHES ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farmer_matches(request):
    """
    Get all market matches for the authenticated farmer.
    Shows buyers whose crop standards match the farmer's stocks.
    Returns data in the same format as admin endpoint for frontend compatibility.
    """
    lang = get_language(request)
    
    # Verify user is a farmer
    if request.user.role != 'farmer':
        error_msg = nt('farmer_only', lang)
        logger.warning(f"Non-farmer {request.user.id} attempted to access farmer matches")
        return Response(
            {'error': error_msg},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get pagination parameters
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 12))
        
        # Validate filters
        filters, errors = validate_filters(request)
        if errors:
            logger.warning(f"Invalid filters from farmer {request.user.id}: {errors}")
            return Response(
                {'error': nt('invalid_filters', lang), 'details': errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find matches
        matches = find_matches_for_farmer(request.user, filters)
        
        # Apply min match score filter if provided
        min_score = filters.get('min_match_score') if filters else None
        if min_score:
            matches = [m for m in matches if m['match_score'] >= min_score]
        
        # Log match count
        logger.info(f"Farmer {request.user.id} found {len(matches)} matches")
        
        # Calculate total count
        total = len(matches)
        
        # Apply pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_matches = matches[start:end]
        
        # Get summary statistics (using all matches, not just paginated)
        summary = get_match_summary(matches)
        
        # Prepare response with the same format as admin endpoint
        response_data = {
            'matches': paginated_matches,
            'count': total,
            'total_pages': (total + page_size - 1) // page_size,
            'statistics': {
                'total_matches': summary.get('total_matches', 0),
                'average_score': summary.get('average_score', 0),
                'high_quality_matches': summary.get('high_quality_matches', 0),
                'total_potential_value': summary.get('total_potential_value', 0),
                'by_product': summary.get('by_product', {}),
                'by_location': summary.get('by_location', {})
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except ValueError as e:
        log_error('get_farmer_matches - ValueError', e, request)
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        log_error('get_farmer_matches', e, request)
        return Response(
            {'error': nt('server_error', lang)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_farmer_match_detail(request, stock_id, standard_id):
    """
    Get detailed information about a specific match between a farmer's stock
    and a buyer's crop standard.
    """
    lang = get_language(request)
    
    # Verify user is a farmer
    if request.user.role != 'farmer':
        error_msg = nt('farmer_only', lang)
        return Response(
            {'error': error_msg},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get stock and verify ownership
        stock = get_object_or_404(
            Stock.objects.select_related('farmer'),
            id=stock_id,
            farmer=request.user
        )
        
        # Get crop standard
        crop_standard = get_object_or_404(
            CropStandard.objects.select_related('created_by'),
            id=standard_id,
            status='active'
        )
        
        # Calculate match
        from .matching_utils import calculate_match_score
        score, details = calculate_match_score(stock, crop_standard)
        
        if score < 60:
            return Response({
                'status': 'warning',
                'message': 'This match does not meet minimum criteria',
                'match_score': score,
                'match_details': details
            }, status=status.HTTP_200_OK)
        
        # Prepare match data
        match_data = {
            'stock': stock,
            'crop_standard': crop_standard,
            'farmer': request.user,
            'buyer': crop_standard.created_by,
            'match_score': score,
            'match_details': details,
            'available_quantity': stock.quantity,
            'requested_quantity': crop_standard.min_quantity,
            'farmer_price': stock.price_per_kg,
            'buyer_price': crop_standard.price_per_kg,
            'price_difference': crop_standard.price_per_kg - stock.price_per_kg,
            'favorable_for_farmer': crop_standard.price_per_kg > stock.price_per_kg,
            'favorable_for_buyer': stock.price_per_kg < crop_standard.price_per_kg,
            'match_percentage': f"{score}%",
        }
        
        serializer = MarketMatchSerializer(match_data)
        
        return Response({
            'status': 'success',
            'match': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Stock.DoesNotExist:
        error_msg = "Stock not found or does not belong to you"
        logger.warning(f"Farmer {request.user.id} attempted to access invalid stock {stock_id}")
        return Response(
            {'error': error_msg},
            status=status.HTTP_404_NOT_FOUND
        )
    except CropStandard.DoesNotExist:
        error_msg = "Crop standard not found"
        logger.warning(f"Farmer {request.user.id} attempted to access invalid crop standard {standard_id}")
        return Response(
            {'error': error_msg},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        log_error('get_farmer_match_detail', e, request)
        return Response(
            {'error': nt('server_error', lang)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== BUYER MATCHES ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_buyer_matches(request):
    """
    Get all market matches for the authenticated buyer.
    Shows farmers whose stocks match the buyer's crop standards.
    Returns data in the same format as admin endpoint for frontend compatibility.
    """
    lang = get_language(request)
    
    # Verify user is a buyer
    if request.user.role != 'buyer':
        error_msg = nt('buyer_only', lang)
        logger.warning(f"Non-buyer {request.user.id} attempted to access buyer matches")
        return Response(
            {'error': error_msg},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get pagination parameters
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 12))
        
        # Validate filters
        filters, errors = validate_filters(request)
        if errors:
            logger.warning(f"Invalid filters from buyer {request.user.id}: {errors}")
            return Response(
                {'error': nt('invalid_filters', lang), 'details': errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find matches
        matches = find_matches_for_buyer(request.user, filters)
        
        # Apply min match score filter if provided
        min_score = filters.get('min_match_score') if filters else None
        if min_score:
            matches = [m for m in matches if m['match_score'] >= min_score]
        
        # Log match count
        logger.info(f"Buyer {request.user.id} found {len(matches)} matches")
        
        # Calculate total count
        total = len(matches)
        
        # Apply pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_matches = matches[start:end]
        
        # Get summary statistics (using all matches, not just paginated)
        summary = get_match_summary(matches)
        
        # Prepare response with the same format as admin endpoint
        response_data = {
            'matches': paginated_matches,
            'count': total,
            'total_pages': (total + page_size - 1) // page_size,
            'statistics': {
                'total_matches': summary.get('total_matches', 0),
                'average_score': summary.get('average_score', 0),
                'high_quality_matches': summary.get('high_quality_matches', 0),
                'total_potential_value': summary.get('total_potential_value', 0),
                'by_product': summary.get('by_product', {}),
                'by_location': summary.get('by_location', {})
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except ValueError as e:
        log_error('get_buyer_matches - ValueError', e, request)
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        log_error('get_buyer_matches', e, request)
        return Response(
            {'error': nt('server_error', lang)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_buyer_match_detail(request, standard_id, stock_id):
    """
    Get detailed information about a specific match between a buyer's crop standard
    and a farmer's stock.
    """
    lang = get_language(request)
    
    # Verify user is a buyer
    if request.user.role != 'buyer':
        error_msg = nt('buyer_only', lang)
        return Response(
            {'error': error_msg},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get crop standard and verify ownership
        crop_standard = get_object_or_404(
            CropStandard.objects.select_related('created_by'),
            id=standard_id,
            created_by=request.user
        )
        
        # Get stock
        stock = get_object_or_404(
            Stock.objects.select_related('farmer'),
            id=stock_id,
            is_active=True,
            quantity__gt=0
        )
        
        # Calculate match
        from .matching_utils import calculate_match_score
        score, details = calculate_match_score(stock, crop_standard)
        
        if score < 60:
            return Response({
                'status': 'warning',
                'message': 'This match does not meet minimum criteria',
                'match_score': score,
                'match_details': details
            }, status=status.HTTP_200_OK)
        
        # Prepare match data
        match_data = {
            'stock': stock,
            'crop_standard': crop_standard,
            'farmer': stock.farmer,
            'buyer': request.user,
            'match_score': score,
            'match_details': details,
            'available_quantity': stock.quantity,
            'requested_quantity': crop_standard.min_quantity,
            'farmer_price': stock.price_per_kg,
            'buyer_price': crop_standard.price_per_kg,
            'price_difference': crop_standard.price_per_kg - stock.price_per_kg,
            'favorable_for_farmer': crop_standard.price_per_kg > stock.price_per_kg,
            'favorable_for_buyer': stock.price_per_kg < crop_standard.price_per_kg,
            'match_percentage': f"{score}%",
        }
        
        serializer = MarketMatchSerializer(match_data)
        
        return Response({
            'status': 'success',
            'match': serializer.data
        }, status=status.HTTP_200_OK)
        
    except CropStandard.DoesNotExist:
        error_msg = "Crop standard not found or does not belong to you"
        logger.warning(f"Buyer {request.user.id} attempted to access invalid crop standard {standard_id}")
        return Response(
            {'error': error_msg},
            status=status.HTTP_404_NOT_FOUND
        )
    except Stock.DoesNotExist:
        error_msg = "Stock not found"
        logger.warning(f"Buyer {request.user.id} attempted to access invalid stock {stock_id}")
        return Response(
            {'error': error_msg},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        log_error('get_buyer_match_detail', e, request)
        return Response(
            {'error': nt('server_error', lang)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== ADMIN MATCHES ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admin_matches(request):
    """
    Get all market matches in the system for admin view.
    Shows all possible matches between farmers and buyers.
    """
    lang = get_language(request)
    
    # Verify user is admin
    if request.user.role != 'admin':
        error_msg = nt('admin_only', lang)
        logger.warning(f"Non-admin {request.user.id} attempted to access admin matches")
        return Response(
            {'error': error_msg},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get pagination parameters
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 12))
        
        # Validate filters
        filters, errors = validate_filters(request)
        if errors:
            logger.warning(f"Invalid filters from admin {request.user.id}: {errors}")
            return Response(
                {'error': nt('invalid_filters', lang), 'details': errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find matches
        matches = find_matches_for_admin(filters)
        
        # Apply min match score filter if provided
        min_score = filters.get('min_match_score') if filters else None
        if min_score:
            matches = [m for m in matches if m['match_score'] >= min_score]
        
        # Log match count
        logger.info(f"Admin {request.user.id} viewed {len(matches)} matches")
        
        # Calculate total count
        total = len(matches)
        
        # Apply pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_matches = matches[start:end]
        
        # Get summary statistics (using all matches, not just paginated)
        summary = get_match_summary(matches)
        
        # Calculate additional admin statistics
        unique_farmers = len(set(m['farmer']['id'] for m in matches)) if matches else 0
        unique_buyers = len(set(m['buyer']['id'] for m in matches)) if matches else 0
        unique_products = len(set(m['stock']['product_name'] for m in matches)) if matches else 0
        
        # Prepare response with the same format as farmer/buyer endpoints
        response_data = {
            'matches': paginated_matches,
            'count': total,
            'total_pages': (total + page_size - 1) // page_size,
            'statistics': {
                'total_matches': summary['total_matches'],
                'average_score': summary['average_score'],
                'high_quality_matches': summary['high_quality_matches'],
                'total_potential_value': summary['total_potential_value'],
                'by_product': summary['by_product'],
                'by_location': summary['by_location'],
                'unique_farmers': unique_farmers,
                'unique_buyers': unique_buyers,
                'unique_products': unique_products
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except ValueError as e:
        log_error('get_admin_matches - ValueError', e, request)
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        log_error('get_admin_matches', e, request)
        import traceback
        traceback.print_exc()
        return Response(
            {'error': nt('server_error', lang)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admin_match_detail(request, stock_id, standard_id):
    """
    Get detailed information about a specific match for admin view.
    """
    lang = get_language(request)
    
    # Verify user is admin
    if request.user.role != 'admin':
        error_msg = nt('admin_only', lang)
        return Response(
            {'error': error_msg},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get stock
        stock = get_object_or_404(
            Stock.objects.select_related('farmer'),
            id=stock_id,
            is_active=True
        )
        
        # Get crop standard
        crop_standard = get_object_or_404(
            CropStandard.objects.select_related('created_by'),
            id=standard_id
        )
        
        # Calculate match
        from .matching_utils import calculate_match_score
        score, details = calculate_match_score(stock, crop_standard)
        
        # Prepare match data
        match_data = {
            'stock': stock,
            'crop_standard': crop_standard,
            'farmer': stock.farmer,
            'buyer': crop_standard.created_by,
            'match_score': score,
            'match_details': details,
            'available_quantity': stock.quantity,
            'requested_quantity': crop_standard.min_quantity,
            'farmer_price': stock.price_per_kg,
            'buyer_price': crop_standard.price_per_kg,
            'price_difference': crop_standard.price_per_kg - stock.price_per_kg,
            'favorable_for_farmer': crop_standard.price_per_kg > stock.price_per_kg,
            'favorable_for_buyer': stock.price_per_kg < crop_standard.price_per_kg,
            'match_percentage': f"{score}%",
        }
        
        serializer = MarketMatchSerializer(match_data)
        
        return Response({
            'status': 'success',
            'match': serializer.data
        }, status=status.HTTP_200_OK)
        
    except (Stock.DoesNotExist, CropStandard.DoesNotExist) as e:
        error_msg = "Stock or crop standard not found"
        logger.warning(f"Admin {request.user.id} attempted to access invalid match: {str(e)}")
        return Response(
            {'error': error_msg},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        log_error('get_admin_match_detail', e, request)
        return Response(
            {'error': nt('server_error', lang)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== DASHBOARD & SUMMARY ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_market_dashboard(request):
    """
    Get market dashboard with summary statistics and recent matches.
    Role-based view (farmers see their matches, buyers see theirs, admins see all).
    """
    lang = get_language(request)
    
    try:
        if request.user.role == 'farmer':
            matches = find_matches_for_farmer(request.user)
            title = "Your Market Matches"
        elif request.user.role == 'buyer':
            matches = find_matches_for_buyer(request.user)
            title = "Your Supplier Matches"
        elif request.user.role == 'admin':
            matches = find_matches_for_admin()
            title = "System Market Overview"
        else:
            return Response(
                {'error': 'Invalid user role'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get top matches
        top_matches = matches[:10]
        
        # Get summary
        summary = get_match_summary(matches)
        
        # Get matches by score range
        excellent = len([m for m in matches if m['match_score'] >= 90])
        good = len([m for m in matches if 80 <= m['match_score'] < 90])
        fair = len([m for m in matches if 70 <= m['match_score'] < 80])
        basic = len([m for m in matches if 60 <= m['match_score'] < 70])
        
        # Prepare response
        serializer = MarketMatchSerializer(top_matches, many=True)
        
        return Response({
            'status': 'success',
            'title': title,
            'welcome_message': nt('welcome_back', lang, name=request.user.full_name),
            'total_matches': len(matches),
            'matches_by_score': {
                'excellent': excellent,
                'good': good,
                'fair': fair,
                'basic': basic
            },
            'summary': summary,
            'recent_matches': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        log_error('get_market_dashboard', e, request)
        return Response(
            {'error': nt('server_error', lang)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_match_statistics(request):
    """
    Get detailed match statistics for the user.
    """
    lang = get_language(request)
    
    try:
        if request.user.role == 'farmer':
            matches = find_matches_for_farmer(request.user)
        elif request.user.role == 'buyer':
            matches = find_matches_for_buyer(request.user)
        elif request.user.role == 'admin':
            matches = find_matches_for_admin()
        else:
            return Response(
                {'error': 'Invalid user role'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not matches:
            return Response({
                'status': 'success',
                'message': 'No matches found',
                'statistics': {
                    'total_matches': 0,
                    'average_score': 0,
                    'by_product': {},
                    'by_location': {},
                    'by_quality': {}
                }
            })
        
        # Calculate statistics
        total = len(matches)
        avg_score = sum(m['match_score'] for m in matches) / total
        
        # By quality grade
        by_quality = {}
        for match in matches:
            grade = match['stock'].get_quality_grade_display()
            if grade not in by_quality:
                by_quality[grade] = {
                    'count': 0,
                    'total_quantity': 0,
                    'avg_score': 0
                }
            by_quality[grade]['count'] += 1
            by_quality[grade]['total_quantity'] += float(match['available_quantity'])
            by_quality[grade]['avg_score'] = (
                (by_quality[grade]['avg_score'] * (by_quality[grade]['count'] - 1) + match['match_score'])
                / by_quality[grade]['count']
            )
        
        # By product (already in summary, but we can add more detail)
        by_product = {}
        for match in matches:
            product = match['stock'].product_name
            if product not in by_product:
                by_product[product] = {
                    'count': 0,
                    'total_quantity': 0,
                    'avg_score': 0,
                    'avg_price': 0
                }
            by_product[product]['count'] += 1
            by_product[product]['total_quantity'] += float(match['available_quantity'])
            by_product[product]['avg_score'] = (
                (by_product[product]['avg_score'] * (by_product[product]['count'] - 1) + match['match_score'])
                / by_product[product]['count']
            )
            by_product[product]['avg_price'] = (
                (by_product[product]['avg_price'] * (by_product[product]['count'] - 1) + float(match['farmer_price']))
                / by_product[product]['count']
            )
        
        return Response({
            'status': 'success',
            'statistics': {
                'total_matches': total,
                'average_score': round(avg_score, 2),
                'total_potential_value': sum(
                    float(m['available_quantity']) * float(m['buyer_price']) 
                    for m in matches
                ),
                'by_quality': by_quality,
                'by_product': by_product
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        log_error('get_match_statistics', e, request)
        return Response(
            {'error': nt('server_error', lang)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== MATCH ACTIONS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_match_view(request, stock_id, standard_id):
    """
    Record that a user has viewed a specific match.
    This helps track engagement and can be used for analytics.
    """
    lang = get_language(request)
    
    try:
        # Verify the match exists
        stock = get_object_or_404(Stock, id=stock_id)
        standard = get_object_or_404(CropStandard, id=standard_id)
        
        # Verify user has access to this match
        if request.user.role == 'farmer' and stock.farmer != request.user:
            return Response(
                {'error': 'You do not have access to this match'},
                status=status.HTTP_403_FORBIDDEN
            )
        elif request.user.role == 'buyer' and standard.created_by != request.user:
            return Response(
                {'error': 'You do not have access to this match'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # In a real implementation, you'd update a tracking model here
        # For now, just log it
        logger.info(f"User {request.user.id} viewed match: Stock {stock_id} - Standard {standard_id}")
        
        return Response({
            'status': 'success',
            'message': 'Match view recorded'
        }, status=status.HTTP_200_OK)
        
    except (Stock.DoesNotExist, CropStandard.DoesNotExist):
        return Response(
            {'error': 'Match not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        log_error('record_match_view', e, request)
        return Response(
            {'error': nt('server_error', lang)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )