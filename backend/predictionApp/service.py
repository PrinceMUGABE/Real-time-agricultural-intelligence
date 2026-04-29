# predictionApp/service.py (or services.py)
import statistics
from datetime import datetime, timedelta
from collections import defaultdict
from decimal import Decimal
from django.db.models import Avg, Sum, Count, Q, Max, Min, F
from django.utils import timezone
from django.core.cache import cache

from contractApp.models import Contract
from stockApp.models import Stock
from userApp.models import CustomUser
from notificationApp.translations import nt  # Use nt() for notification translations


class MarketPredictionService:
    """
    Analyzes historical contract data to provide market predictions
    and recommendations for farmers and buyers.
    """
    
    def __init__(self, lang='en'):
        self.lang = lang
        self.cache_duration = 3600  # Cache predictions for 1 hour
    
    def get_historical_price_data(self, crop_name, months_back=6):
        """
        Fetch historical price data for a specific crop from completed contracts.
        Returns list of price points over time.
        """
        cutoff_date = timezone.now() - timedelta(days=months_back * 30)
        
        contracts = Contract.objects.filter(
            crop_name__iexact=crop_name,
            status=Contract.STATUS_COMPLETED,
            created_at__gte=cutoff_date,
            price_per_kg__gt=0
        ).order_by('created_at')
        
        price_data = []
        for contract in contracts:
            price_data.append({
                'date': contract.created_at,
                'price': float(contract.price_per_kg),
                'quantity': float(contract.quantity_kg),
                'month': contract.created_at.month,
                'week': contract.created_at.isocalendar()[1],
            })
        
        return price_data
    
    def calculate_trend(self, price_data):
        """
        Calculate market trend based on historical data.
        Returns: trend_direction ('up', 'down', 'stable'), percentage_change, confidence
        """
        if len(price_data) < 3:
            return 'stable', 0, 0.0
        
        # Get average of recent 3 vs older 3
        recent_avg = statistics.mean([p['price'] for p in price_data[-3:]])
        older_avg = statistics.mean([p['price'] for p in price_data[:3]])
        
        if recent_avg > older_avg:
            trend = 'up'
            change = ((recent_avg - older_avg) / older_avg) * 100
        elif recent_avg < older_avg:
            trend = 'down'
            change = ((older_avg - recent_avg) / older_avg) * 100
        else:
            trend = 'stable'
            change = 0
        
        # Calculate confidence based on data volume
        confidence = min(len(price_data) / 20, 1.0)  # Max confidence at 20+ data points
        
        return trend, round(change, 2), confidence
    
    def predict_future_price(self, crop_name, weeks_ahead=4):
        """
        Predict future price using simple moving average and seasonal patterns.
        """
        historical = self.get_historical_price_data(crop_name, months_back=12)
        
        if len(historical) < 5:
            return None, 0.0
        
        # Get current average price
        current_avg = statistics.mean([p['price'] for p in historical[-4:]])
        
        # Find same period last year for seasonal comparison
        current_month = timezone.now().month
        
        seasonal_data = [p for p in historical if p['month'] == current_month]
        
        if len(seasonal_data) >= 3:
            seasonal_avg = statistics.mean([p['price'] for p in seasonal_data])
            seasonal_factor = seasonal_avg / current_avg if current_avg > 0 else 1.0
        else:
            seasonal_factor = 1.0
        
        # Calculate trend
        trend, change, confidence = self.calculate_trend(historical)
        
        if trend == 'up':
            predicted_price = current_avg * (1 + (change / 100) * (weeks_ahead / 4))
        elif trend == 'down':
            predicted_price = current_avg * (1 - (change / 100) * (weeks_ahead / 4))
        else:
            predicted_price = current_avg
        
        # Apply seasonal adjustment
        predicted_price *= seasonal_factor
        
        return round(predicted_price, 2), confidence
    
    def get_market_summary(self, crop_name):
        """
        Get comprehensive market summary for a specific crop.
        """
        cache_key = f"market_summary_{crop_name}_{self.lang}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # Get all completed contracts for this crop
        contracts = Contract.objects.filter(
            crop_name__iexact=crop_name,
            status=Contract.STATUS_COMPLETED,
            price_per_kg__gt=0
        )
        
        if not contracts.exists():
            return None
        
        # Calculate key metrics
        total_contracts = contracts.count()
        avg_price = contracts.aggregate(Avg('price_per_kg'))['price_per_kg__avg']
        max_price = contracts.aggregate(Max('price_per_kg'))['price_per_kg__max']
        min_price = contracts.aggregate(Min('price_per_kg'))['price_per_kg__min']
        total_quantity = contracts.aggregate(Sum('quantity_kg'))['quantity_kg__sum']
        
        # Get recent activity (last 30 days)
        recent_cutoff = timezone.now() - timedelta(days=30)
        recent_contracts = contracts.filter(created_at__gte=recent_cutoff)
        
        recent_avg = recent_contracts.aggregate(Avg('price_per_kg'))['price_per_kg__avg']
        
        # Price change
        older_cutoff = timezone.now() - timedelta(days=60)
        older_contracts = contracts.filter(
            created_at__lt=recent_cutoff,
            created_at__gte=older_cutoff
        )
        older_avg = older_contracts.aggregate(Avg('price_per_kg'))['price_per_kg__avg']
        
        price_change = 0
        if older_avg:
            price_change = ((recent_avg - older_avg) / older_avg) * 100 if recent_avg else 0
        
        # Get trend analysis
        price_data = self.get_historical_price_data(crop_name)
        trend, trend_percent, confidence = self.calculate_trend(price_data)
        
        # Predict future price
        predicted_price, pred_confidence = self.predict_future_price(crop_name)
        
        # Get translated trend text
        trend_text = self._get_trend_text(trend)
        
        result = {
            'crop_name': crop_name,
            'current_avg_price': round(float(avg_price), 2) if avg_price else 0,
            'price_range': {
                'min': round(float(min_price), 2) if min_price else 0,
                'max': round(float(max_price), 2) if max_price else 0,
            },
            'price_change_30d': round(float(price_change), 2),
            'trend': trend,
            'trend_text': trend_text,
            'trend_percentage': trend_percent,
            'trend_confidence': round(confidence * 100, 1),
            'predicted_price': predicted_price,
            'prediction_confidence': round(pred_confidence * 100, 1),
            'total_quantity_sold': float(total_quantity) if total_quantity else 0,
            'number_of_transactions': total_contracts,
            'recommendation': self._generate_market_recommendation(
                trend, price_change, predicted_price, avg_price
            ),
        }
        
        cache.set(cache_key, result, self.cache_duration)
        return result
    
    def _get_trend_text(self, trend):
        """Get translated trend description"""
        # Using manual mapping since nt() requires key from NOTIFICATION_MESSAGES
        trend_map = {
            'up': {
                'en': 'Increasing',
                'fr': 'En hausse',
                'sw': 'Inaongezeka',
                'rw': 'Iriyongera'
            },
            'down': {
                'en': 'Decreasing',
                'fr': 'En baisse',
                'sw': 'Inapungua',
                'rw': 'Irigabanuka'
            },
            'stable': {
                'en': 'Stable',
                'fr': 'Stable',
                'sw': 'Sawa sawa',
                'rw': 'Irahagaze'
            }
        }
        return trend_map.get(trend, {}).get(self.lang, trend_map.get('stable', {}).get('en', 'Stable'))
    
    def _generate_market_recommendation(self, trend, price_change, predicted_price, current_price):
        """
        Generate recommendation based on market analysis.
        """
        if not current_price or not predicted_price:
            return {
                'action': 'neutral',
                'message': nt("market_insufficient_data", self.lang),
                'urgency': 'low',
                'urgency_text': nt("urgency_low", self.lang)
            }
        
        if trend == 'up' and price_change > 10:
            if predicted_price > current_price:
                return {
                    'action': 'hold',
                    'message': nt("market_hold_rising", self.lang, change=price_change),
                    'urgency': 'low',
                    'urgency_text': nt("urgency_low", self.lang)
                }
            else:
                return {
                    'action': 'sell',
                    'message': nt("market_sell_after_rise", self.lang, change=price_change),
                    'urgency': 'medium',
                    'urgency_text': nt("urgency_medium", self.lang)
                }
        elif trend == 'down' and price_change < -10:
            if predicted_price < current_price:
                return {
                    'action': 'sell_urgent',
                    'message': nt("market_sell_urgent_declining", self.lang, change=abs(price_change)),
                    'urgency': 'high',
                    'urgency_text': nt("urgency_high", self.lang)
                }
            else:
                return {
                    'action': 'hold',
                    'message': nt("market_hold_recovering", self.lang, change=abs(price_change)),
                    'urgency': 'low',
                    'urgency_text': nt("urgency_low", self.lang)
                }
        elif trend == 'up':
            return {
                'action': 'hold',
                'message': nt("market_hold_upward", self.lang, change=price_change),
                'urgency': 'low',
                'urgency_text': nt("urgency_low", self.lang)
            }
        elif trend == 'down':
            return {
                'action': 'sell',
                'message': nt("market_sell_downward", self.lang, change=abs(price_change)),
                'urgency': 'medium',
                'urgency_text': nt("urgency_medium", self.lang)
            }
        else:
            return {
                'action': 'neutral',
                'message': nt("market_stable", self.lang),
                'urgency': 'low',
                'urgency_text': nt("urgency_low", self.lang)
            }
    
    def get_farmer_recommendation(self, farmer):
        """
        Generate personalized recommendations for a farmer based on their stocks.
        """
        recommendations = []
        
        # Get farmer's active stocks
        stocks = Stock.objects.filter(
            farmer=farmer,
            is_active=True,
            quantity__gt=0
        )
        
        for stock in stocks:
            market_summary = self.get_market_summary(stock.product_name)
            
            if not market_summary:
                continue
            
            current_value = float(stock.quantity) * market_summary['current_avg_price']
            predicted_value = float(stock.quantity) * (market_summary['predicted_price'] or market_summary['current_avg_price'])
            
            # Check if this specific stock has been in storage for a while
            days_in_stock = (timezone.now() - stock.created_at).days
            
            recommendation = {
                'stock_id': stock.id,
                'product': stock.product_name,
                'quantity_kg': float(stock.quantity),
                'quality_grade': stock.quality_grade,
                'quality_text': self._get_quality_text(stock.quality_grade),
                'current_market_price': market_summary['current_avg_price'],
                'estimated_current_value': round(current_value, 2),
                'predicted_future_value': round(predicted_value, 2),
                'market_trend': market_summary['trend'],
                'market_trend_text': market_summary['trend_text'],
                'trend_percentage': market_summary['trend_percentage'],
                'recommendation': market_summary['recommendation'],
                'days_in_stock': days_in_stock,
            }
            
            # Add storage warning if applicable
            if days_in_stock > 60:
                recommendation['storage_warning'] = nt("storage_warning_days", self.lang, days=days_in_stock)
                recommendation['urgency'] = 'high'
            elif days_in_stock > 30:
                recommendation['storage_info'] = nt("storage_info_days", self.lang, days=days_in_stock)
            
            recommendations.append(recommendation)
        
        # Sort by urgency
        urgency_order = {'high': 0, 'medium': 1, 'low': 2}
        recommendations.sort(key=lambda x: urgency_order.get(x['recommendation'].get('urgency', 'low'), 3))
        
        return recommendations
    
    def _get_quality_text(self, grade):
        """Get translated quality grade text"""
        quality_map = {
            'A': {
                'en': 'Premium',
                'fr': 'Premium',
                'sw': 'Bora zaidi',
                'rw': 'Bora'
            },
            'B': {
                'en': 'Standard',
                'fr': 'Standard',
                'sw': 'Kiwango cha kawaida',
                'rw': 'Rusange'
            },
            'C': {
                'en': 'Economy',
                'fr': 'Économique',
                'sw': 'Uchumi',
                'rw': 'Ubukungu'
            }
        }
        return quality_map.get(grade, {}).get(self.lang, grade)
    
    def get_buyer_recommendation(self, buyer):
        """
        Generate personalized recommendations for a buyer based on their interests.
        """
        recommendations = []
        
        # Get crops this buyer has previously purchased or shown interest in
        previous_purchases = Contract.objects.filter(
            buyer=buyer,
            status=Contract.STATUS_COMPLETED
        ).values('crop_name').annotate(
            total_quantity=Sum('quantity_kg'),
            avg_price=Avg('price_per_kg')
        )
        
        # Also get crops from buyer's CropStandards
        from standardApp.models import CropStandard
        interested_crops = CropStandard.objects.filter(
            created_by=buyer,
            status='active'
        ).values_list('crop_name', flat=True).distinct()
        
        crops_to_analyze = set()
        for purchase in previous_purchases:
            crops_to_analyze.add(purchase['crop_name'])
        for crop in interested_crops:
            crops_to_analyze.add(crop)
        
        for crop_name in crops_to_analyze:
            market_summary = self.get_market_summary(crop_name)
            
            if not market_summary:
                continue
            
            recommendation = {
                'product': crop_name,
                'current_market_price': market_summary['current_avg_price'],
                'price_trend': market_summary['trend'],
                'price_trend_text': market_summary['trend_text'],
                'trend_percentage': market_summary['trend_percentage'],
                'predicted_price': market_summary['predicted_price'],
                'price_range': market_summary['price_range'],
                'recommendation': self._generate_buyer_recommendation(market_summary),
            }
            
            # Add previous purchase context if available
            for purchase in previous_purchases:
                if purchase['crop_name'] == crop_name:
                    recommendation['your_avg_purchase_price'] = round(float(purchase['avg_price']), 2)
                    recommendation['price_vs_your_avg'] = round(
                        market_summary['current_avg_price'] - float(purchase['avg_price']), 2
                    )
                    recommendation['price_comparison_text'] = self._get_price_comparison_text(
                        recommendation['price_vs_your_avg']
                    )
                    break
            
            recommendations.append(recommendation)
        
        # Sort by urgency/opportunity
        urgency_order = {'buy_now': 0, 'wait': 1, 'monitor': 2}
        recommendations.sort(key=lambda x: urgency_order.get(x['recommendation'].get('action', 'monitor'), 3))
        
        return recommendations
    
    def _get_price_comparison_text(self, difference):
        """Get translated price comparison text"""
        if difference > 0:
            return nt("price_higher_than_before", self.lang, amount=abs(difference))
        elif difference < 0:
            return nt("price_lower_than_before", self.lang, amount=abs(difference))
        else:
            return nt("price_same_as_before", self.lang)
    
    def _generate_buyer_recommendation(self, market_summary):
        """
        Generate specific recommendation for buyers.
        """
        trend = market_summary['trend']
        predicted = market_summary['predicted_price']
        current = market_summary['current_avg_price']
        
        if trend == 'down' and predicted and predicted < current:
            return {
                'action': 'wait',
                'message': nt("buyer_wait_prices_falling", self.lang, change=market_summary['trend_percentage']),
                'urgency': 'low',
                'urgency_text': nt("urgency_low", self.lang)
            }
        elif trend == 'down' and predicted and predicted > current:
            return {
                'action': 'buy_now',
                'message': nt("buyer_buy_now_recovering", self.lang),
                'urgency': 'high',
                'urgency_text': nt("urgency_high", self.lang)
            }
        elif trend == 'up' and predicted and predicted > current:
            return {
                'action': 'buy_now',
                'message': nt("buyer_buy_now_rising", self.lang, change=market_summary['trend_percentage']),
                'urgency': 'high',
                'urgency_text': nt("urgency_high", self.lang)
            }
        elif trend == 'up' and predicted and predicted < current:
            return {
                'action': 'wait',
                'message': nt("buyer_wait_stabilizing", self.lang),
                'urgency': 'medium',
                'urgency_text': nt("urgency_medium", self.lang)
            }
        else:
            return {
                'action': 'monitor',
                'message': nt("buyer_monitor_market", self.lang),
                'urgency': 'low',
                'urgency_text': nt("urgency_low", self.lang)
            }


class NotificationScheduler:
    """
    Handle automated notifications for market predictions.
    """
    
    @staticmethod
    def send_daily_market_updates():
        """
        Send daily market updates to all farmers and buyers.
        Can be called from a cron job or Celery task.
        """
        from notificationApp.services import notify_user
        from notificationApp.translations import nt
        
        # Get all top crops being traded
        top_crops = Contract.objects.filter(
            status=Contract.STATUS_COMPLETED
        ).values('crop_name').annotate(
            total=Sum('quantity_kg')
        ).order_by('-total')[:10]
        
        # Send to farmers
        farmers = CustomUser.objects.filter(role='farmer', status=True, is_active=True)
        for farmer in farmers:
            lang = farmer.language or 'en'
            farmer_service = MarketPredictionService(lang=lang)
            
            # Get personalized recommendations
            recommendations = farmer_service.get_farmer_recommendation(farmer)
            urgent_stocks = [r for r in recommendations if r['recommendation'].get('urgency') == 'high']
            
            if urgent_stocks:
                title = nt("market_alert_urgent", lang)
                products = ', '.join([s['product'] for s in urgent_stocks[:3]])
                description = nt("market_alert_urgent_desc", lang, products=products)
                notify_user(farmer, title, description, notification_type='market_alert')
        
        # Send to buyers
        buyers = CustomUser.objects.filter(role='buyer', status=True, is_active=True)
        for buyer in buyers:
            lang = buyer.language or 'en'
            buyer_service = MarketPredictionService(lang=lang)
            recommendations = buyer_service.get_buyer_recommendation(buyer)
            
            buy_opportunities = [r for r in recommendations if r['recommendation'].get('action') == 'buy_now']
            
            if buy_opportunities:
                title = nt("buying_opportunity_title", lang)
                products = ', '.join([o['product'] for o in buy_opportunities[:3]])
                description = nt("buying_opportunity_desc", lang, products=products)
                notify_user(buyer, title, description, notification_type='market_opportunity')