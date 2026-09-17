import React from 'react';
import { AlertTriangle, HelpCircle, Trash2, LogOut, ShieldAlert } from 'lucide-react';
import Modal from './Modal';

const TONE_CONFIG = {
  danger: {
    Icon: Trash2,
    iconBg: 'bg-rose-500/15',
    iconRing: 'ring-rose-500/25',
    iconColor: 'text-rose-400',
    btnClass: 'btn btn-danger',
    accentBar: 'bg-gradient-to-r from-rose-600 to-red-500',
  },
  neutral: {
    Icon: LogOut,
    iconBg: 'bg-slate-500/15',
    iconRing: 'ring-slate-500/20',
    iconColor: 'text-slate-300',
    btnClass: 'btn btn-primary',
    accentBar: 'bg-gradient-to-r from-slate-600 to-slate-500',
  },
  warning: {
    Icon: ShieldAlert,
    iconBg: 'bg-amber-500/15',
    iconRing: 'ring-amber-500/25',
    iconColor: 'text-amber-400',
    btnClass: 'btn btn-primary',
    accentBar: 'bg-gradient-to-r from-amber-600 to-yellow-500',
  },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  tone = 'danger',
}) {
  const config = TONE_CONFIG[tone] || TONE_CONFIG.danger;
  const { Icon, iconBg, iconRing, iconColor, btnClass, accentBar } = config;

  return (
    <Modal open={open} onClose={loading ? undefined : onCancel} overlayClassName="bg-black/60 backdrop-blur-[6px]">
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.55)] border border-white/10">
        
        {/* Accent top bar */}
        <div className={`absolute top-0 left-0 right-0 h-[3px] ${accentBar}`} />

        {/* Glassmorphism dark panel */}
        <div className="bg-[#12192B]/95 backdrop-blur-xl px-8 py-8 text-center">

          {/* Icon orb */}
          <div className={`w-16 h-16 rounded-2xl ${iconBg} ring-2 ${iconRing} flex items-center justify-center mx-auto mb-5 shadow-lg`}>
            <Icon className={`w-7 h-7 ${iconColor}`} strokeWidth={1.8} />
          </div>

          {/* Title */}
          <h3 className="text-[20px] font-serif font-bold text-[#F5EFE1] mb-2 leading-tight">
            {title}
          </h3>

          {/* Message */}
          <p className="text-[13.5px] text-[#8590A8] leading-relaxed mb-7 max-w-[300px] mx-auto">
            {message}
          </p>

          {/* Actions */}
          <div className="flex justify-center gap-3">
            <button
              type="button"
              className="btn btn-secondary min-w-[110px]"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`${btnClass} min-w-[110px]`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Please wait…
                </span>
              ) : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
