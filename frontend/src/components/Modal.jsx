import { useEffect } from 'react';
import { X } from 'lucide-react';

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
  full: 'max-w-full m-4',
};

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOutsideClick = true,
  showCloseButton = true,
  className = '',
  bodyClassName = '',
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop with restrained dimming & subtle blur */}
      <div
        onClick={closeOnOutsideClick ? onClose : undefined}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-opacity animate-fade-in"
        aria-hidden="true"
      />

      {/* Dialog Surface */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={`relative w-full ${sizeClasses[size] || sizeClasses.md} bg-white dark:bg-[#131D2E] rounded-2xl border border-slate-200/80 dark:border-[#202C3F] shadow-2xl overflow-hidden z-10 animate-scale-in transition-all my-auto ${className}`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-[#202C3F] bg-slate-50/50 dark:bg-[#182337]/30">
            <div className="space-y-0.5 pr-4 min-w-0 flex-1">
              {title && (
                <div
                  id="modal-title"
                  className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F8FAFC] tracking-tight"
                >
                  {title}
                </div>
              )}
              {description && (
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed truncate">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer focus:outline-none shrink-0"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className={`p-5 sm:p-6 max-h-[calc(100vh-140px)] overflow-y-auto text-slate-800 dark:text-[#CBD5E1] ${bodyClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-[#202C3F] bg-slate-50/50 dark:bg-[#182337]/30 flex flex-wrap items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
