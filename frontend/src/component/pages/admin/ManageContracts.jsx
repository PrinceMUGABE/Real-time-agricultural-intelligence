/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  X, Search, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Eye, CheckCircle, XCircle,
  Clock, AlertCircle, Loader2, FileText, DollarSign,
  Package, Truck, User, MapPin, Calendar, CreditCard,
  Smartphone, RefreshCw, Filter, TrendingUp, Handshake,
  ShieldCheck, Info, Phone, Mail, BarChart3, Percent,
  Settings, Users, Building2, Award, Activity, Trash2,
  Edit2, Download, Printer, Grid3x3, List, Maximize2,
  Minimize2, MoreVertical, Star, TrendingDown, Wallet,
  ShoppingBag, UserCheck, UserX, Send, MessageCircle
} from "lucide-react";

// API Base URL
const API_BASE_URL = "http://127.0.0.1:8000";

// Status colors
const statusColors = {
  pending: { bg: "#fff8e1", color: "#b76e0a", icon: Clock, gradient: "linear-gradient(135deg, #fff8e1, #ffecb3)" },
  accepted: { bg: "#e8f5e9", color: "#2e7d32", icon: CheckCircle, gradient: "linear-gradient(135deg, #e8f5e9, #c8e6c9)" },
  rejected: { bg: "#ffebee", color: "#c62828", icon: XCircle, gradient: "linear-gradient(135deg, #ffebee, #ffcdd2)" },
  completed: { bg: "#e3f2fd", color: "#1565c0", icon: CheckCircle, gradient: "linear-gradient(135deg, #e3f2fd, #bbdef5)" },
  failed: { bg: "#ffebee", color: "#c62828", icon: AlertCircle, gradient: "linear-gradient(135deg, #ffebee, #ffcdd2)" },
  in_progress: { bg: "#e8f5e9", color: "#2e7d32", icon: RefreshCw, gradient: "linear-gradient(135deg, #e8f5e9, #c8e6c9)" }
};

const paymentStatusColors = {
  pending: { bg: "#fff8e1", color: "#b76e0a" },
  started: { bg: "#e3f2fd", color: "#1565c0" },
  completed: { bg: "#e8f5e9", color: "#2e7d32" },
  failed: { bg: "#ffebee", color: "#c62828" }
};

const roleColors = {
  admin: { bg: "#e8f5e9", color: "#2e7d32" },
  farmer: { bg: "#e3f2fd", color: "#1565c0" },
  buyer: { bg: "#fff8e1", color: "#b76e0a" }
};

function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>Loading contracts...</p>
    </div>
  );
}

function StatusBadge({ status, type = "contract" }) {
  const colors = type === "payment" ? paymentStatusColors : statusColors;
  const config = colors[status] || colors.pending;
  const Icon = config.icon;
  const { t } = useTranslation();

  const statusLabels = {
    pending: t('pending'),
    accepted: t('accepted'),
    rejected: t('rejected'),
    completed: t('completed'),
    failed: t('failed'),
    in_progress: t('in_progress'),
    started: t('started')
  };

  return (
    <div className="status-badge" style={{ backgroundColor: config.bg, color: config.color }}>
      {Icon && <Icon size={12} />}
      <span>{statusLabels[status] || status}</span>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, bgColor, subtitle, trend }) {
  return (
    <div className="summary-card">
      <div className="summary-card-content">
        <div>
          <p className="summary-card-title">{title}</p>
          <h3 className="summary-card-value">{value}</h3>
          {subtitle && <p className="summary-card-subtitle">{subtitle}</p>}
          {trend && (
            <div className={`trend ${trend > 0 ? 'positive' : 'negative'}`}>
              {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend)}%</span>
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
  const pageSizeOptions = [10, 20, 50, 100];

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


function PaymentConfirmationModal({ isOpen, onClose, payment, onConfirm, onReject }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  if (!isOpen || !payment) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(payment.id);
      onClose();
    } catch (error) {
      console.error("Error confirming payment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error(t('please_enter_rejection_reason'));
      return;
    }
    setLoading(true);
    try {
      await onReject(payment.id, rejectionReason);
      onClose();
    } catch (error) {
      console.error("Error rejecting payment:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card payment-confirm-modal" style={{ maxWidth: '450px' }}>
        <div className="modal-head">
          <h2>{payment.status === 'pending' ? t('confirm_payment') : t('review_payment')}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="payment-summary">
            <div className="summary-item">
              <span className="summary-label">{t('amount')}:</span>
              <span className="summary-value">{payment.amount?.toLocaleString()} RWF</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">{t('payment_method')}:</span>
              <span className="summary-value">{t(payment.payment_method)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">{t('reference_number')}:</span>
              <span className="summary-value">{payment.reference_number || t('not_provided')}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">{t('paid_at')}:</span>
              <span className="summary-value">{new Date(payment.paid_at).toLocaleString()}</span>
            </div>
            {payment.notes && (
              <div className="summary-item">
                <span className="summary-label">{t('notes')}:</span>
                <span className="summary-value">{payment.notes}</span>
              </div>
            )}
          </div>

          {payment.status === 'pending' && (
            <>
              <div className="form-group">
                <label>{t('rejection_reason')} ({t('optional')})</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t('enter_rejection_reason_if_applicable')}
                />
              </div>

              <div className="payment-confirm-actions">
                <button className="btn-confirm-payment" onClick={handleConfirm} disabled={loading}>
                  {loading && <Loader2 size={16} className="spin-icon" />}
                  <CheckCircle size={16} />
                  {t('confirm_payment')}
                </button>
                <button className="btn-reject-payment" onClick={handleReject} disabled={loading}>
                  {loading && <Loader2 size={16} className="spin-icon" />}
                  <XCircle size={16} />
                  {t('reject_payment')}
                </button>
              </div>
            </>
          )}

          {payment.status === 'confirmed' && (
            <div className="payment-already-confirmed">
              <CheckCircle size={48} color="#2e7d32" />
              <p>{t('payment_already_confirmed')}</p>
              {payment.confirmed_by_detail && (
                <small>{t('confirmed_by')}: {payment.confirmed_by_detail.full_name} on {new Date(payment.confirmed_at).toLocaleString()}</small>
              )}
            </div>
          )}

          {payment.status === 'rejected' && (
            <div className="payment-already-rejected">
              <XCircle size={48} color="#c62828" />
              <p>{t('payment_already_rejected')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Updated ContractDetailsModal with payment actions
function ContractDetailsModal({ isOpen, onClose, contract, onUpdate, onDelete, onRefresh, apiClient }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  if (!isOpen || !contract) return null;

  const canDelete = contract.status === "pending" || contract.status === "rejected" || contract.status === "failed";
  const needsAdminConfirmation = contract.both_parties_accepted && !contract.admin_confirmed;
  const canBeCompleted = contract.status === "accepted" && contract.is_fully_paid && contract.delivery_status === "completed";
  const canBeFailed = contract.status !== "completed" && contract.status !== "failed";

  // Payment confirmation handler
  const handleConfirmPayment = async (paymentId) => {
    setUpdatingPayment(true);
    try {
      const response = await apiClient.post(`/contract/payments/${paymentId}/confirm/`);
      if (response.data.success) {
        toast.success(t('payment_confirmed_successfully'));
        onRefresh(); // Refresh the parent component
        // Refresh the contract data
        const updatedContract = await apiClient.get(`/contract/${contract.id}/`);
        Object.assign(contract, updatedContract.data);
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      toast.error(error.response?.data?.error || t('failed_to_confirm_payment'));
    } finally {
      setUpdatingPayment(false);
      setShowPaymentConfirmModal(false);
      setSelectedPayment(null);
    }
  };

  // Payment rejection handler
  const handleRejectPayment = async (paymentId, reason) => {
    setUpdatingPayment(true);
    try {
      const response = await apiClient.post(`/contract/payments/${paymentId}/reject/`, { reason });
      if (response.data.success) {
        toast.success(t('payment_rejected_successfully'));
        onRefresh();
        const updatedContract = await apiClient.get(`/contract/${contract.id}/`);
        Object.assign(contract, updatedContract.data);
      }
    } catch (error) {
      console.error("Error rejecting payment:", error);
      toast.error(error.response?.data?.error || t('failed_to_reject_payment'));
    } finally {
      setUpdatingPayment(false);
      setShowPaymentConfirmModal(false);
      setSelectedPayment(null);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete(contract.id);
      toast.success(t('contract_deleted_successfully'));
      onClose();
      onRefresh();
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast.error(error.response?.data?.error || t('failed_to_delete_contract'));
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleConfirmContract = async () => {
    setLoading(true);
    try {
      await onUpdate(contract.id, 'confirm');
      toast.success(t('contract_confirmed_successfully'));
      onRefresh();
    } catch (error) {
      console.error("Error confirming contract:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteContract = async () => {
    setLoading(true);
    try {
      await onUpdate(contract.id, 'complete');
      toast.success(t('contract_completed_successfully'));
      onRefresh();
    } catch (error) {
      console.error("Error completing contract:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFailContract = async () => {
    const reason = prompt(t('enter_failure_reason'));
    if (!reason) return;

    setLoading(true);
    try {
      await onUpdate(contract.id, 'fail', reason);
      toast.success(t('contract_marked_as_failed'));
      onRefresh();
    } catch (error) {
      console.error("Error failing contract:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-card admin-contract-modal">
          <div className="modal-head">
            <div>
              <h2>{t('contract_details')} #{contract.id}</h2>
              <p className="modal-subtitle">{contract.crop_name}</p>
            </div>
            <button className="modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-tabs">
            <button className={`tab-btn ${activeTab === "details" ? "active" : ""}`} onClick={() => setActiveTab("details")}>
              <FileText size={16} /> {t('details')}
            </button>
            <button className={`tab-btn ${activeTab === "payments" ? "active" : ""}`} onClick={() => setActiveTab("payments")}>
              <DollarSign size={16} /> {t('payments')} ({contract.payment_records?.length || 0})
            </button>
            <button className={`tab-btn ${activeTab === "activities" ? "active" : ""}`} onClick={() => setActiveTab("activities")}>
              <Activity size={16} /> {t('activities')} ({contract.activities?.length || 0})
            </button>
            <button className={`tab-btn ${activeTab === "statistics" ? "active" : ""}`} onClick={() => setActiveTab("statistics")}>
              <BarChart3 size={16} /> {t('statistics')}
            </button>
          </div>

          <div className="modal-body">
            {activeTab === "details" && (
              <div className="contract-details">
                {/* Parties Section */}
                <div className="details-section">
                  <h3><Users size={16} /> {t('parties')}</h3>
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

                {/* Contract Details */}
                <div className="details-section">
                  <h3><Package size={16} /> {t('contract_details')}</h3>
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
                      <span className="detail-value highlight">{contract.total_amount?.toLocaleString()} RWF</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">{t('payment_option')}:</span>
                      <span className="detail-value">{contract.payment_option === "full" ? t('full_payment') : t('partial_payment')}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">{t('delivery_location')}:</span>
                      <span className="detail-value">{contract.delivery_location || t('not_specified')}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">{t('delivery_status')}:</span>
                      <span className="detail-value"><StatusBadge status={contract.delivery_status} type="delivery" /></span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">{t('payment_status')}:</span>
                      <span className="detail-value"><StatusBadge status={contract.payment_status} type="payment" /></span>
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
                    <div className="detail-item">
                      <span className="detail-label">{t('created_at')}:</span>
                      <span className="detail-value">{new Date(contract.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {contract.deliver_detail && (
                  <div className="details-section">
                    <h3><Truck size={16} /> {t('deliver_person')}</h3>
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

                {/* Admin Actions */}
                <div className="details-actions">
                  {needsAdminConfirmation && (
                    <button className="action-btn confirm" onClick={handleConfirmContract} disabled={loading}>
                      <ShieldCheck size={16} />
                      {t('confirm_contract')}
                    </button>
                  )}
                  {canBeCompleted && (
                    <button className="action-btn complete" onClick={handleCompleteContract} disabled={loading}>
                      <CheckCircle size={16} />
                      {t('mark_completed')}
                    </button>
                  )}
                  {canBeFailed && (
                    <button className="action-btn fail" onClick={handleFailContract} disabled={loading}>
                      <AlertCircle size={16} />
                      {t('mark_failed')}
                    </button>
                  )}
                  {canDelete && (
                    <button className="action-btn delete" onClick={() => setShowDeleteConfirm(true)} disabled={loading}>
                      <Trash2 size={16} />
                      {t('delete_contract')}
                    </button>
                  )}
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                  <div className="delete-confirm">
                    <p><AlertCircle size={16} /> {t('confirm_delete_contract')}</p>
                    <div className="delete-confirm-actions">
                      <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>{t('cancel')}</button>
                      <button className="btn-confirm-delete" onClick={handleDelete}>{t('delete')}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="payments-list">
                {contract.payment_records && contract.payment_records.length > 0 ? (
                  contract.payment_records.map(payment => (
                    <div key={payment.id} className={`payment-item ${payment.status === 'pending' ? 'pending-payment' : ''}`}>
                      <div className="payment-header">
                        <span className="payment-amount">{payment.amount?.toLocaleString()} RWF</span>
                        <StatusBadge status={payment.status} type="payment" />
                      </div>
                      <div className="payment-details">
                        <div className="payment-method">
                          <Smartphone size={14} />
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
                      {payment.recorded_by_detail && (
                        <div className="payment-recorded-by">
                          <User size={12} />
                          <span>{t('recorded_by')}: {payment.recorded_by_detail.full_name}</span>
                        </div>
                      )}
                      {payment.notes && <div className="payment-notes">{payment.notes}</div>}

                      {/* Payment Action Buttons for Admin */}
                      {payment.status === 'pending' && (
                        <div className="payment-actions">
                          <button
                            className="action-btn confirm-payment"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowPaymentConfirmModal(true);
                            }}
                            disabled={updatingPayment}
                          >
                            <CheckCircle size={14} />
                            {t('confirm')}
                          </button>
                          <button
                            className="action-btn reject-payment"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowPaymentConfirmModal(true);
                            }}
                            disabled={updatingPayment}
                          >
                            <XCircle size={14} />
                            {t('reject')}
                          </button>
                        </div>
                      )}

                      {payment.status === 'confirmed' && payment.confirmed_by_detail && (
                        <div className="payment-confirmation-info">
                          <ShieldCheck size={12} color="#2e7d32" />
                          <span>{t('confirmed_by')}: {payment.confirmed_by_detail.full_name}</span>
                          <span className="confirmation-date">
                            {payment.confirmed_at && new Date(payment.confirmed_at).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {payment.status === 'rejected' && (
                        <div className="payment-rejection-info">
                          <AlertCircle size={12} color="#c62828" />
                          <span>{t('payment_rejected')}</span>
                        </div>
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

            {activeTab === "activities" && (
              <div className="activities-list">
                {contract.activities && contract.activities.length > 0 ? (
                  contract.activities.map(activity => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-icon">
                        {activity.activity_type === 'created' && <FileText size={16} color="#2e7d32" />}
                        {activity.activity_type === 'accepted' && <CheckCircle size={16} color="#2e7d32" />}
                        {activity.activity_type === 'rejected' && <XCircle size={16} color="#c62828" />}
                        {activity.activity_type === 'confirmed' && <ShieldCheck size={16} color="#1565c0" />}
                        {activity.activity_type === 'payment_added' && <DollarSign size={16} color="#b76e0a" />}
                        {activity.activity_type === 'payment_confirmed' && <CheckCircle size={16} color="#2e7d32" />}
                        {activity.activity_type === 'payment_rejected' && <XCircle size={16} color="#c62828" />}
                        {activity.activity_type === 'delivery_started' && <Truck size={16} color="#1565c0" />}
                        {activity.activity_type === 'delivery_completed' && <CheckCircle size={16} color="#2e7d32" />}
                        {activity.activity_type === 'completed' && <Award size={16} color="#1565c0" />}
                        {activity.activity_type === 'failed' && <AlertCircle size={16} color="#c62828" />}
                        {(activity.activity_type === 'updated' || !activity.activity_type) && <Edit2 size={16} color="#b76e0a" />}
                      </div>
                      <div className="activity-content">
                        <div className="activity-header">
                          <span className="activity-type">{t(activity.activity_type)}</span>
                          <span className="activity-time">{new Date(activity.created_at).toLocaleString()}</span>
                        </div>
                        {activity.performed_by_detail && (
                          <div className="activity-performed-by">
                            <User size={12} />
                            <span>{activity.performed_by_detail.full_name}</span>
                            <span className="activity-role">({activity.performed_by_detail.role})</span>
                          </div>
                        )}
                        {activity.details && Object.keys(activity.details).length > 0 && (
                          <div className="activity-details">
                            <pre>{JSON.stringify(activity.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <Activity size={32} />
                    <p>{t('no_activities_recorded')}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "statistics" && (
              <div className="statistics-section">
                <div className="stats-grid-mini">
                  <div className="stat-mini-card">
                    <div className="stat-mini-icon" style={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}>
                      <Percent size={20} />
                    </div>
                    <div>
                      <div className="stat-mini-value">
                        {((contract.amount_paid / contract.total_amount) * 100).toFixed(1)}%
                      </div>
                      <div className="stat-mini-label">{t('payment_progress')}</div>
                    </div>
                  </div>
                  <div className="stat-mini-card">
                    <div className="stat-mini-icon" style={{ backgroundColor: "#e3f2fd", color: "#1565c0" }}>
                      <Wallet size={20} />
                    </div>
                    <div>
                      <div className="stat-mini-value">{contract.balance_due?.toLocaleString()} RWF</div>
                      <div className="stat-mini-label">{t('remaining_balance')}</div>
                    </div>
                  </div>
                  <div className="stat-mini-card">
                    <div className="stat-mini-icon" style={{ backgroundColor: "#fff8e1", color: "#b76e0a" }}>
                      <Activity size={20} />
                    </div>
                    <div>
                      <div className="stat-mini-value">{contract.payment_records?.length || 0}</div>
                      <div className="stat-mini-label">{t('total_payments')}</div>
                    </div>
                  </div>
                  <div className="stat-mini-card">
                    <div className="stat-mini-icon" style={{ backgroundColor: "#f3e8ff", color: "#7e22ce" }}>
                      <Clock size={20} />
                    </div>
                    <div>
                      <div className="stat-mini-value">{contract.activities?.length || 0}</div>
                      <div className="stat-mini-label">{t('total_activities')}</div>
                    </div>
                  </div>
                </div>

                <div className="progress-section">
                  <div className="progress-label">
                    <span>{t('payment_progress')}</span>
                    <span>{contract.amount_paid?.toLocaleString()} RWF / {contract.total_amount?.toLocaleString()} RWF</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${(contract.amount_paid / contract.total_amount) * 100}%` }} />
                  </div>
                </div>

                {contract.payment_due_date && (
                  <div className="due-date-info">
                    <AlertCircle size={16} />
                    <span>{t('payment_due_date')}: {new Date(contract.payment_due_date).toLocaleDateString()}</span>
                  </div>
                )}

                {contract.delivery_date && (
                  <div className="delivery-date-info">
                    <Truck size={16} />
                    <span>{t('delivery_date')}: {new Date(contract.delivery_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showPaymentConfirmModal}
        onClose={() => {
          setShowPaymentConfirmModal(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
        onConfirm={handleConfirmPayment}
        onReject={handleRejectPayment}
      />
    </>
  );
}

// Main Admin Contracts Component

// Main Admin Contracts Component
export default function ContractsManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewMode, setViewMode] = useState("table");

  // Filter state
  const [filters, setFilters] = useState({
    status: "",
    payment_status: "",
    delivery_status: "",
    admin_confirmed: "",
    search: ""
  });

  // Helper function to determine display status for admin view
  const getDisplayStatus = useCallback((contract) => {
    // If contract is fully paid AND delivery is completed, it should be completed
    if (contract.is_fully_paid && contract.delivery_status === "completed") {
      return "completed";
    }
    // If both parties accepted but admin not confirmed yet
    if (contract.both_parties_accepted && !contract.admin_confirmed) {
      return "awaiting_confirmation";
    }
    // If admin confirmed and contract is accepted
    if (contract.admin_confirmed && contract.status === "accepted") {
      return "active";
    }
    return contract.status;
  }, []);

  // Filter contracts based on selected filters
  const filterContracts = useCallback((contractsList) => {
    let filtered = [...contractsList];

    // Apply status filter using display_status
    if (filters.status) {
      filtered = filtered.filter(contract => {
        const displayStatus = getDisplayStatus(contract);
        
        // Map filter values to display_status values
        if (filters.status === "accepted") {
          return displayStatus === "active" || displayStatus === "awaiting_confirmation";
        }
        if (filters.status === "pending") {
          return displayStatus === "pending";
        }
        if (filters.status === "completed") {
          return displayStatus === "completed";
        }
        if (filters.status === "failed") {
          return displayStatus === "failed";
        }
        return displayStatus === filters.status;
      });
    }

    // Apply payment status filter
    if (filters.payment_status) {
      filtered = filtered.filter(contract => 
        contract.payment_status === filters.payment_status
      );
    }

    // Apply delivery status filter
    if (filters.delivery_status) {
      filtered = filtered.filter(contract => 
        contract.delivery_status === filters.delivery_status
      );
    }

    // Apply admin confirmation filter
    if (filters.admin_confirmed) {
      const isConfirmed = filters.admin_confirmed === "true";
      filtered = filtered.filter(contract => 
        contract.admin_confirmed === isConfirmed
      );
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(contract =>
        contract.crop_name?.toLowerCase().includes(searchLower) ||
        contract.farmer_detail?.full_name?.toLowerCase().includes(searchLower) ||
        contract.buyer_detail?.full_name?.toLowerCase().includes(searchLower) ||
        contract.id?.toString().includes(searchLower)
      );
    }

    return filtered;
  }, [filters, getDisplayStatus]);

  

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    failed: 0,
    awaiting_admin: 0
  });

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

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all contracts without status filter (handle filtering on frontend)
      const params = new URLSearchParams({
        page: currentPage,
        page_size: pageSize,
        ...(filters.search && { search: filters.search })
      });

      const response = await apiClient.get(`/contract/contracts/?${params}`);
      console.log("Contracts response:", response.data);

      const contractsData = response.data.contracts || [];

      // Add display_status to each contract
      const contractsWithDisplayStatus = contractsData.map(c => ({
        ...c,
        display_status: getDisplayStatus(c)
      }));

      setContracts(contractsWithDisplayStatus);
      
      // Apply filters
      const filtered = filterContracts(contractsWithDisplayStatus);
      setFilteredContracts(filtered);
      
      setTotalItems(response.data.total || 0);
      setTotalPages(response.data.total_pages || 1);

      // Calculate stats using display_status
      const total = contractsWithDisplayStatus.length;
      const pending = contractsWithDisplayStatus.filter(c => c.display_status === "pending").length;
      const active = contractsWithDisplayStatus.filter(c => c.display_status === "active").length;
      const completed = contractsWithDisplayStatus.filter(c => c.display_status === "completed").length;
      const failed = contractsWithDisplayStatus.filter(c => c.display_status === "failed").length;
      const awaiting_admin = contractsWithDisplayStatus.filter(c => c.display_status === "awaiting_confirmation").length;

      setStats({
        total,
        pending,
        active,
        completed,
        failed,
        awaiting_admin
      });
    } catch (error) {
      console.error("Error fetching contracts:", error);
      toast.error(t('failed_to_load_contracts'));
    } finally {
      setLoading(false);
    }
  }, [apiClient, currentPage, pageSize, filters, getDisplayStatus, filterContracts]);

  // Re-filter when filters change
  useEffect(() => {
    if (contracts.length > 0) {
      const filtered = filterContracts(contracts);
      setFilteredContracts(filtered);
    }
  }, [filters, contracts, filterContracts]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Contract actions
  const handleContractAction = async (contractId, action, reason = null) => {
    try {
      let endpoint = '';
      switch (action) {
        case 'confirm':
          endpoint = `/contract/${contractId}/confirm/`;
          break;
        case 'complete':
          endpoint = `/contract/${contractId}/complete/`;
          break;
        case 'fail':
          endpoint = `/contract/${contractId}/fail/`;
          break;
        case 'delete':
          endpoint = `/contract/${contractId}/delete/`;
          break;
        default:
          return;
      }

      const payload = reason ? { reason } : {};
      await apiClient.post(endpoint, payload);
      fetchContracts();
    } catch (error) {
      console.error(`Error ${action} contract:`, error);
      toast.error(error.response?.data?.error || t(`failed_to_${action}_contract`));
      throw error;
    }
  };

  // Filter handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      payment_status: "",
      delivery_status: "",
      admin_confirmed: "",
      search: ""
    });
    setCurrentPage(1);
  };

  // Export to CSV
  const exportToCSV = () => {
    const exportData = filters.status || filters.payment_status || filters.delivery_status || filters.admin_confirmed || filters.search
      ? filteredContracts
      : contracts;
      
    const headers = ['ID', 'Crop', 'Farmer', 'Buyer', 'Quantity', 'Total Amount', 'Status', 'Payment Status', 'Delivery Status', 'Admin Confirmed'];
    const rows = exportData.map(c => [
      c.id,
      c.crop_name,
      c.farmer_detail?.full_name,
      c.buyer_detail?.full_name,
      c.quantity_kg,
      c.total_amount,
      c.display_status,
      c.payment_status,
      c.delivery_status,
      c.admin_confirmed ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contracts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('export_successful'));
  };

  // Get display status icon
  const getAdminStatusIcon = (contract) => {
    if (contract.admin_confirmed) return <CheckCircle size={16} color="#2e7d32" />;
    if (contract.both_parties_accepted) return <AlertCircle size={16} color="#b76e0a" />;
    return <Clock size={16} color="#94a3b8" />;
  };

  // Render contract row for table view
  const renderContractRow = (contract) => {
    const displayStatus = getDisplayStatus(contract);

    return (
      <tr key={contract.id} className="contract-row">
        <td className="contract-id">#{contract.id}</td>
        <td className="contract-crop">{contract.crop_name}</td>
        <td className="contract-farmer">{contract.farmer_detail?.full_name}</td>
        <td className="contract-buyer">{contract.buyer_detail?.full_name}</td>
        <td className="contract-quantity">{contract.quantity_kg?.toLocaleString()} kg</td>
        <td className="contract-amount">{contract.total_amount?.toLocaleString()} RWF</td>
        <td className="contract-status"><StatusBadge status={displayStatus} /></td>
        <td className="contract-payment"><StatusBadge status={contract.payment_status} type="payment" /></td>
        <td className="contract-delivery"><StatusBadge status={contract.delivery_status} type="delivery" /></td>
        <td className="contract-admin">{getAdminStatusIcon(contract)}</td>
        <td className="contract-actions">
          <button
            className="action-btn view"
            onClick={() => {
              setSelectedContract(contract);
              setShowDetailsModal(true);
            }}
            title={t('view_details')}
          >
            <Eye size={14} />
          </button>
        </td>
      </tr>
    );
  };

  // Render contract card for grid view
  const renderContractCard = (contract) => {
    const displayStatus = getDisplayStatus(contract);

    return (
      <div key={contract.id} className="contract-card-grid" onClick={() => {
        setSelectedContract(contract);
        setShowDetailsModal(true);
      }}>
        <div className="card-header">
          <div className="card-title">
            <h4>{contract.crop_name}</h4>
            <span className="card-id">#{contract.id}</span>
          </div>
          <StatusBadge status={displayStatus} />
        </div>
        <div className="card-details">
          <div className="card-detail">
            <User size={12} />
            <span>{contract.farmer_detail?.full_name}</span>
          </div>
          <div className="card-detail">
            <ShoppingBag size={12} />
            <span>{contract.buyer_detail?.full_name}</span>
          </div>
          <div className="card-detail">
            <Package size={12} />
            <span>{contract.quantity_kg?.toLocaleString()} kg</span>
          </div>
          <div className="card-detail">
            <DollarSign size={12} />
            <span>{contract.total_amount?.toLocaleString()} RWF</span>
          </div>
        </div>
        <div className="card-footer">
          <div className="card-statuses">
            <StatusBadge status={contract.payment_status} type="payment" />
            <StatusBadge status={contract.delivery_status} type="delivery" />
            {getAdminStatusIcon(contract)}
          </div>
        </div>
      </div>
    );
  };

  // Determine which contracts to display
  const displayContracts = (filters.status || filters.payment_status || filters.delivery_status || filters.admin_confirmed || filters.search)
    ? filteredContracts
    : contracts;

  // Check if any filters are active
  const hasActiveFilters = filters.status || filters.payment_status || filters.delivery_status || filters.admin_confirmed || filters.search;

  return (
    <div className="admin-contracts-container">
      <ToastContainer position="top-right" autoClose={5000} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .admin-contracts-container {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #f8fafc 0%, #eef2f6 100%);
          min-height: 100vh;
          padding: 24px;
        }
        
        /* Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .header-left h1 {
          font-size: 32px;
          font-weight: 800;
          background: linear-gradient(135deg, #1e3c1e 0%, #2d5a2d 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 4px 0;
        }
        
        .header-left p {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }
        
        .header-actions {
          display: flex;
          gap: 12px;
        }
        
        .action-icon-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
          font-size: 13px;
          color: #1e293b;
        }

        /* Payment Actions */
        .payment-actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }

        .action-btn.confirm-payment {
          background: #e8f5e9;
          color: #2e7d32;
          flex: 1;
          justify-content: center;
        }

        .action-btn.confirm-payment:hover {
          background: #c8e6c9;
          transform: translateY(-1px);
        }

        .action-btn.reject-payment {
          background: #ffebee;
          color: #c62828;
          flex: 1;
          justify-content: center;
        }

        .action-btn.reject-payment:hover {
          background: #ffcdd2;
          transform: translateY(-1px);
        }

        .payment-item.pending-payment {
          border-left: 3px solid #b76e0a;
        }

        .payment-confirmation-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          padding: 8px;
          background: #e8f5e9;
          border-radius: 8px;
          font-size: 11px;
          color: #2e7d32;
        }

        .confirmation-date {
          margin-left: auto;
          font-size: 10px;
          color: #64748b;
        }

        .payment-rejection-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          padding: 8px;
          background: #ffebee;
          border-radius: 8px;
          font-size: 11px;
          color: #c62828;
        }

        /* Payment Confirmation Modal */
        .payment-confirm-modal .payment-summary {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .payment-confirm-modal .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .payment-confirm-modal .summary-item:last-child {
          border-bottom: none;
        }

        .payment-confirm-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .btn-confirm-payment {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: #2e7d32;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-confirm-payment:hover:not(:disabled) {
          background: #1b5e20;
          transform: translateY(-1px);
        }

        .btn-reject-payment {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: #c62828;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-reject-payment:hover:not(:disabled) {
          background: #b71c1c;
          transform: translateY(-1px);
        }

        .payment-already-confirmed,
        .payment-already-rejected {
          text-align: center;
          padding: 30px;
        }

        .payment-already-confirmed p,
        .payment-already-rejected p {
          margin: 12px 0;
          font-weight: 500;
        }

        .payment-already-confirmed small,
        .payment-already-rejected small {
          color: #64748b;
          font-size: 11px;
        }
        
        .action-icon-btn:hover {
          background: #f8fafc;
          border-color: #2d5a2d;
          color: #2d5a2d;
          transform: translateY(-1px);
        }
        
        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 28px;
        }
        
        .summary-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          border: 1px solid rgba(226, 232, 240, 0.6);
        }
        
        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        
        .summary-card-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .summary-card-title {
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          margin: 0 0 8px 0;
        }
        
        .summary-card-value {
          font-size: 32px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        
        .summary-card-subtitle {
          font-size: 11px;
          color: #64748b;
          margin-top: 4px;
        }
        
        .trend {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 6px;
          font-size: 11px;
        }
        
        .trend.positive { color: #2e7d32; }
        .trend.negative { color: #c62828; }
        
        .summary-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Filter Bar */
        .filter-bar {
          background: white;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 28px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        
        .filter-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
        }
        
        .filter-group {
          display: flex;
          gap: 12px;
          flex: 1;
          min-width: 200px;
        }
        
        .filter-select, .filter-input {
          flex: 1;
          padding: 10px 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        
        .filter-select:focus, .filter-input:focus {
          outline: none;
          border-color: #2d5a2d;
          box-shadow: 0 0 0 3px rgba(45,90,45,0.1);
        }
        
        .search-wrapper {
          flex: 2;
          position: relative;
        }
        
        .search-input {
          width: 100%;
          padding: 10px 16px;
          padding-right: 45px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
        }
        
        .clear-filters-btn {
          padding: 10px 20px;
          background: #fee2e2;
          color: #c62828;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        
        .clear-filters-btn:hover {
          background: #ffcdd2;
          transform: translateY(-1px);
        }
        
        /* View Toggle */
        .view-toggle {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }
        
        .view-btn {
          padding: 8px 12px;
          background: white;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }
        
        .view-btn.active {
          background: #2d5a2d;
          border-color: #2d5a2d;
          color: white;
        }
        
        /* Table View */
        .contracts-table-container {
          background: white;
          border-radius: 20px;
          overflow-x: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        
        .contracts-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1200px;
        }
        
        .contracts-table th {
          padding: 16px 16px;
          text-align: left;
          background: #f8fafc;
          font-weight: 600;
          color: #1e293b;
          border-bottom: 2px solid #e2e8f0;
          font-size: 13px;
        }
        
        .contracts-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #475569;
          font-size: 13px;
        }
        
        .contract-row:hover {
          background: #f8fafc;
          cursor: pointer;
        }
        
        .contract-id {
          font-weight: 600;
          color: #2d5a2d;
        }
        
        .contract-crop {
          font-weight: 500;
        }
        
        /* Grid View */
        .contracts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }
        
        .contract-card-grid {
          background: white;
          border-radius: 16px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
        }
        
        .contract-card-grid:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
          border-color: #2d5a2d;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .card-title h4 {
          font-size: 15px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 4px 0;
        }
        
        .card-id {
          font-size: 11px;
          color: #64748b;
        }
        
        .card-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .card-detail {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #475569;
        }
        
        .card-footer {
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }
        
        .card-statuses {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        /* Status Badge */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          width: fit-content;
        }
        
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        
        .action-btn.view {
          background: #e3f2fd;
          color: #1565c0;
        }
        
        .action-btn.view:hover {
          background: #bbdef5;
          transform: translateY(-1px);
        }
        
        .action-btn.confirm {
          background: #e8f5e9;
          color: #2e7d32;
        }
        
        .action-btn.complete {
          background: #e3f2fd;
          color: #1565c0;
        }
        
        .action-btn.fail {
          background: #ffebee;
          color: #c62828;
        }
        
        .action-btn.delete {
          background: #ffebee;
          color: #c62828;
        }
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(8px);
          padding: 16px;
        }
        
        .modal-card {
          background: white;
          border-radius: 28px;
          width: 90%;
          max-width: 900px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        
        .modal-head {
          padding: 24px 28px;
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
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        
        .modal-subtitle {
          font-size: 13px;
          color: #64748b;
          margin-top: 4px;
        }
        
        .modal-close {
          background: #f1f5f9;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 12px;
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
        
        .modal-tabs {
          display: flex;
          border-bottom: 1px solid #e2e8f0;
          padding: 0 28px;
          gap: 4px;
        }
        
        .tab-btn {
          padding: 14px 20px;
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }
        
        .tab-btn.active {
          color: #2d5a2d;
          border-bottom-color: #2d5a2d;
        }
        
        .modal-body {
          padding: 28px;
        }
        
        .details-section {
          margin-bottom: 28px;
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
          gap: 20px;
        }
        
        .party-card {
          background: #f8fafc;
          border-radius: 16px;
          padding: 18px;
        }
        
        .party-header {
          display: flex;
          gap: 14px;
          align-items: center;
          margin-bottom: 14px;
        }
        
        .party-avatar {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .party-role {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .party-name {
          font-size: 15px;
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
        
        .party-status {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #e2e8f0;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
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
        
        .detail-value.highlight {
          color: #2d5a2d;
          font-weight: 700;
        }
        
        .details-actions {
          display: flex;
          gap: 12px;
          margin-top: 28px;
          padding-top: 28px;
          border-top: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }
        
        .delete-confirm {
          margin-top: 20px;
          padding: 16px;
          background: #ffebee;
          border-radius: 12px;
        }
        
        .delete-confirm p {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #c62828;
          margin-bottom: 12px;
        }
        
        .delete-confirm-actions {
          display: flex;
          gap: 12px;
        }
        
        .btn-cancel, .btn-confirm-delete {
          padding: 8px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        
        .btn-cancel {
          background: #e2e8f0;
          border: none;
          color: #1e293b;
        }
        
        .btn-confirm-delete {
          background: #c62828;
          border: none;
          color: white;
        }
        
        /* Activities List */
        .activities-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 500px;
          overflow-y: auto;
        }
        
        .activity-item {
          display: flex;
          gap: 14px;
          padding: 14px;
          background: #f8fafc;
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        
        .activity-item:hover {
          background: #f1f5f9;
        }
        
        .activity-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .activity-content {
          flex: 1;
        }
        
        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .activity-type {
          font-weight: 600;
          color: #1e293b;
          text-transform: capitalize;
        }
        
        .activity-time {
          font-size: 11px;
          color: #94a3b8;
        }
        
        .activity-performed-by {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #64748b;
          margin-bottom: 6px;
        }
        
        .activity-role {
          color: #2d5a2d;
        }
        
        .activity-details pre {
          font-size: 11px;
          background: #e2e8f0;
          padding: 8px;
          border-radius: 8px;
          overflow-x: auto;
          margin-top: 8px;
        }
        
        /* Payments List */
        .payments-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .payment-item {
          background: #f8fafc;
          border-radius: 14px;
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
          gap: 20px;
          margin-bottom: 10px;
          font-size: 12px;
          color: #64748b;
          flex-wrap: wrap;
        }
        
        .payment-recorded-by {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #94a3b8;
          margin-top: 8px;
        }
        
        /* Statistics Mini Cards */
        .stats-grid-mini {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .stat-mini-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          background: #f8fafc;
          border-radius: 14px;
        }
        
        .stat-mini-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-mini-value {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }
        
        .stat-mini-label {
          font-size: 11px;
          color: #64748b;
        }
        
        .progress-section {
          margin-top: 16px;
        }
        
        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 13px;
        }
        
        .progress-bar-container {
          background: #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          height: 8px;
        }
        
        .progress-bar {
          background: linear-gradient(90deg, #2d5a2d, #4caf71);
          height: 100%;
          transition: width 0.3s ease;
        }
        
        .due-date-info, .delivery-date-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #fff8e1;
          border-radius: 10px;
          font-size: 13px;
          color: #b76e0a;
          margin-top: 12px;
        }
        
        .empty-state {
          text-align: center;
          padding: 60px;
          color: #94a3b8;
        }
        
        .loading-spinner {
          text-align: center;
          padding: 60px;
        }
        
        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid #e2e8f0;
          border-top-color: #2d5a2d;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        
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
          font-size: 13px;
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
        
        /* Responsive */
        @media (max-width: 768px) {
          .admin-contracts-container {
            padding: 16px;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .parties-grid, .details-grid {
            grid-template-columns: 1fr;
          }
          .filter-row {
            flex-direction: column;
          }
          .filter-group {
            width: 100%;
          }
          .view-toggle {
            margin-left: 0;
            width: 100%;
            justify-content: center;
          }
          .modal-tabs {
            overflow-x: auto;
          }
          .tab-btn {
            white-space: nowrap;
          }
        }
      `}</style>

      <div className="page-header">
        <div className="header-left">
          <h1>{t('contract_management')}</h1>
          <p>{t('manage_all_contracts_payments_deliveries')}</p>
        </div>
        <div className="header-actions">
          <button className="action-icon-btn" onClick={exportToCSV}>
            <Download size={16} />
            {t('export')}
          </button>
          <button className="action-icon-btn" onClick={fetchContracts}>
            <RefreshCw size={16} />
            {t('refresh')}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <SummaryCard title={t('total_contracts')} value={stats.total} icon={<Handshake size={24} />} color="#2e7d32" bgColor="#e8f5e9" />
        <SummaryCard title={t('pending_contracts')} value={stats.pending} icon={<Clock size={24} />} color="#b76e0a" bgColor="#fff8e1" />
        <SummaryCard title={t('active_contracts')} value={stats.active} icon={<TrendingUp size={24} />} color="#1565c0" bgColor="#e3f2fd" />
        <SummaryCard title={t('completed_contracts')} value={stats.completed} icon={<Award size={24} />} color="#2e7d32" bgColor="#e8f5e9" />
        <SummaryCard title={t('awaiting_admin')} value={stats.awaiting_admin} icon={<ShieldCheck size={24} />} color="#b76e0a" bgColor="#fff8e1" />
      </div>

      <div className="filter-bar">
        <div className="filter-row">
          <div className="filter-group">
            <select className="filter-select" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
              <option value="">{t('all_statuses')}</option>
              <option value="pending">{t('pending')}</option>
              <option value="accepted">{t('active')}</option>
              <option value="completed">{t('completed')}</option>
              <option value="failed">{t('failed')}</option>
            </select>
            <select className="filter-select" value={filters.payment_status} onChange={(e) => handleFilterChange('payment_status', e.target.value)}>
              <option value="">{t('all_payment_statuses')}</option>
              <option value="pending">{t('pending')}</option>
              <option value="started">{t('started')}</option>
              <option value="completed">{t('completed')}</option>
              <option value="failed">{t('failed')}</option>
            </select>
            <select className="filter-select" value={filters.delivery_status} onChange={(e) => handleFilterChange('delivery_status', e.target.value)}>
              <option value="">{t('all_delivery_statuses')}</option>
              <option value="pending">{t('pending')}</option>
              <option value="in_progress">{t('in_progress')}</option>
              <option value="completed">{t('completed')}</option>
              <option value="failed">{t('failed')}</option>
            </select>
          </div>
          <div className="filter-group">
            <select className="filter-select" value={filters.admin_confirmed} onChange={(e) => handleFilterChange('admin_confirmed', e.target.value)}>
              <option value="">{t('all_admin_statuses')}</option>
              <option value="true">{t('confirmed_by_admin')}</option>
              <option value="false">{t('pending_admin_confirmation')}</option>
            </select>
            <button className="clear-filters-btn" onClick={clearFilters}>
              <X size={14} />
              {t('clear_filters')}
            </button>
          </div>
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
              <List size={14} /> {t('table')}
            </button>
            <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
              <Grid3x3 size={14} /> {t('grid')}
            </button>
          </div>
        </div>
        <div className="filter-row" style={{ marginTop: '14px' }}>
          <div className="search-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder={t('search_by_crop_farmer_buyer')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Filter info display */}
      {hasActiveFilters && (
        <div className="filter-info">
          <span className="filter-badge">
            {t('showing')}: {displayContracts.length} {t('contracts')}
            {filters.status && ` · ${t('status')}: ${filters.status === 'accepted' ? t('active') : t(filters.status)}`}
            {filters.payment_status && ` · ${t('payment')}: ${t(filters.payment_status)}`}
            {filters.delivery_status && ` · ${t('delivery')}: ${t(filters.delivery_status)}`}
            {filters.admin_confirmed && ` · ${t('admin')}: ${filters.admin_confirmed === 'true' ? t('confirmed') : t('pending')}`}
            {filters.search && ` · ${t('search')}: "${filters.search}"`}
            <button className="clear-filter" onClick={clearFilters}>
              <X size={12} /> {t('clear_all')}
            </button>
          </span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : displayContracts.length === 0 ? (
        <div className="empty-state">
          <Filter size={48} />
          <p>{hasActiveFilters ? t('no_contracts_match_filters') : t('no_contracts_found')}</p>
          {hasActiveFilters && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              <X size={14} />
              {t('clear_all_filters')}
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <>
          <div className="contracts-table-container">
            <table className="contracts-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('crop')}</th>
                  <th>{t('farmer')}</th>
                  <th>{t('buyer')}</th>
                  <th>{t('quantity')}</th>
                  <th>{t('total_amount')}</th>
                  <th>{t('status')}</th>
                  <th>{t('payment')}</th>
                  <th>{t('delivery')}</th>
                  <th>{t('admin')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {displayContracts.map(renderContractRow)}
              </tbody>
            </table>
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
            totalItems={displayContracts.length}
          />
        </>
      ) : (
        <>
          <div className="contracts-grid">
            {displayContracts.map(renderContractCard)}
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
            totalItems={displayContracts.length}
          />
        </>
      )}

      <ContractDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        onUpdate={handleContractAction}
        onDelete={handleContractAction}
        onRefresh={fetchContracts}
        apiClient={apiClient}
      />
    </div>
  );
}



