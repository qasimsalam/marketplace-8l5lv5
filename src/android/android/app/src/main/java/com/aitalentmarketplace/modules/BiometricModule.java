package com.aitalentmarketplace.modules;

import com.facebook.react.bridge.ReactContextBaseJavaModule; // React Native 0.72.x
import com.facebook.react.bridge.ReactApplicationContext; // React Native 0.72.x
import com.facebook.react.bridge.ReactMethod; // React Native 0.72.x
import com.facebook.react.bridge.Promise; // React Native 0.72.x
import com.facebook.react.bridge.ReadableMap; // React Native 0.72.x

import androidx.biometric.BiometricPrompt; // androidx.biometric:biometric:1.2.0-alpha05
import androidx.biometric.BiometricManager; // androidx.biometric:biometric:1.2.0-alpha05
import androidx.fragment.app.FragmentActivity; // androidx.fragment:fragment:1.5.5

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

/**
 * React Native module that provides biometric authentication capabilities for the Android app.
 * This module leverages Android's BiometricPrompt API to securely authenticate users using
 * fingerprint or face recognition, supporting the platform's security requirements and
 * integrating with the app's authentication flow.
 */
public class BiometricModule extends ReactContextBaseJavaModule {
    private static final String TAG = "BiometricModule";
    
    private final ReactApplicationContext reactContext;
    private final Executor executor;

    /**
     * Constructor for BiometricModule
     * 
     * @param reactContext The React Native application context
     */
    public BiometricModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.executor = Executors.newSingleThreadExecutor();
    }

    /**
     * Returns the name of this module for React Native
     * 
     * @return Name of the module
     */
    @Override
    public String getName() {
        return "BiometricModule";
    }

    /**
     * Checks if biometric authentication is available on the device
     * 
     * @param promise Promise to resolve/reject with the result
     */
    @ReactMethod
    public void isBiometricAvailable(Promise promise) {
        try {
            BiometricManager biometricManager = BiometricManager.from(reactContext);
            
            // Check for strong biometric authentication (fingerprint, face unlock, etc.)
            int canAuthenticate = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
            
            switch (canAuthenticate) {
                case BiometricManager.BIOMETRIC_SUCCESS:
                    // Biometric features are available and ready for use
                    promise.resolve(true);
                    break;
                case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                    // No biometric features available on this device
                    Log.d(TAG, "No biometric features available on this device");
                    promise.resolve(false);
                    break;
                case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                    // Biometric features are currently unavailable
                    Log.d(TAG, "Biometric features are currently unavailable");
                    promise.resolve(false);
                    break;
                case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                    // The user hasn't enrolled any biometrics
                    Log.d(TAG, "No biometrics enrolled on this device");
                    promise.resolve(false);
                    break;
                case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                    // Biometric authentication isn't available due to security vulnerability
                    Log.d(TAG, "Biometric authentication unavailable due to security vulnerability");
                    promise.resolve(false);
                    break;
                case BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED:
                    // Unknown error or unsupported device
                    Log.d(TAG, "Unknown biometric error or unsupported device");
                    promise.resolve(false);
                    break;
                case BiometricManager.BIOMETRIC_STATUS_UNKNOWN:
                    // Status unknown
                    Log.d(TAG, "Biometric status unknown");
                    promise.resolve(false);
                    break;
                default:
                    // Default to false for any other status
                    Log.d(TAG, "Unexpected biometric status: " + canAuthenticate);
                    promise.resolve(false);
                    break;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking biometric availability: " + e.getMessage(), e);
            promise.reject("ERR_BIOMETRIC_CHECK", "Failed to check biometric availability: " + e.getMessage());
        }
    }

    /**
     * Determines what type of biometric authentication is available on the device
     * 
     * @param promise Promise to resolve/reject with the result
     */
    @ReactMethod
    public void getBiometricType(Promise promise) {
        try {
            BiometricManager biometricManager = BiometricManager.from(reactContext);
            int canAuthenticate = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
            
            if (canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS) {
                // Device supports biometric authentication, now determine the type
                
                boolean hasFingerprintHardware = reactContext.getPackageManager()
                        .hasSystemFeature("android.hardware.fingerprint");
                
                boolean hasFaceHardware = false;
                // Face recognition hardware detection (Android 10+)
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                    hasFaceHardware = reactContext.getPackageManager()
                            .hasSystemFeature("android.hardware.biometrics.face");
                }
                
                if (hasFingerprintHardware) {
                    promise.resolve("FINGERPRINT");
                } else if (hasFaceHardware) {
                    promise.resolve("FACE");
                } else {
                    // Some biometric is available, but we couldn't determine the specific type
                    promise.resolve("BIOMETRIC");
                }
            } else {
                promise.resolve("NONE");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error determining biometric type: " + e.getMessage(), e);
            promise.reject("ERR_BIOMETRIC_TYPE", "Failed to determine biometric type: " + e.getMessage());
        }
    }

    /**
     * Prompts the user for biometric authentication
     * 
     * @param options Options for the biometric prompt (title, subtitle, description, etc.)
     * @param promise Promise to resolve/reject with the result
     */
    @ReactMethod
    public void authenticateWithBiometrics(ReadableMap options, Promise promise) {
        try {
            // Extract options with defaults
            String title = options.hasKey("title") ? options.getString("title") : "Biometric Authentication";
            String subtitle = options.hasKey("subtitle") ? options.getString("subtitle") : "Confirm your identity";
            String description = options.hasKey("description") ? options.getString("description") : "Use your biometric to authenticate";
            String cancelButtonText = options.hasKey("cancelButtonText") ? options.getString("cancelButtonText") : "Cancel";
            
            // Get current activity
            FragmentActivity activity = null;
            if (getCurrentActivity() instanceof FragmentActivity) {
                activity = (FragmentActivity) getCurrentActivity();
            }
            
            if (activity == null) {
                promise.reject("ERR_ACTIVITY_UNAVAILABLE", "Activity is not available or not a FragmentActivity");
                return;
            }

            // Build the biometric prompt info
            final BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setDescription(description)
                .setNegativeButtonText(cancelButtonText)
                .setConfirmationRequired(true)
                .build();

            // Create the biometric prompt
            final FragmentActivity finalActivity = activity;
            BiometricPrompt biometricPrompt = new BiometricPrompt(finalActivity, executor,
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationError(int errorCode, CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        
                        // Map common error codes to readable responses
                        switch (errorCode) {
                            case BiometricPrompt.ERROR_NEGATIVE_BUTTON:
                            case BiometricPrompt.ERROR_USER_CANCELED:
                                promise.resolve("CANCELED");
                                break;
                            case BiometricPrompt.ERROR_LOCKOUT:
                                promise.reject("ERR_BIOMETRIC_LOCKOUT", 
                                        "Too many attempts. Try again later.");
                                break;
                            case BiometricPrompt.ERROR_LOCKOUT_PERMANENT:
                                promise.reject("ERR_BIOMETRIC_LOCKOUT_PERMANENT", 
                                        "Too many attempts. Biometric authentication disabled.");
                                break;
                            case BiometricPrompt.ERROR_NO_BIOMETRICS:
                                promise.reject("ERR_NO_BIOMETRICS", 
                                        "No biometric features enrolled on this device.");
                                break;
                            default:
                                promise.reject("ERR_BIOMETRIC_" + errorCode, 
                                        "Authentication error: " + errString);
                                break;
                        }
                    }

                    @Override
                    public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        
                        // Successfully authenticated
                        try {
                            // After successful authentication, we can access secure storage
                            // Note: In a real implementation, you might want to retrieve specific credentials here
                            // or handle this in the JavaScript side after returning success
                            promise.resolve("SUCCESS");
                        } catch (Exception e) {
                            Log.e(TAG, "Error after successful authentication: " + e.getMessage(), e);
                            promise.reject("ERR_POST_AUTH", "Error after authentication: " + e.getMessage());
                        }
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                        
                        // Authentication failed - biometric was valid but not recognized
                        Log.d(TAG, "Biometric authentication failed - not recognized");
                        promise.resolve("FAILED");
                    }
                });

            // Show the biometric prompt on the main thread
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    biometricPrompt.authenticate(promptInfo);
                } catch (Exception e) {
                    Log.e(TAG, "Error displaying biometric prompt: " + e.getMessage(), e);
                    promise.reject("ERR_BIOMETRIC_PROMPT", "Error displaying biometric prompt: " + e.getMessage());
                }
            });

        } catch (Exception e) {
            Log.e(TAG, "Error in biometric authentication: " + e.getMessage(), e);
            promise.reject("ERR_BIOMETRIC_AUTH", "Biometric authentication error: " + e.getMessage());
        }
    }
}