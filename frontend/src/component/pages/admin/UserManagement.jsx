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
  Globe, ChevronDown
} from "lucide-react";
import locationData from "../../common/locationData.json";
import countryCodes from "../../common/countryCodes.json";

// API Base URL
const API_BASE_URL = "http://127.0.0.1:8000";

const dialCodeMap = {
  AF: "93", AL: "355", DZ: "213", AD: "376", AO: "244", AG: "1268", AR: "54", AM: "374",
  AU: "61", AT: "43", AZ: "994", BS: "1242", BH: "973", BD: "880", BB: "1246", BY: "375",
  BE: "32", BZ: "501", BJ: "229", BT: "975", BO: "591", BA: "387", BW: "267", BR: "55",
  BN: "673", BG: "359", BF: "226", BI: "257", CV: "238", KH: "855", CM: "237", CA: "1",
  CF: "236", TD: "235", CL: "56", CN: "86", CO: "57", KM: "269", CG: "242", CR: "506",
  HR: "385", CU: "53", CY: "357", CZ: "420", DK: "45", DJ: "253", DM: "1767", DO: "1809",
  CD: "243", EC: "593", EG: "20", SV: "503", GQ: "240", ER: "291", EE: "372", SZ: "268",
  ET: "251", FJ: "679", FI: "358", FR: "33", GA: "241", GM: "220", GE: "995", DE: "49",
  GH: "233", GR: "30", GD: "1473", GT: "502", GN: "224", GW: "245", GY: "592", HT: "509",
  HN: "504", HU: "36", IS: "354", IN: "91", ID: "62", IR: "98", IQ: "964", IE: "353",
  IL: "972", IT: "39", CI: "225", JM: "1876", JP: "81", JO: "962", KZ: "7", KE: "254",
  KI: "686", KW: "965", KG: "996", LA: "856", LV: "371", LB: "961", LS: "266", LR: "231",
  LY: "218", LI: "423", LT: "370", LU: "352", MG: "261", MW: "265", MY: "60", MV: "960",
  ML: "223", MT: "356", MH: "692", MR: "222", MU: "230", MX: "52", FM: "691", MD: "373",
  MC: "377", MN: "976", ME: "382", MA: "212", MZ: "258", MM: "95", NA: "264", NR: "674",
  NP: "977", NL: "31", NZ: "64", NI: "505", NE: "227", NG: "234", KP: "850", MK: "389",
  NO: "47", OM: "968", PK: "92", PW: "680", PS: "970", PA: "507", PG: "675", PY: "595",
  PE: "51", PH: "63", PL: "48", PT: "351", QA: "974", RO: "40", RU: "7", RW: "250",
  KN: "1869", LC: "1758", VC: "1784", WS: "685", SM: "378", ST: "239", SA: "966",
  SN: "221", RS: "381", SC: "248", SL: "232", SG: "65", SK: "421", SI: "386", SB: "677",
  SO: "252", ZA: "27", KR: "82", SS: "211", ES: "34", LK: "94", SD: "249", SR: "597",
  SE: "46", CH: "41", SY: "963", TW: "886", TJ: "992", TZ: "255", TH: "66", TL: "670",
  TG: "228", TO: "676", TT: "1868", TN: "216", TR: "90", TM: "993", TV: "688", UG: "256",
  UA: "380", AE: "971", GB: "44", US: "1", UY: "598", UZ: "998", VU: "678", VA: "379",
  VE: "58", VN: "84", YE: "967", ZM: "260", ZW: "263",
};

// Initial empty form for user creation/editing
const emptyForm = {
  full_name: "",
  phone: "",
  phone_country_code: "RW",
  email: "",
  role: "farmer",
  location: "",
  location_parts: {
    province: "",
    district: "",
    sector: ""
  },
  status: true
};

// Role badge colors
const roleColors = {
  admin: { bg: "#e8f5e9", color: "#2e7d32", label: "Admin" },
  farmer: { bg: "#e3f2fd", color: "#1565c0", label: "Farmer" },
  buyer: { bg: "#fff8e1", color: "#d4920a", label: "Buyer" }
};

// Status badge colors
const statusColors = {
  active: { bg: "#e8f5e9", color: "#2e7d32" },
  inactive: { bg: "#ffebee", color: "#c62828" }
};

const phoneLengthRules = {
  RW: { min: 9, max: 9, hint: "9 digits" },
  US: { min: 10, max: 10, hint: "10 digits" },
  CA: { min: 10, max: 10, hint: "10 digits" },
  GB: { min: 10, max: 11, hint: "10-11 digits" },
  KE: { min: 9, max: 10, hint: "9-10 digits" },
  UG: { min: 9, max: 9, hint: "9 digits" },
  TZ: { min: 9, max: 9, hint: "9 digits" },
  NG: { min: 10, max: 10, hint: "10 digits" },
  ZA: { min: 9, max: 10, hint: "9-10 digits" },
  IN: { min: 10, max: 10, hint: "10 digits" },
  FR: { min: 9, max: 9, hint: "9 digits" },
  DE: { min: 10, max: 11, hint: "10-11 digits" },
  CN: { min: 11, max: 11, hint: "11 digits" },
  JP: { min: 10, max: 11, hint: "10-11 digits" },
  BR: { min: 10, max: 11, hint: "10-11 digits" },
  AU: { min: 9, max: 9, hint: "9 digits" },
  ET: { min: 9, max: 9, hint: "9 digits" },
  GH: { min: 9, max: 9, hint: "9 digits" },
  CM: { min: 9, max: 9, hint: "9 digits" },
  DEFAULT: { min: 7, max: 15, hint: "7-15 digits" },
};

const enrichedCountries = countryCodes.map(c => ({
  ...c,
  dialCode: dialCodeMap[c.code] || "",
})).filter(c => c.dialCode); // Only include countries with dial codes

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ title, value, icon, color, bgColor }) {
  return (
    <div className="summary-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="summary-card-content">
        <div>
          <p className="summary-card-title">{title}</p>
          <h3 className="summary-card-value">{value}</h3>
        </div>
        <div className="summary-card-icon" style={{ backgroundColor: bgColor, color: color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Pagination Component
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
        <button
          className="pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
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
          } else if (
            pageNum === currentPage - 2 ||
            pageNum === currentPage + 2
          ) {
            return <span key={pageNum} className="pagination-ellipsis">...</span>;
          }
          return null;
        })}

        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight size={16} />
        </button>
        <button
          className="pagination-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

// Filter Bar Component
function FilterBar({ filters, onFilterChange, onSearch, onSort, sortField, sortDirection }) {
  const { t } = useTranslation();

  const sortOptions = [
    { value: 'full_name', label: t('name') },
    { value: 'email', label: t('email') },
    { value: 'role', label: t('role') },
    { value: 'status', label: t('status') },
    { value: 'created_at', label: t('created_date') }
  ];

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <select
          className="filter-select"
          value={filters.role || ''}
          onChange={(e) => onFilterChange('role', e.target.value)}
        >
          <option value="">{t('all_roles')}</option>
          <option value="admin">{t('admin')}</option>
          <option value="farmer">{t('farmer')}</option>
          <option value="buyer">{t('buyer')}</option>
        </select>

        <select
          className="filter-select"
          value={filters.status || ''}
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          <option value="">{t('all_status')}</option>
          <option value="active">{t('active')}</option>
          <option value="inactive">{t('inactive')}</option>
        </select>
      </div>

      <div className="filter-group">
        <div className="search-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder={t('search_users')}
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
              <option value={`${option.value}|asc`}>
                {option.label} ↑
              </option>
              <option value={`${option.value}|desc`}>
                {option.label} ↓
              </option>
            </React.Fragment>
          ))}
        </select>
      </div>
    </div>
  );
}

// Country Code Selector Component
function CountryCodeSelector({ selectedCountry, onSelect, error }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = enrichedCountries.filter(country =>
    country.country.toLowerCase().includes(search.toLowerCase()) ||
    country.dialCode.includes(search) ||
    country.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="country-code-selector" ref={dropdownRef}>
      <div
        className={`country-code-display ${error ? 'error' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="selected-flag">{selectedCountry.flag}</span>
        <span className="selected-dial">+{selectedCountry.dialCode}</span>
        <ChevronDown size={16} className={`chevron ${isOpen ? 'open' : ''}`} />
      </div>

      {isOpen && (
        <div className="country-dropdown">
          <div className="country-search">
            <Search size={14} />
            <input
              type="text"
              placeholder={t('search_country')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="country-list">
            {filteredCountries.map(country => (
              <div
                key={country.code}
                className={`country-item ${selectedCountry.code === country.code ? 'selected' : ''}`}
                onClick={() => {
                  onSelect(country);
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                <span className="country-flag">{country.flag}</span>
                <span className="country-name">{country.country}</span>
                <span className="country-dial">+{country.dialCode}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Location Selector Component
function LocationSelector({ locationParts, onChange, error }) {
  const { t } = useTranslation();

  const provinces = locationData.provinces.map(p => p.city || p.province);

  const districts = locationParts.province
    ? (locationData.provinces.find(p => (p.city || p.province) === locationParts.province)?.coordinates?.districts || [])
    : [];

  const sectors = locationParts.district
    ? (districts.find(d => d.name === locationParts.district)?.sectors || [])
    : [];

  const handleProvinceChange = (province) => {
    onChange({
      ...locationParts,
      province,
      district: "",
      sector: ""
    });
  };

  const handleDistrictChange = (district) => {
    onChange({
      ...locationParts,
      district,
      sector: ""
    });
  };

  const handleSectorChange = (sector) => {
    onChange({
      ...locationParts,
      sector
    });
  };

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
            <option key={province} value={province}>{province}</option>
          ))}
        </select>
      </div>

      <div className="location-row">
        <select
          className={`location-select ${error && !locationParts.district ? 'error' : ''}`}
          value={locationParts.district}
          onChange={(e) => handleDistrictChange(e.target.value)}
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
          onChange={(e) => handleSectorChange(e.target.value)}
          disabled={!locationParts.district}
        >
          <option value="">{t('select_sector')}</option>
          {sectors.map(sector => (
            <option key={sector.name} value={sector.name}>{sector.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Main Component
export default function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const abortControllerRef = useRef(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: ''
  });
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Summary stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    farmers: 0,
    buyers: 0
  });

  // Get selected country from form
  const selectedCountry = useMemo(() => {
    const country = enrichedCountries.find(c => c.code === form.phone_country_code);
    return country || enrichedCountries.find(c => c.code === "RW") || enrichedCountries[0];
  }, [form.phone_country_code]);

  // Get phone validation rule
  const getPhoneRule = useCallback((code) => phoneLengthRules[code] || phoneLengthRules.DEFAULT, []);

  // Validate phone
  const validatePhone = useCallback((digits, code) => {
    if (!digits) return t("validation.phoneRequired");
    if (!/^\d*$/.test(digits)) return t("validation.phoneDigitsOnly");
    const rule = getPhoneRule(code);
    if (digits.length > 0 && digits.length < rule.min) return t("validation.phoneTooShort", { min: rule.min, hint: rule.hint });
    if (digits.length > rule.max) return t("validation.phoneTooLong", { max: rule.max, hint: rule.hint });
    return "";
  }, [t, getPhoneRule]);

  // Handle phone change
  const handlePhoneChange = (value) => {
    const digits = value.replace(/\D/g, "");
    setForm({ ...form, phone: digits });
    setPhoneTouched(true);
    setPhoneError(validatePhone(digits, form.phone_country_code));
  };

  // Handle country change
  const handleCountryChange = (country) => {
    setForm({ ...form, phone_country_code: country.code });
    setPhoneTouched(true);
    setPhoneError(validatePhone(form.phone, country.code));
  };

  // Parse location string into parts
  const parseLocationString = (locationString) => {
    if (!locationString) return { province: "", district: "", sector: "" };

    const parts = locationString.split(',').map(p => p.trim());
    return {
      province: parts[0] || "",
      district: parts[1] || "",
      sector: parts[2] || ""
    };
  };

  // Format location parts into string
  const formatLocationString = (parts) => {
    const validParts = [parts.province, parts.district, parts.sector].filter(p => p);
    return validParts.join(', ');
  };

  // Handle location parts change
  const handleLocationPartsChange = (parts) => {
    setForm({
      ...form,
      location_parts: parts,
      location: formatLocationString(parts)
    });
  };

  // Get auth token from localStorage
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

  // Create axios instance with default headers
  const apiClient = useMemo(() => {
    const client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // Increased timeout
    });

    // Add request interceptor to add auth token and language
    client.interceptors.request.use(
      (config) => {
        const token = getAuthToken();
        console.log("Adding language header:", getUserLanguage());
        const lang = getUserLanguage();

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        config.headers['Accept-Language'] = lang;
        config.headers['Content-Type'] = 'application/json';

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          toast.error(t('session_expired'));
          localStorage.removeItem('access_token');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');

          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
        return Promise.reject(error);
      }
    );

    return client;
  }, [t]);

  // Fetch users with filters, sorting, and pagination
  const fetchUsers = useCallback(async () => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setFetchError(null);

      const params = new URLSearchParams({
        page: currentPage,
        page_size: pageSize,
        sort_by: sortField,
        sort_dir: sortDirection,
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status === 'active' ? 'true' : 'false' }),
        ...(filters.search && { search: filters.search })
      });

      const response = await apiClient.get(`/users/?${params}`, {
        signal: abortControllerRef.current.signal
      });

      if (response.data) {
        setUsers(response.data.users || []);
        setTotalItems(response.data.total || 0);
        setTotalPages(response.data.total_pages || 1);
        setStats(response.data.stats || {});
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        console.log('Request cancelled');
        return;
      }

      console.error('Error fetching users:', error);
      setFetchError(error.message);

      let errorMessage = t('failed_to_fetch_users');
      if (error.response) {
        errorMessage = error.response.data?.error || errorMessage;
      } else if (error.request) {
        errorMessage = t('network_error');
      }

      if (!error.message.includes('abort')) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, sortField, sortDirection, filters, apiClient, t]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      toast.error(t('authentication_required'));
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      return;
    }

    fetchUsers();

    // Cleanup function to cancel request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchUsers, t]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  const handleSort = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Modal handlers
  const openAddModal = () => {
    setForm(emptyForm);
    setEditId(null);
    setPhoneTouched(false);
    setPhoneError("");
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    // Extract phone number and country code
    let phoneNumber = user.phone_number || "";
    let countryCode = "RW"; // Default

    // Try to extract country code from phone number
    if (phoneNumber.startsWith('+')) {
      const match = phoneNumber.match(/^\+(\d+)/);
      if (match) {
        const dialCode = match[1];
        const country = enrichedCountries.find(c => c.dialCode === dialCode);
        if (country) {
          countryCode = country.code;
          phoneNumber = phoneNumber.replace(`+${dialCode}`, '');
        }
      }
    }

    // Parse location
    const locationParts = parseLocationString(user.location || "");

    setForm({
      full_name: user.full_name || "",
      phone: phoneNumber,
      phone_country_code: countryCode,
      email: user.email || "",
      role: user.role || "farmer",
      location: user.location || "",
      location_parts: locationParts,
      status: user.status === 'Active'
    });
    setEditId(user.id);
    setPhoneTouched(false);
    setPhoneError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setForm(emptyForm);
    setPhoneTouched(false);
    setPhoneError("");
  };

  // Form validation
  const validateForm = () => {
    if (!form.full_name.trim()) {
      toast.error(t('full_name_required'));
      return false;
    }

    if (!form.phone.trim()) {
      toast.error(t('phone_required'));
      return false;
    }

    const phoneValidation = validatePhone(form.phone, form.phone_country_code);
    if (phoneValidation) {
      toast.error(phoneValidation);
      return false;
    }

    if (!form.role) {
      toast.error(t('role_required'));
      return false;
    }

    if (form.email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(form.email)) {
        toast.error(t('email_invalid'));
        return false;
      }
    }

    return true;
  };

  // Handle save (create or update)
  const handleSave = async () => {
    if (!validateForm()) return;

    // Format full phone number
    const fullPhoneNumber = `+${selectedCountry.dialCode}${form.phone}`;

    // Prepare data for API
    const userData = {
      full_name: form.full_name,
      phone_number: fullPhoneNumber,
      email: form.email || null,
      role: form.role,
      location: form.location || null,
      status: form.status
    };

    try {
      const url = editId
        ? `/users/${editId}/update/`
        : `/users/create/`;

      const response = await apiClient({
        method: editId ? 'PUT' : 'POST',
        url: url,
        data: userData
      });

      if (response.data) {
        if (!editId && !form.email && response.data.generated_password) {
          setGeneratedPassword(response.data.generated_password);
          setShowPasswordModal(true);
        }

        toast.success(response.data.message || t('user_saved_successfully'));
        closeModal();
        fetchUsers();
      }
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.error || t('failed_to_save_user');
      toast.error(errorMessage);
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (user) => {
    try {
      const action = user.status === 'Active' ? 'deactivate' : 'activate';
      const url = `/users/${user.id}/${action}/`;

      const response = await apiClient.put(url, {});

      if (response.data) {
        toast.success(response.data.message);
        fetchUsers();
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      const errorMessage = error.response?.data?.error || t('failed_to_update_status');
      toast.error(errorMessage);
    }
  };

  // Handle delete
  const handleDelete = async (userId) => {
    if (!window.confirm(t('confirm_delete_user'))) return;

    try {
      const response = await apiClient.delete(`/users/${userId}/delete/`);

      if (response.data) {
        toast.success(response.data.message || t('user_deleted_successfully'));
        fetchUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.data?.error || t('failed_to_delete_user');
      toast.error(errorMessage);
    }
  };

  return (
    <div className="user-management-container">
      <ToastContainer position="top-right" autoClose={5000} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        .user-management-container {
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

        .page-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .page-header p {
          font-size: 14px;
          color: #64748b;
          margin: 4px 0 0;
        }

        .add-user-btn {
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
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .add-user-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
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
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
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
          margin: 0 0 8px;
        }

        .summary-card-value {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
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
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
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
          box-shadow: 0 0 0 3px rgba(45, 90, 45, 0.1);
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
          box-shadow: 0 0 0 3px rgba(45, 90, 45, 0.1);
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

        /* Table Styles - Scrollable */
        .table-wrapper {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .users-table {
          width: 100%;
          min-width: 1000px;
          border-collapse: collapse;
        }

        .users-table th {
          background: #f8fafc;
          padding: 16px 20px;
          text-align: left;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }

        .users-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
          color: #1e293b;
          white-space: nowrap;
        }

        .users-table tbody tr {
          transition: all 0.2s ease;
        }

        .users-table tbody tr:hover {
          background: #f8fafc;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 600;
          color: #0f172a;
        }

        .user-id {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 2px;
        }

        .role-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #475569;
        }

        .location-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #475569;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 8px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .action-btn.edit {
          background: #e8f0fe;
          color: #1e3c72;
        }

        .action-btn.edit:hover {
          background: #1e3c72;
          color: white;
        }

        .action-btn.status {
          background: #fff7ed;
          color: #9a3412;
        }

        .action-btn.status:hover {
          background: #9a3412;
          color: white;
        }

        .action-btn.delete {
          background: #fef2f2;
          color: #b91c1c;
        }

        .action-btn.delete:hover {
          background: #b91c1c;
          color: white;
        }

        /* Pagination */
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: white;
          border-top: 1px solid #e2e8f0;
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
          background: rgba(0, 0, 0, 0.5);
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
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
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
          box-shadow: 0 0 0 3px rgba(45, 90, 45, 0.1);
        }

        .form-control.error {
          border-color: #dc2626;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        /* Phone Input Styles */
        .phone-input-group {
          display: flex;
          gap: 8px;
        }

        .country-code-selector {
          position: relative;
          min-width: 120px;
        }

        .country-code-display {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          height: 100%;
        }

        .country-code-display:hover {
          border-color: #2d5a2d;
        }

        .country-code-display.error {
          border-color: #dc2626;
        }

        .selected-flag {
          font-size: 20px;
        }

        .selected-dial {
          font-size: 14px;
          color: #1e293b;
          font-weight: 500;
        }

        .chevron {
          transition: transform 0.2s ease;
          color: #64748b;
        }

        .chevron.open {
          transform: rotate(180deg);
        }

        .country-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          width: 280px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          z-index: 1000;
        }

        .country-search {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .country-search input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
          color: #1e293b;
        }

        .country-search input::placeholder {
          color: #94a3b8;
        }

        .country-list {
          max-height: 250px;
          overflow-y: auto;
        }

        .country-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .country-item:hover {
          background: #f8fafc;
        }

        .country-item.selected {
          background: #e8f5e9;
        }

        .country-flag {
          font-size: 20px;
        }

        .country-name {
          flex: 1;
          font-size: 14px;
          color: #1e293b;
        }

        .country-dial {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .phone-number-input {
          flex: 1;
        }

        .phone-hint {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }

        .phone-error {
          font-size: 12px;
          color: #dc2626;
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
          color: #1e293b;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .location-select:focus {
          outline: none;
          border-color: #2d5a2d;
          box-shadow: 0 0 0 3px rgba(45, 90, 45, 0.1);
        }

        .location-select.error {
          border-color: #dc2626;
        }

        .location-select:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
          opacity: 0.6;
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
        }

        .btn-save:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Password Modal */
        .password-modal {
          max-width: 400px;
          text-align: center;
        }

        .generated-password {
          background: #f8fafc;
          padding: 16px;
          border-radius: 12px;
          font-family: monospace;
          font-size: 20px;
          font-weight: 700;
          color: #2d5a2d;
          margin: 20px 0;
          letter-spacing: 2px;
        }

        .warning-text {
          color: #b91c1c;
          font-size: 13px;
          margin-top: 8px;
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

        /* Responsive */
        @media (max-width: 768px) {
          .user-management-container {
            padding: 16px;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
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

          .modal {
            width: 95%;
            max-height: 95vh;
          }

          .phone-input-group {
            flex-direction: column;
          }

          .country-code-selector {
            width: 100%;
          }

          .country-dropdown {
            width: 100%;
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
        }
      `}</style>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>{t('user_management')}</h1>
          <p>{t('manage_platform_users')}</p>
        </div>
        <button className="add-user-btn" onClick={openAddModal}>
          <Plus size={18} />
          {t('add_user')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <SummaryCard
          title={t('total_users')}
          value={stats.total || users.length}
          icon={<Users size={24} />}
          color="#2d5a2d"
          bgColor="#e8f5e9"
        />
        <SummaryCard
          title={t('active_users')}
          value={stats.active || users.filter(u => u.status === 'Active').length}
          icon={<UserCheck size={24} />}
          color="#0284c7"
          bgColor="#e0f2fe"
        />
        <SummaryCard
          title={t('inactive_users')}
          value={stats.inactive || users.filter(u => u.status === 'Non-Active').length}
          icon={<UserX size={24} />}
          color="#b45309"
          bgColor="#fff7ed"
        />
        <SummaryCard
          title={t('admins')}
          value={stats.admins || users.filter(u => u.role === 'admin').length}
          icon={<Shield size={24} />}
          color="#7e22ce"
          bgColor="#f3e8ff"
        />
        <SummaryCard
          title={t('farmers')}
          value={stats.farmers || users.filter(u => u.role === 'farmer').length}
          icon={<User size={24} />}
          color="#059669"
          bgColor="#d1fae5"
        />
        <SummaryCard
          title={t('buyers')}
          value={stats.buyers || users.filter(u => u.role === 'buyer').length}
          icon={<User size={24} />}
          color="#b45309"
          bgColor="#ffedd5"
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
      />

      {/* Users Table */}
      <div className="table-wrapper">
        {loading ? (
          <LoadingSpinner />
        ) : users.length === 0 ? (
          <div className="empty-state">
            {t('no_users_found')}
          </div>
        ) : (
          <>
            <table className="users-table">
              <thead>
                <tr>
                  <th>{t('user')}</th>
                  <th>{t('contact')}</th>
                  <th>{t('role')}</th>
                  <th>{t('location')}</th>
                  <th>{t('status')}</th>
                  <th>{t('created_at')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-info">
                        <span className="user-name">{user.full_name}</span>
                        <span className="user-id">ID: {user.id}</span>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        {user.email && (
                          <div className="contact-item">
                            <Mail size={12} />
                            <span>{user.email}</span>
                          </div>
                        )}
                        <div className="contact-item">
                          <Phone size={12} />
                          <span>{user.phone_number}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="role-badge"
                        style={roleColors[user.role] || roleColors.buyer}
                      >
                        {t(user.role)}
                      </span>
                    </td>
                    <td>
                      {user.location ? (
                        <div className="location-info">
                          <MapPin size={12} />
                          <span>{user.location}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={user.status === 'Active' ? statusColors.active : statusColors.inactive}
                      >
                        {t(user.status === 'Active' ? 'active' : 'inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="contact-item">
                        <Calendar size={12} />
                        <span>{new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn edit"
                          onClick={() => openEditModal(user)}
                          title={t('edit')}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="action-btn status"
                          onClick={() => handleStatusToggle(user)}
                          title={user.status === 'Active' ? t('deactivate') : t('activate')}
                        >
                          {user.status === 'Active' ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(user.id)}
                          title={t('delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              totalItems={totalItems}
            />
          </>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>{editId ? t('edit_user') : t('add_new_user')}</h2>
                <p>{editId ? t('update_user_details') : t('fill_details_add_user')}</p>
              </div>
              <button className="modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>{t('full_name')} *</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder={t('enter_full_name')}
                />
              </div>

              <div className="form-group">
                <label>{t('phone_number')} *</label>
                <div className="phone-input-group">
                  <CountryCodeSelector
                    selectedCountry={selectedCountry}
                    onSelect={handleCountryChange}
                    error={phoneTouched && phoneError}
                  />
                  <input
                    type="text"
                    className={`form-control phone-number-input ${phoneTouched && phoneError ? 'error' : ''}`}
                    value={form.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onBlur={() => setPhoneTouched(true)}
                    placeholder={t('Phone number')}
                  />
                </div>
                {phoneTouched && phoneError && (
                  <div className="phone-error">{phoneError}</div>
                )}
                {!phoneError && form.phone_country_code && (
                  <div className="phone-hint">
                    {t('phone.hint', { hint: getPhoneRule(form.phone_country_code).hint })}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>{t('email')}</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>

              <div className="form-group">
                <label>{t('role')} *</label>
                <select
                  className="form-control"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="farmer">{t('farmer')}</option>
                  <option value="buyer">{t('buyer')}</option>
                  <option value="admin">{t('admin')}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('location')}</label>
                <LocationSelector
                  locationParts={form.location_parts}
                  onChange={handleLocationPartsChange}
                />
              </div>

              <div className="form-group">
                <label>{t('status')}</label>
                <select
                  className="form-control"
                  value={form.status ? 'active' : 'inactive'}
                  onChange={(e) => setForm({ ...form, status: e.target.value === 'active' })}
                >
                  <option value="active">{t('active')}</option>
                  <option value="inactive">{t('inactive')}</option>
                </select>
              </div>

              {!editId && (
                <div className="form-group">
                  <p className="warning-text">
                    {t('password_generated_info')}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeModal}>
                {t('cancel')}
              </button>
              <button className="btn-save" onClick={handleSave}>
                {editId ? t('update') : t('create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Password Modal */}
      {showPasswordModal && generatedPassword && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal password-modal">
            <div className="modal-header">
              <h2>{t('user_created')}</h2>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>{t('user_created_without_email')}</p>
              <div className="generated-password">
                {generatedPassword}
              </div>
              <p className="warning-text">
                {t('save_password_warning')}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-save" onClick={() => setShowPasswordModal(false)}>
                {t('got_it')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}