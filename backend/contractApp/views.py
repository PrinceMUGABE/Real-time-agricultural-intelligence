from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as http_status
from django.db import transaction
from django.db.models import Q, Sum
from django.utils.timezone import now

from .models import Contract, PaymentRecord
from .serializers import (
    ContractSerializer, CreateContractSerializer,
    UpdateContractSerializer, AddPaymentSerializer,
    PaymentRecordSerializer,
)
from .translations import ct

try:
    from stockApp.models import CropListing
except ImportError:
    CropListing = None

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


def handle_exception(e, context='', request=None):
    print(f"[contactApp ERROR] {context}: {type(e).__name__}: {e}")
    return Response(
        {'error': str(e), 'context': context},
        status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def notify_contract_parties(contract, title_key, body_key, sender=None, exclude_user=None, extra_kwargs=None):
    """
    Send a notification to all parties of a contract (buyer, farmer,
    and optionally the deliver person), each in their own language.

    Args:
        contract:     Contract instance.
        title_key:    Translation key for the notification title.
        body_key:     Translation key for the notification body.
        sender:       The user triggering the notification (optional).
        exclude_user: A user to skip (e.g. the actor who triggered the event).
        extra_kwargs: Extra format kwargs passed to ct() for body interpolation.
    """
    extra_kwargs = extra_kwargs or {}
    parties = []

    if contract.buyer:
        parties.append(contract.buyer)
    if contract.farmer:
        parties.append(contract.farmer)
    if contract.deliver:
        parties.append(contract.deliver)

    seen = set()
    for user in parties:
        if user.id in seen:
            continue
        seen.add(user.id)

        if exclude_user and user.id == exclude_user.id:
            continue

        lang  = get_user_lang(user)
        title = ct(title_key, lang)
        body  = ct(body_key,  lang, **extra_kwargs)

        try:
            notify_user(receiver=user, title=title, description=body, sender=sender)
            print(f"[notify_contract_parties] Notified user #{user.id} ({user.full_name}) — {title_key}")
        except Exception as e:
            print(f"[notify_contract_parties] Failed to notify user #{user.id}: {e}")


# ══════════════════════════════════════════════════════════════════════════════
# CONTRACT CRUD
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_contract(request):
    """Any authenticated user can initiate a contract."""
    lang = get_lang(request)
    print(f"[create_contract] User={request.user.id} Data={request.data}")
    try:
        serializer = CreateContractSerializer(data=request.data)
        if not serializer.is_valid():
            print(f"[create_contract] Validation errors: {serializer.errors}")
            return Response(
                {'error': ct('invalid_data', lang), 'details': serializer.errors},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        data   = serializer.validated_data
        buyer  = data['buyer']
        farmer = data['farmer']

        stock_obj = None
        if data.get('stock') and CropListing:
            try:
                stock_obj = CropListing.objects.get(id=data['stock'])
            except CropListing.DoesNotExist:
                pass

        deliver_obj = None
        if data.get('deliver'):
            from userApp.models import CustomUser
            try:
                deliver_obj = CustomUser.objects.get(id=data['deliver'], is_active=True)
            except CustomUser.DoesNotExist:
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
                delivery_date=data.get('delivery_date'),
                notes=data.get('notes', ''),
                created_by=request.user,
            )

        print(f"[create_contract] Created contract #{contract.id}")

        # ── Notify buyer, farmer (and deliver if set) ─────────────────────
        extra = {
            'crop':     contract.crop_name,
            'quantity': contract.quantity_kg,
            'price':    contract.price_per_kg,
            'total':    contract.total_amount,
            'id':       contract.id,
        }
        notify_contract_parties(
            contract,
            title_key='notif_contract_created_title',
            body_key='notif_contract_created_body',
            sender=request.user,
            extra_kwargs=extra,
        )

        return Response(
            {
                'success':  True,
                'message':  ct('contract_created', lang),
                'contract': ContractSerializer(contract, context={'request': request}).data,
            },
            status=http_status.HTTP_201_CREATED,
        )
    except Exception as e:
        return handle_exception(e, 'create_contract', request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_contract(request, contract_id):
    """Get a single contract by ID. Admins see all; others only their own."""
    lang = get_lang(request)
    print(f"[get_contract] User={request.user.id} ContractID={contract_id}")
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
            contract.buyer_id   == user.id or
            contract.farmer_id  == user.id or
            contract.deliver_id == user.id
        ):
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        return Response(ContractSerializer(contract, context={'request': request}).data)
    except Exception as e:
        return handle_exception(e, 'get_contract', request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_contracts(request):
    """Admin-only: list all contracts with optional filters."""
    lang = get_lang(request)
    print(f"[get_all_contracts] User={request.user.id}")
    try:
        if request.user.role != 'admin':
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        qs = Contract.objects.select_related(
            'buyer', 'farmer', 'deliver', 'stock', 'created_by'
        ).prefetch_related('payment_records')

        status_filter   = request.query_params.get('status')
        payment_filter  = request.query_params.get('payment_status')
        delivery_filter = request.query_params.get('delivery_status')
        search          = request.query_params.get('search', '').strip()

        if status_filter:   qs = qs.filter(status=status_filter)
        if payment_filter:  qs = qs.filter(payment_status=payment_filter)
        if delivery_filter: qs = qs.filter(delivery_status=delivery_filter)
        if search:
            qs = qs.filter(
                Q(crop_name__icontains=search) |
                Q(buyer__full_name__icontains=search) |
                Q(farmer__full_name__icontains=search)
            )

        page      = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        total     = qs.count()
        contracts = qs[(page - 1) * page_size: page * page_size]

        return Response({
            'total':       total,
            'page':        page,
            'page_size':   page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'contracts':   ContractSerializer(contracts, many=True, context={'request': request}).data,
            'stats': {
                'total':     total,
                'pending':   Contract.objects.filter(status=Contract.STATUS_PENDING).count(),
                'accepted':  Contract.objects.filter(status=Contract.STATUS_ACCEPTED).count(),
                'completed': Contract.objects.filter(status=Contract.STATUS_COMPLETED).count(),
                'failed':    Contract.objects.filter(status=Contract.STATUS_FAILED).count(),
            },
        })
    except Exception as e:
        return handle_exception(e, 'get_all_contracts', request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_contracts(request):
    """Return all contracts where the logged-in user is buyer, farmer or deliver."""
    lang = get_lang(request)
    print(f"[get_my_contracts] User={request.user.id}")
    try:
        user = request.user
        qs = Contract.objects.filter(
            Q(buyer=user) | Q(farmer=user) | Q(deliver=user)
        ).select_related(
            'buyer', 'farmer', 'deliver', 'stock', 'created_by'
        ).prefetch_related('payment_records')

        role_filter = request.query_params.get('role')
        if role_filter == 'buyer':   qs = qs.filter(buyer=user)
        elif role_filter == 'farmer': qs = qs.filter(farmer=user)

        status_filter = request.query_params.get('status')
        if status_filter: qs = qs.filter(status=status_filter)

        return Response({
            'contracts': ContractSerializer(qs, many=True, context={'request': request}).data,
            'total':     qs.count(),
        })
    except Exception as e:
        return handle_exception(e, 'get_my_contracts', request)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_contract(request, contract_id):
    """Update editable fields. Admins can update any; parties only while pending."""
    lang = get_lang(request)
    print(f"[update_contract] User={request.user.id} ContractID={contract_id} Data={request.data}")
    try:
        user = request.user
        try:
            contract = Contract.objects.get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        is_party = contract.buyer_id == user.id or contract.farmer_id == user.id
        is_admin = user.role == 'admin'

        if not is_admin and not is_party:
            return Response(
                {'error': ct('cannot_update', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        if not is_admin and contract.status != Contract.STATUS_PENDING:
            return Response(
                {'error': ct('contract_already_done', lang)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        serializer = UpdateContractSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            print(f"[update_contract] Validation errors: {serializer.errors}")
            return Response(
                {'error': ct('invalid_data', lang), 'details': serializer.errors},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        with transaction.atomic():
            if 'crop_name'      in data: contract.crop_name      = data['crop_name']
            if 'price_per_kg'   in data: contract.price_per_kg   = data['price_per_kg']
            if 'quantity_kg'    in data: contract.quantity_kg     = data['quantity_kg']
            if 'notes'          in data: contract.notes           = data['notes']
            if 'delivery_date'  in data: contract.delivery_date   = data['delivery_date']
            if 'delivery_notes' in data: contract.delivery_notes  = data['delivery_notes']

            if 'deliver' in data:
                if data['deliver'] is None:
                    contract.deliver = None
                else:
                    from userApp.models import CustomUser
                    try:
                        contract.deliver = CustomUser.objects.get(id=data['deliver'], is_active=True)
                    except CustomUser.DoesNotExist:
                        pass

            contract.save()

        print(f"[update_contract] Updated contract #{contract.id}")

        # ── Notify the other party about the update ───────────────────────
        extra = {'crop': contract.crop_name, 'id': contract.id}
        notify_contract_parties(
            contract,
            title_key='notif_contract_updated_title',
            body_key='notif_contract_updated_body',
            sender=user,
            exclude_user=user,  # don't notify the person who made the change
            extra_kwargs=extra,
        )

        # If a deliver person was assigned, notify them specifically
        if contract.deliver and data.get('deliver'):
            deliver_lang = get_user_lang(contract.deliver)
            try:
                notify_user(
                    receiver=contract.deliver,
                    title=ct('notif_deliver_assigned_title', deliver_lang),
                    description=ct('notif_deliver_assigned_body', deliver_lang,
                                   crop=contract.crop_name, id=contract.id),
                    sender=user,
                )
                print(f"[update_contract] Notified deliver person #{contract.deliver.id}")
            except Exception as e:
                print(f"[update_contract] Failed to notify deliver: {e}")

        return Response({
            'success':  True,
            'message':  ct('contract_updated', lang),
            'contract': ContractSerializer(contract, context={'request': request}).data,
        })
    except Exception as e:
        return handle_exception(e, 'update_contract', request)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_contract(request, contract_id):
    """Delete a contract. Admins any; parties only their own pending ones."""
    lang = get_lang(request)
    print(f"[delete_contract] User={request.user.id} ContractID={contract_id}")
    try:
        user = request.user
        try:
            contract = Contract.objects.select_related('buyer', 'farmer', 'deliver').get(id=contract_id)
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

        # Notify before deleting so we still have party references
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
        print(f"[delete_contract] Deleted contract #{contract_id}")
        return Response({'success': True, 'message': ct('contract_deleted', lang)})
    except Exception as e:
        return handle_exception(e, 'delete_contract', request)


# ══════════════════════════════════════════════════════════════════════════════
# STATUS MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_contract(request, contract_id):
    """Farmer or buyer accepts the contract on their behalf."""
    lang = get_lang(request)
    print(f"[accept_contract] User={request.user.id} ContractID={contract_id}")
    try:
        user = request.user
        try:
            contract = Contract.objects.select_related('buyer', 'farmer', 'deliver').get(id=contract_id)
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
            if contract.farmer_id == user.id:
                if contract.farmer_status == Contract.STATUS_ACCEPTED:
                    return Response(
                        {'error': ct('already_accepted', lang)},
                        status=http_status.HTTP_400_BAD_REQUEST,
                    )
                contract.farmer_status = Contract.STATUS_ACCEPTED
                msg           = ct('farmer_accepted', lang)
                title_key     = 'notif_farmer_accepted_title'
                body_key      = 'notif_farmer_accepted_body'

            elif contract.buyer_id == user.id:
                if contract.buyer_status == Contract.STATUS_ACCEPTED:
                    return Response(
                        {'error': ct('already_accepted', lang)},
                        status=http_status.HTTP_400_BAD_REQUEST,
                    )
                contract.buyer_status = Contract.STATUS_ACCEPTED
                msg           = ct('buyer_accepted', lang)
                title_key     = 'notif_buyer_accepted_title'
                body_key      = 'notif_buyer_accepted_body'

            elif user.role == 'admin':
                contract.farmer_status = Contract.STATUS_ACCEPTED
                contract.buyer_status  = Contract.STATUS_ACCEPTED
                msg           = ct('contract_accepted', lang)
                title_key     = 'notif_admin_accepted_title'
                body_key      = 'notif_admin_accepted_body'

            else:
                return Response(
                    {'error': ct('cannot_accept', lang)},
                    status=http_status.HTTP_403_FORBIDDEN,
                )

            contract.save()

        print(f"[accept_contract] Contract #{contract_id} accepted by user #{user.id}")

        extra = {'crop': contract.crop_name, 'id': contract.id}

        # Notify the other party
        notify_contract_parties(
            contract,
            title_key=title_key,
            body_key=body_key,
            sender=user,
            exclude_user=user,
            extra_kwargs=extra,
        )

        # If both parties have now accepted, send a "contract is now active" notification to everyone
        if contract.both_parties_accepted:
            notify_contract_parties(
                contract,
                title_key='notif_contract_both_accepted_title',
                body_key='notif_contract_both_accepted_body',
                sender=None,
                extra_kwargs=extra,
            )

        return Response({
            'success':  True,
            'message':  msg,
            'contract': ContractSerializer(contract, context={'request': request}).data,
        })
    except Exception as e:
        return handle_exception(e, 'accept_contract', request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_contract(request, contract_id):
    """Farmer or buyer rejects the contract on their behalf."""
    lang = get_lang(request)
    print(f"[reject_contract] User={request.user.id} ContractID={contract_id}")
    try:
        user = request.user
        try:
            contract = Contract.objects.select_related('buyer', 'farmer', 'deliver').get(id=contract_id)
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
            if contract.farmer_id == user.id:
                if contract.farmer_status == Contract.STATUS_REJECTED:
                    return Response(
                        {'error': ct('already_rejected', lang)},
                        status=http_status.HTTP_400_BAD_REQUEST,
                    )
                contract.farmer_status = Contract.STATUS_REJECTED
                contract.status        = Contract.STATUS_REJECTED
                msg       = ct('farmer_rejected', lang)
                title_key = 'notif_farmer_rejected_title'
                body_key  = 'notif_farmer_rejected_body'

            elif contract.buyer_id == user.id:
                if contract.buyer_status == Contract.STATUS_REJECTED:
                    return Response(
                        {'error': ct('already_rejected', lang)},
                        status=http_status.HTTP_400_BAD_REQUEST,
                    )
                contract.buyer_status = Contract.STATUS_REJECTED
                contract.status       = Contract.STATUS_REJECTED
                msg       = ct('buyer_rejected', lang)
                title_key = 'notif_buyer_rejected_title'
                body_key  = 'notif_buyer_rejected_body'

            elif user.role == 'admin':
                contract.status = Contract.STATUS_REJECTED
                msg       = ct('contract_rejected', lang)
                title_key = 'notif_admin_rejected_title'
                body_key  = 'notif_admin_rejected_body'

            else:
                return Response(
                    {'error': ct('cannot_reject', lang)},
                    status=http_status.HTTP_403_FORBIDDEN,
                )

            contract.save()

        print(f"[reject_contract] Contract #{contract_id} rejected by user #{user.id}")

        extra = {'crop': contract.crop_name, 'id': contract.id}
        notify_contract_parties(
            contract,
            title_key=title_key,
            body_key=body_key,
            sender=user,
            exclude_user=user,
            extra_kwargs=extra,
        )

        return Response({
            'success':  True,
            'message':  msg,
            'contract': ContractSerializer(contract, context={'request': request}).data,
        })
    except Exception as e:
        return handle_exception(e, 'reject_contract', request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_contract(request, contract_id):
    """Admin marks the contract as completed."""
    lang = get_lang(request)
    print(f"[complete_contract] User={request.user.id} ContractID={contract_id}")
    try:
        if request.user.role != 'admin':
            return Response(
                {'error': ct('cannot_complete', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        try:
            contract = Contract.objects.select_related('buyer', 'farmer', 'deliver').get(id=contract_id)
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

        print(f"[complete_contract] Contract #{contract_id} completed.")

        extra = {'crop': contract.crop_name, 'id': contract.id}
        notify_contract_parties(
            contract,
            title_key='notif_contract_completed_title',
            body_key='notif_contract_completed_body',
            sender=request.user,
            extra_kwargs=extra,
        )

        return Response({
            'success':  True,
            'message':  ct('contract_completed', lang),
            'contract': ContractSerializer(contract, context={'request': request}).data,
        })
    except Exception as e:
        return handle_exception(e, 'complete_contract', request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def fail_contract(request, contract_id):
    """Admin marks the contract as failed."""
    lang = get_lang(request)
    print(f"[fail_contract] User={request.user.id} ContractID={contract_id}")
    try:
        if request.user.role != 'admin':
            return Response(
                {'error': ct('cannot_fail', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        try:
            contract = Contract.objects.select_related('buyer', 'farmer', 'deliver').get(id=contract_id)
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

        print(f"[fail_contract] Contract #{contract_id} marked failed.")

        extra = {'crop': contract.crop_name, 'id': contract.id, 'reason': reason or '—'}
        notify_contract_parties(
            contract,
            title_key='notif_contract_failed_title',
            body_key='notif_contract_failed_body',
            sender=request.user,
            extra_kwargs=extra,
        )

        return Response({
            'success':  True,
            'message':  ct('contract_failed', lang),
            'contract': ContractSerializer(contract, context={'request': request}).data,
        })
    except Exception as e:
        return handle_exception(e, 'fail_contract', request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_delivery_status(request, contract_id):
    """Admin or deliver person updates the delivery status."""
    lang = get_lang(request)
    print(f"[update_delivery_status] User={request.user.id} ContractID={contract_id} Data={request.data}")
    try:
        user = request.user
        try:
            contract = Contract.objects.select_related('buyer', 'farmer', 'deliver').get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        is_admin   = user.role == 'admin'
        is_deliver = contract.deliver_id == user.id

        if not is_admin and not is_deliver:
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        new_status    = request.data.get('delivery_status')
        notes         = request.data.get('delivery_notes', '')
        valid_statuses = [s[0] for s in Contract.DELIVERY_STATUS_CHOICES]

        if new_status not in valid_statuses:
            return Response(
                {'error': ct('invalid_data', lang), 'details': f"delivery_status must be one of {valid_statuses}"},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        contract.delivery_status = new_status
        if notes:
            contract.delivery_notes = notes
        contract.save()

        print(f"[update_delivery_status] Contract #{contract_id} delivery → {new_status}")

        # Choose notification keys based on new delivery status
        if new_status == Contract.DELIVERY_COMPLETED:
            title_key = 'notif_delivery_completed_title'
            body_key  = 'notif_delivery_completed_body'
        elif new_status == Contract.DELIVERY_FAILED:
            title_key = 'notif_delivery_failed_title'
            body_key  = 'notif_delivery_failed_body'
        else:
            title_key = 'notif_delivery_pending_title'
            body_key  = 'notif_delivery_pending_body'

        extra = {'crop': contract.crop_name, 'id': contract.id}
        notify_contract_parties(
            contract,
            title_key=title_key,
            body_key=body_key,
            sender=user,
            exclude_user=user,
            extra_kwargs=extra,
        )

        return Response({
            'success':         True,
            'message':         ct('delivery_updated', lang),
            'delivery_status': contract.delivery_status,
            'delivery_notes':  contract.delivery_notes,
        })
    except Exception as e:
        return handle_exception(e, 'update_delivery_status', request)


# ══════════════════════════════════════════════════════════════════════════════
# PAYMENT
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_payment(request, contract_id):
    """Buyer or admin records a payment instalment."""
    lang = get_lang(request)
    print(f"[add_payment] User={request.user.id} ContractID={contract_id} Data={request.data}")
    try:
        user = request.user
        try:
            contract = Contract.objects.select_related('buyer', 'farmer', 'deliver').get(id=contract_id)
        except Contract.DoesNotExist:
            return Response(
                {'error': ct('contract_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if contract.status not in (Contract.STATUS_ACCEPTED, Contract.STATUS_COMPLETED):
            return Response(
                {'error': ct('contract_not_accepted', lang)},
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
            print(f"[add_payment] Validation errors: {serializer.errors}")
            return Response(
                {'error': ct('invalid_data', lang), 'details': serializer.errors},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        data   = serializer.validated_data
        amount = data['amount']

        confirmed_total = PaymentRecord.objects.filter(
            contract=contract, status=PaymentRecord.STATUS_CONFIRMED
        ).aggregate(total=Sum('amount'))['total'] or 0

        if confirmed_total + amount > contract.total_amount:
            return Response(
                {
                    'error':          ct('payment_exceeds_total', lang),
                    'total_amount':   str(contract.total_amount),
                    'confirmed_paid': str(confirmed_total),
                    'balance_due':    str(contract.total_amount - confirmed_total),
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
                status=PaymentRecord.STATUS_PENDING,
            )

            if is_admin:
                payment.status       = PaymentRecord.STATUS_CONFIRMED
                payment.confirmed_by = user
                payment.confirmed_at = now()
                payment.save()
                _update_contract_payment_totals(contract)

            if contract.payment_status == Contract.PAYMENT_PENDING:
                contract.payment_status = Contract.PAYMENT_STARTED
                contract.save(update_fields=['payment_status'])

        print(f"[add_payment] Payment #{payment.id} recorded for contract #{contract_id}")

        extra = {
            'amount':  amount,
            'crop':    contract.crop_name,
            'id':      contract.id,
            'balance': contract.balance_due,
        }

        # Notify farmer that payment was submitted
        farmer_lang = get_user_lang(contract.farmer)
        try:
            notify_user(
                receiver=contract.farmer,
                title=ct('notif_payment_submitted_title', farmer_lang),
                description=ct('notif_payment_submitted_body', farmer_lang, **extra),
                sender=user,
            )
            print(f"[add_payment] Notified farmer #{contract.farmer_id} of payment submission")
        except Exception as e:
            print(f"[add_payment] Failed to notify farmer: {e}")

        # If admin auto-confirmed, also notify buyer about confirmation
        if is_admin:
            buyer_lang = get_user_lang(contract.buyer)
            try:
                notify_user(
                    receiver=contract.buyer,
                    title=ct('notif_payment_confirmed_title', buyer_lang),
                    description=ct('notif_payment_confirmed_body', buyer_lang, **extra),
                    sender=user,
                )
                print(f"[add_payment] Notified buyer #{contract.buyer_id} of auto-confirmation")
            except Exception as e:
                print(f"[add_payment] Failed to notify buyer: {e}")

            # Notify if now fully paid
            if contract.is_fully_paid:
                notify_contract_parties(
                    contract,
                    title_key='notif_contract_fully_paid_title',
                    body_key='notif_contract_fully_paid_body',
                    sender=None,
                    extra_kwargs={'crop': contract.crop_name, 'id': contract.id},
                )

        return Response(
            {
                'success':                True,
                'message':                ct('payment_added', lang),
                'payment':                PaymentRecordSerializer(payment).data,
                'contract_payment_status': contract.payment_status,
            },
            status=http_status.HTTP_201_CREATED,
        )
    except Exception as e:
        return handle_exception(e, 'add_payment', request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request, payment_id):
    """Admin confirms a pending payment record."""
    lang = get_lang(request)
    print(f"[confirm_payment] User={request.user.id} PaymentID={payment_id}")
    try:
        if request.user.role != 'admin':
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        try:
            payment = PaymentRecord.objects.select_related(
                'contract__buyer', 'contract__farmer', 'contract__deliver'
            ).get(id=payment_id)
        except PaymentRecord.DoesNotExist:
            return Response(
                {'error': ct('payment_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if payment.status != PaymentRecord.STATUS_PENDING:
            return Response(
                {'error': ct('payment_already_resolved', lang)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            payment.status       = PaymentRecord.STATUS_CONFIRMED
            payment.confirmed_by = request.user
            payment.confirmed_at = now()
            payment.save()

            contract = payment.contract
            _update_contract_payment_totals(contract)

        print(f"[confirm_payment] Payment #{payment_id} confirmed.")

        extra = {
            'amount':  payment.amount,
            'crop':    contract.crop_name,
            'id':      contract.id,
            'balance': contract.balance_due,
        }

        # Notify buyer that their payment was confirmed
        buyer_lang = get_user_lang(contract.buyer)
        try:
            notify_user(
                receiver=contract.buyer,
                title=ct('notif_payment_confirmed_title', buyer_lang),
                description=ct('notif_payment_confirmed_body', buyer_lang, **extra),
                sender=request.user,
            )
            print(f"[confirm_payment] Notified buyer #{contract.buyer_id}")
        except Exception as e:
            print(f"[confirm_payment] Failed to notify buyer: {e}")

        # Notify farmer that payment was confirmed
        farmer_lang = get_user_lang(contract.farmer)
        try:
            notify_user(
                receiver=contract.farmer,
                title=ct('notif_payment_confirmed_title', farmer_lang),
                description=ct('notif_payment_confirmed_body', farmer_lang, **extra),
                sender=request.user,
            )
            print(f"[confirm_payment] Notified farmer #{contract.farmer_id}")
        except Exception as e:
            print(f"[confirm_payment] Failed to notify farmer: {e}")

        # Notify everyone if now fully paid
        if contract.is_fully_paid:
            notify_contract_parties(
                contract,
                title_key='notif_contract_fully_paid_title',
                body_key='notif_contract_fully_paid_body',
                sender=None,
                extra_kwargs={'crop': contract.crop_name, 'id': contract.id},
            )

        return Response({
            'success':         True,
            'message':         ct('payment_confirmed', lang),
            'payment':         PaymentRecordSerializer(payment).data,
            'amount_paid':     str(contract.amount_paid),
            'balance_due':     str(contract.balance_due),
            'payment_status':  contract.payment_status,
        })
    except Exception as e:
        return handle_exception(e, 'confirm_payment', request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_payment(request, payment_id):
    """Admin rejects a pending payment record."""
    lang = get_lang(request)
    print(f"[reject_payment] User={request.user.id} PaymentID={payment_id}")
    try:
        if request.user.role != 'admin':
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        try:
            payment = PaymentRecord.objects.select_related(
                'contract__buyer', 'contract__farmer', 'contract__deliver'
            ).get(id=payment_id)
        except PaymentRecord.DoesNotExist:
            return Response(
                {'error': ct('payment_not_found', lang)},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if payment.status != PaymentRecord.STATUS_PENDING:
            return Response(
                {'error': ct('payment_already_resolved', lang)},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get('notes', '')
        payment.status = PaymentRecord.STATUS_REJECTED
        if notes:
            payment.notes = f"{payment.notes}\n[Rejection reason]: {notes}".strip()
        payment.save()

        print(f"[reject_payment] Payment #{payment_id} rejected.")

        contract   = payment.contract
        extra      = {
            'amount': payment.amount,
            'crop':   contract.crop_name,
            'id':     contract.id,
            'reason': notes or '—',
        }

        # Notify buyer that their payment was rejected
        buyer_lang = get_user_lang(contract.buyer)
        try:
            notify_user(
                receiver=contract.buyer,
                title=ct('notif_payment_rejected_title', buyer_lang),
                description=ct('notif_payment_rejected_body', buyer_lang, **extra),
                sender=request.user,
            )
            print(f"[reject_payment] Notified buyer #{contract.buyer_id}")
        except Exception as e:
            print(f"[reject_payment] Failed to notify buyer: {e}")

        return Response({
            'success': True,
            'message': ct('payment_rejected', lang),
            'payment': PaymentRecordSerializer(payment).data,
        })
    except Exception as e:
        return handle_exception(e, 'reject_payment', request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_contract_payments(request, contract_id):
    """Get all payment records for a contract."""
    lang = get_lang(request)
    print(f"[get_contract_payments] User={request.user.id} ContractID={contract_id}")
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
        confirmed_total = payments.filter(
            status=PaymentRecord.STATUS_CONFIRMED
        ).aggregate(total=Sum('amount'))['total'] or 0

        return Response({
            'contract_id':    contract_id,
            'total_amount':   str(contract.total_amount),
            'amount_paid':    str(confirmed_total),
            'balance_due':    str(contract.total_amount - confirmed_total),
            'payment_status': contract.payment_status,
            'is_fully_paid':  contract.is_fully_paid,
            'payments':       PaymentRecordSerializer(payments, many=True).data,
        })
    except Exception as e:
        return handle_exception(e, 'get_contract_payments', request)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_delivery_status(request, contract_id):
    """Get delivery details for a contract."""
    lang = get_lang(request)
    print(f"[get_delivery_status] User={request.user.id} ContractID={contract_id}")
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
            contract.buyer_id   == user.id or
            contract.farmer_id  == user.id or
            contract.deliver_id == user.id
        ):
            return Response(
                {'error': ct('no_permission', lang)},
                status=http_status.HTTP_403_FORBIDDEN,
            )

        deliver_data = None
        if contract.deliver:
            from .serializers import UserBriefSerializer
            deliver_data = UserBriefSerializer(contract.deliver).data

        return Response({
            'contract_id':     contract_id,
            'delivery_status': contract.delivery_status,
            'delivery_notes':  contract.delivery_notes,
            'delivery_date':   contract.delivery_date,
            'deliver':         deliver_data,
        })
    except Exception as e:
        return handle_exception(e, 'get_delivery_status', request)


# ── Internal helper ───────────────────────────────────────────────────────────

def _update_contract_payment_totals(contract):
    """Recalculate amount_paid and payment_status from confirmed records."""
    confirmed_total = PaymentRecord.objects.filter(
        contract=contract,
        status=PaymentRecord.STATUS_CONFIRMED,
    ).aggregate(total=Sum('amount'))['total'] or 0

    contract.amount_paid = confirmed_total

    if confirmed_total >= contract.total_amount:
        contract.payment_status = Contract.PAYMENT_COMPLETED
    elif confirmed_total > 0:
        contract.payment_status = Contract.PAYMENT_STARTED
    else:
        contract.payment_status = Contract.PAYMENT_PENDING

    contract.save(update_fields=['amount_paid', 'payment_status'])
    print(f"[_update_contract_payment_totals] Contract #{contract.id} "
          f"amount_paid={confirmed_total} status={contract.payment_status}")