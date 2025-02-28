import React, { useMemo, useCallback } from 'react'; // v18.2.0
import { View, Text, StyleSheet, TouchableOpacity, FlatList, StyleProp, ViewStyle } from 'react-native'; // v0.72.x
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'; // v9.2.0

import { Skill, VerificationStatus } from '../../types/profile.types';
import { Badge, BadgeVariant, BadgeSize } from '../common/Badge';
import { colors } from '../../styles/colors';
import { layout, spacing } from '../../styles/layout';
import { getTextVariant } from '../../styles/typography';
import useProfile from '../../hooks/useProfile';
import useResponsive from '../../hooks/useResponsive';

export interface SkillsListProps {
  skills: Skill[];
  onPress?: (skill: Skill) => void;
  showVerification?: boolean;
  showLevels?: boolean;
  groupByCategory?: boolean;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Determines the badge color variant based on skill category and verification status
 * 
 * @param skill - The skill object to determine color for
 * @returns BadgeVariant for the skill
 */
const getSkillColor = (skill: Skill): BadgeVariant => {
  if (skill.verified === VerificationStatus.VERIFIED) {
    return BadgeVariant.SUCCESS;
  }
  
  // Determine color based on category
  const category = skill.category.toLowerCase();
  
  if (category.includes('machine learning') || category.includes('ml')) {
    return BadgeVariant.PRIMARY;
  } else if (category.includes('artificial intelligence') || category.includes('ai')) {
    return BadgeVariant.SECONDARY;
  } else if (category.includes('data science') || category.includes('analytics')) {
    return BadgeVariant.INFO;
  }
  
  // Default color for other categories
  return BadgeVariant.PRIMARY;
};

/**
 * A component that displays a list of AI/ML skills for user profiles in the AI Talent Marketplace iOS application.
 * It presents skill badges with skill names and proficiency levels in a responsive grid layout,
 * supporting read-only display and editable modes. Skills can be categorized, verified, and have visual
 * indicators for expertise levels.
 */
const SkillsList: React.FC<SkillsListProps> = ({
  skills,
  onPress,
  showVerification = true,
  showLevels = true,
  groupByCategory = false,
  editable = false,
  style,
}) => {
  const { moderateScale, isSmallDevice } = useResponsive();
  
  // Create styles with memoization for better performance
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: spacing.xs,
    },
    skillBadge: {
      marginRight: spacing.xs,
      marginBottom: spacing.xs,
    },
    badgeContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    verifiedIcon: {
      marginLeft: moderateScale(4),
    },
    levelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: moderateScale(4),
    },
    levelBar: {
      height: moderateScale(3),
      width: moderateScale(20),
      backgroundColor: colors.gray[200],
      borderRadius: moderateScale(1.5),
      overflow: 'hidden',
    },
    levelFill: (level: number) => ({
      height: '100%',
      width: `${(level / 10) * 100}%`,
      backgroundColor: colors.primary[500],
    }),
    levelText: {
      fontSize: moderateScale(10),
      color: colors.text.secondary,
      marginLeft: moderateScale(2),
    },
    categoryHeader: {
      ...getTextVariant('paragraphSmall'),
      fontWeight: 'bold',
      marginTop: spacing.s,
      marginBottom: spacing.xs,
      width: '100%',
    },
    emptyMessage: {
      ...getTextVariant('paragraphSmall'),
      color: colors.text.secondary,
      marginTop: spacing.s,
    },
  }), [moderateScale]);
  
  // Group skills by category if needed
  const groupedSkills = useMemo(() => {
    if (!groupByCategory) {
      return { 'All Skills': skills };
    }
    
    return skills.reduce((groups, skill) => {
      const category = skill.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(skill);
      return groups;
    }, {} as Record<string, Skill[]>);
  }, [skills, groupByCategory]);
  
  // Render a skill level indicator
  const renderLevelIndicator = useCallback((level: number) => {
    // Convert level from 1-10 to a visual representation
    return (
      <View style={styles.levelContainer}>
        <View style={styles.levelBar}>
          <View style={styles.levelFill(level)} />
        </View>
        <Text style={styles.levelText}>{level}</Text>
      </View>
    );
  }, [styles]);
  
  // Render a single skill badge
  const renderSkill = useCallback((skill: Skill) => {
    const badgeVariant = getSkillColor(skill);
    const isVerified = skill.verified === VerificationStatus.VERIFIED;
    
    // Create badge content with verification icon and level indicator if needed
    const badgeContent = (
      <View style={styles.badgeContent}>
        <Text>{skill.name}</Text>
        {showVerification && isVerified && (
          <MaterialCommunityIcons
            name="check-circle"
            size={moderateScale(12)}
            color={colors.success[500]}
            style={styles.verifiedIcon}
          />
        )}
        {showLevels && renderLevelIndicator(skill.level)}
      </View>
    );
    
    // If onPress is provided, wrap badge in a TouchableOpacity
    if (onPress) {
      return (
        <TouchableOpacity
          key={skill.id}
          style={styles.skillBadge}
          onPress={() => onPress(skill)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Select ${skill.name} skill`}
        >
          <Badge
            variant={badgeVariant}
            size={BadgeSize.MEDIUM}
          >
            {badgeContent}
          </Badge>
        </TouchableOpacity>
      );
    }
    
    // Otherwise, just wrap it in a View
    return (
      <View key={skill.id} style={styles.skillBadge}>
        <Badge
          variant={badgeVariant}
          size={BadgeSize.MEDIUM}
        >
          {badgeContent}
        </Badge>
      </View>
    );
  }, [showVerification, showLevels, onPress, styles, renderLevelIndicator, moderateScale]);
  
  // Render all categories and skills
  return (
    <View style={[styles.container, style]}>
      {skills.length === 0 && (
        <Text style={styles.emptyMessage}>No skills added yet.</Text>
      )}
      
      {Object.entries(groupedSkills).map(([category, categorySkills]) => (
        <React.Fragment key={category}>
          {groupByCategory && categorySkills.length > 0 && category !== 'All Skills' && (
            <Text style={styles.categoryHeader}>{category}</Text>
          )}
          {categorySkills.map(renderSkill)}
        </React.Fragment>
      ))}
      
      {editable && (
        <TouchableOpacity
          style={styles.skillBadge}
          onPress={() => onPress && onPress({ 
            id: 'new', 
            name: 'Add Skill', 
            category: '', 
            level: 1, 
            verified: VerificationStatus.UNVERIFIED, 
            yearsOfExperience: 0 
          })}
          accessibilityRole="button"
          accessibilityLabel="Add new skill"
        >
          <Badge variant={BadgeVariant.PRIMARY} size={BadgeSize.MEDIUM}>
            <Text>+ Add Skill</Text>
          </Badge>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SkillsList;