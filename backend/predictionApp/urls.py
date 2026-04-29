# predictionApp/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('market/<str:crop_name>/', views.market_summary, name='market_summary'),
    path('farmer/recommendations/', views.farmer_market_recommendations, name='farmer_recommendations'),
    path('buyer/recommendations/', views.buyer_market_recommendations, name='buyer_recommendations'),
    path('markets/overview/', views.all_markets_overview, name='markets_overview'),
    path('stock/<int:stock_id>/prediction/', views.stock_specific_prediction, name='stock_prediction'),
]