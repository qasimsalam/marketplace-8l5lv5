/**
 * useResponsive Hook
 * 
 * A custom React hook that provides responsive design utilities for the iOS application.
 * This hook abstracts dimension calculations, orientation changes, and device-specific 
 * adjustments to provide components with responsive values that adapt to different
 * screen sizes, orientations, and device types.
 * 
 * @version react-native 0.72.x
 */

import { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import { Dimensions } from 'react-native'; // 0.72.x

// Import device dimension constants and detection functions
import {
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  IS_SMALL_DEVICE,
  IS_LARGE_DEVICE,
  IS_TABLET,
  isPortrait,
  isLandscape
} from '../utils/dimensions';

// Import responsive scaling utility functions
import {
  scale,
  verticalScale,
  moderateScale,
  moderateVerticalScale,
  responsiveWidth,
  responsiveHeight,
  fontScale,
  calculateResponsiveValue
} from '../utils/responsive';

/**
 * Interface defining a map of values for different device sizes
 */
export interface ResponsiveValue {
  default: any;
  small?: any;
  large?: any;
  tablet?: any;
}

/**
 * Interface defining the return value of the useResponsive hook
 */
interface UseResponsiveReturn {
  windowWidth: number;
  windowHeight: number;
  isPortrait: boolean;
  isLandscape: boolean;
  isSmallDevice: boolean;
  isLargeDevice: boolean;
  isTablet: boolean;
  scale: (size: number) => number;
  verticalScale: (size: number) => number;
  moderateScale: (size: number, factor?: number) => number;
  moderateVerticalScale: (size: number, factor?: number) => number;
  responsiveWidth: (widthPercent: number) => number;
  responsiveHeight: (heightPercent: number) => number;
  fontScale: (size: number) => number;
  getResponsiveSizeForDevice: <T>(sizeMap: ResponsiveValue) => T;
}

/**
 * A hook that provides responsive utilities and dimension information
 * that updates when screen dimensions change
 * 
 * @returns Object containing responsive utilities and dimension information
 */
export const useResponsive = (): UseResponsiveReturn => {
  // Initialize state for dimensions and orientation
  const [dimensions, setDimensions] = useState({
    windowWidth: WINDOW_WIDTH,
    windowHeight: WINDOW_HEIGHT,
    isPortraitMode: isPortrait(),
    isLandscapeMode: isLandscape()
  });

  /**
   * Handles dimension changes (e.g., device rotation) by updating the hook state
   * @param dimensionsData Updated dimensions from event
   */
  const handleDimensionsChange = useCallback(({ window }: { window: { width: number; height: number } }) => {
    const windowWidth = window.width;
    const windowHeight = window.height;
    
    setDimensions({
      windowWidth,
      windowHeight,
      isPortraitMode: windowHeight > windowWidth,
      isLandscapeMode: windowWidth > windowHeight
    });
  }, []);

  // Set up event listener for dimension changes
  useEffect(() => {
    // Subscribe to dimension changes (React Native 0.72.x API)
    const subscription = Dimensions.addEventListener('change', handleDimensionsChange);
    
    // Cleanup: remove listener when the component unmounts
    return () => {
      subscription.remove();
    };
  }, [handleDimensionsChange]);

  /**
   * Returns a responsive size value based on current device type
   * @param sizeMap Map of values for different device sizes
   * @returns The appropriate size value for the current device
   */
  const getResponsiveSizeForDevice = useCallback(<T,>(sizeMap: ResponsiveValue): T => {
    return calculateResponsiveValue(sizeMap);
  }, []);

  // Return all responsive utilities and current dimensions
  return useMemo(() => ({
    // Current dimensions
    windowWidth: dimensions.windowWidth,
    windowHeight: dimensions.windowHeight,
    
    // Orientation state
    isPortrait: dimensions.isPortraitMode,
    isLandscape: dimensions.isLandscapeMode,
    
    // Device type flags
    isSmallDevice: IS_SMALL_DEVICE,
    isLargeDevice: IS_LARGE_DEVICE,
    isTablet: IS_TABLET,
    
    // Scaling utility functions
    scale,
    verticalScale,
    moderateScale,
    moderateVerticalScale,
    responsiveWidth,
    responsiveHeight,
    fontScale,
    
    // Device-specific value selection
    getResponsiveSizeForDevice
  }), [
    dimensions.windowWidth,
    dimensions.windowHeight,
    dimensions.isPortraitMode,
    dimensions.isLandscapeMode,
    getResponsiveSizeForDevice
  ]);
};

export default useResponsive;