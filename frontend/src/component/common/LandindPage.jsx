import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import {
  MapPin, ArrowRight, Play, Clock, X, ArrowLeft,
  Eye, EyeOff, ChevronDown, AlertCircle, CheckCircle,
  Loader2, Search, Handshake, TrendingUp, Sprout, Truck,
  Send, RefreshCw, ShieldCheck, Globe,
} from "lucide-react";

import locationData from "./locationData.json";
import countryCodes from "./countryCodes.json";

const BASE_URL = "http://127.0.0.1:8000";

const LANGUAGES = [
  { code: "en", label: "English",     flag: "🇬🇧" },
  { code: "sw", label: "Swahili",     flag: "🇹🇿" },
  { code: "fr", label: "Français",    flag: "🇫🇷" },
  { code: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
];

const farmBgStyle = {
  backgroundImage: `linear-gradient(
    to right,
    rgba(10, 30, 10, 0.88) 0%,
    rgba(20, 50, 15, 0.62) 50%,
    rgba(10, 30, 10, 0.32) 100%
  ), url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1600&q=80")`,
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const dialCodeMap = {
  AF:"93",AL:"355",DZ:"213",AD:"376",AO:"244",AG:"1268",AR:"54",AM:"374",
  AU:"61",AT:"43",AZ:"994",BS:"1242",BH:"973",BD:"880",BB:"1246",BY:"375",
  BE:"32",BZ:"501",BJ:"229",BT:"975",BO:"591",BA:"387",BW:"267",BR:"55",
  BN:"673",BG:"359",BF:"226",BI:"257",CV:"238",KH:"855",CM:"237",CA:"1",
  CF:"236",TD:"235",CL:"56",CN:"86",CO:"57",KM:"269",CG:"242",CR:"506",
  HR:"385",CU:"53",CY:"357",CZ:"420",DK:"45",DJ:"253",DM:"1767",DO:"1809",
  CD:"243",EC:"593",EG:"20",SV:"503",GQ:"240",ER:"291",EE:"372",SZ:"268",
  ET:"251",FJ:"679",FI:"358",FR:"33",GA:"241",GM:"220",GE:"995",DE:"49",
  GH:"233",GR:"30",GD:"1473",GT:"502",GN:"224",GW:"245",GY:"592",HT:"509",
  HN:"504",HU:"36",IS:"354",IN:"91",ID:"62",IR:"98",IQ:"964",IE:"353",
  IL:"972",IT:"39",CI:"225",JM:"1876",JP:"81",JO:"962",KZ:"7",KE:"254",
  KI:"686",KW:"965",KG:"996",LA:"856",LV:"371",LB:"961",LS:"266",LR:"231",
  LY:"218",LI:"423",LT:"370",LU:"352",MG:"261",MW:"265",MY:"60",MV:"960",
  ML:"223",MT:"356",MH:"692",MR:"222",MU:"230",MX:"52",FM:"691",MD:"373",
  MC:"377",MN:"976",ME:"382",MA:"212",MZ:"258",MM:"95",NA:"264",NR:"674",
  NP:"977",NL:"31",NZ:"64",NI:"505",NE:"227",NG:"234",KP:"850",MK:"389",
  NO:"47",OM:"968",PK:"92",PW:"680",PS:"970",PA:"507",PG:"675",PY:"595",
  PE:"51",PH:"63",PL:"48",PT:"351",QA:"974",RO:"40",RU:"7",RW:"250",
  KN:"1869",LC:"1758",VC:"1784",WS:"685",SM:"378",ST:"239",SA:"966",
  SN:"221",RS:"381",SC:"248",SL:"232",SG:"65",SK:"421",SI:"386",SB:"677",
  SO:"252",ZA:"27",KR:"82",SS:"211",ES:"34",LK:"94",SD:"249",SR:"597",
  SE:"46",CH:"41",SY:"963",TW:"886",TJ:"992",TZ:"255",TH:"66",TL:"670",
  TG:"228",TO:"676",TT:"1868",TN:"216",TR:"90",TM:"993",TV:"688",UG:"256",
  UA:"380",AE:"971",GB:"44",US:"1",UY:"598",UZ:"998",VU:"678",VA:"379",
  VE:"58",VN:"84",YE:"967",ZM:"260",ZW:"263",
};

const phoneLengthRules = {
  RW:{ min:9,  max:9,  hint:"9 digits" },
  US:{ min:10, max:10, hint:"10 digits" },
  CA:{ min:10, max:10, hint:"10 digits" },
  GB:{ min:10, max:11, hint:"10-11 digits" },
  KE:{ min:9,  max:10, hint:"9-10 digits" },
  UG:{ min:9,  max:9,  hint:"9 digits" },
  TZ:{ min:9,  max:9,  hint:"9 digits" },
  NG:{ min:10, max:10, hint:"10 digits" },
  ZA:{ min:9,  max:10, hint:"9-10 digits" },
  IN:{ min:10, max:10, hint:"10 digits" },
  FR:{ min:9,  max:9,  hint:"9 digits" },
  DE:{ min:10, max:11, hint:"10-11 digits" },
  CN:{ min:11, max:11, hint:"11 digits" },
  JP:{ min:10, max:11, hint:"10-11 digits" },
  BR:{ min:10, max:11, hint:"10-11 digits" },
  AU:{ min:9,  max:9,  hint:"9 digits" },
  ET:{ min:9,  max:9,  hint:"9 digits" },
  GH:{ min:9,  max:9,  hint:"9 digits" },
  CM:{ min:9,  max:9,  hint:"9 digits" },
  DEFAULT:{ min:7, max:15, hint:"7-15 digits" },
};

const enrichedCountries = countryCodes.map(c => ({
  ...c,
  dialCode: dialCodeMap[c.code] || "",
}));

// AFTER
const apiFetch = async (path, options = {}) => {
  const lang = localStorage.getItem("language") || i18n.language || "en";

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": lang,          // ← tells the backend which language to use
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
};

const saveUserToStorage = (userData) => {
  localStorage.setItem("user",          JSON.stringify(userData));
  localStorage.setItem("access_token",  userData.token?.access  || "");
  localStorage.setItem("refresh_token", userData.token?.refresh || "");
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeLang, setActiveLang] = useState(
    () => LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]
  );
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const [showModal,   setShowModal]   = useState(false);
  const [modalType,   setModalType]   = useState("signin");
  const [navScrolled, setNavScrolled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [apiError,    setApiError]    = useState("");
  const [apiSuccess,  setApiSuccess]  = useState("");

  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullname,        setFullname]        = useState("");
  const [accountType,     setAccountType]     = useState("");
  const [province,        setProvince]        = useState("");
  const [district,        setDistrict]        = useState("");
  const [sector,          setSector]          = useState("");
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);

  const [selectedCountry,     setSelectedCountry]     = useState(() => enrichedCountries.find(c => c.code === "RW") || enrichedCountries[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch,       setCountrySearch]       = useState("");
  const [phoneRaw,            setPhoneRaw]            = useState("");
  const [phoneError,          setPhoneError]          = useState("");
  const [phoneTouched,        setPhoneTouched]        = useState(false);
  const phoneWrapRef = useRef(null);

  const [otp,       setOtp]       = useState(["","","","","",""]);
  const [sessionId, setSessionId] = useState(null);
  const [timer,     setTimer]     = useState(60);

  const [newPassword,    setNewPassword]    = useState("");
  const [confirmNewPwd,  setConfirmNewPwd]  = useState("");
  const [showNewPwd,     setShowNewPwd]     = useState(false);
  const [showConfNewPwd, setShowConfNewPwd] = useState(false);

  const [contactNames,   setContactNames]   = useState("");
  const [contactEmail,   setContactEmail]   = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactDesc,    setContactDesc]    = useState("");

  const provinces = locationData.provinces.map(p => p.city || p.province);
  const districts = province
    ? (locationData.provinces.find(p => (p.city || p.province) === province)?.coordinates?.districts || [])
    : [];
  const sectors = district
    ? (districts.find(d => d.name === district)?.sectors || [])
    : [];

  const filteredCountries = enrichedCountries.filter(c =>
    c.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
    (dialCodeMap[c.code] || "").includes(countrySearch.replace("+",""))
  );

  const getPhoneRule = (code) => phoneLengthRules[code] || phoneLengthRules.DEFAULT;

  const validatePhone = (digits, code) => {
    if (!digits) return t("validation.phoneRequired");
    if (!/^\d+$/.test(digits)) return t("validation.phoneDigitsOnly");
    const rule = getPhoneRule(code);
    if (digits.length < rule.min) return t("validation.phoneTooShort", { min: rule.min, hint: rule.hint });
    if (digits.length > rule.max) return t("validation.phoneTooLong", { max: rule.max, hint: rule.hint });
    return "";
  };

  const isPhoneValid = phoneTouched && phoneRaw && !validatePhone(phoneRaw, selectedCountry?.code);
  const fullPhone    = phoneRaw ? `+${selectedCountry?.dialCode}${phoneRaw}` : "";

  const handlePhoneChange = (value) => {
    const digits = value.replace(/\D/g, "");
    setPhoneRaw(digits);
    setPhoneTouched(true);
    setPhoneError(validatePhone(digits, selectedCountry?.code));
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setShowCountryDropdown(false);
    setCountrySearch("");
    if (phoneTouched && phoneRaw) setPhoneError(validatePhone(phoneRaw, country.code));
  };

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const handleLangChange = (lang) => {
    i18n.changeLanguage(lang.code);
    localStorage.setItem("language", lang.code);
    setActiveLang(lang);
    setLangOpen(false);
  };

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = (showModal || sidebarOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showModal, sidebarOpen]);

  useEffect(() => {
    let iv;
    if ((modalType === "otp" || modalType === "forgot-otp") && timer > 0) {
      iv = setInterval(() => setTimer(p => p - 1), 1000);
    }
    return () => clearInterval(iv);
  }, [modalType, timer]);

  useEffect(() => {
    if (!showCountryDropdown) return;
    const handler = (e) => {
      if (phoneWrapRef.current && !phoneWrapRef.current.contains(e.target))
        setShowCountryDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCountryDropdown]);

  useEffect(() => {
    if (!langOpen) return;
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen]);

  const handleOtpChange = (i, v) => {
    if (v.length > 1) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) document.getElementById(`otp-${i-1}`)?.focus();
  };
  const otpValue = otp.join("");

  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
    setSidebarOpen(false);
    setApiError("");
    setApiSuccess("");
    if (type === "otp" || type === "forgot-otp") { setTimer(60); setOtp(["","","","","",""]); }
  };

  const closeModal = () => {
    setShowModal(false);
    setApiError(""); setApiSuccess("");
    setEmail(""); setPassword(""); setConfirmPassword(""); setFullname("");
    setAccountType(""); setProvince(""); setDistrict(""); setSector("");
    setOtp(["","","","","",""]); setSessionId(null);
    setPhoneRaw(""); setPhoneError(""); setPhoneTouched(false);
    setSelectedCountry(enrichedCountries.find(c => c.code === "RW") || enrichedCountries[0]);
    setShowCountryDropdown(false); setCountrySearch("");
    setNewPassword(""); setConfirmNewPwd("");
    setContactNames(""); setContactEmail(""); setContactSubject(""); setContactDesc("");
  };

  const navigateByRole = (role) => {
    switch(role) {
      case "admin":  navigate("/admin");     break;
      case "farmer": navigate("/farmer/myStocks");    break;
      case "buyer":  navigate("/buyer/contracts");     break;
      default:       navigate("/dashboard");
    }
  };

  // ── API ──────────────────────────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault();
    setApiError(""); setLoading(true);
    try {
      const { ok, data } = await apiFetch("/login/", { method:"POST", body:JSON.stringify({ identifier:email, password }) });
      if (!ok) { setApiError(data.error || t("api.loginFailed")); return; }
      saveUserToStorage(data); closeModal(); navigateByRole(data.role);
    } catch { setApiError(t("validation.networkError")); }
    finally { setLoading(false); }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setApiError("");
    const err = validatePhone(phoneRaw, selectedCountry?.code);
    if (err) { setPhoneError(err); setPhoneTouched(true); return; }
    if (!accountType) { setApiError(t("validation.selectRole")); return; }
    const location = sector ? `${sector}, ${district}, ${province}` : "";
    setLoading(true);
    try {
      const { ok, data } = await apiFetch("/register/", { method:"POST", body:JSON.stringify({ full_name:fullname, phone:fullPhone, email, password, confirmPassword, role:accountType, location }) });
      if (!ok) { setApiError(data.error || t("api.registrationFailed")); return; }
      setSessionId(data.session_id); openModal("otp");
    } catch { setApiError(t("validation.networkError")); }
    finally { setLoading(false); }
  };

  const handleVerifyRegisterOtp = async (e) => {
    e.preventDefault();
    if (otpValue.length < 6) { setApiError(t("validation.enterAllOtp")); return; }
    setApiError(""); setLoading(true);
    try {
      const { ok, data } = await apiFetch("/register/verify-otp/", { method:"POST", body:JSON.stringify({ session_id:sessionId, otp:otpValue }) });
      if (!ok) { setApiError(data.error || t("api.otpVerificationFailed")); return; }
      saveUserToStorage(data); closeModal(); navigateByRole(data.role);
    } catch { setApiError(t("validation.networkError")); }
    finally { setLoading(false); }
  };

  const handleResendRegisterOtp = async () => {
    setApiError(""); setLoading(true);
    try {
      const { ok, data } = await apiFetch("/register/resend-otp/", { method:"POST", body:JSON.stringify({ session_id:sessionId }) });
      if (!ok) { setApiError(data.error || t("api.otpResendFailed")); return; }
      setApiSuccess(data.message || t("api.otpResent")); setTimer(60); setOtp(["","","","","",""]);
    } catch { setApiError(t("validation.networkError")); }
    finally { setLoading(false); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setApiError(""); setLoading(true);
    try {
      const { ok, data } = await apiFetch("/forget-password/", { method:"POST", body:JSON.stringify({ email }) });
      if (!ok) { setApiError(data.error || t("api.forgotPasswordFailed")); return; }
      setSessionId(data.session_id); openModal("forgot-otp");
    } catch { setApiError(t("validation.networkError")); }
    finally { setLoading(false); }
  };

  const handleVerifyForgotOtp = async (e) => {
    e.preventDefault();
    if (otpValue.length < 6) { setApiError(t("validation.enterAllOtp")); return; }
    if (!newPassword || !confirmNewPwd) { setApiError(t("validation.passwordsRequired")); return; }
    if (newPassword !== confirmNewPwd)  { setApiError(t("validation.passwordsDoNotMatch")); return; }
    setApiError(""); setLoading(true);
    try {
      const { ok, data } = await apiFetch("/forget-password/verify-otp/", { method:"POST", body:JSON.stringify({ session_id:sessionId, otp:otpValue, new_password:newPassword, confirmPassword:confirmNewPwd }) });
      if (!ok) { setApiError(data.error || t("api.otpVerificationFailed")); return; }
      saveUserToStorage(data); closeModal(); navigateByRole(data.role);
    } catch { setApiError(t("validation.networkError")); }
    finally { setLoading(false); }
  };

  const handleResendForgotOtp = async () => {
    setApiError(""); setLoading(true);
    try {
      const { ok, data } = await apiFetch("/forget-password/resend-otp/", { method:"POST", body:JSON.stringify({ session_id:sessionId }) });
      if (!ok) { setApiError(data.error || t("api.otpResendFailed")); return; }
      setApiSuccess(data.message || t("api.otpResent")); setTimer(60); setOtp(["","","","","",""]);
    } catch { setApiError(t("validation.networkError")); }
    finally { setLoading(false); }
  };

  const handleContactUs = async (e) => {
    e.preventDefault();
    setApiError(""); setLoading(true);
    try {
      const { ok, data } = await apiFetch("/contact/", { method:"POST", body:JSON.stringify({ names:contactNames, email:contactEmail, subject:contactSubject, description:contactDesc }) });
      if (!ok) {
        setApiError(typeof data === "object" ? (data.error || Object.values(data).flat().join(" ")) : t("contact.error"));
        return;
      }
      setApiSuccess(t("contact.success"));
      setContactNames(""); setContactEmail(""); setContactSubject(""); setContactDesc("");
    } catch { setApiError(t("validation.networkError")); }
    finally { setLoading(false); }
  };

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Playfair+Display:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f3ef; }
        :root {
          --green-dark: #1a3d2b; --green-mid: #2e6b45; --green-light: #4caf71;
          --amber: #e8a838; --amber-dark: #c8871a; --cream: #f8f6f0;
          --text-dark: #1a1a1a; --text-mid: #444; --text-soft: #777;
          --border: #e2ddd4; --error: #c0392b; --success: #2e6b45;
        }

        /* NAV */
        .nav { position:fixed; top:0; left:0; right:0; z-index:100; display:flex; align-items:center; justify-content:space-between; padding:0 56px; height:76px; transition:all 0.35s ease; }
        .nav.scrolled { background:rgba(248,246,240,0.97); backdrop-filter:blur(12px); box-shadow:0 1px 0 rgba(0,0,0,0.08); }
        .nav-logo { display:flex; align-items:center; gap:10px; font-family:'Playfair Display',serif; font-weight:800; font-size:22px; text-decoration:none; letter-spacing:-0.5px; transition:color 0.3s; }
        .nav.scrolled .nav-logo { color:var(--green-dark); }
        .nav:not(.scrolled) .nav-logo { color:#fff; }
        .logo-mark { width:36px; height:36px; border-radius:8px; background:var(--green-mid); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .nav-links { display:flex; align-items:center; gap:36px; list-style:none; }
        .nav-links a { font-size:14.5px; font-weight:500; text-decoration:none; transition:color 0.2s; letter-spacing:0.1px; }
        .nav.scrolled .nav-links a { color:var(--text-mid); }
        .nav:not(.scrolled) .nav-links a { color:rgba(255,255,255,0.88); }
        .nav.scrolled .nav-links a:hover { color:var(--green-mid); }
        .nav:not(.scrolled) .nav-links a:hover { color:#fff; }
        .nav-actions { display:flex; align-items:center; gap:10px; }

        /* LANG SWITCHER */
        .nav-lang-wrap { position:relative; }
        .nav-lang-btn { display:flex; align-items:center; gap:5px; padding:7px 11px; border-radius:8px; border:none; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit; transition:all 0.2s; white-space:nowrap; }
        .nav.scrolled .nav-lang-btn { background:rgba(26,61,43,0.08); color:var(--green-dark); }
        .nav:not(.scrolled) .nav-lang-btn { background:rgba(255,255,255,0.15); color:#fff; }
        .nav.scrolled .nav-lang-btn:hover { background:rgba(26,61,43,0.15); }
        .nav:not(.scrolled) .nav-lang-btn:hover { background:rgba(255,255,255,0.25); }
        .lang-chev { transition:transform 0.2s; display:flex; align-items:center; }
        .lang-chev.up { transform:rotate(180deg); }
        .nav-lang-menu { position:absolute; top:calc(100% + 10px); right:0; background:#fff; border-radius:12px; min-width:185px; box-shadow:0 8px 32px rgba(0,0,0,0.14); border:1px solid var(--border); overflow:hidden; opacity:0; transform:translateY(-8px) scale(0.97); pointer-events:none; transition:all 0.18s cubic-bezier(0.4,0,0.2,1); z-index:300; }
        .nav-lang-menu.open { opacity:1; transform:translateY(0) scale(1); pointer-events:all; }
        .lang-opt { display:flex; align-items:center; gap:10px; padding:10px 14px; cursor:pointer; font-size:13.5px; font-weight:500; color:var(--text-mid); transition:background 0.14s; }
        .lang-opt:hover { background:#f0f7f2; }
        .lang-opt.active { background:#edf7f1; color:var(--green-mid); font-weight:700; }
        .lang-check { margin-left:auto; color:var(--green-mid); }

        /* BTNS */
        .btn-outline { padding:9px 22px; border-radius:7px; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s; background:transparent; font-family:inherit; }
        .nav.scrolled .btn-outline { border:1.5px solid var(--green-dark); color:var(--green-dark); }
        .nav:not(.scrolled) .btn-outline { border:1.5px solid rgba(255,255,255,0.65); color:#fff; }
        .nav.scrolled .btn-outline:hover { background:var(--green-dark); color:#fff; }
        .nav:not(.scrolled) .btn-outline:hover { background:rgba(255,255,255,0.15); }
        .btn-filled { padding:9px 22px; border-radius:7px; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s; border:none; background:var(--amber); color:var(--text-dark); font-family:inherit; }
        .btn-filled:hover { background:var(--amber-dark); color:#fff; }

        /* HAMBURGER */
        .hamburger { display:none; flex-direction:column; gap:5px; width:38px; height:38px; background:transparent; border:none; cursor:pointer; align-items:center; justify-content:center; border-radius:6px; }
        .hamburger span { display:block; width:20px; height:2px; border-radius:2px; transition:all 0.3s; }
        .nav.scrolled .hamburger span { background:var(--green-dark); }
        .nav:not(.scrolled) .hamburger span { background:#fff; }
        .hamburger.open span:nth-child(1) { transform:translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity:0; }
        .hamburger.open span:nth-child(3) { transform:translateY(-7px) rotate(-45deg); }

        /* SIDEBAR */
        .sb-overlay { position:fixed; inset:0; z-index:150; background:rgba(0,0,0,0.45); opacity:0; pointer-events:none; transition:opacity 0.3s; }
        .sb-overlay.open { opacity:1; pointer-events:all; }
        .sidebar { position:fixed; top:0; right:0; bottom:0; z-index:160; width:290px; background:#fff; display:flex; flex-direction:column; transform:translateX(100%); transition:transform 0.35s cubic-bezier(0.4,0,0.2,1); box-shadow:-4px 0 30px rgba(0,0,0,0.12); }
        .sidebar.open { transform:translateX(0); }
        .sb-header { display:flex; align-items:center; justify-content:space-between; padding:20px 22px; border-bottom:1px solid var(--border); }
        .sb-close { width:34px; height:34px; border-radius:50%; background:#f5f5f5; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#888; transition:all 0.2s; }
        .sb-close:hover { background:#fee; color:#c0392b; }
        .sb-links { flex:1; padding:18px 0; list-style:none; overflow-y:auto; }
        .sb-links li a { display:block; padding:13px 22px; font-size:15px; font-weight:500; color:var(--text-mid); text-decoration:none; transition:all 0.2s; border-left:3px solid transparent; }
        .sb-links li a:hover { background:#f0f7f2; color:var(--green-mid); border-left-color:var(--green-mid); }
        .sb-lang { padding:14px 22px; border-top:1px solid var(--border); }
        .sb-lang-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#aaa; margin-bottom:10px; display:flex; align-items:center; gap:5px; }
        .sb-lang-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .sb-lang-item { display:flex; align-items:center; gap:7px; padding:8px 10px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:var(--text-mid); border:1.5px solid var(--border); transition:all 0.18s; }
        .sb-lang-item:hover { background:#f0f7f2; border-color:var(--green-mid); color:var(--green-mid); }
        .sb-lang-item.active { background:#edf7f1; border-color:var(--green-mid); color:var(--green-mid); font-weight:700; }
        .sb-actions { padding:18px 22px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:10px; }
        .sb-btn-outline { width:100%; padding:11px; border-radius:7px; font-size:14px; font-weight:600; cursor:pointer; border:1.5px solid var(--green-dark); background:transparent; color:var(--green-dark); font-family:inherit; transition:all 0.2s; }
        .sb-btn-outline:hover { background:var(--green-dark); color:#fff; }
        .sb-btn-filled { width:100%; padding:11px; border-radius:7px; font-size:14px; font-weight:600; cursor:pointer; background:var(--amber); color:var(--text-dark); border:none; font-family:inherit; transition:all 0.2s; }
        .sb-btn-filled:hover { background:var(--amber-dark); color:#fff; }

        /* HERO */
        .hero { min-height:100vh; display:flex; align-items:center; padding:120px 56px 80px; }
        .hero-inner { max-width:620px; }
        .hero-badge { display:inline-flex; align-items:center; gap:7px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.25); border-radius:30px; padding:6px 14px; font-size:13px; color:rgba(255,255,255,0.9); font-weight:500; margin-bottom:24px; backdrop-filter:blur(4px); }
        .hero h1 { font-family:'Playfair Display',serif; font-size:clamp(40px,5.5vw,68px); font-weight:800; line-height:1.08; color:#fff; margin-bottom:20px; letter-spacing:-1px; }
        .hero h1 em { font-style:italic; color:var(--amber); }
        .hero p { font-size:17px; line-height:1.7; color:rgba(255,255,255,0.85); margin-bottom:40px; max-width:500px; }
        .hero-cta { display:flex; gap:14px; flex-wrap:wrap; }
        .cta-primary { display:inline-flex; align-items:center; gap:8px; padding:15px 34px; border-radius:8px; font-size:15.5px; font-weight:700; background:var(--amber); color:var(--text-dark); border:none; cursor:pointer; transition:all 0.2s; font-family:inherit; }
        .cta-primary:hover { background:var(--amber-dark); color:#fff; transform:translateY(-2px); box-shadow:0 8px 24px rgba(232,168,56,0.4); }
        .cta-ghost { display:inline-flex; align-items:center; gap:8px; padding:15px 28px; border-radius:8px; font-size:15.5px; font-weight:600; background:transparent; color:#fff; border:2px solid rgba(255,255,255,0.45); cursor:pointer; transition:all 0.2s; font-family:inherit; }
        .cta-ghost:hover { background:rgba(255,255,255,0.1); border-color:#fff; }

        /* STATS */
        .stats-strip { display:flex; background:var(--cream); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        .stat-item { flex:1; padding:28px 32px; border-right:1px solid var(--border); }
        .stat-item:last-child { border-right:none; }
        .stat-num { font-family:'Playfair Display',serif; font-size:32px; font-weight:800; color:var(--green-dark); line-height:1; margin-bottom:6px; }
        .stat-label { font-size:14px; color:var(--text-soft); font-weight:500; }

        /* FEATURES */
        .features { padding:80px 56px; background:#fff; }
        .section-label { font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--green-mid); margin-bottom:12px; }
        .section-heading { font-family:'Playfair Display',serif; font-size:clamp(28px,3.5vw,42px); font-weight:800; color:var(--green-dark); margin-bottom:14px; letter-spacing:-0.5px; }
        .section-sub { font-size:17px; color:var(--text-soft); max-width:550px; line-height:1.65; margin-bottom:50px; }
        .features-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:24px; max-width:1200px; margin:0 auto; }
        .feature-card { padding:32px; border-radius:14px; background:var(--cream); border:1px solid var(--border); transition:all 0.3s; }
        .feature-card:hover { transform:translateY(-5px); box-shadow:0 16px 48px rgba(26,61,43,0.1); border-color:var(--green-light); }
        .f-icon { width:54px; height:54px; border-radius:12px; background:linear-gradient(135deg,var(--green-mid),var(--green-light)); display:flex; align-items:center; justify-content:center; margin-bottom:20px; }
        .feature-card h3 { font-size:18px; font-weight:700; color:var(--green-dark); margin-bottom:10px; }
        .feature-card p { font-size:14.5px; color:var(--text-soft); line-height:1.65; }

        /* FOOTER */
        .footer { background:var(--green-dark); padding:32px 56px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .footer-logo { font-family:'Playfair Display',serif; font-size:20px; font-weight:800; color:#fff; }
        .footer p { font-size:13.5px; color:rgba(255,255,255,0.6); }

        /* MODAL */
        .modal-overlay { position:fixed; inset:0; z-index:200; background:rgba(15,25,20,0.72); display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; pointer-events:none; transition:opacity 0.3s; }
        .modal-overlay.visible { opacity:1; pointer-events:all; }
        .modal-card { background:#fff; border-radius:18px; width:100%; max-width:500px; position:relative; transform:translateY(18px); transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1); box-shadow:0 32px 80px rgba(0,0,0,0.25); }
        .modal-overlay.visible .modal-card { transform:translateY(0); }
        .modal-card.scrollable { max-height:92vh; display:flex; flex-direction:column; }
        .modal-card.scrollable .modal-head { flex-shrink:0; }
        .modal-card.scrollable .modal-body { overflow-y:auto; flex:1; scrollbar-width:thin; }
        .modal-head { padding:28px 28px 0; position:relative; text-align:center; }
        .m-close { position:absolute; top:18px; right:18px; width:34px; height:34px; border-radius:50%; background:#f5f5f5; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#888; transition:all 0.2s; }
        .m-close:hover { background:#ffe0e0; color:var(--error); }
        .m-back { width:32px; height:32px; border-radius:50%; background:#f0f7f2; border:none; cursor:pointer; color:var(--green-mid); transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px; }
        .m-back:hover { background:#d5eedd; }
        .modal-head h2 { font-family:'Playfair Display',serif; font-size:26px; font-weight:800; color:var(--green-dark); margin-bottom:6px; }
        .modal-head p { font-size:14px; color:var(--text-soft); padding-bottom:22px; }
        .modal-body { padding:0 28px 28px; }
        .form-group { margin-bottom:18px; }
        .form-group label { display:block; font-size:13px; font-weight:600; color:var(--text-mid); margin-bottom:6px; }
        .form-input { width:100%; padding:11px 14px; border:1.5px solid var(--border); border-radius:8px; font-size:14.5px; color:var(--text-dark); background:#fff; outline:none; transition:all 0.2s; font-family:inherit; }
        .form-input:focus { border-color:var(--green-mid); box-shadow:0 0 0 3px rgba(46,107,69,0.1); }
        .form-input::placeholder { color:#c0bbb3; }
        .form-input:disabled { background:#f5f5f5; cursor:not-allowed; opacity:0.55; }
        .pwd-wrap { position:relative; }
        .pwd-wrap .form-input { padding-right:42px; }
        .pwd-eye { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#aaa; padding:4px; transition:color 0.2s; }
        .pwd-eye:hover { color:var(--green-mid); }
        .role-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:18px; }
        .role-btn { padding:13px 8px; border-radius:8px; border:2px solid var(--border); background:#fff; font-size:13.5px; font-weight:600; color:var(--text-soft); cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; font-family:inherit; }
        .role-btn.active { border-color:var(--green-mid); color:var(--green-mid); background:#edf7f1; }
        .phone-field-wrap { position:relative; }
        .phone-row { display:flex; align-items:stretch; border:1.5px solid var(--border); border-radius:8px; overflow:hidden; transition:border-color 0.2s,box-shadow 0.2s; background:#fff; }
        .phone-row:focus-within { border-color:var(--green-mid); box-shadow:0 0 0 3px rgba(46,107,69,0.1); }
        .phone-row.has-error { border-color:var(--error); }
        .phone-row.is-valid { border-color:var(--green-mid); }
        .cc-btn { display:flex; align-items:center; gap:4px; padding:0 11px; background:#f8f6f0; border:none; border-right:1.5px solid #e8e4db; cursor:pointer; font-family:inherit; white-space:nowrap; flex-shrink:0; min-width:86px; justify-content:center; transition:background 0.2s; }
        .cc-btn:hover { background:#f0ece3; }
        .cc-flag { font-size:17px; line-height:1; }
        .cc-dial { font-size:13px; font-weight:600; color:var(--text-mid); }
        .phone-num-input { flex:1; padding:11px 13px; border:none; outline:none; font-size:14.5px; color:var(--text-dark); background:transparent; font-family:inherit; min-width:0; }
        .phone-num-input::placeholder { color:#c0bbb3; }
        .phone-status { display:flex; align-items:center; padding-right:11px; flex-shrink:0; }
        .country-dd { position:absolute; top:calc(100% + 5px); left:0; right:0; background:#fff; border:1.5px solid var(--border); border-radius:10px; box-shadow:0 10px 36px rgba(0,0,0,0.14); z-index:600; overflow:hidden; max-height:250px; display:flex; flex-direction:column; }
        .dd-list { overflow-y:auto; flex:1; }
        .dd-opt { display:flex; align-items:center; gap:8px; padding:9px 13px; cursor:pointer; transition:background 0.12s; }
        .dd-opt:hover { background:#f0f7f2; }
        .dd-opt.sel { background:#edf7f1; }
        .dd-opt.sel .dd-name { font-weight:700; color:var(--green-mid); }
        .dd-name { flex:1; font-size:13px; color:var(--text-mid); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .dd-code { font-size:12px; color:var(--text-soft); }
        .ph-feedback { display:flex; align-items:flex-start; gap:5px; margin-top:5px; font-size:12px; font-weight:500; line-height:1.4; }
        .ph-feedback.error { color:var(--error); }
        .ph-feedback.valid { color:var(--success); }
        .ph-feedback.hint { color:#aaa; }
        .otp-row { display:flex; gap:8px; justify-content:center; margin:24px 0 18px; }
        .otp-box { width:48px; height:54px; border:2px solid var(--border); border-radius:9px; text-align:center; font-size:22px; font-weight:700; color:var(--green-dark); outline:none; transition:all 0.2s; font-family:inherit; }
        .otp-box:focus { border-color:var(--green-mid); box-shadow:0 0 0 3px rgba(46,107,69,0.12); }
        .otp-timer { text-align:center; font-size:15px; color:#e07b39; font-weight:700; margin-bottom:14px; }
        .resend-row { text-align:center; margin-top:12px; font-size:13.5px; color:var(--text-soft); }
        .resend-row button { background:none; border:none; color:var(--green-mid); font-weight:700; cursor:pointer; font-family:inherit; font-size:inherit; }
        .resend-row button:hover { text-decoration:underline; }
        .resend-row button:disabled { color:#bbb; cursor:not-allowed; }
        .alert { padding:11px 14px; border-radius:8px; font-size:13.5px; font-weight:500; margin-bottom:16px; display:flex; align-items:flex-start; gap:8px; line-height:1.5; }
        .alert.error   { background:#fdf1f0; border:1px solid #f5c6c2; color:var(--error); }
        .alert.success { background:#edf7f1; border:1px solid #a8d8b3; color:var(--success); }
        .btn-submit { width:100%; padding:13px; border-radius:8px; font-size:15px; font-weight:700; background:var(--green-mid); color:#fff; border:none; cursor:pointer; transition:all 0.2s; margin-top:8px; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:8px; }
        .btn-submit:hover:not(:disabled) { background:var(--green-dark); }
        .btn-submit:disabled { background:#c5cfc7; cursor:not-allowed; }
        .spin-icon { animation:spin 0.7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .dd-search-wrap { padding:9px 11px; border-bottom:1px solid #f0ece3; flex-shrink:0; position:relative; }
        .dd-search-icon { position:absolute; left:20px; top:50%; transform:translateY(-50%); color:#bbb; pointer-events:none; }
        .dd-search { width:100%; padding:7px 10px 7px 28px; border-radius:6px; border:1px solid var(--border); font-size:13px; outline:none; font-family:inherit; background:#fafaf8; }
        .dd-search:focus { border-color:var(--green-mid); }
        .cc-chev { color:#bbb; transition:transform 0.2s; display:flex; align-items:center; }
        .cc-chev.open { transform:rotate(180deg); }
        .modal-foot { text-align:center; margin-top:16px; font-size:13.5px; color:var(--text-soft); }
        .modal-foot a { color:var(--green-mid); font-weight:600; cursor:pointer; text-decoration:none; }
        .modal-foot a:hover { text-decoration:underline; }
        .forgot-row { text-align:right; margin-top:6px; }
        .forgot-row a { color:var(--green-mid); font-size:13px; cursor:pointer; text-decoration:none; font-weight:500; }
        .forgot-row a:hover { text-decoration:underline; }

        @media (max-width: 840px) {
          .nav { padding:0 20px; height:68px; }
          .nav-links, .btn-outline, .btn-filled, .nav-lang-wrap { display:none; }
          .hamburger { display:flex; }
          .hero { padding:100px 22px 50px; }
          .features { padding:60px 22px; }
          .stats-strip { flex-direction:column; }
          .stat-item { border-right:none; border-bottom:1px solid var(--border); }
          .stat-item:last-child { border-bottom:none; }
          .footer { padding:24px 22px; flex-direction:column; text-align:center; }
          .otp-row { gap:6px; }
          .otp-box { width:42px; height:50px; font-size:20px; }
          .modal-overlay { align-items:flex-end; padding:0; }
          .modal-card { border-radius:20px 20px 0 0; max-width:100%; }
          .modal-card.scrollable { max-height:94vh; }
          .role-grid { grid-template-columns:1fr; }
          .country-dd { position:fixed; left:0; right:0; bottom:0; top:auto; border-radius:16px 16px 0 0; max-height:65vh; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav className={`nav ${navScrolled ? "scrolled" : ""}`}>
        <a href="#" className="nav-logo">
          <div className="logo-mark"><MapPin size={18} color="#fff" strokeWidth={2.5} /></div>
          {t("app.name")}
        </a>

        <ul className="nav-links">
          {[
            { key:"nav.features",   label: t("nav.features")   },
            { key:"nav.howItWorks", label: t("nav.howItWorks") },
            { key:"nav.pricing",    label: t("nav.pricing")    },
            { key:"nav.about",      label: t("nav.about")      },
          ].map(n => <li key={n.key}><a href="#">{n.label}</a></li>)}
          <li><a href="#" onClick={e => { e.preventDefault(); openModal("contact"); }}>{t("nav.contactUs")}</a></li>
        </ul>

        <div className="nav-actions">
          {/* Language switcher */}
          <div className="nav-lang-wrap" ref={langRef}>
            <button className="nav-lang-btn" onClick={() => setLangOpen(v => !v)} aria-label="Language">
              <Globe size={14} strokeWidth={2.2} />
              <span>{activeLang.flag}</span>
              <span>{activeLang.code.toUpperCase()}</span>
              <span className={`lang-chev ${langOpen ? "up" : ""}`}>
                <ChevronDown size={12} strokeWidth={2.5} />
              </span>
            </button>
            <div className={`nav-lang-menu ${langOpen ? "open" : ""}`}>
              {LANGUAGES.map(lang => (
                <div key={lang.code} className={`lang-opt ${activeLang.code === lang.code ? "active" : ""}`} onClick={() => handleLangChange(lang)}>
                  <span style={{ fontSize:17 }}>{lang.flag}</span>
                  <span>{lang.label}</span>
                  {activeLang.code === lang.code && (
                    <svg className="lang-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button className="btn-outline" onClick={() => openModal("signin")}>{t("nav.signIn")}</button>
          <button className="btn-filled">{t("nav.getMobileApp")}</button>
          <button className={`hamburger ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(v => !v)} aria-label="Menu">
            <span/><span/><span/>
          </button>
        </div>
      </nav>

      {/* ── MOBILE SIDEBAR ── */}
      <div className={`sb-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sb-header">
          <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:800, fontSize:19, color:"var(--green-dark)", display:"flex", alignItems:"center", gap:8 }}>
            <MapPin size={16} color="var(--green-mid)" strokeWidth={2.5} />{t("app.name")}
          </span>
          <button className="sb-close" onClick={() => setSidebarOpen(false)}><X size={16} /></button>
        </div>
        <ul className="sb-links">
          {[
            { key:"nav.features",   label: t("nav.features")   },
            { key:"nav.howItWorks", label: t("nav.howItWorks") },
            { key:"nav.pricing",    label: t("nav.pricing")    },
            { key:"nav.about",      label: t("nav.about")      },
          ].map(n => <li key={n.key}><a href="#" onClick={() => setSidebarOpen(false)}>{n.label}</a></li>)}
          <li><a href="#" onClick={e => { e.preventDefault(); openModal("contact"); }}>{t("nav.contactUs")}</a></li>
        </ul>

        {/* Language section in sidebar */}
        <div className="sb-lang">
          <div className="sb-lang-label"><Globe size={11} />{" "}Language</div>
          <div className="sb-lang-grid">
            {LANGUAGES.map(lang => (
              <div key={lang.code} className={`sb-lang-item ${activeLang.code === lang.code ? "active" : ""}`} onClick={() => { handleLangChange(lang); setSidebarOpen(false); }}>
                <span style={{ fontSize:15 }}>{lang.flag}</span>
                <span>{lang.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sb-actions">
          <button className="sb-btn-outline" onClick={() => openModal("signin")}>{t("nav.signIn")}</button>
          <button className="sb-btn-filled">{t("nav.getMobileApp")}</button>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="hero" style={farmBgStyle}>
        <div className="hero-inner">
          <div className="hero-badge"><Clock size={13} strokeWidth={2.5} />{t("hero.badge")}</div>
          <h1 dangerouslySetInnerHTML={{
            __html: t("hero.title").replace(/\n/g,"<br/>").replace(/Better Markets &/,"<em>Better Markets &amp;</em>")
          }} />
          <p>{t("hero.subtitle")}</p>
          <div className="hero-cta">
            <button className="cta-primary" onClick={() => openModal("createaccount")}>
              {t("hero.getStarted")}<ArrowRight size={17} strokeWidth={2.5} />
            </button>
            <button className="cta-ghost">
              <Play size={17} strokeWidth={2} />{t("hero.watchDemo")}
            </button>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="stats-strip">
        {[
          { num:"12,400+", lbl: t("stats.activeFarmers")  },
          { num:"3,200+",  lbl: t("stats.verifiedBuyers") },
          { num:"94%",     lbl: t("stats.revenueUplift")  },
          { num:"48h",     lbl: t("stats.avgMatchTime")   },
        ].map(s => (
          <div className="stat-item" key={s.lbl}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ── */}
      <section className="features">
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div className="section-label">{t("features.sectionLabel")}</div>
          <div className="section-heading">{t("features.heading")}</div>
          <p className="section-sub">{t("features.subtitle")}</p>
          <div className="features-grid">
            {[
              { Icon:Handshake,  title:t("features.smartMatching.title"),    desc:t("features.smartMatching.desc")    },
              { Icon:TrendingUp, title:t("features.realTimePricing.title"),  desc:t("features.realTimePricing.desc")  },
              { Icon:Sprout,     title:t("features.cropInsights.title"),     desc:t("features.cropInsights.desc")     },
              { Icon:Truck,      title:t("features.logisticsNetwork.title"), desc:t("features.logisticsNetwork.desc") },
            ].map(f => (
              <div className="feature-card" key={f.title}>
                <div className="f-icon"><f.Icon size={26} color="#fff" strokeWidth={1.8} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-logo">{t("app.name")}</div>
        <p>{t("footer.copyright")}</p>
        <a href="#" onClick={e => { e.preventDefault(); openModal("contact"); }} style={{ color:"var(--amber)", fontSize:14, fontWeight:600, textDecoration:"none" }}>
          {t("footer.contactUs")}
        </a>
      </footer>

      {/* ════════════════════════════════ MODALS ════════════════════════════ */}
      <div className={`modal-overlay ${showModal ? "visible" : ""}`} onClick={e => { if(e.target===e.currentTarget) closeModal(); }}>
        <div className={`modal-card ${["createaccount","contact","forgot-otp"].includes(modalType) ? "scrollable" : ""}`}>

          {/* SIGN IN */}
          {modalType === "signin" && (<>
            <div className="modal-head">
              <button className="m-close" onClick={closeModal}><X size={16}/></button>
              <h2>{t("auth.signIn.title")}</h2>
              <p>{t("auth.signIn.subtitle")}</p>
            </div>
            <div className="modal-body">
              {apiError   && <div className="alert error"><AlertCircle size={15}/> {apiError}</div>}
              {apiSuccess && <div className="alert success"><CheckCircle size={15}/> {apiSuccess}</div>}
              <form onSubmit={handleSignIn}>
                <div className="form-group">
                  <label>{t("auth.signIn.emailOrPhone")}</label>
                  <input className="form-input" type="text" placeholder="you@example.com or +250…" value={email} onChange={e=>setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t("auth.signIn.password")}</label>
                  <div className="pwd-wrap">
                    <input className="form-input" type={showPassword?"text":"password"} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required />
                    <button type="button" className="pwd-eye" onClick={()=>setShowPassword(v=>!v)}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                  </div>
                  <div className="forgot-row"><a onClick={()=>openModal("forgotpassword")}>{t("auth.signIn.forgotPassword")}</a></div>
                </div>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? <><Loader2 size={16} className="spin-icon"/> {t("auth.signIn.signingIn")}</> : t("auth.signIn.signInButton")}
                </button>
              </form>
              <p className="modal-foot">{t("auth.signIn.noAccount")} <a onClick={()=>openModal("createaccount")}>{t("auth.signIn.signUp")}</a></p>
            </div>
          </>)}

          {/* CREATE ACCOUNT */}
          {modalType === "createaccount" && (<>
            <div className="modal-head">
              <button className="m-close" onClick={closeModal}><X size={16}/></button>
              <button className="m-back" onClick={()=>openModal("signin")}><ArrowLeft size={16}/></button>
              <h2>{t("auth.createAccount.title")}</h2>
              <p>{t("auth.createAccount.subtitle")}</p>
            </div>
            <div className="modal-body">
              {apiError && <div className="alert error"><AlertCircle size={15}/> {apiError}</div>}
              <form onSubmit={handleCreateAccount}>
                <div className="role-grid">
                  {[{k:"farmer",l:t("auth.createAccount.farmer")},{k:"buyer",l:t("auth.createAccount.buyer")}].map(r=>(
                    <button key={r.k} type="button" className={`role-btn${accountType===r.k?" active":""}`} onClick={()=>setAccountType(r.k)}>{r.l}</button>
                  ))}
                </div>
                <div className="form-group">
                  <label>{t("auth.createAccount.fullName")}</label>
                  <input className="form-input" type="text" placeholder={t("auth.createAccount.fullNamePlaceholder")} value={fullname} onChange={e=>setFullname(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t("auth.createAccount.email")}</label>
                  <input className="form-input" type="email" placeholder={t("auth.createAccount.emailPlaceholder")} value={email} onChange={e=>setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t("auth.createAccount.phoneNumber")}</label>
                  <div className="phone-field-wrap" ref={phoneWrapRef}>
                    <div className={`phone-row${phoneTouched&&phoneError?" has-error":isPhoneValid?" is-valid":""}`}>
                      <button type="button" className="cc-btn" onClick={()=>setShowCountryDropdown(v=>!v)}>
                        <span className="cc-flag">{selectedCountry?.flag}</span>
                        <span className="cc-dial">+{selectedCountry?.dialCode||"?"}</span>
                        <ChevronDown size={12} className={`cc-chev${showCountryDropdown?" open":""}`} strokeWidth={2.5}/>
                      </button>
                      <input className="phone-num-input" type="tel" inputMode="numeric"
                        placeholder={getPhoneRule(selectedCountry?.code).hint}
                        value={phoneRaw} onChange={e=>handlePhoneChange(e.target.value)}
                        onBlur={()=>{ if(phoneRaw) setPhoneTouched(true); }} />
                      {phoneTouched && phoneRaw && (
                        <span className="phone-status">
                          {phoneError ? <AlertCircle size={15} color="var(--error)" strokeWidth={2.5}/> : <CheckCircle size={15} color="var(--success)" strokeWidth={2.5}/>}
                        </span>
                      )}
                    </div>
                    {showCountryDropdown && (
                      <div className="country-dd">
                        <div className="dd-search-wrap">
                          <Search size={13} className="dd-search-icon" strokeWidth={2}/>
                          <input className="dd-search" placeholder="Search country…" value={countrySearch} onChange={e=>setCountrySearch(e.target.value)} autoFocus />
                        </div>
                        <div className="dd-list">
                          {filteredCountries.length===0
                            ? <div style={{padding:16,textAlign:"center",color:"#bbb",fontSize:13}}>No countries found</div>
                            : filteredCountries.map(c=>(
                              <div key={c.code} className={`dd-opt${selectedCountry?.code===c.code?" sel":""}`} onClick={()=>handleCountrySelect(c)}>
                                <span style={{fontSize:16}}>{c.flag}</span>
                                <span className="dd-name">{c.country}</span>
                                {c.dialCode && <span className="dd-code">+{c.dialCode}</span>}
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                    {phoneTouched&&phoneError
                      ? <div className="ph-feedback error"><AlertCircle size={12}/> {phoneError}</div>
                      : isPhoneValid
                      ? <div className="ph-feedback valid"><CheckCircle size={12}/> +{selectedCountry?.dialCode}{phoneRaw}</div>
                      : <div className="ph-feedback hint">{t("phone.hint", { hint:getPhoneRule(selectedCountry?.code).hint })}</div>
                    }
                  </div>
                </div>
                <div className="form-group">
                  <label>{t("auth.createAccount.password")}</label>
                  <div className="pwd-wrap">
                    <input className="form-input" type={showPassword?"text":"password"} placeholder={t("auth.createAccount.passwordPlaceholder")} value={password} onChange={e=>setPassword(e.target.value)} required />
                    <button type="button" className="pwd-eye" onClick={()=>setShowPassword(v=>!v)}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t("auth.createAccount.confirmPassword")}</label>
                  <div className="pwd-wrap">
                    <input className="form-input" type={showConfirm?"text":"password"} placeholder={t("auth.createAccount.confirmPasswordPlaceholder")} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required />
                    <button type="button" className="pwd-eye" onClick={()=>setShowConfirm(v=>!v)}>{showConfirm ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                  </div>
                </div>
                {provinces.length > 0 && (<>
                  <div className="form-group">
                    <label>{t("auth.createAccount.province")}</label>
                    <select className="form-input" value={province} onChange={e=>{setProvince(e.target.value);setDistrict("");setSector("");}} style={{cursor:"pointer",color:province?"var(--text-dark)":"#c0bbb3"}}>
                      <option value="" disabled>{t("auth.createAccount.provincePlaceholder")}</option>
                      {provinces.map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t("auth.createAccount.district")}</label>
                    <select className="form-input" value={district} onChange={e=>{setDistrict(e.target.value);setSector("");}} disabled={!province} style={{cursor:province?"pointer":"not-allowed",color:district?"var(--text-dark)":"#c0bbb3"}}>
                      <option value="" disabled>{t("auth.createAccount.districtPlaceholder")}</option>
                      {districts.map(d=><option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{t("auth.createAccount.sector")}</label>
                    <select className="form-input" value={sector} onChange={e=>setSector(e.target.value)} disabled={!district} style={{cursor:district?"pointer":"not-allowed",color:sector?"var(--text-dark)":"#c0bbb3"}}>
                      <option value="" disabled>{t("auth.createAccount.sectorPlaceholder")}</option>
                      {sectors.map(s=><option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                </>)}
                <button type="submit" className="btn-submit" disabled={loading||!accountType}>
                  {loading ? <><Loader2 size={16} className="spin-icon"/> {t("auth.createAccount.creatingAccount")}</> : <>{t("auth.createAccount.createAccountButton")} <ArrowRight size={15}/></>}
                </button>
              </form>
              <p className="modal-foot">{t("auth.createAccount.haveAccount")} <a onClick={()=>openModal("signin")}>{t("auth.createAccount.signIn")}</a></p>
            </div>
          </>)}

          {/* FORGOT PASSWORD */}
          {modalType === "forgotpassword" && (<>
            <div className="modal-head">
              <button className="m-close" onClick={closeModal}><X size={16}/></button>
              <button className="m-back" onClick={()=>openModal("signin")}><ArrowLeft size={16}/></button>
              <h2>{t("auth.forgotPassword.title")}</h2>
              <p>{t("auth.forgotPassword.subtitle")}</p>
            </div>
            <div className="modal-body">
              {apiError && <div className="alert error"><AlertCircle size={15}/> {apiError}</div>}
              <form onSubmit={handleForgotPassword}>
                <div className="form-group">
                  <label>{t("auth.forgotPassword.email")}</label>
                  <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? <><Loader2 size={16} className="spin-icon"/> {t("auth.forgotPassword.sendingOtp")}</> : <><Send size={15}/> {t("auth.forgotPassword.sendOtp")}</>}
                </button>
              </form>
              <p className="modal-foot">{t("auth.forgotPassword.rememberPassword")} <a onClick={()=>openModal("signin")}>{t("auth.forgotPassword.signIn")}</a></p>
            </div>
          </>)}

          {/* OTP - Register */}
          {modalType === "otp" && (<>
            <div className="modal-head">
              <button className="m-close" onClick={closeModal}><X size={16}/></button>
              <h2>{t("auth.otp.verifyEmail")}</h2>
              <p>{t("auth.otp.subtitle")} <strong>{email}</strong></p>
            </div>
            <div className="modal-body">
              {apiError   && <div className="alert error"><AlertCircle size={15}/> {apiError}</div>}
              {apiSuccess && <div className="alert success"><CheckCircle size={15}/> {apiSuccess}</div>}
              <form onSubmit={handleVerifyRegisterOtp}>
                <div className="otp-row">
                  {otp.map((d,i)=>(
                    <input key={i} id={`otp-${i}`} className="otp-box" type="text" inputMode="numeric" maxLength="1" value={d}
                      onChange={e=>handleOtpChange(i,e.target.value)} onKeyDown={e=>handleOtpKeyDown(i,e)} autoFocus={i===0} />
                  ))}
                </div>
                <div className="otp-timer">{formatTime(timer)}</div>
                <button type="submit" className="btn-submit" disabled={loading||otpValue.length<6}>
                  {loading ? <><Loader2 size={16} className="spin-icon"/> {t("auth.otp.verifying")}</> : <><ShieldCheck size={16}/> {t("auth.otp.verifyButton")}</>}
                </button>
              </form>
              <div className="resend-row">
                {t("auth.otp.didNotGetCode")}{" "}
                <button onClick={handleResendRegisterOtp} disabled={loading||timer>0}>
                  {timer>0 ? t("auth.otp.resendIn",{seconds:timer}) : <><RefreshCw size={13}/> {t("auth.otp.resend")}</>}
                </button>
              </div>
            </div>
          </>)}

          {/* FORGOT OTP + NEW PASSWORD */}
          {modalType === "forgot-otp" && (<>
            <div className="modal-head">
              <button className="m-close" onClick={closeModal}><X size={16}/></button>
              <button className="m-back" onClick={()=>openModal("forgotpassword")}><ArrowLeft size={16}/></button>
              <h2>{t("auth.otp.setNewPassword")}</h2>
              <p>{t("auth.otp.setNewPasswordSubtitle",{email})}</p>
            </div>
            <div className="modal-body">
              {apiError   && <div className="alert error"><AlertCircle size={15}/> {apiError}</div>}
              {apiSuccess && <div className="alert success"><CheckCircle size={15}/> {apiSuccess}</div>}
              <form onSubmit={handleVerifyForgotOtp}>
                <div className="otp-row">
                  {otp.map((d,i)=>(
                    <input key={i} id={`otp-${i}`} className="otp-box" type="text" inputMode="numeric" maxLength="1" value={d}
                      onChange={e=>handleOtpChange(i,e.target.value)} onKeyDown={e=>handleOtpKeyDown(i,e)} autoFocus={i===0} />
                  ))}
                </div>
                <div className="otp-timer">{formatTime(timer)}</div>
                <div className="form-group">
                  <label>{t("auth.otp.newPassword")}</label>
                  <div className="pwd-wrap">
                    <input className="form-input" type={showNewPwd?"text":"password"} placeholder={t("auth.otp.newPasswordPlaceholder")} value={newPassword} onChange={e=>setNewPassword(e.target.value)} required />
                    <button type="button" className="pwd-eye" onClick={()=>setShowNewPwd(v=>!v)}>{showNewPwd ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t("auth.otp.confirmNewPassword")}</label>
                  <div className="pwd-wrap">
                    <input className="form-input" type={showConfNewPwd?"text":"password"} placeholder={t("auth.otp.confirmNewPasswordPlaceholder")} value={confirmNewPwd} onChange={e=>setConfirmNewPwd(e.target.value)} required />
                    <button type="button" className="pwd-eye" onClick={()=>setShowConfNewPwd(v=>!v)}>{showConfNewPwd ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                  </div>
                </div>
                <button type="submit" className="btn-submit" disabled={loading||otpValue.length<6}>
                  {loading ? <><Loader2 size={16} className="spin-icon"/> {t("auth.otp.resetting")}</> : <><ShieldCheck size={16}/> {t("auth.otp.resetButton")}</>}
                </button>
              </form>
              <div className="resend-row">
                {t("auth.otp.didNotGetCode")}{" "}
                <button onClick={handleResendForgotOtp} disabled={loading||timer>0}>
                  {timer>0 ? t("auth.otp.resendIn",{seconds:timer}) : <><RefreshCw size={13}/> {t("auth.otp.resend")}</>}
                </button>
              </div>
            </div>
          </>)}

          {/* CONTACT */}
          {modalType === "contact" && (<>
            <div className="modal-head">
              <button className="m-close" onClick={closeModal}><X size={16}/></button>
              <h2>{t("contact.title")}</h2>
              <p>{t("contact.subtitle")}</p>
            </div>
            <div className="modal-body">
              {apiError   && <div className="alert error"><AlertCircle size={15}/> {apiError}</div>}
              {apiSuccess && <div className="alert success"><CheckCircle size={15}/> {apiSuccess}</div>}
              <form onSubmit={handleContactUs}>
                <div className="form-group">
                  <label>{t("contact.fullName")}</label>
                  <input className="form-input" type="text" placeholder={t("contact.fullNamePlaceholder")} value={contactNames} onChange={e=>setContactNames(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t("contact.email")}</label>
                  <input className="form-input" type="email" placeholder={t("contact.emailPlaceholder")} value={contactEmail} onChange={e=>setContactEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t("contact.subject")}</label>
                  <input className="form-input" type="text" placeholder={t("contact.subjectPlaceholder")} value={contactSubject} onChange={e=>setContactSubject(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t("contact.message")}</label>
                  <textarea className="form-input" rows={5} placeholder={t("contact.messagePlaceholder")} value={contactDesc} onChange={e=>setContactDesc(e.target.value)} required style={{resize:"vertical",minHeight:100}} />
                </div>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? <><Loader2 size={16} className="spin-icon"/> {t("contact.sending")}</> : <><Send size={15}/> {t("contact.sendButton")}</>}
                </button>
              </form>
            </div>
          </>)}

        </div>
      </div>
    </div>
  );
}