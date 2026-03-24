/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import i18n from "../../../i18n";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Globe, Users, ShoppingBag, MessageSquare, MessageCircle,
  Phone, Video, MoreVertical, Search,
  Plus, Trash2, X, Check,
  ChevronLeft, RefreshCw, Download,
  CheckCircle, Eye, Ban, Unlock,
  Mic, MicOff, Camera, CameraOff,
  Send, Image, File as FileIcon, Music, Film,
  Copy, Play, FileText, AlertTriangle,
  CornerUpLeft, FileSpreadsheet, Square,
  Crown, User,
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
  global: { label: "Global Chat", Icon: Globe, color: "#00a884", bg: "#d9fdd3" },
  farmers: { label: "Farmers Chat", Icon: Users, color: "#34B7F1", bg: "#e8f5fe" },
  buyers: { label: "Buyers Chat", Icon: ShoppingBag, color: "#F2A93B", bg: "#fff1d6" },
  one_on_one: { label: "Direct Message", Icon: MessageCircle, color: "#8696A0", bg: "#f0f0f0" },
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

/* ─── Helpers ────────────────────────────────────────────────────────────── */
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

/* ─── Media type resolver ────────────────────────────────────────────────── */
function detectMediaType(url, explicitType) {
  if (!url) return null;
  const filename = decodeURIComponent(url.split("?")[0].split("/").pop()).toLowerCase();
  if (filename.startsWith("voice-")) return "audio";
  const t = (explicitType || "").toLowerCase().trim();
  if (t === "image") return "image";
  if (t === "video") return "video";
  if (t === "audio" || t === "voice_note") return "audio";
  if (t === "pdf") return "pdf";
  if (t === "word") return "word";
  if (t === "excel") return "excel";
  if (t === "document") return "doc";
  if (filename.match(/\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/)) return "audio";
  if (filename.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/)) return "image";
  if (filename.match(/\.(mp4|mov|avi|mkv|flv)$/)) return "video";
  if (filename.match(/\.pdf$/)) return "pdf";
  if (filename.match(/\.(doc|docx)$/)) return "word";
  if (filename.match(/\.(xls|xlsx|csv)$/)) return "excel";
  return "file";
}

/* ─── Auth-aware download ────────────────────────────────────────────────── */
async function downloadWithAuth(url, filename) {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch (err) { toast.error(`Download failed: ${err.message}`); }
}

/* ─── Voice recorder hook ────────────────────────────────────────────────── */
function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [blobReady, setBlobReady] = useState(false);
  const blobRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const start = async () => {
    try {
      blobRef.current = null; setBlobReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mime });
        blobRef.current = b; setUrl(URL.createObjectURL(b)); setBlobReady(true);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(100); mediaRef.current = mr;
      setRecording(true); setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch { toast.error("Microphone access denied"); }
  };

  const stop = () => { if (mediaRef.current?.state !== "inactive") mediaRef.current.stop(); clearInterval(timerRef.current); setRecording(false); };
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

/* ── Full-screen media viewer ────────────────────────────────────────────── */
function MediaViewer({ src, type, name, onClose }) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  useEffect(() => {
    if (type !== "pdf") return;
    setPdfLoading(true); setPdfError(null);
    fetch(src, { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob(); })
      .then(blob => { setPdfBlobUrl(URL.createObjectURL(blob)); setPdfLoading(false); })
      .catch(err => { setPdfError(`Could not load PDF: ${err.message}`); setPdfLoading(false); });
    return () => { setPdfBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; }); };
  }, [src, type]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.93)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 10, zIndex: 1 }}>
        <a href={src} download={name} target="_blank" rel="noreferrer"
          style={{ color: "#fff", cursor: "pointer", padding: 9, borderRadius: 8, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 13 }}>
          <Download size={18} /> Save
        </a>
        <button onClick={onClose} style={{ color: "#fff", background: "rgba(255,255,255,.12)", border: "none", cursor: "pointer", padding: 9, borderRadius: 8, display: "flex" }}>
          <X size={20} />
        </button>
      </div>
      {type === "image" && <img src={src} alt={name} style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 8, objectFit: "contain" }} />}
      {type === "video" && <video src={src} controls autoPlay style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 8 }} />}
      {type === "audio" && (
        <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 16, padding: "32px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#00a884", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Music size={32} color="#fff" />
          </div>
          <p style={{ color: "#fff", margin: 0, fontSize: 14, maxWidth: 260, textAlign: "center", wordBreak: "break-word" }}>{name}</p>
          <audio src={src} controls autoPlay style={{ width: 320 }} />
        </div>
      )}
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
              <a href={src} download={name}
                style={{ background: "#e74c3c", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <Download size={16} /> Download instead
              </a>
            </div>
          )}
          {pdfBlobUrl && !pdfLoading && !pdfError && (
            <iframe src={pdfBlobUrl} title={name} style={{ width: "100%", height: "100%", border: "none", borderRadius: 8 }} />
          )}
        </div>
      )}
      <p style={{ color: "#ccc", marginTop: 12, fontSize: 13, maxWidth: "80vw", textAlign: "center", wordBreak: "break-word" }}>{name}</p>
    </div>
  );
}

/* ── Attachment preview ──────────────────────────────────────────────────── */
function AttachmentPreview({ url, name, fileType, fileSize, duration, dimensions, thumbnail, onMediaClick }) {
  const kind = detectMediaType(url, fileType);
  const label = name || url?.split("/").pop() || "file";
  const size = fileSize ? humanSize(fileSize) : null;
  if (!url) return null;

  if (kind === "image") return (
    <div style={{ marginBottom: 4 }}>
      <img src={thumbnail || url} alt={label} onClick={() => onMediaClick(url, "image", label)}
        style={{ maxWidth: 280, maxHeight: 220, borderRadius: 10, display: "block", cursor: "zoom-in", objectFit: "cover", border: "1px solid rgba(0,0,0,.08)" }} />
      {dimensions && <p style={{ margin: "3px 0 0", fontSize: 10, color: "#8696a0" }}>{dimensions}{size && ` · ${size}`}</p>}
    </div>
  );

  if (kind === "video") return (
    <div style={{ marginBottom: 4 }}>
      <div onClick={() => onMediaClick(url, "video", label)}
        style={{ position: "relative", display: "inline-block", cursor: "pointer", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(0,0,0,.08)" }}>
        {thumbnail
          ? <img src={thumbnail} alt={label} style={{ maxWidth: 280, maxHeight: 180, display: "block", objectFit: "cover" }} />
          : <video style={{ maxWidth: 280, maxHeight: 180, display: "block" }}><source src={url} /></video>}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.35)" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={22} color="#111" fill="#111" />
          </div>
        </div>
        {duration && <div style={{ position: "absolute", bottom: 6, right: 8, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, padding: "2px 6px", borderRadius: 4 }}>{fmtDuration(duration)}</div>}
      </div>
      {size && <p style={{ margin: "3px 0 0", fontSize: 10, color: "#8696a0" }}>{size}</p>}
    </div>
  );

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
              : <p style={{ margin: "0 0 4px", fontSize: 12, color: "#111b21", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{label}</p>}
            <audio controls src={url} style={{ width: "100%", height: 32, display: "block" }} />
          </div>
        </div>
        {(duration || size) && <p style={{ margin: "3px 0 0", fontSize: 10, color: "#8696a0" }}>{duration && fmtDuration(duration)}{duration && size && " · "}{size}</p>}
      </div>
    );
  }

  if (kind === "pdf") return (
    <div onClick={() => onMediaClick(url, "pdf", label)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(231,76,60,.06)", borderRadius: 10, cursor: "pointer", marginBottom: 4, border: "1px solid rgba(231,76,60,.15)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, background: "#e74c3c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FileText size={22} color="#fff" /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 13, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
        <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>PDF{size && ` · ${size}`} · Tap to view</p>
      </div>
      <Eye size={16} color="#e74c3c" />
    </div>
  );

  if (kind === "word") return (
    <div onClick={() => downloadWithAuth(url, label)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(43,124,211,.06)", borderRadius: 10, cursor: "pointer", marginBottom: 4, border: "1px solid rgba(43,124,211,.15)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, background: "#2b7cd3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FileText size={22} color="#fff" /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 13, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
        <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>Word Document{size && ` · ${size}`} · Tap to download</p>
      </div>
      <Download size={16} color="#2b7cd3" />
    </div>
  );

  if (kind === "excel") return (
    <div onClick={() => downloadWithAuth(url, label)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(30,126,52,.06)", borderRadius: 10, cursor: "pointer", marginBottom: 4, border: "1px solid rgba(30,126,52,.15)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, background: "#1e7e34", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FileSpreadsheet size={22} color="#fff" /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 13, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
        <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>Spreadsheet{size && ` · ${size}`} · Tap to download</p>
      </div>
      <Download size={16} color="#1e7e34" />
    </div>
  );

  return (
    <div onClick={() => downloadWithAuth(url, label)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(0,0,0,.04)", borderRadius: 10, cursor: "pointer", marginBottom: 4, border: "1px solid rgba(0,0,0,.08)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, background: "#8696a0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FileIcon size={22} color="#fff" /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 13, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
        <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>{size || "File"} · Tap to download</p>
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

  const mediaArr = useMemo(() => {
    const arr = msg.media || msg.media_files || [];
    return arr.filter(mf => !!(mf.file_url || mf.file));
  }, [msg.media, msg.media_files]);

  const bareAttachment = !mediaArr.length && msg.attachment ? msg.attachment : null;

  // Hide messages deleted for everyone from non-senders
  // (visibility === 'admin_only' means deleted for everyone — hide from regular users)
  if (msg.visibility === "admin_only" && !isOwn) return null;

  return (
    <div ref={targetRef} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 2, justifyContent: isOwn ? "flex-end" : "flex-start", padding: "1px 16px", position: "relative", animation: "fadeIn .18s ease" }}>
      {!isOwn && (
        <div style={{ width: 30, flexShrink: 0 }}>
          {showAvatar && <Avatar name={msg.sender?.full_name} size={30} />}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start", maxWidth: "65%" }}>
        {!isOwn && showAvatar && (
          <span style={{ fontSize: 12, fontWeight: 600, color: "#00a884", marginBottom: 2, paddingLeft: 4 }}>{msg.sender?.full_name}</span>
        )}
        <div style={{ background: isOwn ? "#d9fdd3" : "#fff", borderRadius: isOwn ? "12px 2px 12px 12px" : "2px 12px 12px 12px", padding: "7px 10px 6px", boxShadow: "0 1px 2px rgba(0,0,0,.1)", position: "relative", maxWidth: "100%", minWidth: 80 }}>
          {isDeleted ? (
            // Own deleted messages show a placeholder (hidden to others via early return above)
            <em style={{ color: "#8696a0", fontSize: 13 }}>You deleted this message</em>
          ) : (
            <>
              {mediaArr.map((mf, i) => (
                <AttachmentPreview key={mf.id || i}
                  url={mf.file_url || mf.file} name={mf.file_name}
                  fileType={mf.file_type || ""} fileSize={mf.file_size || null}
                  duration={mf.duration || null} dimensions={mf.dimensions || null}
                  thumbnail={mf.thumbnail_url || null} onMediaClick={onMediaClick} />
              ))}
              {bareAttachment && (
                <AttachmentPreview url={bareAttachment}
                  name={bareAttachment.split("/").pop().split("?")[0]}
                  fileType={msg.message_type || ""} onMediaClick={onMediaClick} />
              )}
              {msg.content && (
                <p style={{ margin: mediaArr.length > 0 || bareAttachment ? "6px 0 0" : 0, fontSize: 14.5, lineHeight: 1.45, color: "#111b21", wordBreak: "break-word" }}>
                  {msg.content}
                </p>
              )}
            </>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 3 }}>
            <span style={{ fontSize: 11, color: "#667781" }}>{time}</span>
            {isOwn && (msg.is_read
              ? <CheckCircle size={12} color="#53bdeb" />
              : <Check size={12} color="#8696a0" />)}
          </div>
        </div>
      </div>

      {/* Hover actions — only for own non-deleted messages */}
      {hover && !isDeleted && isOwn && (
        <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: "calc(65% + 24px)", display: "flex", gap: 2, background: "#fff", borderRadius: 20, boxShadow: "0 2px 8px rgba(0,0,0,.14)", padding: "3px 6px", zIndex: 10 }}>
          <button title="Reply" onClick={() => onReply(msg)} style={ACT_BTN}><CornerUpLeft size={13} /></button>
          <button title="Copy" onClick={() => { navigator.clipboard.writeText(msg.content || ""); toast.success("Copied!"); }} style={ACT_BTN}><Copy size={13} /></button>
          <button title="Delete for me" onClick={() => onDelete(msg.id, "for_me")} style={{ ...ACT_BTN, color: "#e74c3c" }}><Trash2 size={13} /></button>
        </div>
      )}
      {/* Reply button for other messages */}
      {hover && !isDeleted && !isOwn && (
        <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: "calc(65% + 24px)", display: "flex", gap: 2, background: "#fff", borderRadius: 20, boxShadow: "0 2px 8px rgba(0,0,0,.14)", padding: "3px 6px", zIndex: 10 }}>
          <button title="Reply" onClick={() => onReply(msg)} style={ACT_BTN}><CornerUpLeft size={13} /></button>
          <button title="Copy" onClick={() => { navigator.clipboard.writeText(msg.content || ""); toast.success("Copied!"); }} style={ACT_BTN}><Copy size={13} /></button>
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
  const fmtSec = s => `${Math.floor(s / 60).toString().padStart(2, "00")}:${(s % 60).toString().padStart(2, "0")}`;

  const send = () => { if (text.trim()) { onSend({ content: text }); setText(""); onCancelReply?.(); } };
  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const handleChange = e => {
    setText(e.target.value);
    clearTimeout(timerRef.current); onTyping(true);
    timerRef.current = setTimeout(() => onTyping(false), 1200);
  };

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
            const b = voice.getBlob(); if (!b) { toast.error("Recording not ready"); return; }
            const ext = b.type.includes("ogg") ? "ogg" : "webm";
            const file = new File([b], `voice-${Date.now()}.${ext}`, { type: b.type });
            onSend({ file }); voice.discard();
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
                { label: "Document", accept: ".pdf,.doc,.docx,.xls,.xlsx", Icon: FileIcon, color: "#3b82f6" },
              ].map(({ label, accept, Icon: Ic, color }) => (
                <button key={label} onClick={() => { fileRef.current.accept = accept; fileRef.current.click(); setAttach(false); }}
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

/* ── Chat info panel (read-only for regular users) ───────────────────────── */
function ChatInfoPanel({ chat, onClose, allMedia, onNavigateToMessage, onStartDirectChat }) {
  const [tab, setTab] = useState("members");

  return (
    <div style={{ width: 320, background: "#fff", borderLeft: "1px solid #e9edef", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "#f0f2f5", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #e9edef", flexShrink: 0 }}>
        <button onClick={onClose} style={GHOST_BTN}><ChevronLeft size={20} /></button>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111b21", fontFamily: "Georgia, serif" }}>Chat Info</h3>
      </div>

      {/* Identity */}
      <div style={{ padding: "20px 16px", textAlign: "center", borderBottom: "1px solid #e9edef", flexShrink: 0 }}>
        {(() => { const ct = CHAT_TYPES[chat?.chat_type] || CHAT_TYPES.one_on_one; return <Avatar Icon={ct.Icon} size={70} color={ct.color} bg={ct.bg} />; })()}
        <h2 style={{ margin: "10px 0 4px", fontSize: 18, fontFamily: "Georgia, serif", color: "#111b21" }}>{chat?.name || "Chat"}</h2>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#8696a0" }}>{CHAT_TYPES[chat?.chat_type]?.label} · Created {fmtDate(chat?.created_at)}</p>
        <span style={{ fontSize: 12, padding: "4px 12px", background: "#d9fdd3", color: "#00a884", borderRadius: 20, fontWeight: 600 }}>Active</span>
      </div>

      {/* Tabs — Members, Media, Settings (read-only) */}
      <div style={{ display: "flex", borderBottom: "1px solid #e9edef", flexShrink: 0 }}>
        {[["members", Users, "Members"], ["media", Image, "Media"], ["settings", Settings, "Settings"]].map(([key, Ic, lbl]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ flex: 1, padding: "11px 4px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, borderBottom: tab === key ? "2px solid #00a884" : "2px solid transparent", color: tab === key ? "#00a884" : "#8696a0" }}>
            <Ic size={16} /><span style={{ fontSize: 11, fontWeight: 600 }}>{lbl}</span>
          </button>
        ))}
      </div>

      {/* Members tab — view only, click to start DM */}
      {tab === "members" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "10px 18px 6px", borderBottom: "1px solid #f0f2f5" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>
              {(chat?.participants || []).length} members · Tap a member to send a direct message
            </p>
          </div>
          {(chat?.participants || []).map((p, i) => {
            const user = p.user || p;
            const role = ROLES[p.role] || ROLES.member;
            const RoleIc = role.Icon;
            return (
              <div key={user.id || i}
                onClick={() => onStartDirectChat(user)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderBottom: "1px solid #f0f2f5", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f5f6f6"}
                onMouseLeave={e => e.currentTarget.style.background = ""}
              >
                <Avatar name={user.full_name} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#111b21", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name}</p>
                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, padding: "2px 7px", borderRadius: 10, background: role.bg, color: role.color, fontWeight: 700, flexShrink: 0 }}>
                      <RoleIc size={9} />{role.label}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "#8696a0" }}>{user.phone_number}</p>
                </div>
                <MessageCircle size={15} color="#00a884" />
              </div>
            );
          })}
        </div>
      )}

      {/* Media tab */}
      {tab === "media" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
          {allMedia.length === 0
            ? <div style={{ padding: 40, textAlign: "center", color: "#8696a0" }}>
              <Image size={40} style={{ opacity: .25, display: "block", margin: "0 auto 10px" }} />
              <p style={{ margin: 0 }}>No shared media</p>
            </div>
            : <>
              <div style={{ background: "#f0f2f5", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#667781" }}>
                  <strong style={{ color: "#111b21" }}>{allMedia.length}</strong> files shared
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
                {allMedia.map((m, i) => {
                  const url = m.file_url || m.url || null;
                  const type = detectMediaType(url, m.file_type || "");
                  const thumb = m.thumbnail_url || null;
                  const msgId = m.message_id || null;
                  return (
                    <div key={m.id || i} onClick={() => msgId && onNavigateToMessage(msgId)} title={m.file_name || ""}
                      style={{ aspectRatio: "1", overflow: "hidden", borderRadius: 6, cursor: msgId ? "pointer" : "default", background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      {type === "image"
                        ? <img src={thumb || url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : type === "video"
                          ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 8 }}><Film size={22} color="#8696a0" /><span style={{ fontSize: 9, color: "#8696a0" }}>video</span></div>
                          : type === "audio"
                            ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 8 }}><Mic size={22} color="#00a884" /><span style={{ fontSize: 9, color: "#00a884" }}>audio</span></div>
                            : type === "pdf"
                              ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 8 }}><FileText size={22} color="#e74c3c" /><span style={{ fontSize: 9, color: "#e74c3c" }}>pdf</span></div>
                              : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: 8 }}><FileIcon size={22} color="#8696a0" /><span style={{ fontSize: 9, color: "#8696a0" }}>{(m.file_name || "file").split(".").pop()}</span></div>
                      }
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
          }
        </div>
      )}

      {/* Settings tab — read-only notice */}
      {tab === "settings" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <div style={{ background: "#f0f2f5", borderRadius: 12, padding: "16px 18px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <Info size={18} />
            <p style={{ margin: 0, fontSize: 13, color: "#667781", lineHeight: 1.5 }}>
              Chat settings are managed by administrators only. Contact an admin if you need changes made to this chat.
            </p>
          </div>
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#667781", textTransform: "uppercase", letterSpacing: .5 }}>Chat Name</p>
            <p style={{ margin: 0, fontSize: 14, color: "#111b21", padding: "10px 14px", background: "#f0f2f5", borderRadius: 10 }}>{chat?.name || "—"}</p>
          </div>
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#667781", textTransform: "uppercase", letterSpacing: .5 }}>Type</p>
            <p style={{ margin: 0, fontSize: 14, color: "#111b21", padding: "10px 14px", background: "#f0f2f5", borderRadius: 10 }}>{CHAT_TYPES[chat?.chat_type]?.label || "—"}</p>
          </div>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#667781", textTransform: "uppercase", letterSpacing: .5 }}>Who Can Send Messages</p>
            <p style={{ margin: 0, fontSize: 14, color: "#111b21", padding: "10px 14px", background: "#f0f2f5", borderRadius: 10 }}>
              {chat?.settings?.allowed_senders === "admins_only" ? "Admins Only" : "Everyone"}
            </p>
          </div>
        </div>
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
    return messages.filter(m => !m.is_deleted && m.visibility !== "admin_only" && m.content?.toLowerCase().includes(ql));
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
      return other?.user?.full_name || other?.full_name || "Direct Message";
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
            {last.content || <em style={{ color: "#aaa" }}>No messages yet</em>}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 4 }}>
            {chat.unread_count > 0 && (
              <span style={{ background: "#00a884", color: "#fff", fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{chat.unread_count}</span>
            )}
            <TypeIcon size={12} color={ct.color} />
          </div>
        </div>
      </div>
    </div>
  );
}

const GHOST_BTN = { background: "none", border: "none", cursor: "pointer", color: "#667781", display: "flex", alignItems: "center", padding: 4 };

/* ══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                            */
/* ══════════════════════════════════════════════════════════════════════════ */
export default function FarmerChatPage() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showInfo, setShowInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMoreMenu, setShowMore] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [mediaViewer, setMediaViewer] = useState(null);
  const [callType, setCallType] = useState(null);
  const [chatMediaFiles, setChatMediaFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const chatOpenedRef = useRef(false);

  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const msgRefs = useRef({});

  const [mobileView, setMobileView] = useState("list");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── Init ── */
  useEffect(() => {
    http.get("/profile/").then(r => setCurrentUser(r.data)).catch(() => { });
    fetchChats();
  }, []);

  /* ── Fetch only chats this user belongs to ── */
  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      // Uses GET /chat/my-chats/ — returns only chats the user is a participant of
      const r = await http.get("/chat/my-chats/");
      setChats(r.data.chats || []);
    } catch { toast.error("Failed to load chats"); }
    setLoading(false);
  }, []);

  /* ── Filtered chats for sidebar search ── */
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter(c => {
      const name = c.name || CHAT_TYPES[c.chat_type]?.label || "";
      const lastMsg = c.last_message?.content || "";
      return name.toLowerCase().includes(q) || lastMsg.toLowerCase().includes(q);
    });
  }, [chats, searchQuery]);

  /* ── Fetch chat media ── */
  const fetchChatMedia = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      const r = await http.get(`/chat/${chatId}/media/`);
      setChatMediaFiles(r.data.media_files || []);
    } catch { setChatMediaFiles([]); }
  }, []);

  const isMobileRef = useRef(isMobile);
  const fetchChatMediaRef = useRef(fetchChatMedia);
  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);
  useEffect(() => { fetchChatMediaRef.current = fetchChatMedia; }, [fetchChatMedia]);

  /* ── Select chat ── */
  const selectChat = useCallback(async (chat) => {
    setSelected(chat);
    setShowInfo(false); setShowSearch(false);
    setMessages([]); setChatMediaFiles([]);
    setMsgsLoading(true);
    try {
      const r = await http.get(`/chat/${chat.id}/messages/`);
      const raw = r.data;
      let msgs = [];
      if (Array.isArray(raw)) msgs = raw;
      else if (Array.isArray(raw.messages)) msgs = raw.messages;
      else if (Array.isArray(raw.data)) msgs = raw.data;

      // Filter out messages hidden for everyone (admin_only visibility) from regular users
      // These are messages deleted "for everyone" — admins still see them
      msgs = msgs.filter(m => m.visibility !== "admin_only");

      setMessages(msgs);
      await http.post(`/chat/${chat.id}/mark-read/`).catch(() => { });
      fetchChatMedia(chat.id);
    } catch { toast.error("Failed to load messages"); }
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
          const response = await http.get(`/chat/my-chats/${location.state.openChatId}/`);
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

  /* ── WebSocket ── */
  const initWS = useCallback((chatId) => {
    wsRef.current?.close();
    const tok = localStorage.getItem("access_token");
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${chatId}/?token=${tok}`);
    ws.onmessage = e => {
      const d = JSON.parse(e.data);
      if (d.type === "chat_message") {
        const msg = d.message || {};
        // Don't add messages with admin_only visibility (deleted for everyone)
        if (msg.visibility === "admin_only") return;
        setMessages(p => {
          const exists = p.some(m => m.id === msg.id);
          return exists ? p : [...p, msg];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
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
        // Remove deleted messages from the view entirely for regular users
        setMessages(p => p.filter(m => m.id !== d.message_id));
      }
    };
    wsRef.current = ws;
  }, []);

  /* ── Send message ── */
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
      // Re-fetch messages to get fresh data including media
      const r = await http.get(`/chat/${selected.id}/messages/`);
      const raw = r.data;
      let msgs = [];
      if (Array.isArray(raw)) msgs = raw;
      else if (Array.isArray(raw.messages)) msgs = raw.messages;
      else if (Array.isArray(raw.data)) msgs = raw.data;

      // Filter out admin_only visibility messages
      msgs = msgs.filter(m => m.visibility !== "admin_only");
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      fetchChatMedia(selected.id);
    } catch { toast.error("Failed to send message"); }
  }, [selected, fetchChatMedia]);

  /* ── Delete message (for me only — hides from own view) ── */
  const handleDeleteMsg = useCallback(async (msgId, deleteType = "for_me") => {
    const confirmMsg = deleteType === "for_everyone"
      ? "Delete this message for everyone?"
      : "Hide this message from your view?";
    if (!window.confirm(confirmMsg)) return;
    try {
      await http.delete(`/chat/messages/${msgId}/delete/`, { data: { delete_type: deleteType } });
      if (deleteType === "for_me") {
        // Hide from own view only — mark locally as deleted
        setMessages(p => p.map(m => m.id === msgId ? { ...m, is_deleted: true } : m));
      } else {
        // For everyone — remove from view entirely
        setMessages(p => p.filter(m => m.id !== msgId));
      }
    } catch { toast.error("Failed to delete message"); }
  }, []);

  /* ── Typing ── */
  const handleTyping = useCallback((isTyping) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ type: "typing", is_typing: isTyping }));
  }, []);

  /* ── Start direct chat with a member ── */
  const handleStartDirectChat = useCallback(async (user) => {
    if (user.id === currentUser?.id) return; // can't chat with yourself
    try {
      // POST /chat/create/ with chat_type one_on_one
      const r = await http.post("/chat/create/", { chat_type: "one_on_one", user_id: user.id });
      const nc = r.data.chat;
      setChats(p => p.find(c => c.id === nc.id) ? p : [nc, ...p]);
      await selectChat(nc);
      setShowInfo(false);
      if (isMobileRef.current) setMobileView("chat");
    } catch { toast.error("Failed to open direct message"); }
  }, [currentUser, selectChat]);

  /* ── Navigate to message from media panel ── */
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
      return other?.user?.full_name || other?.full_name || "Direct Message";
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
        const response = await http.get(`/chat/my-chats/${chatId}/`);
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
    <div style={{ fontFamily: "'DM Sans', sans-serif", height: "100vh", display: "flex", flexDirection: "column", background: "#f0f2f5" }}>
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar theme="colored" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #c1c9d0; border-radius: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-7px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        textarea, input, select, button { font-family: 'DM Sans', sans-serif; }
        .chat-layout { display: flex; flex: 1; overflow: hidden; }
        .chat-sidebar { width: 320px; background: #fff; display: flex; flex-direction: column; border-right: 1px solid #e9edef; flex-shrink: 0; }
        .chat-center  { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .chat-right-panel { display: flex; flex-shrink: 0; }
        @media (max-width: 768px) {
          .chat-layout { position: relative; }
          .chat-sidebar { position: absolute; inset: 0; width: 100%; z-index: 20; }
          .chat-sidebar.mobile-hidden { transform: translateX(-100%); transition: transform .25s; }
          .chat-center { position: absolute; inset: 0; z-index: 10; }
          .chat-center.mobile-hidden { display: none; }
          .chat-right-panel { position: absolute; inset: 0; z-index: 30; background: #fff; }
          .chat-right-panel.mobile-hidden { display: none; }
        }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ background: "#005c4b", color: "#fff", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isMobile && mobileView !== "list" && (
            <button onClick={() => { if (mobileView === "info") setMobileView("chat"); else { setMobileView("list"); setSelected(null); } }}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", padding: 4 }}>
              <ChevronLeft size={22} />
            </button>
          )}
          <MessageSquare size={20} />
          <div>
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "Georgia, serif" }}>My Chats</h1>
            <p style={{ margin: 0, fontSize: 11, opacity: .75 }}>{chats.length} conversation{chats.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={fetchChats} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", padding: 8, borderRadius: 8, cursor: "pointer", display: "flex" }}>
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Main layout ── */}
      <div className="chat-layout" style={{ flex: 1, overflow: "hidden", position: "relative" }}>

        {/* Sidebar */}
        <div className={`chat-sidebar${isMobile && mobileView !== "list" ? " mobile-hidden" : ""}`}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #e9edef", background: "#f0f2f5" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "8px 12px" }}>
              <Search size={15} color="#8696a0" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search chats…" style={{ border: "none", flex: 1, fontSize: 14, outline: "none", color: "#111b21" }} />
              {searchQuery && <button onClick={() => setSearchQuery("")} style={GHOST_BTN}><X size={14} /></button>}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading
              ? <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
                <div style={{ width: 36, height: 36, border: "3px solid #e9edef", borderTop: "3px solid #00a884", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              </div>
              : filteredChats.length === 0
                ? <div style={{ padding: 48, textAlign: "center", color: "#8696a0" }}>
                  <MessageSquare size={48} style={{ opacity: .2, display: "block", margin: "0 auto 12px" }} />
                  {searchQuery ? "No chats match your search" : "You have no chats yet"}
                </div>
                : filteredChats.map(c => (
                  <ChatListItem key={c.id} chat={c} isSelected={selected?.id === c.id}
                    onClick={() => selectChat(c)} currentUser={currentUser} />
                ))
            }
          </div>
        </div>

        {/* Center chat area */}
        <div className={`chat-center${isMobile && mobileView === "list" ? " mobile-hidden" : ""}`}>
          {selected ? (
            <>
              {/* Chat header */}
              <div style={{ background: "#f0f2f5", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #e9edef", flexShrink: 0, position: "relative", zIndex: 10 }}>
                {isMobile && (
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
                  <button onClick={() => { setShowSearch(s => !s); setShowInfo(false); }} style={HDR_BTN} title="Search"><Search size={18} /></button>
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setShowMore(p => !p)} style={HDR_BTN}><MoreVertical size={18} /></button>
                    {showMoreMenu && (
                      <div style={{ position: "absolute", top: "100%", right: 0, background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,.16)", zIndex: 200, minWidth: 180, padding: 4 }}>
                        {[
                          { label: "Chat info", Ic: Info, fn: () => { setShowInfo(true); setShowSearch(false); if (isMobile) setMobileView("info"); } },
                          { label: "Members", Ic: Users, fn: () => { setShowInfo(true); setShowSearch(false); if (isMobile) setMobileView("info"); } },
                          { label: "Search", Ic: Search, fn: () => { setShowSearch(true); setShowInfo(false); if (isMobile) setMobileView("info"); } },
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

              {/* Input — disabled if user is blocked or chat is observers-only */}
              <ChatInput
                onSend={handleSend}
                onTyping={handleTyping}
                disabled={!selected?.is_active || selected?.settings?.allowed_senders === "admins_only"}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
              />
              {selected?.settings?.allowed_senders === "admins_only" && (
                <div style={{ background: "#fff8e1", padding: "8px 16px", textAlign: "center", fontSize: 12, color: "#f59e0b", borderTop: "1px solid #fde68a" }}>
                  Only admins can send messages in this chat
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f0f2f5", padding: 24 }}>
              <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#e9edef", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <MessageSquare size={40} color="#aebac1" />
              </div>
              <h2 style={{ margin: "0 0 8px", fontFamily: "Georgia, serif", color: "#41525d", fontSize: 20, textAlign: "center" }}>Select a conversation</h2>
              <p style={{ margin: 0, color: "#8696a0", fontSize: 14, textAlign: "center" }}>Choose a chat from the list to start messaging.</p>
            </div>
          )}
        </div>

        {/* Right panels */}
        {(showInfo || showSearch) && selected && (
          <div className={`chat-right-panel${isMobile && mobileView !== "info" ? " mobile-hidden" : ""}`}>
            {showInfo && (
              <ChatInfoPanel
                chat={selected}
                allMedia={chatMediaFiles}
                onClose={() => { setShowInfo(false); if (isMobile) setMobileView("chat"); }}
                onNavigateToMessage={navigateToMessage}
                onStartDirectChat={handleStartDirectChat}
              />
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

      {mediaViewer && <MediaViewer {...mediaViewer} onClose={() => setMediaViewer(null)} />}
      {callType && <CallModal type={callType} chatName={chatName(selected)} onEnd={() => setCallType(null)} />}
    </div>
  );
}

/* ── Call modal ── */
function CallModal({ type, chatName, onEnd }) {
  const [sec, setSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [permErr, setPermErr] = useState(null);
  const streamRef = useRef(null);
  const localVidRef = useRef(null);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia(type === "video" ? { audio: true, video: true } : { audio: true, video: false })
      .then(stream => { if (!active) { stream.getTracks().forEach(t => t.stop()); return; } streamRef.current = stream; if (localVidRef.current) localVidRef.current.srcObject = stream; })
      .catch(err => { if (active) setPermErr(err.name === "NotAllowedError" ? "Camera / microphone access was denied." : `Could not access media: ${err.message}`); });
    const timer = setInterval(() => setSec(s => s + 1), 1000);
    return () => { active = false; clearInterval(timer); streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [type]);

  const fmtSec = s => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "linear-gradient(135deg,#005c4b,#00a884)", zIndex: 9000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
      {permErr && <div style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(231,76,60,.9)", borderRadius: 10, padding: "12px 20px", maxWidth: 380, textAlign: "center", fontSize: 14 }}><AlertTriangle size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />{permErr}</div>}
      {type === "video" && (
        <div style={{ position: "absolute", top: 20, right: 20, width: 140, height: 100, borderRadius: 12, overflow: "hidden", background: "rgba(0,0,0,.5)", border: "2px solid rgba(255,255,255,.2)" }}>
          {camOff ? <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><CameraOff size={24} color="rgba(255,255,255,.5)" /></div>
            : <video ref={localVidRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />}
        </div>
      )}
      <div style={{ width: 88, height: 88, borderRadius: "50%", background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontFamily: "Georgia, serif", fontWeight: 700, marginBottom: 18, border: "3px solid rgba(255,255,255,.25)" }}>{avatarLetter(chatName)}</div>
      <h2 style={{ margin: "0 0 4px", fontFamily: "Georgia, serif", fontSize: 24 }}>{chatName}</h2>
      <p style={{ margin: "0 0 8px", opacity: .8, fontSize: 14 }}>{type === "video" ? "Video" : "Voice"} call</p>
      <p style={{ margin: "0 0 36px", fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>{fmtSec(sec)}</p>
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <button onClick={() => { streamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(m => !m); }}
            style={{ width: 52, height: 52, borderRadius: "50%", background: muted ? "#fff" : "rgba(255,255,255,.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {muted ? <MicOff size={20} color="#e74c3c" /> : <Mic size={20} color="#fff" />}
          </button>
          <span style={{ fontSize: 11, opacity: .8 }}>{muted ? "Unmute" : "Mute"}</span>
        </div>
        {type === "video" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <button onClick={() => { streamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOff; }); setCamOff(c => !c); }}
              style={{ width: 52, height: 52, borderRadius: "50%", background: camOff ? "#fff" : "rgba(255,255,255,.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {camOff ? <CameraOff size={20} color="#e74c3c" /> : <Camera size={20} color="#fff" />}
            </button>
            <span style={{ fontSize: 11, opacity: .8 }}>{camOff ? "Cam on" : "Cam off"}</span>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onEnd(); }}
            style={{ width: 52, height: 52, borderRadius: "50%", background: "#e74c3c", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Phone size={20} color="#fff" style={{ transform: "rotate(135deg)" }} />
          </button>
          <span style={{ fontSize: 11, opacity: .8 }}>End</span>
        </div>
      </div>
    </div>
  );
}

const HDR_BTN = { background: "none", border: "none", cursor: "pointer", color: "#54656f", padding: 8, borderRadius: 8, display: "flex", alignItems: "center" };

// missing import used in ChatInfoPanel Settings tab
function Settings({ size = 16 }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}