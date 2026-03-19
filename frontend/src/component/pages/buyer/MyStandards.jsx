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
    ChevronsLeft, ChevronsRight, Edit2, Trash2, Eye,
    Package, MapPin, Calendar, ArrowUp, ArrowDown,
    RefreshCw, AlertTriangle, Download, Filter, Grid, List,
    BarChart2, TrendingUp, TrendingDown, Layers, CheckCircle,
    Clock, MoreVertical, ChevronDown, FileText, Copy, Printer,
    Archive, DollarSign, Users, Home, Briefcase, Box,
    FolderOpen, AlertCircle, Check, Download as DownloadIcon,
    Upload, PieChart, Activity, Zap, Award, Leaf, Sun,
    Cloud, Droplet, Wind, Thermometer, Calendar as CalendarIcon,
    Hash, Tag, Star, Percent, Weight, Scale, TrendingUp as TrendUp,
    TrendingDown as TrendDown, Minus, Plus as PlusIcon, Globe,
    ArrowRight, Star as StarIcon
} from "lucide-react";
import locationData from "../../common/locationData.json";

// API Base URL
const API_BASE_URL = "http://127.0.0.1:8000/standard";


// Quality grade options (matching backend)
const qualityGrades = [
    { value: "A", label: "Grade A - Premium", color: "#2e7d32", bg: "#e8f5e9", icon: <StarIcon size={12} /> },
    { value: "B", label: "Grade B - Standard", color: "#1565c0", bg: "#e3f2fd", icon: <Check size={12} /> },
    { value: "C", label: "Grade C - Economy", color: "#b45309", bg: "#fff7ed", icon: <Package size={12} /> }
];

// Crop type options
const cropTypes = [
    { value: "new", label: "New Harvest - Fresh", color: "#2e7d32", bg: "#e8f5e9" },
    { value: "old", label: "Old Stock - Previous Season", color: "#b45309", bg: "#fff7ed" },
    { value: "mixed", label: "Mixed - Combination", color: "#1565c0", bg: "#e3f2fd" }
];

// Rwandan agricultural seasons
const seasons = [
    { value: "A", label: "Season A (September - January)", short: "Season A", months: "Sep-Jan", color: "#2e7d32", bg: "#e8f5e9" },
    { value: "B", label: "Season B (February - May)", short: "Season B", months: "Feb-May", color: "#1565c0", bg: "#e3f2fd" },
    { value: "C", label: "Season C (June - August)", short: "Season C", months: "Jun-Aug", color: "#b45309", bg: "#fff7ed" },
    { value: "D", label: "Season D - Long rains", short: "Season D", months: "Mar-Jun", color: "#7e22ce", bg: "#f3e8ff" }
];

// Status options
const statusOptions = [
    { value: "active", label: "Active", color: "#2e7d32", bg: "#e8f5e9", icon: CheckCircle },
    { value: "inactive", label: "Inactive", color: "#64748b", bg: "#f1f5f9", icon: Minus },
    { value: "expired", label: "Expired", color: "#b91c1c", bg: "#fee2e2", icon: AlertCircle }
];


// Initial empty form for standard creation/editing
const emptyStandardForm = {
    crop_name: "",
    crop_type: "new",
    season: "A",
    harvest_year: new Date().getFullYear(),
    quality_grade: "B",
    price_per_kg: "",
    min_quantity: "",
    max_quantity: "",
    description: "",
    preferred_location: "",
    status: "active",
    buyer_id: "" // Empty means create for self (admin)
};

// Location selector component for preferred location field
function LocationSelector({ value, onChange, error, t }) {
    const ANYWHERE_VALUE = "anywhere";

    // Parse location string into parts
    const parseLocation = (locationStr) => {
        if (!locationStr || locationStr === ANYWHERE_VALUE) {
            return { province: ANYWHERE_VALUE, district: "", sector: "" };
        }
        const [province = "", district = "", sector = ""] = locationStr.split(',').map(p => p.trim());
        return { province, district, sector };
    };

    // Format location parts into string
    const formatLocation = (parts) => {
        if (parts.province === ANYWHERE_VALUE) {
            return ANYWHERE_VALUE;
        }
        return [parts.province, parts.district, parts.sector].filter(Boolean).join(', ');
    };

    const [locationParts, setLocationParts] = useState(parseLocation(value));

    // Update parent when location parts change
    const handleLocationChange = (newParts) => {
        setLocationParts(newParts);
        const locationString = formatLocation(newParts);
        onChange(locationString);
    };

    const handleProvinceChange = (province) => {
        const newParts = {
            province,
            district: "",
            sector: ""
        };
        handleLocationChange(newParts);
    };

    const handleDistrictChange = (district) => {
        const newParts = {
            ...locationParts,
            district,
            sector: ""
        };
        handleLocationChange(newParts);
    };

    const handleSectorChange = (sector) => {
        const newParts = {
            ...locationParts,
            sector
        };
        handleLocationChange(newParts);
    };

    // Get provinces list with "Anywhere" option
    const provinces = [
        { value: ANYWHERE_VALUE, label: t('anywhere_in_rwanda') },
        ...locationData.provinces.map(p => ({
            value: p.city || p.province,
            label: p.city || p.province
        }))
    ];

    // Get districts for selected province
    const districts = locationParts.province && locationParts.province !== ANYWHERE_VALUE
        ? (locationData.provinces.find(p => (p.city || p.province) === locationParts.province)?.coordinates?.districts || [])
        : [];

    // Get sectors for selected district
    const sectors = locationParts.district
        ? (districts.find(d => d.name === locationParts.district)?.sectors || [])
        : [];

    return (
        <div className="location-selector">
            <div className="location-row">
                <select
                    className={`location-select ${error && !locationParts.province ? 'error' : ''}`}
                    value={locationParts.province}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                >
                    <option value="">{t('select_province')}</option>
                    {provinces.map(province => (
                        <option key={province.value} value={province.value}>
                            {province.label}
                        </option>
                    ))}
                </select>
            </div>

            {locationParts.province && locationParts.province !== ANYWHERE_VALUE && (
                <>
                    <div className="location-row">
                        <select
                            className={`location-select ${error && !locationParts.district ? 'error' : ''}`}
                            value={locationParts.district}
                            onChange={(e) => handleDistrictChange(e.target.value)}
                        >
                            <option value="">{t('select_district')}</option>
                            {districts.map(district => (
                                <option key={district.name} value={district.name}>
                                    {district.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {locationParts.district && (
                        <div className="location-row">
                            <select
                                className={`location-select ${error && !locationParts.sector ? 'error' : ''}`}
                                value={locationParts.sector}
                                onChange={(e) => handleSectorChange(e.target.value)}
                            >
                                <option value="">{t('select_sector')}</option>
                                {sectors.map(sector => (
                                    <option key={sector.name} value={sector.name}>
                                        {sector.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </>
            )}

            {locationParts.province === ANYWHERE_VALUE && (
                <div className="location-hint">
                    <Globe size={14} />
                    <span>{t('anywhere_location_hint')}</span>
                </div>
            )}
        </div>
    );
}

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

function FilterBar({ filters, onFilterChange, onSearch, onSort, sortField, sortDirection, viewMode, onViewModeChange, standards = [] }) {
    const { t } = useTranslation();

    // Extract unique values from standards data
    const getUniqueValues = (field) => {
        if (!standards || standards.length === 0) return [];

        const values = standards
            .map(s => s[field])
            .filter((value, index, self) =>
                value && self.indexOf(value) === index
            )
            .sort();

        return values;
    };

    // Get unique crop names
    const cropOptions = getUniqueValues('crop_name').map(crop => ({
        value: crop,
        label: crop
    }));

    // Get unique seasons with their display names
    const seasonOptions = standards
        .filter(s => s.season && s.season_display)
        .map(s => ({
            value: s.season,
            label: s.season_display
        }))
        .filter((season, index, self) =>
            index === self.findIndex(s => s.value === season.value)
        )
        .sort((a, b) => a.value.localeCompare(b.value));

    // Get unique harvest years
    const yearOptions = getUniqueValues('harvest_year')
        .map(year => ({
            value: year,
            label: year.toString()
        }))
        .sort((a, b) => b.value - a.value); // Sort descending (newest first)

    // Get unique quality grades with their display names
    const qualityOptions = standards
        .filter(s => s.quality_grade && s.quality_display)
        .map(s => ({
            value: s.quality_grade,
            label: s.quality_display,
            color: s.quality_grade === 'A' ? '#2e7d32' :
                s.quality_grade === 'B' ? '#1565c0' : '#b45309'
        }))
        .filter((quality, index, self) =>
            index === self.findIndex(q => q.value === quality.value)
        )
        .sort((a, b) => a.value.localeCompare(b.value));

    // Get unique statuses with their display names
    const statusOptions = standards
        .filter(s => s.status && s.status_display)
        .map(s => ({
            value: s.status,
            label: s.status_display,
            color: s.status === 'active' ? '#2e7d32' :
                s.status === 'inactive' ? '#64748b' : '#b91c1c'
        }))
        .filter((status, index, self) =>
            index === self.findIndex(s => s.value === status.value)
        )
        .sort((a, b) => a.value.localeCompare(b.value));

    const sortOptions = [
        { value: 'crop_name', label: t('crop_name') },
        { value: 'price_per_kg', label: t('price_per_kg') },
        { value: 'harvest_year', label: t('harvest_year') },
        { value: 'status', label: t('status') },
        { value: 'created_at', label: t('created_date') },
        { value: 'min_quantity', label: t('min_quantity') },
        { value: 'max_quantity', label: t('max_quantity') }
    ];

    return (
        <div className="filter-bar">
            <div className="filter-group">
                {/* Crop filter */}
                <select
                    className="filter-select"
                    value={filters.crop || ''}
                    onChange={(e) => onFilterChange('crop', e.target.value)}
                >
                    <option value="">{t('all_crops')}</option>
                    {cropOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                {/* Season filter */}
                <select
                    className="filter-select"
                    value={filters.season || ''}
                    onChange={(e) => onFilterChange('season', e.target.value)}
                >
                    <option value="">{t('all_seasons')}</option>
                    {seasonOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                {/* Year filter */}
                <select
                    className="filter-select"
                    value={filters.year || ''}
                    onChange={(e) => onFilterChange('year', e.target.value)}
                >
                    <option value="">{t('all_years')}</option>
                    {yearOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                {/* Quality filter */}
                <select
                    className="filter-select"
                    value={filters.quality || ''}
                    onChange={(e) => onFilterChange('quality', e.target.value)}
                >
                    <option value="">{t('all_qualities')}</option>
                    {qualityOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                {/* Status filter */}
                <select
                    className="filter-select"
                    value={filters.status || ''}
                    onChange={(e) => onFilterChange('status', e.target.value)}
                >
                    <option value="">{t('all_status')}</option>
                    {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                <div className="search-wrapper">
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('search_standards')}
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

                <button className="export-btn" title={t('export')}>
                    <Download size={16} />
                </button>
            </div>

            {/* Active filters summary */}
            {(filters.crop || filters.season || filters.year || filters.quality || filters.status || filters.buyer) && (
                <div className="active-filters">
                    <span className="active-filters-label">{t('active_filters')}:</span>
                    {filters.crop && (
                        <span className="filter-tag">
                            {t('crop')}: {filters.crop}
                            <X size={12} onClick={() => onFilterChange('crop', '')} />
                        </span>
                    )}
                    {filters.season && (
                        <span className="filter-tag">
                            {t('season')}: {seasons.find(s => s.value === filters.season)?.label || filters.season}
                            <X size={12} onClick={() => onFilterChange('season', '')} />
                        </span>
                    )}
                    {filters.year && (
                        <span className="filter-tag">
                            {t('year')}: {filters.year}
                            <X size={12} onClick={() => onFilterChange('year', '')} />
                        </span>
                    )}
                    {filters.quality && (
                        <span className="filter-tag">
                            {t('quality')}: {qualityOptions.find(q => q.value === filters.quality)?.label || filters.quality}
                            <X size={12} onClick={() => onFilterChange('quality', '')} />
                        </span>
                    )}
                    {filters.status && (
                        <span className="filter-tag">
                            {t('status')}: {statusOptions.find(s => s.value === filters.status)?.label || filters.status}
                            <X size={12} onClick={() => onFilterChange('status', '')} />
                        </span>
                    )}
                    {filters.buyer && (
                        <span className="filter-tag">
                            {t('buyer')}: {buyerOptions.find(b => b.value.toString() === filters.buyer)?.label || filters.buyer}
                            <X size={12} onClick={() => onFilterChange('buyer', '')} />
                        </span>
                    )}
                    <button
                        className="clear-filters-btn"
                        onClick={() => {
                            onFilterChange('crop', '');
                            onFilterChange('season', '');
                            onFilterChange('year', '');
                            onFilterChange('quality', '');
                            onFilterChange('status', '');
                            onFilterChange('search', '');
                        }}
                    >
                        {t('clear_all')}
                    </button>
                </div>
            )}
        </div>
    );
}

function StandardCard({ standard, onView, onEdit, onDelete, t }) {
    const qualityGrade = qualityGrades.find(g => g.value === standard.quality_grade) || qualityGrades[1];
    const seasonInfo = seasons.find(s => s.value === standard.season) || seasons[0];
    const statusInfo = statusOptions.find(s => s.value === standard.status) || statusOptions[1];
    const StatusIcon = statusInfo.icon;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'RWF',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price).replace('RWF', 'RWF');
    };

    return (
        <div className="standard-card">
            <div className="standard-card-header">
                <div className="standard-card-title">
                    <h3>{standard.crop_name}</h3>
                    
                </div>
                <div className="standard-card-actions">
                    <button className="standard-action-btn" onClick={() => onView(standard)} title={t('view_details')}>
                        <Eye size={16} />
                    </button>
                    <button className="standard-action-btn" onClick={() => onEdit(standard)} title={t('edit')}>
                        <Edit2 size={16} />
                    </button>
                    <button className="standard-action-btn delete" onClick={() => onDelete(standard.id)} title={t('delete')}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div className="standard-card-body">

                <div className="standard-price">
                    <span className="price-value">{formatPrice(standard.price_per_kg)}</span>
                    <span className="price-unit">/kg</span>
                </div>

                <div className="standard-badges">
                    <span className="standard-badge" style={{ backgroundColor: qualityGrade.bg, color: qualityGrade.color }}>
                        {qualityGrade.icon} {qualityGrade.label}
                    </span>
                    <span className="standard-badge" style={{ backgroundColor: seasonInfo.bg, color: seasonInfo.color }}>
                        <Calendar size={12} /> {seasonInfo.short} {standard.harvest_year}
                    </span>
                    <span className="standard-badge" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                        <StatusIcon size={12} /> {statusInfo.label}
                    </span>
                </div>

                <div className="standard-quantity-range">
                    <div className="quantity-item">
                        <span className="quantity-label">{t('min')}:</span>
                        <span className="quantity-value">{t('standard.min_quantity', { min: standard.min_quantity })}</span>
                    </div>
                    {standard.max_quantity && (
                        <div className="quantity-item">
                            <span className="quantity-label">{t('max')}:</span>
                            <span className="quantity-value">{t('standard.max_quantity', { max: standard.max_quantity })} kg</span>
                        </div>
                    )}
                </div>

                {standard.preferred_location && (
                    <div className="standard-location">
                        <MapPin size={14} />
                        <span>{standard.preferred_location}</span>
                    </div>
                )}

                {standard.description && (
                    <div className="standard-description" title={standard.description}>
                        {standard.description.length > 60
                            ? standard.description.substring(0, 60) + '...'
                            : standard.description}
                    </div>
                )}

                <div className="standard-stats">
                    <div className="standard-stat">
                        <Calendar size={14} />
                        <span>{new Date(standard.created_at).toLocaleDateString()}</span>
                    </div>
                    {standard.estimated_value && (
                        <div className="standard-stat">
                            <DollarSign size={14} />
                            <span>{formatPrice(standard.estimated_value)}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="standard-card-footer">
                <button className="standard-footer-btn" onClick={() => onView(standard)}>
                    {t('view_details')}
                </button>
            </div>
        </div>
    );
}

function StandardsTable({ standards, onView, onEdit, onDelete, t }) {
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'RWF',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price).replace('RWF', 'RWF');
    };

    return (
        <table className="standards-table">
            <thead>
                <tr>
                    <th>{t('id')}</th>
                    <th>{t('crop_name')}</th>
                    <th>{t('season')}</th>
                    <th>{t('year')}</th>
                    <th>{t('quality')}</th>
                    <th>{t('price_per_kg')}</th>
                    <th>{t('quantity_range')}</th>
                    <th>{t('status')}</th>
                    <th>{t('created_at')}</th>
                    <th>{t('actions')}</th>
                </tr>
            </thead>
            <tbody>
                {standards.map(standard => {
                    const qualityGrade = qualityGrades.find(g => g.value === standard.quality_grade) || qualityGrades[1];
                    const seasonInfo = seasons.find(s => s.value === standard.season) || seasons[0];
                    const statusInfo = statusOptions.find(s => s.value === standard.status) || statusOptions[1];
                    const StatusIcon = statusInfo.icon;

                    return (
                        <tr key={standard.id}>
                            <td>#{standard.id}</td>
                            <td>
                                <strong>{standard.crop_name}</strong>
                                <div><small>{standard.crop_type}</small></div>
                            </td>

                            <td>
                                <span className="season-badge" style={{ backgroundColor: seasonInfo.bg, color: seasonInfo.color }}>
                                    {seasonInfo.short}
                                </span>
                            </td>
                            <td>{standard.harvest_year}</td>
                            <td>
                                <span style={{ color: qualityGrade.color }}>
                                    {qualityGrade.icon} {qualityGrade.label}
                                </span>
                            </td>
                            <td>
                                <strong style={{ color: '#1565c0' }}>{formatPrice(standard.price_per_kg)}</strong>
                            </td>
                            <td>
                                {standard.min_quantity} - {standard.max_quantity || '∞'} kg
                            </td>
                            <td>
                                <span className="status-badge" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                    <StatusIcon size={12} />
                                    {statusInfo.label}
                                </span>
                            </td>
                            <td>{new Date(standard.created_at).toLocaleDateString()}</td>
                            <td>
                                <div className="action-buttons">
                                    <button className="action-btn view" onClick={() => onView(standard)} title={t('view')}>
                                        <Eye size={14} />
                                    </button>
                                    <button className="action-btn edit" onClick={() => onEdit(standard)} title={t('edit')}>
                                        <Edit2 size={14} />
                                    </button>
                                    <button className="action-btn delete" onClick={() => onDelete(standard.id)} title={t('delete')}>
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

function StandardDetailModal({ standard, onClose, onEdit, onDelete, t }) {
    const [activeTab, setActiveTab] = useState('details');
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const qualityGrade = qualityGrades.find(g => g.value === standard.quality_grade) || qualityGrades[1];
    const seasonInfo = seasons.find(s => s.value === standard.season) || seasons[0];
    const statusInfo = statusOptions.find(s => s.value === standard.status) || statusOptions[1];
    const StatusIcon = statusInfo.icon;

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'RWF',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price).replace('RWF', 'RWF');
    };

    useEffect(() => {
        if (activeTab === 'history' && history.length === 0) {
            fetchHistory();
        }
    }, [activeTab]);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const response = await apiClient.get(`/admin/standards/${standard.id}/history/`);
            if (response.data) {
                setHistory(response.data.history || []);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal standard-detail-modal">
                <div className="modal-header">
                    <div>
                        <h2>{standard.crop_name}</h2>
                        <p className="standard-id-header">ID: #{standard.id}</p>
                    </div>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="standard-detail-summary">
                    <div className="summary-item">
                        <span className="summary-label">{t('price_per_kg')}</span>
                        <span className="summary-value">{formatPrice(standard.price_per_kg)}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">{t('quantity_range')}</span>
                        <span className="summary-value">{standard.min_quantity} - {standard.max_quantity || '∞'} kg</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">{t('status')}</span>
                        <span className="summary-value">
                            <span className="status-badge" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                <StatusIcon size={14} />
                                {statusInfo.label}
                            </span>
                        </span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">{t('created_at')}</span>
                        <span className="summary-value">{new Date(standard.created_at).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="standard-detail-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        <FileText size={16} />
                        {t('details')}
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <Clock size={16} />
                        {t('history')}
                    </button>
                </div>

                <div className="standard-detail-content">
                    {activeTab === 'details' && (
                        <div className="details-content">
                            <div className="details-grid">
                                <div className="detail-item">
                                    <span className="detail-label">{t('crop_name')}:</span>
                                    <span className="detail-value">{standard.crop_name}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">{t('crop_type')}:</span>
                                    <span className="detail-value">{standard.crop_type_display}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">{t('season')}:</span>
                                    <span className="detail-value">{standard.season_display}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">{t('harvest_year')}:</span>
                                    <span className="detail-value">{standard.harvest_year}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">{t('quality_grade')}:</span>
                                    <span className="detail-value">
                                        <span style={{ color: qualityGrade.color }}>{qualityGrade.label}</span>
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">{t('price_per_kg')}:</span>
                                    <span className="detail-value">{formatPrice(standard.price_per_kg)}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">{t('min_quantity')}:</span>
                                    <span className="detail-value">{standard.min_quantity} kg</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">{t('max_quantity')}:</span>
                                    <span className="detail-value">{standard.max_quantity || 'Unlimited'} kg</span>
                                </div>
                                {standard.preferred_location && (
                                    <div className="detail-item full-width">
                                        <span className="detail-label">{t('preferred_location')}:</span>
                                        <span className="detail-value">{standard.preferred_location}</span>
                                    </div>
                                )}
                                {standard.description && (
                                    <div className="detail-item full-width">
                                        <span className="detail-label">{t('description')}:</span>
                                        <span className="detail-value">{standard.description}</span>
                                    </div>
                                )}
                            </div>

                            {standard.estimated_value && (
                                <div className="estimated-value-card">
                                    <h4>{t('estimated_total_value')}</h4>
                                    <div className="estimated-value">{formatPrice(standard.estimated_value)}</div>
                                    <p className="estimated-note">{t('based_on_max_quantity')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="history-content">
                            {historyLoading ? (
                                <LoadingSpinner />
                            ) : history.length === 0 ? (
                                <div className="empty-state">
                                    <Clock size={48} />
                                    <p>{t('no_history_found')}</p>
                                </div>
                            ) : (
                                <div className="timeline">
                                    {history.map((item, index) => (
                                        <div key={item.id} className="timeline-item">
                                            <div className="timeline-badge" style={{
                                                backgroundColor: item.action === 'create' ? '#e8f5e9' :
                                                    item.action === 'update' ? '#e3f2fd' :
                                                        item.action === 'delete' ? '#ffebee' : '#fff7ed'
                                            }}>
                                                {item.action === 'create' && <Plus size={16} />}
                                                {item.action === 'update' && <Edit2 size={16} />}
                                                {item.action === 'delete' && <Trash2 size={16} />}
                                                {item.action === 'status_change' && <RefreshCw size={16} />}
                                            </div>
                                            <div className="timeline-content">
                                                <div className="timeline-header">
                                                    <span className="timeline-action">{item.action}</span>
                                                    <span className="timeline-date">
                                                        {new Date(item.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="timeline-user">
                                                    {t('by')} {item.changed_by_details?.full_name || 'System'}
                                                </div>
                                                {item.changes && Object.keys(item.changes).length > 0 && (
                                                    <div className="timeline-changes">
                                                        {Object.entries(item.changes).map(([field, change]) => (
                                                            <div key={field} className="change-item">
                                                                <span className="change-field">{field}:</span>
                                                                <span className="change-old">{change.old}</span>
                                                                <ArrowRight size={12} />
                                                                <span className="change-new">{change.new}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>{t('close')}</button>
                    <button className="btn-edit" onClick={() => onEdit(standard)}>
                        <Edit2 size={16} />
                        {t('edit')}
                    </button>
                    <button className="btn-delete" onClick={() => onDelete(standard.id)}>
                        <Trash2 size={16} />
                        {t('delete')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function StandardFormModal({ isOpen, onClose, onSubmit, buyers, editingStandard, t, isSubmitting }) {
    const [form, setForm] = useState(emptyStandardForm);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (editingStandard) {
            setForm({
                crop_name: editingStandard.crop_name || "",
                crop_type: editingStandard.crop_type || "new",
                season: editingStandard.season || "A",
                harvest_year: editingStandard.harvest_year || new Date().getFullYear(),
                quality_grade: editingStandard.quality_grade || "B",
                price_per_kg: editingStandard.price_per_kg || "",
                min_quantity: editingStandard.min_quantity || "",
                max_quantity: editingStandard.max_quantity || "",
                description: editingStandard.description || "",
                preferred_location: editingStandard.preferred_location || "",
                status: editingStandard.status || "active",
                buyer_id: editingStandard.created_by || ""
            });
        } else {
            setForm({
                ...emptyStandardForm,
                harvest_year: new Date().getFullYear(),
                buyer_id: "" // Empty means create for self (admin)
            });
        }
    }, [editingStandard]);

    const handleChange = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!form.crop_name.trim()) {
            newErrors.crop_name = t('crop_name_required');
        }

        if (!form.price_per_kg) {
            newErrors.price_per_kg = t('price_required');
        } else if (parseFloat(form.price_per_kg) <= 0) {
            newErrors.price_per_kg = t('price_positive');
        }

        if (!form.min_quantity) {
            newErrors.min_quantity = t('min_quantity_required');
        } else if (parseFloat(form.min_quantity) <= 0) {
            newErrors.min_quantity = t('min_quantity_positive');
        }

        if (form.max_quantity && parseFloat(form.max_quantity) < parseFloat(form.min_quantity)) {
            newErrors.max_quantity = t('max_less_than_min');
        }

        // Buyer ID is optional - if not provided, it will be created for the admin

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            const payload = {
                ...form,
                price_per_kg: parseFloat(form.price_per_kg),
                min_quantity: parseFloat(form.min_quantity),
                max_quantity: form.max_quantity ? parseFloat(form.max_quantity) : null,
                // If buyer_id is empty string, don't send it (backend will assign to current admin)
                ...(form.buyer_id === "" && { buyer_id: undefined })
            };
            await onSubmit(payload);
        } catch (error) {
            console.error('Error submitting standard:', error);
        }
    };

    if (!isOpen) return null;

    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let year = currentYear - 2; year <= currentYear + 2; year++) {
        yearOptions.push(year);
    }

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal standard-form-modal">
                <div className="modal-header">
                    <div>
                        <h2>{editingStandard ? t('edit_standard') : t('add_new_standard')}</h2>
                        <p>{editingStandard ? t('update_standard_details') : t('fill_standard_details')}</p>
                    </div>
                    <button className="modal-close" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label>{t('crop_name')} *</label>
                            <input
                                type="text"
                                className={`form-control ${errors.crop_name ? 'error' : ''}`}
                                value={form.crop_name}
                                onChange={(e) => handleChange('crop_name', e.target.value)}
                                placeholder={t('enter_crop_name')}
                            />
                            {errors.crop_name && <div className="error-message">{errors.crop_name}</div>}
                        </div>

                        <div className="form-group">
                            <label>{t('crop_type')}</label>
                            <select
                                className="form-control"
                                value={form.crop_type}
                                onChange={(e) => handleChange('crop_type', e.target.value)}
                            >
                                {cropTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>{t('season')}</label>
                            <select
                                className="form-control"
                                value={form.season}
                                onChange={(e) => handleChange('season', e.target.value)}
                            >
                                {seasons.map(season => (
                                    <option key={season.value} value={season.value}>{season.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>{t('harvest_year')}</label>
                            <select
                                className="form-control"
                                value={form.harvest_year}
                                onChange={(e) => handleChange('harvest_year', parseInt(e.target.value))}
                            >
                                {yearOptions.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>{t('quality_grade')}</label>
                            <select
                                className="form-control"
                                value={form.quality_grade}
                                onChange={(e) => handleChange('quality_grade', e.target.value)}
                            >
                                {qualityGrades.map(grade => (
                                    <option key={grade.value} value={grade.value}>
                                        {grade.icon} {grade.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>{t('price_per_kg')} (RWF) *</label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                className={`form-control ${errors.price_per_kg ? 'error' : ''}`}
                                value={form.price_per_kg}
                                onChange={(e) => handleChange('price_per_kg', e.target.value)}
                                placeholder="e.g. 1000"
                            />
                            {errors.price_per_kg && <div className="error-message">{errors.price_per_kg}</div>}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>{t('min_quantity')} (kg) *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                className={`form-control ${errors.min_quantity ? 'error' : ''}`}
                                value={form.min_quantity}
                                onChange={(e) => handleChange('min_quantity', e.target.value)}
                                placeholder="e.g. 100"
                            />
                            {errors.min_quantity && <div className="error-message">{errors.min_quantity}</div>}
                        </div>

                        <div className="form-group">
                            <label>{t('max_quantity')} (kg) <span className="optional-label">{t('optional')}</span></label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                className={`form-control ${errors.max_quantity ? 'error' : ''}`}
                                value={form.max_quantity}
                                onChange={(e) => handleChange('max_quantity', e.target.value)}
                                placeholder={t('leave_empty_for_unlimited')}
                            />
                            {errors.max_quantity && <div className="error-message">{errors.max_quantity}</div>}
                        </div>
                    </div>

                    {/* Location Selector */}
                    <div className="form-group">
                        <label>
                            <MapPin size={16} />
                            {t('preferred_location')}
                            <span className="optional-label">{t('optional')}</span>
                        </label>
                        <LocationSelector
                            value={form.preferred_location}
                            onChange={(value) => handleChange('preferred_location', value)}
                            error={errors.preferred_location}
                            t={t}
                        />
                        {errors.preferred_location && <div className="error-message">{errors.preferred_location}</div>}
                    </div>

                    <div className="form-group">
                        <label>{t('status')}</label>
                        <select
                            className="form-control"
                            value={form.status}
                            onChange={(e) => handleChange('status', e.target.value)}
                        >
                            {statusOptions.map(status => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>{t('description')} <span className="optional-label">{t('optional')}</span></label>
                        <textarea
                            className="form-control"
                            rows="4"
                            value={form.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder={t('enter_description')}
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
                        {t('cancel')}
                    </button>
                    <button className="btn-save" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? t('saving') : (editingStandard ? t('update') : t('create'))}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── API Client ───────────────────────────────────────────────────────────────
const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BuyerStandardsManagement() {
    const { t } = useTranslation();

    // ── Core state ──────────────────────────────────────────────────────────────
    const [standards, setStandards] = useState([]);
    const [buyers, setBuyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const abortControllerRef = useRef(null);

    // ── Modal state ─────────────────────────────────────────────────────────────
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [editingStandard, setEditingStandard] = useState(null);
    const [selectedStandard, setSelectedStandard] = useState(null);
    const [formSubmitting, setFormSubmitting] = useState(false);

    // ── Pagination state ─────────────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const formatLocationString = (parts) =>
        [parts.province, parts.district, parts.sector].filter(Boolean).join(', ');

    const parseLocationString = (str) => {
        if (!str) return { province: "", district: "", sector: "" };
        const [province = "", district = "", sector = ""] = str.split(',').map(p => p.trim());
        return { province, district, sector };
    };

    // ── Filter / sort state ──────────────────────────────────────────────────────
    const [filters, setFilters] = useState({
        crop: '',
        season: '',
        year: '',
        quality: '',
        status: '',
        buyer: '',
        search: ''
    });
    const [sortField, setSortField] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');
    const [viewMode, setViewMode] = useState('grid');

    // ── Stats ────────────────────────────────────────────────────────────────────
    const [stats, setStats] = useState({
        total_standards: 0,
        active_standards: 0,
        inactive_standards: 0,
        expired_standards: 0,
        total_value_potential: 0,
        avg_price_per_kg: 0,
        unique_buyers: 0
    });

    // ── Helpers ──────────────────────────────────────────────────────────────────
    const getAuthToken = () =>
        localStorage.getItem('access_token') ||
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('access_token') ||
        sessionStorage.getItem('accessToken') ||
        '';

    const getUserLanguage = () =>
        localStorage.getItem("language") || i18n.language || "en";

    // ── API client setup ─────────────────────────────────────────────────────────
    useEffect(() => {
        apiClient.interceptors.request.use((config) => {
            const token = getAuthToken();
            if (token) config.headers.Authorization = `Bearer ${token}`;
            config.headers['Accept-Language'] = getUserLanguage();
            config.headers['Content-Type'] = 'application/json';
            return config;
        });

        apiClient.interceptors.response.use(
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
    }, [t]);

    // ── Fetch buyers (for dropdown) ──────────────────────────────────────────────
    const fetchBuyers = useCallback(async () => {
        try {
            const response = await axios({
                method: 'GET',
                url: 'http://127.0.0.1:8000/users/buyers/',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Accept-Language': getUserLanguage()
                }
            });
            if (response.data) {
                setBuyers(response.data.users || []);
            }
        } catch (error) {
            console.error('Error fetching buyers:', error);
        }
    }, []);

    // ── Fetch standards ──────────────────────────────────────────────────────────
    const fetchStandards = useCallback(async (params) => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        try {
            setLoading(true);
            setFetchError(null);

            const queryParams = new URLSearchParams({
                page: params.pageArg,
                page_size: params.pageSizeArg,
                sort_by: params.sortFieldArg,
                sort_dir: params.sortDirectionArg,
                ...(params.filtersArg.crop && { crop: params.filtersArg.crop }),
                ...(params.filtersArg.season && { season: params.filtersArg.season }),
                ...(params.filtersArg.year && { year: params.filtersArg.year }),
                ...(params.filtersArg.quality && { quality: params.filtersArg.quality }),
                ...(params.filtersArg.status && { status: params.filtersArg.status }),
                ...(params.filtersArg.buyer && { buyer: params.filtersArg.buyer }),
                ...(params.filtersArg.search && { search: params.filtersArg.search })
            });

            const response = await apiClient.get(`/buyer/standards/?${queryParams}`, {
                signal: abortControllerRef.current.signal
            });

            if (response.data) {
                setStandards(response.data.standards || []);
                setTotalItems(response.data.total || 0);
                setTotalPages(response.data.total_pages || 1);
            }
        } catch (error) {
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return;
            console.error('Error fetching standards:', error);
            setFetchError(error.message);
            toast.error(t('failed_to_fetch_standards'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    // ── Fetch stats ──────────────────────────────────────────────────────────────
    const fetchStats = useCallback(async () => {
        try {
            const response = await apiClient.get('/buyer/standards/summary/');
            if (response.data) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }, []);

    // ── Initial load ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            toast.error(t('authentication_required'));
            setTimeout(() => { window.location.href = '/'; }, 2000);
            return;
        }

        fetchBuyers();
        fetchStandards({
            filtersArg: filters,
            pageArg: currentPage,
            pageSizeArg: pageSize,
            sortFieldArg: sortField,
            sortDirectionArg: sortDirection
        });
        fetchStats();

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
        fetchStandards({
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
        fetchStandards({
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
        fetchStandards({
            filtersArg: filters,
            pageArg: newPage,
            pageSizeArg: pageSize,
            sortFieldArg: field,
            sortDirectionArg: direction
        });
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        fetchStandards({
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
        fetchStandards({
            filtersArg: filters,
            pageArg: newPage,
            pageSizeArg: newSize,
            sortFieldArg: sortField,
            sortDirectionArg: sortDirection
        });
    };

    // ── Standard CRUD handlers ───────────────────────────────────────────────────
    const handleAddStandard = () => {
        setEditingStandard(null);
        setFormModalOpen(true);
    };

    const handleEditStandard = (standard) => {
        setEditingStandard(standard);
        setFormModalOpen(true);
        if (detailModalOpen) {
            setDetailModalOpen(false);
        }
    };

    const handleViewStandard = (standard) => {
        setSelectedStandard(standard);
        setDetailModalOpen(true);
    };

    const handleDeleteStandard = async (standardId) => {
        if (!window.confirm(t('confirm_delete_standard'))) return;

        try {
            const response = await apiClient.delete(`/buyer/standards/${standardId}/delete/`);
            if (response.data) {
                toast.success(response.data.message || t('standard_deleted'));
                fetchStandards({
                    filtersArg: filters,
                    pageArg: currentPage,
                    pageSizeArg: pageSize,
                    sortFieldArg: sortField,
                    sortDirectionArg: sortDirection
                });
                fetchStats();
                if (detailModalOpen) {
                    setDetailModalOpen(false);
                }
            }
        } catch (error) {
            console.error('Error deleting standard:', error);
            toast.error(error.response?.data?.error || t('failed_to_delete_standard'));
        }
    };

    const handleSubmitStandard = async (formData) => {
        setFormSubmitting(true);
        try {
            const url = editingStandard
                ? `/buyer/standards/${editingStandard.id}/update/`
                : '/buyer/standards/create/';
            const method = editingStandard ? 'PUT' : 'POST';

            const response = await apiClient({
                method,
                url,
                data: formData
            });

            if (response.data) {
                toast.success(response.data.message || t('standard_saved'));
                setFormModalOpen(false);
                setEditingStandard(null);
                fetchStandards({
                    filtersArg: filters,
                    pageArg: currentPage,
                    pageSizeArg: pageSize,
                    sortFieldArg: sortField,
                    sortDirectionArg: sortDirection
                });
                fetchStats();
            }
        } catch (error) {
            console.error('Error saving standard:', error);
            toast.error(error.response?.data?.error || t('failed_to_save_standard'));
            throw error;
        } finally {
            setFormSubmitting(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────────
    return (
        <div className="crop-standards-container">
            <ToastContainer position="top-right" autoClose={5000} />

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

                .crop-standards-container {
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

                .add-standard-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }

                .add-standard-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                }

                .export-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 24px;
                    background: white;
                    color: #1e293b;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .export-btn:hover {
                    background: #f8fafc;
                    border-color: #2d5a2d;
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

                .active-filters {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 0 0;
                    width: 100%;
                    border-top: 1px solid #e2e8f0;
                    margin-top: 8px;
                }

                .active-filters-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: #64748b;
                }

                .filter-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 8px;
                    background: #f1f5f9;
                    border-radius: 6px;
                    font-size: 12px;
                    color: #1e293b;
                }

                .filter-tag svg {
                    cursor: pointer;
                    opacity: 0.6;
                    transition: opacity 0.2s ease;
                }

                .filter-tag svg:hover {
                    opacity: 1;
                    color: #b91c1c;
                }

                .clear-filters-btn {
                    padding: 4px 8px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    border-radius: 6px;
                    font-size: 12px;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .clear-filters-btn:hover {
                    background: #fee2e2;
                    border-color: #b91c1c;
                    color: #b91c1c;
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

                /* Standards Grid */
                .standards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 20px;
                    margin-bottom: 24px;
                }

                .standard-card {
                    background: white;
                    border-radius: 16px;
                    padding: 20px;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                    transition: all 0.3s ease;
                    border: 1px solid #e2e8f0;
                }

                .standard-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                    border-color: #2d5a2d;
                }

                .standard-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 16px;
                }

                .standard-card-title h3 {
                    font-size: 18px;
                    font-weight: 600;
                    color: #0f172a;
                    margin: 0 0 4px;
                }

                .standard-id {
                    font-size: 12px;
                    color: #94a3b8;
                }

                .standard-card-actions {
                    display: flex;
                    gap: 4px;
                }

                .standard-action-btn {
                    padding: 6px;
                    border: none;
                    background: #f8fafc;
                    border-radius: 6px;
                    cursor: pointer;
                    color: #64748b;
                    transition: all 0.2s ease;
                }

                .standard-action-btn:hover {
                    background: #e8f5e9;
                    color: #2d5a2d;
                }

                .standard-action-btn.delete:hover {
                    background: #fee2e2;
                    color: #b91c1c;
                }

                .standard-card-body {
                    margin-bottom: 16px;
                }

                .standard-buyer-info {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #475569;
                    font-size: 13px;
                    margin-bottom: 12px;
                }

                .standard-price {
                    display: flex;
                    align-items: baseline;
                    gap: 4px;
                    margin-bottom: 12px;
                }

                .price-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #1565c0;
                }

                .price-unit {
                    font-size: 14px;
                    color: #64748b;
                }

                .standard-badges {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-bottom: 12px;
                }

                .standard-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 600;
                }

                .standard-quantity-range {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 12px;
                }

                .quantity-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 13px;
                }

                .quantity-label {
                    color: #64748b;
                }

                .quantity-value {
                    font-weight: 600;
                    color: #0f172a;
                }

                .standard-location {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #475569;
                    font-size: 13px;
                    margin-bottom: 12px;
                }

                .standard-description {
                    font-size: 13px;
                    color: #64748b;
                    margin-bottom: 12px;
                    line-height: 1.5;
                }

                .standard-stats {
                    display: flex;
                    gap: 16px;
                }

                .standard-stat {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #64748b;
                    font-size: 12px;
                }

                .standard-card-footer {
                    border-top: 1px solid #e2e8f0;
                    padding-top: 16px;
                }

                .standard-footer-btn {
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

                .standard-footer-btn:hover {
                    background: #2d5a2d;
                    color: white;
                }

                /* Standards Table */
                .standards-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                }

                .standards-table th {
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

                .standards-table td {
                    padding: 16px 20px;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 14px;
                    color: #1e293b;
                }

                .standards-table tbody tr {
                    transition: all 0.2s ease;
                }

                .standards-table tbody tr:hover {
                    background: #f8fafc;
                }

                .buyer-info {
                    display: flex;
                    flex-direction: column;
                }

                .buyer-name {
                    font-weight: 500;
                    color: #0f172a;
                }

                .buyer-phone {
                    font-size: 12px;
                    color: #64748b;
                }

                .season-badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                }

                .action-buttons {
                    display: flex;
                    gap: 4px;
                }

                .action-btn {
                    padding: 6px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .action-btn.view {
                    background: #e8f5e9;
                    color: #2e7d32;
                }

                .action-btn.view:hover {
                    background: #2e7d32;
                    color: white;
                }

                .action-btn.edit {
                    background: #e3f2fd;
                    color: #1565c0;
                }

                .action-btn.edit:hover {
                    background: #1565c0;
                    color: white;
                }

                .action-btn.delete {
                    background: #ffebee;
                    color: #c62828;
                }

                .action-btn.delete:hover {
                    background: #c62828;
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
                    margin-top: 24px;
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
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                }

                .standard-detail-modal {
                    max-width: 800px;
                    width: 90%;
                }

                .standard-form-modal {
                    max-width: 700px;
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


                .optional-label {
                    font-size: 11px;
                    font-weight: normal;
                    color: #94a3b8;
                    margin-left: 4px;
                    background: #f1f5f9;
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .help-text {
                    display: block;
                    font-size: 11px;
                    font-weight: normal;
                    color: #64748b;
                    margin-top: 4px;
                }

                /* Location Selector Styles */
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
                    background: #f8fafc;
                    cursor: not-allowed;
                    opacity: 0.6;
                }

                .location-hint {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    background: #f0fdf4;
                    border-radius: 8px;
                    color: #166534;
                    font-size: 13px;
                }

                /* Form group with icon */
                .form-group label svg {
                    margin-right: 8px;
                    vertical-align: middle;
                }

                /* Detail Modal Styles */
                .standard-detail-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
                    font-size: 11px;
                    color: #64748b;
                    margin-bottom: 4px;
                }

                .summary-value {
                    font-size: 16px;
                    font-weight: 600;
                    color: #0f172a;
                }

                .summary-subvalue {
                    font-size: 12px;
                    color: #64748b;
                }

                .standard-detail-tabs {
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

                .standard-detail-content {
                    padding: 24px;
                    max-height: 400px;
                    overflow-y: auto;
                }

                .details-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }

                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .detail-item.full-width {
                    grid-column: span 2;
                }

                .detail-label {
                    font-size: 12px;
                    color: #64748b;
                }

                .detail-value {
                    font-size: 16px;
                    font-weight: 500;
                    color: #0f172a;
                }

                .estimated-value-card {
                    margin-top: 24px;
                    padding: 20px;
                    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                    border-radius: 12px;
                    text-align: center;
                }

                .estimated-value-card h4 {
                    font-size: 14px;
                    color: #166534;
                    margin: 0 0 8px;
                }

                .estimated-value {
                    font-size: 32px;
                    font-weight: 700;
                    color: #166534;
                }

                .estimated-note {
                    font-size: 12px;
                    color: #166534;
                    margin: 8px 0 0;
                }

                /* Timeline Styles */
                .timeline {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .timeline-item {
                    display: flex;
                    gap: 16px;
                }

                .timeline-badge {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .timeline-content {
                    flex: 1;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #e2e8f0;
                }

                .timeline-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .timeline-action {
                    font-weight: 600;
                    color: #0f172a;
                    text-transform: capitalize;
                }

                .timeline-date {
                    font-size: 12px;
                    color: #64748b;
                }

                .timeline-user {
                    font-size: 13px;
                    color: #475569;
                    margin-bottom: 8px;
                }

                .timeline-changes {
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 12px;
                }

                .change-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    margin-bottom: 4px;
                }

                .change-field {
                    font-weight: 600;
                    color: #475569;
                    min-width: 80px;
                }

                .change-old {
                    color: #c62828;
                    text-decoration: line-through;
                }

                .change-new {
                    color: #2e7d32;
                    font-weight: 500;
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
                    box-sizing: border-box;
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
                    min-height: 100px;
                }

                .error-message {
                    font-size: 12px;
                    color: #dc2626;
                    margin-top: 4px;
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

                .btn-edit {
                    padding: 12px 24px;
                    background: #e3f2fd;
                    color: #1565c0;
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

                .btn-edit:hover {
                    background: #1565c0;
                    color: white;
                }

                .btn-delete {
                    padding: 12px 24px;
                    background: #ffebee;
                    color: #c62828;
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

                .btn-delete:hover {
                    background: #c62828;
                    color: white;
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
                    .crop-standards-container {
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

                    .standard-detail-summary {
                        grid-template-columns: 1fr 1fr;
                    }

                    .details-grid {
                        grid-template-columns: 1fr;
                    }

                    .detail-item.full-width {
                        grid-column: span 1;
                    }

                    .modal-footer {
                        flex-direction: column;
                    }

                    .btn-edit, .btn-delete {
                        width: 100%;
                        justify-content: center;
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

                    .standard-detail-summary {
                        grid-template-columns: 1fr;
                    }

                    .timeline-item {
                        flex-direction: column;
                    }

                    .timeline-badge {
                        margin-bottom: 8px;
                    }
                }
            `}</style>

            {/* Page Header */}
            <div className="page-header">
                <div className="header-left">
                    <h1>{t('crop_standards_management')}</h1>
                    <p>{t('manage_your_crops_standards')}</p>
                </div>
                <div className="header-right">
                    <button className="add-standard-btn" onClick={handleAddStandard}>
                        <Plus size={18} />
                        {t('add_standard')}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <SummaryCard
                    title={t('total_standards')}
                    value={stats.total_standards}
                    icon={<Package size={24} />}
                    color="#2d5a2d"
                    bgColor="#e8f5e9"
                />
                <SummaryCard
                    title={t('active_standards')}
                    value={stats.active_standards}
                    icon={<CheckCircle size={24} />}
                    color="#0284c7"
                    bgColor="#e0f2fe"
                />
                <SummaryCard
                    title={t('inactive_standards')}
                    value={stats.inactive_standards}
                    icon={<Minus size={24} />}
                    color="#64748b"
                    bgColor="#f1f5f9"
                />
                <SummaryCard
                    title={t('expired_standards')}
                    value={stats.expired_standards}
                    icon={<AlertCircle size={24} />}
                    color="#b91c1c"
                    bgColor="#fee2e2"
                />
                <SummaryCard
                    title={t('avg_price')}
                    value={`${new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'RWF',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(stats.avg_price_per_kg).replace('RWF', 'RWF')}`}
                    icon={<DollarSign size={24} />}
                    color="#b45309"
                    bgColor="#fff7ed"
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
                standards={standards} // Pass the standards data
            />

            {/* Standards Display */}
            {loading ? (
                <LoadingSpinner />
            ) : standards.length === 0 ? (
                <div className="empty-state">
                    <Package size={64} />
                    <p>{t('no_standards_found')}</p>
                    <button className="add-standard-btn" onClick={handleAddStandard} style={{ marginTop: '16px' }}>
                        <Plus size={18} />
                        {t('add_your_first_standard')}
                    </button>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="standards-grid">
                            {standards.map(standard => (
                                <StandardCard
                                    key={standard.id}
                                    standard={standard}
                                    onView={handleViewStandard}
                                    onEdit={handleEditStandard}
                                    onDelete={handleDeleteStandard}
                                    t={t}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <StandardsTable
                                standards={standards}
                                onView={handleViewStandard}
                                onEdit={handleEditStandard}
                                onDelete={handleDeleteStandard}
                                t={t}
                            />
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

            {/* Standard Form Modal */}
            <StandardFormModal
                isOpen={formModalOpen}
                onClose={() => {
                    setFormModalOpen(false);
                    setEditingStandard(null);
                }}
                onSubmit={handleSubmitStandard}
                buyers={buyers}
                editingStandard={editingStandard}
                t={t}
                isSubmitting={formSubmitting}
            />

            {/* Standard Detail Modal */}
            {selectedStandard && (
                <StandardDetailModal
                    standard={selectedStandard}
                    onClose={() => {
                        setDetailModalOpen(false);
                        setSelectedStandard(null);
                    }}
                    onEdit={handleEditStandard}
                    onDelete={handleDeleteStandard}
                    t={t}
                />
            )}
        </div>
    );
}