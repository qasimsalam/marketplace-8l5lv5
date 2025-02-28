/**
 * Central Redux store configuration for the AI Talent Marketplace iOS application
 * 
 * This module configures the Redux store with TypeScript typing, combines all feature
 * reducers, sets up middleware, implements persistence, and provides typed hooks
 * for accessing the store throughout the mobile application.
 * 
 * @version 1.0.0
 */

import { configureStore, combineReducers, getDefaultMiddleware } from '@reduxjs/toolkit'; // ^1.9.5
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'; // ^8.1.2
import { 
  persistStore, 
  persistReducer, 
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER 
} from 'redux-persist'; // ^6.0.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.18.2

// Import reducers from feature slices
import authReducer from './slices/authSlice';
import jobsReducer from './slices/jobsSlice';
import messagesReducer from './slices/messagesSlice';
import profileReducer from './slices/profileSlice';

// Import utility for token handling
import { getAuthToken } from '../utils/keychain';

// Configuration for redux-persist
// Only persist auth state for fast app loading and to maintain session between app restarts
// Other state (jobs, messages, profile) can be re-fetched from the API as needed
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth'], // Only persist authentication state
  blacklist: [] // Explicitly don't persist specific reducers if needed
};

// Combine all reducers from feature slices
export const rootReducer = combineReducers({
  auth: authReducer,
  jobs: jobsReducer,
  messages: messagesReducer,
  profile: profileReducer
});

// Create persisted reducer with the persist configuration
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure the Redux store with middleware optimized for React Native
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware({
    serializableCheck: {
      // Ignore redux-persist actions in serializability checks
      ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
    },
    // Optimize middleware for mobile performance
    immutableCheck: process.env.NODE_ENV !== 'production',
    serializableCheck: process.env.NODE_ENV !== 'production'
  })
});

// Create persistor for use with PersistGate component in app entry point
export const persistor = persistStore(store);

// Extract and export TypeScript types for state and dispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Custom typed hook for accessing the dispatch function with correct typing
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Custom typed hook for selecting state from the Redux store with correct typing
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;