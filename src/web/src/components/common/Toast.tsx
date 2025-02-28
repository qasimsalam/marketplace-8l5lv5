import React, { useEffect, useRef, FC } from 'react'; // v18.2.0
import clsx from 'clsx'; // v1.2.1
import { AnimatePresence, motion } from 'framer-motion'; // v10.12.4
import { FiX, FiAlertCircle, FiCheckCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi'; // v4.8.0
import { Button, ButtonVariant } from './Button';
import { Spinner, SpinnerSize } from './Spinner';

/**
 * Default duration for toast notifications in milliseconds
 */
const DEFAULT_DURATION = 4000;

/**
 * Enum for different types of toast notifications
 */
export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Enum for different positions where toast notifications can appear
 */
export enum ToastPosition {
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  TOP_CENTER = 'top-center',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  BOTTOM_CENTER = 'bottom-center'
}

/**
 * Interface for props of a single Toast component
 */
export interface ToastProps {
  /**
   * Unique identifier for the toast
   */
  id: string;
  /**
   * Content message to display
   */
  message: string;
  /**
   * Type of toast notification
   */
  type: ToastType;
  /**
   * Duration in milliseconds to display the toast before auto-dismiss
   * Set to 0 for no auto-dismiss
   */
  duration?: number;
  /**
   * Position of the toast on screen
   */
  position: ToastPosition;
  /**
   * Callback function called when toast is closed
   */
  onClose: (id: string) => void;
  /**
   * Whether the toast can be manually closed by the user
   */
  isClosable?: boolean;
  /**
   * Whether the toast is in a loading state
   */
  isLoading?: boolean;
}

/**
 * Interface for props of the ToastContainer component
 */
export interface ToastContainerProps {
  /**
   * Array of toast notifications to display
   */
  toasts: ToastProps[];
  /**
   * Position of the toast container
   */
  position: ToastPosition;
  /**
   * Callback function called when a toast is closed
   */
  onClose: (id: string) => void;
}

/**
 * A single toast notification component that displays a message with an icon,
 * optional close button, and auto-dismissal
 */
export const Toast: FC<ToastProps> = ({
  id,
  message,
  type,
  duration = DEFAULT_DURATION,
  position,
  onClose,
  isClosable = true,
  isLoading = false
}) => {
  const isMounted = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPaused = useRef(false);
  const remainingTime = useRef(duration);
  const startTime = useRef(Date.now());

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Only set up auto-dismiss timer if duration is positive
    if (duration > 0 && !isLoading) {
      startTimer();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, isLoading]);

  const startTimer = () => {
    if (isPaused.current) return;

    startTime.current = Date.now();
    timerRef.current = setTimeout(() => {
      if (isMounted.current) {
        onClose(id);
      }
    }, remainingTime.current);
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      isPaused.current = true;
      remainingTime.current -= (Date.now() - startTime.current);
    }
  };

  const resumeTimer = () => {
    isPaused.current = false;
    startTimer();
  };

  const handleMouseEnter = () => {
    if (duration > 0 && !isLoading) {
      pauseTimer();
    }
  };

  const handleMouseLeave = () => {
    if (duration > 0 && !isLoading) {
      resumeTimer();
    }
  };

  const handleClose = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onClose(id);
  };

  // Define icon and styling based on toast type
  let Icon;
  let bgColor;
  let borderColor;

  switch (type) {
    case ToastType.SUCCESS:
      Icon = FiCheckCircle;
      bgColor = 'bg-green-50';
      borderColor = 'border-green-500';
      break;
    case ToastType.ERROR:
      Icon = FiAlertCircle;
      bgColor = 'bg-red-50';
      borderColor = 'border-red-500';
      break;
    case ToastType.WARNING:
      Icon = FiAlertTriangle;
      bgColor = 'bg-yellow-50';
      borderColor = 'border-yellow-500';
      break;
    case ToastType.INFO:
    default:
      Icon = FiInfo;
      bgColor = 'bg-blue-50';
      borderColor = 'border-blue-500';
  }

  // Define text color based on toast type
  let textColor;
  switch (type) {
    case ToastType.SUCCESS:
      textColor = 'text-green-800';
      break;
    case ToastType.ERROR:
      textColor = 'text-red-800';
      break;
    case ToastType.WARNING:
      textColor = 'text-yellow-800';
      break;
    case ToastType.INFO:
    default:
      textColor = 'text-blue-800';
  }

  // Define icon color based on toast type
  let iconColor;
  switch (type) {
    case ToastType.SUCCESS:
      iconColor = 'text-green-500';
      break;
    case ToastType.ERROR:
      iconColor = 'text-red-500';
      break;
    case ToastType.WARNING:
      iconColor = 'text-yellow-500';
      break;
    case ToastType.INFO:
    default:
      iconColor = 'text-blue-500';
  }

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={clsx(
        'relative flex w-full max-w-sm rounded-lg shadow-md border-l-4 overflow-hidden',
        bgColor,
        borderColor
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex-1 p-4 pr-8">
        <div className="flex items-start">
          {isLoading ? (
            <div className={clsx('mr-3', iconColor)}>
              <Spinner size={SpinnerSize.SMALL} />
            </div>
          ) : (
            <Icon className={clsx('h-5 w-5 mr-3', iconColor)} aria-hidden="true" />
          )}
          <div className={clsx('ml-2', textColor)}>
            <p className="text-sm font-medium">{message}</p>
          </div>
        </div>
      </div>
      
      {isClosable && (
        <div className="absolute top-1 right-1">
          <Button
            variant={ButtonVariant.GHOST}
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-200"
            ariaLabel="Close notification"
          >
            <FiX className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

/**
 * A container component for managing multiple toast notifications
 * and positioning them on the screen
 */
export const ToastContainer: FC<ToastContainerProps> = ({
  toasts,
  position,
  onClose
}) => {
  // Define position classes based on the position prop
  const positionClasses = {
    [ToastPosition.TOP_LEFT]: 'top-0 left-0 pt-4 pl-4',
    [ToastPosition.TOP_RIGHT]: 'top-0 right-0 pt-4 pr-4',
    [ToastPosition.TOP_CENTER]: 'top-0 left-1/2 transform -translate-x-1/2 pt-4',
    [ToastPosition.BOTTOM_LEFT]: 'bottom-0 left-0 pb-4 pl-4',
    [ToastPosition.BOTTOM_RIGHT]: 'bottom-0 right-0 pb-4 pr-4',
    [ToastPosition.BOTTOM_CENTER]: 'bottom-0 left-1/2 transform -translate-x-1/2 pb-4'
  };

  // Define toast order based on the position
  const isTopPosition = position.startsWith('top');
  const toastsInOrder = [...toasts];
  
  if (!isTopPosition) {
    // For bottom positions, reverse the order so newest appears at the bottom
    toastsInOrder.reverse();
  }

  return (
    <div
      className={clsx(
        'fixed z-50 flex flex-col items-center',
        position.includes('center') ? 'items-center' : 'items-start',
        positionClasses[position]
      )}
      aria-live="polite"
    >
      <AnimatePresence>
        {toastsInOrder.map((toast) => (
          <div
            key={toast.id}
            className={clsx('mb-3 w-full max-w-sm', isTopPosition ? 'mt-0' : 'mt-0')}
          >
            <Toast
              {...toast}
              onClose={onClose}
              position={position}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;