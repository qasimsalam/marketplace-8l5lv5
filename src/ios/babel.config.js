// babel.config.js - v1.0.0
// Babel configuration for React Native iOS application
// Configures transpilation for JavaScript/TypeScript 5.x

module.exports = {
  // Primary preset for React Native
  // metro-react-native-babel-preset - v0.76.0
  presets: ['metro-react-native-babel-preset'],
  
  plugins: [
    // module-resolver - v5.0.0
    // Provides path aliasing for cleaner imports
    ['module-resolver', {
      root: ['./src'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      alias: {
        '@components': './src/components',
        '@screens': './src/screens',
        '@navigation': './src/navigation',
        '@hooks': './src/hooks',
        '@styles': './src/styles',
        '@utils': './src/utils',
        '@lib': './src/lib',
        '@store': './src/store',
        '@types': './src/types',
        '@assets': './assets'
      }
    }],
    
    // react-native-reanimated/plugin - v3.3.0
    // Required for React Native Reanimated to work properly
    'react-native-reanimated/plugin'
  ],
  
  // Environment-specific configurations
  env: {
    // Production configuration
    production: {
      plugins: [
        // transform-remove-console - v6.9.4
        // Removes console statements in production for performance
        'transform-remove-console'
      ]
    },
    
    // Test configuration
    test: {
      plugins: [
        // @babel/plugin-transform-runtime - v7.22.15
        // Enables the re-use of Babel's injected helper code
        '@babel/plugin-transform-runtime'
      ]
    }
  }
};