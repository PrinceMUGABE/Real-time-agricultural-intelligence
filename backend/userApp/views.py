import logging

from django.contrib.auth.hashers import check_password, make_password
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.decorators import (
    api_view, authentication_classes, permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from .models import CustomUser, OTPSession
from .serializers import ContactUsSerializer, UserSerializer
from . import user_utils
from .translations import t, SUPPORTED_LANGUAGES

# ── Notification hooks (imported lazily to avoid circular imports) ────────────
from notificationApp import notification_utils as notif

logger = logging.getLogger(__name__)


# ── helpers ──────────────────────────────────────────────────────────────────

def _token_pair(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


def _user_payload(user, tokens=None):
    data = {
        "id":           user.id,
        "full_name":    user.full_name,
        "phone_number": user.phone_number,
        "email":        user.email,
        "role":         user.role,
        "location":     user.location,
        "language":     user.language,
        "status":       "Active" if user.status else "Non-Active",
        "created_at":   user.created_at.strftime('%Y-%m-%d %H:%M:%S'),
    }
    if tokens:
        data["token"] = tokens
    return data


def _admin_required(request):
    """Returns a 403 Response if user is not admin, else None."""
    if request.user.role != 'admin':
        return Response({"error": t("admin_required", request.lang)}, status=403)
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# LANGUAGE PREFERENCE
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def set_language(request):
    """
    Let an authenticated user save their preferred language.
    Body: { language: "en" | "fr" | "sw" | "rw" }
    """
    lang_input = request.data.get('language', '').strip().lower()
    if lang_input not in SUPPORTED_LANGUAGES:
        return Response(
            {"error": t("language_invalid", request.lang)},
            status=400,
        )
    request.user.language = lang_input
    request.user.save(update_fields=['language'])
    return Response({"message": t("language_updated", lang_input)}, status=200)


# ═══════════════════════════════════════════════════════════════════════════════
# REGISTRATION
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Step 1 – Validate submitted data, create an OTPSession, send OTP.
    Body: { full_name, phone, email, password, confirmPassword, role, location, language? }
    """
    lang = request.lang
    data             = request.data
    full_name        = data.get('full_name', '').strip()
    phone_number     = data.get('phone', '').strip()
    email            = data.get('email', '').strip().lower()
    password         = data.get('password', '')
    confirm_password = data.get('confirmPassword', '')
    role             = data.get('role', '').strip().lower()
    location         = data.get('location', '').strip()

    # ── Required field checks ──────────────────────────────────────────────
    if not full_name:
        return Response({"error": t("full_name_required", lang)}, status=400)
    if not phone_number:
        return Response({"error": t("phone_required", lang)}, status=400)
    if not email:
        return Response({"error": t("email_required", lang)}, status=400)
    if not role:
        return Response({"error": t("role_required", lang)}, status=400)
    if role not in ('farmer', 'buyer', 'admin'):
        return Response({"error": t("role_invalid", lang)}, status=400)
    if not password or not confirm_password:
        return Response({"error": t("password_required", lang)}, status=400)
    if password != confirm_password:
        return Response({"error": t("passwords_no_match", lang)}, status=400)
    if role not in ('buyer', 'farmer'):
        return Response({"error": t("role_not_supported", lang)}, status=400)

    # ── Email / password validation ────────────────────────────────────────
    email_error = user_utils.is_valid_email(email, lang)
    if email_error:
        return Response({"error": email_error}, status=400)

    pwd_error = user_utils.is_valid_password(password, lang)
    if pwd_error:
        return Response({"error": pwd_error}, status=400)

    # ── Uniqueness checks ──────────────────────────────────────────────────
    if CustomUser.objects.filter(phone_number=phone_number).exists():
        return Response({"error": t("phone_exists", lang)}, status=400)
    if CustomUser.objects.filter(email=email).exists():
        return Response({"error": t("email_exists", lang)}, status=400)

    # ── Create OTP session ─────────────────────────────────────────────────
    OTPSession.objects.filter(email=email, purpose='register', is_verified=False).delete()

    otp = user_utils.generate_otp()
    session = OTPSession.objects.create(
        purpose         = 'register',
        email           = email,
        phone_number    = phone_number,
        full_name       = full_name,
        role            = role,
        location        = location,
        language        = lang,
        hashed_password = make_password(password),
        otp_code        = otp,
        expires_at      = user_utils.otp_expiry(),
    )

    try:
        user_utils.send_otp_email(email, otp, 'register')
    except Exception as exc:
        session.delete()
        return Response({"error": t("otp_send_failed", lang)}, status=500)

    return Response({
        "message":    t("otp_sent", lang),
        "session_id": session.id,
    }, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_register_otp(request):
    """
    Step 2 – Verify OTP → create user → return tokens + user data.
    Body: { session_id, otp }
    """
    lang       = request.lang
    session_id = request.data.get('session_id')
    otp_input  = request.data.get('otp', '').strip()

    if not session_id or not otp_input:
        return Response({"error": t("session_id_otp_required", lang)}, status=400)

    try:
        session = OTPSession.objects.get(id=session_id, purpose='register', is_verified=False)
    except OTPSession.DoesNotExist:
        return Response({"error": t("session_invalid", lang)}, status=400)

    lang = session.language or lang

    if session.is_expired():
        session.delete()
        return Response({"error": t("otp_expired", lang)}, status=400)

    if session.attempts >= user_utils.OTP_MAX_ATTEMPTS:
        session.delete()
        return Response({"error": t("too_many_attempts", lang)}, status=400)

    if otp_input != session.otp_code:
        session.attempts += 1
        session.save(update_fields=['attempts'])
        remaining = user_utils.OTP_MAX_ATTEMPTS - session.attempts
        return Response(
            {"error": t("otp_incorrect", lang, remaining=remaining)},
            status=400,
        )

    # ── Race-condition guard ───────────────────────────────────────────────
    if CustomUser.objects.filter(phone_number=session.phone_number).exists():
        session.delete()
        return Response({"error": t("phone_already_registered", lang)}, status=400)
    if CustomUser.objects.filter(email=session.email).exists():
        session.delete()
        return Response({"error": t("email_already_registered", lang)}, status=400)

    # ── Create user ────────────────────────────────────────────────────────
    user = CustomUser(
        phone_number = session.phone_number,
        full_name    = session.full_name,
        email        = session.email,
        role         = session.role,
        location     = session.location,
        language     = session.language,
        status       = False,
        is_active    = True,
    )
    user.password = session.hashed_password
    user.save()
    session.delete()

    user_utils.send_account_created_email(user.email, user.full_name)

    # ── 🔔 Notification: welcome user + alert admins ───────────────────────
    notif.notify_user_registered(user)

    tokens = _token_pair(user)
    return Response({
        "message": t("registration_success", lang),
        **_user_payload(user, tokens),
    }, status=201)


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_register_otp(request):
    """
    Resend OTP for registration (max 3 times).
    Body: { session_id }
    """
    lang       = request.lang
    session_id = request.data.get('session_id')
    if not session_id:
        return Response({"error": t("session_id_required", lang)}, status=400)

    try:
        session = OTPSession.objects.get(id=session_id, purpose='register', is_verified=False)
    except OTPSession.DoesNotExist:
        return Response({"error": t("session_invalid_register", lang)}, status=400)

    lang = session.language or lang

    if session.resend_count >= user_utils.OTP_MAX_RESENDS:
        session.delete()
        return Response({"error": t("resend_limit_reached", lang)}, status=400)

    new_otp = user_utils.generate_otp()
    session.otp_code     = new_otp
    session.expires_at   = user_utils.otp_expiry()
    session.attempts     = 0
    session.resend_count += 1
    session.save()

    try:
        user_utils.send_otp_email(session.email, new_otp, 'register')
    except Exception:
        return Response({"error": t("otp_resend_failed", lang)}, status=500)

    resends_left = user_utils.OTP_MAX_RESENDS - session.resend_count
    return Response({
        "message":    t("otp_resent", lang, remaining=resends_left),
        "session_id": session.id,
    }, status=200)


# ═══════════════════════════════════════════════════════════════════════════════
# LOGIN
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login_user(request):
    """
    Body: { identifier (email or phone), password }
    """
    lang       = request.lang
    identifier = request.data.get('identifier', '').strip()
    password   = request.data.get('password', '')

    if not identifier or not password:
        return Response({"error": t("identifier_password_required", lang)}, status=400)

    user = (
        CustomUser.objects.filter(email=identifier).first() or
        CustomUser.objects.filter(phone_number=identifier).first()
    )

    if not user:
        return Response({"error": t("account_not_found", lang)}, status=401)
    if not check_password(password, user.password):
        return Response({"error": t("password_incorrect", lang)}, status=401)
    if not user.is_active:
        return Response({"error": t("account_disabled", lang)}, status=401)

    # ── 🔔 Notification: new login detected ───────────────────────────────
    notif.notify_login(user)

    tokens    = _token_pair(user)
    user_lang = user.language or lang
    return Response({
        "message": t("login_success", user_lang),
        **_user_payload(user, tokens),
    }, status=200)


# ═══════════════════════════════════════════════════════════════════════════════
# FORGOT PASSWORD
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([AllowAny])
def forget_password(request):
    """
    Step 1 – Send OTP to the email on the account.
    Body: { email }
    """
    lang  = request.lang
    email = request.data.get('email', '').strip().lower()
    if not email:
        return Response({"error": t("email_required", lang)}, status=400)

    try:
        user = CustomUser.objects.get(email=email)
    except CustomUser.DoesNotExist:
        return Response({"message": t("otp_sent_if_exists", lang)}, status=200)

    lang = user.language or lang

    OTPSession.objects.filter(email=email, purpose='forget_password', is_verified=False).delete()

    otp = user_utils.generate_otp()
    session = OTPSession.objects.create(
        purpose      = 'forget_password',
        email        = email,
        phone_number = user.phone_number,
        full_name    = user.full_name,
        language     = lang,
        otp_code     = otp,
        expires_at   = user_utils.otp_expiry(),
    )

    try:
        user_utils.send_otp_email(email, otp, 'forget_password')
    except Exception:
        session.delete()
        return Response({"error": t("otp_send_failed", lang)}, status=500)

    return Response({
        "message":    t("otp_sent_reset", lang),
        "session_id": session.id,
    }, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_forget_password_otp(request):
    """
    Step 2 – Verify OTP + set new password → return tokens.
    Body: { session_id, otp, new_password, confirmPassword }
    """
    lang             = request.lang
    session_id       = request.data.get('session_id')
    otp_input        = request.data.get('otp', '').strip()
    new_password     = request.data.get('new_password', '')
    confirm_password = request.data.get('confirmPassword', '')

    if not session_id or not otp_input:
        return Response({"error": t("session_id_otp_required", lang)}, status=400)
    if not new_password or not confirm_password:
        return Response({"error": t("new_password_required", lang)}, status=400)
    if new_password != confirm_password:
        return Response({"error": t("passwords_no_match", lang)}, status=400)

    pwd_error = user_utils.is_valid_password(new_password, lang)
    if pwd_error:
        return Response({"error": pwd_error}, status=400)

    try:
        session = OTPSession.objects.get(
            id=session_id, purpose='forget_password', is_verified=False
        )
    except OTPSession.DoesNotExist:
        return Response({"error": t("session_invalid_reset", lang)}, status=400)

    lang = session.language or lang

    if session.is_expired():
        session.delete()
        return Response({"error": t("otp_expired_reset", lang)}, status=400)

    if session.attempts >= user_utils.OTP_MAX_ATTEMPTS:
        session.delete()
        return Response({"error": t("too_many_attempts_reset", lang)}, status=400)

    if otp_input != session.otp_code:
        session.attempts += 1
        session.save(update_fields=['attempts'])
        remaining = user_utils.OTP_MAX_ATTEMPTS - session.attempts
        return Response(
            {"error": t("otp_incorrect", lang, remaining=remaining)},
            status=400,
        )

    try:
        user = CustomUser.objects.get(email=session.email)
    except CustomUser.DoesNotExist:
        return Response({"error": t("account_not_found_reset", lang)}, status=404)

    user.set_password(new_password)
    user.save(update_fields=['password'])
    session.delete()

    user_utils.send_password_changed_email(user.email, user.full_name)

    # ── 🔔 Notification: password was reset ───────────────────────────────
    notif.notify_password_reset(user)

    tokens    = _token_pair(user)
    user_lang = user.language or lang
    return Response({
        "message": t("password_reset_success", user_lang),
        **_user_payload(user, tokens),
    }, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_forget_password_otp(request):
    """Body: { session_id }"""
    lang       = request.lang
    session_id = request.data.get('session_id')
    if not session_id:
        return Response({"error": t("session_id_required", lang)}, status=400)

    try:
        session = OTPSession.objects.get(
            id=session_id, purpose='forget_password', is_verified=False
        )
    except OTPSession.DoesNotExist:
        return Response({"error": t("session_invalid_otp", lang)}, status=400)

    lang = session.language or lang

    if session.resend_count >= user_utils.OTP_MAX_RESENDS:
        session.delete()
        return Response({"error": t("resend_limit_reached_reset", lang)}, status=400)

    new_otp = user_utils.generate_otp()
    session.otp_code     = new_otp
    session.expires_at   = user_utils.otp_expiry()
    session.attempts     = 0
    session.resend_count += 1
    session.save()

    try:
        user_utils.send_otp_email(session.email, new_otp, 'forget_password')
    except Exception:
        return Response({"error": t("otp_resend_failed_reset", lang)}, status=500)

    resends_left = user_utils.OTP_MAX_RESENDS - session.resend_count
    return Response({
        "message":    t("otp_resent", lang, remaining=resends_left),
        "session_id": session.id,
    }, status=200)


# ═══════════════════════════════════════════════════════════════════════════════
# OWN PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    return Response(_user_payload(request.user), status=200)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Body: { full_name?, location?, email?, phone_number? }"""
    lang         = user_utils.get_request_language(request)
    user         = request.user
    full_name    = request.data.get('full_name', user.full_name).strip()
    location     = request.data.get('location', user.location).strip()
    email        = request.data.get('email', user.email or '').strip().lower()
    phone_number = request.data.get('phone_number', user.phone_number).strip()

    if not full_name:
        return Response({"error": t("full_name_empty", lang)}, status=400)

    if email and email != user.email:
        err = user_utils.is_valid_email(email, lang)
        if err:
            return Response({"error": err}, status=400)
        if CustomUser.objects.filter(email=email).exclude(id=user.id).exists():
            return Response({"error": t("email_in_use", lang)}, status=400)

    if phone_number and phone_number != user.phone_number:
        if CustomUser.objects.filter(phone_number=phone_number).exclude(id=user.id).exists():
            return Response({"error": t("phone_in_use", lang)}, status=400)

    user.full_name    = full_name
    user.location     = location
    user.email        = email or user.email
    user.phone_number = phone_number
    user.save()

    if user.email:
        user_utils.send_account_updated_email(user.email, user.full_name)

    # ── 🔔 Notification: profile updated ──────────────────────────────────
    notif.notify_profile_updated(user)

    return Response({"message": t("profile_updated", lang), **_user_payload(user)}, status=200)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Body: { current_password, new_password, confirmPassword }"""
    lang             = user_utils.get_request_language(request)
    user             = request.user
    current_password = request.data.get('current_password', '')
    new_password     = request.data.get('new_password', '')
    confirm_password = request.data.get('confirmPassword', '')

    if not current_password or not new_password or not confirm_password:
        return Response({"error": t("all_password_fields_required", lang)}, status=400)
    if not check_password(current_password, user.password):
        return Response({"error": t("current_password_incorrect", lang)}, status=400)
    if new_password != confirm_password:
        return Response({"error": t("passwords_no_match", lang)}, status=400)
    if current_password == new_password:
        return Response({"error": t("new_password_same", lang)}, status=400)

    err = user_utils.is_valid_password(new_password, lang)
    if err:
        return Response({"error": err}, status=400)

    user.set_password(new_password)
    user.save(update_fields=['password'])

    if user.email:
        user_utils.send_password_changed_email(user.email, user.full_name)

    # ── 🔔 Notification: password changed ─────────────────────────────────
    notif.notify_password_changed(user)

    return Response({"message": t("password_changed", lang)}, status=200)


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN – USER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_users(request):
    err = _admin_required(request)
    if err:
        return err
    users = CustomUser.objects.all().order_by('-created_at')
    return Response({"users": UserSerializer(users, many=True).data}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_buyers(request):
    err = _admin_required(request)
    if err:
        return err
    users = CustomUser.objects.filter(role='buyer').order_by('-created_at')
    return Response({"users": UserSerializer(users, many=True).data}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_by_id(request, user_id):
    err = _admin_required(request)
    if err:
        return err
    lang = user_utils.get_request_language(request)
    try:
        user = CustomUser.objects.get(id=user_id)
        return Response(_user_payload(user), status=200)
    except CustomUser.DoesNotExist:
        return Response({"error": t("user_not_found", lang)}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_create_user(request):
    """
    Admin creates a user directly (no OTP).
    Body: { full_name, phone_number, email?, role, location? }
    """
    err = _admin_required(request)
    if err:
        return err

    lang         = user_utils.get_request_language(request)
    data         = request.data
    full_name    = data.get('full_name', '').strip()
    phone_number = data.get('phone_number', '').strip()
    email        = data.get('email', '').strip().lower() or None
    role         = data.get('role', '').strip().lower()
    location     = data.get('location', '').strip()

    if not full_name:
        return Response({"error": t("full_name_required", lang)}, status=400)
    if not phone_number:
        return Response({"error": t("phone_required", lang)}, status=400)
    if not role or role not in ('farmer', 'buyer', 'admin'):
        return Response({"error": t("role_invalid_admin", lang)}, status=400)
    if CustomUser.objects.filter(phone_number=phone_number).exists():
        return Response({"error": t("phone_already_registered", lang)}, status=400)
    if email and CustomUser.objects.filter(email=email).exists():
        return Response({"error": t("email_already_registered", lang)}, status=400)
    if email:
        err_msg = user_utils.is_valid_email(email, lang)
        if err_msg:
            return Response({"error": err_msg}, status=400)

    password = user_utils.generate_secure_password()
    user = CustomUser.objects.create_user(
        phone_number = phone_number,
        full_name    = full_name,
        role         = role,
        email        = email,
        location     = location,
        password     = password,
        status       = True,
    )

    response_data = {
        "message": t("user_created", lang),
        **_user_payload(user),
    }

    if email:
        user_utils.send_account_created_email(email, full_name, password=password, admin_created=True)
    else:
        response_data["generated_password"] = password
        response_data["warning"] = t("no_email_password_warning", lang)

    # ── 🔔 Notification: admin created this user ───────────────────────────
    notif.notify_admin_created_user(user)

    return Response(response_data, status=201)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user(request, user_id):
    """Body: { full_name?, phone_number?, email?, role?, location? }"""
    err = _admin_required(request)
    if err:
        return err

    lang = user_utils.get_request_language(request)

    try:
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response({"error": t("user_not_found", lang)}, status=404)

    data         = request.data
    full_name    = data.get('full_name', user.full_name).strip()
    phone_number = data.get('phone_number', user.phone_number).strip()
    email        = data.get('email', user.email or '').strip().lower()
    role         = data.get('role', user.role).strip().lower()
    location     = data.get('location', user.location).strip()

    if not full_name:
        return Response({"error": t("full_name_empty", lang)}, status=400)
    if role not in ('farmer', 'buyer', 'admin'):
        return Response({"error": t("role_invalid_update", lang)}, status=400)
    if phone_number != user.phone_number:
        if CustomUser.objects.filter(phone_number=phone_number).exclude(id=user_id).exists():
            return Response({"error": t("phone_already_used", lang)}, status=400)
    if email and email != (user.email or ''):
        err_msg = user_utils.is_valid_email(email, lang)
        if err_msg:
            return Response({"error": err_msg}, status=400)
        if CustomUser.objects.filter(email=email).exclude(id=user_id).exists():
            return Response({"error": t("email_already_used", lang)}, status=400)

    old_email         = user.email
    user.full_name    = full_name
    user.phone_number = phone_number
    user.email        = email or user.email
    user.role         = role
    user.location     = location
    user.save()

    notify_email = user.email or old_email
    if notify_email:
        user_utils.send_account_updated_email(notify_email, user.full_name)

    # ── 🔔 Notification: admin updated this user ───────────────────────────
    notif.notify_admin_updated_user(user)

    return Response({"message": t("user_updated", lang), **_user_payload(user)}, status=200)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def activate_user(request, user_id):
    err = _admin_required(request)
    if err:
        return err

    lang = user_utils.get_request_language(request)
    user = get_object_or_404(CustomUser, id=user_id)

    if user.status:
        return Response({"message": t("user_already_active", lang)}, status=400)

    user.status = True
    user.save(update_fields=['status'])

    if user.email:
        user_utils.send_status_changed_email(user.email, user.full_name, activated=True)

    # ── 🔔 Notification: account activated ────────────────────────────────
    notif.notify_account_activated(user)

    return Response({"message": t("user_activated", lang)}, status=200)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def deactivate_user(request, user_id):
    err = _admin_required(request)
    if err:
        return err

    lang = user_utils.get_request_language(request)
    user = get_object_or_404(CustomUser, id=user_id)

    if not user.status:
        return Response({"message": t("user_already_inactive", lang)}, status=400)

    user.status = False
    user.save(update_fields=['status'])

    if user.email:
        user_utils.send_status_changed_email(user.email, user.full_name, activated=False)

    # ── 🔔 Notification: account deactivated ──────────────────────────────
    notif.notify_account_deactivated(user)

    return Response({"message": t("user_deactivated", lang)}, status=200)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user(request, user_id):
    err = _admin_required(request)
    if err:
        return err

    lang = user_utils.get_request_language(request)

    try:
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response({"error": t("user_not_found", lang)}, status=404)

    email     = user.email
    full_name = user.full_name
    language  = getattr(user, 'language', 'en') or 'en'

    # NOTE: We call notify_admin_deleted_user BEFORE deleting the user
    # so FK references are still valid in any future implementation.
    notif.notify_admin_deleted_user(email, full_name, language)

    user.delete()

    if email:
        user_utils.send_account_deleted_email(email, full_name)

    return Response({"message": t("user_deleted", lang)}, status=200)


# ═══════════════════════════════════════════════════════════════════════════════
# CONTACT US
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([AllowAny])
def contact_us(request):
    from django.core.mail import send_mail
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError

    lang = request.lang

    serializer = ContactUsSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    names       = serializer.validated_data['names'].strip()
    email       = serializer.validated_data['email']
    subject     = serializer.validated_data['subject'].strip()
    description = serializer.validated_data['description'].strip()

    for field, label in [(names, 'Name'), (subject, 'Subject'), (description, 'Description')]:
        if not field:
            return Response(
                {"error": t("contact_field_empty", lang, label=label)},
                status=400,
            )

    try:
        validate_email(email)
    except ValidationError:
        return Response({"error": t("email_invalid", lang)}, status=400)

    try:
        send_mail(
            subject        = f"Contact Us: {subject}",
            message        = f"From: {names} <{email}>\n\n{description}",
            from_email     = email,
            recipient_list = ['princemugabe568@gmail.com'],
            fail_silently  = False,
        )
        return Response({"message": t("contact_sent", lang)}, status=200)
    except Exception as exc:
        logger.exception("contact_us email error: %s", exc)
        return Response({"error": t("contact_failed", lang)}, status=500)


# ═══════════════════════════════════════════════════════════════════════════════
# TOKEN VERIFY / REFRESH / LOGOUT
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_token(request):
    lang = request.user.language or request.lang
    return Response({
        "message": t("token_valid", lang),
        **_user_payload(request.user),
    }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def refresh_token(request):
    """Body: { refresh }"""
    lang              = request.user.language or request.lang
    refresh_token_str = request.data.get('refresh', '').strip()

    if not refresh_token_str:
        return Response({"error": t("refresh_token_required", lang)}, status=400)

    try:
        old_token = RefreshToken(refresh_token_str)

        user_id_in_token = old_token.get('user_id')
        if str(request.user.id) != str(user_id_in_token):
            return Response({"error": t("token_wrong_user", lang)}, status=403)

        old_token.blacklist()
        new_token = RefreshToken.for_user(request.user)

        return Response({
            "message": t("token_refreshed", lang),
            "token": {
                "access":  str(new_token.access_token),
                "refresh": str(new_token),
            },
        }, status=200)

    except TokenError as e:
        return Response(
            {"error": t("token_invalid", lang, detail=str(e))},
            status=401,
        )
    except Exception as e:
        return Response(
            {"error": t("token_refresh_failed", lang, detail=str(e))},
            status=500,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """Body: { refresh }"""
    lang              = request.user.language or request.lang
    refresh_token_str = request.data.get('refresh', '').strip()

    if not refresh_token_str:
        return Response({"error": t("refresh_token_required", lang)}, status=400)

    try:
        token = RefreshToken(refresh_token_str)

        user_id_in_token = token.get('user_id')
        if str(request.user.id) != str(user_id_in_token):
            return Response({"error": t("token_wrong_user", lang)}, status=403)

        token.blacklist()
        return Response({"message": t("logout_success", lang)}, status=200)

    except TokenError as e:
        return Response(
            {"error": t("token_invalid", lang, detail=str(e))},
            status=401,
        )
    except Exception as e:
        return Response(
            {"error": t("logout_failed", lang, detail=str(e))},
            status=500,
        )