/**
 * A customizable dropdown select component for the AI Talent Marketplace iOS application.
 * This component allows users to select from a list of options with support for different states
 * including default, focused, error, and disabled states.
 */
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'; // v18.2.0
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native'; // v0.72.x
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';
import { moderateScale } from '../../utils/responsive';
import { Button, ButtonVariant } from './Button';

/**
 * Interface defining the structure of select options
 */
export interface SelectOption {
  /**
   * Display text for the option
   */
  label: string;
  
  /**
   * Value of the option
   */
  value: string;
}

/**
 * Interface defining props for the Select component
 */
export interface SelectProps {
  /**
   * Label text to display above the select
   */
  label?: string;
  
  /**
   * Array of options for the select dropdown
   */
  options: SelectOption[];
  
  /**
   * Currently selected value
   */
  value?: string;
  
  /**
   * Function called when selection changes
   */
  onValueChange: (value: string) => void;
  
  /**
   * Placeholder text to display when no value is selected
   * @default "Select an option"
   */
  placeholder?: string;
  
  /**
   * Error message to display below the select
   */
  error?: string;
  
  /**
   * Whether the select is required
   * @default false
   */
  isRequired?: boolean;
  
  /**
   * Whether the select is disabled
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Additional styles for the select container
   */
  style?: StyleProp<ViewStyle>;
  
  /**
   * Additional styles for the label
   */
  labelStyle?: StyleProp<TextStyle>;
  
  /**
   * Additional styles for the dropdown
   */
  dropdownStyle?: StyleProp<ViewStyle>;
  
  /**
   * Test ID for automated testing
   */
  testID?: string;
  
  /**
   * Accessibility label for screen readers
   */
  accessibilityLabel?: string;
}

/**
 * Interface defining ref methods exposed by the Select component
 */
export interface SelectRef {
  /**
   * Opens the dropdown
   */
  open: () => void;
  
  /**
   * Closes the dropdown
   */
  close: () => void;
}

/**
 * Generates select styles based on current state (focused, error, disabled)
 * @param focused - Whether the select is focused
 * @param hasError - Whether the select has an error
 * @param disabled - Whether the select is disabled
 * @returns Combined styles for the select container
 */
const getSelectStyles = (
  focused: boolean,
  hasError: boolean,
  disabled: boolean,
): object => {
  // Start with base styles
  const baseStyles = [styles.selectContainer];
  
  // Apply focused styles if select is focused
  if (focused) {
    baseStyles.push(styles.selectFocused);
  }
  
  // Apply error styles if select has an error
  if (hasError) {
    baseStyles.push(styles.selectError);
  }
  
  // Apply disabled styles if select is disabled
  if (disabled) {
    baseStyles.push(styles.selectDisabled);
  }
  
  return baseStyles;
};

/**
 * A customizable dropdown select component for the AI Talent Marketplace iOS application.
 * Supports different states including default, focused, error, and disabled states.
 * Provides appropriate visual feedback and accessibility features.
 */
export const Select = forwardRef<SelectRef, SelectProps>(
  (
    {
      label,
      options,
      value,
      onValueChange,
      placeholder = 'Select an option',
      error,
      isRequired = false,
      disabled = false,
      style,
      labelStyle,
      dropdownStyle,
      testID,
      accessibilityLabel,
    }: SelectProps,
    ref,
  ) => {
    // State for dropdown visibility
    const [isOpen, setIsOpen] = useState(false);
    // State for focus
    const [isFocused, setIsFocused] = useState(false);
    // Find selected item from options
    const selectedItem = options.find((option) => option.value === value);
    
    // Refs for measurements and positioning
    const selectRef = useRef<View>(null);
    const [selectLayout, setSelectLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    
    // Expose open and close methods via ref
    useImperativeHandle(ref, () => ({
      open: () => {
        if (!disabled) {
          measureSelect();
          setIsOpen(true);
          setIsFocused(true);
        }
      },
      close: () => {
        setIsOpen(false);
        setIsFocused(false);
      },
    }));
    
    // Measure select input position for dropdown positioning
    const measureSelect = () => {
      if (selectRef.current) {
        selectRef.current.measure((x, y, width, height, pageX, pageY) => {
          setSelectLayout({
            x: pageX,
            y: pageY,
            width,
            height,
          });
        });
      }
    };
    
    // Handle dropdown toggle
    const toggleDropdown = () => {
      if (!disabled) {
        if (!isOpen) {
          measureSelect();
        }
        setIsOpen(!isOpen);
        setIsFocused(!isOpen);
      }
    };
    
    // Handle option selection
    const handleSelect = (option: SelectOption) => {
      onValueChange(option.value);
      setIsOpen(false);
      setIsFocused(false);
    };
    
    // Effect to close dropdown when clicking outside
    useEffect(() => {
      const backHandler = () => {
        if (isOpen) {
          setIsOpen(false);
          setIsFocused(false);
          return true;
        }
        return false;
      };
      
      // We would typically add proper event listeners here
      // This is simplified for the example
      
      return () => {
        // Cleanup
      };
    }, [isOpen]);
    
    // Generate styles based on component state
    const selectStyles = getSelectStyles(isFocused, !!error, disabled);
    
    // Determine appropriate accessibility props
    const selectAccessibilityProps = {
      accessibilityRole: 'button' as const,
      accessibilityState: {
        disabled,
        expanded: isOpen,
      },
      accessibilityLabel: accessibilityLabel || `${label || 'Select'}, ${selectedItem?.label || placeholder}`,
      accessibilityHint: 'Tap to open dropdown',
    };
    
    return (
      <View style={[styles.container, style]} testID={testID || 'select-component'}>
        {/* Label */}
        {label && (
          <Text 
            style={[styles.label, labelStyle]}
            accessibilityRole="text"
          >
            {label}
            {isRequired && <Text style={styles.required}> *</Text>}
          </Text>
        )}
        
        {/* Select input */}
        <TouchableOpacity
          ref={selectRef}
          style={selectStyles}
          onPress={toggleDropdown}
          disabled={disabled}
          testID={`${testID || 'select'}-button`}
          {...selectAccessibilityProps}
        >
          <View style={styles.selectTextContainer}>
            <Text
              style={[
                styles.selectText,
                !selectedItem && styles.placeholder,
                disabled && styles.disabledText,
              ]}
              numberOfLines={1}
            >
              {selectedItem ? selectedItem.label : placeholder}
            </Text>
          </View>
          
          {/* Dropdown arrow icon */}
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.arrow,
                isOpen && styles.arrowUp,
                disabled && styles.disabledText,
              ]}
            />
          </View>
        </TouchableOpacity>
        
        {/* Error message */}
        {error && (
          <Text 
            style={styles.errorText}
            accessibilityRole="text"
            accessibilityLabel={`Error: ${error}`}
          >
            {error}
          </Text>
        )}
        
        {/* Options dropdown modal */}
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setIsOpen(false);
            setIsFocused(false);
          }}
          supportedOrientations={['portrait', 'landscape']}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setIsOpen(false);
              setIsFocused(false);
            }}
            accessibilityLabel="Close dropdown"
          >
            <View
              style={[
                styles.dropdownContainer,
                {
                  position: 'absolute',
                  top: selectLayout.y + selectLayout.height,
                  left: selectLayout.x,
                  width: selectLayout.width,
                  maxHeight: moderateScale(300),
                },
                dropdownStyle,
              ]}
              accessibilityViewIsModal={true}
              accessibilityRole="menu"
            >
              {options.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No options available</Text>
                </View>
              ) : (
                <FlatList
                  data={options}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.optionItem,
                        item.value === value && styles.selectedOption,
                      ]}
                      onPress={() => handleSelect(item)}
                      accessibilityRole="menuitem"
                      accessibilityState={{ selected: item.value === value }}
                      accessibilityLabel={item.label}
                      testID={`${testID || 'select'}-option-${item.value}`}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          item.value === value && styles.selectedOptionText,
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={styles.optionsList}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={10}
                />
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }
);

// For display name in React DevTools
Select.displayName = 'Select';

const styles = StyleSheet.create({
  container: {
    marginVertical: moderateScale(8),
    width: '100%',
  },
  label: {
    ...textVariants.label,
    marginBottom: moderateScale(6),
  },
  required: {
    color: colors.error[500],
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: moderateScale(8),
    backgroundColor: colors.background.primary,
    minHeight: moderateScale(48),
    paddingHorizontal: moderateScale(12),
  },
  selectFocused: {
    borderColor: colors.border.focus,
    borderWidth: 2,
    paddingHorizontal: moderateScale(11), // Adjust for the thicker border
  },
  selectError: {
    borderColor: colors.error[500],
  },
  selectDisabled: {
    backgroundColor: colors.background.disabled,
    borderColor: colors.border.default,
  },
  selectTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  selectText: {
    ...textVariants.input,
    paddingVertical: moderateScale(10),
  },
  placeholder: {
    color: colors.text.tertiary,
  },
  disabledText: {
    color: colors.text.disabled,
  },
  iconContainer: {
    width: moderateScale(24),
    height: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: moderateScale(5),
    borderRightWidth: moderateScale(5),
    borderTopWidth: moderateScale(5),
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.text.primary,
  },
  arrowUp: {
    transform: [{ rotate: '180deg' }],
  },
  errorText: {
    ...textVariants.caption,
    color: colors.error[500],
    marginTop: moderateScale(4),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 5,
    overflow: 'hidden',
  },
  optionsList: {
    flexGrow: 0,
  },
  optionItem: {
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  selectedOption: {
    backgroundColor: colors.primary[50],
  },
  optionText: {
    ...textVariants.input,
  },
  selectedOptionText: {
    color: colors.primary[600],
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
  },
  emptyContainer: {
    padding: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: moderateScale(100),
  },
  emptyText: {
    ...textVariants.paragraph,
    color: colors.text.tertiary,
  },
});