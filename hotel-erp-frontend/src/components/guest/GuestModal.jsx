import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * GuestModal — Modal / side panel cơ bản
 *
 * Props:
 *   open        — boolean, kiểm soát hiển thị
 *   onClose     — callback đóng
 *   title       — tiêu đề modal
 *   children    — nội dung
 *   footer      — ReactNode (nút action)
 *   width       — max-width (default: 560)
 *   variant     — 'modal' (center) | 'panel' (right slide-in)
 *   closeOnOverlay — đóng khi click ngoài (default: true)
 *   showClose   — hiện nút X (default: true)
 *
 * Usage:
 *   <GuestModal open={open} onClose={() => setOpen(false)} title="Chi tiết phòng">
 *     <p>Nội dung...</p>
 *   </GuestModal>
 *
 *   <GuestModal variant="panel" title="Bộ lọc" open={open} onClose={close}>
 *     ...
 *   </GuestModal>
 */
export default function GuestModal({
  open           = false,
  onClose,
  title,
  children,
  footer,
  width          = 560,
  variant        = 'modal',
  closeOnOverlay = true,
  showClose      = true,
}) {
  const dialogRef = useRef(null);

  /* Lock body scroll */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  /* Close on Escape */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      dialogRef.current?.focus();
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  const isPanel = variant === 'panel';

  const modalContent = (
    <>
      <style>{`
        @keyframes __gm-enter {
          from { opacity: 0; transform: scale(0.93) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes __gm-panel-enter {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .gm-overlay {
          position: fixed; inset: 0;
          background: rgba(28, 25, 23, 0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: var(--g-z-modal, 400);
          display: flex;
          align-items: ${isPanel ? 'stretch' : 'center'};
          justify-content: ${isPanel ? 'flex-end' : 'center'};
          padding: ${isPanel ? '0' : '16px'};
          animation: g-fadeIn 0.2s ease;
        }
        .gm-dialog {
          background: var(--g-bg-card);
          border-radius: ${isPanel ? '0' : 'var(--g-radius-xl)'};
          box-shadow: var(--g-shadow-2xl);
          display: flex;
          flex-direction: column;
          max-height: ${isPanel ? '100vh' : '90vh'};
          width: ${isPanel ? `min(${width}px, 100vw)` : `min(${width}px, calc(100vw - 32px))`};
          animation: ${isPanel ? '__gm-panel-enter' : '__gm-enter'} 0.3s var(--g-ease-spring, cubic-bezier(0.34,1.56,0.64,1)) both;
          outline: none;
          overflow: hidden;
        }
        .gm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--g-border);
          flex-shrink: 0;
        }
        .gm-title {
          font-family: var(--g-font-heading);
          font-size: var(--g-text-xl);
          font-weight: 700;
          color: var(--g-text);
          margin: 0;
          letter-spacing: var(--g-tracking-tight);
          line-height: 1.25;
        }
        .gm-close {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          border: none; background: none;
          color: var(--g-text-muted);
          border-radius: var(--g-radius-md);
          cursor: pointer;
          font-size: 1.25rem;
          transition: all 0.15s;
          flex-shrink: 0;
          line-height: 1;
        }
        .gm-close:hover { background: var(--g-surface); color: var(--g-text); }
        .gm-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          scrollbar-width: thin;
          scrollbar-color: var(--g-border-strong) transparent;
        }
        .gm-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 24px;
          border-top: 1px solid var(--g-border);
          flex-shrink: 0;
          background: var(--g-surface-raised, #f8f5ef);
        }
      `}</style>

      <div
        className="gm-overlay"
        onClick={closeOnOverlay ? (e) => { if (e.target === e.currentTarget) onClose?.(); } : undefined}
        role="presentation"
      >
        <div
          className="gm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'gm-title' : undefined}
          tabIndex={-1}
          ref={dialogRef}
        >
          {/* Header */}
          {(title || showClose) && (
            <div className="gm-header">
              {title && <h2 id="gm-title" className="gm-title">{title}</h2>}
              {showClose && (
                <button
                  className="gm-close"
                  onClick={onClose}
                  aria-label="Đóng"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="gm-body">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="gm-footer">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
