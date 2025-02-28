// Cypress end-to-end tests for job-related functionality in the AI Talent Marketplace
// cypress: ^12.x.x

// Test user data
const EMPLOYER_USER = { 
  email: 'employer@example.com', 
  password: 'EmployerTest123!', 
  companyName: 'AI Solutions Inc.' 
};

const FREELANCER_USER = { 
  email: 'freelancer@example.com', 
  password: 'FreelancerTest123!', 
  firstName: 'Alex', 
  lastName: 'Johnson' 
};

const TEST_JOB = { 
  title: 'Machine Learning Engineer', 
  description: 'We need an expert in machine learning for a 3-month project', 
  type: 'FIXED_PRICE', 
  budget: 5000, 
  difficulty: 'ADVANCED', 
  isRemote: true, 
  requiredSkills: ['Machine Learning', 'Python', 'TensorFlow'] 
};

const TEST_PROPOSAL = { 
  coverLetter: 'I am interested in this position and have relevant experience', 
  proposedBudget: 4800, 
  estimatedDuration: 2 
};

// Common setup before each test
beforeEach(() => {
  // Intercept API calls
  cy.intercept('GET', '/api/v1/jobs*').as('getJobs');
  cy.intercept('GET', '/api/v1/jobs/*').as('getJobDetails');
  cy.intercept('POST', '/api/v1/jobs').as('createJob');
  cy.intercept('PUT', '/api/v1/jobs/*').as('updateJob');
  cy.intercept('DELETE', '/api/v1/jobs/*').as('deleteJob');
  cy.intercept('POST', '/api/v1/proposals').as('createProposal');
  cy.intercept('GET', '/api/v1/recommendations*').as('getRecommendations');
  
  // Clear cookies and localStorage to ensure clean state
  cy.clearCookies();
  cy.clearLocalStorage();
  
  // Preserve window to improve test performance
  Cypress.config('defaultCommandTimeout', 10000);
});

describe('Job Listing', function() {
  it('should navigate to the jobs page', () => {
    cy.visit('/');
    cy.contains('Find Jobs').click();
    cy.url().should('include', '/jobs');
    cy.contains('h1', 'AI Job Marketplace').should('be.visible');
  });

  it('should display a list of jobs', () => {
    cy.visit('/jobs');
    cy.wait('@getJobs');
    cy.get('[data-cy="job-card"]').should('have.length.at.least', 1);
  });

  it('should display all required elements in job cards', () => {
    cy.visit('/jobs');
    cy.wait('@getJobs');
    cy.get('[data-cy="job-card"]').first().within(() => {
      cy.get('[data-cy="job-title"]').should('be.visible');
      cy.get('[data-cy="company-name"]').should('be.visible');
      cy.get('[data-cy="job-skills"]').should('be.visible');
      cy.get('[data-cy="job-budget"]').should('be.visible');
    });
  });

  it('should paginate when many jobs are available', () => {
    cy.visit('/jobs');
    cy.wait('@getJobs');
    cy.get('[data-cy="pagination"]').should('be.visible');
    cy.get('[data-cy="next-page"]').click();
    cy.wait('@getJobs');
    cy.url().should('include', 'page=2');
  });

  it('should display empty state when no jobs match filters', () => {
    cy.visit('/jobs?search=nonexistentjobxyz');
    cy.wait('@getJobs');
    cy.get('[data-cy="empty-jobs-state"]').should('be.visible');
    cy.contains('No jobs match your search criteria').should('be.visible');
  });

  it('should search jobs with keyword', () => {
    cy.visit('/jobs');
    cy.get('[data-cy="search-input"]').type('Machine Learning');
    cy.get('[data-cy="search-button"]').click();
    cy.wait('@getJobs');
    cy.url().should('include', 'search=Machine%20Learning');
  });

  it('should filter jobs by skill, type, and difficulty', () => {
    cy.visit('/jobs');
    cy.get('[data-cy="filter-button"]').click();
    cy.get('[data-cy="skill-filter"]').click();
    cy.contains('Python').click();
    cy.get('[data-cy="job-type-filter"]').click();
    cy.contains('Fixed Price').click();
    cy.get('[data-cy="difficulty-filter"]').click();
    cy.contains('Advanced').click();
    cy.get('[data-cy="apply-filters"]').click();
    cy.wait('@getJobs');
    cy.url().should('include', 'skill=Python');
    cy.url().should('include', 'type=FIXED_PRICE');
    cy.url().should('include', 'difficulty=ADVANCED');
  });

  it('should sort jobs by different criteria', () => {
    cy.visit('/jobs');
    cy.get('[data-cy="sort-selector"]').click();
    cy.contains('Highest Budget').click();
    cy.wait('@getJobs');
    cy.url().should('include', 'sort=budget_desc');
  });

  it('should display skeleton loaders during API requests', () => {
    cy.intercept('/api/v1/jobs*', (req) => {
      req.on('response', (res) => {
        res.delay = 1000;
      });
    }).as('slowJobs');
    
    cy.visit('/jobs');
    cy.get('[data-cy="job-skeleton"]').should('be.visible');
    cy.wait('@slowJobs');
    cy.get('[data-cy="job-skeleton"]').should('not.exist');
  });

  it('should toggle between grid and list view', () => {
    cy.visit('/jobs');
    cy.get('[data-cy="view-toggle"]').should('be.visible');
    cy.get('[data-cy="list-view"]').click();
    cy.get('[data-cy="jobs-container"]').should('have.class', 'list-view');
    cy.get('[data-cy="grid-view"]').click();
    cy.get('[data-cy="jobs-container"]').should('have.class', 'grid-view');
  });
});

describe('Job Creation', function() {
  beforeEach(() => {
    // Login as employer for job creation tests
    cy.visit('/login');
    cy.get('[data-cy="email-input"]').type(EMPLOYER_USER.email);
    cy.get('[data-cy="password-input"]').type(EMPLOYER_USER.password);
    cy.get('[data-cy="login-button"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should show Create Job button for employers', () => {
    cy.visit('/jobs');
    cy.get('[data-cy="create-job-button"]').should('be.visible');
  });

  it('should navigate to job creation form', () => {
    cy.visit('/jobs');
    cy.get('[data-cy="create-job-button"]').click();
    cy.url().should('include', '/jobs/create');
    cy.contains('h1', 'Create New Job').should('be.visible');
  });

  it('should display all job form UI elements', () => {
    cy.visit('/jobs/create');
    cy.get('[data-cy="job-title-input"]').should('be.visible');
    cy.get('[data-cy="job-description"]').should('be.visible');
    cy.get('[data-cy="job-type-toggle"]').should('be.visible');
    cy.get('[data-cy="job-difficulty"]').should('be.visible');
    cy.get('[data-cy="job-skills"]').should('be.visible');
    cy.get('[data-cy="remote-toggle"]').should('be.visible');
    cy.get('[data-cy="budget-input"]').should('be.visible');
    cy.get('[data-cy="file-upload"]').should('be.visible');
  });

  it('should change visible fields based on job type selection', () => {
    cy.visit('/jobs/create');
    cy.get('[data-cy="job-type-toggle"]').contains('Fixed Price').click();
    cy.get('[data-cy="budget-input"]').should('be.visible');
    cy.get('[data-cy="hourly-rate-input"]').should('not.exist');
    
    cy.get('[data-cy="job-type-toggle"]').contains('Hourly Rate').click();
    cy.get('[data-cy="hourly-rate-input"]').should('be.visible');
    cy.get('[data-cy="estimated-hours-input"]').should('be.visible');
    cy.get('[data-cy="budget-input"]').should('not.exist');
  });

  it('should validate required fields in job form', () => {
    cy.visit('/jobs/create');
    cy.get('[data-cy="submit-job-button"]').click();
    cy.get('[data-cy="job-title-input"]').parent().should('contain', 'Required');
    cy.get('[data-cy="job-description"]').parent().should('contain', 'Required');
    cy.get('[data-cy="budget-input"]').parent().should('contain', 'Required');
  });

  it('should validate budget values', () => {
    cy.visit('/jobs/create');
    cy.get('[data-cy="budget-input"]').type('10');
    cy.get('[data-cy="submit-job-button"]').click();
    cy.get('[data-cy="budget-input"]').parent().should('contain', 'Minimum budget is $50');
  });

  it('should allow selecting skills', () => {
    cy.visit('/jobs/create');
    cy.get('[data-cy="job-skills"]').click();
    cy.contains('Machine Learning').click();
    cy.contains('Python').click();
    cy.contains('TensorFlow').click();
    cy.get('[data-cy="selected-skills"]').should('contain', 'Machine Learning');
    cy.get('[data-cy="selected-skills"]').should('contain', 'Python');
    cy.get('[data-cy="selected-skills"]').should('contain', 'TensorFlow');
  });

  it('should allow file attachments', () => {
    cy.visit('/jobs/create');
    cy.get('[data-cy="file-upload"]').attachFile('test-file.pdf');
    cy.get('[data-cy="file-list"]').should('contain', 'test-file.pdf');
  });

  it('should submit job with valid data', () => {
    cy.visit('/jobs/create');
    cy.get('[data-cy="job-title-input"]').type(TEST_JOB.title);
    cy.get('[data-cy="job-description"]').type(TEST_JOB.description);
    cy.get('[data-cy="job-type-toggle"]').contains('Fixed Price').click();
    cy.get('[data-cy="budget-input"]').type(TEST_JOB.budget.toString());
    cy.get('[data-cy="job-difficulty"]').select(TEST_JOB.difficulty);
    cy.get('[data-cy="remote-toggle"]').click();
    cy.get('[data-cy="job-skills"]').click();
    TEST_JOB.requiredSkills.forEach(skill => {
      cy.contains(skill).click();
    });

    cy.get('[data-cy="submit-job-button"]').click();
    cy.wait('@createJob');
    cy.url().should('include', '/jobs/');
  });

  it('should handle errors during job creation', () => {
    cy.intercept('POST', '/api/v1/jobs', {
      statusCode: 500,
      body: { 
        message: 'Server error occurred' 
      }
    }).as('jobCreateError');

    cy.visit('/jobs/create');
    cy.get('[data-cy="job-title-input"]').type(TEST_JOB.title);
    cy.get('[data-cy="job-description"]').type(TEST_JOB.description);
    cy.get('[data-cy="budget-input"]').type(TEST_JOB.budget.toString());
    cy.get('[data-cy="submit-job-button"]').click();
    cy.wait('@jobCreateError');
    cy.get('[data-cy="error-message"]').should('contain', 'Server error occurred');
  });

  it('should redirect to created job after successful submission', () => {
    cy.intercept('POST', '/api/v1/jobs', {
      statusCode: 201,
      body: { 
        id: '123',
        title: TEST_JOB.title
      }
    }).as('jobCreated');

    cy.visit('/jobs/create');
    cy.get('[data-cy="job-title-input"]').type(TEST_JOB.title);
    cy.get('[data-cy="job-description"]').type(TEST_JOB.description);
    cy.get('[data-cy="budget-input"]').type(TEST_JOB.budget.toString());
    cy.get('[data-cy="submit-job-button"]').click();
    cy.wait('@jobCreated');
    cy.url().should('include', '/jobs/123');
  });
});

describe('Job Details', function() {
  it('should navigate to job details page by clicking a job card', () => {
    cy.visit('/jobs');
    cy.wait('@getJobs');
    cy.get('[data-cy="job-card"]').first().click();
    cy.wait('@getJobDetails');
    cy.url().should('include', '/jobs/');
    cy.get('[data-cy="job-details-container"]').should('be.visible');
  });

  it('should display all essential job information', () => {
    cy.visit('/jobs/123'); // Using a known job ID
    cy.wait('@getJobDetails');
    cy.get('[data-cy="job-title"]').should('be.visible');
    cy.get('[data-cy="job-description"]').should('be.visible');
    cy.get('[data-cy="job-budget"]').should('be.visible');
    cy.get('[data-cy="job-difficulty"]').should('be.visible');
    cy.get('[data-cy="job-type"]').should('be.visible');
    cy.get('[data-cy="job-remote-status"]').should('be.visible');
    cy.get('[data-cy="job-posted-date"]').should('be.visible');
  });

  it('should display employer profile information', () => {
    cy.visit('/jobs/123');
    cy.wait('@getJobDetails');
    cy.get('[data-cy="employer-info"]').should('be.visible');
    cy.get('[data-cy="employer-name"]').should('be.visible');
    cy.get('[data-cy="employer-rating"]').should('be.visible');
    cy.get('[data-cy="employer-jobs-count"]').should('be.visible');
  });

  it('should display skill badges correctly', () => {
    cy.visit('/jobs/123');
    cy.wait('@getJobDetails');
    cy.get('[data-cy="skill-badge"]').should('have.length.at.least', 1);
  });

  it('should format budget and duration information correctly', () => {
    cy.visit('/jobs/123');
    cy.wait('@getJobDetails');
    cy.get('[data-cy="job-budget"]').should('contain', '$');
    cy.get('[data-cy="job-duration"]').should('be.visible');
  });

  it('should allow accessing and downloading attachments', () => {
    cy.intercept('GET', '/api/v1/jobs/123', {
      body: {
        id: '123',
        title: TEST_JOB.title,
        description: TEST_JOB.description,
        budget: TEST_JOB.budget,
        attachments: [
          { id: '1', name: 'requirements.pdf', url: '/files/requirements.pdf' }
        ]
      }
    }).as('jobWithAttachments');

    cy.visit('/jobs/123');
    cy.wait('@jobWithAttachments');
    cy.get('[data-cy="job-attachments"]').should('be.visible');
    cy.get('[data-cy="attachment-link"]').should('have.attr', 'href');
  });

  it('should navigate back to job listing', () => {
    cy.visit('/jobs/123');
    cy.get('[data-cy="back-button"]').click();
    cy.url().should('include', '/jobs');
  });

  it('should show edit button for job poster only', () => {
    // Login as the employer who posted the job
    cy.visit('/login');
    cy.get('[data-cy="email-input"]').type(EMPLOYER_USER.email);
    cy.get('[data-cy="password-input"]').type(EMPLOYER_USER.password);
    cy.get('[data-cy="login-button"]').click();
    
    cy.intercept('GET', '/api/v1/jobs/123', {
      body: {
        id: '123',
        title: TEST_JOB.title,
        description: TEST_JOB.description,
        budget: TEST_JOB.budget,
        postedBy: { email: EMPLOYER_USER.email }
      }
    }).as('posterJob');

    cy.visit('/jobs/123');
    cy.wait('@posterJob');
    cy.get('[data-cy="edit-job-button"]').should('be.visible');
  });

  it('should show apply button for freelancers only', () => {
    // Login as freelancer
    cy.visit('/login');
    cy.get('[data-cy="email-input"]').type(FREELANCER_USER.email);
    cy.get('[data-cy="password-input"]').type(FREELANCER_USER.password);
    cy.get('[data-cy="login-button"]').click();
    
    cy.visit('/jobs/123');
    cy.wait('@getJobDetails');
    cy.get('[data-cy="apply-job-button"]').should('be.visible');
  });

  it('should handle errors for non-existent job IDs', () => {
    cy.intercept('GET', '/api/v1/jobs/999', {
      statusCode: 404,
      body: { message: 'Job not found' }
    }).as('jobNotFound');

    cy.visit('/jobs/999');
    cy.wait('@jobNotFound');
    cy.get('[data-cy="error-message"]').should('contain', 'Job not found');
    cy.get('[data-cy="back-to-jobs"]').should('be.visible');
  });

  it('should generate proper metadata for job details page', () => {
    cy.visit('/jobs/123');
    cy.wait('@getJobDetails');
    cy.get('head title').should('contain', TEST_JOB.title);
    cy.get('head meta[name="description"]').should('exist');
  });
});

describe('Job Application/Proposal', function() {
  beforeEach(() => {
    // Login as freelancer for proposal tests
    cy.visit('/login');
    cy.get('[data-cy="email-input"]').type(FREELANCER_USER.email);
    cy.get('[data-cy="password-input"]').type(FREELANCER_USER.password);
    cy.get('[data-cy="login-button"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should open proposal form modal when Apply button is clicked', () => {
    cy.visit('/jobs/123');
    cy.wait('@getJobDetails');
    cy.get('[data-cy="apply-job-button"]').click();
    cy.get('[data-cy="proposal-form-modal"]').should('be.visible');
  });

  it('should display all expected proposal form fields', () => {
    cy.visit('/jobs/123');
    cy.get('[data-cy="apply-job-button"]').click();
    cy.get('[data-cy="cover-letter"]').should('be.visible');
    cy.get('[data-cy="proposed-budget"]').should('be.visible');
    cy.get('[data-cy="estimated-duration"]').should('be.visible');
  });

  it('should validate required proposal fields', () => {
    cy.visit('/jobs/123');
    cy.get('[data-cy="apply-job-button"]').click();
    cy.get('[data-cy="submit-proposal-button"]').click();
    cy.get('[data-cy="cover-letter"]').parent().should('contain', 'Required');
    cy.get('[data-cy="proposed-budget"]').parent().should('contain', 'Required');
    cy.get('[data-cy="estimated-duration"]').parent().should('contain', 'Required');
  });

  it('should validate that proposed budget does not exceed job budget', () => {
    cy.intercept('GET', '/api/v1/jobs/123', {
      body: {
        id: '123',
        title: TEST_JOB.title,
        budget: 5000
      }
    }).as('jobBudget');

    cy.visit('/jobs/123');
    cy.wait('@jobBudget');
    cy.get('[data-cy="apply-job-button"]').click();
    cy.get('[data-cy="proposed-budget"]').type('6000');
    cy.get('[data-cy="submit-proposal-button"]').click();
    cy.get('[data-cy="proposed-budget"]').parent().should('contain', 'Cannot exceed job budget');
  });

  it('should validate cover letter minimum length', () => {
    cy.visit('/jobs/123');
    cy.get('[data-cy="apply-job-button"]').click();
    cy.get('[data-cy="cover-letter"]').type('Too short');
    cy.get('[data-cy="submit-proposal-button"]').click();
    cy.get('[data-cy="cover-letter"]').parent().should('contain', 'Cover letter must be at least 50 characters');
  });

  it('should allow milestone creation for milestone-based jobs', () => {
    cy.intercept('GET', '/api/v1/jobs/123', {
      body: {
        id: '123',
        title: TEST_JOB.title,
        allowsMilestones: true
      }
    }).as('milestoneJob');

    cy.visit('/jobs/123');
    cy.wait('@milestoneJob');
    cy.get('[data-cy="apply-job-button"]').click();
    cy.get('[data-cy="add-milestone-button"]').click();
    cy.get('[data-cy="milestone-description-0"]').type('First milestone');
    cy.get('[data-cy="milestone-amount-0"]').type('1000');
    cy.get('[data-cy="add-milestone-button"]').click();
    cy.get('[data-cy="milestone-description-1"]').should('be.visible');
  });

  it('should successfully submit proposal with valid data', () => {
    cy.intercept('GET', '/api/v1/jobs/123', {
      body: {
        id: '123',
        title: TEST_JOB.title,
        budget: 5000
      }
    }).as('jobForProposal');

    cy.visit('/jobs/123');
    cy.wait('@jobForProposal');
    cy.get('[data-cy="apply-job-button"]').click();
    cy.get('[data-cy="cover-letter"]').type(TEST_PROPOSAL.coverLetter + ' with additional text to meet the minimum length requirement for the cover letter validation.');
    cy.get('[data-cy="proposed-budget"]').type(TEST_PROPOSAL.proposedBudget.toString());
    cy.get('[data-cy="estimated-duration"]').type(TEST_PROPOSAL.estimatedDuration.toString());
    cy.get('[data-cy="submit-proposal-button"]').click();
    cy.wait('@createProposal');
  });

  it('should show confirmation and success message after proposal submission', () => {
    cy.intercept('POST', '/api/v1/proposals', {
      statusCode: 201,
      body: { 
        id: '456',
        status: 'SUBMITTED'
      }
    }).as('proposalSuccess');

    cy.visit('/jobs/123');
    cy.get('[data-cy="apply-job-button"]').click();
    cy.get('[data-cy="cover-letter"]').type(TEST_PROPOSAL.coverLetter + ' with additional text to meet the minimum length requirement.');
    cy.get('[data-cy="proposed-budget"]').type(TEST_PROPOSAL.proposedBudget.toString());
    cy.get('[data-cy="estimated-duration"]').type(TEST_PROPOSAL.estimatedDuration.toString());
    cy.get('[data-cy="submit-proposal-button"]').click();
    cy.wait('@proposalSuccess');
    cy.get('[data-cy="success-message"]').should('contain', 'Proposal submitted successfully');
  });

  it('should handle errors for failed proposal submission', () => {
    cy.intercept('POST', '/api/v1/proposals', {
      statusCode: 500,
      body: { 
        message: 'Failed to submit proposal' 
      }
    }).as('proposalError');

    cy.visit('/jobs/123');
    cy.get('[data-cy="apply-job-button"]').click();
    cy.get('[data-cy="cover-letter"]').type(TEST_PROPOSAL.coverLetter + ' with additional text to meet the minimum length requirement.');
    cy.get('[data-cy="proposed-budget"]').type(TEST_PROPOSAL.proposedBudget.toString());
    cy.get('[data-cy="estimated-duration"]').type(TEST_PROPOSAL.estimatedDuration.toString());
    cy.get('[data-cy="submit-proposal-button"]').click();
    cy.wait('@proposalError');
    cy.get('[data-cy="error-message"]').should('contain', 'Failed to submit proposal');
  });

  it('should prevent employers from applying to jobs', () => {
    // Login as employer
    cy.visit('/login');
    cy.get('[data-cy="email-input"]').type(EMPLOYER_USER.email);
    cy.get('[data-cy="password-input"]').type(EMPLOYER_USER.password);
    cy.get('[data-cy="login-button"]').click();
    
    cy.visit('/jobs/123');
    cy.wait('@getJobDetails');
    cy.get('[data-cy="apply-job-button"]').should('not.exist');
  });

  it('should prevent freelancers from applying to own jobs', () => {
    // Setup intercept for a job created by the current freelancer
    cy.intercept('GET', '/api/v1/jobs/456', {
      body: {
        id: '456',
        title: 'My Own Job',
        postedBy: { email: FREELANCER_USER.email }
      }
    }).as('ownJob');

    cy.visit('/jobs/456');
    cy.wait('@ownJob');
    cy.get('[data-cy="apply-job-button"]').should('not.exist');
    cy.contains('You cannot apply to your own job').should('be.visible');
  });

  it('should prevent multiple proposals for the same job', () => {
    // Setup intercept for a job where the user already applied
    cy.intercept('GET', '/api/v1/jobs/789', {
      body: {
        id: '789',
        title: 'Already Applied Job',
        hasApplied: true
      }
    }).as('appliedJob');

    cy.visit('/jobs/789');
    cy.wait('@appliedJob');
    cy.get('[data-cy="already-applied-message"]').should('be.visible');
    cy.get('[data-cy="apply-job-button"]').should('be.disabled');
  });
});

describe('Job Editing and Management', function() {
  beforeEach(() => {
    // Login as employer for job management tests
    cy.visit('/login');
    cy.get('[data-cy="email-input"]').type(EMPLOYER_USER.email);
    cy.get('[data-cy="password-input"]').type(EMPLOYER_USER.password);
    cy.get('[data-cy="login-button"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should allow job poster to edit their job', () => {
    // Setup intercept for a job posted by this employer
    cy.intercept('GET', '/api/v1/jobs/123', {
      body: {
        id: '123',
        title: TEST_JOB.title,
        description: TEST_JOB.description,
        budget: TEST_JOB.budget,
        postedBy: { email: EMPLOYER_USER.email }
      }
    }).as('ownedJob');

    cy.visit('/jobs/123');
    cy.wait('@ownedJob');
    cy.get('[data-cy="edit-job-button"]').should('be.visible').click();
    cy.url().should('include', '/jobs/123/edit');
  });

  it('should pre-populate edit form with existing job data', () => {
    cy.intercept('GET', '/api/v1/jobs/123/edit', {
      body: {
        id: '123',
        title: TEST_JOB.title,
        description: TEST_JOB.description,
        budget: TEST_JOB.budget,
        difficulty: TEST_JOB.difficulty,
        isRemote: TEST_JOB.isRemote,
        requiredSkills: TEST_JOB.requiredSkills
      }
    }).as('jobEditData');

    cy.visit('/jobs/123/edit');
    cy.wait('@jobEditData');
    cy.get('[data-cy="job-title-input"]').should('have.value', TEST_JOB.title);
    cy.get('[data-cy="job-description"]').should('have.value', TEST_JOB.description);
    cy.get('[data-cy="budget-input"]').should('have.value', TEST_JOB.budget.toString());
  });

  it('should successfully update job with new information', () => {
    cy.visit('/jobs/123/edit');
    cy.wait('@getJobDetails');
    cy.get('[data-cy="job-title-input"]').clear().type('Updated Job Title');
    cy.get('[data-cy="job-description"]').clear().type('Updated job description with new details');
    cy.get('[data-cy="submit-job-button"]').click();
    cy.wait('@updateJob');
    cy.url().should('include', '/jobs/123');
    cy.get('[data-cy="job-title"]').should('contain', 'Updated Job Title');
  });

  it('should allow changing job status', () => {
    cy.visit('/jobs/123');
    cy.wait('@getJobDetails');
    cy.get('[data-cy="job-status-toggle"]').click();
    cy.contains('Closed').click();
    cy.wait('@updateJob');
    cy.get('[data-cy="job-status"]').should('contain', 'Closed');
  });

  it('should prevent non-poster from editing job', () => {
    // Set up intercept for job posted by someone else
    cy.intercept('GET', '/api/v1/jobs/999', {
      body: {
        id: '999',
        title: 'Someone Else\'s Job',
        postedBy: { email: 'other@example.com' }
      }
    }).as('otherJob');

    cy.visit('/jobs/999');
    cy.wait('@otherJob');
    cy.get('[data-cy="edit-job-button"]').should('not.exist');
  });

  it('should allow job deletion by poster', () => {
    cy.visit('/jobs/123');
    cy.wait('@getJobDetails');
    cy.get('[data-cy="delete-job-button"]').click();
    cy.get('[data-cy="confirm-delete-dialog"]').should('be.visible');
    cy.get('[data-cy="confirm-delete-button"]').click();
    cy.wait('@deleteJob');
    cy.url().should('include', '/jobs');
    cy.get('[data-cy="success-message"]').should('contain', 'Job deleted successfully');
  });

  it('should show confirmation dialog for job deletion', () => {
    cy.visit('/jobs/123');
    cy.wait('@getJobDetails');
    cy.get('[data-cy="delete-job-button"]').click();
    cy.get('[data-cy="confirm-delete-dialog"]').should('be.visible');
    cy.get('[data-cy="cancel-delete-button"]').click();
    cy.get('[data-cy="confirm-delete-dialog"]').should('not.exist');
    cy.url().should('include', '/jobs/123');
  });

  it('should allow managing proposals for job', () => {
    // Setup intercept that includes proposals
    cy.intercept('GET', '/api/v1/jobs/123/proposals', {
      body: [
        {
          id: '1',
          freelancer: { firstName: 'John', lastName: 'Doe' },
          proposedBudget: 4500,
          status: 'PENDING'
        },
        {
          id: '2',
          freelancer: { firstName: 'Jane', lastName: 'Smith' },
          proposedBudget: 4800,
          status: 'PENDING'
        }
      ]
    }).as('jobProposals');

    cy.visit('/jobs/123/proposals');
    cy.wait('@jobProposals');
    cy.get('[data-cy="proposal-item"]').should('have.length', 2);
  });

  it('should allow accepting a proposal', () => {
    cy.intercept('PUT', '/api/v1/proposals/1/accept', {
      statusCode: 200,
      body: { status: 'ACCEPTED' }
    }).as('acceptProposal');

    cy.visit('/jobs/123/proposals');
    cy.wait('@jobProposals');
    cy.get('[data-cy="accept-proposal-1"]').click();
    cy.get('[data-cy="confirm-accept-dialog"]').should('be.visible');
    cy.get('[data-cy="confirm-accept-button"]').click();
    cy.wait('@acceptProposal');
    cy.get('[data-cy="proposal-1-status"]').should('contain', 'Accepted');
  });

  it('should allow rejecting a proposal', () => {
    cy.intercept('PUT', '/api/v1/proposals/2/reject', {
      statusCode: 200,
      body: { status: 'REJECTED' }
    }).as('rejectProposal');

    cy.visit('/jobs/123/proposals');
    cy.wait('@jobProposals');
    cy.get('[data-cy="reject-proposal-2"]').click();
    cy.get('[data-cy="confirm-reject-dialog"]').should('be.visible');
    cy.get('[data-cy="reject-reason"]').type('Found a better match');
    cy.get('[data-cy="confirm-reject-button"]').click();
    cy.wait('@rejectProposal');
    cy.get('[data-cy="proposal-2-status"]').should('contain', 'Rejected');
  });

  it('should create contract after accepting proposal', () => {
    cy.intercept('PUT', '/api/v1/proposals/1/accept', {
      statusCode: 200,
      body: { 
        status: 'ACCEPTED',
        contractId: 'contract-123'
      }
    }).as('acceptWithContract');

    cy.visit('/jobs/123/proposals');
    cy.wait('@jobProposals');
    cy.get('[data-cy="accept-proposal-1"]').click();
    cy.get('[data-cy="confirm-accept-button"]').click();
    cy.wait('@acceptWithContract');
    cy.get('[data-cy="success-message"]').should('contain', 'Contract created');
    cy.get('[data-cy="view-contract-button"]').should('be.visible');
  });
});

describe('Recommendations', function() {
  beforeEach(() => {
    // Login as freelancer for recommendation tests
    cy.visit('/login');
    cy.get('[data-cy="email-input"]').type(FREELANCER_USER.email);
    cy.get('[data-cy="password-input"]').type(FREELANCER_USER.password);
    cy.get('[data-cy="login-button"]').click();
  });

  it('should display job recommendations for freelancers based on skills', () => {
    cy.visit('/dashboard');
    cy.wait('@getRecommendations');
    cy.get('[data-cy="recommended-jobs"]').should('be.visible');
    cy.get('[data-cy="recommended-job-card"]').should('have.length.at.least', 1);
  });

  it('should show recommendations on dashboard', () => {
    cy.visit('/dashboard');
    cy.get('[data-cy="recommended-jobs-section"]').should('be.visible');
    cy.contains('Recommended for You').should('be.visible');
  });

  it('should show relevant recommendations based on user skills', () => {
    // Setup intercept for a user profile with specific skills
    cy.intercept('GET', '/api/v1/users/profile', {
      body: {
        skills: ['Machine Learning', 'Python', 'TensorFlow']
      }
    }).as('userProfile');
    
    // Setup intercept for recommendations matching those skills
    cy.intercept('GET', '/api/v1/recommendations*', {
      body: [
        {
          id: '1',
          title: 'Machine Learning Engineer',
          requiredSkills: ['Machine Learning', 'Python']
        },
        {
          id: '2',
          title: 'TensorFlow Developer',
          requiredSkills: ['TensorFlow', 'Python']
        }
      ]
    }).as('matchingRecommendations');

    cy.visit('/dashboard');
    cy.wait('@userProfile');
    cy.wait('@matchingRecommendations');
    cy.get('[data-cy="recommended-job-card"]').should('have.length', 2);
    cy.get('[data-cy="recommended-job-card"]').first().should('contain', 'Machine Learning Engineer');
  });

  it('should update recommendations when profile skills change', () => {
    // First visit with initial skills
    cy.visit('/dashboard');
    cy.wait('@getRecommendations');
    
    // Update skills
    cy.visit('/profile/edit');
    cy.get('[data-cy="skills-input"]').click();
    cy.contains('Deep Learning').click(); // Add a new skill
    cy.get('[data-cy="save-profile-button"]').click();
    
    // Setup intercept for updated recommendations
    cy.intercept('GET', '/api/v1/recommendations*', {
      body: [
        {
          id: '3',
          title: 'Deep Learning Specialist',
          requiredSkills: ['Deep Learning', 'TensorFlow']
        }
      ]
    }).as('updatedRecommendations');
    
    cy.visit('/dashboard');
    cy.wait('@updatedRecommendations');
    cy.get('[data-cy="recommended-job-card"]').should('contain', 'Deep Learning Specialist');
  });

  it('should have proper UI elements and navigation for recommendations', () => {
    cy.visit('/dashboard');
    cy.wait('@getRecommendations');
    cy.get('[data-cy="recommended-job-card"]').first().within(() => {
      cy.get('[data-cy="job-title"]').should('be.visible');
      cy.get('[data-cy="job-skills"]').should('be.visible');
      cy.get('[data-cy="job-budget"]').should('be.visible');
    });
    
    cy.get('[data-cy="recommended-job-card"]').first().click();
    cy.url().should('include', '/jobs/');
  });
});

describe('Responsive Behavior', function() {
  it('should adapt jobs page layout on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.visit('/jobs');
    cy.wait('@getJobs');
    cy.get('[data-cy="mobile-filter-button"]').should('be.visible');
    cy.get('[data-cy="mobile-search-toggle"]').should('be.visible');
  });

  it('should display job cards properly on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.visit('/jobs');
    cy.wait('@getJobs');
    cy.get('[data-cy="job-card"]').should('have.css', 'width', '100%');
  });

  it('should adapt job filtering interface on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.visit('/jobs');
    cy.get('[data-cy="mobile-filter-button"]').click();
    cy.get('[data-cy="mobile-filter-drawer"]').should('be.visible');
    cy.get('[data-cy="close-filter-drawer"]').click();
    cy.get('[data-cy="mobile-filter-drawer"]').should('not.be.visible');
  });

  it('should adapt job details page on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.visit('/jobs/123');
    cy.wait('@getJobDetails');
    cy.get('[data-cy="job-details-container"]').should('have.css', 'flex-direction', 'column');
  });

  it('should adapt job creation form on mobile viewport', () => {
    // Login as employer
    cy.viewport('iphone-x');
    cy.visit('/login');
    cy.get('[data-cy="email-input"]').type(EMPLOYER_USER.email);
    cy.get('[data-cy="password-input"]').type(EMPLOYER_USER.password);
    cy.get('[data-cy="login-button"]').click();
    
    cy.visit('/jobs/create');
    cy.get('[data-cy="form-container"]').should('have.css', 'width', '100%');
  });

  it('should adapt proposal form on mobile viewport', () => {
    // Login as freelancer
    cy.viewport('iphone-x');
    cy.visit('/login');
    cy.get('[data-cy="email-input"]').type(FREELANCER_USER.email);
    cy.get('[data-cy="password-input"]').type(FREELANCER_USER.password);
    cy.get('[data-cy="login-button"]').click();
    
    cy.visit('/jobs/123');
    cy.wait('@getJobDetails');
    cy.get('[data-cy="apply-job-button"]').click();
    cy.get('[data-cy="proposal-form-modal"]').should('have.class', 'mobile-modal');
  });

  it('should adapt for tablet viewport', () => {
    cy.viewport('ipad-2');
    cy.visit('/jobs');
    cy.wait('@getJobs');
    cy.get('[data-cy="jobs-container"]').should('have.css', 'grid-template-columns', '1fr 1fr');
  });

  it('should ensure all functionality works across device sizes', () => {
    // Test on mobile
    cy.viewport('iphone-x');
    cy.visit('/jobs');
    cy.wait('@getJobs');
    cy.get('[data-cy="job-card"]').first().click();
    cy.url().should('include', '/jobs/');
    
    // Test on tablet
    cy.viewport('ipad-2');
    cy.visit('/jobs');
    cy.wait('@getJobs');
    cy.get('[data-cy="job-card"]').first().click();
    cy.url().should('include', '/jobs/');
    
    // Test on desktop
    cy.viewport(1920, 1080);
    cy.visit('/jobs');
    cy.wait('@getJobs');
    cy.get('[data-cy="job-card"]').first().click();
    cy.url().should('include', '/jobs/');
  });
});