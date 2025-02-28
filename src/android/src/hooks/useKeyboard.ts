import { useState, useEffect, useCallback } from 'react'; // v18.2.0
import { 
  Keyboard, 
  EmitterSubscription, 
  KeyboardEvent, 
  KeyboardEventName 
} from 'react-native'; // v0.72.4
import { WINDOW_HEIGHT } from '../utils/dimensions';

/**
 * Interface defining the return object of the useKeyboard hook
 */
export interface KeyboardInfo {
  keyboardHeight: number;
  keyboardShown: boolean;
  dismissKeyboard: () => void;
}

/**
 * A hook that tracks keyboard visibility and dimensions, providing methods to handle keyboard interactions
 * @returns An object containing keyboard state and utility functions
 */
export const useKeyboard = (): KeyboardInfo => {
  // Initialize state for keyboard height and visibility
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [keyboardShown, setKeyboardShown] = useState<boolean>(false);

  /**
   * Handles the keyboard show event, updating height and visibility state
   * @param event Keyboard event with frame information
   */
  const handleKeyboardShow = useCallback((event: KeyboardEvent) => {
    // Extract keyboard end coordinates from the event
    const keyboardEndCoordinates = event.endCoordinates;
    
    // Calculate keyboard height from screen dimensions and keyboard position
    // Android keyboard events provide screenY that can be used to calculate height
    const height = keyboardEndCoordinates ? WINDOW_HEIGHT - keyboardEndCoordinates.screenY : 0;
    
    // Update keyboard height state
    setKeyboardHeight(height);
    
    // Set keyboard visibility state to true
    setKeyboardShown(true);
  }, []);

  /**
   * Handles the keyboard hide event, updating height and visibility state
   */
  const handleKeyboardHide = useCallback(() => {
    // Set keyboard height to 0
    setKeyboardHeight(0);
    
    // Set keyboard visibility state to false
    setKeyboardShown(false);
  }, []);

  /**
   * Utility function to programmatically dismiss the keyboard
   */
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  useEffect(() => {
    // Android uses different event names than iOS, but React Native normalizes these
    // to 'keyboardDidShow' and 'keyboardDidHide' for cross-platform compatibility
    
    // Set up event listeners for keyboard show/hide events
    const keyboardDidShowListener: EmitterSubscription = Keyboard.addListener(
      'keyboardDidShow' as KeyboardEventName,
      handleKeyboardShow
    );
    
    const keyboardDidHideListener: EmitterSubscription = Keyboard.addListener(
      'keyboardDidHide' as KeyboardEventName,
      handleKeyboardHide
    );

    // Clean up event listeners on component unmount
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