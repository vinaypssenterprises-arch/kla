import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, children, overlayClassName = '', closeOnBackdrop = true }) {
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep latest onClose in a ref so we never re-trigger effects on parent re-renders
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    // Save currently focused element BEFORE modal opened and lock body scroll
    previousFocusRef.current = document.activeElement;
    document.body.classList.add('modal-open');

    // Only set initial focus if focus is not already inside the modal
    const timer = setTimeout(() => {
      const modal = document.getElementById('modal-content-root');
      if (modal && !modal.contains(document.activeElement)) {
        // Look for autoFocus or input elements first before close buttons
        const primaryInput = modal.querySelector('input:not([disabled]), textarea:not([disabled])');
        if (primaryInput) {
          primaryInput.focus();
        } else {
          const focusable = modal.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) focusable[0].focus();
        }
      }
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }

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
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', handleKeyDown);
      // Restore previous focus only when the modal unmounts / closes
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === 'function') {
        try {
          prev.focus();
        } catch {
          // ignore
        }
      }
    };
  }, [open]); // CRITICAL: Only run when open transitions, NEVER when onClose or children change!

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto ${overlayClassName || 'bg-black/55 backdrop-blur-[3px]'}`}
      style={{ animation: 'backdropIn 0.2s ease-out' }}
      onClick={closeOnBackdrop ? () => onCloseRef.current?.() : undefined}
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
