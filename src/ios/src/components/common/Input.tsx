import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle
} from 'react'; // v18.2.0
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform
} from 'react-native'; // v0.72.x

import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';
import { moderateScale } from '../../utils/responsive';
import { validateEmail, validatePassword } from '../../utils/validation';
import { useKeyboard } from '../../hooks/useKeyboard';

/**
 * Enum for different input types supported by the component
 */
export enum InputType {
  TEXT = 'text',
  EMAIL = 'email',
  PASSWORD = 'password',
  NUMBER = 'number',
  PHONE = 'phone',
  URL = 'url'
}

/**
 * Props for the Input component
 */
export interface InputProps extends Omit<TextInputProps, 'onChange'> {
  /** Label text displayed above the input */
  label: string;
  /** Current value of the input */
  value: string;
  /** Callback when input text changes */
  onChangeText: (text: string) => void;
  /** Placeholder text when input is empty */
  placeholder?: string;
  /** Error message to display below the input */
  error?: string;
  /** Type of input, affects keyboard and validation */
  type?: InputType;
  /** Whether input is required */
  isRequired?: boolean;
  /** Whether input is in success state */
  isSuccess?: boolean;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Maximum length of input text */
  maxLength?: number;
  /** Text auto-capitalization behavior */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Whether to enable auto-correct */
  autoCorrect?: boolean;
  /** Whether input allows multiple lines */
  multiline?: boolean;
  /** Number of lines for multiline input */
  numberOfLines?: number;
  /** Style for the container view */
  style?: StyleProp<ViewStyle>;
  /** Style for the text input */
  inputStyle?: StyleProp<TextStyle>;
  /** Style for the label text */
  labelStyle?: StyleProp<TextStyle>;
  /** Custom validation function */
  validator?: (value: string) => boolean;
  /** Callback when input loses focus */
  onBlur?: () => void;
  /** Callback when input gains focus */
  onFocus?: () => void;
  /** Test ID for testing */
  testID?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}

/**
 * Interface for methods exposed via useImperativeHandle
 */
export interface InputRef {
  /** Focuses the input */
  focus: () => void;
  /** Blurs (unfocuses) the input */
  blur: () => void;
  /** Clears the input text */
  clear: () => void;
}

/**
 * Generates input styles based on the current state
 * 
 * @param focused Whether the input is focused
 * @param hasError Whether the input has an error
 * @param isSuccess Whether the input is in success state
 * @param disabled Whether the input is disabled
 * @returns Combined styles for the input container
 */
const getInputStyles = (
  focused: boolean,
  hasError: boolean,
  isSuccess: boolean,
  disabled: boolean
) => {
  const containerStyle = [styles.inputContainer];
  
  if (focused) {
    containerStyle.push(styles.focused);
  }
  
  if (hasError) {
    containerStyle.push(styles.error);
  }
  
  if (isSuccess) {
    containerStyle.push(styles.success);
  }
  
  if (disabled) {
    containerStyle.push(styles.disabled);
  }
  
  return containerStyle;
};

/**
 * Validates input value based on input type and custom validation
 * 
 * @param value The input value to validate
 * @param type The type of input
 * @param customValidator Optional custom validation function
 * @param isRequired Whether the input is required
 * @returns Boolean indicating whether the input is valid
 */
const handleValidation = (
  value: string,
  type: InputType = InputType.TEXT,
  customValidator?: (value: string) => boolean,
  isRequired = false
): boolean => {
  // If not required and value is empty, it's valid
  if (!isRequired && value.trim() === '') {
    return true;
  }

  // If required and value is empty, it's invalid
  if (isRequired && value.trim() === '') {
    return false;
  }
  
  // Custom validator takes precedence if provided
  if (customValidator) {
    return customValidator(value);
  }
  
  // Built-in validation based on type
  switch (type) {
    case InputType.EMAIL:
      return validateEmail(value);
    case InputType.PASSWORD:
      return validatePassword(value);
    case InputType.NUMBER:
      return !isNaN(Number(value));
    case InputType.PHONE:
      return /^\+?[0-9]{10,15}$/.test(value.trim());
    case InputType.URL:
      return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(value.trim());
    default:
      // Default validation just checks if value exists
      return value.trim().length > 0;
  }
};

/**
 * A reusable, accessible text input component for the AI Talent Marketplace iOS application.
 * Supports various states including default, focus, error, and disabled states with 
 * appropriate visual feedback and validation capabilities.
 */
export const Input = forwardRef<TextInput, InputProps>((props, ref) => {
  const {
    label,
    value,
    onChangeText,
    placeholder,
    error,
    type = InputType.TEXT,
    isRequired = false,
    isSuccess = false,
    disabled = false,
    maxLength,
    autoCapitalize,
    autoCorrect = false,
    multiline = false,
    numberOfLines = 1,
    style,
    inputStyle,
    labelStyle,
    validator,
    onBlur,
    onFocus,
    testID,
    accessibilityLabel,
    ...rest
  } = props;

  // State for the input
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [internalError, setInternalError] = useState<string | undefined>(error);
  
  // Reference to the text input
  const inputRef = useRef<TextInput>(null);
  
  // Get keyboard utilities
  const { dismissKeyboard } = useKeyboard();
  
  // Update internal error when external error changes
  useEffect(() => {
    setInternalError(error);
  }, [error]);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    clear: () => inputRef.current?.clear()
  }));
  
  // Handle focus event
  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus();
    }
  };
  
  // Handle blur event
  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    setIsTouched(true);
    
    // Validate on blur
    const isValid = handleValidation(value, type, validator, isRequired);
    if (!isValid) {
      let errorMessage = 'Invalid input';
      
      if (isRequired && value.trim() === '') {
        errorMessage = 'This field is required';
      } else {
        switch (type) {
          case InputType.EMAIL:
            errorMessage = 'Please enter a valid email address';
            break;
          case InputType.PASSWORD:
            errorMessage = 'Password must include uppercase, lowercase, number, and special character';
            break;
          case InputType.NUMBER:
            errorMessage = 'Please enter a valid number';
            break;
          case InputType.PHONE:
            errorMessage = 'Please enter a valid phone number';
            break;
          case InputType.URL:
            errorMessage = 'Please enter a valid URL';
            break;
        }
      }
      
      setInternalError(errorMessage);
    } else {
      setInternalError(undefined);
    }
    
    if (onBlur) {
      onBlur();
    }
  };
  
  // Handle text change
  const handleChangeText = (text: string) => {
    // Clear error if the field now has a value and it was previously showing required error
    if (isTouched && internalError === 'This field is required' && text.trim().length > 0) {
      setInternalError(undefined);
    }
    
    onChangeText(text);
  };
  
  // Get styles based on component state
  const inputContainerStyles = getInputStyles(isFocused, !!internalError, isSuccess, disabled);
  
  // Determine if we should show the error
  const showError = isTouched && !!internalError;
  
  // Generate secure text entry based on type
  const isSecureTextEntry = type === InputType.PASSWORD;
  
  // Determine keyboard type based on input type
  let keyboardType: TextInputProps['keyboardType'] = 'default';
  let autoCapitalizeValue = autoCapitalize;
  
  switch (type) {
    case InputType.EMAIL:
      keyboardType = 'email-address';
      autoCapitalizeValue = autoCapitalize || 'none';
      break;
    case InputType.NUMBER:
      keyboardType = 'numeric';
      break;
    case InputType.PHONE:
      keyboardType = 'phone-pad';
      break;
    case InputType.URL:
      keyboardType = 'url';
      autoCapitalizeValue = autoCapitalize || 'none';
      break;
    case InputType.PASSWORD:
      autoCapitalizeValue = autoCapitalize || 'none';
      break;
    default:
      autoCapitalizeValue = autoCapitalize || 'sentences';
  }
  
  return (
    <View style={[styles.container, style]} testID={`${testID}-container`}>
      {/* Label */}
      {label ? (
        <Text 
          style={[
            styles.label, 
            showError && styles.errorLabel,
            isSuccess && styles.successLabel,
            disabled && styles.disabledLabel,
            labelStyle
          ]}
          accessibilityRole="text"
          testID={`${testID}-label`}
        >
          {label}{isRequired ? ' *' : ''}
        </Text>
      ) : null}
      
      {/* Input container */}
      <View 
        style={[
          ...inputContainerStyles,
          multiline && styles.multilineContainer
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            multiline && styles.multilineInput,
            disabled && styles.disabledInput,
            inputStyle
          ]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          secureTextEntry={isSecureTextEntry}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalizeValue}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          editable={!disabled}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityRole="textbox"
          accessibilityState={{
            disabled: disabled,
            required: isRequired,
            invalid: !!internalError,
          }}
          testID={testID}
          {...rest}
        />
      </View>
      
      {/* Error message */}
      {showError ? (
        <Text 
          style={styles.errorText}
          accessibilityRole="text"
          accessibilityLabel={`Error: ${internalError}`}
          testID={`${testID}-error`}
        >
          {internalError}
        </Text>
      ) : null}
    </View>
  );
});

// Define styles
const styles = StyleSheet.create({
  container: {
    marginBottom: moderateScale(16),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(12),
    height: moderateScale(48),
    backgroundColor: colors.background.primary,
  },
  multilineContainer: {
    height: 'auto',
    minHeight: moderateScale(48),
    paddingVertical: moderateScale(8),
  },
  input: {
    flex: 1,
    ...textVariants.input,
    color: colors.text.primary,
    padding: 0, // Remove default padding
    paddingVertical: moderateScale(4),
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: moderateScale(80),
  },
  label: {
    ...textVariants.label,
    marginBottom: moderateScale(6),
    color: colors.text.primary,
  },
  errorLabel: {
    color: colors.error[500],
  },
  successLabel: {
    color: colors.success[500],
  },
  disabledLabel: {
    color: colors.text.disabled,
  },
  errorText: {
    ...textVariants.caption,
    color: colors.error[500],
    marginTop: moderateScale(4),
  },
  focused: {
    borderColor: colors.border.focus,
    borderWidth: 2,
  },
  error: {
    borderColor: colors.error[500],
  },
  success: {
    borderColor: colors.success[500],
  },
  disabled: {
    backgroundColor: colors.background.disabled,
    borderColor: colors.border.default,
  },
  disabledInput: {
    color: colors.text.disabled,
  },
});

// Set display name for debugging
Input.displayName = 'Input';