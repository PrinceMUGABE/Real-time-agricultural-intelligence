/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    Plus, X, Search, ChevronLeft, ChevronRight,
    ChevronsLeft, ChevronsRight, Eye, Edit2, Trash2,
    CheckCircle, XCircle, Clock, AlertCircle, Loader2,
    FileText, DollarSign, Package, Truck, User,
    MapPin, Calendar, CreditCard, Smartphone, RefreshCw,
    Filter, Download, ArrowUpRight, ArrowDownRight,
    TrendingUp, Handshake, ShieldCheck, Info, ChevronDown,
    ChevronUp, MessageCircle, Phone, Mail, Globe,
    Star, Award, BarChart3, PieChart, Percent
} from "lucide-react";
import locationData from "../../common/locationData.json";




// API Base URL
const API_BASE_URL = "http://127.0.0.1:8000";

const PAYPACK_CLIENT_ID = "e428eef2-28f0-11f1-a747-deadd43720af";
const PAYPACK_CLIENT_SECRET = "8e55dbfe8df9116cc5fd26e474fca8deda39a3ee5e6b4b0d3255bfef95601890afd80709";


const paypackAPI = {
    // Authenticate and get token
    authenticate: async () => {
        try {
            const response = await axios.post(
                'https://payments.paypack.rw/api/auth/agents/authorize',
                {
                    client_id: PAYPACK_CLIENT_ID,
                    client_secret: PAYPACK_CLIENT_SECRET
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Paypack authentication error:', error);
            throw error;
        }
    },

    // Make payment
    cashin: async (phoneNumber, amount, accessToken) => {
        try {
            const response = await axios.post(
                'https://payments.paypack.rw/api/transactions/cashin',
                {
                    number: phoneNumber,
                    amount: amount,
                    environment: "development"
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Paypack cashin error:', error);
            throw error;
        }
    },

    // Check transaction status
    checkTransaction: async (ref, accessToken) => {
        try {
            const response = await axios.get(
                `https://payments.paypack.rw/api/transactions/${ref}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Transaction check error:', error);
            throw error;
        }
    }
};



// Status colors
const statusColors = {
    pending: { bg: "#fff8e1", color: "#b76e0a", icon: Clock },
    accepted: { bg: "#e8f5e9", color: "#2e7d32", icon: CheckCircle },
    rejected: { bg: "#ffebee", color: "#c62828", icon: XCircle },
    completed: { bg: "#e3f2fd", color: "#1565c0", icon: CheckCircle },
    failed: { bg: "#ffebee", color: "#c62828", icon: AlertCircle },
    in_progress: { bg: "#e8f5e9", color: "#2e7d32", icon: RefreshCw }
};

// Role colors
const roleColors = {
    admin: { bg: "#e8f5e9", color: "#2e7d32" },
    farmer: { bg: "#e3f2fd", color: "#1565c0" },
    buyer: { bg: "#fff8e1", color: "#b76e0a" }
};

// Payment method icons
const paymentMethodIcons = {
    mobile_money: Smartphone,
    bank_transfer: CreditCard,
    cash: DollarSign
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSpinner() {
    return (
        <div className="loading-spinner">
            <div className="spinner"></div>
        </div>
    );
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

function StatusBadge({ status, type = "contract" }) {
    const config = statusColors[status] || statusColors.pending;
    const Icon = config.icon;

    const statusLabels = {
        pending: "Pending",
        accepted: "Accepted",
        rejected: "Rejected",
        completed: "Completed",
        failed: "Failed",
        in_progress: "In Progress"
    };

    return (
        <div className="status-badge" style={{ backgroundColor: config.bg, color: config.color }}>
            <Icon size={12} />
            <span>{statusLabels[status] || status}</span>
        </div>
    );
}

function SummaryCard({ title, value, icon, color, bgColor, onClick }) {
    return (
        <div className="summary-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
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

function Pagination({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange, totalItems }) {
    const { t } = useTranslation();
    const pageSizeOptions = [5, 10, 20, 50];

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

                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                        pageNum = i + 1;
                    } else if (currentPage <= 3) {
                        pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                    } else {
                        pageNum = currentPage - 2 + i;
                    }

                    if (pageNum > 0 && pageNum <= totalPages) {
                        return (
                            <button
                                key={pageNum}
                                className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                                onClick={() => onPageChange(pageNum)}
                            >
                                {pageNum}
                            </button>
                        );
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

// ─── Contract Form Modal ──────────────────────────────────────────────────────

// ─── ContractFormModal — complete rewrite ────────────────────────────────────
//
// Fixes applied
// ─────────────────────────────────────────────────────────────────────────────
// 1. PREFERRED LOCATION  — buyer_preferred_location (or buyer_preferred_delivery_location)
//    is pre-filled as delivery_location and shown as a green badge.
//
// 2. LOCATION CHANGE MUST BE COMPLETE — when the buyer clicks "Change", the
//    LocationSelectorStrict component is shown.  It only fires onValidChange
//    (and therefore only sets the new location) after ALL THREE of
//    province → district → sector are chosen.  The submit button is disabled
//    while the selector is open.
//
// 3. DELIVER PERSON ID — resolved via useMemo, never stored in formData:
//      delivery_type === "self"   → deliver = buyer  id
//      delivery_type === "farmer" → deliver = farmer id
//
// 4. CONSOLE LOGGING — two log groups:
//      📦  fires when the modal opens (confirms stockData prop)
//      📝  fires on submit (shows final payload)
//
// Usage
// ─────────────────────────────────────────────────────────────────────────────
// Pass apiClient as a prop so the modal can call /users/me/ and /users/
// (previously apiClient was referenced from the outer closure; passing it
// explicitly makes the component self-contained):
//
//   <ContractFormModal
//     isOpen={showCreateModal}
//     onClose={() => { setShowCreateModal(false); setStockData(null); }}
//     onSubmit={handleCreateContract}
//     mode="create"
//     stockData={stockData}
//     apiClient={apiClient}          ← add this prop
//   />
//
// ─────────────────────────────────────────────────────────────────────────────


// ══════════════════════════════════════════════════════════════════════════════
//  LocationSelectorStrict
//  Fires onValidChange ONLY when province + district + sector are all selected.
//  No "anywhere" option — delivery locations must be specific.
// ══════════════════════════════════════════════════════════════════════════════
// WITH this complete version (has the full JSX return):
function LocationSelectorStrict({ onValidChange, error, t, initialLocation = "" }) {
    const parseInitial = (loc) => {
        if (!loc) return { province: "", district: "", sector: "" };
        const parts = loc.split(",").map(p => p.trim());
        return {
            province: parts[0] || "",
            district: parts[1] || "",
            sector:   parts[2] || "",
        };
    };

    const initial = parseInitial(initialLocation);
    const [province, setProvince] = useState(initial.province);
    const [district, setDistrict] = useState(initial.district);
    const [sector,   setSector]   = useState(initial.sector);

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
        ? (t("step_3_select_sector")   || "Step 3 of 3 — Select a sector to confirm")
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


// ══════════════════════════════════════════════════════════════════════════════
//  ContractFormModal
// ══════════════════════════════════════════════════════════════════════════════
function ContractFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    mode = "create",
    stockData,
    apiClient,            // ← passed from parent (BuyerContracts)
}) {
    const { t } = useTranslation();

    // ── blank form template ───────────────────────────────────────────────────
    const emptyForm = useMemo(() => ({
        buyer: null,
        farmer: null,
        stock: null,
        crop_name: "",
        price_per_kg: "",
        quantity_kg: "",
        delivery_location: "",
        delivery_date: "",
        payment_option: "full",
        payment_due_date: "",
        notes: "",
        delivery_type: "self",
        // display-only — stripped before submit
        farmer_name: "",
        farmer_phone: "",
        farmer_email: "",
        farmer_location: "",
        buyer_preferred_location: "",
    }), []);

    // ── state ─────────────────────────────────────────────────────────────────
    const [formData, setFormData] = useState(emptyForm);
    const [loading, setLoading] = useState(false);
    const [farmers, setFarmers] = useState([]);
    const [searchFarmer, setSearchFarmer] = useState("");
    const [totalAmount, setTotalAmount] = useState(0);
    const [availableQuantity, setAvailableQuantity] = useState(null);
    const [locationError, setLocationError] = useState("");

    // true  → LocationSelectorStrict is visible (buyer must complete all 3 levels)
    // false → confirmed location badge is visible
    const [showLocationSelector, setShowLocationSelector] = useState(false);

    // ── derived: who is the deliver person? ──────────────────────────────────
    // Computed fresh on every render — never stored in formData to avoid
    // async state-update races when delivery_type, buyer, or farmer change.
    // AFTER — extract .id if either value was accidentally stored as an object
    const resolvedDeliver = useMemo(() => {
        const raw = formData.delivery_type === "farmer"
            ? formData.farmer
            : formData.buyer;
        if (!raw) return null;
        // If raw is an object (e.g. {id: 4, full_name: ...}), unwrap it
        return typeof raw === "object" ? raw.id : raw;
    }, [formData.delivery_type, formData.farmer, formData.buyer]);

    // ── running total ─────────────────────────────────────────────────────────
    useEffect(() => {
        const qty = parseFloat(formData.quantity_kg) || 0;
        const price = parseFloat(formData.price_per_kg) || 0;
        setTotalAmount(qty * price);
    }, [formData.quantity_kg, formData.price_per_kg]);

    // ── initialise / re-initialise when modal opens ───────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        fetchFarmers();
        fetchCurrentUser();
        setLocationError("");
        setSearchFarmer("");

        if (mode === "edit" && initialData) {
            // ── EDIT mode ─────────────────────────────────────────────────────
            setFormData({
                ...emptyForm,
                ...initialData,
                delivery_location: initialData.delivery_location || "",
                delivery_date: initialData.delivery_date || "",
                payment_option: initialData.payment_option || "full",
                payment_due_date: initialData.payment_due_date || "",
                notes: initialData.notes || "",
                delivery_type: initialData.delivery_type || "self",
            });
            if (initialData.quantity_kg && initialData.price_per_kg) {
                setTotalAmount(Number(initialData.quantity_kg) * Number(initialData.price_per_kg));
            }
            setShowLocationSelector(false);

        } else if (stockData) {
            // ── CREATE from market-matching / stock page ──────────────────────

            // LOG 2: confirm stockData prop reached the modal
            console.group("📦 ContractFormModal — stockData on modal open");
            console.log("Full stockData object                 :", stockData);
            console.log("id  (stock id)                        :", stockData.id);
            console.log("product_name                          :", stockData.product_name);
            console.log("price_per_kg                          :", stockData.price_per_kg);
            console.log("available_quantity                    :", stockData.available_quantity);
            console.log("farmer  (id)                          :", stockData.farmer);
            console.log("farmer_id                             :", stockData.farmer_id);
            console.log("farmer_name                           :", stockData.farmer_name);
            console.log("farmer_phone                          :", stockData.farmer_phone);
            console.log("farmer_email                          :", stockData.farmer_email);
            console.log("farmer_location                       :", stockData.farmer_location);
            console.log("buyer   (id)                          :", stockData.buyer);
            console.log("buyer_id                              :", stockData.buyer_id);
            console.log("buyer_name                            :", stockData.buyer_name);
            console.log("buyer_preferred_location              :", stockData.buyer_preferred_location);
            console.log("buyer_preferred_delivery_location     :", stockData.buyer_preferred_delivery_location);
            console.log("Buyer_location                        :", stockData.buyer_location);
            console.log("match_score                           :", stockData.match_score);
            console.groupEnd();

            // Accept either field name the backend might send
            const preferredLocation =
                stockData.buyer_preferred_location ||
                stockData.buyer_preferred_delivery_location ||
                stockData.buyer_location ||
                "";

            setFormData({
                ...emptyForm,
                stock: stockData.id || null,
                crop_name: stockData.product_name || "",
                price_per_kg: stockData.price_per_kg || "",
                // accept farmer as a plain id or nested object
                farmer: stockData.farmer || stockData.farmer_id || null,
                farmer_name: stockData.farmer_name || "",
                farmer_phone: stockData.farmer_phone || "",
                farmer_email: stockData.farmer_email || "",
                farmer_location: stockData.farmer_location || "",
                // accept buyer as a plain id or nested object
                buyer: stockData.buyer || stockData.buyer_id || null,
                buyer_preferred_location: preferredLocation,
                delivery_location: preferredLocation,        // ← pre-fill
                delivery_type: "self",
                quantity_kg: "",
            });
            setAvailableQuantity(stockData.available_quantity || null);

            // Show badge if preferred location exists; otherwise open selector
            setShowLocationSelector(!preferredLocation);

        } else {
            // ── CREATE manually (no stockData) ────────────────────────────────
            console.log("📦 ContractFormModal — no stockData (manual creation)");
            setFormData(emptyForm);
            setShowLocationSelector(true); // buyer must pick a location
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, mode]);

    // ── API helpers ───────────────────────────────────────────────────────────
    const fetchCurrentUser = async () => {
        try {
            const res = await apiClient.get("profile/");
            setFormData(prev => ({ ...prev, buyer: res.data.id }));
        } catch (err) {
            console.error("fetchCurrentUser error:", err);
        }
    };

    const fetchFarmers = async () => {
        try {
            const res = await apiClient.get("/users/", {
                params: { role: "farmer", is_active: true },
            });
            setFarmers(res.data.users || []);
        } catch (err) {
            console.error("fetchFarmers error:", err);
        }
    };

    // ── field helpers ─────────────────────────────────────────────────────────
    const handleChange = (field, value) =>
        setFormData(prev => ({ ...prev, [field]: value }));

    const handleFarmerSelect = farmer => {
        setFormData(prev => ({
            ...prev,
            farmer: farmer.id,
            farmer_name: farmer.full_name,
            farmer_phone: farmer.phone_number,
            farmer_email: farmer.email,
            farmer_location: farmer.location,
        }));
        setSearchFarmer(farmer.full_name);
    };

    // Called only when province + district + sector are all chosen
    const handleValidLocationChange = locationString => {
        setFormData(prev => ({ ...prev, delivery_location: locationString }));
        setLocationError("");
        setShowLocationSelector(false); // collapse selector, show badge
    };

    const filteredFarmers = farmers.filter(f =>
        f.full_name?.toLowerCase().includes(searchFarmer.toLowerCase())
    );

    const isPreferredLocation =
        !!formData.buyer_preferred_location &&
        formData.delivery_location === formData.buyer_preferred_location;

    // ── submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async e => {
        e.preventDefault();

        // Guard: location must be fully confirmed
        if (!formData.delivery_location?.trim()) {
            setLocationError(t("delivery_location_required") || "Delivery location is required.");
            toast.error(t("delivery_location_required") || "Delivery location is required.");
            return;
        }
        // Guard: deliver person must be resolvable
        if (!resolvedDeliver) {
            toast.error(t("deliver_person_required") || "Deliver person could not be resolved.");
            return;
        }
        // Guard: quantity vs available stock
        if (availableQuantity != null && parseFloat(formData.quantity_kg) > availableQuantity) {
            toast.error(
                t("quantity_exceeds_available_stock", { available: availableQuantity }) ||
                `Quantity exceeds available stock (${availableQuantity} kg).`
            );
            return;
        }

        const submitData = {
            buyer: formData.buyer,
            farmer: formData.farmer,
            stock: formData.stock,
            crop_name: formData.crop_name,
            price_per_kg: parseFloat(formData.price_per_kg),
            quantity_kg: parseFloat(formData.quantity_kg),
            deliver: resolvedDeliver,           // ← buyer id OR farmer id
            delivery_location: formData.delivery_location,
            delivery_date: formData.delivery_date || null,
            payment_option: formData.payment_option,
            payment_due_date: formData.payment_due_date || null,
            notes: formData.notes || "",
            delivery_type: formData.delivery_type,
        };

        console.log("📝 ContractFormModal — submitting payload:", submitData);

        setLoading(true);
        try {
            await onSubmit(submitData);
            onClose();
        } catch (err) {
            console.error("ContractFormModal submit error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // ── tiny inline style helpers ─────────────────────────────────────────────
    const radioCardStyle = (active, borderColor, bgColor) => ({
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 14px",
        border: `2px solid ${active ? borderColor : "#e2e8f0"}`,
        borderRadius: "10px",
        background: active ? bgColor : "#f8fafc",
        cursor: "pointer",
        transition: "all 0.2s ease",
        flex: 1,
    });

    const infoBoxStyle = (bg, color) => ({
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 12px",
        background: bg,
        borderRadius: "8px",
        fontSize: "12px",
        color,
        marginTop: "10px",
    });

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <div
            className="modal-overlay"
            onClick={e => e.target === e.currentTarget && onClose()}
        >
            <div className="modal-card contract-modal">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="modal-head">
                    <div>
                        <h2>
                            {mode === "create"
                                ? (t("create_contract") || "Create Contract")
                                : (t("update_contract") || "Update Contract")}
                        </h2>
                        {stockData?.product_name && (
                            <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0" }}>
                                {stockData.product_name}
                                {stockData.match_score
                                    ? ` · ${stockData.match_score}% ${t("match") || "match"}`
                                    : ""}
                            </p>
                        )}
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* ── Body ───────────────────────────────────────────────── */}
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>

                        {/* ══════════════════════════════════════════════════
                            CREATE-ONLY FIELDS
                        ══════════════════════════════════════════════════ */}
                        {mode === "create" && (
                            <>
                                {/* Farmer ─────────────────────────────────── */}
                                <div className="form-group">
                                    <label>{t("farmer") || "Farmer"} *</label>

                                    {formData.farmer_name ? (
                                        /* Read-only card when farmer came from stockData */
                                        <div className="farmer-readonly-card">
                                            <div className="farmer-info">
                                                <User size={16} className="farmer-icon" />
                                                <div className="farmer-details">
                                                    <span className="farmer-name">
                                                        {formData.farmer_name}
                                                    </span>
                                                    {formData.farmer_phone && (
                                                        <span className="farmer-phone">
                                                            <Phone size={11} />
                                                            {formData.farmer_phone}
                                                        </span>
                                                    )}
                                                    {formData.farmer_location && (
                                                        <span className="farmer-phone">
                                                            <MapPin size={11} />
                                                            {formData.farmer_location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Searchable dropdown for manual creation */
                                        <div className="search-select-wrapper">
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder={t("search_farmer") || "Search farmer…"}
                                                value={searchFarmer}
                                                onChange={e => setSearchFarmer(e.target.value)}
                                                required
                                            />
                                            {searchFarmer && filteredFarmers.length > 0 && (
                                                <div className="search-select-dropdown">
                                                    {filteredFarmers.map(farmer => (
                                                        <div
                                                            key={farmer.id}
                                                            className={`search-option ${formData.farmer === farmer.id ? "selected" : ""
                                                                }`}
                                                            onClick={() => handleFarmerSelect(farmer)}
                                                        >
                                                            <div className="option-name">
                                                                {farmer.full_name}
                                                            </div>
                                                            <div className="option-detail">
                                                                <Phone size={11} /> {farmer.phone_number}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Crop name ───────────────────────────────── */}
                                <div className="form-group">
                                    <label>{t("crop_name") || "Crop Name"} *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.crop_name}
                                        onChange={e => handleChange("crop_name", e.target.value)}
                                        required
                                        readOnly={!!stockData}
                                        style={stockData
                                            ? { background: "#f8fafc", color: "#64748b" }
                                            : {}}
                                    />
                                </div>

                                {/* Price + Quantity ─────────────────────────── */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t("price_per_kg") || "Price / kg"} (RWF) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="form-input"
                                            value={formData.price_per_kg}
                                            onChange={e => handleChange("price_per_kg", e.target.value)}
                                            required
                                            readOnly={!!stockData}
                                            style={stockData
                                                ? { background: "#f8fafc", color: "#64748b" }
                                                : {}}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t("quantity_kg") || "Quantity"} (kg) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="form-input"
                                            value={formData.quantity_kg}
                                            onChange={e => handleChange("quantity_kg", e.target.value)}
                                            required
                                        />
                                        {availableQuantity != null && (
                                            <small className="form-hint">
                                                {t("available_stock") || "Available"}:{" "}
                                                <strong>{availableQuantity.toLocaleString()} kg</strong>
                                            </small>
                                        )}
                                    </div>
                                </div>

                                {/* Total amount ────────────────────────────── */}
                                {totalAmount > 0 && (
                                    <div className="total-amount-display">
                                        <div className="total-amount-label">
                                            {t("total_amount") || "Total Amount"}:
                                        </div>
                                        <div className="total-amount-value">
                                            {totalAmount.toLocaleString()} RWF
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ══════════════════════════════════════════════════
                            EDIT-ONLY FIELDS
                        ══════════════════════════════════════════════════ */}
                        {mode === "edit" && (
                            <>
                                <div className="form-group">
                                    <label>{t("crop_name") || "Crop Name"}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.crop_name}
                                        onChange={e => handleChange("crop_name", e.target.value)}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>{t("price_per_kg") || "Price / kg"} (RWF)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={formData.price_per_kg}
                                            onChange={e => handleChange("price_per_kg", e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{t("quantity_kg") || "Quantity"} (kg)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={formData.quantity_kg}
                                            onChange={e => handleChange("quantity_kg", e.target.value)}
                                        />
                                    </div>
                                </div>
                                {totalAmount > 0 && (
                                    <div className="total-amount-display">
                                        <div className="total-amount-label">
                                            {t("total_amount") || "Total Amount"}:
                                        </div>
                                        <div className="total-amount-value">
                                            {totalAmount.toLocaleString()} RWF
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ══════════════════════════════════════════════════
                            DELIVERY LOCATION
                        ══════════════════════════════════════════════════ */}
                        <div className="form-group">
                            <label>{t("delivery_location") || "Delivery Location"} *</label>

                            {/* A) Confirmed location badge (selector is closed) */}
                            {formData.delivery_location && !showLocationSelector && (
                                <div className="delivery-location-display">
                                    <div className="current-location">
                                        <MapPin size={14} color="#2d5a2d" />
                                        <span style={{ flex: 1, fontSize: "14px", color: "#1e293b" }}>
                                            {formData.delivery_location}
                                        </span>
                                        <button
                                            type="button"
                                            className="change-location-btn"
                                            onClick={() => setShowLocationSelector(true)}
                                        >
                                            <Edit2 size={12} />
                                            {t("change_location") || "Change"}
                                        </button>
                                    </div>
                                    {isPreferredLocation && (
                                        <small style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            padding: "4px 14px 8px",
                                            fontSize: "11px",
                                            color: "#2e7d32",
                                        }}>
                                            <Info size={11} />
                                            {t("using_preferred_location") ||
                                                "Using your preferred delivery location"}
                                        </small>
                                    )}
                                </div>
                            )}

                            {/* B) Strict location selector
                                  — buyer must choose province → district → sector
                                  — only then does onValidChange fire                */}
                            {showLocationSelector && (
                                <div className="location-selector-wrapper" style={{ marginTop: "4px" }}>
                                    <LocationSelectorStrict
                                        onValidChange={handleValidLocationChange}
                                        error={locationError}
                                        t={t}
                                        initialLocation={formData.delivery_location}  // ← pre-fill with current location
                                    />
                                    {/* Cancel only if a previous location exists */}
                                    {formData.delivery_location && (
                                        <button
                                            type="button"
                                            className="cancel-location-btn"
                                            style={{ marginTop: "10px" }}
                                            onClick={() => {
                                                setShowLocationSelector(false);
                                                setLocationError("");
                                            }}
                                        >
                                            <X size={12} />
                                            {t("cancel") || "Cancel"}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* C) No location yet and selector is hidden */}
                            {!formData.delivery_location && !showLocationSelector && (
                                <button
                                    type="button"
                                    className="use-location-selector-btn"
                                    style={{
                                        width: "100%",
                                        justifyContent: "center",
                                        padding: "10px",
                                        marginTop: "4px",
                                    }}
                                    onClick={() => setShowLocationSelector(true)}
                                >
                                    <MapPin size={14} />
                                    {t("select_delivery_location") || "Select delivery location"}
                                </button>
                            )}

                            {locationError && (
                                <small className="form-error">{locationError}</small>
                            )}
                        </div>

                        {/* ══════════════════════════════════════════════════
                            WHO WILL DELIVER?
                        ══════════════════════════════════════════════════ */}
                        <div className="form-group">
                            <label>{t("who_will_deliver") || "Who will deliver?"} *</label>

                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "12px",
                                marginTop: "6px",
                            }}>
                                {/* Option A: Buyer (self) delivers */}
                                <label style={radioCardStyle(
                                    formData.delivery_type === "self", "#2d5a2d", "#e8f5e9"
                                )}>
                                    <input
                                        type="radio"
                                        value="self"
                                        checked={formData.delivery_type === "self"}
                                        onChange={() => handleChange("delivery_type", "self")}
                                        style={{ display: "none" }}
                                    />
                                    <User
                                        size={18}
                                        color={formData.delivery_type === "self" ? "#2d5a2d" : "#94a3b8"}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: 600,
                                            fontSize: "13px",
                                            color: formData.delivery_type === "self"
                                                ? "#1e3c1e" : "#1e293b",
                                        }}>
                                            {t("i_will_deliver") || "I will deliver"}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                                            {t("buyer") || "Buyer"}
                                            {formData.buyer
                                                ? ` · ID ${formData.buyer}`
                                                : ""}
                                        </div>
                                    </div>
                                    {formData.delivery_type === "self" && (
                                        <CheckCircle
                                            size={14}
                                            color="#2d5a2d"
                                            style={{ marginLeft: "auto", flexShrink: 0 }}
                                        />
                                    )}
                                </label>

                                {/* Option B: Farmer delivers */}
                                <label style={radioCardStyle(
                                    formData.delivery_type === "farmer", "#b76e0a", "#fff8e1"
                                )}>
                                    <input
                                        type="radio"
                                        value="farmer"
                                        checked={formData.delivery_type === "farmer"}
                                        onChange={() => handleChange("delivery_type", "farmer")}
                                        style={{ display: "none" }}
                                    />
                                    <Truck
                                        size={18}
                                        color={formData.delivery_type === "farmer" ? "#b76e0a" : "#94a3b8"}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: 600,
                                            fontSize: "13px",
                                            color: formData.delivery_type === "farmer"
                                                ? "#7a4800" : "#1e293b",
                                        }}>
                                            {t("farmer_will_deliver") || "Farmer will deliver"}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                                            {formData.farmer_name || (t("farmer") || "Farmer")}
                                        </div>
                                    </div>
                                    {formData.delivery_type === "farmer" && (
                                        <CheckCircle
                                            size={14}
                                            color="#b76e0a"
                                            style={{ marginLeft: "auto", flexShrink: 0 }}
                                        />
                                    )}
                                </label>
                            </div>

                            {/* Contextual message */}
                            {formData.delivery_type === "self" && (
                                <div style={infoBoxStyle("#e8f5e9", "#2e7d32")}>
                                    <Info size={14} />
                                    <span>
                                        {t("you_will_be_responsible_for_delivery") ||
                                            "You (buyer) are responsible for collecting and delivering the goods."}
                                    </span>
                                </div>
                            )}
                            {formData.delivery_type === "farmer" && (
                                <div style={infoBoxStyle("#fff8e1", "#b76e0a")}>
                                    <Truck size={14} />
                                    <span>
                                        {formData.farmer_name
                                            ? `${formData.farmer_name} ${t("farmer_will_deliver_to_you") ||
                                            "will deliver to your specified location."
                                            }`
                                            : t("farmer_will_deliver_to_you") ||
                                            "The farmer will deliver to your specified location."}
                                    </span>
                                </div>
                            )}

                            {/* Dev helper: show resolved deliver id */}
                            {resolvedDeliver && (
                                <small style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    marginTop: "8px",
                                    fontSize: "11px",
                                    color: "#94a3b8",
                                }}>
                                    <ShieldCheck size={11} />
                                    deliver id = {resolvedDeliver}
                                </small>
                            )}
                        </div>

                        {/* ══════════════════════════════════════════════════
                            DELIVERY DATE
                        ══════════════════════════════════════════════════ */}
                        <div className="form-group">
                            <label>{t("delivery_date") || "Delivery Date"}</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.delivery_date}
                                onChange={e => handleChange("delivery_date", e.target.value)}
                            />
                        </div>

                        {/* ══════════════════════════════════════════════════
                            PAYMENT OPTION
                        ══════════════════════════════════════════════════ */}
                        <div className="form-group">
                            <label>{t("payment_option") || "Payment Option"}</label>
                            <div className="radio-group">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        value="full"
                                        checked={formData.payment_option === "full"}
                                        onChange={() => handleChange("payment_option", "full")}
                                    />
                                    {t("full_payment") || "Full Payment"}
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        value="partial"
                                        checked={formData.payment_option === "partial"}
                                        onChange={() => handleChange("payment_option", "partial")}
                                    />
                                    {t("partial_payment") || "Partial Payment"}
                                </label>
                            </div>
                        </div>

                        {formData.payment_option === "partial" && (
                            <div className="form-group">
                                <label>{t("payment_due_date") || "Payment Due Date"} *</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.payment_due_date}
                                    onChange={e => handleChange("payment_due_date", e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════════
                            NOTES
                        ══════════════════════════════════════════════════ */}
                        <div className="form-group">
                            <label>{t("notes") || "Notes"}</label>
                            <textarea
                                className="form-input"
                                rows="3"
                                placeholder={
                                    t("contract_notes_placeholder") || "Any additional notes…"
                                }
                                value={formData.notes}
                                onChange={e => handleChange("notes", e.target.value)}
                            />
                        </div>

                        {/* ── Submit button ───────────────────────────────── */}
                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={loading || showLocationSelector}
                            title={
                                showLocationSelector
                                    ? "Complete the location selection first"
                                    : ""
                            }
                        >
                            {loading && <Loader2 size={16} className="spin-icon" />}
                            {mode === "create"
                                ? (t("create_contract") || "Create Contract")
                                : (t("update_contract") || "Update Contract")}
                        </button>

                        {/* Reminder when selector is still open */}
                        {showLocationSelector && (
                            <small style={{
                                display: "block",
                                textAlign: "center",
                                marginTop: "8px",
                                fontSize: "12px",
                                color: "#b76e0a",
                            }}>
                                <Info
                                    size={11}
                                    style={{ display: "inline", marginRight: "4px" }}
                                />
                                {t("complete_location_before_submit") ||
                                    "Select province → district → sector before submitting."}
                            </small>
                        )}

                    </form>
                </div>{/* end modal-body */}
            </div>{/* end modal-card */}
        </div>
    );
}

// ─── Payment Modal ───────────────────────────────────────────────────────────

function PaymentModal({ isOpen, onClose, onSubmit, contract, onPaymentInitiated }) {
    const { t } = useTranslation();
    const [paymentData, setPaymentData] = useState({
        amount: "",
        payment_method: "mobile_money",
        reference_number: "",
        notes: "",
        phone_number: ""
    });
    const [loading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [transactionRef, setTransactionRef] = useState(null);
    const [pollingInterval, setPollingInterval] = useState(null);

    const balanceDue = contract ? contract.balance_due : 0;
    const totalAmount = contract ? contract.total_amount : 0;

    useEffect(() => {
        if (isOpen && contract) {
            // Pre-fill with user's phone number if available
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            setPaymentData({
                amount: contract.payment_option === "full" ? balanceDue.toString() : "",
                payment_method: "mobile_money",
                reference_number: "",
                notes: "",
                phone_number: user.phone_number || ""
            });
            setPaymentStatus(null);
            setTransactionRef(null);
        }
    }, [isOpen, contract]);

    useEffect(() => {
        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, [pollingInterval]);

    const pollTransactionStatus = async (ref) => {
        try {
            const response = await paypack.transaction(ref);
            if (response.data.status === "successful") {
                clearInterval(pollingInterval);
                setPaymentStatus("success");
                toast.success(t('payment_successful'));
                if (onSubmit) {
                    await onSubmit({
                        ...paymentData,
                        amount: parseFloat(paymentData.amount),
                        reference_number: ref
                    });
                }
                onClose();
            } else if (response.data.status === "failed") {
                clearInterval(pollingInterval);
                setPaymentStatus("failed");
                toast.error(t('payment_failed'));
            }
        } catch (error) {
            console.error("Error polling transaction:", error);
        }
    };

    const handlePayWithMobileMoney = async () => {
        setLoading(true);
        setPaymentStatus("processing");

        try {
            // Step 1: Authenticate with Paypack
            const auth = await paypackAPI.authenticate();
            const accessToken = auth.access;

            // Step 2: Make the payment
            const payment = await paypackAPI.cashin(
                paymentData.phone_number,
                parseFloat(paymentData.amount),
                accessToken
            );

            if (payment.ref) {
                setTransactionRef(payment.ref);
                setPaymentStatus("pending");

                // Step 3: Poll for status
                const interval = setInterval(async () => {
                    const status = await paypackAPI.checkTransaction(payment.ref, accessToken);
                    if (status.status === "successful") {
                        clearInterval(interval);
                        setPaymentStatus("success");
                        toast.success(t('payment_successful'));
                        await onSubmit({
                            ...paymentData,
                            amount: parseFloat(paymentData.amount),
                            reference_number: payment.ref
                        });
                        onClose();
                    } else if (status.status === "failed") {
                        clearInterval(interval);
                        setPaymentStatus("failed");
                        toast.error(t('payment_failed'));
                    }
                }, 3000);

                setPollingInterval(interval);
            }
        } catch (error) {
            console.error("Payment error:", error);
            setPaymentStatus("failed");
            toast.error(t('payment_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (paymentData.payment_method === "mobile_money") {
            await handlePayWithMobileMoney();
        } else {
            // For other payment methods, just record the payment
            const amount = parseFloat(paymentData.amount);
            if (isNaN(amount) || amount <= 0) {
                toast.error(t('invalid_amount'));
                return;
            }

            if (amount > balanceDue) {
                toast.error(t('amount_exceeds_balance'));
                return;
            }

            setLoading(true);
            try {
                await onSubmit(paymentData);
                onClose();
            } catch (error) {
                console.error("Error recording payment:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-card payment-modal">
                <div className="modal-head">
                    <h2>{t('make_payment')}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="payment-summary">
                        <div className="summary-item">
                            <span className="summary-label">{t('contract_total')}:</span>
                            <span className="summary-value">{totalAmount?.toLocaleString()} RWF</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">{t('amount_paid')}:</span>
                            <span className="summary-value">{(totalAmount - balanceDue)?.toLocaleString()} RWF</span>
                        </div>
                        <div className="summary-item highlight">
                            <span className="summary-label">{t('balance_due')}:</span>
                            <span className="summary-value">{balanceDue?.toLocaleString()} RWF</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>{t('payment_method')} *</label>
                            <div className="payment-methods">
                                <label className={`payment-method ${paymentData.payment_method === 'mobile_money' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        value="mobile_money"
                                        checked={paymentData.payment_method === "mobile_money"}
                                        onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                                    />
                                    <Smartphone size={20} />
                                    <span>{t('mobile_money')}</span>
                                </label>
                                <label className={`payment-method ${paymentData.payment_method === 'bank_transfer' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        value="bank_transfer"
                                        checked={paymentData.payment_method === "bank_transfer"}
                                        onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                                    />
                                    <CreditCard size={20} />
                                    <span>{t('bank_transfer')}</span>
                                </label>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>{t('amount')} (RWF) *</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                value={paymentData.amount}
                                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                                placeholder={t('enter_amount')}
                                required
                            />
                            {contract?.payment_option === "full" && (
                                <small className="form-hint">{t('full_payment_required')}</small>
                            )}
                        </div>

                        {paymentData.payment_method === "mobile_money" && (
                            <div className="form-group">
                                <label>{t('phone_number')} *</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={paymentData.phone_number}
                                    onChange={(e) => setPaymentData({ ...paymentData, phone_number: e.target.value })}
                                    placeholder={t('enter_phone_number')}
                                    required
                                />
                                <small className="form-hint">{t('phone_number_hint')}</small>
                            </div>
                        )}

                        <div className="form-group">
                            <label>{t('reference_number')}</label>
                            <input
                                type="text"
                                className="form-input"
                                value={paymentData.reference_number}
                                onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                                placeholder={t('reference_number_placeholder')}
                            />
                        </div>

                        <div className="form-group">
                            <label>{t('notes')}</label>
                            <textarea
                                className="form-input"
                                rows="2"
                                value={paymentData.notes}
                                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                                placeholder={t('payment_notes_placeholder')}
                            />
                        </div>

                        {paymentStatus === "processing" && (
                            <div className="payment-status processing">
                                <Loader2 size={20} className="spin-icon" />
                                <span>{t('processing_payment')}</span>
                            </div>
                        )}

                        {paymentStatus === "pending" && (
                            <div className="payment-status pending">
                                <Clock size={20} />
                                <span>{t('payment_pending_check_phone')}</span>
                            </div>
                        )}

                        <button type="submit" className="btn-submit" disabled={loading || paymentStatus === "processing"}>
                            {loading && <Loader2 size={16} className="spin-icon" />}
                            {t('make_payment')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ─── Delivery Modal ──────────────────────────────────────────────────────────

function DeliveryModal({ isOpen, onClose, onSubmit, contract, onUpdate }) {
    const { t } = useTranslation();
    const [deliveryData, setDeliveryData] = useState({
        delivery_status: "",
        delivery_notes: "",
        delivery_date: ""
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && contract) {
            setDeliveryData({
                delivery_status: contract.delivery_status || "pending",
                delivery_notes: contract.delivery_notes || "",
                delivery_date: contract.delivery_date || ""
            });
        }
    }, [isOpen, contract]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(deliveryData);
            onClose();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error updating delivery:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartDelivery = async () => {
        setLoading(true);
        try {
            await onUpdate({ delivery_status: "in_progress" });
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteDelivery = async () => {
        setLoading(true);
        try {
            await onUpdate({
                delivery_status: "completed",
                create_stock_movement: true
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-card delivery-modal">
                <div className="modal-head">
                    <h2>{t('delivery_management')}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="delivery-status-info">
                        <div className="status-item">
                            <span className="status-label">{t('current_status')}:</span>
                            <StatusBadge status={contract?.delivery_status} type="delivery" />
                        </div>
                        {contract?.deliver && (
                            <div className="status-item">
                                <span className="status-label">{t('deliver_person')}:</span>
                                <span className="status-value">{contract.deliver.full_name}</span>
                            </div>
                        )}
                    </div>

                    {contract?.can_start_delivery && contract.delivery_status === "pending" && (
                        <button
                            className="btn-start-delivery"
                            onClick={handleStartDelivery}
                            disabled={loading}
                        >
                            {loading ? <Loader2 size={16} className="spin-icon" /> : <Truck size={16} />}
                            {t('start_delivery')}
                        </button>
                    )}

                    {contract?.delivery_status === "in_progress" && (
                        <button
                            className="btn-complete-delivery"
                            onClick={handleCompleteDelivery}
                            disabled={loading}
                        >
                            {loading ? <Loader2 size={16} className="spin-icon" /> : <CheckCircle size={16} />}
                            {t('complete_delivery')}
                        </button>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>{t('delivery_notes')}</label>
                            <textarea
                                className="form-input"
                                rows="3"
                                value={deliveryData.delivery_notes}
                                onChange={(e) => setDeliveryData({ ...deliveryData, delivery_notes: e.target.value })}
                                placeholder={t('delivery_notes_placeholder')}
                            />
                        </div>

                        <div className="form-group">
                            <label>{t('delivery_date')}</label>
                            <input
                                type="date"
                                className="form-input"
                                value={deliveryData.delivery_date}
                                onChange={(e) => setDeliveryData({ ...deliveryData, delivery_date: e.target.value })}
                            />
                        </div>

                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading && <Loader2 size={16} className="spin-icon" />}
                            {t('update_delivery')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ─── Contract Details Modal ──────────────────────────────────────────────────

function ContractDetailsModal({ isOpen, onClose, contract, onUpdate, onPayment, onDelivery }) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("details");

    if (!isOpen || !contract) return null;

    const canMakePayment = contract.can_proceed_to_payment && !contract.is_fully_paid;
    const canStartDelivery = contract.can_start_delivery;
    const canUpdate = contract.status === "pending" && (contract.buyer_status === "accepted" || contract.farmer_status === "accepted");

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-card contract-details-modal">
                <div className="modal-head">
                    <div>
                        <h2>{t('contract_details')} #{contract.id}</h2>
                        <p>{contract.crop_name}</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-tabs">
                    <button
                        className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
                        onClick={() => setActiveTab("details")}
                    >
                        <FileText size={16} />
                        {t('details')}
                    </button>
                    <button
                        className={`tab-btn ${activeTab === "payments" ? "active" : ""}`}
                        onClick={() => setActiveTab("payments")}
                    >
                        <DollarSign size={16} />
                        {t('payments')}
                    </button>
                    <button
                        className={`tab-btn ${activeTab === "statistics" ? "active" : ""}`}
                        onClick={() => setActiveTab("statistics")}
                    >
                        <BarChart3 size={16} />
                        {t('statistics')}
                    </button>
                </div>

                <div className="modal-body">
                    {activeTab === "details" && (
                        <div className="contract-details">
                            <div className="details-section">
                                <h3>{t('parties')}</h3>
                                <div className="parties-grid">
                                    <div className="party-card">
                                        <div className="party-header">
                                            <div className="party-avatar" style={roleColors.farmer}>
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <div className="party-role">{t('farmer')}</div>
                                                <div className="party-name">{contract.farmer_detail?.full_name}</div>
                                            </div>
                                        </div>
                                        <div className="party-info">
                                            <Phone size={14} /> {contract.farmer_detail?.phone_number}
                                            <Mail size={14} /> {contract.farmer_detail?.email}
                                            <MapPin size={14} /> {contract.farmer_detail?.location}
                                        </div>
                                        <div className="party-status">
                                            {t('status')}: <StatusBadge status={contract.farmer_status} />
                                        </div>
                                    </div>

                                    <div className="party-card">
                                        <div className="party-header">
                                            <div className="party-avatar" style={roleColors.buyer}>
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <div className="party-role">{t('buyer')}</div>
                                                <div className="party-name">{contract.buyer_detail?.full_name}</div>
                                            </div>
                                        </div>
                                        <div className="party-info">
                                            <Phone size={14} /> {contract.buyer_detail?.phone_number}
                                            <Mail size={14} /> {contract.buyer_detail?.email}
                                            <MapPin size={14} /> {contract.buyer_detail?.location}
                                        </div>
                                        <div className="party-status">
                                            {t('status')}: <StatusBadge status={contract.buyer_status} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="details-section">
                                <h3>{t('contract_details')}</h3>
                                <div className="details-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">{t('crop')}:</span>
                                        <span className="detail-value">{contract.crop_name}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('quantity')}:</span>
                                        <span className="detail-value">{contract.quantity_kg?.toLocaleString()} kg</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('price_per_kg')}:</span>
                                        <span className="detail-value">{contract.price_per_kg?.toLocaleString()} RWF</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('total_amount')}:</span>
                                        <span className="detail-value">{contract.total_amount?.toLocaleString()} RWF</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('payment_option')}:</span>
                                        <span className="detail-value">
                                            {contract.payment_option === "full" ? t('full_payment') : t('partial_payment')}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('delivery_location')}:</span>
                                        <span className="detail-value">{contract.delivery_location || t('not_specified')}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('delivery_status')}:</span>
                                        <span className="detail-value">
                                            <StatusBadge status={contract.delivery_status} type="delivery" />
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">{t('admin_confirmed')}:</span>
                                        <span className="detail-value">
                                            {contract.admin_confirmed ?
                                                <CheckCircle size={14} color="#2e7d32" /> :
                                                <Clock size={14} color="#b76e0a" />
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {contract.deliver_detail && (
                                <div className="details-section">
                                    <h3>{t('deliver_person')}</h3>
                                    <div className="deliver-card">
                                        <div className="deliver-info">
                                            <User size={16} />
                                            <span>{contract.deliver_detail.full_name}</span>
                                            <Phone size={16} />
                                            <span>{contract.deliver_detail.phone_number}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="details-actions">
                                {canUpdate && (
                                    <button className="action-btn edit" onClick={() => onUpdate(contract)}>
                                        <Edit2 size={16} />
                                        {t('edit_contract')}
                                    </button>
                                )}
                                {canMakePayment && (
                                    <button className="action-btn payment" onClick={() => onPayment(contract)}>
                                        <DollarSign size={16} />
                                        {t('make_payment')}
                                    </button>
                                )}
                                {canStartDelivery && (
                                    <button className="action-btn delivery" onClick={() => onDelivery(contract)}>
                                        <Truck size={16} />
                                        {t('update_delivery')}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "payments" && (
                        <div className="payments-list">
                            {contract.payment_records && contract.payment_records.length > 0 ? (
                                contract.payment_records.map(payment => (
                                    <div key={payment.id} className="payment-item">
                                        <div className="payment-header">
                                            <span className="payment-amount">{payment.amount?.toLocaleString()} RWF</span>
                                            <StatusBadge status={payment.status} type="payment" />
                                        </div>
                                        <div className="payment-details">
                                            <div className="payment-method">
                                                {paymentMethodIcons[payment.payment_method] &&
                                                    React.createElement(paymentMethodIcons[payment.payment_method], { size: 14 })}
                                                <span>{t(payment.payment_method)}</span>
                                            </div>
                                            {payment.reference_number && (
                                                <div className="payment-ref">
                                                    <FileText size={14} />
                                                    <span>{payment.reference_number}</span>
                                                </div>
                                            )}
                                            <div className="payment-date">
                                                <Calendar size={14} />
                                                <span>{new Date(payment.paid_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        {payment.notes && (
                                            <div className="payment-notes">{payment.notes}</div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">
                                    <DollarSign size={32} />
                                    <p>{t('no_payments_recorded')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "statistics" && (
                        <div className="statistics-section">
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}>
                                        <Percent size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">
                                            {((contract.amount_paid / contract.total_amount) * 100).toFixed(1)}%
                                        </div>
                                        <div className="stat-label">{t('payment_progress')}</div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon" style={{ backgroundColor: "#e3f2fd", color: "#1565c0" }}>
                                        <DollarSign size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">{contract.balance_due?.toLocaleString()} RWF</div>
                                        <div className="stat-label">{t('remaining_balance')}</div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon" style={{ backgroundColor: "#fff8e1", color: "#b76e0a" }}>
                                        <Clock size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">
                                            {contract.delivery_date ?
                                                new Date(contract.delivery_date).toLocaleDateString() :
                                                t('not_set')}
                                        </div>
                                        <div className="stat-label">{t('delivery_date')}</div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon" style={{ backgroundColor: "#f3e8ff", color: "#7e22ce" }}>
                                        <TrendingUp size={24} />
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-value">
                                            {contract.payment_records?.length || 0}
                                        </div>
                                        <div className="stat-label">{t('total_payments')}</div>
                                    </div>
                                </div>
                            </div>

                            {contract.payment_due_date && (
                                <div className="due-date-info">
                                    <AlertCircle size={16} />
                                    <span>{t('payment_due_date')}: {new Date(contract.payment_due_date).toLocaleDateString()}</span>
                                </div>
                            )}

                            <div className="progress-section">
                                <div className="progress-label">
                                    <span>{t('payment_progress')}</span>
                                    <span>{contract.amount_paid?.toLocaleString()} RWF / {contract.total_amount?.toLocaleString()} RWF</span>
                                </div>
                                <div className="progress-bar-container">
                                    <div
                                        className="progress-bar"
                                        style={{ width: `${(contract.amount_paid / contract.total_amount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BuyerContracts() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    // State
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedContract, setSelectedContract] = useState(null);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showCreateOptions, setShowCreateOptions] = useState(false);

    // Filter state
    const [statusFilter, setStatusFilter] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Stock data for creating contract from matching
    const [stockData, setStockData] = useState(null);

    // API Client
    const apiClient = useMemo(() => {
        const client = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

        client.interceptors.request.use((config) => {
            const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            const lang = localStorage.getItem("language") || "en";
            config.headers['Accept-Language'] = lang;
            config.headers['Content-Type'] = 'application/json';
            return config;
        });

        client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    toast.error(t('session_expired'));
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('accessToken');
                    setTimeout(() => navigate('/login'), 2000);
                }
                return Promise.reject(error);
            }
        );

        return client;
    }, [t, navigate]);

    // Check if coming from market matching
    useEffect(() => {
        if (location.state?.stockData && location.state?.openCreateModal) {
            setStockData(location.state.stockData);
            setShowCreateModal(true);
            // Clear the location state to prevent reopening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Handle create button click - show options
    const handleCreateClick = () => {
        setShowCreateOptions(true);
    };

    // Handle create from crops
    const handleCreateFromCrops = () => {
        setShowCreateOptions(false);
        navigate('/buyer/stocks'); // Navigate to crops/stocks page
    };

    // Handle create from market matching
    const handleCreateFromMatching = () => {
        setShowCreateOptions(false);
        navigate('/buyer/market-matches');
    };

    // Fetch contracts
    const fetchContracts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage,
                page_size: pageSize,
                ...(statusFilter && { status: statusFilter }),
                ...(searchTerm && { search: searchTerm })
            });

            const response = await apiClient.get(`/contract/my/?${params}`);
            setContracts(response.data.contracts || []);
            setTotalItems(response.data.total || 0);
            setTotalPages(Math.ceil((response.data.total || 0) / pageSize));
        } catch (error) {
            console.error("Error fetching contracts:", error);
            toast.error(t('failed_to_load_contracts'));
        } finally {
            setLoading(false);
        }
    }, [apiClient, currentPage, pageSize, statusFilter, searchTerm, t]);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    // Contract CRUD operations
    const handleCreateContract = async (data) => {
        try {
            const response = await apiClient.post("/contract/create/", data);
            toast.success(t('contract_created_successfully'));
            fetchContracts();
            setShowCreateModal(false);
            setStockData(null);
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.error || t('failed_to_create_contract'));
            throw error;
        }
    };

    const handleUpdateContract = async (data) => {
        try {
            const response = await apiClient.patch(`/contract/${selectedContract.id}/update/`, data);
            toast.success(t('contract_updated_successfully'));
            fetchContracts();
            setShowEditModal(false);
            setSelectedContract(null);
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.error || t('failed_to_update_contract'));
            throw error;
        }
    };

    const handleAcceptContract = async (contractId) => {
        try {
            await apiClient.post(`/contract/${contractId}/accept/`);
            toast.success(t('contract_accepted'));
            fetchContracts();
        } catch (error) {
            toast.error(error.response?.data?.error || t('failed_to_accept_contract'));
        }
    };

    const handleRejectContract = async (contractId) => {
        const reason = prompt(t('enter_rejection_reason'));
        try {
            await apiClient.post(`/contract/${contractId}/reject/`, { reason });
            toast.success(t('contract_rejected'));
            fetchContracts();
        } catch (error) {
            toast.error(error.response?.data?.error || t('failed_to_reject_contract'));
        }
    };

    const handleAddPayment = async (paymentData) => {
        try {
            const response = await apiClient.post(`/contract/${selectedContract.id}/payments/add/`, paymentData);
            toast.success(t('payment_added_successfully'));
            fetchContracts();
            setShowPaymentModal(false);
            if (selectedContract) {
                const updated = await apiClient.get(`/contract/${selectedContract.id}/`);
                setSelectedContract(updated.data);
            }
            return response.data;
        } catch (error) {
            toast.error(error.response?.data?.error || t('failed_to_add_payment'));
            throw error;
        }
    };

    const handleUpdateDelivery = async (deliveryData) => {
        try {
            await apiClient.post(`/contract/${selectedContract.id}/delivery/update/`, deliveryData);
            toast.success(t('delivery_updated_successfully'));
            fetchContracts();
            if (selectedContract) {
                const updated = await apiClient.get(`/contract/${selectedContract.id}/`);
                setSelectedContract(updated.data);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || t('failed_to_update_delivery'));
            throw error;
        }
    };

    const handleStartDelivery = async (contractId) => {
        try {
            await apiClient.post(`/contract/${contractId}/delivery/start/`);
            toast.success(t('delivery_started'));
            fetchContracts();
        } catch (error) {
            toast.error(error.response?.data?.error || t('failed_to_start_delivery'));
        }
    };

    const handleCompleteDelivery = async (contractId) => {
        try {
            await apiClient.post(`/contract/${contractId}/delivery/complete/`, {
                create_stock_movement: true
            });
            toast.success(t('delivery_completed'));
            fetchContracts();
        } catch (error) {
            toast.error(error.response?.data?.error || t('failed_to_complete_delivery'));
        }
    };

    // Statistics
    const stats = useMemo(() => {
        const total = contracts.length;
        const pending = contracts.filter(c => c.status === "pending").length;
        const accepted = contracts.filter(c => c.status === "accepted").length;
        const completed = contracts.filter(c => c.status === "completed").length;
        const totalValue = contracts.reduce((sum, c) => sum + (c.total_amount || 0), 0);
        const paidValue = contracts.reduce((sum, c) => sum + (c.amount_paid || 0), 0);

        return { total, pending, accepted, completed, totalValue, paidValue };
    }, [contracts]);

    // Render contract card
    const renderContractCard = (contract) => {
        const canAccept = contract.buyer_status === "pending" && contract.status === "pending";
        const canReject = contract.buyer_status === "pending" && contract.status === "pending";
        const canPay = contract.can_proceed_to_payment && !contract.is_fully_paid;

        return (
            <div key={contract.id} className="contract-card">
                <div className="contract-card-header">
                    <div className="contract-info">
                        <h3>{contract.crop_name}</h3>
                        <div className="contract-id">#{contract.id}</div>
                    </div>
                    <StatusBadge status={contract.status} />
                </div>

                <div className="contract-card-details">
                    <div className="detail-row">
                        <div className="detail">
                            <Package size={14} />
                            <span>{contract.quantity_kg?.toLocaleString()} kg</span>
                        </div>
                        <div className="detail">
                            <DollarSign size={14} />
                            <span>{contract.price_per_kg?.toLocaleString()} RWF/kg</span>
                        </div>
                    </div>
                    <div className="detail-row">
                        <div className="detail">
                            <span className="label">{t('total')}:</span>
                            <strong>{contract.total_amount?.toLocaleString()} RWF</strong>
                        </div>
                        <div className="detail">
                            <span className="label">{t('paid')}:</span>
                            <strong>{contract.amount_paid?.toLocaleString()} RWF</strong>
                        </div>
                    </div>
                    <div className="progress-bar-container small">
                        <div
                            className="progress-bar"
                            style={{ width: `${(contract.amount_paid / contract.total_amount) * 100}%` }}
                        />
                    </div>
                    <div className="detail-row">
                        <div className="detail">
                            <User size={14} />
                            <span>{contract.farmer_detail?.full_name}</span>
                        </div>
                        <div className="detail">
                            <Truck size={14} />
                            <StatusBadge status={contract.delivery_status} type="delivery" size="small" />
                        </div>
                    </div>
                </div>

                <div className="contract-card-actions">
                    <button
                        className="action-btn view"
                        onClick={() => {
                            setSelectedContract(contract);
                            setShowDetailsModal(true);
                        }}
                    >
                        <Eye size={14} />
                        {t('view')}
                    </button>

                    {canAccept && (
                        <button className="action-btn accept" onClick={() => handleAcceptContract(contract.id)}>
                            <CheckCircle size={14} />
                            {t('accept')}
                        </button>
                    )}

                    {canReject && (
                        <button className="action-btn reject" onClick={() => handleRejectContract(contract.id)}>
                            <XCircle size={14} />
                            {t('reject')}
                        </button>
                    )}

                    {canPay && (
                        <button
                            className="action-btn payment"
                            onClick={() => {
                                setSelectedContract(contract);
                                setShowPaymentModal(true);
                            }}
                        >
                            <DollarSign size={14} />
                            {t('pay')}
                        </button>
                    )}

                    {contract.can_start_delivery && contract.delivery_status === "pending" && (
                        <button className="action-btn delivery" onClick={() => handleStartDelivery(contract.id)}>
                            <Truck size={14} />
                            {t('start_delivery')}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const CreateOptionsModal = () => {
        if (!showCreateOptions) return null;

        return (
            <div className="modal-overlay" onClick={() => setShowCreateOptions(false)}>
                <div className="modal-card" style={{ maxWidth: '400px' }}>
                    <div className="modal-head">
                        <h2>{t('create_contract')}</h2>
                        <button className="modal-close" onClick={() => setShowCreateOptions(false)}>
                            <X size={18} />
                        </button>
                    </div>
                    <div className="modal-body">
                        <p style={{ marginBottom: '20px', color: '#64748b' }}>
                            {t('how_would_you_like_to_create_a_contract')}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                className="create-option-btn"
                                onClick={handleCreateFromCrops}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '16px',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Package size={24} color="#2d5a2d" />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t('from_available_crops')}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{t('browse_available_crops_and_create_contract')}</div>
                                </div>
                            </button>

                            <button
                                className="create-option-btn"
                                onClick={handleCreateFromMatching}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '16px',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Handshake size={24} color="#b76e0a" />
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t('from_market_matching')}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{t('find_matches_and_create_contract')}</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="contracts-container">
            <ToastContainer position="top-right" autoClose={5000} />

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        .contracts-container {
          font-family: 'Inter', sans-serif;
          background-color: #f8fafc;
          min-height: 100vh;
          padding: 24px;
        }
        
        /* Header */
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
        
        .create-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .create-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(45, 90, 45, 0.2);
        }
        
        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-info {
          flex: 1;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
        }
        
        .stat-label {
          font-size: 13px;
          color: #64748b;
        }
        
        /* Filter Bar */
        .filter-bar {
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        
        .search-wrapper {
          flex: 1;
          min-width: 250px;
          position: relative;
        }
        
        .search-input {
          width: 100%;
          padding: 10px 16px;
          padding-left: 40px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
        }
        
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        
        .status-filter {
          padding: 10px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          min-width: 150px;
        }
        
        /* Contracts Grid */
        .contracts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
        }
        
        .contract-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }
        
        .contract-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        
        .contract-card-header {
          padding: 16px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .contract-info h3 {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 4px 0;
        }
        
        .contract-id {
          font-size: 12px;
          color: #64748b;
        }
        
        .contract-card-details {
          padding: 16px 20px;
        }
        
        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .detail {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #475569;
        }
        
        .detail .label {
          color: #64748b;
        }
        
        .progress-bar-container {
          background: #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          margin: 12px 0;
        }
        
        .progress-bar-container.small {
          height: 6px;
        }
        
        .progress-bar {
          background: linear-gradient(90deg, #2d5a2d, #4caf71);
          height: 100%;
          border-radius: 10px;
          transition: width 0.3s ease;
        }
        
        .contract-card-actions {
          padding: 12px 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        
        .action-btn.view {
          background: #f1f5f9;
          color: #1e293b;
        }
        
        .action-btn.view:hover {
          background: #e2e8f0;
        }
        
        .action-btn.accept {
          background: #e8f5e9;
          color: #2e7d32;
        }
        
        .action-btn.accept:hover {
          background: #c8e6c9;
        }
        
        .action-btn.reject {
          background: #ffebee;
          color: #c62828;
        }
        
        .action-btn.reject:hover {
          background: #ffcdd2;
        }
        
        .action-btn.payment {
          background: #e3f2fd;
          color: #1565c0;
        }
        
        .action-btn.payment:hover {
          background: #bbdef5;
        }
        
        .action-btn.delivery {
          background: #fff8e1;
          color: #b76e0a;
        }
        
        .action-btn.delivery:hover {
          background: #ffecb3;
        }
        
        /* Status Badge */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
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
        
        .modal-card {
          background: white;
          border-radius: 24px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        
        .modal-card.contract-modal,
        .modal-card.payment-modal,
        .modal-card.delivery-modal,
        .modal-card.contract-details-modal {
          max-width: 800px;
        }
        
        .modal-head {
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
        
        .modal-head h2 {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
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
        
        .modal-tabs {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          padding: 0 24px;
          gap: 8px;
        }
        
        .tab-btn {
          padding: 12px 20px;
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
        }
        
        .tab-btn.active {
          color: #2d5a2d;
          border-bottom-color: #2d5a2d;
        }
        
        /* Form Styles */
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 6px;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .form-input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #2d5a2d;
          box-shadow: 0 0 0 3px rgba(45,90,45,0.1);
        }
        
        textarea.form-input {
          resize: vertical;
          font-family: inherit;
        }
        
        .radio-group {
          display: flex;
          gap: 20px;
        }
        
        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .form-hint {
          display: block;
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }
        
        .btn-submit {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        
        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        /* Search Select */
        .search-select-wrapper {
          position: relative;
        }
        
        .search-select-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 10;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        }
        
        .search-option {
          padding: 10px 14px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .search-option:hover {
          background: #f8fafc;
        }
        
        .search-option.selected {
          background: #e8f5e9;
        }
        
        .option-name {
          font-weight: 500;
          color: #1e293b;
        }
        
        .option-detail {
          font-size: 12px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }
        
        /* Payment Methods */
        .payment-methods {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        
        .payment-method {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }
        
        .payment-method input {
          display: none;
        }
        
        .payment-method.active {
          border-color: #2d5a2d;
          background: #e8f5e9;
        }
        
        .payment-summary {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }
        
        .summary-item.highlight {
          font-weight: 700;
          color: #2d5a2d;
          border-top: 1px solid #e2e8f0;
          margin-top: 8px;
          padding-top: 12px;
        }
        
        .payment-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 16px;
        }
        
        .payment-status.processing {
          background: #fff8e1;
          color: #b76e0a;
        }
        
        .payment-status.pending {
          background: #e3f2fd;
          color: #1565c0;
        }
        
        /* Contract Details */
        .details-section {
          margin-bottom: 24px;
        }
        
        .details-section h3 {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .parties-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .party-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
        }
        
        .party-header {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .party-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .party-role {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
        }
        
        .party-name {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
        }
        
        .party-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 12px;
          color: #475569;
        }
        
        .party-info svg {
          margin-right: 4px;
        }
        
        .party-status {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .detail-label {
          color: #64748b;
          font-size: 13px;
        }
        
        .detail-value {
          font-weight: 500;
          color: #1e293b;
        }
        
        .deliver-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 12px;
        }
        
        .deliver-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .details-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }
        
        .details-actions .action-btn {
          flex: 1;
          justify-content: center;
          padding: 12px;
        }
        
        /* Payments List */
        .payments-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .payment-item {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
        }
        
        .payment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .payment-amount {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }
        
        .payment-details {
          display: flex;
          gap: 16px;
          margin-bottom: 8px;
          font-size: 12px;
          color: #64748b;
        }
        
        .payment-method {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .payment-ref {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .payment-date {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .payment-notes {
          font-size: 12px;
          color: #475569;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
        }
        
        /* Statistics Section */
        .statistics-section {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .progress-section {
          margin-top: 16px;
        }
        
        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 13px;
          color: #475569;
        }
        
        .due-date-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #fff8e1;
          border-radius: 10px;
          font-size: 13px;
          color: #b76e0a;
        }
          /* Farmer Read-only Card */
.farmer-readonly-card {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 14px;
}

.farmer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.farmer-icon {
  color: #1565c0;
}

.farmer-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.farmer-name {
  font-weight: 600;
  color: #1e293b;
}

.farmer-phone {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #64748b;
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
        
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        
        .empty-state {
          text-align: center;
          padding: 60px;
          color: #94a3b8;
        }
        
        .empty-state svg {
          margin-bottom: 16px;
        }
        
        /* Pagination */
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: white;
          border-radius: 16px;
          margin-top: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .pagination-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #64748b;
        }
        
        .page-size-select {
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
        }
        
        .pagination-controls {
          display: flex;
          gap: 6px;
        }
        
        .pagination-btn {
          min-width: 36px;
          height: 36px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
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

        /* Farmer Info Card */
.farmer-info-card {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdef5 100%);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.farmer-info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #1565c0;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(21, 101, 192, 0.2);
}

.farmer-info-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.farmer-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.farmer-label {
  min-width: 60px;
  color: #1565c0;
  font-weight: 500;
}

.farmer-value {
  color: #1e293b;
  font-weight: 500;
}

/* Delivery Location Display */
.delivery-location-display {
  background: #f8fafc;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  overflow: hidden;
}

.current-location {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: white;
  border-radius: 8px;
}

.current-location span {
  flex: 1;
  color: #1e293b;
  font-size: 14px;
}

.change-location-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f1f5f9;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.change-location-btn:hover {
  background: #e2e8f0;
  color: #2d5a2d;
}

/* Location Selector Wrapper */
.location-selector-wrapper {
  position: relative;
}

.cancel-location-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 12px;
  background: #fee2e2;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  color: #c62828;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-location-btn:hover {
  background: #ffcdd2;
}

/* Use Location Selector Button */
.use-location-selector-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 12px;
  background: #e8f5e9;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  color: #2d5a2d;
  cursor: pointer;
  transition: all 0.2s ease;
}

.use-location-selector-btn:hover {
  background: #c8e6c9;
}

/* Form Error */
.form-error {
  display: block;
  font-size: 12px;
  color: #c62828;
  margin-top: 4px;
}

/* Location Hint */
.location-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 10px;
  background: #e8f5e9;
  border-radius: 6px;
  font-size: 11px;
  color: #2e7d32;
}

/* Input Error State */
.form-input.error {
  border-color: #c62828;
}

.form-input.error:focus {
  border-color: #c62828;
  box-shadow: 0 0 0 3px rgba(198, 40, 40, 0.1);
}
        
        /* Total Amount Display */
.total-amount-display {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-amount-label {
  font-size: 14px;
  font-weight: 600;
  color: #1e3c1e;
}

.total-amount-value {
  font-size: 24px;
  font-weight: 700;
  color: #2d5a2d;
}

/* Selected Info */
.selected-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #e8f5e9;
  border-radius: 8px;
  margin-top: 8px;
  font-size: 13px;
  color: #2d5a2d;
}

/* Create Options Modal */
.create-option-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: #2d5a2d !important;
}

/* Form Hint */
.form-hint {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}
        
        /* Responsive */
        @media (max-width: 768px) {
          .contracts-container {
            padding: 16px;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .contracts-grid {
            grid-template-columns: 1fr;
          }
          
          .parties-grid,
          .details-grid {
            grid-template-columns: 1fr;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .payment-methods {
            grid-template-columns: 1fr;
          }
          
          .filter-bar {
            flex-direction: column;
          }
          
          .search-wrapper,
          .status-filter {
            width: 100%;
          }
          
          .pagination-container {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .pagination-controls {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

            <div className="page-header">
                <div className="header-left">
                    <h1>{t('my_contracts')}</h1>
                    <p>{t('manage_your_contracts_payments_deliveries')}</p>
                </div>
                <button className="create-btn" onClick={handleCreateClick}>
                    <Plus size={18} />
                    {t('create_contract')}
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}>
                        <Handshake size={24} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">{t('total_contracts')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: "#fff8e1", color: "#b76e0a" }}>
                        <Clock size={24} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.pending}</div>
                        <div className="stat-label">{t('pending_contracts')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: "#e3f2fd", color: "#1565c0" }}>
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.accepted}</div>
                        <div className="stat-label">{t('active_contracts')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: "#f3e8ff", color: "#7e22ce" }}>
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.paidValue?.toLocaleString()} RWF</div>
                        <div className="stat-label">{t('total_paid')}</div>
                    </div>
                </div>
            </div>

            <div className="filter-bar">
                <div className="search-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder={t('search_contracts')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">{t('all_statuses')}</option>
                    <option value="pending">{t('pending')}</option>
                    <option value="accepted">{t('accepted')}</option>
                    <option value="completed">{t('completed')}</option>
                    <option value="failed">{t('failed')}</option>
                </select>
                <button className="refresh-btn" onClick={fetchContracts}>
                    <RefreshCw size={16} />
                    {t('refresh')}
                </button>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : contracts.length === 0 ? (
                <div className="empty-state">
                    <FileText size={48} />
                    <p>{t('no_contracts_found')}</p>
                    <button className="create-btn" onClick={handleCreateClick}>
                        <Plus size={16} />
                        {t('create_your_first_contract')}
                    </button>
                </div>
            ) : (
                <>
                    <div className="contracts-grid">
                        {contracts.map(renderContractCard)}
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        pageSize={pageSize}
                        onPageSizeChange={(size) => {
                            setPageSize(size);
                            setCurrentPage(1);
                        }}
                        totalItems={totalItems}
                    />
                </>
            )}

            {/* Modals */}
            <ContractFormModal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setStockData(null);
                }}
                onSubmit={handleCreateContract}
                mode="create"
                stockData={stockData}
                apiClient={apiClient}
            />

            <ContractFormModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedContract(null);
                }}
                onSubmit={handleUpdateContract}
                initialData={selectedContract}
                mode="edit"
                apiClient={apiClient}
            />

            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => {
                    setShowPaymentModal(false);
                    setSelectedContract(null);
                }}
                onSubmit={handleAddPayment}
                contract={selectedContract}
            />

            <DeliveryModal
                isOpen={showDeliveryModal}
                onClose={() => {
                    setShowDeliveryModal(false);
                    setSelectedContract(null);
                }}
                onSubmit={handleUpdateDelivery}
                contract={selectedContract}
                onUpdate={handleUpdateDelivery}
            />

            <ContractDetailsModal
                isOpen={showDetailsModal}
                onClose={() => {
                    setShowDetailsModal(false);
                    setSelectedContract(null);
                }}
                contract={selectedContract}
                onUpdate={(contract) => {
                    setSelectedContract(contract);
                    setShowEditModal(true);
                }}
                onPayment={(contract) => {
                    setSelectedContract(contract);
                    setShowPaymentModal(true);
                }}
                onDelivery={(contract) => {
                    setSelectedContract(contract);
                    setShowDeliveryModal(true);
                }}
            />
            <CreateOptionsModal />
        </div>
    );
}