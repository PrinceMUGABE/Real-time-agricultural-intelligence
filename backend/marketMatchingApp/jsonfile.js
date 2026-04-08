[
    {
        'stock': {
            'id': 2, 'product_name': 'Ibigori', 'quantity': Decimal('100.00'), 'quality_grade': 'B', 'price_per_kg': Decimal('100.00'), 'location': 'Eastern Province / Kayonza / Murundi', 'harvest_date': None, 'expiry_date': None, 'is_active': True, 'created_at': datetime.datetime(2026,
                3,
                16,
                8,
                42,
                30,
                81162, tzinfo = datetime.timezone.utc), 'farmer': {
                    'id': 3, 'full_name': 'Isimbi', 'phone_number': '+250789990408', 'email': 'princemugabe567@gmail.com', 'role': 'farmer', 'location': 'Eastern Province, Kayonza, Kabare'
                }
        }, 'crop_standard': {
            'id': 3, 'crop_name': 'Ibigori', 'min_quantity': Decimal('10.00'), 'max_quantity': None, 'quality_grade': 'B', 'price_per_kg': Decimal('600.00'), 'preferred_location': '', 'crop_type': 'new', 'season': 'A', 'harvest_period_start': None, 'harvest_period_end': None
        }, 'farmer': {
            'id': 3, 'full_name': 'Isimbi', 'phone_number': '+250789990408', 'email': 'princemugabe567@gmail.com', 'role': 'farmer', 'location': 'Eastern Province, Kayonza, Kabare'
        }, 'buyer': {
            'id': 4, 'full_name': 'Willy Olga', 'phone_number': '+250787176228', 'email': 'olgawilly123@gmail.com', 'role': 'buyer', 'location': 'Ndego, Kayonza, Eastern Province'
        }, 'match_score': 95, 'match_details': {
            'matches': [
                {
                    'criterion': 'product_name', 'message': 'Product matches exactly: Ibigori'
                },
                {
                    'criterion': 'quality', 'message': 'Quality matches exactly: Grade B - Standard'
                },
                {
                    'criterion': 'quantity', 'message': "Quantity (100.00kg) meets buyer's requirement"
                },
                {
                    'criterion': 'price', 'message': "Buyer's price (600.00 RWF/kg) is higher farmer's price (100.00 RWF/kg)"
                },
                {
                    'criterion': 'crop_type', 'message': 'Crop type: New Harvest - Fresh from current season'
                }
            ], 'mismatches': [], 'warnings': []
        }, 'available_quantity': Decimal('100.00'), 'requested_quantity': Decimal('10.00'), 'farmer_price': Decimal('100.00'), 'buyer_price':
            Decimal('600.00'), 'price_difference': Decimal('500.00'), 'favorable_for_farmer': True, 'favorable_for_buyer': True, 'match_percentage': '95%'
    }
]