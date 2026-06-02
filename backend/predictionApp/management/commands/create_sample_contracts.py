# backend/contractApp/management/commands/create_sample_contracts.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from userApp.models import CustomUser
from contractApp.models import Contract
from stockApp.models import Stock


class Command(BaseCommand):
    help = 'Creates sample contracts for testing market predictions'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Creating sample contracts...'))
        
        # Get or create a test farmer and buyer
        farmer, created = CustomUser.objects.get_or_create(
            phone_number='+250788123456',
            defaults={
                'full_name': 'Test Farmer',
                'role': 'farmer',
                'email': 'farmer@test.com',
                'status': True,
                'is_active': True
            }
        )
        
        if created:
            farmer.set_password('testpass123')
            farmer.save()
            self.stdout.write(f'Created test farmer: {farmer.full_name}')
        else:
            self.stdout.write(f'Using existing farmer: {farmer.full_name}')
        
        buyer, created = CustomUser.objects.get_or_create(
            phone_number='+250788123457',
            defaults={
                'full_name': 'Test Buyer',
                'role': 'buyer',
                'email': 'buyer@test.com',
                'status': True,
                'is_active': True
            }
        )
        
        if created:
            buyer.set_password('testpass123')
            buyer.save()
            self.stdout.write(f'Created test buyer: {buyer.full_name}')
        else:
            self.stdout.write(f'Using existing buyer: {buyer.full_name}')
        
        # Create sample stock for farmer
        stock, created = Stock.objects.get_or_create(
            farmer=farmer,
            product_name='Rice',
            defaults={
                'quantity': Decimal('500.00'),
                'quality_grade': 'A',
                'location': 'Kigali',
                'price_per_kg': Decimal('800.00'),
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(f'Created stock: {stock.product_name}')
        else:
            self.stdout.write(f'Using existing stock: {stock.product_name}')
        
        # Create historical contracts for Rice at different price points
        rice_prices = [750, 780, 800, 820, 850, 830, 840, 860]
        
        contract_count = 0
        for i, price in enumerate(rice_prices):
            contract_date = timezone.now() - timedelta(days=(len(rice_prices) - i) * 7)
            
            # Check if contract already exists for this date and price
            existing = Contract.objects.filter(
                crop_name='Rice',
                price_per_kg=Decimal(str(price)),
                created_at__date=contract_date.date()
            ).first()
            
            if not existing:
                contract = Contract.objects.create(
                    buyer=buyer,
                    farmer=farmer,
                    stock=stock,
                    crop_name='Rice',
                    price_per_kg=Decimal(str(price)),
                    quantity_kg=Decimal('100.00'),
                    status=Contract.STATUS_COMPLETED,
                    payment_status=Contract.PAYMENT_COMPLETED,
                    delivery_status=Contract.DELIVERY_COMPLETED,
                    created_at=contract_date,
                    admin_confirmed=True,
                    admin_confirmed_at=contract_date
                )
                contract.total_amount = contract.price_per_kg * contract.quantity_kg
                contract.save(update_fields=['total_amount'])
                contract_count += 1
                self.stdout.write(f'  Created contract #{contract.id}: Rice at {price} RWF/kg on {contract_date.date()}')
            else:
                self.stdout.write(f'  Contract already exists for Rice at {price} RWF/kg')
        
        # Also create contracts for other crops
        other_crops = [
            ('Maize', [400, 420, 450, 440, 460]),
            ('Beans', [900, 920, 950, 940, 960]),
            ('Potatoes', [500, 520, 540, 530, 550]),
        ]
        
        for crop_name, prices in other_crops:
            crop_stock, created = Stock.objects.get_or_create(
                farmer=farmer,
                product_name=crop_name,
                defaults={
                    'quantity': Decimal('300.00'),
                    'quality_grade': 'B',
                    'location': 'Kigali',
                    'price_per_kg': Decimal(str(prices[0])),
                    'is_active': True
                }
            )
            
            for i, price in enumerate(prices):
                contract_date = timezone.now() - timedelta(days=(len(prices) - i) * 7)
                
                # Check if contract already exists
                existing = Contract.objects.filter(
                    crop_name=crop_name,
                    price_per_kg=Decimal(str(price)),
                    created_at__date=contract_date.date()
                ).first()
                
                if not existing:
                    contract = Contract.objects.create(
                        buyer=buyer,
                        farmer=farmer,
                        stock=crop_stock,
                        crop_name=crop_name,
                        price_per_kg=Decimal(str(price)),
                        quantity_kg=Decimal('50.00'),
                        status=Contract.STATUS_COMPLETED,
                        payment_status=Contract.PAYMENT_COMPLETED,
                        delivery_status=Contract.DELIVERY_COMPLETED,
                        created_at=contract_date,
                        admin_confirmed=True,
                        admin_confirmed_at=contract_date
                    )
                    contract.total_amount = contract.price_per_kg * contract.quantity_kg
                    contract.save(update_fields=['total_amount'])
                    contract_count += 1
                    self.stdout.write(f'  Created contract #{contract.id}: {crop_name} at {price} RWF/kg')
                else:
                    self.stdout.write(f'  Contract already exists for {crop_name} at {price} RWF/kg')
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Successfully created {contract_count} new sample contracts!'))
        self.stdout.write(self.style.SUCCESS(f'Now you can access predictions at: /prediction/stock/{stock.id}/prediction/'))
        self.stdout.write(self.style.SUCCESS(f'You can login with:\n  Farmer: +250788123456 / testpass123\n  Buyer: +250788123457 / testpass123'))