from django.urls import path
from . import views

urlpatterns = [
    # Farmer endpoints
    path('farmer/matches/', views.get_farmer_matches, name='farmer-matches'),
    path('farmer/matches/<int:stock_id>/<int:standard_id>/', views.get_farmer_match_detail, name='farmer-match-detail'),
    
    # Buyer endpoints
    path('buyer/matches/', views.get_buyer_matches, name='buyer-matches'),
    path('buyer/matches/<int:standard_id>/<int:stock_id>/', views.get_buyer_match_detail, name='buyer-match-detail'),
    
    # Admin endpoints
    path('admin/matches/', views.get_admin_matches, name='admin-matches'),
    path('admin/matches/<int:stock_id>/<int:standard_id>/', views.get_admin_match_detail, name='admin-match-detail'),
    
    # Dashboard & Statistics
    path('dashboard/', views.get_market_dashboard, name='market-dashboard'),
    path('statistics/', views.get_match_statistics, name='match-statistics'),
    
    # Actions
    path('matches/<int:stock_id>/<int:standard_id>/view/', views.record_match_view, name='record-match-view'),
]