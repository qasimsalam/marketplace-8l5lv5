/**
 * Babel Configuration for AI Talent Marketplace React Native Android App
 * 
 * This configuration file controls the transpilation of modern JavaScript and TypeScript
 * to ensure compatibility across all Android devices and versions. It includes path aliasing
 * for better import organization, reanimated support, and environment-specific optimizations.
 * 
 * @version 1.0.0
 */

module.exports = {
  // Primary preset for React Native applications
  // metro-react-native-babel-preset v0.76.8
  presets: ['metro-react-native-babel-preset'],
  
  plugins: [
    // Module resolver for path aliases and extension resolution
    // module-resolver v5.0.0
    ['module-resolver', {
      root: ['./src'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      alias: {
        // Component and screen directories
        '@components': './src/components',
        '@screens': './src/screens',
        
        // Navigation and app structure
        '@navigation': './src/navigation',
        
        // Utility and state management
        '@hooks': './src/hooks',
        '@styles': './src/styles',
        '@utils': './src/utils',
        '@lib': './src/lib',
        '@store': './src/store',
        
        // Type definitions and assets
        '@types': './src/types',
        '@assets': './assets',
      },
    }],
    
    // React Native Reanimated plugin for smooth animations
    // react-native-reanimated v3.3.0
    'react-native-reanimated/plugin',
  ],
  
  // Environment-specific configurations
  env: {
    // Production build optimizations
    production: {
      plugins: [
        // Removes console.* statements in production builds
        // transform-remove-console v6.9.4
        'transform-remove-console',
      ],
    },
    
    // Testing environment configuration
    test: {
      plugins: [
        // Runtime transformation support for Jest testing
        // @babel/plugin-transform-runtime v7.22.10
        '@babel/plugin-transform-runtime',
      ],
    },
  },
};