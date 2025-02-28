/**
 * A custom React hook that provides responsive design capabilities for the Android application.
 * Monitors screen dimensions, detects orientation changes, and provides utilities for responsive sizing
 * to ensure consistent UI rendering across different Android device sizes and orientations.
 * 
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import { Dimensions } from 'react-native'; // 0.72.x

import {
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  IS_SMALL_DEVICE,
  IS_LARGE_DEVICE,
  IS_TABLET,
  isPortrait,
  isLandscape,
} from '../utils/dimensions';

import {
  scale,
  verticalScale,
  moderateScale,
  moderateVerticalScale,
  responsiveWidth,
  responsiveHeight,
  fontScale,
  getResponsiveValue,
  handleOrientationValue,
} from '../utils/responsive';

/**
 * Interface for device-specific responsive value mapping
 */
export interface ResponsiveValue<T = any> {
  default: T;
  small?: T;
  large?: T;
  tablet?: T;
}

/**
 * Interface for the return value of the useResponsive hook
 */
export interface UseResponsiveReturn {
  // Current window dimensions
  windowWidth: number;
  windowHeight: number;
  
  // Orientation flags
  isPortrait: boolean;
  isLandscape: boolean;
  
  // Device size flags
  isSmallDevice: boolean;
  isLargeDevice: boolean;
  isTablet: boolean;
  
  // Responsive scaling utilities
  scale: (size: number) => number;
  verticalScale: (size: number) => number;
  moderateScale: (size: number, factor?: number) => number;
  moderateVerticalScale: (size: number, factor?: number) => number;
  responsiveWidth: (widthPercent: number) => number;
  responsiveHeight: (heightPercent: number) => number;
  fontScale: (fontSize: number) => number;
  
  // Responsive value selection utilities
  getResponsiveSizeForDevice: <T>(sizeMap: ResponsiveValue<T>) => T;
  handleOrientationValue: <T>(portraitValue: T, landscapeValue: T) => T;
}

/**
 * A custom hook that provides reactive responsive design utilities 
 * that update when screen dimensions change
 * 
 * @returns Object containing responsive utilities and current screen dimension information
 */
export const useResponsive = (): UseResponsiveReturn => {
  // Initialize state with current dimensions
  const [dimensions, setDimensions] = useState({
    windowWidth: WINDOW_WIDTH,
    windowHeight: WINDOW_HEIGHT,
  });
  
  // Initialize orientation state
  const [orientation, setOrientation] = useState({
    isPortrait: isPortrait(),
    isLandscape: isLandscape(),
  });
  
  /**
   * Handler for dimension changes
   * Updates state with new dimensions and orientation
   */
  const handleDimensionsChange = useCallback(({ window }) => {
    const { width, height } = window;
    
    // Update dimensions
    setDimensions({
      windowWidth: width,
      windowHeight: height,
    });
    
    // Update orientation
    setOrientation({
      isPortrait: height >= width,
      isLandscape: width > height,
    });
  }, []);
  
  // Set up dimension change listener
  useEffect(() => {
    // Add event listener for dimension changes
    const subscription = Dimensions.addEventListener('change', handleDimensionsChange);
    
    // Clean up listener on unmount
    return () => {
      // Check if the subscription has a remove method (for compatibility with older RN versions)
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, [handleDimensionsChange]);
  
  /**
   * Returns a size value appropriate for the current device type
   * based on the current dimensions
   * 
   * @param sizeMap Object mapping device sizes to values
   * @returns The appropriate size value for the current device type
   */
  const getResponsiveSizeForDevice = useCallback(<T extends any>(sizeMap: ResponsiveValue<T>): T => {
    const { windowWidth } = dimensions;
    
    // Determine device type based on current dimensions
    const isSmallDevice = windowWidth < 375;
    const isLargeDevice = windowWidth > 428;
    const isTablet = windowWidth > 768;
    
    // Select appropriate value based on device type
    if (isTablet && sizeMap.tablet !== undefined) {
      return sizeMap.tablet;
    }
    
    if (isLargeDevice && sizeMap.large !== undefined) {
      return sizeMap.large;
    }
    
    if (isSmallDevice && sizeMap.small !== undefined) {
      return sizeMap.small;
    }
    
    // Default case
    return sizeMap.default;
  }, [dimensions]);
  
  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => {
    // Get current dimensions from state
    const { windowWidth, windowHeight } = dimensions;
    
    // Recalculate device size flags based on current dimensions
    const isSmallDevice = windowWidth < 375;
    const isLargeDevice = windowWidth > 428;
    const isTablet = windowWidth > 768;
    
    // Redefine scaling functions to use current dimensions
    const scaleWithCurrentDimensions = (size: number) => (windowWidth / 375) * size;
    const verticalScaleWithCurrentDimensions = (size: number) => (windowHeight / 812) * size;
    const moderateScaleWithCurrentDimensions = (size: number, factor = 0.5) => {
      const scaledSize = scaleWithCurrentDimensions(size);
      return size + (scaledSize - size) * factor;
    };
    const moderateVerticalScaleWithCurrentDimensions = (size: number, factor = 0.5) => {
      const scaledSize = verticalScaleWithCurrentDimensions(size);
      return size + (scaledSize - size) * factor;
    };
    const responsiveWidthWithCurrentDimensions = (widthPercent: number) => (widthPercent / 100) * windowWidth;
    const responsiveHeightWithCurrentDimensions = (heightPercent: number) => (heightPercent / 100) * windowHeight;
    
    return {
      // Current window dimensions
      windowWidth,
      windowHeight,
      
      // Orientation flags (from current state)
      isPortrait: orientation.isPortrait,
      isLandscape: orientation.isLandscape,
      
      // Device size flags (using current dimensions)
      isSmallDevice,
      isLargeDevice,
      isTablet,
      
      // Responsive scaling functions (using current dimensions)
      scale: scaleWithCurrentDimensions,
      verticalScale: verticalScaleWithCurrentDimensions,
      moderateScale: moderateScaleWithCurrentDimensions,
      moderateVerticalScale: moderateVerticalScaleWithCurrentDimensions,
      responsiveWidth: responsiveWidthWithCurrentDimensions,
      responsiveHeight: responsiveHeightWithCurrentDimensions,
      fontScale, // This uses PixelRatio which gets updated by React Native
      
      // Responsive value selection utilities
      getResponsiveSizeForDevice,
      handleOrientationValue: <T>(portraitValue: T, landscapeValue: T): T => 
        orientation.isLandscape ? landscapeValue : portraitValue,
    };
  }, [dimensions, orientation, getResponsiveSizeForDevice]);
};

export default useResponsive;