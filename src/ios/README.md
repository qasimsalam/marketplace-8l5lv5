# AI Talent Marketplace - iOS Application

The iOS application for the AI Talent Marketplace platform, built with React Native and TypeScript. This mobile app provides a seamless experience for both AI professionals and businesses seeking talent, with features including user authentication, job browsing, real-time messaging, secure payments, and collaborative workspaces.

## Key Features

- Authentication with email/password and biometric options (Face ID/Touch ID)
- AI expert profiles with skill verification
- Job posting and discovery with AI-powered matching
- Real-time messaging and notifications
- Secure payment processing
- Collaborative workspaces with shared files
- Integration with Jupyter Notebooks
- Offline capabilities for key features

## Prerequisites

### Development Environment

- macOS 11.0 or later
- Xcode 14.0 or later
- Node.js 18.x LTS
- Ruby 3.0.0 or later (for CocoaPods)
- Watchman
- iOS 13.0+ target devices or simulators

### Tools and Accounts

- Apple Developer account (for deployment)
- Homebrew (recommended for installing dependencies)
- CocoaPods (dependency manager for iOS)

## Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ai-talent-marketplace
   ```

2. Install JavaScript dependencies:
   ```bash
   cd src/ios
   npm install
   ```

3. Install CocoaPods dependencies:
   ```bash
   npm run pod-install
   ```
   This will execute `cd ios && pod install && cd ..`

4. Create local environment configuration:
   ```bash
   cp .env.example .env
   ```
   Configure the `.env` file with your local API endpoints and settings.

### Running the App

#### Development Mode

1. Start the Metro bundler:
   ```bash
   npm start
   ```

2. In a separate terminal, launch the iOS app:
   ```bash
   npm run ios
   ```
   This will launch the app in the iOS simulator.

   To specify a particular device, use:
   ```bash
   npm run ios -- --simulator="iPhone 14 Pro"
   ```

#### Running on a Physical Device

1. Open `ios/AITalentMarketplace.xcworkspace` in Xcode
2. Select your physical device in the device dropdown
3. Configure your development team in signing & capabilities
4. Build and run from Xcode

### Resetting and Troubleshooting

If you encounter issues:

- Clear Metro bundler cache:
  ```bash
  npm run reset-cache
  ```

- Clean Xcode build folder:
  ```bash
  cd ios && xcodebuild clean && cd ..
  ```

- Reinstall dependencies:
  ```bash
  rm -rf node_modules && npm install && npm run pod-install
  ```

## Project Structure

```
src/ios/
├── assets/              # Static assets like images and fonts
├── ios/                 # Native iOS project files
│   ├── AITalentMarketplace/  # Native code and configurations
│   ├── Podfile          # CocoaPods dependencies
│   └── *.xcworkspace    # Xcode workspace
├── src/                 # TypeScript source code
│   ├── components/      # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Core utilities and API clients
│   ├── navigation/      # Navigation configuration
│   ├── screens/         # Screen components
│   ├── store/           # Redux state management
│   ├── styles/          # Styling utilities and themes
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helper functions
├── __tests__/           # Unit and component tests
├── e2e/                 # End-to-end tests with Detox
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## Development Guidelines

### Code Style and Formatting

- TypeScript is used for type safety
- Follow the ESLint and Prettier configurations
- Run `npm run lint` to check for linting issues
- Run `npm run format` to automatically format code

### Type Checking

Run type checking before committing changes:
```bash
npm run type-check
```

### Navigation

The app uses React Navigation with the following structure:

- `RootNavigator`: Entry point with authentication state checks
- `AuthNavigator`: Screens for login, registration, etc.
- `DashboardNavigator`: Main app screens after authentication
- Feature-specific navigators (Jobs, Messages, Profile, etc.)

### State Management

The app uses Redux with Redux Toolkit for state management:

- Auth state: User authentication and session management
- Jobs state: Job listings, details, and proposals
- Messages state: Conversations and real-time chat
- Profile state: User profile and settings

### API Integration

API calls are centralized in the `src/lib/api.ts` module. The app uses Axios for HTTP requests with:

- Request/response interceptors for auth tokens
- Error handling and retry mechanisms
- Offline support with caching
- Rate limiting protection

### Biometric Authentication

The app uses Expo's Local Authentication module for Face ID/Touch ID:

- Check compatibility with `useBiometrics` hook
- Enable in user settings for subsequent logins
- Fall back to password authentication when not available

## Testing

### Unit and Component Testing

Tests use Jest and React Native Testing Library:

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### End-to-End Testing

E2E tests use Detox:

```bash
# Build for E2E testing
npm run e2e:build

# Run E2E tests
npm run e2e:test
```

### Manual Testing Checklist

- Test on multiple iOS versions (iOS 13+)
- Test on different screen sizes (iPhone SE to Pro Max)
- Verify dark mode and light mode
- Test accessibility features with VoiceOver
- Check offline functionality
- Verify proper keyboard handling

## Building for Production

### Preparing for App Store Submission

1. Update version numbers in:
   - `package.json`
   - `ios/AITalentMarketplace/Info.plist`

2. Build the production version:
   ```bash
   cd ios
   xcodebuild -workspace AITalentMarketplace.xcworkspace -scheme AITalentMarketplace -configuration Release -sdk iphoneos -allowProvisioningUpdates
   ```

3. Archive the app for App Store distribution using Xcode:
   - Open `ios/AITalentMarketplace.xcworkspace` in Xcode
   - Select `Product > Archive`
   - Follow the distribution wizard to upload to App Store Connect

### TestFlight Distribution

1. Upload the build to App Store Connect using Xcode
2. Configure TestFlight testing information
3. Add internal and external testers
4. Release the build to testers

## Continuous Integration

The iOS app uses GitHub Actions for CI/CD:

- PR checks: Lint, type-check, and test
- TestFlight deployments from develop branch
- App Store submissions from main branch

Details can be found in `.github/workflows/mobile.yml`

## Troubleshooting Common Issues

### Build Errors

- **Missing Pods**: Run `npm run pod-install`
- **Code Signing Issues**: Check your Apple Developer account and provisioning profiles
- **Incompatible Dependencies**: Check for conflicting versions in `package.json` and `Podfile`

### Runtime Errors

- **API Connection Issues**: Verify `.env` configuration and network connectivity
- **Biometric Authentication Failures**: Ensure device has biometrics enabled and configured
- **Navigation Problems**: Check for undefined routes or incorrect parameters

### Performance Issues

- **Slow Rendering**: Use React DevTools to identify expensive components
- **Memory Leaks**: Check for unsubscribed listeners in useEffect cleanup
- **Excessive Re-renders**: Implement memoization with useMemo and useCallback

## Contributing

Please follow these guidelines when contributing to the iOS application:

1. Create a feature branch from `develop`
2. Follow the coding guidelines and patterns
3. Add tests for new functionality
4. Update documentation as needed
5. Submit a PR with a clear description of changes

Refer to the main project's CONTRIBUTING.md for additional information.

## Related Documentation

- [Main Project README](../../README.md)
- [Backend API Documentation](../backend/README.md)
- [Web Application Documentation](../web/README.md)
- [Android Application Documentation](../android/README.md)