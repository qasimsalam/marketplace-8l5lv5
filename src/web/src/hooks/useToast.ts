import { useState, useCallback, useEffect } from 'react'; // v18.2.0
import { ToastType, ToastPosition, ToastProps } from '../components/common/Toast';

// Default toast duration in milliseconds
const DEFAULT_TOAST_DURATION = 4000;

// Default toast position
const DEFAULT_TOAST_POSITION = ToastPosition.TOP_RIGHT;

// Define a type for our stored toast data (without the onClose handler)
type ToastData = Omit<ToastProps, 'onClose'>;

/**
 * Custom hook for managing toast notifications with different types, durations, and positions
 */
const useToast = () => {
  // Initialize state for storing toast notifications
  const [toasts, setToasts] = useState<ToastData[]>([]);

  /**
   * Generates a unique ID for each toast
   */
  const generateId = (): string => {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  /**
   * Hides a toast notification by ID
   */
  const hideToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter(toast => toast.id !== id));
  }, []);

  /**
   * Shows a toast notification with the given parameters
   */
  const showToast = useCallback((
    message: string,
    type: ToastType = ToastType.INFO,
    duration: number = DEFAULT_TOAST_DURATION,
    position: ToastPosition = DEFAULT_TOAST_POSITION,
    isClosable: boolean = true,
    isLoading: boolean = false
  ) => {
    const id = generateId();
    
    // Define toast object with required properties
    const toast: ToastData = {
      id,
      message,
      type,
      duration,
      position,
      isClosable,
      isLoading
    };
    
    setToasts((prevToasts) => [...prevToasts, toast]);
    
    return id;
  }, []);

  /**
   * Hides all toast notifications
   */
  const hideAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * Updates an existing toast notification
   */
  const updateToast = useCallback((
    id: string,
    updatedProps: Partial<ToastData>
  ) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, ...updatedProps } : toast
      )
    );
  }, []);

  /**
   * Shows a success toast notification
   */
  const success = useCallback((
    message: string,
    duration?: number,
    position?: ToastPosition,
    isClosable?: boolean
  ) => {
    return showToast(message, ToastType.SUCCESS, duration, position, isClosable);
  }, [showToast]);

  /**
   * Shows an error toast notification
   */
  const error = useCallback((
    message: string,
    duration?: number,
    position?: ToastPosition,
    isClosable?: boolean
  ) => {
    return showToast(message, ToastType.ERROR, duration, position, isClosable);
  }, [showToast]);

  /**
   * Shows a warning toast notification
   */
  const warning = useCallback((
    message: string,
    duration?: number,
    position?: ToastPosition,
    isClosable?: boolean
  ) => {
    return showToast(message, ToastType.WARNING, duration, position, isClosable);
  }, [showToast]);

  /**
   * Shows an info toast notification
   */
  const info = useCallback((
    message: string,
    duration?: number,
    position?: ToastPosition,
    isClosable?: boolean
  ) => {
    return showToast(message, ToastType.INFO, duration, position, isClosable);
  }, [showToast]);

  /**
   * Shows a loading toast notification
   */
  const loading = useCallback((
    message: string,
    duration: number = 0, // Default to no auto-dismiss for loading toasts
    position?: ToastPosition,
    isClosable: boolean = true
  ) => {
    return showToast(message, ToastType.INFO, duration, position, isClosable, true);
  }, [showToast]);

  /**
   * Updates a loading toast to a success toast
   */
  const loadingToSuccess = useCallback((
    id: string,
    message: string,
    duration?: number,
    isClosable?: boolean
  ) => {
    updateToast(id, {
      message,
      type: ToastType.SUCCESS,
      duration: duration || DEFAULT_TOAST_DURATION,
      isLoading: false,
      isClosable
    });
  }, [updateToast]);

  /**
   * Updates a loading toast to an error toast
   */
  const loadingToError = useCallback((
    id: string,
    message: string,
    duration?: number,
    isClosable?: boolean
  ) => {
    updateToast(id, {
      message,
      type: ToastType.ERROR,
      duration: duration || DEFAULT_TOAST_DURATION,
      isLoading: false,
      isClosable
    });
  }, [updateToast]);

  // Set up useEffect to automatically remove toasts after their duration expires
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    
    toasts.forEach(toast => {
      // Only set up auto-dismiss timer if duration is positive and not loading
      if (toast.duration && toast.duration > 0 && !toast.isLoading) {
        const timeout = setTimeout(() => {
          hideToast(toast.id);
        }, toast.duration);
        
        timeouts.push(timeout);
      }
    });
    
    // Clean up timeouts on unmount or when toasts change
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [toasts, hideToast]);

  // The complete toast objects with onClose handler for ToastContainer
  const toastsWithOnClose: ToastProps[] = toasts.map(toast => ({
    ...toast,
    onClose: hideToast
  }));

  return {
    toasts: toastsWithOnClose,
    showToast,
    hideToast,
    hideAllToasts,
    updateToast,
    success,
    error,
    warning,
    info,
    loading,
    loadingToSuccess,
    loadingToError
  };
};

export default useToast;