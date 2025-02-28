import React, { useEffect, useRef, FC } from 'react'; // v18.2.0
import clsx from 'clsx'; // v1.2.1
import { AnimatePresence, motion } from 'framer-motion'; // v10.12.4
import { FiX } from 'react-icons/fi'; // v4.8.0
import FocusTrap from 'focus-trap-react'; // v10.1.4
import Button, { ButtonVariant } from './Button';

// ESC key code constant
const ESC_KEY_CODE = 27;

/**
 * Available modal sizes
 */
export enum ModalSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  FULL = 'full',
}

/**
 * Props for the Modal component
 */
export interface ModalProps {
  /**
   * Whether the modal is currently open
   */
  isOpen: boolean;
  /**
   * Function to close the modal
   */
  onClose: () => void;
  /**
   * Optional title for the modal header
   */
  title?: string;
  /**
   * Content to be displayed in the modal body
   */
  children: React.ReactNode;
  /**
   * Size of the modal
   */
  size?: ModalSize;
  /**
   * Optional content for the modal footer
   */
  footer?: React.ReactNode;
  /**
   * Whether clicking the backdrop should close the modal
   */
  closeOnBackdropClick?: boolean;
  /**
   * Whether pressing ESC key should close the modal
   */
  closeOnEsc?: boolean;
  /**
   * Additional class names to apply to the modal
   */
  className?: string;
  /**
   * Whether to show the close button in the header
   */
  showCloseButton?: boolean;
  /**
   * Test ID for testing purposes
   */
  testId?: string;
}

/**
 * A reusable modal dialog component for the AI Talent Marketplace web application
 * that provides an overlay for focused user interactions. Supports customizable headers,
 * footers, sizes, and animations with accessibility features like focus trapping,
 * keyboard navigation, and proper ARIA attributes.
 */
const Modal: FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = ModalSize.MEDIUM,
  footer,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  className = '',
  showCloseButton = true,
  testId,
}) => {
  // Create a ref for the modal content element to manage focus
  const modalRef = useRef<HTMLDivElement>(null);

  // Set up effect to handle keyboard events (ESC key to close modal)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEsc && event.keyCode === ESC_KEY_CODE && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEsc, isOpen, onClose]);

  // Set up effect to prevent body scrolling when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  // Implement backdrop click handler that calls onClose when clicking outside the modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  };

  const modalVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      transition: { 
        type: 'spring', 
        stiffness: 300, 
        damping: 30 
      } 
    },
    exit: { 
      scale: 0.95, 
      opacity: 0, 
      transition: { 
        duration: 0.15 
      } 
    },
  };

  // Size-based classes
  const sizeClasses = {
    [ModalSize.SMALL]: 'max-w-sm w-full',
    [ModalSize.MEDIUM]: 'max-w-lg w-full',
    [ModalSize.LARGE]: 'max-w-3xl w-full',
    [ModalSize.FULL]: 'max-w-full w-11/12 sm:w-10/12 md:w-9/12 lg:w-8/12',
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={handleBackdropClick}
              data-testid={testId ? `${testId}-backdrop` : 'modal-backdrop'}
            />
            
            {/* Modal */}
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                preventScroll: true,
                returnFocusOnDeactivate: true,
              }}
            >
              <motion.div
                ref={modalRef}
                className={clsx(
                  'relative bg-white rounded-lg shadow-xl z-10',
                  'mx-auto my-8',
                  sizeClasses[size],
                  className
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                data-testid={testId}
              >
                {/* Header */}
                {title && (
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 
                      id="modal-title" 
                      className="text-lg font-medium text-gray-900 break-words"
                    >
                      {title}
                    </h3>
                    {showCloseButton && (
                      <Button 
                        variant={ButtonVariant.GHOST} 
                        onClick={onClose}
                        ariaLabel="Close modal"
                        testId={testId ? `${testId}-close-button` : 'modal-close-button'}
                        className="ml-4 -mr-2"
                      >
                        <FiX className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Body */}
                <div className={clsx(
                  'px-6 py-4',
                  // If there's no title or footer, add rounded corners
                  !title && 'rounded-t-lg',
                  !footer && 'rounded-b-lg'
                )}>
                  {children}
                </div>

                {/* Footer */}
                {footer && (
                  <div className="px-6 py-4 border-t border-gray-200 rounded-b-lg">
                    <div className="flex justify-end gap-3">
                      {footer}
                    </div>
                  </div>
                )}
              </motion.div>
            </FocusTrap>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;