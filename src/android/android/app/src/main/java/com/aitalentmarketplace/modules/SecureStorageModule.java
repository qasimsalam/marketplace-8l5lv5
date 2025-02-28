package com.aitalentmarketplace.modules;

import com.facebook.react.bridge.ReactContextBaseJavaModule; // React Native 0.72.x
import com.facebook.react.bridge.ReactApplicationContext; // React Native 0.72.x
import com.facebook.react.bridge.ReactMethod; // React Native 0.72.x
import com.facebook.react.bridge.Promise; // React Native 0.72.x
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;

import androidx.security.crypto.EncryptedSharedPreferences; // androidx.security:security-crypto:1.1.0-alpha06
import androidx.security.crypto.MasterKey; // androidx.security:security-crypto:1.1.0-alpha06
import androidx.security.crypto.MasterKeys; // androidx.security:security-crypto:1.1.0-alpha06

import android.content.SharedPreferences;
import android.util.Log;

import java.util.Set;
import java.util.HashSet;
import java.util.Map;
import java.security.KeyStore;
import java.io.IOException;
import java.security.GeneralSecurityException;

/**
 * Secure Storage Module for React Native that provides encrypted storage capabilities
 * using Android's EncryptedSharedPreferences with AES-256 encryption
 */
public class SecureStorageModule extends ReactContextBaseJavaModule {
    private static final String TAG = "SecureStorageModule";
    private static final String SHARED_PREFERENCES_NAME = "aitalentmarketplace_secure_storage";
    private static final String MASTER_KEY_ALIAS = "_androidx_security_master_key_";

    private final ReactApplicationContext reactContext;
    private SharedPreferences sharedPreferences;

    /**
     * Constructor for SecureStorageModule
     * 
     * @param reactContext The React Native application context
     */
    public SecureStorageModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.sharedPreferences = null; // Will be lazily initialized
    }

    /**
     * Returns the name of this module for React Native
     * 
     * @return Name of the module
     */
    @Override
    public String getName() {
        return "SecureStorageModule";
    }

    /**
     * Securely stores a key-value pair using EncryptedSharedPreferences
     * 
     * @param key Key to store the value under
     * @param value Value to be stored
     * @param promise Promise to resolve/reject with the result
     */
    @ReactMethod
    public void setItem(String key, String value, Promise promise) {
        if (key == null || key.isEmpty()) {
            promise.reject("ERR_INVALID_KEY", "Key cannot be null or empty");
            return;
        }

        if (value == null) {
            promise.reject("ERR_INVALID_VALUE", "Value cannot be null");
            return;
        }

        try {
            SharedPreferences prefs = getSecurePreferences();
            if (prefs != null) {
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString(key, value);
                boolean success = editor.commit(); // Using commit for synchronous write
                
                if (success) {
                    promise.resolve(true);
                } else {
                    promise.reject("ERR_STORAGE_FAILED", "Failed to write to secure storage");
                }
            } else {
                promise.reject("ERR_SECURITY_UNAVAILABLE", "Secure storage is not available");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in setItem: " + e.getMessage(), e);
            promise.reject("ERR_SECURITY_EXCEPTION", "Failed to store item securely: " + e.getMessage());
        }
    }

    /**
     * Retrieves a securely stored value by its key
     * 
     * @param key Key to retrieve the value for
     * @param promise Promise to resolve/reject with the result
     */
    @ReactMethod
    public void getItem(String key, Promise promise) {
        if (key == null || key.isEmpty()) {
            promise.reject("ERR_INVALID_KEY", "Key cannot be null or empty");
            return;
        }

        try {
            SharedPreferences prefs = getSecurePreferences();
            if (prefs != null) {
                String value = prefs.getString(key, null);
                promise.resolve(value);
            } else {
                promise.reject("ERR_SECURITY_UNAVAILABLE", "Secure storage is not available");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in getItem: " + e.getMessage(), e);
            promise.reject("ERR_SECURITY_EXCEPTION", "Failed to get item securely: " + e.getMessage());
        }
    }

    /**
     * Removes a securely stored item by its key
     * 
     * @param key Key to remove
     * @param promise Promise to resolve/reject with the result
     */
    @ReactMethod
    public void removeItem(String key, Promise promise) {
        if (key == null || key.isEmpty()) {
            promise.reject("ERR_INVALID_KEY", "Key cannot be null or empty");
            return;
        }

        try {
            SharedPreferences prefs = getSecurePreferences();
            if (prefs != null) {
                SharedPreferences.Editor editor = prefs.edit();
                editor.remove(key);
                boolean success = editor.commit(); // Using commit for synchronous write
                
                if (success) {
                    promise.resolve(true);
                } else {
                    promise.reject("ERR_STORAGE_FAILED", "Failed to remove from secure storage");
                }
            } else {
                promise.reject("ERR_SECURITY_UNAVAILABLE", "Secure storage is not available");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in removeItem: " + e.getMessage(), e);
            promise.reject("ERR_SECURITY_EXCEPTION", "Failed to remove item securely: " + e.getMessage());
        }
    }

    /**
     * Returns all keys stored in the secure storage
     * 
     * @param promise Promise to resolve/reject with the result
     */
    @ReactMethod
    public void getAllKeys(Promise promise) {
        try {
            SharedPreferences prefs = getSecurePreferences();
            if (prefs != null) {
                Map<String, ?> allEntries = prefs.getAll();
                Set<String> keySet = allEntries.keySet();
                
                WritableArray keyArray = Arguments.createArray();
                for (String key : keySet) {
                    keyArray.pushString(key);
                }
                
                promise.resolve(keyArray);
            } else {
                promise.reject("ERR_SECURITY_UNAVAILABLE", "Secure storage is not available");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in getAllKeys: " + e.getMessage(), e);
            promise.reject("ERR_SECURITY_EXCEPTION", "Failed to get all keys: " + e.getMessage());
        }
    }

    /**
     * Clears all items from secure storage
     * 
     * @param promise Promise to resolve/reject with the result
     */
    @ReactMethod
    public void clear(Promise promise) {
        try {
            SharedPreferences prefs = getSecurePreferences();
            if (prefs != null) {
                SharedPreferences.Editor editor = prefs.edit();
                editor.clear();
                boolean success = editor.commit(); // Using commit for synchronous write
                
                if (success) {
                    promise.resolve(true);
                } else {
                    promise.reject("ERR_STORAGE_FAILED", "Failed to clear secure storage");
                }
            } else {
                promise.reject("ERR_SECURITY_UNAVAILABLE", "Secure storage is not available");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in clear: " + e.getMessage(), e);
            promise.reject("ERR_SECURITY_EXCEPTION", "Failed to clear secure storage: " + e.getMessage());
        }
    }

    /**
     * Checks if KeyStore secure storage is available on the device
     * 
     * @param promise Promise to resolve with boolean indicating availability
     */
    @ReactMethod
    public void isKeyStoreAvailable(Promise promise) {
        try {
            // Test KeyStore availability
            KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
            keyStore.load(null);
            
            // Try to initialize secure preferences to test full availability
            SharedPreferences testPrefs = getSecurePreferences();
            promise.resolve(testPrefs != null);
        } catch (Exception e) {
            Log.e(TAG, "KeyStore not available: " + e.getMessage(), e);
            promise.resolve(false); // Resolve with false since this is a capability check
        }
    }

    /**
     * Private helper method to get or create the EncryptedSharedPreferences instance
     * 
     * @return The encrypted shared preferences instance, or null if creation fails
     */
    private SharedPreferences getSecurePreferences() {
        if (sharedPreferences != null) {
            return sharedPreferences;
        }

        try {
            // Create or get master key
            MasterKey masterKey = new MasterKey.Builder(reactContext)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();

            // Create the EncryptedSharedPreferences
            sharedPreferences = EncryptedSharedPreferences.create(
                    reactContext,
                    SHARED_PREFERENCES_NAME,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
            
            return sharedPreferences;
        } catch (GeneralSecurityException e) {
            Log.e(TAG, "Security exception in getSecurePreferences: " + e.getMessage(), e);
            return null;
        } catch (IOException e) {
            Log.e(TAG, "IO exception in getSecurePreferences: " + e.getMessage(), e);
            return null;
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error in getSecurePreferences: " + e.getMessage(), e);
            return null;
        }
    }
}