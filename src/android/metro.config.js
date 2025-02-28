/**
 * Metro configuration for React Native Android
 * https://github.com/facebook/react-native
 *
 * This configuration handles JavaScript bundling for the Android platform of the AI Talent Marketplace.
 * It configures module resolution, asset transformations, and bundling optimizations.
 * 
 * @format
 */

const { getDefaultConfig } = require('metro-config'); // ^0.76.0
const path = require('path');

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();

  // The Android directory is the project root for this configuration
  const projectRoot = path.resolve(__dirname);
  
  // The repository root is two levels up
  const repoRoot = path.resolve(__dirname, '../../');
  
  // Path to node_modules
  const nodeModulesPath = path.resolve(repoRoot, 'node_modules');

  return {
    transformer: {
      babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
      assetPlugins: ['react-native-svg-transformer'],
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
    resolver: {
      // Include JavaScript and TypeScript file extensions
      sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
      
      // Include all relevant asset extensions (SVG is handled separately by the transformer)
      assetExts: assetExts.filter(ext => ext !== 'svg').concat(['png', 'jpg', 'jpeg', 'gif', 'webp', 'ttf', 'otf']),
      
      // Configure main fields for module resolution
      resolverMainFields: ['browser', 'main', 'react-native'],
      
      // Setup path aliases to match babel.config.js
      extraNodeModules: {
        '@components': path.resolve(repoRoot, 'src/components'),
        '@screens': path.resolve(repoRoot, 'src/screens'),
        '@navigation': path.resolve(repoRoot, 'src/navigation'),
        '@hooks': path.resolve(repoRoot, 'src/hooks'),
        '@styles': path.resolve(repoRoot, 'src/styles'),
        '@utils': path.resolve(repoRoot, 'src/utils'),
        '@lib': path.resolve(repoRoot, 'src/lib'),
        '@store': path.resolve(repoRoot, 'src/store'),
        '@types': path.resolve(repoRoot, 'src/types'),
        '@assets': path.resolve(repoRoot, 'assets'),
      },
    },
    // Watch for changes in these directories
    watchFolders: [
      nodeModulesPath,
      path.resolve(repoRoot, 'src'),
      path.resolve(repoRoot, 'assets'),
    ],
    // Set the project root to the Android directory
    projectRoot,
  };
})();