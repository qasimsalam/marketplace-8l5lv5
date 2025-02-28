/**
 * Defines the color palette for the AI Talent Marketplace iOS application.
 * This file contains color constants used throughout the application to maintain visual consistency,
 * with support for dark mode and accessibility considerations.
 * 
 * It mirrors the color system used in the web and Android applications to ensure
 * brand uniformity across platforms.
 */

import { Appearance } from 'react-native'; // v0.72.x

/**
 * Utility function to determine if the device is in dark mode
 * @returns boolean indicating whether the device is in dark mode
 */
const isDarkMode = (): boolean => Appearance.getColorScheme() === 'dark';

/**
 * Helper function to select colors based on current theme (light/dark)
 * @param lightModeColor - The color to use in light mode
 * @param darkModeColor - The color to use in dark mode
 * @returns The appropriate color for the current theme
 */
export const getColorByTheme = (lightModeColor: string, darkModeColor: string): string => {
  return isDarkMode() ? darkModeColor : lightModeColor;
};

// Base color palettes
const primary = {
  50: '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9',
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c4a6e',
};

const secondary = {
  50: '#f5f3ff',
  100: '#ede9fe',
  200: '#ddd6fe',
  300: '#c4b5fd',
  400: '#a78bfa',
  500: '#8b5cf6',
  600: '#7c3aed',
  700: '#6d28d9',
  800: '#5b21b6',
  900: '#4c1d95',
};

const accent = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316',
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
};

const success = {
  50: '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
};

const warning = {
  50: '#fefce8',
  100: '#fef9c3',
  200: '#fef08a',
  300: '#fde047',
  400: '#facc15',
  500: '#eab308',
  600: '#ca8a04',
  700: '#a16207',
  800: '#854d0e',
  900: '#713f12',
};

const error = {
  50: '#fef2f2',
  100: '#fee2e2',
  200: '#fecaca',
  300: '#fca5a5',
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
  700: '#b91c1c',
  800: '#991b1b',
  900: '#7f1d1d',
};

const info = {
  50: '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9',
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c4a6e',
};

const gray = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
};

// Basic colors
const transparent = 'transparent';
const black = '#000000';
const white = '#ffffff';

// Theme-dependent colors
const text = {
  primary: getColorByTheme(gray[900], gray[50]),
  secondary: getColorByTheme(gray[700], gray[300]),
  tertiary: getColorByTheme(gray[500], gray[400]),
  disabled: getColorByTheme(gray[400], gray[600]),
  inverse: getColorByTheme(gray[50], gray[900]),
};

const background = {
  primary: getColorByTheme(white, gray[900]),
  secondary: getColorByTheme(gray[50], gray[800]),
  tertiary: getColorByTheme(gray[100], gray[700]),
  elevated: getColorByTheme(white, gray[800]),
  disabled: getColorByTheme(gray[100], gray[700]),
};

const border = {
  default: getColorByTheme(gray[200], gray[700]),
  strong: getColorByTheme(gray[400], gray[600]),
  focus: getColorByTheme(primary[500], primary[400]),
};

/**
 * Color palette definitions organized by type and shade
 * Each color has 10 shades (50-900) for flexibility in UI design
 * Colors chosen for accessibility with WCAG 2.1 Level AA compliance
 */
export const colors = {
  // Color palettes
  primary,
  secondary,
  accent,
  success,
  warning,
  error,
  info,
  gray,
  
  // Theme-dependent colors
  text,
  background,
  border,
  
  // Base colors
  transparent,
  black,
  white,
};