/**
 * PostCSS Configuration File
 * 
 * This configuration specifies the PostCSS plugins used in the AI Talent Marketplace web application.
 * It integrates TailwindCSS for utility-first styling, Autoprefixer for browser compatibility,
 * and postcss-preset-env for modern CSS features.
 * 
 * @see https://tailwindcss.com/docs/configuration
 * @see https://github.com/postcss/autoprefixer
 * @see https://github.com/csstools/postcss-preset-env
 */

module.exports = {
  plugins: {
    // tailwindcss - v3.3.3
    // Process Tailwind directives and generate utility classes
    'tailwindcss': {},
    
    // autoprefixer - v10.4.14
    // Add vendor prefixes to CSS rules using values from Can I Use
    'autoprefixer': {
      flexbox: 'no-2009', // Don't add old flexbox prefixes as they're unnecessary in modern browsers
      grid: 'autoplace', // Enable grid prefixes for IE support
    },
    
    // postcss-preset-env - v8.0.0
    // Convert modern CSS into something browsers understand
    'postcss-preset-env': {
      stage: 3, // Use features that are in stage 3 of the CSS standardization process
      features: {
        'nesting-rules': true, // Enable CSS nesting
        'custom-properties': false, // Disable custom properties processing (handled by browsers)
        'color-mod-function': { unresolved: 'warn' }, // Warn on unresolved color-mod functions
      },
      autoprefixer: false, // Disable built-in autoprefixer as we're using it separately
      browsers: [
        '> 1%', // Browser versions with more than 1% of global usage
        'last 2 versions', // Last 2 versions of each browser
        'Firefox ESR', // Extended support release of Firefox
        'not dead', // Exclude browsers without official support
      ],
    },
  },
};