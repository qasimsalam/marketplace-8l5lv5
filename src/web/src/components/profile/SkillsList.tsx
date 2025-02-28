import React, { useState, useEffect } from 'react'; // ^18.2.0
import { Skill, VerificationStatus } from '../../../../backend/shared/src/types/user.types';
import Badge, { BadgeVariant } from '../common/Badge';
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import Input, { InputType } from '../common/Input';
import Select from '../common/Select';
import { FiPlus, FiEdit2, FiTrash2, FiCheck } from 'react-icons/fi'; // ^4.10.1
import { useProfile } from '../../hooks/useProfile';

/**
 * Interface defining props for the SkillsList component
 */
export interface SkillsListProps {
  /**
   * Array of skills to display
   */
  skills: Skill[];
  /**
   * Whether skills can be edited
   */
  editable: boolean;
  /**
   * Callback function when skills are updated
   */
  onUpdate: (skills: Skill[]) => void;
  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * A component that displays and manages a list of AI skills for a user's profile.
 * Allows viewing, adding, editing, and removing skills with their proficiency levels
 * and verification status.
 */
const SkillsList: React.FC<SkillsListProps> = ({
  skills,
  editable,
  onUpdate,
  className = '',
}) => {
  // State for the skill being edited
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  
  // State for showing the skill form
  const [showForm, setShowForm] = useState<boolean>(false);
  
  // State for form validation errors
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    category?: string;
  }>({});
  
  // State for skill form values
  const [skillForm, setSkillForm] = useState<Partial<Skill>>({
    id: '',
    name: '',
    category: '',
    level: 1,
    yearsOfExperience: 1,
    verified: VerificationStatus.UNVERIFIED
  });

  // Access the profile context
  const { freelancerProfile } = useProfile();

  // Skill categories for the select input
  const skillCategories = [
    { value: 'machine_learning', label: 'Machine Learning' },
    { value: 'deep_learning', label: 'Deep Learning' },
    { value: 'natural_language_processing', label: 'Natural Language Processing' },
    { value: 'computer_vision', label: 'Computer Vision' },
    { value: 'reinforcement_learning', label: 'Reinforcement Learning' },
    { value: 'data_science', label: 'Data Science' },
    { value: 'big_data', label: 'Big Data' },
    { value: 'data_engineering', label: 'Data Engineering' },
    { value: 'data_visualization', label: 'Data Visualization' },
    { value: 'ai_ethics', label: 'AI Ethics' },
    { value: 'robotics', label: 'Robotics' },
    { value: 'cloud_ml', label: 'Cloud ML Platforms' },
  ];

  // Initialize proficiency level options (1-10)
  const proficiencyLevels = Array.from({ length: 10 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}`
  }));

  // Initialize years of experience options
  const experienceYears = Array.from({ length: 20 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1} ${i + 1 === 1 ? 'year' : 'years'}`
  }));

  // Initialize form with skill data when editing
  useEffect(() => {
    if (editingSkill) {
      setSkillForm({
        ...editingSkill
      });
      setShowForm(true);
    }
  }, [editingSkill]);

  // Reset form errors when form values change
  useEffect(() => {
    setFormErrors({});
  }, [skillForm]);

  // Handle adding a new skill
  const handleAddSkill = () => {
    setEditingSkill(null);
    setSkillForm({
      id: `temp-${Date.now()}`, // Temporary ID that will be replaced by the backend
      name: '',
      category: skillCategories[0].value,
      level: 1,
      yearsOfExperience: 1,
      verified: VerificationStatus.UNVERIFIED
    });
    setShowForm(true);
  };

  // Handle editing an existing skill
  const handleEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
  };

  // Handle removing a skill
  const handleRemoveSkill = (skillId: string) => {
    const updatedSkills = skills.filter(skill => skill.id !== skillId);
    onUpdate(updatedSkills);
  };

  // Validate form inputs
  const validateForm = (): boolean => {
    const errors: { name?: string; category?: string } = {};
    
    if (!skillForm.name?.trim()) {
      errors.name = 'Skill name is required';
    }
    
    if (!skillForm.category) {
      errors.category = 'Category is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    let updatedSkills: Skill[];
    
    if (editingSkill) {
      // Update existing skill
      updatedSkills = skills.map(skill => 
        skill.id === editingSkill.id ? { ...skill, ...skillForm } as Skill : skill
      );
    } else {
      // Add new skill
      updatedSkills = [...skills, skillForm as Skill];
    }

    onUpdate(updatedSkills);
    setShowForm(false);
    setEditingSkill(null);
    setSkillForm({
      id: '',
      name: '',
      category: '',
      level: 1,
      yearsOfExperience: 1,
      verified: VerificationStatus.UNVERIFIED
    });
  };

  // Update form values on input change
  const handleInputChange = (field: keyof Skill, value: any) => {
    setSkillForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Cancel form editing
  const handleCancel = () => {
    setShowForm(false);
    setEditingSkill(null);
    setFormErrors({});
    setSkillForm({
      id: '',
      name: '',
      category: '',
      level: 1,
      yearsOfExperience: 1,
      verified: VerificationStatus.UNVERIFIED
    });
  };

  // Render badge for verification status
  const renderVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.VERIFIED:
        return (
          <Badge 
            variant={BadgeVariant.SUCCESS} 
            className="ml-2 flex items-center"
          >
            <FiCheck className="mr-1" size={12} />
            Verified
          </Badge>
        );
      case VerificationStatus.PENDING:
        return (
          <Badge variant={BadgeVariant.WARNING} className="ml-2">
            Pending
          </Badge>
        );
      case VerificationStatus.REJECTED:
        return (
          <Badge variant={BadgeVariant.DANGER} className="ml-2">
            Rejected
          </Badge>
        );
      case VerificationStatus.UNVERIFIED:
      default:
        return null;
    }
  };

  // Render proficiency level indicator
  const renderProficiencyLevel = (level: number) => {
    const maxLevel = 10;
    const filledBars = Math.min(level, maxLevel);
    const skillId = `skill-level-${level}-${Math.random().toString(36).substring(2, 9)}`;
    
    return (
      <div className="flex items-center mt-1">
        <div className="text-xs text-gray-600 mr-2" id={skillId}>Proficiency:</div>
        <div 
          className="flex h-2 w-24 bg-gray-200 rounded overflow-hidden"
          role="progressbar"
          aria-valuenow={level}
          aria-valuemin={1}
          aria-valuemax={10}
          aria-labelledby={skillId}
        >
          <div 
            className="h-full bg-primary-500" 
            style={{ width: `${(filledBars / maxLevel) * 100}%` }}
          />
        </div>
        <span className="ml-2 text-xs text-gray-700">{level}/{maxLevel}</span>
      </div>
    );
  };

  return (
    <div className={`skills-list ${className}`}>
      {/* Skills header with add button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Skills</h3>
        {editable && !showForm && (
          <Button 
            variant={ButtonVariant.PRIMARY}
            size={ButtonSize.SMALL}
            onClick={handleAddSkill}
            className="flex items-center"
            ariaLabel="Add new skill"
          >
            <FiPlus className="mr-1" aria-hidden="true" />
            Add Skill
          </Button>
        )}
      </div>

      {/* Skills list */}
      {skills.length > 0 ? (
        <div className="space-y-3" role="list" aria-label="Skills list">
          {skills.map((skill) => (
            <div 
              key={skill.id} 
              className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              role="listitem"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap">
                    <Badge 
                      variant={BadgeVariant.PRIMARY} 
                      className="mr-2 mb-1"
                    >
                      {skill.category}
                    </Badge>
                    <h4 className="font-medium text-gray-900 mb-1">{skill.name}</h4>
                    {renderVerificationBadge(skill.verified)}
                  </div>
                  {renderProficiencyLevel(skill.level)}
                  <div className="text-sm text-gray-600 mt-1">
                    {skill.yearsOfExperience} {skill.yearsOfExperience === 1 ? 'year' : 'years'} of experience
                  </div>
                </div>

                {/* Action buttons for editable mode */}
                {editable && !showForm && (
                  <div className="flex space-x-2">
                    <Button 
                      variant={ButtonVariant.GHOST}
                      size={ButtonSize.SMALL}
                      onClick={() => handleEditSkill(skill)}
                      ariaLabel={`Edit ${skill.name}`}
                    >
                      <FiEdit2 className="text-gray-500" aria-hidden="true" />
                    </Button>
                    <Button 
                      variant={ButtonVariant.GHOST}
                      size={ButtonSize.SMALL}
                      onClick={() => handleRemoveSkill(skill.id)}
                      ariaLabel={`Remove ${skill.name}`}
                    >
                      <FiTrash2 className="text-red-500" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div 
          className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300"
          role="status"
          aria-live="polite"
        >
          <p className="text-gray-500">
            No skills added yet.
            {editable && !showForm && (
              <span className="ml-1">
                Click the "Add Skill" button to add your first skill.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Add/Edit skill form */}
      {showForm && (
        <div 
          className="mt-4 p-4 border border-gray-300 rounded-lg bg-gray-50"
          role="form"
          aria-labelledby="skill-form-title"
        >
          <h4 className="text-lg font-medium mb-3" id="skill-form-title">
            {editingSkill ? 'Edit Skill' : 'Add New Skill'}
          </h4>
          <div className="space-y-4">
            <div>
              <label htmlFor="skill-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <Select
                options={skillCategories}
                value={skillForm.category}
                onChange={(value) => handleInputChange('category', value)}
                placeholder="Select a category"
                error={formErrors.category}
                name="skill-category"
                required
              />
            </div>
            
            <div>
              <label htmlFor="skill-name" className="block text-sm font-medium text-gray-700 mb-1">
                Skill Name
              </label>
              <Input
                type={InputType.TEXT}
                value={skillForm.name as string || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter skill name"
                error={formErrors.name}
                name="skill-name"
                required
              />
            </div>
            
            <div>
              <label htmlFor="skill-years" className="block text-sm font-medium text-gray-700 mb-1">
                Years of Experience
              </label>
              <Select
                options={experienceYears}
                value={String(skillForm.yearsOfExperience)}
                onChange={(value) => handleInputChange('yearsOfExperience', parseInt(value, 10))}
                placeholder="Select years of experience"
                name="skill-years"
              />
            </div>
            
            <div>
              <label htmlFor="skill-level" className="block text-sm font-medium text-gray-700 mb-1">
                Proficiency Level (1-10)
              </label>
              <Select
                options={proficiencyLevels}
                value={String(skillForm.level)}
                onChange={(value) => handleInputChange('level', parseInt(value, 10))}
                placeholder="Select proficiency level"
                name="skill-level"
              />
            </div>
            
            <div className="flex space-x-3 pt-2">
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={handleSubmit}
                ariaLabel={editingSkill ? 'Update skill' : 'Add skill'}
              >
                {editingSkill ? 'Update Skill' : 'Add Skill'}
              </Button>
              <Button
                variant={ButtonVariant.OUTLINE}
                onClick={handleCancel}
                ariaLabel="Cancel"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillsList;