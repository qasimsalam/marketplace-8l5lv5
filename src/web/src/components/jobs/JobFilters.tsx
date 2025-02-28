import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce'; // ^4.0.8
import { FiSearch, FiFilter, FiX } from 'react-icons/fi'; // ^4.10.1

import Select, { SelectOption, SelectSize } from '../common/Select';
import Input, { InputType, InputSize } from '../common/Input';
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import Badge, { BadgeVariant } from '../common/Badge';
import { JobType, JobStatus, JobDifficulty, JobSearchParams } from '../../types/job';

/**
 * Default filter values used when resetting filters
 */
export const DEFAULT_FILTERS: Partial<JobSearchParams> = {
  query: '',
  page: 1,
  limit: 10
};

/**
 * Interface defining props for the JobFilters component
 */
export interface JobFiltersProps {
  /** Initial filter values */
  initialFilters?: Partial<JobSearchParams>;
  /** Callback for when filters change */
  onChange: (filters: Partial<JobSearchParams>) => void;
  /** Whether to automatically apply filters as they change (defaults to false) */
  autoApply?: boolean;
  /** Whether to display in compact mode (defaults to false) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show reset button (defaults to true) */
  showResetButton?: boolean;
  /** Whether to show skills filter (defaults to true) */
  showSkillsFilter?: boolean;
  /** Whether to show type filter (defaults to true) */
  showTypeFilter?: boolean;
  /** Whether to show budget filter (defaults to true) */
  showBudgetFilter?: boolean;
  /** Whether to show difficulty filter (defaults to true) */
  showDifficultyFilter?: boolean;
  /** Whether to show location filter (defaults to true) */
  showLocationFilter?: boolean;
  /** Available skills for the skills filter */
  availableSkills?: SelectOption[];
}

/**
 * Component that provides a UI for filtering job listings based on various criteria
 */
const JobFilters: React.FC<JobFiltersProps> = ({
  initialFilters = {},
  onChange,
  autoApply = false,
  compact = false,
  className = '',
  showResetButton = true,
  showSkillsFilter = true,
  showTypeFilter = true,
  showBudgetFilter = true,
  showDifficultyFilter = true,
  showLocationFilter = true,
  availableSkills = []
}) => {
  // State for filter values
  const [filters, setFilters] = useState<Partial<JobSearchParams>>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });

  // Debounced search function to reduce API calls
  const debouncedSearchChange = useCallback(
    debounce((query: string) => {
      setFilters((prev) => ({ ...prev, query, page: 1 }));
      if (autoApply) {
        onChange({ ...filters, query, page: 1 });
      }
    }, 300),
    [onChange, autoApply, filters]
  );

  // Handle general filter changes
  const handleFilterChange = (key: keyof JobSearchParams, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
    
    if (autoApply) {
      onChange({ ...filters, [key]: value, page: 1 });
    }
  };

  // Handle text search with debouncing
  const handleTextSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearchChange(e.target.value);
  };

  // Handle skills multi-select
  const handleSkillsChange = (selectedSkills: string | string[]) => {
    const skills = Array.isArray(selectedSkills) ? selectedSkills : [selectedSkills];
    handleFilterChange('skills', skills);
  };

  // Handle budget range inputs
  const handleRangeChange = (key: 'minBudget' | 'maxBudget', value: string) => {
    const numValue = value ? parseInt(value, 10) : undefined;
    handleFilterChange(key, numValue);
  };

  // Reset all filters to defaults
  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    onChange(DEFAULT_FILTERS);
  };

  // Apply current filters
  const handleApplyFilters = () => {
    onChange(filters);
  };

  // Automatically apply filters when autoApply is true
  useEffect(() => {
    if (autoApply) {
      onChange(filters);
    }
  }, [filters, autoApply, onChange]);

  // Count active filters for badge display
  const activeFilterCount = getActiveFilterCount(filters, DEFAULT_FILTERS);

  // Job type options
  const jobTypeOptions = [
    { value: JobType.FIXED_PRICE, label: 'Fixed Price' },
    { value: JobType.HOURLY, label: 'Hourly Rate' },
    { value: JobType.MILESTONE_BASED, label: 'Milestone Based' }
  ];

  // Job difficulty options
  const difficultyOptions = [
    { value: JobDifficulty.BEGINNER, label: 'Beginner' },
    { value: JobDifficulty.INTERMEDIATE, label: 'Intermediate' },
    { value: JobDifficulty.ADVANCED, label: 'Advanced' },
    { value: JobDifficulty.EXPERT, label: 'Expert' }
  ];

  // Container class based on compact mode
  const containerClass = `job-filters ${compact ? 'job-filters--compact' : ''} ${className}`;

  return (
    <div className={containerClass} data-testid="job-filters">
      <div className="job-filters__row">
        {/* Search input */}
        <div className="job-filters__search">
          <Input
            type={InputType.SEARCH}
            placeholder="Search jobs..."
            defaultValue={initialFilters.query || ''}
            prefix={<FiSearch />}
            onChange={handleTextSearch}
            size={compact ? InputSize.SMALL : InputSize.MEDIUM}
            isFullWidth
            aria-label="Search jobs"
          />
        </div>

        {/* Filter badge (only shown when filters are applied) */}
        {activeFilterCount > 0 && (
          <div className="job-filters__badge">
            <Badge variant={BadgeVariant.PRIMARY} size={compact ? BadgeSize.SMALL : BadgeSize.MEDIUM}>
              {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
            </Badge>
          </div>
        )}
      </div>

      <div className="job-filters__row job-filters__advanced">
        {/* Job Type filter */}
        {showTypeFilter && (
          <div className="job-filters__field">
            <Select
              label="Job Type"
              placeholder="Any Type"
              options={jobTypeOptions}
              value={filters.type}
              onChange={(value) => handleFilterChange('type', value)}
              size={compact ? SelectSize.SMALL : SelectSize.MEDIUM}
              isFullWidth
              clearable
            />
          </div>
        )}

        {/* Skills filter */}
        {showSkillsFilter && (
          <div className="job-filters__field">
            <Select
              label="Required Skills"
              placeholder="Select Skills"
              options={availableSkills}
              value={filters.skills || []}
              onChange={handleSkillsChange}
              multiple
              searchable
              size={compact ? SelectSize.SMALL : SelectSize.MEDIUM}
              isFullWidth
              clearable
            />
          </div>
        )}

        {/* Budget filter */}
        {showBudgetFilter && (
          <div className="job-filters__field job-filters__budget">
            <div className="job-filters__budget-label">Budget Range</div>
            <div className="job-filters__budget-inputs">
              <Input
                type={InputType.NUMBER}
                placeholder="Min"
                value={filters.minBudget?.toString() || ''}
                onChange={(e) => handleRangeChange('minBudget', e.target.value)}
                size={compact ? InputSize.SMALL : InputSize.MEDIUM}
                min={0}
                aria-label="Minimum budget"
              />
              <span className="job-filters__budget-separator">—</span>
              <Input
                type={InputType.NUMBER}
                placeholder="Max"
                value={filters.maxBudget?.toString() || ''}
                onChange={(e) => handleRangeChange('maxBudget', e.target.value)}
                size={compact ? InputSize.SMALL : InputSize.MEDIUM}
                min={0}
                aria-label="Maximum budget"
              />
            </div>
          </div>
        )}

        {/* Difficulty filter */}
        {showDifficultyFilter && (
          <div className="job-filters__field">
            <Select
              label="Difficulty Level"
              placeholder="Any Difficulty"
              options={difficultyOptions}
              value={filters.difficulty}
              onChange={(value) => handleFilterChange('difficulty', value)}
              size={compact ? SelectSize.SMALL : SelectSize.MEDIUM}
              isFullWidth
              clearable
            />
          </div>
        )}

        {/* Location filter */}
        {showLocationFilter && (
          <div className="job-filters__field job-filters__location">
            <div className="job-filters__remote-toggle">
              <label className="job-filters__checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.isRemote}
                  onChange={(e) => handleFilterChange('isRemote', e.target.checked)}
                  aria-label="Remote only"
                />
                <span>Remote Only</span>
              </label>
            </div>
            <Input
              type={InputType.TEXT}
              placeholder="Location"
              value={filters.location || ''}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              size={compact ? InputSize.SMALL : InputSize.MEDIUM}
              disabled={filters.isRemote}
              aria-label="Job location"
            />
          </div>
        )}
      </div>

      {/* Action buttons (only shown when autoApply is false) */}
      {!autoApply && (
        <div className="job-filters__actions">
          {showResetButton && (
            <Button
              variant={ButtonVariant.OUTLINE}
              size={compact ? ButtonSize.SMALL : ButtonSize.MEDIUM}
              onClick={handleReset}
              disabled={activeFilterCount === 0}
              aria-label="Reset filters"
            >
              <FiX /> Reset
            </Button>
          )}
          <Button
            variant={ButtonVariant.PRIMARY}
            size={compact ? ButtonSize.SMALL : ButtonSize.MEDIUM}
            onClick={handleApplyFilters}
            aria-label="Apply filters"
          >
            <FiFilter /> Apply Filters
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Helper function that counts the number of active filters applied
 * @param filters Current filter values
 * @param defaultFilters Default filter values for comparison
 * @returns Count of active non-default filters
 */
export const getActiveFilterCount = (
  filters: Partial<JobSearchParams>,
  defaultFilters: Partial<JobSearchParams>
): number => {
  let count = 0;

  // Check text search query
  if (filters.query && filters.query !== defaultFilters.query) {
    count += 1;
  }

  // Check job type
  if (filters.type && filters.type !== defaultFilters.type) {
    count += 1;
  }

  // Check job status
  if (filters.status && filters.status !== defaultFilters.status) {
    count += 1;
  }

  // Check budget range
  if (filters.minBudget && filters.minBudget !== defaultFilters.minBudget) {
    count += 1;
  }
  if (filters.maxBudget && filters.maxBudget !== defaultFilters.maxBudget) {
    count += 1;
  }

  // Check skills
  if (filters.skills && filters.skills.length > 0) {
    count += 1;
  }

  // Check difficulty
  if (filters.difficulty && filters.difficulty !== defaultFilters.difficulty) {
    count += 1;
  }

  // Check remote flag
  if (filters.isRemote !== undefined && filters.isRemote !== defaultFilters.isRemote) {
    count += 1;
  }

  // Check location
  if (filters.location && filters.location !== defaultFilters.location) {
    count += 1;
  }

  return count;
};

export default JobFilters;