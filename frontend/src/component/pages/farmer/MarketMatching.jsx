/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Eye, EyeOff, Edit2, Trash2, UserCheck, UserX,
  Plus, X, Search, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Users, Shield,
  User, MapPin, Phone, Mail, Calendar, Lock,
  Globe, ChevronDown, Handshake, TrendingUp,
  DollarSign, Package, Award, Filter, Download,
  RefreshCw, Star, AlertCircle, CheckCircle,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  MessageCircle, PhoneCall, FileText, Info,
  ThumbsUp, ThumbsDown, Minus, Percent,
  ChevronUp, Home, Briefcase, Clock
} from "lucide-react";
import { useNavigate } from 'react-router-dom';

// API Base URL
const API_BASE_URL = "http://127.0.0.1:8000";

// Match score colors and labels
const matchScoreConfig = {
  excellent: { min: 90, max: 100, bg: "#e8f5e9", color: "#2e7d32", lightBg: "#f1f9f1", label: "Excellent Match" },
  good: { min: 80, max: 89, bg: "#e3f2fd", color: "#1565c0", lightBg: "#ebf5ff", label: "Good Match" },
  fair: { min: 70, max: 79, bg: "#fff8e1", color: "#b76e0a", lightBg: "#fffaf0", label: "Fair Match" },
  basic: { min: 60, max: 69, bg: "#ffebee", color: "#c62828", lightBg: "#fee8e8", label: "Basic Match" }
};

// Role badge colors (reusing from UserManagement)
const roleColors = {
  admin: { bg: "#e8f5e9", color: "#2e7d32", label: "Admin" },
  farmer: { bg: "#e3f2fd", color: "#1565c0", label: "Farmer" },
  buyer: { bg: "#fff8e1", color: "#b76e0a", label: "Buyer" }
};

// Status badge colors
const statusColors = {
  active: { bg: "#e8f5e9", color: "#2e7d32" },
  inactive: { bg: "#ffebee", color: "#c62828" },
  pending: { bg: "#fff8e1", color: "#b76e0a" }
};

// Initial empty filters
const initialFilters = {
  product: "",
  min_score: "",
  farmer: "",
  buyer: "",
  location: "",
  date_from: "",
  date_to: ""
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, bgColor, subtitle, trend, trendValue, onClick }) {
  return (
    <div className="summary-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="summary-card-content">
        <div>
          <p className="summary-card-title">{title}</p>
          <h3 className="summary-card-value">{value}</h3>
          {subtitle && <p className="summary-card-subtitle">{subtitle}</p>}
          {trend && (
            <div className={`trend-indicator ${trend > 0 ? 'positive' : 'negative'}`}>
              {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{Math.abs(trendValue)}% from last month</span>
            </div>
          )}
        </div>
        <div className="summary-card-icon" style={{ backgroundColor: bgColor, color: color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange, totalItems }) {
  const { t } = useTranslation();
  const pageSizeOptions = [5, 10, 30, 50, 100];

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        <span>{t('showing')} </span>
        <select
          className="page-size-select"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <span> {t('of')} {totalItems} {t('entries')}</span>
      </div>

      <div className="pagination-controls">
        <button className="pagination-btn" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          <ChevronsLeft size={16} />
        </button>
        <button className="pagination-btn" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          <ChevronLeft size={16} />
        </button>

        {[...Array(totalPages)].map((_, i) => {
          const pageNum = i + 1;
          if (
            pageNum === 1 ||
            pageNum === totalPages ||
            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
          ) {
            return (
              <button
                key={pageNum}
                className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </button>
            );
          } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
            return <span key={pageNum} className="pagination-ellipsis">...</span>;
          }
          return null;
        })}

        <button className="pagination-btn" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          <ChevronRight size={16} />
        </button>
        <button className="pagination-btn" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

function FilterBar({ filters, onFilterChange, onSearch, onClear, totalMatches }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const productOptions = [
    "Maize", "Beans", "Rice", "Potatoes", "Sweet Potatoes",
    "Cassava", "Coffee", "Tea", "Wheat", "Soybeans",
    "Groundnuts", "Peas", "Bananas", "Tomatoes", "Onions"
  ];

  return (
    <div className="filter-bar">
      <div className="filter-bar-header">
        <div className="filter-bar-title">
          <Filter size={18} />
          <span>{t('filter_matches')}</span>
          {totalMatches !== undefined && (
            <span className="filter-total">{totalMatches} {t('matches_found')}</span>
          )}
        </div>
        <div className="filter-bar-actions">
          <button className="filter-clear-btn" onClick={onClear}>
            <X size={14} />
            {t('clear_filters')}
          </button>
          <button className="filter-expand-btn" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <div className={`filter-bar-body ${isExpanded ? 'expanded' : ''}`}>
        <div className="filter-row">
          <div className="filter-group">
            <select
              className="filter-select"
              value={filters.product}
              onChange={(e) => onFilterChange('product', e.target.value)}
            >
              <option value="">{t('all_products')}</option>
              {productOptions.map(product => (
                <option key={product} value={product.toLowerCase()}>{product}</option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filters.min_score}
              onChange={(e) => onFilterChange('min_score', e.target.value)}
            >
              <option value="">{t('all_match_scores')}</option>
              <option value="90">90%+ ({t('excellent')})</option>
              <option value="80">80%+ ({t('good')})</option>
              <option value="70">70%+ ({t('fair')})</option>
              <option value="60">60%+ ({t('basic')})</option>
            </select>

            <select
              className="filter-select"
              value={filters.location}
              onChange={(e) => onFilterChange('location', e.target.value)}
            >
              <option value="">{t('all_locations')}</option>
              <option value="kigali">Kigali</option>
              <option value="eastern">Eastern Province</option>
              <option value="western">Western Province</option>
              <option value="northern">Northern Province</option>
              <option value="southern">Southern Province</option>
            </select>
          </div>

          <div className="filter-group">
            <div className="search-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder={t('search_farmer_buyer')}
                value={filters.search || ''}
                onChange={(e) => onFilterChange('search', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onSearch()}
              />
              <button className="search-btn" onClick={onSearch}>
                <Search size={16} />
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="filter-row expanded">
            <div className="filter-group">
              <input
                type="text"
                className="filter-input"
                placeholder={t('filter_by_farmer')}
                value={filters.farmer}
                onChange={(e) => onFilterChange('farmer', e.target.value)}
              />
              <input
                type="text"
                className="filter-input"
                placeholder={t('filter_by_buyer')}
                value={filters.buyer}
                onChange={(e) => onFilterChange('buyer', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <input
                type="date"
                className="filter-input"
                placeholder={t('from_date')}
                value={filters.date_from}
                onChange={(e) => onFilterChange('date_from', e.target.value)}
              />
              <input
                type="date"
                className="filter-input"
                placeholder={t('to_date')}
                value={filters.date_to}
                onChange={(e) => onFilterChange('date_to', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="filter-bar-footer">
        <button className="apply-filters-btn" onClick={onSearch}>
          <Search size={14} />
          {t('apply_filters')}
        </button>
      </div>
    </div>
  );
}

function MatchScoreBadge({ score }) {
  const getScoreConfig = (score) => {
    if (score >= 90) return matchScoreConfig.excellent;
    if (score >= 80) return matchScoreConfig.good;
    if (score >= 70) return matchScoreConfig.fair;
    return matchScoreConfig.basic;
  };

  const config = getScoreConfig(score);

  return (
    <div className="match-score-badge" style={{ backgroundColor: config.bg, color: config.color }}>
      <Star size={12} fill={config.color} />
      <span>{score}%</span>
    </div>
  );
}

function MatchCard({ match, onViewDetails }) {
  const { t } = useTranslation();

  const getScoreConfig = (score) => {
    if (score >= 90) return matchScoreConfig.excellent;
    if (score >= 80) return matchScoreConfig.good;
    if (score >= 70) return matchScoreConfig.fair;
    return matchScoreConfig.basic;
  };

  const scoreConfig = getScoreConfig(match.match_score);

  const getFavorableIndicator = () => {
    if (match.favorable_for_farmer) {
      return {
        icon: <ThumbsUp size={12} />,
        text: t('favorable_for_farmer'),
        color: '#2e7d32'
      };
    } else if (match.favorable_for_buyer) {
      return {
        icon: <ThumbsUp size={12} />,
        text: t('favorable_for_buyer'),
        color: '#1565c0'
      };
    } else {
      return {
        icon: <Minus size={12} />,
        text: t('price_match'),
        color: '#b76e0a'
      };
    }
  };

  const favorable = getFavorableIndicator();

  return (
    <div className="match-card" onClick={() => onViewDetails(match)}>
      <div className="match-card-header">
        <div className="match-product-info">
          <Package size={18} className="product-icon" />
          <div>
            <h3 className="match-product-name">
              {match.stock?.product_name || match.crop_standard?.crop_name}
            </h3>
            <p className="match-quality">Grade {match.stock?.quality_grade || 'B'}</p>
          </div>
        </div>
        <MatchScoreBadge score={match.match_score} />
      </div>

      <div className="match-card-parties">
        <div className="match-party">
          <div className="party-avatar" style={{ backgroundColor: roleColors.farmer.bg, color: roleColors.farmer.color }}>
            <User size={14} />
          </div>
          <div className="party-details">
            <span className="party-role">{t('farmer')}</span>
            <span className="party-name">{match.farmer?.full_name}</span>
            <span className="party-location">
              <MapPin size={10} />
              {match.stock?.location || t('anywhere')}
            </span>
          </div>
        </div>

        <div className="match-vs">
          <Handshake size={16} />
        </div>

        <div className="match-party">
          <div className="party-avatar" style={{ backgroundColor: roleColors.buyer.bg, color: roleColors.buyer.color }}>
            <User size={14} />
          </div>
          <div className="party-details">
            <span className="party-role">{t('buyer')}</span>
            <span className="party-name">{match.buyer?.full_name}</span>
            <span className="party-location">
              <MapPin size={10} />
              {match.crop_standard?.preferred_location || t('anywhere')}
            </span>
          </div>
        </div>
      </div>

      <div className="match-card-details">
        <div className="match-detail-row">
          <div className="match-detail-item">
            <DollarSign size={14} className="detail-icon" />
            <div>
              <span className="detail-label">{t('farmer_price')}</span>
              <span className="detail-value">{match.farmer_price?.toLocaleString()} RWF/kg</span>
            </div>
          </div>
          <div className="match-detail-item">
            <DollarSign size={14} className="detail-icon" />
            <div>
              <span className="detail-label">{t('buyer_price')}</span>
              <span className="detail-value">{match.buyer_price?.toLocaleString()} RWF/kg</span>
            </div>
          </div>
        </div>

        <div className="match-detail-row">
          <div className="match-detail-item">
            <Package size={14} className="detail-icon" />
            <div>
              <span className="detail-label">{t('available')}</span>
              <span className="detail-value">{match.available_quantity?.toLocaleString()} kg</span>
            </div>
          </div>
          <div className="match-detail-item">
            <TrendingUp size={14} className="detail-icon" />
            <div>
              <span className="detail-label">{t('requested')}</span>
              <span className="detail-value">{match.requested_quantity?.toLocaleString()} kg</span>
            </div>
          </div>
        </div>

        <div className="match-price-indicator" style={{ backgroundColor: favorable.color + '10', color: favorable.color }}>
          {favorable.icon}
          <span>{favorable.text}</span>
          <span className="price-diff">
            {match.price_difference > 0 ? '+' : ''}{match.price_difference?.toLocaleString()} RWF
          </span>
        </div>
      </div>

      <div className="match-card-footer">
        <button className="view-details-btn">
          <Eye size={14} />
          {t('view_details')}
        </button>
      </div>
    </div>
  );
}

function MatchDetailsModal({ match, onClose, onContactFarmer, onContactBuyer }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!match) return null;

  const getMatchDetailsList = () => {
    const details = match.match_details || {};
    return [
      ...(details.matches || []).map(d => ({ ...d, type: 'match' })),
      ...(details.warnings || []).map(d => ({ ...d, type: 'warning' })),
      ...(details.mismatches || []).map(d => ({ ...d, type: 'mismatch' }))
    ];
  };

  const allDetails = getMatchDetailsList();

  const getScoreConfig = (score) => {
    if (score >= 90) return matchScoreConfig.excellent;
    if (score >= 80) return matchScoreConfig.good;
    if (score >= 70) return matchScoreConfig.fair;
    return matchScoreConfig.basic;
  };

  const scoreConfig = getScoreConfig(match.match_score);

   const handleGenerateContract = () => {
        const stockData = {
            id: match.stock?.id,
            product_name: match.stock?.product_name || match.crop_standard?.crop_name,
            price_per_kg: match.farmer_price || match.stock?.price_per_kg,
            farmer: match.farmer?.id,
            farmer_id: match.farmer?.id,
            farmer_name: match.farmer?.full_name,
            farmer_phone: match.farmer?.phone_number,
            farmer_email: match.farmer?.email,
            buyer_preferred_location: match.crop_standard?.preferred_location || "",
            buyer_preferred_delivery_location: match.buyer?.location || "",
            buyer_location: match.buyer?.location || "",
            available_quantity: match.available_quantity,
            requested_quantity: match.requested_quantity,
            quality_grade: match.stock?.quality_grade,
            description: match.stock?.description,
            buyer_price: match.buyer_price,
            match_score: match.match_score,
            buyer_name: match.buyer?.full_name,
            buyer: match.buyer?.id,
            buyer_id: match.buyer?.id
        };

    navigate('/farmer/contracts', {
      state: {
        stockData,
        fromMatching: true,
        matchScore: match.match_score,
        openCreateModal: true,
        creatorRole: 'farmer'
      }
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal match-details-modal">
        <div className="modal-header">
          <div>
            <h2>{t('match_details')}</h2>
            <p>{match.stock?.product_name} • {match.match_score}% {t('match_score')}</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Score Overview */}
          <div className="score-overview-card" style={{ backgroundColor: scoreConfig.lightBg }}>
            <div className="score-circle" style={{ borderColor: scoreConfig.color }}>
              <span style={{ color: scoreConfig.color }}>{match.match_score}%</span>
            </div>
            <div className="score-info">
              <h3>{t(scoreConfig.label)}</h3>
              <p>{t('match_score_description', { score: match.match_score })}</p>
            </div>
          </div>

          {/* Parties Section */}
          <div className="parties-section">
            <h3>
              <Users size={16} />
              {t('involved_parties')}
            </h3>
            <div className="parties-grid">
              <div className="party-card">
                <div className="party-card-header">
                  <div className="party-avatar-large" style={{ backgroundColor: roleColors.farmer.bg, color: roleColors.farmer.color }}>
                    <User size={24} />
                  </div>
                  <div>
                    <span className="party-badge" style={roleColors.farmer}>{t('me')}</span>
                    <h4>{match.farmer?.full_name}</h4>
                  </div>
                </div>
                <div className="party-card-body">
                  {/* <div className="party-info-item">
                    <Phone size={14} />
                    <span>{match.farmer?.phone_number}</span>
                  </div>
                  {match.farmer?.email && (
                    <div className="party-info-item">
                      <Mail size={14} />
                      <span>{match.farmer.email}</span>
                    </div>
                  )} */}
                  <div className="party-info-item">
                    <MapPin size={14} />
                    <span>{match.stock?.location}</span>
                  </div>
                </div>
              </div>

              <div className="party-card">
                <div className="party-card-header">
                  <div className="party-avatar-large" style={{ backgroundColor: roleColors.buyer.bg, color: roleColors.buyer.color }}>
                    <User size={24} />
                  </div>
                  <div>
                    <span className="party-badge" style={roleColors.buyer}>{t('buyer')}</span>
                    <h4>{match.buyer?.full_name}</h4>
                  </div>
                </div>
                <div className="party-card-body">
                  {/* <div className="party-info-item">
                    <Phone size={14} />
                    <span>{match.buyer?.phone_number}</span>
                  </div>
                  {match.buyer?.email && (
                    <div className="party-info-item">
                      <Mail size={14} />
                      <span>{match.buyer.email}</span>
                    </div>
                  )} */}
                  <div className="party-info-item">
                    <MapPin size={14} />
                    <span>{match.crop_standard?.preferred_location || t('anywhere')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="product-details-section">
            <h3>
              <Package size={16} />
              {t('product_details')}
            </h3>
            <div className="product-details-grid">
              <div className="product-detail-card">
                <h4>{t('stock_details')}</h4>
                <table className="details-table">
                  <tr>
                    <td>{t('product')}:</td>
                    <td><strong>{match.stock?.product_name}</strong></td>
                  </tr>
                  <tr>
                    <td>{t('quantity')}:</td>
                    <td><strong>{match.available_quantity?.toLocaleString()} kg</strong></td>
                  </tr>
                  <tr>
                    <td>{t('quality')}:</td>
                    <td><strong>Grade {match.stock?.quality_grade}</strong></td>
                  </tr>
                  <tr>
                    <td>{t('price')}:</td>
                    <td><strong>{match.farmer_price?.toLocaleString()} RWF/kg</strong></td>
                  </tr>
                  <tr>
                    <td>{t('location')}:</td>
                    <td><strong>{match.stock?.location}</strong></td>
                  </tr>
                </table>
              </div>

              <div className="product-detail-card">
                <h4>{t('standard_details')}</h4>
                <table className="details-table">
                  <tr>
                    <td>{t('crop')}:</td>
                    <td><strong>{match.crop_standard?.crop_name}</strong></td>
                  </tr>
                  <tr>
                    <td>{t('min_quantity')}:</td>
                    <td><strong>{match.crop_standard?.min_quantity?.toLocaleString()} kg</strong></td>
                  </tr>
                  {match.crop_standard?.max_quantity && (
                    <tr>
                      <td>{t('max_quantity')}:</td>
                      <td><strong>{match.crop_standard.max_quantity.toLocaleString()} kg</strong></td>
                    </tr>
                  )}
                  <tr>
                    <td>{t('quality_required')}:</td>
                    <td><strong>Grade {match.crop_standard?.quality_grade}+</strong></td>
                  </tr>
                  <tr>
                    <td>{t('price_offered')}:</td>
                    <td><strong>{match.buyer_price?.toLocaleString()} RWF/kg</strong></td>
                  </tr>
                </table>
              </div>
            </div>
          </div>

          {/* Match Criteria Breakdown */}
          <div className="criteria-section">
            <h3>
              <CheckCircle size={16} />
              {t('matching_criteria_breakdown')}
            </h3>
            <div className="criteria-list">
              {allDetails.map((detail, index) => (
                <div key={index} className={`criteria-item ${detail.type}`}>
                  {detail.type === 'match' && <CheckCircle size={16} className="icon-match" />}
                  {detail.type === 'warning' && <AlertCircle size={16} className="icon-warning" />}
                  {detail.type === 'mismatch' && <X size={16} className="icon-mismatch" />}
                  <span>{detail.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Price Comparison */}
          <div className="price-comparison-section">
            <h3>
              <DollarSign size={16} />
              {t('price_comparison')}
            </h3>
            <div className="price-bars">
              <div className="price-bar-item">
                <span className="price-label">{t('farmer_price')}</span>
                <div className="price-bar-container">
                  <div
                    className="price-bar farmer-bar"
                    style={{
                      width: `${(match.farmer_price / Math.max(match.farmer_price, match.buyer_price)) * 100}%`
                    }}
                  >
                    {match.farmer_price?.toLocaleString()} RWF/kg
                  </div>
                </div>
              </div>
              <div className="price-bar-item">
                <span className="price-label">{t('buyer_price')}</span>
                <div className="price-bar-container">
                  <div
                    className="price-bar buyer-bar"
                    style={{
                      width: `${(match.buyer_price / Math.max(match.farmer_price, match.buyer_price)) * 100}%`
                    }}
                  >
                    {match.buyer_price?.toLocaleString()} RWF/kg
                  </div>
                </div>
              </div>
            </div>
            <div className="price-summary">
              <div className={`price-difference ${match.price_difference > 0 ? 'positive' : 'negative'}`}>
                <strong>{t('price_difference')}:</strong>
                <span>
                  {match.price_difference > 0 ? '+' : ''}{match.price_difference?.toLocaleString()} RWF/kg
                </span>
              </div>
              <div className="favorable-indicator">
                <strong>{t('favorable_for')}:</strong>
                <span>
                  {match.favorable_for_farmer ? t('farmer') : match.favorable_for_buyer ? t('buyer') : t('both')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="match-actions">
            <button
              className="action-btn primary"
              onClick={() => onContactBuyer(match.buyer?.id, match.buyer?.full_name)}
            >
              <MessageCircle size={16} />
              {t('contact_buyer')}
            </button>
            <button
              className="action-btn contract"
              onClick={handleGenerateContract}
              style={{
                background: 'linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%)',
                color: 'white'
              }}
            >
              <FileText size={16} />
              {t('generate_contract')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsOverview({ stats }) {
  const { t } = useTranslation();

  return (
    <div className="stats-overview">
      <SummaryCard
        title={t('total_matches')}
        value={stats.total_matches || 0}
        icon={<Handshake size={24} />}
        color="#2d5a2d"
        bgColor="#e8f5e9"
        subtitle="Last 30 days"
        trend={12}
        trendValue={12}
      />
      <SummaryCard
        title={t('avg_match_score')}
        value={`${(stats.average_score || 0).toFixed(1)}%`}
        icon={<Star size={24} />}
        color="#b76e0a"
        bgColor="#fff8e1"
        subtitle="Across all matches"
      />
      <SummaryCard
        title={t('high_quality_matches')}
        value={stats.high_quality_matches || 0}
        icon={<Award size={24} />}
        color="#1565c0"
        bgColor="#e3f2fd"
        subtitle="90%+ match score"
      />
      <SummaryCard
        title={t('total_value')}
        value={`${(stats.total_potential_value || 0).toLocaleString()} RWF`}
        icon={<DollarSign size={24} />}
        color="#7e22ce"
        bgColor="#f3e8ff"
        subtitle="Potential transaction value"
      />
    </div>
  );
}

function DistributionChart({ title, data, icon: Icon, type = 'product' }) {
  const { t } = useTranslation();

  const colors = {
    product: ['#2d5a2d', '#3b7a3b', '#4c9a4c', '#6db46d', '#8fce8f'],
    location: ['#1565c0', '#1e7ae5', '#3f9eff', '#6bb5ff', '#9acdff']
  };

  const chartColors = colors[type] || colors.product;

  return (
    <div className="distribution-chart">
      <div className="chart-header">
        {Icon && <Icon size={16} />}
        <h3>{title}</h3>
      </div>
      <div className="chart-body">
        {Object.entries(data).map(([key, value], index) => (
          <div key={key} className="chart-item">
            <div className="chart-item-label">
              <span className="label-text">{key}</span>
              <span className="label-value">{value.count}</span>
              {/* <span className="label-percent">
                ({((value.count / Object.values(data).reduce((a, b) => a + b.count, 0)) * 100).toFixed(1)}%)
              </span> */}
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{
                  width: `${(value.count / Object.values(data).reduce((a, b) => a + b.count, 0)) * 100}%`,
                  backgroundColor: chartColors[index % chartColors.length]
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FarmerMarketMatching() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [contacting, setContacting] = useState(false);

  // ── Core state ──────────────────────────────────────────────────────────────
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const abortControllerRef = useRef(null);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showMatchDetails, setShowMatchDetails] = useState(false);

  // ── Pagination state ────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState(initialFilters);
  const [activeFilters, setActiveFilters] = useState(initialFilters);

  // ── Stats state ─────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total_matches: 0,
    average_score: 0,
    high_quality_matches: 0,
    total_potential_value: 0,
    by_product: {},
    by_location: {}
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getAuthToken = () => {
    return localStorage.getItem('access_token') ||
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('access_token') ||
      sessionStorage.getItem('accessToken') ||
      '';
  };

  const getUserLanguage = () => {
    return localStorage.getItem("language") || i18n.language || "en";
  };

  // ── API client ───────────────────────────────────────────────────────────────
  const apiClient = useMemo(() => {
    const client = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

    client.interceptors.request.use((config) => {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      config.headers['Accept-Language'] = getUserLanguage();
      config.headers['Content-Type'] = 'application/json';
      return config;
    });

    client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          toast.error(t('session_expired'));
          ['access_token', 'accessToken', 'refresh_token', 'refreshToken', 'user']
            .forEach(k => localStorage.removeItem(k));
          setTimeout(() => { window.location.href = '/login'; }, 2000);
        }
        return Promise.reject(error);
      }
    );

    return client;
  }, [t]);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const fetchMatches = useCallback(async (fetchFilters, page, size) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setFetchError(null);

      const params = new URLSearchParams({
        page: page,
        page_size: size,
        ...(fetchFilters.product && { product_name: fetchFilters.product }),
        ...(fetchFilters.min_score && { min_match_score: fetchFilters.min_score }),
        ...(fetchFilters.farmer && { farmer_name: fetchFilters.farmer }),
        ...(fetchFilters.buyer && { buyer_name: fetchFilters.buyer }),
        ...(fetchFilters.location && { location: fetchFilters.location }),
        ...(fetchFilters.date_from && { date_from: fetchFilters.date_from }),
        ...(fetchFilters.date_to && { date_to: fetchFilters.date_to }),
        ...(fetchFilters.search && { search: fetchFilters.search })
      });

      const response = await apiClient.get(`/market-matching/farmer/matches/?${params}`, {
        signal: abortControllerRef.current.signal
      });

      if (response.data) {
        setMatches(response.data.matches || []);
        setTotalItems(response.data.count || 0);
        setTotalPages(Math.ceil((response.data.count || 0) / size));
        setStats({
          total_matches: response.data.statistics?.total_matches || 0,
          average_score: response.data.statistics?.average_score || 0,
          high_quality_matches: response.data.statistics?.high_quality_matches || 0,
          total_potential_value: response.data.statistics?.total_potential_value || 0,
          by_product: response.data.statistics?.by_product || {},
          by_location: response.data.statistics?.by_location || {}
        });
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }

      console.error('Error fetching matches:', error);
      setFetchError(error.message);

      const errorMsg = error.response?.data?.error ||
        (error.request ? t('network_error') : t('failed_to_fetch_matches'));

      if (!error.message?.includes('abort')) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [apiClient, t]);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      toast.error(t('authentication_required'));
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      return;
    }

    fetchMatches(activeFilters, currentPage, pageSize);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setActiveFilters(filters);
    setCurrentPage(1);
    fetchMatches(filters, 1, pageSize);
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    setActiveFilters(initialFilters);
    setCurrentPage(1);
    fetchMatches(initialFilters, 1, pageSize);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchMatches(activeFilters, page, pageSize);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    fetchMatches(activeFilters, 1, newSize);
  };

  const handleRefresh = () => {
    fetchMatches(activeFilters, currentPage, pageSize);
    toast.success(t('data_refreshed'));
  };

  const handleViewDetails = (match) => {
    setSelectedMatch(match);
    setShowMatchDetails(true);
  };

  const handleCloseDetails = () => {
    setShowMatchDetails(false);
    setSelectedMatch(null);
  };


  const handleContact = async (userId, userName, role) => {
    if (contacting) return;

    setContacting(true);
    const loadingToast = toast.loading(t('opening_chat...'));

    try {
      // First, check if a chat already exists with this user
      const response = await apiClient.get(`/chat/my-chats/`, {
        params: {
          search: userName,
          chat_type: "one_on_one",
          page_size: 100 // Increase page size to find the chat
        }
      });

      let chatId = null;
      let existingChat = null;

      // Look for existing one-on-one chat with this user
      if (response.data.chats && response.data.chats.length > 0) {
        // Find chat where this user is a participant
        existingChat = response.data.chats.find(chat => {
          if (chat.chat_type !== "one_on_one") return false;

          // Check if the user is a participant
          const participants = chat.participants || [];
          return participants.some(p => {
            const participantId = p.user?.id || p.id;
            return participantId === userId;
          });
        });

        if (existingChat) {
          chatId = existingChat.id;
        }
      }

      // If no existing chat, create a new one
      if (!chatId) {
        const createResponse = await apiClient.post("/chat/create/", {
          chat_type: "one_on_one",
          user_id: userId,
          name: `Chat with ${userName}`
        });

        if (createResponse.data.chat) {
          chatId = createResponse.data.chat.id;
        } else {
          throw new Error("Failed to create chat");
        }
      }

      // Verify we have a valid chat ID
      if (!chatId) {
        throw new Error("No chat ID received");
      }

      // Update loading toast
      toast.update(loadingToast, {
        render: t('chat_ready_redirecting'),
        type: 'success',
        isLoading: false,
        autoClose: 1500
      });

      // Navigate to chat management with the chat ID
      setTimeout(() => {
        navigate('/farmer/chats', {
          state: {
            openChatId: chatId,
            userId: userId,
            userName: userName,
            role: role,
            timestamp: Date.now() // Add timestamp to ensure state is unique
          },
          replace: false // Use replace: false to add to history
        });
      }, 1000);

    } catch (error) {
      console.error('Error handling contact:', error);
      toast.update(loadingToast, {
        render: t('failed_to_open_chat'),
        type: 'error',
        isLoading: false,
        autoClose: 3000
      });
    } finally {
      setContacting(false);
    }
  };
  

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="market-matching-container">
      <ToastContainer position="top-right" autoClose={5000} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        .market-matching-container {
          font-family: 'Inter', sans-serif;
          background-color: #f8fafc;
          min-height: 100vh;
          padding: 24px;
        }

        /* Page Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left h1 {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .header-left p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .refresh-btn:hover {
          background: #f8fafc;
          border-color: #2d5a2d;
          color: #2d5a2d;
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .export-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }

        /* Stats Overview */
        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }

        .summary-card-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .summary-card-title {
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          margin: 0 0 8px 0;
        }

        .summary-card-value {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .summary-card-subtitle {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }

        .summary-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .trend-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          margin-top: 8px;
        }

        .trend-indicator.positive {
          color: #2e7d32;
        }

        .trend-indicator.negative {
          color: #c62828;
        }

        /* Filter Bar */
        .filter-bar {
          background: white;
          border-radius: 16px;
          margin-bottom: 24px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          overflow: hidden;
        }

        .filter-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .filter-bar-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #1e293b;
        }

        .filter-total {
          margin-left: 12px;
          padding: 4px 10px;
          background: #e8f5e9;
          color: #2d5a2d;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .filter-bar-actions {
          display: flex;
          gap: 8px;
        }

        .filter-clear-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 12px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-clear-btn:hover {
          background: #fee2e2;
          border-color: #ef4444;
          color: #b91c1c;
        }

        .filter-expand-btn {
          padding: 6px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-expand-btn:hover {
          background: #f8fafc;
          color: #2d5a2d;
        }

        .filter-bar-body {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }

        .filter-bar-body.expanded {
          max-height: 300px;
        }

        .filter-row {
          padding: 16px 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .filter-row.expanded {
          background: #f8fafc;
        }

        .filter-group {
          display: flex;
          gap: 12px;
          flex: 1;
          min-width: 300px;
        }

        .filter-select {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          color: #1e293b;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-select:focus {
          outline: none;
          border-color: #2d5a2d;
          box-shadow: 0 0 0 3px rgba(45,90,45,0.1);
        }

        .filter-input {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .filter-input:focus {
          outline: none;
          border-color: #2d5a2d;
          box-shadow: 0 0 0 3px rgba(45,90,45,0.1);
        }

        .search-wrapper {
          flex: 1;
          display: flex;
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 10px 16px;
          padding-right: 45px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #2d5a2d;
          box-shadow: 0 0 0 3px rgba(45,90,45,0.1);
        }

        .search-btn {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          width: 45px;
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }

        .search-btn:hover {
          color: #2d5a2d;
        }

        .filter-bar-footer {
          padding: 12px 20px;
          background: #f8fafc;
          text-align: right;
        }

        .apply-filters-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 24px;
          background: #2d5a2d;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .apply-filters-btn:hover {
          background: #1e3c1e;
        }

        /* Distribution Charts */
        .distribution-charts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        .distribution-chart {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .chart-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .chart-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0;
        }

        .chart-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chart-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .chart-item-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
        }

        .label-text {
          flex: 1;
          color: #475569;
        }

        .label-value {
          font-weight: 600;
          color: #0f172a;
        }

        .label-percent {
          color: #64748b;
          font-size: 12px;
          min-width: 50px;
        }

        .progress-bar-container {
          height: 8px;
          background: #f1f5f9;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        /* Match Score Badge */
        .match-score-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        /* Matches Grid */
        .matches-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .match-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          cursor: pointer;
          border: 1px solid #e2e8f0;
        }

        .match-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
          border-color: #2d5a2d;
        }

        .match-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .match-product-info {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .product-icon {
          padding: 8px;
          background: #f1f5f9;
          border-radius: 12px;
          color: #475569;
        }

        .match-product-name {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 2px 0;
        }

        .match-quality {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }

        .match-card-parties {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .match-party {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .party-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .party-details {
          display: flex;
          flex-direction: column;
        }

        .party-role {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
        }

        .party-name {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
        }

        .party-location {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 10px;
          color: #64748b;
        }

        .match-vs {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2d5a2d;
        }

        .match-card-details {
          margin-bottom: 16px;
        }

        .match-detail-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 8px;
        }

        .match-detail-item {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .detail-icon {
          color: #64748b;
          margin-top: 2px;
        }

        .detail-label {
          display: block;
          font-size: 11px;
          color: #64748b;
        }

        .detail-value {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
        }

        .match-price-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
        }

        .price-diff {
          margin-left: auto;
          font-weight: 600;
        }

        .match-card-footer {
          display: flex;
          justify-content: flex-end;
        }

        .view-details-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #e8f5e9;
          color: #2d5a2d;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-details-btn:hover {
          background: #2d5a2d;
          color: white;
        }

        /* Pagination */
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          flex-wrap: wrap;
          gap: 16px;
        }

        .pagination-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 14px;
          flex-wrap: wrap;
        }

        .page-size-select {
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
        }

        .pagination-controls {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .pagination-btn {
          min-width: 36px;
          height: 36px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          font-size: 14px;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #2d5a2d;
          color: #2d5a2d;
        }

        .pagination-btn.active {
          background: #2d5a2d;
          border-color: #2d5a2d;
          color: white;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-ellipsis {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          color: #94a3b8;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          padding: 16px;
        }

        .modal {
          background: white;
          border-radius: 24px;
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }

        .modal-header {
          padding: 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }

        .modal-header h2 {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .modal-header p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .modal-close {
          background: #f1f5f9;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          background: #fee2e2;
          color: #b91c1c;
        }

        .modal-body {
          padding: 24px;
        }

        .modal-footer {
          padding: 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          position: sticky;
          bottom: 0;
          background: white;
        }

        /* Score Overview Card */
        .score-overview-card {
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 24px;
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .score-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 4px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 700;
        }

        .score-info h3 {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .score-info p {
          font-size: 14px;
          color: #475569;
          margin: 0;
        }

        /* Parties Section */
        .parties-section,
        .product-details-section,
        .criteria-section,
        .price-comparison-section {
          margin-bottom: 24px;
        }

        .parties-section h3,
        .product-details-section h3,
        .criteria-section h3,
        .price-comparison-section h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 16px 0;
        }

        .parties-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .party-card {
          background: #f8fafc;
          border-radius: 16px;
          padding: 20px;
        }

        .party-card-header {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 16px;
        }

        .party-avatar-large {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .party-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .party-card-header h4 {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0;
        }

        .party-card-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .party-info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #475569;
        }

        /* Product Details Grid */
        .product-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .product-detail-card {
          background: #f8fafc;
          border-radius: 16px;
          padding: 20px;
        }

        .product-detail-card h4 {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 16px 0;
        }

        .details-table {
          width: 100%;
        }

        .details-table tr td {
          padding: 8px 0;
          font-size: 13px;
        }

        .details-table tr td:first-child {
          color: #64748b;
          width: 40%;
        }

        .details-table tr td:last-child {
          color: #0f172a;
          font-weight: 500;
        }

        /* Criteria List */
        .criteria-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .criteria-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
        }

        .criteria-item.match {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .criteria-item.warning {
          background: #fff8e1;
          color: #b76e0a;
        }

        .criteria-item.mismatch {
          background: #ffebee;
          color: #c62828;
        }

        .icon-match {
          color: #2e7d32;
        }

        .icon-warning {
          color: #b76e0a;
        }

        .icon-mismatch {
          color: #c62828;
        }

        /* Price Comparison */
        .price-bars {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .price-bar-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .price-label {
          width: 100px;
          font-size: 13px;
          color: #475569;
        }

        .price-bar-container {
          flex: 1;
          height: 36px;
          background: #f1f5f9;
          border-radius: 18px;
          overflow: hidden;
        }

        .price-bar {
          height: 100%;
          display: flex;
          align-items: center;
          padding: 0 16px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
        }

        .price-bar.farmer-bar {
          background: #1565c0;
        }

        .price-bar.buyer-bar {
          background: #b76e0a;
        }

        .price-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .price-difference {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .price-difference.positive {
          color: #2e7d32;
        }

        .price-difference.negative {
          color: #c62828;
        }

        .favorable-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #475569;
        }

        /* Match Actions */
        .match-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn.primary {
          background: #2d5a2d;
          color: white;
          border: none;
        }

        .action-btn.primary:hover {
          background: #1e3c1e;
        }

        .action-btn.secondary {
          background: #f8fafc;
          color: #1e293b;
          border: 1px solid #e2e8f0;
        }

        .action-btn.secondary:hover {
          background: #e8f5e9;
          border-color: #2d5a2d;
          color: #2d5a2d;
        }

        .btn-cancel {
          padding: 12px 24px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel:hover {
          background: #f8fafc;
        }

        .btn-save {
          padding: 12px 24px;
          background: linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-save:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
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

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px;
          color: #94a3b8;
          font-size: 16px;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .distribution-charts {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .market-matching-container {
            padding: 16px;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
          }

          .refresh-btn,
          .export-btn {
            flex: 1;
          }

          .filter-row {
            flex-direction: column;
          }

          .filter-group {
            flex-direction: column;
            min-width: 100%;
          }

          .parties-grid {
            grid-template-columns: 1fr;
          }

          .product-details-grid {
            grid-template-columns: 1fr;
          }

          .match-actions {
            flex-direction: column;
          }

          .matches-grid {
            grid-template-columns: 1fr;
          }

          .pagination-container {
            flex-direction: column;
            align-items: flex-start;
          }

          .pagination-controls {
            width: 100%;
            justify-content: center;
          }

          .score-overview-card {
            flex-direction: column;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .summary-cards {
            grid-template-columns: 1fr;
          }

          .pagination-info {
            flex-direction: column;
            align-items: flex-start;
          }

          .match-card-parties {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .match-vs {
            display: none;
          }

          .match-detail-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="page-header">
        <div className="header-left">
          <h1>{t('market_matching')}</h1>
          <p>{t('market_matching_description')}</p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={handleRefresh}>
            <RefreshCw size={16} />
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview stats={stats} />

      {/* Distribution Charts */}
      <div className="distribution-charts">
        <DistributionChart
          title={t('matches_by_product')}
          data={stats.by_product}
          icon={Package}
          type="product"
        />
        <DistributionChart
          title={t('matches_by_location')}
          data={stats.by_location}
          icon={MapPin}
          type="location"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={handleApplyFilters}
        onClear={handleClearFilters}
        totalMatches={totalItems}
      />

      {/* Matches Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : matches.length === 0 ? (
        <div className="empty-state">
          {t('no_matches_found')}
        </div>
      ) : (
        <>
          <div className="matches-grid">
            {matches.map((match, index) => (
              <MatchCard
                key={`${match.stock?.id}-${match.crop_standard?.id}-${index}`}
                match={match}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            totalItems={totalItems}
          />
        </>
      )}

      {/* Match Details Modal */}
      {showMatchDetails && selectedMatch && (
        <MatchDetailsModal
          match={selectedMatch}
          onClose={handleCloseDetails}
          onContactFarmer={handleContact}
          onContactBuyer={handleContact}
        />
      )}
    </div>
  );
}