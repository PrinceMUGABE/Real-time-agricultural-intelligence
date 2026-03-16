from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal

from userApp.models import CustomUser


class Stock(models.Model):
    """
    Represents a farmer's stock of agricultural products.
    Each stock is linked to a specific farmer and product type.
    """
    QUALITY_GRADES = [
        ('A', 'Grade A - Premium'),
        ('B', 'Grade B - Standard'),
        ('C', 'Grade C - Economy'),
    ]

    farmer = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='stocks',
        limit_choices_to={'role': 'farmer'}
    )
    product_name = models.CharField(max_length=100, help_text="Name of the product (e.g., Maize, Beans)")
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Current quantity in kilograms"
    )
    unit = models.CharField(max_length=10, default='kg', help_text="Unit of measurement")
    quality_grade = models.CharField(max_length=1, choices=QUALITY_GRADES, default='B')
    
    # Location information (Rwandan administrative divisions)
    location = models.CharField(max_length=100)
    price_per_kg = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Price per kilogram in Rwandan Francs",
        default=Decimal('100.00')
    )
    
    
    description = models.TextField(blank=True, help_text="Additional details about the stock")
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['farmer', '-created_at']),
            models.Index(fields=['location', 'product_name']),
        ]

    def __str__(self):
        return f"{self.product_name} - {self.quantity}kg ({self.farmer.full_name})"

    def clean(self):
        """Validate stock data."""
        if self.quantity <= 0:
            raise ValidationError({'quantity': 'Quantity must be greater than zero.'})
        
        # Ensure farmer is actually a farmer
        if self.farmer_id and self.farmer.role != 'farmer':
            raise ValidationError({'farmer': 'Only farmers can create stocks.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def location_string(self):
        """Return full location as a string."""
        return f"{self.location}"


class StockMovement(models.Model):
    """
    Tracks all movements (in/out/transfer/adjustment) for a stock.
    Provides complete audit trail of stock changes.
    """
    MOVEMENT_TYPES = [
        ('in', 'Stock In - Adding to stock'),
        ('out', 'Stock Out - Removing from stock'),
        ('transfer', 'Transfer - Moving to another location'),
        ('adjustment', 'Adjustment - Manual correction'),
    ]

    stock = models.ForeignKey(
        Stock,
        on_delete=models.CASCADE,
        related_name='movements'
    )
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    
    # For transfers: destination location
    to_location = models.CharField(max_length=100, blank=True)
   
    
    reference_number = models.CharField(max_length=50, blank=True, help_text="External reference (invoice, order, etc.)")
    notes = models.TextField(blank=True)
    
    # Who performed this movement
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_movements'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['stock', '-created_at']),
            models.Index(fields=['movement_type', 'created_at']),
        ]

    def __str__(self):
        return f"{self.get_movement_type_display()} - {self.quantity}kg ({self.stock.product_name})"

    def clean(self):
        """Validate movement data."""
        if self.quantity <= 0:
            raise ValidationError({'quantity': 'Quantity must be greater than zero.'})

        # Check stock availability for outgoing movements
        if self.movement_type in ['out', 'transfer']:
            if self.pk:  # Existing movement
                original = StockMovement.objects.get(pk=self.pk)
                quantity_diff = self.quantity - original.quantity
                if quantity_diff > 0 and quantity_diff > self.stock.quantity:
                    raise ValidationError(
                        f'Insufficient stock. Only {self.stock.quantity}kg available.'
                    )
            else:  # New movement
                if self.quantity > self.stock.quantity:
                    raise ValidationError(
                        f'Insufficient stock. Only {self.stock.quantity}kg available.'
                    )

        # Validate transfer destination
        if self.movement_type == 'transfer':
            if not all([self.to_location]):
                raise ValidationError(
                    'Complete destination location (province to village) is required for transfers.'
                )

    def save(self, *args, **kwargs):
        """Update stock quantity on save."""
        is_new = self.pk is None
        
        if not is_new:
            # For updates, get original movement to adjust stock correctly
            original = StockMovement.objects.get(pk=self.pk)
            self._revert_stock_quantity(original)
        
        self.full_clean()
        
        # Apply the movement to stock quantity
        if self.movement_type in ['out', 'transfer']:
            self.stock.quantity -= self.quantity
        elif self.movement_type == 'in':
            self.stock.quantity += self.quantity
        # 'adjustment' doesn't automatically change stock - it's handled separately
        
        self.stock.save()
        super().save(*args, **kwargs)
        
        # Send notification after successful save
        self._send_notification(is_new)

    def delete(self, *args, **kwargs):
        """Revert stock changes when deleting a movement."""
        self._revert_stock_quantity(self)
        super().delete(*args, **kwargs)

    def _revert_stock_quantity(self, movement):
        """Revert the effect of a movement on stock quantity."""
        if movement.movement_type in ['out', 'transfer']:
            movement.stock.quantity += movement.quantity
        elif movement.movement_type == 'in':
            movement.stock.quantity -= movement.quantity
        movement.stock.save()

    def _send_notification(self, is_new):
        """Send notification about this movement."""
        from notificationApp.services import notify_user
        from .translations import nt
        
        lang = getattr(self.stock.farmer, 'language', 'en')
        
        if is_new:
            if self.movement_type == 'out':
                title = nt("stock_movement_out_title", lang)
                description = nt("stock_movement_out_desc", lang, 
                               quantity=self.quantity, 
                               product=self.stock.product_name)
            elif self.movement_type == 'in':
                title = nt("stock_movement_in_title", lang)
                description = nt("stock_movement_in_desc", lang,
                               quantity=self.quantity,
                               product=self.stock.product_name)
            elif self.movement_type == 'transfer':
                title = nt("stock_movement_transfer_title", lang)
                description = nt("stock_movement_transfer_desc", lang,
                               quantity=self.quantity,
                               product=self.stock.product_name,
                               destination=f"{self.to_location}")
            else:  # adjustment
                title = nt("stock_movement_adjustment_title", lang)
                description = nt("stock_movement_adjustment_desc", lang,
                               product=self.stock.product_name)
            
            notify_user(
                receiver=self.stock.farmer,
                title=title,
                description=description,
                sender=self.created_by
            )


class StockAlert(models.Model):
    """
    Alerts for low stock or other important notifications.
    """
    ALERT_TYPES = [
        ('low_stock', 'Low Stock'),
        ('expiring', 'Expiring Soon'),
        ('quality', 'Quality Issue'),
    ]
    
    SEVERITY_LEVELS = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]

    stock = models.ForeignKey(
        Stock,
        on_delete=models.CASCADE,
        related_name='alerts'
    )
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='warning')
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_alerts'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-severity', 'created_at']

    def __str__(self):
        return f"{self.get_alert_type_display()} - {self.stock.product_name}"