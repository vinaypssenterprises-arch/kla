import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const TOAST_CONFIG = {
  success: {
    Icon: CheckCircle2,
    bg: 'bg-[#0D2218]',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    iconColor: 'text-emerald-400',
    accent: 'bg-emerald-500',
  },
  error: {
    Icon: XCircle,
    bg: 'bg-[#1E0D0D]',
    border: 'border-rose-500/30',
    text: 'text-rose-300',
    iconColor: 'text-rose-400',
    accent: 'bg-rose-500',
  },
  info: {
    Icon: Info,
    bg: 'bg-[#0D1627]',
    border: 'border-blue-500/30',
    text: 'text-blue-200',
    iconColor: 'text-blue-400',
    accent: 'bg-blue-500',
  },
};

let idCounter = 0;
const MAX_TOASTS = 4;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const dismissAll = useCallback(() => {
    setToasts(prev => {
      prev.forEach(t => {
        clearTimeout(timers.current[t.id]);
        delete timers.current[t.id];
      });
      return [];
    });
  }, []);

  const showToast = useCallback((message, { type = 'error', duration = 5000 } = {}) => {
    const id = ++idCounter;
    setToasts(prev => {
      const next = [...prev, { id, message, type }];
      // Limit to MAX_TOASTS — drop oldest
      if (next.length > MAX_TOASTS) next.splice(0, next.length - MAX_TOASTS);
      return next;
    });
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const value = {
    showToast,
    showError: (message, opts) => showToast(message, { ...opts, type: 'error' }),
    showSuccess: (message, opts) => showToast(message, { ...opts, type: 'success' }),
    showInfo: (message, opts) => showToast(message, { ...opts, type: 'info' }),
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 max-w-[calc(100vw-2.5rem)] w-[360px] pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.length > 1 && (
          <button
            onClick={dismissAll}
            className="pointer-events-auto self-end text-[11px] text-[#8590A8] hover:text-white transition-colors px-2 py-0.5 rounded bg-white/5 border border-white/10 mb-1"
          >
            Dismiss all ({toasts.length})
          </button>
        )}
        {toasts.map(t => {
          const cfg = TOAST_CONFIG[t.type] || TOAST_CONFIG.error;
          const { Icon, bg, border, text, iconColor, accent } = cfg;
          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto relative flex items-start gap-3 py-3 px-4 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border ${bg} ${border} ${text} text-[13px] font-medium leading-snug overflow-hidden`}
              style={{ animation: 'slideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              {/* Left accent stripe */}
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${accent} rounded-l-xl`} />

              <Icon className={`w-[18px] h-[18px] flex-shrink-0 mt-0.5 ml-1 ${iconColor}`} />
              <span className="flex-1 pt-0.5">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity p-0.5 rounded"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
