import { device, element, expect, by, waitFor } from 'detox'; // ^20.0.0
import { 
  FreelancerProfile, 
  AvailabilityStatus, 
  ProfileFormValues, 
  PortfolioItemFormValues,
  PortfolioItemType 
} from '../src/types/profile.types';

// Test data constants
const TEST_PROFILE_DATA: Partial<ProfileFormValues> = {
  title: 'AI/ML Engineer',
  bio: 'Experienced machine learning engineer specializing in NLP and computer vision models.',
  hourlyRate: 120,
  skills: ['Machine Learning', 'Computer Vision', 'NLP', 'PyTorch', 'TensorFlow'],
  availability: AvailabilityStatus.AVAILABLE,
  githubUrl: 'https://github.com/aimlexpert'
};

const TEST_PORTFOLIO_ITEM: Partial<PortfolioItemFormValues> = {
  title: 'Recommendation Engine',
  description: 'Built an AI recommendation system using collaborative filtering',
  technologies: ['Python', 'TensorFlow', 'AWS'],
  type: PortfolioItemType.PROJECT
};

const UPDATED_PROFILE_DATA: Partial<ProfileFormValues> = {
  title: 'Senior AI Engineer',
  bio: 'Expert in deep learning and neural networks with 8+ years of experience',
  hourlyRate: 150,
  availability: AvailabilityStatus.PARTIALLY_AVAILABLE
};

describe('Profile Functionality Tests', () => {
  // Setup: Launch app and login with test user before all tests
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await device.reloadReactNative();
    
    // Login with test user credentials
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    
    // Wait for home screen to load
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Navigate to profile screen
    await navigateToProfileScreen();
  });

  // Cleanup: Logout after all tests are complete
  afterAll(async () => {
    // Navigate to settings and logout
    await element(by.id('settings-tab')).tap();
    await element(by.id('logout-button')).tap();
    await element(by.text('Confirm')).tap();
  });

  // Ensure we start from profile screen before each test
  beforeEach(async () => {
    // Always start from profile screen
    await navigateToProfileScreen();
  });

  // Test suite for viewing profile functionality
  describe('View Profile Functionality', () => {
    test('Profile screen loads with all sections visible', async () => {
      // Verify main profile screen components are visible
      await expect(element(by.id('profile-screen'))).toBeVisible();
      await expect(element(by.id('profile-header-section'))).toBeVisible();
      await expect(element(by.id('skills-section'))).toBeVisible();
      await expect(element(by.id('portfolio-section'))).toBeVisible();
      await expect(element(by.id('verification-section'))).toBeVisible();
    });

    test('User name and title are displayed correctly', async () => {
      // Verify name and title display
      await expect(element(by.id('profile-name'))).toBeVisible();
      await expect(element(by.id('profile-title'))).toBeVisible();
      await expect(element(by.id('profile-title'))).toHaveText(TEST_PROFILE_DATA.title);
    });

    test('Hourly rate is displayed correctly', async () => {
      // Verify hourly rate display
      await expect(element(by.id('hourly-rate'))).toBeVisible();
      await expect(element(by.id('hourly-rate'))).toHaveText(`$${TEST_PROFILE_DATA.hourlyRate}/hr`);
    });

    test('Skills section displays correctly with proficiency levels', async () => {
      // Verify skills section and individual skills
      await expect(element(by.id('skills-section'))).toBeVisible();
      
      // Check that all test skills are visible
      for (const skill of TEST_PROFILE_DATA.skills!) {
        await expect(element(by.text(skill))).toBeVisible();
      }
      
      // Check that skill proficiency bars are visible
      await expect(element(by.id('skill-level-indicator'))).toBeVisible();
    });

    test('Verification badges display with correct status', async () => {
      // Verify verification section and badges
      await expect(element(by.id('verification-section'))).toBeVisible();
      await expect(element(by.id('identity-verification-badge'))).toBeVisible();
      await expect(element(by.id('skills-verification-badge'))).toBeVisible();
    });

    test('Portfolio items are listed correctly', async () => {
      // Verify portfolio section
      await expect(element(by.id('portfolio-section'))).toBeVisible();
      
      // Scroll to portfolio section if needed
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      
      // Check for portfolio item list
      await expect(element(by.id('portfolio-item-list'))).toBeVisible();
    });

    test('Availability status is displayed correctly', async () => {
      // Verify availability status display
      await expect(element(by.id('availability-status'))).toBeVisible();
      await expect(element(by.id('availability-status'))).toHaveText(TEST_PROFILE_DATA.availability);
    });

    test('Profile screen has proper scroll behavior and responsiveness', async () => {
      // Test scrolling down
      await element(by.id('profile-scroll-view')).scroll(500, 'down');
      
      // Verify bottom sections are visible after scrolling
      await expect(element(by.id('portfolio-section'))).toBeVisible();
      
      // Test scrolling back up
      await element(by.id('profile-scroll-view')).scroll(500, 'up');
      
      // After scrolling up, header should be visible again
      await expect(element(by.id('profile-header-section'))).toBeVisible();
      
      // Verify responsive layout by rotating device
      await device.setOrientation('landscape');
      
      // Check that layout adjusts properly in landscape
      await expect(element(by.id('profile-screen'))).toBeVisible();
      
      // Return to portrait for other tests
      await device.setOrientation('portrait');
    });

    test('Action buttons are visible and tappable', async () => {
      // Verify all action buttons are present
      await expect(element(by.id('edit-profile-button'))).toBeVisible();
      await expect(element(by.id('share-profile-button'))).toBeVisible();
      await expect(element(by.id('contact-button'))).toBeVisible();
      
      // Test that edit button navigates to edit screen
      await element(by.id('edit-profile-button')).tap();
      await expect(element(by.id('edit-profile-screen'))).toBeVisible();
      
      // Return to profile screen
      await element(by.id('back-button')).tap();
    });
  });

  // Test suite for profile editing functionality
  describe('Edit Profile Functionality', () => {
    test('Navigate to edit profile screen', async () => {
      // Navigate to edit profile screen and verify it loads
      await navigateToEditProfileScreen();
      await expect(element(by.id('edit-profile-screen'))).toBeVisible();
    });

    test('Existing profile data is pre-filled in form fields', async () => {
      // Navigate to edit screen
      await navigateToEditProfileScreen();
      
      // Check pre-filled values match test data
      await expect(element(by.id('title-input'))).toHaveText(TEST_PROFILE_DATA.title);
      await expect(element(by.id('bio-input'))).toHaveText(TEST_PROFILE_DATA.bio);
      await expect(element(by.id('hourly-rate-input'))).toHaveText(TEST_PROFILE_DATA.hourlyRate?.toString());
      
      // Check that availability status is selected correctly
      await expect(element(by.id(`availability-${TEST_PROFILE_DATA.availability}`))).toBeChecked();
    });

    test('Update profile title and bio', async () => {
      // Navigate to edit screen
      await navigateToEditProfileScreen();
      
      // Clear and update title
      await element(by.id('title-input')).clearText();
      await element(by.id('title-input')).typeText(UPDATED_PROFILE_DATA.title!);
      
      // Clear and update bio
      await element(by.id('bio-input')).clearText();
      await element(by.id('bio-input')).typeText(UPDATED_PROFILE_DATA.bio!);
      
      // Save changes
      await element(by.id('save-profile-button')).tap();
      
      // Wait for save to complete and return to profile
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Verify changes on profile screen
      await expect(element(by.id('profile-title'))).toHaveText(UPDATED_PROFILE_DATA.title);
      await expect(element(by.id('profile-bio'))).toHaveText(UPDATED_PROFILE_DATA.bio);
    });

    test('Change hourly rate', async () => {
      // Navigate to edit screen
      await navigateToEditProfileScreen();
      
      // Clear and update hourly rate
      await element(by.id('hourly-rate-input')).clearText();
      await element(by.id('hourly-rate-input')).typeText(UPDATED_PROFILE_DATA.hourlyRate!.toString());
      
      // Save changes
      await element(by.id('save-profile-button')).tap();
      
      // Wait for save to complete
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Verify changes on profile screen
      await expect(element(by.id('hourly-rate'))).toHaveText(`$${UPDATED_PROFILE_DATA.hourlyRate}/hr`);
    });

    test('Add and remove skills', async () => {
      // Navigate to edit screen
      await navigateToEditProfileScreen();
      
      // Tap to open skills selection modal
      await element(by.id('edit-skills-button')).tap();
      
      // Add a new skill
      await element(by.id('add-skill-button')).tap();
      await element(by.id('skill-input')).typeText('Deep Reinforcement Learning');
      await element(by.id('skill-level-slider')).adjustSliderToPosition(0.8);
      await element(by.id('add-skill-confirm-button')).tap();
      
      // Remove an existing skill
      await element(by.id('remove-skill-PyTorch')).tap();
      
      // Save skills changes
      await element(by.id('save-skills-button')).tap();
      
      // Save profile changes
      await element(by.id('save-profile-button')).tap();
      
      // Wait for save to complete
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Navigate to skills section
      await element(by.id('skills-section')).scrollTo('visible');
      
      // Verify new skill appears and removed skill is gone
      await expect(element(by.text('Deep Reinforcement Learning'))).toBeVisible();
      await expect(element(by.text('PyTorch'))).not.toBeVisible();
    });

    test('Change availability status', async () => {
      // Navigate to edit screen
      await navigateToEditProfileScreen();
      
      // Change availability status
      await element(by.id(`availability-${UPDATED_PROFILE_DATA.availability}`)).tap();
      
      // Save changes
      await element(by.id('save-profile-button')).tap();
      
      // Wait for save to complete
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Verify changes on profile screen
      await expect(element(by.id('availability-status'))).toHaveText(UPDATED_PROFILE_DATA.availability);
    });

    test('Add and edit social media links', async () => {
      // Navigate to edit screen
      await navigateToEditProfileScreen();
      
      // Update GitHub URL
      await element(by.id('github-url-input')).clearText();
      await element(by.id('github-url-input')).typeText('https://github.com/ai-expert-updated');
      
      // Add LinkedIn URL
      await element(by.id('linkedin-url-input')).clearText();
      await element(by.id('linkedin-url-input')).typeText('https://linkedin.com/in/ai-expert');
      
      // Save changes
      await element(by.id('save-profile-button')).tap();
      
      // Wait for save to complete
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Scroll to see social links
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      
      // Verify links are visible
      await expect(element(by.id('github-link'))).toBeVisible();
      await expect(element(by.id('linkedin-link'))).toBeVisible();
    });

    test('Avatar image selection and upload', async () => {
      // Navigate to edit screen
      await navigateToEditProfileScreen();
      
      // Tap avatar edit button
      await element(by.id('edit-avatar-button')).tap();
      
      // Expect image picker to appear
      await expect(element(by.id('image-picker'))).toBeVisible();
      
      // Note: Can't fully test image selection in Detox, so we just verify UI flow
      // Cancel image picker for the test to continue
      await element(by.id('cancel-button')).tap();
      
      // Go back to profile screen
      await element(by.id('back-button')).tap();
    });

    test('Form validation for required fields', async () => {
      // Navigate to edit screen
      await navigateToEditProfileScreen();
      
      // Clear required fields
      await element(by.id('title-input')).clearText();
      await element(by.id('bio-input')).clearText();
      
      // Try to save
      await element(by.id('save-profile-button')).tap();
      
      // Expect error messages for required fields
      await expect(element(by.text('Title is required'))).toBeVisible();
      await expect(element(by.text('Bio is required'))).toBeVisible();
      
      // Fill in required fields to fix errors
      await element(by.id('title-input')).typeText(TEST_PROFILE_DATA.title!);
      await element(by.id('bio-input')).typeText(TEST_PROFILE_DATA.bio!);
      
      // Try to save again
      await element(by.id('save-profile-button')).tap();
      
      // Should return to profile screen
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    test('Validation for hourly rate field (numeric value)', async () => {
      // Navigate to edit screen
      await navigateToEditProfileScreen();
      
      // Enter non-numeric value for hourly rate
      await element(by.id('hourly-rate-input')).clearText();
      await element(by.id('hourly-rate-input')).typeText('abc');
      
      // Try to save
      await element(by.id('save-profile-button')).tap();
      
      // Expect error message for numeric validation
      await expect(element(by.text('Hourly rate must be a number'))).toBeVisible();
      
      // Fix the field with valid input
      await element(by.id('hourly-rate-input')).clearText();
      await element(by.id('hourly-rate-input')).typeText('125');
      
      // Try to save again
      await element(by.id('save-profile-button')).tap();
      
      // Should return to profile screen
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    test('URL validation for website and social media links', async () => {
      // Navigate to edit screen
      await navigateToEditProfileScreen();
      
      // Enter invalid URL format
      await element(by.id('github-url-input')).clearText();
      await element(by.id('github-url-input')).typeText('invalid-url');
      
      // Try to save
      await element(by.id('save-profile-button')).tap();
      
      // Expect error message for URL validation
      await expect(element(by.text('Please enter a valid URL'))).toBeVisible();
      
      // Fix the invalid URL
      await element(by.id('github-url-input')).clearText();
      await element(by.id('github-url-input')).typeText('https://github.com/aimlexpert');
      
      // Try to save again
      await element(by.id('save-profile-button')).tap();
      
      // Should return to profile screen
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    test('Cancellation with confirmation dialog', async () => {
      // Navigate to edit screen
      await navigateToEditProfileScreen();
      
      // Make some changes
      await element(by.id('title-input')).clearText();
      await element(by.id('title-input')).typeText('Changed Title');
      
      // Tap cancel button
      await element(by.id('cancel-button')).tap();
      
      // Confirmation dialog should appear
      await expect(element(by.text('Discard changes?'))).toBeVisible();
      
      // Confirm cancellation
      await element(by.text('Discard')).tap();
      
      // Should return to profile screen without saving changes
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Verify title was not changed
      await expect(element(by.id('profile-title'))).not.toHaveText('Changed Title');
    });
  });

  // Test suite for portfolio item management
  describe('Portfolio Management', () => {
    test('Navigate to add portfolio item screen', async () => {
      // Navigate to add portfolio screen
      await navigateToAddPortfolioScreen();
      
      // Verify screen loaded
      await expect(element(by.id('add-portfolio-screen'))).toBeVisible();
    });

    test('Add a new portfolio item with all fields', async () => {
      // Navigate to add portfolio screen
      await navigateToAddPortfolioScreen();
      
      // Fill portfolio item form with test data
      await fillPortfolioItemForm(TEST_PORTFOLIO_ITEM);
      
      // Save the portfolio item
      await element(by.id('save-portfolio-button')).tap();
      
      // Wait for save to complete
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Verify item appears in portfolio list
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      await expect(element(by.text(TEST_PORTFOLIO_ITEM.title!))).toBeVisible();
    });

    test('Portfolio item form validation', async () => {
      // Navigate to add portfolio screen
      await navigateToAddPortfolioScreen();
      
      // Try to save without filling required fields
      await element(by.id('save-portfolio-button')).tap();
      
      // Expect error messages for required fields
      await expect(element(by.text('Title is required'))).toBeVisible();
      await expect(element(by.text('Description is required'))).toBeVisible();
      
      // Fill required fields
      await element(by.id('portfolio-title-input')).typeText(TEST_PORTFOLIO_ITEM.title!);
      await element(by.id('portfolio-description-input')).typeText(TEST_PORTFOLIO_ITEM.description!);
      
      // Try to save again
      await element(by.id('save-portfolio-button')).tap();
      
      // Should return to profile screen
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    test('Upload portfolio item images', async () => {
      // Navigate to add portfolio screen
      await navigateToAddPortfolioScreen();
      
      // Tap image upload button
      await element(by.id('upload-image-button')).tap();
      
      // Verify image picker appears
      await expect(element(by.id('image-picker'))).toBeVisible();
      
      // Cancel image picker to continue test
      await element(by.id('cancel-button')).tap();
      
      // Fill other required fields and save
      await fillPortfolioItemForm(TEST_PORTFOLIO_ITEM);
      await element(by.id('save-portfolio-button')).tap();
      
      // Verify return to profile screen
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    test('Edit an existing portfolio item', async () => {
      // Navigate to profile and scroll to portfolio section
      await navigateToProfileScreen();
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      
      // Tap on the portfolio item to edit
      await element(by.text(TEST_PORTFOLIO_ITEM.title!)).tap();
      
      // Tap edit button
      await element(by.id('edit-portfolio-button')).tap();
      
      // Update title
      await element(by.id('portfolio-title-input')).clearText();
      await element(by.id('portfolio-title-input')).typeText('Updated Portfolio Item');
      
      // Save changes
      await element(by.id('save-portfolio-button')).tap();
      
      // Wait for save to complete
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Verify changes on profile screen
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      await expect(element(by.text('Updated Portfolio Item'))).toBeVisible();
    });

    test('Delete a portfolio item with confirmation dialog', async () => {
      // Navigate to profile and scroll to portfolio section
      await navigateToProfileScreen();
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      
      // Tap on the portfolio item to delete
      await element(by.text('Updated Portfolio Item')).tap();
      
      // Tap delete button
      await element(by.id('delete-portfolio-button')).tap();
      
      // Confirmation dialog should appear
      await expect(element(by.text('Delete portfolio item?'))).toBeVisible();
      
      // Confirm deletion
      await element(by.text('Delete')).tap();
      
      // Wait for deletion to complete
      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Verify item no longer exists
      await element(by.id('profile-scroll-view')).scrollTo('bottom');
      await expect(element(by.text('Updated Portfolio Item'))).not.toBeVisible();
    });
  });

  // Test suite for profile verification functionality
  describe('Profile Verification', () => {
    test('Verification status indicators for identity verification', async () => {
      // Verify identity badge is visible
      await expect(element(by.id('identity-verification-badge'))).toBeVisible();
      
      // Check status text exists
      await expect(element(by.id('identity-verification-status'))).toBeVisible();
    });

    test('Verification status indicators for skills verification', async () => {
      // Verify skills verification badge is visible
      await expect(element(by.id('skills-verification-badge'))).toBeVisible();
      
      // Check status text exists
      await expect(element(by.id('skills-verification-status'))).toBeVisible();
    });

    test('Initiate verification process', async () => {
      // Tap on verification section
      await element(by.id('verification-section')).tap();
      
      // Should see verification options
      await expect(element(by.id('verification-options'))).toBeVisible();
      
      // Get current verification statuses
      const identityStatus = await element(by.id('identity-verification-status')).getAttribute('text');
      const skillsStatus = await element(by.id('skills-verification-status')).getAttribute('text');
      
      // Tap on "Verify Identity" button if status is unverified
      if (identityStatus === 'Unverified') {
        await element(by.id('verify-identity-button')).tap();
        
        // Should navigate to identity verification flow
        await expect(element(by.id('identity-verification-screen'))).toBeVisible();
        
        // Go back to profile
        await element(by.id('back-button')).tap();
      }
      
      // Tap on "Verify Skills" button if status is unverified
      if (skillsStatus === 'Unverified') {
        await element(by.id('verify-skills-button')).tap();
        
        // Should navigate to skills verification flow
        await expect(element(by.id('skills-verification-screen'))).toBeVisible();
        
        // Go back to profile
        await element(by.id('back-button')).tap();
      }
    });

    test('Verification pending state UI', async () => {
      // Navigate to verification section
      await element(by.id('verification-section')).tap();
      
      // Get current verification statuses
      const identityStatus = await element(by.id('identity-verification-status')).getAttribute('text');
      const skillsStatus = await element(by.id('skills-verification-status')).getAttribute('text');
      
      // If either verification is pending, check pending UI elements
      if (identityStatus === 'Pending') {
        await expect(element(by.id('identity-verification-pending-icon'))).toBeVisible();
        await expect(element(by.id('identity-verification-status'))).toHaveText('Pending');
      }
      
      if (skillsStatus === 'Pending') {
        await expect(element(by.id('skills-verification-pending-icon'))).toBeVisible();
        await expect(element(by.id('skills-verification-status'))).toHaveText('Pending');
      }
    });

    test('Handling of verification completion', async () => {
      // This test is conditional based on having a verified status
      // Get current verification statuses
      const identityStatus = await element(by.id('identity-verification-status')).getAttribute('text');
      const skillsStatus = await element(by.id('skills-verification-status')).getAttribute('text');
      
      // Check verified UI elements if either verification is verified
      if (identityStatus === 'Verified') {
        await expect(element(by.id('identity-verification-verified-icon'))).toBeVisible();
        await expect(element(by.id('identity-verification-status'))).toHaveText('Verified');
      }
      
      if (skillsStatus === 'Verified') {
        await expect(element(by.id('skills-verification-verified-icon'))).toBeVisible();
        await expect(element(by.id('skills-verification-status'))).toHaveText('Verified');
      }
    });
  });

  // Helper functions
  async function navigateToProfileScreen(): Promise<void> {
    await element(by.id('profile-tab')).tap();
    await waitFor(element(by.id('profile-screen')))
      .toBeVisible()
      .withTimeout(2000);
  }

  async function navigateToEditProfileScreen(): Promise<void> {
    await navigateToProfileScreen();
    await element(by.id('edit-profile-button')).tap();
    await waitFor(element(by.id('edit-profile-screen')))
      .toBeVisible()
      .withTimeout(2000);
  }

  async function navigateToAddPortfolioScreen(): Promise<void> {
    await navigateToProfileScreen();
    await element(by.id('profile-scroll-view')).scrollTo('bottom');
    await element(by.id('add-portfolio-button')).tap();
    await waitFor(element(by.id('add-portfolio-screen')))
      .toBeVisible()
      .withTimeout(2000);
  }

  async function fillProfileForm(profileData: Partial<ProfileFormValues>): Promise<void> {
    try {
      // Fill in each field if provided in profileData
      if (profileData.title) {
        await element(by.id('title-input')).clearText();
        await element(by.id('title-input')).typeText(profileData.title);
      }
      
      if (profileData.bio) {
        await element(by.id('bio-input')).clearText();
        await element(by.id('bio-input')).typeText(profileData.bio);
      }
      
      if (profileData.hourlyRate) {
        await element(by.id('hourly-rate-input')).clearText();
        await element(by.id('hourly-rate-input')).typeText(profileData.hourlyRate.toString());
      }
      
      if (profileData.availability) {
        await element(by.id(`availability-${profileData.availability}`)).tap();
      }
      
      if (profileData.githubUrl) {
        await element(by.id('github-url-input')).clearText();
        await element(by.id('github-url-input')).typeText(profileData.githubUrl);
      }
      
      if (profileData.linkedinUrl) {
        await element(by.id('linkedin-url-input')).clearText();
        await element(by.id('linkedin-url-input')).typeText(profileData.linkedinUrl);
      }
      
      if (profileData.website) {
        await element(by.id('website-input')).clearText();
        await element(by.id('website-input')).typeText(profileData.website);
      }
      
      if (profileData.location) {
        await element(by.id('location-input')).clearText();
        await element(by.id('location-input')).typeText(profileData.location);
      }
    } catch (error) {
      console.error('Error filling profile form:', error);
      throw error;
    }
  }

  async function fillPortfolioItemForm(itemData: Partial<PortfolioItemFormValues>): Promise<void> {
    try {
      // Fill in each field if provided in itemData
      if (itemData.title) {
        await element(by.id('portfolio-title-input')).clearText();
        await element(by.id('portfolio-title-input')).typeText(itemData.title);
      }
      
      if (itemData.description) {
        await element(by.id('portfolio-description-input')).clearText();
        await element(by.id('portfolio-description-input')).typeText(itemData.description);
      }
      
      if (itemData.type) {
        await element(by.id('portfolio-type-dropdown')).tap();
        await element(by.text(itemData.type)).tap();
      }
      
      if (itemData.technologies && itemData.technologies.length > 0) {
        await element(by.id('technologies-input')).tap();
        
        for (const tech of itemData.technologies) {
          await element(by.id('technology-tag-input')).typeText(tech);
          await element(by.id('add-technology-tag')).tap();
        }
        
        // Close the technologies input
        await element(by.id('done-button')).tap();
      }
      
      if (itemData.projectUrl) {
        await element(by.id('project-url-input')).clearText();
        await element(by.id('project-url-input')).typeText(itemData.projectUrl);
      }
      
      if (itemData.githubUrl) {
        await element(by.id('github-url-input')).clearText();
        await element(by.id('github-url-input')).typeText(itemData.githubUrl);
      }
    } catch (error) {
      console.error('Error filling portfolio form:', error);
      throw error;
    }
  }

  async function verifyProfileData(expectedData: Partial<FreelancerProfile>): Promise<void> {
    try {
      // Navigate to profile screen to ensure we're looking at profile data
      await navigateToProfileScreen();
      
      // Verify each field in expectedData
      if (expectedData.title) {
        await expect(element(by.id('profile-title'))).toHaveText(expectedData.title);
      }
      
      if (expectedData.bio) {
        await expect(element(by.id('profile-bio'))).toHaveText(expectedData.bio);
      }
      
      if (expectedData.hourlyRate) {
        await expect(element(by.id('hourly-rate'))).toHaveText(`$${expectedData.hourlyRate}/hr`);
      }
      
      if (expectedData.skills && expectedData.skills.length > 0) {
        // Scroll to skills section
        await element(by.id('skills-section')).scrollTo('visible');
        
        // Verify each skill is present
        for (const skill of expectedData.skills) {
          await expect(element(by.text(skill.name))).toBeVisible();
        }
      }
      
      if (expectedData.availability) {
        await expect(element(by.id('availability-status'))).toHaveText(expectedData.availability);
      }
    } catch (error) {
      console.error('Error verifying profile data:', error);
      throw error;
    }
  }
});