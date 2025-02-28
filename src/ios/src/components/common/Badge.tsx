import React, { useMemo } from 'react'; // v18.x
import { StyleSheet, Text, View, StyleProp, TextStyle, ViewStyle } from 'react-native'; // v0.72.x
import { colors } from '../../styles/colors';
import { getTextVariant } from '../../styles/typography';
import { spacing, border } from '../../styles/layout';
import { useTheme } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * Enum defining the available badge style variants
 */
export enum BadgeVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info',
  LIGHT = 'light',
  DARK = 'dark',
}

/**
 * Enum defining the available badge size options
 */
export enum BadgeSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

/**
 * Interface defining props for the Badge component
 */
export interface BadgeProps {
  /** Content to display inside the badge */
  children: React.ReactNode;
  /** Visual style variant of the badge */
  variant?: BadgeVariant;
  /** Size of the badge */
  size?: BadgeSize;
  /** Additional styles to apply to the badge container */
  style?: StyleProp<ViewStyle>;
  /** Additional styles to apply to the badge text */
  textStyle?: StyleProp<TextStyle>;
  /** Whether the badge should have rounded corners */
  rounded?: boolean;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Generates badge styles based on variant, size, and responsive parameters
 * 
 * @param params - Parameters for generating badge styles
 * @returns Combined style objects for badge container and text
 */
const getBadgeStyles = (params: {
  variant: BadgeVariant;
  size: BadgeSize;
  rounded: boolean;
  moderateScale: (size: number, factor?: number) => number;
  isSmallDevice: boolean;
}) => {
  const { variant, size, rounded, moderateScale, isSmallDevice } = params;
  
  // Base styles for container and text
  const baseContainerStyle: ViewStyle = {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rounded ? border.rounded.borderRadius : moderateScale(4),
    overflow: 'hidden', // Ensure content stays within border radius
  };
  
  const baseTextStyle: TextStyle = {
    ...getTextVariant('caption'),
    textAlign: 'center',
    fontWeight: '600', // Make text slightly bolder for better visibility
  };
  
  // Size-specific styles
  let sizeStyles: { container: ViewStyle; text: TextStyle } = {
    container: {},
    text: {},
  };
  
  switch (size) {
    case BadgeSize.SMALL:
      sizeStyles = {
        container: {
          paddingHorizontal: moderateScale(spacing.xs),
          paddingVertical: moderateScale(spacing.xxs),
          minWidth: moderateScale(16), // Min width for tiny badges
          height: moderateScale(16),
        },
        text: {
          fontSize: moderateScale(isSmallDevice 
            ? getTextVariant('caption').fontSize * 0.85
            : getTextVariant('caption').fontSize),
          lineHeight: moderateScale(14), // Tighter line height for small badges
        },
      };
      break;
    case BadgeSize.LARGE:
      sizeStyles = {
        container: {
          paddingHorizontal: moderateScale(spacing.m),
          paddingVertical: moderateScale(spacing.xs),
          minWidth: moderateScale(32), // Min width for larger badges
        },
        text: {
          fontSize: moderateScale(isSmallDevice 
            ? getTextVariant('caption').fontSize
            : getTextVariant('paragraphSmall').fontSize),
        },
      };
      break;
    case BadgeSize.MEDIUM:
    default:
      sizeStyles = {
        container: {
          paddingHorizontal: moderateScale(spacing.s),
          paddingVertical: moderateScale(spacing.xxs),
          minWidth: moderateScale(24), // Min width for standard badges
        },
        text: {
          fontSize: moderateScale(getTextVariant('caption').fontSize),
        },
      };
      break;
  }
  
  // Variant-specific styles
  let variantStyles: { container: ViewStyle; text: TextStyle } = {
    container: {},
    text: {},
  };
  
  switch (variant) {
    case BadgeVariant.PRIMARY:
      variantStyles = {
        container: {
          backgroundColor: colors.primary[500],
        },
        text: {
          color: colors.white,
        },
      };
      break;
    case BadgeVariant.SECONDARY:
      variantStyles = {
        container: {
          backgroundColor: colors.secondary[500],
        },
        text: {
          color: colors.white,
        },
      };
      break;
    case BadgeVariant.SUCCESS:
      variantStyles = {
        container: {
          backgroundColor: colors.success[500],
        },
        text: {
          color: colors.white,
        },
      };
      break;
    case BadgeVariant.WARNING:
      variantStyles = {
        container: {
          backgroundColor: colors.warning[500],
        },
        text: {
          color: colors.white,
        },
      };
      break;
    case BadgeVariant.ERROR:
      variantStyles = {
        container: {
          backgroundColor: colors.error[500],
        },
        text: {
          color: colors.white,
        },
      };
      break;
    case BadgeVariant.INFO:
      variantStyles = {
        container: {
          backgroundColor: colors.info[500],
        },
        text: {
          color: colors.white,
        },
      };
      break;
    case BadgeVariant.LIGHT:
      variantStyles = {
        container: {
          backgroundColor: colors.gray[100],
        },
        text: {
          color: colors.gray[800],
        },
      };
      break;
    case BadgeVariant.DARK:
      variantStyles = {
        container: {
          backgroundColor: colors.gray[800],
        },
        text: {
          color: colors.white,
        },
      };
      break;
    default:
      variantStyles = {
        container: {
          backgroundColor: colors.primary[500],
        },
        text: {
          color: colors.white,
        },
      };
      break;
  }
  
  return {
    container: {
      ...baseContainerStyle,
      ...sizeStyles.container,
      ...variantStyles.container,
    },
    text: {
      ...baseTextStyle,
      ...sizeStyles.text,
      ...variantStyles.text,
    },
  };
};

/**
 * A reusable badge component for the AI Talent Marketplace iOS application.
 * Displays small visual indicators for status, categories, or counts.
 * Supports different variants (colors), sizes, and can be fully customized with additional styles.
 * Used throughout the app to indicate status, categories, notification counts, or to highlight important elements.
 * 
 * @param props - Component props
 * @returns A rendered Badge component
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = BadgeVariant.PRIMARY,
  size = BadgeSize.MEDIUM,
  style,
  textStyle,
  rounded = true,
  accessibilityLabel,
  testID,
}) => {
  const theme = useTheme();
  const { moderateScale, isSmallDevice } = useResponsive();
  
  // Generate badge styles with memoization for performance
  const styles = useMemo(
    () => getBadgeStyles({ 
      variant, 
      size, 
      rounded, 
      moderateScale, 
      isSmallDevice 
    }),
    [variant, size, rounded, moderateScale, isSmallDevice]
  );
  
  // Determine appropriate accessibility label
  const finalAccessibilityLabel = accessibilityLabel || 
    (typeof children === 'string' ? `${children} ${variant} badge` : `${variant} badge`);
  
  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="text"
      accessibilityLabel={finalAccessibilityLabel}
      testID={testID || `badge-${variant}`}
      accessible={true}
      importantForAccessibility="yes"
    >
      <Text style={[styles.text, textStyle]} numberOfLines={1} adjustsFontSizeToFit={size === BadgeSize.SMALL}>
        {children}
      </Text>
    </View>
  );
};

export default Badge;