//
//  AppDelegate.mm
//  AITalentMarketplace
//
//  Created for AI Talent Marketplace
//

#import "AppDelegate.h"

#import <React/RCTBridge.h>                      // React Native 0.72.x
#import <React/RCTBundleURLProvider.h>           // React Native 0.72.x
#import <React/RCTRootView.h>                    // React Native 0.72.x
#import <React/RCTLinkingManager.h>              // React Native 0.72.x
#import <UserNotifications/UserNotifications.h>  // iOS SDK
#import <React/RCTAppSetupUtils.h>               // React Native 0.72.x
#import <RCTDevLoadingView.h>                    // React Native 0.72.x
#import <FirebaseMessaging/FirebaseMessaging.h>  // Firebase ^10.12.0
#import <React/RCTConvert.h>                     // React Native 0.72.x

#import <FirebaseCore/FirebaseCore.h>
#import <React/RCTBridgeDelegate.h>
#import <UserNotifications/UNUserNotificationCenter.h>

// For biometric authentication integration
#import <LocalAuthentication/LocalAuthentication.h>  // iOS SDK

@interface AppDelegate () <FIRMessagingDelegate>
@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Setup debugging tools for development
  RCTAppSetupPrepareApp(application);
  
  // Configure Firebase for push notifications
  [FIRApp configure];
  [FIRMessaging messaging].delegate = self;
  
  // Request permission for push notifications
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;
  [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert |
                                          UNAuthorizationOptionSound |
                                          UNAuthorizationOptionBadge)
                        completionHandler:^(BOOL granted, NSError * _Nullable error) {
    if (granted) {
      NSLog(@"Push notification permission granted");
      dispatch_async(dispatch_get_main_queue(), ^{
        [application registerForRemoteNotifications];
      });
    } else {
      NSLog(@"Push notification permission denied: %@", error);
    }
  }];

  // Initialize React Native bridge
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  self.bridge = bridge;

#if RCT_DEV
  [bridge moduleForClass:[RCTDevLoadingView class]];
#endif
  
  // Create the React Native root view
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                                   moduleName:@"AITalentMarketplace"
                                            initialProperties:nil];

  if (@available(iOS 13.0, *)) {
    rootView.backgroundColor = [UIColor systemBackgroundColor];
  } else {
    rootView.backgroundColor = [UIColor whiteColor];
  }

  // Configure the main window
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  
  // Check biometric authentication availability
  [self checkBiometricAuthentication];
  
  return YES;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  // Handle deep linking by passing to RCTLinkingManager
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  // Forward device token to Firebase Messaging for push notification handling
  [FIRMessaging messaging].APNSToken = deviceToken;
  
  // Convert device token to string format for potential custom usage
  NSString *token = [self stringFromDeviceToken:deviceToken];
  NSLog(@"APNs device token: %@", token);
}

- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  NSLog(@"Failed to register for remote notifications: %@", error);
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center 
       willPresentNotification:(UNNotification *)notification 
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler
{
  // Extract notification data
  NSDictionary *userInfo = notification.request.content.userInfo;
  
  // Determine how to display the notification while app is in foreground
  UNNotificationPresentationOptions options = UNNotificationPresentationOptionNone;
  
  // In iOS 14 and above, we can use these options:
  if (@available(iOS 14.0, *)) {
    options = UNNotificationPresentationOptionBanner | 
              UNNotificationPresentationOptionSound | 
              UNNotificationPresentationOptionBadge;
  } else {
    // For iOS 12-13
    options = UNNotificationPresentationOptionAlert | 
              UNNotificationPresentationOptionSound | 
              UNNotificationPresentationOptionBadge;
  }
  
  // Customize based on notification type
  NSString *type = userInfo[@"type"];
  if ([type isEqualToString:@"job_match"]) {
    // Job matches are high priority - always show banner and play sound
    // No changes needed to default options
  } else if ([type isEqualToString:@"message"]) {
    // Message notifications - always show banner and play sound
    // No changes needed to default options
  } else if ([type isEqualToString:@"system"]) {
    // System notifications - may be less intrusive
    if (@available(iOS 14.0, *)) {
      options = UNNotificationPresentationOptionList;  // Show in notification center only
    } else {
      options = UNNotificationPresentationOptionBadge; // Just update badge in older iOS
    }
  }
  
  completionHandler(options);
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void(^)(void))completionHandler
{
  // Extract notification data
  NSDictionary *userInfo = response.notification.request.content.userInfo;
  
  // Handle navigation based on notification type
  NSString *type = userInfo[@"type"];
  NSString *actionId = response.actionIdentifier;
  
  // Pass notification data to JavaScript side for handling
  NSMutableDictionary *eventBody = [NSMutableDictionary dictionaryWithDictionary:userInfo];
  [eventBody setObject:actionId forKey:@"actionIdentifier"];
  
  // Send event to React Native
  [self.bridge.eventDispatcher sendAppEventWithName:@"NotificationOpened"
                                               body:eventBody];
  
  // If notification contains specific navigation data, handle it
  if ([type isEqualToString:@"job_match"]) {
    NSString *jobId = userInfo[@"job_id"];
    if (jobId) {
      // Handle job match notification navigation
      NSLog(@"Navigating to job match details: %@", jobId);
    }
  } else if ([type isEqualToString:@"message"]) {
    NSString *conversationId = userInfo[@"conversation_id"];
    if (conversationId) {
      // Handle message notification navigation
      NSLog(@"Navigating to message conversation: %@", conversationId);
    }
  }
  
  completionHandler();
}

- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity
 restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  // Handle universal links (deep linking via HTTPS URLs)
  if ([userActivity.activityType isEqualToString:NSUserActivityTypeBrowsingWeb]) {
    return [RCTLinkingManager application:application
                      continueUserActivity:userActivity
                        restorationHandler:restorationHandler];
  }
  return NO;
}

#pragma mark - FIRMessagingDelegate

- (void)messaging:(FIRMessaging *)messaging didReceiveRegistrationToken:(NSString *)fcmToken {
  NSLog(@"Firebase registration token: %@", fcmToken);
  
  // Store the token for sending to the AI Talent Marketplace server
  if (fcmToken) {
    // Send the token to the AI Talent Marketplace server
    // for associating with the user's account
    
    // Send the token to React Native for handling
    [self.bridge.eventDispatcher sendAppEventWithName:@"FCMTokenReceived"
                                                 body:@{@"token": fcmToken}];
  }
}

#pragma mark - Biometric Authentication

- (void)checkBiometricAuthentication {
  LAContext *context = [[LAContext alloc] init];
  NSError *error = nil;
  
  // Check if the device can perform biometric authentication
  if ([context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error]) {
    NSString *biometryType = @"biometrics";
    
    if (@available(iOS 11.0, *)) {
      switch (context.biometryType) {
        case LABiometryTypeFaceID:
          biometryType = @"faceId";
          break;
        case LABiometryTypeTouchID:
          biometryType = @"touchId";
          break;
        default:
          biometryType = @"none";
          break;
      }
    }
    
    // Store the biometry type for React Native to access
    [[NSUserDefaults standardUserDefaults] setObject:biometryType forKey:@"biometryType"];
    [[NSUserDefaults standardUserDefaults] synchronize];
    
    NSLog(@"Biometric authentication available: %@", biometryType);
  } else {
    // Biometric authentication not available
    NSLog(@"Biometric authentication not available: %@", error.localizedDescription);
    [[NSUserDefaults standardUserDefaults] setObject:@"none" forKey:@"biometryType"];
    [[NSUserDefaults standardUserDefaults] synchronize];
  }
}

#pragma mark - Helper Methods

// Helper method to convert device token to string format
- (NSString *)stringFromDeviceToken:(NSData *)deviceToken {
  NSUInteger length = deviceToken.length;
  if (length == 0) {
    return nil;
  }
  const unsigned char *buffer = deviceToken.bytes;
  NSMutableString *hexString = [NSMutableString stringWithCapacity:(length * 2)];
  for (int i = 0; i < length; ++i) {
    [hexString appendFormat:@"%02x", buffer[i]];
  }
  return [hexString copy];
}

@end