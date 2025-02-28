import React, { useState, useRef } from 'react';
import clsx from 'clsx'; // ^1.2.1
import { useFormContext } from 'react-hook-form'; // ^7.46.1
import { FiEye, FiEyeOff } from 'react-icons/fi'; // ^4.10.1
import { isRequired } from '../../utils/validation';

/**
 * Enum for input types supported by the Input component
 */
export enum InputType {
  TEXT = 'text',
  PASSWORD = 'password',
  EMAIL = 'email',
  NUMBER = 'number',
  TEL = 'tel',
  URL = 'url',
  DATE = 'date',
  SEARCH = 'search',
}

/**
 * Enum for input sizes supported by the Input component
 */
export enum InputSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

/**
 * Props interface for the Input component
 */
export interface InputProps {
  // Basic props
  type?: InputType;
  name?: string;
  value?: string;
  placeholder?: string;
  label?: string;
  error?: string;
  
  // Appearance props
  size?: InputSize;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  isFullWidth?: boolean;
  
  // Focus behavior
  autoFocus?: boolean;
  autoComplete?: string;
  
  // Validation constraints
  min?: number | string;
  max?: number | string;
  step?: number | string;
  pattern?: string;
  maxLength?: number;
  
  // Content extras
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  
  // Custom styling
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  errorClassName?: string;
  
  // Accessibility
  ariaLabel?: string;
  
  // Testing
  testId?: string;
  
  // Event handlers
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Input Component - A versatile, accessible input component for the AI Talent Marketplace.
 * 
 * This component supports:
 * - Various input types (text, password, email, etc.)
 * - Different states (focus, error, disabled)
 * - Form integration with react-hook-form
 * - Accessibility features (WCAG 2.1 Level AA)
 * - Customization through props
 */
const Input = ({
  // Destructure all props with defaults
  type = InputType.TEXT,
  name,
  value,
  placeholder,
  label,
  error,
  size = InputSize.MEDIUM,
  disabled = false,
  readOnly = false,
  required = false,
  isFullWidth = false,
  autoFocus = false,
  autoComplete,
  min,
  max,
  step,
  pattern,
  maxLength,
  prefix,
  suffix,
  className,
  inputClassName,
  labelClassName,
  errorClassName,
  ariaLabel,
  testId,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  onKeyUp,
}: InputProps): JSX.Element => {
  // State for tracking focus
  const [isFocused, setIsFocused] = useState<boolean>(false);
  
  // State for password visibility
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Reference to the input element
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Form integration via React Hook Form if name is provided
  const formContext = name ? useFormContext() : null;
  
  // If we have a form context and a name, get the register function
  const fieldProps = name && formContext?.register 
    ? formContext.register(name) 
    : {};
  
  // Get error from either prop or form state
  const fieldError = name && formContext?.formState?.errors[name];
  const errorMessage = error || (fieldError?.message as string);
  
  // Handle input focus
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };
  
  // Handle input blur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
    if (fieldProps.onBlur) fieldProps.onBlur(e);
  };
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);
    if (fieldProps.onChange) fieldProps.onChange(e);
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
    
    // Focus back on input after toggling visibility
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };
  
  // Determine the actual input type (for password visibility)
  const inputType = type === InputType.PASSWORD && showPassword
    ? InputType.TEXT
    : type;
  
  // Construct the className based on states
  const containerClasses = clsx(
    'input-container',
    {
      'input-fullwidth': isFullWidth,
      'input-disabled': disabled,
      'input-focused': isFocused,
      'input-error': !!errorMessage,
      [`input-size-${size}`]: true,
    },
    className
  );
  
  const inputClasses = clsx(
    'input-field',
    {
      'input-has-prefix': !!prefix,
      'input-has-suffix': !!suffix || type === InputType.PASSWORD,
      'input-error': !!errorMessage,
      'input-disabled': disabled,
      'input-readonly': readOnly,
    },
    inputClassName
  );
  
  const labelClasses = clsx(
    'input-label',
    {
      'input-label-required': required,
    },
    labelClassName
  );
  
  const errorClasses = clsx(
    'input-error-message',
    errorClassName
  );
  
  // Generate unique ID for aria-describedby
  const errorId = name ? `${name}-error` : undefined;
  
  // Create a ref handler that combines our ref with react-hook-form's ref
  const setInputRef = (node: HTMLInputElement | null) => {
    // Set our internal ref
    inputRef.current = node;
    
    // Set react-hook-form ref if available
    if (typeof fieldProps.ref === 'function' && node) {
      fieldProps.ref(node);
    }
  };
  
  return (
    <div className={containerClasses}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={name} 
          className={labelClasses}
        >
          {label}
          {required && <span className="input-required-indicator" aria-hidden="true">*</span>}
        </label>
      )}
      
      {/* Input wrapper */}
      <div className="input-wrapper">
        {/* Prefix */}
        {prefix && (
          <div className="input-prefix" aria-hidden="true">
            {prefix}
          </div>
        )}
        
        {/* Input element */}
        <input
          ref={setInputRef}
          id={name}
          type={inputType}
          name={name}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          pattern={pattern}
          maxLength={maxLength}
          className={inputClasses}
          aria-label={ariaLabel || label}
          aria-invalid={!!errorMessage}
          aria-required={required}
          aria-describedby={errorMessage ? errorId : undefined}
          data-testid={testId || `input-${name || 'unnamed'}`}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        />
        
        {/* Password toggle button */}
        {type === InputType.PASSWORD && (
          <button
            type="button"
            className="input-password-toggle"
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
          </button>
        )}
        
        {/* Suffix (only if not password type) */}
        {suffix && type !== InputType.PASSWORD && (
          <div className="input-suffix" aria-hidden="true">
            {suffix}
          </div>
        )}
      </div>
      
      {/* Error message */}
      {errorMessage && (
        <div 
          id={errorId} 
          className={errorClasses} 
          aria-live="polite"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default Input;