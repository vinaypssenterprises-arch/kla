import { apiFetch } from '../lib/api';
import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Modal from './ui/Modal';

const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

function PasswordField({ label, value, onChange, show, onToggleShow, autoFocus, autoComplete }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12.5px] font-semibold text-ink-text-soft">{label} <span className="text-brick">*</span></label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="app-input pr-11"
          value={value}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          onChange={onChange}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-ink-text-faint hover:text-ink-text-soft"
          onClick={onToggleShow}
          title={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-[16px] h-[16px]" /> : <Eye className="w-[16px] h-[16px]" />}
        </button>
      </div>
    </div>
  );
}

export default function ResetPasswordModal({ open, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setForm(emptyForm);
    setShow({ current: false, next: false, confirm: false });
    setError('');
    setDone(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.currentPassword) return setError('Enter your current password.');
    if (!form.newPassword) return setError('Enter a new password.');
    if (form.newPassword.length < 4) return setError('New password must be at least 4 characters.');
    if (form.newPassword === form.currentPassword) return setError('New password must be different from the current password.');
    if (form.newPassword !== form.confirmPassword) return setError('New password and confirmation do not match.');

    setSaving(true);
    try {
      const res = await apiFetch(`/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      });

      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to update password.');
      }
    } catch (err) {
      console.error('Change password error', err);
      setError('Network error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="bg-[#FFFDF7] border border-rule rounded-m shadow-deep w-full max-w-[420px] p-7">
        {done ? (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-forest-bg text-forest flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-[18px] font-serif text-ink mb-2">Password Updated</h3>
            <p className="text-[13.5px] text-ink-text-soft mb-6">Your password has been changed successfully.</p>
            <button type="button" className="btn btn-primary" onClick={handleClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-navy-stamp-bg text-navy-stamp flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[17px] font-serif text-ink leading-tight">Reset Password</h3>
                <p className="text-[12px] text-ink-text-faint">Choose a new password for your account.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <PasswordField
                label="Current Password"
                value={form.currentPassword}
                autoFocus
                autoComplete="current-password"
                show={show.current}
                onToggleShow={() => setShow(s => ({ ...s, current: !s.current }))}
                onChange={e => setForm({ ...form, currentPassword: e.target.value })}
              />
              <PasswordField
                label="New Password"
                value={form.newPassword}
                autoComplete="new-password"
                show={show.next}
                onToggleShow={() => setShow(s => ({ ...s, next: !s.next }))}
                onChange={e => setForm({ ...form, newPassword: e.target.value })}
              />
              <PasswordField
                label="Confirm New Password"
                value={form.confirmPassword}
                autoComplete="new-password"
                show={show.confirm}
                onToggleShow={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              />

              <p className="text-[11.5px] text-ink-text-faint -mt-1">Use at least 4 characters. Avoid reusing your current password.</p>

              {error && <p className="text-brick text-[12.5px] font-semibold">{error}</p>}

              <div className="flex justify-end gap-2.5 mt-2">
                <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}
