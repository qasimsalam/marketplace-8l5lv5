import React, { useState } from 'react'; // v18.2.0
import clsx from 'clsx'; // v1.2.1
import { Spinner, SpinnerSize } from './Spinner';
import { formatName } from '../../utils/format';

// Default placeholder SVG for when image is unavailable
const DEFAULT_AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZTVlN2ViIi8+PHRleHQgeD0iMTAiIHk9IjEwIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+P1Q8L3RleHQ+PC9zdmc+';

// Available background colors for initial-based avatars
const AVATAR_COLORS = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-red-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500"];

/**
 * Available avatar size options
 */
export enum AvatarSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  XLARGE = 'xlarge'
}

/**
 * Interface defining props for the Avatar component
 */
export interface AvatarProps {
  /**
   * Image source URL
   */
  src?: string;
  /**
   * Alternative text for the image
   */
  alt?: string;
  /**
   * User's first name (for generating initials)
   */
  firstName?: string;
  /**
   * User's last name (for generating initials)
   */
  lastName?: string;
  /**
   * Size of the avatar
   */
  size?: AvatarSize;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Whether to show a border around the avatar
   */
  hasBorder?: boolean;
  /**
   * Border color class (e.g., 'border-gray-200')
   */
  borderColor?: string;
  /**
   * Click handler for the avatar
   */
  onClick?: () => void;
  /**
   * Test ID for testing purposes
   */
  testId?: string;
}

/**
 * Extracts initials from a user's first and last name
 *
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns User's initials (1-2 characters)
 */
const getInitials = (
  firstName: string | undefined | null, 
  lastName: string | undefined | null
): string => {
  if (!firstName && !lastName) {
    return '?';
  }
  
  if (firstName && !lastName) {
    return firstName.charAt(0).toUpperCase();
  }
  
  if (!firstName && lastName) {
    return lastName.charAt(0).toUpperCase();
  }
  
  return `${firstName!.charAt(0)}${lastName!.charAt(0)}`.toUpperCase();
};

/**
 * Deterministically selects a background color based on user name
 *
 * @param name - User's name to generate color from
 * @returns CSS class for background color
 */
const getColorFromName = (name: string): string => {
  if (!name) return AVATAR_COLORS[0];
  
  // Simple hash function to get a consistent color for the same name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use modulo to get an index within the AVATAR_COLORS array
  const index = Math.abs(hash % AVATAR_COLORS.length);
  return AVATAR_COLORS[index];
};

/**
 * Renders a user avatar with image or text initials based on availability
 *
 * @param props - Avatar component props
 * @returns Rendered avatar component
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'User avatar',
  firstName,
  lastName,
  size = AvatarSize.MEDIUM,
  className = '',
  hasBorder = false,
  borderColor = 'border-gray-200',
  onClick,
  testId = 'avatar'
}) => {
  const [isLoading, setIsLoading] = useState(!!src);
  const [hasError, setHasError] = useState(false);
  
  // Get the formatted name for generating initials and color
  const formattedName = formatName(firstName, lastName);
  
  // Generate initials from name
  const initials = getInitials(firstName, lastName);
  
  // Get background color based on name
  const bgColorClass = getColorFromName(formattedName);
  
  // Handle image loading
  const handleImageLoad = () => {
    setIsLoading(false);
  };

  // Handle image loading errors
  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Size-based classes
  const sizeClasses = {
    [AvatarSize.SMALL]: 'h-8 w-8 text-xs',
    [AvatarSize.MEDIUM]: 'h-12 w-12 text-sm',
    [AvatarSize.LARGE]: 'h-16 w-16 text-base',
    [AvatarSize.XLARGE]: 'h-24 w-24 text-lg'
  };

  // Spinner size mapping
  const spinnerSizeMap = {
    [AvatarSize.SMALL]: SpinnerSize.SMALL,
    [AvatarSize.MEDIUM]: SpinnerSize.SMALL,
    [AvatarSize.LARGE]: SpinnerSize.MEDIUM,
    [AvatarSize.XLARGE]: SpinnerSize.MEDIUM
  };
  
  // Construct the className for the avatar
  const avatarClasses = clsx(
    'relative rounded-full flex items-center justify-center overflow-hidden',
    sizeClasses[size],
    hasBorder && `border-2 ${borderColor}`,
    onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
    className
  );

  // If we're still loading, show a loading spinner
  if (isLoading) {
    return (
      <div 
        className={avatarClasses}
        data-testid={`${testId}-loading`}
        aria-busy="true"
        aria-label={`Loading ${alt}`}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Spinner size={spinnerSizeMap[size]} />
        </div>
      </div>
    );
  }

  // If we have a valid image source and no errors, render the image
  if (src && !hasError) {
    return (
      <div 
        className={avatarClasses} 
        onClick={onClick}
        data-testid={testId}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
    );
  }

  // Otherwise, render initials-based avatar
  return (
    <div 
      className={clsx(
        avatarClasses,
        bgColorClass, 
        'text-white font-medium'
      )}
      onClick={onClick}
      data-testid={`${testId}-initials`}
      role="img"
      aria-label={formattedName || alt}
    >
      {initials}
    </div>
  );
};