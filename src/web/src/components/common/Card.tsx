import React from 'react'; // v18.2.0
import clsx from 'clsx'; // v1.2.1

/**
 * Enum defining available card style variants
 */
export enum CardVariant {
  DEFAULT = 'default',
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  DANGER = 'danger'
}

/**
 * Enum defining shadow elevation levels for the card
 */
export enum CardElevation {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

/**
 * Interface defining props for the Card component
 */
export interface CardProps {
  /** Content to be rendered inside the card */
  children: React.ReactNode;
  /** Additional CSS classes to apply to the card */
  className?: string;
  /** Visual style variant of the card */
  variant?: CardVariant;
  /** Shadow elevation level of the card */
  elevation?: CardElevation;
  /** Whether the card should have a border */
  bordered?: boolean;
  /** Whether the card should have rounded corners */
  rounded?: boolean;
  /** Content to be rendered in the card's header section */
  header?: React.ReactNode;
  /** Content to be rendered in the card's footer section */
  footer?: React.ReactNode;
  /** Optional click handler for the card */
  onClick?: () => void;
  /** HTML ID attribute for the card */
  id?: string;
  /** Test ID for automated testing */
  testId?: string;
}

/**
 * A versatile, reusable card component that provides a styled container with optional header, 
 * footer, and various visual variants. It serves as a fundamental building block for displaying 
 * structured content throughout the AI Talent Marketplace application.
 * 
 * @param {CardProps} props - The props for the Card component
 * @returns {JSX.Element} The rendered card component
 */
export const Card = React.memo(({
  children,
  className,
  variant = CardVariant.DEFAULT,
  elevation = CardElevation.LOW,
  bordered = false,
  rounded = true,
  header,
  footer,
  onClick,
  id,
  testId
}: CardProps): JSX.Element => {
  // Generate variant-specific CSS classes
  const variantClasses = {
    [CardVariant.DEFAULT]: 'bg-white',
    [CardVariant.PRIMARY]: 'bg-primary-50 text-primary-900',
    [CardVariant.SECONDARY]: 'bg-secondary-50 text-secondary-900',
    [CardVariant.INFO]: 'bg-info-50 text-info-900',
    [CardVariant.SUCCESS]: 'bg-success-50 text-success-900',
    [CardVariant.WARNING]: 'bg-warning-50 text-warning-900',
    [CardVariant.DANGER]: 'bg-danger-50 text-danger-900'
  }[variant];
  
  // Generate elevation-specific CSS classes
  const elevationClasses = {
    [CardElevation.NONE]: '',
    [CardElevation.LOW]: 'shadow-sm',
    [CardElevation.MEDIUM]: 'shadow',
    [CardElevation.HIGH]: 'shadow-lg'
  }[elevation];
  
  // Generate border classes based on variant if bordered is true
  const borderClasses = bordered 
    ? {
        [CardVariant.DEFAULT]: 'border border-gray-200',
        [CardVariant.PRIMARY]: 'border border-primary-200',
        [CardVariant.SECONDARY]: 'border border-secondary-200',
        [CardVariant.INFO]: 'border border-info-200',
        [CardVariant.SUCCESS]: 'border border-success-200',
        [CardVariant.WARNING]: 'border border-warning-200',
        [CardVariant.DANGER]: 'border border-danger-200'
      }[variant]
    : '';
  
  // Generate rounded CSS classes
  const roundedClasses = rounded ? 'rounded-lg' : '';
  
  // Combine all CSS classes
  const cardClasses = clsx(
    'transition-shadow',
    variantClasses,
    elevationClasses,
    borderClasses,
    roundedClasses,
    onClick && 'cursor-pointer hover:shadow-md',
    className
  );
  
  return (
    <div 
      className={cardClasses}
      onClick={onClick}
      id={id}
      data-testid={testId}
    >
      {header && (
        <div className="px-4 py-3 border-b border-gray-200">
          {header}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
      {footer && (
        <div className="px-4 py-3 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
});

// Set display name for debugging
Card.displayName = 'Card';