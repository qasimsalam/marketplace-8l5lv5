/**
 * AI Talent Marketplace - Message Input Component (Android)
 *
 * This component provides a specialized input field for composing and sending messages
 * within the Android application. It supports text input, file attachments, and code snippets,
 * with mobile-optimized interactions and keyboard handling.
 *
 * @version 1.0.0
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'; // react v18.2.0
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Keyboard,
  Animated,
  StyleProp,
  ViewStyle,
  TextInput,
} from 'react-native'; // react-native v0.72.x
import { launchImageLibrary } from 'react-native-image-picker'; // react-native-image-picker ^5.6.0
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons/MaterialIcons v9.2.0
import { debounce } from 'lodash'; // lodash ^4.17.21

// Internal imports
import { Input, InputRef, InputSize } from '../common/Input';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import {
  CreateMessageDTO,
  MessageType,
  FileAttachment,
  CodeSnippet,
} from '../../types/message.types';
import { useKeyboard } from '../../hooks/useKeyboard';
import { useMessages } from '../../hooks/useMessages';
import colors from '../../styles/colors';
import { layout } from '../../styles/layout';
import { moderateScale } from '../../utils/responsive';

// Global constants
const TYPING_DEBOUNCE_TIME = 500;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Interface defining props for the MessageInput component
 */
export interface MessageInputProps {
  /**
   * The ID of the conversation to send messages to
   */
  conversationId: string;

  /**
   * Optional custom styles for the input container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Callback function to execute after a message is successfully sent
   */
  onMessageSent?: () => void;

  /**
   * Placeholder text for the input field
   */
  placeholder?: string;

  /**
   * Initial text to populate the input field with
   */
  initialText?: string;

  /**
   * Disable attachments
   */
  disableAttachments?: boolean;
}

/**
 * A specialized input component for composing and sending messages in a conversation
 *
 * @param props - The component props
 * @returns Rendered message input component
 */
export const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  style,
  onMessageSent,
  placeholder = 'Type your message...',
  initialText = '',
  disableAttachments = false,
}) => {
  // State variables
  const [messageText, setMessageText] = useState<string>(initialText);
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [codeSnippet, setCodeSnippet] = useState<CodeSnippet | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Hooks
  const { keyboardHeight, keyboardShown } = useKeyboard();
  const { sendMessage, sendTypingIndicator, uploadAttachment, isConnected } =
    useMessages();

  // Refs
  const inputRef = useRef<InputRef>(null);

  /**
   * Handles text input changes and updates the message text state
   *
   * @param text - The new text value
   */
  const handleTextChange = (text: string) => {
    setMessageText(text);
    debouncedSendTypingIndicator(conversationId, text.length > 0);
  };

  /**
   * Debounced function to send typing indicator events
   */
  const debouncedSendTypingIndicator = useCallback(
    debounce((conversationId: string, isTyping: boolean) => {
      sendTypingIndicator(conversationId, isTyping);
    }, TYPING_DEBOUNCE_TIME),
    [sendTypingIndicator]
  );

  /**
   * Handles sending the current message
   */
  const handleSendMessage = async () => {
    if (!messageText.trim() && !attachment && !codeSnippet) {
      return;
    }

    setIsSending(true);
    try {
      let attachmentId: string | null = null;
      if (attachment) {
        attachmentId = await uploadAttachment(attachment, conversationId);
      }

      const messageData: CreateMessageDTO = {
        conversationId: conversationId,
        type: attachment
          ? MessageType.FILE
          : codeSnippet
          ? MessageType.CODE
          : MessageType.TEXT,
        content: messageText,
        attachmentId: attachmentId,
        codeSnippet: codeSnippet,
      };

      await sendMessage(messageData);
      resetInputState();
      onMessageSent?.();
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Handles file attachment selection and upload process
   */
  const handleAttachFile = async () => {
    // Launch image picker with appropriate options for Android
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else {
        const file = response.assets?.[0];

        if (file) {
          // Validate file size and type restrictions
          if (file.fileSize && file.fileSize > MAX_FILE_SIZE) {
            alert('File size exceeds maximum limit of 10MB');
            return;
          }

          // Set selected file to attachment state
          setAttachment({
            id: 'temp_id', // Temporary ID
            name: file.fileName || 'attachment',
            url: file.uri || '',
            size: file.fileSize || 0,
            type: file.type || 'image/jpeg',
            localUri: file.uri || null,
          });
        }
      }
    });
  };

  /**
   * Opens code snippet editor for adding code to messages
   */
  const handleAddCodeSnippet = () => {
    // TODO: Implement code snippet editor modal
    console.log('Add code snippet');
  };

  /**
   * Resets all input state after sending a message
   */
  const resetInputState = () => {
    setMessageText('');
    setAttachment(null);
    setCodeSnippet(null);
    inputRef.current?.clear();
  };

  /**
   * Add useEffect to clean up typing indicator on unmount
   */
  useEffect(() => {
    return () => {
      debouncedSendTypingIndicator.cancel();
    };
  }, [debouncedSendTypingIndicator]);

  return (
    <View style={[styles.container, style]}>
      {!disableAttachments && (
        <TouchableOpacity
          style={styles.attachmentButton}
          onPress={handleAttachFile}
          disabled={isSending || !isConnected}
        >
          <MaterialIcons name="attach-file" size={24} color={colors.primary[500]} />
        </TouchableOpacity>
      )}

      <Input
        ref={inputRef}
        style={styles.input}
        value={messageText}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        multiline={true}
        size={InputSize.MEDIUM}
        maxLength={MAX_MESSAGE_LENGTH}
        testID="message-input"
        accessibilityLabel="Message input"
      />

      <Button
        title="Send"
        onPress={handleSendMessage}
        variant={ButtonVariant.PRIMARY}
        size={ButtonSize.MEDIUM}
        isDisabled={!messageText.trim() && !attachment && !codeSnippet}
        isLoading={isSending}
        testID="send-button"
        accessibilityLabel="Send message"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.spacing.xs,
    paddingVertical: layout.spacing.xxs,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  attachmentButton: {
    padding: layout.spacing.xxs,
  },
  input: {
    flex: 1,
    marginHorizontal: layout.spacing.xs,
  },
});