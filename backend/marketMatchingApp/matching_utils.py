from decimal import Decimal
from django.db.models import Q, F
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


def calculate_match_score(stock, crop_standard):
    """
    Calculate how well a stock matches a crop standard.
    Returns a score from 0-100 and detailed breakdown.
    """
    score = 0
    details = {
        'matches': [],
        'mismatches': [],
        'warnings': []
    }
    
    # 1. Product name match (40 points) - Most important
    if stock.product_name.lower() == crop_standard.crop_name.lower():
        score += 40
        details['matches'].append({
            'criterion': 'product_name',
            'message': f"Product matches exactly: {stock.product_name}"
        })
    elif stock.product_name.lower() in crop_standard.crop_name.lower() or crop_standard.crop_name.lower() in stock.product_name.lower():
        score += 30
        details['matches'].append({
            'criterion': 'product_name',
            'message': f"Product partially matches: {stock.product_name} ↔ {crop_standard.crop_name}"
        })
    else:
        details['mismatches'].append({
            'criterion': 'product_name',
            'message': f"Product mismatch: {stock.product_name} vs {crop_standard.crop_name}"
        })
        return 0, details  # Product mismatch = no match
    
    # 2. Quality grade match (20 points)
    quality_hierarchy = {'A': 3, 'B': 2, 'C': 1}
    stock_quality = quality_hierarchy.get(stock.quality_grade, 0)
    buyer_quality = quality_hierarchy.get(crop_standard.quality_grade, 0)
    
    if stock_quality >= buyer_quality:
        score += 20
        if stock_quality > buyer_quality:
            details['matches'].append({
                'criterion': 'quality',
                'message': f"Stock quality ({stock.get_quality_grade_display()}) exceeds buyer's minimum ({crop_standard.get_quality_grade_display()})"
            })
        else:
            details['matches'].append({
                'criterion': 'quality',
                'message': f"Quality matches exactly: {stock.get_quality_grade_display()}"
            })
    else:
        score += 10
        details['warnings'].append({
            'criterion': 'quality',
            'message': f"Stock quality ({stock.get_quality_grade_display()}) is below buyer's preference ({crop_standard.get_quality_grade_display()})"
        })
    
    # 3. Quantity match (20 points)
    if stock.quantity >= crop_standard.min_quantity:
        score += 20
        if crop_standard.max_quantity and stock.quantity > crop_standard.max_quantity:
            details['matches'].append({
                'criterion': 'quantity',
                'message': f"Stock quantity ({stock.quantity}kg) exceeds max requirement, partial fulfillment possible"
            })
        else:
            details['matches'].append({
                'criterion': 'quantity',
                'message': f"Quantity ({stock.quantity}kg) meets buyer's requirement"
            })
    else:
        score += 10
        details['warnings'].append({
            'criterion': 'quantity',
            'message': f"Stock quantity ({stock.quantity}kg) is below buyer's minimum ({crop_standard.min_quantity}kg)"
        })
    
    # 4. Price match (10 points)
    if crop_standard.price_per_kg >= stock.price_per_kg:
        score += 10
        difference = crop_standard.price_per_kg - stock.price_per_kg
        details['matches'].append({
            'criterion': 'price',
            'message': f"Buyer's price ({crop_standard.price_per_kg} RWF/kg) is {'higher' if difference > 0 else 'equal to'} farmer's price ({stock.price_per_kg} RWF/kg)"
        })
    else:
        difference = stock.price_per_kg - crop_standard.price_per_kg
        details['warnings'].append({
            'criterion': 'price',
            'message': f"Farmer's price ({stock.price_per_kg} RWF/kg) is higher than buyer's offer ({crop_standard.price_per_kg} RWF/kg) by {difference} RWF"
        })
    
    # 5. Location match (5 points)
    if stock.location and crop_standard.preferred_location:
        if stock.location.lower() == crop_standard.preferred_location.lower():
            score += 5
            details['matches'].append({
                'criterion': 'location',
                'message': f"Location matches exactly: {stock.location}"
            })
        elif crop_standard.preferred_location.lower() in stock.location.lower() or stock.location.lower() in crop_standard.preferred_location.lower():
            score += 3
            details['matches'].append({
                'criterion': 'location',
                'message': f"Location partially matches: {stock.location} ↔ {crop_standard.preferred_location}"
            })
    
    # 6. Crop type match (5 points)
    if hasattr(crop_standard, 'crop_type') and crop_standard.crop_type:
        # This is a simplified check - you can expand based on your crop_type logic
        score += 5
        details['matches'].append({
            'criterion': 'crop_type',
            'message': f"Crop type: {crop_standard.get_crop_type_display()}"
        })
    
    return score, details


def find_matches_for_farmer(farmer, filters=None):
    """
    Find all active crop standards that match a farmer's stocks.
    Returns list of matches with scores and details in frontend-friendly format.
    """
    from stockApp.models import Stock
    from standardApp.models import CropStandard
    
    matches = []
    filters = filters or {}
    
    try:
        # Get farmer's active stocks
        stocks = Stock.objects.filter(
            farmer=farmer,
            is_active=True,
            quantity__gt=0
        ).select_related('farmer')
        
        # Apply stock filters if any
        if filters.get('product_name'):
            stocks = stocks.filter(product_name__icontains=filters['product_name'])
        
        if filters.get('min_quantity'):
            stocks = stocks.filter(quantity__gte=filters['min_quantity'])
        
        if filters.get('quality_grade'):
            stocks = stocks.filter(quality_grade=filters['quality_grade'])
        
        # Get active crop standards from buyers
        crop_standards = CropStandard.objects.filter(
            status='active',
            created_by__is_active=True,
            created_by__status=True
        ).select_related('created_by')
        
        # Apply crop standard filters if any
        if filters.get('crop_name'):
            crop_standards = crop_standards.filter(crop_name__icontains=filters['crop_name'])
        
        if filters.get('buyer_id'):
            crop_standards = crop_standards.filter(created_by_id=filters['buyer_id'])
        
        # For each stock, find matching crop standards
        for stock in stocks:
            for standard in crop_standards:
                # Skip if product names don't match at all (quick filter)
                if stock.product_name.lower() != standard.crop_name.lower() and \
                   not (stock.product_name.lower() in standard.crop_name.lower() or 
                        standard.crop_name.lower() in stock.product_name.lower()):
                    continue
                
                score, details = calculate_match_score(stock, standard)
                
                if score >= 60:  # Only include matches with score >= 60%
                    # Create match object with all fields frontend expects
                    match = {
                        'stock': {
                            'id': stock.id,
                            'product_name': stock.product_name,
                            'quantity': stock.quantity,
                            'quality_grade': stock.quality_grade,
                            'price_per_kg': stock.price_per_kg,
                            'location': stock.location,
                            'harvest_date': getattr(stock, 'harvest_date', None),
                            'expiry_date': getattr(stock, 'expiry_date', None),
                            'is_active': stock.is_active,
                            'created_at': stock.created_at,
                            'farmer': {
                                'id': stock.farmer.id,
                                'full_name': stock.farmer.full_name,
                                'phone_number': stock.farmer.phone_number,
                                'email': stock.farmer.email,
                                'role': stock.farmer.role,
                                'location': getattr(stock.farmer, 'location', None)
                            }
                        },
                        'crop_standard': {
                            'id': standard.id,
                            'crop_name': standard.crop_name,
                            'min_quantity': standard.min_quantity,
                            'max_quantity': standard.max_quantity,
                            'quality_grade': standard.quality_grade,
                            'price_per_kg': standard.price_per_kg,
                            'preferred_location': standard.preferred_location,
                            'crop_type': getattr(standard, 'crop_type', None),
                            'season': getattr(standard, 'season', None),
                            'harvest_period_start': getattr(standard, 'harvest_period_start', None),
                            'harvest_period_end': getattr(standard, 'harvest_period_end', None)
                        },
                        'farmer': {
                            'id': stock.farmer.id,
                            'full_name': stock.farmer.full_name,
                            'phone_number': stock.farmer.phone_number,
                            'email': stock.farmer.email,
                            'role': stock.farmer.role,
                            'location': getattr(stock.farmer, 'location', None)
                        },
                        'buyer': {
                            'id': standard.created_by.id,
                            'full_name': standard.created_by.full_name,
                            'phone_number': standard.created_by.phone_number,
                            'email': standard.created_by.email,
                            'role': standard.created_by.role,
                            'location': getattr(standard.created_by, 'location', None)

                        },
                        'match_score': score,
                        'match_details': details,
                        'available_quantity': stock.quantity,
                        'requested_quantity': standard.min_quantity,
                        'farmer_price': stock.price_per_kg,
                        'buyer_price': standard.price_per_kg,
                        'price_difference': standard.price_per_kg - stock.price_per_kg,
                        'favorable_for_farmer': standard.price_per_kg > stock.price_per_kg,
                        'favorable_for_buyer': stock.price_per_kg < standard.price_per_kg,
                        'match_percentage': f"{score}%",
                    }
                    matches.append(match)
        
        # Sort by match score (highest first)
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        
    except Exception as e:
        logger.error(f"Error finding matches for farmer {farmer.id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return []
    
    return matches

def find_matches_for_buyer(buyer, filters=None):
    """
    Find all active stocks that match a buyer's crop standards.
    Returns list of matches with scores and details in frontend-friendly format.
    """
    from stockApp.models import Stock
    from standardApp.models import CropStandard
    
    matches = []
    filters = filters or {}
    
    try:
        # Get buyer's active crop standards
        crop_standards = CropStandard.objects.filter(
            created_by=buyer,
            status='active'
        ).select_related('created_by')
        
        # Apply crop standard filters if any
        if filters.get('crop_name'):
            crop_standards = crop_standards.filter(crop_name__icontains=filters['crop_name'])
        
        if filters.get('season'):
            crop_standards = crop_standards.filter(season=filters['season'])
        
        # Get active stocks from farmers
        stocks = Stock.objects.filter(
            is_active=True,
            quantity__gt=0,
            farmer__is_active=True,
            farmer__status=True
        ).select_related('farmer')
        
        # Apply stock filters if any
        if filters.get('product_name'):
            stocks = stocks.filter(product_name__icontains=filters['product_name'])
        
        if filters.get('farmer_id'):
            stocks = stocks.filter(farmer_id=filters['farmer_id'])
        
        if filters.get('location'):
            stocks = stocks.filter(location__icontains=filters['location'])
        
        # For each crop standard, find matching stocks
        for standard in crop_standards:
            for stock in stocks:
                # Skip if product names don't match at all (quick filter)
                if stock.product_name.lower() != standard.crop_name.lower() and \
                   not (stock.product_name.lower() in standard.crop_name.lower() or 
                        standard.crop_name.lower() in stock.product_name.lower()):
                    continue
                
                score, details = calculate_match_score(stock, standard)
                
                if score >= 60:  # Only include matches with score >= 60%
                    # Create match object with all fields frontend expects
                    match = {
                        'stock': {
                            'id': stock.id,
                            'product_name': stock.product_name,
                            'quantity': stock.quantity,
                            'quality_grade': stock.quality_grade,
                            'price_per_kg': stock.price_per_kg,
                            'location': stock.location,
                            'harvest_date': getattr(stock, 'harvest_date', None),
                            'expiry_date': getattr(stock, 'expiry_date', None),
                            'is_active': stock.is_active,
                            'created_at': stock.created_at,
                            'farmer': {
                                'id': stock.farmer.id,
                                'full_name': stock.farmer.full_name,
                                'phone_number': stock.farmer.phone_number,
                                'email': stock.farmer.email,
                                'role': stock.farmer.role,
                                'location': getattr(stock.farmer, 'location', None)
                            }
                        },
                        'crop_standard': {
                            'id': standard.id,
                            'crop_name': standard.crop_name,
                            'min_quantity': standard.min_quantity,
                            'max_quantity': standard.max_quantity,
                            'quality_grade': standard.quality_grade,
                            'price_per_kg': standard.price_per_kg,
                            'preferred_location': standard.preferred_location,
                            'crop_type': getattr(standard, 'crop_type', None),
                            'season': getattr(standard, 'season', None),
                            'harvest_period_start': getattr(standard, 'harvest_period_start', None),
                            'harvest_period_end': getattr(standard, 'harvest_period_end', None)
                        },
                        'farmer': {
                            'id': stock.farmer.id,
                            'full_name': stock.farmer.full_name,
                            'phone_number': stock.farmer.phone_number,
                            'email': stock.farmer.email,
                            'role': stock.farmer.role,
                            'location': getattr(stock.farmer, 'location', None)
                        },
                        'buyer': {
                            'id': buyer.id,
                            'full_name': buyer.full_name,
                            'phone_number': buyer.phone_number,
                            'email': buyer.email,
                            'role': buyer.role
                        },
                        'match_score': score,
                        'match_details': details,
                        'available_quantity': stock.quantity,
                        'requested_quantity': standard.min_quantity,
                        'farmer_price': stock.price_per_kg,
                        'buyer_price': standard.price_per_kg,
                        'price_difference': standard.price_per_kg - stock.price_per_kg,
                        'favorable_for_farmer': standard.price_per_kg > stock.price_per_kg,
                        'favorable_for_buyer': stock.price_per_kg < standard.price_per_kg,
                        'match_percentage': f"{score}%",
                    }
                    matches.append(match)
        
        # Sort by match score (highest first)
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        
    except Exception as e:
        logger.error(f"Error finding matches for buyer {buyer.id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return []
    
    return matches

def find_matches_for_admin(filters=None):
    """
    Find all possible matches across the system for admin view.
    Returns combined list of all matches in frontend-friendly format.
    """
    from userApp.models import CustomUser
    
    all_matches = []
    filters = filters or {}
    
    try:
        # Get all active farmers
        farmers = CustomUser.objects.filter(
            role='farmer',
            is_active=True,
            status=True
        )
        
        # Get all active buyers
        buyers = CustomUser.objects.filter(
            role='buyer',
            is_active=True,
            status=True
        )
        
        # Apply user filters if any
        if filters.get('farmer_id'):
            farmers = farmers.filter(id=filters['farmer_id'])
        
        if filters.get('buyer_id'):
            buyers = buyers.filter(id=filters['buyer_id'])
        
        # Find matches for each farmer
        for farmer in farmers:
            farmer_matches = find_matches_for_farmer(farmer, filters)
            all_matches.extend(farmer_matches)
        
        # Sort by match score
        all_matches.sort(key=lambda x: x['match_score'], reverse=True)
        
        # Remove duplicates (same stock-standard pair)
        seen_pairs = set()
        unique_matches = []
        for match in all_matches:
            pair_key = (match['stock']['id'], match['crop_standard']['id'])
            if pair_key not in seen_pairs:
                seen_pairs.add(pair_key)
                unique_matches.append(match)
        
    except Exception as e:
        logger.error(f"Error finding matches for admin: {str(e)}")
        import traceback
        traceback.print_exc()
        return []
    
    return unique_matches

def get_match_summary(matches):
    """
    Generate summary statistics for a list of matches.
    Returns summary in format expected by frontend.
    """
    if not matches:
        return {
            'total_matches': 0,
            'average_score': 0,
            'high_quality_matches': 0,
            'total_potential_value': 0,
            'by_product': {},
            'by_location': {}
        }
    
    total = len(matches)
    avg_score = sum(m['match_score'] for m in matches) / total
    high_quality = sum(1 for m in matches if m['match_score'] >= 90)
    
    # Calculate total potential value (requested quantity * buyer price)
    total_potential_value = 0
    for match in matches:
        quantity = min(match['available_quantity'], match['requested_quantity'])
        price = match['buyer_price']
        total_potential_value += float(quantity) * float(price)
    
    # Group by product - count only
    by_product = {}
    for match in matches:
        product = match['stock']['product_name']
        if product not in by_product:
            by_product[product] = 0
        by_product[product] += 1
    
    # Group by location - count only
    by_location = {}
    for match in matches:
        location = match['stock'].get('location', 'Unknown')
        if location and location != 'Unknown':
            location = location.capitalize()
        if location not in by_location:
            by_location[location] = 0
        by_location[location] += 1
    
    return {
        'total_matches': total,
        'average_score': round(avg_score, 2),
        'high_quality_matches': high_quality,
        'total_potential_value': round(total_potential_value, 2),
        'by_product': by_product,
        'by_location': by_location
    }