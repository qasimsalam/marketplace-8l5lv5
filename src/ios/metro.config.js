/**
 * Metro configuration for React Native iOS
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require('metro-config'); // Version ^0.76.0
const path = require('path');

module.exports = (async () => {
  // Get default Metro configuration
  const defaultConfig = await getDefaultConfig();

  // Define project root and parent directories for proper file resolution
  const projectRoot = path.resolve(__dirname);
  const rootDir = path.resolve(projectRoot, '../..');

  return {
    transformer: {
      // Use the React Native Babel transformer
      babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
      
      // Transform SVG assets to React components
      assetPlugins: ['react-native-svg-transformer'],
      
      // Configure transform options for development and production
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
    
    resolver: {
      // Define source extensions as per specification
      sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
      
      // Define asset extensions as per specification
      assetExts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ttf', 'otf'],
      
      // Configure module resolution fields
      resolverMainFields: ['browser', 'main', 'react-native'],
      
      // Set up module aliases for import path resolution that matches babel.config.js
      extraNodeModules: {
        '@components': path.resolve(rootDir, 'src/components'),
        '@screens': path.resolve(rootDir, 'src/screens'),
        '@navigation': path.resolve(rootDir, 'src/navigation'),
        '@hooks': path.resolve(rootDir, 'src/hooks'),
        '@styles': path.resolve(rootDir, 'src/styles'),
        '@utils': path.resolve(rootDir, 'src/utils'),
        '@lib': path.resolve(rootDir, 'src/lib'),
        '@store': path.resolve(rootDir, 'src/store'),
        '@types': path.resolve(rootDir, 'src/types'),
        '@assets': path.resolve(rootDir, 'assets'),
      },
    },
    
    // Watch directories for changes during development for hot reloading
    watchFolders: [
      path.resolve(rootDir, 'node_modules'),
      path.resolve(rootDir, 'src'),
      path.resolve(rootDir, 'assets'),
    ],
    
    // Set project root for entry file resolution
    projectRoot,
    
    // Reset cache option (default to false)
    resetCache: false,
    
    // Cache version for Metro
    cacheVersion: '1.0',
  };
})();