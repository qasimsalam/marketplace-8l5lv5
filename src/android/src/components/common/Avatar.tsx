/**
 * Avatar Component
 * 
 * A reusable component for displaying user avatars with support for:
 * - Image loading with fallback to user initials
 * - Multiple predefined sizes with responsive scaling
 * - Online status indicator
 * - Loading states
 * - Pressable avatar for interactive elements
 */

import React, { useState, useCallback, useMemo } from 'react'; // v18.2.0
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native'; // v0.72.x

// Internal imports
import { colors } from '../../../styles/colors';
import { typography } from '../../../styles/typography';
import { moderateScale } from '../../../utils/responsive';

// Define standard avatar sizes
export enum AvatarSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  XLARGE = 'XLARGE',
}

// Avatar size values in pixels (will be scaled using moderateScale)
const AVATAR_SIZES = {
  SMALL: 32,
  MEDIUM: 48,
  LARGE: 64,
  XLARGE: 96,
};

// Array of background colors for avatars without images
const AVATAR_COLORS = [
  colors.primary[500],
  colors.secondary[500], 
  colors.accent[500],
  colors.success[500],
  colors.warning[500],
];

// Interface for Avatar component props
export interface AvatarProps {
  /**
   * URL of the user's profile image
   */
  imageUrl?: string;
  
  /**
   * User's name (used for generating initials when image is unavailable)
   */
  name?: string;
  
  /**
   * Size of the avatar (preset or custom size in points)
   */
  size?: AvatarSize | number;
  
  /**
   * Indicates if the user is currently online
   */
  isOnline?: boolean;
  
  /**
   * Additional styles to apply to the avatar container
   */
  style?: ViewStyle;
  
  /**
   * Test ID for testing
   */
  testID?: string;
  
  /**
   * Callback for when the avatar is pressed
   */
  onPress?: () => void;
}

/**
 * Extracts initials from a user's name
 * @param name User's name
 * @returns One or two uppercase characters representing the user's initials
 */
const getInitials = (name?: string): string => {
  if (!name || name.trim() === '') {
    return '?';
  }

  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

  const firstInitial = firstName.charAt(0);
  const secondInitial = lastName ? lastName.charAt(0) : '';

  return (firstInitial + secondInitial).toUpperCase();
};

/**
 * Deterministically selects a background color based on the user's name
 * @param name User's name
 * @returns A color value from the AVATAR_COLORS array
 */
const getColorFromName = (name?: string): string => {
  if (!name || name.trim() === '') {
    return AVATAR_COLORS[0];
  }

  // Simple hash function to generate a consistent index
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash += name.charCodeAt(i);
  }

  // Get a consistent index within the array bounds
  const index = hash % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

/**
 * Returns the dimension for the avatar based on the size prop
 * @param size Size value or preset
 * @returns Pixel dimensions for avatar width and height
 */
const getAvatarSize = (size?: AvatarSize | number): number => {
  if (typeof size === 'number') {
    return moderateScale(size);
  }

  if (size) {
    return moderateScale(AVATAR_SIZES[size]);
  }

  // Default to medium size
  return moderateScale(AVATAR_SIZES.MEDIUM);
};

/**
 * A customizable avatar component for displaying user profile images or initials
 */
export const Avatar: React.FC<AvatarProps> = ({
  imageUrl,
  name,
  size = AvatarSize.MEDIUM,
  isOnline = false,
  style,
  testID,
  onPress,
}) => {
  // State to track image loading
  const [isLoading, setIsLoading] = useState(!!imageUrl);
  const [hasError, setHasError] = useState(false);

  // Calculate avatar size
  const avatarSize = useMemo(() => getAvatarSize(size), [size]);
  
  // Calculate avatar styles
  const containerStyle = useMemo(() => {
    return [
      styles.container,
      {
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarSize / 2,
      },
      style,
    ];
  }, [avatarSize, style]);

  // Calculate background color if no image is displayed
  const backgroundColor = useMemo(() => {
    return getColorFromName(name);
  }, [name]);

  // Calculate font size for initials
  const initialsStyle = useMemo(() => {
    const fontSize = avatarSize * 0.4; // 40% of avatar size
    return {
      fontSize: moderateScale(fontSize),
      fontWeight: typography.fontWeight.medium,
      color: colors.white,
    };
  }, [avatarSize]);

  // Indicator size based on avatar size
  const indicatorSize = useMemo(() => {
    return Math.max(8, avatarSize * 0.3); // 30% of avatar size, min 8dp
  }, [avatarSize]);

  // Status indicator size based on avatar size
  const statusIndicatorSize = useMemo(() => {
    return Math.max(8, avatarSize * 0.25); // 25% of avatar size, min 8dp
  }, [avatarSize]);

  // Status indicator position
  const statusIndicatorStyle = useMemo(() => {
    return {
      width: statusIndicatorSize,
      height: statusIndicatorSize,
      borderRadius: statusIndicatorSize / 2,
      borderWidth: Math.max(1, statusIndicatorSize * 0.125), // 12.5% of indicator size, min 1dp
      borderColor: colors.white,
      backgroundColor: isOnline ? colors.success[500] : colors.gray[400],
      position: 'absolute',
      bottom: 0,
      right: 0,
    } as ViewStyle;
  }, [statusIndicatorSize, isOnline]);

  // Handler for image load success
  const handleLoadSuccess = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  // Handler for image load failure
  const handleLoadError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Render initials when no image is available or when image loading fails
  const renderInitials = () => (
    <View
      style={[
        styles.initialsContainer,
        {
          backgroundColor,
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
        },
      ]}
    >
      <Text style={initialsStyle}>{getInitials(name)}</Text>
    </View>
  );

  // Render content based on state
  const renderContent = () => {
    if (imageUrl && !hasError) {
      return (
        <>
          {isLoading && (
            <ActivityIndicator
              style={styles.loadingIndicator}
              size={indicatorSize}
              color={colors.primary[500]}
            />
          )}
          <Image
            source={{ uri: imageUrl }}
            style={[
              styles.image,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              },
              isLoading && styles.hiddenImage,
            ]}
            onLoad={handleLoadSuccess}
            onError={handleLoadError}
            testID={`${testID}-image`}
          />
        </>
      );
    }

    return renderInitials();
  };

  // Wrap in Pressable if onPress is provided
  const ContentWrapper = onPress ? Pressable : View;
  const wrapperProps = onPress
    ? {
        onPress,
        accessibilityRole: 'button',
        accessibilityLabel: `Avatar for ${name || 'user'}`,
      }
    : {};

  return (
    <ContentWrapper
      style={containerStyle}
      testID={testID}
      {...wrapperProps}
    >
      {renderContent()}
      {statusIndicatorSize > 0 && (
        <View
          style={statusIndicatorStyle}
          testID={`${testID}-status`}
        />
      )}
    </ContentWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
  hiddenImage: {
    opacity: 0,
  },
  loadingIndicator: {
    position: 'absolute',
    zIndex: 1,
  },
});

export default Avatar;