import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // ^18.2.0
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Easing
} from 'react-native'; // 0.72.x
import Ionicons from '@expo/vector-icons/Ionicons'; // ^13.0.0
import debounce from 'lodash/debounce'; // ^4.0.8

// Internal components/hooks
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import Input, { InputType } from '../common/Input';
import Spinner from '../common/Spinner';
import useMessages from '../../hooks/useMessages';
import useKeyboard from '../../hooks/useKeyboard';
import { colors } from '../../styles/colors';
import { moderateScale } from '../../utils/responsive';

// Global constants
const TYPING_DEBOUNCE_TIME = 500;
const MAX_MESSAGE_LENGTH = 2000;

// Types
export interface MessageInputProps {
  conversationId: string;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onMessageSent?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  initialValue?: string;
}

/**
 * A React Native component that provides a feature-rich message input interface
 * for the AI Talent Marketplace iOS application.
 * 
 * Features:
 * - Text input with character limit
 * - File attachments (images, camera, documents)
 * - Typing indicators
 * - Connection state visualization
 * - Keyboard-aware adjustments
 * 
 * @param props Component properties
 * @returns JSX.Element
 */
const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  placeholder = 'Type a message...',
  onFocus,
  onBlur,
  onMessageSent,
  style,
  disabled = false,
  initialValue = ''
}) => {
  // State
  const [message, setMessage] = useState(initialValue);
  const [sending, setSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  
  // Refs
  const inputRef = useRef<TextInput>(null);
  
  // Get keyboard state
  const { keyboardHeight, keyboardShown, dismissKeyboard } = useKeyboard();
  
  // Get messaging functionality
  const {
    sendTextMessage,
    setTyping,
    selectImageAttachment,
    takePhotoAttachment,
    selectDocumentAttachment,
    isConnected
  } = useMessages();
  
  // Animation for connection indicator
  const connectionIndicatorOpacity = useRef(new Animated.Value(0)).current;
  
  // Typing indicator debounce
  const debouncedTypingIndicator = useCallback(
    debounce((isTyping: boolean) => {
      if (conversationId) {
        setTyping(isTyping);
      }
    }, TYPING_DEBOUNCE_TIME),
    [conversationId, setTyping]
  );
  
  /**
   * Handles text changes in the input field and triggers typing indicators
   * 
   * @param text The new text value
   */
  const handleTextChange = (text: string) => {
    // Enforce character limit
    if (text.length <= MAX_MESSAGE_LENGTH) {
      setMessage(text);
      
      // Trigger typing indicator if text is not empty
      if (text.trim().length > 0) {
        debouncedTypingIndicator(true);
      } else {
        debouncedTypingIndicator(false);
      }
    }
  };
  
  /**
   * Validates and sends the message
   */
  const handleSendMessage = async () => {
    try {
      const trimmedMessage = message.trim();
      
      // Validate message
      if (trimmedMessage.length === 0 || !conversationId) {
        return;
      }
      
      // Indicate sending state
      setSending(true);
      
      // Clear typing indicator
      debouncedTypingIndicator.cancel();
      setTyping(false);
      
      // Send message
      await sendTextMessage(trimmedMessage);
      
      // Clear input after successful send
      setMessage('');
      
      // Call onMessageSent callback if provided
      onMessageSent?.();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };
  
  /**
   * Opens attachment options menu
   */
  const handleAttachment = () => {
    // Dismiss keyboard if shown
    if (keyboardShown) {
      dismissKeyboard();
    }
    
    // Show attachment options
    Alert.alert(
      'Add Attachment',
      'Choose an attachment type',
      [
        { text: 'Photo Library', onPress: handleSelectImage },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Document', onPress: handleSelectDocument },
        { text: 'Cancel', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };
  
  /**
   * Handles selecting an image from the photo library
   */
  const handleSelectImage = async () => {
    try {
      const attachment = await selectImageAttachment();
      if (attachment) {
        // Send file message with the attachment
        setSending(true);
        await sendTextMessage(`Sent an image ${message.trim() ? `: ${message.trim()}` : ''}`);
        setMessage('');
        onMessageSent?.();
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setSending(false);
    }
  };
  
  /**
   * Handles taking a photo with the camera
   */
  const handleTakePhoto = async () => {
    try {
      const attachment = await takePhotoAttachment();
      if (attachment) {
        // Send file message with the attachment
        setSending(true);
        await sendTextMessage(`Sent a photo ${message.trim() ? `: ${message.trim()}` : ''}`);
        setMessage('');
        onMessageSent?.();
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setSending(false);
    }
  };
  
  /**
   * Handles selecting a document
   */
  const handleSelectDocument = async () => {
    try {
      const attachment = await selectDocumentAttachment();
      if (attachment) {
        // Send file message with the attachment
        setSending(true);
        await sendTextMessage(`Sent a document ${message.trim() ? `: ${message.trim()}` : ''}`);
        setMessage('');
        onMessageSent?.();
      }
    } catch (error) {
      console.error('Error selecting document:', error);
      Alert.alert('Error', 'Failed to select document. Please try again.');
    } finally {
      setSending(false);
    }
  };
  
  // Handle connection status animation
  useEffect(() => {
    if (!isConnected) {
      // Show the indicator when disconnected
      Animated.timing(connectionIndicatorOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true
      }).start();
    } else {
      // Hide the indicator when connected
      Animated.timing(connectionIndicatorOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true
      }).start();
    }
  }, [isConnected, connectionIndicatorOpacity]);
  
  // Calculate remaining characters
  const remainingChars = MAX_MESSAGE_LENGTH - message.length;
  const showCharCount = message.length > MAX_MESSAGE_LENGTH * 0.8;
  
  return (
    <View style={[styles.container, style]}>
      {/* Connection status indicator */}
      <Animated.View 
        style={[
          styles.connectionIndicator,
          { opacity: connectionIndicatorOpacity }
        ]}
        accessible={!isConnected}
        accessibilityLabel="You are currently offline. Messages will be sent when you're back online."
      >
        <Ionicons 
          name="cloud-offline" 
          size={14} 
          color={colors.text.inverse} 
        />
      </Animated.View>
      
      <View style={styles.inputContainer}>
        {/* Attachment button */}
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleAttachment}
          disabled={disabled || sending}
          accessibilityLabel="Add attachment"
          accessibilityRole="button"
          accessibilityHint="Opens options to send image or document"
        >
          <Ionicons 
            name="attach" 
            size={24} 
            color={disabled ? colors.text.disabled : colors.primary[600]} 
          />
        </TouchableOpacity>
        
        {/* Message input field */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={message}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          multiline={true}
          numberOfLines={1}
          maxLength={MAX_MESSAGE_LENGTH + 1} // +1 to allow detection but prevent additional input
          onFocus={onFocus}
          onBlur={onBlur}
          editable={!disabled && !sending}
          returnKeyType="default"
          blurOnSubmit={false}
          accessibilityLabel="Message input field"
          accessibilityHint="Type your message here"
          accessibilityRole="textbox"
        />
        
        {/* Character count */}
        {showCharCount && (
          <View style={styles.charCount}>
            <Text style={[
              styles.charCountText,
              remainingChars < 0 ? styles.charCountError : null
            ]}>
              {remainingChars}
            </Text>
          </View>
        )}
        
        {/* Send button */}
        {sending ? (
          <View style={styles.sendButton}>
            <Spinner />
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || disabled) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!message.trim() || disabled}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Ionicons 
              name="send" 
              size={24} 
              color={!message.trim() || disabled ? colors.text.disabled : colors.primary[600]} 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.background.primary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(8),
  },
  connectionIndicator: {
    position: 'absolute',
    top: -moderateScale(30),
    left: 0,
    right: 0,
    backgroundColor: '#f97316', // Orange warning color
    paddingVertical: moderateScale(4),
    paddingHorizontal: moderateScale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(4),
    marginHorizontal: moderateScale(16),
    zIndex: 1,
  },
  connectionIndicatorText: {
    color: colors.text.inverse,
    fontSize: moderateScale(12),
    marginLeft: moderateScale(4),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.background.secondary,
    borderRadius: moderateScale(24),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    minHeight: moderateScale(48),
    maxHeight: moderateScale(120),
  },
  attachButton: {
    marginRight: moderateScale(8),
    paddingBottom: moderateScale(6),
  },
  input: {
    flex: 1,
    fontSize: moderateScale(16),
    color: colors.text.primary,
    paddingTop: moderateScale(8),
    paddingBottom: moderateScale(8),
    maxHeight: moderateScale(100),
    minHeight: moderateScale(24),
  },
  sendButton: {
    marginLeft: moderateScale(8),
    paddingBottom: moderateScale(6),
    height: moderateScale(32),
    width: moderateScale(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  charCount: {
    position: 'absolute',
    right: moderateScale(44),
    bottom: moderateScale(8),
    backgroundColor: colors.background.tertiary,
    borderRadius: moderateScale(10),
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
  },
  charCountText: {
    fontSize: moderateScale(10),
    color: colors.text.tertiary,
  },
  charCountError: {
    color: '#dc2626', // Error color
  },
});

export default MessageInput;