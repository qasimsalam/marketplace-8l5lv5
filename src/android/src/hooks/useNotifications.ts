/**
 * Custom React hook for managing notifications in the AI Talent Marketplace Android app
 * 
 * This hook provides functionality for managing push notifications, handling notification
 * permissions, storing notification preferences, and methods for channel management.
 * 
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react'; // react ^18.2.0
import { NativeModules, Platform } from 'react-native'; // react-native ^0.72.3
import { useDispatch, useSelector } from 'react-redux'; // react-redux ^8.1.1
import { useFocusEffect } from '@react-navigation/native'; // @react-navigation/native ^6.1.7
import messaging from '@react-native-firebase/messaging'; // @react-native-firebase/messaging ^18.3.0
import PushNotification from 'react-native-push-notification'; // react-native-push-notification ^8.1.1
import PushNotificationIOS from '@react-native-community/push-notification-ios'; // @react-native-community/push-notification-ios ^1.11.0

// Internal imports
import { 
  checkNotificationPermission,
  requestNotificationPermission,
  openAppSettings
} from '../utils/permissions';
import { 
  saveUserPreferences,
  getUserPreferences
} from '../lib/storage';
import { AndroidNotificationPayload } from '../types/message.types';
import { useAuth } from './useAuth';

// Native Modules
const NotificationModule = NativeModules.NotificationModule;

// Default notification channel preferences
const DEFAULT_CHANNELS = {
  JOB_MATCHES: true,
  MESSAGES: true,
  PAYMENTS: true,
  GENERAL: true
};

/**
 * Enumeration of notification channel types 
 */
export enum NotificationChannelType {
  JOB_MATCHES = 'job_matches',
  MESSAGES = 'messages',
  PAYMENTS = 'payments',
  GENERAL = 'general'
}

/**
 * Enumeration of notification importance levels for Android
 */
export enum NotificationImportance {
  HIGH = 'high',
  DEFAULT = 'default',
  LOW = 'low',
  MIN = 'min'
}

/**
 * Interface for notification preferences
 */
export interface NotificationPreferences {
  channels: Record<NotificationChannelType, boolean>;
  showBadge: boolean;
  sound: boolean;
  vibration: boolean;
}

/**
 * Custom hook for managing notifications in the Android application
 * 
 * @returns Object containing notification state and methods
 */
export function useNotifications() {
  // Access authentication state
  const { authState } = useAuth();
  
  // State for notification settings
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    channels: {
      [NotificationChannelType.JOB_MATCHES]: DEFAULT_CHANNELS.JOB_MATCHES,
      [NotificationChannelType.MESSAGES]: DEFAULT_CHANNELS.MESSAGES,
      [NotificationChannelType.PAYMENTS]: DEFAULT_CHANNELS.PAYMENTS,
      [NotificationChannelType.GENERAL]: DEFAULT_CHANNELS.GENERAL
    },
    showBadge: true,
    sound: true,
    vibration: true
  });
  
  // Refs for notification listeners
  const notificationListeners = useRef<Array<() => void>>([]);
  
  /**
   * Initializes Firebase Messaging and notification channels
   */
  const initializeNotifications = useCallback(async () => {
    try {
      // Check if notifications are already initialized
      if (isInitialized) {
        return;
      }
      
      // Initialize the notification service for Android
      PushNotification.configure({
        // Called when a remote or local notification is opened or received
        onNotification: function(notification) {
          console.log('NOTIFICATION:', notification);
          
          // Required on iOS only
          if (Platform.OS === 'ios') {
            notification.finish(PushNotificationIOS.FetchResult.NoData);
          }
        },
        
        // Called when the user registers for remote notifications
        onRegister: function(token) {
          console.log('TOKEN:', token);
          setFcmToken(token.token);
        },
        
        // Called when the user fails to register for remote notifications
        onRegistrationError: function(err) {
          console.error('Registration Error:', err.message, err);
        },
        
        // Should the initial notification be popped automatically?
        popInitialNotification: true,
        
        // Request permissions for notifications
        requestPermissions: false,
      });
      
      // Create notification channels for Android
      if (NotificationModule && NotificationModule.createNotificationChannels) {
        NotificationModule.createNotificationChannels();
      } else {
        // Fallback to PushNotification for channel creation
        PushNotification.createChannel(
          {
            channelId: NotificationChannelType.JOB_MATCHES,
            channelName: 'Job Matches',
            channelDescription: 'Notifications for new job matches and recommendations',
            playSound: preferences.sound,
            soundName: 'default',
            importance: 4, // High importance
            vibrate: preferences.vibration,
          },
          (created) => console.log(`Created job matches channel: ${created}`)
        );
        
        PushNotification.createChannel(
          {
            channelId: NotificationChannelType.MESSAGES,
            channelName: 'Messages',
            channelDescription: 'Notifications for chat messages',
            playSound: preferences.sound,
            soundName: 'default',
            importance: 4, // High importance
            vibrate: preferences.vibration,
          },
          (created) => console.log(`Created messages channel: ${created}`)
        );
        
        PushNotification.createChannel(
          {
            channelId: NotificationChannelType.PAYMENTS,
            channelName: 'Payments',
            channelDescription: 'Notifications for payments, milestones, and contracts',
            playSound: preferences.sound,
            soundName: 'default',
            importance: 3, // Default importance
            vibrate: preferences.vibration,
          },
          (created) => console.log(`Created payments channel: ${created}`)
        );
        
        PushNotification.createChannel(
          {
            channelId: NotificationChannelType.GENERAL,
            channelName: 'General',
            channelDescription: 'General notifications',
            playSound: preferences.sound,
            soundName: 'default',
            importance: 3, // Default importance
            vibrate: preferences.vibration,
          },
          (created) => console.log(`Created general channel: ${created}`)
        );
      }
      
      // Check notification permission
      const permissionStatus = await checkNotificationPermission();
      setHasPermission(permissionStatus);
      
      // Get saved notification preferences
      const savedPreferences = await getUserPreferences() as any;
      if (savedPreferences && savedPreferences.notifications) {
        setPreferences(savedPreferences.notifications);
      }
      
      // Initialize Firebase Messaging
      await messaging().registerDeviceForRemoteMessages();
      
      // Request permission for Firebase Messaging (required on iOS)
      if (Platform.OS === 'ios') {
        await messaging().requestPermission();
      }
      
      // Get FCM token
      const token = await messaging().getToken();
      if (token) {
        setFcmToken(token);
        console.log('FCM Token:', token);
      }
      
      // Listen for token refresh
      const tokenRefreshListener = messaging().onTokenRefresh((newToken) => {
        setFcmToken(newToken);
        console.log('FCM Token refreshed:', newToken);
        
        // Register the new token with backend if user is authenticated
        if (authState.isAuthenticated && authState.user) {
          registerDevice();
        }
      });
      notificationListeners.current.push(tokenRefreshListener);
      
      // Setup foreground notification handler
      const foregroundListener = messaging().onMessage(async (remoteMessage) => {
        console.log('Foreground Message received:', remoteMessage);
        
        // Extract notification data
        const { notification, data } = remoteMessage;
        
        // Check channel preferences before displaying
        const channelId = data?.channelId || NotificationChannelType.GENERAL;
        if (preferences.channels[channelId as NotificationChannelType]) {
          // Display local notification
          displayLocalNotification(
            notification?.title || 'New Notification',
            notification?.body || '',
            channelId,
            data
          );
        }
      });
      notificationListeners.current.push(foregroundListener);
      
      // Setup background notification handler
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('Background Message received:', remoteMessage);
        // Firebase handles display of the notification in the background,
        // we don't need to create a local notification here
        return Promise.resolve();
      });
      
      // Ready!
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }, [isInitialized, preferences, authState.isAuthenticated, authState.user]);
  
  /**
   * Requests notification permission from the user
   * 
   * @returns Promise resolving to true if permission granted
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Request notification permission
      const granted = await requestNotificationPermission();
      setHasPermission(granted);
      
      if (granted) {
        // If permission granted, register device for push notifications
        await registerDevice();
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);
  
  /**
   * Registers the device with backend for push notifications
   * 
   * @returns Promise resolving to true if registration successful
   */
  const registerDevice = useCallback(async (): Promise<boolean> => {
    try {
      // Check if user is authenticated and FCM token is available
      if (!authState.isAuthenticated || !authState.user || !fcmToken) {
        console.warn('Cannot register device: user not authenticated or FCM token not available');
        return false;
      }
      
      // TODO: Call backend API to register device token
      // Example:
      // const response = await api.post('/notifications/register-device', {
      //   userId: authState.user.id,
      //   token: fcmToken,
      //   platform: 'android',
      //   deviceInfo: {
      //     model: Platform.constants.Model,
      //     osVersion: Platform.Version
      //   }
      // });
      
      console.log('Device registered for push notifications');
      return true;
    } catch (error) {
      console.error('Error registering device for push notifications:', error);
      return false;
    }
  }, [authState.isAuthenticated, authState.user, fcmToken]);
  
  /**
   * Opens device notification settings
   * 
   * @returns Promise resolving when settings are opened
   */
  const openNotificationSettings = useCallback(async (): Promise<void> => {
    try {
      await openAppSettings();
    } catch (error) {
      console.error('Error opening notification settings:', error);
    }
  }, []);
  
  /**
   * Updates preference for a specific notification channel
   * 
   * @param channel Notification channel to update
   * @param enabled Whether the channel should be enabled
   * @returns Promise resolving when preference is updated
   */
  const updateChannelPreference = useCallback(async (
    channel: NotificationChannelType, 
    enabled: boolean
  ): Promise<void> => {
    try {
      // Update local state
      const updatedPreferences = {
        ...preferences,
        channels: {
          ...preferences.channels,
          [channel]: enabled
        }
      };
      setPreferences(updatedPreferences);
      
      // Save to storage
      await saveUserPreferences({
        notifications: updatedPreferences
      });
      
      // Update native channel if possible
      if (NotificationModule && NotificationModule.updateChannelEnabled) {
        NotificationModule.updateChannelEnabled(channel, enabled);
      }
    } catch (error) {
      console.error('Error updating channel preference:', error);
    }
  }, [preferences]);
  
  /**
   * Updates all notification preferences
   * 
   * @param newPreferences New notification preferences
   * @returns Promise resolving when preferences are updated
   */
  const updateAllPreferences = useCallback(async (
    newPreferences: NotificationPreferences
  ): Promise<void> => {
    try {
      // Update local state
      setPreferences(newPreferences);
      
      // Save to storage
      await saveUserPreferences({
        notifications: newPreferences
      });
      
      // Update native channel settings if possible
      if (NotificationModule && NotificationModule.updateChannelSettings) {
        Object.entries(newPreferences.channels).forEach(([channel, enabled]) => {
          NotificationModule.updateChannelEnabled(channel, enabled);
        });
        
        NotificationModule.updateChannelSettings({
          sound: newPreferences.sound,
          vibration: newPreferences.vibration,
          showBadge: newPreferences.showBadge
        });
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  }, []);
  
  /**
   * Displays a local notification
   * 
   * @param title Notification title
   * @param body Notification body
   * @param channelId Notification channel ID
   * @param data Optional data payload
   * @returns Promise resolving to notification ID
   */
  const displayLocalNotification = useCallback(async (
    title: string,
    body: string,
    channelId: string,
    data?: object
  ): Promise<number> => {
    return new Promise((resolve) => {
      const notificationId = Math.floor(Math.random() * 1000000);
      
      PushNotification.localNotification({
        id: notificationId,
        channelId: channelId,
        title: title,
        message: body,
        playSound: preferences.sound,
        soundName: 'default',
        vibrate: preferences.vibration,
        vibration: 300,
        priority: 'high',
        visibility: 'private',
        data: data || {},
        userInteraction: false,
        autoCancel: true,
        largeIcon: 'ic_launcher',
        smallIcon: 'ic_notification',
        actions: ['View', 'Dismiss']
      });
      
      resolve(notificationId);
    });
  }, [preferences]);
  
  /**
   * Cancels a specific notification
   * 
   * @param notificationId ID of the notification to cancel
   * @returns Promise resolving when notification is canceled
   */
  const cancelNotification = useCallback(async (notificationId: number): Promise<void> => {
    PushNotification.cancelLocalNotification(String(notificationId));
  }, []);
  
  /**
   * Cancels all pending notifications
   * 
   * @returns Promise resolving when all notifications are canceled
   */
  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    PushNotification.cancelAllLocalNotifications();
  }, []);
  
  /**
   * Gets the notification that launched the app
   * 
   * @returns Promise resolving to initial notification payload or null
   */
  const getInitialNotification = useCallback(async (): Promise<AndroidNotificationPayload | null> => {
    try {
      // Check for notification that launched the app from Firebase Messaging
      const initialNotification = await messaging().getInitialNotification();
      
      if (initialNotification) {
        const { notification, data } = initialNotification;
        
        const payload: AndroidNotificationPayload = {
          title: notification?.title || '',
          body: notification?.body || '',
          conversationId: data?.conversationId || '',
          messageId: data?.messageId || '',
          senderId: data?.senderId || '',
          channelId: data?.channelId || NotificationChannelType.GENERAL,
          priority: data?.priority || 'default'
        };
        
        return payload;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting initial notification:', error);
      return null;
    }
  }, []);
  
  /**
   * Refreshes notification settings from device
   * 
   * @returns Promise resolving when settings are refreshed
   */
  const refreshNotificationSettings = useCallback(async (): Promise<void> => {
    try {
      // Check notification permission
      const permissionStatus = await checkNotificationPermission();
      setHasPermission(permissionStatus);
      
      // Get saved notification preferences
      const savedPreferences = await getUserPreferences() as any;
      if (savedPreferences && savedPreferences.notifications) {
        setPreferences(savedPreferences.notifications);
      }
      
      // Refresh FCM token if needed
      if (!fcmToken) {
        const token = await messaging().getToken();
        if (token) {
          setFcmToken(token);
        }
      }
    } catch (error) {
      console.error('Error refreshing notification settings:', error);
    }
  }, [fcmToken]);
  
  // Initialize notifications on component mount
  useEffect(() => {
    initializeNotifications();
    
    // Cleanup function to remove all listeners
    return () => {
      notificationListeners.current.forEach(unsubscribe => unsubscribe());
      notificationListeners.current = [];
      
      // Cleanup push notification service
      PushNotification.unregister();
    };
  }, [initializeNotifications]);
  
  // Re-register device when authentication status changes
  useEffect(() => {
    if (authState.isAuthenticated && authState.user && fcmToken && isInitialized) {
      registerDevice();
    }
  }, [authState.isAuthenticated, authState.user, fcmToken, isInitialized, registerDevice]);
  
  // Check notification settings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshNotificationSettings();
    }, [refreshNotificationSettings])
  );
  
  // Return the hook API
  return {
    hasPermission,
    isInitialized,
    fcmToken,
    preferences,
    requestPermission,
    registerDevice,
    openNotificationSettings,
    updateChannelPreference,
    updateAllPreferences,
    displayLocalNotification,
    cancelNotification,
    cancelAllNotifications,
    getInitialNotification,
    refreshNotificationSettings
  };
}