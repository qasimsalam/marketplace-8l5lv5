import React, { useMemo } from 'react'; // v18.x
import { StyleSheet, Text, View, TouchableOpacity, StyleProp, ViewStyle, TextStyle } from 'react-native'; // v0.72.x
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, border } from '../../styles/layout';
import { useTheme } from '../../styles/theme';

/**
 * Enum defining available badge color variants
 */
export enum BadgeVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  SUCCESS = 'success',
  WARNING = 'warning',
  DANGER = 'danger',
  INFO = 'info',
  LIGHT = 'light',
  DARK = 'dark',
}

/**
 * Enum defining available badge size options
 */
export enum BadgeSize {
  XS = 'xs',
  SM = 'sm',
  MD = 'md',
}

/**
 * Interface defining props for the Badge component
 */
export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant | string;
  size?: BadgeSize | string;
  pill?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
  count?: number;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Generates badge styles based on variant, size, and shape options
 * 
 * @param params Object containing styling parameters
 * @returns Combined style object for badge component
 */
const getBadgeStyles = (params: {
  variant: BadgeVariant | string;
  size: BadgeSize | string;
  pill: boolean;
  theme: any;
}) => {
  const { variant, size, pill, theme } = params;
  
  // Get theme colors based on current theme
  const themeColors = theme.colors;
  
  // Define base styles common to all badges
  const baseContainerStyle: ViewStyle = {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary[500],
    ...border.rounded,
  };
  
  const baseTextStyle: TextStyle = {
    ...typography.buttonSmall,
    color: themeColors.text.inverse,
  };
  
  // Apply variant-specific styles (primary, secondary, success, etc.)
  let variantStyles: { container: ViewStyle; text: TextStyle } = {
    container: {},
    text: {},
  };
  
  switch (variant) {
    case BadgeVariant.PRIMARY:
      variantStyles.container = {
        backgroundColor: themeColors.primary[500],
      };
      variantStyles.text = {
        color: themeColors.white,
      };
      break;
    case BadgeVariant.SECONDARY:
      variantStyles.container = {
        backgroundColor: themeColors.secondary[500],
      };
      variantStyles.text = {
        color: themeColors.white,
      };
      break;
    case BadgeVariant.SUCCESS:
      variantStyles.container = {
        backgroundColor: themeColors.success[500],
      };
      variantStyles.text = {
        color: themeColors.white,
      };
      break;
    case BadgeVariant.WARNING:
      variantStyles.container = {
        backgroundColor: themeColors.warning[500],
      };
      variantStyles.text = {
        color: themeColors.text.primary, // Dark text on yellow background for better contrast
      };
      break;
    case BadgeVariant.DANGER:
      variantStyles.container = {
        backgroundColor: themeColors.error[500], // Map DANGER to error
      };
      variantStyles.text = {
        color: themeColors.white,
      };
      break;
    case BadgeVariant.INFO:
      variantStyles.container = {
        backgroundColor: themeColors.info[500],
      };
      variantStyles.text = {
        color: themeColors.white,
      };
      break;
    case BadgeVariant.LIGHT:
      variantStyles.container = {
        backgroundColor: themeColors.gray[100],
      };
      variantStyles.text = {
        color: themeColors.text.primary,
      };
      break;
    case BadgeVariant.DARK:
      variantStyles.container = {
        backgroundColor: themeColors.gray[800],
      };
      variantStyles.text = {
        color: themeColors.white,
      };
      break;
    default:
      // Default to primary if variant not recognized
      variantStyles.container = {
        backgroundColor: themeColors.primary[500],
      };
      variantStyles.text = {
        color: themeColors.white,
      };
  }
  
  // Apply size-specific styles (xs, sm, md)
  let sizeStyles: { container: ViewStyle; text: TextStyle } = {
    container: {},
    text: {},
  };
  
  switch (size) {
    case BadgeSize.XS:
      sizeStyles.container = {
        paddingVertical: spacing.xxs / 2,
        paddingHorizontal: spacing.xxs,
        minWidth: 16,
      };
      sizeStyles.text = {
        ...typography.caption,
        fontSize: 10,
      };
      break;
    case BadgeSize.SM:
      sizeStyles.container = {
        paddingVertical: spacing.xxs,
        paddingHorizontal: spacing.xs,
        minWidth: 20,
      };
      sizeStyles.text = {
        ...typography.caption,
      };
      break;
    case BadgeSize.MD:
    default:
      sizeStyles.container = {
        paddingVertical: spacing.xxs,
        paddingHorizontal: spacing.xs,
        minWidth: 24,
      };
      sizeStyles.text = {
        ...typography.buttonSmall,
      };
      break;
  }
  
  // Apply pill shape styles if pill is true
  const pillStyles: ViewStyle = pill
    ? {
        borderRadius: 100, // High value for pill shape
      }
    : {};
  
  // Return combined style object for container and text
  return {
    container: StyleSheet.flatten([baseContainerStyle, variantStyles.container, sizeStyles.container, pillStyles]),
    text: StyleSheet.flatten([baseTextStyle, variantStyles.text, sizeStyles.text]),
  };
};

/**
 * Badge component for displaying status labels, tags, notification counts, and verification badges.
 * Supports different variants, sizes, and shapes including pill style.
 * 
 * @example
 * // Simple badge
 * <Badge>New</Badge>
 * 
 * // Success badge with pill style
 * <Badge variant={BadgeVariant.SUCCESS} pill>Verified</Badge>
 * 
 * // Counter badge
 * <Badge variant={BadgeVariant.DANGER} count={5} />
 * 
 * // Interactive badge
 * <Badge onPress={() => handlePress()}>Click me</Badge>
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = BadgeVariant.PRIMARY,
  size = BadgeSize.MD,
  pill = false,
  style,
  textStyle,
  onPress,
  count,
  testID,
  accessibilityLabel,
}) => {
  // Access the current theme
  const theme = useTheme();
  
  // Generate badge and text styles using getBadgeStyles helper
  const styles = useMemo(
    () => getBadgeStyles({ variant, size, pill, theme }),
    [variant, size, pill, theme]
  );
  
  // Determine content to render
  const content = count !== undefined ? count : children;
  
  // Determine if badge should be interactive based on onPress prop
  const isInteractive = !!onPress;
  
  // Render badge content with proper text styling
  const renderBadgeContent = () => (
    <Text style={[styles.text, textStyle]} numberOfLines={1}>
      {content}
    </Text>
  );
  
  // Apply appropriate accessibility attributes
  const accessibilityProps = {
    accessible: true,
    accessibilityRole: isInteractive ? 'button' : 'text',
    accessibilityLabel: accessibilityLabel || (typeof content === 'string' ? content : undefined),
    testID,
  };
  
  // If interactive, wrap badge content in TouchableOpacity
  if (isInteractive) {
    return (
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={onPress}
        activeOpacity={0.7}
        {...accessibilityProps}
      >
        {renderBadgeContent()}
      </TouchableOpacity>
    );
  }
  
  // If not interactive, use View as container
  return (
    <View style={[styles.container, style]} {...accessibilityProps}>
      {renderBadgeContent()}
    </View>
  );
};

export default Badge;