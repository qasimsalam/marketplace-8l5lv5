import React from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^1.2.1

export enum BadgeVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  SUCCESS = 'success',
  WARNING = 'warning',
  DANGER = 'danger',
  INFO = 'info',
  LIGHT = 'light',
  DARK = 'dark'
}

export enum BadgeSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  rounded?: boolean;
  style?: React.CSSProperties;
  testId?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = BadgeVariant.PRIMARY,
  size = BadgeSize.SMALL,
  className = '',
  rounded = true,
  style,
  testId,
}) => {
  // CSS classes for different variants
  const variantClasses = {
    [BadgeVariant.PRIMARY]: 'bg-blue-100 text-blue-800',
    [BadgeVariant.SECONDARY]: 'bg-gray-100 text-gray-800',
    [BadgeVariant.SUCCESS]: 'bg-green-100 text-green-800',
    [BadgeVariant.WARNING]: 'bg-yellow-100 text-yellow-800',
    [BadgeVariant.DANGER]: 'bg-red-100 text-red-800',
    [BadgeVariant.INFO]: 'bg-indigo-100 text-indigo-800',
    [BadgeVariant.LIGHT]: 'bg-gray-50 text-gray-600',
    [BadgeVariant.DARK]: 'bg-gray-800 text-white'
  };

  // CSS classes for different sizes
  const sizeClasses = {
    [BadgeSize.SMALL]: 'text-xs px-2 py-0.5',
    [BadgeSize.MEDIUM]: 'text-sm px-2.5 py-1',
    [BadgeSize.LARGE]: 'text-base px-3 py-1.5'
  };

  // Construct the final className using clsx
  const badgeClasses = clsx(
    'inline-flex items-center justify-center font-medium',
    variantClasses[variant],
    sizeClasses[size],
    rounded ? 'rounded-full' : 'rounded',
    className
  );

  return (
    <span 
      className={badgeClasses}
      style={style}
      data-testid={testId}
      role="status"
      aria-label={typeof children === 'string' ? children : undefined}
    >
      {children}
    </span>
  );
};

export default Badge;