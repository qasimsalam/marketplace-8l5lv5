import React from 'react'; // v18.2.0
import clsx from 'clsx'; // v1.2.1
import { Spinner, SpinnerColor, SpinnerSize } from './Spinner';

/**
 * Available button variants
 */
export enum ButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  DANGER = 'danger',
  SUCCESS = 'success',
  OUTLINE = 'outline',
  GHOST = 'ghost'
}

/**
 * Available button sizes
 */
export enum ButtonSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

/**
 * Props for the Button component
 */
export interface ButtonProps {
  /**
   * Button content
   */
  children: React.ReactNode;
  /**
   * Button visual style variant
   */
  variant?: ButtonVariant;
  /**
   * Button size
   */
  size?: ButtonSize;
  /**
   * HTML button type attribute
   */
  type?: 'button' | 'submit' | 'reset';
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  /**
   * Whether the button is in loading state
   */
  isLoading?: boolean;
  /**
   * Whether the button should take full width of its container
   */
  isFullWidth?: boolean;
  /**
   * Additional class names to apply to the button
   */
  className?: string;
  /**
   * Click event handler
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Accessible label for the button (for screen readers)
   */
  ariaLabel?: string;
  /**
   * Test ID for testing purposes
   */
  testId?: string;
}

/**
 * A customizable, accessible button component for the AI Talent Marketplace web application,
 * supporting multiple variants, sizes, loading states, and other interactive features.
 * This component serves as a primary user interaction element throughout the application.
 */
const Button: React.FC<ButtonProps> = ({
  children,
  variant = ButtonVariant.PRIMARY,
  size = ButtonSize.MEDIUM,
  type = 'button',
  disabled = false,
  isLoading = false,
  isFullWidth = false,
  className = '',
  onClick,
  ariaLabel,
  testId
}) => {
  // Variant-based classes
  const variantClasses = {
    [ButtonVariant.PRIMARY]: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500',
    [ButtonVariant.SECONDARY]: 'bg-secondary-600 hover:bg-secondary-700 text-white focus:ring-secondary-500',
    [ButtonVariant.DANGER]: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    [ButtonVariant.SUCCESS]: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    [ButtonVariant.OUTLINE]: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    [ButtonVariant.GHOST]: 'bg-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:ring-gray-500'
  };

  // Size-based classes
  const sizeClasses = {
    [ButtonSize.SMALL]: 'px-3 py-1.5 text-sm',
    [ButtonSize.MEDIUM]: 'px-4 py-2 text-base',
    [ButtonSize.LARGE]: 'px-6 py-3 text-lg'
  };

  // Determine spinner color based on button variant
  const getSpinnerColor = (): SpinnerColor => {
    switch (variant) {
      case ButtonVariant.OUTLINE:
      case ButtonVariant.GHOST:
        return SpinnerColor.GRAY;
      default:
        return SpinnerColor.WHITE;
    }
  };

  // Determine spinner size based on button size
  const getSpinnerSize = (): SpinnerSize => {
    switch (size) {
      case ButtonSize.SMALL:
        return SpinnerSize.SMALL;
      case ButtonSize.LARGE:
        return SpinnerSize.LARGE;
      default:
        return SpinnerSize.MEDIUM;
    }
  };

  // Handle button click - prevent if disabled or loading
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) {
      event.preventDefault();
      return;
    }
    
    onClick?.(event);
  };

  return (
    <button
      type={type}
      className={clsx(
        // Base styles
        'relative inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        // Variant and size styles
        variantClasses[variant],
        sizeClasses[size],
        // Disabled state
        (disabled || isLoading) && 'opacity-70 cursor-not-allowed',
        // Full width option
        isFullWidth && 'w-full',
        // Custom class
        className
      )}
      disabled={disabled || isLoading}
      onClick={handleClick}
      aria-disabled={disabled || isLoading}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {isLoading && (
        <span className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Spinner 
            size={getSpinnerSize()} 
            color={getSpinnerColor()} 
          />
        </span>
      )}
      
      <span className={clsx(isLoading && 'invisible')}>
        {children}
      </span>
    </button>
  );
};

export default Button;