import { useEffect, useRef, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import { childrenPropType, classNamePropType } from '../../utils/propTypes.js';

export default function Modal({ isOpen, onClose, title, children, className }) {
  const modalRef = useRef(null);
  const triggerRef = useRef(null);
  const titleId = useId();

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) firstFocusable.focus();
      }
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-black/45 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-label="Cerrar modal"
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={clsx('panel relative z-10 w-full max-w-md p-6 shadow-hero', className)}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold text-app">
            {title}
          </h2>
          <button onClick={onClose} className="interactive-subtle p-1" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: childrenPropType,
  className: classNamePropType,
};
