from django.urls import path
from . import views

urlpatterns = [
    # Admin Reports
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/user-growth/', views.AdminUserGrowthView.as_view(), name='admin-user-growth'),
    path('admin/stocks/', views.AdminStockReportView.as_view(), name='admin-stock-report'),
    path('admin/contracts/', views.AdminContractReportView.as_view(), name='admin-contract-report'),
    path('admin/payments/', views.AdminPaymentReportView.as_view(), name='admin-payment-report'),
    
    # Farmer Reports
    path('farmer/dashboard/', views.FarmerDashboardView.as_view(), name='farmer-dashboard'),
    path('farmer/stock-performance/', views.FarmerStockPerformanceView.as_view(), name='farmer-stock-performance'),
    path('farmer/contract-history/', views.FarmerContractHistoryView.as_view(), name='farmer-contract-history'),
    
    # Buyer Reports
    path('buyer/dashboard/', views.BuyerDashboardView.as_view(), name='buyer-dashboard'),
    path('buyer/crop-standards/', views.BuyerCropStandardsReportView.as_view(), name='buyer-crop-standards'),
    path('buyer/purchase-history/', views.BuyerPurchaseHistoryView.as_view(), name='buyer-purchase-history'),
    
    # Market Matching Reports
    path('market-matching/farmer-matches/', views.FarmerMatchesReportView.as_view(), name='farmer-matches-report'),
    path('market-matching/buyer-matches/', views.BuyerMatchesReportView.as_view(), name='buyer-matches-report'),
    path('market-matching/all-matches/', views.AllMatchesReportView.as_view(), name='all-matches-report'),
    path('market-matching/trends/', views.MatchTrendsView.as_view(), name='match-trends'),
    
    # Standards Report
    path('standards/', views.StandardsReportView.as_view(), name='standards-report'),
    
    # Enhanced Reports
    path('admin/enhanced-contracts/', views.EnhancedContractReportView.as_view(), name='enhanced-contracts-report'),
]