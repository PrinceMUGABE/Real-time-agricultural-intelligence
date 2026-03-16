from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from userApp.models import CustomUser

class CropStandard(models.Model):
    """
    Represents a buyer's standard for crops they are willing to purchase.
    Buyers can set their preferences for crop quality, type, season, and price.
    """
    
    # Crop quality grades (matching Stock model for consistency)
    QUALITY_GRADES = [
        ('A', 'Grade A - Premium'),
        ('B', 'Grade B - Standard'),
        ('C', 'Grade C - Economy'),
    ]
    
    # Crop types based on age/harvest
    CROP_TYPES = [
        ('new', 'New Harvest - Fresh from current season'),
        ('old', 'Old Stock - Previous season harvest'),
        ('mixed', 'Mixed - Combination of new and old'),
    ]
    
    # Rwandan agricultural seasons
    SEASONS = [
        ('A', 'Season A (September - January) - Main rainy season'),
        ('B', 'Season B (February - May) - Second rainy season'),
        ('C', 'Season C (June - August) - Dry season irrigation'),
        ('D', 'Season D - Long rains (mountain regions)'),
    ]
    
    # Status options
    STATUS_CHOICES = [
        ('active', 'Active - Currently buying'),
        ('inactive', 'Inactive - Not buying'),
        ('expired', 'Expired - Season passed'),
    ]

    # Basic Information
    crop_name = models.CharField(
        max_length=100,
        help_text="Name of the crop (e.g., Maize, Beans, Irish Potatoes)"
    )
    crop_type = models.CharField(
        max_length=20,
        choices=CROP_TYPES,
        default='new',
        help_text="Type of crop based on harvest age"
    )
    
    # Season Information
    season = models.CharField(
        max_length=10,
        choices=SEASONS,
        help_text="Rwandan agricultural season"
    )
    harvest_year = models.PositiveIntegerField(
        help_text="Year of harvest (e.g., 2024)"
    )
    
    # Quality and Price
    quality_grade = models.CharField(
        max_length=1,
        choices=QUALITY_GRADES,
        default='B',
        help_text="Minimum quality grade accepted"
    )
    price_per_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Price per kilogram in Rwandan Francs"
    )
    
    # Quantity Requirements
    min_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        default=Decimal('1.00'),
        help_text="Minimum quantity required in kilograms"
    )
    max_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        null=True,
        blank=True,
        help_text="Maximum quantity accepted (optional)"
    )
    
    # Additional Details
    description = models.TextField(
        blank=True,
        help_text="Additional requirements or notes"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        help_text="Current status of this standard"
    )
    
    # Location preferences (optional)
    preferred_location = models.CharField(
        max_length=100,
        blank=True,
        help_text="Preferred source location (e.g., specific district)"
    )
    
    # Metadata
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='created_crop_standards',
        limit_choices_to={'role': 'buyer'}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_by', '-created_at']),
            models.Index(fields=['crop_name', 'season']),
            models.Index(fields=['status']),
        ]
        unique_together = ['created_by', 'crop_name', 'season', 'harvest_year']

    def __str__(self):
        return f"{self.crop_name} - {self.get_season_display()} {self.harvest_year} ({self.created_by.full_name})"

    def clean(self):
        """Validate crop standard data."""
        errors = {}
        
        # Validate crop name
        if not self.crop_name or not self.crop_name.strip():
            errors['crop_name'] = 'Crop name is required.'
        
        # Validate quantity range
        if self.min_quantity <= 0:
            errors['min_quantity'] = 'Minimum quantity must be greater than zero.'
        
        if self.max_quantity:
            if self.max_quantity <= 0:
                errors['max_quantity'] = 'Maximum quantity must be greater than zero.'
            elif self.max_quantity < self.min_quantity:
                errors['max_quantity'] = 'Maximum quantity cannot be less than minimum quantity.'
        
        # Validate harvest year
        current_year = timezone.now().year
        if self.harvest_year < 2000 or self.harvest_year > current_year + 1:
            errors['harvest_year'] = f'Harvest year must be between 2000 and {current_year + 1}.'
        
        # Validate price
        if self.price_per_kg <= 0:
            errors['price_per_kg'] = 'Price per kilogram must be greater than zero.'
        
        # Validate buyer role
        if self.created_by_id and self.created_by.role != 'buyer':
            errors['created_by'] = 'Only buyers can create crop standards.'
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        """Auto-update status based on season."""
        self.update_status_from_season()
        self.full_clean()
        super().save(*args, **kwargs)

    def update_status_from_season(self):
        """Update standard status based on current season and harvest year."""
        current_date = timezone.now().date()
        current_year = current_date.year
        current_month = current_date.month

        # Season date ranges (approximate)
        season_ranges = {
            'A': {'start_month': 9, 'end_month': 1, 'year_offset': 0},  # Sep-Jan
            'B': {'start_month': 2, 'end_month': 5, 'year_offset': 0},  # Feb-May
            'C': {'start_month': 6, 'end_month': 8, 'year_offset': 0},  # Jun-Aug
            'D': {'start_month': 3, 'end_month': 6, 'year_offset': 0},  # Mar-Jun
        }

        season_info = season_ranges.get(self.season, {})
        
        # Check if season is active
        is_active_season = False
        
        if season_info:
            start_month = season_info['start_month']
            end_month = season_info['end_month']
            
            # Handle seasons that cross year boundary (like Season A)
            if start_month > end_month:
                if current_month >= start_month or current_month <= end_month:
                    is_active_season = True
            else:
                if start_month <= current_month <= end_month:
                    is_active_season = True
        
        # Update status based on season activity and harvest year
        if self.harvest_year < current_year - 1:
            self.status = 'expired'
        elif self.harvest_year == current_year - 1 and not is_active_season:
            self.status = 'expired'
        elif self.harvest_year == current_year and not is_active_season:
            self.status = 'inactive'
        elif self.harvest_year > current_year:
            self.status = 'inactive'  # Future harvest
        # Keep manual status if set to inactive
        elif self.status != 'inactive':
            self.status = 'active'

    @property
    def season_display_with_year(self):
        """Return season with year for display."""
        return f"{self.get_season_display()} {self.harvest_year}"

    @property
    def is_accepting_offers(self):
        """Check if this standard is currently accepting offers."""
        return self.status == 'active'

    @property
    def estimated_total_value(self):
        """Calculate estimated total value for max quantity."""
        if self.max_quantity:
            return float(self.price_per_kg) * float(self.max_quantity)
        return None


class CropStandardHistory(models.Model):
    """
    Tracks changes to crop standards for audit purposes.
    """
    ACTION_CHOICES = [
        ('create', 'Created'),
        ('update', 'Updated'),
        ('delete', 'Deleted'),
        ('status_change', 'Status Changed'),
    ]

    crop_standard = models.ForeignKey(
        CropStandard,
        on_delete=models.CASCADE,
        related_name='history'
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    changed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='crop_standard_changes'
    )
    changes = models.JSONField(default=dict, help_text="JSON field storing what changed")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['crop_standard', '-created_at']),
        ]

    def __str__(self):
        return f"{self.crop_standard.crop_name} - {self.action} at {self.created_at}"