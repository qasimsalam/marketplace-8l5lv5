/**
 * Portfolio Section Component for iOS
 *
 * A specialized component for displaying and managing portfolio items of AI professionals
 * in the iOS application of the AI Talent Marketplace. This component showcases a user's
 * GitHub projects, Kaggle notebooks, research papers, and other work samples with
 * categorized sections and interactive features for viewing and editing.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  Platform,
  ImageBackground
} from 'react-native'; // v0.72.x
import { FontAwesome, MaterialIcons, Octicons } from 'react-native-vector-icons'; // ^9.2.0
import { launchImageLibrary } from 'react-native-image-picker'; // ^5.0.0
import { useForm, Controller } from 'react-hook-form'; // ^7.45.0

// Internal Imports
import {
  PortfolioItem as PortfolioItemType,
  PortfolioItemType as PortfolioItemTypeEnum,
  PortfolioItemFormValues
} from '../../types/profile.types';
import { Card, CardVariant, CardElevation } from '../common/Card';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import { Modal, ModalSize, ModalPlacement } from '../common/Modal';
import useProfile from '../../hooks/useProfile';
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';
import { formatDate } from '../../utils/date';
import useAuth from '../../hooks/useAuth';

/**
 * Returns the appropriate icon component based on portfolio item type
 * @param type Portfolio item type
 * @param size Icon size
 * @returns Icon component for the specified portfolio item type
 */
const getPortfolioIcon = (type: PortfolioItemTypeEnum, size: number = 24): JSX.Element => {
  switch (type) {
    case PortfolioItemTypeEnum.GITHUB_REPO:
      return <Octicons name="repo" size={size} color={colors.primary[700]} />;
    case PortfolioItemTypeEnum.KAGGLE_NOTEBOOK:
      // Kaggle doesn't have a built-in icon, using a custom approach with FontAwesome
      return <FontAwesome name="database" size={size} color="#20BEFF" />;
    case PortfolioItemTypeEnum.PUBLICATION:
      return <MaterialIcons name="article" size={size} color={colors.primary[700]} />;
    case PortfolioItemTypeEnum.PROJECT:
      return <MaterialIcons name="work" size={size} color={colors.primary[700]} />;
    case PortfolioItemTypeEnum.DEPLOYED_MODEL:
      return <FontAwesome name="cloud" size={size} color={colors.primary[700]} />;
    case PortfolioItemTypeEnum.OTHER:
    default:
      return <MaterialIcons name="category" size={size} color={colors.primary[700]} />;
  }
};

/**
 * Opens a URL in the device browser if valid
 * @param url URL to open
 */
const openUrl = async (url: string): Promise<void> => {
  if (!url) return;
  
  // Basic URL validation
  const isValid = url.match(/^(https?:\/\/)?(www\.)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i);
  
  if (isValid) {
    try {
      // Ensure URL has http/https prefix
      const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
      const canOpen = await Linking.canOpenURL(formattedUrl);
      
      if (canOpen) {
        await Linking.openURL(formattedUrl);
      } else {
        Alert.alert('Cannot Open URL', 'The URL cannot be opened by any app on this device.');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open the URL.');
    }
  } else {
    Alert.alert('Invalid URL', 'Please provide a valid URL.');
  }
};

// Interface for the individual portfolio item component props
interface PortfolioItemProps {
  item: PortfolioItemType;
  onPress: (item: PortfolioItemType) => void;
  isEditable: boolean;
  onEdit?: (item: PortfolioItemType) => void;
  onDelete?: (item: PortfolioItemType) => void;
}

/**
 * Renders an individual portfolio item card
 */
const PortfolioItem: React.FC<PortfolioItemProps> = ({
  item,
  onPress,
  isEditable,
  onEdit,
  onDelete
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Truncate description for initial display
  const displayDescription = isDescriptionExpanded ? 
    item.description : 
    (item.description?.length > 80 ? `${item.description.substring(0, 80)}...` : item.description);
  
  const handleToggleDescription = () => {
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };
  
  return (
    <Card
      variant={CardVariant.DEFAULT}
      elevation={CardElevation.LOW}
      onPress={() => onPress(item)}
      style={styles.itemCard}
      testID={`portfolio-item-${item.id}`}
    >
      <View style={styles.itemContent}>
        {/* Image or placeholder */}
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.itemImage} 
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.itemImage, styles.imagePlaceholder]}>
              {getPortfolioIcon(item.type, 40)}
            </View>
          )}
        </View>
        
        <View style={styles.itemDetails}>
          {/* Title and type */}
          <View style={styles.itemHeader}>
            <Text style={textVariants.heading4} numberOfLines={1}>{item.title}</Text>
            <View style={styles.typeContainer}>
              {getPortfolioIcon(item.type, 18)}
              <Text style={[textVariants.caption, styles.typeText]}>
                {item.type.replace('_', ' ')}
              </Text>
            </View>
          </View>
          
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={textVariants.paragraphSmall}>{displayDescription}</Text>
            {item.description?.length > 80 && (
              <TouchableOpacity 
                onPress={handleToggleDescription}
                style={styles.readMoreButton}
              >
                <Text style={styles.readMoreText}>
                  {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Technologies */}
          {item.technologies && item.technologies.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.technologiesContainer}
            >
              {item.technologies.map((tech, index) => (
                <View key={index} style={styles.technologyTag}>
                  <Text style={styles.technologyText}>{tech}</Text>
                </View>
              ))}
            </ScrollView>
          )}
          
          {/* Action buttons */}
          <View style={styles.actionButtons}>
            {item.projectUrl && (
              <Button
                variant={ButtonVariant.OUTLINE}
                size={ButtonSize.SMALL}
                text="View Project"
                onPress={() => openUrl(item.projectUrl)}
              />
            )}
            {item.githubUrl && (
              <Button
                variant={ButtonVariant.OUTLINE}
                size={ButtonSize.SMALL}
                text="GitHub"
                onPress={() => openUrl(item.githubUrl)}
              />
            )}
            {item.kaggleUrl && (
              <Button
                variant={ButtonVariant.OUTLINE}
                size={ButtonSize.SMALL}
                text="Kaggle"
                onPress={() => openUrl(item.kaggleUrl)}
              />
            )}
            {isEditable && (
              <View style={styles.editButtons}>
                {onEdit && (
                  <TouchableOpacity
                    onPress={() => onEdit(item)}
                    style={styles.editButton}
                    accessibilityLabel="Edit portfolio item"
                  >
                    <MaterialIcons name="edit" size={20} color={colors.primary[600]} />
                  </TouchableOpacity>
                )}
                {onDelete && (
                  <TouchableOpacity
                    onPress={() => onDelete(item)}
                    style={styles.deleteButton}
                    accessibilityLabel="Delete portfolio item"
                  >
                    <MaterialIcons name="delete" size={20} color={colors.error[600]} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
};

// Interface for the portfolio item detail modal component props
interface PortfolioItemDetailProps {
  item: PortfolioItemType | null;
  visible: boolean;
  onClose: () => void;
  isEditable: boolean;
  onEdit?: (item: PortfolioItemType) => void;
  onDelete?: (item: PortfolioItemType) => void;
}

/**
 * Modal component for displaying detailed portfolio item information
 */
const PortfolioItemDetail: React.FC<PortfolioItemDetailProps> = ({
  item,
  visible,
  onClose,
  isEditable,
  onEdit,
  onDelete
}) => {
  if (!item) return null;
  
  const handleEdit = () => {
    onClose();
    if (onEdit) onEdit(item);
  };
  
  const handleDelete = () => {
    onClose();
    if (onDelete) onDelete(item);
  };
  
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={item.title}
      size={ModalSize.LARGE}
      placement={ModalPlacement.CENTER}
    >
      <ScrollView style={styles.detailScrollView}>
        {/* Image */}
        {item.imageUrl ? (
          <Image 
            source={{ uri: item.imageUrl }} 
            style={styles.detailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.detailImage, styles.detailImagePlaceholder]}>
            {getPortfolioIcon(item.type, 60)}
          </View>
        )}
        
        {/* Type and dates */}
        <View style={styles.detailMetaSection}>
          <View style={styles.typeContainer}>
            {getPortfolioIcon(item.type, 20)}
            <Text style={[textVariants.heading6, styles.typeText]}>
              {item.type.replace('_', ' ')}
            </Text>
          </View>
          
          <View style={styles.dateRangeContainer}>
            <Text style={textVariants.caption}>
              {formatDate(item.startDate)} - {item.endDate ? formatDate(item.endDate) : 'Present'}
            </Text>
          </View>
        </View>
        
        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={textVariants.paragraphSmall}>{item.description}</Text>
        </View>
        
        {/* Technologies */}
        {item.technologies && item.technologies.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={textVariants.heading6}>Technologies</Text>
            <View style={styles.technologiesDetailContainer}>
              {item.technologies.map((tech, index) => (
                <View key={index} style={styles.technologyTag}>
                  <Text style={styles.technologyText}>{tech}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Links */}
        <View style={styles.detailSection}>
          <Text style={textVariants.heading6}>Links</Text>
          <View style={styles.linksContainer}>
            {item.projectUrl && (
              <Button
                variant={ButtonVariant.OUTLINE}
                size={ButtonSize.SMALL}
                text="View Project"
                onPress={() => openUrl(item.projectUrl)}
                style={styles.linkButton}
              />
            )}
            {item.githubUrl && (
              <Button
                variant={ButtonVariant.OUTLINE}
                size={ButtonSize.SMALL}
                text="GitHub Repository"
                onPress={() => openUrl(item.githubUrl)}
                style={styles.linkButton}
              />
            )}
            {item.kaggleUrl && (
              <Button
                variant={ButtonVariant.OUTLINE}
                size={ButtonSize.SMALL}
                text="Kaggle Notebook"
                onPress={() => openUrl(item.kaggleUrl)}
                style={styles.linkButton}
              />
            )}
          </View>
        </View>
        
        {/* Edit and delete buttons */}
        {isEditable && (
          <View style={styles.detailActionButtons}>
            {onEdit && (
              <Button
                variant={ButtonVariant.PRIMARY}
                size={ButtonSize.MEDIUM}
                text="Edit"
                onPress={handleEdit}
                style={styles.editDetailButton}
              />
            )}
            {onDelete && (
              <Button
                variant={ButtonVariant.DANGER}
                size={ButtonSize.MEDIUM}
                text="Delete"
                onPress={handleDelete}
                style={styles.deleteDetailButton}
              />
            )}
          </View>
        )}
      </ScrollView>
    </Modal>
  );
};

// Interface for the portfolio item form component props
interface PortfolioItemFormProps {
  item?: PortfolioItemType;
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: PortfolioItemFormValues) => void;
}

/**
 * Form component for creating and editing portfolio items
 */
const PortfolioItemForm: React.FC<PortfolioItemFormProps> = ({
  item,
  visible,
  onClose,
  onSubmit
}) => {
  const { control, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<PortfolioItemFormValues>({
    defaultValues: item ? {
      title: item.title,
      description: item.description,
      type: item.type,
      projectUrl: item.projectUrl,
      githubUrl: item.githubUrl,
      kaggleUrl: item.kaggleUrl,
      technologies: item.technologies,
      startDate: item.startDate ? new Date(item.startDate) : new Date(),
      endDate: item.endDate ? new Date(item.endDate) : new Date(),
    } : {
      title: '',
      description: '',
      type: PortfolioItemTypeEnum.PROJECT,
      projectUrl: '',
      githubUrl: '',
      kaggleUrl: '',
      technologies: [],
      startDate: new Date(),
      endDate: new Date(),
    }
  });
  
  // Reset form when item changes
  useEffect(() => {
    if (visible) {
      if (item) {
        reset({
          title: item.title,
          description: item.description,
          type: item.type,
          projectUrl: item.projectUrl,
          githubUrl: item.githubUrl,
          kaggleUrl: item.kaggleUrl,
          technologies: item.technologies,
          startDate: item.startDate ? new Date(item.startDate) : new Date(),
          endDate: item.endDate ? new Date(item.endDate) : new Date(),
        });
      } else {
        reset({
          title: '',
          description: '',
          type: PortfolioItemTypeEnum.PROJECT,
          projectUrl: '',
          githubUrl: '',
          kaggleUrl: '',
          technologies: [],
          startDate: new Date(),
          endDate: new Date(),
        });
      }
    }
  }, [item, visible, reset]);
  
  // State for image picker
  const [imageFile, setImageFile] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [technologies, setTechnologies] = useState<string[]>(item?.technologies || []);
  const [newTech, setNewTech] = useState('');
  
  // Watch for form type field to conditionally render fields
  const watchedType = watch('type');
  
  // Handle image selection
  const handleSelectImage = () => {
    launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('Image picker error: ', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        if (asset.uri && asset.type) {
          setImageFile({
            uri: asset.uri,
            type: asset.type,
            name: asset.fileName || 'portfolio-image.jpg'
          });
        }
      }
    });
  };
  
  // Handle adding new technology tag
  const handleAddTechnology = () => {
    if (newTech.trim() && !technologies.includes(newTech.trim())) {
      const updatedTech = [...technologies, newTech.trim()];
      setTechnologies(updatedTech);
      setValue('technologies', updatedTech);
      setNewTech('');
    }
  };
  
  // Handle removing technology tag
  const handleRemoveTechnology = (index: number) => {
    const updatedTech = [...technologies];
    updatedTech.splice(index, 1);
    setTechnologies(updatedTech);
    setValue('technologies', updatedTech);
  };
  
  // Handle form submission
  const onFormSubmit = (data: PortfolioItemFormValues) => {
    // Add the image file if selected
    if (imageFile) {
      data.image = imageFile;
    }
    
    // Ensure technologies are included
    data.technologies = technologies;
    
    onSubmit(data);
    onClose();
  };
  
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={item ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
      size={ModalSize.LARGE}
      placement={ModalPlacement.CENTER}
      renderFooter={() => (
        <View style={styles.formFooter}>
          <Button
            variant={ButtonVariant.SECONDARY}
            size={ButtonSize.MEDIUM}
            text="Cancel"
            onPress={onClose}
            style={styles.cancelButton}
          />
          <Button
            variant={ButtonVariant.PRIMARY}
            size={ButtonSize.MEDIUM}
            text={item ? 'Save Changes' : 'Add Item'}
            onPress={handleSubmit(onFormSubmit)}
            style={styles.submitButton}
          />
        </View>
      )}
    >
      <ScrollView style={styles.formScrollView}>
        {/* Image picker */}
        <View style={styles.imagePickerContainer}>
          {imageFile?.uri ? (
            <ImageBackground
              source={{ uri: imageFile.uri }}
              style={styles.pickedImage}
              resizeMode="cover"
            >
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={handleSelectImage}
              >
                <Text style={styles.changeImageText}>Change Image</Text>
              </TouchableOpacity>
            </ImageBackground>
          ) : item?.imageUrl ? (
            <ImageBackground
              source={{ uri: item.imageUrl }}
              style={styles.pickedImage}
              resizeMode="cover"
            >
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={handleSelectImage}
              >
                <Text style={styles.changeImageText}>Change Image</Text>
              </TouchableOpacity>
            </ImageBackground>
          ) : (
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={handleSelectImage}
            >
              <MaterialIcons name="add-photo-alternate" size={40} color={colors.primary[600]} />
              <Text style={styles.addImageText}>Add Image</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Title field */}
        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Title</Text>
          <Controller
            control={control}
            name="title"
            rules={{ required: 'Title is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.textInput}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Project title"
                placeholderTextColor={colors.gray[400]}
              />
            )}
          />
          {errors.title && (
            <Text style={styles.errorText}>{errors.title.message}</Text>
          )}
        </View>
        
        {/* Type field */}
        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeSelector}>
            {Object.values(PortfolioItemTypeEnum).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeOption,
                  watchedType === type && styles.typeOptionSelected
                ]}
                onPress={() => setValue('type', type)}
              >
                {getPortfolioIcon(type as PortfolioItemTypeEnum, 18)}
                <Text style={[
                  styles.typeOptionText,
                  watchedType === type && styles.typeOptionTextSelected
                ]}>
                  {type.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Description field */}
        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Description</Text>
          <Controller
            control={control}
            name="description"
            rules={{ required: 'Description is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.textInput, styles.textareaInput]}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Describe your project or contribution"
                placeholderTextColor={colors.gray[400]}
                multiline
                textAlignVertical="top"
                numberOfLines={5}
              />
            )}
          />
          {errors.description && (
            <Text style={styles.errorText}>{errors.description.message}</Text>
          )}
        </View>
        
        {/* URL fields - conditionally rendered based on type */}
        {(watchedType === PortfolioItemTypeEnum.PROJECT || 
          watchedType === PortfolioItemTypeEnum.DEPLOYED_MODEL) && (
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Project URL</Text>
            <Controller
              control={control}
              name="projectUrl"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.textInput}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="https://yourproject.com"
                  placeholderTextColor={colors.gray[400]}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              )}
            />
          </View>
        )}
        
        {watchedType === PortfolioItemTypeEnum.GITHUB_REPO && (
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>GitHub Repository URL</Text>
            <Controller
              control={control}
              name="githubUrl"
              rules={{ required: 'GitHub URL is required for GitHub repositories' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.textInput}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="https://github.com/username/repo"
                  placeholderTextColor={colors.gray[400]}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              )}
            />
            {errors.githubUrl && (
              <Text style={styles.errorText}>{errors.githubUrl.message}</Text>
            )}
          </View>
        )}
        
        {watchedType === PortfolioItemTypeEnum.KAGGLE_NOTEBOOK && (
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Kaggle Notebook URL</Text>
            <Controller
              control={control}
              name="kaggleUrl"
              rules={{ required: 'Kaggle URL is required for Kaggle notebooks' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.textInput}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="https://www.kaggle.com/notebook"
                  placeholderTextColor={colors.gray[400]}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              )}
            />
            {errors.kaggleUrl && (
              <Text style={styles.errorText}>{errors.kaggleUrl.message}</Text>
            )}
          </View>
        )}
        
        {/* Technologies field */}
        <View style={styles.formField}>
          <Text style={styles.fieldLabel}>Technologies Used</Text>
          <View style={styles.techInputContainer}>
            <TextInput
              style={[styles.textInput, styles.techInput]}
              value={newTech}
              onChangeText={setNewTech}
              placeholder="Add a technology (e.g., Python, TensorFlow)"
              placeholderTextColor={colors.gray[400]}
              returnKeyType="done"
              onSubmitEditing={handleAddTechnology}
            />
            <TouchableOpacity
              style={styles.addTechButton}
              onPress={handleAddTechnology}
              disabled={!newTech.trim()}
            >
              <Text style={styles.addTechButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.techTagsContainer}>
            {technologies.map((tech, index) => (
              <View key={index} style={styles.techTag}>
                <Text style={styles.techTagText}>{tech}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveTechnology(index)}
                  style={styles.removeTechButton}
                >
                  <MaterialIcons name="close" size={16} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
};

// Interface for props of the main PortfolioSection component
export interface PortfolioSectionProps {
  profileId: string;
  isEditable: boolean;
  portfolioItems: PortfolioItemType[];
  onItemAdded?: (item: PortfolioItemType) => void;
  onItemUpdated?: (item: PortfolioItemType) => void;
  onItemDeleted?: (itemId: string) => void;
  testID?: string;
}

/**
 * Main portfolio section component that displays and manages portfolio items
 */
const PortfolioSection: React.FC<PortfolioSectionProps> = ({
  profileId,
  isEditable,
  portfolioItems,
  onItemAdded,
  onItemUpdated,
  onItemDeleted,
  testID
}) => {
  // Get profile state and methods from useProfile hook
  const { profileState, addPortfolioItem, updatePortfolioItem, deletePortfolioItem } = useProfile();
  
  // Get current user for permission checking
  const { user } = useAuth();
  
  // State for selected portfolio item and modals
  const [selectedItem, setSelectedItem] = useState<PortfolioItemType | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Check if user has permission to edit
  const canEdit = useMemo(() => {
    if (!isEditable) return false;
    if (!user) return false;
    return (user.id === profileId) || user.role === 'ADMIN';
  }, [user, profileId, isEditable]);
  
  // Group portfolio items by type for better organization
  const groupedItems = useMemo(() => {
    const grouped: Record<string, PortfolioItemType[]> = {};
    
    (portfolioItems || []).forEach(item => {
      if (!grouped[item.type]) {
        grouped[item.type] = [];
      }
      grouped[item.type].push(item);
    });
    
    return grouped;
  }, [portfolioItems]);
  
  // Handle opening portfolio item detail view
  const handleViewItem = useCallback((item: PortfolioItemType) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
  }, []);
  
  // Handle adding new portfolio item
  const handleAddItem = useCallback(() => {
    setIsEditMode(false);
    setSelectedItem(null);
    setFormModalVisible(true);
  }, []);
  
  // Handle editing portfolio item
  const handleEditItem = useCallback((item: PortfolioItemType) => {
    setIsEditMode(true);
    setSelectedItem(item);
    setFormModalVisible(true);
  }, []);
  
  // Handle deleting portfolio item with confirmation
  const handleDeleteItem = useCallback((item: PortfolioItemType) => {
    Alert.alert(
      'Delete Portfolio Item',
      `Are you sure you want to delete "${item.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const success = await deletePortfolioItem(item.id);
              if (success) {
                if (onItemDeleted) onItemDeleted(item.id);
                Alert.alert('Success', 'Portfolio item deleted successfully');
              }
            } catch (error) {
              console.error('Error deleting portfolio item:', error);
              Alert.alert('Error', 'Failed to delete portfolio item');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, [deletePortfolioItem, onItemDeleted]);
  
  // Handle form submission for adding/editing
  const handleFormSubmit = useCallback(async (data: PortfolioItemFormValues) => {
    try {
      setLoading(true);
      
      if (isEditMode && selectedItem) {
        // Update existing item
        const updatedItem = await updatePortfolioItem(selectedItem.id, data);
        if (onItemUpdated) onItemUpdated(updatedItem);
        Alert.alert('Success', 'Portfolio item updated successfully');
      } else {
        // Add new item
        const newItem = await addPortfolioItem(data);
        if (onItemAdded) onItemAdded(newItem);
        Alert.alert('Success', 'Portfolio item added successfully');
      }
    } catch (error) {
      console.error('Error saving portfolio item:', error);
      Alert.alert('Error', 'Failed to save portfolio item');
    } finally {
      setLoading(false);
    }
  }, [isEditMode, selectedItem, updatePortfolioItem, addPortfolioItem, onItemUpdated, onItemAdded]);
  
  // Get types that have portfolio items, for consistent order
  const typesWithItems = useMemo(() => {
    const order = [
      PortfolioItemTypeEnum.PROJECT,
      PortfolioItemTypeEnum.GITHUB_REPO,
      PortfolioItemTypeEnum.KAGGLE_NOTEBOOK,
      PortfolioItemTypeEnum.DEPLOYED_MODEL,
      PortfolioItemTypeEnum.PUBLICATION,
      PortfolioItemTypeEnum.OTHER
    ];
    
    return order.filter(type => groupedItems[type] && groupedItems[type].length > 0);
  }, [groupedItems]);
  
  // Get human-readable type names
  const getTypeName = useCallback((type: string): string => {
    switch (type) {
      case PortfolioItemTypeEnum.GITHUB_REPO:
        return 'GitHub Repositories';
      case PortfolioItemTypeEnum.KAGGLE_NOTEBOOK:
        return 'Kaggle Notebooks';
      case PortfolioItemTypeEnum.PUBLICATION:
        return 'Publications';
      case PortfolioItemTypeEnum.PROJECT:
        return 'Projects';
      case PortfolioItemTypeEnum.DEPLOYED_MODEL:
        return 'Deployed Models';
      case PortfolioItemTypeEnum.OTHER:
        return 'Other';
      default:
        return type.replace('_', ' ');
    }
  }, []);
  
  // Render an empty state when no portfolio items
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialIcons name="assignment" size={60} color={colors.gray[300]} />
      <Text style={styles.emptyStateTitle}>No Portfolio Items</Text>
      <Text style={styles.emptyStateSubtitle}>
        {canEdit ? 'Showcase your AI skills by adding projects, models, and publications.' : 'This user has not added any portfolio items yet.'}
      </Text>
      {canEdit && (
        <Button
          variant={ButtonVariant.PRIMARY}
          size={ButtonSize.MEDIUM}
          text="Add Portfolio Item"
          onPress={handleAddItem}
          style={styles.addButton}
        />
      )}
    </View>
  );
  
  return (
    <View style={styles.container} testID={testID || 'portfolio-section'}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={textVariants.heading3}>Portfolio</Text>
        {canEdit && (
          <Button
            variant={ButtonVariant.PRIMARY}
            size={ButtonSize.SMALL}
            text="Add Item"
            onPress={handleAddItem}
          />
        )}
      </View>
      
      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      )}
      
      {/* Empty state or portfolio items */}
      {portfolioItems?.length === 0 ? (
        renderEmptyState()
      ) : (
        <View style={styles.portfolioContent}>
          {typesWithItems.map((type) => (
            <View key={type} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                {getPortfolioIcon(type as PortfolioItemTypeEnum, 20)}
                <Text style={textVariants.heading5}>{getTypeName(type)}</Text>
              </View>
              
              <FlatList
                data={groupedItems[type]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <PortfolioItem
                    item={item}
                    onPress={handleViewItem}
                    isEditable={canEdit}
                    onEdit={canEdit ? handleEditItem : undefined}
                    onDelete={canEdit ? handleDeleteItem : undefined}
                  />
                )}
                contentContainerStyle={styles.itemsContainer}
                horizontal={false}
                showsVerticalScrollIndicator={false}
              />
            </View>
          ))}
        </View>
      )}
      
      {/* Portfolio item detail modal */}
      <PortfolioItemDetail
        item={selectedItem}
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        isEditable={canEdit}
        onEdit={canEdit ? handleEditItem : undefined}
        onDelete={canEdit ? handleDeleteItem : undefined}
      />
      
      {/* Add/Edit form modal */}
      <PortfolioItemForm
        item={isEditMode ? selectedItem : undefined}
        visible={formModalVisible}
        onClose={() => setFormModalVisible(false)}
        onSubmit={handleFormSubmit}
      />
    </View>
  );
};

export default PortfolioSection;

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioContent: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  itemsContainer: {
    paddingBottom: 8,
  },
  itemCard: {
    marginBottom: 12,
  },
  itemContent: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemHeader: {
    marginBottom: 4,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  typeText: {
    marginLeft: 4,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  descriptionContainer: {
    marginVertical: 8,
  },
  readMoreButton: {
    marginTop: 4,
  },
  readMoreText: {
    color: colors.primary[600],
    ...textVariants.caption,
  },
  technologiesContainer: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  technologyTag: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  technologyText: {
    color: colors.primary[800],
    ...textVariants.caption,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  editButtons: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    ...textVariants.heading4,
    marginTop: 16,
  },
  emptyStateSubtitle: {
    ...textVariants.paragraphSmall,
    textAlign: 'center',
    marginTop: 8,
    color: colors.text.secondary,
  },
  addButton: {
    marginTop: 16,
  },
  detailScrollView: {
    flex: 1,
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  detailImagePlaceholder: {
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailMetaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  dateRangeContainer: {
    alignItems: 'flex-end',
  },
  descriptionSection: {
    marginVertical: 16,
  },
  detailSection: {
    marginVertical: 16,
  },
  technologiesDetailContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  linksContainer: {
    marginTop: 8,
  },
  linkButton: {
    marginVertical: 4,
  },
  detailActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  editDetailButton: {
    flex: 1,
    marginRight: 8,
  },
  deleteDetailButton: {
    flex: 1,
    marginLeft: 8,
  },
  formScrollView: {
    flex: 1,
  },
  imagePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addImageButton: {
    width: '100%',
    height: 160,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gray[300],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
  },
  addImageText: {
    ...textVariants.paragraphSmall,
    color: colors.primary[600],
    marginTop: 8,
  },
  pickedImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    justifyContent: 'flex-end',
  },
  changeImageButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    alignItems: 'center',
  },
  changeImageText: {
    color: colors.white,
    ...textVariants.button,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    ...textVariants.label,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
    ...textVariants.input,
  },
  textareaInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  errorText: {
    color: colors.error[600],
    ...textVariants.caption,
    marginTop: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  typeOptionSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  typeOptionText: {
    ...textVariants.paragraphSmall,
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  typeOptionTextSelected: {
    color: colors.primary[800],
  },
  techInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  techInput: {
    flex: 1,
    marginRight: 8,
  },
  addTechButton: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTechButtonText: {
    color: colors.white,
    ...textVariants.button,
  },
  techTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  techTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  techTagText: {
    color: colors.white,
    ...textVariants.caption,
    marginRight: 4,
  },
  removeTechButton: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    marginRight: 8,
  },
  submitButton: {}
});