import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { expect, describe, it, beforeEach, jest } from '@jest/globals';
import { Button, ButtonVariant, ButtonSize, ButtonProps } from '../../../src/components/common/Button';
import { primary, text } from '../../../src/styles/colors';

// Mock onPress callback
const mockOnPress = jest.fn();

describe('Button component', () => {
  beforeEach(() => {
    // Reset mocks between tests
    mockOnPress.mockClear();
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('should render with text prop', () => {
      const { getByText, getByTestId } = render(
        <Button text="Test Button" testID="test-button" onPress={mockOnPress} />
      );
      
      const buttonElement = getByTestId('test-button');
      const textElement = getByText('Test Button');
      
      expect(buttonElement).toBeTruthy();
      expect(textElement).toBeTruthy();
    });

    it('should render with children', () => {
      const { getByText, getByTestId } = render(
        <Button testID="test-button" onPress={mockOnPress}>
          <Text>Child Content</Text>
        </Button>
      );
      
      const buttonElement = getByTestId('test-button');
      const childElement = getByText('Child Content');
      
      expect(buttonElement).toBeTruthy();
      expect(childElement).toBeTruthy();
    });

    it('should prioritize children over text prop', () => {
      const { getByText, queryByText, getByTestId } = render(
        <Button text="Text Prop" testID="test-button" onPress={mockOnPress}>
          <Text>Child Content</Text>
        </Button>
      );
      
      expect(getByTestId('test-button')).toBeTruthy();
      expect(getByText('Child Content')).toBeTruthy();
      expect(queryByText('Text Prop')).toBeNull(); // Text prop should not be rendered
    });

    it('should apply primary variant styles by default', () => {
      const { getByTestId } = render(
        <Button text="Test Button" testID="test-button" onPress={mockOnPress} />
      );
      
      const buttonElement = getByTestId('test-button');
      const styles = buttonElement.props.style;
      
      // Find style containing backgroundColor that matches primary[600]
      const backgroundStyle = styles.find(style => style && style.backgroundColor === primary[600]);
      expect(backgroundStyle).toBeTruthy();
    });
  });

  describe('Button variants', () => {
    it('should apply different styles based on variant', () => {
      const { getByTestId } = render(
        <>
          <Button 
            variant={ButtonVariant.PRIMARY} 
            text="Primary" 
            testID="primary-button"
            onPress={mockOnPress} 
          />
          <Button 
            variant={ButtonVariant.SECONDARY} 
            text="Secondary" 
            testID="secondary-button"
            onPress={mockOnPress} 
          />
          <Button 
            variant={ButtonVariant.OUTLINE} 
            text="Outline" 
            testID="outline-button"
            onPress={mockOnPress} 
          />
          <Button 
            variant={ButtonVariant.DANGER} 
            text="Danger" 
            testID="danger-button"
            onPress={mockOnPress} 
          />
          <Button 
            variant={ButtonVariant.SUCCESS} 
            text="Success" 
            testID="success-button"
            onPress={mockOnPress} 
          />
          <Button 
            variant={ButtonVariant.LINK} 
            text="Link" 
            testID="link-button"
            onPress={mockOnPress} 
          />
        </>
      );
      
      // Check primary button background color
      const primaryButton = getByTestId('primary-button');
      expect(primaryButton.props.style.find(s => s && s.backgroundColor === primary[600])).toBeTruthy();
      
      // Check secondary button background color
      const secondaryButton = getByTestId('secondary-button');
      expect(secondaryButton.props.style.find(s => s && s.backgroundColor === primary[100])).toBeTruthy();
      
      // Check outline button styles
      const outlineButton = getByTestId('outline-button');
      expect(outlineButton.props.style.find(s => s && s.backgroundColor === 'transparent')).toBeTruthy();
      expect(outlineButton.props.style.find(s => s && s.borderWidth === 1)).toBeTruthy();
      expect(outlineButton.props.style.find(s => s && s.borderColor === primary[600])).toBeTruthy();
      
      // Check danger button styles
      const dangerButton = getByTestId('danger-button');
      expect(dangerButton.props.style.find(s => s && s.backgroundColor === '#dc2626')).toBeTruthy();
      
      // Check success button styles
      const successButton = getByTestId('success-button');
      expect(successButton.props.style.find(s => s && s.backgroundColor === '#16a34a')).toBeTruthy();
      
      // Check link button styles
      const linkButton = getByTestId('link-button');
      expect(linkButton.props.style.find(s => s && s.backgroundColor === 'transparent')).toBeTruthy();
      expect(linkButton.props.style.find(s => s && s.paddingHorizontal === 0)).toBeTruthy();
    });
  });

  describe('Button sizes', () => {
    it('should render in different sizes', () => {
      const { getByTestId } = render(
        <>
          <Button 
            size={ButtonSize.SMALL} 
            text="Small" 
            testID="small-button"
            onPress={mockOnPress} 
          />
          <Button 
            size={ButtonSize.MEDIUM} 
            text="Medium" 
            testID="medium-button"
            onPress={mockOnPress} 
          />
          <Button 
            size={ButtonSize.LARGE} 
            text="Large" 
            testID="large-button"
            onPress={mockOnPress} 
          />
        </>
      );
      
      // Get button elements
      const smallButton = getByTestId('small-button');
      const mediumButton = getByTestId('medium-button');
      const largeButton = getByTestId('large-button');
      
      // Get minHeight values
      const smallHeight = smallButton.props.style.find(s => s && s.minHeight)?.minHeight;
      const mediumHeight = mediumButton.props.style.find(s => s && s.minHeight)?.minHeight;
      const largeHeight = largeButton.props.style.find(s => s && s.minHeight)?.minHeight;
      
      // Verify sizes are in ascending order
      expect(smallHeight).toBeLessThan(mediumHeight);
      expect(mediumHeight).toBeLessThan(largeHeight);
    });

    it('should expand to full width when isFullWidth is true', () => {
      const { getByTestId } = render(
        <Button 
          isFullWidth={true} 
          text="Full Width Button" 
          testID="full-width-button"
          onPress={mockOnPress} 
        />
      );
      
      const buttonElement = getByTestId('full-width-button');
      const fullWidthStyle = buttonElement.props.style.find(s => s && s.width === '100%');
      
      expect(fullWidthStyle).toBeTruthy();
    });
  });

  describe('Button states', () => {
    it('should show loading spinner when isLoading is true', () => {
      const { getByTestId, queryByText } = render(
        <Button 
          isLoading={true} 
          text="Loading Button" 
          testID="loading-button"
          onPress={mockOnPress} 
        />
      );
      
      // Spinner should be present
      expect(getByTestId('spinner-component')).toBeTruthy();
      
      // Text should be hidden during loading
      expect(queryByText('Loading Button')).toBeNull();
      
      // Button should be disabled during loading
      expect(getByTestId('loading-button').props.disabled).toBe(true);
    });

    it('should apply disabled styles when disabled is true', () => {
      const { getByTestId } = render(
        <Button 
          disabled={true} 
          text="Disabled Button" 
          testID="disabled-button"
          onPress={mockOnPress} 
        />
      );
      
      const buttonElement = getByTestId('disabled-button');
      
      // Should have disabled prop
      expect(buttonElement.props.disabled).toBe(true);
      
      // Should have opacity style
      const disabledStyle = buttonElement.props.style.find(s => s && s.opacity === 0.5);
      expect(disabledStyle).toBeTruthy();
    });

    it('should not call onPress when disabled', () => {
      const { getByTestId } = render(
        <Button 
          disabled={true} 
          text="Disabled Button" 
          testID="disabled-button"
          onPress={mockOnPress} 
        />
      );
      
      // Trigger press
      fireEvent.press(getByTestId('disabled-button'));
      
      // onPress should not be called
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should not call onPress when loading', () => {
      const { getByTestId } = render(
        <Button 
          isLoading={true} 
          text="Loading Button" 
          testID="loading-button"
          onPress={mockOnPress} 
        />
      );
      
      // Trigger press
      fireEvent.press(getByTestId('loading-button'));
      
      // onPress should not be called
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('User interactions', () => {
    it('should call onPress when pressed', () => {
      const { getByTestId } = render(
        <Button 
          text="Clickable Button" 
          testID="clickable-button"
          onPress={mockOnPress} 
        />
      );
      
      // Trigger press
      fireEvent.press(getByTestId('clickable-button'));
      
      // onPress should be called once
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility props', () => {
      const { getByTestId } = render(
        <Button 
          text="Accessible Button" 
          testID="accessible-button"
          accessibilityLabel="Custom Accessibility Label"
          onPress={mockOnPress} 
        />
      );
      
      const buttonElement = getByTestId('accessible-button');
      
      expect(buttonElement.props.accessibilityRole).toBe('button');
      expect(buttonElement.props.accessibilityLabel).toBe('Custom Accessibility Label');
    });

    it('should use text as default accessibility label', () => {
      const { getByTestId } = render(
        <Button 
          text="Button Text" 
          testID="default-a11y-button"
          onPress={mockOnPress} 
        />
      );
      
      const buttonElement = getByTestId('default-a11y-button');
      
      expect(buttonElement.props.accessibilityLabel).toBe('Button Text');
    });

    it('should have correct accessibility states when disabled or loading', () => {
      // Test disabled state
      const { getByTestId, rerender } = render(
        <Button 
          disabled={true}
          text="Disabled Button" 
          testID="a11y-state-button"
          onPress={mockOnPress} 
        />
      );
      
      let buttonElement = getByTestId('a11y-state-button');
      
      expect(buttonElement.props.accessibilityState.disabled).toBe(true);
      expect(buttonElement.props.accessibilityState.busy).toBe(false);
      
      // Test loading state
      rerender(
        <Button 
          isLoading={true}
          text="Loading Button" 
          testID="a11y-state-button"
          onPress={mockOnPress} 
        />
      );
      
      buttonElement = getByTestId('a11y-state-button');
      
      expect(buttonElement.props.accessibilityState.disabled).toBe(true);
      expect(buttonElement.props.accessibilityState.busy).toBe(true);
    });
  });
});