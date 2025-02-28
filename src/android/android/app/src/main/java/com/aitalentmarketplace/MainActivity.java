package com.aitalentmarketplace;

import com.facebook.react.ReactActivity; // v0.72.x
import com.facebook.react.defaults.DefaultReactActivityDelegate; // v0.72.x
import com.aitalentmarketplace.BuildConfig;
import android.os.Bundle;
import android.content.Intent;
import org.devio.rn.splashscreen.SplashScreen; // v3.3.0

/**
 * Main activity class that serves as the entry point for the AI Talent Marketplace Android application.
 * Responsible for initializing React Native components, handling the splash screen,
 * configuring deep links, and managing biometric authentication integration.
 */
public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript that will be used as the main component.
   * This matches the component name defined in index.js.
   *
   * @return the name of the main component ("AITalentMarketplace")
   */
  @Override
  protected String getMainComponentName() {
    return "AITalentMarketplace";
  }

  /**
   * Called when the activity is first created. Sets up the splash screen and initializes the React Native activity.
   * The splash screen is shown before React Native initialization to provide immediate visual feedback.
   *
   * @param savedInstanceState Bundle containing the activity's previously saved state
   */
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    // Show splash screen before React Native initialization
    SplashScreen.show(this);
    super.onCreate(savedInstanceState);
    // Note: Biometric authentication integration is configured in the React Native layer
    // through the react-native-biometrics library and is triggered by JS code
  }

  /**
   * Returns the instance of the ReactActivityDelegate that provides specific customized settings for this activity.
   * Configures with Fabric and Concurrent React (new architecture) settings if enabled.
   *
   * @return A custom delegate for controlling React Native behavior
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
      this,
      getMainComponentName(),
      // If you opted-in for the New Architecture, we enable the Fabric Renderer
      // This is controlled by the IS_NEW_ARCHITECTURE_ENABLED flag in gradle.properties
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
    );
  }

  /**
   * Called when a new intent is received, handles deep linking to support seamless transitions 
   * between web and mobile platforms.
   * 
   * This enables the app to respond to links like aitalentmarketplace://job/{jobId} or
   * https://aitalentmarketplace.com/profile/{profileId}
   *
   * @param intent The new intent instance containing information about the deep link
   */
  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    // The actual deep link routing is handled in the JavaScript layer
  }
}