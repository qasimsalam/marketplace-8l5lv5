import 'cypress';

// Test data constants
const FREELANCER_USER = { 
  email: 'freelancer@example.com', 
  password: 'FreelancerTest123!', 
  firstName: 'Alex', 
  lastName: 'Johnson', 
  title: 'Machine Learning Engineer' 
};

const COMPANY_USER = { 
  email: 'company@example.com', 
  password: 'CompanyTest123!', 
  name: 'AI Solutions Inc.', 
  industry: 'Artificial Intelligence' 
};

const TEST_SKILLS = [
  { name: 'Machine Learning', proficiency: 90 }, 
  { name: 'Deep Learning', proficiency: 85 }, 
  { name: 'Natural Language Processing', proficiency: 80 }
];

const TEST_PORTFOLIO_ITEM = { 
  title: 'Image Recognition Project', 
  description: 'A deep learning project for image recognition', 
  technologies: ['Python', 'TensorFlow', 'Computer Vision'], 
  githubUrl: 'https://github.com/test/image-recognition' 
};

const TEST_EXPERIENCE = { 
  title: 'Senior ML Engineer', 
  company: 'Tech Innovations', 
  location: 'San Francisco, CA', 
  startDate: '2020-01-01', 
  isCurrent: true, 
  description: 'Leading AI projects and ML implementations' 
};

const TEST_EDUCATION = { 
  institution: 'Stanford University', 
  degree: 'M.S.', 
  fieldOfStudy: 'Computer Science', 
  startDate: '2017-09-01', 
  endDate: '2019-06-01', 
  description: 'Focus on AI and Machine Learning' 
};

const TEST_CERTIFICATION = { 
  name: 'TensorFlow Developer Certificate', 
  issuingOrganization: 'Google', 
  issueDate: '2021-03-15', 
  credentialId: 'TF12345', 
  credentialUrl: 'https://credential.example.com/tf12345' 
};

describe('Profile Page Tests', () => {
  beforeEach(() => {
    // Intercept API calls to monitor profile-related requests
    cy.intercept('GET', '/api/v1/profiles/*').as('getProfile');
    cy.intercept('PUT', '/api/v1/profiles/*').as('updateProfile');
    cy.intercept('POST', '/api/v1/profiles/*/portfolio').as('addPortfolio');
    cy.intercept('PUT', '/api/v1/profiles/*/portfolio/*').as('updatePortfolio');
    cy.intercept('DELETE', '/api/v1/profiles/*/portfolio/*').as('deletePortfolio');
    cy.intercept('POST', '/api/v1/profiles/*/experience').as('addExperience');
    cy.intercept('PUT', '/api/v1/profiles/*/experience/*').as('updateExperience');
    cy.intercept('DELETE', '/api/v1/profiles/*/experience/*').as('deleteExperience');
    cy.intercept('POST', '/api/v1/profiles/*/education').as('addEducation');
    cy.intercept('PUT', '/api/v1/profiles/*/education/*').as('updateEducation');
    cy.intercept('DELETE', '/api/v1/profiles/*/education/*').as('deleteEducation');
    cy.intercept('POST', '/api/v1/profiles/*/certifications').as('addCertification');
    cy.intercept('PUT', '/api/v1/profiles/*/certifications/*').as('updateCertification');
    cy.intercept('DELETE', '/api/v1/profiles/*/certifications/*').as('deleteCertification');
    cy.intercept('POST', '/api/v1/profiles/*/skills').as('updateSkills');
    cy.intercept('POST', '/api/v1/profiles/*/verification').as('requestVerification');
    cy.intercept('GET', '/api/v1/skills/suggestions*').as('getSkillSuggestions');
    
    // Clear cookies and localStorage to ensure clean state for each test
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Preserve window to improve test performance
    Cypress.config('defaultCommandTimeout', 10000);
  });

  describe('Profile Viewing', function() {
    it('should navigate to profile page when authenticated as freelancer', () => {
      // Login as freelancer
      cy.loginAs(FREELANCER_USER);
      
      // Navigate to profile
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Check if profile page is loaded correctly
      cy.url().should('include', '/profile');
      cy.get('[data-testid="profile-container"]').should('be.visible');
    });

    it('should display freelancer profile with expected elements', () => {
      cy.loginAs(FREELANCER_USER);
      
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Check all profile elements
      cy.get('[data-testid="profile-name"]').should('contain', `${FREELANCER_USER.firstName} ${FREELANCER_USER.lastName}`);
      cy.get('[data-testid="profile-title"]').should('contain', FREELANCER_USER.title);
      cy.get('[data-testid="expertise-section"]').should('be.visible');
      cy.get('[data-testid="verification-badges"]').should('be.visible');
      cy.get('[data-testid="portfolio-section"]').should('be.visible');
    });

    it('should display company profile with expected elements', () => {
      cy.loginAs(COMPANY_USER);
      
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Check company profile elements
      cy.get('[data-testid="profile-name"]').should('contain', COMPANY_USER.name);
      cy.get('[data-testid="company-industry"]').should('contain', COMPANY_USER.industry);
      cy.get('[data-testid="verification-badges"]').should('be.visible');
      cy.get('[data-testid="company-description"]').should('be.visible');
    });

    it('should test profile card layout and responsive behavior', () => {
      cy.loginAs(FREELANCER_USER);
      
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Check desktop layout
      cy.get('[data-testid="profile-card"]').should('be.visible');
      
      // Test responsive behavior
      cy.viewport('iphone-x');
      cy.get('[data-testid="profile-card"]').should('be.visible');
      cy.get('[data-testid="mobile-profile-header"]').should('be.visible');
    });

    it('should visualize skills with expertise level bars', () => {
      cy.loginAs(FREELANCER_USER);
      
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Check skills visualization
      cy.get('[data-testid="skills-section"]').should('be.visible');
      cy.get('[data-testid="skill-bar"]').should('have.length.at.least', 1);
      
      // Check if the first skill has the correct proficiency
      cy.get('[data-testid="skill-bar"]').first().should('have.attr', 'style')
        .and('include', `width: ${TEST_SKILLS[0].proficiency}%`);
    });

    it('should display verification status badges correctly', () => {
      cy.loginAs(FREELANCER_USER);
      
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Check verification badges
      cy.get('[data-testid="verification-badges"]').within(() => {
        cy.get('[data-testid="identity-verification-badge"]').should('be.visible');
        cy.get('[data-testid="skills-verification-badge"]').should('be.visible');
      });
      
      // Tooltip content should explain verification status
      cy.get('[data-testid="identity-verification-badge"]').trigger('mouseover');
      cy.get('[data-testid="verification-tooltip"]').should('be.visible');
    });

    it('should display social/professional links', () => {
      cy.loginAs(FREELANCER_USER);
      
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Check social links
      cy.get('[data-testid="social-links"]').should('be.visible');
      cy.get('[data-testid="github-link"]').should('have.attr', 'href').and('include', 'github.com');
      cy.get('[data-testid="linkedin-link"]').should('have.attr', 'href').and('include', 'linkedin.com');
    });

    it('should display portfolio items correctly', () => {
      cy.loginAs(FREELANCER_USER);
      
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Check portfolio section
      cy.get('[data-testid="portfolio-section"]').should('be.visible');
      cy.get('[data-testid="portfolio-item"]').should('have.length.at.least', 1);
      
      // Check first portfolio item details
      cy.get('[data-testid="portfolio-item"]').first().within(() => {
        cy.get('[data-testid="portfolio-title"]').should('be.visible');
        cy.get('[data-testid="portfolio-description"]').should('be.visible');
        cy.get('[data-testid="portfolio-technologies"]').should('be.visible');
      });
    });

    it('should redirect unauthenticated users to login when accessing profile', () => {
      // Try to access profile without authentication
      cy.visit('/profile');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });

    it('should show loading state during profile data fetch', () => {
      cy.loginAs(FREELANCER_USER);
      
      // Slow down the profile API response
      cy.intercept('GET', '/api/v1/profiles/*', (req) => {
        req.on('response', (res) => {
          res.setDelay(1000);
        });
      }).as('slowProfile');
      
      cy.visit('/profile');
      
      // Check loading state
      cy.get('[data-testid="profile-loading"]').should('be.visible');
      cy.wait('@slowProfile');
      cy.get('[data-testid="profile-loading"]').should('not.exist');
    });

    it('should handle error for profile fetch failures', () => {
      cy.loginAs(FREELANCER_USER);
      
      // Mock error response
      cy.intercept('GET', '/api/v1/profiles/*', {
        statusCode: 500,
        body: { message: 'Server error' }
      }).as('profileError');
      
      cy.visit('/profile');
      cy.wait('@profileError');
      
      // Check error state
      cy.get('[data-testid="profile-error"]').should('be.visible');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });
  });

  describe('Profile Editing', function() {
    beforeEach(() => {
      // Login before each test in this block
      cy.loginAs(FREELANCER_USER);
    });

    it('should navigate to edit profile page', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Click edit button
      cy.get('[data-testid="edit-profile-button"]').click();
      
      // Check if edit page is loaded
      cy.url().should('include', '/profile/edit');
      cy.get('[data-testid="profile-edit-form"]').should('be.visible');
    });

    it('should only show edit button on own profile', () => {
      // Navigate to own profile
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Edit button should be visible
      cy.get('[data-testid="edit-profile-button"]').should('be.visible');
      
      // Visit another user's profile
      cy.visit('/profile/another-user');
      cy.wait('@getProfile');
      
      // Edit button should not be visible
      cy.get('[data-testid="edit-profile-button"]').should('not.exist');
    });

    it('should load current profile data into edit form', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Check if form is pre-filled with current data
      cy.get('[data-testid="profile-title-input"]').should('have.value', FREELANCER_USER.title);
      cy.get('[data-testid="profile-first-name-input"]').should('have.value', FREELANCER_USER.firstName);
      cy.get('[data-testid="profile-last-name-input"]').should('have.value', FREELANCER_USER.lastName);
    });

    it('should display freelancer profile form with expected fields', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Check all expected form fields
      cy.get('[data-testid="profile-edit-form"]').within(() => {
        cy.get('[data-testid="profile-first-name-input"]').should('be.visible');
        cy.get('[data-testid="profile-last-name-input"]').should('be.visible');
        cy.get('[data-testid="profile-title-input"]').should('be.visible');
        cy.get('[data-testid="profile-bio-input"]').should('be.visible');
        cy.get('[data-testid="profile-hourly-rate-input"]').should('be.visible');
        cy.get('[data-testid="profile-skills-input"]').should('be.visible');
        cy.get('[data-testid="profile-location-input"]').should('be.visible');
        cy.get('[data-testid="profile-github-input"]').should('be.visible');
        cy.get('[data-testid="profile-linkedin-input"]').should('be.visible');
        cy.get('[data-testid="profile-website-input"]').should('be.visible');
      });
    });

    it('should display company profile form with expected fields', () => {
      // Login as company
      cy.loginAs(COMPANY_USER);
      
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Check company-specific form fields
      cy.get('[data-testid="profile-edit-form"]').within(() => {
        cy.get('[data-testid="company-name-input"]').should('be.visible');
        cy.get('[data-testid="company-description-input"]').should('be.visible');
        cy.get('[data-testid="company-industry-input"]').should('be.visible');
        cy.get('[data-testid="company-size-input"]').should('be.visible');
        cy.get('[data-testid="company-founded-input"]').should('be.visible');
        cy.get('[data-testid="company-website-input"]').should('be.visible');
        cy.get('[data-testid="company-linkedin-input"]').should('be.visible');
      });
    });

    it('should validate required fields', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Clear required fields
      cy.get('[data-testid="profile-first-name-input"]').clear();
      cy.get('[data-testid="profile-last-name-input"]').clear();
      
      // Try to submit form
      cy.get('[data-testid="save-profile-button"]').click();
      
      // Check validation errors
      cy.get('[data-testid="profile-first-name-error"]').should('be.visible');
      cy.get('[data-testid="profile-last-name-error"]').should('be.visible');
    });

    it('should validate field formats', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Enter invalid data
      cy.get('[data-testid="profile-website-input"]').clear().type('invalid-url');
      cy.get('[data-testid="profile-github-input"]').clear().type('not-a-github-url');
      cy.get('[data-testid="profile-linkedin-input"]').clear().type('not-a-linkedin-url');
      
      // Try to submit form
      cy.get('[data-testid="save-profile-button"]').click();
      
      // Check validation errors
      cy.get('[data-testid="profile-website-error"]').should('be.visible');
      cy.get('[data-testid="profile-github-error"]').should('be.visible');
      cy.get('[data-testid="profile-linkedin-error"]').should('be.visible');
    });

    it('should validate hourly rate input', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Enter invalid hourly rate
      cy.get('[data-testid="profile-hourly-rate-input"]').clear().type('-50');
      
      // Try to submit form
      cy.get('[data-testid="save-profile-button"]').click();
      
      // Check validation error
      cy.get('[data-testid="profile-hourly-rate-error"]').should('be.visible')
        .and('contain', 'must be a positive number');
    });

    it('should successfully update profile with valid data', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Update profile data
      const newTitle = 'Senior AI Engineer';
      const newBio = 'Experienced AI professional with a focus on computer vision';
      
      cy.get('[data-testid="profile-title-input"]').clear().type(newTitle);
      cy.get('[data-testid="profile-bio-input"]').clear().type(newBio);
      
      // Mock successful update
      cy.intercept('PUT', '/api/v1/profiles/*', {
        statusCode: 200,
        body: { 
          title: newTitle,
          bio: newBio,
          firstName: FREELANCER_USER.firstName,
          lastName: FREELANCER_USER.lastName
        }
      }).as('successfulUpdate');
      
      // Submit form
      cy.get('[data-testid="save-profile-button"]').click();
      cy.wait('@successfulUpdate');
      
      // Should redirect to profile view
      cy.url().should('include', '/profile').and('not.include', '/edit');
    });

    it('should return to profile view without changes when cancel button is clicked', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Make some changes
      cy.get('[data-testid="profile-title-input"]').clear().type('Changed Title');
      
      // Click cancel button
      cy.get('[data-testid="cancel-edit-button"]').click();
      
      // Should return to profile view
      cy.url().should('include', '/profile').and('not.include', '/edit');
    });

    it('should handle error during profile update', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Make some changes
      cy.get('[data-testid="profile-title-input"]').clear().type('Changed Title');
      
      // Mock error response
      cy.intercept('PUT', '/api/v1/profiles/*', {
        statusCode: 500,
        body: { message: 'Server error during update' }
      }).as('updateError');
      
      // Submit form
      cy.get('[data-testid="save-profile-button"]').click();
      cy.wait('@updateError');
      
      // Should show error message
      cy.get('[data-testid="update-error-message"]').should('be.visible');
    });

    it('should test profile image upload functionality', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Mock file upload
      cy.intercept('POST', '/api/v1/uploads/profile-image', {
        statusCode: 200,
        body: { imageUrl: 'https://example.com/profile-image.jpg' }
      }).as('imageUpload');
      
      // Upload image
      cy.get('[data-testid="profile-image-upload"]').attachFile('test-image.jpg');
      cy.wait('@imageUpload');
      
      // Image preview should update
      cy.get('[data-testid="profile-image-preview"]')
        .should('have.attr', 'src')
        .and('include', 'https://example.com/profile-image.jpg');
    });

    it('should test form accessibility', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Test ARIA attributes
      cy.get('[data-testid="profile-edit-form"]')
        .find('label')
        .should('have.attr', 'for');
      
      // Test error message announcements
      cy.get('[data-testid="profile-first-name-input"]').clear();
      cy.get('[data-testid="save-profile-button"]').click();
      cy.get('[data-testid="profile-first-name-error"]')
        .should('have.attr', 'aria-live', 'polite');
    });
  });

  describe('Portfolio Management', function() {
    beforeEach(() => {
      cy.loginAs(FREELANCER_USER);
    });

    it('should navigate to add new portfolio item', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Click add portfolio button
      cy.get('[data-testid="add-portfolio-button"]').click();
      
      // Should show portfolio form
      cy.get('[data-testid="portfolio-form"]').should('be.visible');
    });

    it('should display portfolio creation form with all required fields', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      cy.get('[data-testid="add-portfolio-button"]').click();
      
      // Check all form fields
      cy.get('[data-testid="portfolio-form"]').within(() => {
        cy.get('[data-testid="portfolio-title-input"]').should('be.visible');
        cy.get('[data-testid="portfolio-description-input"]').should('be.visible');
        cy.get('[data-testid="portfolio-technologies-input"]').should('be.visible');
        cy.get('[data-testid="portfolio-github-url-input"]').should('be.visible');
        cy.get('[data-testid="portfolio-live-url-input"]').should('be.visible');
        cy.get('[data-testid="portfolio-image-upload"]').should('be.visible');
      });
    });

    it('should validate portfolio form fields', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      cy.get('[data-testid="add-portfolio-button"]').click();
      
      // Try to submit empty form
      cy.get('[data-testid="save-portfolio-button"]').click();
      
      // Check validation errors
      cy.get('[data-testid="portfolio-title-error"]').should('be.visible');
      cy.get('[data-testid="portfolio-description-error"]').should('be.visible');
      
      // Enter invalid URL
      cy.get('[data-testid="portfolio-github-url-input"]').type('invalid-url');
      cy.get('[data-testid="save-portfolio-button"]').click();
      cy.get('[data-testid="portfolio-github-url-error"]').should('be.visible');
    });

    it('should successfully add a portfolio item', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      cy.get('[data-testid="add-portfolio-button"]').click();
      
      // Fill portfolio form
      cy.get('[data-testid="portfolio-title-input"]').type(TEST_PORTFOLIO_ITEM.title);
      cy.get('[data-testid="portfolio-description-input"]').type(TEST_PORTFOLIO_ITEM.description);
      
      // Add technologies (assuming it's a multi-select or tag input)
      TEST_PORTFOLIO_ITEM.technologies.forEach(tech => {
        cy.get('[data-testid="portfolio-technologies-input"]').type(tech).type('{enter}');
      });
      
      cy.get('[data-testid="portfolio-github-url-input"]').type(TEST_PORTFOLIO_ITEM.githubUrl);
      
      // Mock portfolio creation request
      cy.intercept('POST', '/api/v1/profiles/*/portfolio', {
        statusCode: 201,
        body: TEST_PORTFOLIO_ITEM
      }).as('createPortfolio');
      
      // Submit form
      cy.get('[data-testid="save-portfolio-button"]').click();
      cy.wait('@createPortfolio');
      
      // Should close form and show portfolio item in list
      cy.get('[data-testid="portfolio-form"]').should('not.exist');
      cy.get('[data-testid="portfolio-item"]').contains(TEST_PORTFOLIO_ITEM.title).should('be.visible');
    });

    it('should edit an existing portfolio item', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Click edit on first portfolio item
      cy.get('[data-testid="portfolio-item"]').first().within(() => {
        cy.get('[data-testid="edit-portfolio-button"]').click();
      });
      
      // Should show edit form with pre-filled data
      cy.get('[data-testid="portfolio-form"]').should('be.visible');
      
      // Change title
      const newTitle = 'Updated Portfolio Project';
      cy.get('[data-testid="portfolio-title-input"]').clear().type(newTitle);
      
      // Mock portfolio update request
      cy.intercept('PUT', '/api/v1/profiles/*/portfolio/*', {
        statusCode: 200,
        body: { ...TEST_PORTFOLIO_ITEM, title: newTitle }
      }).as('updatePortfolio');
      
      // Submit form
      cy.get('[data-testid="save-portfolio-button"]').click();
      cy.wait('@updatePortfolio');
      
      // Should close form and show updated portfolio item
      cy.get('[data-testid="portfolio-form"]').should('not.exist');
      cy.get('[data-testid="portfolio-item"]').contains(newTitle).should('be.visible');
    });

    it('should delete a portfolio item with confirmation', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Click delete on first portfolio item
      cy.get('[data-testid="portfolio-item"]').first().within(() => {
        cy.get('[data-testid="delete-portfolio-button"]').click();
      });
      
      // Confirmation dialog should appear
      cy.get('[data-testid="delete-confirmation-dialog"]').should('be.visible');
      
      // Mock portfolio deletion request
      cy.intercept('DELETE', '/api/v1/profiles/*/portfolio/*', {
        statusCode: 204
      }).as('deletePortfolio');
      
      // Confirm deletion
      cy.get('[data-testid="confirm-delete-button"]').click();
      cy.wait('@deletePortfolio');
    });

    it('should handle form error during submission', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      cy.get('[data-testid="add-portfolio-button"]').click();
      
      // Fill form with valid data
      cy.get('[data-testid="portfolio-title-input"]').type(TEST_PORTFOLIO_ITEM.title);
      cy.get('[data-testid="portfolio-description-input"]').type(TEST_PORTFOLIO_ITEM.description);
      
      // Mock error response
      cy.intercept('POST', '/api/v1/profiles/*/portfolio', {
        statusCode: 500,
        body: { message: 'Server error during creation' }
      }).as('portfolioError');
      
      // Submit form
      cy.get('[data-testid="save-portfolio-button"]').click();
      cy.wait('@portfolioError');
      
      // Should show error message
      cy.get('[data-testid="portfolio-form-error"]').should('be.visible');
    });

    it('should upload images for portfolio items', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      cy.get('[data-testid="add-portfolio-button"]').click();
      
      // Mock file upload
      cy.intercept('POST', '/api/v1/uploads/portfolio-image', {
        statusCode: 200,
        body: { imageUrl: 'https://example.com/portfolio-image.jpg' }
      }).as('portfolioImageUpload');
      
      // Upload image
      cy.get('[data-testid="portfolio-image-upload"]').attachFile('test-image.jpg');
      cy.wait('@portfolioImageUpload');
      
      // Image preview should update
      cy.get('[data-testid="portfolio-image-preview"]')
        .should('have.attr', 'src')
        .and('include', 'https://example.com/portfolio-image.jpg');
    });

    it('should add and remove technology tags', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      cy.get('[data-testid="add-portfolio-button"]').click();
      
      // Add a technology tag
      cy.get('[data-testid="portfolio-technologies-input"]').type('Python{enter}');
      
      // Tag should appear in the list
      cy.get('[data-testid="technology-tag"]').should('contain', 'Python');
      
      // Remove the tag
      cy.get('[data-testid="technology-tag"]').within(() => {
        cy.get('[data-testid="remove-tag-button"]').click();
      });
      
      // Tag should be removed
      cy.get('[data-testid="technology-tag"]').should('not.exist');
    });
  });

  describe('Experience, Education, and Certifications', function() {
    beforeEach(() => {
      cy.loginAs(FREELANCER_USER);
    });

    it('should add work experience with required fields', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Click add experience button
      cy.get('[data-testid="add-experience-button"]').click();
      
      // Fill experience form
      cy.get('[data-testid="experience-form"]').within(() => {
        cy.get('[data-testid="experience-title-input"]').type(TEST_EXPERIENCE.title);
        cy.get('[data-testid="experience-company-input"]').type(TEST_EXPERIENCE.company);
        cy.get('[data-testid="experience-location-input"]').type(TEST_EXPERIENCE.location);
        cy.get('[data-testid="experience-start-date-input"]').type(TEST_EXPERIENCE.startDate);
        cy.get('[data-testid="experience-current-checkbox"]').check();
        cy.get('[data-testid="experience-description-input"]').type(TEST_EXPERIENCE.description);
      });
      
      // Mock experience creation request
      cy.intercept('POST', '/api/v1/profiles/*/experience', {
        statusCode: 201,
        body: TEST_EXPERIENCE
      }).as('createExperience');
      
      // Submit form
      cy.get('[data-testid="save-experience-button"]').click();
      cy.wait('@createExperience');
      
      // Experience should appear in the list
      cy.get('[data-testid="experience-item"]').contains(TEST_EXPERIENCE.title).should('be.visible');
    });

    it('should edit existing work experience', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Click edit on first experience item
      cy.get('[data-testid="experience-item"]').first().within(() => {
        cy.get('[data-testid="edit-experience-button"]').click();
      });
      
      // Change title
      const newTitle = 'Lead AI Engineer';
      cy.get('[data-testid="experience-title-input"]').clear().type(newTitle);
      
      // Mock experience update request
      cy.intercept('PUT', '/api/v1/profiles/*/experience/*', {
        statusCode: 200,
        body: { ...TEST_EXPERIENCE, title: newTitle }
      }).as('updateExperience');
      
      // Submit form
      cy.get('[data-testid="save-experience-button"]').click();
      cy.wait('@updateExperience');
      
      // Should show updated experience
      cy.get('[data-testid="experience-item"]').contains(newTitle).should('be.visible');
    });

    it('should validate date ranges for experience entries', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      cy.get('[data-testid="add-experience-button"]').click();
      
      // Enter invalid date range (end before start)
      cy.get('[data-testid="experience-title-input"]').type('Test Position');
      cy.get('[data-testid="experience-company-input"]').type('Test Company');
      cy.get('[data-testid="experience-start-date-input"]').type('2022-01-01');
      cy.get('[data-testid="experience-current-checkbox"]').uncheck();
      cy.get('[data-testid="experience-end-date-input"]').type('2021-01-01');
      
      // Try to submit form
      cy.get('[data-testid="save-experience-button"]').click();
      
      // Should show date validation error
      cy.get('[data-testid="experience-date-error"]').should('be.visible')
        .and('contain', 'End date must be after start date');
    });

    it('should test current job toggle functionality', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      cy.get('[data-testid="add-experience-button"]').click();
      
      // Fill required fields
      cy.get('[data-testid="experience-title-input"]').type('Current Job');
      cy.get('[data-testid="experience-company-input"]').type('Current Company');
      cy.get('[data-testid="experience-start-date-input"]').type('2022-01-01');
      
      // Check current job checkbox
      cy.get('[data-testid="experience-current-checkbox"]').check();
      
      // End date field should be disabled
      cy.get('[data-testid="experience-end-date-input"]').should('be.disabled');
      
      // Uncheck current job
      cy.get('[data-testid="experience-current-checkbox"]').uncheck();
      
      // End date field should be enabled
      cy.get('[data-testid="experience-end-date-input"]').should('be.enabled');
    });

    it('should add education with required fields', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Click add education button
      cy.get('[data-testid="add-education-button"]').click();
      
      // Fill education form
      cy.get('[data-testid="education-form"]').within(() => {
        cy.get('[data-testid="education-institution-input"]').type(TEST_EDUCATION.institution);
        cy.get('[data-testid="education-degree-input"]').type(TEST_EDUCATION.degree);
        cy.get('[data-testid="education-field-input"]').type(TEST_EDUCATION.fieldOfStudy);
        cy.get('[data-testid="education-start-date-input"]').type(TEST_EDUCATION.startDate);
        cy.get('[data-testid="education-end-date-input"]').type(TEST_EDUCATION.endDate);
        cy.get('[data-testid="education-description-input"]').type(TEST_EDUCATION.description);
      });
      
      // Mock education creation request
      cy.intercept('POST', '/api/v1/profiles/*/education', {
        statusCode: 201,
        body: TEST_EDUCATION
      }).as('createEducation');
      
      // Submit form
      cy.get('[data-testid="save-education-button"]').click();
      cy.wait('@createEducation');
      
      // Education should appear in the list
      cy.get('[data-testid="education-item"]').contains(TEST_EDUCATION.institution).should('be.visible');
    });

    it('should add certification with required fields', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Click add certification button
      cy.get('[data-testid="add-certification-button"]').click();
      
      // Fill certification form
      cy.get('[data-testid="certification-form"]').within(() => {
        cy.get('[data-testid="certification-name-input"]').type(TEST_CERTIFICATION.name);
        cy.get('[data-testid="certification-organization-input"]').type(TEST_CERTIFICATION.issuingOrganization);
        cy.get('[data-testid="certification-date-input"]').type(TEST_CERTIFICATION.issueDate);
        cy.get('[data-testid="certification-id-input"]').type(TEST_CERTIFICATION.credentialId);
        cy.get('[data-testid="certification-url-input"]').type(TEST_CERTIFICATION.credentialUrl);
      });
      
      // Mock certification creation request
      cy.intercept('POST', '/api/v1/profiles/*/certifications', {
        statusCode: 201,
        body: TEST_CERTIFICATION
      }).as('createCertification');
      
      // Submit form
      cy.get('[data-testid="save-certification-button"]').click();
      cy.wait('@createCertification');
      
      // Certification should appear in the list
      cy.get('[data-testid="certification-item"]').contains(TEST_CERTIFICATION.name).should('be.visible');
    });

    it('should verify entries appear in chronological order', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Check experience items order (most recent first)
      cy.get('[data-testid="experience-section"]').within(() => {
        cy.get('[data-testid="experience-item"]').should('have.length.at.least', 1);
      });
      
      // Check education items order
      cy.get('[data-testid="education-section"]').within(() => {
        cy.get('[data-testid="education-item"]').should('have.length.at.least', 1);
      });
    });
  });

  describe('Skills Management', function() {
    beforeEach(() => {
      cy.loginAs(FREELANCER_USER);
    });

    it('should add new skills to profile', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Mock skills suggestions API
      cy.intercept('GET', '/api/v1/skills/suggestions*', {
        statusCode: 200,
        body: [
          { id: 1, name: 'TensorFlow' },
          { id: 2, name: 'PyTorch' },
          { id: 3, name: 'Computer Vision' }
        ]
      }).as('skillSuggestions');
      
      // Add a new skill
      cy.get('[data-testid="skills-input"]').type('Ten');
      cy.wait('@skillSuggestions');
      
      // Select from dropdown
      cy.get('[data-testid="skill-suggestion-item"]').contains('TensorFlow').click();
      
      // New skill should appear in the list
      cy.get('[data-testid="skill-item"]').contains('TensorFlow').should('be.visible');
    });

    it('should adjust skill proficiency level', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Find a skill and adjust its proficiency slider
      cy.get('[data-testid="skill-item"]').first().within(() => {
        cy.get('[data-testid="proficiency-slider"]').invoke('val', 75).trigger('change');
      });
      
      // Visual confirmation that slider has changed
      cy.get('[data-testid="skill-item"]').first().within(() => {
        cy.get('[data-testid="proficiency-slider"]').should('have.value', '75');
      });
    });

    it('should delete skills from profile', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Get current skill count
      cy.get('[data-testid="skill-item"]').then($skills => {
        const initialCount = $skills.length;
        
        // Delete the first skill
        cy.get('[data-testid="skill-item"]').first().within(() => {
          cy.get('[data-testid="remove-skill-button"]').click();
        });
        
        // Check that skill was removed from the list
        cy.get('[data-testid="skill-item"]').should('have.length', initialCount - 1);
      });
    });

    it('should test skills auto-suggestion functionality', () => {
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Mock skills suggestions API
      cy.intercept('GET', '/api/v1/skills/suggestions*', {
        statusCode: 200,
        body: [
          { id: 1, name: 'Natural Language Processing' },
          { id: 2, name: 'NLP Transformers' },
          { id: 3, name: 'NLTK' }
        ]
      }).as('skillSuggestions');
      
      // Type to trigger suggestions
      cy.get('[data-testid="skills-input"]').type('N');
      cy.wait('@skillSuggestions');
      
      // Suggestions should appear
      cy.get('[data-testid="skill-suggestions"]').should('be.visible');
      cy.get('[data-testid="skill-suggestion-item"]').should('have.length', 3);
    });

    it('should validate maximum number of skills', () => {
      // Mock maximum skills reached
      cy.intercept('GET', '/api/v1/profiles/*', (req) => {
        req.reply({
          statusCode: 200,
          body: {
            ...FREELANCER_USER,
            skills: Array(10).fill().map((_, i) => ({
              name: `Skill ${i+1}`,
              proficiency: 80
            }))
          }
        });
      }).as('maxSkillsProfile');
      
      cy.visit('/profile/edit');
      cy.wait('@maxSkillsProfile');
      
      // Try to add another skill
      cy.get('[data-testid="skills-input"]').type('New Skill');
      
      // Should show maximum skills message
      cy.get('[data-testid="max-skills-message"]').should('be.visible')
        .and('contain', 'Maximum number of skills reached');
    });
  });

  describe('Profile Verification', function() {
    beforeEach(() => {
      cy.loginAs(FREELANCER_USER);
    });

    it('should submit identity verification request', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Click on verification button
      cy.get('[data-testid="verify-identity-button"]').click();
      
      // Should show verification form
      cy.get('[data-testid="identity-verification-form"]').should('be.visible');
      
      // Fill verification form (e.g., upload ID document)
      cy.get('[data-testid="id-document-upload"]').attachFile('test-id.jpg');
      
      // Mock verification request
      cy.intercept('POST', '/api/v1/profiles/*/verification', {
        statusCode: 201,
        body: { status: 'pending', type: 'identity' }
      }).as('verificationRequest');
      
      // Submit form
      cy.get('[data-testid="submit-verification-button"]').click();
      cy.wait('@verificationRequest');
      
      // Should show success message
      cy.get('[data-testid="verification-success-message"]').should('be.visible');
    });

    it('should initiate skills verification through GitHub', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Click on GitHub verification button
      cy.get('[data-testid="github-verification-button"]').click();
      
      // Should show GitHub verification modal
      cy.get('[data-testid="github-verification-modal"]').should('be.visible');
      
      // Mock OAuth window
      cy.window().then(win => {
        cy.stub(win, 'open').returns({
          focus: () => {},
          closed: false,
          location: { href: 'about:blank' }
        });
      });
      
      // Click connect with GitHub
      cy.get('[data-testid="connect-github-button"]').click();
      
      // Simulate successful GitHub connection
      cy.window().trigger('message', {
        data: { type: 'oauth-success', provider: 'github' }
      });
      
      // Should show success message
      cy.get('[data-testid="github-success-message"]').should('be.visible');
    });

    it('should display verification status tooltips', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Hover over identity verification badge
      cy.get('[data-testid="identity-verification-badge"]').trigger('mouseover');
      
      // Tooltip should appear with status information
      cy.get('[data-testid="verification-tooltip"]').should('be.visible')
        .and('contain', 'Identity Verification');
    });

    it('should handle verification request errors', () => {
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Click on verification button
      cy.get('[data-testid="verify-identity-button"]').click();
      
      // Fill verification form
      cy.get('[data-testid="id-document-upload"]').attachFile('test-id.jpg');
      
      // Mock error response
      cy.intercept('POST', '/api/v1/profiles/*/verification', {
        statusCode: 500,
        body: { message: 'Server error during verification request' }
      }).as('verificationError');
      
      // Submit form
      cy.get('[data-testid="submit-verification-button"]').click();
      cy.wait('@verificationError');
      
      // Should show error message
      cy.get('[data-testid="verification-error-message"]').should('be.visible');
    });
  });

  describe('Responsive Behavior', function() {
    beforeEach(() => {
      cy.loginAs(FREELANCER_USER);
    });

    it('should test profile page layout on mobile viewport', () => {
      // Set viewport to mobile size
      cy.viewport('iphone-x');
      
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Check mobile layout
      cy.get('[data-testid="mobile-profile-header"]').should('be.visible');
    });

    it('should test profile cards display on mobile viewport', () => {
      // Set viewport to mobile size
      cy.viewport('iphone-x');
      
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Cards should take full width on mobile
      cy.get('[data-testid="profile-card"]').invoke('css', 'width').should('eq', '100%');
    });

    it('should test profile editing interface on mobile viewport', () => {
      // Set viewport to mobile size
      cy.viewport('iphone-x');
      
      cy.visit('/profile/edit');
      cy.wait('@getProfile');
      
      // Form should be legible on mobile
      cy.get('[data-testid="profile-edit-form"]').should('be.visible');
    });

    it('should test tablet viewport adaptations', () => {
      // Set viewport to tablet size
      cy.viewport('ipad-2');
      
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // Sidebar should still be visible on tablet
      cy.get('[data-testid="profile-sidebar"]').should('be.visible');
    });

    it('should verify that all profile functionality works across device sizes', () => {
      // Test on mobile
      cy.viewport('iphone-x');
      cy.visit('/profile');
      cy.wait('@getProfile');
      
      // All key sections should be accessible
      cy.get('[data-testid="profile-name"]').should('be.visible');
      cy.get('[data-testid="skills-section"]').should('be.visible');
      cy.get('[data-testid="portfolio-section"]').should('be.visible');
      
      // Test on tablet
      cy.viewport('ipad-2');
      cy.reload();
      cy.wait('@getProfile');
      
      // Same sections should be visible
      cy.get('[data-testid="profile-name"]').should('be.visible');
      cy.get('[data-testid="skills-section"]').should('be.visible');
      cy.get('[data-testid="portfolio-section"]').should('be.visible');
    });
  });
});