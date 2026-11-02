import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import { apiFetch } from '../../lib/api';
import { useToast } from '../ui/ToastProvider';
import {
  FileClock,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  ArrowRightLeft,
  Award,
  LogOut,
  User,
  Calendar,
  Building2,
  FileText,
  Search,
  Trash2
} from 'lucide-react';

export default function OfficerLifecycleRequestsModal({ open, onClose, onActionCompleted }) {
  const { showSuccess, showError } = useToast();
  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [actionInProgress, setActionInProgress] = useState(null); // requestId currently approving/rejecting

  // Reject confirmation prompt modal
  const [rejectModalData, setRejectModalData] = useState(null); // request object
  const [rejectRemarks, setRejectRemarks] = useState('');

  const fetchRequests = useCallback(() => {
    setLoading(true);
    const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
    apiFetch(`/officers/lifecycle/requests${query}`)
      .then(res => res.json())
      .then(data => setRequests(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Failed to load lifecycle requests', err);
        showError('Failed to load requests.');
      })
      .finally(() => setLoading(false));
  }, [statusFilter, showError]);

  useEffect(() => {
    if (open) {
      fetchRequests();
    }
  }, [open, fetchRequests]);

  const handleApprove = async (reqItem) => {
    if (!window.confirm(`Are you sure you want to approve this ${reqItem.details?.lifecycleType || reqItem.type} request? This will execute the changes in the database immediately.`)) {
      return;
    }

    setActionInProgress(reqItem.id);
    try {
      const res = await apiFetch(`/officers/lifecycle/requests/${reqItem.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ adminRemarks: 'Approved' })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showSuccess(data.message || 'Request approved and executed successfully.');
        fetchRequests();
        onActionCompleted?.();
      } else {
        showError(data.error || 'Failed to approve request.');
      }
    } catch (err) {
      console.error('Approve error:', err);
      showError('Error approving request.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalData) return;
    setActionInProgress(rejectModalData.id);
    try {
      const res = await apiFetch(`/officers/lifecycle/requests/${rejectModalData.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ adminRemarks: rejectRemarks.trim() || 'Rejected by Administrator' })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showSuccess('Request rejected successfully.');
        setRejectModalData(null);
        setRejectRemarks('');
        fetchRequests();
        onActionCompleted?.();
      } else {
        showError(data.error || 'Failed to reject request.');
      }
    } catch (err) {
      console.error('Reject error:', err);
      showError('Error rejecting request.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancelRequest = async (reqItem) => {
    if (!window.confirm('Are you sure you want to cancel this pending request?')) return;

    setActionInProgress(reqItem.id);
    try {
      const res = await apiFetch(`/officers/lifecycle/requests/${reqItem.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showSuccess('Request cancelled.');
        fetchRequests();
        onActionCompleted?.();
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.error || 'Failed to cancel request.');
      }
    } catch (err) {
      showError('Error cancelling request.');
    } finally {
      setActionInProgress(null);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  const formatDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

  if (!open) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} overlayClassName="bg-black/60 backdrop-blur-[6px]">
        <div className="relative w-full max-w-[960px] overflow-hidden rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.55)] border border-rule/80 bg-[#FFFDF7] text-ink-text my-8">
          {/* Header */}
          <div className="bg-[#12192B] text-white px-6 py-4 flex items-center justify-between border-b border-rule/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brass/20 text-brass flex items-center justify-center border border-brass/30">
                <FileClock className="w-5 h-5 text-brass" />
              </div>
              <div>
                <h3 className="text-[17px] font-serif font-bold text-[#F5EFE1]">
                  Officer Lifecycle Approval Requests
                </h3>
                <p className="text-[12px] text-ink-text-soft/80">
                  Transfers, Retirements, and Deputation Relieving records
                </p>
              </div>
            </div>
            <button
              type="button"
              className="w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="bg-[#F6F3EA] border-b border-rule px-6 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1.5 bg-[#FAF6ED] border border-rule/60 p-1 rounded-lg">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(st => (
                <button
                  key={st}
                  type="button"
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    statusFilter === st
                      ? 'bg-[#000E89] text-white shadow-xs'
                      : 'text-ink-text-soft hover:text-ink-text hover:bg-parchment'
                  }`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === 'ALL' ? 'All Requests' : st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchRequests}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Table Content */}
          <div className="p-6 max-h-[65vh] overflow-y-auto">
            {loading ? (
              <div className="py-16 text-center text-ink-text-soft">Loading lifecycle requests…</div>
            ) : requests.length === 0 ? (
              <div className="py-16 text-center text-ink-text-faint italic bg-parchment/30 rounded-xl border border-dashed border-rule">
                No lifecycle requests found for this filter.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {requests.map(item => {
                  const details = item.details || {};
                  const isTransfer = details.lifecycleType === 'TRANSFER' || item.type === 'OFFICER_TRANSFER';
                  const isRetirement = details.lifecycleType === 'RETIREMENT' || item.type === 'OFFICER_RETIREMENT';
                  const isOut = details.lifecycleType === 'OUT_FROM_LOKAYUKTA' || item.type === 'OFFICER_OUT';

                  return (
                    <div
                      key={item.id}
                      className="border border-rule/80 rounded-xl bg-white p-4.5 shadow-2xs hover:shadow-soft transition-shadow flex flex-col gap-3"
                    >
                      {/* Top Row: Type Badge, Status, Date */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${
                              isTransfer
                                ? details.isSwap
                                  ? 'bg-[#FEF6E7] text-[#9A6700] border-[#F2C94C]'
                                  : 'bg-[#EBF1FA] text-[#000E89] border-[#CBD8EF]'
                                : isRetirement
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            {isTransfer ? (
                              details.isSwap ? (
                                <>
                                  <RefreshCw className="w-3 h-3 text-[#9A6700]" />
                                  Mutual Transfer (Swap)
                                </>
                              ) : (
                                <>
                                  <ArrowRightLeft className="w-3 h-3 text-[#000E89]" />
                                  Transfer (Vacant Post)
                                </>
                              )
                            ) : isRetirement ? (
                              <>
                                <Award className="w-3 h-3 text-amber-700" />
                                Retirement
                              </>
                            ) : (
                              <>
                                <LogOut className="w-3 h-3 text-rose-700" />
                                Relieved from Lokayukta
                              </>
                            )}
                          </span>

                          <span className="text-[11.5px] text-ink-text-faint font-mono">
                            Order: <strong className="text-ink-text">{details.orderNumber || '—'}</strong>
                            {details.orderDate && ` (${formatDate(details.orderDate)})`}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold border ${
                              item.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : item.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="text-[11.5px] text-ink-text-soft">
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Main Details Grid */}
                      <div className="bg-[#FAF7EE] border border-rule/60 rounded-lg p-3 text-[12.5px] grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Source Officer */}
                        <div>
                          <div className="text-[10.5px] font-bold text-ink-text-soft uppercase tracking-wider">
                            Source Officer & Post
                          </div>
                          <div className="font-semibold text-maroon text-[13.5px] mt-0.5">
                            {details.sourceOfficerName || item.recordTitle || '—'}
                          </div>
                          <div className="text-ink-text-soft mt-0.5">
                            {details.sourceDesignation} &middot; <span className="font-medium text-ink-text">{details.sourceDistrictName}</span>
                          </div>
                        </div>

                        {/* Destination or Separation info */}
                        <div>
                          {isTransfer ? (
                            <>
                              <div className="text-[10.5px] font-bold text-ink-text-soft uppercase tracking-wider">
                                Target Post & District {details.isSwap && '(Mutual Swap with)'}
                              </div>
                              <div className="font-semibold text-[#000E89] text-[13.5px] mt-0.5">
                                {details.targetDesignation || '—'}
                              </div>
                              <div className="text-ink-text-soft mt-0.5">
                                District: <strong className="text-ink-text">{details.targetDistrictName || '—'}</strong>
                                {details.isSwap && details.targetOfficerName && (
                                  <span className="block text-amber-800 font-medium">
                                    Current Occupant: {details.targetOfficerName}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : isRetirement ? (
                            <>
                              <div className="text-[10.5px] font-bold text-ink-text-soft uppercase tracking-wider">
                                Retirement Details
                              </div>
                              <div className="font-medium text-amber-900 mt-0.5">
                                {details.retirementType || 'Superannuation'}
                              </div>
                              <div className="text-ink-text-soft mt-0.5">
                                Effective Date: <strong className="text-ink-text">{formatDate(details.effectiveDate)}</strong>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-[10.5px] font-bold text-ink-text-soft uppercase tracking-wider">
                                Relieved to Department
                              </div>
                              <div className="font-medium text-rose-900 mt-0.5">
                                {details.transferredToDepartment || 'Parent Department'}
                              </div>
                              <div className="text-ink-text-soft mt-0.5">
                                Effective Date: <strong className="text-ink-text">{formatDate(details.effectiveDate)}</strong>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Footer Row: Initiated By, Remarks, Actions */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[12px] text-ink-text-soft">
                        <div>
                          Requested by: <strong className="text-ink-text">{item.requestedByName || 'User'}</strong>
                          {details.remarks && (
                            <span className="italic ml-2">"{details.remarks}"</span>
                          )}
                          {item.adminRemarks && (
                            <span className="block text-[11.5px] text-emerald-800 font-medium mt-0.5">
                              Admin Note: {item.adminRemarks}
                            </span>
                          )}
                        </div>

                        {/* Admin Action Buttons (for PENDING requests) */}
                        {item.status === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm !text-rose-700 hover:!bg-rose-50"
                                  disabled={actionInProgress === item.id}
                                  onClick={() => {
                                    setRejectModalData(item);
                                    setRejectRemarks('');
                                  }}
                                >
                                  <X className="w-3.5 h-3.5 text-rose-600" />
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm !bg-emerald-700 hover:!bg-emerald-800"
                                  disabled={actionInProgress === item.id}
                                  onClick={() => handleApprove(item)}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  {actionInProgress === item.id ? 'Approving…' : 'Approve & Execute'}
                                </button>
                              </>
                            )}

                            {/* Owner Cancel option */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm text-ink-text-faint hover:text-brick"
                              title="Cancel Request"
                              onClick={() => handleCancelRequest(item)}
                              disabled={actionInProgress === item.id}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Reject Remarks Dialog */}
      {rejectModalData && (
        <Modal open={!!rejectModalData} onClose={() => setRejectModalData(null)}>
          <div className="relative w-full max-w-[440px] overflow-hidden rounded-2xl shadow-2xl border border-rule bg-[#FFFDF7] p-6">
            <h4 className="text-[17px] font-serif font-bold text-ink-text mb-2">
              Reject Lifecycle Request
            </h4>
            <p className="text-[12.5px] text-ink-text-soft mb-4">
              Please enter the reason for rejecting this request for <strong>{rejectModalData.recordTitle}</strong>:
            </p>
            <textarea
              rows={3}
              className="app-input w-full mb-4"
              placeholder="e.g. Incomplete documentation / Invalid order number / Post mismatch"
              value={rejectRemarks}
              onChange={e => setRejectRemarks(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRejectModalData(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary !bg-rose-700 hover:!bg-rose-800"
                onClick={handleConfirmReject}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

