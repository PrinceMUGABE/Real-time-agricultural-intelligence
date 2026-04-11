/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FileText, Download, Filter, ChevronDown, ChevronUp,
  Users, Package, Handshake, DollarSign, TrendingUp, TrendingDown,
  RefreshCw, Search, FileSpreadsheet,
  CheckCircle, AlertCircle, User, Loader2,
  Shield, Database, TrendingUp as TrendIcon, Wallet, Receipt,
  Leaf, Sprout, Star, Eye as EyeIcon, Sliders, Calendar,
  MapPin, Phone, Mail, Clock, Award, Truck, CreditCard, Smartphone
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = "http://127.0.0.1:8000";

const iconToImageData = (iconElement, size = 16, color = '#2d5a2d') => {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Draw a simple representation of common icons
  ctx.fillStyle = color;

  // This is a simplified approach - for production, you'd want to render the actual icon
  // For now, we'll use Unicode characters as they work reliably in PDFs
  return null;
};

// Helper to get icon character based on type
const getIconChar = (iconType) => {
  const icons = {
    'total_users': '👥',
    'total_farmers': '👨‍🌾',
    'total_buyers': '🛒',
    'total_quantity': '📦',
    'total_value': '💰',
    'total_stocks': '📊',
    'total_contracts': '📝',
    'completion_rate': '✅',
    'total_payments': '💵',
    'total_transactions': '🔄',
    'avg_transaction': '📈',
    'total_standards': '🌾',
    'active_standards': '⭐',
    'total_potential_value': '💎',
    'total_matches': '🎯',
    'average_score': '🏆',
    'default': '📋'
  };
  return icons[iconType] || icons.default;
};

// Helper Functions
const formatCurrency = (value) => {
  if (!value && value !== 0) return "0 RWF";
  return `${Number(value).toLocaleString()} RWF`;
};

const formatNumber = (value) => {
  if (!value && value !== 0) return "0";
  return Number(value).toLocaleString();
};

const formatPercentage = (value) => {
  if (!value && value !== 0) return "0%";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toFixed(1)}%`;
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

const getAuthToken = () => {
  return localStorage.getItem('access_token') || localStorage.getItem('accessToken') || '';
};

const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const lang = localStorage.getItem("language") || "en";
  config.headers['Accept-Language'] = lang;
  return config;
});

// ============================================================================
// COLUMN VISIBILITY MANAGER COMPONENT
// ============================================================================
function ColumnVisibilityManager({ columns, visibleColumns, onToggleColumn, onSelectAll, onClearAll }) {
  const { t } = useTranslation();
  const [showManager, setShowManager] = useState(false);

  return (
    <div className="column-manager">
      <button className="btn-manage-columns" onClick={() => setShowManager(!showManager)}>
        <EyeIcon size={16} />
        {t('manage_columns')}
        <ChevronDown size={12} />
      </button>

      {showManager && (
        <div className="column-dropdown">
          <div className="dropdown-header">
            <strong>{t('select_columns_to_display')}</strong>
            <div className="dropdown-actions">
              <button onClick={onSelectAll}>{t('select_all')}</button>
              <button onClick={onClearAll}>{t('clear_all')}</button>
            </div>
          </div>
          <div className="dropdown-body">
            {columns.map(col => (
              <label key={col.key} className="column-checkbox">
                <input
                  type="checkbox"
                  checked={visibleColumns[col.key] !== false}
                  onChange={() => onToggleColumn(col.key)}
                />
                <span>{t(col.label)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUMMARY CARD COMPONENT
// ============================================================================
function SummaryCard({ title, value, icon, color }) {
  const { t } = useTranslation();

  return (
    <div className="summary-card">
      <div className="summary-card-icon" style={{ backgroundColor: `${color}15`, color: color }}>
        {icon}
      </div>
      <div className="summary-card-info">
        <p className="summary-card-title">{t(title)}</p>
        <h3 className="summary-card-value">{value}</h3>
      </div>
    </div>
  );
}


// ============================================================================
// MAIN ENHANCED REPORTS COMPONENT
// ============================================================================
export default function EnhancedReports() {
  const { t } = useTranslation();

  // State
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('users');
  const [reportData, setReportData] = useState([]);
  const [reportSummary, setReportSummary] = useState({});
  const [reportAnalytics, setReportAnalytics] = useState({});
  const [reportColumns, setReportColumns] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState({});
  const [filters, setFilters] = useState({
    period: 'month',
    startDate: '',
    endDate: '',
    status: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Report Types Configuration
  const reportTypes = [
    {
      value: 'users',
      label: 'user_growth_report',
      icon: <Users size={18} />,
      endpoint: '/reports/admin/user-growth/',
      hasAnalytics: false,
      columns: [
        { key: 'id', label: 'user_id', type: 'number' },
        { key: 'full_name', label: 'full_name', type: 'text' },
        { key: 'phone_number', label: 'phone_number', type: 'text' },
        { key: 'email', label: 'email', type: 'text' },
        { key: 'role', label: 'role', type: 'text' },
        { key: 'location', label: 'location', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'language', label: 'language', type: 'text' },
        { key: 'created_at', label: 'registered_date', type: 'date' }
      ]
    },
    {
      value: 'stocks',
      label: 'stock_reports',
      icon: <Package size={18} />,
      endpoint: '/reports/admin/stocks/',
      hasAnalytics: true,
      columns: [
        { key: 'product', label: 'product', type: 'text' },
        { key: 'farmer', label: 'farmer', type: 'text' },
        { key: 'quantity', label: 'quantity', type: 'number' },
        { key: 'price_per_kg', label: 'price_per_kg', type: 'currency' },
        { key: 'total_value', label: 'total_value', type: 'currency' },
        { key: 'location', label: 'location', type: 'text' },
        { key: 'quality', label: 'quality', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'created_at', label: 'created_date', type: 'date' }
      ]
    },
    {
      value: 'contracts',
      label: 'contract_reports',
      icon: <Handshake size={18} />,
      endpoint: '/reports/admin/contracts/',
      hasAnalytics: true,
      columns: [
        { key: 'id', label: 'contract_id', type: 'number' },
        { key: 'crop_name', label: 'crop', type: 'text' },
        { key: 'farmer', label: 'farmer', type: 'text' },
        { key: 'buyer', label: 'buyer', type: 'text' },
        { key: 'quantity', label: 'quantity', type: 'number' },
        { key: 'price_per_kg', label: 'price_per_kg', type: 'currency' },
        { key: 'total_amount', label: 'total_amount', type: 'currency' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'payment_status', label: 'payment_status', type: 'text' },
        { key: 'delivery_status', label: 'delivery_status', type: 'text' },
        { key: 'is_fully_completed', label: 'fully_completed', type: 'text' },
        { key: 'created_at', label: 'created_date', type: 'date' }
      ]
    },
    {
      value: 'payments',
      label: 'payment_reports',
      icon: <Wallet size={18} />,
      endpoint: '/reports/admin/payments/',
      hasAnalytics: true,
      columns: [
        { key: 'id', label: 'payment_id', type: 'number' },
        { key: 'contract_id', label: 'contract_id', type: 'number' },
        { key: 'crop_name', label: 'crop', type: 'text' },
        { key: 'payer', label: 'payer', type: 'text' },
        { key: 'receiver', label: 'receiver', type: 'text' },
        { key: 'amount', label: 'amount', type: 'currency' },
        { key: 'payment_method', label: 'payment_method', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'paid_at', label: 'payment_date', type: 'date' }
      ]
    },
    {
      value: 'standards',
      label: 'crop_standards',
      icon: <Leaf size={18} />,
      endpoint: '/reports/standards/',
      hasAnalytics: true,
      columns: [
        { key: 'id', label: 'standard_id', type: 'number' },
        { key: 'crop_name', label: 'crop', type: 'text' },
        { key: 'crop_type', label: 'crop_type', type: 'text' },
        { key: 'season', label: 'season', type: 'text' },
        { key: 'quality_grade', label: 'quality', type: 'text' },
        { key: 'price_per_kg', label: 'price_per_kg', type: 'currency' },
        { key: 'min_quantity', label: 'min_quantity', type: 'number' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'buyer_name', label: 'buyer', type: 'text' },
        { key: 'created_at', label: 'created_date', type: 'date' }
      ]
    },
    {
      value: 'matches',
      label: 'market_matches',
      icon: <Star size={18} />,
      endpoint: '/reports/market-matching/all-matches/',
      hasAnalytics: true,
      columns: [
        { key: 'product', label: 'product', type: 'text' },
        { key: 'farmer', label: 'farmer', type: 'text' },
        { key: 'buyer', label: 'buyer', type: 'text' },
        { key: 'match_score', label: 'match_score', type: 'percentage' },
        { key: 'quantity', label: 'quantity', type: 'number' },
        { key: 'farmer_price', label: 'farmer_price', type: 'currency' },
        { key: 'buyer_price', label: 'buyer_price', type: 'currency' },
        { key: 'location', label: 'location', type: 'text' }
      ]
    }
  ];

  // Initialize visible columns when report type changes
  useEffect(() => {
    const currentConfig = reportTypes.find(r => r.value === reportType);
    if (currentConfig && currentConfig.columns) {
      const initialVisible = {};
      currentConfig.columns.forEach(col => {
        initialVisible[col.key] = true;
      });
      setVisibleColumns(initialVisible);
    }
  }, [reportType]);

  // Process API response data
  const processReportData = useCallback((data, type) => {
    switch (type) {
      case 'users':
        // FIXED: Use the detailed users array from API response
        if (data.users && Array.isArray(data.users) && data.users.length > 0) {
          return data.users.map(user => ({
            id: user.id,
            full_name: user.full_name || 'N/A',
            phone_number: user.phone_number || 'N/A',
            email: user.email || 'N/A',
            role: user.role || 'N/A',
            location: user.location || 'N/A',
            status: user.status || (user.is_active ? 'Active' : 'Inactive'),
            language: user.language || 'en',
            created_at: user.created_at
          }));
        }
        // Fallback to chart data if no detailed users
        if (data.labels && data.labels.length > 0) {
          return data.labels.map((label, index) => ({
            period: label,
            total_users: data.datasets?.[0]?.data?.[index] || 0,
            farmers: data.datasets?.[1]?.data?.[index] || 0,
            buyers: data.datasets?.[2]?.data?.[index] || 0
          }));
        }
        return [];

      case 'stocks':
        if (data.stocks && Array.isArray(data.stocks)) {
          return data.stocks.map(stock => ({
            product: stock.product_name || 'N/A',
            farmer: stock.farmer_name || 'N/A',
            quantity: stock.quantity,
            price_per_kg: stock.price_per_kg,
            total_value: (stock.quantity || 0) * (stock.price_per_kg || 0),
            location: stock.location || 'N/A',
            quality: stock.quality_grade || 'N/A',
            status: stock.is_active ? 'Active' : 'Inactive',
            created_at: stock.created_at
          }));
        }
        if (data.by_product?.details) {
          return data.by_product.details.map(item => ({
            product: item.product || 'N/A',
            quantity: item.quantity,
            total_value: item.value,
            avg_price: item.avg_price,
            listings_count: item.count || 0
          }));
        }
        return [];

      case 'contracts':
        if (data.contracts && Array.isArray(data.contracts)) {
          return data.contracts.map(contract => {
            // Check if contract is fully completed (both payment and delivery completed)
            const isFullyCompleted = contract.payment_status === 'completed' && contract.delivery_status === 'completed';
            return {
              id: contract.id,
              crop_name: contract.crop_name || 'N/A',
              farmer: contract.farmer_name || 'N/A',
              buyer: contract.buyer_name || 'N/A',
              quantity: contract.quantity_kg,
              price_per_kg: contract.price_per_kg,
              total_amount: contract.total_amount,
              status: contract.status || 'N/A',
              payment_status: contract.payment_status || 'N/A',
              delivery_status: contract.delivery_status || 'N/A',
              is_fully_completed: isFullyCompleted ? 'Yes' : 'No',
              created_at: contract.created_at
            };
          });
        }
        if (data.by_product?.details) {
          return data.by_product.details.map(item => ({
            product: item.product || 'N/A',
            contracts_count: item.count || 0,
            total_quantity: item.quantity,
            total_value: item.value,
            avg_price: item.avg_price
          }));
        }
        return [];

      case 'payments':
        if (data.payments && Array.isArray(data.payments)) {
          return data.payments.map(payment => ({
            id: payment.id,
            contract_id: payment.contract_id || 'N/A',
            crop_name: payment.crop_name || 'N/A',
            payer: payment.payer_name || 'N/A',
            receiver: payment.receiver_name || 'N/A',
            amount: payment.amount,
            payment_method: payment.payment_method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer',
            status: payment.status || 'N/A',
            paid_at: payment.paid_at
          }));
        }
        if (data.over_time?.details) {
          return data.over_time.details.map(item => ({
            period: item.month || 'N/A',
            amount: item.amount,
            transaction_count: item.count || 0
          }));
        }
        return [];

      case 'standards':
        if (data.standards && Array.isArray(data.standards)) {
          return data.standards.map(standard => ({
            id: standard.id,
            crop_name: standard.crop_name || 'N/A',
            crop_type: standard.crop_type || 'N/A',
            season: standard.season || 'N/A',
            quality_grade: standard.quality_grade || 'N/A',
            price_per_kg: standard.price_per_kg,
            min_quantity: standard.min_quantity,
            status: standard.status || 'N/A',
            buyer_name: standard.buyer_name || 'N/A',
            created_at: standard.created_at
          }));
        }
        return [];

      case 'matches':
        if (!data.matches || !Array.isArray(data.matches)) return [];
        return data.matches.map((match, index) => ({
          id: index + 1,
          product: match.stock?.product_name || match.crop_standard?.crop_name || 'N/A',
          farmer: match.farmer?.full_name || 'N/A',
          buyer: match.buyer?.full_name || 'N/A',
          match_score: match.match_score || 0,
          quantity: match.available_quantity || match.stock?.quantity || 0,
          farmer_price: match.farmer_price || match.stock?.price_per_kg || 0,
          buyer_price: match.buyer_price || match.crop_standard?.price_per_kg || 0,
          location: match.stock?.location || match.farmer?.location || 'N/A'
        }));

      default:
        return [];
    }
  }, []);

  // Generate Report
  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      const config = reportTypes.find(r => r.value === reportType);
      if (!config) return;

      let params = {};
      if (reportType === 'users') {
        params.period = filters.period;
      }
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      if (filters.status) params.status = filters.status;

      const response = await apiClient.get(config.endpoint, { params });
      const data = response.data;
      console.log('API Response:', data);

      const processedData = processReportData(data, reportType);
      console.log('Processed Data:', processedData);
      setReportData(processedData);
      setReportSummary(data.summary || {});
      setReportAnalytics(data.analytics || {});

      // Extract columns from processed data
      if (processedData.length > 0) {
        const columns = Object.keys(processedData[0]).map(key => ({
          key: key,
          label: key.replace(/_/g, '_').toLowerCase()
        }));
        setReportColumns(columns);

        // Reset visible columns for new data
        const initialVisible = {};
        columns.forEach(col => {
          initialVisible[col.key] = true;
        });
        setVisibleColumns(initialVisible);
      }

      toast.success(t('report_generated_successfully'));
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error.response?.data?.error || t('failed_to_generate_report'));
    } finally {
      setLoading(false);
    }
  }, [reportType, filters, t, processReportData]);

  // Add these helper functions before the downloadPDF function
  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toLocaleString();
  };

  const getReportSubtitle = (type) => {
    const subtitles = {
      users: 'Complete user registration and activity overview',
      stocks: 'Agricultural stock inventory and valuation summary',
      contracts: 'Contract lifecycle and performance analysis',
      payments: 'Payment processing and financial transaction details',
      standards: 'Crop quality standards and requirements',
      matches: 'Market matching and supply-demand alignment'
    };
    return subtitles[type] || 'Comprehensive data analysis report';
  };

  // Download PDF
  const downloadPDF = async () => {
    try {
      setLoading(true);
      const config = reportTypes.find(r => r.value === reportType);
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      // Create new PDF document
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Helper function to get current date/time
      const getCurrentDateTime = () => {
        const now = new Date();
        return now.toLocaleString();
      };

      // Helper function to get report subtitle
      const getReportSubtitle = (type) => {
        const subtitles = {
          users: 'Complete user registration and activity overview',
          stocks: 'Agricultural stock inventory and valuation summary',
          contracts: 'Contract lifecycle and performance analysis',
          payments: 'Payment processing and financial transaction details',
          standards: 'Crop quality standards and requirements',
          matches: 'Market matching and supply-demand alignment'
        };
        return subtitles[type] || 'Comprehensive data analysis report';
      };

      // ========================================================================
      // HEADER SECTION
      // ========================================================================

      // Decorative top bar
      doc.setFillColor(45, 90, 45);
      doc.rect(0, 0, pageWidth, 8, 'F');

      // Company Name
      doc.setFontSize(18);
      doc.setTextColor(45, 90, 45);
      doc.setFont('helvetica', 'bold');
      doc.text(t('company_name') || 'AgriMarket Connect', margin, yPos + 8);

      // Confidential Badge
      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      const confidentialText = t('confidential').toUpperCase();
      const confidentialWidth = doc.getTextWidth(confidentialText);
      doc.text(confidentialText, pageWidth - margin - confidentialWidth, yPos + 8);

      yPos += 18;

      // Report Title
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(t(config.label).toUpperCase(), margin, yPos);

      yPos += 7;

      // Report Subtitle
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      const subtitleText = t(`${reportType}_report_subtitle`) || getReportSubtitle(reportType);
      doc.text(subtitleText, margin, yPos);

      yPos += 15;

      // ========================================================================
      // METADATA SECTION
      // ========================================================================

      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 28, 3, 3, 'F');
      doc.setDrawColor(45, 90, 45);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 28, 3, 3, 'S');

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');

      const col1X = margin + 5;
      const col2X = pageWidth / 2;
      let metaY = yPos + 8;

      doc.text(t('generated_on') + ':', col1X, metaY);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(getCurrentDateTime(), col1X + 28, metaY);

      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(t('generated_by') + ':', col2X, metaY);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(currentUser.full_name || 'System Admin', col2X + 28, metaY);

      metaY += 7;

      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(t('report_type') + ':', col1X, metaY);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(t(config.label).toUpperCase(), col1X + 28, metaY);

      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(t('total_records') + ':', col2X, metaY);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(formatNumber(reportData.length), col2X + 28, metaY);

      yPos += 38;

      // ========================================================================
      // KEY METRICS TABLE
      // ========================================================================

      if (Object.keys(reportSummary).length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(t('key_metrics'), margin, yPos);

        yPos += 8;

        // Build metrics data from summary
        const metricsData = [];

        Object.entries(reportSummary).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            let formattedValue = value;
            let displayKey = key.split('_').map(word =>
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');

            if (typeof value === 'number') {
              if (key.includes('value') || key.includes('payment') || key.includes('amount') || key.includes('price')) {
                formattedValue = formatCurrency(value);
              } else if (key.includes('rate') || key.includes('score') || key.includes('percentage')) {
                formattedValue = formatPercentage(value);
              } else {
                formattedValue = formatNumber(value);
              }
            }

            metricsData.push([displayKey, formattedValue]);
          }
        });

        // Create the key metrics table - USING autoTable CORRECTLY
        autoTable(doc, {
          startY: yPos,
          head: [[t('metric'), t('value')]],
          body: metricsData,
          theme: 'striped',
          headStyles: {
            fillColor: [45, 90, 45],
            textColor: 255,
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 5
          },
          bodyStyles: {
            fontSize: 9,
            cellPadding: 5
          },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 'auto' }
          },
          margin: { left: margin, right: margin }
        });

        yPos = doc.lastAutoTable.finalY + 10;
      }

      // ========================================================================
      // DETAILED DATA TABLE
      // ========================================================================

      // Check if we need a new page
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(t('detailed_data'), margin, yPos);

      yPos += 8;

      // Get visible columns (selected by user)
      const visibleCols = reportColumns.filter(col => visibleColumns[col.key] !== false);

      if (visibleCols.length === 0) {
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(t('no_columns_selected'), margin, yPos);
      } else if (reportData.length === 0) {
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(t('no_report_data'), margin, yPos);
      } else {
        // Prepare headers with translations
        const headers = visibleCols.map(col => t(col.label));

        // Prepare table data from report data
        const tableData = reportData.map(item => {
          return visibleCols.map(col => {
            let value = item[col.key];

            if (typeof value === 'number') {
              if (col.key.includes('amount') || col.key.includes('value') || col.key.includes('price')) {
                return formatCurrency(value);
              } else if (col.key.includes('score')) {
                return formatPercentage(value);
              }
              return formatNumber(value);
            }

            if (col.key.includes('date') && value) {
              return formatDate(value);
            }

            if (value === true || value === false) {
              return value ? 'Yes' : 'No';
            }

            return value || '-';
          });
        });

        // Calculate column widths based on content
        const calculateColumnWidths = () => {
          const widths = [];
          const minWidth = 25;
          const maxWidth = 60;

          headers.forEach((header, idx) => {
            let maxContentWidth = header.length * 1.5;

            tableData.slice(0, 50).forEach(row => {
              const contentLength = String(row[idx] || '').length;
              maxContentWidth = Math.max(maxContentWidth, contentLength * 1.2);
            });

            widths.push(Math.min(maxWidth, Math.max(minWidth, maxContentWidth)));
          });

          return widths;
        };

        const columnWidths = calculateColumnWidths();
        const columnStyles = {};
        columnWidths.forEach((width, idx) => {
          columnStyles[idx] = { cellWidth: width };
        });

        // Create the detailed data table - USING autoTable CORRECTLY
        autoTable(doc, {
          startY: yPos,
          head: [headers],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [45, 90, 45],
            textColor: 255,
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 4
          },
          bodyStyles: {
            fontSize: 7,
            cellPadding: 4,
            textColor: [50, 50, 50]
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          columnStyles: columnStyles,
          margin: { left: margin, right: margin },
          didDrawPage: (data) => {
            const pageCount = doc.internal.getNumberOfPages();
            const currentPageNum = doc.internal.getCurrentPageInfo().pageNumber;

            doc.setDrawColor(200, 200, 200);
            doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.setFont('helvetica', 'italic');

            const footerText = `${t('confidential_information')} - ${t('company_name') || 'AgriMarket Connect'}`;
            doc.text(footerText, margin, pageHeight - 6);

            const pageText = `${t('page')} ${currentPageNum} ${t('of')} ${pageCount}`;
            const pageTextWidth = doc.getTextWidth(pageText);
            doc.text(pageText, pageWidth - margin - pageTextWidth, pageHeight - 6);
          }
        });
      }

      // Save the PDF
      const fileName = `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success(t('pdf_downloaded_successfully'));

    } catch (error) {
      console.error('PDF download error:', error);
      toast.error(t('failed_to_download_pdf'));
    } finally {
      setLoading(false);
    }
  };

  // Download Excel
  const downloadExcel = () => {
    const config = reportTypes.find(r => r.value === reportType);
    const visibleCols = reportColumns.filter(col => visibleColumns[col.key] !== false);
    const exportData = reportData.map(item => {
      const exportItem = {};
      visibleCols.forEach(col => {
        let value = item[col.key];
        if (typeof value === 'number') {
          if (col.key.includes('amount') || col.key.includes('value') || col.key.includes('price')) {
            value = formatCurrency(value);
          } else if (col.key.includes('score')) {
            value = formatPercentage(value);
          }
        } else if (col.key.includes('date') && value) {
          value = formatDate(value);
        }
        exportItem[t(col.label)] = value || '-';
      });
      return exportItem;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t(config.label));
    XLSX.writeFile(workbook, `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(t('excel_downloaded'));
  };

  // Download CSV
  const downloadCSV = () => {
    const visibleCols = reportColumns.filter(col => visibleColumns[col.key] !== false);
    const headers = visibleCols.map(col => t(col.label));
    const csvRows = [headers.join(',')];

    for (const row of reportData) {
      const values = visibleCols.map(col => {
        let value = row[col.key];
        if (typeof value === 'number') {
          if (col.key.includes('amount') || col.key.includes('value') || col.key.includes('price')) {
            value = formatCurrency(value);
          } else if (col.key.includes('score')) {
            value = formatPercentage(value);
          } else {
            value = formatNumber(value);
          }
        } else if (col.key.includes('date') && value) {
          value = formatDate(value);
        }
        return `"${String(value || '').replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('csv_downloaded'));
  };

  // Column visibility handlers
  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: prev[columnKey] === false ? true : false
    }));
  };

  const selectAllColumns = () => {
    const allVisible = {};
    reportColumns.forEach(col => {
      allVisible[col.key] = true;
    });
    setVisibleColumns(allVisible);
  };

  const clearAllColumns = () => {
    const allHidden = {};
    reportColumns.forEach(col => {
      allHidden[col.key] = false;
    });
    setVisibleColumns(allHidden);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      period: 'month',
      startDate: '',
      endDate: '',
      status: '',
      search: ''
    });
    toast.info(t('filters_reset'));
  };

  // Get formatted visible data for table
  const getFormattedVisibleData = () => {
    const visibleCols = reportColumns.filter(col => visibleColumns[col.key] !== false);
    return reportData.map(row => {
      const formattedRow = {};
      visibleCols.forEach(col => {
        let value = row[col.key];
        if (typeof value === 'number') {
          if (col.key.includes('amount') || col.key.includes('value') || col.key.includes('price')) {
            formattedRow[t(col.label)] = formatCurrency(value);
          } else if (col.key.includes('score')) {
            formattedRow[t(col.label)] = formatPercentage(value);
          } else {
            formattedRow[t(col.label)] = formatNumber(value);
          }
        } else if (col.key.includes('date') && value) {
          formattedRow[t(col.label)] = formatDate(value);
        } else if (col.key.includes('status') || col.key.includes('is_fully_completed')) {
          formattedRow[t(col.label)] = value;
        } else {
          formattedRow[t(col.label)] = value || '-';
        }
      });
      return formattedRow;
    });
  };

  const visibleData = getFormattedVisibleData();
  const totalPages = Math.ceil(visibleData.length / pageSize);
  const paginatedData = visibleData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const currentConfig = reportTypes.find(r => r.value === reportType);

  // Render summary cards
  const renderSummaryCards = () => {
    if (Object.keys(reportSummary).length === 0) return null;

    const summaryConfigs = {
      users: [
        { key: 'total_users', label: 'total_users', icon: <Users size={20} />, color: '#2d5a2d' },
        { key: 'total_farmers', label: 'total_farmers', icon: <User size={20} />, color: '#1565c0' },
        { key: 'total_buyers', label: 'total_buyers', icon: <User size={20} />, color: '#b76e0a' }
      ],
      stocks: [
        { key: 'total_quantity', label: 'total_quantity', icon: <Package size={20} />, color: '#2d5a2d' },
        { key: 'total_value', label: 'total_value', icon: <DollarSign size={20} />, color: '#1565c0' },
        { key: 'total_stocks', label: 'total_stocks', icon: <Database size={20} />, color: '#b76e0a' }
      ],
      contracts: [
        { key: 'total_contracts', label: 'total_contracts', icon: <Handshake size={20} />, color: '#2d5a2d' },
        { key: 'total_value', label: 'total_value', icon: <DollarSign size={20} />, color: '#1565c0' },
        { key: 'completion_rate', label: 'completion_rate', icon: <CheckCircle size={20} />, color: '#b76e0a' }
      ],
      payments: [
        { key: 'total_payments', label: 'total_payments', icon: <DollarSign size={20} />, color: '#2d5a2d' },
        { key: 'total_transactions', label: 'total_transactions', icon: <Receipt size={20} />, color: '#1565c0' },
        { key: 'avg_payment_per_transaction', label: 'avg_transaction', icon: <TrendIcon size={20} />, color: '#b76e0a' }
      ],
      standards: [
        { key: 'total_standards', label: 'total_standards', icon: <Leaf size={20} />, color: '#2d5a2d' },
        { key: 'active_standards', label: 'active', icon: <CheckCircle size={20} />, color: '#1565c0' },
        { key: 'total_potential_value', label: 'potential_value', icon: <DollarSign size={20} />, color: '#b76e0a' }
      ],
      matches: [
        { key: 'total_matches', label: 'total_matches', icon: <Star size={20} />, color: '#2d5a2d' },
        { key: 'average_score', label: 'average_score', icon: <Award size={20} />, color: '#1565c0' },
        { key: 'total_potential_value', label: 'potential_value', icon: <DollarSign size={20} />, color: '#b76e0a' }
      ]
    };

    const cards = summaryConfigs[reportType] || [];
    if (cards.length === 0) return null;

    return (
      <div className="summary-cards">
        {cards.map(card => {
          let value = reportSummary[card.key];
          let formattedValue = value;
          if (typeof value === 'number') {
            if (card.key.includes('value') || card.key.includes('payment') || card.key.includes('amount')) {
              formattedValue = formatCurrency(value);
            } else if (card.key.includes('rate') || card.key.includes('score')) {
              formattedValue = formatPercentage(value);
            } else {
              formattedValue = formatNumber(value);
            }
          }
          return (
            <SummaryCard
              key={card.key}
              title={card.label}
              value={formattedValue}
              icon={card.icon}
              color={card.color}
            />
          );
        })}
      </div>
    );
  };

  // Render analytics section
  const renderAnalytics = () => {
    if (!reportAnalytics || Object.keys(reportAnalytics).length === 0) return null;

    return (
      <div className="analytics-section">
        <h3>📊 {t('analytics_insights')}</h3>
        <div className="analytics-grid">
          {reportType === 'payments' && reportAnalytics.by_method && (
            <AnalyticsChart
              title="payment_methods_distribution"
              data={reportAnalytics.by_method.details || []}
              type="pie"
              dataKey="total_amount"
              nameKey="method"
            />
          )}
          {reportType === 'payments' && reportAnalytics.monthly_trend && (
            <AnalyticsChart
              title="monthly_payment_trend"
              data={reportAnalytics.monthly_trend.details || []}
              type="line"
              dataKey="amount"
              nameKey="month"
            />
          )}
          {reportType === 'contracts' && reportAnalytics.by_status && (
            <AnalyticsChart
              title="contracts_by_status"
              data={reportAnalytics.by_status.details || []}
              type="pie"
              dataKey="total_value"
              nameKey="status"
            />
          )}
          {reportType === 'contracts' && reportAnalytics.top_products && (
            <AnalyticsChart
              title="top_products_by_value"
              data={reportAnalytics.top_products || []}
              type="bar"
              dataKey="total_value"
              nameKey="product"
            />
          )}
          {reportType === 'standards' && reportAnalytics.by_crop && (
            <AnalyticsChart
              title="demand_by_crop"
              data={reportAnalytics.by_crop.details || []}
              type="bar"
              dataKey="potential_value"
              nameKey="crop"
            />
          )}
          {reportType === 'standards' && reportAnalytics.by_season && (
            <AnalyticsChart
              title="standards_by_season"
              data={reportAnalytics.by_season || []}
              type="pie"
              dataKey="total_value"
              nameKey="season"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="enhanced-reports">
      <ToastContainer position="top-right" autoClose={5000} />

      <style>{`
        .enhanced-reports {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          min-height: 100vh;
          padding: 24px;
        }

        .report-header {
          margin-bottom: 28px;
        }
        .report-header h1 {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #1e3c1e, #2d5a2d);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .report-type-selector {
          display: flex;
          gap: 12px;
          background: white;
          padding: 6px;
          border-radius: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .report-type-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          background: transparent;
          border-radius: 12px;
          font-weight: 500;
          cursor: pointer;
        }
        .report-type-btn.active {
          background: #2d5a2d;
          color: white;
        }

        .filter-section {
          background: white;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .filter-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .filter-group label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
        }
        .filter-select, .filter-input {
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
        }
        .filter-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        .btn-generate, .btn-reset {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-generate {
          background: linear-gradient(135deg, #1e3c1e, #2d5a2d);
          color: white;
          border: none;
        }
        .btn-reset {
          background: white;
          border: 1px solid #e2e8f0;
        }

        .report-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .action-buttons {
          display: flex;
          gap: 12px;
        }
        .btn-download, .btn-manage-columns {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
        }

        .column-manager {
          position: relative;
        }
        .column-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          z-index: 100;
          min-width: 250px;
        }
        .dropdown-header {
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
        }
        .dropdown-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        .dropdown-actions button {
          background: none;
          border: none;
          color: #2d5a2d;
          cursor: pointer;
          font-size: 12px;
        }
        .dropdown-body {
          max-height: 300px;
          overflow-y: auto;
          padding: 8px 0;
        }
        .column-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          cursor: pointer;
        }
        .column-checkbox:hover {
          background: #f8fafc;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
          margin-bottom: 28px;
        }
        .summary-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .summary-card-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .summary-card-title {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 4px 0;
        }
        .summary-card-value {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .analytics-section {
          background: white;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 28px;
        }
        .analytics-section h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
        }
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }
        .analytics-chart {
          background: #f8fafc;
          border-radius: 16px;
          padding: 20px;
        }
        .analytics-chart h4 {
          margin: 0 0 16px 0;
          font-size: 14px;
        }

        .data-table-wrapper {
          background: white;
          border-radius: 20px;
          overflow-x: auto;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
        }
        .data-table th {
          background: #f8fafc;
          padding: 14px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }
        .data-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        .status-active, .status-completed, .status-confirmed, .status-Yes {
          background: #e8f5e9;
          color: #2e7d32;
        }
        .status-pending {
          background: #fff3e0;
          color: #ed6c02;
        }
        .status-inactive, .status-expired, .status-rejected, .status-No {
          background: #ffebee;
          color: #c62828;
        }

        .table-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .pagination-controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .pagination-btn {
          min-width: 36px;
          height: 36px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          cursor: pointer;
        }
        .pagination-btn.active {
          background: #2d5a2d;
          color: white;
        }
        .page-size-select {
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .loading-spinner {
          display: flex;
          justify-content: center;
          padding: 60px;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #2d5a2d;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px;
          color: #94a3b8;
        }

        @media (max-width: 768px) {
          .enhanced-reports { padding: 16px; }
          .analytics-grid { grid-template-columns: 1fr; }
          .report-type-selector { flex-wrap: wrap; }
        }
      `}</style>

      <div className="report-header">
        <h1>📊 {t('enhanced_analytics_reports')}</h1>
      </div>

      <div className="report-type-selector">
        {reportTypes.map(type => (
          <button
            key={type.value}
            className={`report-type-btn ${reportType === type.value ? 'active' : ''}`}
            onClick={() => {
              setReportType(type.value);
              setReportData([]);
              setReportSummary({});
              setReportAnalytics({});
            }}
          >
            {type.icon}
            {t(type.label)}
          </button>
        ))}
      </div>

      <div className="filter-section">
        <div className="filter-row">
          {reportType === 'users' && (
            <div className="filter-group">
              <label>{t('period')}</label>
              <select
                className="filter-select"
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              >
                <option value="week">{t('period_week')}</option>
                <option value="month">{t('period_month')}</option>
                <option value="year">{t('period_year')}</option>
              </select>
            </div>
          )}
          <div className="filter-group">
            <label>{t('start_date')}</label>
            <input
              type="date"
              className="filter-input"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>{t('end_date')}</label>
            <input
              type="date"
              className="filter-input"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          {reportType !== 'users' && reportType !== 'matches' && (
            <div className="filter-group">
              <label>{t('status')}</label>
              <select
                className="filter-select"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">{t('all')}</option>
                <option value="active">{t('active')}</option>
                <option value="pending">{t('pending')}</option>
                <option value="completed">{t('completed')}</option>
              </select>
            </div>
          )}
        </div>
        <div className="filter-actions">
          <button className="btn-generate" onClick={generateReport} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin-icon" /> : <FileText size={16} />}
            {t('generate_report')}
          </button>
          <button className="btn-reset" onClick={resetFilters}>
            <RefreshCw size={16} />
            {t('reset_filters')}
          </button>
        </div>
      </div>

      <div className="report-toolbar">
        <div className="action-buttons">
          {reportData.length > 0 && (
            <>
              <button className="btn-download" onClick={downloadPDF}>
                <FileText size={16} /> PDF
              </button>
              <button className="btn-download" onClick={downloadExcel}>
                <FileSpreadsheet size={16} /> Excel
              </button>
              <button className="btn-download" onClick={downloadCSV}>
                <FileSpreadsheet size={16} /> CSV
              </button>
            </>
          )}
        </div>
        {reportColumns.length > 0 && (
          <ColumnVisibilityManager
            columns={reportColumns}
            visibleColumns={visibleColumns}
            onToggleColumn={toggleColumn}
            onSelectAll={selectAllColumns}
            onClearAll={clearAllColumns}
          />
        )}
      </div>

      {renderSummaryCards()}
      {/* {renderAnalytics()} */}

      <div className="data-table-wrapper">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : reportData.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>{t('no_report_data')}</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>{t('select_report_type_and_generate')}</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="empty-state">
            <Search size={48} />
            <p>{t('no_matching_data')}</p>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(paginatedData[0] || {}).map(key => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                  <tr key={idx}>
                    {Object.entries(row).map(([key, value], cellIdx) => {
                      const isStatusColumn = key.toLowerCase().includes('status') || key.toLowerCase().includes('completed');
                      const statusValue = String(value).toLowerCase();
                      return (
                        <td key={cellIdx}>
                          {isStatusColumn ? (
                            <span className={`status-badge status-${statusValue === 'yes' ? 'Yes' : statusValue}`}>
                              {value}
                            </span>
                          ) : (
                            value || '-'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="table-footer">
              <div className="table-info">
                {t('showing')} {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, visibleData.length)} {t('of')} {visibleData.length} {t('entries')}
              </div>
              <div className="pagination-controls">
                <select
                  className="page-size-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {[10, 20, 50, 100].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <button className="pagination-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</button>
                <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>‹</button>
                <span className="pagination-btn active">{currentPage}</span>
                <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>›</button>
                <button className="pagination-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}