import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, children, overlayClassName = '', closeOnBackdrop = true }) {
  const firstFocusableRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    // Save currently focused element and lock body scroll
    previousFocusRef.current = document.activeElement;
    document.body.classList.add('modal-open');

    // Focus first focusable element inside modal after animation settles
    const timer = setTimeout(() => {
      const modal = document.getElementById('modal-content-root');
      if (modal) {
        const focusable = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) focusable[0].focus();
      }
    }, 60);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { onClose?.(); return; }

      // Focus trap
      if (e.key === 'Tab') {
        const modal = document.getElementById('modal-content-root');
        if (!modal) return;
        const focusable = Array.from(modal.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', handleKeyDown);
      // Restore previous focus on close
      if (previousFocusRef.current?.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  // Rendered via a portal straight onto <body> — several trigger points (e.g. the sidebar,
  // which has an always-on Tailwind translate-x transform) sit inside an ancestor with a
  // CSS transform, and a transformed ancestor becomes the containing block for `fixed`
  // descendants, which would otherwise box this overlay into that ancestor instead of the viewport.
  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto ${overlayClassName || 'bg-black/55 backdrop-blur-[3px]'}`}
      style={{ animation: 'backdropIn 0.2s ease-out' }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        id="modal-content-root"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="w-full flex justify-center my-auto"
        style={{ animation: 'modalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
