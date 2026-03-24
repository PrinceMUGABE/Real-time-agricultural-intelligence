/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    Menu, Home, Settings, LogOut, Bell, User,
    Globe, Users, ShoppingBag, MessageSquare, MessageCircle,
    Phone, Video, MoreVertical, Search, Filter,
    Plus, Edit2, Trash2, X, Check, ChevronDown, ChevronUp,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    RefreshCw, Download, Upload,
    CheckCircle, AlertCircle, Clock, Shield, ShieldCheck, ShieldOff,
    Eye, EyeOff, UserCheck, UserX, Ban, Lock, Unlock,
    Volume2, VolumeX, Mic, MicOff, Camera, CameraOff,
    UserPlus, UserMinus, UserCog,
    MapPin, Calendar, Mail,
    LayoutGrid, List, FolderPlus, DownloadCloud,
    Paperclip, Send, Image, File as FileIcon, Music, Film,
    ThumbsUp, ThumbsDown, Share2, Copy, Flag,
    Crown, Star, Award, Target, TrendingUp,
    Play, Pause, Square, FileText, AlertTriangle,
    CornerUpLeft, FileSpreadsheet,
} from "lucide-react";
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

function Info({ size = 16 }) {
    return (
        <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    );
}

const API_BASE_URL = "http://127.0.0.1:8000";

const CHAT_TYPES = {
    global: { label: "Global Chat", Icon: Globe, color: "#00a884", bg: "#d9fdd3", dark: "#005c4b" },
    farmers: { label: "Farmers Chat", Icon: Users, color: "#34B7F1", bg: "#e8f5fe", dark: "#128C7E" },
    buyers: { label: "Buyers Chat", Icon: ShoppingBag, color: "#F2A93B", bg: "#fff1d6", dark: "#C75A00" },
    one_on_one: { label: "One-on-One Chat", Icon: MessageCircle, color: "#8696A0", bg: "#f0f0f0", dark: "#2C3E50" },
};

const ROLES = {
    admin: { label: "Admin", Icon: Crown, color: "#F2A93B", bg: "#fff1d6" },
    member: { label: "Member", Icon: User, color: "#34B7F1", bg: "#e8f5fe" },
    observer: { label: "Observer", Icon: Eye, color: "#8696A0", bg: "#f0f0f0" },
};

/* ─── API client ─────────────────────────────────────────────────────────── */
function makeHttp() {
    const c = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });
    c.interceptors.request.use(cfg => {
        const tok = localStorage.getItem("access_token");
        if (tok) cfg.headers.Authorization = `Bearer ${tok}`;
        cfg.headers["Accept-Language"] = i18n.language || "en";
        return cfg;
    });
    c.interceptors.response.use(r => r, err => {
        if (err.response?.status === 401) {
            toast.error("Session expired");
            localStorage.removeItem("access_token");
            window.location.href = "/";
        }
        return Promise.reject(err);
    });
    return c;
}
const http = makeHttp();

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmtTime = ts => ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
const fmtDate = ts => ts ? new Date(ts).toLocaleDateString() : "";
const avatarLetter = name => (name || "?").charAt(0).toUpperCase();
const humanSize = bytes => {
    if (!bytes) return "0 B";
    const u = ["B", "KB", "MB", "GB"]; let s = bytes;
    for (const unit of u) { if (s < 1024) return `${s.toFixed(1)} ${unit}`; s /= 1024; }
    return `${s.toFixed(1)} TB`;
};
const fmtDuration = secs => {
    if (!secs) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
};

/* ─── Media type resolver ───────────────────────────────────────────────── */
function detectMediaType(url, explicitType) {
    if (!url) return null;

    // --- filename-first check: voice notes named "voice-*" always win ---
    const filename = decodeURIComponent(url.split("?")[0].split("/").pop()).toLowerCase();
    if (filename.startsWith("voice-")) return "audio";

    // --- explicit backend type (after filename check so stale DB values don't override) ---
    const t = (explicitType || "").toLowerCase().trim();
    if (t === "image") return "image";
    if (t === "video") return "video";
    if (t === "audio" || t === "voice_note") return "audio";
    if (t === "pdf") return "pdf";
    if (t === "word") return "word";
    if (t === "excel") return "excel";
    if (t === "document") return "doc";

    // --- extension fallback ---
    if (filename.match(/\.(mp3|wav|ogg|m4a|aac|flac|opus)$/)) return "audio";
    // .webm without voice- prefix → could be video, keep as audio only if no other signal
    if (filename.match(/\.(webm)$/)) return "audio";
    if (filename.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/)) return "image";
    if (filename.match(/\.(mp4|mov|avi|mkv|flv)$/)) return "video";
    if (filename.match(/\.pdf$/)) return "pdf";
    if (filename.match(/\.(doc|docx)$/)) return "word";
    if (filename.match(/\.(xls|xlsx|csv)$/)) return "excel";
    return "file";
}

/* ─── Voice recorder hook ───────────────────────────────────────────────── */
function useVoiceRecorder() {
    const [recording, setRecording] = useState(false);
    const [url, setUrl] = useState(null);
    const [seconds, setSeconds] = useState(0);
    const blobRef = useRef(null);
    const mediaRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const [blobReady, setBlobReady] = useState(false);

    const start = async () => {
        try {
            blobRef.current = null;
            setBlobReady(false);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            chunksRef.current = [];
            const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "audio/ogg";
            const mr = new MediaRecorder(stream, { mimeType: mime });
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.onstop = () => {
                const b = new Blob(chunksRef.current, { type: mime });
                blobRef.current = b;
                setUrl(URL.createObjectURL(b));
                setBlobReady(true);
                stream.getTracks().forEach(t => t.stop());
            };
            mr.start(100);
            mediaRef.current = mr;
            setRecording(true);
            setSeconds(0);
            timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
        } catch (err) {
            console.error("Mic error:", err);
            toast.error("Microphone access denied");
        }
    };

    const stop = () => {
        if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
        clearInterval(timerRef.current);
        setRecording(false);
    };

    const discard = () => { blobRef.current = null; setBlobReady(false); setUrl(null); setSeconds(0); };
    const getBlob = () => blobRef.current;
    return { recording, blobReady, url, seconds, start, stop, discard, getBlob };
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  SUB-COMPONENTS                                                            */
/* ══════════════════════════════════════════════════════════════════════════ */

/* ── Avatar ──────────────────────────────────────────────────────────────── */
function Avatar({ name, size = 44, color = "#00a884", bg = "#d9fdd3", Icon }) {
    return (
        <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700, fontSize: size * 0.4, fontFamily: "Georgia, serif" }}>
            {Icon ? <Icon size={size * 0.46} /> : avatarLetter(name)}
        </div>
    );
}

/* ── Typing dots ─────────────────────────────────────────────────────────── */
function TypingDots() {
    return (
        <div style={{ display: "flex", gap: 4, padding: "8px 14px", background: "#fff", borderRadius: 18, alignSelf: "flex-start", marginBottom: 8, boxShadow: "0 1px 2px rgba(0,0,0,.1)" }}>
            {[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#8696a0", display: "inline-block", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
        </div>
    );
}

/* ── Full-screen media viewer ───────────────────────────────────────────── */
function MediaViewer({ src, type, name, onClose }) {
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState(null);

    useEffect(() => {
        if (type !== "pdf") return;
        setPdfLoading(true);
        setPdfError(null);

        fetch(src, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
        })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                setPdfBlobUrl(url);
                setPdfLoading(false);
            })
            .catch(err => {
                setPdfError(`Could not load PDF: ${err.message}`);
                setPdfLoading(false);
            });

        return () => {
            setPdfBlobUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
        };
    }, [src, type]);

    return (
        <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.93)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Top controls */}
            <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 10, zIndex: 1 }}>

                <a href={src}
                    download={name}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#fff", cursor: "pointer", padding: 9, borderRadius: 8, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 13 }}
                >
                    <Download size={18} /> Save
                </a>
                <button
                    onClick={onClose}
                    style={{ color: "#fff", background: "rgba(255,255,255,.12)", border: "none", cursor: "pointer", padding: 9, borderRadius: 8, display: "flex" }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Image */}
            {type === "image" && (
                <img
                    src={src}
                    alt={name}
                    style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 8, objectFit: "contain" }}
                />
            )}

            {/* Video */}
            {type === "video" && (
                <video
                    src={src}
                    controls
                    autoPlay
                    style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 8 }}
                />
            )}

            {/* Audio */}
            {type === "audio" && (
                <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 16, padding: "32px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#00a884", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Music size={32} color="#fff" />
                    </div>
                    <p style={{ color: "#fff", margin: 0, fontSize: 14, maxWidth: 260, textAlign: "center", wordBreak: "break-word" }}>
                        {name}
                    </p>
                    <audio src={src} controls autoPlay style={{ width: 320 }} />
                </div>
            )}

            {/* PDF — fetched as blob, shown in iframe */}
            {type === "pdf" && (
                <div style={{ width: "85vw", height: "85vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    {pdfLoading && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                            <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,.2)", borderTop: "3px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                            <p style={{ color: "#ccc", fontSize: 14 }}>Loading PDF…</p>
                        </div>
                    )}
                    {pdfError && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, background: "rgba(231,76,60,.15)", borderRadius: 12, padding: "32px 40px" }}>
                            <FileText size={48} color="#e74c3c" />
                            <p style={{ color: "#e74c3c", fontSize: 14, textAlign: "center" }}>{pdfError}</p>

                            <a href={src}
                                download={name}
                                style={{ background: "#e74c3c", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
                            >
                                <Download size={16} /> Download instead
                            </a>
                        </div>
                    )}
                    {pdfBlobUrl && !pdfLoading && !pdfError && (
                        <iframe
                            src={pdfBlobUrl}
                            title={name}
                            style={{ width: "100%", height: "100%", border: "none", borderRadius: 8 }}
                        />
                    )}
                </div>
            )}

            <p style={{ color: "#ccc", marginTop: 12, fontSize: 13, maxWidth: "80vw", textAlign: "center", wordBreak: "break-word" }}>
                {name}
            </p>
        </div>
    );
}

/* ── Rich attachment renderer ───────────────────────────────────────────── */
function AttachmentPreview({ url, name, fileType, fileSize, duration, dimensions, thumbnail, onMediaClick }) {
    const kind = detectMediaType(url, fileType);
    const label = name || url?.split("/").pop() || "file";
    const size = fileSize ? humanSize(fileSize) : null;

    if (!url) return null;

    /* ── Image ── */
    if (kind === "image") return (
        <div style={{ marginBottom: 4 }}>
            <img
                src={thumbnail || url}
                alt={label}
                onClick={() => onMediaClick(url, "image", label)}
                style={{ maxWidth: 280, maxHeight: 220, borderRadius: 10, display: "block", cursor: "zoom-in", objectFit: "cover", border: "1px solid rgba(0,0,0,.08)" }}
            />
            {dimensions && (
                <p style={{ margin: "3px 0 0", fontSize: 10, color: "#8696a0" }}>{dimensions}{size && ` · ${size}`}</p>
            )}
        </div>
    );

    /* ── Video ── */
    if (kind === "video") return (
        <div style={{ marginBottom: 4 }}>
            <div
                onClick={() => onMediaClick(url, "video", label)}
                style={{ position: "relative", display: "inline-block", cursor: "pointer", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,.08)" }}
            >
                {thumbnail
                    ? <img src={thumbnail} alt={label} style={{ maxWidth: 280, maxHeight: 180, display: "block", objectFit: "cover" }} />
                    : <video style={{ maxWidth: 280, maxHeight: 180, display: "block" }}><source src={url} /></video>
                }
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.35)" }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Play size={22} color="#111" fill="#111" />
                    </div>
                </div>
                {duration && (
                    <div style={{ position: "absolute", bottom: 6, right: 8, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, padding: "2px 6px", borderRadius: 4 }}>
                        {fmtDuration(duration)}
                    </div>
                )}
            </div>
            {size && <p style={{ margin: "3px 0 0", fontSize: 10, color: "#8696a0" }}>{size}</p>}
        </div>
    );

    /* ── Audio / Voice note ── */
    if (kind === "audio") {
        const isVoice = (fileType || "").toLowerCase() === "voice_note" || label.toLowerCase().startsWith("voice-");
        return (
            <div style={{ marginBottom: 4, minWidth: 220 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: isVoice ? "rgba(0,168,132,.08)" : "rgba(0,0,0,.04)", borderRadius: 12, padding: "10px 14px" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: isVoice ? "#00a884" : "#8696a0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isVoice ? <Mic size={18} color="#fff" /> : <Music size={18} color="#fff" />}
                    </div>
                    <div style={{ flex: 1 }}>
                        {isVoice
                            ? <p style={{ margin: "0 0 4px", fontSize: 12, color: "#00a884", fontWeight: 700 }}>Voice note</p>
                            : <p style={{ margin: "0 0 4px", fontSize: 12, color: "#111b21", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{label}</p>
                        }
                        <audio controls src={url} style={{ width: "100%", height: 32, display: "block" }} />
                    </div>
                </div>
                {(duration || size) && (
                    <p style={{ margin: "3px 0 0", fontSize: 10, color: "#8696a0" }}>
                        {duration && fmtDuration(duration)}{duration && size && " · "}{size}
                    </p>
                )}
            </div>
        );
    }

    /* ── PDF — opens in fullscreen viewer ── */
    if (kind === "pdf") return (
        <div
            onClick={() => onMediaClick(url, "pdf", label)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(231,76,60,.06)", borderRadius: 10, cursor: "pointer", marginBottom: 4, border: "1px solid rgba(231,76,60,.15)" }}
        >
            <div style={{ width: 44, height: 44, borderRadius: 8, background: "#e74c3c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={22} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 13, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>
                    PDF{size && ` · ${size}`} · Tap to view
                </p>
            </div>
            <Eye size={16} color="#e74c3c" />
        </div>
    );

    /* ── Word — auth-aware download ── */
    if (kind === "word") return (
        <div
            onClick={() => downloadWithAuth(url, label)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(43,124,211,.06)", borderRadius: 10, cursor: "pointer", marginBottom: 4, border: "1px solid rgba(43,124,211,.15)" }}
        >
            <div style={{ width: 44, height: 44, borderRadius: 8, background: "#2b7cd3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={22} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 13, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>
                    Word Document{size && ` · ${size}`} · Tap to download
                </p>
            </div>
            <Download size={16} color="#2b7cd3" />
        </div>
    );

    /* ── Excel — auth-aware download ── */
    if (kind === "excel") return (
        <div
            onClick={() => downloadWithAuth(url, label)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(30,126,52,.06)", borderRadius: 10, cursor: "pointer", marginBottom: 4, border: "1px solid rgba(30,126,52,.15)" }}
        >
            <div style={{ width: 44, height: 44, borderRadius: 8, background: "#1e7e34", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileSpreadsheet size={22} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 13, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>
                    Spreadsheet{size && ` · ${size}`} · Tap to download
                </p>
            </div>
            <Download size={16} color="#1e7e34" />
        </div>
    );

    /* ── Generic file — auth-aware download ── */
    return (
        <div
            onClick={() => downloadWithAuth(url, label)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(0,0,0,.04)", borderRadius: 10, cursor: "pointer", color: "inherit", marginBottom: 4, border: "1px solid rgba(0,0,0,.08)" }}
        >
            <div style={{ width: 44, height: 44, borderRadius: 8, background: "#8696a0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileIcon size={22} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 13, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>
                    {size || "File"} · Tap to download
                </p>
            </div>
            <Download size={16} color="#8696a0" />
        </div>
    );
}

/* ── Message bubble ──────────────────────────────────────────────────────── */
function MessageBubble({ msg, isOwn, showAvatar, currentUser, onDelete, onReply, onMediaClick, targetRef }) {
    const [hover, setHover] = useState(false);
    const time = fmtTime(msg.created_at || msg.timestamp);
    const isDeleted = msg.is_deleted;

    // --- Robust media resolution ---
    // EnhancedMessageSerializer returns msg.media[] with full file details.
    // Fall back to msg.media_files[] for any legacy shape.
    // Each item should have: file_url, file_type, file_name, file_size, duration, dimensions, thumbnail_url
    const mediaArr = useMemo(() => {
        const arr = msg.media || msg.media_files || [];
        // Filter out items with no usable URL so we never render broken previews
        return arr.filter(mf => !!(mf.file_url || mf.file));
    }, [msg.media, msg.media_files]);

    // Legacy bare attachment fallback (basic MessageSerializer without media enrichment)
    const bareAttachment = !mediaArr.length && msg.attachment ? msg.attachment : null;

    // Determine if there's anything visual to show
    const hasContent = mediaArr.length > 0 || bareAttachment || msg.content;

    return (
        <div
            ref={targetRef}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 6,
                marginBottom: 2,
                justifyContent: isOwn ? "flex-end" : "flex-start",
                padding: "1px 16px",
                position: "relative",
                animation: "fadeIn .18s ease",
            }}
        >
            {/* Avatar for other side */}
            {!isOwn && (
                <div style={{ width: 30, flexShrink: 0 }}>
                    {showAvatar && <Avatar name={msg.sender?.full_name} size={30} />}
                </div>
            )}

            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isOwn ? "flex-end" : "flex-start",
                maxWidth: "65%",
            }}>
                {!isOwn && showAvatar && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#00a884", marginBottom: 2, paddingLeft: 4 }}>
                        {msg.sender?.full_name}
                    </span>
                )}

                <div style={{
                    background: isOwn ? "#d9fdd3" : "#fff",
                    borderRadius: isOwn ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
                    padding: "7px 10px 6px",
                    boxShadow: "0 1px 2px rgba(0,0,0,.1)",
                    position: "relative",
                    maxWidth: "100%",
                    minWidth: 80,
                }}>
                    {isDeleted ? (
                        <em style={{ color: "#8696a0", fontSize: 13 }}>This message was deleted</em>
                    ) : (
                        <>
                            {/* ── Rich media from EnhancedMessageSerializer ── */}
                            {mediaArr.map((mf, i) => (
                                <AttachmentPreview
                                    key={mf.id || i}
                                    url={mf.file_url || mf.file}
                                    name={mf.file_name}
                                    fileType={mf.file_type || ""}
                                    fileSize={mf.file_size || null}
                                    duration={mf.duration || null}
                                    dimensions={mf.dimensions || null}
                                    thumbnail={mf.thumbnail_url || null}
                                    onMediaClick={onMediaClick}
                                />
                            ))}

                            {/* ── Legacy bare attachment fallback ── */}
                            {bareAttachment && (
                                <AttachmentPreview
                                    url={bareAttachment}
                                    name={bareAttachment.split("/").pop().split("?")[0]}
                                    fileType={msg.message_type || ""}
                                    onMediaClick={onMediaClick}
                                />
                            )}

                            {/* ── Text content (shown below media if both present) ── */}
                            {msg.content && (
                                <p style={{
                                    margin: mediaArr.length > 0 || bareAttachment ? "6px 0 0" : 0,
                                    fontSize: 14.5,
                                    lineHeight: 1.45,
                                    color: "#111b21",
                                    wordBreak: "break-word",
                                }}>
                                    {msg.content}
                                </p>
                            )}
                        </>
                    )}

                    {/* Timestamp + read receipt */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: "#667781" }}>{time}</span>
                        {isOwn && (
                            msg.is_read
                                ? <CheckCircle size={12} color="#53bdeb" />
                                : <Check size={12} color="#8696a0" />
                        )}
                    </div>
                </div>
            </div>

            {/* Hover action bar */}
            {hover && !isDeleted && (
                <div style={{
                    position: "absolute",
                    top: "50%",
                    transform: "translateY(-50%)",
                    [isOwn ? "right" : "left"]: "calc(65% + 24px)",
                    display: "flex",
                    gap: 2,
                    background: "#fff",
                    borderRadius: 20,
                    boxShadow: "0 2px 8px rgba(0,0,0,.14)",
                    padding: "3px 6px",
                    zIndex: 10,
                }}>
                    <button title="Reply" onClick={() => onReply(msg)} style={ACT_BTN}><CornerUpLeft size={13} /></button>
                    <button title="Copy" onClick={() => { navigator.clipboard.writeText(msg.content || ""); toast.success("Copied!"); }} style={ACT_BTN}><Copy size={13} /></button>
                    {isOwn && (
                        <button title="Delete" onClick={() => onDelete(msg.id)} style={{ ...ACT_BTN, color: "#e74c3c" }}>
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

const ACT_BTN = { background: "none", border: "none", cursor: "pointer", padding: "4px 5px", borderRadius: 8, color: "#54656f", display: "flex", alignItems: "center" };

/* ── Chat input ──────────────────────────────────────────────────────────── */
function ChatInput({ onSend, onTyping, disabled, replyTo, onCancelReply }) {
    const [text, setText] = useState("");
    const [attach, setAttach] = useState(false);
    const fileRef = useRef(null);
    const timerRef = useRef(null);
    const voice = useVoiceRecorder();

    const send = () => {
        if (text.trim()) { onSend({ content: text }); setText(""); onCancelReply?.(); }
    };
    const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
    const handleChange = e => {
        setText(e.target.value);
        clearTimeout(timerRef.current);
        onTyping(true);
        timerRef.current = setTimeout(() => onTyping(false), 1200);
    };
    const fmtSec = s => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    return (
        <div style={{ background: "#f0f2f5", padding: "8px 12px", borderTop: "1px solid #e9edef", flexShrink: 0 }}>
            {replyTo && (
                <div style={{ background: "#fff", borderLeft: "4px solid #00a884", borderRadius: 6, padding: "6px 10px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <p style={{ margin: 0, fontSize: 12, color: "#00a884", fontWeight: 600 }}>{replyTo.sender?.full_name}</p>
                        <p style={{ margin: 0, fontSize: 13, color: "#667781", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{replyTo.content}</p>
                    </div>
                    <button onClick={onCancelReply} style={{ background: "none", border: "none", cursor: "pointer", color: "#667781" }}><X size={14} /></button>
                </div>
            )}

            {voice.blobReady && voice.url && !voice.recording && (
                <div style={{ background: "#fff", borderRadius: 12, padding: "8px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#00a884", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Mic size={16} color="#fff" />
                    </div>
                    <audio src={voice.url} controls style={{ flex: 1, height: 36 }} />
                    <button onClick={() => {
                        const b = voice.getBlob();
                        if (!b) { toast.error("Recording not ready"); return; }
                        const ext = b.type.includes("ogg") ? "ogg" : "webm";
                        const file = new File([b], `voice-${Date.now()}.${ext}`, { type: b.type });
                        onSend({ file });
                        voice.discard();
                    }} style={SEND_BTN}><Send size={16} /></button>
                    <button onClick={voice.discard} style={{ background: "#fee2e2", border: "none", cursor: "pointer", padding: "7px 10px", borderRadius: 8, color: "#e74c3c", display: "flex" }}><Trash2 size={14} /></button>
                </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative" }}>
                    <button onClick={() => setAttach(!attach)} disabled={disabled} style={ICON_BTN}><Plus size={20} /></button>
                    {attach && (
                        <div style={{ position: "absolute", bottom: "100%", left: 0, background: "#fff", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,.15)", padding: 8, display: "flex", flexDirection: "column", gap: 2, minWidth: 190, zIndex: 100 }}>
                            {[
                                { label: "Image / Video", accept: "image/*,video/*", Icon: Image, color: "#8b5cf6" },
                                { label: "Audio", accept: "audio/*", Icon: Music, color: "#f59e0b" },
                                { label: "Document", accept: ".pdf,.doc,.docx,.xls,.xlsx,.txt", Icon: FileIcon, color: "#3b82f6" },
                            ].map(({ label, accept, Icon: Ic, color }) => (
                                <button key={label}
                                    onClick={() => { fileRef.current.accept = accept; fileRef.current.click(); setAttach(false); }}
                                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "none", border: "none", cursor: "pointer", borderRadius: 8, color: "#111b21", fontSize: 14, fontWeight: 500, width: "100%" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#f0f2f5"}
                                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                                ><Ic size={18} color={color} />{label}</button>
                            ))}
                        </div>
                    )}
                </div>

                <textarea value={text} onChange={handleChange} onKeyDown={handleKey}
                    placeholder="Type a message…" disabled={disabled || voice.recording} rows={1}
                    style={{ flex: 1, border: "none", borderRadius: 22, padding: "10px 16px", fontSize: 15, outline: "none", background: "#fff", resize: "none", fontFamily: "inherit", lineHeight: 1.4, maxHeight: 120, overflowY: "auto" }} />

                {voice.recording ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, color: "#e74c3c", fontWeight: 700 }}>{fmtSec(voice.seconds)}</span>
                        <button onClick={voice.stop} style={{ ...SEND_BTN, background: "#e74c3c" }}><Square size={16} fill="#fff" /></button>
                        <button onClick={() => { voice.stop(); voice.discard(); }} style={{ background: "#fee2e2", border: "none", cursor: "pointer", padding: 10, borderRadius: "50%", color: "#e74c3c", display: "flex" }}><Trash2 size={16} /></button>
                    </div>
                ) : text.trim() ? (
                    <button onClick={send} disabled={disabled} style={SEND_BTN}><Send size={18} /></button>
                ) : (
                    <button onClick={voice.start} disabled={disabled} style={ICON_BTN}><Mic size={20} /></button>
                )}
            </div>

            <input ref={fileRef} type="file" style={{ display: "none" }}
                onChange={e => { if (e.target.files[0]) { onSend({ file: e.target.files[0] }); e.target.value = ""; } }} />
        </div>
    );
}
const SEND_BTN = { background: "#00a884", border: "none", color: "#fff", width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 };
const ICON_BTN = { background: "none", border: "none", color: "#54656f", cursor: "pointer", padding: 10, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" };

/* ── User selector modal ────────────────────────────────────────────────── */
function UserSelectorModal({ title, onSelect, onClose, excludeIds = [] }) {
    const [users, setUsers] = useState([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        http.get("/users/").then(r => { setUsers(r.data.users || []); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const base = users.filter(u => !excludeIds.includes(u.id));
        if (!query.trim()) return base;
        const q = query.toLowerCase();
        return base.filter(u =>
            u.full_name?.toLowerCase().includes(q) ||
            u.phone_number?.includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.role?.toLowerCase().includes(q)
        );
    }, [users, query, excludeIds]);

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 16, width: 440, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
                <div style={{ padding: "18px 20px", borderBottom: "1px solid #e9edef", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 18, color: "#111b21" }}>{title}</h3>
                    <button onClick={onClose} style={GHOST_BTN}><X size={20} /></button>
                </div>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #e9edef" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0f2f5", borderRadius: 10, padding: "8px 14px" }}>
                        <Search size={15} color="#8696a0" />
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
                            autoFocus style={{ border: "none", background: "none", flex: 1, fontSize: 14, outline: "none", color: "#111b21" }} />
                        {query && <button onClick={() => setQuery("")} style={GHOST_BTN}><X size={14} /></button>}
                    </div>
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                    {loading
                        ? <div style={{ padding: 40, textAlign: "center", color: "#8696a0" }}>Loading…</div>
                        : filtered.length === 0
                            ? <div style={{ padding: 40, textAlign: "center", color: "#8696a0" }}>No users found</div>
                            : filtered.map(u => {
                                const role = ROLES[u.role] || ROLES.member;
                                const RoleIcon = role.Icon;
                                return (
                                    <div key={u.id} onClick={() => onSelect(u)}
                                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", cursor: "pointer", borderBottom: "1px solid #f0f2f5" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#f5f6f6"}
                                        onMouseLeave={e => e.currentTarget.style.background = ""}
                                    >
                                        <Avatar name={u.full_name} size={42} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#111b21" }}>{u.full_name}</p>
                                            <p style={{ margin: 0, fontSize: 12, color: "#8696a0" }}>{u.phone_number}</p>
                                        </div>
                                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 8px", borderRadius: 10, background: role.bg, color: role.color, fontWeight: 600 }}>
                                            <RoleIcon size={10} />{role.label}
                                        </span>
                                    </div>
                                );
                            })
                    }
                </div>
            </div>
        </div>
    );
}
const GHOST_BTN = { background: "none", border: "none", cursor: "pointer", color: "#667781", display: "flex", alignItems: "center", padding: 4 };

/* ── Create chat modal ───────────────────────────────────────────────────── */
function CreateChatModal({ onClose, onCreate }) {
    const [type, setType] = useState("");
    const [name, setName] = useState("");
    const [picking, setPicking] = useState(false);

    const proceed = () => {
        if (!type) return;
        if (type === "one_on_one") { setPicking(true); return; }
        onCreate({ chat_type: type, name });
        onClose();
    };

    return (
        <>
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 7000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "#fff", borderRadius: 16, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid #e9edef", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 18, color: "#111b21" }}>Create New Chat</h3>
                        <button onClick={onClose} style={GHOST_BTN}><X size={20} /></button>
                    </div>
                    <div style={{ padding: 24 }}>
                        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#667781" }}>Select chat type</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                            {Object.entries(CHAT_TYPES).map(([key, { label, Icon: Ic, color, bg }]) => (
                                <button key={key} onClick={() => setType(key)}
                                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 16, border: `2px solid ${type === key ? color : "#e9edef"}`, borderRadius: 12, cursor: "pointer", background: type === key ? bg : "#fff", transition: "all .2s" }}>
                                    <Ic size={24} color={color} />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: type === key ? color : "#667781" }}>{label}</span>
                                </button>
                            ))}
                        </div>
                        {type && type !== "one_on_one" && (
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="Chat name (optional)"
                                style={{ width: "100%", border: "1px solid #e9edef", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", marginBottom: 16, boxSizing: "border-box", background: "#f0f2f5" }} />
                        )}
                        <button onClick={proceed} disabled={!type}
                            style={{ width: "100%", background: type ? "#00a884" : "#ccc", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 15, fontWeight: 600, cursor: type ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                            {type === "one_on_one" ? "Select User →" : "Create Chat"}
                        </button>
                    </div>
                </div>
            </div>
            {picking && (
                <UserSelectorModal title="Select User for Chat"
                    onSelect={user => { setPicking(false); onCreate({ chat_type: "one_on_one", user_id: user.id }); onClose(); }}
                    onClose={() => setPicking(false)} />
            )}
        </>
    );
}

/* ── Settings tab ────────────────────────────────────────────────────────── */
function ChatSettingsTab({ chat, onRefresh }) {
    const [name, setSname] = useState(chat?.name || "");
    const [active, setActive] = useState(chat?.is_active ?? true);
    const [senders, setSenders] = useState(chat?.settings?.allowed_senders || "everyone");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await http.put(`/chat/admin/chats/${chat.id}/settings/`, { name, is_active: active, allowed_senders: senders });
            toast.success("Settings updated");
            onRefresh?.();
        } catch { toast.error("Failed to update settings"); }
        setSaving(false);
    };

    const deleteChat = async () => {
        if (!window.confirm("Permanently delete this chat?")) return;
        try { await http.delete(`/chat/admin/chats/${chat.id}/delete/`); toast.success("Chat deleted"); window.location.reload(); }
        catch { toast.error("Failed to delete chat"); }
    };

    return (
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <div style={{ marginBottom: 18 }}>
                <label style={LBL}>Chat Name</label>
                <input value={name} onChange={e => setSname(e.target.value)} placeholder="Enter chat name" style={INP} />
            </div>
            <div style={{ marginBottom: 18 }}>
                <label style={LBL}>Who Can Send Messages</label>
                <select value={senders} onChange={e => setSenders(e.target.value)} style={INP}>
                    <option value="everyone">Everyone</option>
                    <option value="admins_only">Admins Only</option>
                </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, padding: "12px 16px", background: "#f0f2f5", borderRadius: 10 }}>
                <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#111b21" }}>Chat Active</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#8696a0" }}>Toggle to enable / disable</p>
                </div>
                <div onClick={() => setActive(a => !a)} style={{ width: 44, height: 24, borderRadius: 12, background: active ? "#00a884" : "#ccc", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: 2, left: active ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                </div>
            </div>
            <button onClick={save} disabled={saving}
                style={{ width: "100%", background: "#00a884", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 12, fontFamily: "inherit" }}>
                {saving ? "Saving…" : "Save Changes"}
            </button>
            <div style={{ borderTop: "1px solid #fee2e2", paddingTop: 16 }}>
                <p style={{ fontSize: 13, color: "#e74c3c", fontWeight: 700, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} /> Danger Zone</p>
                <button onClick={deleteChat}
                    style={{ width: "100%", background: "#fee2e2", color: "#e74c3c", border: "1px solid #fca5a5", borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    Delete Chat Permanently
                </button>
            </div>
        </div>
    );
}
const LBL = { display: "block", fontSize: 11, fontWeight: 700, color: "#667781", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 };
const INP = { width: "100%", border: "1px solid #e9edef", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", background: "#f0f2f5", boxSizing: "border-box", fontFamily: "inherit" };

/* ── Chat info panel ─────────────────────────────────────────────────────── */
function ChatInfoPanel({ chat, onClose, onOpenChat, allMedia, onBlockParticipant, onUpdateRole, onAddMember, onNavigateToMessage, onRefresh }) {
    const [tab, setTab] = useState("members");
    const [addingMember, setAddMember] = useState(false);
    const existingIds = (chat?.participants || []).map(p => p.user?.id || p.id);

    return (
        <div style={{ width: 340, background: "#fff", borderLeft: "1px solid #e9edef", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: "#f0f2f5", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #e9edef", flexShrink: 0 }}>
                <button onClick={onClose} style={GHOST_BTN}><ChevronLeft size={20} /></button>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111b21", fontFamily: "Georgia, serif" }}>Chat Info</h3>
            </div>

            <div style={{ padding: "20px 16px", textAlign: "center", borderBottom: "1px solid #e9edef", flexShrink: 0 }}>
                {(() => { const ct = CHAT_TYPES[chat?.chat_type] || CHAT_TYPES.one_on_one; return <Avatar Icon={ct.Icon} size={70} color={ct.color} bg={ct.bg} />; })()}
                <h2 style={{ margin: "10px 0 4px", fontSize: 18, fontFamily: "Georgia, serif", color: "#111b21" }}>{chat?.name || "Chat"}</h2>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#8696a0" }}>{CHAT_TYPES[chat?.chat_type]?.label} · Created {fmtDate(chat?.created_at)}</p>
                <span style={{ fontSize: 12, padding: "4px 12px", background: chat?.is_active ? "#d9fdd3" : "#fee2e2", color: chat?.is_active ? "#00a884" : "#e74c3c", borderRadius: 20, fontWeight: 600 }}>
                    {chat?.is_active ? "Active" : "Inactive"}
                </span>
            </div>

            <div style={{ display: "flex", borderBottom: "1px solid #e9edef", flexShrink: 0 }}>
                {[["members", Users, "Members"], ["media", Image, "Media"], ["settings", Settings, "Settings"]].map(([key, Ic, lbl]) => (
                    <button key={key} onClick={() => setTab(key)}
                        style={{ flex: 1, padding: "11px 4px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, borderBottom: tab === key ? "2px solid #00a884" : "2px solid transparent", color: tab === key ? "#00a884" : "#8696a0" }}>
                        <Ic size={16} /><span style={{ fontSize: 11, fontWeight: 600 }}>{lbl}</span>
                    </button>
                ))}
            </div>

            {/* Members tab */}
            {tab === "members" && (
                <div style={{ flex: 1, overflowY: "auto" }}>
                    <button onClick={() => setAddMember(true)}
                        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "13px 18px", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid #f0f2f5" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f5f6f6"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#d9fdd3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <UserPlus size={20} color="#00a884" />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#00a884" }}>Add member</span>
                    </button>
                    {(chat?.participants || []).map((p, i) => {
                        const user = p.user || p;
                        const role = ROLES[p.role] || ROLES.member;
                        const RoleIc = role.Icon;
                        return (
                            <div key={user.id || i}
                                style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderBottom: "1px solid #f0f2f5" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f5f6f6"}
                                onMouseLeave={e => e.currentTarget.style.background = ""}
                            >
                                <div onClick={() => onOpenChat(user)} style={{ cursor: "pointer", flexShrink: 0 }}><Avatar name={user.full_name} size={42} /></div>
                                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onOpenChat(user)}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name}</p>
                                        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 10, background: role.bg, color: role.color, fontWeight: 700, flexShrink: 0 }}>
                                            <RoleIc size={9} />{role.label}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>{user.phone_number}</p>
                                    {p.is_blocked && <span style={{ fontSize: 10, color: "#e74c3c", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}><Ban size={9} /> Blocked</span>}
                                </div>
                                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                    <select value={p.role} onChange={e => onUpdateRole(user.id, e.target.value)}
                                        style={{ fontSize: 11, border: "1px solid #e9edef", borderRadius: 6, padding: "3px 4px", background: "#fff", cursor: "pointer", maxWidth: 80 }}>
                                        {Object.keys(ROLES).map(r => <option key={r} value={r}>{ROLES[r].label}</option>)}
                                    </select>
                                    <button title={p.is_blocked ? "Unblock" : "Block"} onClick={() => onBlockParticipant(user.id, !p.is_blocked)}
                                        style={{ background: p.is_blocked ? "#d9fdd3" : "#fee2e2", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: p.is_blocked ? "#00a884" : "#e74c3c", display: "flex" }}>
                                        {p.is_blocked ? <Unlock size={13} /> : <Ban size={13} />}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Media tab — uses allMedia from /chat/<id>/media/ */}
            {tab === "media" && (
                <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
                    {allMedia.length === 0
                        ? <div style={{ padding: 40, textAlign: "center", color: "#8696a0" }}>
                            <Image size={40} style={{ opacity: .25, display: "block", margin: "0 auto 10px" }} />
                            <p style={{ margin: 0 }}>No shared media</p>
                        </div>
                        : (
                            <>
                                {/* Stats bar */}
                                <div style={{ background: "#f0f2f5", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                                    <p style={{ margin: 0, fontSize: 12, color: "#667781" }}>
                                        <strong style={{ color: "#111b21" }}>{allMedia.length}</strong> files shared
                                    </p>
                                </div>
                                {/* Grid */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
                                    {allMedia.map((m, i) => {
                                        const url = m.file_url || m.url || null;
                                        const type = detectMediaType(url, m.file_type || m.type || "");
                                        const thumb = m.thumbnail_url || null;
                                        const msgId = m.message_id || m.messageId || null;
                                        return (
                                            <div key={m.id || i}
                                                onClick={() => msgId && onNavigateToMessage(msgId)}
                                                title={m.file_name || m.name || ""}
                                                style={{ aspectRatio: "1", overflow: "hidden", borderRadius: 6, cursor: msgId ? "pointer" : "default", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                                                {type === "image"
                                                    ? <img src={thumb || url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                    : type === "video"
                                                        ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 8 }}>
                                                            <Film size={22} color="#8696a0" />
                                                            <span style={{ fontSize: 9, color: "#8696a0" }}>video</span>
                                                        </div>
                                                        : type === "audio"
                                                            ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 8 }}>
                                                                <Mic size={22} color="#00a884" />
                                                                <span style={{ fontSize: 9, color: "#00a884" }}>audio</span>
                                                            </div>
                                                            : type === "pdf"
                                                                ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 8 }}>
                                                                    <FileText size={22} color="#e74c3c" />
                                                                    <span style={{ fontSize: 9, color: "#e74c3c" }}>pdf</span>
                                                                </div>
                                                                : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 8 }}>
                                                                    <FileIcon size={22} color="#8696a0" />
                                                                    <span style={{ fontSize: 9, color: "#8696a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "90%" }}>
                                                                        {(m.file_name || m.name || "file").split(".").pop()}
                                                                    </span>
                                                                </div>
                                                }
                                                {/* Size badge */}
                                                {m.file_size && (
                                                    <div style={{ position: "absolute", bottom: 3, right: 3, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 8, padding: "1px 4px", borderRadius: 3 }}>
                                                        {humanSize(m.file_size)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )
                    }
                </div>
            )}

            {tab === "settings" && <ChatSettingsTab chat={chat} onRefresh={onRefresh} />}

            {addingMember && (
                <UserSelectorModal title="Add Member" excludeIds={existingIds}
                    onClose={() => setAddMember(false)}
                    onSelect={u => { onAddMember(u.id); setAddMember(false); }} />
            )}
        </div>
    );
}

/* ── Search in chat panel ────────────────────────────────────────────────── */
function SearchInChatPanel({ messages, onNavigate, onClose }) {
    const [q, setQ] = useState("");
    const results = useMemo(() => {
        if (!q.trim()) return [];
        const ql = q.toLowerCase();
        return messages.filter(m => !m.is_deleted && m.content?.toLowerCase().includes(ql));
    }, [q, messages]);

    return (
        <div style={{ width: 300, background: "#fff", borderLeft: "1px solid #e9edef", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #e9edef", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <button onClick={onClose} style={GHOST_BTN}><ChevronLeft size={20} /></button>
                <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search messages…"
                    style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#111b21" }} />
                {q && <button onClick={() => setQ("")} style={GHOST_BTN}><X size={16} /></button>}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
                {q && results.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#8696a0" }}>No results for "{q}"</div>}
                {results.map(m => (
                    <div key={m.id} onClick={() => onNavigate(m.id)}
                        style={{ padding: "11px 16px", borderBottom: "1px solid #f0f2f5", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f5f6f6"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}
                    >
                        <p style={{ margin: "0 0 2px", fontSize: 12, color: "#00a884", fontWeight: 600 }}>{m.sender?.full_name}</p>
                        <p style={{ margin: "0 0 2px", fontSize: 13, color: "#111b21" }}>
                            {m.content?.split(new RegExp(`(${q})`, "gi")).map((part, i) =>
                                part.toLowerCase() === q.toLowerCase()
                                    ? <mark key={i} style={{ background: "#fef08a", borderRadius: 2 }}>{part}</mark>
                                    : part
                            )}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>{fmtTime(m.created_at)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Call modal ──────────────────────────────────────────────────────────── */
function CallModal({ type, chatName, onEnd }) {
    const [sec, setSec] = useState(0);
    const [muted, setMuted] = useState(false);
    const [camOff, setCamOff] = useState(false);
    const [permErr, setPermErr] = useState(null);
    const streamRef = useRef(null);
    const localVidRef = useRef(null);

    useEffect(() => {
        let active = true;
        const constraints = type === "video"
            ? { audio: true, video: { facingMode: "user", width: 640, height: 480 } }
            : { audio: true, video: false };
        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                if (localVidRef.current) localVidRef.current.srcObject = stream;
            })
            .catch(err => {
                if (active) setPermErr(err.name === "NotAllowedError"
                    ? "Camera / microphone access was denied."
                    : `Could not access media: ${err.message}`
                );
            });
        const timer = setInterval(() => setSec(s => s + 1), 1000);
        return () => { active = false; clearInterval(timer); streamRef.current?.getTracks().forEach(t => t.stop()); };
    }, [type]);

    const toggleMute = () => { streamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(m => !m); };
    const toggleCam = () => { streamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOff; }); setCamOff(c => !c); };
    const handleEnd = () => { streamRef.current?.getTracks().forEach(t => t.stop()); onEnd(); };
    const fmtSec = s => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    return (
        <div style={{ position: "fixed", inset: 0, background: "linear-gradient(135deg,#005c4b,#00a884)", zIndex: 9000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            {permErr && (
                <div style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(231,76,60,.9)", borderRadius: 10, padding: "12px 20px", maxWidth: 420, textAlign: "center", fontSize: 14 }}>
                    <AlertTriangle size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />{permErr}
                </div>
            )}
            {type === "video" && (
                <div style={{ position: "absolute", top: 20, right: 20, width: 160, height: 120, borderRadius: 14, overflow: "hidden", background: "rgba(0,0,0,.5)", border: "2px solid rgba(255,255,255,.2)" }}>
                    {camOff
                        ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><CameraOff size={28} color="rgba(255,255,255,.5)" /></div>
                        : <video ref={localVidRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                    }
                </div>
            )}
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontFamily: "Georgia, serif", fontWeight: 700, marginBottom: 20, border: "3px solid rgba(255,255,255,.25)" }}>
                {avatarLetter(chatName)}
            </div>
            <h2 style={{ margin: "0 0 6px", fontFamily: "Georgia, serif", fontSize: 26 }}>{chatName}</h2>
            <p style={{ margin: "0 0 8px", opacity: .8, fontSize: 15 }}>{type === "video" ? "Video" : "Voice"} call</p>
            <p style={{ margin: "0 0 40px", fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>{fmtSec(sec)}</p>
            <div style={{ display: "flex", gap: 20 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <button onClick={toggleMute} style={{ width: 56, height: 56, borderRadius: "50%", background: muted ? "#fff" : "rgba(255,255,255,.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {muted ? <MicOff size={22} color="#e74c3c" /> : <Mic size={22} color="#fff" />}
                    </button>
                    <span style={{ fontSize: 11, opacity: .8 }}>{muted ? "Unmute" : "Mute"}</span>
                </div>
                {type === "video" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        <button onClick={toggleCam} style={{ width: 56, height: 56, borderRadius: "50%", background: camOff ? "#fff" : "rgba(255,255,255,.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {camOff ? <CameraOff size={22} color="#e74c3c" /> : <Camera size={22} color="#fff" />}
                        </button>
                        <span style={{ fontSize: 11, opacity: .8 }}>{camOff ? "Cam on" : "Cam off"}</span>
                    </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <button onClick={handleEnd} style={{ width: 56, height: 56, borderRadius: "50%", background: "#e74c3c", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Phone size={22} color="#fff" style={{ transform: "rotate(135deg)" }} />
                    </button>
                    <span style={{ fontSize: 11, opacity: .8 }}>End</span>
                </div>
            </div>
        </div>
    );
}

/* ── Chat list item ──────────────────────────────────────────────────────── */
function ChatListItem({ chat, isSelected, onClick, currentUser }) {
    const ct = CHAT_TYPES[chat.chat_type] || CHAT_TYPES.one_on_one;
    const TypeIcon = ct.Icon;
    const last = chat.last_message || {};
    const time = fmtTime(last.time || chat.updated_at);

    const getName = () => {
        if (chat.name) return chat.name;
        if (chat.chat_type === "one_on_one") {
            const other = chat.participants?.find(p => (p.user?.id || p.id) !== currentUser?.id);
            return other?.user?.full_name || other?.full_name || "Unknown";
        }
        return ct.label;
    };

    return (
        <div onClick={onClick}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", cursor: "pointer", background: isSelected ? "#e8f5fe" : "transparent", borderBottom: "1px solid #f0f2f5", transition: "background .15s" }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#f5f6f6"; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
        >
            <Avatar Icon={chat.chat_type !== "one_on_one" ? TypeIcon : null} name={getName()} size={50} color={ct.color} bg={ct.bg} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getName()}</span>
                    <span style={{ fontSize: 11, color: chat.unread_count > 0 ? "#00a884" : "#8696a0", flexShrink: 0, marginLeft: 4 }}>{time}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#667781", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                        {last.sender && <span style={{ color: "#111b21" }}>{last.sender}: </span>}
                        {last.content || <em>No messages yet</em>}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 4 }}>
                        {chat.unread_count > 0 && (
                            <span style={{ background: "#00a884", color: "#fff", fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{chat.unread_count}</span>
                        )}
                        {!chat.is_active && <Ban size={10} color="#8696a0" />}
                        <TypeIcon size={12} color={ct.color} />
                    </div>
                </div>
            </div>
        </div>
    );
}


async function downloadWithAuth(url, filename) {
    try {
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (err) {
        toast.error(`Download failed: ${err.message}`);
    }
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                            */
/* ══════════════════════════════════════════════════════════════════════════ */
export default function AdminChatManagement() {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [msgsLoading, setMsgsLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [stats, setStats] = useState({});
    const [typingUsers, setTypingUsers] = useState([]);
    const [showInfo, setShowInfo] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [showMoreMenu, setShowMore] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [mediaViewer, setMediaViewer] = useState(null);
    const [callType, setCallType] = useState(null);
    const [filters, setFilters] = useState({ search: "", chat_type: "", status: "" });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [chatMediaFiles, setChatMediaFiles] = useState([]);

    const wsRef = useRef(null);
    const bottomRef = useRef(null);
    const msgRefs = useRef({});

    const [mobileView, setMobileView] = useState("list");
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const location = useLocation();
    const navigate = useNavigate();
    const [isOpeningChat, setIsOpeningChat] = useState(false);
    const chatOpenedRef = useRef(false);



    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);



    const fetchChats = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, page_size: 20 });
            if (filters.chat_type) params.set("chat_type", filters.chat_type);
            if (filters.status) params.set("status", filters.status);
            if (filters.search) params.set("search", filters.search);
            const r = await http.get(`/chat/admin/chats/?${params}`);
            setChats(r.data.chats || []);
            setTotalPages(r.data.total_pages || 1);
            setStats(r.data.stats || {});
        } catch { toast.error("Failed to load chats"); }
        setLoading(false);
    }, [filters, page]);

    useEffect(() => {
        http.get("/profile/").then(r => setCurrentUser(r.data)).catch(() => { });
        fetchChats();
    }, []);
    useEffect(() => { fetchChats(); }, [filters, page]);

    const fetchChatMedia = useCallback(async (chatId) => {
        if (!chatId) return;
        try {
            const r = await http.get(`/chat/${chatId}/media/`);
            setChatMediaFiles(r.data.media_files || []);
        } catch (err) {
            console.warn("fetchChatMedia failed:", err?.response?.status);
            setChatMediaFiles([]);
        }
    }, []);

    const isMobileRef = useRef(isMobile);
    useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);

    const fetchChatMediaRef = useRef(fetchChatMedia);
    const selectedRef = useRef(selected);
    useEffect(() => { fetchChatMediaRef.current = fetchChatMedia; }, [fetchChatMedia]);
    useEffect(() => { selectedRef.current = selected; }, [selected]);

    const selectChat = useCallback(async (chat) => {
        setSelected(chat);
        setShowInfo(false);
        setShowSearch(false);
        setMessages([]);
        setChatMediaFiles([]);
        setMsgsLoading(true);
        try {
            const r = await http.get(`/chat/${chat.id}/messages/`, { params: { page: 1, page_size: 200 } });
            const raw = r.data;
            let msgs = [];
            if (Array.isArray(raw)) msgs = raw;
            else if (Array.isArray(raw.messages)) msgs = raw.messages;
            else if (Array.isArray(raw.data)) msgs = raw.data;
            setMessages(msgs);
            await http.post(`/chat/${chat.id}/mark-read/`).catch(() => { });
            fetchChatMedia(chat.id);
        } catch (err) {
            console.error("Failed to load messages:", err);
            toast.error("Failed to load messages");
        }
        setMsgsLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
        initWS(chat.id);
        if (isMobileRef.current) setMobileView("chat");
    }, [fetchChatMedia]);

    const selectChatResponsive = selectChat;

    useEffect(() => {
        // Check if we have a chat to open from navigation state
        if (location.state?.openChatId) {
            const openChat = async () => {
                try {
                    const response = await http.get(`/chat/admin/chats/${location.state.openChatId}/`);
                    if (response.data) {
                        await selectChat(response.data);
                    }
                } catch (error) {
                    console.error('Failed to open chat:', error);
                }
            };

            openChat();

            // Clear the state after opening
            window.history.replaceState({}, document.title);
        }
    }, [location.state, selectChat]);


    const initWS = useCallback((chatId) => {
        wsRef.current?.close();
        const tok = localStorage.getItem("access_token");
        const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${chatId}/?token=${tok}`);
        ws.onmessage = e => {
            const d = JSON.parse(e.data);
            if (d.type === "chat_message") {
                setMessages(p => {
                    const exists = p.some(m => m.id === d.message?.id);
                    return exists ? p : [...p, d.message];
                });
                setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
                const msg = d.message || {};
                if (msg.has_media || (msg.media && msg.media.length > 0) || msg.attachment) {
                    fetchChatMediaRef.current(chatId);
                }
            }
            if (d.type === "typing_status") {
                setTypingUsers(p => d.is_typing
                    ? [...p.filter(u => u.id !== d.user_id), { id: d.user_id, name: d.full_name }]
                    : p.filter(u => u.id !== d.user_id)
                );
            }
            if (d.type === "message_deleted") {
                setMessages(p => p.filter(m => m.id !== d.message_id));
            }
        };
        wsRef.current = ws;
    }, []);

    const handleSend = useCallback(async ({ content, file }) => {
        if (!selected) return;
        try {
            if (file) {
                const fd = new FormData();
                fd.append("chat_room_id", selected.id);
                fd.append("files", file);
                if (content) fd.append("content", content);
                await http.post("/chat/media/upload/", fd, { headers: { "Content-Type": "multipart/form-data" } });
            } else {
                await http.post("/chat/messages/send/", { chat_room_id: selected.id, content, message_type: "text" });
            }
            const r = await http.get(`/chat/${selected.id}/messages/`, { params: { page: 1, page_size: 200 } });
            const raw = r.data;
            let msgs = [];
            if (Array.isArray(raw)) msgs = raw;
            else if (Array.isArray(raw.messages)) msgs = raw.messages;
            else if (Array.isArray(raw.data)) msgs = raw.data;
            setMessages(msgs);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
            fetchChatMedia(selected.id);
        } catch { toast.error("Failed to send message"); }
    }, [selected, fetchChatMedia]);

    const handleDeleteMsg = useCallback(async (msgId) => {
        if (!window.confirm("Delete this message for everyone?")) return;
        try {
            await http.delete(`/chat/messages/${msgId}/delete/`, { data: { delete_type: "for_everyone" } });
            setMessages(p => p.filter(m => m.id !== msgId));
        } catch { toast.error("Failed to delete"); }
    }, []);

    const handleTyping = useCallback((isTyping) => {
        if (wsRef.current?.readyState === WebSocket.OPEN)
            wsRef.current.send(JSON.stringify({ type: "typing", is_typing: isTyping }));
    }, []);

    const openChatWithUser = useCallback(async (user) => {
        try {
            const r = await http.post("/chat/create/", { chat_type: "one_on_one", user_id: user.id });
            const nc = r.data.chat;
            setChats(p => p.find(c => c.id === nc.id) ? p : [nc, ...p]);
            await selectChat(nc);
        } catch { toast.error("Failed to open chat"); }
    }, [selectChat]);

    const handleCreate = useCallback(async (data) => {
        try {
            const r = await http.post("/chat/admin/chats/create/", data);
            const c = r.data.chat;
            setChats(p => [c, ...p]);
            toast.success("Chat created");
            await selectChat(c);
        } catch { toast.error("Failed to create chat"); }
    }, [selectChat]);

    const handleBlock = useCallback(async (userId, block) => {
        if (!selected) return;
        try {
            await http.post(`/chat/admin/chats/${selected.id}/participants/block/`, { user_id: userId, block });
            toast.success(block ? "User blocked" : "User unblocked");
            const r = await http.get(`/chat/admin/chats/${selected.id}/`);
            setSelected(p => ({ ...p, participants: r.data.participants }));
        } catch { toast.error("Action failed"); }
    }, [selected]);

    const handleUpdateRole = useCallback(async (userId, role) => {
        if (!selected) return;
        try {
            await http.post(`/chat/admin/chats/${selected.id}/participants/update/`, { user_id: userId, role });
            toast.success("Role updated");
        } catch { toast.error("Failed to update role"); }
    }, [selected]);

    const handleAddMember = useCallback(async (userId) => {
        if (!selected) return;
        try {
            await http.post(`/chat/${selected.id}/participants/manage/`, { action: "add", user_id: userId });
            toast.success("Member added");
        } catch { toast.error("Failed to add member"); }
    }, [selected]);

    const navigateToMessage = useCallback((msgId) => {
        setShowInfo(false); setShowSearch(false);
        setTimeout(() => {
            const el = msgRefs.current[msgId];
            if (!el) return;
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.style.background = "#fffde7";
            setTimeout(() => { el.style.background = ""; el.style.transition = "background 1s"; }, 2000);
        }, 300);
    }, []);

    const chatName = (chat) => {
        if (!chat) return "";
        if (chat.name) return chat.name;
        if (chat.chat_type === "one_on_one") {
            const other = chat.participants?.find(p => (p.user?.id || p.id) !== currentUser?.id);
            return other?.user?.full_name || other?.full_name || "Unknown";
        }
        return CHAT_TYPES[chat.chat_type]?.label || "Chat";
    };
    const ct = selected ? CHAT_TYPES[selected.chat_type] || CHAT_TYPES.one_on_one : null;

    const openSpecificChat = useCallback(async (chatId, userName, userId) => {
        if (isOpeningChat || chatOpenedRef.current) return;

        chatOpenedRef.current = true;
        setIsOpeningChat(true);
        const loadingToast = toast.loading('Opening chat...');

        try {
            // First, check if we have the chat in our current list
            let chatToOpen = chats.find(chat => chat.id === parseInt(chatId));

            if (!chatToOpen) {
                // Fetch the chat details directly
                const response = await http.get(`/chat/admin/chats/${chatId}/`);
                if (response.data && response.data.chat) {
                    chatToOpen = response.data.chat;
                    // Add to chats list if not present
                    setChats(prev => {
                        if (!prev.find(c => c.id === chatToOpen.id)) {
                            return [chatToOpen, ...prev];
                        }
                        return prev;
                    });
                } else if (response.data) {
                    chatToOpen = response.data;
                    setChats(prev => {
                        if (!prev.find(c => c.id === chatToOpen.id)) {
                            return [chatToOpen, ...prev];
                        }
                        return prev;
                    });
                }
            }

            if (chatToOpen) {
                // Select the chat
                await selectChat(chatToOpen);

                toast.update(loadingToast, {
                    render: `Chat with ${userName || chatToOpen.name || 'user'} opened`,
                    type: 'success',
                    isLoading: false,
                    autoClose: 2000
                });
            } else {
                throw new Error('Chat not found');
            }
        } catch (error) {
            console.error('Failed to open chat:', error);
            toast.update(loadingToast, {
                render: 'Failed to open chat. Please try again.',
                type: 'error',
                isLoading: false,
                autoClose: 3000
            });
            chatOpenedRef.current = false; // Reset on error so user can try again
        } finally {
            setIsOpeningChat(false);
        }
    }, [chats, selectChat, isOpeningChat]);

    // Single effect to handle navigation state
    useEffect(() => {
        const state = location.state;
        if (state?.openChatId && !chatOpenedRef.current && !isOpeningChat) {
            // Open the chat
            openSpecificChat(state.openChatId, state.userName, state.userId);

            // Clear the state after opening - use setTimeout to ensure it runs after the effect
            setTimeout(() => {
                navigate(location.pathname, { replace: true, state: {} });
            }, 100);
        }

        // Cleanup function to reset ref when component unmounts
        return () => {
            chatOpenedRef.current = false;
        };
    }, [location.state, openSpecificChat, navigate, location.pathname, isOpeningChat]);

    /* ══════════════════════════════════════════════════════════════════════ */
    return (
        <div style={{ fontFamily: "'DM Sans', 'Nunito', sans-serif", height: "100vh", display: "flex", flexDirection: "column", background: "#f0f2f5" }}>
            <ToastContainer position="top-right" autoClose={4000} hideProgressBar theme="colored" />

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: #c1c9d0; border-radius: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        @keyframes bounce  { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-7px)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        textarea, input, select, button { font-family: 'DM Sans', sans-serif; }
        .chat-layout { display: flex; flex: 1; overflow: hidden; }
        .chat-sidebar { width: 340px; background: #fff; display: flex; flex-direction: column; border-right: 1px solid #e9edef; flex-shrink: 0; }
        .chat-center  { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .chat-right-panel { display: flex; flex-shrink: 0; }
        .topbar-stats { display: flex; gap: 8px; align-items: center; }
        @media (max-width: 1024px) {
          .topbar-stats .stat-chip:nth-child(3), .topbar-stats .stat-chip:nth-child(4) { display: none; }
          .chat-sidebar { width: 300px; }
        }
        @media (max-width: 768px) {
          .chat-layout { position: relative; }
          .chat-sidebar { position: absolute; inset: 0; width: 100%; z-index: 20; transform: translateX(0); }
          .chat-sidebar.mobile-hidden { transform: translateX(-100%); }
          .chat-center { position: absolute; inset: 0; z-index: 10; }
          .chat-center.mobile-hidden { display: none; }
          .chat-right-panel { position: absolute; inset: 0; z-index: 30; background: #fff; }
          .chat-right-panel.mobile-hidden { display: none; }
          .topbar-stats { display: none; }
          .topbar-title p { display: none; }
        }
      `}</style>

            {/* Top bar */}
            <div style={{ background: "#005c4b", color: "#fff", padding: "0 16px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,.18)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {isMobile && mobileView !== "list" && (
                        <button onClick={() => { if (mobileView === "info") setMobileView("chat"); else { setMobileView("list"); setSelected(null); } }}
                            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", padding: 4 }}>
                            <ChevronLeft size={22} />
                        </button>
                    )}
                    <MessageSquare size={20} />
                    <div className="topbar-title">
                        <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "Georgia, serif", letterSpacing: .3 }}>Chat Management</h1>
                        <p style={{ margin: 0, fontSize: 11, opacity: .75 }}>{stats.total_chats || 0} chats · {stats.total_messages || 0} messages</p>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div className="topbar-stats">
                        {[
                            { label: "Total", value: stats.total_chats, accent: "#fff", cls: "stat-chip" },
                            { label: "Active", value: stats.active_chats, accent: "#86efac", cls: "stat-chip" },
                            { label: "1-on-1", value: stats.one_on_one_chats, accent: "#93c5fd", cls: "stat-chip" },
                            { label: "Messages", value: stats.total_messages, accent: "#fde68a", cls: "stat-chip" },
                        ].map(({ label, value, accent, cls }) => (
                            <div key={label} className={cls} style={{ textAlign: "center", background: "rgba(255,255,255,.1)", borderRadius: 8, padding: "4px 10px", minWidth: 52 }}>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: accent }}>{value ?? "—"}</p>
                                <p style={{ margin: 0, fontSize: 10, opacity: .75 }}>{label}</p>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setShowCreate(true)}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: "#00a884", border: "none", color: "#fff", padding: "7px 12px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                        <Plus size={15} /><span style={{ display: isMobile ? "none" : "inline" }}>New Chat</span>
                    </button>
                    <button onClick={fetchChats} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", padding: 8, borderRadius: 8, cursor: "pointer", display: "flex" }}>
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* Main layout */}
            <div className="chat-layout" style={{ flex: 1, overflow: "hidden", position: "relative" }}>

                {/* Sidebar */}
                <div className={`chat-sidebar${isMobile && mobileView !== "list" ? " mobile-hidden" : ""}`}>
                    <div style={{ padding: "12px 14px", borderBottom: "1px solid #e9edef", background: "#f0f2f5" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}>
                            <Search size={15} color="#8696a0" />
                            <input value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
                                placeholder="Search chats…" style={{ border: "none", flex: 1, fontSize: 14, outline: "none", color: "#111b21" }} />
                            {filters.search && <button onClick={() => setFilters(f => ({ ...f, search: "" }))} style={GHOST_BTN}><X size={14} /></button>}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <select value={filters.chat_type} onChange={e => { setFilters(f => ({ ...f, chat_type: e.target.value })); setPage(1); }}
                                style={{ flex: 1, border: "1px solid #e9edef", borderRadius: 8, padding: "7px 8px", fontSize: 12, background: "#fff", color: "#111b21", outline: "none" }}>
                                <option value="">All types</option>
                                {Object.entries(CHAT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
                                style={{ flex: 1, border: "1px solid #e9edef", borderRadius: 8, padding: "7px 8px", fontSize: 12, background: "#fff", color: "#111b21", outline: "none" }}>
                                <option value="">All status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: "auto" }}>
                        {loading
                            ? <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
                                <div style={{ width: 36, height: 36, border: "3px solid #e9edef", borderTop: "3px solid #00a884", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                            </div>
                            : chats.length === 0
                                ? <div style={{ padding: 48, textAlign: "center", color: "#8696a0" }}>
                                    <MessageSquare size={48} style={{ opacity: .2, display: "block", margin: "0 auto 12px" }} />
                                    No chats found
                                </div>
                                : chats.map(c => <ChatListItem key={c.id} chat={c} isSelected={selected?.id === c.id} onClick={() => selectChatResponsive(c)} currentUser={currentUser} />)
                        }
                    </div>

                    {totalPages > 1 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderTop: "1px solid #e9edef" }}>
                            <button disabled={page === 1} onClick={() => setPage(1)} style={PG_BTN}><ChevronsLeft size={14} /></button>
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={PG_BTN}><ChevronLeft size={14} /></button>
                            <span style={{ fontSize: 12, color: "#667781" }}>{page}/{totalPages}</span>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={PG_BTN}><ChevronRight size={14} /></button>
                            <button disabled={page === totalPages} onClick={() => setPage(totalPages)} style={PG_BTN}><ChevronsRight size={14} /></button>
                        </div>
                    )}
                </div>

                {/* Center chat area */}
                <div className={`chat-center${isMobile && mobileView === "list" ? " mobile-hidden" : ""}`}>
                    {selected ? (
                        <>
                            {/* Chat header */}
                            <div style={{ background: "#f0f2f5", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #e9edef", flexShrink: 0, position: "relative", zIndex: 10 }}>
                                {isMobile && mobileView === "chat" && (
                                    <button onClick={() => { setMobileView("list"); setSelected(null); }} style={{ ...HDR_BTN, marginRight: 2 }}>
                                        <ChevronLeft size={20} />
                                    </button>
                                )}
                                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: "pointer", minWidth: 0 }}
                                    onClick={() => { setShowInfo(!showInfo); setShowSearch(false); if (isMobile) setMobileView("info"); }}>
                                    <Avatar Icon={selected.chat_type !== "one_on_one" ? ct?.Icon : null} name={chatName(selected)} size={44} color={ct?.color} bg={ct?.bg} />
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chatName(selected)}</p>
                                        <p style={{ margin: 0, fontSize: 12, color: typingUsers.length > 0 ? "#00a884" : "#667781" }}>
                                            {typingUsers.length > 0
                                                ? `${typingUsers.map(u => u.name).join(", ")} typing…`
                                                : `${selected.participants?.length || 0} participants`}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 2, alignItems: "center", flexShrink: 0 }}>
                                    {!isMobile && <button onClick={() => setCallType("voice")} style={HDR_BTN} title="Voice call"><Phone size={18} /></button>}
                                    {!isMobile && <button onClick={() => setCallType("video")} style={HDR_BTN} title="Video call"><Video size={18} /></button>}
                                    <button onClick={() => { setShowSearch(s => !s); setShowInfo(false); }} style={HDR_BTN} title="Search"><Search size={18} /></button>
                                    <div style={{ position: "relative" }}>
                                        <button onClick={() => setShowMore(p => !p)} style={HDR_BTN}><MoreVertical size={18} /></button>
                                        {showMoreMenu && (
                                            <div style={{ position: "absolute", top: "100%", right: 0, background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,.16)", zIndex: 200, minWidth: 190, padding: 4 }}>
                                                {[
                                                    { label: "Voice call", Ic: Phone, fn: () => setCallType("voice") },
                                                    { label: "Video call", Ic: Video, fn: () => setCallType("video") },
                                                    { label: "Chat info", Ic: Info, fn: () => { setShowInfo(true); setShowSearch(false); if (isMobile) setMobileView("info"); } },
                                                    { label: "Participants", Ic: Users, fn: () => { setShowInfo(true); setShowSearch(false); if (isMobile) setMobileView("info"); } },
                                                    { label: "Settings", Ic: Settings, fn: () => { setShowInfo(true); setShowSearch(false); if (isMobile) setMobileView("info"); } },
                                                ].map(({ label, Ic, fn }) => (
                                                    <button key={label} onClick={() => { fn(); setShowMore(false); }}
                                                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#111b21", borderRadius: 8 }}
                                                        onMouseEnter={e => e.currentTarget.style.background = "#f0f2f5"}
                                                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                                                    ><Ic size={15} />{label}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Messages area */}
                            <div style={{ flex: 1, overflowY: "auto", padding: "16px 0", background: "#efeae2", backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
                                onClick={() => setShowMore(false)}>
                                {msgsLoading && (
                                    <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                                        <div style={{ width: 30, height: 30, border: "3px solid rgba(0,0,0,.08)", borderTop: "3px solid #00a884", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                                    </div>
                                )}
                                {messages.map((msg, idx) => {
                                    const prev = messages[idx - 1];
                                    const sameSender = prev?.sender?.id === msg.sender?.id;
                                    const isOwn = msg.sender?.id === currentUser?.id;
                                    return (
                                        <MessageBubble key={msg.id || idx}
                                            msg={msg} isOwn={isOwn} showAvatar={!sameSender}
                                            currentUser={currentUser}
                                            onDelete={handleDeleteMsg}
                                            onReply={setReplyTo}
                                            onMediaClick={(src, type, name) => setMediaViewer({ src, type, name })}
                                            targetRef={el => { if (el) msgRefs.current[msg.id] = el; }}
                                        />
                                    );
                                })}
                                {typingUsers.length > 0 && <div style={{ padding: "0 16px" }}><TypingDots /></div>}
                                <div ref={bottomRef} />
                            </div>

                            <ChatInput onSend={handleSend} onTyping={handleTyping} disabled={!selected?.is_active}
                                replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
                        </>
                    ) : (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f0f2f5", padding: 24 }}>
                            <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#e9edef", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                                <MessageSquare size={40} color="#aebac1" />
                            </div>
                            <h2 style={{ margin: "0 0 8px", fontFamily: "Georgia, serif", color: "#41525d", fontSize: 20, textAlign: "center" }}>Select a chat</h2>
                            <p style={{ margin: "0 0 24px", color: "#8696a0", fontSize: 14, textAlign: "center" }}>Choose a conversation from the list or start a new one.</p>
                            <button onClick={() => setShowCreate(true)}
                                style={{ display: "flex", alignItems: "center", gap: 8, background: "#00a884", color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                                <Plus size={18} />New Chat
                            </button>
                        </div>
                    )}
                </div>

                {/* Right panels */}
                {(showInfo || showSearch) && selected && (
                    <div className={`chat-right-panel${isMobile && mobileView !== "info" ? " mobile-hidden" : ""}`}>
                        {showInfo && (
                            <ChatInfoPanel chat={selected} onClose={() => { setShowInfo(false); if (isMobile) setMobileView("chat"); }}
                                onOpenChat={openChatWithUser} allMedia={chatMediaFiles}
                                onBlockParticipant={handleBlock} onUpdateRole={handleUpdateRole}
                                onAddMember={handleAddMember} onNavigateToMessage={navigateToMessage}
                                onRefresh={fetchChats} />
                        )}
                        {showSearch && (
                            <SearchInChatPanel messages={messages} onNavigate={navigateToMessage}
                                onClose={() => { setShowSearch(false); if (isMobile) setMobileView("chat"); }} />
                        )}
                    </div>
                )}

                {isOpeningChat && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000
                    }}>
                        <div style={{
                            background: '#fff',
                            borderRadius: 12,
                            padding: '24px',
                            textAlign: 'center',
                            minWidth: 300
                        }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                border: '3px solid #f0f2f5',
                                borderTop: '3px solid #00a884',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 16px'
                            }} />
                            <p style={{ margin: 0, color: '#111b21' }}>Opening chat...</p>
                        </div>
                    </div>
                )}
            </div>

            {showCreate && <CreateChatModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
            {mediaViewer && <MediaViewer {...mediaViewer} onClose={() => setMediaViewer(null)} />}
            {callType && <CallModal type={callType} chatName={chatName(selected)} onEnd={() => setCallType(null)} />}
        </div>
    );
}

const PG_BTN = { background: "none", border: "1px solid #e9edef", borderRadius: 6, cursor: "pointer", padding: "4px 8px", display: "flex", alignItems: "center", color: "#54656f" };
const HDR_BTN = { background: "none", border: "none", cursor: "pointer", color: "#54656f", padding: 8, borderRadius: 8, display: "flex", alignItems: "center" };