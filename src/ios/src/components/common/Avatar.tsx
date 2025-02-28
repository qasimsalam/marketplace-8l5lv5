/**
 * A reusable Avatar component that displays either a user profile image or generates 
 * a fallback with initials when no image is available. Supports various sizes, borders, 
 * and loading states while providing a consistent user representation throughout the app.
 * 
 * @version react-native 0.72.x
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
  ImageStyle,
  TextStyle,
  TouchableOpacity,
  Pressable,
} from 'react-native';

import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';
import { scale, moderateScale } from '../../utils/responsive';

// Default avatar placeholder when no image or initials are available
const DEFAULT_AVATAR_PLACEHOLDER = 'https://via.placeholder.com/200?text=?';

// Array of colors for avatar backgrounds when displaying initials
const AVATAR_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6366f1', // indigo
];

/**
 * Avatar size options for consistent sizing across the application
 */
export enum AvatarSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  XLARGE = 'xlarge',
}

/**
 * Props interface for the Avatar component
 */
export interface AvatarProps {
  /** Image source for the avatar */
  source?: ImageSourcePropType;
  /** Full name to generate initials from (alternative to firstName/lastName) */
  name?: string;
  /** First name to generate initials from */
  firstName?: string;
  /** Last name to generate initials from */
  lastName?: string;
  /** Size of the avatar */
  size?: AvatarSize;
  /** Additional style for the container */
  style?: StyleProp<ViewStyle>;
  /** Additional style for the image */
  imageStyle?: StyleProp<ImageStyle>;
  /** Whether to show a border around the avatar */
  hasBorder?: boolean;
  /** Border color (defaults to colors.gray[200]) */
  borderColor?: string;
  /** Function to call when the avatar is pressed */
  onPress?: () => void;
  /** Test ID for testing */
  testID?: string;
  /** Whether the component is accessible */
  accessible?: boolean;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}

/**
 * Extracts initials from a user's first and last name
 * 
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns User's initials (1-2 characters)
 */
const getInitials = (firstName?: string | null, lastName?: string | null): string => {
  // Clean up inputs, removing any null or undefined values
  const cleanFirstName = (firstName || '').trim();
  const cleanLastName = (lastName || '').trim();

  // If both names are invalid, return a default question mark
  if (!cleanFirstName && !cleanLastName) {
    return '?';
  }

  // If only firstName is valid, return its first character
  if (cleanFirstName && !cleanLastName) {
    return cleanFirstName.charAt(0).toUpperCase();
  }

  // If only lastName is valid, return its first character
  if (!cleanFirstName && cleanLastName) {
    return cleanLastName.charAt(0).toUpperCase();
  }

  // If both are valid, return first character of each
  return `${cleanFirstName.charAt(0)}${cleanLastName.charAt(0)}`.toUpperCase();
};

/**
 * Deterministically selects a background color based on user name
 * 
 * @param name - User name to hash for color selection
 * @returns Color code for avatar background
 */
const getColorFromName = (name: string): string => {
  // Simple hash function to convert name to a number
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use hash to select a color from the AVATAR_COLORS array
  const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[colorIndex];
};

/**
 * Avatar component that displays a user's image or their initials as a fallback
 */
export const Avatar = ({
  source,
  name,
  firstName,
  lastName,
  size = AvatarSize.MEDIUM,
  style,
  imageStyle,
  hasBorder = false,
  borderColor = colors.gray[200],
  onPress,
  testID = 'avatar',
  accessible = true,
  accessibilityLabel,
}: AvatarProps): JSX.Element => {
  // Track image loading state
  const [isLoading, setIsLoading] = useState<boolean>(!!source);
  const [hasError, setHasError] = useState<boolean>(false);

  // Generate initials from name or firstName+lastName
  const initials = useMemo(() => {
    if (name) {
      const nameParts = name.split(' ');
      const fName = nameParts[0];
      const lName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      return getInitials(fName, lName);
    }
    return getInitials(firstName, lastName);
  }, [name, firstName, lastName]);

  // Determine background color for initials display
  const backgroundColor = useMemo(() => {
    const nameToUse = name || [firstName, lastName].filter(Boolean).join(' ');
    return nameToUse ? getColorFromName(nameToUse) : colors.gray[300];
  }, [name, firstName, lastName]);

  // Define sizes based on the AvatarSize enum
  const dimensions = useMemo(() => {
    switch (size) {
      case AvatarSize.SMALL:
        return {
          container: moderateScale(32),
          font: moderateScale(14),
        };
      case AvatarSize.MEDIUM:
        return {
          container: moderateScale(48),
          font: moderateScale(16),
        };
      case AvatarSize.LARGE:
        return {
          container: moderateScale(64),
          font: moderateScale(24),
        };
      case AvatarSize.XLARGE:
        return {
          container: moderateScale(96),
          font: moderateScale(32),
        };
      default:
        return {
          container: moderateScale(48),
          font: moderateScale(16),
        };
    }
  }, [size]);

  // Generate styles based on component props
  const styles = useMemo(() => {
    return StyleSheet.create({
      container: {
        width: dimensions.container,
        height: dimensions.container,
        borderRadius: dimensions.container / 2,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.gray[100],
        ...(hasBorder && {
          borderWidth: moderateScale(2),
          borderColor,
        }),
      },
      image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
      },
      initialsContainer: {
        width: '100%',
        height: '100%',
        borderRadius: dimensions.container / 2,
        backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      },
      initials: {
        ...textVariants.heading4,
        fontSize: dimensions.font,
        color: colors.white,
        fontWeight: '600',
        textAlign: 'center',
      },
      loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.gray[200],
      },
    });
  }, [dimensions, hasBorder, borderColor, backgroundColor]);

  // Determine what should be rendered (image or initials)
  const renderContent = () => {
    // If source is provided and no error occurred, attempt to render the image
    if (source && !hasError) {
      return (
        <>
          <Image
            source={source}
            style={[styles.image, imageStyle]}
            onLoadStart={() => setIsLoading(true)}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            testID={`${testID}-image`}
          />
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
            </View>
          )}
        </>
      );
    }

    // Fallback to initials
    return (
      <View style={styles.initialsContainer} testID={`${testID}-initials`}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
    );
  };

  // Determine accessibility label
  const avatarAccessibilityLabel = accessibilityLabel || (
    name
      ? `Avatar for ${name}`
      : firstName && lastName
        ? `Avatar for ${firstName} ${lastName}`
        : firstName
          ? `Avatar for ${firstName}`
          : 'Avatar'
  );

  // Wrap in TouchableOpacity if onPress is provided
  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={onPress}
        activeOpacity={0.7}
        accessible={accessible}
        accessibilityLabel={avatarAccessibilityLabel}
        accessibilityRole="image"
        testID={testID}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  // Otherwise return a simple View
  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessible={accessible}
      accessibilityLabel={avatarAccessibilityLabel}
      accessibilityRole="image"
    >
      {renderContent()}
    </View>
  );
};