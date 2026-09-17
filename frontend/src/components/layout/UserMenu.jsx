import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, LogOut, ChevronUp } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import ResetPasswordModal from '../ResetPasswordModal';

function getInitials(name, email) {
  const source = (name || '').trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }
  return (email || '?').slice(0, 2).toUpperCase();
}

export default function UserMenu({ collapsed, onLogout }) {
  const [open, setOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const containerRef = useRef(null);

  const fullName = localStorage.getItem('fullName');
  const email = localStorage.getItem('email');
  const role = localStorage.getItem('role');
  const displayName = fullName || email || 'User';
  const initials = getInitials(fullName, email);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleConfirmLogout = () => {
    setConfirmingLogout(false);
    onLogout();
  };

  return (
    <div ref={containerRef} className="relative">
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-[230px] bg-ink border border-white/10 rounded-lg shadow-deep py-1.5 z-50 overflow-hidden">
          <div className="px-3.5 py-3 border-b border-white/10">
            <div className="text-[13px] font-semibold text-[#F5EFE1] truncate">{displayName}</div>
            <div className="text-[11.5px] text-[#8590A8] truncate">{email}</div>
          </div>
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-[#D9CBA3] hover:bg-white/5 transition-colors duration-150"
            onClick={() => { setOpen(false); setResetOpen(true); }}
          >
            <KeyRound className="w-[16px] h-[16px] flex-shrink-0" />
            Reset Password
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-[#E08585] hover:bg-white/5 transition-colors duration-150"
            onClick={() => { setOpen(false); setConfirmingLogout(true); }}
          >
            <LogOut className="w-[16px] h-[16px] flex-shrink-0" />
            Log Out
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title={collapsed ? displayName : undefined}
        aria-expanded={open}
        aria-haspopup="true"
        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors duration-150 hover:bg-white/5 ${open ? 'bg-white/5' : ''}`}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-ink"
          style={{ background: 'radial-gradient(circle at 35% 30%, var(--brass-light), var(--brass) 60%, var(--maroon-dark))' }}
        >
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 text-left">
              <div className="text-[13px] font-semibold text-[#F5EFE1] truncate">{displayName}</div>
              <div className="text-[11px] text-brass-light capitalize truncate">{role}</div>
            </div>
            <ChevronUp className={`w-[14px] h-[14px] text-[#8590A8] flex-shrink-0 transition-transform duration-200 ${open ? '' : 'rotate-180'}`} />
          </>
        )}
      </button>

      <ConfirmDialog
        open={confirmingLogout}
        tone="neutral"
        title="Log Out?"
        message="Are you sure you want to log out of your account? You'll need to sign in again to continue."
        confirmLabel="Log Out"
        cancelLabel="Stay Signed In"
        onConfirm={handleConfirmLogout}
        onCancel={() => setConfirmingLogout(false)}
      />

      <ResetPasswordModal open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}
