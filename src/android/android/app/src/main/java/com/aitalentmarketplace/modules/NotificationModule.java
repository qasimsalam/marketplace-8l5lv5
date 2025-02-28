package com.aitalentmarketplace.modules;

import com.facebook.react.bridge.ReactContextBaseJavaModule; // version 0.72.x
import com.facebook.react.bridge.ReactApplicationContext; // version 0.72.x
import com.facebook.react.bridge.ReactMethod; // version 0.72.x
import com.facebook.react.bridge.Promise; // version 0.72.x
import com.facebook.react.bridge.WritableMap; // version 0.72.x
import com.facebook.react.bridge.Arguments; // version 0.72.x
import com.facebook.react.bridge.ReadableMap; // version 0.72.x

import androidx.core.app.NotificationCompat; // version 1.10.1
import androidx.core.app.ActivityCompat; // version 1.10.1
import android.app.NotificationManager; // API level 33
import android.app.NotificationChannel; // API level 33
import android.app.NotificationChannelGroup; // API level 33
import android.app.PendingIntent; // API level 33
import android.content.Intent; // API level 33
import android.content.Context; // API level 33
import android.net.Uri; // API level 33
import android.os.Build; // API level 33
import android.provider.Settings; // API level 33
import android.util.Log; // API level 33

import com.google.firebase.messaging.FirebaseMessaging; // version 23.1.2
import com.google.firebase.messaging.FirebaseMessagingService; // version 23.1.2
import com.google.firebase.iid.FirebaseInstanceId; // version 23.1.2

import java.util.Random;
import java.util.concurrent.atomic.AtomicReference;

/**
 * NotificationModule is a React Native native module that provides comprehensive 
 * notification functionality for the AI Talent Marketplace Android app. It integrates 
 * with Firebase Cloud Messaging (FCM) for push notifications and Android's notification 
 * system for local notifications.
 */
public class NotificationModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "NotificationModule";
    private static final String CHANNEL_GROUP_ID = "ai_talent_marketplace";
    private static final String CHANNEL_GROUP_NAME = "AI Talent Marketplace";
    private static final String CHANNEL_ID_JOB_MATCHES = "job_matches";
    private static final String CHANNEL_ID_MESSAGES = "messages";
    private static final String CHANNEL_ID_PAYMENTS = "payments";
    private static final String CHANNEL_ID_GENERAL = "general";
    
    private ReactApplicationContext reactContext;
    private NotificationManager notificationManager;
    
    /**
     * Constructor for NotificationModule that initializes the module with ReactApplicationContext.
     * Sets up notification channels and initializes Firebase Messaging.
     *
     * @param reactContext The React Native application context
     */
    public NotificationModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        notificationManager = (NotificationManager) reactContext.getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannels();
        Log.d(TAG, "NotificationModule initialized");
    }
    
    /**
     * Required method that returns the name of the native module which will be used in JavaScript.
     *
     * @return The name of this module
     */
    @Override
    public String getName() {
        return "NotificationModule";
    }
    
    /**
     * Creates notification channels for Android 8.0+ (API level 26+).
     * Sets up channels for different notification types with appropriate importance levels.
     */
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Log.d(TAG, "Creating notification channels for Android O+");
            
            // Create channel group
            NotificationChannelGroup group = new NotificationChannelGroup(
                    CHANNEL_GROUP_ID,
                    CHANNEL_GROUP_NAME
            );
            notificationManager.createNotificationChannelGroup(group);
            
            // Job Matches channel - high importance
            NotificationChannel jobMatchesChannel = new NotificationChannel(
                    CHANNEL_ID_JOB_MATCHES,
                    "Job Matches",
                    NotificationManager.IMPORTANCE_HIGH
            );
            jobMatchesChannel.setDescription("Notifications for new job matches and opportunities");
            jobMatchesChannel.setGroup(CHANNEL_GROUP_ID);
            jobMatchesChannel.enableVibration(true);
            jobMatchesChannel.enableLights(true);
            
            // Messages channel - high importance
            NotificationChannel messagesChannel = new NotificationChannel(
                    CHANNEL_ID_MESSAGES,
                    "Messages",
                    NotificationManager.IMPORTANCE_HIGH
            );
            messagesChannel.setDescription("Notifications for new messages and communications");
            messagesChannel.setGroup(CHANNEL_GROUP_ID);
            messagesChannel.enableVibration(true);
            messagesChannel.enableLights(true);
            
            // Payments channel - high importance
            NotificationChannel paymentsChannel = new NotificationChannel(
                    CHANNEL_ID_PAYMENTS,
                    "Payments",
                    NotificationManager.IMPORTANCE_HIGH
            );
            paymentsChannel.setDescription("Notifications for payment updates and transactions");
            paymentsChannel.setGroup(CHANNEL_GROUP_ID);
            paymentsChannel.enableVibration(true);
            paymentsChannel.enableLights(true);
            
            // General channel - default importance
            NotificationChannel generalChannel = new NotificationChannel(
                    CHANNEL_ID_GENERAL,
                    "General",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            generalChannel.setDescription("General notifications from AI Talent Marketplace");
            generalChannel.setGroup(CHANNEL_GROUP_ID);
            
            // Register all channels
            notificationManager.createNotificationChannel(jobMatchesChannel);
            notificationManager.createNotificationChannel(messagesChannel);
            notificationManager.createNotificationChannel(paymentsChannel);
            notificationManager.createNotificationChannel(generalChannel);
            
            Log.d(TAG, "Notification channels created successfully");
        }
    }
    
    /**
     * Retrieves the current notification settings for the app.
     * Returns enabled status for the app overall and for each notification channel.
     *
     * @param promise Promise to resolve with notification settings info
     */
    @ReactMethod
    public void getNotificationSettings(Promise promise) {
        try {
            Log.d(TAG, "Getting notification settings");
            WritableMap settings = Arguments.createMap();
            boolean notificationsEnabled = areNotificationsEnabledInternal();
            
            settings.putBoolean("enabled", notificationsEnabled);
            WritableMap channels = Arguments.createMap();
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // For Android 8.0+, check each channel
                NotificationChannel jobChannel = notificationManager.getNotificationChannel(CHANNEL_ID_JOB_MATCHES);
                NotificationChannel messagesChannel = notificationManager.getNotificationChannel(CHANNEL_ID_MESSAGES);
                NotificationChannel paymentsChannel = notificationManager.getNotificationChannel(CHANNEL_ID_PAYMENTS);
                NotificationChannel generalChannel = notificationManager.getNotificationChannel(CHANNEL_ID_GENERAL);
                
                channels.putBoolean("job_matches", jobChannel != null && 
                        jobChannel.getImportance() != NotificationManager.IMPORTANCE_NONE);
                channels.putBoolean("messages", messagesChannel != null && 
                        messagesChannel.getImportance() != NotificationManager.IMPORTANCE_NONE);
                channels.putBoolean("payments", paymentsChannel != null && 
                        paymentsChannel.getImportance() != NotificationManager.IMPORTANCE_NONE);
                channels.putBoolean("general", generalChannel != null && 
                        generalChannel.getImportance() != NotificationManager.IMPORTANCE_NONE);
            } else {
                // For older Android versions, assume all channels are enabled if app notifications are enabled
                channels.putBoolean("job_matches", notificationsEnabled);
                channels.putBoolean("messages", notificationsEnabled);
                channels.putBoolean("payments", notificationsEnabled);
                channels.putBoolean("general", notificationsEnabled);
            }
            
            settings.putMap("channels", channels);
            promise.resolve(settings);
        } catch (Exception e) {
            Log.e(TAG, "Error getting notification settings: " + e.getMessage(), e);
            promise.reject("notification_settings_error", "Failed to get notification settings", e);
        }
    }
    
    /**
     * Registers the device for Firebase Cloud Messaging push notifications.
     * Retrieves the FCM token and subscribes to the 'all' topic.
     *
     * @param promise Promise to resolve with the FCM token
     */
    @ReactMethod
    public void registerForPushNotifications(Promise promise) {
        Log.d(TAG, "Registering for push notifications");
        try {
            FirebaseMessaging.getInstance().getToken()
                    .addOnCompleteListener(task -> {
                        if (!task.isSuccessful()) {
                            Log.e(TAG, "Failed to get Firebase token", task.getException());
                            promise.reject("fcm_token_error", "Failed to get Firebase token", task.getException());
                            return;
                        }
                        
                        String token = task.getResult();
                        Log.d(TAG, "Firebase token retrieved: " + token);
                        
                        // Subscribe to a topic for general notifications
                        FirebaseMessaging.getInstance().subscribeToTopic("all")
                                .addOnCompleteListener(topicTask -> {
                                    if (!topicTask.isSuccessful()) {
                                        Log.w(TAG, "Failed to subscribe to 'all' topic", topicTask.getException());
                                    } else {
                                        Log.d(TAG, "Subscribed to 'all' topic");
                                    }
                                    
                                    // Resolve with token regardless of topic subscription
                                    promise.resolve(token);
                                });
                    });
        } catch (Exception e) {
            Log.e(TAG, "Error registering for push notifications: " + e.getMessage(), e);
            promise.reject("push_registration_error", "Failed to register for push notifications", e);
        }
    }
    
    /**
     * Retrieves the current Firebase Cloud Messaging token for the device.
     *
     * @param promise Promise to resolve with the FCM token
     */
    @ReactMethod
    public void getFirebaseToken(Promise promise) {
        Log.d(TAG, "Getting Firebase token");
        try {
            FirebaseMessaging.getInstance().getToken()
                    .addOnCompleteListener(task -> {
                        if (!task.isSuccessful()) {
                            Log.e(TAG, "Failed to get Firebase token", task.getException());
                            promise.reject("fcm_token_error", "Failed to get Firebase token", task.getException());
                            return;
                        }
                        
                        String token = task.getResult();
                        Log.d(TAG, "Firebase token retrieved: " + token);
                        promise.resolve(token);
                    });
        } catch (Exception e) {
            Log.e(TAG, "Error getting Firebase token: " + e.getMessage(), e);
            promise.reject("fcm_token_error", "Failed to get Firebase token", e);
        }
    }
    
    /**
     * Creates and displays a local notification.
     * Supports different notification channels and custom actions.
     *
     * @param notificationData Map containing notification details (title, body, channelId, data)
     * @param promise Promise to resolve with the notification ID
     */
    @ReactMethod
    public void createLocalNotification(ReadableMap notificationData, Promise promise) {
        try {
            Log.d(TAG, "Creating local notification");
            
            // Extract notification data
            String title = notificationData.hasKey("title") ? notificationData.getString("title") : "AI Talent Marketplace";
            String body = notificationData.hasKey("body") ? notificationData.getString("body") : "";
            String channelId = notificationData.hasKey("channelId") ? notificationData.getString("channelId") : CHANNEL_ID_GENERAL;
            ReadableMap data = notificationData.hasKey("data") ? notificationData.getMap("data") : null;
            
            // Create a unique notification ID
            int notificationId = (int) (System.currentTimeMillis() % Integer.MAX_VALUE);
            
            // Create an intent for when the notification is tapped
            Intent intent = new Intent(reactContext, reactContext.getCurrentActivity().getClass());
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            
            // Add any custom data to the intent
            if (data != null) {
                intent.putExtra("notificationData", data.toString());
            }
            
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    reactContext,
                    notificationId,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            
            // Build the notification
            NotificationCompat.Builder builder = new NotificationCompat.Builder(reactContext, channelId)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setSmallIcon(reactContext.getResources().getIdentifier(
                            "ic_notification", "drawable", reactContext.getPackageName()))
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true);
            
            // Add actions if specified
            if (notificationData.hasKey("actions")) {
                ReadableMap actions = notificationData.getMap("actions");
                
                if (actions.hasKey("view") && actions.getBoolean("view")) {
                    builder.addAction(
                            android.R.drawable.ic_menu_view,
                            "View",
                            pendingIntent
                    );
                }
                
                if (actions.hasKey("dismiss") && actions.getBoolean("dismiss")) {
                    Intent dismissIntent = new Intent(reactContext, DismissNotificationReceiver.class);
                    dismissIntent.putExtra("notificationId", notificationId);
                    PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
                            reactContext,
                            (int) (Math.random() * Integer.MAX_VALUE),
                            dismissIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    
                    builder.addAction(
                            android.R.drawable.ic_menu_close_clear_cancel,
                            "Dismiss",
                            dismissPendingIntent
                    );
                }
            }
            
            // Set priority based on channel
            if (CHANNEL_ID_JOB_MATCHES.equals(channelId) || 
                CHANNEL_ID_MESSAGES.equals(channelId) || 
                CHANNEL_ID_PAYMENTS.equals(channelId)) {
                builder.setPriority(NotificationCompat.PRIORITY_HIGH);
            } else {
                builder.setPriority(NotificationCompat.PRIORITY_DEFAULT);
            }
            
            // Show the notification
            notificationManager.notify(notificationId, builder.build());
            Log.d(TAG, "Local notification created with ID: " + notificationId);
            
            promise.resolve(notificationId);
        } catch (Exception e) {
            Log.e(TAG, "Error creating local notification: " + e.getMessage(), e);
            promise.reject("notification_error", "Failed to create local notification", e);
        }
    }
    
    /**
     * Cancels a specific notification by ID.
     *
     * @param notificationId ID of the notification to cancel
     * @param promise Promise to resolve with success status
     */
    @ReactMethod
    public void cancelNotification(int notificationId, Promise promise) {
        try {
            Log.d(TAG, "Cancelling notification with ID: " + notificationId);
            notificationManager.cancel(notificationId);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling notification: " + e.getMessage(), e);
            promise.reject("cancel_notification_error", "Failed to cancel notification", e);
        }
    }
    
    /**
     * Cancels all pending notifications.
     *
     * @param promise Promise to resolve with success status
     */
    @ReactMethod
    public void cancelAllNotifications(Promise promise) {
        try {
            Log.d(TAG, "Cancelling all notifications");
            notificationManager.cancelAll();
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling all notifications: " + e.getMessage(), e);
            promise.reject("cancel_notifications_error", "Failed to cancel all notifications", e);
        }
    }
    
    /**
     * Opens the app's notification settings screen.
     * Uses appropriate settings Intent based on Android version.
     *
     * @param promise Promise to resolve with success status
     */
    @ReactMethod
    public void openNotificationSettings(Promise promise) {
        try {
            Log.d(TAG, "Opening notification settings");
            Intent intent;
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // For Android 8.0+
                intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.getPackageName());
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                // For Android 5.0-7.1
                intent = new Intent("android.settings.APP_NOTIFICATION_SETTINGS")
                        .putExtra("app_package", reactContext.getPackageName())
                        .putExtra("app_uid", reactContext.getApplicationInfo().uid);
            } else {
                // For older versions
                intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                        .setData(Uri.parse("package:" + reactContext.getPackageName()));
            }
            
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error opening notification settings: " + e.getMessage(), e);
            promise.reject("settings_error", "Failed to open notification settings", e);
        }
    }
    
    /**
     * Checks if notifications are enabled for the app.
     *
     * @param promise Promise to resolve with boolean result
     */
    @ReactMethod
    public void areNotificationsEnabled(Promise promise) {
        try {
            boolean enabled = areNotificationsEnabledInternal();
            Log.d(TAG, "Notifications enabled: " + enabled);
            promise.resolve(enabled);
        } catch (Exception e) {
            Log.e(TAG, "Error checking if notifications are enabled: " + e.getMessage(), e);
            promise.reject("notification_check_error", "Failed to check notification status", e);
        }
    }
    
    /**
     * Internal method to check if notifications are enabled.
     * 
     * @return boolean indicating if notifications are enabled
     */
    private boolean areNotificationsEnabledInternal() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            return notificationManager.areNotificationsEnabled();
        } else {
            // For older versions, we can't reliably check, so assume enabled
            return true;
        }
    }
    
    /**
     * Subscribes the device to a Firebase Cloud Messaging topic.
     *
     * @param topic Topic name to subscribe to
     * @param promise Promise to resolve with success status
     */
    @ReactMethod
    public void subscribeToTopic(String topic, Promise promise) {
        try {
            Log.d(TAG, "Subscribing to topic: " + topic);
            FirebaseMessaging.getInstance().subscribeToTopic(topic)
                    .addOnCompleteListener(task -> {
                        if (!task.isSuccessful()) {
                            Log.e(TAG, "Failed to subscribe to topic: " + topic, task.getException());
                            promise.reject("topic_subscription_error", 
                                    "Failed to subscribe to topic: " + topic, task.getException());
                            return;
                        }
                        
                        Log.d(TAG, "Successfully subscribed to topic: " + topic);
                        promise.resolve(true);
                    });
        } catch (Exception e) {
            Log.e(TAG, "Error subscribing to topic: " + e.getMessage(), e);
            promise.reject("topic_subscription_error", "Failed to subscribe to topic", e);
        }
    }
    
    /**
     * Unsubscribes the device from a Firebase Cloud Messaging topic.
     *
     * @param topic Topic name to unsubscribe from
     * @param promise Promise to resolve with success status
     */
    @ReactMethod
    public void unsubscribeFromTopic(String topic, Promise promise) {
        try {
            Log.d(TAG, "Unsubscribing from topic: " + topic);
            FirebaseMessaging.getInstance().unsubscribeFromTopic(topic)
                    .addOnCompleteListener(task -> {
                        if (!task.isSuccessful()) {
                            Log.e(TAG, "Failed to unsubscribe from topic: " + topic, task.getException());
                            promise.reject("topic_unsubscription_error", 
                                    "Failed to unsubscribe from topic: " + topic, task.getException());
                            return;
                        }
                        
                        Log.d(TAG, "Successfully unsubscribed from topic: " + topic);
                        promise.resolve(true);
                    });
        } catch (Exception e) {
            Log.e(TAG, "Error unsubscribing from topic: " + e.getMessage(), e);
            promise.reject("topic_unsubscription_error", "Failed to unsubscribe from topic", e);
        }
    }
    
    /**
     * Helper BroadcastReceiver class for dismissing notifications.
     * This is used by the "Dismiss" action in notifications.
     */
    public static class DismissNotificationReceiver extends android.content.BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            int notificationId = intent.getIntExtra("notificationId", -1);
            if (notificationId != -1) {
                NotificationManager notificationManager = 
                        (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                notificationManager.cancel(notificationId);
            }
        }
    }
}