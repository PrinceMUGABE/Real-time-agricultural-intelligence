from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils.timezone import now
from django.utils import timezone
import datetime


class CustomUserManager(BaseUserManager):

    def create_user(self, phone_number, full_name, role, email=None, password=None,
                    location='', status=False, language='en'):
        if not phone_number:
            raise ValueError("The phone number must be provided")
        if not full_name:
            raise ValueError("The full name must be provided")
        if not role:
            raise ValueError("The role must be provided")
        if role not in [choice[0] for choice in CustomUser.ROLE_CHOICES]:
            raise ValueError("Invalid role selected")
        if role == 'admin' and not email:
            raise ValueError("Email is required for admin users")

        user = self.model(
            phone_number=phone_number,
            full_name=full_name,
            role=role,
            location=location,
            status=status,
            language=language,
        )
        if email:
            user.email = self.normalize_email(email)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, full_name, phone_number, email, password=None):
        user = self.create_user(
            phone_number=phone_number,
            full_name=full_name,
            role='admin',
            email=email,
            status=True,
            password=password,
        )
        user.is_admin = True
        user.is_superuser = True
        user.is_staff = True
        user.save(using=self._db)
        return user


class CustomUser(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('admin',  'Admin'),
        ('farmer', 'Farmer'),
        ('buyer',  'Buyer'),
    ]

    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('fr', 'French'),
        ('sw', 'Swahili'),
        ('rw', 'Kinyarwanda'),
    ]

    full_name    = models.CharField(max_length=255, default='')
    phone_number = models.CharField(max_length=20, unique=True)
    email        = models.EmailField(unique=True, null=True, blank=True)
    role         = models.CharField(max_length=20, choices=ROLE_CHOICES)
    location     = models.CharField(max_length=255, default='')
    language     = models.CharField(                        # ← NEW
        max_length=5,
        choices=LANGUAGE_CHOICES,
        default='en',
    )
    is_active    = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)
    is_admin     = models.BooleanField(default=False)
    status       = models.BooleanField(default=False)
    created_at   = models.DateTimeField(default=now)

    USERNAME_FIELD  = 'phone_number'
    REQUIRED_FIELDS = ['email', 'full_name']

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.full_name} ({self.phone_number})"

    def has_perm(self, perm, obj=None):
        return self.is_admin

    def has_module_perms(self, app_label):
        return self.is_admin


# ── OTP ──────────────────────────────────────────────────────────────────────

class OTPSession(models.Model):
    """
    Stores a pending registration or password-reset OTP.
    One session = one unverified action.
    """
    PURPOSE_CHOICES = [
        ('register',         'Register'),
        ('forget_password',  'Forget Password'),
    ]

    purpose       = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    email         = models.EmailField()
    phone_number  = models.CharField(max_length=20)
    full_name     = models.CharField(max_length=255, blank=True, default='')
    role          = models.CharField(max_length=20, blank=True, default='')
    location      = models.CharField(max_length=255, blank=True, default='')
    language      = models.CharField(max_length=5, default='en')            # ← NEW
    hashed_password = models.CharField(max_length=255, blank=True, default='')

    otp_code      = models.CharField(max_length=6)
    expires_at    = models.DateTimeField()
    resend_count  = models.IntegerField(default=0)
    attempts      = models.IntegerField(default=0)
    is_verified   = models.BooleanField(default=False)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"OTP({self.purpose}) → {self.email}"