/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Bell, BellOff, CheckCircle, CheckCircle2, Mail, Send,
  Users, UserCheck, UserX, Search, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Eye, EyeOff, Trash2,
  Filter, Calendar, Clock, MessageSquare, Megaphone,
  User, Shield, X, RefreshCw, CheckCheck, Archive,
  AlertCircle, Info, Plus, ChevronDown, Globe, Loader
} from "lucide-react";

// API Base URL
const API_BASE_URL = "http://127.0.0.1:8000";

// Notification type colors and icons
const notificationTypeConfig = {
  system: {
    bg: "#e8f5e9", color: "#2e7d32", iconBg: "#c8e6c9",
    icon: <Info size={16} />, label: "System"
  },
  broadcast: {
    bg: "#e3f2fd", color: "#1565c0", iconBg: "#bbdefb",
    icon: <Megaphone size={16} />, label: "Broadcast"
  },
  direct: {
    bg: "#fff8e1", color: "#f57c00", iconBg: "#ffecb3",
    icon: <MessageSquare size={16} />, label: "Direct"
  },
  custom: {
    bg: "#f3e5f5", color: "#7b1fa2", iconBg: "#e1bee7",
    icon: <Send size={16} />, label: "Custom"
  }
};

const statusColors = {
  unread: { bg: "#ffebee", color: "#c62828" },
  read:   { bg: "#e8f5e9", color: "#2e7d32" }
};

const audienceLabels = {
  all:     "All Users",
  farmers: "Farmers Only",
  buyers:  "Buyers Only",
  admins:  "Admins Only"
};

// ── Debounce helper ────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, bgColor, subtitle }) {
  return (
    <div className="summary-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="summary-card-content">
        <div>
          <p className="summary-card-title">{title}</p>
          <h3 className="summary-card-value">{value}</h3>
          {subtitle && <p className="summary-card-subtitle">{subtitle}</p>}
        </div>
        <div className="summary-card-icon" style={{ backgroundColor: bgColor, color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange, totalItems }) {
  const { t } = useTranslation();
  const pageSizeOptions = [5, 10, 20, 30, 50, 100];

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem   = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        <span>{t("showing")}</span>
        <select
          className="page-size-select"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>
        <span>
          {startItem}–{endItem} {t("of")} {totalItems} {t("entries")}
        </span>
      </div>

      <div className="pagination-controls">
        <button className="pagination-btn" onClick={() => onPageChange(1)} disabled={currentPage === 1} title={t("first_page")}>
          <ChevronsLeft size={16} />
        </button>
        <button className="pagination-btn" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} title={t("previous_page")}>
          <ChevronLeft size={16} />
        </button>

        {getPageNumbers().map((page, index) =>
          page === "..." ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              key={page}
              className={`pagination-btn ${currentPage === page ? "active" : ""}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        )}

        <button className="pagination-btn" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} title={t("next_page")}>
          <ChevronRight size={16} />
        </button>
        <button className="pagination-btn" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages || totalPages === 0} title={t("last_page")}>
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── FilterBar ──────────────────────────────────────────────────────────────────
function FilterBar({ filters, onFilterChange, onSort, sortField, sortDirection, onReset, loading }) {
  const { t } = useTranslation();

  const sortOptions = [
    { value: "created_at", label: t("created_date") },
    { value: "title",      label: t("title") },
    { value: "status",     label: t("status") },
    { value: "notification_type", label: t("type") }
  ];

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <select className="filter-select" value={filters.type || ""} onChange={(e) => onFilterChange("type", e.target.value)} disabled={loading}>
          <option value="">{t("all_types")}</option>
          <option value="system">System</option>
          <option value="broadcast">Broadcast</option>
          <option value="direct">Direct</option>
          <option value="custom">Custom</option>
        </select>

        <select className="filter-select" value={filters.status || ""} onChange={(e) => onFilterChange("status", e.target.value)} disabled={loading}>
          <option value="">{t("all_statuses")}</option>
          <option value="unread">{t("unread")}</option>
          <option value="read">{t("read")}</option>
        </select>

        <select className="filter-select" value={filters.audience || ""} onChange={(e) => onFilterChange("audience", e.target.value)} disabled={loading}>
          <option value="">{t("all_audiences")}</option>
          <option value="all">All Users</option>
          <option value="farmers">Farmers</option>
          <option value="buyers">Buyers</option>
          <option value="admins">Admins</option>
        </select>
      </div>

      <div className="filter-group">
        <div className="search-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={t("search_notifications")}
            value={filters.search || ""}
            onChange={(e) => onFilterChange("search", e.target.value)}
            disabled={loading}
          />
          {filters.search && (
            <button className="search-clear-btn" onClick={() => onFilterChange("search", "")} title="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className="filter-select sort-select"
          value={`${sortField}|${sortDirection}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split("|");
            onSort(field, direction);
          }}
          disabled={loading}
        >
          {sortOptions.map((option) => (
            <React.Fragment key={option.value}>
              <option value={`${option.value}|desc`}>{option.label} ↓</option>
              <option value={`${option.value}|asc`}>{option.label} ↑</option>
            </React.Fragment>
          ))}
        </select>

        <button className="reset-btn" onClick={onReset} title={t("reset_filters")} disabled={loading}>
          <RefreshCw size={16} />
        </button>
      </div>
    </div>
  );
}

// ── DateRangeFilter ────────────────────────────────────────────────────────────
function DateRangeFilter({ dateRange, onDateRangeChange, loading }) {
  const { t } = useTranslation();
  return (
    <div className="date-range-filter">
      <div className="date-input-group">
        <label>{t("from_date")}</label>
        <input type="date" className="date-input" value={dateRange.startDate || ""} onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })} disabled={loading} />
      </div>
      <div className="date-input-group">
        <label>{t("to_date")}</label>
        <input type="date" className="date-input" value={dateRange.endDate || ""} onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })} disabled={loading} />
      </div>
      {(dateRange.startDate || dateRange.endDate) && (
        <button
          className="reset-btn"
          style={{ alignSelf: "flex-end" }}
          onClick={() => onDateRangeChange({ startDate: "", endDate: "" })}
          disabled={loading}
          title="Clear dates"
        >
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}

// ── UserSearchSelector ─────────────────────────────────────────────────────────
function UserSearchSelector({ selectedUserId, onSelectUser, users, loadingUsers, searchTerm, onSearchChange }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="user-search-selector" ref={dropdownRef}>
      <div className={`user-selector-display ${!selectedUserId ? "empty" : ""}`} onClick={() => setIsOpen(!isOpen)}>
        {selectedUser ? (
          <div className="selected-user-info">
            <span className="selected-user-name">{selectedUser.full_name}</span>
            <span className="selected-user-details">({selectedUser.role}) - {selectedUser.phone_number}</span>
          </div>
        ) : (
          <span className="placeholder">{t("select_user")}</span>
        )}
        <ChevronDown size={16} className={`chevron ${isOpen ? "open" : ""}`} />
      </div>

      {isOpen && (
        <div className="user-dropdown">
          <div className="user-search">
            <Search size={14} />
            <input type="text" placeholder={t("search_users_by_name_phone")} value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} autoFocus />
          </div>
          <div className="user-list">
            {loadingUsers ? (
              <div className="user-list-loading"><Loader size={20} className="spinning" /><span>{t("loading_users")}</span></div>
            ) : users.length === 0 ? (
              <div className="user-list-empty">{t("no_users_found")}</div>
            ) : (
              users.map((user) => (
                <div key={user.id} className={`user-item ${selectedUserId === user.id ? "selected" : ""}`} onClick={() => { onSelectUser(user.id); setIsOpen(false); }}>
                  <div className="user-item-avatar"><User size={16} /></div>
                  <div className="user-item-info">
                    <div className="user-item-name">{user.full_name}</div>
                    <div className="user-item-meta">
                      <span className="user-item-role">{user.role}</span>
                      <span className="user-item-phone">{user.phone_number}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminNotificationManagement() {
  const { t } = useTranslation();

  // ── Core state ───────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const abortControllerRef = useRef(null);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ total: 0, unread: 0, read: 0, system: 0, broadcast: 0, direct: 0, custom: 0 });

  // ── Pagination state ─────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // ── Filter / sort state ──────────────────────────────────────────────────────
  const [filters, setFilters] = useState({ type: "", status: "", audience: "", search: "" });
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  // Debounced search — triggers a new fetch after user stops typing
  const debouncedSearch = useDebounce(filters.search, 500);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendForm, setSendForm] = useState({ title: "", description: "", audience: "all", receiver_id: null });

  // ── Users state ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getAuthToken = () =>
    localStorage.getItem("access_token") || localStorage.getItem("accessToken") ||
    sessionStorage.getItem("access_token") || sessionStorage.getItem("accessToken") || "";

  const getUserLanguage = () => localStorage.getItem("language") || i18n.language || "en";

  // ── API client ───────────────────────────────────────────────────────────────
  const apiClient = useMemo(() => {
    const client = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });
    client.interceptors.request.use((config) => {
      const token = getAuthToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      config.headers["Accept-Language"] = getUserLanguage();
      config.headers["Content-Type"] = "application/json";
      return config;
    });
    client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          toast.error(t("session_expired"));
          ["access_token", "accessToken", "refresh_token", "refreshToken", "user"].forEach((k) => localStorage.removeItem(k));
          setTimeout(() => { window.location.href = "/"; }, 2000);
        }
        return Promise.reject(error);
      }
    );
    return client;
  }, [t]);

  // ── Fetch users ──────────────────────────────────────────────────────────────
  const fetchAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await apiClient.get("/users/");
      if (response.data?.users) {
        setUsers(response.data.users);
        setFilteredUsers(response.data.users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(t("failed_to_load_users"));
    } finally {
      setLoadingUsers(false);
    }
  }, [apiClient, t]);

  // Filter users by search term
  useEffect(() => {
    if (!userSearchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const lc = userSearchTerm.toLowerCase();
      setFilteredUsers(users.filter((u) =>
        u.full_name.toLowerCase().includes(lc) ||
        u.phone_number.includes(lc) ||
        (u.email && u.email.toLowerCase().includes(lc))
      ));
    }
  }, [userSearchTerm, users]);

  // ── Fetch notifications ──────────────────────────────────────────────────────
  // KEY FIX: we depend on debouncedSearch (not filters.search) so typing doesn't
  // fire a request on every keystroke. All other filter/pagination changes fire immediately.
  const fetchNotifications = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setFetchError(null);

    try {
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("page_size", pageSize);
      params.append("sort_by", sortField);
      params.append("sort_dir", sortDirection);
      if (filters.type)       params.append("type",      filters.type);
      if (filters.status)     params.append("status",    filters.status);
      if (filters.audience)   params.append("audience",  filters.audience);
      if (debouncedSearch)    params.append("search",    debouncedSearch);
      if (dateRange.startDate) params.append("start_date", dateRange.startDate);
      if (dateRange.endDate)   params.append("end_date",   dateRange.endDate);

      const response = await apiClient.get(`/notifications/all/?${params.toString()}`, {
        signal: abortControllerRef.current.signal
      });

      if (response.data) {
        const notificationsData = response.data.notifications || [];
        setNotifications(notificationsData);

        // ── Pagination: trust the backend totals when present ──────────────────
        // If the backend returns total / total_pages, use them directly.
        // Otherwise fall back to client-side slicing (handled below).
        const backendTotal      = response.data.total      ?? null;
        const backendTotalPages = response.data.total_pages ?? null;

        if (backendTotal !== null) {
          setTotalItems(backendTotal);
          setTotalPages((backendTotalPages ?? Math.ceil(backendTotal / pageSize)) || 1);
        } else {
          // Backend returned all rows without pagination metadata —
          // do client-side pagination so the table still shows `pageSize` rows.
          setTotalItems(notificationsData.length);
          setTotalPages(Math.ceil(notificationsData.length / pageSize) || 1);
        }

        fetchNotificationStats();
      }
    } catch (error) {
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") return;
      console.error("Error fetching notifications:", error);
      setFetchError(error.message);
      const msg = error.response?.data?.error || (error.request ? t("network_error") : t("failed_to_fetch_notifications"));
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiClient, t, currentPage, pageSize, sortField, sortDirection, filters.type, filters.status, filters.audience, debouncedSearch, dateRange]);

  // Re-fetch whenever fetchNotifications identity changes (i.e. any dep above changes)
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const fetchNotificationStats = useCallback(async () => {
    try {
      const response = await apiClient.get("/notifications/stats/");
      if (response.data) {
        setStats({
          total:     response.data.total     || 0,
          unread:    response.data.unread    || 0,
          read:      response.data.read      || 0,
          system:    response.data.system    || 0,
          broadcast: response.data.broadcast || 0,
          direct:    response.data.direct    || 0,
          custom:    response.data.custom    || 0
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [apiClient]);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      toast.error(t("authentication_required"));
      setTimeout(() => { window.location.href = "/"; }, 2000);
      return;
    }
    fetchAllUsers();
    fetchNotificationStats();
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Client-side pagination slice ─────────────────────────────────────────────
  // When the backend doesn't paginate (returns all rows), we slice here so the
  // table always shows exactly `pageSize` rows for the current page.
  const displayedNotifications = useMemo(() => {
    // If backend already paginated (returned page_size rows ≤ pageSize), show as-is.
    if (notifications.length <= pageSize) return notifications;
    // Otherwise slice for the current page.
    const start = (currentPage - 1) * pageSize;
    return notifications.slice(start, start + pageSize);
  }, [notifications, currentPage, pageSize]);

  // ── Filter / sort / pagination handlers ──────────────────────────────────────
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // always reset to page 1 when a filter changes
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
    setCurrentPage(1);
  };

  const handleSort = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ type: "", status: "", audience: "", search: "" });
    setDateRange({ startDate: "", endDate: "" });
    setSortField("created_at");
    setSortDirection("desc");
    setCurrentPage(1);
  };

  // ── Notification actions ──────────────────────────────────────────────────────
  const handleMarkAsRead = async (notificationId) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/mark-read/`);
      toast.success(t("notification_marked_read"));
      fetchNotifications();
      fetchNotificationStats();
    } catch (error) {
      toast.error(error.response?.data?.error || t("failed_to_mark_read"));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await apiClient.patch("/notifications/mark-all-read/");
      toast.success(response.data?.message || t("all_notifications_marked_read"));
      fetchNotifications();
      fetchNotificationStats();
      setSelectedNotifications([]);
      setShowBulkActions(false);
    } catch (error) {
      toast.error(error.response?.data?.error || t("failed_to_mark_all_read"));
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (!selectedNotifications.length) return;
    try {
      await Promise.all(selectedNotifications.map((id) => apiClient.patch(`/notifications/${id}/mark-read/`)));
      toast.success(t("selected_notifications_marked_read"));
      fetchNotifications();
      fetchNotificationStats();
      setSelectedNotifications([]);
      setShowBulkActions(false);
    } catch (error) {
      toast.error(t("failed_to_mark_selected_read"));
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm(t("confirm_delete_notification"))) return;
    try {
      await apiClient.delete(`/notifications/${notificationId}/delete/`);
      toast.success(t("notification_deleted"));
      fetchNotifications();
      fetchNotificationStats();
      setSelectedNotifications((prev) => prev.filter((id) => id !== notificationId));
    } catch (error) {
      toast.error(error.response?.data?.error || t("failed_to_delete"));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedNotifications.length) return;
    if (!window.confirm(t("confirm_bulk_delete"))) return;
    try {
      await Promise.all(selectedNotifications.map((id) => apiClient.delete(`/notifications/${id}/delete/`)));
      toast.success(t("selected_notifications_deleted"));
      fetchNotifications();
      fetchNotificationStats();
      setSelectedNotifications([]);
      setShowBulkActions(false);
    } catch (error) {
      toast.error(t("failed_to_delete_selected"));
    }
  };

  const handleSendNotification = async () => {
    if (!sendForm.title.trim() || !sendForm.description.trim()) {
      toast.error(t("title_and_description_required"));
      return;
    }
    setSending(true);
    try {
      const payload = { title: sendForm.title, description: sendForm.description, audience: sendForm.audience };
      if (sendForm.audience === "single" && sendForm.receiver_id) payload.receiver_id = parseInt(sendForm.receiver_id);
      const response = await apiClient.post("/notifications/send/", payload);
      toast.success(response.data?.message || t("notification_sent_successfully"));
      setSendModalOpen(false);
      setSendForm({ title: "", description: "", audience: "all", receiver_id: null });
      fetchNotifications();
      fetchNotificationStats();
    } catch (error) {
      toast.error(error.response?.data?.error || t("failed_to_send_notification"));
    } finally {
      setSending(false);
    }
  };

  const toggleSelectNotification = (notificationId) => {
    setSelectedNotifications((prev) => {
      const next = prev.includes(notificationId) ? prev.filter((id) => id !== notificationId) : [...prev, notificationId];
      setShowBulkActions(next.length > 0);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedNotifications.length === displayedNotifications.length && displayedNotifications.length > 0) {
      setSelectedNotifications([]);
      setShowBulkActions(false);
    } else {
      setSelectedNotifications(displayedNotifications.map((n) => n.id));
      setShowBulkActions(true);
    }
  };

  const openSendModal = () => {
    setSendForm({ title: "", description: "", audience: "all", receiver_id: null });
    setUserSearchTerm("");
    setSendModalOpen(true);
  };

  const formatDate  = (ds) => new Date(ds).toLocaleString();
  const getTimeAgo  = (ds) => {
    const diffMs   = Date.now() - new Date(ds).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays  = Math.floor(diffMs / 86400000);
    if (diffMins  < 1)  return "Just now";
    if (diffMins  < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays  <  7) return `${diffDays}d ago`;
    return new Date(ds).toLocaleDateString();
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="notification-management-container">
      <ToastContainer position="top-right" autoClose={5000} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .notification-management-container {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #f8fafc 100%);
          min-height: 100vh;
          padding: 24px;
        }

        /* Page Header */
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
        .page-header h1 { font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #0f172a 0%, #1e3c1e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0; }
        .page-header p { font-size: 14px; color: #64748b; margin: 4px 0 0; }
        .header-actions { display: flex; gap: 12px; }
        .send-notification-btn { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%); color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .send-notification-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2); }

        /* Summary Cards */
        .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 28px; }
        .summary-card { background: white; border-radius: 20px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: all 0.3s ease; }
        .summary-card:hover { transform: translateY(-3px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .summary-card-content { display: flex; justify-content: space-between; align-items: center; }
        .summary-card-title { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px; }
        .summary-card-value { font-size: 32px; font-weight: 800; color: #0f172a; margin: 0; }
        .summary-card-subtitle { font-size: 12px; color: #94a3b8; margin: 4px 0 0; }
        .summary-card-icon { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 24px; }

        /* Active-filter indicator strip */
        .active-filters-strip {
          display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
          padding: 10px 20px; background: #fffbeb; border-radius: 12px;
          margin-bottom: 16px; border: 1px solid #fde68a;
          font-size: 13px; color: #92400e;
        }
        .active-filters-strip strong { color: #78350f; }
        .filter-chip {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; background: #fef3c7; border: 1px solid #fde68a;
          border-radius: 20px; font-size: 12px; font-weight: 500; color: #92400e;
        }
        .filter-chip button {
          background: none; border: none; cursor: pointer; padding: 0 2px;
          color: #b45309; display: flex; align-items: center;
        }

        /* Filter Bar */
        .filter-bar { background: white; border-radius: 20px; padding: 20px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .filter-group { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .filter-select { padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; color: #1e293b; background: white; cursor: pointer; min-width: 150px; transition: all 0.2s ease; }
        .filter-select:disabled { opacity: 0.6; cursor: not-allowed; }
        .filter-select:focus { outline: none; border-color: #2d5a2d; box-shadow: 0 0 0 3px rgba(45,90,45,0.1); }
        .search-wrapper { display: flex; position: relative; align-items: center; }
        .search-icon { position: absolute; left: 12px; color: #94a3b8; pointer-events: none; }
        .search-input { padding: 10px 40px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; width: 280px; transition: all 0.2s ease; }
        .search-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .search-input:focus { outline: none; border-color: #2d5a2d; box-shadow: 0 0 0 3px rgba(45,90,45,0.1); }
        .search-clear-btn { position: absolute; right: 10px; background: none; border: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; padding: 2px; }
        .search-clear-btn:hover { color: #ef4444; }
        .reset-btn { padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: white; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; color: #64748b; }
        .reset-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .reset-btn:hover:not(:disabled) { background: #f8fafc; border-color: #2d5a2d; color: #2d5a2d; }

        /* Date Range Filter */
        .date-range-filter { background: white; border-radius: 20px; padding: 16px 20px; margin-bottom: 16px; display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .date-input-group { display: flex; flex-direction: column; gap: 6px; }
        .date-input-group label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .date-input { padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; color: #1e293b; }
        .date-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .date-input:focus { outline: none; border-color: #2d5a2d; }

        /* Bulk Actions */
        .bulk-actions-bar { background: linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%); border-radius: 16px; padding: 12px 20px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; animation: slideDown 0.3s ease; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        .bulk-actions-info { color: white; font-size: 14px; font-weight: 500; }
        .bulk-actions-buttons { display: flex; gap: 12px; }
        .bulk-action-btn { padding: 8px 16px; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 8px; }
        .bulk-action-btn.read { background: white; color: #2d5a2d; }
        .bulk-action-btn.read:hover { background: #e8f5e9; transform: translateY(-1px); }
        .bulk-action-btn.delete { background: #fee2e2; color: #b91c1c; }
        .bulk-action-btn.delete:hover { background: #fecaca; transform: translateY(-1px); }

        /* Table */
        .table-wrapper { background: white; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .notifications-table { width: 100%; min-width: 1000px; border-collapse: collapse; }
        .notifications-table th { background: #f8fafc; padding: 16px 20px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
        .notifications-table td { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b; }
        .notifications-table tbody tr { transition: all 0.2s ease; cursor: pointer; }
        .notifications-table tbody tr:hover { background: #f8fafc; }
        .notifications-table tbody tr.unread { background: #fefce8; font-weight: 500; }
        .notifications-table tbody tr.unread:hover { background: #fef9c3; }
        .checkbox-cell { width: 40px; text-align: center; }
        .checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: #2d5a2d; }

        /* Badges */
        .type-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
        .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
        .audience-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; background: #f1f5f9; color: #475569; }

        /* Content */
        .notification-title { font-weight: 600; color: #0f172a; margin-bottom: 4px; }
        .notification-preview { font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; }
        .sender-info, .receiver-info { display: flex; align-items: center; gap: 6px; font-size: 13px; }
        .sender-info svg, .receiver-info svg { color: #94a3b8; }

        /* Action Buttons */
        .action-buttons { display: flex; gap: 8px; }
        .action-btn { padding: 8px; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
        .action-btn.view { background: #e8f0fe; color: #1e3c72; }
        .action-btn.view:hover { background: #1e3c72; color: white; }
        .action-btn.read { background: #e8f5e9; color: #2d5a2d; }
        .action-btn.read:hover { background: #2d5a2d; color: white; }
        .action-btn.delete { background: #fef2f2; color: #b91c1c; }
        .action-btn.delete:hover { background: #b91c1c; color: white; }

        /* Results info bar */
        .results-info {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
          font-size: 13px; color: #64748b;
        }
        .results-info strong { color: #1e293b; }

        /* Pagination */
        .pagination-container { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: white; border-top: 1px solid #e2e8f0; flex-wrap: wrap; gap: 16px; }
        .pagination-info { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 14px; flex-wrap: wrap; }
        .page-size-select { padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; cursor: pointer; }
        .pagination-controls { display: flex; gap: 6px; flex-wrap: wrap; }
        .pagination-btn { min-width: 36px; height: 36px; border: 1px solid #e2e8f0; background: white; border-radius: 8px; font-size: 14px; color: #1e293b; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; }
        .pagination-btn:hover:not(:disabled) { background: #f8fafc; border-color: #2d5a2d; color: #2d5a2d; }
        .pagination-btn.active { background: #2d5a2d; border-color: #2d5a2d; color: white; }
        .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pagination-ellipsis { display: flex; align-items: center; justify-content: center; min-width: 36px; color: #94a3b8; }

        /* User Search Selector */
        .user-search-selector { position: relative; width: 100%; }
        .user-selector-display { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: white; cursor: pointer; transition: all 0.2s ease; min-height: 48px; }
        .user-selector-display:hover { border-color: #2d5a2d; }
        .user-selector-display.empty { color: #94a3b8; }
        .selected-user-info { display: flex; flex-direction: column; gap: 4px; }
        .selected-user-name { font-weight: 600; color: #1e293b; }
        .selected-user-details { font-size: 12px; color: #64748b; }
        .user-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); z-index: 1000; max-height: 300px; overflow: hidden; display: flex; flex-direction: column; }
        .user-search { display: flex; align-items: center; gap: 8px; padding: 12px; border-bottom: 1px solid #e2e8f0; }
        .user-search input { flex: 1; border: none; outline: none; font-size: 14px; }
        .user-list { overflow-y: auto; max-height: 250px; }
        .user-item { display: flex; align-items: center; gap: 12px; padding: 12px; cursor: pointer; transition: all 0.2s ease; border-bottom: 1px solid #f1f5f9; }
        .user-item:hover { background: #f8fafc; }
        .user-item.selected { background: #e8f5e9; }
        .user-item-avatar { width: 32px; height: 32px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #64748b; }
        .user-item-info { flex: 1; }
        .user-item-name { font-weight: 600; color: #1e293b; font-size: 14px; }
        .user-item-meta { display: flex; gap: 8px; margin-top: 2px; font-size: 11px; }
        .user-item-role { color: #2d5a2d; background: #e8f5e9; padding: 2px 6px; border-radius: 4px; }
        .user-item-phone { color: #64748b; }
        .user-list-loading, .user-list-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px; color: #64748b; }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Modals */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); padding: 16px; }
        .modal { background: white; border-radius: 24px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: modalFadeIn 0.3s ease; }
        @keyframes modalFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .modal-large { max-width: 700px; }
        .modal-header { padding: 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10; }
        .modal-header h2 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
        .modal-close { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all 0.2s ease; }
        .modal-close:hover { background: #fee2e2; color: #b91c1c; }
        .modal-body { padding: 24px; }
        .modal-footer { padding: 24px; border-top: 1px solid #e2e8f0; display: flex; gap: 12px; justify-content: flex-end; position: sticky; bottom: 0; background: white; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; }
        .form-control { width: 100%; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 14px; transition: all 0.2s ease; box-sizing: border-box; }
        .form-control:focus { outline: none; border-color: #2d5a2d; box-shadow: 0 0 0 3px rgba(45,90,45,0.1); }
        textarea.form-control { resize: vertical; min-height: 100px; }
        .detail-section { margin-bottom: 24px; }
        .detail-label { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .detail-value { font-size: 14px; color: #1e293b; line-height: 1.5; }
        .detail-message { background: #f8fafc; padding: 16px; border-radius: 12px; font-size: 14px; line-height: 1.6; }

        /* Loading & Empty States */
        .loading-spinner { display: flex; justify-content: center; align-items: center; padding: 60px; }
        .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #2d5a2d; border-radius: 50%; animation: spin 1s linear infinite; }
        .empty-state { text-align: center; padding: 60px; color: #94a3b8; font-size: 16px; }

        /* Responsive */
        @media (max-width: 768px) {
          .notification-management-container { padding: 16px; }
          .page-header { flex-direction: column; align-items: flex-start; }
          .filter-bar { flex-direction: column; }
          .filter-group { width: 100%; }
          .search-input { width: 100%; }
          .date-range-filter { flex-direction: column; align-items: stretch; }
          .bulk-actions-bar { flex-direction: column; align-items: stretch; text-align: center; }
          .bulk-actions-buttons { justify-content: center; }
          .pagination-container { flex-direction: column; align-items: flex-start; }
          .pagination-controls { width: 100%; justify-content: center; }
          .modal { width: 95%; max-height: 95vh; }
        }
        @media (max-width: 480px) {
          .summary-cards { grid-template-columns: 1fr; }
          .filter-select { width: 100%; }
          .pagination-info { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>{t("notification_management")}</h1>
          <p>{t("manage_and_monitor_all_notifications")}</p>
        </div>
        <div className="header-actions">
          <button className="send-notification-btn" onClick={openSendModal}>
            <Send size={18} />
            {t("send_notification")}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <SummaryCard title={t("total_notifications")} value={stats.total}     icon={<Bell size={24} />}        color="#2d5a2d" bgColor="#e8f5e9" />
        <SummaryCard title={t("unread")}               value={stats.unread}    icon={<BellOff size={24} />}     color="#c62828" bgColor="#ffebee" subtitle={`${stats.total ? Math.round((stats.unread / stats.total) * 100) : 0}% of total`} />
        <SummaryCard title={t("read")}                  value={stats.read}      icon={<CheckCircle size={24} />} color="#2e7d32" bgColor="#e8f5e9" />
        <SummaryCard title={t("direct_messages")}       value={stats.direct}    icon={<MessageSquare size={24} />} color="#f57c00" bgColor="#fff8e1" />
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onSort={handleSort}
        sortField={sortField}
        sortDirection={sortDirection}
        onReset={handleResetFilters}
        loading={loading}
      />

      {/* Date Range Filter */}
      <DateRangeFilter dateRange={dateRange} onDateRangeChange={handleDateRangeChange} loading={loading} />

      {/* Active Filters indicator */}
      {(filters.type || filters.status || filters.audience || filters.search || dateRange.startDate || dateRange.endDate) && (
        <div className="active-filters-strip">
          <strong>Active filters:</strong>
          {filters.type     && <span className="filter-chip">Type: {filters.type}     <button onClick={() => handleFilterChange("type", "")}><X size={10} /></button></span>}
          {filters.status   && <span className="filter-chip">Status: {filters.status} <button onClick={() => handleFilterChange("status", "")}><X size={10} /></button></span>}
          {filters.audience && <span className="filter-chip">Audience: {filters.audience} <button onClick={() => handleFilterChange("audience", "")}><X size={10} /></button></span>}
          {filters.search   && <span className="filter-chip">Search: "{filters.search}" <button onClick={() => handleFilterChange("search", "")}><X size={10} /></button></span>}
          {dateRange.startDate && <span className="filter-chip">From: {dateRange.startDate} <button onClick={() => handleDateRangeChange({ ...dateRange, startDate: "" })}><X size={10} /></button></span>}
          {dateRange.endDate   && <span className="filter-chip">To: {dateRange.endDate}     <button onClick={() => handleDateRangeChange({ ...dateRange, endDate: "" })}><X size={10} /></button></span>}
          <button className="reset-btn" style={{ marginLeft: "auto", fontSize: 12, padding: "4px 12px" }} onClick={handleResetFilters}>
            Clear all
          </button>
        </div>
      )}

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="bulk-actions-bar">
          <div className="bulk-actions-info">{selectedNotifications.length} {t("notifications_selected")}</div>
          <div className="bulk-actions-buttons">
            <button className="bulk-action-btn read" onClick={handleBulkMarkAsRead}><CheckCircle2 size={16} />{t("mark_selected_read")}</button>
            <button className="bulk-action-btn delete" onClick={handleBulkDelete}><Trash2 size={16} />{t("delete_selected")}</button>
          </div>
        </div>
      )}

      {/* Notifications Table */}
      <div className="table-wrapper">
        {loading ? (
          <LoadingSpinner />
        ) : displayedNotifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} strokeWidth={1} />
            <p>{t("no_notifications_found")}</p>
          </div>
        ) : (
          <>
            {/* Results info bar inside the table card */}
            <div className="results-info">
              <span>
                Showing <strong>{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> notifications
              </span>
              {(filters.type || filters.status || filters.audience || filters.search) && (
                <span style={{ color: "#f59e0b", fontWeight: 500 }}>
                  ⚡ Filtered results
                </span>
              )}
            </div>

            <table className="notifications-table">
              <thead>
                <tr>
                  <th className="checkbox-cell">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={selectedNotifications.length === displayedNotifications.length && displayedNotifications.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>{t("type")}</th>
                  <th>{t("title")}</th>
                  <th>{t("from")}</th>
                  <th>{t("to")}</th>
                  <th>{t("status")}</th>
                  <th>{t("created_at")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {displayedNotifications.map((notification) => {
                  const typeConfig = notificationTypeConfig[notification.notification_type] || notificationTypeConfig.system;
                  const isUnread   = notification.status === "unread";
                  return (
                    <tr key={notification.id} className={isUnread ? "unread" : ""}>
                      <td className="checkbox-cell">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selectedNotifications.includes(notification.id)}
                          onChange={() => toggleSelectNotification(notification.id)}
                        />
                      </td>
                      <td>
                        <span className="type-badge" style={{ background: typeConfig.bg, color: typeConfig.color }}>
                          {typeConfig.icon}{typeConfig.label}
                        </span>
                      </td>
                      <td>
                        <div className="notification-title">{notification.title}</div>
                        <div className="notification-preview">
                          {notification.description.length > 60
                            ? `${notification.description.substring(0, 60)}…`
                            : notification.description}
                        </div>
                      </td>
                      <td>
                        <div className="sender-info"><User size={12} /><span>{notification.sender_name}</span></div>
                      </td>
                      <td>
                        <div className="receiver-info">
                          {notification.notification_type === "broadcast" ? (
                            <><Globe size={12} /><span>{audienceLabels[notification.audience] || "All Users"}</span></>
                          ) : (
                            <><User size={12} /><span>{notification.receiver_name}</span></>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="status-badge" style={statusColors[notification.status]}>
                          {notification.status === "unread" ? t("unread") : t("read")}
                          {notification.read_at && notification.status === "read" && (
                            <span style={{ fontSize: 10, marginLeft: 4 }}>({new Date(notification.read_at).toLocaleDateString()})</span>
                          )}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          <div>{formatDate(notification.created_at)}</div>
                          <div style={{ color: "#94a3b8", fontSize: 11 }}>{getTimeAgo(notification.created_at)}</div>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn view"   onClick={() => { setSelectedNotification(notification); setDetailsModalOpen(true); }} title={t("view_details")}><Eye size={14} /></button>
                          {isUnread && (
                            <button className="action-btn read" onClick={() => handleMarkAsRead(notification.id)} title={t("mark_as_read")}><CheckCircle2 size={14} /></button>
                          )}
                          <button className="action-btn delete" onClick={() => handleDeleteNotification(notification.id)} title={t("delete")}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

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
      </div>

      {/* Mark All Read FAB */}
      {stats.unread > 0 && (
        <button
          onClick={handleMarkAllAsRead}
          style={{ position: "fixed", bottom: 24, right: 24, background: "linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%)", color: "white", border: "none", borderRadius: 48, padding: "12px 24px", display: "flex", alignItems: "center", gap: 8, fontWeight: 600, cursor: "pointer", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)", zIndex: 100, transition: "all 0.3s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0,0,0,0.3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(0,0,0,0.2)"; }}
        >
          <CheckCheck size={18} />
          {t("mark_all_as_read")} ({stats.unread})
        </button>
      )}

      {/* Details Modal */}
      {detailsModalOpen && selectedNotification && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDetailsModalOpen(false)}>
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>{t("notification_details")}</h2>
              <button className="modal-close" onClick={() => setDetailsModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <div className="detail-label">{t("title")}</div>
                <div className="detail-value" style={{ fontSize: 18, fontWeight: 600 }}>{selectedNotification.title}</div>
              </div>
              <div className="detail-section">
                <div className="detail-label">{t("message")}</div>
                <div className="detail-message">{selectedNotification.description}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                <div className="detail-section">
                  <div className="detail-label">{t("type")}</div>
                  <span className="type-badge" style={{ background: notificationTypeConfig[selectedNotification.notification_type]?.bg, color: notificationTypeConfig[selectedNotification.notification_type]?.color }}>
                    {notificationTypeConfig[selectedNotification.notification_type]?.icon}
                    {notificationTypeConfig[selectedNotification.notification_type]?.label}
                  </span>
                </div>
                <div className="detail-section">
                  <div className="detail-label">{t("status")}</div>
                  <span className="status-badge" style={statusColors[selectedNotification.status]}>
                    {selectedNotification.status === "unread" ? t("unread") : t("read")}
                  </span>
                </div>
                <div className="detail-section"><div className="detail-label">{t("from")}</div><div className="detail-value">{selectedNotification.sender_name}</div></div>
                <div className="detail-section">
                  <div className="detail-label">{t("to")}</div>
                  <div className="detail-value">
                    {selectedNotification.notification_type === "broadcast"
                      ? audienceLabels[selectedNotification.audience] || "All Users"
                      : selectedNotification.receiver_name}
                  </div>
                </div>
                <div className="detail-section"><div className="detail-label">{t("created_at")}</div><div className="detail-value">{formatDate(selectedNotification.created_at)}</div></div>
                {selectedNotification.read_at && (
                  <div className="detail-section"><div className="detail-label">{t("read_at")}</div><div className="detail-value">{formatDate(selectedNotification.read_at)}</div></div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {selectedNotification.status === "unread" && (
                <button onClick={() => { handleMarkAsRead(selectedNotification.id); setDetailsModalOpen(false); }}
                  style={{ padding: "10px 20px", background: "#2d5a2d", color: "white", border: "none", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={16} />{t("mark_as_read")}
                </button>
              )}
              <button onClick={() => setDetailsModalOpen(false)}
                style={{ padding: "10px 20px", border: "1px solid #e2e8f0", background: "white", borderRadius: 10, cursor: "pointer" }}>
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {sendModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSendModalOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>{t("send_notification")}</h2>
              <button className="modal-close" onClick={() => setSendModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>{t("title")} *</label>
                <input type="text" className="form-control" value={sendForm.title} onChange={(e) => setSendForm((p) => ({ ...p, title: e.target.value }))} placeholder={t("enter_notification_title")} />
              </div>
              <div className="form-group">
                <label>{t("description")} *</label>
                <textarea className="form-control" value={sendForm.description} onChange={(e) => setSendForm((p) => ({ ...p, description: e.target.value }))} placeholder={t("enter_notification_description")} />
              </div>
              <div className="form-group">
                <label>{t("audience")}</label>
                <select className="form-control" value={sendForm.audience} onChange={(e) => setSendForm((p) => ({ ...p, audience: e.target.value, receiver_id: null }))}>
                  <option value="all">{t("all_users")}</option>
                  <option value="farmers">{t("farmers_only")}</option>
                  <option value="buyers">{t("buyers_only")}</option>
                  <option value="admins">{t("admins_only")}</option>
                  <option value="single">{t("single_user")}</option>
                </select>
              </div>
              {sendForm.audience === "single" && (
                <div className="form-group">
                  <label>{t("select_user")} *</label>
                  <UserSearchSelector
                    selectedUserId={sendForm.receiver_id}
                    onSelectUser={(userId) => setSendForm((p) => ({ ...p, receiver_id: userId }))}
                    users={filteredUsers}
                    loadingUsers={loadingUsers}
                    searchTerm={userSearchTerm}
                    onSearchChange={setUserSearchTerm}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setSendModalOpen(false)} style={{ padding: "10px 20px", border: "1px solid #e2e8f0", background: "white", borderRadius: 10, cursor: "pointer" }}>
                {t("cancel")}
              </button>
              <button
                onClick={handleSendNotification}
                disabled={sending || (sendForm.audience === "single" && !sendForm.receiver_id)}
                style={{ padding: "10px 20px", background: "linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%)", color: "white", border: "none", borderRadius: 10, cursor: sending || (sendForm.audience === "single" && !sendForm.receiver_id) ? "not-allowed" : "pointer", opacity: sending || (sendForm.audience === "single" && !sendForm.receiver_id) ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8 }}
              >
                {sending ? <><Loader size={16} className="spinning" />{t("sending...")}</> : t("send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}