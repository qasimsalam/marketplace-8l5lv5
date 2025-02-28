import React, { useEffect } from 'react'; // ^18.2.0
import { useState } from 'react'; // ^18.2.0
import { useRouter } from 'next/navigation'; // ^13.4.0
import Link from 'next/link'; // ^13.4.0
import { FiEdit } from 'react-icons/fi'; // ^4.10.1

import { ProfileCard } from '../../../components/profile/ProfileCard';
import { PortfolioSection } from '../../../components/profile/PortfolioSection';
import { SkillsList } from '../../../components/profile/SkillsList';
import { Button, ButtonVariant, ButtonSize } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { Spinner } from '../../../components/common/Spinner';
import { useProfile } from '../../../hooks/useProfile';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { ProfileType, FreelancerProfile, CompanyProfile } from '../../../types/profile';
import { UserRole } from '../../../../backend/shared/src/types/user.types';

/**
 * Main page component that displays the user's profile information
 *
 * @returns {JSX.Element} The rendered profile page
 */
const ProfilePage: React.FC = () => {
  // Use the useAuth hook to get current user and authentication status
  const { user, isAuthenticated } = useAuth();

  // Use the useProfile hook to fetch the user's profile data
  const { freelancerProfile, companyProfile, isLoading, getFreelancerProfile, getCompanyProfile } = useProfile();

  // Use the useToast hook for displaying notifications
  const { showToast } = useToast();

  // Use the useRouter hook for navigation
  const router = useRouter();

  // Determine profile type based on user role (FREELANCER or EMPLOYER)
  const profileType = user?.role === UserRole.FREELANCER ? ProfileType.FREELANCER : ProfileType.COMPANY;

  // Use useState to track loading state while fetching profile data
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Use useEffect to fetch profile data when component mounts
  useEffect(() => {
    // Load freelancer or company profile based on the determined profile type
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        if (profileType === ProfileType.FREELANCER) {
          if (user) {
            await getFreelancerProfile();
          }
        } else {
          if (user) {
            await getCompanyProfile();
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile', 'error');
      } finally {
        setLoadingProfile(false);
      }
    };

    // Handle unauthorized access by redirecting to login page
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadProfile();
  }, [isAuthenticated, router, getFreelancerProfile, getCompanyProfile, profileType, user, showToast]);

  // Display a Spinner component while profile data is loading
  if (isLoading || loadingProfile) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Render a header section with title and edit profile button */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {profileType === ProfileType.FREELANCER ? 'Freelancer Profile' : 'Company Profile'}
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link href="/profile/edit" passHref>
            <Button variant={ButtonVariant.PRIMARY} size={ButtonSize.MEDIUM} ariaLabel="Edit profile">
              <FiEdit className="mr-2" />
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6">
        {/* Render the ProfileCard component with user's basic information */}
        <Card>
          <ProfileCard
            profileId={user?.id || ''}
            profileType={profileType}
          />
        </Card>

        {/* For freelancer profiles, render the SkillsList component with AI/ML skills */}
        {profileType === ProfileType.FREELANCER && freelancerProfile && (
          <Card>
            <SkillsList
              skills={freelancerProfile.skills}
              editable={true}
              onUpdate={() => {
                // TODO: Implement skill update logic
                showToast('Skills updated successfully!', 'success');
              }}
            />
          </Card>
        )}

        {/* For freelancer profiles, render the PortfolioSection component with portfolio items */}
        {profileType === ProfileType.FREELANCER && (
          <PortfolioSection
            profileId={user?.id || ''}
            editable={true}
          />
        )}

        {/* For company profiles, render relevant company information sections */}
        {profileType === ProfileType.COMPANY && companyProfile && (
          <>
            {/* TODO: Implement company-specific sections */}
            <Card>
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900">Company Details</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {companyProfile.description}
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

// Export the ProfilePage component as the default export for Next.js routing
export default ProfilePage;