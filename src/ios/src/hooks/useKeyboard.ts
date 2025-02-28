/**
 * Keyboard Hook
 * 
 * A custom React hook that provides keyboard-related functionality for the iOS application.
 * Manages keyboard appearance, dismissal events, height measurements, and provides
 * utilities for dismissing the keyboard programmatically.
 * 
 * @version react-native 0.72.x
 * @version react 18.2.0
 */

import { useState, useEffect, useCallback } from 'react'; // react 18.2.0
import { Keyboard, Platform, Dimensions, EmitterSubscription } from 'react-native'; // react-native 0.72.x
import { getWindowDimensions } from '../utils/dimensions';

/**
 * TypeScript interface for the data returned by the useKeyboard hook
 */
export interface KeyboardInfo {
  /** Current height of the keyboard in pixels */
  keyboardHeight: number;
  /** Boolean indicating if the keyboard is currently shown */
  keyboardShown: boolean;
  /** Function to programmatically dismiss the keyboard */
  dismissKeyboard: () => void;
}

/**
 * Hook to manage keyboard state and provide keyboard utility functions
 * 
 * @returns Object containing keyboard height, visibility state, and dismiss function
 */
export const useKeyboard = (): KeyboardInfo => {
  // State for keyboard height and visibility
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [keyboardShown, setKeyboardShown] = useState<boolean>(false);
  
  /**
   * Handles keyboard show event
   * Updates the keyboard height and visibility state
   */
  const handleKeyboardShow = useCallback((event: any): void => {
    // Extract keyboard frame information from the event
    const keyboardFrame = event.endCoordinates || {};
    const { height: windowHeight } = getWindowDimensions();
    
    // Calculate keyboard height - different approach for iOS vs Android
    let height = 0;
    
    if (Platform.OS === 'ios') {
      // iOS provides direct keyboard dimensions in the event
      height = keyboardFrame.height;
    } else {
      // On Android, calculate keyboard height from screen height difference
      height = windowHeight - keyboardFrame.screenY;
    }
    
    // Update state
    setKeyboardHeight(height);
    setKeyboardShown(true);
  }, []);
  
  /**
   * Handles keyboard hide event
   * Resets keyboard height and updates visibility state
   */
  const handleKeyboardHide = useCallback((): void => {
    setKeyboardHeight(0);
    setKeyboardShown(false);
  }, []);
  
  /**
   * Utility function to dismiss the keyboard programmatically
   */
  const dismissKeyboard = useCallback((): void => {
    Keyboard.dismiss();
  }, []);
  
  useEffect(() => {
    // Set up event listeners for keyboard events
    let keyboardDidShowListener: EmitterSubscription;
    let keyboardDidHideListener: EmitterSubscription;
    
    // The event names differ between iOS and Android
    if (Platform.OS === 'ios') {
      keyboardDidShowListener = Keyboard.addListener(
        'keyboardWillShow',
        handleKeyboardShow
      );
      keyboardDidHideListener = Keyboard.addListener(
        'keyboardWillHide',
        handleKeyboardHide
      );
    } else {
      keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        handleKeyboardShow
      );
      keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        handleKeyboardHide
      );
    }
    
    // Clean up listeners when component unmounts
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [handleKeyboardShow, handleKeyboardHide]);
  
  // Return keyboard state and utility functions
  return {
    keyboardHeight,
    keyboardShown,
    dismissKeyboard
  };
};