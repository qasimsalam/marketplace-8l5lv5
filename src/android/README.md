# AI Talent Marketplace - Android App

## Overview

The AI Talent Marketplace Android application provides a native mobile experience for connecting businesses with verified AI professionals. This React Native application enables users to search for AI talent, post projects, collaborate on AI/ML tasks, and manage payments directly from Android devices.

## Features

- **AI Expert Profiles**: Detailed profiles showcasing AI specialists' skills, portfolios, and verification status
- **AI-Powered Job Matching**: Smart recommendations based on skills and requirements
- **Real-time Messaging**: Secure in-app communication between clients and AI professionals
- **Integrated Jupyter Notebooks**: Mobile-optimized collaborative development environment
- **Secure Payment Processing**: Milestone-based payments with escrow protection
- **Biometric Authentication**: Fingerprint and face recognition for secure access
- **File Sharing**: Share and review project files and models on the go
- **Offline Capabilities**: View cached projects and messages when offline
- **Push Notifications**: Real-time alerts for new messages, proposals, and payments
- **Mobile-Optimized UI**: Fully responsive design with intuitive mobile interactions

## Prerequisites

- Node.js 18.x LTS or higher
- Java Development Kit (JDK) 11 or higher
- Android Studio Arctic Fox (2020.3.1) or higher
- Android SDK 33 (Android 13) or higher
- React Native CLI 0.72.x
- A physical Android device or emulator running Android 9.0 (API level 28) or higher

## Setup and Installation

### Development Environment Setup

1. **Install Node.js and npm**:
   ```bash
   # Verify installation
   node -v  # Should be v18.x or higher
   npm -v   # Should be v8.x or higher
   ```

2. **Install Java Development Kit**:
   - Download and install JDK 11 or higher from [Oracle](https://www.oracle.com/java/technologies/javase-jdk11-downloads.html)
   - Set JAVA_HOME environment variable

3. **Install Android Studio**:
   - Download from [developer.android.com](https://developer.android.com/studio)
   - During installation, ensure the following components are selected:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device
     - Performance (Intel HAXM)

4. **Configure Android SDK**:
   - Open Android Studio → Settings → Appearance & Behavior → System Settings → Android SDK
   - Select "SDK Platforms" tab and check "Show Package Details"
   - Select Android 13 (API Level 33)
   - Select "SDK Tools" tab and check "Show Package Details"
   - Select Android SDK Build-Tools 33.0.0
   - Click "Apply" to install

5. **Configure Environment Variables**:
   ```bash
   # Add these to your shell profile (.bashrc, .zshrc, etc.)
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

### Project Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-organization/ai-talent-marketplace.git
   cd ai-talent-marketplace
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or with pnpm (recommended in technical specs)
   pnpm install
   ```

3. **Setup environment configuration**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your local environment values
   ```

4. **Run the Metro bundler**:
   ```bash
   npm start
   # or
   npx react-native start
   ```

5. **Run the application**:
   ```bash
   # In a new terminal window
   npm run android
   # or
   npx react-native run-android
   ```

## Architecture Overview

The AI Talent Marketplace Android app follows a clean architecture pattern with the following key components:

- **UI Layer**: React Native components with TypeScript
- **State Management**: Redux Toolkit with async storage persistence
- **Navigation**: React Navigation 6.x with stack, tab, and drawer navigators
- **API Communication**: Axios for REST API and Apollo Client for GraphQL
- **Real-time Features**: Socket.io for WebSocket connections
- **Authentication**: JWT + OAuth 2.0 with Auth0 integration
- **Local Storage**: React Native AsyncStorage and Secure Storage
- **Styling**: Tailwind CSS for React Native

The application connects to our backend microservices via the API Gateway, with separate service modules for jobs, user profiles, messaging, and payments.

## Project Structure

```
src/android/
├── __tests__/               # Unit and integration tests
├── android/                 # Native Android configuration
├── assets/                  # Images, fonts, and other static assets
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Shared components (buttons, inputs, etc.)
│   │   ├── job/             # Job-related components
│   │   ├── profile/         # Profile-related components
│   │   └── messaging/       # Messaging components
│   ├── hooks/               # Custom React hooks
│   ├── navigation/          # React Navigation setup
│   ├── screens/             # Application screens
│   │   ├── auth/            # Authentication screens
│   │   ├── dashboard/       # Dashboard screens
│   │   ├── jobs/            # Job-related screens
│   │   ├── messaging/       # Messaging screens
│   │   ├── payments/        # Payment screens
│   │   └── profile/         # Profile screens
│   ├── services/            # API and third-party services
│   │   ├── api/             # API client setup
│   │   ├── auth/            # Authentication service
│   │   ├── messaging/       # Messaging service
│   │   └── storage/         # Local storage service
│   ├── store/               # Redux store configuration
│   │   ├── slices/          # Redux slices
│   │   └── middleware/      # Redux middleware
│   ├── utils/               # Utility functions
│   └── App.tsx              # Root component
├── .env.example             # Example environment variables
├── babel.config.js          # Babel configuration
└── package.json             # Project dependencies
```

## Authentication

The Android app supports multiple authentication methods:

- **JWT-based Authentication**: For API requests
- **OAuth 2.0**: Social login via GitHub, LinkedIn, and Google
- **Biometric Authentication**: Using React Native Biometrics library
- **Secure Credential Storage**: Using Keychain/Keystore
- **2FA Support**: Time-based one-time passwords (TOTP)

Authentication flow:
1. User logs in via email/password or OAuth provider
2. Server returns JWT tokens (access and refresh)
3. App stores tokens in secure storage
4. App uses access token for API requests
5. Refresh token is used to get new access tokens when needed
6. Biometric authentication can be enabled for quick access

## Key Components

### Job Marketplace
- **Job Feed**: Personalized AI job recommendations
- **Advanced Filtering**: Filter by skill, rate, project length
- **Job Detail View**: Comprehensive project information
- **Proposal Submission**: Apply to jobs with custom proposals

### Messaging System
- **Real-time Chat**: Instant messaging between clients and freelancers
- **File Sharing**: Share documents and code snippets
- **Message Status**: Read/delivered indicators
- **Push Notifications**: For new messages

### AI Matching
- **Skill-based Matching**: AI-powered job recommendations
- **Portfolio Analysis**: GitHub integration for skill verification
- **Match Score**: Compatibility rating between jobs and profiles

### Collaboration Tools
- **Mobile Jupyter Notebooks**: View and edit notebooks on the go
- **Code Collaboration**: Review and comment on code
- **Milestone Tracking**: Monitor project progress

### Payment System
- **Secure Payments**: Escrow-based milestone payments
- **Payment History**: Transaction records and invoices
- **Multiple Payment Methods**: Credit cards and bank transfers

## Security Considerations

- **Secure Storage**: Sensitive data stored in Android Keystore
- **Biometric Authentication**: Fingerprint and face recognition
- **Certificate Pinning**: Prevents man-in-the-middle attacks
- **App Permissions**: Minimal required permissions with contextual requests
- **Screen Security**: Prevents screenshots of sensitive screens
- **Network Security**: TLS 1.3 for all API communications
- **Logs Sanitization**: No sensitive data in logs
- **Tamper Detection**: Runtime integrity checks
- **Secure Keyboard**: For sensitive input fields

## Testing

The Android application includes comprehensive testing:

### Unit Tests
- Uses Jest for testing individual components and utilities
- Mock services for API testing
- Redux state testing

### Integration Tests
- Component integration testing
- Navigation flow testing
- Redux integration testing

### End-to-End Tests
- Uses Detox for full application testing
- Automated UI interaction testing
- Mock server responses for consistent testing

Run tests with:
```bash
# Unit and integration tests
npm run test

# E2E tests (requires running emulator)
npm run test:e2e
```

## Building for Production

To create a signed APK for distribution:

1. **Generate a signing key**:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore ai-talent-marketplace.keystore -alias ai-talent-marketplace -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure signing in gradle**:
   - Create a `android/gradle.properties` file with your signing configuration

3. **Create a production build**:
   ```bash
   # Set environment to production
   cp .env.production .env

   # Generate the release build
   cd android && ./gradlew bundleRelease
   ```

4. **Test the production build**:
   ```bash
   npx react-native run-android --variant=release
   ```

5. **Submit to Google Play Store** using the Google Play Console

## Contributing

We welcome contributions to the AI Talent Marketplace Android app!

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure they pass
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- We use ESLint and Prettier for code formatting
- Run `npm run lint` before committing
- Follow the TypeScript best practices

### Pull Request Process

1. Update documentation as needed
2. Update the README.md with details of changes if applicable
3. The PR should work for both Android and iOS platforms
4. PRs require at least one reviewer approval
5. CI checks must pass before merging

### Reporting Bugs

Use the GitHub issue tracker to report bugs. Please include:
- A quick summary and/or background
- Steps to reproduce
- Expected behavior
- Actual behavior
- Device information (OS version, model)
- Screenshots if applicable

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.