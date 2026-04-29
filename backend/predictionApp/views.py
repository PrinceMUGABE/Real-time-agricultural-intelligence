# predictionApp/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.cache import cache
from django.utils import timezone

from .service import MarketPredictionService
from notificationApp.translations import nt  # Changed from 't' to 'nt'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def market_summary(request, crop_name):
    """
    Get market summary and prediction for a specific crop.
    Accessible by both farmers and buyers.
    """
    lang = request.lang
    service = MarketPredictionService(lang=lang)
    summary = service.get_market_summary(crop_name)
    
    if not summary:
        return Response({
            'error': nt("market_insufficient_data", lang, crop=crop_name),
            'message': nt("market_need_more_data", lang, crop=crop_name)
        }, status=404)
    
    # Add translated labels for frontend
    summary['labels'] = {
        'current_price': nt("market_current_price", lang),
        'price_range': nt("market_price_range", lang),
        'price_change': nt("market_price_change", lang),
        'trend': nt("market_trend", lang),
        'predicted_price': nt("market_predicted_price", lang),
        'total_volume': nt("market_total_volume", lang),
        'transactions': nt("market_transactions", lang),
        'recommendation': nt("market_recommendation", lang),
        'confidence': nt("market_confidence", lang)
    }
    
    return Response(summary, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farmer_market_recommendations(request):
    """
    Get personalized market recommendations for the logged-in farmer.
    """
    lang = request.lang
    
    if request.user.role != 'farmer':
        return Response({
            'error': nt("farmers_only_endpoint", lang)
        }, status=403)
    
    service = MarketPredictionService(lang=lang)
    recommendations = service.get_farmer_recommendation(request.user)
    
    # Get overall market summary for top crops
    top_crops = set([r['product'] for r in recommendations])
    market_summaries = {}
    for crop in top_crops:
        market_summaries[crop] = service.get_market_summary(crop)
    
    # Get translated summary header
    summary_text = nt("farmer_recommendations_summary", lang)
    if not recommendations:
        summary_text = nt("farmer_no_stocks", lang)
    
    response_data = {
        'your_stocks_recommendations': recommendations,
        'market_summaries': market_summaries,
        'summary': summary_text,
        'last_updated': cache.get('market_last_updated', 'N/A'),
        'labels': {
            'stock': nt("farmer_stock_label", lang),
            'current_value': nt("farmer_current_value_label", lang),
            'predicted_value': nt("farmer_predicted_value_label", lang),
            'recommendation': nt("market_recommendation", lang),
            'urgency': nt("farmer_urgency_label", lang),
            'action_taken': nt("farmer_action_taken", lang)
        }
    }
    
    return Response(response_data, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buyer_market_recommendations(request):
    """
    Get personalized market recommendations for the logged-in buyer.
    """
    lang = request.lang
    
    if request.user.role != 'buyer':
        return Response({
            'error': nt("buyers_only_endpoint", lang)
        }, status=403)
    
    service = MarketPredictionService(lang=lang)
    recommendations = service.get_buyer_recommendation(request.user)
    
    response_data = {
        'buying_recommendations': recommendations,
        'advice': nt("buyer_daily_advice", lang),
        'last_updated': cache.get('market_last_updated', 'N/A'),
        'labels': {
            'product': nt("buyer_product_label", lang),
            'current_price': nt("market_current_price", lang),
            'predicted_price': nt("market_predicted_price", lang),
            'trend': nt("market_trend", lang),
            'recommendation': nt("market_recommendation", lang),
            'action': nt("buyer_action_label", lang)
        }
    }
    
    return Response(response_data, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_markets_overview(request):
    """
    Get overview of all active markets with predictions.
    Accessible by both farmers and buyers.
    """
    lang = request.lang
    service = MarketPredictionService(lang=lang)
    
    # Get all crops that have completed contracts
    from contractApp.models import Contract
    crops = Contract.objects.filter(
        status=Contract.STATUS_COMPLETED
    ).values_list('crop_name', flat=True).distinct()
    
    market_data = {}
    for crop in crops[:20]:  # Limit to 20 crops
        summary = service.get_market_summary(crop)
        if summary:
            market_data[crop] = {
                'current_price': summary['current_avg_price'],
                'trend': summary['trend'],
                'trend_text': summary['trend_text'],
                'trend_percentage': summary['trend_percentage'],
                'predicted_price': summary['predicted_price'],
                'recommendation_action': summary['recommendation']['action'] if summary['recommendation'] else 'neutral',
                'recommendation_text': summary['recommendation']['message'] if summary['recommendation'] else nt("market_neutral", lang)
            }
    
    return Response({
        'markets': market_data,
        'total_crops_analyzed': len(market_data),
        'disclaimer': nt("market_disclaimer", lang),
        'labels': {
            'crop': nt("market_crop_label", lang),
            'current_price': nt("market_current_price", lang),
            'prediction': nt("market_prediction_label", lang),
            'recommendation': nt("market_recommendation", lang)
        }
    }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stock_specific_prediction(request, stock_id):
    """
    Get prediction specifically for a farmer's particular stock.
    """
    lang = request.lang
    print(f"=== PREDICTION DEBUG ===")
    print(f"User: {request.user.full_name} (Role: {request.user.role})")
    print(f"Stock ID requested: {stock_id}")
    print(f"Language: {lang}")
    
    if request.user.role != 'farmer':
        return Response({
            'error': nt("farmers_only_endpoint", lang)
        }, status=403)
    
    from stockApp.models import Stock
    
    try:
        stock = Stock.objects.get(id=stock_id, farmer=request.user)
    except Stock.DoesNotExist:
        print(f"Stock with ID {stock_id} not found for user {request.user.full_name}")
        return Response({
            'error': nt("stock_not_found", lang)
        }, status=404)
    
    service = MarketPredictionService(lang=lang)
    market_summary = service.get_market_summary(stock.product_name)
    
    if not market_summary:
        print(f"No market summary found for product {stock.product_name}")
        return Response({
            'error': nt("market_insufficient_data_stock", lang, product=stock.product_name),
            'stock_details': {
                'product': stock.product_name,
                'quantity': float(stock.quantity),
                'quality': stock.quality_grade,
                'quality_text': service._get_quality_text(stock.quality_grade),
                'created_at': stock.created_at.strftime('%Y-%m-%d')
            }
        }, status=404)
    
    current_value = float(stock.quantity) * market_summary['current_avg_price']
    predicted_value = float(stock.quantity) * (market_summary['predicted_price'] or market_summary['current_avg_price'])
    
    response_data = {
        'stock': {
            'id': stock.id,
            'product': stock.product_name,
            'quantity_kg': float(stock.quantity),
            'quality_grade': stock.quality_grade,
            'quality_text': service._get_quality_text(stock.quality_grade),
            'days_in_stock': (timezone.now() - stock.created_at).days,
            'created_at': stock.created_at.strftime('%Y-%m-%d')
        },
        'market_analysis': market_summary,
        'financial_analysis': {
            'estimated_current_value_rwf': round(current_value, 2),
            'estimated_future_value_rwf': round(predicted_value, 2),
            'potential_gain_loss': round(predicted_value - current_value, 2),
            'percentage_change': round(((predicted_value - current_value) / current_value) * 100, 2) if current_value > 0 else 0
        },
        'recommendation': market_summary['recommendation'],
        'labels': {
            'current_value': nt("stock_current_value", lang),
            'future_value': nt("stock_future_value", lang),
            'potential_change': nt("stock_potential_change", lang),
            'advice': nt("stock_advice", lang)
        }
    }
    
    return Response(response_data, status=200)