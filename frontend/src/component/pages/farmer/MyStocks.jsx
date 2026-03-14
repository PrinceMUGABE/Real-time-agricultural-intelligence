/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Plus, X, Search, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Edit2, Trash2,
  Package, MapPin, Calendar, ArrowUp, ArrowDown,
  RefreshCw, Truck, AlertTriangle, Eye, Download,
  Filter, Grid, List, BarChart2, TrendingUp,
  TrendingDown, Layers, CheckCircle, Clock,
  MoreVertical, ChevronDown, FileText, Copy,
  Printer, Archive, DollarSign, Users, Home,
  Briefcase, Box, FolderOpen, AlertCircle,
  Check, Download as DownloadIcon, Upload,
  PieChart, Activity, Zap
} from "lucide-react";
import locationData from "../../common/locationData.json";

// API Base URL
const API_BASE_URL = "http://127.0.0.1:8000/stock";

// Initial empty form for stock creation/editing
const emptyStockForm = {
  product_name: "",
  quantity: "",
  quality_grade: "B",
  province: "",
  district: "",
  sector: "",
  cell: "",
  village: "",
  description: "",
  is_active: true
};

// Initial empty form for movement creation
const emptyMovementForm = {
  stock: "",
  movement_type: "in",
  quantity: "",
  to_province: "",
  to_district: "",
  to_sector: "",
  to_cell: "",
  to_village: "",
  reference_number: "",
  notes: ""
};

// Quality grade options
const qualityGrades = [
  { value: "A", label: "Grade A - Premium", color: "#2e7d32", bg: "#e8f5e9" },
  { value: "B", label: "Grade B - Standard", color: "#1565c0", bg: "#e3f2fd" },
  { value: "C", label: "Grade C - Economy", color: "#b45309", bg: "#fff7ed" }
];

// Movement type options
const movementTypes = [
  { value: "in", label: "Stock In", icon: ArrowDown, color: "#2e7d32", bg: "#e8f5e9" },
  { value: "out", label: "Stock Out", icon: ArrowUp, color: "#c62828", bg: "#ffebee" },
  { value: "transfer", label: "Transfer", icon: Truck, color: "#1565c0", bg: "#e3f2fd" },
  { value: "adjustment", label: "Adjustment", icon: RefreshCw, color: "#b45309", bg: "#fff7ed" }
];

// Alert severity options
const alertSeverities = [
  { value: "critical", label: "Critical", color: "#b91c1c", bg: "#fee2e2" },
  { value: "warning", label: "Warning", color: "#b45309", bg: "#fff7ed" },
  { value: "info", label: "Info", color: "#2563eb", bg: "#dbeafe" }
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );
}

function SummaryCard({ title, value, icon, subtitle, trend, color, bgColor }) {
  return (
    <div className="summary-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="summary-card-content">
        <div>
          <p className="summary-card-title">{title}</p>
          <h3 className="summary-card-value">{value}</h3>
          {subtitle && <p className="summary-card-subtitle">{subtitle}</p>}
          {trend && (
            <div className="summary-card-trend" style={{ color: trend > 0 ? "#2e7d32" : "#c62828" }}>
              {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{Math.abs(trend)}% from last month</span>
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
  const pageSizeOptions = [5, 10, 20, 50, 100];

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

function FilterBar({ filters, onFilterChange, onSearch, onSort, sortField, sortDirection, viewMode, onViewModeChange }) {
  const { t } = useTranslation();

  const sortOptions = [
    { value: 'product_name', label: t('product_name') },
    { value: 'quantity', label: t('quantity') },
    { value: 'quality_grade', label: t('quality') },
    { value: 'district', label: t('district') },
    { value: 'created_at', label: t('created_date') }
  ];

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <select
          className="filter-select"
          value={filters.quality || ''}
          onChange={(e) => onFilterChange('quality', e.target.value)}
        >
          <option value="">{t('all_qualities')}</option>
          {qualityGrades.map(grade => (
            <option key={grade.value} value={grade.value}>{grade.label}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filters.status || ''}
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          <option value="">{t('all_status')}</option>
          <option value="true">{t('active')}</option>
          <option value="false">{t('inactive')}</option>
        </select>

        <select
          className="filter-select"
          value={filters.low_stock || ''}
          onChange={(e) => onFilterChange('low_stock', e.target.value)}
        >
          <option value="">{t('all_stock_levels')}</option>
          <option value="true">{t('low_stock')}</option>
        </select>
      </div>

      <div className="filter-group">
        <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder={t('search_stocks')}
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
          />
          <button className="search-btn" onClick={onSearch}>
            <Search size={16} />
          </button>
        </div>

        <select
          className="filter-select sort-select"
          value={`${sortField}|${sortDirection}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split('|');
            onSort(field, direction);
          }}
        >
          {sortOptions.map(option => (
            <React.Fragment key={option.value}>
              <option value={`${option.value}|asc`}>{option.label} ↑</option>
              <option value={`${option.value}|desc`}>{option.label} ↓</option>
            </React.Fragment>
          ))}
        </select>

        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => onViewModeChange('grid')}
            title={t('grid_view')}
          >
            <Grid size={16} />
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewModeChange('list')}
            title={t('list_view')}
          >
            <List size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function LocationSelector({ locationParts, onChange, error, isTransfer = false }) {
  const { t } = useTranslation();

  const provinces = locationData.provinces.map(p => p.city || p.province);

  const districts = locationParts.province
    ? (locationData.provinces.find(p => (p.city || p.province) === locationParts.province)?.coordinates?.districts || [])
    : [];

  const sectors = locationParts.district
    ? (districts.find(d => d.name === locationParts.district)?.sectors || [])
    : [];

  const cells = locationParts.sector
    ? (sectors.find(s => s.name === locationParts.sector)?.cells || [])
    : [];

  const villages = locationParts.cell
    ? (cells.find(c => c.name === locationParts.cell)?.villages || [])
    : [];

  return (
    <div className="location-selector">
      <div className="location-row">
        <select
          className={`location-select ${error && !locationParts.province ? 'error' : ''}`}
          value={locationParts.province}
          onChange={(e) => onChange({ 
            ...locationParts, 
            province: e.target.value, 
            district: "", 
            sector: "",
            cell: "",
            village: ""
          })}
        >
          <option value="">{t('select_province')}</option>
          {provinces.map(province => (
            <option key={province} value={province}>{province}</option>
          ))}
        </select>
      </div>

      <div className="location-row">
        <select
          className={`location-select ${error && !locationParts.district ? 'error' : ''}`}
          value={locationParts.district}
          onChange={(e) => onChange({ 
            ...locationParts, 
            district: e.target.value, 
            sector: "",
            cell: "",
            village: ""
          })}
          disabled={!locationParts.province}
        >
          <option value="">{t('select_district')}</option>
          {districts.map(district => (
            <option key={district.name} value={district.name}>{district.name}</option>
          ))}
        </select>
      </div>

      <div className="location-row">
        <select
          className={`location-select ${error && !locationParts.sector ? 'error' : ''}`}
          value={locationParts.sector}
          onChange={(e) => onChange({ 
            ...locationParts, 
            sector: e.target.value, 
            cell: "",
            village: ""
          })}
          disabled={!locationParts.district}
        >
          <option value="">{t('select_sector')}</option>
          {sectors.map(sector => (
            <option key={sector.name} value={sector.name}>{sector.name}</option>
          ))}
        </select>
      </div>

      {isTransfer && (
        <>
          <div className="location-row">
            <select
              className={`location-select ${error && !locationParts.cell ? 'error' : ''}`}
              value={locationParts.cell}
              onChange={(e) => onChange({ 
                ...locationParts, 
                cell: e.target.value, 
                village: ""
              })}
              disabled={!locationParts.sector}
            >
              <option value="">{t('select_cell')}</option>
              {cells.map(cell => (
                <option key={cell.name} value={cell.name}>{cell.name}</option>
              ))}
            </select>
          </div>

          <div className="location-row">
            <select
              className={`location-select ${error && !locationParts.village ? 'error' : ''}`}
              value={locationParts.village}
              onChange={(e) => onChange({ 
                ...locationParts, 
                village: e.target.value
              })}
              disabled={!locationParts.cell}
            >
              <option value="">{t('select_village')}</option>
              {villages.map(village => (
                <option key={village.name} value={village.name}>{village.name}</option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

function StockCard({ stock, onView, onEdit, onDelete, t }) {
  const qualityGrade = qualityGrades.find(g => g.value === stock.quality_grade) || qualityGrades[1];
  
  const getStockStatus = (quantity) => {
    if (quantity < 100) return { label: t('low_stock'), color: "#c62828", bg: "#ffebee" };
    if (quantity < 500) return { label: t('medium_stock'), color: "#b45309", bg: "#fff7ed" };
    return { label: t('high_stock'), color: "#2e7d32", bg: "#e8f5e9" };
  };

  const status = getStockStatus(stock.quantity);

  return (
    <div className="stock-card">
      <div className="stock-card-header">
        <div className="stock-card-title">
          <h3>{stock.product_name}</h3>
          <span className="stock-id">#{stock.id}</span>
        </div>
        <div className="stock-card-actions">
          <button className="stock-action-btn" onClick={() => onView(stock)} title={t('view_details')}>
            <Eye size={16} />
          </button>
          <button className="stock-action-btn" onClick={() => onEdit(stock)} title={t('edit')}>
            <Edit2 size={16} />
          </button>
          <button className="stock-action-btn delete" onClick={() => onDelete(stock.id)} title={t('delete')}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="stock-card-body">
        <div className="stock-quantity">
          <span className="quantity-value">{stock.quantity}</span>
          <span className="quantity-unit">kg</span>
        </div>

        <div className="stock-badges">
          <span className="stock-badge" style={{ backgroundColor: qualityGrade.bg, color: qualityGrade.color }}>
            {qualityGrade.label}
          </span>
          <span className="stock-badge" style={{ backgroundColor: status.bg, color: status.color }}>
            {status.label}
          </span>
          {!stock.is_active && (
            <span className="stock-badge" style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
              {t('inactive')}
            </span>
          )}
        </div>

        <div className="stock-location">
          <MapPin size={14} />
          <span>{stock.location?.village}, {stock.location?.sector}</span>
        </div>

        <div className="stock-stats">
          <div className="stock-stat">
            <Package size={14} />
            <span>{stock.movements_count || 0} {t('movements')}</span>
          </div>
          <div className="stock-stat">
            <Calendar size={14} />
            <span>{new Date(stock.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="stock-card-footer">
        <button className="stock-footer-btn" onClick={() => onView(stock)}>
          {t('view_movements')}
        </button>
      </div>
    </div>
  );
}

function MovementsTable({ movements, onView, onEdit, onDelete, t }) {
  return (
    <table className="movements-table">
      <thead>
        <tr>
          <th>{t('date')}</th>
          <th>{t('type')}</th>
          <th>{t('quantity')}</th>
          <th>{t('from_to')}</th>
          <th>{t('reference')}</th>
          <th>{t('created_by')}</th>
          <th>{t('notes')}</th>
          <th>{t('actions')}</th>
        </tr>
      </thead>
      <tbody>
        {movements.map(movement => {
          const movementType = movementTypes.find(t => t.value === movement.movement_type) || movementTypes[0];
          const MovementIcon = movementType.icon;
          
          return (
            <tr key={movement.id}>
              <td>
                <div className="movement-date">
                  {new Date(movement.created_at).toLocaleDateString()}
                  <small>{new Date(movement.created_at).toLocaleTimeString()}</small>
                </div>
              </td>
              <td>
                <span className="movement-type-badge" style={{ backgroundColor: movementType.bg, color: movementType.color }}>
                  <MovementIcon size={12} />
                  {movementType.label}
                </span>
              </td>
              <td className="movement-quantity">
                <span style={{ color: movement.movement_type === 'out' ? '#c62828' : '#2e7d32' }}>
                  {movement.movement_type === 'out' ? '-' : '+'}{movement.quantity} kg
                </span>
              </td>
              <td>
                {movement.movement_type === 'transfer' ? (
                  <div className="movement-location">
                    <div>From: {movement.from_location?.village}</div>
                    <div>To: {movement.to_location?.village}</div>
                  </div>
                ) : (
                  movement.from_location?.village || '-'
                )}
              </td>
              <td>{movement.reference_number || '-'}</td>
              <td>{movement.created_by_details?.full_name || '-'}</td>
              <td>
                <div className="movement-notes" title={movement.notes}>
                  {movement.notes ? movement.notes.substring(0, 20) + (movement.notes.length > 20 ? '...' : '') : '-'}
                </div>
              </td>
              <td>
                <div className="movement-actions">
                  <button className="movement-action-btn" onClick={() => onView(movement)} title={t('view')}>
                    <Eye size={14} />
                  </button>
                  <button className="movement-action-btn" onClick={() => onEdit(movement)} title={t('edit')}>
                    <Edit2 size={14} />
                  </button>
                  <button className="movement-action-btn delete" onClick={() => onDelete(movement.id)} title={t('delete')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function AlertsList({ alerts, onResolve, t }) {
  return (
    <div className="alerts-list">
      {alerts.map(alert => {
        const severity = alertSeverities.find(s => s.value === alert.severity) || alertSeverities[2];
        
        return (
          <div key={alert.id} className="alert-item" style={{ borderLeftColor: severity.color }}>
            <div className="alert-icon" style={{ backgroundColor: severity.bg, color: severity.color }}>
              <AlertCircle size={16} />
            </div>
            <div className="alert-content">
              <div className="alert-header">
                <span className="alert-type">{alert.alert_type}</span>
                <span className="alert-severity" style={{ backgroundColor: severity.bg, color: severity.color }}>
                  {severity.label}
                </span>
              </div>
              <p className="alert-message">{alert.message}</p>
              <div className="alert-footer">
                <span className="alert-date">{new Date(alert.created_at).toLocaleDateString()}</span>
                {!alert.is_resolved && (
                  <button className="alert-resolve-btn" onClick={() => onResolve(alert.id)}>
                    <Check size={14} />
                    {t('resolve')}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StockDetailModal({ stock, onClose, onAddMovement, onEditMovement, onDeleteMovement, t }) {
  const [activeTab, setActiveTab] = useState('movements');
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementFilters, setMovementFilters] = useState({ type: '', from_date: '', to_date: '' });
  const [movementPage, setMovementPage] = useState(1);
  const [movementPageSize, setMovementPageSize] = useState(10);
  const [movementTotal, setMovementTotal] = useState(0);
  const abortControllerRef = useRef(null);

  const fetchMovements = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      setMovementsLoading(true);
      
      const params = new URLSearchParams({
        page: movementPage,
        page_size: movementPageSize,
        ...(movementFilters.type && { type: movementFilters.type }),
        ...(movementFilters.from_date && { from_date: movementFilters.from_date }),
        ...(movementFilters.to_date && { to_date: movementFilters.to_date })
      });

      const response = await apiClient.get(`/farmer/stocks/${stock.id}/movements/?${params}`, {
        signal: abortControllerRef.current.signal
      });

      if (response.data) {
        setMovements(response.data.movements || []);
        setMovementTotal(response.data.total || 0);
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;
      console.error('Error fetching movements:', error);
      toast.error(t('failed_to_fetch_movements'));
    } finally {
      setMovementsLoading(false);
    }
  }, [stock.id, movementPage, movementPageSize, movementFilters, t]);

  useEffect(() => {
    fetchMovements();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchMovements]);

  const handleMovementFilterChange = (key, value) => {
    setMovementFilters(prev => ({ ...prev, [key]: value }));
    setMovementPage(1);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal stock-detail-modal">
        <div className="modal-header">
          <div>
            <h2>{stock.product_name}</h2>
            <p className="stock-location-header">{stock.location?.full}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="stock-detail-summary">
          <div className="summary-item">
            <span className="summary-label">{t('current_quantity')}</span>
            <span className="summary-value">{stock.quantity} kg</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{t('quality_grade')}</span>
            <span className="summary-value">
              <span className="quality-badge" style={{ 
                backgroundColor: qualityGrades.find(g => g.value === stock.quality_grade)?.bg,
                color: qualityGrades.find(g => g.value === stock.quality_grade)?.color
              }}>
                {qualityGrades.find(g => g.value === stock.quality_grade)?.label}
              </span>
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{t('total_movements')}</span>
            <span className="summary-value">{stock.movements_count}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">{t('status')}</span>
            <span className="summary-value">
              <span className="status-badge" style={{
                backgroundColor: stock.is_active ? '#e8f5e9' : '#ffebee',
                color: stock.is_active ? '#2e7d32' : '#c62828'
              }}>
                {stock.is_active ? t('active') : t('inactive')}
              </span>
            </span>
          </div>
        </div>

        <div className="stock-detail-tabs">
          <button 
            className={`tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
            onClick={() => setActiveTab('movements')}
          >
            <Activity size={16} />
            {t('movements')}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            <BarChart2 size={16} />
            {t('statistics')}
          </button>
          <button 
            className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <AlertCircle size={16} />
            {t('alerts')}
          </button>
        </div>

        <div className="stock-detail-content">
          {activeTab === 'movements' && (
            <>
              <div className="movements-filter-bar">
                <select
                  className="filter-select"
                  value={movementFilters.type}
                  onChange={(e) => handleMovementFilterChange('type', e.target.value)}
                >
                  <option value="">{t('all_types')}</option>
                  {movementTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>

                <input
                  type="date"
                  className="filter-date"
                  value={movementFilters.from_date}
                  onChange={(e) => handleMovementFilterChange('from_date', e.target.value)}
                  placeholder={t('from_date')}
                />

                <input
                  type="date"
                  className="filter-date"
                  value={movementFilters.to_date}
                  onChange={(e) => handleMovementFilterChange('to_date', e.target.value)}
                  placeholder={t('to_date')}
                />

                <button className="add-movement-btn" onClick={() => onAddMovement(stock)}>
                  <Plus size={16} />
                  {t('add_movement')}
                </button>
              </div>

              {movementsLoading ? (
                <LoadingSpinner />
              ) : movements.length === 0 ? (
                <div className="empty-state">
                  <Package size={48} />
                  <p>{t('no_movements_found')}</p>
                </div>
              ) : (
                <>
                  <div className="table-wrapper">
                    <MovementsTable
                      movements={movements}
                      onView={() => {}}
                      onEdit={onEditMovement}
                      onDelete={onDeleteMovement}
                      t={t}
                    />
                  </div>

                  <Pagination
                    currentPage={movementPage}
                    totalPages={Math.ceil(movementTotal / movementPageSize)}
                    onPageChange={setMovementPage}
                    pageSize={movementPageSize}
                    onPageSizeChange={setMovementPageSize}
                    totalItems={movementTotal}
                  />
                </>
              )}
            </>
          )}

          {activeTab === 'statistics' && (
            <div className="statistics-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>{t('movement_summary')}</h4>
                  <div className="stat-row">
                    <span>{t('total_in')}:</span>
                    <span className="stat-value positive">+{stock.total_movements_in || 0} kg</span>
                  </div>
                  <div className="stat-row">
                    <span>{t('total_out')}:</span>
                    <span className="stat-value negative">-{stock.total_movements_out || 0} kg</span>
                  </div>
                  <div className="stat-row total">
                    <span>{t('net_change')}:</span>
                    <span className={`stat-value ${(stock.total_movements_in - stock.total_movements_out) >= 0 ? 'positive' : 'negative'}`}>
                      {(stock.total_movements_in - stock.total_movements_out) >= 0 ? '+' : ''}
                      {stock.total_movements_in - stock.total_movements_out} kg
                    </span>
                  </div>
                </div>

                <div className="stat-card">
                  <h4>{t('stock_value')}</h4>
                  <div className="stat-row">
                    <span>{t('estimated_value')}:</span>
                    <span className="stat-value">{stock.current_value?.estimated?.toLocaleString()} RWF</span>
                  </div>
                  <div className="stat-row">
                    <span>{t('price_per_kg')}:</span>
                    <span className="stat-value">1,000 RWF</span>
                  </div>
                </div>

                <div className="stat-card">
                  <h4>{t('movement_frequency')}</h4>
                  <div className="stat-row">
                    <span>{t('avg_daily')}:</span>
                    <span className="stat-value">
                      {(stock.movements_count / 30).toFixed(1)} {t('per_day')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="alerts-content">
              {stock.alerts?.length > 0 ? (
                <AlertsList alerts={stock.alerts} onResolve={() => {}} t={t} />
              ) : (
                <div className="empty-state">
                  <CheckCircle size={48} color="#2e7d32" />
                  <p>{t('no_alerts')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MovementFormModal({ isOpen, onClose, onSubmit, stock, editingMovement, t }) {
  const [form, setForm] = useState(emptyMovementForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingMovement) {
      setForm({
        stock: editingMovement.stock,
        movement_type: editingMovement.movement_type,
        quantity: editingMovement.quantity,
        to_province: editingMovement.to_province || "",
        to_district: editingMovement.to_district || "",
        to_sector: editingMovement.to_sector || "",
        to_cell: editingMovement.to_cell || "",
        to_village: editingMovement.to_village || "",
        reference_number: editingMovement.reference_number || "",
        notes: editingMovement.notes || ""
      });
    } else {
      setForm({
        ...emptyMovementForm,
        stock: stock?.id || ""
      });
    }
  }, [editingMovement, stock]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  const handleLocationChange = (locationParts) => {
    setForm(prev => ({
      ...prev,
      to_province: locationParts.province || "",
      to_district: locationParts.district || "",
      to_sector: locationParts.sector || "",
      to_cell: locationParts.cell || "",
      to_village: locationParts.village || ""
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.quantity) {
      newErrors.quantity = t('quantity_required');
    } else if (parseFloat(form.quantity) <= 0) {
      newErrors.quantity = t('quantity_positive');
    }

    if (form.movement_type === 'transfer') {
      if (!form.to_province) newErrors.to_province = t('province_required');
      if (!form.to_district) newErrors.to_district = t('district_required');
      if (!form.to_sector) newErrors.to_sector = t('sector_required');
      if (!form.to_cell) newErrors.to_cell = t('cell_required');
      if (!form.to_village) newErrors.to_village = t('village_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (error) {
      console.error('Error submitting movement:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const locationParts = {
    province: form.to_province,
    district: form.to_district,
    sector: form.to_sector,
    cell: form.to_cell,
    village: form.to_village
  };

  const MovementIcon = movementTypes.find(t => t.value === form.movement_type)?.icon || ArrowDown;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal movement-form-modal">
        <div className="modal-header">
          <div>
            <h2>{editingMovement ? t('edit_movement') : t('add_movement')}</h2>
            <p>{stock?.product_name} - {t('current_quantity')}: {stock?.quantity} kg</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>{t('movement_type')} *</label>
            <div className="movement-type-selector">
              {movementTypes.map(type => {
                const TypeIcon = type.icon;
                return (
                  <button
                    key={type.value}
                    className={`type-btn ${form.movement_type === type.value ? 'active' : ''}`}
                    style={{
                      backgroundColor: form.movement_type === type.value ? type.bg : '#f8fafc',
                      color: form.movement_type === type.value ? type.color : '#64748b'
                    }}
                    onClick={() => handleChange('movement_type', type.value)}
                  >
                    <TypeIcon size={16} />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>{t('quantity')} (kg) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={`form-control ${errors.quantity ? 'error' : ''}`}
              value={form.quantity}
              onChange={(e) => handleChange('quantity', e.target.value)}
              placeholder="0.00"
            />
            {errors.quantity && <div className="error-message">{errors.quantity}</div>}
          </div>

          {form.movement_type === 'transfer' && (
            <div className="form-group">
              <label>{t('destination_location')} *</label>
              <LocationSelector
                locationParts={locationParts}
                onChange={handleLocationChange}
                error={Object.keys(errors).some(k => k.startsWith('to_'))}
                isTransfer={true}
              />
            </div>
          )}

          <div className="form-group">
            <label>{t('reference_number')}</label>
            <input
              type="text"
              className="form-control"
              value={form.reference_number}
              onChange={(e) => handleChange('reference_number', e.target.value)}
              placeholder={t('invoice_order_number')}
            />
          </div>

          <div className="form-group">
            <label>{t('notes')}</label>
            <textarea
              className="form-control"
              rows="3"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder={t('additional_notes')}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={submitting}>
            {t('cancel')}
          </button>
          <button className="btn-save" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('saving') : (editingMovement ? t('update') : t('create'))}
          </button>
        </div>
      </div>
    </div>
  );
}

function StockFormModal({ isOpen, onClose, onSubmit, editingStock, t }) {
  const [form, setForm] = useState(emptyStockForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingStock) {
      setForm({
        product_name: editingStock.product_name || "",
        quantity: editingStock.quantity || "",
        quality_grade: editingStock.quality_grade || "B",
        province: editingStock.province || "",
        district: editingStock.district || "",
        sector: editingStock.sector || "",
        cell: editingStock.cell || "",
        village: editingStock.village || "",
        description: editingStock.description || "",
        is_active: editingStock.is_active !== undefined ? editingStock.is_active : true
      });
    } else {
      setForm(emptyStockForm);
    }
  }, [editingStock]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  const handleLocationChange = (locationParts) => {
    setForm(prev => ({
      ...prev,
      province: locationParts.province || "",
      district: locationParts.district || "",
      sector: locationParts.sector || "",
      cell: locationParts.cell || "",
      village: locationParts.village || ""
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.product_name.trim()) {
      newErrors.product_name = t('product_name_required');
    }

    if (!form.quantity) {
      newErrors.quantity = t('quantity_required');
    } else if (parseFloat(form.quantity) <= 0) {
      newErrors.quantity = t('quantity_positive');
    }

    if (!form.province) newErrors.province = t('province_required');
    if (!form.district) newErrors.district = t('district_required');
    if (!form.sector) newErrors.sector = t('sector_required');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (error) {
      console.error('Error submitting stock:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const locationParts = {
    province: form.province,
    district: form.district,
    sector: form.sector,
    cell: form.cell,
    village: form.village
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal stock-form-modal">
        <div className="modal-header">
          <div>
            <h2>{editingStock ? t('edit_stock') : t('add_new_stock')}</h2>
            <p>{editingStock ? t('update_stock_details') : t('fill_stock_details')}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>{t('product_name')} *</label>
            <input
              type="text"
              className={`form-control ${errors.product_name ? 'error' : ''}`}
              value={form.product_name}
              onChange={(e) => handleChange('product_name', e.target.value)}
              placeholder={t('enter_product_name')}
            />
            {errors.product_name && <div className="error-message">{errors.product_name}</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('quantity')} (kg) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className={`form-control ${errors.quantity ? 'error' : ''}`}
                value={form.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                placeholder="0.00"
              />
              {errors.quantity && <div className="error-message">{errors.quantity}</div>}
            </div>

            <div className="form-group">
              <label>{t('quality_grade')}</label>
              <select
                className="form-control"
                value={form.quality_grade}
                onChange={(e) => handleChange('quality_grade', e.target.value)}
              >
                {qualityGrades.map(grade => (
                  <option key={grade.value} value={grade.value}>{grade.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>{t('location')} *</label>
            <LocationSelector
              locationParts={locationParts}
              onChange={handleLocationChange}
              error={errors.province || errors.district || errors.sector}
              isTransfer={false}
            />
          </div>

          <div className="form-group">
            <label>{t('description')}</label>
            <textarea
              className="form-control"
              rows="3"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={t('enter_description')}
            />
          </div>

          <div className="form-group">
            <label>{t('status')}</label>
            <select
              className="form-control"
              value={form.is_active ? 'true' : 'false'}
              onChange={(e) => handleChange('is_active', e.target.value === 'true')}
            >
              <option value="true">{t('active')}</option>
              <option value="false">{t('inactive')}</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={submitting}>
            {t('cancel')}
          </button>
          <button className="btn-save" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('saving') : (editingStock ? t('update') : t('create'))}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyStockManagement() {
  const { t } = useTranslation();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [summary, setSummary] = useState({});
  const abortControllerRef = useRef(null);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [editingMovement, setEditingMovement] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);

  // ── Pagination state ─────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // ── Filter / sort state ──────────────────────────────────────────────────────
  const [filters, setFilters] = useState({ 
    quality: '', 
    status: '', 
    low_stock: '',
    search: '' 
  });
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [viewMode, setViewMode] = useState('grid');

  // ── Stats ────────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({
    total_stocks: 0,
    total_quantity: 0,
    active_stocks: 0,
    low_stock_alerts: 0,
    total_movements: 0
  });

  // ── Alerts ────────────────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getAuthToken = () =>
    localStorage.getItem('access_token') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('access_token') ||
    sessionStorage.getItem('accessToken') ||
    '';

  const getUserLanguage = () =>
    localStorage.getItem("language") || i18n.language || "en";

  // ── API client ───────────────────────────────────────────────────────────────
  const apiClient = useMemo(() => {
    const client = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

    client.interceptors.request.use((config) => {
      const token = getAuthToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
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
          setTimeout(() => { window.location.href = '/'; }, 2000);
        }
        return Promise.reject(error);
      }
    );

    return client;
  }, [t]);

  // ── Fetch stocks ─────────────────────────────────────────────────────────────
  const fetchStocks = useCallback(async (params) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setFetchError(null);

      const queryParams = new URLSearchParams({
        page: params.pageArg,
        page_size: params.pageSizeArg,
        ...(params.sortFieldArg && { sort_by: params.sortFieldArg }),
        ...(params.sortDirectionArg && { sort_dir: params.sortDirectionArg }),
        ...(params.filtersArg.quality && { quality: params.filtersArg.quality }),
        ...(params.filtersArg.status && { is_active: params.filtersArg.status }),
        ...(params.filtersArg.low_stock && { low_stock: params.filtersArg.low_stock }),
        ...(params.filtersArg.search && { product: params.filtersArg.search })
      });

      const response = await apiClient.get(`/farmer/stocks/?${queryParams}`, {
        signal: abortControllerRef.current.signal
      });

      if (response.data) {
        setStocks(response.data.stocks || []);
        setTotalItems(response.data.total || 0);
        setTotalPages(response.data.total_pages || 1);
        setSummary(response.data.summary || {});
        
        // Update stats
        setStats({
          total_stocks: response.data.total || 0,
          total_quantity: response.data.summary?.total_quantity || 0,
          active_stocks: response.data.summary?.active_stocks || 0,
          low_stock_alerts: response.data.summary?.low_stock_alerts || 0,
          total_movements: 0
        });
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;
      console.error('Error fetching stocks:', error);
      setFetchError(error.message);
      toast.error(t('failed_to_fetch_stocks'));
    } finally {
      setLoading(false);
    }
  }, [apiClient, t]);

  // ── Fetch alerts ─────────────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    try {
      setAlertsLoading(true);
      const response = await apiClient.get('/farmer/alerts/unresolved/');
      if (response.data) {
        setAlerts(response.data.alerts || []);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setAlertsLoading(false);
    }
  }, [apiClient]);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      toast.error(t('authentication_required'));
      setTimeout(() => { window.location.href = '/'; }, 2000);
      return;
    }

    fetchStocks({
      filtersArg: filters,
      pageArg: currentPage,
      pageSizeArg: pageSize,
      sortFieldArg: sortField,
      sortDirectionArg: sortDirection
    });

    fetchAlerts();

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter handlers ──────────────────────────────────────────────────────────
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    const newPage = 1;
    setFilters(newFilters);
    setCurrentPage(newPage);
    fetchStocks({
      filtersArg: newFilters,
      pageArg: newPage,
      pageSizeArg: pageSize,
      sortFieldArg: sortField,
      sortDirectionArg: sortDirection
    });
  };

  const handleSearch = () => {
    const newPage = 1;
    setCurrentPage(newPage);
    fetchStocks({
      filtersArg: filters,
      pageArg: newPage,
      pageSizeArg: pageSize,
      sortFieldArg: sortField,
      sortDirectionArg: sortDirection
    });
  };

  const handleSort = (field, direction) => {
    const newPage = 1;
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(newPage);
    fetchStocks({
      filtersArg: filters,
      pageArg: newPage,
      pageSizeArg: pageSize,
      sortFieldArg: field,
      sortDirectionArg: direction
    });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchStocks({
      filtersArg: filters,
      pageArg: page,
      pageSizeArg: pageSize,
      sortFieldArg: sortField,
      sortDirectionArg: sortDirection
    });
  };

  const handlePageSizeChange = (newSize) => {
    const newPage = 1;
    setPageSize(newSize);
    setCurrentPage(newPage);
    fetchStocks({
      filtersArg: filters,
      pageArg: newPage,
      pageSizeArg: newSize,
      sortFieldArg: sortField,
      sortDirectionArg: sortDirection
    });
  };

  // ── Stock CRUD handlers ──────────────────────────────────────────────────────
  const handleAddStock = () => {
    setEditingStock(null);
    setStockModalOpen(true);
  };

  const handleEditStock = (stock) => {
    setEditingStock(stock);
    setStockModalOpen(true);
  };

  const handleDeleteStock = async (stockId) => {
    if (!window.confirm(t('confirm_delete_stock'))) return;

    try {
      const response = await apiClient.delete(`/stocks/${stockId}/delete/`);
      if (response.data) {
        toast.success(response.data.message || t('stock_deleted'));
        fetchStocks({
          filtersArg: filters,
          pageArg: currentPage,
          pageSizeArg: pageSize,
          sortFieldArg: sortField,
          sortDirectionArg: sortDirection
        });
      }
    } catch (error) {
      console.error('Error deleting stock:', error);
      toast.error(error.response?.data?.error || t('failed_to_delete_stock'));
    }
  };

  const handleSubmitStock = async (formData) => {
    try {
      const url = editingStock ? `/stocks/${editingStock.id}/update/` : '/stocks/create/';
      const method = editingStock ? 'PUT' : 'POST';

      const response = await apiClient({
        method,
        url,
        data: formData
      });

      if (response.data) {
        toast.success(response.data.message || t('stock_saved'));
        fetchStocks({
          filtersArg: filters,
          pageArg: currentPage,
          pageSizeArg: pageSize,
          sortFieldArg: sortField,
          sortDirectionArg: sortDirection
        });
        fetchAlerts();
      }
    } catch (error) {
      console.error('Error saving stock:', error);
      toast.error(error.response?.data?.error || t('failed_to_save_stock'));
      throw error;
    }
  };

  // ── Movement CRUD handlers ───────────────────────────────────────────────────
  const handleAddMovement = (stock) => {
    setSelectedStock(stock);
    setEditingMovement(null);
    setMovementModalOpen(true);
  };

  const handleEditMovement = (movement) => {
    setEditingMovement(movement);
    setMovementModalOpen(true);
  };

  const handleDeleteMovement = async (movementId) => {
    if (!window.confirm(t('confirm_delete_movement'))) return;

    try {
      const response = await apiClient.delete(`/movements/${movementId}/delete/`);
      if (response.data) {
        toast.success(response.data.message || t('movement_deleted'));
        
        // Refresh stock details if modal is open
        if (selectedStock) {
          const stockResponse = await apiClient.get(`/farmer/stocks/${selectedStock.id}/`);
          if (stockResponse.data) {
            setSelectedStock(stockResponse.data.stock);
          }
        }
        
        fetchStocks({
          filtersArg: filters,
          pageArg: currentPage,
          pageSizeArg: pageSize,
          sortFieldArg: sortField,
          sortDirectionArg: sortDirection
        });
      }
    } catch (error) {
      console.error('Error deleting movement:', error);
      toast.error(error.response?.data?.error || t('failed_to_delete_movement'));
    }
  };

  const handleSubmitMovement = async (formData) => {
    try {
      const url = editingMovement ? `/movements/${editingMovement.id}/update/` : '/movements/create/';
      const method = editingMovement ? 'PUT' : 'POST';

      const response = await apiClient({
        method,
        url,
        data: formData
      });

      if (response.data) {
        toast.success(response.data.message || t('movement_saved'));
        
        // Refresh stock details if modal is open
        if (selectedStock) {
          const stockResponse = await apiClient.get(`/farmer/stocks/${selectedStock.id}/`);
          if (stockResponse.data) {
            setSelectedStock(stockResponse.data.stock);
          }
        }
        
        fetchStocks({
          filtersArg: filters,
          pageArg: currentPage,
          pageSizeArg: pageSize,
          sortFieldArg: sortField,
          sortDirectionArg: sortDirection
        });
        fetchAlerts();
      }
    } catch (error) {
      console.error('Error saving movement:', error);
      toast.error(error.response?.data?.error || t('failed_to_save_movement'));
      throw error;
    }
  };

  // ── Alert handlers ───────────────────────────────────────────────────────────
  const handleResolveAlert = async (alertId) => {
    try {
      const response = await apiClient.post(`/alerts/${alertId}/resolve/`);
      if (response.data) {
        toast.success(t('alert_resolved'));
        fetchAlerts();
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error(t('failed_to_resolve_alert'));
    }
  };

  // ── Stock detail handlers ────────────────────────────────────────────────────
  const handleViewStock = async (stock) => {
    try {
      const response = await apiClient.get(`/farmer/stocks/${stock.id}/`);
      if (response.data) {
        setSelectedStock(response.data.stock);
        setDetailModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching stock details:', error);
      toast.error(t('failed_to_fetch_stock_details'));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="stock-management-container">
      <ToastContainer position="top-right" autoClose={5000} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        .stock-management-container {
          font-family: 'Inter', sans-serif;
          background-color: #f8fafc;
          min-height: 100vh;
          padding: 24px;
        }

        /* Header Styles */
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
          margin: 0;
        }

        .header-left p {
          font-size: 14px;
          color: #64748b;
          margin: 4px 0 0;
        }

        .header-right {
          display: flex;
          gap: 12px;
        }

        .add-stock-btn, .export-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .add-stock-btn {
          background: linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%);
          color: white;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .add-stock-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }

        .export-btn {
          background: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
        }

        .export-btn:hover {
          background: #f8fafc;
          border-color: #2d5a2d;
        }

        /* Alerts Bar */
        .alerts-bar {
          background: white;
          border-radius: 12px;
          padding: 12px 20px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          border-left: 4px solid #b91c1c;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .alerts-icon {
          background: #fee2e2;
          color: #b91c1c;
          padding: 8px;
          border-radius: 8px;
        }

        .alerts-content {
          flex: 1;
        }

        .alerts-title {
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .alerts-list-compact {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .alert-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #f1f5f9;
          border-radius: 20px;
          font-size: 13px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .alert-tag:hover {
          background: #fee2e2;
          color: #b91c1c;
        }

        .alert-tag.critical {
          background: #fee2e2;
          color: #b91c1c;
        }

        .alert-severity-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        /* Summary Cards */
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }

        .summary-card-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .summary-card-title {
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          margin: 0 0 4px;
        }

        .summary-card-value {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .summary-card-subtitle {
          font-size: 12px;
          color: #64748b;
          margin: 2px 0 0;
        }

        .summary-card-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          margin-top: 4px;
        }

        .summary-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        /* Filter Bar */
        .filter-bar {
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .filter-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filter-select {
          padding: 10px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          color: #1e293b;
          background: white;
          cursor: pointer;
          min-width: 150px;
          transition: all 0.2s ease;
        }

        .filter-select:focus {
          outline: none;
          border-color: #2d5a2d;
          box-shadow: 0 0 0 3px rgba(45,90,45,0.1);
        }

        .search-wrapper {
          display: flex;
          position: relative;
        }

        .search-input {
          padding: 10px 16px;
          padding-right: 45px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          width: 280px;
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

        .sort-select {
          min-width: 160px;
        }

        .view-mode-toggle {
          display: flex;
          gap: 4px;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 8px;
        }

        .view-mode-btn {
          padding: 6px 12px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s ease;
        }

        .view-mode-btn:hover {
          background: white;
          color: #2d5a2d;
        }

        .view-mode-btn.active {
          background: white;
          color: #2d5a2d;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        /* Stock Grid */
        .stock-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .stock-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
        }

        .stock-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
          border-color: #2d5a2d;
        }

        .stock-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .stock-card-title h3 {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 4px;
        }

        .stock-id {
          font-size: 12px;
          color: #94a3b8;
        }

        .stock-card-actions {
          display: flex;
          gap: 4px;
        }

        .stock-action-btn {
          padding: 6px;
          border: none;
          background: #f8fafc;
          border-radius: 6px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s ease;
        }

        .stock-action-btn:hover {
          background: #e8f5e9;
          color: #2d5a2d;
        }

        .stock-action-btn.delete:hover {
          background: #fee2e2;
          color: #b91c1c;
        }

        .stock-card-body {
          margin-bottom: 16px;
        }

        .stock-quantity {
          margin-bottom: 12px;
        }

        .quantity-value {
          font-size: 24px;
          font-weight: 700;
          color: #2d5a2d;
        }

        .quantity-unit {
          font-size: 14px;
          color: #64748b;
          margin-left: 4px;
        }

        .stock-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .stock-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .stock-location {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #475569;
          font-size: 13px;
          margin-bottom: 12px;
        }

        .stock-stats {
          display: flex;
          gap: 16px;
        }

        .stock-stat {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 13px;
        }

        .stock-card-footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
        }

        .stock-footer-btn {
          width: 100%;
          padding: 10px;
          border: 1px solid #2d5a2d;
          background: transparent;
          border-radius: 8px;
          color: #2d5a2d;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .stock-footer-btn:hover {
          background: #2d5a2d;
          color: white;
        }

        /* Stock List View */
        .stock-list {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          margin-bottom: 24px;
        }

        .stock-list table {
          width: 100%;
          border-collapse: collapse;
        }

        .stock-list th {
          background: #f8fafc;
          padding: 16px 20px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
        }

        .stock-list td {
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
          color: #1e293b;
        }

        .stock-list tbody tr {
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .stock-list tbody tr:hover {
          background: #f8fafc;
        }

        /* Movements Table */
        .movements-table {
          width: 100%;
          border-collapse: collapse;
        }

        .movements-table th {
          background: #f8fafc;
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
        }

        .movements-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 13px;
          color: #1e293b;
        }

        .movements-table tbody tr:hover {
          background: #f8fafc;
        }

        .movement-date {
          display: flex;
          flex-direction: column;
        }

        .movement-date small {
          font-size: 11px;
          color: #94a3b8;
        }

        .movement-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }

        .movement-quantity {
          font-weight: 600;
        }

        .movement-location {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
        }

        .movement-notes {
          max-width: 150px;
          color: #64748b;
        }

        .movement-actions {
          display: flex;
          gap: 4px;
        }

        .movement-action-btn {
          padding: 4px;
          border: none;
          background: #f8fafc;
          border-radius: 4px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s ease;
        }

        .movement-action-btn:hover {
          background: #e8f5e9;
          color: #2d5a2d;
        }

        .movement-action-btn.delete:hover {
          background: #fee2e2;
          color: #b91c1c;
        }

        /* Alerts List */
        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .alert-item {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: white;
          border-radius: 12px;
          border-left: 4px solid;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .alert-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .alert-content {
          flex: 1;
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .alert-type {
          font-weight: 600;
          color: #0f172a;
          text-transform: capitalize;
        }

        .alert-severity {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .alert-message {
          font-size: 14px;
          color: #475569;
          margin: 0 0 8px;
        }

        .alert-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .alert-date {
          font-size: 12px;
          color: #94a3b8;
        }

        .alert-resolve-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border: none;
          background: #e8f5e9;
          color: #2d5a2d;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .alert-resolve-btn:hover {
          background: #2d5a2d;
          color: white;
        }

        /* Stock Detail Modal */
        .stock-detail-modal {
          max-width: 1000px;
          width: 90%;
        }

        .stock-detail-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
        }

        .summary-label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .summary-value {
          font-size: 18px;
          font-weight: 600;
          color: #0f172a;
        }

        .stock-detail-tabs {
          display: flex;
          gap: 4px;
          padding: 0 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
        }

        .tab-btn:hover {
          color: #2d5a2d;
        }

        .tab-btn.active {
          color: #2d5a2d;
          border-bottom-color: #2d5a2d;
        }

        .stock-detail-content {
          padding: 20px;
          max-height: 500px;
          overflow-y: auto;
        }

        .movements-filter-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-date {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
        }

        .add-movement-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #2d5a2d;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-left: auto;
        }

        .add-movement-btn:hover {
          background: #1e3c1e;
        }

        /* Statistics Content */
        .statistics-content {
          padding: 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
        }

        .stat-card h4 {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 16px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .stat-row.total {
          font-weight: 600;
          color: #0f172a;
          margin-top: 8px;
        }

        .stat-value {
          font-weight: 500;
        }

        .stat-value.positive {
          color: #2e7d32;
        }

        .stat-value.negative {
          color: #c62828;
        }

        /* Movement Type Selector */
        .movement-type-selector {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .type-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .type-btn:hover {
          border-color: #2d5a2d;
        }

        .type-btn.active {
          border-color: transparent;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }

        .stock-form-modal {
          max-width: 600px;
          width: 90%;
        }

        .movement-form-modal {
          max-width: 500px;
          width: 90%;
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
          margin: 0;
        }

        .modal-header p {
          font-size: 14px;
          color: #64748b;
          margin: 4px 0 0;
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

        /* Form Styles */
        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
        }

        .form-control {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .form-control:focus {
          outline: none;
          border-color: #2d5a2d;
          box-shadow: 0 0 0 3px rgba(45,90,45,0.1);
        }

        .form-control.error {
          border-color: #dc2626;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        textarea.form-control {
          resize: vertical;
          min-height: 80px;
        }

        .error-message {
          font-size: 12px;
          color: #dc2626;
          margin-top: 4px;
        }

        /* Location Selector */
        .location-selector {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .location-row {
          width: 100%;
        }

        .location-select {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          color: #1e293b;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .location-select:focus {
          outline: none;
          border-color: #2d5a2d;
          box-shadow: 0 0 0 3px rgba(45,90,45,0.1);
        }

        .location-select.error {
          border-color: #dc2626;
        }

        .location-select:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Button Styles */
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

        .btn-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
        }

        .btn-save:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Pagination Styles */
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
          to {
            transform: rotate(360deg);
          }
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px;
          color: #94a3b8;
        }

        .empty-state svg {
          margin-bottom: 16px;
          color: #cbd5e1;
        }

        .empty-state p {
          font-size: 16px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .stock-management-container {
            padding: 16px;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-right {
            width: 100%;
            flex-direction: column;
          }

          .filter-bar {
            flex-direction: column;
          }

          .filter-group {
            width: 100%;
          }

          .search-input {
            width: 100%;
          }

          .form-row {
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

          .stock-detail-summary {
            grid-template-columns: 1fr 1fr;
          }

          .movement-type-selector {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .summary-cards {
            grid-template-columns: 1fr;
          }

          .filter-select {
            width: 100%;
          }

          .pagination-info {
            flex-direction: column;
            align-items: flex-start;
          }

          .stock-detail-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="page-header">
        <div className="header-left">
          <h1>{t('stock_management')}</h1>
          <p>{t('manage_your_stocks_and_movements')}</p>
        </div>
        <div className="header-right">
          <button className="export-btn">
            <Download size={16} />
            {t('export')}
          </button>
          <button className="add-stock-btn" onClick={handleAddStock}>
            <Plus size={18} />
            {t('add_stock')}
          </button>
        </div>
      </div>

      {/* Alerts Bar */}
      {alerts.length > 0 && (
        <div className="alerts-bar">
          <div className="alerts-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="alerts-content">
            <div className="alerts-title">
              {t('you_have_alerts', { count: alerts.length })}
            </div>
            <div className="alerts-list-compact">
              {alerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="alert-tag" onClick={() => handleResolveAlert(alert.id)}>
                  <span className="alert-severity-dot" style={{ backgroundColor: alertSeverities.find(s => s.value === alert.severity)?.color }} />
                  {alert.stock_details?.product_name}: {alert.message}
                </div>
              ))}
              {alerts.length > 3 && (
                <div className="alert-tag">
                  +{alerts.length - 3} {t('more')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-cards">
        <SummaryCard
          title={t('total_stocks')}
          value={stats.total_stocks}
          icon={<Package size={24} />}
          color="#2d5a2d"
          bgColor="#e8f5e9"
        />
        <SummaryCard
          title={t('total_quantity')}
          value={`${stats.total_quantity.toLocaleString()} kg`}
          icon={<Layers size={24} />}
          color="#1565c0"
          bgColor="#e3f2fd"
        />
        <SummaryCard
          title={t('active_stocks')}
          value={stats.active_stocks}
          icon={<CheckCircle size={24} />}
          color="#0284c7"
          bgColor="#e0f2fe"
        />
        <SummaryCard
          title={t('low_stock_alerts')}
          value={stats.low_stock_alerts}
          icon={<AlertTriangle size={24} />}
          color="#b45309"
          bgColor="#fff7ed"
        />
        <SummaryCard
          title={t('total_movements')}
          value={stats.total_movements}
          icon={<Activity size={24} />}
          color="#7e22ce"
          bgColor="#f3e8ff"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        onSort={handleSort}
        sortField={sortField}
        sortDirection={sortDirection}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Stocks Display */}
      {loading ? (
        <LoadingSpinner />
      ) : stocks.length === 0 ? (
        <div className="empty-state">
          <Package size={64} />
          <p>{t('no_stocks_found')}</p>
          <button className="add-stock-btn" onClick={handleAddStock} style={{ marginTop: '16px' }}>
            <Plus size={18} />
            {t('add_your_first_stock')}
          </button>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="stock-grid">
              {stocks.map(stock => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  onView={handleViewStock}
                  onEdit={handleEditStock}
                  onDelete={handleDeleteStock}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="stock-list">
              <table>
                <thead>
                  <tr>
                    <th>{t('product')}</th>
                    <th>{t('quantity')}</th>
                    <th>{t('quality')}</th>
                    <th>{t('location')}</th>
                    <th>{t('status')}</th>
                    <th>{t('movements')}</th>
                    <th>{t('created')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map(stock => {
                    const qualityGrade = qualityGrades.find(g => g.value === stock.quality_grade) || qualityGrades[1];
                    return (
                      <tr key={stock.id} onClick={() => handleViewStock(stock)}>
                        <td>
                          <strong>{stock.product_name}</strong>
                          <div><small>#{stock.id}</small></div>
                        </td>
                        <td><strong>{stock.quantity} kg</strong></td>
                        <td>
                          <span style={{ color: qualityGrade.color }}>
                            {qualityGrade.label}
                          </span>
                        </td>
                        <td>{stock.location?.village}, {stock.location?.sector}</td>
                        <td>
                          <span style={{
                            color: stock.is_active ? '#2e7d32' : '#c62828',
                            background: stock.is_active ? '#e8f5e9' : '#ffebee',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {stock.is_active ? t('active') : t('inactive')}
                          </span>
                        </td>
                        <td>{stock.movements_count || 0}</td>
                        <td>{new Date(stock.created_at).toLocaleDateString()}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="movement-actions">
                            <button className="movement-action-btn" onClick={() => handleEditStock(stock)}>
                              <Edit2 size={14} />
                            </button>
                            <button className="movement-action-btn delete" onClick={() => handleDeleteStock(stock.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

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

      {/* Stock Form Modal */}
      <StockFormModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        onSubmit={handleSubmitStock}
        editingStock={editingStock}
        t={t}
      />

      {/* Movement Form Modal */}
      <MovementFormModal
        isOpen={movementModalOpen}
        onClose={() => {
          setMovementModalOpen(false);
          setEditingMovement(null);
        }}
        onSubmit={handleSubmitMovement}
        stock={selectedStock}
        editingMovement={editingMovement}
        t={t}
      />

      {/* Stock Detail Modal */}
      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedStock(null);
          }}
          onAddMovement={handleAddMovement}
          onEditMovement={handleEditMovement}
          onDeleteMovement={handleDeleteMovement}
          t={t}
        />
      )}
    </div>
  );
}