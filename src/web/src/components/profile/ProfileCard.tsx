import React, { useState, useEffect } from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^1.2.1
import { FaCheckCircle, FaExclamationTriangle, FaStar, FaGithub, FaLinkedin, FaGlobe, FaKaggle } from 'react-icons/fa'; // ^4.8.0
import Link from 'next/link'; // ^13.4.0

import Card, { CardVariant, CardElevation } from '../common/Card';
import Avatar, { AvatarSize } from '../common/Avatar';
import Badge, { BadgeVariant } from '../common/Badge';
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import SkillsList from './SkillsList';

import { FreelancerProfile, CompanyProfile, ProfileType, VerificationStatus } from '../../types/profile';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/format';

/**
 * Props for the ProfileCard component
 */
export interface ProfileCardProps {
  /**
   * ID of the profile to display
   */
  profileId: string;
  
  /**
   * Type of profile (FREELANCER or COMPANY)
   */
  profileType: ProfileType;
  
  /**
   * Whether this is a preview display of the profile
   */
  isPreview?: boolean;
  
  /**
   * Additional CSS classes to apply
   */
  className?: string;
  
  /**
   * Handler for contact button click
   */
  onContact?: () => void;
  
  /**
   * Handler for schedule interview button click
   */
  onSchedule?: () => void;
  
  /**
   * Handler for download CV button click
   */
  onDownloadCV?: () => void;
}

/**
 * Returns the appropriate badge component for the given verification status
 * 
 * @param status Verification status to display
 * @returns Badge component with appropriate styling
 */
const getVerificationBadge = (status: VerificationStatus): JSX.Element => {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return (
        <Badge 
          variant={BadgeVariant.SUCCESS} 
          className="flex items-center space-x-1"
        >
          <FaCheckCircle size={12} />
          <span>Verified</span>
        </Badge>
      );
    case VerificationStatus.PENDING:
      return (
        <Badge 
          variant={BadgeVariant.WARNING}
          className="flex items-center space-x-1"
        >
          <FaExclamationTriangle size={12} />
          <span>Pending</span>
        </Badge>
      );
    case VerificationStatus.REJECTED:
      return (
        <Badge 
          variant={BadgeVariant.DANGER}
          className="flex items-center space-x-1"
        >
          <FaExclamationTriangle size={12} />
          <span>Rejected</span>
        </Badge>
      );
    default:
      return (
        <Badge 
          variant={BadgeVariant.SECONDARY}
          className="flex items-center space-x-1"
        >
          <span>Unverified</span>
        </Badge>
      );
  }
};

/**
 * A React component that displays a user's profile information in a card layout
 * for the AI Talent Marketplace. Shows key details like name, title, skills,
 * verification status, and ratings for either freelancer or company profiles.
 */
export const ProfileCard: React.FC<ProfileCardProps> = ({
  profileId,
  profileType,
  isPreview = false,
  className = '',
  onContact,
  onSchedule,
  onDownloadCV
}) => {
  // Get profile data using useProfile hook
  const { 
    freelancerProfile, 
    companyProfile, 
    viewedProfile,
    isLoading, 
    getFreelancerProfile, 
    getCompanyProfile,
    error
  } = useProfile();
  
  // Get current authenticated user
  const { user } = useAuth();
  
  // State to track profile loading
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  // State to track error in fetching profile
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // Determine if the profile is the current user's profile
  const isOwnProfile = user && (
    (profileType === ProfileType.FREELANCER && freelancerProfile?.id === profileId) ||
    (profileType === ProfileType.COMPANY && companyProfile?.id === profileId)
  );
  
  // Fetch profile data on component mount or when profileId/type changes
  useEffect(() => {
    const loadProfile = async () => {
      if (!profileId) return;
      
      setIsLoadingProfile(true);
      setProfileError(null);
      
      try {
        if (profileType === ProfileType.FREELANCER) {
          await getFreelancerProfile(profileId);
        } else {
          await getCompanyProfile(profileId);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setProfileError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    // Only load the profile if it's not already loaded or if the profileId changes
    if (
      profileType === ProfileType.FREELANCER && 
      (!freelancerProfile || freelancerProfile.id !== profileId)
    ) {
      loadProfile();
    } else if (
      profileType === ProfileType.COMPANY && 
      (!companyProfile || companyProfile.id !== profileId)
    ) {
      loadProfile();
    }
  }, [profileId, profileType, freelancerProfile, companyProfile, getFreelancerProfile, getCompanyProfile]);
  
  // Determine which profile to display
  const profile = profileType === ProfileType.FREELANCER
    ? (viewedProfile as FreelancerProfile || freelancerProfile)
    : (viewedProfile as CompanyProfile || companyProfile);
  
  // Handle loading state with skeleton UI
  if (isLoading || isLoadingProfile) {
    return (
      <Card 
        className={clsx("animate-pulse", className)}
        elevation={CardElevation.LOW}
        testId="profile-card-loading"
      >
        {/* Header skeleton */}
        <div className="h-24 bg-gray-200"></div>
        <div className="px-6 pb-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-12 mb-4">
            <div className="h-24 w-24 rounded-full bg-gray-300 border-4 border-white"></div>
            <div className="mt-4 sm:mt-0 sm:ml-5 text-center sm:text-left">
              <div className="h-6 bg-gray-300 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-32"></div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <div className="h-5 w-20 bg-gray-300 rounded-full"></div>
            <div className="h-5 w-20 bg-gray-300 rounded-full"></div>
          </div>
        </div>
        
        {/* Body skeleton */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div className="h-5 bg-gray-300 rounded w-24"></div>
            <div className="h-6 bg-gray-300 rounded w-24"></div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-5/6"></div>
          </div>
          <div className="mb-4">
            <div className="h-5 bg-gray-300 rounded w-24 mb-2"></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-8 bg-gray-300 rounded"></div>
              <div className="h-8 bg-gray-300 rounded"></div>
              <div className="h-8 bg-gray-300 rounded"></div>
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-5 bg-gray-300 rounded w-24 mb-1"></div>
            <div className="h-4 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-full"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          </div>
        </div>
      </Card>
    );
  }
  
  // Handle error state
  if (profileError || error) {
    return (
      <Card 
        className={className}
        elevation={CardElevation.LOW}
        variant={CardVariant.DANGER}
        testId="profile-card-error"
      >
        <div className="p-4 text-center">
          <p className="text-red-600">
            {profileError || error || 'Error loading profile'}
          </p>
        </div>
      </Card>
    );
  }
  
  // Handle case where profile is not found
  if (!profile) {
    return (
      <Card 
        className={className}
        elevation={CardElevation.LOW}
        testId="profile-card-not-found"
      >
        <div className="p-4 text-center">
          <p className="text-gray-500">Profile not found</p>
        </div>
      </Card>
    );
  }
  
  // Render Freelancer Profile
  if (profileType === ProfileType.FREELANCER) {
    const freelancer = profile as FreelancerProfile;
    
    return (
      <Card
        className={clsx("overflow-hidden", className)}
        elevation={isPreview ? CardElevation.MEDIUM : CardElevation.LOW}
        bordered
        testId="freelancer-profile-card"
      >
        {/* Header */}
        <div className="relative">
          {/* Profile header background */}
          <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          {/* Avatar and name section */}
          <div className="px-6 pb-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-12 mb-4">
              <Avatar
                src={freelancer.avatarUrl}
                firstName={freelancer.firstName}
                lastName={freelancer.lastName}
                size={AvatarSize.XLARGE}
                className="border-4 border-white shadow-sm"
                alt={`${freelancer.firstName} ${freelancer.lastName}'s profile picture`}
              />
              
              <div className="mt-4 sm:mt-0 sm:ml-5 text-center sm:text-left">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  {freelancer.firstName} {freelancer.lastName}
                  {freelancer.isTopRated && (
                    <span className="ml-2 text-yellow-500" title="Top Rated">
                      <FaStar aria-label="Top Rated" />
                    </span>
                  )}
                </h2>
                <p className="text-gray-600">{freelancer.title}</p>
              </div>
            </div>
            
            {/* Verification badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">Identity:</span>
                {getVerificationBadge(freelancer.identityVerified)}
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">Skills:</span>
                {getVerificationBadge(freelancer.skillsVerified)}
              </div>
            </div>
          </div>
        </div>
        
        {/* Body */}
        <div className="px-6 py-4 border-t border-gray-200">
          {/* Hourly rate */}
          <div className="flex justify-between items-center mb-4">
            <span className="font-medium text-gray-700">Hourly Rate</span>
            <span className="text-xl font-bold text-green-600">
              {formatCurrency(freelancer.hourlyRate)}/hr
            </span>
          </div>
          
          {/* Location and availability */}
          <div className="mb-4">
            <div className="text-gray-700 mb-1">
              <span className="font-medium">Location:</span> {freelancer.location}
            </div>
            <div className="text-gray-700">
              <span className="font-medium">Availability:</span> {freelancer.availability}
            </div>
          </div>
          
          {/* Skills */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2">Expertise</h3>
            <SkillsList 
              skills={freelancer.skills}
              editable={false}
              onUpdate={() => {}}
            />
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-xl font-semibold">{freelancer.totalJobs}</div>
              <div className="text-gray-500 text-sm">Jobs</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold">{freelancer.rating.toFixed(1)}</div>
              <div className="text-gray-500 text-sm">Rating</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-semibold">{freelancer.experienceYears}</div>
              <div className="text-gray-500 text-sm">Years</div>
            </div>
          </div>
          
          {/* Bio */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2">About</h3>
            <p className="text-gray-600">
              {isPreview 
                ? freelancer.bio.substring(0, 150) + (freelancer.bio.length > 150 ? '...' : '')
                : freelancer.bio
              }
            </p>
          </div>
          
          {/* Links */}
          <div className="flex flex-wrap gap-3 mb-4">
            {freelancer.githubUrl && (
              <Link 
                href={freelancer.githubUrl} 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-indigo-600 transition-colors"
                aria-label="GitHub Profile"
              >
                <FaGithub size={24} />
              </Link>
            )}
            {freelancer.linkedinUrl && (
              <Link 
                href={freelancer.linkedinUrl} 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-blue-600 transition-colors"
                aria-label="LinkedIn Profile"
              >
                <FaLinkedin size={24} />
              </Link>
            )}
            {freelancer.kaggleUrl && (
              <Link 
                href={freelancer.kaggleUrl} 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-blue-400 transition-colors"
                aria-label="Kaggle Profile"
              >
                <FaKaggle size={24} />
              </Link>
            )}
            {freelancer.website && (
              <Link 
                href={freelancer.website} 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-green-600 transition-colors"
                aria-label="Personal Website"
              >
                <FaGlobe size={24} />
              </Link>
            )}
          </div>
        </div>
        
        {/* Actions */}
        {!isOwnProfile && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-3">
              {onContact && (
                <Button
                  variant={ButtonVariant.PRIMARY}
                  onClick={onContact}
                  ariaLabel="Contact this freelancer"
                >
                  Contact
                </Button>
              )}
              {onDownloadCV && (
                <Button
                  variant={ButtonVariant.OUTLINE}
                  onClick={onDownloadCV}
                  ariaLabel="Download CV"
                >
                  Download CV
                </Button>
              )}
              {onSchedule && (
                <Button
                  variant={ButtonVariant.SECONDARY}
                  onClick={onSchedule}
                  ariaLabel="Schedule an interview"
                >
                  Schedule Interview
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  }
  
  // Render Company Profile
  const company = profile as CompanyProfile;
  
  return (
    <Card
      className={clsx("overflow-hidden", className)}
      elevation={isPreview ? CardElevation.MEDIUM : CardElevation.LOW}
      bordered
      testId="company-profile-card"
    >
      {/* Header */}
      <div className="relative">
        {/* Profile header background */}
        <div className="h-24 bg-gradient-to-r from-gray-700 to-gray-900"></div>
        
        {/* Logo and name section */}
        <div className="px-6 pb-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-12 mb-4">
            <Avatar
              src={company.logoUrl}
              firstName={company.name.charAt(0)}
              lastName=""
              size={AvatarSize.XLARGE}
              className="border-4 border-white shadow-sm"
              alt={`${company.name} logo`}
            />
            
            <div className="mt-4 sm:mt-0 sm:ml-5 text-center sm:text-left">
              <h2 className="text-xl font-bold text-gray-900">
                {company.name}
              </h2>
              <p className="text-gray-600">{company.industry}</p>
            </div>
          </div>
          
          {/* Verification badge */}
          <div className="flex flex-wrap gap-2 mt-2">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 mr-2">Verification:</span>
              {getVerificationBadge(company.verified)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Body */}
      <div className="px-6 py-4 border-t border-gray-200">
        {/* Location and company size */}
        <div className="mb-4">
          <div className="text-gray-700 mb-1">
            <span className="font-medium">Location:</span> {company.location}
          </div>
          <div className="text-gray-700 mb-1">
            <span className="font-medium">Company Size:</span> {company.size}
          </div>
          <div className="text-gray-700">
            <span className="font-medium">Founded:</span> {new Date(company.foundedDate).getFullYear()}
          </div>
        </div>
        
        {/* Description */}
        <div className="mb-4">
          <h3 className="font-medium text-gray-700 mb-2">About</h3>
          <p className="text-gray-600">
            {isPreview 
              ? company.description.substring(0, 150) + (company.description.length > 150 ? '...' : '')
              : company.description
            }
          </p>
        </div>
        
        {/* AI Interests */}
        <div className="mb-4">
          <h3 className="font-medium text-gray-700 mb-2">AI Interests</h3>
          <div className="flex flex-wrap gap-2">
            {company.aiInterests.map((interest, index) => (
              <Badge 
                key={index}
                variant={BadgeVariant.PRIMARY}
              >
                {interest}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Previous AI Projects */}
        {company.previousAiProjects && company.previousAiProjects.length > 0 && (
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2">Previous AI Projects</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              {company.previousAiProjects.map((project, index) => (
                <li key={index}>{project}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Rating if available */}
        {company.rating > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl font-semibold flex items-center justify-center">
                  {company.rating.toFixed(1)}
                  <FaStar className="text-yellow-500 ml-1" aria-hidden="true" />
                </div>
                <div className="text-gray-500 text-sm">Company Rating</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Links */}
        <div className="flex flex-wrap gap-3 mb-4">
          {company.website && (
            <Link 
              href={company.website} 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-blue-600 transition-colors"
              aria-label="Company Website"
            >
              <FaGlobe size={24} />
            </Link>
          )}
        </div>
      </div>
      
      {/* Actions */}
      {!isOwnProfile && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-3">
            {onContact && (
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={onContact}
                ariaLabel="Contact this company"
              >
                Contact
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProfileCard;