import re
import random
import string
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
import datetime

from .translations import t


# ── Validation ────────────────────────────────────────────────────────────────

def is_valid_password(password: str, lang: str = 'en'):
    """Returns a translated error string or None if valid."""
    if len(password) < 8:
        return t("pwd_too_short", lang)
    if not any(c.isdigit() for c in password):
        return t("pwd_no_digit", lang)
    if not any(c.isupper() for c in password):
        return t("pwd_no_upper", lang)
    if not any(c.islower() for c in password):
        return t("pwd_no_lower", lang)
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return t("pwd_no_special", lang)
    return None


def is_valid_email(email: str, lang: str = 'en'):
    """Returns a translated error string or None if valid."""
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if not re.match(pattern, email):
        return t("email_invalid", lang)
    return None


# ── Password generator ────────────────────────────────────────────────────────

def generate_secure_password() -> str:
    lc = string.ascii_lowercase
    uc = string.ascii_uppercase
    dg = string.digits
    sp = '!@#$%^&*(),.?":{}|<>'
    chars = [random.choice(lc), random.choice(uc),
             random.choice(dg), random.choice(sp)]
    chars += [random.choice(lc + uc + dg + sp) for _ in range(4)]
    random.shuffle(chars)
    return ''.join(chars)


# ── OTP helpers ───────────────────────────────────────────────────────────────

OTP_VALID_MINUTES = 1
OTP_MAX_RESENDS   = 3
OTP_MAX_ATTEMPTS  = 5


def generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))


def otp_expiry() -> datetime.datetime:
    return timezone.now() + datetime.timedelta(minutes=OTP_VALID_MINUTES)


# ── Email senders ─────────────────────────────────────────────────────────────

FROM = settings.DEFAULT_FROM_EMAIL


def send_otp_email(to_email: str, otp: str, purpose: str = 'register'):
    subject = "Your FMMROP Verification Code"
    action  = "complete your registration" if purpose == 'register' else "reset your password"
    body = (
        f"Hello,\n\n"
        f"Use the OTP below to {action}:\n\n"
        f"        {otp}\n\n"
        f"This code is valid for {OTP_VALID_MINUTES} minute(s).\n"
        f"Do NOT share it with anyone.\n\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"— FMMROP Team"
    )
    try:
        send_mail(subject, body, FROM, [to_email], fail_silently=False)
    except Exception as exc:
        print(f"[EMAIL ERROR] Could not send OTP to {to_email}: {exc}")
        raise


def send_account_created_email(to_email: str, full_name: str, password: str = None,
                                admin_created: bool = False):
    subject = "Welcome to FMMROP – Account Created"
    body = (
        f"Hello {full_name},\n\n"
        f"Your FMMROP account has been successfully created.\n"
    )
    if admin_created and password:
        body += (
            f"\nYour temporary password is: {password}\n"
            f"Please log in and change it immediately.\n"
        )
    body += "\nBest regards,\nFMMROP Team"
    try:
        send_mail(subject, body, FROM, [to_email], fail_silently=True)
    except Exception:
        pass


def send_account_updated_email(to_email: str, full_name: str):
    try:
        send_mail(
            "FMMROP – Account Updated",
            f"Hello {full_name},\n\nYour account details have been updated.\n\n— FMMROP Team",
            FROM, [to_email], fail_silently=True,
        )
    except Exception:
        pass


def send_status_changed_email(to_email: str, full_name: str, activated: bool):
    state = "activated" if activated else "deactivated"
    try:
        send_mail(
            f"FMMROP – Account {state.capitalize()}",
            f"Hello {full_name},\n\nYour account has been {state}.\n\n— FMMROP Team",
            FROM, [to_email], fail_silently=True,
        )
    except Exception:
        pass


def send_account_deleted_email(to_email: str, full_name: str):
    try:
        send_mail(
            "FMMROP – Account Deleted",
            f"Hello {full_name},\n\nYour FMMROP account has been deleted.\n\n— FMMROP Team",
            FROM, [to_email], fail_silently=True,
        )
    except Exception:
        pass


def send_password_changed_email(to_email: str, full_name: str):
    try:
        send_mail(
            "FMMROP – Password Changed",
            (
                f"Hello {full_name},\n\n"
                f"Your password was just changed.\n"
                f"If this was not you, contact support immediately.\n\n— FMMROP Team"
            ),
            FROM, [to_email], fail_silently=True,
        )
    except Exception:
        pass
    
    
    

def get_request_language(request):
    """
    Extract language from request headers.
    Priority:
    1. Accept-Language header
    2. User's saved language (if authenticated)
    3. Default 'en'
    """
    # Try to get from Accept-Language header
    accept_language = request.META.get('HTTP_ACCEPT_LANGUAGE', '')
    if accept_language and accept_language in ['en', 'fr', 'rw', 'sw']:
        return accept_language
    
    # If user is authenticated, use their saved language
    if hasattr(request, 'user') and request.user.is_authenticated:
        if request.user.language and request.user.language in ['en', 'fr', 'rw', 'sw']:
            return request.user.language
    
    # Default to English
    return 'en'