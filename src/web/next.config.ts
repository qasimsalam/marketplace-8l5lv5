/**
 * Next.js configuration for the AI Talent Marketplace
 * @type {import('next').NextConfig}
 */
import { withBundleAnalyzer } from '@next/bundle-analyzer'; // v13.4.12
import withTM from 'next-transpile-modules'; // v10.0.0

// Configure bundle analyzer
const bundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Configure module transpilation
const withTranspileModules = withTM([
  'react-syntax-highlighter',
  'socket.io-client'
]);

// Define Next.js configuration
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  
  // Image optimization configuration
  images: {
    domains: [
      'localhost',
      'aitalentmarketplace.com',
      'dev-aitalentmarketplace.s3.amazonaws.com',
      'prod-aitalentmarketplace.s3.amazonaws.com'
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256]
  },
  
  // Environment variables accessible in the browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'AI Talent Marketplace',
    NEXT_PUBLIC_APP_VERSION: '1.0.0'
  },
  
  // Internationalization settings
  i18n: {
    locales: ['en'],
    defaultLocale: 'en'
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Add webpack plugins
    config.plugins = [
      ...config.plugins,
      // SplitChunksPlugin is already included in webpack 4+
    ];
    
    // Add module rules
    config.module.rules.push({
      test: /\.js$/,
      use: ['source-map-loader'],
      enforce: 'pre'
    });
    
    // Polyfill fallbacks
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false
    };
    
    return config;
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false
  },
  
  // Packages to transpile
  transpilePackages: ['react-syntax-highlighter', 'socket.io-client'],
  
  // Public runtime configuration accessible via getConfig() in the browser
  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    auth0Domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
    auth0ClientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
    auth0Audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
    stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
    socketServerUrl: process.env.NEXT_PUBLIC_SOCKET_SERVER_URL,
    featureFlags: {
      jupyterNotebooks: process.env.NEXT_PUBLIC_FEATURE_JUPYTER_NOTEBOOKS === 'true',
      aiMatching: process.env.NEXT_PUBLIC_FEATURE_AI_MATCHING === 'true',
      workspaceCollaboration: process.env.NEXT_PUBLIC_FEATURE_WORKSPACE_COLLABORATION === 'true'
    }
  },
  
  // Server runtime configuration (not exposed to the browser)
  serverRuntimeConfig: {
    auth0Secret: process.env.AUTH0_CLIENT_SECRET,
    cookieSecret: process.env.AUTH0_COOKIE_SECRET,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    openaiApiKey: process.env.OPENAI_API_KEY,
    recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY
  },
  
  // Redirect configuration
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/login',
        permanent: true
      }
    ];
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.aitalentmarketplace.com *.auth0.com *.stripe.com; connect-src 'self' *.aitalentmarketplace.com *.auth0.com *.stripe.com; img-src 'self' data: blob: *.aitalentmarketplace.com *.amazonaws.com; style-src 'self' 'unsafe-inline' *.aitalentmarketplace.com; font-src 'self' data:; frame-src 'self' *.auth0.com *.stripe.com"
          }
        ]
      }
    ];
  },
  
  // Experimental features
  experimental: {
    serverActions: true,
    scrollRestoration: true
  }
};

// Apply plugins to configuration and export
export default bundleAnalyzerConfig(withTranspileModules(nextConfig));