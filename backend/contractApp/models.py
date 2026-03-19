from django.db import models
from django.utils.timezone import now
from django.core.exceptions import ValidationError


class Contract(models.Model):

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

    PAYMENT_STATUS_CHOICES = [
        (PAYMENT_PENDING,   'Pending'),
        (PAYMENT_STARTED,   'Started'),
        (PAYMENT_COMPLETED, 'Completed'),
    ]

    # ── Delivery status ───────────────────────────────────────────────────
    DELIVERY_PENDING   = 'pending'
    DELIVERY_COMPLETED = 'completed'
    DELIVERY_FAILED    = 'failed'

    DELIVERY_STATUS_CHOICES = [
        (DELIVERY_PENDING,   'Pending'),
        (DELIVERY_COMPLETED, 'Completed'),
        (DELIVERY_FAILED,    'Failed'),
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
        help_text="User responsible for making the delivery.",
    )

    # ── Crop / stock reference ─────────────────────────────────────────────
    stock = models.ForeignKey(
        'stockApp.Stock',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='contracts',
        help_text="The crop listing / harvest this contract is for.",
    )
    crop_name   = models.CharField(max_length=255, help_text="Snapshot of crop name at contract creation.")
    price_per_kg = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_kg  = models.DecimalField(max_digits=12, decimal_places=2, help_text="Agreed quantity in kg.")
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, editable=False)

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

    # ── Payment ───────────────────────────────────────────────────────────
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS_CHOICES, default=PAYMENT_PENDING,
    )
    amount_paid = models.DecimalField(
        max_digits=14, decimal_places=2, default=0,
        help_text="Running total of all confirmed payments.",
    )

    # ── Delivery ──────────────────────────────────────────────────────────
    delivery_status = models.CharField(
        max_length=20, choices=DELIVERY_STATUS_CHOICES, default=DELIVERY_PENDING,
    )
    delivery_notes  = models.TextField(blank=True, default='')
    delivery_date   = models.DateField(null=True, blank=True)

    # ── Meta ──────────────────────────────────────────────────────────────
    notes      = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)

    # Who created the contract
    created_by = models.ForeignKey(
        'userApp.CustomUser',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='created_contracts',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Contract #{self.pk} | {self.farmer} → {self.buyer} | {self.crop_name} | {self.status}"

    # ── Computed helpers ──────────────────────────────────────────────────
    @property
    def balance_due(self):
        """Remaining amount yet to be paid."""
        return self.total_amount - self.amount_paid

    @property
    def is_fully_paid(self):
        return self.amount_paid >= self.total_amount

    @property
    def both_parties_accepted(self):
        return (
            self.farmer_status == self.STATUS_ACCEPTED and
            self.buyer_status  == self.STATUS_ACCEPTED
        )

    def save(self, *args, **kwargs):
        # Always recompute total_amount from price × quantity
        self.total_amount = self.price_per_kg * self.quantity_kg

        # Auto-promote overall status when both parties accept
        if self.both_parties_accepted and self.status == self.STATUS_PENDING:
            self.status = self.STATUS_ACCEPTED

        super().save(*args, **kwargs)

    def clean(self):
        if self.buyer_id and self.farmer_id and self.buyer_id == self.farmer_id:
            raise ValidationError("Buyer and farmer cannot be the same user.")
        if self.price_per_kg is not None and self.price_per_kg <= 0:
            raise ValidationError("Price per kg must be greater than zero.")
        if self.quantity_kg is not None and self.quantity_kg <= 0:
            raise ValidationError("Quantity must be greater than zero.")


class PaymentRecord(models.Model):
    """Records each individual payment instalment against a contract."""

    METHOD_CASH         = 'cash'
    METHOD_BANK         = 'bank_transfer'
    METHOD_MOBILE_MONEY = 'mobile_money'
    METHOD_OTHER        = 'other'

    METHOD_CHOICES = [
        (METHOD_CASH,         'Cash'),
        (METHOD_BANK,         'Bank Transfer'),
        (METHOD_MOBILE_MONEY, 'Mobile Money'),
        (METHOD_OTHER,        'Other'),
    ]

    STATUS_PENDING   = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_REJECTED  = 'rejected'

    STATUS_CHOICES = [
        (STATUS_PENDING,   'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_REJECTED,  'Rejected'),
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

    amount          = models.DecimalField(max_digits=14, decimal_places=2)
    payment_method  = models.CharField(max_length=20, choices=METHOD_CHOICES, default=METHOD_CASH)
    reference_number = models.CharField(
        max_length=255, blank=True, default='',
        help_text="Transaction ID, cheque number, etc.",
    )
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    notes      = models.TextField(blank=True, default='')
    paid_at    = models.DateTimeField(default=now)
    created_at = models.DateTimeField(default=now)
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
        if self.amount is not None and self.amount <= 0:
            raise ValidationError("Payment amount must be greater than zero.")

        if self.contract_id and self.amount is not None:
            contract = self.contract
            # Only confirmed payments count toward total; pending ones are checked
            # against the remaining balance
            confirmed_total = PaymentRecord.objects.filter(
                contract=contract,
                status=self.STATUS_CONFIRMED,
            ).exclude(pk=self.pk).aggregate(
                total=models.Sum('amount')
            )['total'] or 0

            if confirmed_total + self.amount > contract.total_amount:
                raise ValidationError(
                    f"This payment of {self.amount} would exceed the contract total "
                    f"of {contract.total_amount}. "
                    f"Already confirmed: {confirmed_total}. "
                    f"Maximum allowed: {contract.total_amount - confirmed_total}."
                )