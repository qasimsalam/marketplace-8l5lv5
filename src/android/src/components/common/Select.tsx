/**
 * AI Talent Marketplace - Select Component
 * 
 * A customizable dropdown/select component for the Android application that
 * supports single and multi-select functionality, searchable options, and form integration.
 * 
 * @version 1.0.0
 */

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useMemo, 
  useCallback,
  forwardRef
} from 'react'; // v18.2.0
import { 
  View, 
  Text, 
  Pressable, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Animated,
  FlatList,
  Platform
} from 'react-native'; // v0.72.x
import { 
  StyleProp, 
  ViewStyle, 
  TextStyle, 
  TextInputProps 
} from 'react-native'; // v0.72.x
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // v^9.2.0

// Internal imports
import { Button, ButtonSize, ButtonVariant } from '../common/Button';
import { Input, InputSize } from '../common/Input';
import { Modal, ModalSize, ModalPosition } from '../common/Modal';
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';
import { layout, spacing, border, shadow } from '../../styles/layout';
import { moderateScale } from '../../utils/responsive';
import { useTheme } from '../../styles/theme';

/**
 * Enum defining available select size options
 */
export enum SelectSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

/**
 * Interface defining the structure of select options
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Interface defining the structure of grouped select options
 */
export interface OptionGroup {
  label: string;
  options: SelectOption[];
}

/**
 * Interface defining props for the Select component
 */
export interface SelectProps {
  /**
   * Options to display in the dropdown
   * Can be an array of SelectOption objects, strings or numbers
   */
  options?: SelectOption[] | string[] | number[];
  
  /**
   * Grouped options to display in the dropdown
   */
  groups?: OptionGroup[];
  
  /**
   * Currently selected value(s)
   */
  value?: string | string[];
  
  /**
   * Callback fired when selection changes
   */
  onChange?: (value: string | string[]) => void;
  
  /**
   * Input label text
   */
  label?: string;
  
  /**
   * Placeholder text when no option is selected
   */
  placeholder?: string;
  
  /**
   * Error message to display
   */
  error?: string;
  
  /**
   * Size of the select component
   * @default SelectSize.MEDIUM
   */
  size?: SelectSize;
  
  /**
   * Whether the select is disabled
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Whether to allow multiple selections
   * @default false
   */
  multiple?: boolean;
  
  /**
   * Whether to enable search functionality
   * @default false
   */
  searchable?: boolean;
  
  /**
   * Whether to show a clear button
   * @default false
   */
  clearable?: boolean;
  
  /**
   * Whether the select should take full width
   * @default true
   */
  isFullWidth?: boolean;
  
  /**
   * Maximum number of items to display before scrolling
   * @default 5
   */
  maxItems?: number;
  
  /**
   * Additional styles for the select container
   */
  style?: StyleProp<ViewStyle>;
  
  /**
   * Additional styles for the dropdown menu
   */
  dropdownStyle?: StyleProp<ViewStyle>;
  
  /**
   * Additional styles for the label
   */
  labelStyle?: StyleProp<TextStyle>;
  
  /**
   * Additional styles for the error text
   */
  errorStyle?: StyleProp<TextStyle>;
  
  /**
   * Callback fired when select receives focus
   */
  onFocus?: () => void;
  
  /**
   * Callback fired when select loses focus
   */
  onBlur?: () => void;
  
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
 * Formats options to ensure consistent structure regardless of input format
 * 
 * @param options Array of options in various formats
 * @returns Formatted options array
 */
export const formatOptions = (options?: any[]): SelectOption[] => {
  if (!options || !options.length) {
    return [];
  }
  
  return options.map(option => {
    if (typeof option === 'string' || typeof option === 'number') {
      return {
        value: String(option),
        label: String(option)
      };
    }
    
    if (typeof option === 'object' && option !== null) {
      return {
        value: String(option.value),
        label: option.label || String(option.value),
        disabled: !!option.disabled
      };
    }
    
    return {
      value: '',
      label: ''
    };
  });
};

/**
 * Generates select styles based on the current state (focused, error, disabled) and size
 * 
 * @param focused Whether the select is focused
 * @param hasError Whether the select has an error
 * @param disabled Whether the select is disabled
 * @param size Size of the select component
 * @param theme Current theme object
 * @returns Combined styles for the select container and trigger
 */
const getSelectStyles = (
  focused: boolean,
  hasError: boolean,
  disabled: boolean,
  size: SelectSize,
  theme: any
) => {
  // Base container styles
  const containerStyle: ViewStyle = {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    backgroundColor: disabled ? theme.colors.background.disabled : theme.colors.background.primary,
    overflow: 'hidden',
    opacity: disabled ? 0.7 : 1,
  };

  // Determine height based on size
  let height;
  switch (size) {
    case SelectSize.SMALL:
      height = moderateScale(32);
      containerStyle.paddingHorizontal = spacing.xs;
      break;
    case SelectSize.LARGE:
      height = moderateScale(56);
      containerStyle.paddingHorizontal = spacing.s;
      break;
    case SelectSize.MEDIUM:
    default:
      height = moderateScale(48);
      containerStyle.paddingHorizontal = spacing.s;
  }

  containerStyle.minHeight = height;

  // Apply focused styles
  if (focused && !disabled) {
    containerStyle.borderColor = colors.primary[600];
  }

  // Apply error styles
  if (hasError && !disabled) {
    containerStyle.borderColor = colors.error[500];
  }

  // Create trigger styles (button inside the select)
  const triggerStyle: ViewStyle = {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  };

  // Create dropdown styles
  const dropdownStyle: ViewStyle = {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 8,
    ...shadow.small,
    marginTop: spacing.xs,
    maxHeight: moderateScale(220),
  };

  return { containerStyle, triggerStyle, dropdownStyle };
};

/**
 * A customizable dropdown/select component with single and multi-select functionality
 * 
 * @param props Component props
 * @returns JSX.Element
 */
export const Select = forwardRef<View, SelectProps>((props, ref) => {
  const {
    options = [],
    groups = [],
    value,
    onChange,
    label,
    placeholder = 'Select an option',
    error,
    size = SelectSize.MEDIUM,
    disabled = false,
    multiple = false,
    searchable = false,
    clearable = false,
    isFullWidth = true,
    maxItems = 5,
    style,
    dropdownStyle,
    labelStyle,
    errorStyle,
    onFocus,
    onBlur,
    testID,
    accessibilityLabel,
  } = props;

  // Get theme
  const theme = useTheme();

  // Refs
  const containerRef = useRef<View>(null);
  const searchInputRef = useRef<any>(null);

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedValue, setSelectedValue] = useState<string | string[]>(value || (multiple ? [] : ''));

  // Format options to ensure consistent structure
  const formattedOptions = useMemo(() => {
    const allOptions: SelectOption[] = [...formatOptions(options)];
    
    // Add options from groups
    if (groups && groups.length) {
      groups.forEach(group => {
        if (group.options && group.options.length) {
          allOptions.push(...formatOptions(group.options));
        }
      });
    }
    
    return allOptions;
  }, [options, groups]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchValue.trim()) {
      return formattedOptions;
    }
    
    const lowerSearch = searchValue.toLowerCase();
    return formattedOptions.filter(
      option => option.label.toLowerCase().includes(lowerSearch)
    );
  }, [formattedOptions, searchValue]);

  // Get select styles based on current state
  const { containerStyle, triggerStyle, dropdownStyle: basedropdownStyle } = useMemo(() => 
    getSelectStyles(
      isFocused,
      !!error,
      disabled,
      size,
      theme
    ),
    [isFocused, error, disabled, size, theme]
  );

  // Combine styles
  const combinedContainerStyle = [
    containerStyle,
    isFullWidth && layout.fullWidth,
    style,
  ];

  const combinedDropdownStyle = [
    basedropdownStyle,
    dropdownStyle,
  ];

  // Update selectedValue when external value changes
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  // Open dropdown and focus search input if searchable
  const openDropdown = useCallback(() => {
    if (disabled) return;
    
    setIsOpen(true);
    setIsFocused(true);
    
    if (onFocus) {
      onFocus();
    }
    
    // Focus search input after modal is visible
    if (searchable) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  }, [disabled, searchable, onFocus]);

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setIsFocused(false);
    setSearchValue('');
    
    if (onBlur) {
      onBlur();
    }
  }, [onBlur]);

  // Handle option selection for single select
  const selectOption = useCallback((option: SelectOption) => {
    if (option.disabled) return;
    
    const newValue = option.value;
    
    // Update internal state
    setSelectedValue(newValue);
    
    // Notify parent component
    if (onChange) {
      onChange(newValue);
    }
    
    // Close dropdown for single select
    if (!multiple) {
      closeDropdown();
    }
  }, [multiple, onChange, closeDropdown]);

  // Handle option selection for multi select
  const toggleOption = useCallback((option: SelectOption) => {
    if (option.disabled) return;
    
    const currentValues = Array.isArray(selectedValue) ? selectedValue : [];
    let newValues: string[];
    
    if (currentValues.includes(option.value)) {
      // Remove the value if already selected
      newValues = currentValues.filter(v => v !== option.value);
    } else {
      // Add the value if not already selected
      newValues = [...currentValues, option.value];
    }
    
    // Update internal state
    setSelectedValue(newValues);
    
    // Notify parent component
    if (onChange) {
      onChange(newValues);
    }
  }, [selectedValue, onChange]);

  // Clear selection
  const clear = useCallback(() => {
    const newValue = multiple ? [] : '';
    
    // Update internal state
    setSelectedValue(newValue);
    
    // Notify parent component
    if (onChange) {
      onChange(newValue);
    }
  }, [multiple, onChange]);

  // Get display text for selected option(s)
  const getDisplayValue = useMemo(() => {
    if (multiple && Array.isArray(selectedValue)) {
      if (selectedValue.length === 0) {
        return placeholder;
      }
      
      const selectedLabels = selectedValue.map(val => {
        const option = formattedOptions.find(opt => opt.value === val);
        return option ? option.label : val;
      });
      
      return `${selectedLabels.length} selected`;
    } else {
      const option = formattedOptions.find(opt => opt.value === selectedValue);
      return option ? option.label : placeholder;
    }
  }, [formattedOptions, selectedValue, placeholder, multiple]);

  // Determine if we should show the clear button
  const shouldShowClear = clearable && (
    (multiple && Array.isArray(selectedValue) && selectedValue.length > 0) || 
    (!multiple && selectedValue !== '')
  );

  // Generate input size based on select size
  const inputSize = useMemo(() => {
    switch (size) {
      case SelectSize.SMALL:
        return InputSize.SMALL;
      case SelectSize.LARGE:
        return InputSize.LARGE;
      case SelectSize.MEDIUM:
      default:
        return InputSize.MEDIUM;
    }
  }, [size]);

  // Render an option
  const renderOption = useCallback((option: SelectOption) => {
    const isSelected = multiple && Array.isArray(selectedValue) 
      ? selectedValue.includes(option.value)
      : selectedValue === option.value;
      
    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.option,
          option.disabled && styles.disabledOption,
          isSelected && styles.selectedOption,
        ]}
        onPress={() => multiple ? toggleOption(option) : selectOption(option)}
        disabled={option.disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{
          disabled: option.disabled,
          selected: isSelected,
        }}
      >
        {multiple && (
          <View style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
            option.disabled && styles.disabledCheckbox,
          ]}>
            {isSelected && (
              <MaterialIcons
                name="check"
                size={moderateScale(14)}
                color={colors.white}
              />
            )}
          </View>
        )}
        <Text 
          style={[
            styles.optionText,
            isSelected && styles.selectedOptionText,
            option.disabled && styles.disabledOptionText,
          ]}
          numberOfLines={1}
        >
          {option.label}
        </Text>
        {!multiple && isSelected && (
          <MaterialIcons
            name="check"
            size={moderateScale(18)}
            color={colors.primary[600]}
          />
        )}
      </TouchableOpacity>
    );
  }, [selectedValue, multiple, selectOption, toggleOption]);

  // Render a group of options
  const renderGroup = useCallback((group: OptionGroup) => {
    const filteredGroupOptions = group.options.filter(option => {
      if (!searchValue.trim()) return true;
      const lowerSearch = searchValue.toLowerCase();
      return option.label.toLowerCase().includes(lowerSearch);
    });
    
    if (filteredGroupOptions.length === 0) return null;
    
    return (
      <View key={group.label} style={styles.group}>
        <Text style={styles.groupLabel}>{group.label}</Text>
        {filteredGroupOptions.map(option => renderOption(option))}
      </View>
    );
  }, [renderOption, searchValue]);

  // Render the dropdown content
  const renderDropdownContent = () => {
    return (
      <View style={styles.dropdownContent}>
        {/* Search input */}
        {searchable && (
          <View style={styles.searchContainer}>
            <Input
              ref={searchInputRef}
              value={searchValue}
              onChangeText={setSearchValue}
              placeholder="Search options..."
              size={inputSize}
              leftIcon={
                <MaterialIcons
                  name="search"
                  size={moderateScale(18)}
                  color={colors.text.tertiary}
                />
              }
              rightIcon={
                searchValue ? (
                  <TouchableOpacity onPress={() => setSearchValue('')}>
                    <MaterialIcons
                      name="clear"
                      size={moderateScale(18)}
                      color={colors.text.tertiary}
                    />
                  </TouchableOpacity>
                ) : undefined
              }
            />
          </View>
        )}
        
        {/* Option groups */}
        {groups.length > 0 ? (
          <ScrollView style={styles.optionsContainer}>
            {groups.map(group => renderGroup(group))}
            
            {/* Show empty state if no results */}
            {filteredOptions.length === 0 && (
              <Text style={styles.emptyText}>No options found</Text>
            )}
          </ScrollView>
        ) : (
          /* Flat options list */
          <ScrollView style={styles.optionsContainer}>
            {filteredOptions.map(option => renderOption(option))}
            
            {/* Show empty state if no results */}
            {filteredOptions.length === 0 && (
              <Text style={styles.emptyText}>No options found</Text>
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  return (
    <View ref={ref} style={styles.container}>
      {/* Label */}
      {label && (
        <Text 
          style={[styles.label, labelStyle]}
          accessible={true}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}
      
      {/* Select container */}
      <View 
        ref={containerRef}
        style={combinedContainerStyle}
      >
        {/* Select trigger */}
        <Pressable
          style={triggerStyle}
          onPress={openDropdown}
          disabled={disabled}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityState={{
            disabled,
            expanded: isOpen,
          }}
          accessibilityHint="Opens a dropdown of options to select"
        >
          <Text 
            style={[
              styles.displayText,
              (multiple && Array.isArray(selectedValue) && selectedValue.length === 0) ||
              (!multiple && selectedValue === '') 
                ? styles.placeholderText 
                : null
            ]}
            numberOfLines={1}
          >
            {getDisplayValue}
          </Text>
          
          <View style={styles.iconContainer}>
            {shouldShowClear && (
              <TouchableOpacity 
                onPress={clear}
                style={styles.clearButton}
                accessibilityRole="button"
                accessibilityLabel="Clear selection"
              >
                <MaterialIcons
                  name="clear"
                  size={moderateScale(18)}
                  color={colors.text.tertiary}
                />
              </TouchableOpacity>
            )}
            
            <MaterialIcons
              name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={moderateScale(24)}
              color={disabled ? colors.text.disabled : colors.text.secondary}
            />
          </View>
        </Pressable>
      </View>
      
      {/* Error message */}
      {error && (
        <Text 
          style={[styles.errorText, errorStyle]}
          accessible={true}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
      
      {/* Dropdown modal */}
      <Modal
        visible={isOpen}
        onClose={closeDropdown}
        position={ModalPosition.BOTTOM}
        size={ModalSize.MEDIUM}
        contentStyle={combinedDropdownStyle}
      >
        {renderDropdownContent()}
      </Modal>
    </View>
  );
});

/**
 * Component styles
 */
const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  label: {
    ...textVariants.label,
    marginBottom: spacing.xxs,
    color: colors.text.secondary,
  },
  displayText: {
    ...textVariants.input,
    flex: 1,
    marginRight: spacing.s,
  },
  placeholderText: {
    color: colors.text.tertiary,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    marginRight: spacing.xs,
  },
  dropdownContent: {
    padding: spacing.xs,
  },
  searchContainer: {
    marginBottom: spacing.xs,
  },
  optionsContainer: {
    maxHeight: moderateScale(220),
  },
  group: {
    marginBottom: spacing.s,
  },
  groupLabel: {
    ...textVariants.label,
    fontWeight: '600',
    marginBottom: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.s,
    borderRadius: 4,
  },
  selectedOption: {
    backgroundColor: colors.primary[50],
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionText: {
    ...textVariants.input,
    flex: 1,
  },
  selectedOptionText: {
    color: colors.primary[600],
    fontWeight: '500',
  },
  disabledOptionText: {
    color: colors.text.disabled,
  },
  checkbox: {
    width: moderateScale(18),
    height: moderateScale(18),
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginRight: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
  },
  checkboxSelected: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  disabledCheckbox: {
    borderColor: colors.border.default,
    backgroundColor: colors.background.disabled,
  },
  emptyText: {
    ...textVariants.caption,
    textAlign: 'center',
    padding: spacing.m,
    color: colors.text.tertiary,
  },
  errorText: {
    ...textVariants.caption,
    color: colors.error[500],
    marginTop: spacing.xxs,
  },
});

export default Select;