import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.4.3
import Button, { ButtonVariant, ButtonSize } from '../../../src/components/common/Button';
import Spinner from '../../../src/components/common/Spinner';

// Mock click handler
const mockClickHandler = jest.fn();

/**
 * Helper function to render the Button component with specified props
 */
const renderButton = (props = {}) => {
  mockClickHandler.mockReset();
  return render(
    <Button
      onClick={mockClickHandler}
      {...props}
    >
      Click me
    </Button>
  );
};

describe('Button Component', () => {
  // Clean up the mock before each test to avoid test pollution
  beforeEach(() => {
    mockClickHandler.mockClear();
  });

  test('renders with default props', () => {
    renderButton();
    const button = screen.getByRole('button', { name: /click me/i });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
    expect(button).toHaveAttribute('type', 'button');
    // Check for default classes (PRIMARY variant and MEDIUM size)
    expect(button).toHaveClass('bg-primary-600');
    expect(button).toHaveClass('px-4', 'py-2', 'text-base');
  });

  describe('renders with different variants', () => {
    test.each([
      [ButtonVariant.PRIMARY, 'bg-primary-600', 'text-white'],
      [ButtonVariant.SECONDARY, 'bg-secondary-600', 'text-white'],
      [ButtonVariant.DANGER, 'bg-red-600', 'text-white'],
      [ButtonVariant.SUCCESS, 'bg-green-600', 'text-white'],
      [ButtonVariant.OUTLINE, 'bg-transparent', 'border-gray-300'],
      [ButtonVariant.GHOST, 'bg-transparent', 'text-gray-700'],
    ])('renders %s variant with correct styles', (variant, bgClass, textClass) => {
      renderButton({ variant });
      const button = screen.getByRole('button');
      expect(button).toHaveClass(bgClass);
      expect(button).toHaveClass(textClass);
    });
  });

  describe('renders with different sizes', () => {
    test.each([
      [ButtonSize.SMALL, 'px-3', 'py-1.5', 'text-sm'],
      [ButtonSize.MEDIUM, 'px-4', 'py-2', 'text-base'],
      [ButtonSize.LARGE, 'px-6', 'py-3', 'text-lg'],
    ])('renders %s size with correct styles', (size, paddingX, paddingY, textSize) => {
      renderButton({ size });
      const button = screen.getByRole('button');
      expect(button).toHaveClass(paddingX);
      expect(button).toHaveClass(paddingY);
      expect(button).toHaveClass(textSize);
    });
  });

  test('renders as disabled when disabled prop is true', () => {
    renderButton({ disabled: true });
    const button = screen.getByRole('button', { name: /click me/i });
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-70', 'cursor-not-allowed');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    
    fireEvent.click(button);
    expect(mockClickHandler).not.toHaveBeenCalled();
  });

  test('renders with loading state when isLoading prop is true', () => {
    renderButton({ isLoading: true });
    const button = screen.getByRole('button');
    const spinner = screen.getByRole('status');
    
    expect(spinner).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveClass('opacity-70', 'cursor-not-allowed');
    
    // Text should be hidden but not removed during loading
    const buttonText = screen.getByText('Click me');
    expect(buttonText).toHaveClass('invisible');
    
    fireEvent.click(button);
    expect(mockClickHandler).not.toHaveBeenCalled();
  });

  test('renders with full width when isFullWidth prop is true', () => {
    renderButton({ isFullWidth: true });
    const button = screen.getByRole('button', { name: /click me/i });
    
    expect(button).toHaveClass('w-full');
  });

  test('applies custom className when provided', () => {
    renderButton({ className: 'custom-class' });
    const button = screen.getByRole('button', { name: /click me/i });
    
    expect(button).toHaveClass('custom-class');
  });

  test('calls onClick handler when clicked', async () => {
    renderButton();
    const button = screen.getByRole('button', { name: /click me/i });
    
    await userEvent.click(button);
    expect(mockClickHandler).toHaveBeenCalledTimes(1);
    
    // Check that the event object is passed to the handler
    expect(mockClickHandler.mock.calls[0][0]).toBeTruthy();
  });

  describe('renders with correct button type', () => {
    test.each([
      ['button'],
      ['submit'],
      ['reset'],
    ])('renders with %s type', (type) => {
      renderButton({ type: type as 'button' | 'submit' | 'reset' });
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', type);
    });
  });

  test('renders with proper accessibility attributes', () => {
    renderButton({ ariaLabel: 'Custom button label' });
    const button = screen.getByRole('button');
    
    expect(button).toHaveAttribute('aria-label', 'Custom button label');
    
    // Test disabled state accessibility
    renderButton({ disabled: true });
    const disabledButton = screen.getByRole('button');
    expect(disabledButton).toHaveAttribute('aria-disabled', 'true');
  });

  test('renders with proper test ID when provided', () => {
    renderButton({ testId: 'test-button' });
    const button = screen.getByTestId('test-button');
    
    expect(button).toBeInTheDocument();
  });
});