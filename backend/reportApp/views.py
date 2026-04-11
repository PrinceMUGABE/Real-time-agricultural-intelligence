from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from userApp.models import CustomUser
from .serializers import ReportFilterSerializer, DateRangeSerializer
from .report_services import (
    AdminReportService, FarmerReportService, BuyerReportService, StandardsReportService
)
from .market_matching_reports import MarketMatchingReports, MarketMatchingTrends
import logging

logger = logging.getLogger(__name__)


class AdminDashboardView(APIView):
    """Admin dashboard summary and reports"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        date_filter_serializer = DateRangeSerializer(data=request.query_params)
        date_filter_serializer.is_valid(raise_exception=True)
        
        summary = AdminReportService.get_dashboard_summary(date_filter_serializer.validated_data)
        
        return Response({
            'summary': summary,
            'user': {
                'id': user.id,
                'name': user.full_name,
                'role': user.role
            }
        })


class AdminUserGrowthView(APIView):
    """Admin user growth report"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        period = request.query_params.get('period', 'month')
        growth_data = AdminReportService.get_user_growth_report(period)
        
        
        return Response(growth_data)


class AdminStockReportView(APIView):
    """Admin stock report"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        filter_serializer = ReportFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        
        stock_report = AdminReportService.get_stock_report(filter_serializer.validated_data)
        
        return Response(stock_report)


class AdminContractReportView(APIView):
    """Admin contract report"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        filter_serializer = ReportFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        
        contract_report = AdminReportService.get_contract_report(filter_serializer.validated_data)
        
        return Response(contract_report)


class AdminPaymentReportView(APIView):
    """Admin payment report"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        payment_report = AdminReportService.get_payment_report()
        
        return Response(payment_report)


class FarmerDashboardView(APIView):
    """Farmer dashboard summary"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'farmer':
            return Response(
                {'error': 'Farmer access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        date_filter_serializer = DateRangeSerializer(data=request.query_params)
        date_filter_serializer.is_valid(raise_exception=True)
        
        summary = FarmerReportService.get_dashboard_summary(
            user.id, 
            date_filter_serializer.validated_data
        )
        
        return Response({
            'summary': summary,
            'user': {
                'id': user.id,
                'name': user.full_name,
                'role': user.role,
                'location': user.location,
                'phone': user.phone_number
            }
        })


class FarmerStockPerformanceView(APIView):
    """Farmer stock performance report"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'farmer':
            return Response(
                {'error': 'Farmer access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        performance = FarmerReportService.get_stock_performance(user.id)
        
        return Response(performance)


class FarmerContractHistoryView(APIView):
    """Farmer contract history report"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'farmer':
            return Response(
                {'error': 'Farmer access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        filter_serializer = ReportFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        
        history = FarmerReportService.get_contract_history(
            user.id,
            filter_serializer.validated_data
        )
        
        return Response(history)


class BuyerDashboardView(APIView):
    """Buyer dashboard summary"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'buyer':
            return Response(
                {'error': 'Buyer access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        date_filter_serializer = DateRangeSerializer(data=request.query_params)
        date_filter_serializer.is_valid(raise_exception=True)
        
        summary = BuyerReportService.get_dashboard_summary(
            user.id,
            date_filter_serializer.validated_data
        )
        
        return Response({
            'summary': summary,
            'user': {
                'id': user.id,
                'name': user.full_name,
                'role': user.role,
                'location': user.location,
                'phone': user.phone_number
            }
        })


class BuyerCropStandardsReportView(APIView):
    """Buyer crop standards report"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'buyer':
            return Response(
                {'error': 'Buyer access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        filter_serializer = ReportFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        
        standards = BuyerReportService.get_crop_standards_report(
            user.id,
            filter_serializer.validated_data
        )
        
        return Response(standards)


class BuyerPurchaseHistoryView(APIView):
    """Buyer purchase history report"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'buyer':
            return Response(
                {'error': 'Buyer access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        filter_serializer = ReportFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        
        history = BuyerReportService.get_purchase_history(
            user.id,
            filter_serializer.validated_data
        )
        
        return Response(history)


# Market Matching Report Views
class FarmerMatchesReportView(APIView):
    """Generate market matching report for a farmer"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'farmer':
            return Response(
                {'error': 'Farmer access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        filter_serializer = ReportFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        
        report = MarketMatchingReports.get_farmer_matches_report(
            user.id,
            filter_serializer.validated_data
        )
        
        if report is None:
            return Response(
                {'error': 'Failed to generate report'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(report)


class BuyerMatchesReportView(APIView):
    """Generate market matching report for a buyer"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'buyer':
            return Response(
                {'error': 'Buyer access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        filter_serializer = ReportFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        
        report = MarketMatchingReports.get_buyer_matches_report(
            user.id,
            filter_serializer.validated_data
        )
        
        if report is None:
            return Response(
                {'error': 'Failed to generate report'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(report)


class AllMatchesReportView(APIView):
    """Generate overall market matching report for admin"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        filter_serializer = ReportFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        
        report = MarketMatchingReports.get_all_matches_report(
            filter_serializer.validated_data
        )
        
        if report is None:
            return Response(
                {'error': 'Failed to generate report'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(report)


class MatchTrendsView(APIView):
    """Get market matching trends over time"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        days = int(request.query_params.get('days', 30))
        trends = MarketMatchingTrends.get_match_trends(days)
        
        return Response(trends)
    
    
    
    
class StandardsReportView(APIView):
    """Generate crop standards report"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        # Allow admin and buyers to view standards report
        if user.role not in ['admin', 'buyer']:
            return Response(
                {'error': 'Admin or buyer access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        filter_serializer = ReportFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        
        # If buyer, only show their own standards
        if user.role == 'buyer':
            filters = filter_serializer.validated_data
            filters['buyer_id'] = user.id
        
        report = StandardsReportService.get_standards_report(filter_serializer.validated_data)
        
        if report is None:
            return Response(
                {'error': 'Failed to generate report'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(report)
    

class EnhancedContractReportView(APIView):
    """Enhanced contract report with professional summaries"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        if user.role != 'admin':
            return Response(
                {'error': 'Admin access required'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        filter_serializer = ReportFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        
        report = AdminReportService.get_contract_report(filter_serializer.validated_data)
        
        return Response(report)