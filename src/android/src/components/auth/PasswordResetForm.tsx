/**
 * AI Talent Marketplace - Password Reset Form Component
 *
 * A form component that allows users to reset their password by entering and confirming a new password.
 * It validates password requirements, ensures passwords match, and handles the password reset API call
 * with appropriate loading and error states.
 *
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'; // v18.2.0
import {
  StyleSheet,
  View,
  Text,
  Alert,
  Platform,
} from 'react-native'; // v0.72.x
import { Controller, useForm } from 'react-hook-form'; // v7.x
import { yupResolver } from '@hookform/resolvers/yup'; // ^3.1.0
import * as yup from 'yup'; // ^1.2.0

// Internal imports
import Button from '../common/Button';
import { ButtonVariant } from '../common/Button';
import Input from '../common/Input';
import { InputType } from '../common/Input';
import useAuth from '../../hooks/useAuth';
import { validatePassword } from '../../utils/validation';
import { ResetPasswordFormValues } from '../../types/auth.types';

/**
 * Props interface for the PasswordResetForm component
 */
interface PasswordResetFormProps {
  /**
   * The password reset token
   */
  token: string;
  /**
   * Callback function to execute on successful password reset
   */
  onSuccess: () => void;
}

/**
 * Validates that the password and confirmation password match
 *
 * @param password The password string
 * @param confirmPassword The confirmation password string
 * @returns True if passwords match, false otherwise
 */
const validatePasswordsMatch = (password: string, confirmPassword: string): boolean => {
  if (!password || !confirmPassword) {
    return false;
  }
  return password === confirmPassword;
};

/**
 * Creates a Yup validation schema for the reset password form
 *
 * @returns Yup validation schema
 */
const createValidationSchema = () => {
  return yup.object().shape({
    password: yup
      .string()
      .required('Password is required')
      .test(
        'validatePassword',
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        validatePassword
      ),
    confirmPassword: yup
      .string()
      .required('Confirm Password is required')
      .oneOf([yup.ref('password')], 'Passwords must match'),
  });
};

/**
 * A form component that allows users to reset their password by entering and confirming a new password
 *
 * @param props The component props
 * @returns Rendered password reset form
 */
const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ token, onSuccess }) => {
  // Authentication hook
  const auth = useAuth();

  // Form state using react-hook-form
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ResetPasswordFormValues>({
    resolver: yupResolver(createValidationSchema()),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  /**
   * Handles form submission and triggers the password reset API call
   *
   * @param data Form data containing the new password and confirmation
   */
  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      // Call resetPassword method from useAuth hook
      const resetResult = await auth.resetPassword({ token, password: data.password, confirmPassword: data.confirmPassword });

      if (resetResult.success) {
        // Handle successful response by calling onSuccess callback
        onSuccess();
      } else {
        // Handle errors by displaying appropriate error messages
        if (Platform.OS === 'web') {
          alert(resetResult.message);
        } else {
          Alert.alert('Error', resetResult.message);
        }
      }
    } catch (error: any) {
      // Handle errors by displaying appropriate error messages
      if (Platform.OS === 'web') {
        alert(error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      // Reset form if there's an error
      reset();
    }
  };

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        rules={{
          required: true,
          validate: (value) => {
            if (errors.confirmPassword) {
              return true;
            }
            return validatePasswordsMatch(value, control._formValues.confirmPassword) || 'Passwords must match';
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Password"
            type={InputType.PASSWORD}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            isRequired
          />
        )}
        name="password"
      />

      <Controller
        control={control}
        rules={{
          required: true,
          validate: (value) => {
            if (errors.password) {
              return true;
            }
            return validatePasswordsMatch(control._formValues.password, value) || 'Passwords must match';
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Confirm Password"
            type={InputType.PASSWORD}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.confirmPassword?.message}
            isRequired
          />
        )}
        name="confirmPassword"
      />

      <Button
        title="Reset Password"
        variant={ButtonVariant.PRIMARY}
        onPress={handleSubmit(onSubmit)}
        isDisabled={auth.isLoading}
        isLoading={auth.isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
});

export default PasswordResetForm;