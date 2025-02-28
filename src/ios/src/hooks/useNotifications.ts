/**
 * Custom React hook for managing push notifications in the iOS application
 * Handles notification permissions, token registration, and notification processing
 * 
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react'; // ^18.2.0
import { useSelector, useDispatch } from 'react-redux'; // ^8.1.1
import { 
  AppState, 
  Platform, 
  Linking, 
  Alert, 
  NativeEventEmitter, 
  NativeModules 
} from 'react-native'; // 0.72.4
import messaging from '@react-native-firebase/messaging'; // ^18.3.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0
import notifee, { 
  EventType,
  AndroidImportance,
  AndroidChannel,
  EventDetail
} from '@notifee/react-native'; // ^7.8.0
import { useFocusEffect } from '@react-navigation/native'; // ^6.1.7

import { 
  PermissionType, 
  requestPermission, 
  checkPermission, 
  isPermissionGranted, 
  PermissionStatus 
} from '../utils/permissions';
import { AuthState } from '../types/auth.types';
import { iOSNotificationPayload } from '../types/message.types';
import api from '../lib/api';

// Storage keys and constants
const NOTIFICATION_STORAGE_KEY = '@ai_talent_marketplace_notifications';
const MAX_STORED_NOTIFICATIONS = 100;
const NOTIFICATION_CHANNEL_ID = 'ai_talent_marketplace_channel';
const NOTIFICATION_CHANNEL_NAME = 'AI Talent Marketplace';

/**
 * Enumeration of notification types supported in the application
 */
export enum NotificationType {
  MESSAGE = 'message',
  JOB_MATCH = 'job_match',
  PROPOSAL = 'proposal',
  CONTRACT = 'contract',
  PAYMENT = 'payment',
  SYSTEM = 'system'
}

/**
 * Interface for notification objects with metadata
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: any;
  timestamp: number;
  read: boolean;
  sender: { id: string; name: string } | null;
}

/**
 * Interface for user notification preferences
 */
export interface NotificationSettings {
  enabled: boolean;
  showPreview: boolean;
  sound: boolean;
  vibration: boolean;
  messageNotifications: boolean;
  jobNotifications: boolean;
  proposalNotifications: boolean;
  contractNotifications: boolean;
  paymentNotifications: boolean;
}

/**
 * Creates notification channels for categorizing notifications
 * 
 * @returns Promise that resolves when channels are created
 */
const createNotificationChannels = async (): Promise<void> => {
  // This function primarily affects Android, but we'll keep it for cross-platform consistency
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: NOTIFICATION_CHANNEL_NAME,
      lights: true,
      vibration: true,
      importance: AndroidImportance.HIGH,
    });

    // Create additional channels for different notification types
    await notifee.createChannel({
      id: 'ai_talent_marketplace_messages',
      name: 'Messages',
      lights: true,
      vibration: true,
      importance: AndroidImportance.HIGH,
    });

    await notifee.createChannel({
      id: 'ai_talent_marketplace_jobs',
      name: 'Job Matches',
      lights: true,
      vibration: true,
      importance: AndroidImportance.DEFAULT,
    });

    await notifee.createChannel({
      id: 'ai_talent_marketplace_proposals',
      name: 'Proposals',
      lights: true,
      vibration: true,
      importance: AndroidImportance.HIGH,
    });

    await notifee.createChannel({
      id: 'ai_talent_marketplace_contracts',
      name: 'Contracts',
      lights: true,
      vibration: true,
      importance: AndroidImportance.HIGH,
    });

    await notifee.createChannel({
      id: 'ai_talent_marketplace_payments',
      name: 'Payments',
      lights: true,
      vibration: true,
      importance: AndroidImportance.HIGH,
    });
  }
};

/**
 * React hook that provides notification functionality for the iOS application
 * 
 * @returns Notification methods and state
 */
export const useNotifications = () => {
  // State for notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Authentication state from Redux
  const authState = useSelector((state: { auth: AuthState }) => state.auth);
  const dispatch = useDispatch();
  
  // Refs to avoid recreating functions on each render
  const fcmTokenRef = useRef<string | null>(null);
  const unsubscribersRef = useRef<(() => void)[]>([]);
  
  // Compute unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  /**
   * Store notification in AsyncStorage
   */
  const storeNotification = async (notification: Notification): Promise<void> => {
    try {
      // Get existing notifications
      const storedNotificationsStr = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      let storedNotifications: Notification[] = [];
      
      if (storedNotificationsStr) {
        storedNotifications = JSON.parse(storedNotificationsStr);
      }
      
      // Check if notification already exists (by ID)
      const existingIndex = storedNotifications.findIndex(n => n.id === notification.id);
      
      if (existingIndex >= 0) {
        // Update existing notification
        storedNotifications[existingIndex] = notification;
      } else {
        // Add new notification at the beginning
        storedNotifications.unshift(notification);
        
        // Keep notifications under the maximum limit
        if (storedNotifications.length > MAX_STORED_NOTIFICATIONS) {
          storedNotifications = storedNotifications.slice(0, MAX_STORED_NOTIFICATIONS);
        }
      }
      
      // Save updated notifications
      await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(storedNotifications));
      
      // Update state
      setNotifications(storedNotifications);
    } catch (err) {
      console.error('Error storing notification:', err);
      setError('Failed to store notification');
    }
  };
  
  /**
   * Fetch notifications from storage or API
   */
  const fetchNotifications = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Get notifications from AsyncStorage
      const storedNotificationsStr = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      
      if (storedNotificationsStr) {
        const storedNotifications = JSON.parse(storedNotificationsStr);
        setNotifications(storedNotifications);
      } else {
        setNotifications([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    try {
      // Update state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Get existing notifications
      const storedNotificationsStr = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      
      if (storedNotificationsStr) {
        const storedNotifications: Notification[] = JSON.parse(storedNotificationsStr);
        
        // Update notification
        const updatedNotifications = storedNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        );
        
        // Save updated notifications
        await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updatedNotifications));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Failed to update notification');
    }
  }, []);
  
  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async (): Promise<void> => {
    try {
      // Update state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      // Get existing notifications
      const storedNotificationsStr = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      
      if (storedNotificationsStr) {
        const storedNotifications: Notification[] = JSON.parse(storedNotificationsStr);
        
        // Update all notifications
        const updatedNotifications = storedNotifications.map(notification => 
          ({ ...notification, read: true })
        );
        
        // Save updated notifications
        await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updatedNotifications));
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError('Failed to update notifications');
    }
  }, []);
  
  /**
   * Delete a notification
   */
  const deleteNotification = useCallback(async (notificationId: string): Promise<void> => {
    try {
      // Update state
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification.id !== notificationId)
      );
      
      // Get existing notifications
      const storedNotificationsStr = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      
      if (storedNotificationsStr) {
        const storedNotifications: Notification[] = JSON.parse(storedNotificationsStr);
        
        // Remove notification
        const updatedNotifications = storedNotifications.filter(
          notification => notification.id !== notificationId
        );
        
        // Save updated notifications
        await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updatedNotifications));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError('Failed to delete notification');
    }
  }, []);
  
  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(async (): Promise<void> => {
    try {
      // Update state
      setNotifications([]);
      
      // Clear notifications in storage
      await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify([]));
    } catch (err) {
      console.error('Error clearing notifications:', err);
      setError('Failed to clear notifications');
    }
  }, []);
  
  /**
   * Request notification permission
   */
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Request permission using utility function
      const status = await requestPermission(
        PermissionType.NOTIFICATIONS,
        'Notifications are needed to alert you about new job matches, messages, and important updates.'
      );
      
      const granted = isPermissionGranted(status);
      setHasPermission(granted);
      
      if (granted && authState.isAuthenticated && authState.user) {
        // If permission granted, register device token
        await registerDeviceToken();
      }
      
      return granted;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError('Failed to request notification permission');
      return false;
    }
  }, [authState.isAuthenticated, authState.user]);
  
  /**
   * Register device token with backend
   */
  const registerDeviceToken = useCallback(async (): Promise<void> => {
    try {
      if (!authState.isAuthenticated || !authState.user) {
        console.log('Not registering device token: user not authenticated');
        return;
      }
      
      // Get FCM token
      const token = await messaging().getToken();
      fcmTokenRef.current = token;
      
      console.log('FCM Token:', token);
      
      // Register token with backend
      await api.auth.registerDeviceToken({
        token,
        deviceType: Platform.OS,
        deviceName: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device'
      });
      
      console.log('Device token registered with backend');
    } catch (err) {
      console.error('Error registering device token:', err);
    }
  }, [authState.isAuthenticated, authState.user]);
  
  /**
   * Unregister device token with backend
   */
  const unregisterDeviceToken = useCallback(async (): Promise<void> => {
    try {
      if (!fcmTokenRef.current) return;
      
      await api.auth.unregisterDeviceToken({
        token: fcmTokenRef.current,
        deviceType: Platform.OS
      });
      
      console.log('Device token unregistered with backend');
    } catch (err) {
      console.error('Error unregistering device token:', err);
    }
  }, []);
  
  /**
   * Processes notifications received while app is in foreground
   */
  const handleForegroundNotification = useCallback(async (remoteMessage: messaging.RemoteMessage): Promise<void> => {
    try {
      console.log('Foreground notification received:', remoteMessage);
      
      // Parse notification data
      const notification = parseNotificationData(remoteMessage);
      
      // Store notification
      await storeNotification(notification);
      
      // Display foreground notification with notifee
      await notifee.displayNotification({
        title: notification.title,
        body: notification.body,
        data: remoteMessage.data,
        android: {
          channelId: NOTIFICATION_CHANNEL_ID,
          smallIcon: 'ic_notification',
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          foregroundPresentationOptions: {
            alert: true,
            badge: true,
            sound: true,
          },
        },
      });
    } catch (err) {
      console.error('Error handling foreground notification:', err);
    }
  }, []);
  
  /**
   * Sets up handler for notifications received in background
   */
  const handleBackgroundNotification = useCallback(async (): Promise<void> => {
    // Set up background handler with notifee
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        // Handle notification press in background
        const { notification } = detail;
        
        if (notification && notification.data) {
          try {
            const parsedData = notification.data;
            const notificationType = parsedData.type as NotificationType;
            
            // Navigate based on notification type
            switch (notificationType) {
              case NotificationType.MESSAGE:
                // Will be handled when app comes to foreground
                break;
              case NotificationType.JOB_MATCH:
                // Will be handled when app comes to foreground
                break;
              default:
                // Handle other notification types
                break;
            }
          } catch (err) {
            console.error('Error handling background notification press:', err);
          }
        }
      }
    });
    
    // Set up background message handler for Firebase
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message received:', remoteMessage);
      
      // Parse and store notification
      const notification = parseNotificationData(remoteMessage);
      await storeNotification(notification);
      
      // Return empty promise to satisfy FCM background handler
      return Promise.resolve();
    });
  }, []);
  
  /**
   * Parses raw notification data into structured Notification object
   */
  const parseNotificationData = (remoteMessage: messaging.RemoteMessage): Notification => {
    const { notification, data = {}, messageId, sentTime } = remoteMessage;
    const timestamp = sentTime || Date.now();
    
    // Generate unique ID if not provided
    const id = messageId || `notification_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine notification type from data
    const type = (data.type as NotificationType) || NotificationType.SYSTEM;
    
    // Get title and body from notification or data
    const title = notification?.title || data.title || 'New Notification';
    const body = notification?.body || data.body || '';
    
    // Parse sender information if available
    let sender = null;
    if (data.senderId && data.senderName) {
      sender = {
        id: data.senderId as string,
        name: data.senderName as string
      };
    }
    
    // Create structured notification object
    return {
      id,
      type,
      title,
      body,
      data,
      timestamp,
      read: false,
      sender
    };
  };
  
  // Initialize notification handling and check permissions on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        
        // Create notification channels
        await createNotificationChannels();
        
        // Check notification permission
        const status = await checkPermission(PermissionType.NOTIFICATIONS);
        const granted = isPermissionGranted(status);
        setHasPermission(granted);
        
        // Register token if permission granted and user is authenticated
        if (granted && authState.isAuthenticated && authState.user) {
          await registerDeviceToken();
        }
        
        // Set up Firebase message handlers
        const unsubscribeOnMessage = messaging().onMessage(handleForegroundNotification);
        
        // Set up background notification handler
        await handleBackgroundNotification();
        
        // Set up notifee foreground event listener
        const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
          if (type === EventType.PRESS) {
            // Handle notification press in foreground
            const { notification } = detail;
            
            if (notification && notification.data) {
              const notificationId = notification.id || '';
              
              // Mark notification as read
              if (notificationId) {
                markAsRead(notificationId);
              }
              
              // Handle navigation based on notification type
              const notificationType = notification.data.type as NotificationType;
              const targetId = notification.data.targetId as string;
              
              // Navigation will be handled by the app's navigation system
              // This hook only marks the notification as read
            }
          }
        });
        
        // Store unsubscribers to clean up later
        unsubscribersRef.current = [unsubscribeOnMessage, unsubscribeNotifee];
        
        // Load existing notifications from storage
        await fetchNotifications();
      } catch (err) {
        console.error('Error initializing notifications:', err);
        setError('Failed to initialize notifications');
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
    
    // Cleanup function
    return () => {
      // Unsubscribe from all listeners
      unsubscribersRef.current.forEach(unsubscribe => unsubscribe());
    };
  }, []);
  
  // Handle authentication changes
  useEffect(() => {
    const handleAuthChange = async () => {
      if (authState.isAuthenticated && authState.user && hasPermission) {
        // Register device token when user logs in
        await registerDeviceToken();
      } else if (!authState.isAuthenticated) {
        // Unregister device token when user logs out
        await unregisterDeviceToken();
      }
    };
    
    handleAuthChange();
  }, [authState.isAuthenticated, authState.user, hasPermission]);
  
  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && authState.isAuthenticated && hasPermission) {
        // Refresh notifications when app comes to foreground
        fetchNotifications();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [authState.isAuthenticated, hasPermission, fetchNotifications]);
  
  // Refresh notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (authState.isAuthenticated) {
        fetchNotifications();
      }
      
      return () => {
        // No cleanup needed
      };
    }, [authState.isAuthenticated, fetchNotifications])
  );
  
  // Return the hook interface
  return {
    // State
    notifications,
    unreadCount,
    hasPermission,
    loading,
    error,
    
    // Methods
    requestPermission: requestNotificationPermission,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  };
};