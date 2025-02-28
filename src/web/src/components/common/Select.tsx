import React, { useState, useRef, useEffect } from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^1.2.1
import { useFormContext } from 'react-hook-form'; // ^7.46.1
import { FiChevronDown, FiX, FiCheck, FiSearch } from 'react-icons/fi'; // ^4.10.1
import { isRequired } from '../../utils/validation';

/**
 * Available sizes for the Select component
 */
export enum SelectSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

/**
 * Interface for select option structure
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Interface for grouped options
 */
export interface OptionGroup {
  label: string;
  options: SelectOption[];
}

/**
 * Props for the Select component
 */
export interface SelectProps {
  /** Array of options for the select component */
  options?: SelectOption[] | string[] | number[];
  
  /** Option groups for grouped display */
  groups?: OptionGroup[];
  
  /** Current selected value(s) */
  value?: string | string[];
  
  /** Callback for value change */
  onChange?: (value: string | string[]) => void;
  
  /** Field name for form integration */
  name?: string;
  
  /** Label for the select field */
  label?: string;
  
  /** Placeholder text when no option is selected */
  placeholder?: string;
  
  /** Error message to display */
  error?: string;
  
  /** Size of the select component */
  size?: SelectSize;
  
  /** Whether the select is disabled */
  disabled?: boolean;
  
  /** Whether the select is read-only */
  readOnly?: boolean;
  
  /** Whether the select is required */
  required?: boolean;
  
  /** Whether multiple selection is allowed */
  multiple?: boolean;
  
  /** Whether search functionality is enabled */
  searchable?: boolean;
  
  /** Whether the selection can be cleared */
  clearable?: boolean;
  
  /** Whether the select should take full width */
  isFullWidth?: boolean;
  
  /** Maximum number of items to show when multiple */
  maxItems?: number;
  
  /** Class name for the select container */
  className?: string;
  
  /** Class name for the dropdown menu */
  dropdownClassName?: string;
  
  /** Class name for individual options */
  optionClassName?: string;
  
  /** Class name for the label */
  labelClassName?: string;
  
  /** Class name for the error message */
  errorClassName?: string;
  
  /** ARIA label for accessibility */
  ariaLabel?: string;
  
  /** Test ID for testing */
  testId?: string;
}

/**
 * Helper function to convert array items to SelectOption format
 * @param array - Array of options
 * @returns Formatted array of SelectOption objects
 */
export const formatSelectOptions = (
  array: SelectOption[] | string[] | number[] | undefined
): SelectOption[] => {
  if (!Array.isArray(array)) {
    return [];
  }

  return array.map(item => {
    if (typeof item === 'string' || typeof item === 'number') {
      return {
        value: String(item),
        label: String(item),
      };
    }
    return item as SelectOption;
  });
};

/**
 * A versatile select/dropdown component that supports single and multi-select
 * functionality with form integration, searching, and grouping.
 */
const Select: React.FC<SelectProps> = (props) => {
  const {
    options = [],
    groups = [],
    value,
    onChange,
    name,
    label,
    placeholder = 'Select an option',
    error,
    size = SelectSize.MEDIUM,
    disabled = false,
    readOnly = false,
    required = false,
    multiple = false,
    searchable = false,
    clearable = false,
    isFullWidth = false,
    maxItems,
    className = '',
    dropdownClassName = '',
    optionClassName = '',
    labelClassName = '',
    errorClassName = '',
    ariaLabel,
    testId,
  } = props;

  // State for dropdown open/close
  const [isOpen, setIsOpen] = useState<boolean>(false);
  // State for selected values
  const [selectedValue, setSelectedValue] = useState<string | string[]>(value || (multiple ? [] : ''));
  // State for search input
  const [searchQuery, setSearchQuery] = useState<string>('');
  // State for focus tracking
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // References for DOM elements
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Access form context if available and name is provided
  const formContext = name ? useFormContext() : null;
  const { register, setValue: setFormValue, watch } = formContext || {};
  
  // Format options to SelectOption type
  const formattedOptions = formatSelectOptions(options);

  // Update internal value when external value changes
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  // Update form value when selected value changes
  useEffect(() => {
    if (formContext && name) {
      setFormValue(name, selectedValue, { shouldValidate: true });
    }
  }, [selectedValue, name, setFormValue, formContext]);

  // Update internal state when form value changes (for controlled components in forms)
  useEffect(() => {
    if (formContext && name) {
      const formValue = watch?.(name);
      if (formValue !== undefined && formValue !== selectedValue) {
        setSelectedValue(formValue);
      }
    }
  }, [formContext, name, watch, selectedValue]);

  // Focus on search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      // Wait for the dropdown to render before focusing
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, searchable]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
        setIsFocused(false);
      }
    };

    // Add event listener when dropdown is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          setSearchQuery('');
          break;
        case 'ArrowDown':
          event.preventDefault();
          // Focus on first option or next option
          // Implementation would require refs to all options
          break;
        case 'ArrowUp':
          event.preventDefault();
          // Focus on last option or previous option
          // Implementation would require refs to all options
          break;
        case 'Enter':
          // Select the focused option
          // Implementation would require tracking the focused option
          break;
        default:
          break;
      }
    };

    // Add keyboard event listener when dropdown is open
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Register field if in a form
  useEffect(() => {
    if (formContext && name) {
      const registerOptions = {
        required: required ? 'This field is required' : false,
        validate: {
          required: (value: any) => 
            !required || isRequired(value) || 'This field is required',
        }
      };
      register(name, registerOptions);
    }
  }, [formContext, name, register, required]);

  // Handle toggle dropdown
  const handleToggle = () => {
    if (disabled || readOnly) return;
    
    setIsOpen(!isOpen);
    setIsFocused(!isOpen);
    
    if (isOpen) {
      setSearchQuery('');
    }
  };

  // Handle option selection
  const handleOptionSelect = (optionValue: string) => {
    let newValue: string | string[];
    
    if (multiple) {
      // If multiple selection is allowed
      const currentValues = Array.isArray(selectedValue) ? selectedValue : [];
      const valueExists = currentValues.includes(optionValue);
      
      if (valueExists) {
        // Remove the value if it already exists
        newValue = currentValues.filter(val => val !== optionValue);
      } else {
        // Add the value if it doesn't exist
        newValue = [...currentValues, optionValue];
      }
    } else {
      // For single selection
      newValue = optionValue;
      // Close dropdown for single selection
      setIsOpen(false);
    }
    
    // Update the internal state
    setSelectedValue(newValue);
    
    // Call the onChange callback
    if (onChange) {
      onChange(newValue);
    }
    
    // Clear search query
    setSearchQuery('');
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle clearing the selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (disabled || readOnly) return;
    
    const newValue = multiple ? [] : '';
    setSelectedValue(newValue);
    
    if (onChange) {
      onChange(newValue);
    }
  };

  // Handle removing a selected item in multi-select
  const handleRemoveItem = (optionValue: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (disabled || readOnly || !multiple) return;
    
    const currentValues = selectedValue as string[];
    const newValue = currentValues.filter(val => val !== optionValue);
    
    setSelectedValue(newValue);
    
    if (onChange) {
      onChange(newValue);
    }
  };

  // Filter options based on search query
  const filteredOptions = searchable && searchQuery
    ? formattedOptions.filter(option => 
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : formattedOptions;

  // Helper to get display value for selected options
  const getDisplayValue = (): string => {
    if (multiple) {
      const selectedValues = Array.isArray(selectedValue) ? selectedValue : [];
      if (!selectedValues || selectedValues.length === 0) {
        return placeholder;
      }
      
      // If maxItems is specified and the selected items exceed maxItems
      if (maxItems && selectedValues.length > maxItems) {
        return `${selectedValues.length} items selected`;
      }
      
      // Don't show labels here for multiple selection, the pills will be shown separately
      return '';
    } else {
      const selectedVal = selectedValue as string;
      if (!selectedVal) {
        return placeholder;
      }
      
      // Find the selected option to display its label
      const option = formattedOptions.find(opt => opt.value === selectedVal);
      return option ? option.label : selectedVal;
    }
  };

  // Determine if there are selected values
  const hasValue = multiple 
    ? Array.isArray(selectedValue) && selectedValue.length > 0
    : selectedValue !== '';

  // Construct class names
  const selectClasses = clsx(
    'select',
    `select--${size}`,
    {
      'select--open': isOpen,
      'select--focused': isFocused,
      'select--disabled': disabled,
      'select--readonly': readOnly,
      'select--error': !!error,
      'select--fullwidth': isFullWidth,
      'select--has-value': hasValue,
      'select--multiple': multiple,
    },
    className
  );

  const dropdownClasses = clsx(
    'select__dropdown',
    {
      'select__dropdown--visible': isOpen,
    },
    dropdownClassName
  );

  const triggerClasses = clsx(
    'select__trigger',
    {
      'select__trigger--open': isOpen,
      'select__trigger--error': !!error,
      'select__trigger--multiple': multiple && hasValue,
    }
  );

  const labelClasses = clsx(
    'select__label',
    {
      'select__label--required': required,
    },
    labelClassName
  );

  const errorClasses = clsx(
    'select__error',
    errorClassName
  );

  // Find all selected options for multiple select
  const selectedOptions = multiple && Array.isArray(selectedValue) 
    ? selectedValue.map(val => formattedOptions.find(opt => opt.value === val))
    : [];

  return (
    <div 
      className={selectClasses} 
      ref={containerRef}
      data-testid={testId}
    >
      {label && (
        <label className={labelClasses}>
          {label}
          {required && <span className="select__required-indicator">*</span>}
        </label>
      )}
      
      <div 
        className={triggerClasses}
        onClick={handleToggle}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        role="combobox"
        aria-controls="select-dropdown"
        aria-expanded={isOpen}
        aria-required={required}
        aria-disabled={disabled}
        aria-readonly={readOnly}
        aria-label={ariaLabel || label}
        aria-invalid={!!error}
      >
        {/* Display pills for multiple selection */}
        {multiple && hasValue && (
          <div className="select__pills">
            {selectedOptions.map(option => option && (
              <span key={option.value} className="select__pill">
                {option.label}
                <button 
                  type="button"
                  className="select__pill-remove"
                  onClick={(e) => handleRemoveItem(option.value, e)}
                  aria-label={`Remove ${option.label}`}
                >
                  <FiX size={16} />
                </button>
              </span>
            ))}
          </div>
        )}
        
        {/* Display value text */}
        <div className="select__value">
          {multiple && hasValue 
            ? (maxItems && (selectedValue as string[]).length > maxItems
                ? `${(selectedValue as string[]).length} items selected`
                : '')
            : getDisplayValue()}
        </div>
        
        {/* Clear button */}
        {clearable && hasValue && !disabled && !readOnly && (
          <button
            type="button"
            className="select__clear-button"
            onClick={handleClear}
            aria-label="Clear selection"
          >
            <FiX size={18} />
          </button>
        )}
        
        {/* Dropdown indicator */}
        <div className="select__indicator">
          <FiChevronDown 
            size={20} 
            className={clsx({
              'select__chevron--open': isOpen
            })}
          />
        </div>
      </div>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={dropdownClasses}
          ref={dropdownRef}
          role="listbox"
          id="select-dropdown"
          aria-multiselectable={multiple}
        >
          {/* Search input */}
          {searchable && (
            <div className="select__search">
              <FiSearch size={16} className="select__search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search..."
                className="select__search-input"
                aria-label="Search options"
              />
            </div>
          )}
          
          {/* Options list */}
          <div className="select__options">
            {/* Regular options */}
            {filteredOptions.length > 0 && !groups.length && (
              filteredOptions.map(option => {
                const isSelected = multiple
                  ? Array.isArray(selectedValue) && selectedValue.includes(option.value)
                  : selectedValue === option.value;
                
                return (
                  <div
                    key={option.value}
                    className={clsx(
                      'select__option',
                      {
                        'select__option--selected': isSelected,
                        'select__option--disabled': option.disabled,
                      },
                      optionClassName
                    )}
                    onClick={() => {
                      if (!option.disabled) {
                        handleOptionSelect(option.value);
                      }
                    }}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                  >
                    <span className="select__option-label">{option.label}</span>
                    {isSelected && (
                      <span className="select__option-check">
                        <FiCheck size={16} />
                      </span>
                    )}
                  </div>
                );
              })
            )}

            {/* Grouped options */}
            {groups.length > 0 && (
              groups.map(group => (
                <div key={group.label} className="select__option-group">
                  <div className="select__group-label">{group.label}</div>
                  <div className="select__group-options">
                    {group.options
                      .filter(option => 
                        !searchQuery || 
                        option.label.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(option => {
                        const isSelected = multiple
                          ? Array.isArray(selectedValue) && selectedValue.includes(option.value)
                          : selectedValue === option.value;
                      
                        return (
                          <div
                            key={option.value}
                            className={clsx(
                              'select__option',
                              {
                                'select__option--selected': isSelected,
                                'select__option--disabled': option.disabled,
                              },
                              optionClassName
                            )}
                            onClick={() => {
                              if (!option.disabled) {
                                handleOptionSelect(option.value);
                              }
                            }}
                            role="option"
                            aria-selected={isSelected}
                            aria-disabled={option.disabled}
                          >
                            <span className="select__option-label">{option.label}</span>
                            {isSelected && (
                              <span className="select__option-check">
                                <FiCheck size={16} />
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))
            )}
            
            {/* No options message */}
            {filteredOptions.length === 0 && groups.length === 0 && (
              <div className="select__no-options">
                No options available
              </div>
            )}
            
            {/* No search results */}
            {searchQuery && filteredOptions.length === 0 && (
              <div className="select__no-results">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className={errorClasses} aria-live="polite">
          {error}
        </div>
      )}
    </div>
  );
};

export default Select;