import logging
from decimal import Decimal, InvalidOperation
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction, models
from django.db.models import Q, Sum, Count, Avg
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CropStandard, CropStandardHistory
from .serializers import (
    CropStandardSerializer,
    CropStandardHistorySerializer,
    CropStandardSummarySerializer,
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
    """
    raw_header = request.headers.get('Accept-Language', '')
    if raw_header:
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
    """
    logger.error("Error in %s: %s", func_name, exc, exc_info=True)
    error_text = nt(message_key, lang) if message_key else message
    return Response({'error': error_text}, status=http_status)


def _require_buyer(request, lang):
    """Return a 403 Response if the user is not a buyer."""
    if request.user.role != 'buyer':
        return Response(
            {'error': nt('buyer_only', lang)},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


def _require_admin(request, lang):
    """Return a 403 Response if the user is not an admin."""
    if request.user.role != 'admin':
        return Response(
            {'error': nt('admin_required', lang)},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


def _create_history_record(standard, action, changed_by, changes=None):
    """Create a history record for a crop standard change."""
    CropStandardHistory.objects.create(
        crop_standard=standard,
        action=action,
        changed_by=changed_by,
        changes=changes or {}
    )


# ==================== BUYER-SPECIFIC ENDPOINTS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_crop_standard(request):
    """
    Create a new crop standard.
    Only buyers can create standards.
    """
    print(f"User {request.user.phone_number} is creating crop standard with data: {request.data}")
    lang = get_language(request)

    # Check if user is a buyer
    guard = _require_buyer(request, lang)
    if guard:
        return guard

    serializer = CropStandardSerializer(
        data=request.data,
        context={'request': request, 'lang': lang},
    )

    if not serializer.is_valid():
        print(f"Validation failed in create_crop_standard: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            # Check for duplicate active standard
            existing = CropStandard.objects.filter(
                created_by=request.user,
                crop_name__iexact=serializer.validated_data.get('crop_name'),
                season=serializer.validated_data.get('season'),
                harvest_year=serializer.validated_data.get('harvest_year'),
                status='active'
            ).exists()

            if existing:
                return Response({
                    'error': nt('duplicate_standard', lang,
                              crop=serializer.validated_data.get('crop_name'),
                              season=serializer.validated_data.get('season'),
                              year=serializer.validated_data.get('harvest_year'))
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create the standard
            standard = serializer.save(created_by=request.user)
            
            # Create history record
            _create_history_record(standard, 'create', request.user)

            # Send notification to the buyer
            notify_user(
                receiver=request.user,
                title=nt('standard_created_title', lang),
                description=nt('standard_created_desc', lang,
                             crop=standard.crop_name,
                             price=standard.price_per_kg),
                sender=request.user
            )
            
    except ValidationError as exc:
        print(f"ValidationError in create_crop_standard: {exc}")
        return Response(
            {
                'error': exc.message if hasattr(exc, 'message') else str(exc),
                'details': exc.error_dict if hasattr(exc, 'error_dict') else None,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        return _log_and_respond(exc, 'create_crop_standard', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')

    return Response(
        {
            'message': nt('standard_created', lang),
            'standard': CropStandardSerializer(
                standard, context={'request': request, 'lang': lang}
            ).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_buyer_standards(request):
    """
    Get all crop standards for the logged-in buyer with filtering and pagination.
    """
    lang = get_language(request)
    guard = _require_buyer(request, lang)
    if guard:
        return guard

    try:
        standards = CropStandard.objects.filter(created_by=request.user)

        # Apply filters
        crop_name = request.query_params.get('crop')
        if crop_name:
            standards = standards.filter(crop_name__icontains=crop_name)

        season = request.query_params.get('season')
        if season:
            standards = standards.filter(season=season)

        status_filter = request.query_params.get('status')
        if status_filter:
            standards = standards.filter(status=status_filter)

        quality = request.query_params.get('quality')
        if quality:
            standards = standards.filter(quality_grade=quality)

        year = request.query_params.get('year')
        if year:
            try:
                standards = standards.filter(harvest_year=int(year))
            except ValueError:
                pass

        min_price = request.query_params.get('min_price')
        if min_price:
            try:
                standards = standards.filter(price_per_kg__gte=Decimal(min_price))
            except (InvalidOperation, ValueError):
                logger.debug(f"Invalid min_price value: {min_price}")

        max_price = request.query_params.get('max_price')
        if max_price:
            try:
                standards = standards.filter(price_per_kg__lte=Decimal(max_price))
            except (InvalidOperation, ValueError):
                logger.debug(f"Invalid max_price value: {max_price}")

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = standards.count()
        standards_page = standards.select_related('created_by').order_by('-created_at')[start:end]

        serializer = CropStandardSerializer(
            standards_page, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'status': 'success',
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'standards': serializer.data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'get_buyer_standards', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_buyer_standard_detail(request, standard_id):
    """
    Get detailed information about a specific crop standard.
    """
    lang = get_language(request)
    guard = _require_buyer(request, lang)
    if guard:
        return guard

    try:
        standard = get_object_or_404(
            CropStandard.objects.filter(created_by=request.user).select_related('created_by'),
            id=standard_id,
        )

        # Get history for this standard
        history = standard.history.select_related('changed_by').order_by('-created_at')[:10]

        serializer = CropStandardSerializer(
            standard, context={'request': request, 'lang': lang}
        )
        history_serializer = CropStandardHistorySerializer(
            history, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'status': 'success',
            'standard': serializer.data,
            'history': history_serializer.data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'get_buyer_standard_detail', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_crop_standard(request, standard_id):
    """
    Update a crop standard.
    Only the owner can update their standards.
    """
    lang = get_language(request)
    guard = _require_buyer(request, lang)
    if guard:
        return guard

    try:
        standard = get_object_or_404(
            CropStandard.objects.filter(created_by=request.user),
            id=standard_id,
        )

        # Store old values for history
        old_values = {
            'crop_name': standard.crop_name,
            'crop_type': standard.crop_type,
            'season': standard.season,
            'harvest_year': standard.harvest_year,
            'quality_grade': standard.quality_grade,
            'price_per_kg': str(standard.price_per_kg),
            'min_quantity': str(standard.min_quantity),
            'max_quantity': str(standard.max_quantity) if standard.max_quantity else None,
            'status': standard.status,
        }

        serializer = CropStandardSerializer(
            standard,
            data=request.data,
            partial=request.method == 'PATCH',
            context={'request': request, 'lang': lang},
        )

        if not serializer.is_valid():
            print(f"Validation failed in update_crop_standard: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            updated_standard = serializer.save()

            # Create history record with changes
            changes = {}
            for field, old_value in old_values.items():
                new_value = getattr(updated_standard, field)
                if isinstance(new_value, Decimal):
                    new_value = str(new_value)
                if old_value != new_value:
                    changes[field] = {'old': old_value, 'new': new_value}

            if changes:
                _create_history_record(updated_standard, 'update', request.user, changes)

            # Send notification
            notify_user(
                receiver=request.user,
                title=nt('standard_updated_title', lang),
                description=nt('standard_updated_desc', lang,
                             crop=updated_standard.crop_name),
                sender=request.user
            )

        return Response({
            'message': nt('standard_updated', lang),
            'standard': CropStandardSerializer(
                updated_standard, context={'request': request, 'lang': lang}
            ).data,
        })

    except ValidationError as exc:
        print(f"ValidationError in update_crop_standard: {exc}")
        return Response(
            {
                'error': exc.message if hasattr(exc, 'message') else str(exc),
                'details': exc.error_dict if hasattr(exc, 'error_dict') else None,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        return _log_and_respond(exc, 'update_crop_standard', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_crop_standard(request, standard_id):
    """
    Delete a crop standard.
    Only the owner can delete their standards.
    """
    lang = get_language(request)
    guard = _require_buyer(request, lang)
    if guard:
        return guard

    try:
        standard = get_object_or_404(
            CropStandard.objects.filter(created_by=request.user),
            id=standard_id,
        )

        crop_name = standard.crop_name
        season = standard.get_season_display()
        year = standard.harvest_year

        with transaction.atomic():
            # Create history record before deletion
            _create_history_record(standard, 'delete', request.user)

            # Delete the standard
            standard.delete()

            # Send notification
            notify_user(
                receiver=request.user,
                title=nt('standard_deleted_title', lang),
                description=nt('standard_deleted_desc', lang, crop=crop_name),
                sender=request.user
            )

        return Response({
            'message': nt('standard_deleted', lang)
        }, status=status.HTTP_200_OK)

    except Exception as exc:
        return _log_and_respond(exc, 'delete_crop_standard', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_buyer_standards_summary(request):
    """Get summary statistics for the logged-in buyer's standards."""
    lang = get_language(request)
    guard = _require_buyer(request, lang)
    if guard:
        return guard
 
    try:
        standards = CropStandard.objects.filter(created_by=request.user)
 
        total = standards.count()
        active = standards.filter(status='active').count()
        inactive = standards.filter(status='inactive').count()
        expired = standards.filter(status='expired').count()
 
        total_value = 0
        for standard in standards.filter(status='active'):
            if standard.max_quantity:
                total_value += float(standard.price_per_kg) * float(standard.max_quantity)
 
        avg_price = standards.filter(status='active').aggregate(
            avg=models.Avg('price_per_kg')
        )['avg'] or 0
 
        by_crop = dict(standards.values_list('crop_name').annotate(count=models.Count('id')))
 
        by_season = {}
        for season_code, season_name in CropStandard.SEASONS:
            count = standards.filter(season=season_code).count()
            if count > 0:
                by_season[season_name] = count
 
        by_quality = {}
        for grade, grade_name in CropStandard.QUALITY_GRADES:
            count = standards.filter(quality_grade=grade).count()
            if count > 0:
                by_quality[grade_name] = count
 
        recent = standards.select_related('created_by').order_by('-created_at')[:5]
 
        summary = {
            'total_standards': total,
            'active_standards': active,
            'inactive_standards': inactive,
            'expired_standards': expired,
            'total_value_potential': round(total_value, 2),
            'avg_price_per_kg': round(float(avg_price), 2),
            'standards_by_crop': by_crop,
            'standards_by_season': by_season,
            'standards_by_quality': by_quality,
            'recent_standards': CropStandardSerializer(
                recent, many=True, context={'request': request, 'lang': lang}
            ).data,
        }
 
        return Response(summary)
 
    except Exception as exc:
        return _log_and_respond(exc, 'get_buyer_standards_summary', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')
 

# ==================== ADMIN ENDPOINTS ====================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_create_crop_standard(request):
    """
    Admin creates a crop standard.
    - If buyer_id is provided: creates for that buyer
    - If no buyer_id provided: creates for themselves (admin)
    """
    print(f"Admin {request.user.phone_number} is creating crop standard with data: {request.data}")
    lang = get_language(request)

    # Check if user is admin
    guard = _require_admin(request, lang)
    if guard:
        return guard

    buyer_id = request.data.get('buyer_id')
    
    # Determine the buyer (creator of the standard)
    if buyer_id:
        # Admin is creating for a specific buyer
        from userApp.models import CustomUser
        try:
            buyer = CustomUser.objects.get(id=buyer_id, role='buyer')
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Buyer not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # Admin is creating for themselves
        buyer = request.user
        # Note: The user will still be an admin, but we'll override in serializer context

    # Add the buyer info to serializer context
    serializer = CropStandardSerializer(
        data=request.data,
        context={
            'request': request, 
            'lang': lang,
            'is_admin_creating': True,  # Add this flag
            'target_buyer': buyer  # Add the target buyer
        },
    )

    if not serializer.is_valid():
        print(f"Validation failed in admin_create_crop_standard: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            # Create the standard with the determined buyer as created_by
            standard = serializer.save(created_by=buyer)
            _create_history_record(standard, 'create', request.user)

            # Notify the buyer if it's not the admin
            if buyer.id != request.user.id:
                notify_user(
                    receiver=buyer,
                    title=nt('standard_created_title', lang),
                    description=nt('standard_created_desc', lang,
                                 crop=standard.crop_name,
                                 price=standard.price_per_kg),
                    sender=request.user
                )

        return Response(
            {
                'message': nt('standard_created', lang),
                'standard': CropStandardSerializer(
                    standard, context={'request': request, 'lang': lang}
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )

    except ValidationError as exc:
        print(f"ValidationError in admin_create_crop_standard: {exc}")
        return Response(
            {
                'error': exc.message if hasattr(exc, 'message') else str(exc),
                'details': exc.error_dict if hasattr(exc, 'error_dict') else None,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        return _log_and_respond(exc, 'admin_create_crop_standard', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_list_standards(request):
    """
    Admin views all crop standards with filtering.
    """
    lang = get_language(request)
    guard = _require_admin(request, lang)
    if guard:
        return guard

    try:
        standards = CropStandard.objects.all()

        # Apply filters
        buyer_id = request.query_params.get('buyer')
        if buyer_id:
            standards = standards.filter(created_by_id=buyer_id)

        crop_name = request.query_params.get('crop')
        if crop_name:
            standards = standards.filter(crop_name__icontains=crop_name)

        season = request.query_params.get('season')
        if season:
            standards = standards.filter(season=season)

        status_filter = request.query_params.get('status')
        if status_filter:
            standards = standards.filter(status=status_filter)

        quality = request.query_params.get('quality')
        if quality:
            standards = standards.filter(quality_grade=quality)

        year = request.query_params.get('year')
        if year:
            try:
                standards = standards.filter(harvest_year=int(year))
            except ValueError:
                pass

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = standards.count()
        standards_page = standards.select_related('created_by').order_by('-created_at')[start:end]

        serializer = CropStandardSerializer(
            standards_page, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'status': 'success',
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'standards': serializer.data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'admin_list_standards', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_standard_detail(request, standard_id):
    """
    Admin gets detailed information about any crop standard.
    """
    lang = get_language(request)
    guard = _require_admin(request, lang)
    if guard:
        return guard

    try:
        standard = get_object_or_404(
            CropStandard.objects.select_related('created_by'),
            id=standard_id,
        )

        # Get full history
        history = standard.history.select_related('changed_by').order_by('-created_at')

        serializer = CropStandardSerializer(
            standard, context={'request': request, 'lang': lang}
        )
        history_serializer = CropStandardHistorySerializer(
            history, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'status': 'success',
            'standard': serializer.data,
            'history': history_serializer.data,
            'buyer_info': {
                'id': standard.created_by.id,
                'name': standard.created_by.full_name,
                'phone': standard.created_by.phone_number,
                'email': standard.created_by.email,
                'location': standard.created_by.location,
            }
        })

    except Exception as exc:
        return _log_and_respond(exc, 'admin_get_standard_detail', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def admin_update_crop_standard(request, standard_id):
    """
    Admin updates any crop standard.
    """
    print(f"Admin {request.user.phone_number} is updating crop standard {standard_id} with data: {request.data}")
    lang = get_language(request)
    guard = _require_admin(request, lang)
    if guard:
        return guard

    try:
        standard = get_object_or_404(CropStandard, id=standard_id)

        # Store old values for history
        old_values = {
            'crop_name': standard.crop_name,
            'crop_type': standard.crop_type,
            'season': standard.season,
            'harvest_year': standard.harvest_year,
            'quality_grade': standard.quality_grade,
            'price_per_kg': str(standard.price_per_kg),
            'min_quantity': str(standard.min_quantity),
            'max_quantity': str(standard.max_quantity) if standard.max_quantity else None,
            'status': standard.status,
        }

        serializer = CropStandardSerializer(
            standard,
            data=request.data,
            partial=request.method == 'PATCH',
            context={'request': request, 'lang': lang},
        )

        if not serializer.is_valid():
            print(f"Validation failed in admin_update_crop_standard: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            updated_standard = serializer.save()

            # Create history record with changes
            changes = {}
            for field, old_value in old_values.items():
                new_value = getattr(updated_standard, field)
                if isinstance(new_value, Decimal):
                    new_value = str(new_value)
                if old_value != new_value:
                    changes[field] = {'old': old_value, 'new': new_value}

            if changes:
                _create_history_record(updated_standard, 'update', request.user, changes)

            # Notify the buyer about the update
            notify_user(
                receiver=updated_standard.created_by,
                title=nt('standard_updated_title', lang),
                description=nt('standard_updated_desc', lang,
                             crop=updated_standard.crop_name),
                sender=request.user
            )

        return Response({
            'message': nt('standard_updated', lang),
            'standard': CropStandardSerializer(
                updated_standard, context={'request': request, 'lang': lang}
            ).data,
        })

    except ValidationError as exc:
        print(f"ValidationError in admin_update_crop_standard: {exc}")
        return Response(
            {
                'error': exc.message if hasattr(exc, 'message') else str(exc),
                'details': exc.error_dict if hasattr(exc, 'error_dict') else None,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        return _log_and_respond(exc, 'admin_update_crop_standard', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_crop_standard(request, standard_id):
    """
    Admin deletes any crop standard.
    """
    lang = get_language(request)
    guard = _require_admin(request, lang)
    if guard:
        return guard

    try:
        standard = get_object_or_404(CropStandard, id=standard_id)

        crop_name = standard.crop_name
        buyer = standard.created_by

        with transaction.atomic():
            _create_history_record(standard, 'delete', request.user)
            standard.delete()

            # Notify the buyer about deletion
            notify_user(
                receiver=buyer,
                title=nt('standard_deleted_title', lang),
                description=nt('standard_deleted_desc', lang, crop=crop_name),
                sender=request.user
            )

        return Response({
            'message': nt('standard_deleted', lang)
        }, status=status.HTTP_200_OK)

    except Exception as exc:
        return _log_and_respond(exc, 'admin_delete_crop_standard', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_standards_summary(request):
    """
    Admin gets summary statistics for all crop standards.
    """
    lang = get_language(request)
    guard = _require_admin(request, lang)
    if guard:
        return guard

    try:
        standards = CropStandard.objects.all()

        total = standards.count()
        active = standards.filter(status='active').count()
        inactive = standards.filter(status='inactive').count()
        expired = standards.filter(status='expired').count()

        # Calculate total potential value
        total_value = 0
        for standard in standards.filter(status='active'):
            if standard.max_quantity:
                total_value += float(standard.price_per_kg) * float(standard.max_quantity)

        # Average price
        avg_price = standards.filter(status='active').aggregate(
            avg=models.Avg('price_per_kg')
        )['avg'] or 0

        # Statistics by buyer
        buyers_stats = standards.values(
            'created_by__full_name', 'created_by__id'
        ).annotate(
            total_standards=models.Count('id'),
            active_standards=models.Count('id', filter=models.Q(status='active')),
            total_value=models.Sum(
                models.F('price_per_kg') * models.F('max_quantity'),
                output_field=models.DecimalField()
            )
        ).order_by('-total_standards')[:10]

        # Group by crop
        by_crop = dict(
            standards.values_list('crop_name').annotate(count=models.Count('id'))
        )

        # Group by season
        by_season = {}
        for season_code, season_name in CropStandard.SEASONS:
            count = standards.filter(season=season_code).count()
            if count > 0:
                by_season[season_name] = count

        # Group by quality
        by_quality = {}
        for grade, grade_name in CropStandard.QUALITY_GRADES:
            count = standards.filter(quality_grade=grade).count()
            if count > 0:
                by_quality[grade_name] = count

        # Recent standards
        recent = standards.select_related('created_by').order_by('-created_at')[:10]

        summary = {
            'total_standards': total,
            'active_standards': active,
            'inactive_standards': inactive,
            'expired_standards': expired,
            'total_value_potential': round(total_value, 2),
            'avg_price_per_kg': round(float(avg_price), 2),
            'unique_buyers': standards.values('created_by').distinct().count(),
            'top_buyers': list(buyers_stats),
            'standards_by_crop': by_crop,
            'standards_by_season': by_season,
            'standards_by_quality': by_quality,
            'recent_standards': CropStandardSerializer(
                recent, many=True, context={'request': request, 'lang': lang}
            ).data,
        }

        return Response(summary)

    except Exception as exc:
        return _log_and_respond(exc, 'admin_get_standards_summary', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')


# ==================== PUBLIC ENDPOINTS (for farmers to see buyer standards) ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_active_standards(request):
    """
    Get all active crop standards (useful for farmers to see what buyers want).
    Available to all authenticated users.
    """
    lang = get_language(request)

    try:
        standards = CropStandard.objects.filter(status='active')

        # Apply filters
        crop_name = request.query_params.get('crop')
        if crop_name:
            standards = standards.filter(crop_name__icontains=crop_name)

        season = request.query_params.get('season')
        if season:
            standards = standards.filter(season=season)

        quality = request.query_params.get('quality')
        if quality:
            standards = standards.filter(quality_grade=quality)

        min_price = request.query_params.get('min_price')
        if min_price:
            try:
                standards = standards.filter(price_per_kg__gte=Decimal(min_price))
            except (InvalidOperation, ValueError):
                pass

        max_price = request.query_params.get('max_price')
        if max_price:
            try:
                standards = standards.filter(price_per_kg__lte=Decimal(max_price))
            except (InvalidOperation, ValueError):
                pass

        location = request.query_params.get('location')
        if location:
            standards = standards.filter(preferred_location__icontains=location)

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size

        total = standards.count()
        standards_page = standards.select_related('created_by').order_by('-price_per_kg')[start:end]

        serializer = CropStandardSerializer(
            standards_page, many=True, context={'request': request, 'lang': lang}
        )

        return Response({
            'status': 'success',
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'standards': serializer.data,
        })

    except Exception as exc:
        return _log_and_respond(exc, 'get_active_standards', lang,
                              status.HTTP_500_INTERNAL_SERVER_ERROR, 'server_error')