from datetime import timedelta
from decimal import Decimal
from django.db.models import Q
from django.utils import timezone
from userApp.models import CustomUser
from stockApp.models import Stock
from standardApp.models import CropStandard
from contractApp.models import Contract
from marketMatchingApp.matching_utils import find_matches_for_farmer, find_matches_for_buyer, get_match_summary
import logging

logger = logging.getLogger(__name__)


class MarketMatchingReports:
    """Reports for market matching functionality"""
    
    @staticmethod
    def get_farmer_matches_report(farmer_id, filters=None):
        """
        Generate report of matches for a specific farmer
        Returns: {
            'matches': list of matches,
            'summary': match summary statistics,
            'by_product': matches grouped by product,
            'by_quality': matches grouped by quality grade,
            'by_buyer': matches grouped by buyer
        }
        """
        try:
            farmer = CustomUser.objects.get(id=farmer_id, role='farmer')
            matches = find_matches_for_farmer(farmer, filters or {})
            
            # Group matches by product
            by_product = {}
            for match in matches:
                product = match['stock']['product_name']
                if product not in by_product:
                    by_product[product] = {
                        'count': 0,
                        'avg_score': 0,
                        'total_quantity': 0
                    }
                by_product[product]['count'] += 1
                by_product[product]['avg_score'] += match['match_score']
                by_product[product]['total_quantity'] += match['available_quantity']
            
            for product in by_product:
                if by_product[product]['count'] > 0:
                    by_product[product]['avg_score'] /= by_product[product]['count']
            
            # Group matches by quality grade
            by_quality = {}
            for match in matches:
                quality = match['stock']['quality_grade']
                if quality not in by_quality:
                    by_quality[quality] = {
                        'count': 0,
                        'avg_score': 0
                    }
                by_quality[quality]['count'] += 1
                by_quality[quality]['avg_score'] += match['match_score']
            
            for quality in by_quality:
                if by_quality[quality]['count'] > 0:
                    by_quality[quality]['avg_score'] /= by_quality[quality]['count']
            
            # Group matches by buyer
            by_buyer = {}
            for match in matches:
                buyer_id = match['buyer']['id']
                buyer_name = match['buyer']['full_name']
                if buyer_id not in by_buyer:
                    by_buyer[buyer_id] = {
                        'name': buyer_name,
                        'count': 0,
                        'avg_score': 0,
                        'total_value': 0
                    }
                by_buyer[buyer_id]['count'] += 1
                by_buyer[buyer_id]['avg_score'] += match['match_score']
                by_buyer[buyer_id]['total_value'] += match['available_quantity'] * match['buyer_price']
            
            for buyer_id in by_buyer:
                if by_buyer[buyer_id]['count'] > 0:
                    by_buyer[buyer_id]['avg_score'] /= by_buyer[buyer_id]['count']
            
            summary = get_match_summary(matches)
            
            return {
                'farmer': {
                    'id': farmer.id,
                    'name': farmer.full_name,
                    'location': farmer.location
                },
                'matches': matches,
                'summary': summary,
                'by_product': by_product,
                'by_quality': by_quality,
                'by_buyer': by_buyer,
                'total_matches': len(matches)
            }
            
        except CustomUser.DoesNotExist:
            logger.error(f"Farmer with ID {farmer_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error generating farmer matches report: {str(e)}")
            return None
    
    @staticmethod
    def get_buyer_matches_report(buyer_id, filters=None):
        """
        Generate report of matches for a specific buyer
        """
        try:
            buyer = CustomUser.objects.get(id=buyer_id, role='buyer')
            matches = find_matches_for_buyer(buyer, filters or {})
            
            # Group matches by product
            by_product = {}
            for match in matches:
                product = match['stock']['product_name']
                if product not in by_product:
                    by_product[product] = {
                        'count': 0,
                        'avg_score': 0,
                        'total_quantity': 0
                    }
                by_product[product]['count'] += 1
                by_product[product]['avg_score'] += match['match_score']
                by_product[product]['total_quantity'] += match['available_quantity']
            
            for product in by_product:
                if by_product[product]['count'] > 0:
                    by_product[product]['avg_score'] /= by_product[product]['count']
            
            # Group matches by location
            by_location = {}
            for match in matches:
                location = match['stock']['location']
                if location not in by_location:
                    by_location[location] = {
                        'count': 0,
                        'avg_score': 0,
                        'total_quantity': 0
                    }
                by_location[location]['count'] += 1
                by_location[location]['avg_score'] += match['match_score']
                by_location[location]['total_quantity'] += match['available_quantity']
            
            for location in by_location:
                if by_location[location]['count'] > 0:
                    by_location[location]['avg_score'] /= by_location[location]['count']
            
            summary = get_match_summary(matches)
            
            return {
                'buyer': {
                    'id': buyer.id,
                    'name': buyer.full_name,
                    'location': buyer.location
                },
                'matches': matches,
                'summary': summary,
                'by_product': by_product,
                'by_location': by_location,
                'total_matches': len(matches)
            }
            
        except CustomUser.DoesNotExist:
            logger.error(f"Buyer with ID {buyer_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error generating buyer matches report: {str(e)}")
            return None
    
    @staticmethod
    def get_all_matches_report(filters=None):
        """
        Generate overall market matching report for admin
        """
        try:
            from marketMatchingApp.matching_utils import find_matches_for_admin
            
            matches = find_matches_for_admin(filters or {})
            
            # Group by product
            by_product = {}
            for match in matches:
                product = match['stock']['product_name']
                if product not in by_product:
                    by_product[product] = {
                        'count': 0,
                        'avg_score': 0,
                        'total_value': 0
                    }
                by_product[product]['count'] += 1
                by_product[product]['avg_score'] += match['match_score']
                by_product[product]['total_value'] += match['available_quantity'] * match['buyer_price']
            
            for product in by_product:
                if by_product[product]['count'] > 0:
                    by_product[product]['avg_score'] /= by_product[product]['count']
            
            # Group by location
            by_location = {}
            for match in matches:
                location = match['stock']['location']
                if location not in by_location:
                    by_location[location] = {
                        'count': 0,
                        'avg_score': 0,
                        'total_value': 0
                    }
                by_location[location]['count'] += 1
                by_location[location]['avg_score'] += match['match_score']
                by_location[location]['total_value'] += match['available_quantity'] * match['buyer_price']
            
            for location in by_location:
                if by_location[location]['count'] > 0:
                    by_location[location]['avg_score'] /= by_location[location]['count']
            
            # Group by quality
            by_quality = {}
            for match in matches:
                quality = match['stock']['quality_grade']
                if quality not in by_quality:
                    by_quality[quality] = {
                        'count': 0,
                        'avg_score': 0
                    }
                by_quality[quality]['count'] += 1
                by_quality[quality]['avg_score'] += match['match_score']
            
            for quality in by_quality:
                if by_quality[quality]['count'] > 0:
                    by_quality[quality]['avg_score'] /= by_quality[quality]['count']
            
            summary = get_match_summary(matches)
            
            return {
                'matches': matches,
                'summary': summary,
                'by_product': by_product,
                'by_location': by_location,
                'by_quality': by_quality,
                'total_matches': len(matches),
                'top_matches': matches[:10]  # Top 10 matches
            }
            
        except Exception as e:
            logger.error(f"Error generating all matches report: {str(e)}")
            return None


class MarketMatchingTrends:
    """Market matching trends and analytics"""
    
    @staticmethod
    def get_match_trends(days=30):
        """Get match trends over time"""
        from marketMatchingApp.matching_utils import find_matches_for_admin
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        daily_matches = []
        current_date = start_date
        
        while current_date <= end_date:
            # For each day, get matches from stocks created around that time
            # This is simplified - you may want to adjust based on your data
            matches = find_matches_for_admin({})
            
            daily_matches.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'count': len(matches) // days  # Simplified distribution
            })
            current_date += timedelta(days=1)
        
        return {
            'trend': daily_matches,
            'period': f'Last {days} days',
            'average_matches_per_day': sum(m['count'] for m in daily_matches) / len(daily_matches) if daily_matches else 0
        }
        
