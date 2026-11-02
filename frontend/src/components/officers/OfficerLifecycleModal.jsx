import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { apiFetch } from '../../lib/api';
import { useToast } from '../ui/ToastProvider';
import SearchableSelect from '../ui/SearchableSelect';
import {
  ArrowRightLeft,
  Calendar,
  FileText,
  Building2,
  RefreshCw,
  LogOut,
  Award,
  X,
  CheckCircle2,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function OfficerLifecycleModal({
  open,
  onClose,
  officer,
  districts = [],
  onSuccess
}) {
  const { showSuccess, showError } = useToast();
  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  // Step 1: null (show 3-choice screen) | Step 2: 'TRANSFER' | 'RETIREMENT' | 'OUT_FROM_LOKAYUKTA'
  const [actionType, setActionType] = useState(null);

  // Form Fields (all date fields start empty so user selects manually)
  const [targetDistrictId, setTargetDistrictId] = useState('');
  const [targetOfficerId, setTargetOfficerId] = useState('');
  const [isSwap, setIsSwap] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(''); // Relieving Date / Retirement Date
  const [reportingDate, setReportingDate] = useState(''); // User selected Reporting Date at target post
  const [retirementType, setRetirementType] = useState('Superannuation (ವಯೋನಿವೃತ್ತಿ)');
  const [transferredToDepartment, setTransferredToDepartment] = useState('Karnataka State Police (Parent Dept)');
  const [remarks, setRemarks] = useState('');
  const [directExecute, setDirectExecute] = useState(isAdmin);

  // Target Posts State
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [targetPostsData, setTargetPostsData] = useState({ all: [], vacantPosts: [], occupiedPosts: [] });
  const [submitting, setSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open && officer) {
      setActionType(null); // Always start with asking Transfer, Retire, or Out!
      setTargetDistrictId('');
      setTargetOfficerId('');
      setIsSwap(false);
      setOrderNumber('');
      setOrderDate('');
      setEffectiveDate('');
      setReportingDate('');
      setRetirementType('Superannuation (ವಯೋನಿವೃತ್ತಿ)');
      setTransferredToDepartment('Karnataka State Police (Parent Dept)');
      setRemarks('');
      setDirectExecute(isAdmin);
      setTargetPostsData({ all: [], vacantPosts: [], occupiedPosts: [] });
    }
  }, [open, officer, isAdmin]);

  // Fetch target posts when targetDistrictId changes
  useEffect(() => {
    if (!targetDistrictId || !officer || actionType !== 'TRANSFER') {
      setTargetPostsData({ all: [], vacantPosts: [], occupiedPosts: [] });
      setTargetOfficerId('');
      setIsSwap(false);
      return;
    }

    setLoadingPosts(true);
    apiFetch(`/officers/lifecycle/target-posts?districtId=${targetDistrictId}&excludeOfficerId=${officer.id}`)
      .then(res => res.json())
      .then(data => {
        setTargetPostsData(data);
        setTargetOfficerId('');
        setIsSwap(false);
      })
      .catch(err => {
        console.error('Failed to load target posts', err);
        showError('Failed to load posts for the selected district.');
      })
      .finally(() => setLoadingPosts(false));
  }, [targetDistrictId, officer, actionType, showError]);

  // When a target post is chosen, determine if it's vacant or swap
  const handleSelectTargetPost = (postId) => {
    setTargetOfficerId(postId);
    const post = targetPostsData.all.find(p => p.id === postId);
    if (post) {
      setIsSwap(!post.isVacant);
    }
  };

  const selectedTargetPost = useMemo(() => {
    return targetPostsData.all.find(p => p.id === targetOfficerId) || null;
  }, [targetPostsData, targetOfficerId]);

  // Target post options for dropdown with visual distinction
  const postOptions = useMemo(() => {
    const opts = [];
    if (targetPostsData.vacantPosts.length > 0) {
      opts.push({
        value: '__header_vacant__',
        label: `── Vacant Posts (${targetPostsData.vacantPosts.length}) ──`,
        disabled: true
      });
      targetPostsData.vacantPosts.forEach(p => {
        opts.push({
          value: p.id,
          label: `🟢 ${p.designation} (Vacant Post)`
        });
      });
    }

    if (targetPostsData.occupiedPosts.length > 0) {
      opts.push({
        value: '__header_occupied__',
        label: `── Occupied Posts (Mutual Swap: ${targetPostsData.occupiedPosts.length}) ──`,
        disabled: true
      });
      targetPostsData.occupiedPosts.forEach(p => {
        opts.push({
          value: p.id,
          label: `🔄 ${p.designation} (Occupied: ${p.officerName})`
        });
      });
    }

    return opts;
  }, [targetPostsData]);

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!orderNumber.trim()) {
      showError('Please enter the Official Order Number (ಆದೇಶ ಸಂಖ್ಯೆ).');
      return;
    }
    if (!effectiveDate) {
      showError('Please select the Date (ದಿನಾಂಕ).');
      return;
    }

    if (actionType === 'TRANSFER') {
      if (!targetDistrictId) {
        showError('Please select a Target District.');
        return;
      }
      if (!targetOfficerId) {
        showError('Please select a Target Post.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        type: actionType,
        targetDistrictId: actionType === 'TRANSFER' ? targetDistrictId : undefined,
        targetOfficerId: actionType === 'TRANSFER' ? targetOfficerId : undefined,
        isSwap: actionType === 'TRANSFER' ? isSwap : undefined,
        orderNumber: orderNumber.trim(),
        orderDate: orderDate || undefined,
        effectiveDate,
        reportingDate: actionType === 'TRANSFER' ? (reportingDate || undefined) : undefined,
        transferredToDepartment: actionType === 'OUT_FROM_LOKAYUKTA' ? transferredToDepartment.trim() : undefined,
        retirementType: actionType === 'RETIREMENT' ? retirementType.trim() : undefined,
        remarks: remarks.trim() || undefined,
        directExecute: isAdmin && directExecute
      };

      const res = await apiFetch(`/officers/${officer.id}/lifecycle-request`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showSuccess(data.message || 'Action processed successfully.');
        onSuccess?.();
        onClose();
      } else {
        showError(data.error || 'Failed to process lifecycle action.');
      }
    } catch (err) {
      console.error('Lifecycle submission error:', err);
      showError('Error submitting lifecycle action.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!officer || !open) return null;

  return (
    <Modal open={open} onClose={submitting ? undefined : onClose} overlayClassName="bg-black/60 backdrop-blur-[6px]">
      <div className="relative w-full max-w-[640px] overflow-hidden rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.55)] border border-rule/80 bg-[#FFFDF7] text-ink-text my-8">
        {/* Top Header Bar */}
        <div className="bg-[#12192B] text-white px-6 py-4 flex items-center justify-between border-b border-rule/40">
          <div className="flex items-center gap-3">
            {actionType ? (
              <button
                type="button"
                className="w-8 h-8 rounded-lg text-brass hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors mr-1"
                onClick={() => setActionType(null)}
                title="Change Action"
                disabled={submitting}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-brass/20 text-brass flex items-center justify-center border border-brass/30">
                <ArrowRightLeft className="w-5 h-5 text-brass" />
              </div>
            )}
            <div>
              <h3 className="text-[17px] font-serif font-bold text-[#F5EFE1]">
                {!actionType
                  ? "Select Officer Action"
                  : actionType === 'TRANSFER'
                  ? "Officer Transfer (ವರ್ಗಾವಣೆ)"
                  : actionType === 'RETIREMENT'
                  ? "Officer Retirement (ನಿವೃತ್ತಿ)"
                  : "Out of Lokayukta (ಲೋಕಾಯುಕ್ತದಿಂದ ನಿರ್ಗಮನ)"}
              </h3>
              <p className="text-[12px] text-ink-text-soft/80">
                {officer.name} &middot; <span className="text-brass/90">{officer.designation}</span> ({officer.district?.name})
              </p>
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
            onClick={onClose}
            disabled={submitting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: ASK USER "TRANSFER, RETIRE OR OUT" */}
        {!actionType && (
          <div className="p-6 flex flex-col gap-5">
            <div className="text-center">
              <h4 className="text-[17px] font-serif font-bold text-ink-text mb-1">
                ಅಧಿಕಾರಿಯ ಕ್ರಮವನ್ನು ಆಯ್ಕೆಮಾಡಿ
              </h4>
              <p className="text-[13px] text-ink-text-soft">
                ಈ ಅಧಿಕಾರಿಗೆ ನೀವು ಯಾವ ಕ್ರಮವನ್ನು ಜರುಗಿಸಲು ಬಯಸುತ್ತೀರಿ? (Select what you want to do):
              </p>
            </div>

            <div className="flex flex-col gap-3.5 max-w-[500px] mx-auto w-full my-2">
              {/* Option 1: Transfer */}
              <button
                type="button"
                onClick={() => setActionType('TRANSFER')}
                className="p-4 rounded-xl border border-rule/80 bg-white hover:border-[#000E89] hover:bg-[#F2F6FC] transition-all flex items-center gap-4 text-left group shadow-2xs hover:shadow-soft cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-[#EBF1FA] text-[#000E89] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <ArrowRightLeft className="w-6 h-6 text-[#000E89]" />
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-bold text-ink-text group-hover:text-[#000E89] flex items-center justify-between">
                    <span>1. Transfer (ವರ್ಗಾವಣೆ)</span>
                    <ChevronRight className="w-4 h-4 text-ink-text-faint group-hover:text-[#000E89] transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="text-[12px] text-ink-text-soft mt-0.5">
                    ಲೋಕಾಯುಕ್ತದೊಳಗೆ ಬೇರೆ ಜಿಲ್ಲೆಯ ಹುದ್ದೆಗೆ ವರ್ಗಾವಣೆ (ಖಾಲಿ ಹುದ್ದೆಗೆ ನೇರ ವರ್ಗಾವಣೆ ಅಥವಾ Mutual Swap)
                  </div>
                </div>
              </button>

              {/* Option 2: Retire */}
              <button
                type="button"
                onClick={() => setActionType('RETIREMENT')}
                className="p-4 rounded-xl border border-rule/80 bg-white hover:border-amber-600 hover:bg-[#FEF9EE] transition-all flex items-center gap-4 text-left group shadow-2xs hover:shadow-soft cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-bold text-ink-text group-hover:text-amber-800 flex items-center justify-between">
                    <span>2. Retire (ನಿವೃತ್ತಿ)</span>
                    <ChevronRight className="w-4 h-4 text-ink-text-faint group-hover:text-amber-700 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="text-[12px] text-ink-text-soft mt-0.5">
                    ಸೇವಾ ನಿವೃತ್ತಿ (Superannuation / VRS) — ಅಧಿಕಾರಿಯ ಹುದ್ದೆ Vacant ಆಗುತ್ತದೆ
                  </div>
                </div>
              </button>

              {/* Option 3: Out from Lokayukta */}
              <button
                type="button"
                onClick={() => setActionType('OUT_FROM_LOKAYUKTA')}
                className="p-4 rounded-xl border border-rule/80 bg-white hover:border-brick hover:bg-[#FDF3F1] transition-all flex items-center gap-4 text-left group shadow-2xs hover:shadow-soft cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-brick flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  <LogOut className="w-6 h-6 text-brick" />
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-bold text-ink-text group-hover:text-brick flex items-center justify-between">
                    <span>3. Out from Lokayukta (ಲೋಕಾಯುಕ್ತದಿಂದ ನಿರ್ಗಮನ)</span>
                    <ChevronRight className="w-4 h-4 text-ink-text-faint group-hover:text-brick transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="text-[12px] text-ink-text-soft mt-0.5">
                    ಡೆಪ್ಯುಟೇಶನ್ ಮುಕ್ತಾಯ — ಮಾತೃ ಇಲಾಖೆಗೆ ಹಿಂತಿರುಗುವಿಕೆ (Relieve to Parent Dept)
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-3 border-t border-rule/60">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DEDICATED ACTION FORM */}
        {actionType && (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 max-h-[72vh] overflow-y-auto">
            {/* ACTION 1: TRANSFER FORM */}
            {actionType === 'TRANSFER' && (
              <div className="flex flex-col gap-4">
                <div className="bg-[#EBF1FA] border border-[#CBD8EF] rounded-lg p-3 text-[12.5px] text-[#000E89] flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#000E89] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Transfer within Lokayukta:</strong> Moves this officer to a post in another district. If the target post is <strong>Vacant</strong>, it performs a normal transfer. If the target post is <strong>Occupied</strong>, it automatically enables <strong>Mutual Swap</strong> (both officers exchange places).
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-semibold text-ink-text-soft">
                      Target District (ವರ್ಗಾವಣೆ ಜಿಲ್ಲೆ) <span className="text-brick">*</span>
                    </label>
                    <SearchableSelect
                      value={targetDistrictId}
                      onChange={setTargetDistrictId}
                      options={districts.map(d => ({ value: d.id, label: d.name }))}
                      label="Select Target District"
                      placeholder="Choose district to transfer to"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-semibold text-ink-text-soft flex items-center justify-between">
                      <span>Target Post (ಹುದ್ದೆ) <span className="text-brick">*</span></span>
                      {loadingPosts && <span className="text-[11px] text-ink-text-faint">Loading posts…</span>}
                    </label>
                    <select
                      className="app-input font-medium text-[12.5px]"
                      value={targetOfficerId}
                      onChange={e => handleSelectTargetPost(e.target.value)}
                      disabled={!targetDistrictId || loadingPosts}
                      required
                    >
                      <option value="">
                        {!targetDistrictId ? "Select district first" : (targetPostsData.all.length === 0 ? "No posts found in district" : "Choose target post")}
                      </option>
                      {postOptions.map((opt, i) => (
                        <option key={i} value={opt.value} disabled={opt.disabled} className={opt.disabled ? "font-bold text-gray-500 bg-gray-100" : ""}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Vacant vs Mutual Swap Indicator */}
                {selectedTargetPost && (
                  <div className={`rounded-lg p-3 border text-[12.5px] flex items-start gap-2.5 ${
                    selectedTargetPost.isVacant
                      ? 'bg-[#EBF7EE] border-[#BBE5C6] text-[#1E6935]'
                      : 'bg-[#FEF6E7] border-[#F2C94C] text-[#9A6700]'
                  }`}>
                    {selectedTargetPost.isVacant ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#1E6935] flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Normal Transfer (ಖಾಲಿ ಹುದ್ದೆ):</strong> Target post <span className="underline font-semibold">{selectedTargetPost.designation}</span> is currently <strong>Vacant</strong>. <strong>{officer.name}</strong> will take this post, and their current post in <strong>{officer.district?.name}</strong> will become Vacant.
                        </div>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 text-[#9A6700] flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Mutual Swap Mode (ಅದಲು-ಬದಲು):</strong> Target post is currently occupied by <strong>"{selectedTargetPost.officerName}"</strong>. Both officers will <strong>swap their posts</strong>. Both postings remain filled, and past service logs will be safely transferred!
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ACTION 2: RETIREMENT FORM */}
            {actionType === 'RETIREMENT' && (
              <div className="flex flex-col gap-4">
                <div className="bg-[#FEF6E7] border border-[#F2C94C] rounded-lg p-3 text-[12.5px] text-[#9A6700] flex items-start gap-2.5">
                  <Award className="w-4 h-4 text-[#9A6700] flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Officer Retirement:</strong> Records the officer's retirement. Their current post in <strong>{officer.district?.name}</strong> will become <strong>Vacant</strong>, and their complete career service history is archived.
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">
                    Retirement Type (ನಿವೃತ್ತಿ ಪ್ರಕಾರ) <span className="text-brick">*</span>
                  </label>
                  <select
                    className="app-input font-medium"
                    value={retirementType}
                    onChange={e => setRetirementType(e.target.value)}
                  >
                    <option value="Superannuation (ವಯೋನಿವೃತ್ತಿ)">Superannuation (ವಯೋನಿವೃತ್ತಿ - 60 Years)</option>
                    <option value="Voluntary Retirement Scheme (ಸ್ವಯಂ ನಿವೃತ್ತಿ - VRS)">Voluntary Retirement Scheme (ಸ್ವಯಂ ನಿವೃತ್ತಿ - VRS)</option>
                    <option value="Medical Invalidation (ವೈದ್ಯಕೀಯ ಆಧಾರದ ಮೇಲೆ)">Medical Invalidation (ವೈದ್ಯಕೀಯ ಆಧಾರದ ಮೇಲೆ)</option>
                    <option value="Compulsory Retirement (ಕಡ್ಡಾಯ ನಿವೃತ್ತಿ)">Compulsory Retirement (ಕಡ್ಡಾಯ ನಿವೃತ್ತಿ)</option>
                  </select>
                </div>
              </div>
            )}

            {/* ACTION 3: OUT FROM LOKAYUKTA FORM */}
            {actionType === 'OUT_FROM_LOKAYUKTA' && (
              <div className="flex flex-col gap-4">
                <div className="bg-[#FAF3F0] border border-[#F0D5C9] rounded-lg p-3 text-[12.5px] text-brick flex items-start gap-2.5">
                  <LogOut className="w-4 h-4 text-brick flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Relieve from Lokayukta (Deputation End):</strong> Officer is relieved back to their parent department (e.g., KSP, CID, Home Dept). The current post in <strong>{officer.district?.name}</strong> will become <strong>Vacant</strong>.
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">
                    Relieved / Transferred to Department (ಯಾವ ಇಲಾಖೆಗೆ ವರ್ಗಾವಣೆ) <span className="text-brick">*</span>
                  </label>
                  <input
                    type="text"
                    className="app-input"
                    placeholder="e.g. Karnataka State Police / CID / Home Dept / Bengaluru City Police"
                    value={transferredToDepartment}
                    onChange={e => setTransferredToDepartment(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Common Fields: Order No, Dates (User Selects, No Auto-Default), Remarks */}
            <div className="border-t border-rule/70 pt-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">
                    Official Order No. (ಆದೇಶ ಸಂಖ್ಯೆ) <span className="text-brick">*</span>
                  </label>
                  <input
                    type="text"
                    className="app-input"
                    placeholder="e.g. LOK/EST/2026/894"
                    value={orderNumber}
                    onChange={e => setOrderNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">
                    Order Date (ಆದೇಶ ದಿನಾಂಕ)
                  </label>
                  <input
                    type="date"
                    className="app-input"
                    value={orderDate}
                    onChange={e => setOrderDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Date Fields: User Selects (Empty by default) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-ink-text-soft">
                    {actionType === 'RETIREMENT'
                      ? 'Retirement Date (ನಿವೃತ್ತಿ ದಿನಾಂಕ)'
                      : 'Relieving Date from current post (ಬಿಡುಗಡೆ ದಿನಾಂಕ)'} <span className="text-brick">*</span>
                  </label>
                  <input
                    type="date"
                    className="app-input"
                    value={effectiveDate}
                    onChange={e => setEffectiveDate(e.target.value)}
                    required
                  />
                </div>

                {/* Reporting Date is selectable for Transfer */}
                {actionType === 'TRANSFER' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-semibold text-ink-text-soft">
                      Reporting Date at Target Post (ಹೊಸ ಹುದ್ದೆಯಲ್ಲಿ ಹಾಜರಾದ ದಿನಾಂಕ)
                    </label>
                    <input
                      type="date"
                      className="app-input"
                      value={reportingDate}
                      onChange={e => setReportingDate(e.target.value)}
                      placeholder="Select date (if reported)"
                    />
                    <span className="text-[11px] text-ink-text-faint italic">
                      User should select when officer reported (leave blank if not reported yet).
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-ink-text-soft">
                  Remarks / Additional Notes (ಟಿಪ್ಪಣಿ)
                </label>
                <textarea
                  rows={2}
                  className="app-input"
                  placeholder="Optional notes regarding this action…"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>

              {/* Admin Direct Execution Toggle */}
              {isAdmin && (
                <div className="bg-[#FAF7EE] border border-rule/80 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-semibold text-ink-text flex items-center gap-1.5">
                      <span className="text-brass">⚡</span> Direct Execution (Admin Only)
                    </div>
                    <div className="text-[11.5px] text-ink-text-soft">
                      {directExecute
                        ? "Will execute action immediately in database without waiting for approval queue."
                        : "Will submit as a request to the Approval Queue for review."}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={directExecute}
                      onChange={e => setDirectExecute(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#000E89]"></div>
                  </label>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-rule">
              <button
                type="button"
                className="btn btn-secondary text-xs flex items-center gap-1"
                onClick={() => setActionType(null)}
                disabled={submitting}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Change Action
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    'Processing…'
                  ) : isAdmin && directExecute ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Execute Immediately
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Submit for Approval
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
