import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
  StyleProp,
  ViewStyle,
} from 'react-native'; // react-native 0.72.x
import { Formik } from 'formik'; // formik ^2.4.3
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons/MaterialIcons ^9.2.0
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'; // react-native-vector-icons/MaterialCommunityIcons ^9.2.0

// Internal imports
import {
  PortfolioItem,
  PortfolioItemFormValues,
} from '../../types/profile.types';
import { useProfile } from '../../hooks/useProfile';
import Card from '../common/Card';
import { CardVariant, CardElevation } from '../common/Card';
import Button from '../common/Button';
import { ButtonVariant, ButtonSize } from '../common/Button';
import Modal from '../common/Modal';
import { ModalSize } from '../common/Modal';
import Input from '../common/Input';
import Spinner from '../common/Spinner';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';
import { typography } from '../../styles/typography';
import { moderateScale } from '../../utils/responsive';

/**
 * Interface defining props for the PortfolioSection component
 */
export interface PortfolioSectionProps {
  portfolioItems: PortfolioItem[];
  isEditable: boolean;
  userId: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A component for displaying and managing portfolio items in a user profile
 */
export const PortfolioSection: React.FC<PortfolioSectionProps> = ({
  portfolioItems,
  isEditable,
  userId,
  style,
  testID,
}) => {
  // State for modal visibility and selected portfolio item
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<PortfolioItem | null>(null);

  // Access profile state and operations from the useProfile hook
  const { profileState, addPortfolioItem, updatePortfolioItem, deletePortfolioItem } = useProfile();

  // Extract freelancer profile data from profile state
  const freelancerProfile = profileState.freelancerProfile;

  // Handle toggling modal visibility
  const toggleModal = useCallback(() => {
    setIsModalVisible(!isModalVisible);
    setSelectedPortfolioItem(null); // Clear selected item when modal is closed
  }, [isModalVisible]);

  // Handle adding a new portfolio item
  const handleAddPortfolio = useCallback(() => {
    setSelectedPortfolioItem(null); // Ensure no item is selected for adding
    setIsModalVisible(true);
  }, [setIsModalVisible]);

  // Handle editing an existing portfolio item
  const handleEditPortfolio = useCallback((item: PortfolioItem) => {
    setSelectedPortfolioItem(item);
    setIsModalVisible(true);
  }, [setIsModalVisible]);

  // Handle deleting a portfolio item
  const handleDeletePortfolio = useCallback((id: string) => {
    Alert.alert(
      'Delete Portfolio Item',
      'Are you sure you want to delete this portfolio item?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePortfolioItem(id);
              Alert.alert('Success', 'Portfolio item deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete portfolio item');
            }
          },
        },
      ],
      { cancelable: false }
    );
  }, [deletePortfolioItem]);

  // Handle submitting the portfolio item form
  const handleSubmitPortfolio = useCallback(async (values: PortfolioItemFormValues) => {
    try {
      if (selectedPortfolioItem) {
        // Update existing item
        await updatePortfolioItem(selectedPortfolioItem.id, values);
        Alert.alert('Success', 'Portfolio item updated successfully');
      } else {
        // Add new item
        await addPortfolioItem(values);
        Alert.alert('Success', 'Portfolio item added successfully');
      }
      toggleModal(); // Close modal after successful submission
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save portfolio item');
    }
  }, [addPortfolioItem, updatePortfolioItem, selectedPortfolioItem, toggleModal]);

  // Validate portfolio item form data
  const validatePortfolioForm = useCallback((values: PortfolioItemFormValues) => {
    const errors: any = {};

    if (!values.title) {
      errors.title = 'Title is required';
    }

    if (!values.description) {
      errors.description = 'Description is required';
    }

    if (values.projectUrl && !/^(ftp|http|https):\/\/[^ "]+$/.test(values.projectUrl)) {
      errors.projectUrl = 'Invalid URL format';
    }

    if (values.githubUrl && !/^(ftp|http|https):\/\/[^ "]+$/.test(values.githubUrl)) {
      errors.githubUrl = 'Invalid URL format';
    }

    if (values.kaggleUrl && !/^(ftp|http|https):\/\/[^ "]+$/.test(values.kaggleUrl)) {
      errors.kaggleUrl = 'Invalid URL format';
    }

    if (values.technologies && !Array.isArray(values.technologies)) {
      errors.technologies = 'Technologies must be an array';
    }

    if (values.aiModels && !Array.isArray(values.aiModels)) {
      errors.aiModels = 'AI Models must be an array';
    }

    return errors;
  }, []);

  // Function to open external URLs with error handling
  const openUrl = useCallback(async (url: string) => {
    // Add https:// prefix if not present
    if (!/^(ftp|http|https):\/\/[^ "]+$/.test(url)) {
      url = `https://${url}`;
    }

    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(`Cannot open URL: ${url}`);
      }
    } catch (error) {
      console.error('An error occurred', error);
      Alert.alert('An error occurred opening the URL');
    }
  }, []);

  // Function to format date strings for display
  const formatDate = useCallback((dateString: string) => {
    if (!dateString) {
      return '';
    }

    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }, []);

  return (
    <>
      {/* Section header with title and add button (if editable) */}
      <View style={[styles.header, isEditable ? styles.editableHeader : null]}>
        <Text style={styles.title}>Portfolio Projects</Text>
        {isEditable && (
          <Button
            title="Add Project"
            variant={ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            onPress={handleAddPortfolio}
            leftIcon={<MaterialIcons name="add" size={16} color={colors.primary[600]} />}
          />
        )}
      </View>

      {/* ScrollView with portfolio item cards if items exist */}
      {portfolioItems && portfolioItems.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
          {portfolioItems.map((item) => (
            <Card key={item.id} style={styles.card} elevation={CardElevation.LOW}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.image} />
              ) : (
                <View style={styles.placeholderImage} />
              )}
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
              <Text style={styles.itemTechnologies}>
                Technologies: {item.technologies.join(', ')}
              </Text>
              <View style={styles.links}>
                {item.githubUrl && (
                  <TouchableOpacity onPress={() => openUrl(item.githubUrl)}>
                    <MaterialCommunityIcons name="github" size={24} color={colors.primary[600]} />
                  </TouchableOpacity>
                )}
                {item.projectUrl && (
                  <TouchableOpacity onPress={() => openUrl(item.projectUrl)}>
                    <MaterialIcons name="link" size={24} color={colors.primary[600]} />
                  </TouchableOpacity>
                )}
                {item.kaggleUrl && (
                  <TouchableOpacity onPress={() => openUrl(item.kaggleUrl)}>
                    <MaterialCommunityIcons name="kaggle" size={24} color={colors.primary[600]} />
                  </TouchableOpacity>
                )}
              </View>
              {isEditable && (
                <View style={styles.editButtons}>
                  <Button
                    title="Edit"
                    variant={ButtonVariant.OUTLINE}
                    size={ButtonSize.SMALL}
                    onPress={() => handleEditPortfolio(item)}
                  />
                  <Button
                    title="Delete"
                    variant={ButtonVariant.DANGER}
                    size={ButtonSize.SMALL}
                    onPress={() => handleDeletePortfolio(item.id)}
                  />
                </View>
              )}
            </Card>
          ))}
        </ScrollView>
      ) : (
        // Empty state message if no portfolio items
        <Text style={styles.emptyText}>No portfolio items added yet.</Text>
      )}

      {/* Modal with Formik form for adding/editing items */}
      <Modal
        visible={isModalVisible}
        onClose={toggleModal}
        title={selectedPortfolioItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
        size={ModalSize.MEDIUM}
      >
        <Formik
          initialValues={{
            title: selectedPortfolioItem?.title || '',
            description: selectedPortfolioItem?.description || '',
            projectUrl: selectedPortfolioItem?.projectUrl || '',
            githubUrl: selectedPortfolioItem?.githubUrl || '',
            kaggleUrl: selectedPortfolioItem?.kaggleUrl || '',
            technologies: selectedPortfolioItem?.technologies || [],
            category: selectedPortfolioItem?.category || '',
            aiModels: selectedPortfolioItem?.aiModels || [],
            problemSolved: selectedPortfolioItem?.problemSolved || '',
            startDate: selectedPortfolioItem?.startDate || '',
            endDate: selectedPortfolioItem?.endDate || '',
          }}
          validate={validatePortfolioForm}
          onSubmit={handleSubmitPortfolio}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors }) => (
            <View>
              <Input
                label="Title"
                value={values.title}
                onChangeText={handleChange('title')}
                onBlur={handleBlur('title')}
                error={errors.title}
              />
              <Input
                label="Description"
                value={values.description}
                onChangeText={handleChange('description')}
                onBlur={handleBlur('description')}
                error={errors.description}
                multiline
                numberOfLines={4}
              />
              <Input
                label="Project URL"
                value={values.projectUrl}
                onChangeText={handleChange('projectUrl')}
                onBlur={handleBlur('projectUrl')}
                error={errors.projectUrl}
              />
              <Input
                label="GitHub URL"
                value={values.githubUrl}
                onChangeText={handleChange('githubUrl')}
                onBlur={handleBlur('githubUrl')}
                error={errors.githubUrl}
              />
              <Input
                label="Kaggle URL"
                value={values.kaggleUrl}
                onChangeText={handleChange('kaggleUrl')}
                onBlur={handleBlur('kaggleUrl')}
                error={errors.kaggleUrl}
              />
              <Button title="Save" onPress={handleSubmit} />
            </View>
          )}
        </Formik>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  editableHeader: {
    marginTop: spacing.m,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
  },
  scrollView: {
    marginBottom: spacing.m,
  },
  card: {
    width: 300,
    marginRight: spacing.s,
  },
  image: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
    marginBottom: spacing.xs,
  },
  placeholderImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.gray[200],
    marginBottom: spacing.xs,
  },
  itemTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    marginBottom: spacing.xxs,
  },
  itemDescription: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xxs,
  },
  itemTechnologies: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.xxs,
  },
  links: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.s,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
});

export default PortfolioSection;