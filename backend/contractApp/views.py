from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as http_status
from django.db import transaction
from django.db.models import Q, Sum
from django.utils.timezone import now
from decimal import Decimal

from .models import Contract, PaymentRecord, ContractActivity
from .serializers import (
    ContractSerializer, CreateContractSerializer,
    UpdateContractSerializer, AddPaymentSerializer,
    PaymentRecordSerializer, StartDeliverySerializer, CompleteDeliverySerializer,
    ContractActivitySerializer,
)
from userApp.models import CustomUser
from .translations import ct

try:
    from stockApp.models import Stock, StockMovement
except ImportError:
    Stock = None
    StockMovement = None

try:
    from notificationApp.services import notify_user
except ImportError:
    def notify_user(*args, **kwargs):
        print("[notify_user] notificationApp not available — skipping notification.")


def get_lang(request):
    lang = request.headers.get('Accept-Language', 'en')[:2].lower()
    return lang if lang in ('en', 'fr', 'rw', 'sw') else 'en'


def get_user_lang(user):
    """Get preferred language from the user model's language field."""
    lang = getattr(user, 'language', 'en') or 'en'
    return lang if lang in ('en', 'fr', 'rw', 'sw') else 'en'


def log_activity(contract, activity_type, performed_by, details=None):
    """Log contract activity"""
    ContractActivity.objects.create(
        contract=contract,
        activity_type=activity_type,
        performed_by=performed_by,
        details=details or {}
    )


def notify_contract_parties(contract, title_key, body_key, sender=None, exclude_user=None, extra_kwargs=None):
    """
    Send notification to all parties (buyer, farmer, deliver person)
    each in their own language.
    """
    extra_kwargs = extra_kwargs or {}
    parties = []

    if contract.buyer:
        parties.append(contract.buyer)
    if contract.farmer:
        parties.append(contract.farmer)
    if contract.deliver and contract.deliver != contract.buyer and contract.deliver != contract.farmer:
        parties.append(contract.deliver)

    seen = set()
    for user in parties:
        if user.id in seen:
            continue
        seen.add(user.id)

        if exclude_user and user.id == exclude_user.id:
            continue

        lang = get_user_lang(user)
        title = ct(title_key, lang)
        body = ct(body_key, lang, **extra_kwargs)

        try:
            notify_user(receiver=user, title=title, description=body, sender=sender)
        except Exception as e:
            print(f"[notify_contract_parties] Failed to notify user #{user.id}: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# CONTRACT CRUD
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_contract(request):
    """
    Create a new contract.
    The creator (buyer or farmer) automatically accepts their side.
    The other party's status remains pending.
    """

    lang = get_lang(request)
    
    print(f"\n User {request.user.full_name} with {request.user.role} role is creating \n a contract with the following information:\n {request.data}\n")
    
    try:
        serializer = CreateContractSerializer(data=request.data)
        if not serializer.is_valid():
            print(f"[create_contract] Validation errors: {serializer.errors}")
            return Response(
                {'error': ct('invalid_data', lang), 'details': serializer.errors},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        buyer = data['buyer']
        farmer = data['farmer']
        creator = request.user

        # Verify creator is either buyer or farmer
        is_buyer_creating = (creator.id == buyer.id)
        is_farmer_creating = (creator.id == farmer.id)

        if not (is_buyer_creating or is_farmer_creating):
            print(f"[create_contract] User #{creator.id} is not buyer or farmer: buyer_id={buyer.id}, farmer_id={farmer.id}")
            return Response(
                {'error': ct('only_party_can_create', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        # Set initial statuses based on creator
        buyer_status = Contract.STATUS_ACCEPTED if is_buyer_creating else Contract.STATUS_PENDING
        farmer_status = Contract.STATUS_ACCEPTED if is_farmer_creating else Contract.STATUS_PENDING

        # Get stock if provided
        stock_obj = None
        if data.get('stock'):
            try:
                stock_obj = Stock.objects.get(id=data['stock'])
            except Stock.DoesNotExist:
                print(f"[create_contract] Stock with ID {data['stock']} does not exist.")
                pass

        # Get deliver person if provided
        deliver_obj = None
        if data.get('deliver'):
            try:
                deliver_obj = CustomUser.objects.get(id=data['deliver'], is_active=True)
            except CustomUser.DoesNotExist:
                print(f"[create_contract] Deliver person with ID {data['deliver']} does not exist.")
                pass

        with transaction.atomic():
            contract = Contract.objects.create(
                buyer=buyer,
                farmer=farmer,
                stock=stock_obj,
                crop_name=data['crop_name'],
                price_per_kg=data['price_per_kg'],
                quantity_kg=data['quantity_kg'],
                deliver=deliver_obj,
                delivery_location=data.get('delivery_location', ''),
                delivery_date=data.get('delivery_date'),
                delivery_notes=data.get('delivery_notes', ''),
                notes=data.get('notes', ''),
                created_by=creator,
                buyer_status=buyer_status,
                farmer_status=farmer_status,
                payment_option=data.get('payment_option', 'full'),
                payment_due_date=data.get('payment_due_date'),
                admin_confirmed=False,
            )
            
            # Log activity
            log_activity(
                contract, 
                'created', 
                creator,
                {'creator_role': 'buyer' if is_buyer_creating else 'farmer'}
            )

        # Prepare notification data
        extra = {
            'crop': contract.crop_name,
            'quantity': contract.quantity_kg,
            'price': contract.price_per_kg,
            'total': contract.total_amount,
            'id': contract.id,
            'creator': creator.full_name,
            'role': 'buyer' if is_buyer_creating else 'farmer',
        }

        # Notify all parties
        notify_contract_parties(
            contract,
            title_key='notif_contract_created_title',
            body_key='notif_contract_created_body',
            sender=creator,
            extra_kwargs=extra,
        )

        return Response({
            'success': True,
            'message': ct('contract_created', lang),
            'contract': ContractSerializer(contract, context={'request': request}).data,
        }, status=http_status.HTTP_201_CREATED)

    except Exception as e:
        print(f"[create_contract] Exception: {e}")
        return Response(
            {'error': str(e), 'context': 'create_contract'},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_contract(request, contract_id):
    """Get a single contract by ID."""
    lang = get_lang(request)
    
    try:
        user = request.user
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        # Check permissions: admin or party to contract
        if user.role != 'admin' and not (
            contract.buyer_id == user.id or
            contract.farmer_id == user.id or
            contract.deliver_id == user.id
        ):
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        return Response(ContractSerializer(contract, context={'request': request}).data)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_contracts(request):
    """Admin-only: list all contracts with optional filters."""
    lang = get_lang(request)
    
    try:
        if request.user.role != 'admin':
            print(f"[get_all_contracts] User #{request.user.id} with role {request.user.role} attempted to access all contracts.")
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        qs = Contract.objects.select_related(
            'buyer', 'farmer', 'deliver', 'stock', 'created_by', 'admin_confirmed_by'
        ).prefetch_related('payment_records', 'activities')

        # Filters
        status_filter = request.query_params.get('status')
        payment_filter = request.query_params.get('payment_status')
        delivery_filter = request.query_params.get('delivery_status')
        admin_confirmed = request.query_params.get('admin_confirmed')
        search = request.query_params.get('search', '').strip()

        if status_filter:
            qs = qs.filter(status=status_filter)
        if payment_filter:
            qs = qs.filter(payment_status=payment_filter)
        if delivery_filter:
            qs = qs.filter(delivery_status=delivery_filter)
        if admin_confirmed is not None:
            qs = qs.filter(admin_confirmed=admin_confirmed.lower() == 'true')
        if search:
            qs = qs.filter(
                Q(crop_name__icontains=search) |
                Q(buyer__full_name__icontains=search) |
                Q(farmer__full_name__icontains=search)
            )

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        total = qs.count()
        contracts = qs[(page - 1) * page_size: page * page_size]

        # Statistics
        stats = {
            'total': total,
            'pending': qs.filter(status=Contract.STATUS_PENDING).count(),
            'accepted': qs.filter(status=Contract.STATUS_ACCEPTED).count(),
            'completed': qs.filter(status=Contract.STATUS_COMPLETED).count(),
            'failed': qs.filter(status=Contract.STATUS_FAILED).count(),
            'awaiting_admin': qs.filter(
                farmer_status=Contract.STATUS_ACCEPTED,
                buyer_status=Contract.STATUS_ACCEPTED,
                admin_confirmed=False
            ).count(),
        }

        return Response({
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'contracts': ContractSerializer(contracts, many=True, context={'request': request}).data,
            'stats': stats,
        })

    except Exception as e:
        print(f"[get_all_contracts] Exception: {e}")
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_contracts(request):
    """Get contracts where user is buyer, farmer, or deliver person."""
    lang = get_lang(request)
    
    try:
        user = request.user
        qs = Contract.objects.filter(
            Q(buyer=user) | Q(farmer=user) | Q(deliver=user)
        ).select_related(
            'buyer', 'farmer', 'deliver', 'stock', 'created_by'
        ).prefetch_related('payment_records')

        # Role filter
        role_filter = request.query_params.get('role')
        if role_filter == 'buyer':
            qs = qs.filter(buyer=user)
        elif role_filter == 'farmer':
            qs = qs.filter(farmer=user)
        elif role_filter == 'deliver':
            qs = qs.filter(deliver=user)

        # Status filter
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        return Response({
            'contracts': ContractSerializer(qs, many=True, context={'request': request}).data,
            'total': qs.count(),
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_contract(request, contract_id):
    """Update contract details while still pending."""
    lang = get_lang(request)
    
    try:
        user = request.user
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        # Check permissions
        is_party = contract.buyer_id == user.id or contract.farmer_id == user.id
        is_admin = user.role == 'admin'

        if not is_admin and not is_party:
            return Response(
                {'error': ct('cannot_update', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        # Only pending contracts can be updated
        if not is_admin and contract.status != Contract.STATUS_PENDING:
            return Response(
                {'error': ct('contract_already_done', lang)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        serializer = UpdateContractSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {'error': ct('invalid_data', lang), 'details': serializer.errors},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        changes = []

        with transaction.atomic():
            if 'crop_name' in data:
                contract.crop_name = data['crop_name']
                changes.append('crop_name')
            if 'price_per_kg' in data:
                contract.price_per_kg = data['price_per_kg']
                changes.append('price_per_kg')
            if 'quantity_kg' in data:
                contract.quantity_kg = data['quantity_kg']
                changes.append('quantity_kg')
            if 'notes' in data:
                contract.notes = data['notes']
                changes.append('notes')
            if 'delivery_date' in data:
                contract.delivery_date = data['delivery_date']
                changes.append('delivery_date')
            if 'delivery_location' in data:
                contract.delivery_location = data['delivery_location']
                changes.append('delivery_location')
            if 'delivery_notes' in data:
                contract.delivery_notes = data['delivery_notes']
                changes.append('delivery_notes')
            if 'payment_due_date' in data:
                contract.payment_due_date = data['payment_due_date']
                changes.append('payment_due_date')

            if 'deliver' in data:
                if data['deliver'] is None:
                    contract.deliver = None
                else:
                    try:
                        contract.deliver = CustomUser.objects.get(id=data['deliver'], is_active=True)
                    except CustomUser.DoesNotExist:
                        pass
                changes.append('deliver')

            contract.save()

            # Log activity
            if changes:
                log_activity(
                    contract,
                    'updated',
                    user,
                    {'changes': changes}
                )

        # Notify other party about update
        extra = {'crop': contract.crop_name, 'id': contract.id, 'changes': ', '.join(changes)}
        notify_contract_parties(
            contract,
            title_key='notif_contract_updated_title',
            body_key='notif_contract_updated_body',
            sender=user,
            exclude_user=user,
            extra_kwargs=extra,
        )

        return Response({
            'success': True,
            'message': ct('contract_updated', lang),
            'contract': ContractSerializer(contract, context={'request': request}).data,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_contract(request, contract_id):
    """Delete a contract (only if pending)."""
    lang = get_lang(request)
    
    try:
        user = request.user
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        is_admin = user.role == 'admin'
        is_party = contract.buyer_id == user.id or contract.farmer_id == user.id

        if not is_admin and not is_party:
            return Response(
                {'error': ct('cannot_delete', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        if not is_admin and contract.status != Contract.STATUS_PENDING:
            return Response(
                {'error': ct('contract_already_done', lang)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        # Notify before deletion
        extra = {'crop': contract.crop_name, 'id': contract.id}
        notify_contract_parties(
            contract,
            title_key='notif_contract_deleted_title',
            body_key='notif_contract_deleted_body',
            sender=user,
            exclude_user=user,
            extra_kwargs=extra,
        )

        contract.delete()
        return Response({'success': True, 'message': ct('contract_deleted', lang)})

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ══════════════════════════════════════════════════════════════════════════════
# CONTRACT ACTIONS (Accept/Reject/Confirm)
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_contract(request, contract_id):
    """Accept contract as buyer or farmer."""
    lang = get_lang(request)
    
    try:
        user = request.user
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if contract.status in (Contract.STATUS_COMPLETED, Contract.STATUS_FAILED):
            return Response(
                {'error': ct('contract_already_done', lang)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            success, message = contract.accept_by_party(user)
            if not success:
                return Response(
                    {'error': message},
                    status=http_status.HTTP_400_BAD_REQUEST,
                )
            contract.save()
            
            # Log activity
            role = 'buyer' if user.id == contract.buyer_id else 'farmer'
            log_activity(contract, 'accepted', user, {'role': role})

        # Prepare notification
        extra = {'crop': contract.crop_name, 'id': contract.id, 'party': role}
        title_key = f'notif_{role}_accepted_title'
        body_key = f'notif_{role}_accepted_body'

        notify_contract_parties(
            contract,
            title_key=title_key,
            body_key=body_key,
            sender=user,
            exclude_user=user,
            extra_kwargs=extra,
        )

        # If both parties have accepted, notify that admin confirmation is needed
        if contract.both_parties_accepted:
            notify_contract_parties(
                contract,
                title_key='notif_contract_both_accepted_title',
                body_key='notif_contract_both_accepted_body',
                sender=None,
                extra_kwargs={'crop': contract.crop_name, 'id': contract.id},
            )

        return Response({
            'success': True,
            'message': ct(message, lang),
            'contract': ContractSerializer(contract, context={'request': request}).data,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_contract(request, contract_id):
    """Reject contract as buyer or farmer."""
    lang = get_lang(request)
    
    try:
        user = request.user
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if contract.status in (Contract.STATUS_COMPLETED, Contract.STATUS_FAILED):
            return Response(
                {'error': ct('contract_already_done', lang)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            success, message = contract.reject_by_party(user)
            if not success:
                return Response(
                    {'error': message},
                    status=http_status.HTTP_400_BAD_REQUEST,
                )
            contract.save()
            
            # Log activity
            role = 'buyer' if user.id == contract.buyer_id else 'farmer'
            log_activity(contract, 'rejected', user, {'role': role, 'reason': request.data.get('reason', '')})

        # Notify other party
        extra = {'crop': contract.crop_name, 'id': contract.id, 'party': role}
        title_key = f'notif_{role}_rejected_title'
        body_key = f'notif_{role}_rejected_body'

        notify_contract_parties(
            contract,
            title_key=title_key,
            body_key=body_key,
            sender=user,
            exclude_user=user,
            extra_kwargs=extra,
        )

        return Response({
            'success': True,
            'message': ct(message, lang),
            'contract': ContractSerializer(contract, context={'request': request}).data,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_contract(request, contract_id):
    """
    Admin confirms the contract after both parties have accepted.
    This must happen before payments and deliveries can begin.
    """
    lang = get_lang(request)
    
    try:
        if request.user.role != 'admin':
            print(f"[confirm_contract] User #{request.user.id} with role {request.user.role} attempted to confirm contract.")
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            print(f"[confirm_contract] Contract with ID {contract_id} does not exist.")
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        print(f"[confirm_contract] Attempting to confirm contract {contract_id} by user {request.user.id}")
        print(f"[confirm_contract] Current contract state - both_parties_accepted: {contract.both_parties_accepted}, admin_confirmed: {contract.admin_confirmed}")

        # Check if both parties have accepted
        if not contract.both_parties_accepted:
            return Response(
                {'error': "Both parties must accept before admin confirmation"},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        # Check if already confirmed
        if contract.admin_confirmed:
            return Response(
                {'error': "Contract already confirmed"},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Update contract directly
            contract.admin_confirmed = True
            contract.admin_confirmed_at = now()
            contract.admin_confirmed_by = request.user
            contract.status = Contract.STATUS_ACCEPTED
            contract.save(update_fields=['admin_confirmed', 'admin_confirmed_at', 'admin_confirmed_by', 'status'])
            
            # Log activity
            log_activity(contract, 'confirmed', request.user)
            
            print(f"[confirm_contract] Contract confirmed successfully. New state - admin_confirmed: {contract.admin_confirmed}, status: {contract.status}")

        # Notify all parties
        extra = {'crop': contract.crop_name, 'id': contract.id}
        notify_contract_parties(
            contract,
            title_key='notif_contract_confirmed_title',
            body_key='notif_contract_confirmed_body',
            sender=request.user,
            extra_kwargs=extra,
        )

        return Response({
            'success': True,
            'message': ct('contract_confirmed', lang),
            'contract': ContractSerializer(contract, context={'request': request}).data,
        })

    except Exception as e:
        print(f"[confirm_contract] Exception: {e}")
        import traceback
        traceback.print_exc()
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_contract(request, contract_id):
    """Admin marks contract as completed."""
    lang = get_lang(request)
    
    try:
        if request.user.role != 'admin':
            return Response(
                {'error': ct('cannot_complete', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if contract.status in (Contract.STATUS_COMPLETED, Contract.STATUS_FAILED):
            return Response(
                {'error': ct('contract_already_done', lang)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        contract.status = Contract.STATUS_COMPLETED
        contract.save()

        log_activity(contract, 'completed', request.user)

        extra = {'crop': contract.crop_name, 'id': contract.id}
        notify_contract_parties(
            contract,
            title_key='notif_contract_completed_title',
            body_key='notif_contract_completed_body',
            sender=request.user,
            extra_kwargs=extra,
        )

        return Response({
            'success': True,
            'message': ct('contract_completed', lang),
            'contract': ContractSerializer(contract, context={'request': request}).data,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def fail_contract(request, contract_id):
    """Admin marks contract as failed."""
    lang = get_lang(request)
    
    try:
        if request.user.role != 'admin':
            return Response(
                {'error': ct('cannot_fail', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if contract.status in (Contract.STATUS_COMPLETED, Contract.STATUS_FAILED):
            return Response(
                {'error': ct('contract_already_done', lang)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get('reason', '')
        contract.status = Contract.STATUS_FAILED
        if reason:
            contract.notes = f"{contract.notes}\n[Failure reason]: {reason}".strip()
        contract.save()

        log_activity(contract, 'failed', request.user, {'reason': reason})

        extra = {'crop': contract.crop_name, 'id': contract.id, 'reason': reason or '—'}
        notify_contract_parties(
            contract,
            title_key='notif_contract_failed_title',
            body_key='notif_contract_failed_body',
            sender=request.user,
            extra_kwargs=extra,
        )

        return Response({
            'success': True,
            'message': ct('contract_failed', lang),
            'contract': ContractSerializer(contract, context={'request': request}).data,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ══════════════════════════════════════════════════════════════════════════════
# DELIVERY MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_delivery(request, contract_id):
    """
    Start delivery process.
    Can be initiated by admin, farmer, or assigned deliver person.
    """
    lang = get_lang(request)
    
    try:
        user = request.user
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        # Check permissions
        is_admin = user.role == 'admin'
        is_farmer = contract.farmer_id == user.id
        is_deliver = contract.deliver_id == user.id

        if not (is_admin or is_farmer or is_deliver):
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        # Check if delivery can be started
        if not contract.can_start_delivery:
            return Response(
                {'error': ct('cannot_start_delivery', lang)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        serializer = StartDeliverySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': ct('invalid_data', lang), 'details': serializer.errors},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        
        with transaction.atomic():
            contract.delivery_status = Contract.DELIVERY_IN_PROGRESS
            if data.get('delivery_notes'):
                contract.delivery_notes = data['delivery_notes']
            
            # Update deliver person if provided
            if data.get('deliver_person'):
                try:
                    new_deliver = CustomUser.objects.get(id=data['deliver_person'], is_active=True)
                    contract.deliver = new_deliver
                except CustomUser.DoesNotExist:
                    pass
            
            contract.save()
            
            log_activity(contract, 'delivery_started', user)

        extra = {'crop': contract.crop_name, 'id': contract.id}
        notify_contract_parties(
            contract,
            title_key='notif_delivery_started_title',
            body_key='notif_delivery_started_body',
            sender=user,
            extra_kwargs=extra,
        )

        return Response({
            'success': True,
            'message': ct('delivery_started', lang),
            'delivery_status': contract.delivery_status,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_delivery(request, contract_id):
    """
    Complete delivery and update stock quantity.
    Creates stock movement record if stock is linked.
    """
    lang = get_lang(request)
    
    try:
        user = request.user
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        # Check permissions
        is_admin = user.role == 'admin'
        is_farmer = contract.farmer_id == user.id
        is_deliver = contract.deliver_id == user.id

        if not (is_admin or is_farmer or is_deliver):
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        if contract.delivery_status != Contract.DELIVERY_IN_PROGRESS:
            return Response(
                {'error': ct('delivery_not_in_progress', lang)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        serializer = CompleteDeliverySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': ct('invalid_data', lang), 'details': serializer.errors},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        
        with transaction.atomic():
            # Create stock movement if stock is linked and not already created
            stock_movement = None
            if (data.get('create_stock_movement', True) and 
                contract.stock and 
                not contract.stock_movement_created):
                
                if StockMovement:
                    stock_movement = StockMovement.objects.create(
                        stock=contract.stock,
                        movement_type='out',
                        quantity=contract.quantity_kg,
                        notes=f"Contract #{contract.id} delivery completed",
                        created_by=user,
                        reference_number=f"CONTRACT-{contract.id}"
                    )
                    print(f"[complete_delivery] Created stock movement #{stock_movement.id}")
            
            contract.complete_delivery(stock_movement)
            
            log_activity(contract, 'delivery_completed', user, {
                'stock_movement_created': stock_movement is not None
            })

        extra = {'crop': contract.crop_name, 'id': contract.id}
        notify_contract_parties(
            contract,
            title_key='notif_delivery_completed_title',
            body_key='notif_delivery_completed_body',
            sender=user,
            extra_kwargs=extra,
        )

        return Response({
            'success': True,
            'message': ct('delivery_completed', lang),
            'delivery_status': contract.delivery_status,
            'stock_movement_created': contract.stock_movement_created,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def fail_delivery(request, contract_id):
    """Mark delivery as failed."""
    lang = get_lang(request)
    
    try:
        user = request.user
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        is_admin = user.role == 'admin'
        is_deliver = contract.deliver_id == user.id

        if not (is_admin or is_deliver):
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        reason = request.data.get('reason', '')
        
        with transaction.atomic():
            contract.delivery_status = Contract.DELIVERY_FAILED
            if reason:
                contract.delivery_notes = f"{contract.delivery_notes}\n[Failure]: {reason}".strip()
            contract.save()
            
            log_activity(contract, 'delivery_failed', user, {'reason': reason})

        extra = {'crop': contract.crop_name, 'id': contract.id, 'reason': reason or '—'}
        notify_contract_parties(
            contract,
            title_key='notif_delivery_failed_title',
            body_key='notif_delivery_failed_body',
            sender=user,
            extra_kwargs=extra,
        )

        return Response({
            'success': True,
            'message': ct('delivery_failed', lang),
            'delivery_status': contract.delivery_status,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_delivery_status(request, contract_id):
    """Get delivery details for a contract."""
    lang = get_lang(request)
    
    try:
        user = request.user
        try:
            contract = Contract.objects.select_related('deliver').get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if user.role != 'admin' and not (
            contract.buyer_id == user.id or
            contract.farmer_id == user.id or
            contract.deliver_id == user.id
        ):
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        deliver_data = None
        if contract.deliver:
            deliver_data = UserBriefSerializer(contract.deliver).data

        return Response({
            'contract_id': contract_id,
            'delivery_status': contract.delivery_status,
            'delivery_notes': contract.delivery_notes,
            'delivery_date': contract.delivery_date,
            'delivery_location': contract.delivery_location,
            'deliver': deliver_data,
            'stock_movement_created': contract.stock_movement_created,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ══════════════════════════════════════════════════════════════════════════════
# PAYMENT MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_payment(request, contract_id):
    """
    Add a payment record (buyer or admin).
    Admin can auto-confirm, buyer payments start as pending.
    """
    lang = get_lang(request)
    
    try:
        user = request.user
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        # Check if payments are allowed
        if not contract.can_proceed_to_payment:
            return Response(
                {'error': ct('cannot_make_payment', lang)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        is_buyer = contract.buyer_id == user.id
        is_admin = user.role == 'admin'

        if not is_buyer and not is_admin:
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        serializer = AddPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': ct('invalid_data', lang), 'details': serializer.errors},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        amount = data['amount']

        # Check if payment exceeds balance
        if amount > contract.balance_due:
            return Response(
                {
                    'error': ct('payment_exceeds_balance', lang),
                    'balance_due': str(contract.balance_due),
                    'requested_amount': str(amount),
                },
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            payment = PaymentRecord.objects.create(
                contract=contract,
                recorded_by=user,
                amount=amount,
                payment_method=data['payment_method'],
                reference_number=data.get('reference_number', ''),
                notes=data.get('notes', ''),
                paid_at=data.get('paid_at', now()),
                status=PaymentRecord.STATUS_CONFIRMED if is_admin else PaymentRecord.STATUS_PENDING,
            )

            if is_admin:
                payment.confirmed_by = user
                payment.confirmed_at = now()
                payment.save()
                contract.update_payment(amount)
            
            log_activity(
                contract,
                'payment_added',
                user,
                {
                    'amount': str(amount),
                    'payment_id': payment.id,
                    'auto_confirmed': is_admin
                }
            )

        # Prepare notification data
        extra = {
            'amount': amount,
            'crop': contract.crop_name,
            'id': contract.id,
            'balance': contract.balance_due,
        }

        # Notify farmer about payment
        farmer_lang = get_user_lang(contract.farmer)
        notify_user(
            receiver=contract.farmer,
            title=ct('notif_payment_submitted_title', farmer_lang),
            description=ct('notif_payment_submitted_body', farmer_lang, **extra),
            sender=user,
        )

        # If admin auto-confirmed, also notify buyer
        if is_admin:
            buyer_lang = get_user_lang(contract.buyer)
            notify_user(
                receiver=contract.buyer,
                title=ct('notif_payment_confirmed_title', buyer_lang),
                description=ct('notif_payment_confirmed_body', buyer_lang, **extra),
                sender=user,
            )

            if contract.is_fully_paid:
                notify_contract_parties(
                    contract,
                    title_key='notif_contract_fully_paid_title',
                    body_key='notif_contract_fully_paid_body',
                    sender=None,
                    extra_kwargs={'crop': contract.crop_name, 'id': contract.id},
                )

        return Response({
            'success': True,
            'message': ct('payment_added', lang),
            'payment': PaymentRecordSerializer(payment).data,
            'balance_due': str(contract.balance_due),
            'payment_status': contract.payment_status,
        }, status=http_status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request, payment_id):
    """Admin confirms a pending payment."""
    lang = get_lang(request)
    
    try:
        if request.user.role != 'admin':
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        try:
            payment = PaymentRecord.objects.select_related('contract').get(id=payment_id)
        except PaymentRecord.DoesNotExist:
            return Response(
                {'error': ct('payment_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        success, message = payment.confirm(request.user)
        if not success:
            return Response(
                {'error': message},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        contract = payment.contract
        log_activity(
            contract,
            'payment_confirmed',
            request.user,
            {'payment_id': payment.id, 'amount': str(payment.amount)}
        )

        extra = {
            'amount': payment.amount,
            'crop': contract.crop_name,
            'id': contract.id,
            'balance': contract.balance_due,
        }

        # Notify buyer and farmer
        buyer_lang = get_user_lang(contract.buyer)
        farmer_lang = get_user_lang(contract.farmer)

        notify_user(
            receiver=contract.buyer,
            title=ct('notif_payment_confirmed_title', buyer_lang),
            description=ct('notif_payment_confirmed_body', buyer_lang, **extra),
            sender=request.user,
        )
        
        notify_user(
            receiver=contract.farmer,
            title=ct('notif_payment_confirmed_title', farmer_lang),
            description=ct('notif_payment_confirmed_body', farmer_lang, **extra),
            sender=request.user,
        )

        if contract.is_fully_paid:
            notify_contract_parties(
                contract,
                title_key='notif_contract_fully_paid_title',
                body_key='notif_contract_fully_paid_body',
                sender=None,
                extra_kwargs={'crop': contract.crop_name, 'id': contract.id},
            )

        return Response({
            'success': True,
            'message': ct('payment_confirmed', lang),
            'payment': PaymentRecordSerializer(payment).data,
            'balance_due': str(contract.balance_due),
            'payment_status': contract.payment_status,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_payment(request, payment_id):
    """Admin rejects a pending payment."""
    lang = get_lang(request)
    
    try:
        if request.user.role != 'admin':
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        try:
            payment = PaymentRecord.objects.select_related('contract').get(id=payment_id)
        except PaymentRecord.DoesNotExist:
            return Response(
                {'error': ct('payment_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        reason = request.data.get('reason', '')
        success, message = payment.reject(request.user, reason)
        if not success:
            return Response(
                {'error': message},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        contract = payment.contract
        log_activity(
            contract,
            'payment_rejected',
            request.user,
            {'payment_id': payment.id, 'amount': str(payment.amount), 'reason': reason}
        )

        extra = {
            'amount': payment.amount,
            'crop': contract.crop_name,
            'id': contract.id,
            'reason': reason or '—',
        }

        buyer_lang = get_user_lang(contract.buyer)
        notify_user(
            receiver=contract.buyer,
            title=ct('notif_payment_rejected_title', buyer_lang),
            description=ct('notif_payment_rejected_body', buyer_lang, **extra),
            sender=request.user,
        )

        return Response({
            'success': True,
            'message': ct('payment_rejected', lang),
            'payment': PaymentRecordSerializer(payment).data,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_contract_payments(request, contract_id):
    """Get all payments for a contract."""
    lang = get_lang(request)
    
    try:
        user = request.user
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if user.role != 'admin' and not (
            contract.buyer_id == user.id or contract.farmer_id == user.id
        ):
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        payments = PaymentRecord.objects.filter(contract=contract).select_related(
            'recorded_by', 'confirmed_by'
        )

        return Response({
            'contract_id': contract_id,
            'total_amount': str(contract.total_amount),
            'amount_paid': str(contract.amount_paid),
            'balance_due': str(contract.balance_due),
            'payment_status': contract.payment_status,
            'is_fully_paid': contract.is_fully_paid,
            'payments': PaymentRecordSerializer(payments, many=True).data,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_contract_activities(request, contract_id):
    """Get activity log for a contract."""
    lang = get_lang(request)
    
    try:
        user = request.user
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if user.role != 'admin' and not (
            contract.buyer_id == user.id or contract.farmer_id == user.id
        ):
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        activities = ContractActivity.objects.filter(contract=contract).select_related('performed_by')
        
        return Response({
            'contract_id': contract_id,
            'activities': ContractActivitySerializer(activities, many=True).data,
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )