/**
 * Central Redux store configuration for the AI Talent Marketplace Android application
 * 
 * This file sets up the Redux store with combined reducers from all feature slices,
 * configures middleware with persistence support, and provides typed hooks for
 * accessing the store throughout the mobile application.
 * 
 * @version 1.0.0
 */

import { configureStore, combineReducers, getDefaultMiddleware } from '@reduxjs/toolkit'; // ^1.9.5
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'; // ^8.1.2
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'; // ^6.0.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.18.2

// Import reducers from slices
import { authReducer } from './slices/authSlice';
import jobsReducer from './slices/jobsSlice';
import { messagesReducer } from './slices/messagesSlice';
import { profileReducer } from './slices/profileSlice';

// Import utilities
import { getAuthToken } from '../utils/keychain';

// Redux-persist configuration for maintaining state between app sessions
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth'], // Only persist authentication state for seamless login experience
  blacklist: [] // No specific state slices to exclude from persistence
};

// Combine all feature reducers into a single root reducer
export const rootReducer = combineReducers({
  auth: authReducer,
  jobs: jobsReducer,
  messages: messagesReducer,
  profile: profileReducer
});

// Create persisted reducer with configured persistence settings
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure the Redux store with middleware
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware({
    // Ignore Redux-Persist actions in serializability checks
    serializableCheck: {
      ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
    },
  }),
});

// Create a persistor for use with PersistGate in the app root
export const persistor = persistStore(store);

// Type definitions for Redux state and dispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Custom typed hook for accessing the dispatch function with correct typing
 * @returns Typed dispatch function for dispatching actions to the store
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Custom typed hook for selecting state from the Redux store with correct typing
 * @returns Typed selector hook for accessing store state
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;