/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Search, X, MapPin, Package, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, SlidersHorizontal,
  MessageCircle, FileSignature, Eye, Grid3X3, List,
  ChevronDown, ChevronUp, Leaf, Award,
  Clock, Wheat, Info, DollarSign, Weight, Tag,
  Sprout, Globe, User, CheckCircle2, AlertCircle, RefreshCw,
  Loader2, Truck, Handshake, Edit2, Phone, Mail, ShieldCheck, Calendar, FileText
} from "lucide-react";
import locationData from "../../common/locationData.json";

// ─── Config ───────────────────────────────────────────────────────────────────
const PUBLIC_API = "http://127.0.0.1:8000/stock/public/";
const API_BASE_URL = "http://127.0.0.1:8000";

const QUALITY = {
  A: { labelKey: "quality_premium", color: "#14532d", bg: "#dcfce7", dot: "#16a34a", icon: "✦" },
  B: { labelKey: "quality_standard", color: "#1e3a5f", bg: "#dbeafe", dot: "#2563eb", icon: "◆" },
  C: { labelKey: "quality_economy", color: "#713f12", bg: "#fef9c3", dot: "#ca8a04", icon: "◇" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) { return Number(n).toLocaleString(); }
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

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

// WITH this complete version (has the full JSX return):
function LocationSelectorStrict({ onValidChange, error, t, initialLocation = "" }) {
  const parseInitial = (loc) => {
    if (!loc) return { province: "", district: "", sector: "" };
    const parts = loc.split(",").map(p => p.trim());
    return {
      province: parts[0] || "",
      district: parts[1] || "",
      sector: parts[2] || "",
    };
  };

  const initial = parseInitial(initialLocation);
  const [province, setProvince] = useState(initial.province);
  const [district, setDistrict] = useState(initial.district);
  const [sector, setSector] = useState(initial.sector);

  // If all three parts are already filled on mount, notify parent immediately
  // so the badge shows without the user having to re-select anything
  useEffect(() => {
    if (initial.province && initial.district && initial.sector) {
      onValidChange(`${initial.province}, ${initial.district}, ${initial.sector}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provinces = locationData.provinces.map(p => ({
    value: p.city || p.province,
    label: p.city || p.province,
  }));

  const districts = province
    ? (locationData.provinces
      .find(p => (p.city || p.province) === province)
      ?.coordinates?.districts || [])
    : [];

  const sectors = district
    ? (districts.find(d => d.name === district)?.sectors || [])
    : [];

  const handleProvinceChange = val => {
    setProvince(val);
    setDistrict("");
    setSector("");
  };

  const handleDistrictChange = val => {
    setDistrict(val);
    setSector("");
  };

  const handleSectorChange = val => {
    setSector(val);
    if (province && district && val) {
      onValidChange(`${province}, ${district}, ${val}`);
    }
  };

  const stepHint = !province
    ? (t("step_1_select_province") || "Step 1 of 3 — Select a province")
    : !district
      ? (t("step_2_select_district") || "Step 2 of 3 — Select a district")
      : !sector
        ? (t("step_3_select_sector") || "Step 3 of 3 — Select a sector to confirm")
        : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

      {/* Province */}
      <select
        className={`form-input${error && !province ? " error" : ""}`}
        value={province}
        onChange={e => handleProvinceChange(e.target.value)}
      >
        <option value="">{t("select_province") || "— Select Province —"}</option>
        {provinces.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* District — visible only after province chosen */}
      {province && (
        <select
          className={`form-input${error && !district ? " error" : ""}`}
          value={district}
          onChange={e => handleDistrictChange(e.target.value)}
        >
          <option value="">{t("select_district") || "— Select District —"}</option>
          {districts.map(d => (
            <option key={d.name} value={d.name}>{d.name}</option>
          ))}
        </select>
      )}

      {/* Sector — visible only after district chosen */}
      {district && (
        <select
          className={`form-input${error && !sector ? " error" : ""}`}
          value={sector}
          onChange={e => handleSectorChange(e.target.value)}
        >
          <option value="">{t("select_sector") || "— Select Sector —"}</option>
          {sectors.map(s => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
      )}

      {/* Step hint — disappears once all three are chosen */}
      {stepHint && (
        <small style={{
          display: "flex", alignItems: "center", gap: "5px",
          fontSize: "12px", color: "#b76e0a",
        }}>
          <Info size={11} />
          {stepHint}
        </small>
      )}

      {/* Confirmation — all three chosen */}
      {province && district && sector && (
        <small style={{
          display: "flex", alignItems: "center", gap: "5px",
          fontSize: "12px", color: "#2e7d32",
        }}>
          <CheckCircle size={11} />
          {t("location_confirmed") || "Location confirmed — you can now submit."}
        </small>
      )}
    </div>
  );
}

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

// ─── Contract Form Modal for Stock ────────────────────────────────────────────
// ─── Contract Form Modal for Stock (Professional Design) ─────────────────────
function StockContractModal({ isOpen, onClose, onSubmit, stock, apiClient }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    quantity_kg: "",
    delivery_location: "",
    delivery_date: "",
    payment_option: "full",
    payment_due_date: "",
    notes: "",
    delivery_type: "self"
  });
  const [totalAmount, setTotalAmount] = useState(0);
  const [locationError, setLocationError] = useState("");
  const [showLocationSelector, setShowLocationSelector] = useState(true);
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [activeStep, setActiveStep] = useState(1);

  // Get current user info
  const currentUser = useMemo(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return {};
      }
    }
    return {};
  }, []);

  useEffect(() => {
    if (isOpen && stock) {
      // Reset form
      setFormData({
        quantity_kg: "",
        delivery_location: "",
        delivery_date: "",
        payment_option: "full",
        payment_due_date: "",
        notes: "",
        delivery_type: "self"
      });
      setTotalAmount(0);
      setLocationError("");
      setShowLocationSelector(true);
      setDeliveryLocation("");
      setActiveStep(1);
    }
  }, [isOpen, stock]);

  // Calculate total amount
  useEffect(() => {
    const qty = parseFloat(formData.quantity_kg) || 0;
    const price = stock?.price_per_kg || 0;
    setTotalAmount(qty * price);
  }, [formData.quantity_kg, stock]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleValidLocationChange = (locationString) => {
    setDeliveryLocation(locationString);
    setFormData(prev => ({ ...prev, delivery_location: locationString }));
    setLocationError("");
    setShowLocationSelector(false);
  };

  // Inside StockContractModal component - update handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!formData.quantity_kg || parseFloat(formData.quantity_kg) <= 0) {
      toast.error(t('quantity_required') || "Please enter a valid quantity");
      return;
    }

    if (parseFloat(formData.quantity_kg) > (stock?.quantity || 0)) {
      toast.error(t('quantity_exceeds_available', { available: stock?.quantity }) ||
        `Quantity exceeds available stock (${stock?.quantity} kg)`);
      return;
    }

    if (!formData.delivery_location) {
      toast.error(t('delivery_location_required') || "Please select a delivery location");
      return;
    }

    if (formData.payment_option === "partial" && !formData.payment_due_date) {
      toast.error(t('payment_due_date_required') || "Please select a payment due date");
      return;
    }

    const submitData = {
      stock: stock.id,
      crop_name: stock.product_name,
      price_per_kg: parseFloat(stock.price_per_kg),
      quantity_kg: parseFloat(formData.quantity_kg),
      farmer: stock.farmer?.id || stock.farmer_id,
      buyer: currentUser.id,
      deliver: currentUser.id,
      delivery_location: formData.delivery_location,
      delivery_date: formData.delivery_date || null,
      payment_option: formData.payment_option,
      payment_due_date: formData.payment_due_date || null,
      notes: formData.notes || "",
    };

    console.log("📝 Submitting contract from stock:", submitData);

    setLoading(true);
    try {
      const response = await onSubmit(submitData);
      if (response) {
        toast.success(t('contract_created_successfully', 'Contract created successfully!'));
        onClose();
        setTimeout(() => {
          window.location.href = '/buyer/contracts';
        }, 1500);
      }
    } catch (error) {
      console.error("❌ Contract creation error in modal:", error);

      // The error should already be toasted in handleCreateContract,
      // but we'll show a fallback error just in case
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.data?.details) {
        const details = error.response.data.details;
        if (typeof details === 'object') {
          const errorMessages = Object.values(details).flat();
          toast.error(errorMessages[0] || t('validation_error', 'Validation error'));
        } else {
          toast.error(details);
        }
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error(t('failed_to_create_contract', 'Failed to create contract'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Step indicators
  const steps = [
    { number: 1, label: t('quantity_step') || "Quantity", icon: Package },
    { number: 2, label: t('location_step') || "Location", icon: MapPin },
    { number: 3, label: t('payment_step') || "Payment", icon: DollarSign },
    { number: 4, label: t('delivery_step') || "Delivery", icon: Truck }
  ];

  const canProceedToNext = () => {
    if (activeStep === 1) {
      return formData.quantity_kg && parseFloat(formData.quantity_kg) > 0;
    }
    if (activeStep === 2) {
      return formData.delivery_location;
    }
    if (activeStep === 3) {
      if (formData.payment_option === "partial") {
        return formData.payment_due_date;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (canProceedToNext() && activeStep < 4) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrev = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card contract-modal" style={{ maxWidth: "700px", borderRadius: "24px" }}>

        {/* Header with gradient */}
        <div className="modal-head" style={{
          background: "linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%)",
          color: "white",
          borderBottom: "none",
          borderRadius: "24px 24px 0 0"
        }}>
          <div>
            <h2 style={{ color: "white", display: "flex", alignItems: "center", gap: "8px" }}>
              <Handshake size={24} />
              {t('create_contract_from_stock') || "Create Contract from Stock"}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", marginTop: "4px" }}>
              {stock?.product_name} • {stock?.price_per_kg?.toLocaleString()} RWF/kg
            </p>
          </div>
          <button className="modal-close" onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div style={{ padding: "24px 24px 0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", position: "relative" }}>
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === step.number;
              const isCompleted = activeStep > step.number;
              return (
                <div key={step.number} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    margin: "0 auto",
                    borderRadius: "50%",
                    background: isActive ? "#2d5a2d" : isCompleted ? "#4caf71" : "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isActive || isCompleted ? "white" : "#94a3b8",
                    transition: "all 0.3s ease",
                    position: "relative",
                    zIndex: 2
                  }}>
                    {isCompleted ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                  </div>
                  <div style={{
                    fontSize: "11px",
                    marginTop: "8px",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#2d5a2d" : "#64748b"
                  }}>
                    {step.label}
                  </div>
                </div>
              );
            })}
            {/* Progress line */}
            <div style={{
              position: "absolute",
              top: "20px",
              left: "10%",
              right: "10%",
              height: "2px",
              background: "#e2e8f0",
              zIndex: 1
            }}>
              <div style={{
                width: `${((activeStep - 1) / 3) * 100}%`,
                height: "100%",
                background: "#4caf71",
                transition: "width 0.3s ease"
              }} />
            </div>
          </div>
        </div>

        <div className="modal-body" style={{ padding: "24px" }}>
          <form onSubmit={handleSubmit}>

            {/* Step 1: Quantity */}
            {activeStep === 1 && (
              <div className="step-content" style={{ animation: "fadeIn 0.3s ease" }}>
                {/* Stock Info Card */}
                <div className="stock-info-card" style={{
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                  borderRadius: "16px",
                  padding: "20px",
                  marginBottom: "24px",
                  border: "1px solid #e2e8f0"
                }}>
                  <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                    <div style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <Wheat size={24} color="#2d5a2d" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                        {stock?.product_name}
                      </h3>
                      <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#64748b" }}>
                        <span><MapPin size={12} /> {stock?.location}</span>
                        <span><Award size={12} /> Grade {stock?.quality_grade}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "12px",
                    paddingTop: "12px",
                    borderTop: "1px solid #e2e8f0"
                  }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{t('available')}</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                        {stock?.quantity?.toLocaleString()} kg
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{t('price_per_kg')}</div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                        {stock?.price_per_kg?.toLocaleString()} RWF
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{t('farmer')}</div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                        {stock?.farmer?.name || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
                    <Package size={16} />
                    {t('quantity_kg') || "Quantity (kg)"} <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={stock?.quantity}
                    className="form-input"
                    style={{
                      padding: "14px",
                      fontSize: "16px",
                      borderRadius: "12px",
                      border: "2px solid #e2e8f0",
                      transition: "all 0.2s ease"
                    }}
                    placeholder={t('enter_quantity') || "Enter quantity in kg"}
                    value={formData.quantity_kg}
                    onChange={(e) => handleChange("quantity_kg", e.target.value)}
                    required
                  />
                  {stock?.quantity && (
                    <small className="form-hint" style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px" }}>
                      <Info size={12} />
                      {t('max_available')}: {stock.quantity.toLocaleString()} kg
                    </small>
                  )}
                </div>

                {/* Total Amount Preview */}
                {totalAmount > 0 && (
                  <div className="total-amount-preview" style={{
                    background: "linear-gradient(135deg, #e8f5e9, #dcfce7)",
                    borderRadius: "16px",
                    padding: "16px 20px",
                    marginTop: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid #bbf7d0"
                  }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#166534" }}>{t('total_amount')}</div>
                      <div style={{ fontSize: "24px", fontWeight: 700, color: "#14532d" }}>
                        {totalAmount.toLocaleString()} RWF
                      </div>
                    </div>
                    <div style={{
                      background: "white",
                      borderRadius: "12px",
                      padding: "8px 16px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#2d5a2d"
                    }}>
                      {formData.quantity_kg} kg × {stock?.price_per_kg} RWF
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Delivery Location */}
            {activeStep === 2 && (
              <div className="step-content" style={{ animation: "fadeIn 0.3s ease" }}>
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
                    <MapPin size={16} />
                    {t('delivery_location') || "Delivery Location"} <span style={{ color: "#dc2626" }}>*</span>
                  </label>

                  {formData.delivery_location && !showLocationSelector ? (
                    <div className="delivery-location-display" style={{
                      background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
                      borderRadius: "16px",
                      border: "2px solid #e2e8f0",
                      padding: "16px",
                      transition: "all 0.2s ease"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: "#e8f5e9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            <MapPin size={20} color="#2d5a2d" />
                          </div>
                          <div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>{t('selected_location')}</div>
                            <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                              {formData.delivery_location}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="change-location-btn"
                          onClick={() => setShowLocationSelector(true)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 16px",
                            background: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            cursor: "pointer",
                            fontWeight: 500,
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f8fafc";
                            e.currentTarget.style.borderColor = "#2d5a2d";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "white";
                            e.currentTarget.style.borderColor = "#e2e8f0";
                          }}
                        >
                          <Edit2 size={14} /> {t('change') || "Change"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: "#f8fafc",
                      borderRadius: "16px",
                      padding: "20px",
                      border: "2px solid #e2e8f0"
                    }}>
                      <LocationSelectorStrict
                        onValidChange={handleValidLocationChange}
                        error={locationError}
                        t={t}
                        initialLocation={formData.delivery_location}
                      />
                      {formData.delivery_location && (
                        <div style={{ marginTop: "12px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => setShowLocationSelector(false)}
                            style={{
                              padding: "6px 12px",
                              background: "#e8f5e9",
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "12px",
                              color: "#2d5a2d",
                              cursor: "pointer"
                            }}
                          >
                            Confirm Location
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {locationError && <small className="form-error">{locationError}</small>}
                </div>

                {/* Delivery Date */}
                <div className="form-group" style={{ marginTop: "20px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
                    <Calendar size={16} />
                    {t('delivery_date') || "Delivery Date"}
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    style={{
                      padding: "14px",
                      borderRadius: "12px",
                      border: "2px solid #e2e8f0"
                    }}
                    value={formData.delivery_date}
                    onChange={(e) => handleChange("delivery_date", e.target.value)}
                  />
                  <small className="form-hint">{t('delivery_date_hint') || "Optional - specify when you need the delivery"}</small>
                </div>
              </div>
            )}

            {/* Step 3: Payment Option */}
            {activeStep === 3 && (
              <div className="step-content" style={{ animation: "fadeIn 0.3s ease" }}>
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
                    <DollarSign size={16} />
                    {t('payment_option') || "Payment Option"} <span style={{ color: "#dc2626" }}>*</span>
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "8px" }}>
                    <label style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "16px",
                      border: `2px solid ${formData.payment_option === "full" ? "#2d5a2d" : "#e2e8f0"}`,
                      borderRadius: "16px",
                      background: formData.payment_option === "full" ? "#e8f5e9" : "white",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}>
                      <input
                        type="radio"
                        value="full"
                        checked={formData.payment_option === "full"}
                        onChange={() => handleChange("payment_option", "full")}
                        style={{ display: "none" }}
                      />
                      <div style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: formData.payment_option === "full" ? "#2d5a2d" : "#e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {formData.payment_option === "full" && <CheckCircle2 size={14} color="white" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{t('full_payment') || "Full Payment"}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {t('pay_full_amount') || "Pay the total amount upfront"}
                        </div>
                      </div>
                    </label>

                    <label style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "16px",
                      border: `2px solid ${formData.payment_option === "partial" ? "#b76e0a" : "#e2e8f0"}`,
                      borderRadius: "16px",
                      background: formData.payment_option === "partial" ? "#fff8e1" : "white",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}>
                      <input
                        type="radio"
                        value="partial"
                        checked={formData.payment_option === "partial"}
                        onChange={() => handleChange("payment_option", "partial")}
                        style={{ display: "none" }}
                      />
                      <div style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: formData.payment_option === "partial" ? "#b76e0a" : "#e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {formData.payment_option === "partial" && <CheckCircle2 size={14} color="white" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{t('partial_payment') || "Partial Payment"}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {t('pay_partial_amount') || "Pay partially with a due date"}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {formData.payment_option === "partial" && (
                  <div className="form-group" style={{ marginTop: "20px", animation: "slideDown 0.3s ease" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
                      <Calendar size={16} />
                      {t('payment_due_date') || "Payment Due Date"} <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      style={{
                        padding: "14px",
                        borderRadius: "12px",
                        border: "2px solid #e2e8f0"
                      }}
                      value={formData.payment_due_date}
                      onChange={(e) => handleChange("payment_due_date", e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Payment Summary */}
                <div style={{
                  marginTop: "24px",
                  background: "linear-gradient(135deg, #f1f5f9, #f8fafc)",
                  borderRadius: "16px",
                  padding: "20px",
                  border: "1px solid #e2e8f0"
                }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#0f172a" }}>
                    {t('payment_summary') || "Payment Summary"}
                  </h4>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ color: "#64748b" }}>{t('total_amount')}:</span>
                    <span style={{ fontWeight: 600 }}>{totalAmount.toLocaleString()} RWF</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>{t('payment_method')}:</span>
                    <span style={{ fontWeight: 600 }}>
                      {formData.payment_option === "full" ? t('full_payment') : t('partial_payment')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Delivery & Notes */}
            {activeStep === 4 && (
              <div className="step-content" style={{ animation: "fadeIn 0.3s ease" }}>
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
                    <Truck size={16} />
                    {t('who_will_deliver') || "Who will deliver?"} <span style={{ color: "#dc2626" }}>*</span>
                  </label>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "8px" }}>
                    <label style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "16px",
                      border: `2px solid ${formData.delivery_type === "self" ? "#2d5a2d" : "#e2e8f0"}`,
                      borderRadius: "16px",
                      background: formData.delivery_type === "self" ? "#e8f5e9" : "white",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}>
                      <input
                        type="radio"
                        value="self"
                        checked={formData.delivery_type === "self"}
                        onChange={() => handleChange("delivery_type", "self")}
                        style={{ display: "none" }}
                      />
                      <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: formData.delivery_type === "self" ? "#2d5a2d" : "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <User size={24} color={formData.delivery_type === "self" ? "white" : "#64748b"} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{t('i_will_deliver') || "I will deliver"}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {t('buyer_responsible') || "Buyer handles delivery"}
                        </div>
                      </div>
                    </label>

                    <label style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "16px",
                      border: `2px solid ${formData.delivery_type === "farmer" ? "#b76e0a" : "#e2e8f0"}`,
                      borderRadius: "16px",
                      background: formData.delivery_type === "farmer" ? "#fff8e1" : "white",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}>
                      <input
                        type="radio"
                        value="farmer"
                        checked={formData.delivery_type === "farmer"}
                        onChange={() => handleChange("delivery_type", "farmer")}
                        style={{ display: "none" }}
                      />
                      <div style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: formData.delivery_type === "farmer" ? "#b76e0a" : "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <Truck size={24} color={formData.delivery_type === "farmer" ? "white" : "#64748b"} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{t('farmer_will_deliver') || "Farmer will deliver"}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {t('farmer_responsible') || "Farmer handles delivery"}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group" style={{ marginTop: "20px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
                    <FileText size={16} />
                    {t('notes') || "Additional Notes"}
                  </label>
                  <textarea
                    className="form-input"
                    rows="4"
                    style={{
                      padding: "14px",
                      borderRadius: "12px",
                      border: "2px solid #e2e8f0",
                      resize: "vertical"
                    }}
                    placeholder={t('contract_notes_placeholder') || "Any additional notes or special instructions for the farmer..."}
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                  />
                </div>

                {/* Contract Summary Card */}
                <div style={{
                  marginTop: "24px",
                  background: "linear-gradient(135deg, #1e3c1e, #2d5a2d)",
                  borderRadius: "16px",
                  padding: "20px",
                  color: "white"
                }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "rgba(255,255,255,0.9)" }}>
                    {t('contract_summary') || "Contract Summary"}
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "11px", opacity: 0.7 }}>{t('product')}</div>
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>{stock?.product_name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", opacity: 0.7 }}>{t('quantity')}</div>
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>{formData.quantity_kg} kg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", opacity: 0.7 }}>{t('total_amount')}</div>
                      <div style={{ fontSize: "16px", fontWeight: 700 }}>{totalAmount.toLocaleString()} RWF</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", opacity: 0.7 }}>{t('delivery')}</div>
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>
                        {formData.delivery_type === "self" ? t('buyer') : t('farmer')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              marginTop: "32px",
              paddingTop: "24px",
              borderTop: "1px solid #e2e8f0"
            }}>
              {activeStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  style={{
                    padding: "12px 24px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                  }}
                >
                  <ChevronLeft size={16} />
                  {t('previous') || "Previous"}
                </button>
              )}

              <div style={{ flex: 1 }} />

              {activeStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceedToNext()}
                  style={{
                    padding: "12px 28px",
                    background: canProceedToNext() ? "linear-gradient(135deg, #1e3c1e, #2d5a2d)" : "#e2e8f0",
                    color: canProceedToNext() ? "white" : "#94a3b8",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: 600,
                    cursor: canProceedToNext() ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s ease"
                  }}
                >
                  {t('next') || "Next"}
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "12px 32px",
                    background: "linear-gradient(135deg, #1e3c1e, #2d5a2d)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s ease",
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? <Loader2 size={16} className="spin-icon" /> : <CheckCircle2 size={16} />}
                  {loading ? (t('creating') || "Creating...") : (t('create_contract') || "Create Contract")}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .step-content {
          animation: fadeIn 0.3s ease;
        }
        
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .form-input:focus {
          outline: none;
          border-color: #2d5a2d !important;
          box-shadow: 0 0 0 3px rgba(45, 90, 45, 0.1);
        }
      `}</style>
    </div>
  );
}

// ─── StockDetailModal ─────────────────────────────────────────────────────────
function StockDetailModal({ stock, onClose, onContract, onChat }) {
  const { t } = useTranslation();
  const q = QUALITY[stock.quality_grade] || QUALITY.B;
  const val = stock.price_per_kg ? stock.quantity * stock.price_per_kg : null;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const availLabel = stock.quantity < 100
    ? t("availability_low_text", "Low")
    : stock.quantity < 500
      ? t("availability_medium_text", "Medium")
      : t("availability_high_text", "High");

  return (
    <div className="sdm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sdm-panel">
        <div className="sdm-header">
          <div className="sdm-header-badge" style={{ background: q.bg, color: q.color }}>
            <span className="sdm-grade-icon">{q.icon}</span>
            {t(q.labelKey)} {t("grade_label", "Grade")}
          </div>
          <button className="sdm-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="sdm-hero">
          <div className="sdm-hero-icon"><Wheat size={40} /></div>
          <div className="sdm-hero-text">
            <h2 className="sdm-title">{stock.product_name}</h2>
            <div className="sdm-location"><MapPin size={14} /> {stock.location}</div>
          </div>
          {stock.price_per_kg && (
            <div className="sdm-hero-price">
              <span className="sdm-price-num">{fmt(stock.price_per_kg)}</span>
              <span className="sdm-price-unit">{t("rwf_per_kg", "RWF/kg")}</span>
            </div>
          )}
        </div>

        <div className="sdm-metrics">
          <div className="sdm-metric">
            <Weight size={16} />
            <strong>{fmt(stock.quantity)}</strong>
            <span>{t("kg_available_label", "kg available")}</span>
          </div>
          {stock.price_per_kg && (
            <div className="sdm-metric">
              <Tag size={16} />
              <strong>{fmt(stock.price_per_kg)}</strong>
              <span>{t("rwf_per_kg_unit", "RWF/kg")}</span>
            </div>
          )}
          {val && (
            <div className="sdm-metric">
              <DollarSign size={16} />
              <strong>{fmt(Math.round(val))}</strong>
              <span>{t("rwf_total_label", "RWF total")}</span>
            </div>
          )}
          <div className="sdm-metric">
            <Clock size={16} />
            <strong>{fmtDate(stock.listed_at)}</strong>
            <span>{t("listed_label", "listed")}</span>
          </div>
        </div>

        <div className="sdm-details">
          <div className="sdm-detail-row">
            <span className="sdm-detail-label"><Award size={14} /> {t("quality_grade_label", "Quality Grade")}</span>
            <span className="sdm-detail-val" style={{ color: q.color, fontWeight: 700 }}>
              {t("grade_label", "Grade")} {stock.quality_grade} — {t(q.labelKey)}
            </span>
          </div>
          <div className="sdm-detail-row">
            <span className="sdm-detail-label"><Package size={14} /> {t("unit_label", "Unit")}</span>
            <span className="sdm-detail-val">{stock.unit || "kg"}</span>
          </div>
          <div className="sdm-detail-row">
            <span className="sdm-detail-label"><MapPin size={14} /> {t("location_label", "Location")}</span>
            <span className="sdm-detail-val">{stock.location}</span>
          </div>
          {stock.farmer?.location && (
            <div className="sdm-detail-row">
              <span className="sdm-detail-label"><Globe size={14} /> {t("farmer_region_label", "Farmer Region")}</span>
              <span className="sdm-detail-val">{stock.farmer.location}</span>
            </div>
          )}
          <div className="sdm-detail-row">
            <span className="sdm-detail-label"><User size={14} /> {t("farmer_label", "Farmer")}</span>
            <span className="sdm-detail-val">{stock.farmer?.name || "—"}</span>
          </div>
          {stock.farmer?.phone && (
            <div className="sdm-detail-row">
              <span className="sdm-detail-label"><Phone size={14} /> {t("phone_label", "Phone")}</span>
              <span className="sdm-detail-val">{stock.farmer.phone}</span>
            </div>
          )}
        </div>

        {stock.description && (
          <div className="sdm-description">
            <p className="sdm-desc-label">{t("about_this_stock_label", "About this stock")}</p>
            <p className="sdm-desc-text">{stock.description}</p>
          </div>
        )}

        <div className="sdm-qty-bar-wrap">
          <div className="sdm-qty-bar-label">
            <Sprout size={13} /> {t("stock_level_label", "Stock Level")}
            <span className={`sdm-qty-tag ${stock.quantity < 100 ? "low" : stock.quantity < 500 ? "med" : "high"}`}>
              {availLabel} {t("availability_label", "availability")}
            </span>
          </div>
          <div className="sdm-qty-bar-track">
            <div className="sdm-qty-bar-fill" style={{
              width: `${Math.min(100, (stock.quantity / 5000) * 100)}%`,
              background: stock.quantity < 100 ? "#ef4444" : stock.quantity < 500 ? "#f59e0b" : "#22c55e"
            }} />
          </div>
          <div className="sdm-qty-bar-nums">
            <span>0 kg</span><span>{fmt(stock.quantity)} kg</span>
          </div>
        </div>

        <div className="sdm-cta">
          <button className="sdm-btn sdm-btn-chat" onClick={() => onChat(stock)}>
            <MessageCircle size={18} /> {t("chat_with_farmer_btn", "Chat with Farmer")}
          </button>
          <button className="sdm-btn sdm-btn-contract" onClick={() => onContract(stock)}>
            <FileSignature size={18} /> {t("apply_contract_btn", "Apply Contract")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── StockCard ────────────────────────────────────────────────────────────────
function StockCard({ stock, onView, onContract, onChat, viewMode }) {
  const { t } = useTranslation();
  const q = QUALITY[stock.quality_grade] || QUALITY.B;
  const isLow = stock.quantity < 100;
  const isMed = stock.quantity >= 100 && stock.quantity < 500;

  if (viewMode === "list") {
    return (
      <div className="sc-list-row" onClick={() => onView(stock)}>
        <div className="sc-list-icon"><Wheat size={22} /></div>
        <div className="sc-list-main">
          <div className="sc-list-name">{stock.product_name}</div>
          <div className="sc-list-loc"><MapPin size={11} /> {stock.location}</div>
        </div>
        <div className="sc-list-grade">
          <span className="sc-grade-pill" style={{ background: q.bg, color: q.color }}>
            {q.icon} {t(q.labelKey)}
          </span>
        </div>
        <div className="sc-list-qty">
          <strong>{fmt(stock.quantity)}</strong> <span>{t("kg_unit", "kg")}</span>
        </div>
        <div className="sc-list-price">
          {stock.price_per_kg
            ? <><strong>{fmt(stock.price_per_kg)}</strong> <span>{t("rwf_per_kg_unit", "RWF/kg")}</span></>
            : <span className="sc-no-price">{t("price_tbd_label", "Price TBD")}</span>}
        </div>
        <div className="sc-list-actions" onClick={e => e.stopPropagation()}>
          <button className="sc-btn-sm sc-btn-chat"
            title={t("chat_with_farmer_btn", "Chat with Farmer")}
            onClick={() => onChat(stock)}><MessageCircle size={14} /></button>
          <button className="sc-btn-sm sc-btn-contract"
            title={t("apply_contract_btn", "Apply Contract")}
            onClick={() => onContract(stock)}><FileSignature size={14} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-card">
      {isLow && (
        <div className="sc-ribbon sc-ribbon-low">
          {t("low_stock_badge", "Low Stock")}
        </div>
      )}
      <div className="sc-card-top">
        <div className="sc-card-icon-wrap"><Wheat size={28} /></div>
        <div className="sc-card-meta">
          <span className="sc-grade-pill" style={{ background: q.bg, color: q.color }}>
            {q.icon} {t(q.labelKey)}
          </span>
          {stock.price_per_kg && (
            <span className="sc-price-chip">{fmt(stock.price_per_kg)} {t("rwf_per_kg_unit", "RWF/kg")}</span>
          )}
        </div>
      </div>

      <div className="sc-card-body">
        <h3 className="sc-name">{stock.product_name}</h3>
        <div className="sc-location"><MapPin size={12} /> {stock.location}</div>
        <div className="sc-qty-row">
          <span className="sc-qty-num">{fmt(stock.quantity)}</span>
          <span className="sc-qty-unit">{t("kg_available_label", "kg available")}</span>
          <span className={`sc-qty-badge ${isLow ? "low" : isMed ? "med" : "high"}`}>
            {isLow
              ? t("availability_low_text", "Low")
              : isMed
                ? t("availability_medium_text", "Med")
                : t("availability_high_text", "High")}
          </span>
        </div>
        {stock.description && (
          <p className="sc-desc">
            {stock.description.slice(0, 75)}{stock.description.length > 75 ? "…" : ""}
          </p>
        )}
        <div className="sc-farmer-row">
          <User size={12} /> {stock.farmer?.name || t("farmer_label", "Farmer")}
        </div>
      </div>

      <div className="sc-card-footer">
        <button className="sc-view-btn" onClick={() => onView(stock)}>
          <Eye size={14} /> {t("view_details_btn", "View Details")}
        </button>
        <div className="sc-action-row">
          <button className="sc-action-btn sc-chat-btn" onClick={() => onChat(stock)}>
            <MessageCircle size={14} /> {t("chat_short_btn", "Chat")}
          </button>
          <button className="sc-action-btn sc-contract-btn" onClick={() => onContract(stock)}>
            <FileSignature size={14} /> {t("contract_short_btn", "Contract")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FilterPanel ──────────────────────────────────────────────────────────────
function FilterPanel({ filters, onChange, onReset, counts, isMobile, onClose }) {
  const { t } = useTranslation();

  const inner = (
    <div className="fp-inner">
      <div className="fp-section">
        <p className="fp-section-title">{t("quality_grade_label", "Quality Grade")}</p>
        {Object.entries(QUALITY).map(([k, v]) => (
          <label key={k} className="fp-check">
            <input
              type="checkbox"
              checked={filters.quality.includes(k)}
              onChange={() => {
                const next = filters.quality.includes(k)
                  ? filters.quality.filter(x => x !== k)
                  : [...filters.quality, k];
                onChange("quality", next);
              }}
            />
            <span className="fp-dot" style={{ background: v.dot }} />
            {t(v.labelKey)}
          </label>
        ))}
      </div>

      <div className="fp-section">
        <p className="fp-section-title">{t("price_range_label", "Price Range (RWF/kg)")}</p>
        <div className="fp-range-row">
          <input className="fp-num" type="number"
            placeholder={t("min_placeholder", "Min")}
            value={filters.minPrice} onChange={e => onChange("minPrice", e.target.value)} />
          <span className="fp-range-sep">—</span>
          <input className="fp-num" type="number"
            placeholder={t("max_placeholder", "Max")}
            value={filters.maxPrice} onChange={e => onChange("maxPrice", e.target.value)} />
        </div>
      </div>

      <div className="fp-section">
        <p className="fp-section-title">{t("min_quantity_label", "Minimum Quantity (kg)")}</p>
        <input className="fp-num full" type="number"
          placeholder={t("min_qty_placeholder", "e.g. 500")}
          value={filters.minQty} onChange={e => onChange("minQty", e.target.value)} />
      </div>

      <div className="fp-section">
        <p className="fp-section-title">{t("availability_label", "Availability")}</p>
        {[
          { val: "", labelKey: "all_levels_label", def: "All levels" },
          { val: "high", labelKey: "avail_high_label", def: "High (≥ 500 kg)" },
          { val: "medium", labelKey: "avail_medium_label", def: "Medium (100–499 kg)" },
          { val: "low", labelKey: "avail_low_label", def: "Low (< 100 kg)" },
        ].map(opt => (
          <label key={opt.val} className="fp-radio">
            <input type="radio" name="fp-avail"
              checked={filters.availability === opt.val}
              onChange={() => onChange("availability", opt.val)} />
            {t(opt.labelKey, opt.def)}
          </label>
        ))}
      </div>

      {counts.active > 0 && (
        <button className="fp-reset" onClick={onReset}>
          <RefreshCw size={13} /> {t("reset_filters_btn", "Reset all filters")}
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="fp-drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="fp-drawer">
          <div className="fp-drawer-header">
            <span className="fp-drawer-title">
              <SlidersHorizontal size={16} />
              {t("filters_label", "Filters")}
              {counts.active > 0 && <span className="fp-count">{counts.active}</span>}
            </span>
            <button className="fp-drawer-close" onClick={onClose}><X size={18} /></button>
          </div>
          {inner}
        </div>
      </div>
    );
  }

  return (
    <aside className="fp-sidebar">
      <div className="fp-head">
        <SlidersHorizontal size={16} />
        {t("filters_label", "Filters")}
        {counts.active > 0 && <span className="fp-count">{counts.active}</span>}
      </div>
      {inner}
    </aside>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ current, total, pageSize, onPage, onSize }) {
  const { t } = useTranslation();
  if (total <= 1) return null;

  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) pages.push(i);
    else if (i === current - 2 || i === current + 2) pages.push("…");
  }
  const seen = new Set();
  const deduped = pages.filter(p => {
    if (p === "…" && seen.has("…")) return false;
    seen.add(p); return true;
  });

  return (
    <div className="pg-wrap">
      <div className="pg-size-wrap">
        {t("show_label", "Show")}
        <select className="pg-size-sel" value={pageSize} onChange={e => onSize(+e.target.value)}>
          {[8, 12, 24, 48].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {t("per_page_label", "per page")}
      </div>
      <div className="pg-btns">
        <button className="pg-btn" disabled={current === 1} onClick={() => onPage(1)}><ChevronsLeft size={14} /></button>
        <button className="pg-btn" disabled={current === 1} onClick={() => onPage(current - 1)}><ChevronLeft size={14} /></button>
        {deduped.map((p, i) =>
          p === "…"
            ? <span key={"e" + i} className="pg-ellipsis">…</span>
            : <button key={p} className={`pg-btn ${p === current ? "active" : ""}`} onClick={() => onPage(p)}>{p}</button>
        )}
        <button className="pg-btn" disabled={current === total} onClick={() => onPage(current + 1)}><ChevronRight size={14} /></button>
        <button className="pg-btn" disabled={current === total} onClick={() => onPage(total)}><ChevronsRight size={14} /></button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BuyerMarketplace() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [allStocks, setAllStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [sort, setSort] = useState("default");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [selected, setSelected] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 900);
  const [toastMsg, setToastMsg] = useState(null);
  const [filters, setFilters] = useState({
    quality: [], minPrice: "", maxPrice: "", minQty: "", availability: "",
  });
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedStockForContract, setSelectedStockForContract] = useState(null);
  const [contacting, setContacting] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const abortRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const showToast = useCallback((msg, type = "info") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const fetchStocks = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${PUBLIC_API}?page=1&page_size=200`, {
        signal: abortRef.current.signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAllStocks(data.stocks || []);
    } catch (e) {
      if (e.name === "AbortError") return;
      setError(t("failed_to_fetch_error", "Failed to load stocks. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchStocks();
    return () => abortRef.current?.abort();
  }, [fetchStocks]);

  // Contract creation handler
  const handleCreateContract = async (contractData) => {
    try {
      console.log("📤 Sending contract data:", contractData);

      const response = await apiClient.post("/contract/create/", contractData);
      console.log("✅ Contract created successfully:", response.data);

      showToast(t("contract_created_successfully", "Contract created successfully!"), "success");
      return response.data;

    } catch (error) {
      console.error("❌ Contract creation failed - Full error:", error);

      if (error.response) {
        console.error("Error response status:", error.response.status);
        console.error("Error response data:", error.response.data);

        let errorMessage = "";
        const responseData = error.response.data;

        // Check for non_field_errors first (most detailed)
        if (responseData.details?.non_field_errors && responseData.details.non_field_errors.length > 0) {
          errorMessage = responseData.details.non_field_errors.join(', ');
        }
        // Check for field-specific errors
        else if (responseData.details && typeof responseData.details === 'object') {
          const fieldErrors = [];
          for (const [field, errors] of Object.entries(responseData.details)) {
            if (field !== 'non_field_errors' && errors && errors.length > 0) {
              fieldErrors.push(`${field}: ${errors.join(', ')}`);
            }
          }
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join('; ');
          }
        }
        // Check for top-level error
        else if (responseData.error) {
          errorMessage = responseData.error;
        }
        // Check for message field
        else if (responseData.message) {
          errorMessage = responseData.message;
        }
        // Default fallback
        else {
          errorMessage = t("failed_to_create_contract", "Failed to create contract. Please try again.");
        }

        console.error("📝 Displaying error message:", errorMessage);
        showToast(errorMessage, "error");

      } else if (error.request) {
        console.error("No response received:", error.request);
        showToast(t("network_error", "Network error. Please check your connection."), "error");

      } else {
        console.error("Error setting up request:", error.message);
        showToast(error.message || t("unknown_error", "An unknown error occurred"), "error");
      }

      throw error;
    }
  };

  // Chat handler (same as market matching)
  const handleChat = useCallback(async (stock) => {
    if (contacting) return;

    const farmerId = stock.farmer?.id || stock.farmer_id;
    const farmerName = stock.farmer?.name || "Farmer";

    if (!farmerId) {
      showToast(t("farmer_not_found", "Farmer information not available"), "error");
      return;
    }

    setContacting(true);
    const loadingToastId = toast.loading(t("opening_chat...", "Opening chat..."));

    try {
      // Check if a chat already exists with this farmer
      const response = await apiClient.get(`/chat/my-chats/`, {
        params: {
          search: farmerName,
          chat_type: "one_on_one",
          page_size: 500
        }
      });

      let chatId = null;
      let existingChat = null;

      if (response.data.chats && response.data.chats.length > 0) {
        existingChat = response.data.chats.find(chat => {
          if (chat.chat_type !== "one_on_one") return false;
          const participants = chat.participants || [];
          return participants.some(p => {
            const participantId = p.user?.id || p.id;
            return participantId === farmerId;
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
          user_id: farmerId,
          name: `Chat with ${farmerName}`
        });

        if (createResponse.data.chat) {
          chatId = createResponse.data.chat.id;
        } else {
          throw new Error("Failed to create chat");
        }
      }

      if (!chatId) {
        throw new Error("No chat ID received");
      }

      toast.update(loadingToastId, {
        render: t("chat_ready_redirecting", "Chat ready, redirecting..."),
        type: 'success',
        isLoading: false,
        autoClose: 1500
      });

      // Navigate to chat management with the chat ID
      setTimeout(() => {
        navigate('/buyer/chats', {
          state: {
            openChatId: chatId,
            userId: farmerId,
            userName: farmerName,
            role: 'farmer',
            timestamp: Date.now()
          }
        });
      }, 1000);

    } catch (error) {
      console.error('Error handling chat:', error);
      toast.update(loadingToastId, {
        render: t("failed_to_open_chat", "Failed to open chat"),
        type: 'error',
        isLoading: false,
        autoClose: 3000
      });
    } finally {
      setContacting(false);
    }
  }, [navigate, showToast]);

  // Contract handler
  const handleContract = useCallback((stock) => {
    setSelectedStockForContract(stock);
    setShowContractModal(true);
  }, []);

  const processed = useMemo(() => {
    let list = [...allStocks];
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(s =>
        s.product_name.toLowerCase().includes(q) ||
        (s.location || "").toLowerCase().includes(q) ||
        (s.farmer?.name || "").toLowerCase().includes(q)
      );
    }
    if (filters.quality.length > 0)
      list = list.filter(s => filters.quality.includes(s.quality_grade));
    if (filters.minPrice) list = list.filter(s => (s.price_per_kg || 0) >= +filters.minPrice);
    if (filters.maxPrice) list = list.filter(s => (s.price_per_kg || 0) <= +filters.maxPrice);
    if (filters.minQty) list = list.filter(s => s.quantity >= +filters.minQty);
    if (filters.availability === "high") list = list.filter(s => s.quantity >= 500);
    if (filters.availability === "medium") list = list.filter(s => s.quantity >= 100 && s.quantity < 500);
    if (filters.availability === "low") list = list.filter(s => s.quantity < 100);

    list.sort((a, b) => {
      switch (sort) {
        case "price_asc": return (a.price_per_kg || 0) - (b.price_per_kg || 0);
        case "price_desc": return (b.price_per_kg || 0) - (a.price_per_kg || 0);
        case "qty_asc": return a.quantity - b.quantity;
        case "qty_desc": return b.quantity - a.quantity;
        case "name_asc": return a.product_name.localeCompare(b.product_name);
        case "name_desc": return b.product_name.localeCompare(a.product_name);
        default: return 0;
      }
    });
    return list;
  }, [allStocks, debouncedSearch, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const paginated = processed.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [debouncedSearch, filters, sort, pageSize]);

  const handleFilterChange = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const handleResetFilters = () =>
    setFilters({ quality: [], minPrice: "", maxPrice: "", minQty: "", availability: "" });
  const activeFilterCount = [
    filters.quality.length > 0, !!filters.minPrice, !!filters.maxPrice,
    !!filters.minQty, !!filters.availability,
  ].filter(Boolean).length;

  const totalQty = allStocks.reduce((s, x) => s + x.quantity, 0);
  const priced = allStocks.filter(x => x.price_per_kg);
  const avgPrice = priced.length
    ? priced.reduce((s, x) => s + x.price_per_kg, 0) / priced.length
    : 0;

  const SORT_OPTIONS = [
    { value: "default", label: t("sort_featured_label", "Featured") },
    { value: "price_asc", label: t("sort_price_asc_label", "Price: Low → High") },
    { value: "price_desc", label: t("sort_price_desc_label", "Price: High → Low") },
    { value: "qty_asc", label: t("sort_qty_asc_label", "Qty: Low → High") },
    { value: "qty_desc", label: t("sort_qty_desc_label", "Qty: High → Low") },
    { value: "name_asc", label: t("sort_name_asc_label", "Name A → Z") },
    { value: "name_desc", label: t("sort_name_desc_label", "Name Z → A") },
  ];

  // CSS styles (same as original, omitted for brevity - include your existing CSS here)
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --g950:#0a1a0a; --g800:#166534; --g700:#15803d; --g600:#16a34a;
      --g400:#4ade80; --g100:#dcfce7; --g50:#f0fdf4;
      --e700:#44312a; --e400:#a0826d; --e100:#f5ede8;
      --cream:#faf7f2; --white:#ffffff;
      --txt:#1a1a2e; --txt2:#4a5568; --txt3:#718096; --border:#e8e4dc;
      --ff-d:'Fraunces',Georgia,serif; --ff-b:'DM Sans',sans-serif; --r:14px;
    }
    .bm-root { font-family:var(--ff-b); background:var(--cream); min-height:100vh; color:var(--txt); }

    /* ── Hero ─────────────────────────────────────────────────────────── */
    .bm-hero {
      background:var(--g950); padding:36px 20px 48px;
      position:relative; overflow:hidden;
    }
    .bm-hero::before {
      content:''; position:absolute; inset:0; pointer-events:none;
      background:radial-gradient(ellipse at 70% 50%,rgba(22,163,74,.18) 0%,transparent 65%);
    }
    .bm-hero-inner { position:relative; max-width:1400px; margin:0 auto; }

    /* Always column; row only on wide screens */
    .bm-hero-top { display:flex; flex-direction:column; gap:20px; }
    @media (min-width:900px) {
      .bm-hero-top { flex-direction:row; justify-content:space-between; align-items:flex-start; }
    }

    .bm-hero-label {
      display:inline-flex; align-items:center; gap:6px;
      background:rgba(74,222,128,.15); color:var(--g400);
      border:1px solid rgba(74,222,128,.3);
      border-radius:100px; padding:5px 14px;
      font-size:12px; font-weight:500; letter-spacing:.05em; margin-bottom:12px;
    }
    .bm-hero h1 {
      font-family:var(--ff-d);
      font-size:clamp(24px,5vw,44px);
      font-weight:700; color:var(--white); line-height:1.2; margin-bottom:10px;
    }
    .bm-hero h1 em { font-style:italic; color:var(--g400); }
    .bm-hero-sub { font-size:14px; color:rgba(255,255,255,.6); max-width:420px; line-height:1.65; }

    .bm-hero-stats { display:flex; gap:10px; flex-wrap:wrap; }
    .bm-stat-chip {
      background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12);
      border-radius:10px; padding:12px 16px; text-align:center; min-width:110px;
    }
    .bm-stat-chip-num  { font-family:var(--ff-d); font-size:20px; font-weight:700; color:var(--white); display:block; }
    .bm-stat-chip-label{ font-size:11px; color:rgba(255,255,255,.5); margin-top:2px; display:block; }
    /* Hide stats on mobile to keep hero clean */
    @media (max-width:899px) { .bm-hero-stats { display:none; } }

    /* ── Search bar ──────────────────────────────────────────────────── */
    .bm-search-outer { max-width:1400px; margin:0 auto; padding:0 16px; position:relative; z-index:10; }
    .bm-search-wrap {
      background:var(--white); border-radius:14px; padding:12px 14px;
      display:flex; align-items:center; gap:10px;
      box-shadow:0 4px 24px rgba(0,0,0,.1); border:1px solid var(--border);
      margin-top:-22px;
    }
    .bm-search-icon { color:var(--txt3); flex-shrink:0; }
    .bm-search-input {
      flex:1; border:none; outline:none; font-size:14px;
      font-family:var(--ff-b); color:var(--txt); background:transparent; min-width:0;
    }
    .bm-search-input::placeholder { color:var(--txt3); }
    .bm-search-clear {
      background:#f1f5f9; border:none; border-radius:8px;
      width:26px; height:26px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; color:var(--txt3); transition:all .2s;
    }
    .bm-search-clear:hover { background:#e2e8f0; color:var(--txt); }
    .bm-search-divider { width:1px; height:24px; background:var(--border); flex-shrink:0; }
    .bm-search-filter-toggle {
      display:flex; align-items:center; gap:6px; flex-shrink:0;
      background:none; border:none; cursor:pointer;
      font-family:var(--ff-b); font-size:13px; font-weight:500;
      color:var(--txt2); padding:6px 8px; border-radius:8px; transition:all .2s;
      white-space:nowrap;
    }
    .bm-search-filter-toggle:hover { background:var(--g50); color:var(--g700); }
    .bm-search-filter-toggle.active { background:var(--g100); color:var(--g700); }
    .bm-filter-badge {
      background:var(--g700); color:white;
      border-radius:100px; padding:1px 7px; font-size:11px; font-weight:600;
    }

    /* ── Body ────────────────────────────────────────────────────────── */
    .bm-body { max-width:1400px; margin:24px auto; padding:0 16px 60px; }
    .bm-layout { display:flex; gap:20px; align-items:flex-start; }

    /* ── Desktop sidebar ─────────────────────────────────────────────── */
    .fp-sidebar {
      width:236px; flex-shrink:0;
      background:var(--white); border-radius:var(--r);
      border:1px solid var(--border); overflow:hidden;
    }
    /* On mobile the sidebar never shows — drawer is used instead */
    @media (max-width:899px) { .fp-sidebar { display:none !important; } }

    .fp-head {
      display:flex; align-items:center; gap:8px;
      padding:14px 16px; font-weight:600; font-size:14px;
      border-bottom:1px solid var(--border);
    }
    .fp-count {
      margin-left:4px; background:var(--g700); color:white;
      border-radius:100px; padding:1px 7px; font-size:11px; font-weight:600;
    }
    .fp-section { padding:14px 16px; border-bottom:1px solid var(--border); }
    .fp-section-title {
      font-size:11px; font-weight:700; letter-spacing:.06em;
      text-transform:uppercase; color:var(--txt3); margin-bottom:10px;
    }
    .fp-check,.fp-radio {
      display:flex; align-items:center; gap:8px;
      font-size:13.5px; color:var(--txt2); margin-bottom:8px; cursor:pointer;
    }
    .fp-check:last-child,.fp-radio:last-child { margin-bottom:0; }
    .fp-check input,.fp-radio input { accent-color:var(--g700); cursor:pointer; }
    .fp-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
    .fp-range-row { display:flex; align-items:center; gap:8px; }
    .fp-range-sep { color:var(--txt3); font-size:12px; }
    .fp-num {
      flex:1; padding:8px 10px; border:1px solid var(--border); border-radius:8px;
      font-size:13px; font-family:var(--ff-b); color:var(--txt); outline:none; width:100%;
    }
    .fp-num.full { width:100%; flex:none; }
    .fp-num:focus { border-color:var(--g600); box-shadow:0 0 0 3px rgba(22,163,74,.1); }
    .fp-reset {
      display:flex; align-items:center; justify-content:center; gap:6px;
      width:100%; padding:12px 16px; background:none; border:none; cursor:pointer;
      font-family:var(--ff-b); font-size:13px; color:#ef4444; font-weight:500; transition:all .2s;
    }
    .fp-reset:hover { background:#fef2f2; }

    /* ── Mobile filter drawer ────────────────────────────────────────── */
    .fp-drawer-overlay {
      position:fixed; inset:0; z-index:500;
      background:rgba(10,26,10,.55); backdrop-filter:blur(4px);
      display:flex; align-items:flex-end;
    }
    .fp-drawer {
      background:var(--white); border-radius:20px 20px 0 0;
      width:100%; max-height:82vh; overflow-y:auto;
      animation:drawer-up .28s cubic-bezier(.34,1.56,.64,1);
      padding-bottom:env(safe-area-inset-bottom,16px);
    }
    @keyframes drawer-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
    .fp-drawer-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:16px 20px; border-bottom:1px solid var(--border);
      position:sticky; top:0; background:var(--white); z-index:2;
      border-radius:20px 20px 0 0;
    }
    .fp-drawer-title {
      display:flex; align-items:center; gap:8px;
      font-weight:700; font-size:16px; color:var(--txt);
    }
    .fp-drawer-close {
      width:34px; height:34px; border-radius:9px; border:1px solid var(--border);
      background:none; cursor:pointer; display:flex; align-items:center; justify-content:center;
      color:var(--txt3); transition:all .2s;
    }
    .fp-drawer-close:hover { background:#fee2e2; color:#dc2626; }

    /* ── Toolbar ─────────────────────────────────────────────────────── */
    .bm-toolbar {
      display:flex; justify-content:space-between; align-items:center;
      margin-bottom:16px; flex-wrap:wrap; gap:10px;
    }
    .bm-toolbar-left { font-size:13.5px; color:var(--txt3); }
    .bm-toolbar-left strong { color:var(--txt); }
    .bm-toolbar-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .bm-sort-select {
      padding:8px 10px; border:1px solid var(--border); border-radius:9px;
      font-size:13px; font-family:var(--ff-b); color:var(--txt);
      background:var(--white); cursor:pointer; outline:none;
    }
    .bm-sort-select:focus { border-color:var(--g600); }
    .bm-view-toggle { display:flex; background:var(--white); border:1px solid var(--border); border-radius:9px; overflow:hidden; }
    .bm-view-btn {
      padding:7px 10px; background:none; border:none; cursor:pointer;
      color:var(--txt3); display:flex; align-items:center; transition:all .2s;
    }
    .bm-view-btn:hover { color:var(--g700); }
    .bm-view-btn.active { background:var(--g700); color:white; }

    /* ── Stock Grid ──────────────────────────────────────────────────── */
    .bm-grid {
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(270px,1fr));
      gap:16px;
    }
    @media (max-width:480px) { .bm-grid { grid-template-columns:1fr; } }
    .bm-list { display:flex; flex-direction:column; gap:8px; }

    /* ── Stock Card ──────────────────────────────────────────────────── */
    .sc-card {
      background:var(--white); border-radius:var(--r);
      border:1px solid var(--border);
      transition:transform .2s,box-shadow .2s,border-color .2s;
      position:relative; overflow:hidden; display:flex; flex-direction:column;
    }
    .sc-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,.1); border-color:var(--g400); }
    .sc-ribbon {
      position:absolute; top:14px; right:-1px;
      padding:4px 12px 4px 10px; font-size:10px; font-weight:700;
      letter-spacing:.04em; text-transform:uppercase; border-radius:4px 0 0 4px;
    }
    .sc-ribbon-low { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-right:none; }
    .sc-card-top { padding:16px 16px 0; display:flex; justify-content:space-between; align-items:flex-start; }
    .sc-card-icon-wrap {
      width:46px; height:46px; border-radius:12px;
      background:linear-gradient(135deg,var(--g50),var(--g100));
      display:flex; align-items:center; justify-content:center; color:var(--g700); flex-shrink:0;
    }
    .sc-card-meta { display:flex; flex-direction:column; align-items:flex-end; gap:5px; }
    .sc-grade-pill {
      display:inline-flex; align-items:center; gap:4px;
      padding:4px 10px; border-radius:100px; font-size:11.5px; font-weight:600;
    }
    .sc-price-chip {
      background:var(--e100); color:var(--e700);
      padding:3px 9px; border-radius:100px; font-size:11px; font-weight:600;
    }
    .sc-card-body { padding:12px 16px; flex:1; }
    .sc-name {
      font-family:var(--ff-d); font-size:17px; font-weight:600;
      color:var(--txt); margin-bottom:4px; line-height:1.25;
    }
    .sc-location { display:flex; align-items:center; gap:4px; font-size:12px; color:var(--txt3); margin-bottom:12px; }
    .sc-qty-row { display:flex; align-items:baseline; gap:6px; margin-bottom:8px; flex-wrap:wrap; }
    .sc-qty-num { font-family:var(--ff-d); font-size:24px; font-weight:700; color:var(--g700); }
    .sc-qty-unit { font-size:13px; color:var(--txt3); }
    .sc-qty-badge {
      margin-left:auto; padding:2px 9px; border-radius:100px; font-size:11px; font-weight:700;
    }
    .sc-qty-badge.high { background:#dcfce7; color:#166534; }
    .sc-qty-badge.med  { background:#fef9c3; color:#854d0e; }
    .sc-qty-badge.low  { background:#fee2e2; color:#991b1b; }
    .sc-desc { font-size:13px; color:var(--txt3); line-height:1.55; margin-bottom:8px; }
    .sc-farmer-row { display:flex; align-items:center; gap:5px; font-size:12px; color:var(--txt3); }
    .sc-card-footer { padding:12px 16px; border-top:1px solid var(--border); }
    .sc-view-btn {
      display:flex; align-items:center; justify-content:center; gap:7px;
      width:100%; padding:9px; border:1px solid var(--border);
      background:var(--white); border-radius:9px;
      font-family:var(--ff-b); font-size:13.5px; font-weight:500;
      color:var(--txt2); cursor:pointer; transition:all .2s; margin-bottom:8px;
    }
    .sc-view-btn:hover { background:var(--g50); border-color:var(--g400); color:var(--g700); }
    .sc-action-row { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
    .sc-action-btn {
      display:flex; align-items:center; justify-content:center; gap:5px;
      padding:9px 4px; border:none; border-radius:9px;
      font-family:var(--ff-b); font-size:13px; font-weight:600; cursor:pointer; transition:all .2s;
    }
    .sc-chat-btn     { background:var(--e100); color:var(--e700); }
    .sc-chat-btn:hover     { background:#e8d5cc; }
    .sc-contract-btn { background:var(--g100); color:var(--g800); }
    .sc-contract-btn:hover { background:#bbf7d0; }

    /* ── List row ────────────────────────────────────────────────────── */
    .sc-list-row {
      background:var(--white); border:1px solid var(--border); border-radius:var(--r);
      padding:12px 14px; display:flex; align-items:center; gap:12px;
      cursor:pointer; transition:all .2s;
    }
    .sc-list-row:hover { border-color:var(--g400); box-shadow:0 4px 14px rgba(0,0,0,.06); }
    .sc-list-icon {
      width:40px; height:40px; flex-shrink:0; border-radius:10px;
      background:var(--g50); display:flex; align-items:center; justify-content:center; color:var(--g700);
    }
    .sc-list-main { flex:1; min-width:0; }
    .sc-list-name { font-weight:600; font-size:14px; color:var(--txt); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .sc-list-loc  { display:flex; align-items:center; gap:4px; font-size:12px; color:var(--txt3); margin-top:2px; }
    .sc-list-grade,.sc-list-qty,.sc-list-price { flex-shrink:0; }
    .sc-list-qty strong { font-family:var(--ff-d); font-size:15px; color:var(--g700); }
    .sc-list-qty span   { font-size:12px; color:var(--txt3); }
    .sc-list-price strong { font-size:14px; color:var(--e700); }
    .sc-list-price span   { font-size:12px; color:var(--txt3); }
    .sc-no-price { font-size:12px; color:var(--txt3); font-style:italic; }
    .sc-list-actions { display:flex; gap:6px; flex-shrink:0; }
    .sc-btn-sm {
      width:34px; height:34px; border:1px solid var(--border); background:none;
      border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;
      color:var(--txt2); transition:all .2s;
    }
    .sc-btn-chat:hover     { background:var(--e100); border-color:var(--e400); color:var(--e700); }
    .sc-btn-contract:hover { background:var(--g100); border-color:var(--g600); color:var(--g800); }
    @media (max-width:540px) { .sc-list-grade,.sc-list-price { display:none; } }

    /* ── States ──────────────────────────────────────────────────────── */
    .bm-empty {
      text-align:center; padding:70px 24px;
      background:var(--white); border-radius:var(--r); border:1px solid var(--border);
    }
    .bm-empty-icon { color:var(--border); margin-bottom:16px; }
    .bm-empty h3 { font-family:var(--ff-d); font-size:20px; margin-bottom:8px; }
    .bm-empty p { font-size:14px; color:var(--txt3); }
    .bm-loading {
      display:flex; align-items:center; justify-content:center; padding:100px 40px;
      background:var(--white); border-radius:var(--r); border:1px solid var(--border);
    }
    .bm-spinner {
      width:38px; height:38px; border:3px solid var(--g100);
      border-top-color:var(--g600); border-radius:50%;
      animation:bm-spin .8s linear infinite;
    }
    @keyframes bm-spin { to{transform:rotate(360deg)} }
    .bm-error {
      display:flex; flex-direction:column; align-items:center; gap:14px;
      padding:70px 24px; background:var(--white);
      border-radius:var(--r); border:1px solid #fecaca;
    }
    .bm-error p { color:#991b1b; font-size:14px; text-align:center; }
    .bm-retry-btn {
      display:flex; align-items:center; gap:8px; padding:10px 20px;
      background:var(--g700); color:white; border:none; border-radius:9px;
      font-family:var(--ff-b); font-size:14px; font-weight:500; cursor:pointer;
    }
    .bm-retry-btn:hover { background:var(--g800); }

    /* ── Pagination ──────────────────────────────────────────────────── */
    .pg-wrap {
      display:flex; justify-content:space-between; align-items:center;
      margin-top:22px; flex-wrap:wrap; gap:10px;
    }
    .pg-size-wrap { display:flex; align-items:center; gap:7px; font-size:13px; color:var(--txt3); }
    .pg-size-sel {
      padding:6px 10px; border:1px solid var(--border); border-radius:8px;
      font-size:13px; font-family:var(--ff-b); background:var(--white); outline:none; cursor:pointer;
    }
    .pg-btns { display:flex; gap:4px; flex-wrap:wrap; }
    .pg-btn {
      min-width:34px; height:34px; border:1px solid var(--border); background:var(--white);
      border-radius:8px; font-size:13px; color:var(--txt2); cursor:pointer;
      display:flex; align-items:center; justify-content:center; transition:all .2s;
      font-family:var(--ff-b);
    }
    .pg-btn:hover:not(:disabled) { border-color:var(--g600); color:var(--g700); background:var(--g50); }
    .pg-btn.active { background:var(--g700); border-color:var(--g700); color:white; }
    .pg-btn:disabled { opacity:.4; cursor:not-allowed; }
    .pg-ellipsis { display:flex; align-items:center; justify-content:center; width:34px; color:var(--txt3); }

    /* ── Detail Modal ────────────────────────────────────────────────── */
    .sdm-overlay {
      position:fixed; inset:0; z-index:1000;
      background:rgba(10,26,10,.65); backdrop-filter:blur(6px);
      display:flex; align-items:center; justify-content:center; padding:16px;
    }
    .sdm-panel {
      background:var(--white); border-radius:20px;
      width:100%; max-width:540px; max-height:90vh; overflow-y:auto;
      box-shadow:0 32px 80px rgba(0,0,0,.3);
      animation:sdm-in .25s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes sdm-in { from{transform:scale(.92);opacity:0} to{transform:scale(1);opacity:1} }
    .sdm-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:16px 20px; border-bottom:1px solid var(--border);
      position:sticky; top:0; background:var(--white); z-index:2; border-radius:20px 20px 0 0;
    }
    .sdm-header-badge {
      display:inline-flex; align-items:center; gap:6px;
      padding:5px 12px; border-radius:100px; font-size:12.5px; font-weight:600;
    }
    .sdm-grade-icon { font-size:10px; }
    .sdm-close {
      width:34px; height:34px; border-radius:9px; border:1px solid var(--border);
      background:none; cursor:pointer; display:flex; align-items:center; justify-content:center;
      color:var(--txt3); transition:all .2s;
    }
    .sdm-close:hover { background:#fee2e2; border-color:#fecaca; color:#dc2626; }
    .sdm-hero {
      padding:18px 20px; display:flex; align-items:flex-start; gap:14px;
      background:linear-gradient(135deg,var(--g50),var(--white));
      border-bottom:1px solid var(--border);
    }
    .sdm-hero-icon {
      width:54px; height:54px; border-radius:14px; flex-shrink:0;
      background:linear-gradient(135deg,var(--g100),var(--g50));
      display:flex; align-items:center; justify-content:center; color:var(--g700);
    }
    .sdm-hero-text { flex:1; min-width:0; }
    .sdm-title {
      font-family:var(--ff-d); font-size:20px; font-weight:700;
      color:var(--txt); line-height:1.2; margin-bottom:4px;
    }
    .sdm-location { display:flex; align-items:center; gap:5px; font-size:13px; color:var(--txt3); }
    .sdm-hero-price { text-align:right; flex-shrink:0; }
    .sdm-price-num { font-family:var(--ff-d); font-size:22px; font-weight:700; color:var(--g700); display:block; }
    .sdm-price-unit { font-size:12px; color:var(--txt3); }
    .sdm-metrics { display:flex; flex-wrap:wrap; border-bottom:1px solid var(--border); }
    .sdm-metric {
      flex:1; min-width:90px; display:flex; flex-direction:column; align-items:center;
      padding:12px 8px; gap:2px; color:var(--g700);
      border-right:1px solid var(--border); text-align:center;
    }
    .sdm-metric:last-child { border-right:none; }
    .sdm-metric strong { font-family:var(--ff-d); font-size:14px; color:var(--txt); }
    .sdm-metric span   { font-size:11px; color:var(--txt3); }
    .sdm-details { padding:14px 20px; border-bottom:1px solid var(--border); }
    .sdm-detail-row {
      display:flex; justify-content:space-between; align-items:center;
      padding:9px 0; border-bottom:1px solid var(--border);
    }
    .sdm-detail-row:last-child { border-bottom:none; }
    .sdm-detail-label { display:flex; align-items:center; gap:6px; font-size:13px; color:var(--txt3); }
    .sdm-detail-val { font-size:13.5px; font-weight:500; color:var(--txt); text-align:right; }
    .sdm-description { padding:14px 20px; border-bottom:1px solid var(--border); }
    .sdm-desc-label { font-size:11px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--txt3); margin-bottom:7px; }
    .sdm-desc-text { font-size:14px; color:var(--txt2); line-height:1.65; }
    .sdm-qty-bar-wrap { padding:14px 20px; border-bottom:1px solid var(--border); }
    .sdm-qty-bar-label {
      display:flex; align-items:center; gap:6px;
      font-size:12px; color:var(--txt3); margin-bottom:9px; font-weight:500;
    }
    .sdm-qty-tag {
      margin-left:auto; padding:2px 9px; border-radius:100px; font-size:11px; font-weight:700;
    }
    .sdm-qty-tag.high { background:#dcfce7; color:#166534; }
    .sdm-qty-tag.med  { background:#fef9c3; color:#854d0e; }
    .sdm-qty-tag.low  { background:#fee2e2; color:#991b1b; }
    .sdm-qty-bar-track { height:8px; background:var(--border); border-radius:100px; overflow:hidden; margin-bottom:5px; }
    .sdm-qty-bar-fill  { height:100%; border-radius:100px; transition:width .4s; }
    .sdm-qty-bar-nums  { display:flex; justify-content:space-between; font-size:11px; color:var(--txt3); }
    .sdm-cta {
      padding:14px 20px; display:grid; grid-template-columns:1fr 1fr; gap:10px;
      position:sticky; bottom:0; background:var(--white);
      border-top:1px solid var(--border); border-radius:0 0 20px 20px;
    }
    .sdm-btn {
      display:flex; align-items:center; justify-content:center; gap:8px;
      padding:13px; border:none; border-radius:12px;
      font-family:var(--ff-b); font-size:14px; font-weight:600; cursor:pointer; transition:all .2s;
    }
    .sdm-btn-chat     { background:var(--e100); color:var(--e700); }
    .sdm-btn-chat:hover     { background:#e4c5b5; }
    .sdm-btn-contract { background:var(--g700); color:white; }
    .sdm-btn-contract:hover { background:var(--g800); transform:translateY(-1px); box-shadow:0 6px 16px rgba(22,101,52,.25); }

    /* ── Toast ───────────────────────────────────────────────────────── */
    .bm-toast {
      position:fixed; bottom:24px; right:16px; z-index:2000;
      display:flex; align-items:center; gap:10px;
      padding:13px 18px; border-radius:12px; max-width:300px;
      box-shadow:0 8px 30px rgba(0,0,0,.15);
      animation:toast-in .3s ease;
      font-family:var(--ff-b); font-size:14px; font-weight:500;
    }
    @keyframes toast-in { from{transform:translateY(10px);opacity:0} to{transform:translateY(0);opacity:1} }
    .bm-toast.success { background:#166534; color:white; }
    .bm-toast.info    { background:#1e3a5f; color:white; }
    .bm-toast.error   { background:#991b1b; color:white; }
  `;

  return (
    <div className="bm-root">
      <ToastContainer position="top-right" autoClose={5000} />
      <style>{css}</style>

      {/* Hero Section */}
      <div className="bm-hero">
        <div className="bm-hero-inner">
          <div className="bm-hero-top">
            <div>
              <div className="bm-hero-label">
                <Leaf size={13} />
                {t("marketplace_badge", "Rwanda Agri Marketplace")}
              </div>
              <h1>
                {t("hero_title_part1", "Find")}{" "}
                <em>{t("hero_title_part2", "fresh produce")}</em>
                <br />{t("hero_title_part3", "directly from farmers")}
              </h1>
              <p className="bm-hero-sub">
                {t("hero_description", "Browse verified agricultural stocks, connect with farmers, and secure contracts — all in one place.")}
              </p>
            </div>
            <div className="bm-hero-stats">
              <div className="bm-stat-chip">
                <span className="bm-stat-chip-num">{allStocks.length}</span>
                <span className="bm-stat-chip-label">{t("active_listings_label", "Active listings")}</span>
              </div>
              <div className="bm-stat-chip">
                <span className="bm-stat-chip-num">{fmt(Math.round(totalQty))} kg</span>
                <span className="bm-stat-chip-label">{t("total_available_label", "Total available")}</span>
              </div>
              {avgPrice > 0 && (
                <div className="bm-stat-chip">
                  <span className="bm-stat-chip-num">{fmt(Math.round(avgPrice))}</span>
                  <span className="bm-stat-chip-label">{t("avg_price_label", "Avg price RWF/kg")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bm-search-outer">
        <div className="bm-search-wrap">
          <Search size={17} className="bm-search-icon" />
          <input
            className="bm-search-input"
            placeholder={t("search_placeholder", "Search by product, location or farmer…")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="bm-search-clear" onClick={() => setSearch("")}><X size={13} /></button>
          )}
          <div className="bm-search-divider" />
          <button
            className={`bm-search-filter-toggle ${filterOpen || activeFilterCount > 0 ? "active" : ""}`}
            onClick={() => setFilterOpen(o => !o)}
          >
            <SlidersHorizontal size={14} />
            {t("filters_label", "Filters")}
            {activeFilterCount > 0 && <span className="bm-filter-badge">{activeFilterCount}</span>}
            {filterOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="bm-body">
        <div className="bm-layout">
          {filterOpen && !isMobile && (
            <FilterPanel
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
              counts={{ active: activeFilterCount }}
              isMobile={false}
            />
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="bm-toolbar">
              <div className="bm-toolbar-left">
                {loading
                  ? t("loading_label", "Loading…")
                  : (
                    <>
                      <strong>{processed.length}</strong>{" "}
                      {t("stocks_found_label", "stocks found")}
                      {processed.length !== allStocks.length
                        && ` (${t("of_label", "of")} ${allStocks.length})`}
                    </>
                  )}
              </div>
              <div className="bm-toolbar-right">
                <select className="bm-sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="bm-view-toggle">
                  <button className={`bm-view-btn ${viewMode === "grid" ? "active" : ""}`}
                    onClick={() => setViewMode("grid")}><Grid3X3 size={15} /></button>
                  <button className={`bm-view-btn ${viewMode === "list" ? "active" : ""}`}
                    onClick={() => setViewMode("list")}><List size={15} /></button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="bm-loading"><div className="bm-spinner" /></div>
            ) : error ? (
              <div className="bm-error">
                <AlertCircle size={36} color="#dc2626" />
                <p>{error}</p>
                <button className="bm-retry-btn" onClick={fetchStocks}>
                  <RefreshCw size={15} /> {t("retry_btn", "Retry")}
                </button>
              </div>
            ) : processed.length === 0 ? (
              <div className="bm-empty">
                <div className="bm-empty-icon"><Package size={56} /></div>
                <h3>{t("no_stocks_title", "No stocks found")}</h3>
                <p>{t("no_stocks_message", "Try adjusting your search or clearing the filters.")}</p>
              </div>
            ) : (
              <>
                <div className={viewMode === "grid" ? "bm-grid" : "bm-list"}>
                  {paginated.map(stock => (
                    <StockCard
                      key={stock.id}
                      stock={stock}
                      viewMode={viewMode}
                      onView={setSelected}
                      onContract={handleContract}
                      onChat={handleChat}
                    />
                  ))}
                </div>
                <Pagination
                  current={page} total={totalPages}
                  pageSize={pageSize}
                  onPage={setPage}
                  onSize={p => { setPageSize(p); setPage(1); }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {filterOpen && isMobile && (
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          counts={{ active: activeFilterCount }}
          isMobile={true}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {/* Stock Detail Modal */}
      {selected && (
        <StockDetailModal
          stock={selected}
          onClose={() => setSelected(null)}
          onContract={s => { handleContract(s); setSelected(null); }}
          onChat={s => { handleChat(s); setSelected(null); }}
        />
      )}

      {/* Contract Creation Modal */}
      <StockContractModal
        isOpen={showContractModal}
        onClose={() => {
          setShowContractModal(false);
          setSelectedStockForContract(null);
        }}
        onSubmit={handleCreateContract}
        stock={selectedStockForContract}
        apiClient={apiClient}
      />

      {/* Toast */}
      {toastMsg && (
        <div className={`bm-toast ${toastMsg.type}`}>
          {toastMsg.type === "success" ? <CheckCircle2 size={16} /> : <Info size={16} />}
          {toastMsg.msg}
        </div>
      )}
    </div>
  );
}