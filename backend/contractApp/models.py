from django.db import models
from django.utils.timezone import now
from django.core.exceptions import ValidationError
from decimal import Decimal

class Contract(models.Model):
    """Complete contract management with full tracking"""

    # ── Status choices ────────────────────────────────────────────────────
    STATUS_PENDING   = 'pending'
    STATUS_ACCEPTED  = 'accepted'
    STATUS_REJECTED  = 'rejected'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED    = 'failed'

    STATUS_CHOICES = [
        (STATUS_PENDING,   'Pending'),
        (STATUS_ACCEPTED,  'Accepted'),
        (STATUS_REJECTED,  'Rejected'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_FAILED,    'Failed'),
    ]

    # ── Payment status ────────────────────────────────────────────────────
    PAYMENT_PENDING   = 'pending'
    PAYMENT_STARTED   = 'started'
    PAYMENT_COMPLETED = 'completed'
    PAYMENT_FAILED    = 'failed'

    PAYMENT_STATUS_CHOICES = [
        (PAYMENT_PENDING,   'Pending'),
        (PAYMENT_STARTED,   'Started'),
        (PAYMENT_COMPLETED, 'Completed'),
        (PAYMENT_FAILED,    'Failed'),
    ]

    # ── Payment options ───────────────────────────────────────────────────
    PAYMENT_OPTION_FULL    = 'full'
    PAYMENT_OPTION_PARTIAL = 'partial'

    PAYMENT_OPTION_CHOICES = [
        (PAYMENT_OPTION_FULL,    'Full Payment'),
        (PAYMENT_OPTION_PARTIAL, 'Partial Payment'),
    ]

    # ── Delivery status ───────────────────────────────────────────────────
    DELIVERY_PENDING   = 'pending'
    DELIVERY_IN_PROGRESS = 'in_progress'
    DELIVERY_COMPLETED = 'completed'
    DELIVERY_FAILED    = 'failed'

    DELIVERY_STATUS_CHOICES = [
        (DELIVERY_PENDING,      'Pending'),
        (DELIVERY_IN_PROGRESS,  'In Progress'),
        (DELIVERY_COMPLETED,    'Completed'),
        (DELIVERY_FAILED,       'Failed'),
    ]

    # ── Parties ───────────────────────────────────────────────────────────
    buyer = models.ForeignKey(
        'userApp.CustomUser',
        on_delete=models.CASCADE,
        related_name='buyer_contracts',
        limit_choices_to={'role': 'buyer'},
    )
    farmer = models.ForeignKey(
        'userApp.CustomUser',
        on_delete=models.CASCADE,
        related_name='farmer_contracts',
        limit_choices_to={'role': 'farmer'},
    )
    deliver = models.ForeignKey(
        'userApp.CustomUser',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='delivery_contracts',
        help_text="User responsible for delivery (buyer, farmer, or third party)",
    )

    # ── Stock reference ───────────────────────────────────────────────────
    stock = models.ForeignKey(
        'stockApp.Stock',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='contracts',
        help_text="The stock being sold (if applicable)",
    )

    # ── Contract details ──────────────────────────────────────────────────
    crop_name = models.CharField(max_length=255, help_text="Snapshot of crop name at contract creation")
    price_per_kg = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_kg = models.DecimalField(max_digits=12, decimal_places=2, help_text="Agreed quantity in kg")
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, editable=False)

    # ── Delivery location ─────────────────────────────────────────────────
    delivery_location = models.CharField(
        max_length=255, 
        blank=True, 
        help_text="Where the goods should be delivered"
    )
    
    # ── Admin-managed overall status ──────────────────────────────────────
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING,
    )

    # ── Per-party statuses ────────────────────────────────────────────────
    farmer_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING,
    )
    buyer_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING,
    )
    
    # Admin confirmation (required after both parties accept)
    admin_confirmed = models.BooleanField(default=False)
    admin_confirmed_at = models.DateTimeField(null=True, blank=True)
    admin_confirmed_by = models.ForeignKey(
        'userApp.CustomUser',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='confirmed_contracts',
    )

    # ── Payment tracking ──────────────────────────────────────────────────
    payment_option = models.CharField(
        max_length=10, 
        choices=PAYMENT_OPTION_CHOICES, 
        default=PAYMENT_OPTION_FULL,
        help_text="Full payment or partial payment allowed"
    )
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default=PAYMENT_PENDING,
    )
    amount_paid = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Running total of confirmed payments",
    )
    payment_due_date = models.DateField(null=True, blank=True, help_text="If partial payment, when is full payment due")

    # ── Delivery tracking ──────────────────────────────────────────────────
    delivery_status = models.CharField(
        max_length=20, choices=DELIVERY_STATUS_CHOICES, default=DELIVERY_PENDING,
    )
    delivery_notes = models.TextField(blank=True, default='')
    delivery_date = models.DateField(null=True, blank=True)
    delivery_completed_at = models.DateTimeField(null=True, blank=True)
    
    # Track stock movement after delivery
    stock_movement_created = models.BooleanField(default=False)
    
    # ── Meta ──────────────────────────────────────────────────────────────
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'userApp.CustomUser',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='created_contracts',
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['farmer', 'status']),
            models.Index(fields=['buyer', 'status']),
            models.Index(fields=['payment_status', 'delivery_status']),
        ]

    def __str__(self):
        return f"Contract #{self.pk} | {self.farmer.full_name} → {self.buyer.full_name} | {self.crop_name}"

    # ── Computed properties ───────────────────────────────────────────────
    @property
    def balance_due(self):
        """Remaining amount yet to be paid"""
        return self.total_amount - self.amount_paid

    @property
    def is_fully_paid(self):
        return self.amount_paid >= self.total_amount

    @property
    def both_parties_accepted(self):
        return (
            self.farmer_status == self.STATUS_ACCEPTED and
            self.buyer_status == self.STATUS_ACCEPTED
        )

    @property
    def can_proceed_to_payment(self):
        """Check if payments can be made"""
        return (
            self.status == self.STATUS_ACCEPTED and
            self.admin_confirmed and
            self.payment_status != self.PAYMENT_COMPLETED
        )

    @property
    def can_start_delivery(self):
        """Check if delivery can be started"""
        return (
            self.status == self.STATUS_ACCEPTED and
            self.admin_confirmed and
            self.payment_status != self.PAYMENT_PENDING and
            self.delivery_status == self.DELIVERY_PENDING
        )

    @property
    def needs_admin_confirmation(self):
        """Check if contract needs admin confirmation"""
        return self.both_parties_accepted and not self.admin_confirmed

    # ── Core methods ──────────────────────────────────────────────────────
    def save(self, *args, **kwargs):
        # Always recompute total_amount from price × quantity
        self.total_amount = self.price_per_kg * self.quantity_kg

        # Auto-update overall status based on parties
        if self.both_parties_accepted and not self.admin_confirmed:
            self.status = self.STATUS_ACCEPTED  # Tentatively accepted, pending admin
        elif self.both_parties_accepted and self.admin_confirmed:
            self.status = self.STATUS_ACCEPTED
        elif self.farmer_status == self.STATUS_REJECTED or self.buyer_status == self.STATUS_REJECTED:
            self.status = self.STATUS_REJECTED

        super().save(*args, **kwargs)

    def clean(self):
        """Validate contract data"""
        if self.buyer_id and self.farmer_id and self.buyer_id == self.farmer_id:
            raise ValidationError("Buyer and farmer cannot be the same user.")
        if self.price_per_kg <= 0:
            raise ValidationError("Price per kg must be greater than zero.")
        if self.quantity_kg <= 0:
            raise ValidationError("Quantity must be greater than zero.")
        
        # Validate stock availability if stock is linked
        if self.stock_id and self.quantity_kg > self.stock.quantity:
            raise ValidationError(
                f"Insufficient stock. Available: {self.stock.quantity}kg, Requested: {self.quantity_kg}kg"
            )

    def accept_by_party(self, user):
        """Accept contract by buyer or farmer"""
        if user.id == self.buyer_id:
            if self.buyer_status == self.STATUS_ACCEPTED:
                return False, "Already accepted"
            self.buyer_status = self.STATUS_ACCEPTED
            return True, "Buyer accepted"
        elif user.id == self.farmer_id:
            if self.farmer_status == self.STATUS_ACCEPTED:
                return False, "Already accepted"
            self.farmer_status = self.STATUS_ACCEPTED
            return True, "Farmer accepted"
        return False, "Not a party to this contract"

    def reject_by_party(self, user):
        """Reject contract by buyer or farmer"""
        if user.id == self.buyer_id:
            if self.buyer_status == self.STATUS_REJECTED:
                return False, "Already rejected"
            self.buyer_status = self.STATUS_REJECTED
            return True, "Buyer rejected"
        elif user.id == self.farmer_id:
            if self.farmer_status == self.STATUS_REJECTED:
                return False, "Already rejected"
            self.farmer_status = self.STATUS_REJECTED
            return True, "Farmer rejected"
        return False, "Not a party to this contract"

    def confirm_by_admin(self, admin):
        """Admin confirmation after both parties accept"""
        if not self.both_parties_accepted:
            return False, "Both parties must accept first"
        if self.admin_confirmed:
            return False, "Already confirmed"
        
        self.admin_confirmed = True
        self.admin_confirmed_at = now()
        self.admin_confirmed_by = admin
        self.status = self.STATUS_ACCEPTED
        
        # Don't save here - let the caller handle saving
        return True, "Contract confirmed by admin"

    def update_payment(self, amount, is_confirmed=True):
        """Update payment totals"""
        if is_confirmed:
            self.amount_paid += amount
            if self.is_fully_paid:
                self.payment_status = self.PAYMENT_COMPLETED
            elif self.amount_paid > 0:
                self.payment_status = self.PAYMENT_STARTED
        self.save(update_fields=['amount_paid', 'payment_status'])

    def complete_delivery(self, stock_movement=None):
        """Complete delivery and update stock"""
        self.delivery_status = self.DELIVERY_COMPLETED
        self.delivery_completed_at = now()
        
        if stock_movement and not self.stock_movement_created:
            self.stock_movement_created = True
        
        self.save(update_fields=['delivery_status', 'delivery_completed_at', 'stock_movement_created'])
        
        # If fully paid and delivered, mark as completed
        if self.is_fully_paid and self.delivery_status == self.DELIVERY_COMPLETED:
            self.status = self.STATUS_COMPLETED
            self.save(update_fields=['status'])


class PaymentRecord(models.Model):
    """Records each individual payment instalment against a contract"""

    METHOD_BANK = 'bank_transfer'
    METHOD_MOBILE_MONEY = 'mobile_money'

    METHOD_CHOICES = [
        (METHOD_BANK, 'Bank Transfer'),
        (METHOD_MOBILE_MONEY, 'Mobile Money'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_REJECTED = 'rejected'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name='payment_records',
    )
    recorded_by = models.ForeignKey(
        'userApp.CustomUser',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='payment_records',
    )

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=METHOD_CHOICES, default=METHOD_MOBILE_MONEY)
    reference_number = models.CharField(
        max_length=255, blank=True, default='',
        help_text="Transaction ID, cheque number, etc.",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    notes = models.TextField(blank=True, default='')
    paid_at = models.DateTimeField(default=now)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmed_by = models.ForeignKey(
        'userApp.CustomUser',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='confirmed_payments',
    )

    class Meta:
        ordering = ['-paid_at']

    def __str__(self):
        return f"Payment #{self.pk} | Contract #{self.contract_id} | {self.amount} ({self.status})"

    def clean(self):
        if self.amount <= 0:
            raise ValidationError("Payment amount must be greater than zero.")

        if self.contract_id and self.status == self.STATUS_CONFIRMED:
            contract = self.contract
            if self.amount > contract.balance_due:
                raise ValidationError(
                    f"This payment of {self.amount} exceeds the balance due of {contract.balance_due}."
                )

    def confirm(self, admin):
        """Confirm payment"""
        if self.status != self.STATUS_PENDING:
            return False, "Payment already processed"
        
        self.status = self.STATUS_CONFIRMED
        self.confirmed_by = admin
        self.confirmed_at = now()
        self.save()
        
        # Update contract payment totals
        self.contract.update_payment(self.amount)
        return True, "Payment confirmed"

    def reject(self, admin, reason=''):
        """Reject payment"""
        if self.status != self.STATUS_PENDING:
            return False, "Payment already processed"
        
        self.status = self.STATUS_REJECTED
        if reason:
            self.notes = f"{self.notes}\n[Rejection reason]: {reason}".strip()
        self.save()
        return True, "Payment rejected"


class ContractActivity(models.Model):
    """Track all activities on contracts for audit trail"""
    
    ACTIVITY_TYPES = [
        ('created', 'Created'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('confirmed', 'Admin Confirmed'),
        ('payment_added', 'Payment Added'),
        ('payment_confirmed', 'Payment Confirmed'),
        ('payment_rejected', 'Payment Rejected'),
        ('delivery_started', 'Delivery Started'),
        ('delivery_completed', 'Delivery Completed'),
        ('delivery_failed', 'Delivery Failed'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('updated', 'Updated'),
    ]
    
    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    performed_by = models.ForeignKey(
        'userApp.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='contract_activities'
    )
    details = models.JSONField(default=dict, help_text="Additional activity details")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Contract activities"
    
    def __str__(self):
        return f"{self.get_activity_type_display()} - Contract #{self.contract_id} at {self.created_at}"