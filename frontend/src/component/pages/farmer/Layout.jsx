/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import {
  LayoutDashboard, Users, Handshake, Wheat, FileText,
  BarChart2, UserCircle, Settings, LogOut,
  MessageSquare, Globe, Bell, ChevronDown,
  Mail, Phone, MapPin, ShieldCheck, Menu, X,
  Loader2, ClipboardList, Edit3, Calendar, Clock,
  CheckCircle, XCircle, AlertCircle, Save, Eye, EyeOff,
  Key, RefreshCw, Home, BellRing, BellOff, Info,
  User, Clock3, ChevronRight
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BASE_URL = "http://127.0.0.1:8000";
const WS_URL = "ws://127.0.0.1:8000/ws/notifications/";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "sw", label: "Swahili", flag: "🇹🇿" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
];

function getGreeting(t) {
  const h = new Date().getHours();
  if (h < 12) return t("greeting.morning", { defaultValue: "Good morning" });
  if (h < 17) return t("greeting.afternoon", { defaultValue: "Good afternoon" });
  return t("greeting.evening", { defaultValue: "Good evening" });
}

function useDateTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getInitials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(d) {
  return d.toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatClock(d) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatRelativeTime(dateString, t) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return t('notifications.just_now', { defaultValue: 'Just now' });
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return t('notifications.minutes_ago', { count: diffInMinutes, defaultValue: `${diffInMinutes}m ago` });
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return t('notifications.hours_ago', { count: diffInHours, defaultValue: `${diffInHours}h ago` });
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return t('notifications.days_ago', { count: diffInDays, defaultValue: `${diffInDays}d ago` });
  }
  
  return formatDateTime(date);
}

// Notification Detail Modal Component
function NotificationDetailModal({ isOpen, onClose, notification, onMarkAsRead, t }) {
  if (!isOpen || !notification) return null;

  const handleMarkAsRead = async () => {
    await onMarkAsRead(notification.id);
    onClose();
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'system': return <ShieldCheck size={16} />;
      case 'broadcast': return <BellRing size={16} />;
      case 'direct': return <User size={16} />;
      default: return <Info size={16} />;
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'system': return { bg: '#f3e8ff', color: '#9333ea' };
      case 'broadcast': return { bg: '#fff3cd', color: '#856404' };
      case 'direct': return { bg: '#d1e7ff', color: '#0d6efd' };
      default: return { bg: '#e2e3e5', color: '#383d41' };
    }
  };

  const typeStyle = getTypeColor(notification.notification_type);

  return (
    <div className="modal-overlay">
      <div className="notification-detail-modal">
        <div className="modal-header">
          <div>
            <h2>{t('notifications.notification_details', { defaultValue: 'Notification Details' })}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body"> 
          <div className="notification-header">
            <h3>{notification.title}</h3>
            <span className="notification-type-badge" style={typeStyle}>
              {getTypeIcon(notification.notification_type)}
              {t(`notifications.types.${notification.notification_type}`, { 
                defaultValue: notification.notification_type 
              })}
            </span>
          </div>

          <div className="notification-meta">
            <div className="meta-item">
              <UserCircle size={14} />
              <span className="meta-label">{t('notifications.from', { defaultValue: 'From' })}:</span>
              <span className="meta-value">{notification.sender_name || 'System'}</span>
            </div>
            <div className="meta-item">
              <Clock3 size={14} />
              <span className="meta-label">{t('notifications.sent', { defaultValue: 'Sent' })}:</span>
              <span className="meta-value">{formatDateTime(new Date(notification.created_at))}</span>
            </div>
            {notification.read_at && (
              <div className="meta-item">
                <CheckCircle size={14} />
                <span className="meta-label">{t('notifications.read', { defaultValue: 'Read' })}:</span>
                <span className="meta-value">{formatDateTime(new Date(notification.read_at))}</span>
              </div>
            )}
          </div>

          <div className="notification-description">
            <p>{notification.description}</p>
          </div>
        </div>

        <div className="modal-footer">
          {!notification.is_read && (
            <button className="btn-mark-read" onClick={handleMarkAsRead}>
              <CheckCircle size={16} />
              {t('notifications.mark_as_read', { defaultValue: 'Mark as Read' })}
            </button>
          )}
          <button className="btn-close" onClick={onClose}>
            {t('close', { defaultValue: 'Close' })}
          </button>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }

          .notification-detail-modal {
            background: white;
            border-radius: 24px;
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.3s ease;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .modal-header {
            padding: 24px 24px 16px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background: white;
            border-radius: 24px 24px 0 0;
            z-index: 10;
          }

          .modal-header h2 {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
          }

          .modal-close {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            border: none;
            background: #f1f5f9;
            color: #64748b;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }

          .modal-close:hover {
            background: #fee2e2;
            color: #dc2626;
          }

          .modal-body {
            padding: 24px;
          }

          .notification-header {
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e2e8f0;
          }

          .notification-header h3 {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 12px 0;
          }

          .notification-type-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
          }

          .notification-meta {
            background: #f8fafc;
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 20px;
          }

          .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-size: 13px;
          }

          .meta-item:last-child {
            margin-bottom: 0;
          }

          .meta-label {
            color: #64748b;
            min-width: 45px;
          }

          .meta-value {
            color: #0f172a;
            font-weight: 500;
          }

          .notification-description {
            padding: 16px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            min-height: 100px;
          }

          .notification-description p {
            font-size: 14px;
            line-height: 1.6;
            color: #334155;
            margin: 0;
            white-space: pre-wrap;
          }

          .modal-footer {
            padding: 20px 24px 24px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }

          .btn-mark-read {
            padding: 12px 24px;
            background: linear-gradient(135deg, #16a34a, #22c55e);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
          }

          .btn-mark-read:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(22, 163, 74, 0.3);
          }

          .btn-close {
            padding: 12px 24px;
            background: white;
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .btn-close:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
          }

          @media (max-width: 640px) {
            .modal-footer {
              flex-direction: column;
            }
            
            .btn-mark-read,
            .btn-close {
              width: 100%;
              justify-content: center;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

// Profile Modal Component
function ProfileModal({ isOpen, onClose, userData, onUpdate, t }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    location: ""
  });
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const modalRef = useRef(null);

  useEffect(() => {
    if (userData) {
      setFormData({
        full_name: userData.full_name || "",
        email: userData.email || "",
        phone_number: userData.phone_number || "",
        location: userData.location || ""
      });
    }
  }, [userData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  const validateProfileForm = () => {
    const newErrors = {};
    if (!formData.full_name.trim()) {
      newErrors.full_name = t("full_name_required");
    }
    if (formData.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = t("email_invalid");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    if (!passwordData.current_password) {
      newErrors.current_password = t("current_password_required");
    }
    if (!passwordData.new_password) {
      newErrors.new_password = t("new_password_required");
    } else if (passwordData.new_password.length < 8) {
      newErrors.new_password = t("pwd_too_short");
    } else if (!/[A-Z]/.test(passwordData.new_password)) {
      newErrors.new_password = t("pwd_no_upper");
    } else if (!/[a-z]/.test(passwordData.new_password)) {
      newErrors.new_password = t("pwd_no_lower");
    } else if (!/[0-9]/.test(passwordData.new_password)) {
      newErrors.new_password = t("pwd_no_digit");
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(passwordData.new_password)) {
      newErrors.new_password = t("pwd_no_special");
    }
    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = t("confirm_password_required");
    } else if (passwordData.new_password !== passwordData.confirmPassword) {
      newErrors.confirmPassword = t("passwords_do_not_match");
    }
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileUpdate = async () => {
    if (!validateProfileForm()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const lang = localStorage.getItem("language") || "en";
      const response = await fetch(`${BASE_URL}/profile/update/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Accept-Language": lang
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t("profile_update_failed"));
      }
      const updatedUser = { ...userData, ...formData };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success(data.message || t("profile_updated_success"));
      onUpdate(updatedUser);
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) return;
    setPasswordLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const lang = localStorage.getItem("language") || "en";
      const response = await fetch(`${BASE_URL}/profile/change-password/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Accept-Language": lang
        },
        body: JSON.stringify(passwordData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t("password_change_failed"));
      }
      toast.success(data.message || t("password_changed_success"));
      setPasswordData({
        current_password: "",
        new_password: "",
        confirmPassword: ""
      });
      setActiveTab("profile");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!isOpen) return null;

  const roleColors = {
    admin: { bg: "#fff8e1", color: "#f59e0b", border: "#fde68a" },
    farmer: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0" },
    buyer: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" }
  }[userData?.role] || { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" };

  return (
    <div className="modal-overlay">
      <div className="profile-modal" ref={modalRef}>
        <div className="modal-header">
          <div>
            <h2>{t("profile.my_profile")}</h2>
            <p>{t("profile.manage_your_account")}</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <UserCircle size={16} />
            {t("profile.profile_info")}
          </button>
          <button
            className={`tab-btn ${activeTab === "password" ? "active" : ""}`}
            onClick={() => setActiveTab("password")}
          >
            <Key size={16} />
            {t("profile.change_password")}
          </button>
        </div>

        <div className="modal-body">
          {activeTab === "profile" && (
            <div className="profile-tab">
              <div className="readonly-section">
                <h3>{t("profile.account_details")}</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">
                      <ShieldCheck size={14} />
                      {t("role")}:
                    </span>
                    <span className="role-badge" style={roleColors}>
                      {t(userData?.role)}
                    </span>
                  </div>
                  
                  <div className="info-item">
                    <span className="info-label">
                      <CheckCircle size={14} />
                      {t("status")}:
                    </span>
                    <span className={`status-badge ${userData?.status === "Active" ? "active" : "inactive"}`}>
                      {userData?.status === "Active" ? t("active") : t("inactive")}
                    </span>
                  </div>
                  
                  <div className="info-item">
                    <span className="info-label">
                      <Calendar size={14} />
                      {t("profile.member_since")}:
                    </span>
                    <span className="info-value">
                      {userData?.created_at ? formatDateTime(new Date(userData.created_at)) : "-"}
                    </span>
                  </div>
                  
                  <div className="info-item">
                    <span className="info-label">
                      <Clock size={14} />
                      {t("profile.last_updated")}:
                    </span>
                    <span className="info-value">
                      {userData?.updated_at ? formatDateTime(new Date(userData.updated_at)) : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="editable-section">
                <h3>{t("profile.edit_information")}</h3>
                
                <div className="form-group">
                  <label>
                    {t("full_name")} *
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.full_name ? "error" : ""}`}
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder={t("enter_full_name")}
                  />
                  {errors.full_name && (
                    <div className="error-message">
                      <AlertCircle size={12} />
                      {errors.full_name}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>{t("email")}</label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? "error" : ""}`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t("email_placeholder")}
                  />
                  {errors.email && (
                    <div className="error-message">
                      <AlertCircle size={12} />
                      {errors.email}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>{t("phone_number")}</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+250 7XX XXX XXX"
                  />
                </div>

                <div className="form-group">
                  <label>{t("location")}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder={t("enter_location")}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "password" && (
            <div className="password-tab">
              <div className="password-section">
                <h3>{t("profile.change_password")}</h3>
                <p className="password-hint">
                  {t("profile.password_requirements")}
                </p>

                <div className="form-group">
                  <label>{t("profile.current_password")} *</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword.current ? "text" : "password"}
                      className={`form-control ${passwordErrors.current_password ? "error" : ""}`}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      placeholder={t("profile.enter_current_password")}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                    >
                      {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.current_password && (
                    <div className="error-message">
                      <AlertCircle size={12} />
                      {passwordErrors.current_password}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>{t("profile.new_password")} *</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword.new ? "text" : "password"}
                      className={`form-control ${passwordErrors.new_password ? "error" : ""}`}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      placeholder={t("profile.enter_new_password")}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                    >
                      {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.new_password && (
                    <div className="error-message">
                      <AlertCircle size={12} />
                      {passwordErrors.new_password}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>{t("profile.confirm_new_password")} *</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword.confirm ? "text" : "password"}
                      className={`form-control ${passwordErrors.confirmPassword ? "error" : ""}`}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder={t("profile.confirm_new_password")}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    >
                      {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <div className="error-message">
                      <AlertCircle size={12} />
                      {passwordErrors.confirmPassword}
                    </div>
                  )}
                </div>

                <div className="password-requirements">
                  <p>{t("profile.password_must_contain")}:</p>
                  <ul>
                    <li className={passwordData.new_password.length >= 8 ? "met" : ""}>
                      {t("profile.at_least_8_chars")}
                    </li>
                    <li className={/[A-Z]/.test(passwordData.new_password) ? "met" : ""}>
                      {t("profile.one_uppercase")}
                    </li>
                    <li className={/[a-z]/.test(passwordData.new_password) ? "met" : ""}>
                      {t("profile.one_lowercase")}
                    </li>
                    <li className={/[0-9]/.test(passwordData.new_password) ? "met" : ""}>
                      {t("profile.one_number")}
                    </li>
                    <li className={/[!@#$%^&*(),.?":{}|<>]/.test(passwordData.new_password) ? "met" : ""}>
                      {t("profile.one_special")}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            {t("cancel")}
          </button>
          
          {activeTab === "profile" ? (
            <button
              className="btn-save"
              onClick={handleProfileUpdate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  {t("saving")}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {t("save_changes")}
                </>
              )}
            </button>
          ) : (
            <button
              className="btn-save"
              onClick={handlePasswordChange}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  {t("updating")}
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  {t("update_password")}
                </>
              )}
            </button>
          )}
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }

          .profile-modal {
            background: white;
            border-radius: 24px;
            width: 100%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.3s ease;
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .modal-header {
            padding: 24px 24px 16px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background: white;
            border-radius: 24px 24px 0 0;
            z-index: 10;
          }

          .modal-header h2 {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 4px;
          }

          .modal-header p {
            font-size: 14px;
            color: #64748b;
            margin: 0;
          }

          .modal-close {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            border: none;
            background: #f1f5f9;
            color: #64748b;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }

          .modal-close:hover {
            background: #fee2e2;
            color: #dc2626;
          }

          .modal-tabs {
            display: flex;
            gap: 8px;
            padding: 0 24px;
            border-bottom: 1px solid #e2e8f0;
          }

          .tab-btn {
            padding: 12px 16px;
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
          }

          .tab-btn:hover {
            color: #0f172a;
          }

          .tab-btn.active {
            color: #16a34a;
            border-bottom-color: #16a34a;
          }

          .modal-body {
            padding: 24px;
          }

          .readonly-section,
          .editable-section,
          .password-section {
            margin-bottom: 32px;
          }

          h3 {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 16px;
            padding-bottom: 8px;
            border-bottom: 1px dashed #e2e8f0;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            background: #f8fafc;
            padding: 16px;
            border-radius: 12px;
          }

          .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .info-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .info-value {
            font-size: 14px;
            font-weight: 500;
            color: #0f172a;
            margin-left: 20px;
          }

          .role-badge,
          .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 20px;
          }

          .status-badge.active {
            background: #ecfdf5;
            color: #16a34a;
            border: 1px solid #a7f3d0;
          }

          .status-badge.inactive {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-group label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 6px;
          }

          .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            font-size: 14px;
            transition: all 0.2s ease;
            font-family: inherit;
          }

          .form-control:focus {
            outline: none;
            border-color: #16a34a;
            box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
          }

          .form-control.error {
            border-color: #dc2626;
          }

          .password-input-wrapper {
            position: relative;
          }

          .password-input-wrapper .form-control {
            padding-right: 45px;
          }

          .password-toggle {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s ease;
          }

          .password-toggle:hover {
            color: #16a34a;
          }

          .error-message {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 6px;
            font-size: 12px;
            color: #dc2626;
          }

          .password-hint {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 20px;
            padding: 12px;
            background: #f8fafc;
            border-radius: 8px;
          }

          .password-requirements {
            margin-top: 20px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 12px;
          }

          .password-requirements p {
            font-size: 13px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 10px;
          }

          .password-requirements ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .password-requirements li {
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 6px;
            padding-left: 20px;
            position: relative;
          }

          .password-requirements li:before {
            content: "○";
            position: absolute;
            left: 0;
            color: #94a3b8;
          }

          .password-requirements li.met {
            color: #16a34a;
          }

          .password-requirements li.met:before {
            content: "✓";
            color: #16a34a;
          }

          .modal-footer {
            padding: 20px 24px 24px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }

          .btn-cancel,
          .btn-save {
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
            border: none;
            font-family: inherit;
          }

          .btn-cancel {
            background: white;
            border: 1.5px solid #e2e8f0;
            color: #64748b;
          }

          .btn-cancel:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
          }

          .btn-save {
            background: linear-gradient(135deg, #16a34a, #22c55e);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(22, 163, 74, 0.2);
          }

          .btn-save:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(22, 163, 74, 0.3);
          }

          .btn-save:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .spin {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          @media (max-width: 640px) {
            .modal-overlay {
              padding: 10px;
            }
            
            .profile-modal {
              max-height: 95vh;
            }
            
            .info-grid {
              grid-template-columns: 1fr;
            }
            
            .modal-footer {
              flex-direction: column;
            }
            
            .btn-cancel,
            .btn-save {
              width: 100%;
              justify-content: center;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default function FarmerLayout() {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notificationDetailOpen, setNotificationDetailOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  
  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [shouldConnect, setShouldConnect] = useState(true);
  
  const [activeLang, setActiveLang] = useState(() => {
    const savedLang = localStorage.getItem("language");
    if (savedLang) {
      const found = LANGUAGES.find(l => l.code === savedLang);
      if (found) return found;
    }
    return LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];
  });
  
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState({});

  const langRef = useRef(null);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const now = useDateTime();

  // ── Fetch notifications from API ────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/notifications/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept-Language": i18n.language
        }
      });
      
      if (!response.ok) throw new Error("Failed to fetch notifications");
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      
      // Count unread
      const unread = (data.notifications || []).filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch unread count ──────────────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await fetch(`${BASE_URL}/notifications/unread/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept-Language": i18n.language
        }
      });
      
      if (!response.ok) throw new Error("Failed to fetch unread count");
      
      const data = await response.json();
      const unread = (data.notifications || []).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

  // ── Mark notification as read ───────────────────────────────────────────
  const markAsRead = useCallback(async (notificationId) => {
    const token = localStorage.getItem("access_token");
    if (!token) return false;

    try {
      const response = await fetch(`${BASE_URL}/notifications/${notificationId}/mark-read/`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept-Language": i18n.language
        }
      });
      
      if (!response.ok) throw new Error("Failed to mark as read");
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, status: 'read', read_at: new Date().toISOString() }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return true;
    } catch (error) {
      console.error("Error marking as read:", error);
      return false;
    }
  }, []);

  // ── Mark all as read ────────────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await fetch(`${BASE_URL}/notifications/mark-all-read/`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept-Language": i18n.language
        }
      });
      
      if (!response.ok) throw new Error("Failed to mark all as read");
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, status: 'read', read_at: new Date().toISOString() }))
      );
      
      setUnreadCount(0);
      toast.success(t('notifications.all_marked_read', { defaultValue: 'All notifications marked as read' }));
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error(t('notifications.error_marking_all', { defaultValue: 'Failed to mark all as read' }));
    }
  }, [t]);

  // ── WebSocket connection ────────────────────────────────────────────────
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !shouldConnect) {
      console.log("No token or shouldConnect false, skipping WebSocket connection");
      return;
    }

    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, "Reconnecting");
    }

    const wsUrl = `${WS_URL}?token=${token}`;
    console.log("Connecting to WebSocket:", wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected successfully");
      setWsConnected(true);
      
      // Clear any reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Reset reconnect attempts on successful connection
      setReconnectAttempt(0);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);
        
        if (data.event === "new_notification") {
          // Add new notification to the list
          const newNotification = data.notification;
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => (prev || 0) + 1);
          
          // Show toast notification
          toast.info(
            <div onClick={() => handleNotificationClick(newNotification)} style={{ cursor: 'pointer' }}>
              <strong>{newNotification.title}</strong>
              <p style={{ fontSize: '12px', margin: '4px 0 0', color: '#666' }}>{newNotification.description}</p>
            </div>,
            {
              position: "top-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            }
          );
        } else if (data.event === "marked_read") {
          // Update read status
          setNotifications(prev => 
            prev.map(n => 
              n.id === data.notification_id 
                ? { ...n, is_read: true, status: 'read' }
                : n
            )
          );
          setUnreadCount(data.unread_count);
        } else if (data.event === "all_marked_read") {
          setNotifications(prev => 
            prev.map(n => ({ ...n, is_read: true, status: 'read' }))
          );
          setUnreadCount(0);
        } else if (data.event === "connected") {
          setUnreadCount(data.unread_count);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsConnected(false);
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      setWsConnected(false);
      
      // Attempt to reconnect after a delay (exponential backoff) only if we should still connect
      if (shouldConnect && event.code !== 1000 && event.code !== 1001) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
        console.log(`Scheduling reconnect in ${delay}ms... (attempt ${reconnectAttempt + 1})`);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempt(prev => prev + 1);
          connectWebSocket();
        }, delay);
      }
    };
  }, [reconnectAttempt, shouldConnect]);

  // ── Notification click handler ──────────────────────────────────────────
  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    setNotificationDetailOpen(true);
    setNotifOpen(false); // Close dropdown
  };

  // ── Handle mark as read from modal ──────────────────────────────────────
  const handleMarkAsReadFromModal = async (notificationId) => {
    const success = await markAsRead(notificationId);
    if (success && selectedNotification && selectedNotification.id === notificationId) {
      setSelectedNotification(prev => ({ ...prev, is_read: true }));
    }
  };

  // ── Initialize WebSocket and fetch data ─────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setShouldConnect(true);
      fetchNotifications();
      connectWebSocket();
    }
    
    return () => {
      setShouldConnect(false);
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // ── Load user data ──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(userData);
    } catch {
      setUser({});
    }
  }, []);

  // Handle language changes from i18n
  useEffect(() => {
    const savedLang = localStorage.getItem("language");
    if (savedLang && i18n.language !== savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, []);

  useEffect(() => {
    const handleLanguageChange = (lng) => {
      const matched = LANGUAGES.find(l => l.code === lng);
      if (matched) {
        setActiveLang(matched);
      }
    };

    handleLanguageChange(i18n.language);
    
    i18n.on("languageChanged", handleLanguageChange);
    return () => i18n.off("languageChanged", handleLanguageChange);
  }, []);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLangChange = (lang) => {
    i18n.changeLanguage(lang.code);
    localStorage.setItem("language", lang.code);
    setActiveLang(lang);
    setLangOpen(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const refresh = localStorage.getItem("refresh_token");
      const access = localStorage.getItem("access_token");
      if (refresh && access) {
        await fetch(`${BASE_URL}/logout/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${access}`,
            "Accept-Language": i18n.language
          },
          body: JSON.stringify({ refresh }),
        });
      }
    } catch (_) {
      // Silently fail
    }
    
    // Close WebSocket
    setShouldConnect(false);
    if (wsRef.current) {
      wsRef.current.close(1000, "Logout");
    }
    
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setLoggingOut(false);
    navigate("/");
  };

  const handleProfileUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const initials = getInitials(user.full_name || "User");
  const greeting = getGreeting(t);
  const firstName = (user.full_name || "User").split(" ")[0];

  // Nav items
  const navItems = [
    { icon: <LayoutDashboard size={17} />, label: t("nav.dashboard", { defaultValue: "Dashboard" }), path: "/farmer", end: true },
    { icon: <Handshake size={17} />, label: t("nav.marketMatches", { defaultValue: "Market Matches" }), path: "/admin/market-matches" },
    { icon: <Wheat size={17} />, label: t("nav.farmers", { defaultValue: "Farmers" }), path: "/farmer/farmers" },
    { icon: <Users size={17} />, label: t("nav.users", { defaultValue: "Users" }), path: "/farmer/users" },
    { icon: <BarChart2 size={17} />, label: t("nav.transactions", { defaultValue: "Transactions" }), path: "/farmer/transactions" },
    { icon: <ClipboardList size={17} />, label: t("nav.dataEntry", { defaultValue: "Data Entry" }), path: "/farmer/myStocks" },
    { icon: <FileText size={17} />, label: t("nav.contracts", { defaultValue: "Contracts" }), path: "/farmer/contracts" },
  ];

  // Profile actions for sidebar
  const profileActions = [
    { 
      icon: <UserCircle size={17} />, 
      label: t("nav.myProfile", { defaultValue: "My Profile" }), 
      action: "profile" 
    },
    { 
      icon: <Settings size={17} />, 
      label: t("nav.settings", { defaultValue: "Settings" }), 
      action: "settings" 
    },
  ];

  const roleBadgeColor = {
    admin: { bg: "#fff8e1", color: "#f59e0b", border: "#fde68a" },
    farmer: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0" },
    buyer: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
  }[user.role] || { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" };

  return (
    <>
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div style={{ display: "flex", minHeight: "100vh", background: "#f0f2f5" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'DM Sans', sans-serif; }

          /* SIDEBAR */
          .sidebar { width:260px; min-height:100vh; background:#0f2718; display:flex; flex-direction:column; position:fixed; top:0; left:0; bottom:0; z-index:50; transition:transform 0.3s cubic-bezier(0.4,0,0.2,1); box-shadow:4px 0 24px rgba(0,0,0,0.18); }
          .sidebar-brand { padding:24px 20px 20px; border-bottom:1px solid rgba(255,255,255,0.07); display:flex; align-items:center; gap:12px; }
          .brand-icon { width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg,#f7be15,#f59e0b); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 12px rgba(247,190,21,0.4); }
          .brand-text h2 { font-size:16px; font-weight:700; color:#fff; letter-spacing:0.4px; }
          .brand-text p  { font-size:11px; color:rgba(255,255,255,0.4); margin-top:2px; letter-spacing:0.3px; }
          .sidebar-nav { flex:1; padding:16px 12px; overflow-y:auto; }
          .sidebar-nav::-webkit-scrollbar { width:4px; }
          .sidebar-nav::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }
          .nav-section-label { font-size:10px; font-weight:600; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:1px; padding:12px 12px 6px; }
          .sidebar-nav ul { list-style:none; display:flex; flex-direction:column; gap:2px; }
          .sidebar-nav a { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:10px; font-size:13px; font-weight:500; color:rgba(255,255,255,0.55); text-decoration:none; transition:all 0.18s; }
          .sidebar-nav a:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.88); }
          .sidebar-nav a.active { background:linear-gradient(135deg,#f7be15,#f59e0b); color:#0f2718; font-weight:700; box-shadow:0 3px 12px rgba(247,190,21,0.35); }
          
          .profile-actions-sidebar { margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); }
          .profile-action-sidebar { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:10px; width:100%; background:none; border:none; color:rgba(255,255,255,0.55); font-size:13px; font-weight:500; cursor:pointer; transition:all 0.18s; font-family:'DM Sans',sans-serif; text-align:left; }
          .profile-action-sidebar:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.88); }
          
          .sidebar-footer { padding:16px 12px; border-top:1px solid rgba(255,255,255,0.06); }
          .logout-btn { width:100%; display:flex; align-items:center; justify-content:center; gap:10px; padding:12px 16px; border-radius:50px; border:1.5px solid rgba(255,255,255,0.1); background:transparent; color:rgba(255,255,255,0.6); font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif; letter-spacing:0.2px; }
          .logout-btn:hover:not(:disabled) { background:#f7be15; color:#0f2718; border-color:#f7be15; }
          .logout-btn:disabled { opacity:0.6; cursor:not-allowed; }
          .spin { animation:spin 1s linear infinite; }
          @keyframes spin { to { transform:rotate(360deg); } }

          .sidebar-overlay { display:none; position:fixed; inset:0; z-index:40; background:rgba(0,0,0,0.5); backdrop-filter:blur(2px); }
          .sidebar-overlay.show { display:block; }

          .main-area { margin-left:260px; flex:1; display:flex; flex-direction:column; min-width:0; }

          .topbar { 
            height:68px; 
            background:#fff; 
            border-bottom:1px solid #eaecef; 
            display:flex; 
            align-items:center; 
            justify-content:space-between; 
            padding:0 20px; 
            position:sticky; 
            top:0; 
            z-index:30; 
            gap:12px; 
            box-shadow:0 1px 8px rgba(0,0,0,0.05);
            width:100%;
          }
          .topbar-left { 
            display:flex; 
            align-items:center; 
            gap:12px; 
            min-width:0;
            flex:1;
          }
          .hamburger-btn { 
            display:none; 
            width:40px; 
            height:40px; 
            border-radius:10px; 
            background:#f4f6f8; 
            border:none; 
            cursor:pointer; 
            align-items:center; 
            justify-content:center; 
            flex-shrink:0; 
            transition:background 0.2s; 
          }
          .hamburger-btn:hover { background:#e6f4ea; }
          .topbar-greeting-block { 
            display:flex; 
            flex-direction:column; 
            gap:2px; 
            min-width:0;
            flex:1;
          }
          .topbar-greeting { 
            font-size:15px; 
            font-weight:700; 
            color:#0f2718; 
            white-space:nowrap; 
            overflow:hidden; 
            text-overflow:ellipsis; 
          }
          .topbar-greeting span { color:#f59e0b; }
          .topbar-datetime { 
            font-size:11px; 
            color:#94a3b8; 
            font-weight:500; 
            letter-spacing:0.2px; 
            display:flex; 
            align-items:center; 
            gap:8px; 
          }
          .datetime-sep { width:3px; height:3px; border-radius:50%; background:#cbd5e1; }
          .topbar-right { 
            display:flex; 
            align-items:center; 
            gap:6px; 
            flex-shrink:0;
          }

          .icon-btn { 
            position:relative; 
            width:38px; 
            height:38px; 
            border-radius:10px; 
            background:#f4f6f8; 
            border:none; 
            cursor:pointer; 
            display:flex; 
            align-items:center; 
            justify-content:center; 
            transition:all 0.2s; 
            color:#5a6472; 
            flex-shrink:0;
          }
          .icon-btn:hover { background:#e6f4ea; color:#0f2718; }
          .icon-btn.active { background:#e6f4ea; color:#0f2718; }
          .badge-dot { position:absolute; top:7px; right:7px; width:8px; height:8px; border-radius:50%; background:#ef4444; border:2px solid #fff; }
          .badge-count { position:absolute; top:4px; right:4px; background:#ef4444; color:#fff; font-size:9px; font-weight:700; border-radius:20px; padding:1px 4px; border:1.5px solid #fff; min-width:16px; text-align:center; line-height:1.4; }
          .topbar-divider { width:1px; height:28px; background:#eaecef; margin:0 4px; }

          .dropdown-wrap { position:relative; }
          .dropdown-menu { position:absolute; top:calc(100% + 10px); right:0; background:#fff; border-radius:14px; box-shadow:0 8px 40px rgba(0,0,0,0.13),0 2px 8px rgba(0,0,0,0.07); border:1px solid #eaecef; opacity:0; transform:translateY(-8px) scale(0.97); pointer-events:none; transition:all 0.18s cubic-bezier(0.4,0,0.2,1); z-index:100; overflow:hidden; }
          .dropdown-menu.open { opacity:1; transform:translateY(0) scale(1); pointer-events:all; }

          /* Notification Dropdown - Enhanced */
          .notif-menu { width:360px; max-width:90vw; max-height:480px; display:flex; flex-direction:column; }
          .notif-header { padding:14px 16px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #f1f5f9; }
          .notif-header h4 { font-size:14px; font-weight:700; color:#0f2718; display:flex; align-items:center; gap:8px; }
          .notif-mark-read { font-size:12px; color:#16a34a; font-weight:600; cursor:pointer; background:none; border:none; padding:4px 8px; border-radius:6px; transition:background 0.2s; }
          .notif-mark-read:hover { background:#f0fdf4; }
          .notif-mark-read:disabled { opacity:0.5; cursor:not-allowed; }
          
          .notif-list { flex:1; overflow-y:auto; max-height:360px; }
          .notif-item { padding:12px 16px; display:flex; gap:12px; align-items:flex-start; transition:background 0.15s; cursor:pointer; border-bottom:1px solid #f8fafc; }
          .notif-item:hover { background:#f8fafc; }
          .notif-item.unread { background:#f0fdf4; }
          
          .notif-icon-wrap { 
            width:40px; 
            height:40px; 
            border-radius:10px; 
            flex-shrink:0; 
            display:flex; 
            align-items:center; 
            justify-content:center;
            background: #f1f5f9;
          }
          
          .notif-content { flex:1; min-width:0; }
          .notif-title { 
            font-size:13px; 
            font-weight:600; 
            color:#0f172a; 
            margin-bottom:4px;
            display:flex;
            align-items:center;
            gap:6px;
          }
          .notif-title span {
            background: #16a34a;
            color: white;
            font-size: 9px;
            padding: 2px 6px;
            border-radius: 12px;
            font-weight: 600;
          }
          .notif-description { 
            font-size:12px; 
            color:#64748b; 
            margin-bottom:6px;
            line-height:1.4;
            display:-webkit-box;
            -webkit-line-clamp:2;
            -webkit-box-orient:vertical;
            overflow:hidden;
          }
          .notif-meta { 
            display:flex; 
            align-items:center; 
            gap:8px; 
            font-size:11px; 
            color:#94a3b8;
          }
          .notif-meta-item {
            display:flex;
            align-items:center;
            gap:4px;
          }
          .notif-type-badge {
            padding:2px 8px;
            border-radius:12px;
            font-size:9px;
            font-weight:600;
            text-transform:capitalize;
          }
          .notif-footer { 
            padding:12px 16px; 
            text-align:center; 
            border-top:1px solid #f1f5f9;
            background: #fafbfc;
          }
          .notif-footer-link { 
            font-size:13px; 
            color:#16a34a; 
            font-weight:600; 
            cursor:pointer;
            text-decoration:none;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:4px;
            transition:gap 0.2s;
          }
          .notif-footer-link:hover {
            gap:8px;
          }
          .notif-empty {
            padding:40px 20px;
            text-align:center;
            color:#94a3b8;
          }
          .notif-empty svg {
            margin-bottom:12px;
            color:#cbd5e1;
          }
          .notif-empty p {
            font-size:13px;
          }

          /* Connection status indicator */
          .connection-status {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            padding: 8px 16px;
            border-radius: 30px;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            pointer-events: none;
          }
          .connection-status.connected {
            background: #ecfdf5;
            color: #16a34a;
            border: 1px solid #a7f3d0;
          }
          .connection-status.disconnected {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
          }
          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
          .status-dot.connected { background: #16a34a; }
          .status-dot.disconnected { background: #dc2626; }

          .lang-trigger { 
            display:flex; 
            align-items:center; 
            gap:6px; 
            background:#f4f6f8; 
            border:none; 
            border-radius:10px; 
            padding:7px 11px; 
            cursor:pointer; 
            font-size:12.5px; 
            font-weight:600; 
            color:#3d4a5c; 
            transition:all 0.2s; 
            font-family:'DM Sans',sans-serif; 
            white-space:nowrap; 
            flex-shrink:0;
          }
          .lang-trigger:hover { background:#e6f4ea; }
          .lang-trigger.active { background:#e6f4ea; }
          .lang-chevron { transition:transform 0.2s; color:#94a3b8; }
          .lang-chevron.up { transform:rotate(180deg); }
          .lang-menu { width:188px; padding:6px; }
          .lang-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:#3d4a5c; transition:background 0.15s; }
          .lang-item:hover { background:#f0fdf4; }
          .lang-item.selected { background:#f0fdf4; color:#16a34a; font-weight:600; }
          .lang-item-flag { font-size:16px; }
          .lang-item-check { margin-left:auto; color:#16a34a; }

          .profile-trigger { 
            display:flex; 
            align-items:center; 
            gap:8px; 
            background:#f4f6f8; 
            border:none; 
            border-radius:10px; 
            padding:5px 8px 5px 5px; 
            cursor:pointer; 
            transition:all 0.2s; 
            font-family:'DM Sans',sans-serif; 
            flex-shrink:0;
          }
          .profile-trigger:hover { background:#e6f4ea; }
          .profile-trigger.active { background:#e6f4ea; }
          .profile-avatar { width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg,#1a3d2b,#2e7d32); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; flex-shrink:0; letter-spacing:0.5px; }
          .profile-trigger-name { 
            font-size:13px; 
            font-weight:600; 
            color:#1e293b; 
            max-width:120px; 
            overflow:hidden; 
            text-overflow:ellipsis; 
            white-space:nowrap; 
          }
          .profile-menu { width:280px; max-width:90vw; }
          .profile-header { padding:16px; background:linear-gradient(135deg,#0f2718,#1a3d2b); display:flex; align-items:center; gap:12px; }
          .profile-avatar-lg { width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg,#f7be15,#f59e0b); display:flex; align-items:center; justify-content:center; font-size:17px; font-weight:800; color:#0f2718; flex-shrink:0; box-shadow:0 4px 12px rgba(247,190,21,0.4); }
          .profile-header-info { min-width:0; }
          .profile-header-name { font-size:14px; font-weight:700; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
          .profile-role-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:20px; font-size:10.5px; font-weight:700; margin-top:4px; text-transform:capitalize; }
          .profile-info-grid { padding:12px 14px; display:flex; flex-direction:column; gap:8px; }
          .profile-info-row { display:flex; align-items:center; gap:9px; font-size:12px; color:#4b5563; }
          .profile-info-icon { color:#9ca3af; flex-shrink:0; }
          .profile-info-label { color:#9ca3af; font-size:10.5px; font-weight:600; min-width:52px; }
          .profile-info-val { font-weight:600; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
          .profile-divider { height:1px; background:#f1f5f9; margin:0 14px; }
          .profile-actions { padding:8px; }
          .profile-action-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:#374151; transition:background 0.15s; border:none; background:none; width:100%; font-family:'DM Sans',sans-serif; text-align:left; }
          .profile-action-item:hover { background:#f0fdf4; color:#0f2718; }
          .profile-action-item.danger:hover { background:#fef2f2; color:#dc2626; }
          .profile-action-item .action-icon { color:#6b7280; }
          .profile-action-item:hover .action-icon { color:inherit; }
          .profile-action-item.danger .action-icon { color:#ef4444; }

          .page-content { flex:1; padding:28px; overflow-y:auto; }

          @media (max-width: 1024px) {
            .profile-trigger-name { max-width:80px; }
            .lang-trigger span:nth-child(3) { display:none; }
          }

          @media (max-width: 900px) {
            .sidebar { transform:translateX(-100%); width:280px; }
            .sidebar.mobile-open { transform:translateX(0); }
            .main-area { margin-left:0; }
            .hamburger-btn { display:flex; }
            .topbar { padding:0 16px; }
            .page-content { padding:20px; }
            .profile-trigger-name { display:none; }
            .lang-trigger span:nth-child(3) { display:none; }
            .lang-trigger span:nth-child(2) { display:inline-block; }
            .topbar-divider { display:none; }
          }

          @media (max-width: 640px) {
            .topbar-datetime { display:none; }
            .topbar { padding:0 12px; }
            .topbar-greeting { font-size:14px; }
            .icon-btn { width:36px; height:36px; }
            .lang-trigger { padding:7px 8px; }
            .profile-trigger { padding:4px 6px 4px 4px; }
          }

          @media (max-width: 480px) {
            .topbar-greeting { font-size:13px; }
            .icon-btn:first-of-type { display:none; }
          }
        `}</style>

        {/* Connection status indicator */}
        {!wsConnected && (
          <div className="connection-status disconnected">
            <span className="status-dot disconnected" />
            {t('notifications.reconnecting', { defaultValue: 'Reconnecting...' })}
          </div>
        )}

        {/* Overlay */}
        <div className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
          <div className="sidebar-brand">
            <div className="brand-icon">
              <Home size={20} color="#0f2718" />
            </div>
            <div className="brand-text">
              <h2>FMMROP</h2>
              <p>{t("app.adminPortal", { defaultValue: "Admin Portal" })}</p>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">{t("nav.mainMenu", { defaultValue: "Main Menu" })}</div>
            <ul>
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.end || false}
                    className={({ isActive }) => isActive ? "active" : ""}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="profile-actions-sidebar">
              <div className="nav-section-label">{t("nav.account", { defaultValue: "Account" })}</div>
              {profileActions.map((action, index) => (
                <button
                  key={index}
                  className="profile-action-sidebar"
                  onClick={() => {
                    setSidebarOpen(false);
                    setProfileModalOpen(true);
                  }}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="sidebar-footer">
            <button className="logout-btn" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? <Loader2 size={15} className="spin" /> : <LogOut size={15} />}
              {loggingOut
                ? t("auth.signingOut.signingOut", { defaultValue: "Signing out…" })
                : t("auth.logout.button", { defaultValue: "Logout" })
              }
            </button>
          </div>
        </aside>

        {/* Main Area */}
        <div className="main-area">
          {/* Topbar */}
          <header className="topbar">
            <div className="topbar-left">
              <button className="hamburger-btn" onClick={() => setSidebarOpen(v => !v)}>
                {sidebarOpen ? <X size={18} color="#333" /> : <Menu size={18} color="#333" />}
              </button>

              <div className="topbar-greeting-block">
                <div className="topbar-greeting">
                  {greeting}, <span>{firstName}</span> 👋
                </div>
                <div className="topbar-datetime">
                  <span>{formatDate(now)}</span>
                  <span className="datetime-sep" />
                  <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#64748b" }}>
                    {formatClock(now)}
                  </span>
                </div>
              </div>
            </div>

            <div className="topbar-right">
              {/* Messages */}
              <button className="icon-btn" title={t("topbar.messages", { defaultValue: "Messages" })}>
                <MessageSquare size={17} />
                <span className="badge-count">3</span>
              </button>

              {/* Notifications */}
              <div className="dropdown-wrap" ref={notifRef}>
                <button
                  className={`icon-btn ${notifOpen ? "active" : ""}`}
                  onClick={() => { 
                    setNotifOpen(v => !v); 
                    setLangOpen(false); 
                    setProfileOpen(false);
                    if (!notifOpen) {
                      fetchNotifications(); // Refresh when opening
                    }
                  }}
                  title={t("topbar.notifications", { defaultValue: "Notifications" })}
                >
                  <Bell size={17} />
                  {unreadCount > 0 && (
                    <span className="badge-count">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                
                <div className={`dropdown-menu notif-menu ${notifOpen ? "open" : ""}`}>
                  <div className="notif-header">
                    <h4>
                      <Bell size={16} />
                      {t('topbar.notifications', { defaultValue: 'Notifications' })}
                      {unreadCount > 0 && (
                        <span style={{
                          background: '#16a34a',
                          color: 'white',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          marginLeft: '8px'
                        }}>
                          {unreadCount} {t('notifications.unread', { defaultValue: 'unread' })}
                        </span>
                      )}
                    </h4>
                    {unreadCount > 0 && (
                      <button 
                        className="notif-mark-read" 
                        onClick={markAllAsRead}
                        disabled={loading}
                      >
                        {loading ? <Loader2 size={12} className="spin" /> : t('topbar.markAllRead', { defaultValue: 'Mark all read' })}
                      </button>
                    )}
                  </div>
                  
                  <div className="notif-list">
                    {loading && notifications.length === 0 ? (
                      <div className="notif-empty">
                        <Loader2 size={24} className="spin" />
                        <p>{t('notifications.loading', { defaultValue: 'Loading notifications...' })}</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="notif-empty">
                        <BellOff size={32} />
                        <p>{t('notifications.no_notifications', { defaultValue: 'No notifications yet' })}</p>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`notif-item ${!notification.is_read ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="notif-icon-wrap">
                            {notification.notification_type === 'system' && <ShieldCheck size={18} color="#9333ea" />}
                            {notification.notification_type === 'broadcast' && <BellRing size={18} color="#856404" />}
                            {notification.notification_type === 'direct' && <User size={18} color="#0d6efd" />}
                          </div>
                          
                          <div className="notif-content">
                            <div className="notif-title">
                              {notification.title}
                              {!notification.is_read && <span>NEW</span>}
                            </div>
                            <div className="notif-description">
                              {notification.description}
                            </div>
                            <div className="notif-meta">
                              <span className="notif-meta-item">
                                <Clock3 size={10} />
                                {formatRelativeTime(notification.created_at, t)}
                              </span>
                              <span className="notif-type-badge" style={{
                                background: notification.notification_type === 'system' ? '#f3e8ff' :
                                           notification.notification_type === 'broadcast' ? '#fff3cd' : '#d1e7ff',
                                color: notification.notification_type === 'system' ? '#9333ea' :
                                      notification.notification_type === 'broadcast' ? '#856404' : '#0d6efd'
                              }}>
                                {t(`notifications.types.${notification.notification_type}`, { 
                                  defaultValue: notification.notification_type 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="notif-footer">
                    <a 
                      className="notif-footer-link"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/admin/notifications');
                      }}
                    >
                      {t('topbar.viewAllNotifications', { defaultValue: 'View all notifications' })}
                      <ChevronRight size={14} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="topbar-divider" />

              {/* Language switcher */}
              <div className="dropdown-wrap" ref={langRef}>
                <button
                  className={`lang-trigger ${langOpen ? "active" : ""}`}
                  onClick={() => { setLangOpen(v => !v); setProfileOpen(false); setNotifOpen(false); }}
                  aria-label="Switch language"
                >
                  <Globe size={13} strokeWidth={2} />
                  <span>{activeLang.flag}</span>
                  <span>{activeLang.code.toUpperCase()}</span>
                  <ChevronDown size={12} className={`lang-chevron ${langOpen ? "up" : ""}`} />
                </button>
                <div className={`dropdown-menu lang-menu ${langOpen ? "open" : ""}`}>
                  {LANGUAGES.map(lang => (
                    <div
                      key={lang.code}
                      className={`lang-item ${activeLang.code === lang.code ? "selected" : ""}`}
                      onClick={() => handleLangChange(lang)}
                    >
                      <span className="lang-item-flag">{lang.flag}</span>
                      <span>{lang.label}</span>
                      {activeLang.code === lang.code && (
                        <svg className="lang-item-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Profile */}
              <div className="dropdown-wrap" ref={profileRef}>
                <button
                  className={`profile-trigger ${profileOpen ? "active" : ""}`}
                  onClick={() => { setProfileOpen(v => !v); setLangOpen(false); setNotifOpen(false); }}
                >
                  <div className="profile-avatar">{initials || "U"}</div>
                  <span className="profile-trigger-name">{firstName}</span>
                  <ChevronDown size={12} style={{ color: "#94a3b8", transition: "transform 0.2s", transform: profileOpen ? "rotate(180deg)" : "rotate(0)" }} />
                </button>

                <div className={`dropdown-menu profile-menu ${profileOpen ? "open" : ""}`}>
                  {/* Header */}
                  <div className="profile-header">
                    <div className="profile-avatar-lg">{initials || "U"}</div>
                    <div className="profile-header-info">
                      <div className="profile-header-name">{user.full_name || "Unknown User"}</div>
                      <div
                        className="profile-role-badge"
                        style={{ background: roleBadgeColor.bg, color: roleBadgeColor.color, border: `1px solid ${roleBadgeColor.border}` }}
                      >
                        <ShieldCheck size={10} />
                        {user.role || "user"}
                      </div>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="profile-info-grid">
                    {user.email && (
                      <div className="profile-info-row">
                        <Mail size={13} className="profile-info-icon" />
                        <span className="profile-info-label">{t("profile.email", { defaultValue: "Email" })}</span>
                        <span className="profile-info-val">{user.email}</span>
                      </div>
                    )}
                    {user.phone_number && (
                      <div className="profile-info-row">
                        <Phone size={13} className="profile-info-icon" />
                        <span className="profile-info-label">{t("profile.phone", { defaultValue: "Phone" })}</span>
                        <span className="profile-info-val">{user.phone_number}</span>
                      </div>
                    )}
                    {user.location && (
                      <div className="profile-info-row">
                        <MapPin size={13} className="profile-info-icon" />
                        <span className="profile-info-label">{t("profile.location", { defaultValue: "Location" })}</span>
                        <span className="profile-info-val">{user.location}</span>
                      </div>
                    )}
                    <div className="profile-info-row">
                      <ShieldCheck size={13} className="profile-info-icon" />
                      <span className="profile-info-label">{t("profile.status", { defaultValue: "Status" })}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: user.status === "Active" ? "#f0fdf4" : "#fef2f2",
                        color: user.status === "Active" ? "#16a34a" : "#dc2626",
                      }}>
                        {user.status === "Active"
                          ? t("profile.active", { defaultValue: "Active" })
                          : t("profile.pending", { defaultValue: "Pending" })
                        }
                      </span>
                    </div>
                  </div>

                  <div className="profile-divider" />

                  {/* Actions */}
                  <div className="profile-actions">
                    <button
                      className="profile-action-item"
                      onClick={() => {
                        setProfileOpen(false);
                        setProfileModalOpen(true);
                      }}
                    >
                      <UserCircle size={15} className="action-icon" />
                      <Edit3 size={15} className="action-icon" style={{ marginLeft: "-4px", marginRight: "-4px" }} />
                      {t("profile.edit_profile", { defaultValue: "Edit Profile" })}
                    </button>
                    <button className="profile-action-item" onClick={() => { navigate("/admin/messages"); setProfileOpen(false); }}>
                      <MessageSquare size={15} className="action-icon" />
                      {t("topbar.messages", { defaultValue: "Messages" })}
                      <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 6px" }}>3</span>
                    </button>
                    <button 
                      className="profile-action-item" 
                      onClick={() => { 
                        setProfileOpen(false);
                        setNotifOpen(true);
                      }}
                    >
                      <Bell size={15} className="action-icon" />
                      {t("topbar.notifications", { defaultValue: "Notifications" })}
                      {unreadCount > 0 && (
                        <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 6px" }}>
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    <button className="profile-action-item" onClick={() => { setProfileOpen(false); setProfileModalOpen(true); }}>
                      <Settings size={15} className="action-icon" />
                      {t("nav.settings", { defaultValue: "Settings" })}
                    </button>

                    <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />

                    <button className="profile-action-item danger" onClick={handleLogout} disabled={loggingOut}>
                      {loggingOut ? <Loader2 size={15} className="spin action-icon" /> : <LogOut size={15} className="action-icon" />}
                      {loggingOut
                        ? t("auth.signingOut.signingOut", { defaultValue: "Signing out…" })
                        : t("auth.logout.button", { defaultValue: "Logout" })
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="page-content">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userData={user}
        onUpdate={handleProfileUpdate}
        t={t}
      />

      {/* Notification Detail Modal */}
      <NotificationDetailModal
        isOpen={notificationDetailOpen}
        onClose={() => setNotificationDetailOpen(false)}
        notification={selectedNotification}
        onMarkAsRead={handleMarkAsReadFromModal}
        t={t}
      />
    </>
  );
}