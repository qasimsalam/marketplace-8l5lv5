import React, { useState, useEffect, useCallback, useMemo } from 'react'; // v18.2.0
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Platform,
} from 'react-native'; // v0.72.x
import { Ionicons } from '@expo/vector-icons'; // ^13.0.0

import { JobType, JobDifficulty, JobSearchParams } from '../../types/job.types';
import { InputType, Input } from '../common/Input';
import { Select, SelectOption } from '../common/Select';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import useJobs from '../../hooks/useJobs';
import { colors } from '../../styles/colors';

/**
 * Interface defining props for the JobFilters component
 */
export interface JobFiltersProps {
  /**
   * Callback for when filters are applied
   */
  onApplyFilters: (filters: JobSearchParams) => void;

  /**
   * Callback for when filters are reset
   */
  onResetFilters: () => void;

  /**
   * Optional initial filter values
   */
  initialFilters?: Partial<JobSearchParams>;

  /**
   * Whether the filters are visible (for mobile responsive design)
   */
  isVisible: boolean;

  /**
   * Function to toggle filter visibility
   */
  onToggleVisibility: () => void;
}

/**
 * Helper function to convert skill IDs to readable labels
 * 
 * @param selectedSkillIds - Array of selected skill IDs
 * @param skillOptions - Array of available skill options
 * @returns Array of skill labels
 */
const getSelectedSkillLabels = (selectedSkillIds: string[], skillOptions: SelectOption[]): string[] => {
  return selectedSkillIds
    .map(id => {
      const option = skillOptions.find(opt => opt.value === id);
      return option ? option.label : undefined;
    })
    .filter(label => label !== undefined) as string[];
};

/**
 * A responsive filter component for job listings that allows users to refine search results
 * based on job type, skills, budget range, difficulty level, and remote status.
 */
const JobFilters: React.FC<JobFiltersProps> = ({
  onApplyFilters,
  onResetFilters,
  initialFilters,
  isVisible,
  onToggleVisibility
}) => {
  // Set up filter state
  const [query, setQuery] = useState<string>(initialFilters?.query || '');
  const [jobType, setJobType] = useState<JobType | ''>((initialFilters?.type as JobType) || '');
  const [skills, setSkills] = useState<string[]>(initialFilters?.skills || []);
  const [minBudget, setMinBudget] = useState<number>(initialFilters?.minBudget || 0);
  const [maxBudget, setMaxBudget] = useState<number>(initialFilters?.maxBudget || 0);
  const [difficulty, setDifficulty] = useState<JobDifficulty | ''>((initialFilters?.difficulty as JobDifficulty) || '');
  const [isRemote, setIsRemote] = useState<boolean>(initialFilters?.isRemote || false);
  
  // Create job type options
  const jobTypeOptions = useMemo<SelectOption[]>(() => [
    { label: 'Any Type', value: '' },
    { label: 'Fixed Price', value: JobType.FIXED_PRICE },
    { label: 'Hourly', value: JobType.HOURLY },
    { label: 'Milestone Based', value: JobType.MILESTONE_BASED }
  ], []);
  
  // Create difficulty options
  const difficultyOptions = useMemo<SelectOption[]>(() => [
    { label: 'Any Difficulty', value: '' },
    { label: 'Beginner', value: JobDifficulty.BEGINNER },
    { label: 'Intermediate', value: JobDifficulty.INTERMEDIATE },
    { label: 'Advanced', value: JobDifficulty.ADVANCED },
    { label: 'Expert', value: JobDifficulty.EXPERT }
  ], []);
  
  // Create skill options (in a real app, these would be fetched from an API)
  const skillOptions = useMemo<SelectOption[]>(() => [
    { label: 'Machine Learning', value: 'machine_learning' },
    { label: 'Deep Learning', value: 'deep_learning' },
    { label: 'Natural Language Processing', value: 'nlp' },
    { label: 'Computer Vision', value: 'computer_vision' },
    { label: 'Reinforcement Learning', value: 'reinforcement_learning' },
    { label: 'Data Science', value: 'data_science' },
    { label: 'Neural Networks', value: 'neural_networks' },
    { label: 'AI Ethics', value: 'ai_ethics' },
    { label: 'Robotics', value: 'robotics' },
    { label: 'TensorFlow', value: 'tensorflow' },
    { label: 'PyTorch', value: 'pytorch' },
    { label: 'Keras', value: 'keras' },
    { label: 'Scikit-learn', value: 'scikit_learn' }
  ], []);
  
  // Set up handlers for filter changes
  const handleQueryChange = (text: string) => setQuery(text);
  const handleJobTypeChange = (value: string) => setJobType(value as JobType);
  const handleMinBudgetChange = (text: string) => setMinBudget(Number(text) || 0);
  const handleMaxBudgetChange = (text: string) => setMaxBudget(Number(text) || 0);
  const handleDifficultyChange = (value: string) => setDifficulty(value as JobDifficulty);
  const handleRemoteChange = (value: boolean) => setIsRemote(value);
  
  // Handle apply filters
  const handleApplyFilters = () => {
    const filters: JobSearchParams = {
      query,
      type: jobType as JobType,
      skills,
      minBudget,
      maxBudget,
      difficulty: difficulty as JobDifficulty,
      isRemote,
      // Include default values for other JobSearchParams fields
      status: 'open' as any, // This should be properly typed in a real implementation
      location: '',
      posterId: '',
      category: '',
      subcategory: '',
      createdAfter: new Date(0),
      createdBefore: new Date(),
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    onApplyFilters(filters);
  };
  
  // Handle reset filters
  const handleResetFilters = () => {
    setQuery('');
    setJobType('');
    setSkills([]);
    setMinBudget(0);
    setMaxBudget(0);
    setDifficulty('');
    setIsRemote(false);
    onResetFilters();
  };
  
  // Initialize filters when initialFilters changes
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.query !== undefined) setQuery(initialFilters.query);
      if (initialFilters.type !== undefined) setJobType(initialFilters.type as JobType);
      if (initialFilters.skills !== undefined) setSkills(initialFilters.skills);
      if (initialFilters.minBudget !== undefined) setMinBudget(initialFilters.minBudget);
      if (initialFilters.maxBudget !== undefined) setMaxBudget(initialFilters.maxBudget);
      if (initialFilters.difficulty !== undefined) setDifficulty(initialFilters.difficulty as JobDifficulty);
      if (initialFilters.isRemote !== undefined) setIsRemote(initialFilters.isRemote);
    }
  }, [initialFilters]);
  
  return (
    <View style={styles.container}>
      {/* Filter header with toggle on mobile */}
      <View style={[
        styles.header,
        isVisible ? { borderBottomWidth: 1, borderBottomColor: colors.border.default } : null
      ]}>
        <Text style={styles.title}>Filter Jobs</Text>
        <TouchableOpacity onPress={onToggleVisibility} style={styles.toggleButton} accessible={true} accessibilityLabel="Toggle filter visibility">
          <Ionicons 
            name={isVisible ? "chevron-up" : "chevron-down"} 
            size={24} 
            color={colors.text.primary} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Filter content (collapsible on mobile) */}
      {isVisible && (
        <ScrollView style={styles.filtersContent}>
          {/* Search query */}
          <Input
            label="Search"
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Keywords, job title, skills..."
            type={InputType.TEXT}
            testID="job-filter-search"
          />
          
          {/* Job type dropdown */}
          <Select
            label="Job Type"
            options={jobTypeOptions}
            value={jobType}
            onValueChange={handleJobTypeChange}
            placeholder="Select job type"
            testID="job-filter-type"
          />
          
          {/* Budget range */}
          <View style={styles.budgetContainer}>
            <Text style={styles.label}>Budget Range</Text>
            <View style={styles.budgetInputs}>
              <Input
                label="Min"
                value={minBudget === 0 ? '' : minBudget.toString()}
                onChangeText={handleMinBudgetChange}
                placeholder="0"
                type={InputType.NUMBER}
                style={styles.budgetInput}
                testID="job-filter-min-budget"
              />
              <Text style={styles.budgetSeparator}>to</Text>
              <Input
                label="Max"
                value={maxBudget === 0 ? '' : maxBudget.toString()}
                onChangeText={handleMaxBudgetChange}
                placeholder="Any"
                type={InputType.NUMBER}
                style={styles.budgetInput}
                testID="job-filter-max-budget"
              />
            </View>
          </View>
          
          {/* Difficulty level dropdown */}
          <Select
            label="Difficulty Level"
            options={difficultyOptions}
            value={difficulty}
            onValueChange={handleDifficultyChange}
            placeholder="Select difficulty"
            testID="job-filter-difficulty"
          />
          
          {/* Skills multi-select */}
          <Text style={styles.label}>Skills</Text>
          <View style={styles.skillsContainer}>
            {skills.length > 0 ? (
              <View style={styles.selectedSkills}>
                {getSelectedSkillLabels(skills, skillOptions).map((skill, index) => (
                  <View key={index} style={styles.skillBadge}>
                    <Text style={styles.skillBadgeText}>{skill}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const skillToRemove = skillOptions.find(opt => opt.label === skill);
                        if (skillToRemove) {
                          setSkills(skills.filter(id => id !== skillToRemove.value));
                        }
                      }}
                      style={styles.skillBadgeRemove}
                      accessible={true}
                      accessibilityLabel={`Remove ${skill} skill`}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noSkillsText}>No skills selected</Text>
            )}
            
            <Select
              options={skillOptions.filter(opt => !skills.includes(opt.value))}
              value=""
              onValueChange={(value) => {
                if (value && !skills.includes(value)) {
                  setSkills([...skills, value]);
                }
              }}
              placeholder="Add a skill"
              testID="job-filter-skills"
            />
          </View>
          
          {/* Remote work toggle */}
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Remote Only</Text>
            <Switch
              value={isRemote}
              onValueChange={handleRemoteChange}
              trackColor={{ false: colors.border.default, true: colors.primary[500] }}
              thumbColor={Platform.OS === 'ios' ? '#fff' : isRemote ? colors.primary[700] : '#f4f3f4'}
              ios_backgroundColor={colors.border.default}
              testID="job-filter-remote"
              accessible={true}
              accessibilityLabel={`Remote only jobs, currently ${isRemote ? 'enabled' : 'disabled'}`}
              accessibilityRole="switch"
            />
          </View>
          
          {/* Filter actions */}
          <View style={styles.actionButtons}>
            <Button
              text="Reset"
              variant={ButtonVariant.OUTLINE}
              size={ButtonSize.SMALL}
              onPress={handleResetFilters}
              style={styles.resetButton}
              testID="job-filter-reset"
              accessibilityLabel="Reset all filters"
            />
            <Button
              text="Apply Filters"
              variant={ButtonVariant.PRIMARY}
              size={ButtonSize.SMALL}
              onPress={handleApplyFilters}
              style={styles.applyButton}
              testID="job-filter-apply"
              accessibilityLabel="Apply filters to job search"
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  toggleButton: {
    padding: 4,
  },
  filtersContent: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  },
  budgetContainer: {
    marginBottom: 16,
  },
  budgetInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetInput: {
    flex: 1,
  },
  budgetSeparator: {
    marginHorizontal: 8,
    color: colors.text.secondary,
  },
  skillsContainer: {
    marginBottom: 16,
  },
  selectedSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  skillBadge: {
    backgroundColor: colors.primary[500],
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  skillBadgeText: {
    color: '#fff',
    fontSize: 12,
    marginRight: 4,
  },
  skillBadgeRemove: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSkillsText: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  resetButton: {
    marginRight: 8,
  },
  applyButton: {
    minWidth: 120,
  },
});

export default JobFilters;