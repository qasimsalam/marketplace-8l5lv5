import type { Config } from 'tailwindcss'; // ^3.3.3
import plugin from 'tailwindcss/plugin'; // ^3.3.3

// Base theme configuration with sensible defaults
const DEFAULT_THEME = {
  // Default theme values that will be extended in the configuration below
};

/**
 * Generates a spacing scale based on the 4px/0.25rem base unit and 8-point grid system
 * @param baseUnit The base unit value in rem
 * @param maxMultiple The maximum multiplier for the scale
 * @returns Spacing scale object with keys as multiplier and values as rem units
 */
const createSpacingScale = (baseUnit: number, maxMultiple: number): Record<string, string> => {
  // Initialize an empty object to store the spacing scale
  const scale: Record<string, string> = {};
  
  // Loop from 0 to maxMultiple
  for (let i = 0; i <= maxMultiple; i++) {
    // For each iteration, calculate the rem value (index * baseUnit)
    const value = `${i * baseUnit}rem`;
    
    // Add entry to scale with key as the multiplier and value as the rem string
    scale[i.toString()] = value;
  }
  
  // Return the complete spacing scale object
  return scale;
};

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}'
  ],
  safelist: ['dark', 'light', 'data-theme-light', 'data-theme-dark'],
  darkMode: 'media', // uses system preference for dark mode
  theme: {
    extend: {
      colors: {
        primary: {
          '50': '#eef8fe',
          '100': '#d8effd',
          '200': '#b8e3fb',
          '300': '#8ad2f9',
          '400': '#54b9f5',
          '500': '#38bdf8',
          '600': '#0ea5e9',
          '700': '#0284c7',
          '800': '#0369a1',
          '900': '#075985',
          '950': '#0c4a6e',
        },
        secondary: {
          '50': '#f5f3ff',
          '100': '#ede9fe',
          '200': '#ddd6fe',
          '300': '#c4b5fd',
          '400': '#a78bfa',
          '500': '#8b5cf6',
          '600': '#7c3aed',
          '700': '#6d28d9',
          '800': '#5b21b6',
          '900': '#4c1d95',
          '950': '#2e1065',
        },
        accent: {
          '50': '#fff7ed',
          '100': '#ffedd5',
          '200': '#fed7aa',
          '300': '#fdba74',
          '400': '#fb923c',
          '500': '#f97316',
          '600': '#ea580c',
          '700': '#c2410c',
          '800': '#9a3412',
          '900': '#7c2d12',
          '950': '#431a03',
        },
        success: {
          '50': '#f0fdf4',
          '100': '#dcfce7',
          '200': '#bbf7d0',
          '300': '#86efac',
          '400': '#4ade80',
          '500': '#22c55e',
          '600': '#16a34a',
          '700': '#15803d',
          '800': '#166534',
          '900': '#14532d',
          '950': '#052e16',
        },
        error: {
          '50': '#fef2f2',
          '100': '#fee2e2',
          '200': '#fecaca',
          '300': '#fca5a5',
          '400': '#f87171',
          '500': '#ef4444',
          '600': '#dc2626',
          '700': '#b91c1c',
          '800': '#991b1b',
          '900': '#7f1d1d',
          '950': '#450a0a',
        },
        warning: {
          '50': '#fffbeb',
          '100': '#fef3c7',
          '200': '#fde68a',
          '300': '#fcd34d',
          '400': '#fbbf24',
          '500': '#f59e0b',
          '600': '#d97706',
          '700': '#b45309',
          '800': '#92400e',
          '900': '#78350f',
          '950': '#451a03',
        },
        background: {
          light: '#FFFFFF',
          dark: '#111827',
        },
        foreground: {
          light: '#111827',
          dark: '#F9FAFB',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      spacing: {
        '0': '0',
        'px': '1px',
        '0.5': '0.125rem',
        '1': '0.25rem',
        '1.5': '0.375rem',
        '2': '0.5rem',
        '2.5': '0.625rem',
        '3': '0.75rem',
        '3.5': '0.875rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '7': '1.75rem',
        '8': '2rem',
        '9': '2.25rem',
        '10': '2.5rem',
        '11': '2.75rem',
        '12': '3rem',
        '14': '3.5rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
        '28': '7rem',
        '32': '8rem',
        '36': '9rem',
        '40': '10rem',
        '44': '11rem',
        '48': '12rem',
        '52': '13rem',
        '56': '14rem',
        '60': '15rem',
        '64': '16rem',
        '72': '18rem',
        '80': '20rem',
        '96': '24rem',
      },
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'none': 'none',
      },
      transitionDuration: {
        'DEFAULT': '150ms',
        'fast': '100ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'header': '100',
        'modal': '200',
        'tooltip': '300',
        'toast': '400',
        'max': '9999',
      },
      animation: {
        'none': 'none',
        'spin': 'spin 1s linear infinite',
        'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce': 'bounce 1s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-out': 'fadeOut 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-in-out',
        'slide-out': 'slideOut 0.3s ease-in-out',
      },
      keyframes: {
        'spin': {
          'to': {
            'transform': 'rotate(360deg)',
          },
        },
        'ping': {
          '75%, 100%': {
            'transform': 'scale(2)',
            'opacity': '0',
          },
        },
        'pulse': {
          '50%': {
            'opacity': '.5',
          },
        },
        'bounce': {
          '0%, 100%': {
            'transform': 'translateY(-25%)',
            'animationTimingFunction': 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            'transform': 'translateY(0)',
            'animationTimingFunction': 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
        'fadeIn': {
          '0%': {
            'opacity': '0',
          },
          '100%': {
            'opacity': '1',
          },
        },
        'fadeOut': {
          '0%': {
            'opacity': '1',
          },
          '100%': {
            'opacity': '0',
          },
        },
        'slideIn': {
          '0%': {
            'transform': 'translateY(10px)',
            'opacity': '0',
          },
          '100%': {
            'transform': 'translateY(0)',
            'opacity': '1',
          },
        },
        'slideOut': {
          '0%': {
            'transform': 'translateY(0)',
            'opacity': '1',
          },
          '100%': {
            'transform': 'translateY(10px)',
            'opacity': '0',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography')(), // Adds a set of prose classes for styling rich text content
    require('@tailwindcss/forms')(), // Provides a basic reset for form styles that makes form elements easy to override with utilities
    require('@tailwindcss/aspect-ratio')(), // Adds utilities for aspect ratio control
    
    // Custom accessibility plugin
    plugin(function({ addUtilities }) {
      const accessibilityUtilities = {
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: '0',
        },
        '.focus-visible-ring': {
          outlineColor: 'transparent',
          outlineStyle: 'solid',
          outlineWidth: '2px',
          outlineOffset: '2px',
          '&:focus-visible': {
            outlineColor: 'rgba(59, 130, 246, 0.5)',
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5)',
          },
        },
        '.high-contrast-text': {
          '@media (prefers-contrast: more)': {
            fontWeight: '700',
          },
        },
      };
      
      addUtilities(accessibilityUtilities, ['responsive', 'hover', 'focus']);
    }),
  ],
  corePlugins: {
    preflight: true,
    container: true,
  },
  future: {
    hoverOnlyWhenSupported: true,
    respectDefaultRingColorOpacity: true,
  },
  experimental: {
    optimizeUniversalDefaults: true,
  },
};

export default config;