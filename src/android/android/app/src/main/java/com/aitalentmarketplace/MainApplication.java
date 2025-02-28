package com.aitalentmarketplace;

import android.app.Application;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.List;
import java.util.ArrayList;
import java.util.Collections;

import com.aitalentmarketplace.modules.BiometricModule;
import com.aitalentmarketplace.modules.NotificationModule;
import com.aitalentmarketplace.modules.SecureStorageModule;

/**
 * Main application class for the AI Talent Marketplace Android app.
 * Initializes React Native environment and registers custom native modules
 * for biometric authentication, secure storage, and notification services.
 */
public class MainApplication extends Application implements ReactApplication {

    // The React Native host that manages the React instance
    private final ReactNativeHost mReactNativeHost = new ReactNativeHostImpl();

    /**
     * Returns the ReactNativeHost instance for this application
     */
    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    /**
     * Called when the application is starting.
     * Initializes SoLoader and performs any application-specific setup.
     */
    @Override
    public void onCreate() {
        super.onCreate();
        // Initialize SoLoader for loading native libraries
        SoLoader.init(this, /* native exopackage */ false);
        
        // Application-specific initialization can be added here
        // For example, initializing crash reporting, analytics, etc.
    }

    /**
     * Custom ReactPackage that creates and provides all native modules
     * used by the AI Talent Marketplace app.
     */
    class AITalentMarketplacePackage implements ReactPackage {
        /**
         * Creates native modules for the React Native bridge
         * 
         * @param reactContext The React Native application context
         * @return List of native modules to register
         */
        @Override
        public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
            List<NativeModule> modules = new ArrayList<>();
            
            // Add our custom native modules
            modules.add(new BiometricModule(reactContext));
            modules.add(new NotificationModule(reactContext));
            modules.add(new SecureStorageModule(reactContext));
            
            return modules;
        }

        /**
         * Creates view managers for custom UI components
         * (we don't have any in this implementation)
         * 
         * @param reactContext The React Native application context
         * @return Empty list since we don't have custom view managers
         */
        @Override
        public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
            return Collections.emptyList();
        }
    }

    /**
     * Inner class that extends ReactNativeHost to configure the React Native runtime
     */
    private class ReactNativeHostImpl extends ReactNativeHost {
        
        /**
         * Constructor for the ReactNativeHost implementation
         */
        public ReactNativeHostImpl() {
            super(MainApplication.this);
        }

        /**
         * Determines if the app should use developer support tools
         * 
         * @return true for debug builds, false for release builds
         */
        @Override
        protected boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }

        /**
         * Returns the list of React Native packages to register
         * 
         * @return List of React Native packages including custom native modules
         */
        @Override
        protected List<ReactPackage> getPackages() {
            List<ReactPackage> packages = new ArrayList<>();
            
            // Add the main React Native package for core functionality
            packages.add(new MainReactPackage());
            
            // Add our custom package with native modules
            packages.add(new AITalentMarketplacePackage());
            
            return packages;
        }

        /**
         * Returns the name of the main JS bundle file
         * 
         * @return The main JavaScript module name
         */
        @Override
        protected String getJSMainModuleName() {
            return "index";
        }

        /**
         * Determines if the new React Native architecture should be enabled
         * 
         * @return Value from BuildConfig flag
         */
        @Override
        protected boolean isNewArchEnabled() {
            return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }

        /**
         * Determines if the Hermes JS engine should be used
         * 
         * @return Value from BuildConfig flag
         */
        @Override
        protected boolean isHermesEnabled() {
            return BuildConfig.IS_HERMES_ENABLED;
        }
    }
}