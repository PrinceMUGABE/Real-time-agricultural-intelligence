from django.urls import path
from . import views

app_name = 'stock'

urlpatterns = [
    # ==================== FARMER-SPECIFIC ENDPOINTS ====================
    # Farmer's own stocks
    path('farmer/stocks/', views.get_farmer_stocks, name='farmer_stocks'),
    path('farmer/stocks/summary/', views.get_farmer_stock_summary, name='farmer_stock_summary'),
    path('farmer/stocks/<int:stock_id>/', views.get_farmer_stock_detail, name='farmer_stock_detail'),
    path('farmer/stocks/<int:stock_id>/movements/', views.get_farmer_stock_movements, name='farmer_stock_movements'),
    
    # Farmer's own movements
    path('farmer/movements/', views.get_farmer_movements, name='farmer_movements'),
    path('farmer/movements/recent/', views.get_farmer_recent_movements, name='farmer_recent_movements'),
    
    # Farmer's dashboard
    path('farmer/dashboard/', views.get_farmer_dashboard, name='farmer_dashboard'),
    
    # Farmer's alerts
    path('farmer/alerts/', views.get_farmer_alerts, name='farmer_alerts'),
    path('farmer/alerts/unresolved/', views.get_farmer_unresolved_alerts, name='farmer_unresolved_alerts'),
    
    # ==================== GENERAL STOCK MANAGEMENT ====================
    # Stock management (accessible based on permissions)
    path('stocks/', views.list_stocks, name='list_stocks'),
    path('stocks/create/', views.create_stock, name='create_stock'),
    path('stocks/<int:stock_id>/', views.get_stock_detail, name='stock_detail'),
    path('stocks/<int:stock_id>/update/', views.update_stock, name='update_stock'),
    path('stocks/<int:stock_id>/delete/', views.delete_stock, name='delete_stock'),
    
    # Stock movements
    path('stocks/<int:stock_id>/movements/', views.list_stock_movements, name='list_stock_movements'),
    path('movements/', views.list_movements, name='list_movements'),
    path('movements/create/', views.create_movement, name='create_movement'),
    path('movements/<int:movement_id>/', views.get_movement_detail, name='movement_detail'),
    path('movements/<int:movement_id>/update/', views.update_movement, name='update_movement'),
    path('movements/<int:movement_id>/delete/', views.delete_movement, name='delete_movement'),
    
    # ==================== DASHBOARD & ANALYTICS ====================
    path('dashboard/', views.get_dashboard_summary, name='dashboard'),
    
    # ==================== ALERTS ====================
    path('alerts/', views.list_alerts, name='list_alerts'),
    path('alerts/<int:alert_id>/resolve/', views.resolve_alert, name='resolve_alert'),
]