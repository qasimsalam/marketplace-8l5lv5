import React from 'react'; // v18.2.0
import clsx from 'clsx'; // v1.2.1

/**
 * Available spinner sizes
 */
export enum SpinnerSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

/**
 * Available spinner colors
 */
export enum SpinnerColor {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  WHITE = 'white',
  GRAY = 'gray'
}

/**
 * Available spinner animation variants
 */
export enum SpinnerVariant {
  CIRCLE = 'circle',
  DOTS = 'dots'
}

/**
 * Props for the Spinner component
 */
export interface SpinnerProps {
  /**
   * Size of the spinner (defaults to MEDIUM)
   */
  size?: SpinnerSize;
  /**
   * Color of the spinner (defaults to PRIMARY)
   */
  color?: SpinnerColor;
  /**
   * Animation variant of the spinner (defaults to CIRCLE)
   */
  variant?: SpinnerVariant;
  /**
   * Additional class names to apply to the spinner
   */
  className?: string;
  /**
   * Test ID for testing purposes
   */
  testId?: string;
}

/**
 * A reusable loading spinner component with customizable size, color, and appearance
 * for indicating loading states throughout the AI Talent Marketplace application.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = SpinnerSize.MEDIUM,
  color = SpinnerColor.PRIMARY,
  variant = SpinnerVariant.CIRCLE,
  className,
  testId
}) => {
  // Size-based classes
  const sizeClasses = {
    [SpinnerSize.SMALL]: 'h-4 w-4',
    [SpinnerSize.MEDIUM]: 'h-8 w-8',
    [SpinnerSize.LARGE]: 'h-12 w-12'
  };

  // Color-based classes for circle variant
  const circleColorClasses = {
    [SpinnerColor.PRIMARY]: 'border-primary-600 border-t-transparent',
    [SpinnerColor.SECONDARY]: 'border-secondary-600 border-t-transparent',
    [SpinnerColor.WHITE]: 'border-white border-t-transparent',
    [SpinnerColor.GRAY]: 'border-gray-600 border-t-transparent'
  };

  // Color-based classes for dots variant
  const dotsColorClasses = {
    [SpinnerColor.PRIMARY]: 'bg-primary-600',
    [SpinnerColor.SECONDARY]: 'bg-secondary-600',
    [SpinnerColor.WHITE]: 'bg-white',
    [SpinnerColor.GRAY]: 'bg-gray-600'
  };
  
  // Render circle variant
  if (variant === SpinnerVariant.CIRCLE) {
    return (
      <div
        className={clsx(
          'inline-block rounded-full animate-spin',
          sizeClasses[size],
          'border-2 border-solid',
          circleColorClasses[color],
          className
        )}
        role="status"
        aria-label="Loading"
        data-testid={testId}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  // Sizes for dots
  const dotSizeClasses = {
    [SpinnerSize.SMALL]: 'h-1 w-1',
    [SpinnerSize.MEDIUM]: 'h-2 w-2',
    [SpinnerSize.LARGE]: 'h-3 w-3'
  };

  // Spacing between dots
  const dotsSpacingClasses = {
    [SpinnerSize.SMALL]: 'space-x-1',
    [SpinnerSize.MEDIUM]: 'space-x-2',
    [SpinnerSize.LARGE]: 'space-x-3'
  };

  // Render dots variant
  return (
    <div
      className={clsx(
        'inline-flex items-center',
        dotsSpacingClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
      data-testid={testId}
    >
      <div 
        className={clsx(
          'rounded-full animate-bounce',
          dotSizeClasses[size],
          dotsColorClasses[color]
        )} 
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={clsx(
          'rounded-full animate-bounce',
          dotSizeClasses[size],
          dotsColorClasses[color]
        )}
        style={{ animationDelay: '150ms' }}
      />
      <div
        className={clsx(
          'rounded-full animate-bounce',
          dotSizeClasses[size],
          dotsColorClasses[color]
        )}
        style={{ animationDelay: '300ms' }}
      />
      <span className="sr-only">Loading...</span>
    </div>
  );
};