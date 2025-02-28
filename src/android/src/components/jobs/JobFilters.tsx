import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'; // react v18.2.0
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Text,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native'; // react-native v0.72.x
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons v9.2.0
import Slider from '@react-native-community/slider'; // @react-native-community/slider v4.4.2

// Internal imports
import {
  JobType,
  JobStatus,
  JobDifficulty,
  JobFilterOptions,
  JobSearchParams,
} from '../../types/job.types';
import Card from '../common/Card';
import { Input, InputType, InputSize } from '../common/Input';
import { Select, SelectSize, SelectOption } from '../common/Select';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import { Badge, BadgeVariant, BadgeSize } from '../common/Badge';
import { colors } from '../../styles/colors';
import { spacing, layout } from '../../styles/layout';
import { useJobs } from '../../hooks/useJobs';

/**
 * Interface defining props for the JobFilters component
 */
export interface JobFiltersProps {
  initialFilters?: JobFilterOptions;
  options: { skills: string[]; categories: string[] };
  onFilterChange: (filters: JobFilterOptions) => void;
  containerStyle?: StyleProp<ViewStyle>;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

/**
 * Converts JobType enum values to select options format
 * @returns Array of job type options for Select component
 */
const getJobTypeOptions = (): SelectOption[] => {
  return Object.values(JobType).map((type) => ({
    value: type,
    label: type.replace(/_/g, ' '), // Replace underscores with spaces for display
  }));
};

/**
 * Converts JobDifficulty enum values to select options format
 * @returns Array of difficulty options for Select component
 */
const getDifficultyOptions = (): SelectOption[] => {
  return Object.values(JobDifficulty).map((difficulty) => ({
    value: difficulty,
    label: difficulty.charAt(0).toUpperCase() + difficulty.slice(1), // Capitalize first letter
  }));
};

/**
 * Formats a number as USD currency
 * @param value
 * @returns Formatted currency string
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

/**
 * Component that renders a mobile-optimized job filter interface
 * @param props
 * @returns Rendered job filters component
 */
export const JobFilters: React.FC<JobFiltersProps> = ({
  initialFilters,
  options,
  onFilterChange,
  containerStyle,
  expanded = false,
  onToggleExpand,
}) => {
  // Initialize filter state with default or provided values
  const [jobTypes, setJobTypes] = useState<JobType[]>(
    initialFilters?.jobTypes || []
  );
  const [difficultyLevels, setDifficultyLevels] = useState<JobDifficulty[]>(
    initialFilters?.difficultyLevels || []
  );
  const [minBudget, setMinBudget] = useState<number>(
    initialFilters?.minBudget || 0
  );
  const [maxBudget, setMaxBudget] = useState<number>(
    initialFilters?.maxBudget || 10000
  );
  const [isRemote, setIsRemote] = useState<boolean>(
    initialFilters?.isRemote || false
  );
  const [location, setLocation] = useState<string>(
    initialFilters?.location || ''
  );
  const [skills, setSkills] = useState<string[]>(initialFilters?.skills || []);

  // Use the useJobs hook to access job functionality and state
  const { applyFilters, jobsState } = useJobs();

  // Create memoized option lists for dropdowns using helper functions
  const jobTypeOptions = useMemo(() => getJobTypeOptions(), []);
  const difficultyOptions = useMemo(() => getDifficultyOptions(), []);

  // Implement handleFilterChange to update individual filter values
  const handleJobTypeChange = useCallback(
    (value: string | string[]) => {
      if (typeof value === 'string') {
        setJobTypes([value as JobType]);
      }
    },
    []
  );

  const handleDifficultyChange = useCallback(
    (value: string | string[]) => {
      if (typeof value === 'string') {
        setDifficultyLevels([value as JobDifficulty]);
      }
    },
    []
  );

  const handleMinBudgetChange = useCallback((value: number) => {
    setMinBudget(value);
  }, []);

  const handleMaxBudgetChange = useCallback((value: number) => {
    setMaxBudget(value);
  }, []);

  const handleIsRemoteChange = useCallback((value: boolean) => {
    setIsRemote(value);
  }, []);

  const handleLocationChange = useCallback((text: string) => {
    setLocation(text);
  }, []);

  const handleSkillsChange = useCallback((selectedSkills: string[]) => {
    setSkills(selectedSkills);
  }, []);

  // Implement handleResetFilters to clear all filter selections
  const handleResetFilters = useCallback(() => {
    setJobTypes([]);
    setDifficultyLevels([]);
    setMinBudget(0);
    setMaxBudget(10000);
    setIsRemote(false);
    setLocation('');
    setSkills([]);
  }, []);

  // Implement handleApplyFilters to execute filter search
  const handleApplyFilters = useCallback(() => {
    const filters: JobFilterOptions = {
      jobTypes,
      difficultyLevels,
      minBudget,
      maxBudget,
      isRemote,
      location,
      skills,
      categories: [], // Add categories if needed
    };
    applyFilters(filters);
    onFilterChange(filters);
  }, [
    jobTypes,
    difficultyLevels,
    minBudget,
    maxBudget,
    isRemote,
    location,
    skills,
    applyFilters,
    onFilterChange,
  ]);

  return (
    <Card style={containerStyle}>
      <ScrollView>
        <Select
          label="Job Type"
          options={jobTypeOptions}
          value={jobTypes[0] || ''}
          onChange={handleJobTypeChange}
          size={SelectSize.MEDIUM}
          placeholder="Any"
        />

        <Input
          label="Location"
          value={location}
          onChangeText={handleLocationChange}
          placeholder="Any"
          type={InputType.TEXT}
          size={InputSize.MEDIUM}
        />

        <Text>Budget Range</Text>
        <View style={styles.budgetRangeContainer}>
          <Text>{formatCurrency(minBudget)}</Text>
          <Text>{formatCurrency(maxBudget)}</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10000}
          step={100}
          value={[minBudget, maxBudget]}
          onValueChange={(values) => {
            handleMinBudgetChange(values[0]);
            handleMaxBudgetChange(values[1]);
          }}
          minimumTrackTintColor={colors.primary[500]}
          maximumTrackTintColor={colors.gray[300]}
          thumbTintColor={colors.primary[500]}
        />

        <Select
          label="Difficulty Level"
          options={difficultyOptions}
          value={difficultyLevels[0] || ''}
          onChange={handleDifficultyChange}
          size={SelectSize.MEDIUM}
          placeholder="Any"
        />

        <View style={styles.remoteWorkContainer}>
          <Text>Remote Work</Text>
          <Switch
            value={isRemote}
            onValueChange={handleIsRemoteChange}
            trackColor={{ false: colors.gray[300], true: colors.primary[300] }}
            thumbColor={isRemote ? colors.primary[500] : colors.gray[500]}
          />
        </View>

        <View style={layout.rowBetween}>
          <Button
            title="Reset"
            variant={ButtonVariant.OUTLINE}
            size={ButtonSize.MEDIUM}
            onPress={handleResetFilters}
          />
          <Button
            title="Apply"
            variant={ButtonVariant.PRIMARY}
            size={ButtonSize.MEDIUM}
            onPress={handleApplyFilters}
            isDisabled={jobsState.loading}
          />
        </View>
      </ScrollView>
    </Card>
  );
};

const styles = StyleSheet.create({
  budgetRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  remoteWorkContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    marginVertical: spacing.s,
  },
});