import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, LayoutAnimation, UIManager, Platform, StyleProp, ViewStyle } from 'react-native'; // v0.72.x
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // v9.2.0
import Badge, { BadgeVariant, BadgeSize } from '../common/Badge';
import { Skill, VerificationStatus } from '../../../backend/shared/src/types/user.types';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';
import { typography } from '../../styles/typography';

// Global constants
const SKILL_LEVEL_LABELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master'];

/**
 * Converts numeric skill level to a human-readable label
 * 
 * @param level Skill level (1-5)
 * @returns Human-readable skill level label
 */
const getSkillLevelLabel = (level: number): string => {
  // Ensure the level is within valid range (1-5)
  const validLevel = Math.max(1, Math.min(5, level));
  return SKILL_LEVEL_LABELS[validLevel - 1];
};

/**
 * Returns the appropriate icon and color for a verification status
 * 
 * @param status Verification status enum value
 * @returns Object containing icon name and color
 */
const getVerificationStatusIcon = (status: VerificationStatus): { icon: string; color: string } => {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return { icon: 'check-circle', color: colors.success[500] };
    case VerificationStatus.PENDING:
      return { icon: 'hourglass-empty', color: colors.warning[500] };
    case VerificationStatus.UNVERIFIED:
    default:
      return { icon: '', color: '' };
  }
};

// Enable layout animations for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Props for the SkillProgressBar component
 */
export interface SkillProgressBarProps {
  /** Skill level (1-5) */
  level: number;
  /** Width of the progress bar */
  width?: number | string;
  /** Whether to animate changes to the progress bar */
  animated?: boolean;
  /** Additional style for the progress bar container */
  style?: StyleProp<ViewStyle>;
}

/**
 * Displays a progress bar to visualize skill proficiency level
 */
const SkillProgressBar: React.FC<SkillProgressBarProps> = ({ 
  level, 
  width = '100%', 
  animated = true,
  style
}) => {
  // Calculate progress percentage based on level (level / 5 * 100)
  const percentage = (level / 5) * 100;

  // Apply layout animation if animated is true
  React.useEffect(() => {
    if (animated) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [level, animated]);

  return (
    <View 
      style={[styles.progressContainer, { width }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percentage }}
    >
      <View 
        style={[
          styles.progressBar, 
          { width: `${percentage}%`, backgroundColor: colors.primary[500] }
        ]} 
      />
    </View>
  );
};

/**
 * Props for the SkillItem component
 */
export interface SkillItemProps {
  /** Skill object to display */
  skill: Skill;
  /** Whether to display in compact mode */
  compact?: boolean;
  /** Callback function when skill is pressed */
  onPress?: (skill: Skill) => void;
  /** Additional style for the skill item */
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders an individual skill item with name, level, and verification status
 */
const SkillItem: React.FC<SkillItemProps> = ({ 
  skill, 
  compact = false,
  onPress,
  style
}) => {
  const { icon, color } = getVerificationStatusIcon(skill.verified);
  const levelLabel = getSkillLevelLabel(skill.level);

  // Handle tap on skill item
  const handlePress = () => {
    if (onPress) {
      onPress(skill);
    }
  };

  // Accessibility label combining skill name, level and verification status
  const accessibilityLabel = `${skill.name}, ${levelLabel}${
    skill.verified === VerificationStatus.VERIFIED ? ', Verified' : 
    skill.verified === VerificationStatus.PENDING ? ', Verification pending' : ''
  }`;

  if (compact) {
    // Compact view (badge style)
    return (
      <Badge
        variant={BadgeVariant.PRIMARY}
        size={BadgeSize.SM}
        pill
        style={[styles.compactSkill, style]}
        onPress={onPress ? handlePress : undefined}
        accessibilityLabel={accessibilityLabel}
      >
        {skill.name}
        {icon ? <MaterialIcons name={icon} size={10} color={color} style={styles.badgeIcon} /> : null}
      </Badge>
    );
  }

  // Full view with progress bar
  return (
    <View 
      style={[styles.skillItem, style]}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.skillHeader}>
        <Text 
          style={styles.skillName}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {skill.name}
        </Text>
        {icon ? (
          <MaterialIcons 
            name={icon} 
            size={16} 
            color={color} 
            style={styles.verificationIcon} 
          />
        ) : null}
      </View>
      
      <View style={styles.skillDetails}>
        <SkillProgressBar level={skill.level} />
        <View style={styles.skillLevel}>
          <Text style={styles.skillLevelText}>{levelLabel}</Text>
          {skill.yearsOfExperience > 0 && (
            <Text style={styles.experienceText}>
              {skill.yearsOfExperience} {skill.yearsOfExperience === 1 ? 'year' : 'years'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

/**
 * Props for the SkillsList component
 */
export interface SkillsListProps {
  /** Array of skills to display */
  skills: Skill[];
  /** Whether to display skills in compact mode */
  compact?: boolean;
  /** Maximum number of skills to display */
  maxItems?: number;
  /** Callback function when a skill is pressed */
  onSkillPress?: (skill: Skill) => void;
  /** Additional style for the container */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Renders a list of skills with appropriate visualizations
 */
const SkillsList: React.FC<SkillsListProps> = ({
  skills,
  compact = false,
  maxItems,
  onSkillPress,
  style,
  testID = 'skills-list'
}) => {
  // Sort skills by level (descending) then by name
  const sortedSkills = useMemo(() => {
    if (!skills || skills.length === 0) return [];
    
    return [...skills].sort((a, b) => {
      if (a.level !== b.level) {
        return b.level - a.level; // Sort by level in descending order
      }
      return a.name.localeCompare(b.name); // Then sort by name
    });
  }, [skills]);

  // Limit the number of skills to display if maxItems is set
  const displayedSkills = useMemo(() => {
    if (maxItems && maxItems > 0 && sortedSkills.length > maxItems) {
      return sortedSkills.slice(0, maxItems);
    }
    return sortedSkills;
  }, [sortedSkills, maxItems]);

  // Render nothing if no skills
  if (!skills || skills.length === 0) {
    return null;
  }

  // Render compact view (horizontal scrollable list of badges)
  if (compact) {
    return (
      <FlatList
        testID={testID}
        data={displayedSkills}
        keyExtractor={(item) => `skill-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <SkillItem 
            skill={item} 
            compact 
            onPress={onSkillPress}
            style={styles.compactSkillItem}
          />
        )}
        contentContainerStyle={[styles.compactList, style]}
        accessibilityLabel="Skills list"
      />
    );
  }

  // Render full view (vertical list with progress bars)
  return (
    <View style={[styles.container, style]} testID={testID} accessibilityLabel="Skills list">
      {displayedSkills.map((skill) => (
        <SkillItem 
          key={`skill-${skill.id}`} 
          skill={skill}
          onPress={onSkillPress}
          style={styles.fullSkillItem}
        />
      ))}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    width: '100%',
  },
  compactList: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
  },
  skillItem: {
    marginBottom: spacing.s,
    width: '100%',
  },
  compactSkillItem: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  fullSkillItem: {
    marginBottom: spacing.m,
  },
  compactSkill: {
    marginRight: spacing.xs,
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  skillName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: 'bold',
    flex: 1,
  },
  verificationIcon: {
    marginLeft: spacing.xs,
  },
  badgeIcon: {
    marginLeft: spacing.xs / 2,
  },
  skillDetails: {
    flexDirection: 'column',
  },
  progressContainer: {
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  skillLevel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs / 2,
  },
  skillLevelText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  experienceText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});

export default SkillsList;