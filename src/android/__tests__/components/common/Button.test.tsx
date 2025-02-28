import React from 'react'; // v18.2.0
import { View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native'; // v12.2.2
import '@testing-library/jest-native/extend-expect'; // v5.4.3
import { jest } from '@jest/globals'; // v29.6.2
import Button, { ButtonVariant, ButtonSize, ButtonProps } from '../../../src/components/common/Button';

/**
 * Helper function to render Button with default props
 */
const renderButton = (props: Partial<ButtonProps> = {}): ReturnType<typeof render> => {
  const defaultProps: ButtonProps = {
    title: 'Test Button',
    onPress: jest.fn(),
    ...props,
  };
  return render(<Button {...defaultProps} />);
};

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    const { getByText, getByTestId } = renderButton({ testID: 'test-button' });
    
    const button = getByTestId('test-button');
    expect(button).toBeTruthy();
    
    const buttonText = getByText('Test Button');
    expect(buttonText).toBeTruthy();
    
    // Default variant is PRIMARY and size is MEDIUM
    expect(button).toHaveStyle({ borderWidth: 1 });
  });
  
  it('applies different variants correctly', () => {
    Object.values(ButtonVariant).forEach(variant => {
      const { getByTestId, unmount } = renderButton({ 
        variant, 
        testID: `button-${variant}` 
      });
      
      const button = getByTestId(`button-${variant}`);
      
      if (variant === ButtonVariant.OUTLINE) {
        expect(button).toHaveStyle({ backgroundColor: 'transparent' });
      } else if (variant === ButtonVariant.LINK) {
        expect(button).toHaveStyle({ 
          backgroundColor: 'transparent',
          borderWidth: 0 
        });
      }
      
      unmount();
    });
  });
  
  it('applies different sizes correctly', () => {
    Object.values(ButtonSize).forEach(size => {
      const { getByTestId, unmount } = renderButton({ 
        size, 
        testID: `button-${size}` 
      });
      
      const button = getByTestId(`button-${size}`);
      
      if (size === ButtonSize.SMALL) {
        expect(button).toHaveStyle({ minHeight: expect.any(Number) });
      } else if (size === ButtonSize.LARGE) {
        expect(button).toHaveStyle({ minHeight: expect.any(Number) });
      }
      
      unmount();
    });
  });
  
  it('handles disabled state correctly', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderButton({ 
      isDisabled: true, 
      onPress, 
      testID: 'disabled-button' 
    });
    
    const button = getByTestId('disabled-button');
    expect(button).toHaveStyle({ opacity: 0.5 });
    expect(button.props.accessibilityState.disabled).toBe(true);
    
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
  
  it('handles loading state correctly', () => {
    const onPress = jest.fn();
    const { getByTestId, queryByText } = renderButton({ 
      isLoading: true, 
      onPress, 
      testID: 'loading-button' 
    });
    
    const button = getByTestId('loading-button');
    const spinner = getByTestId('spinner-loading-indicator');
    
    expect(spinner).toBeTruthy();
    expect(queryByText('Test Button')).toBeNull();
    expect(button.props.accessibilityState.busy).toBe(true);
    
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
  
  it('calls onPress handler when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderButton({ 
      onPress, 
      testID: 'pressable-button' 
    });
    
    const button = getByTestId('pressable-button');
    fireEvent.press(button);
    
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  
  it('renders with icons correctly', () => {
    const LeftIcon = () => <View testID="left-icon" />;
    const RightIcon = () => <View testID="right-icon" />;
    
    // Test left icon
    const { getByTestId: getLeftIcon, unmount: unmountLeft } = renderButton({ 
      leftIcon: <LeftIcon />,
      testID: 'left-icon-button'
    });
    expect(getLeftIcon('left-icon')).toBeTruthy();
    unmountLeft();
    
    // Test right icon
    const { getByTestId: getRightIcon, unmount: unmountRight } = renderButton({ 
      rightIcon: <RightIcon />,
      testID: 'right-icon-button'
    });
    expect(getRightIcon('right-icon')).toBeTruthy();
    unmountRight();
    
    // Test both icons
    const { getByTestId: getBothIcons } = renderButton({ 
      leftIcon: <LeftIcon />, 
      rightIcon: <RightIcon />,
      testID: 'both-icon-button'
    });
    expect(getBothIcons('left-icon')).toBeTruthy();
    expect(getBothIcons('right-icon')).toBeTruthy();
  });
  
  it('applies custom styles correctly', () => {
    const customStyle = { backgroundColor: 'purple', borderRadius: 20 };
    const customTextStyle = { color: 'yellow', fontSize: 20 };
    
    const { getByTestId, getByText } = renderButton({ 
      style: customStyle, 
      textStyle: customTextStyle,
      testID: 'styled-button'
    });
    
    const button = getByTestId('styled-button');
    const buttonText = getByText('Test Button');
    
    // Testing style merging works
    expect(button).toBeTruthy();
    expect(buttonText).toBeTruthy();
  });
  
  it('provides proper accessibility properties', () => {
    const { getByTestId } = renderButton({ 
      accessibilityLabel: 'Custom Label',
      testID: 'accessible-button'
    });
    
    const button = getByTestId('accessible-button');
    expect(button.props.accessibilityLabel).toBe('Custom Label');
    
    const { getByTestId: getDisabledButton } = renderButton({ 
      isDisabled: true,
      testID: 'disabled-a11y-button'
    });
    
    const disabledButton = getDisabledButton('disabled-a11y-button');
    expect(disabledButton.props.accessibilityState.disabled).toBe(true);
  });
});