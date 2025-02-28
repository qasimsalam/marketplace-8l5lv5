/**
 * A screen component for user registration in the AI Talent Marketplace iOS application.
 * This screen serves as a container for the RegisterForm component and handles navigation
 * between authentication screens.
 */
import React, { useEffect } from 'react'; // ^18.2.0
import { StyleSheet, View, Image, Platform } from 'react-native'; // v0.72.x
import { useNavigation, useIsFocused } from '@react-navigation/native'; // ^6.1.7
import { StackNavigationProp } from '@react-navigation/stack'; // ^6.3.17

// Internal imports
import { RegisterForm } from '../../components/auth/RegisterForm';
import { SafeAreaView, EdgeMode } from '../../components/common/SafeAreaView';
import { colors } from '../../styles/colors';
import useAuth from '../../hooks/useAuth';
import { layout } from '../../styles/layout';

/**
 * Registration screen component for the AI Talent Marketplace iOS app.
 * This screen serves as a container for the RegisterForm component and
 * handles navigation between authentication screens.
 */
const RegisterScreen = (): JSX.Element => {
  // Initialize navigation hook for redirecting after successful registration
  const navigation = useNavigation();
  
  // Initialize useAuth hook to check authentication status
  const { isAuthenticated } = useAuth();
  
  // Check if screen is focused
  const isFocused = useIsFocused();
  
  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && isFocused) {
      navigation.navigate('Dashboard');
    }
  }, [isAuthenticated, navigation, isFocused]);

  /**
   * Handler for successful registration
   */
  const handleRegistrationSuccess = () => {
    navigation.navigate('Dashboard');
  };

  /**
   * Handler for navigating to login screen
   */
  const handleLoginRedirect = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView 
      edges={EdgeMode.ALL} 
      backgroundColor={colors.background.primary}
    >
      <View style={styles.container}>
        {/* Background image with reduced opacity for visual appeal */}
        <Image 
          source={require('../../assets/images/background-pattern.png')} 
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        
        {/* Registration form container */}
        <View style={styles.formContainer}>
          <RegisterForm 
            onSuccess={handleRegistrationSuccess}
            redirectToLogin={handleLoginRedirect}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

// Styles defined according to design system specifications
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.05,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
});

export default RegisterScreen;