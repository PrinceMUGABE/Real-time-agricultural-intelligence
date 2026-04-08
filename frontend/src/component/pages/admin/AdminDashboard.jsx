/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Users, UserCheck, UserX, Shield, User, Package, Handshake,
  DollarSign, TrendingUp, TrendingDown, Calendar, Clock, MapPin,
  BarChart3, PieChart, LineChart, Activity, RefreshCw, Download,
  Filter, ChevronDown, ChevronUp, X, Eye, EyeOff, Star, Award,
  AlertCircle, CheckCircle, Percent, ArrowUpRight, ArrowDownRight,
  MessageCircle, Bell, FileText, Truck, CreditCard, Smartphone,
  Globe, Phone, Mail, Home, Briefcase, Settings, LogOut
} from "lucide-react";
import {
  LineChart as ReLineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar,
  ComposedChart, Scatter
} from "recharts";

// API Base URL
const API_BASE_URL = "http://127.0.0.1:8000";

// ─── Helper Functions ─────────────────────────────────────────────────────────
const formatCurrency = (value) => {
  if (!value && value !== 0) return "0 RWF";
  return `${value.toLocaleString()} RWF`;
};

const formatNumber = (value) => {
  if (!value && value !== 0) return "0";
  return value.toLocaleString();
};

const formatPercentage = (value) => {
  if (!value && value !== 0) return "0%";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toFixed(1)}%`;
};

const getTrendColor = (percentage) => {
  if (percentage > 0) return "#10b981";
  if (percentage < 0) return "#ef4444";
  return "#6b7280";
};

const getTrendIcon = (percentage) => {
  if (percentage > 0) return <ArrowUpRight size={14} />;
  if (percentage < 0) return <ArrowDownRight size={14} />;
  return null;
};

const getRelativeTime = (date) => {
  if (!date) return "Unknown";
  
  try {
    const now = new Date();
    const past = new Date(date);
    
    // Check if date is valid
    if (isNaN(past.getTime())) return "Unknown";
    
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return past.toLocaleDateString();
  } catch (error) {
    console.error("Error parsing date:", date, error);
    return "Unknown";
  }
};

// ─── API Client ───────────────────────────────────────────────────────────────
const getAuthToken = () => {
  return localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('access_token') ||
    sessionStorage.getItem('accessToken') ||
    '';
};

const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const lang = localStorage.getItem("language") || "en";
  config.headers['Accept-Language'] = lang;
  config.headers['Content-Type'] = 'application/json';
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      localStorage.removeItem('access_token');
      localStorage.removeItem('accessToken');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
    }
    return Promise.reject(error);
  }
);

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, bgColor, trend, trendLabel, onClick }) {
  const { t } = useTranslation();
  const trendColor = getTrendColor(trend);
  const TrendIcon = getTrendIcon(trend);

  return (
    <div className="summary-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="summary-card-header">
        <div className="summary-card-icon" style={{ backgroundColor: bgColor, color: color }}>
          {icon}
        </div>
        <div className="summary-card-info">
          <p className="summary-card-title">{title}</p>
          <h3 className="summary-card-value">{value}</h3>
          {trend !== undefined && trend !== null && (
            <div className="summary-card-trend" style={{ color: trendColor }}>
              {TrendIcon}
              <span>{formatPercentage(Math.abs(trend))}</span>
              <span className="trend-label">{trendLabel || t('vs_previous_period')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, description, children, onDownload }) {
  const { t } = useTranslation();

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <h3>{title}</h3>
          {description && <p className="chart-description">{description}</p>}
        </div>
        {onDownload && (
          <button className="chart-download-btn" onClick={onDownload} title={t('download_chart')}>
            <Download size={16} />
          </button>
        )}
      </div>
      <div className="chart-card-body">
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, subtitle }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ color }}>
        {icon}
      </div>
      <div className="stat-card-info">
        <span className="stat-card-value">{value}</span>
        <span className="stat-card-label">{label}</span>
        {subtitle && <span className="stat-card-subtitle">{subtitle}</span>}
      </div>
    </div>
  );
}

function NotificationItem({ notification, onMarkRead }) {
  const { t } = useTranslation();
  const getIcon = (type) => {
    switch(type) {
      case 'contract': return <Handshake size={16} />;
      case 'payment': return <DollarSign size={16} />;
      case 'delivery': return <Truck size={16} />;
      case 'message': return <MessageCircle size={16} />;
      default: return <Bell size={16} />;
    }
  };

  return (
    <div className={`notification-item ${notification.status === 'unread' ? 'unread' : ''}`}>
      <div className="notification-icon">
        {getIcon(notification.notification_type)}
      </div>
      <div className="notification-content">
        <div className="notification-title">{notification.title}</div>
        <div className="notification-description">{notification.description}</div>
        <div className="notification-time">{getRelativeTime(notification.created_at)}</div>
      </div>
      {notification.status === 'unread' && (
        <button className="notification-mark-read" onClick={() => onMarkRead(notification.id)}>
          <CheckCircle size={14} />
        </button>
      )}
    </div>
  );
}

// Updated ChatPreview Component
function ChatPreview({ chat, onClick }) {
  const { t } = useTranslation();
  
  const getLastMessageTime = (chat) => {
    if (chat.last_message_at) return getRelativeTime(chat.last_message_at);
    return "No messages";
  };

  // Safely extract last message text
  const getLastMessageText = (chat) => {
    if (!chat.last_message) return "No messages";
    
    // If last_message is an object, try to extract content
    if (typeof chat.last_message === 'object') {
      return chat.last_message.content || chat.last_message.text || "Message";
    }
    
    // If it's a string, return it directly
    return chat.last_message;
  };

  // Safely get participant name
  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    
    // Try to get participant names for one-on-one chats
    if (chat.participants && chat.participants.length > 0) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const otherParticipant = chat.participants.find(p => p.id !== currentUser.id);
      if (otherParticipant) {
        return otherParticipant.full_name || otherParticipant.name || "Chat";
      }
      return chat.participants[0]?.full_name || "Chat";
    }
    
    return "Chat";
  };

  return (
    <div className="chat-preview-item" onClick={() => onClick(chat)}>
      <div className="chat-avatar">
        {getChatName(chat).charAt(0).toUpperCase()}
      </div>
      <div className="chat-preview-content">
        <div className="chat-preview-name">{getChatName(chat)}</div>
        <div className="chat-preview-message">{getLastMessageText(chat)}</div>
        <div className="chat-preview-time">{getLastMessageTime(chat)}</div>
      </div>
      {chat.unread_count > 0 && (
        <div className="chat-unread-badge">{chat.unread_count}</div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { t } = useTranslation();

  // ── State ───────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [userGrowthData, setUserGrowthData] = useState(null);
  const [stockReport, setStockReport] = useState(null);
  const [contractReport, setContractReport] = useState(null);
  const [paymentReport, setPaymentReport] = useState(null);
  const [matchReport, setMatchReport] = useState(null);
  const [matchTrends, setMatchTrends] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [dateRange, setDateRange] = useState({ period: 'month' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // ── Fetch Dashboard Data ────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      console.log("📊 Fetching admin dashboard data...");

      // Fetch dashboard summary
      const summaryRes = await apiClient.get('/reports/admin/dashboard/', {
        params: { period: dateRange.period }
      });
      console.log("✅ Dashboard Summary:", summaryRes.data);
      setDashboardData(summaryRes.data.summary);

      // Fetch user growth with proper date range
      const growthRes = await apiClient.get('/reports/admin/user-growth/', {
        params: { period: dateRange.period }
      });
      console.log("✅ User Growth:", growthRes.data);
      setUserGrowthData(growthRes.data);

      // Fetch stock report
      const stockRes = await apiClient.get('/reports/admin/stocks/');
      console.log("✅ Stock Report:", stockRes.data);
      setStockReport(stockRes.data);

      // Fetch contract report
      const contractRes = await apiClient.get('/reports/admin/contracts/');
      console.log("✅ Contract Report:", contractRes.data);
      setContractReport(contractRes.data);

      // Fetch payment report
      const paymentRes = await apiClient.get('/reports/admin/payments/');
      console.log("✅ Payment Report:", paymentRes.data);
      setPaymentReport(paymentRes.data);

      // Fetch market matching report
      const matchRes = await apiClient.get('/reports/market-matching/all-matches/');
      console.log("✅ Market Matching Report:", matchRes.data);
      setMatchReport(matchRes.data);

      // Fetch notifications
      const notifRes = await apiClient.get('/notifications/');
      console.log("✅ Notifications:", notifRes.data);
      setNotifications(notifRes.data.notifications?.slice(0, 10) || []);

      // Fetch recent chats
      const chatsRes = await apiClient.get('/chat/my-chats/', {
        params: { page_size: 10 }
      });
      console.log("✅ Recent Chats:", chatsRes.data);
      setRecentChats(chatsRes.data.chats || []);

      // Generate match trends from actual match data
      if (matchRes.data?.matches) {
        const matchDates = matchRes.data.matches.map(m => ({
          date: new Date(m.stock?.created_at || m.match_date || Date.now()).toISOString().split('T')[0],
          matches: 1
        }));
        
        // Aggregate by date
        const aggregated = {};
        matchDates.forEach(item => {
          if (!aggregated[item.date]) {
            aggregated[item.date] = { date: item.date, matches: 0 };
          }
          aggregated[item.date].matches += item.matches;
        });
        
        const trendData = Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date));
        setMatchTrends({ trend: trendData, period: "Last 30 days", average_matches_per_day: trendData.length / 30 });
      }

    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error);
      toast.error(t('failed_to_load_dashboard'));
    } finally {
      setLoading(false);
    }
  }, [apiClient, dateRange.period, t]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ── Prepare Chart Data ──────────────────────────────────────────────────────
  const userGrowthChartData = useMemo(() => {
    if (!userGrowthData?.labels || userGrowthData.labels.length === 0) return [];
    return userGrowthData.labels.map((label, index) => ({
      name: label,
      total: userGrowthData.datasets?.[0]?.data?.[index] || 0,
      farmers: userGrowthData.datasets?.[1]?.data?.[index] || 0,
      buyers: userGrowthData.datasets?.[2]?.data?.[index] || 0,
    }));
  }, [userGrowthData]);

  const stockByProductData = useMemo(() => {
    if (!stockReport?.by_product?.details) return [];
    return stockReport.by_product.details.slice(0, 10).map(item => ({
      name: item.product,
      quantity: item.quantity,
      value: item.value,
      avgPrice: item.avg_price,
    }));
  }, [stockReport]);

  const contractByStatusData = useMemo(() => {
    if (!contractReport?.by_status?.details) return [];
    return contractReport.by_status.details.map(item => ({
      name: item.status,
      value: item.count,
      amount: item.total_value,
    }));
  }, [contractReport]);

  const paymentByMethodData = useMemo(() => {
    if (!paymentReport?.by_method?.details) return [];
    return paymentReport.by_method.details.map(item => ({
      name: item.method === 'mobile_money' ? 'Mobile Money' : 
            item.method === 'bank_transfer' ? 'Bank Transfer' : 'Cash',
      value: item.amount,
      count: item.count,
    }));
  }, [paymentReport]);

  const matchByProductData = useMemo(() => {
    if (!matchReport?.by_product) return [];
    return Object.entries(matchReport.by_product)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgScore: data.avg_score,
        totalValue: data.total_value,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [matchReport]);

  const matchByLocationData = useMemo(() => {
    if (!matchReport?.by_location) return [];
    return Object.entries(matchReport.by_location)
      .map(([name, data]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        count: data.count,
        avgScore: data.avg_score,
        totalValue: data.total_value,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [matchReport]);

  const matchTrendsData = useMemo(() => {
    if (!matchTrends?.trend || matchTrends.trend.length === 0) {
      // Generate sample data based on actual matches
      if (matchReport?.matches?.length > 0) {
        return matchReport.matches.map((match, idx) => ({
          date: new Date(match.stock?.created_at || Date.now() - (idx * 86400000)).toISOString().split('T')[0],
          matches: 1,
          score: match.match_score
        })).slice(0, 30);
      }
      return [];
    }
    return matchTrends.trend;
  }, [matchTrends, matchReport]);

  // User distribution data
  const userDistributionData = useMemo(() => {
    const totalFarmers = dashboardData?.total_farmers?.current || userGrowthData?.summary?.total_farmers || 0;
    const totalBuyers = dashboardData?.total_buyers?.current || userGrowthData?.summary?.total_buyers || 0;
    const totalUsers = dashboardData?.total_users?.current || userGrowthData?.summary?.total_users || 0;
    const totalAdmins = totalUsers - totalFarmers - totalBuyers;
    
    return [
      { name: t('farmers'), value: totalFarmers, color: '#1565c0' },
      { name: t('buyers'), value: totalBuyers, color: '#b76e0a' },
      { name: t('admins'), value: totalAdmins, color: '#7e22ce' },
    ].filter(item => item.value > 0);
  }, [dashboardData, userGrowthData, t]);

  // ── Colors for Charts ───────────────────────────────────────────────────────
  const COLORS = ['#2d5a2d', '#1565c0', '#b76e0a', '#7e22ce', '#dc2626', '#059669', '#d97706', '#6b7280'];
  const STATUS_COLORS = {
    pending: '#b76e0a',
    accepted: '#1565c0',
    completed: '#2e7d32',
    rejected: '#dc2626',
    failed: '#ef4444'
  };

  // ── Download Chart as PNG ───────────────────────────────────────────────────
  const downloadChart = (chartId, title) => {
    toast.info(t('download_feature_coming_soon'));
  };

  // ── Mark Notification as Read ───────────────────────────────────────────────
  const markNotificationRead = async (id) => {
    try {
      await apiClient.post(`/notifications/${id}/mark-read/`);
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, status: 'read' } : n
      ));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // ── Navigate to Chat ────────────────────────────────────────────────────────
  const openChat = (chat) => {
    window.location.href = `/admin/chats?chat=${chat.id}`;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="admin-dashboard">
      <ToastContainer position="top-right" autoClose={5000} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .admin-dashboard {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          min-height: 100vh;
          padding: 24px;
        }

        /* Page Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, #1e3c1e, #2d5a2d);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }
        .page-header p {
          font-size: 14px;
          color: #64748b;
          margin: 4px 0 0;
        }
        .header-actions {
          display: flex;
          gap: 12px;
        }
        .refresh-btn, .date-range-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .refresh-btn:hover, .date-range-btn:hover {
          background: #f8fafc;
          border-color: #2d5a2d;
          color: #2d5a2d;
        }

        /* Date Range Dropdown */
        .date-range-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          z-index: 100;
          min-width: 200px;
          margin-top: 8px;
        }
        .date-range-dropdown button {
          width: 100%;
          padding: 12px 16px;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .date-range-dropdown button:hover {
          background: #f8fafc;
        }

        /* Two Column Layout */
        .dashboard-two-column {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
        }
        .main-content {
          min-width: 0;
        }
        .sidebar-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Summary Cards Grid */
        .summary-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 28px;
        }
        .summary-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
        }
        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .summary-card-header {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .summary-card-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .summary-card-info {
          flex: 1;
        }
        .summary-card-title {
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          margin: 0 0 6px 0;
        }
        .summary-card-value {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .summary-card-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          margin-top: 8px;
        }
        .trend-label {
          color: #64748b;
          margin-left: 4px;
        }

        /* Stats Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }
        .stat-card:hover {
          border-color: #2d5a2d;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .stat-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }
        .stat-card-info {
          flex: 1;
        }
        .stat-card-value {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          display: block;
        }
        .stat-card-label {
          font-size: 12px;
          color: #64748b;
        }
        .stat-card-subtitle {
          font-size: 10px;
          color: #94a3b8;
          display: block;
          margin-top: 2px;
        }

        /* Tabs */
        .dashboard-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 12px;
          flex-wrap: wrap;
        }
        .tab-btn {
          padding: 10px 24px;
          background: none;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tab-btn:hover {
          background: #f1f5f9;
          color: #2d5a2d;
        }
        .tab-btn.active {
          background: #2d5a2d;
          color: white;
        }

        /* Charts Grid */
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
          gap: 24px;
          margin-bottom: 28px;
        }
        .chart-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }
        .chart-card:hover {
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        .chart-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .chart-card-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }
        .chart-description {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }
        .chart-download-btn {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chart-download-btn:hover {
          background: #e8f5e9;
          border-color: #2d5a2d;
          color: #2d5a2d;
        }
        .chart-card-body {
          min-height: 300px;
        }

        /* Notifications Sidebar */
        .notifications-card, .chats-card, .activities-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .card-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .view-all-btn {
          font-size: 12px;
          color: #2d5a2d;
          background: none;
          border: none;
          cursor: pointer;
        }
        .notification-item {
          display: flex;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
          position: relative;
        }
        .notification-item.unread {
          background: #f8fafc;
          margin: 0 -12px;
          padding: 12px;
          border-radius: 12px;
        }
        .notification-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .notification-content {
          flex: 1;
        }
        .notification-title {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .notification-description {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .notification-time {
          font-size: 10px;
          color: #94a3b8;
        }
        .notification-mark-read {
          position: absolute;
          right: 0;
          top: 12px;
          background: none;
          border: none;
          color: #2d5a2d;
          cursor: pointer;
        }

        /* Chat Preview */
        .chat-preview-item {
          display: flex;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        .chat-preview-item:hover {
          background: #f8fafc;
          margin: 0 -12px;
          padding: 12px;
          border-radius: 12px;
        }
        .chat-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2d5a2d, #4caf71);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        }
        .chat-preview-content {
          flex: 1;
        }
        .chat-preview-name {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .chat-preview-message {
          font-size: 12px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chat-preview-time {
          font-size: 10px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .chat-unread-badge {
          position: absolute;
          right: 0;
          top: 12px;
          background: #dc2626;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 10px;
        }

        /* Activity Item */
        .activity-item {
          display: flex;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .activity-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .activity-content {
          flex: 1;
        }
        .activity-title {
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .activity-time {
          font-size: 10px;
          color: #94a3b8;
        }

        /* Market Matching Section */
        .matching-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .matching-stat-card {
          background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
        }
        .matching-stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #2d5a2d;
        }
        .matching-stat-label {
          font-size: 13px;
          color: #166534;
          margin-top: 4px;
        }

        /* Top Items List */
        .top-items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .top-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        .top-item:hover {
          background: #f1f5f9;
        }
        .top-item-rank {
          width: 32px;
          height: 32px;
          background: #2d5a2d;
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }
        .top-item-name {
          flex: 1;
          margin-left: 12px;
          font-weight: 500;
          color: #0f172a;
        }
        .top-item-value {
          font-weight: 700;
          color: #2d5a2d;
        }

        /* Loading Spinner */
        .loading-spinner {
          display: flex;
          justify-content: center;
          align-items: center;
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

        /* Responsive */
        @media (max-width: 1200px) {
          .dashboard-two-column {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 1024px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .admin-dashboard {
            padding: 16px;
          }
          .summary-cards-grid {
            grid-template-columns: 1fr;
          }
          .stats-row {
            grid-template-columns: repeat(2, 1fr);
          }
          .dashboard-tabs {
            flex-wrap: wrap;
          }
          .tab-btn {
            flex: 1;
            text-align: center;
            justify-content: center;
          }
        }
        @media (max-width: 480px) {
          .stats-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>{t('admin_dashboard')}</h1>
          <p>{t('admin_dashboard_description')}</p>
        </div>
        <div className="header-actions" style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <button className="date-range-btn" onClick={() => setShowDatePicker(!showDatePicker)}>
              <Calendar size={16} />
              {t(`period_${dateRange.period}`)}
              <ChevronDown size={14} />
            </button>
            {showDatePicker && (
              <div className="date-range-dropdown">
                <button onClick={() => { setDateRange({ period: 'day' }); setShowDatePicker(false); }}>
                  {t('period_day')}
                </button>
                <button onClick={() => { setDateRange({ period: 'week' }); setShowDatePicker(false); }}>
                  {t('period_week')}
                </button>
                <button onClick={() => { setDateRange({ period: 'month' }); setShowDatePicker(false); }}>
                  {t('period_month')}
                </button>
                <button onClick={() => { setDateRange({ period: 'quarter' }); setShowDatePicker(false); }}>
                  {t('period_quarter')}
                </button>
                <button onClick={() => { setDateRange({ period: 'year' }); setShowDatePicker(false); }}>
                  {t('period_year')}
                </button>
              </div>
            )}
          </div>
          <button className="refresh-btn" onClick={fetchDashboardData}>
            <RefreshCw size={16} />
            {t('refresh')}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="dashboard-two-column">
          {/* Main Content */}
          <div className="main-content">
            {/* Summary Cards */}
            <div className="summary-cards-grid">
              <SummaryCard
                title={t('total_users')}
                value={formatNumber(userGrowthData?.summary?.total_users || 0)}
                icon={<Users size={24} />}
                color="#2d5a2d"
                bgColor="#e8f5e9"
                trend={dashboardData?.total_users?.percentage_change}
                trendLabel={t('vs_previous')}
              />
              <SummaryCard
                title={t('total_farmers')}
                value={formatNumber(userGrowthData?.summary?.total_farmers || 0)}
                icon={<User size={24} />}
                color="#1565c0"
                bgColor="#e3f2fd"
                trend={dashboardData?.total_farmers?.percentage_change}
                trendLabel={t('vs_previous')}
              />
              <SummaryCard
                title={t('total_buyers')}
                value={formatNumber(userGrowthData?.summary?.total_buyers || 0)}
                icon={<User size={24} />}
                color="#b76e0a"
                bgColor="#fff8e1"
                trend={dashboardData?.total_buyers?.percentage_change}
                trendLabel={t('vs_previous')}
              />
              <SummaryCard
                title={t('total_contracts')}
                value={formatNumber(contractReport?.summary?.total_contracts || 0)}
                icon={<Handshake size={24} />}
                color="#7e22ce"
                bgColor="#f3e8ff"
                trend={dashboardData?.total_contracts?.percentage_change}
                trendLabel={t('vs_previous')}
              />
            </div>

            {/* Additional Stats Row */}
            <div className="stats-row">
              <StatCard
                label={t('total_stock_value')}
                value={formatCurrency(stockReport?.summary?.total_value)}
                icon={<Package size={20} />}
                color="#2d5a2d"
                subtitle={`${formatNumber(stockReport?.summary?.total_stocks)} ${t('products')}`}
              />
              <StatCard
                label={t('contracts_value')}
                value={formatCurrency(contractReport?.summary?.total_value)}
                icon={<DollarSign size={20} />}
                color="#1565c0"
                subtitle={`${formatNumber(contractReport?.summary?.total_contracts)} ${t('contracts')}`}
              />
              <StatCard
                label={t('total_payments')}
                value={formatCurrency(paymentReport?.summary?.total_payments)}
                icon={<CreditCard size={20} />}
                color="#b76e0a"
                subtitle={`${formatNumber(paymentReport?.summary?.total_transactions)} ${t('transactions')}`}
              />
              <StatCard
                label={t('active_contracts')}
                value={formatNumber(contractReport?.summary?.pending_count || 0)}
                icon={<Activity size={20} />}
                color="#059669"
                subtitle={`${formatPercentage(contractReport?.summary?.pending_count / (contractReport?.summary?.total_contracts || 1) * 100)} ${t('of_total')}`}
              />
            </div>

            {/* Tabs */}
            <div className="dashboard-tabs">
              <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                <BarChart3 size={16} /> {t('overview')}
              </button>
              <button className={`tab-btn ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')}>
                <Package size={16} /> {t('market_matching')}
              </button>
              <button className={`tab-btn ${activeTab === 'financial' ? 'active' : ''}`} onClick={() => setActiveTab('financial')}>
                <DollarSign size={16} /> {t('financial_analytics')}
              </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="charts-grid">
                {/* User Growth Chart - Area Chart */}
                <ChartCard
                  title={t('user_growth_trend')}
                  description={t('user_growth_description')}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={userGrowthChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip
                        contentStyle={{ background: 'white', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="total" stackId="1" stroke="#2d5a2d" fill="#2d5a2d" fillOpacity={0.3} name={t('total_users')} />
                      <Area type="monotone" dataKey="farmers" stackId="2" stroke="#1565c0" fill="#1565c0" fillOpacity={0.3} name={t('farmers')} />
                      <Area type="monotone" dataKey="buyers" stackId="3" stroke="#b76e0a" fill="#b76e0a" fillOpacity={0.3} name={t('buyers')} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Stock by Product - Bar Chart */}
                <ChartCard
                  title={t('stock_by_product')}
                  description={t('stock_by_product_description')}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stockByProductData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={100} />
                      <Tooltip
                        formatter={(value, name) => [formatNumber(value), name === 'quantity' ? t('quantity_kg') : t('value_rwf')]}
                      />
                      <Legend />
                      <Bar dataKey="quantity" fill="#2d5a2d" name={t('quantity_kg')} radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Contract Status Distribution - Pie Chart */}
                <ChartCard
                  title={t('contract_status_distribution')}
                  description={t('contract_status_description')}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={contractByStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {contractByStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Match Trends - Line Chart */}
                <ChartCard
                  title={t('market_matching_trends')}
                  description={t('match_trends_description')}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={matchTrendsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                      <YAxis yAxisId="left" stroke="#64748b" fontSize={11} />
                      <YAxis yAxisId="right" orientation="right" stroke="#b76e0a" fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="matches" fill="#2d5a2d" name={t('matches_found')} radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="score" stroke="#b76e0a" strokeWidth={2} name={t('match_score')} dot={{ fill: '#b76e0a', r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}

            {/* Market Matching Tab */}
            {activeTab === 'market' && (
              <>
                <div className="matching-stats">
                  <div className="matching-stat-card">
                    <div className="matching-stat-value">{formatNumber(matchReport?.total_matches || 0)}</div>
                    <div className="matching-stat-label">{t('total_matches_found')}</div>
                  </div>
                  <div className="matching-stat-card">
                    <div className="matching-stat-value">{formatPercentage(matchReport?.summary?.average_score)}</div>
                    <div className="matching-stat-label">{t('average_match_score')}</div>
                  </div>
                  <div className="matching-stat-card">
                    <div className="matching-stat-value">{formatNumber(matchReport?.summary?.high_quality_matches || 0)}</div>
                    <div className="matching-stat-label">{t('high_quality_matches')}</div>
                  </div>
                  <div className="matching-stat-card">
                    <div className="matching-stat-value">{formatCurrency(matchReport?.summary?.total_potential_value)}</div>
                    <div className="matching-stat-label">{t('total_potential_value')}</div>
                  </div>
                </div>

                <div className="charts-grid">
                  <ChartCard
                    title={t('matches_by_product')}
                    description={t('matches_by_product_description')}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={matchByProductData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#2d5a2d" name={t('match_count')} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard
                    title={t('matches_by_location')}
                    description={t('matches_by_location_description')}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={matchByLocationData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#64748b" fontSize={11} />
                        <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={120} />
                        <Tooltip formatter={(value) => formatNumber(value)} />
                        <Legend />
                        <Bar dataKey="count" fill="#b76e0a" name={t('match_count')} radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                {/* Top Matches */}
                {matchReport?.top_matches && matchReport.top_matches.length > 0 && (
                  <ChartCard
                    title={t('top_matches')}
                    description={t('top_matches_description')}
                  >
                    <div className="top-items-list">
                      {matchReport.top_matches.slice(0, 10).map((match, idx) => (
                        <div key={idx} className="top-item">
                          <div className="top-item-rank">#{idx + 1}</div>
                          <div className="top-item-name">
                            {match.stock?.product_name} - {match.farmer?.full_name} → {match.buyer?.full_name}
                          </div>
                          <div className="top-item-value">
                            <span style={{ background: '#e8f5e9', padding: '4px 8px', borderRadius: '20px', fontSize: '12px' }}>
                              {match.match_score}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                )}
              </>
            )}

            {/* Financial Analytics Tab */}
            {activeTab === 'financial' && (
              <div className="charts-grid">
                <ChartCard
                  title={t('payment_by_method')}
                  description={t('payment_by_method_description')}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={paymentByMethodData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentByMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title={t('contract_value_by_product')}
                  description={t('contract_value_by_product_description')}
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={contractReport?.by_product?.details?.slice(0, 8) || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="product" stroke="#64748b" fontSize={11} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="value" fill="#7e22ce" name={t('contract_value')} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Payment Trends - Area Chart */}
                {paymentReport?.over_time?.details?.length > 0 && (
                  <ChartCard
                    title={t('payment_trends')}
                    description={t('payment_trends_description')}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={paymentReport.over_time.details.map(item => ({
                        month: item.month,
                        amount: item.amount,
                        count: item.count
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Area type="monotone" dataKey="amount" stroke="#2d5a2d" fill="#2d5a2d" fillOpacity={0.3} name={t('payment_amount')} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Content */}
          <div className="sidebar-content">
            {/* Recent Notifications */}
            <div className="notifications-card">
              <div className="card-header">
                <h3><Bell size={18} /> {t('recent_notifications')}</h3>
                <button className="view-all-btn">{t('view_all')}</button>
              </div>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <Bell size={32} />
                  <p style={{ marginTop: '8px' }}>{t('no_notifications')}</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <NotificationItem 
                    key={notif.id} 
                    notification={notif} 
                    onMarkRead={markNotificationRead} 
                  />
                ))
              )}
            </div>

            {/* Recent Chats */}
            <div className="chats-card">
              <div className="card-header">
                <h3><MessageCircle size={18} /> {t('recent_chats')}</h3>
                <button className="view-all-btn">{t('view_all')}</button>
              </div>
              {recentChats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <MessageCircle size={32} />
                  <p style={{ marginTop: '8px' }}>{t('no_chats')}</p>
                </div>
              ) : (
                recentChats.map(chat => (
                  <ChatPreview key={chat.id} chat={chat} onClick={openChat} />
                ))
              )}
            </div>

            {/* Quick Stats */}
            <div className="activities-card">
              <div className="card-header">
                <h3><Activity size={18} /> {t('quick_stats')}</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#2d5a2d' }}>
                    {formatNumber(contractReport?.summary?.pending_count || 0)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{t('pending_contracts')}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#1565c0' }}>
                    {formatNumber(contractReport?.summary?.completed_count || 0)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{t('completed_contracts')}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#b76e0a' }}>
                    {formatNumber(matchReport?.total_matches || 0)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{t('active_matches')}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#7e22ce' }}>
                    {formatNumber(paymentReport?.summary?.total_transactions || 0)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{t('total_transactions')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}