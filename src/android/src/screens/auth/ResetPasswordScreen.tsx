import React, { useState, useEffect } from 'react'; // react v18.2.0
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native'; // react-native v0.72.x
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'; // @react-navigation/native v6.1.7
import { NativeStackNavigationProp } from '@react-navigation/native-stack'; // @react-navigation/native-stack v6.9.13

// Internal imports
import { SafeAreaView, EdgeMode } from '../../components/common/SafeAreaView';
import PasswordResetForm from '../../components/auth/PasswordResetForm';
import useAuth from '../../hooks/useAuth';
import { ResetPasswordFormValues, AuthStackParamList } from '../../types/auth.types';
import { ToastType } from '../../components/common/Toast';

/**
 * Type definition for the ResetPasswordScreen route
 */
type ResetPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

/**
 * Type definition for the ResetPasswordScreen navigation
 */
type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'ResetPassword'
>;

/**
 * Main screen component for password reset functionality
 */
const ResetPasswordScreen: React.FC = () => {
  // State variables
  const [token, setToken] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // React Navigation hooks
  const route = useRoute<ResetPasswordScreenRouteProp>();
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();

  // Authentication hook
  const auth = useAuth();

  // Extract token from route params
  useEffect(() => {
    if (route.params?.token) {
      setToken(route.params.token);
      setLoading(false);
    }
  }, [route.params?.token]);

  // Deep link handling
  const extractTokenFromURL = (url: string): string | null => {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const resetPasswordPath = '/reset-password';

    if (!url.includes(resetPasswordPath)) {
      return null;
    }

    try {
      const parsedUrl = new URL(url);
      const tokenParam = parsedUrl.searchParams.get('token');
      return tokenParam;
    } catch (e) {
      console.error('Error parsing URL:', e);
      return null;
    }
  };

  // Handle initial URL when app is opened from a reset password link
  useEffect(() => {
    const handleInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const extractedToken = extractTokenFromURL(initialUrl);
          if (extractedToken) {
            setToken(extractedToken);
            setLoading(false);
          } else {
            setError('Invalid reset password link.');
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error('Error getting initial URL:', e);
        setError('Could not process the reset password link.');
        setLoading(false);
      }
    };

    handleInitialURL();
  }, []);

  // Add event listener for handling deep links while app is running
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const extractedToken = extractTokenFromURL(event.url);
      if (extractedToken) {
        setToken(extractedToken);
        setError(null);
        setLoading(false);
      } else {
        setError('Invalid reset password link.');
        setLoading(false);
      }
    };

    Linking.addEventListener('url', handleDeepLink);

    return () => {
      Linking.removeEventListener('url', handleDeepLink);
    };
  }, []);

  // Create a success handler to show confirmation and navigate to login
  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      navigation.navigate('Login');
    }, 3000);
  };

  // Add appropriate header with back button navigation to login screen
  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'Reset Password',
      headerLeft: () => (
        <Text onPress={() => navigation.goBack()}>Back to Login</Text>
      ),
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={EdgeMode.NONE}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : success ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Password reset successful! Redirecting to login...
            </Text>
          </View>
        ) : token ? (
          <PasswordResetForm token={token} onSuccess={handleSuccess} />
        ) : (
          <View>
            <Text>Invalid or expired token.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  successContainer: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#388e3c',
    fontSize: 14,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ResetPasswordScreen;