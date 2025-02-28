/**
 * Redux Store Configuration
 * Configures the central Redux store for the AI Talent Marketplace
 * with combined reducers, middleware, and persistence
 * 
 * @version 1.0.0
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit'; // ^1.9.5
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'; // ^8.1.1
import { persistStore, persistReducer } from 'redux-persist'; // ^6.0.0
import storage from 'redux-persist/lib/storage'; // ^6.0.0
import { createLogger } from 'redux-logger'; // ^3.0.6

// Import reducers from feature slices
import { authReducer } from './slices/authSlice';
import profileReducer from './slices/profileSlice';
import jobsReducer from './slices/jobsSlice';
import { messagesReducer } from './slices/messagesSlice';
import { getAuthToken } from '../utils/storage';

// Redux-persist configuration
const persistConfig = {
  key: 'root', // Root key for localStorage
  storage, // Use localStorage as the storage engine
  whitelist: ['auth', 'profile'], // Only persist auth and profile states
  // We don't persist jobs and messages as they're frequently updated and fetched from the server
};

// Combine all feature reducers into a single root reducer
export const rootReducer = combineReducers({
  auth: authReducer,
  profile: profileReducer,
  jobs: jobsReducer,
  messages: messagesReducer
});

// Create persisted reducer with the persistence configuration
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure redux-logger middleware for development environment
const logger = createLogger({
  collapsed: true, // Collapse all actions by default for cleaner console
  duration: true, // Print the duration of each action
  timestamp: false, // Don't add timestamps
  // Don't log actions in production
  predicate: () => process.env.NODE_ENV !== 'production'
});

// Create the Redux store with the persisted reducer and middleware
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => {
    // Configure default middleware with options for redux-persist
    const middlewareArray = getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions that can't be serialized
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore paths that might contain non-serializable values
        ignoredPaths: ['register.payload.attachments', 'jobs.currentJob.attachments']
      }
    });
    
    // Add redux-logger in development only
    if (process.env.NODE_ENV !== 'production') {
      middlewareArray.push(logger);
    }
    
    return middlewareArray;
  },
  // Enable Redux DevTools in development only
  devTools: process.env.NODE_ENV !== 'production'
});

// Create the redux-persist persistor
export const persistor = persistStore(store);

// Type definitions for the Redux store
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

/**
 * Custom typed hook for accessing the dispatch function with correct typing
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Custom typed hook for selecting state from the Redux store with correct typing
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;