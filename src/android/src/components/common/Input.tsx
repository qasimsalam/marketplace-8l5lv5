/**
 * Input Component
 * 
 * A customizable text input component for the AI Talent Marketplace Android application
 * that supports various input types, states, and validation capabilities.
 * 
 * @version 1.0.0
 */

import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo
} from 'react'; // v18.2.0
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  StyleProp,
  ViewStyle,
  TextStyle,
  TextInputProps,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  Platform,
  Keyboard
} from 'react-native'; // v0.72.x
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // v^9.2.0

// Import design system utilities
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';
import { layout, spacing, border } from '../../styles/layout';
import { moderateScale } from '../../utils/responsive';
import { validateEmail, validatePassword, validatePhone, validateUrl } from '../../utils/validation';
import { useTheme } from '../../styles/theme';

/**
 * Enum defining available input type options
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
 * Enum defining available input size options
 */
export enum InputSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

/**
 * Interface defining props for the Input component
 */
export interface InputProps extends Partial<TextInputProps> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  type?: InputType;
  size?: InputSize;
  isRequired?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
  maxLength?: number;
  autoCapitalize?: string;
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
  validator?: (value: string) => boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showClearButton?: boolean;
  returnKeyType?: string;
  blurOnSubmit?: boolean;
  isFullWidth?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Interface defining ref methods exposed by the Input component
 */
export interface InputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

/**
 * Generates input styles based on the current state (focused, error, success, disabled) and size
 * 
 * @param focused Whether the input is focused
 * @param hasError Whether the input has an error
 * @param isSuccess Whether the input is in success state
 * @param disabled Whether the input is disabled
 * @param size The input size
 * @param theme The current theme
 * @returns Combined styles for the input container and text input
 */
const getInputStyles = (
  focused: boolean,
  hasError: boolean,
  isSuccess: boolean,
  disabled: boolean,
  size: InputSize,
  theme: any
) => {
  // Base container styles
  const containerStyle: ViewStyle = {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    backgroundColor: disabled ? theme.colors.background.disabled : theme.colors.background.primary,
    overflow: 'hidden',
    opacity: disabled ? 0.7 : 1,
  };

  // Base text input styles
  const inputStyle: TextStyle = {
    ...textVariants.input,
    color: disabled ? theme.colors.text.disabled : theme.colors.text.primary,
  };

  // Determine height based on size
  let height;
  switch (size) {
    case InputSize.SMALL:
      height = moderateScale(32);
      containerStyle.paddingHorizontal = spacing.xs;
      containerStyle.paddingVertical = spacing.xxs;
      break;
    case InputSize.LARGE:
      height = moderateScale(56);
      containerStyle.paddingHorizontal = spacing.s;
      containerStyle.paddingVertical = spacing.xs;
      break;
    case InputSize.MEDIUM:
    default:
      height = moderateScale(48);
      containerStyle.paddingHorizontal = spacing.s;
      containerStyle.paddingVertical = spacing.xxs;
  }

  containerStyle.minHeight = height;

  // Apply focused styles
  if (focused && !disabled) {
    containerStyle.borderColor = colors.primary[600];
  }

  // Apply error styles
  if (hasError && !disabled) {
    containerStyle.borderColor = colors.error[500];
  }

  // Apply success styles
  if (isSuccess && !disabled && !hasError) {
    containerStyle.borderColor = colors.success[500];
  }

  return { containerStyle, inputStyle };
};

/**
 * Reusable text input component with support for different types, states, and validation
 */
export const Input = forwardRef<TextInput, InputProps>((props, ref) => {
  const {
    label,
    value,
    onChangeText,
    placeholder,
    error,
    type = InputType.TEXT,
    size = InputSize.MEDIUM,
    isRequired = false,
    isSuccess = false,
    disabled = false,
    maxLength,
    autoCapitalize = 'none',
    autoCorrect = false,
    multiline = false,
    numberOfLines = 1,
    style,
    inputStyle,
    labelStyle,
    errorStyle,
    validator,
    onBlur,
    onFocus,
    onSubmitEditing,
    leftIcon,
    rightIcon,
    showClearButton = false,
    returnKeyType = 'done',
    blurOnSubmit = true,
    isFullWidth = true,
    testID,
    accessibilityLabel,
    ...restProps
  } = props;

  // State
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isTouched, setIsTouched] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string>('');
  const [secureTextEntry, setSecureTextEntry] = useState<boolean>(type === InputType.PASSWORD);

  // Refs
  const inputRef = useRef<TextInput>(null);

  // Hooks
  const theme = useTheme();

  // Handle focus event
  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) {
      onFocus();
    }
  };

  // Handle blur event
  const handleBlur = () => {
    setIsFocused(false);
    setIsTouched(true);
    
    // Validate on blur if there's no explicit error
    if (!error && (isRequired || value.length > 0)) {
      const validationResult = handleValidation(value, type, validator, isRequired);
      setInternalError(validationResult.isValid ? '' : validationResult.errorMessage);
    }
    
    if (onBlur) {
      onBlur();
    }
  };

  // Handle clear input
  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  // Handle text change with validation
  const handleTextChange = (text: string) => {
    onChangeText(text);
    
    // Clear error when user starts typing after an error
    if (isTouched && internalError) {
      setInternalError('');
    }
  };

  // Handle password visibility toggle
  const togglePasswordVisibility = () => {
    setSecureTextEntry(prev => !prev);
  };

  // Update internal error if external error changes
  useEffect(() => {
    if (error) {
      setInternalError('');
    }
  }, [error]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    blur: () => {
      inputRef.current?.blur();
    },
    clear: () => {
      onChangeText('');
    }
  }));

  // Get styles based on current state
  const { containerStyle, inputStyle: baseInputStyle } = useMemo(() => 
    getInputStyles(
      isFocused, 
      !!error || !!internalError, 
      isSuccess, 
      disabled, 
      size,
      theme
    ),
    [isFocused, error, internalError, isSuccess, disabled, size, theme]
  );

  // Combine styles
  const combinedContainerStyle = [
    containerStyle,
    isFullWidth && layout.fullWidth,
    style,
  ];

  const combinedInputStyle = [
    baseInputStyle,
    inputStyle,
    leftIcon && { paddingLeft: spacing.s },
    (rightIcon || (type === InputType.PASSWORD) || (showClearButton && value)) && 
      { paddingRight: spacing.xl }
  ];

  // Determine the keyboard type based on input type
  const keyboardType = getKeyboardType(type);

  // Error message to display (prioritize external error)
  const displayError = error || internalError;

  // Determine if we should show an error state
  const hasError = !!displayError;

  // Determine if clear button should be shown
  const shouldShowClear = showClearButton && value.length > 0 && !disabled;

  // Determine if we should show the password toggle button
  const shouldShowPasswordToggle = type === InputType.PASSWORD && !disabled;

  // Accessibility props
  const accessibilityProps = {
    accessible: true,
    accessibilityLabel: accessibilityLabel || label || placeholder,
    accessibilityState: {
      disabled,
      selected: isFocused,
    },
    accessibilityHint: hasError ? displayError : isRequired ? 'Required field' : undefined,
    accessibilityRole: 'text',
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      {label && (
        <Text 
          style={[
            styles.label, 
            textVariants.label,
            hasError && styles.errorLabel,
            labelStyle
          ]}
          accessible={true}
          accessibilityRole="text"
        >
          {label}
          {isRequired && <Text style={styles.requiredAsterisk}> *</Text>}
        </Text>
      )}
      
      {/* Input Container */}
      <View style={combinedContainerStyle}>
        {/* Left Icon */}
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            {leftIcon}
          </View>
        )}
        
        {/* Text Input */}
        <TextInput
          {...restProps}
          ref={inputRef}
          style={combinedInputStyle}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.tertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={!disabled}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize as any}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          returnKeyType={returnKeyType as any}
          blurOnSubmit={blurOnSubmit}
          testID={testID}
          {...accessibilityProps}
        />
        
        {/* Right Icons */}
        <View style={styles.rightIconsContainer}>
          {/* Clear Button */}
          {shouldShowClear && (
            <TouchableOpacity 
              onPress={handleClear}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Clear text"
            >
              <MaterialIcons name="clear" size={18} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}
          
          {/* Password Toggle Button */}
          {shouldShowPasswordToggle && (
            <TouchableOpacity 
              onPress={togglePasswordVisibility}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={secureTextEntry ? "Show password" : "Hide password"}
            >
              <MaterialIcons 
                name={secureTextEntry ? "visibility" : "visibility-off"} 
                size={18} 
                color={theme.colors.text.tertiary}
              />
            </TouchableOpacity>
          )}
          
          {/* Custom Right Icon */}
          {rightIcon && !shouldShowClear && !shouldShowPasswordToggle && (
            <View style={styles.iconButton}>
              {rightIcon}
            </View>
          )}
        </View>
      </View>
      
      {/* Error Message */}
      {hasError && (
        <Text 
          style={[styles.errorText, textVariants.caption, errorStyle]}
          accessible={true}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          {displayError}
        </Text>
      )}
    </View>
  );
});

/**
 * Validates input value based on input type and custom validation function
 * 
 * @param value The value to validate
 * @param type The input type
 * @param customValidator Optional custom validator function
 * @param isRequired Whether the field is required
 * @returns Validation result with isValid flag and error message
 */
const handleValidation = (
  value: string,
  type: InputType,
  customValidator?: (value: string) => boolean,
  isRequired: boolean = false
): { isValid: boolean; errorMessage: string } => {
  // If not required and empty, it's valid
  if (!isRequired && (!value || value.trim() === '')) {
    return { isValid: true, errorMessage: '' };
  }

  // If required and empty, it's invalid
  if (isRequired && (!value || value.trim() === '')) {
    return { isValid: false, errorMessage: 'This field is required' };
  }

  // If there's a custom validator, use it first
  if (customValidator && !customValidator(value)) {
    return { isValid: false, errorMessage: 'Invalid input' };
  }

  // Type-specific validation
  switch (type) {
    case InputType.EMAIL:
      if (!validateEmail(value)) {
        return { isValid: false, errorMessage: 'Please enter a valid email address' };
      }
      break;
    case InputType.PASSWORD:
      if (!validatePassword(value)) {
        return {
          isValid: false,
          errorMessage: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
        };
      }
      break;
    case InputType.PHONE:
      if (!validatePhone(value)) {
        return { isValid: false, errorMessage: 'Please enter a valid phone number' };
      }
      break;
    case InputType.URL:
      if (!validateUrl(value)) {
        return { isValid: false, errorMessage: 'Please enter a valid URL' };
      }
      break;
    case InputType.NUMBER:
      if (isNaN(Number(value))) {
        return { isValid: false, errorMessage: 'Please enter a valid number' };
      }
      break;
    default:
      // For text type, just check that it's not empty if required
      if (isRequired && (!value || value.trim() === '')) {
        return { isValid: false, errorMessage: 'This field is required' };
      }
  }

  return { isValid: true, errorMessage: '' };
};

/**
 * Determines the appropriate keyboard type based on input type
 * 
 * @param type The input type
 * @returns React Native keyboard type
 */
const getKeyboardType = (type: InputType): 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url' => {
  switch (type) {
    case InputType.EMAIL:
      return 'email-address';
    case InputType.NUMBER:
      return 'numeric';
    case InputType.PHONE:
      return 'phone-pad';
    case InputType.URL:
      return 'url';
    default:
      return 'default';
  }
};

// Component styles
const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  label: {
    marginBottom: spacing.xxs,
    color: colors.text.secondary,
  },
  errorLabel: {
    color: colors.error[500],
  },
  requiredAsterisk: {
    color: colors.error[500],
  },
  leftIconContainer: {
    position: 'absolute',
    left: spacing.xs,
    height: '100%',
    justifyContent: 'center',
    zIndex: 1,
  },
  rightIconsContainer: {
    position: 'absolute',
    right: spacing.xs,
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
  },
  iconButton: {
    padding: spacing.xxs,
    marginLeft: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error[500],
    marginTop: spacing.xxs,
  },
});

// Named export for the Input component
export default Input;