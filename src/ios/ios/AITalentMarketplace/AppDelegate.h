//
//  AppDelegate.h
//  AITalentMarketplace
//
//  Created for AI Talent Marketplace
//

#import <UIKit/UIKit.h>                         // iOS SDK
#import <React/RCTBridgeDelegate.h>             // React Native 0.72.x
#import <UserNotifications/UserNotifications.h> // iOS SDK

@interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate, UNUserNotificationCenterDelegate>

@property (nonatomic, strong) UIWindow *window;
@property (nonatomic, strong) RCTBridge *bridge;

/**
 * Called when the application launches to initialize React Native and configure system services
 * Sets up notification handling, deep linking, and biometric authentication support
 */
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions;

/**
 * Provides the URL for the JavaScript bundle
 * Returns either a local URL for debug or a pre-bundled URL for release
 */
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge;

/**
 * Called when the app successfully registers for push notifications
 * Handles device token registration for real-time job and message notifications
 */
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken;

/**
 * Called when the app fails to register for push notifications
 * Handles error logging and fallback mechanisms
 */
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error;

/**
 * Handles opening the app from external URLs (deep linking)
 * Supports integration with HR systems and external tools
 */
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options;

@end