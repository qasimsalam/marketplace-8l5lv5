import { device, element, expect, by, waitFor } from 'detox'; // ^20.0.0
import { JobFormValues, JobType, JobDifficulty, ProposalFormValues, JobSearchParams } from '../src/types/job.types';
import { UserRole } from '../src/types/auth.types';

// Test user data
const TEST_EMPLOYER_USER = {
  email: 'employer@example.com',
  password: 'EmployerTest1234!',
  firstName: 'Test',
  lastName: 'Employer',
  role: UserRole.EMPLOYER
};

const TEST_FREELANCER_USER = {
  email: 'freelancer@example.com',
  password: 'FreelancerTest1234!',
  firstName: 'Test',
  lastName: 'Freelancer',
  role: UserRole.FREELANCER
};

// Test job data
const TEST_JOB = {
  title: 'Test AI Project',
  description: 'A test job for machine learning development',
  type: JobType.FIXED_PRICE,
  budget: 5000,
  requiredSkills: ['Machine Learning', 'Python'],
  difficulty: JobDifficulty.INTERMEDIATE,
  isRemote: true
};

// Test proposal data
const TEST_PROPOSAL = {
  coverLetter: 'I am interested in this project and have extensive experience in machine learning.',
  proposedBudget: 4800,
  estimatedDuration: 30
};

/**
 * Setup function that runs before all job tests to prepare the testing environment
 */
beforeAll(async () => {
  await device.launchApp({
    newInstance: true,
    permissions: { notifications: 'YES' }
  });
  // Set up mock responses for job API calls
  await device.setURLBlacklist([]);
});

/**
 * Cleanup function that runs after all job tests to clean up the testing environment
 */
afterAll(async () => {
  // Clean up any test artifacts
  await device.terminateApp();
});

/**
 * Setup function that runs before each job test to prepare a clean state
 */
beforeEach(async () => {
  await device.reloadReactNative();
});

/**
 * Helper function to log in as an employer account
 */
async function loginAsEmployer(): Promise<void> {
  await element(by.id('email-input')).tap();
  await element(by.id('email-input')).typeText(TEST_EMPLOYER_USER.email);
  await element(by.id('password-input')).tap();
  await element(by.id('password-input')).typeText(TEST_EMPLOYER_USER.password);
  await element(by.id('login-button')).tap();
  
  // Wait for dashboard to load
  await waitFor(element(by.id('dashboard-screen'))).toBeVisible().withTimeout(5000);
}

/**
 * Helper function to log in as a freelancer account
 */
async function loginAsFreelancer(): Promise<void> {
  await element(by.id('email-input')).tap();
  await element(by.id('email-input')).typeText(TEST_FREELANCER_USER.email);
  await element(by.id('password-input')).tap();
  await element(by.id('password-input')).typeText(TEST_FREELANCER_USER.password);
  await element(by.id('login-button')).tap();
  
  // Wait for dashboard to load
  await waitFor(element(by.id('dashboard-screen'))).toBeVisible().withTimeout(5000);
}

/**
 * Helper function to navigate to the Jobs screen
 */
async function navigateToJobsScreen(): Promise<void> {
  // Check if we're already on the jobs screen
  if (await element(by.id('jobs-screen')).isVisible()) {
    return;
  }
  
  // If on dashboard, navigate to jobs
  if (await element(by.id('dashboard-screen')).isVisible()) {
    await element(by.id('jobs-tab')).tap();
  }
  
  // If on profile screen, navigate to jobs
  if (await element(by.id('profile-screen')).isVisible()) {
    await element(by.id('jobs-tab')).tap();
  }
  
  // If on job detail, go back to list
  if (await element(by.id('job-detail-screen')).isVisible()) {
    await element(by.id('back-button')).tap();
  }
  
  // Wait for jobs screen to be visible
  await waitFor(element(by.id('jobs-screen'))).toBeVisible().withTimeout(2000);
  
  // Verify jobs screen title is visible
  await expect(element(by.text('Jobs'))).toBeVisible();
}

/**
 * Helper function to navigate to the Create Job screen
 */
async function navigateToCreateJobScreen(): Promise<void> {
  // Ensure we're on the jobs screen
  await navigateToJobsScreen();
  
  // Tap on create job button
  await element(by.id('create-job-button')).tap();
  
  // Wait for create job screen to be visible
  await waitFor(element(by.id('create-job-screen'))).toBeVisible().withTimeout(2000);
}

/**
 * Helper function to fill the job creation form with test data
 */
async function fillJobForm(jobData: JobFormValues): Promise<void> {
  // Fill title
  await element(by.id('job-title-input')).tap();
  await element(by.id('job-title-input')).typeText(jobData.title);
  
  // Fill description
  await element(by.id('job-description-input')).tap();
  await element(by.id('job-description-input')).typeText(jobData.description);
  
  // Select job type
  await element(by.id('job-type-dropdown')).tap();
  await element(by.text(jobData.type === JobType.FIXED_PRICE ? 'Fixed Price' : 'Hourly Rate')).tap();
  
  // Fill budget or rate depending on job type
  if (jobData.type === JobType.FIXED_PRICE) {
    await element(by.id('job-budget-input')).tap();
    await element(by.id('job-budget-input')).typeText(jobData.budget.toString());
  } else {
    await element(by.id('job-hourly-rate-input')).tap();
    await element(by.id('job-hourly-rate-input')).typeText(jobData.hourlyRate.toString());
    
    await element(by.id('job-estimated-hours-input')).tap();
    await element(by.id('job-estimated-hours-input')).typeText(jobData.estimatedHours.toString());
  }
  
  // Select difficulty
  await element(by.id('job-difficulty-dropdown')).tap();
  await element(by.text(jobData.difficulty)).tap();
  
  // Add required skills
  for (const skill of jobData.requiredSkills) {
    await element(by.id('job-add-skill-button')).tap();
    await element(by.id('skill-input')).typeText(skill);
    await element(by.id('add-skill-confirm-button')).tap();
  }
  
  // Toggle remote work if needed
  if (jobData.isRemote) {
    await element(by.id('job-remote-checkbox')).tap();
  }
}

/**
 * Helper function to fill the proposal submission form
 */
async function fillProposalForm(proposalData: ProposalFormValues): Promise<void> {
  // Fill cover letter
  await element(by.id('proposal-cover-letter-input')).tap();
  await element(by.id('proposal-cover-letter-input')).typeText(proposalData.coverLetter);
  
  // Fill proposed budget
  await element(by.id('proposal-budget-input')).tap();
  await element(by.id('proposal-budget-input')).typeText(proposalData.proposedBudget.toString());
  
  // Fill estimated duration
  await element(by.id('proposal-duration-input')).tap();
  await element(by.id('proposal-duration-input')).typeText(proposalData.estimatedDuration.toString());
  
  // Add milestones if provided
  if (proposalData.milestones && proposalData.milestones.length > 0) {
    for (const milestone of proposalData.milestones) {
      await element(by.id('add-milestone-button')).tap();
      
      await element(by.id('milestone-title-input')).tap();
      await element(by.id('milestone-title-input')).typeText(milestone.title);
      
      await element(by.id('milestone-description-input')).tap();
      await element(by.id('milestone-description-input')).typeText(milestone.description);
      
      await element(by.id('milestone-amount-input')).tap();
      await element(by.id('milestone-amount-input')).typeText(milestone.amount.toString());
      
      await element(by.id('save-milestone-button')).tap();
    }
  }
}

/**
 * Helper function to select a specific job from the job list
 */
async function selectJob(jobTitle: string): Promise<void> {
  // Ensure we're on the jobs screen
  await navigateToJobsScreen();
  
  // Scroll to find the job with the given title
  await waitFor(element(by.text(jobTitle))).toBeVisible().whileElement(by.id('jobs-list')).scroll(100, 'down', 0.5, 0.5);
  
  // Tap on the job
  await element(by.text(jobTitle)).tap();
  
  // Wait for job detail screen to load
  await waitFor(element(by.id('job-detail-screen'))).toBeVisible().withTimeout(2000);
  
  // Verify the job title is displayed on the detail screen
  await expect(element(by.text(jobTitle))).toBeVisible();
}

/**
 * Helper function to apply filters to the job list
 */
async function applyJobFilters(filters: JobSearchParams): Promise<void> {
  // Ensure we're on the jobs screen
  await navigateToJobsScreen();
  
  // Tap on filter button
  await element(by.id('filter-button')).tap();
  
  // Wait for filter modal to appear
  await waitFor(element(by.id('filter-modal'))).toBeVisible().withTimeout(2000);
  
  // Apply search query if provided
  if (filters.query) {
    await element(by.id('search-input')).tap();
    await element(by.id('search-input')).typeText(filters.query);
  }
  
  // Apply job type filter if provided
  if (filters.type) {
    await element(by.id('job-type-filter')).tap();
    await element(by.text(filters.type === JobType.FIXED_PRICE ? 'Fixed Price' : 'Hourly Rate')).tap();
  }
  
  // Apply budget range if provided
  if (filters.minBudget || filters.maxBudget) {
    await element(by.id('budget-range-filter')).tap();
    
    if (filters.minBudget) {
      await element(by.id('min-budget-input')).tap();
      await element(by.id('min-budget-input')).typeText(filters.minBudget.toString());
    }
    
    if (filters.maxBudget) {
      await element(by.id('max-budget-input')).tap();
      await element(by.id('max-budget-input')).typeText(filters.maxBudget.toString());
    }
    
    await element(by.id('apply-budget-button')).tap();
  }
  
  // Apply skills filter if provided
  if (filters.skills && filters.skills.length > 0) {
    await element(by.id('skills-filter')).tap();
    
    for (const skill of filters.skills) {
      await element(by.id('skill-search-input')).tap();
      await element(by.id('skill-search-input')).typeText(skill);
      await element(by.text(skill)).tap();
    }
    
    await element(by.id('apply-skills-button')).tap();
  }
  
  // Apply remote filter if provided
  if (filters.isRemote !== undefined) {
    await element(by.id('remote-filter-switch')).tap();
  }
  
  // Apply filters
  await element(by.id('apply-filters-button')).tap();
  
  // Wait for job list to refresh
  await waitFor(element(by.id('jobs-list'))).toBeVisible().withTimeout(2000);
}

describe('Job Browsing and Filtering', () => {
  beforeEach(async () => {
    await loginAsFreelancer();
    await navigateToJobsScreen();
  });

  it('should display job list when navigating to Jobs screen', async () => {
    await expect(element(by.id('jobs-list'))).toBeVisible();
    await expect(element(by.id('job-card'))).toBeVisible();
  });

  it('should load more jobs when scrolling to bottom of list', async () => {
    // Get initial number of job cards
    const initialJobCards = await element(by.id('job-card')).getAttributes();
    const initialCount = initialJobCards.length;
    
    // Scroll to bottom to trigger loading more jobs
    await element(by.id('jobs-list')).scrollTo('bottom');
    
    // Wait for loading indicator to appear and disappear
    await waitFor(element(by.id('loading-indicator'))).toBeVisible().withTimeout(1000);
    await waitFor(element(by.id('loading-indicator'))).not.toBeVisible().withTimeout(5000);
    
    // Check if more jobs were loaded
    const updatedJobCards = await element(by.id('job-card')).getAttributes();
    expect(updatedJobCards.length).toBeGreaterThan(initialCount);
  });

  it('should refresh job list when pulling down', async () => {
    // Pull to refresh
    await element(by.id('jobs-list')).swipe('down', 'slow', 0.7);
    
    // Wait for loading indicator to appear and disappear
    await waitFor(element(by.id('refresh-indicator'))).toBeVisible().withTimeout(1000);
    await waitFor(element(by.id('refresh-indicator'))).not.toBeVisible().withTimeout(5000);
    
    // Verify jobs have been refreshed
    await expect(element(by.id('job-card'))).toBeVisible();
  });

  it('should filter jobs by type', async () => {
    await applyJobFilters({ type: JobType.FIXED_PRICE });
    
    // Verify filter badge is visible
    await expect(element(by.id('filter-badge'))).toBeVisible();
    
    // Verify filtered jobs contain fixed price tag
    await expect(element(by.id('fixed-price-tag'))).toBeVisible();
  });

  it('should filter jobs by budget range', async () => {
    await applyJobFilters({ minBudget: 1000, maxBudget: 5000 });
    
    // Verify filter badge is visible
    await expect(element(by.id('filter-badge'))).toBeVisible();
    
    // Verify budget filter is applied
    await expect(element(by.id('budget-filter-badge'))).toBeVisible();
  });

  it('should filter jobs by skills', async () => {
    await applyJobFilters({ skills: ['Machine Learning'] });
    
    // Verify filter badge is visible
    await expect(element(by.id('filter-badge'))).toBeVisible();
    
    // Verify Machine Learning skill tag is visible on job cards
    await expect(element(by.text('Machine Learning'))).toBeVisible();
  });

  it('should show empty state when no jobs match filters', async () => {
    // Apply very specific filters that likely won't match any jobs
    await applyJobFilters({
      skills: ['Very Rare Skill That Does Not Exist'],
      minBudget: 1000000,
      maxBudget: 2000000
    });
    
    // Verify empty state is displayed
    await expect(element(by.id('empty-jobs-state'))).toBeVisible();
    await expect(element(by.text('No jobs found'))).toBeVisible();
  });

  it('should clear all filters when tapping clear button', async () => {
    // Apply some filters
    await applyJobFilters({
      skills: ['Machine Learning'],
      type: JobType.FIXED_PRICE
    });
    
    // Verify filter badge is visible
    await expect(element(by.id('filter-badge'))).toBeVisible();
    
    // Clear filters
    await element(by.id('clear-filters-button')).tap();
    
    // Verify filter badge is no longer visible
    await expect(element(by.id('filter-badge'))).not.toBeVisible();
    
    // Verify jobs are displayed again
    await expect(element(by.id('job-card'))).toBeVisible();
  });
});

describe('Job Creation', () => {
  beforeEach(async () => {
    await loginAsEmployer();
  });

  it('should navigate to create job screen as employer', async () => {
    await navigateToCreateJobScreen();
    
    // Verify create job screen is visible
    await expect(element(by.id('create-job-screen'))).toBeVisible();
    await expect(element(by.text('Create a New Job'))).toBeVisible();
  });

  it('should not show create job button for freelancers', async () => {
    // Log out first
    await element(by.id('menu-button')).tap();
    await element(by.id('logout-button')).tap();
    
    // Log in as freelancer
    await loginAsFreelancer();
    await navigateToJobsScreen();
    
    // Verify create job button is not visible
    await expect(element(by.id('create-job-button'))).not.toBeVisible();
  });

  it('should create a fixed price job', async () => {
    await navigateToCreateJobScreen();
    
    // Fill the job form
    await fillJobForm({
      ...TEST_JOB,
      type: JobType.FIXED_PRICE,
      budget: 5000
    });
    
    // Submit the form
    await element(by.id('submit-job-button')).tap();
    
    // Wait for the success message
    await waitFor(element(by.text('Job Posted Successfully'))).toBeVisible().withTimeout(5000);
    
    // Verify we're redirected to the job detail screen
    await expect(element(by.id('job-detail-screen'))).toBeVisible();
    await expect(element(by.text(TEST_JOB.title))).toBeVisible();
  });

  it('should create an hourly rate job', async () => {
    await navigateToCreateJobScreen();
    
    // Fill the job form
    await fillJobForm({
      ...TEST_JOB,
      type: JobType.HOURLY,
      hourlyRate: 50,
      estimatedHours: 100
    });
    
    // Submit the form
    await element(by.id('submit-job-button')).tap();
    
    // Wait for the success message
    await waitFor(element(by.text('Job Posted Successfully'))).toBeVisible().withTimeout(5000);
    
    // Verify we're redirected to the job detail screen
    await expect(element(by.id('job-detail-screen'))).toBeVisible();
    await expect(element(by.text(TEST_JOB.title))).toBeVisible();
    await expect(element(by.text('Hourly Rate'))).toBeVisible();
  });

  it('should show validation errors for required fields', async () => {
    await navigateToCreateJobScreen();
    
    // Submit without filling any fields
    await element(by.id('submit-job-button')).tap();
    
    // Verify validation errors
    await expect(element(by.text('Title is required'))).toBeVisible();
    await expect(element(by.text('Description is required'))).toBeVisible();
    await expect(element(by.text('Job type is required'))).toBeVisible();
  });

  it('should show validation error for minimum budget value', async () => {
    await navigateToCreateJobScreen();
    
    // Fill the job form with invalid budget
    await fillJobForm({
      ...TEST_JOB,
      budget: 0
    });
    
    // Submit the form
    await element(by.id('submit-job-button')).tap();
    
    // Verify validation error
    await expect(element(by.text('Budget must be greater than 0'))).toBeVisible();
  });

  it('should add multiple skills to job', async () => {
    await navigateToCreateJobScreen();
    
    // Fill basic job details
    await element(by.id('job-title-input')).tap();
    await element(by.id('job-title-input')).typeText(TEST_JOB.title);
    
    // Add multiple skills
    const skills = ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow'];
    
    for (const skill of skills) {
      await element(by.id('job-add-skill-button')).tap();
      await element(by.id('skill-input')).typeText(skill);
      await element(by.id('add-skill-confirm-button')).tap();
      
      // Verify skill chip is visible
      await expect(element(by.text(skill))).toBeVisible();
    }
  });

  it('should upload attachments to a job posting', async () => {
    await navigateToCreateJobScreen();
    
    // Fill basic job details
    await element(by.id('job-title-input')).tap();
    await element(by.id('job-title-input')).typeText(TEST_JOB.title);
    
    // Tap upload attachment button
    await element(by.id('upload-attachment-button')).tap();
    
    // Select document from picker (may require additional mocking for file picker)
    await element(by.id('document-picker-item')).atIndex(0).tap();
    
    // Verify attachment is added
    await expect(element(by.id('attachment-item'))).toBeVisible();
  });

  it('should cancel job creation when pressing back button', async () => {
    await navigateToCreateJobScreen();
    
    // Fill some data
    await element(by.id('job-title-input')).tap();
    await element(by.id('job-title-input')).typeText(TEST_JOB.title);
    
    // Press back button
    await element(by.id('back-button')).tap();
    
    // Verify confirmation dialog appears
    await expect(element(by.text('Discard changes?'))).toBeVisible();
    
    // Confirm discard
    await element(by.id('confirm-discard-button')).tap();
    
    // Verify we're back on the jobs screen
    await expect(element(by.id('jobs-screen'))).toBeVisible();
  });
});

describe('Job Detail View', () => {
  beforeEach(async () => {
    await loginAsFreelancer();
    await navigateToJobsScreen();
  });

  it('should display job details when selecting a job', async () => {
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Verify job detail screen is visible
    await expect(element(by.id('job-detail-screen'))).toBeVisible();
    
    // Verify job details are displayed
    await expect(element(by.id('job-title'))).toBeVisible();
    await expect(element(by.id('job-description'))).toBeVisible();
    await expect(element(by.id('job-budget'))).toBeVisible();
    await expect(element(by.id('job-poster-name'))).toBeVisible();
  });

  it('should display required skills in job details', async () => {
    // First need to create a job with skills
    await element(by.id('menu-button')).tap();
    await element(by.id('logout-button')).tap();
    
    // Log in as employer to create a job
    await loginAsEmployer();
    await navigateToCreateJobScreen();
    await fillJobForm(TEST_JOB);
    await element(by.id('submit-job-button')).tap();
    
    // Wait for job detail screen
    await waitFor(element(by.id('job-detail-screen'))).toBeVisible().withTimeout(5000);
    
    // Verify skills are displayed
    for (const skill of TEST_JOB.requiredSkills) {
      await expect(element(by.text(skill))).toBeVisible();
    }
  });

  it('should view attached files', async () => {
    // Select first job from the list that has attachments
    await element(by.id('job-with-attachments')).atIndex(0).tap();
    
    // Tap on attachments section
    await element(by.id('attachments-section')).tap();
    
    // Verify attachment viewer is displayed
    await expect(element(by.id('attachment-viewer'))).toBeVisible();
    
    // Tap on an attachment
    await element(by.id('attachment-item')).atIndex(0).tap();
    
    // Verify file preview is displayed
    await expect(element(by.id('file-preview'))).toBeVisible();
  });

  it('should navigate to employer profile from job details', async () => {
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap on employer name/avatar
    await element(by.id('job-poster-profile')).tap();
    
    // Verify profile screen is visible
    await expect(element(by.id('profile-screen'))).toBeVisible();
    await expect(element(by.id('profile-name'))).toBeVisible();
  });

  it('should show apply button for freelancers', async () => {
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Verify apply button is visible
    await expect(element(by.id('apply-button'))).toBeVisible();
  });

  it('should show related jobs section', async () => {
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Scroll to related jobs
    await element(by.id('job-detail-screen')).scrollTo('bottom');
    
    // Verify related jobs section is visible
    await expect(element(by.id('related-jobs-section'))).toBeVisible();
    
    // Verify related job cards are displayed
    await expect(element(by.id('related-job-card'))).toBeVisible();
  });

  it('should navigate back to job list from job details', async () => {
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap back button
    await element(by.id('back-button')).tap();
    
    // Verify we're back on the jobs screen
    await expect(element(by.id('jobs-screen'))).toBeVisible();
  });
});

describe('Proposal Submission', () => {
  beforeEach(async () => {
    await loginAsFreelancer();
    await navigateToJobsScreen();
  });

  it('should open proposal form when tapping apply button', async () => {
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap apply button
    await element(by.id('apply-button')).tap();
    
    // Verify proposal form is visible
    await expect(element(by.id('proposal-form'))).toBeVisible();
    await expect(element(by.text('Submit Proposal'))).toBeVisible();
  });

  it('should not show apply button for employers', async () => {
    // Log out first
    await element(by.id('menu-button')).tap();
    await element(by.id('logout-button')).tap();
    
    // Log in as employer
    await loginAsEmployer();
    await navigateToJobsScreen();
    
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Verify apply button is not visible
    await expect(element(by.id('apply-button'))).not.toBeVisible();
  });

  it('should show validation errors on empty proposal submission', async () => {
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap apply button
    await element(by.id('apply-button')).tap();
    
    // Try to submit without filling any fields
    await element(by.id('submit-proposal-button')).tap();
    
    // Verify validation errors
    await expect(element(by.text('Cover letter is required'))).toBeVisible();
    await expect(element(by.text('Proposed budget is required'))).toBeVisible();
    await expect(element(by.text('Estimated duration is required'))).toBeVisible();
  });

  it('should submit proposal with all fields', async () => {
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap apply button
    await element(by.id('apply-button')).tap();
    
    // Fill proposal form
    await fillProposalForm(TEST_PROPOSAL);
    
    // Submit proposal
    await element(by.id('submit-proposal-button')).tap();
    
    // Wait for success message
    await waitFor(element(by.text('Proposal Submitted Successfully'))).toBeVisible().withTimeout(5000);
    
    // Verify we're redirected back to job detail
    await expect(element(by.id('job-detail-screen'))).toBeVisible();
  });

  it('should add milestones to proposal', async () => {
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap apply button
    await element(by.id('apply-button')).tap();
    
    // Fill basic proposal details
    await element(by.id('proposal-cover-letter-input')).tap();
    await element(by.id('proposal-cover-letter-input')).typeText(TEST_PROPOSAL.coverLetter);
    await element(by.id('proposal-budget-input')).tap();
    await element(by.id('proposal-budget-input')).typeText(TEST_PROPOSAL.proposedBudget.toString());
    
    // Add milestones
    const milestones = [
      { title: 'Research and Planning', description: 'Research and plan project approach', amount: 1500 },
      { title: 'Implementation', description: 'Implement the core functionality', amount: 2000 },
      { title: 'Testing and Delivery', description: 'Test and deliver the final solution', amount: 1300 }
    ];
    
    for (const milestone of milestones) {
      await element(by.id('add-milestone-button')).tap();
      
      await element(by.id('milestone-title-input')).tap();
      await element(by.id('milestone-title-input')).typeText(milestone.title);
      
      await element(by.id('milestone-description-input')).tap();
      await element(by.id('milestone-description-input')).typeText(milestone.description);
      
      await element(by.id('milestone-amount-input')).tap();
      await element(by.id('milestone-amount-input')).typeText(milestone.amount.toString());
      
      await element(by.id('save-milestone-button')).tap();
      
      // Verify milestone is added to the list
      await expect(element(by.text(milestone.title))).toBeVisible();
    }
  });

  it('should attach portfolio items to proposal', async () => {
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap apply button
    await element(by.id('apply-button')).tap();
    
    // Fill basic proposal details
    await fillProposalForm(TEST_PROPOSAL);
    
    // Tap attach portfolio button
    await element(by.id('attach-portfolio-button')).tap();
    
    // Select portfolio items
    await element(by.id('portfolio-item-checkbox')).atIndex(0).tap();
    await element(by.id('portfolio-item-checkbox')).atIndex(1).tap();
    
    // Tap confirm button
    await element(by.id('confirm-portfolio-button')).tap();
    
    // Verify portfolio items are attached
    await expect(element(by.id('attached-portfolio-item'))).toHaveLength(2);
  });

  it('should cancel proposal submission', async () => {
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap apply button
    await element(by.id('apply-button')).tap();
    
    // Fill some data
    await element(by.id('proposal-cover-letter-input')).tap();
    await element(by.id('proposal-cover-letter-input')).typeText('Some cover letter text');
    
    // Press cancel button
    await element(by.id('cancel-proposal-button')).tap();
    
    // Verify confirmation dialog appears
    await expect(element(by.text('Discard proposal?'))).toBeVisible();
    
    // Confirm discard
    await element(by.id('confirm-discard-button')).tap();
    
    // Verify we're back on the job detail screen
    await expect(element(by.id('job-detail-screen'))).toBeVisible();
  });

  it('should handle error during proposal submission', async () => {
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap apply button
    await element(by.id('apply-button')).tap();
    
    // Fill proposal form
    await fillProposalForm({
      ...TEST_PROPOSAL,
      // Use a value that will trigger a server error in the mock
      proposedBudget: 999 // Assuming 999 is set to trigger an error in the mock API
    });
    
    // Submit proposal
    await element(by.id('submit-proposal-button')).tap();
    
    // Verify error message is displayed
    await expect(element(by.text('Error submitting proposal'))).toBeVisible();
    
    // Verify error details are shown
    await expect(element(by.id('error-details'))).toBeVisible();
  });
});

describe('Job Management', () => {
  beforeEach(async () => {
    await loginAsEmployer();
  });

  it('should display employer\'s posted jobs', async () => {
    // Navigate to my jobs tab
    await element(by.id('my-jobs-tab')).tap();
    
    // Verify my jobs screen is visible
    await expect(element(by.id('my-jobs-screen'))).toBeVisible();
    await expect(element(by.text('My Jobs'))).toBeVisible();
    
    // Verify posted jobs are displayed
    await expect(element(by.id('job-card'))).toBeVisible();
  });

  it('should navigate to edit job screen', async () => {
    // Navigate to my jobs tab
    await element(by.id('my-jobs-tab')).tap();
    
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap edit button
    await element(by.id('edit-job-button')).tap();
    
    // Verify edit job screen is visible
    await expect(element(by.id('edit-job-screen'))).toBeVisible();
    await expect(element(by.text('Edit Job'))).toBeVisible();
  });

  it('should update job details', async () => {
    // Navigate to my jobs tab
    await element(by.id('my-jobs-tab')).tap();
    
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap edit button
    await element(by.id('edit-job-button')).tap();
    
    // Update job title
    const updatedTitle = 'Updated Job Title';
    await element(by.id('job-title-input')).clearText();
    await element(by.id('job-title-input')).typeText(updatedTitle);
    
    // Save changes
    await element(by.id('save-job-button')).tap();
    
    // Wait for success message
    await waitFor(element(by.text('Job Updated Successfully'))).toBeVisible().withTimeout(5000);
    
    // Verify job title is updated
    await expect(element(by.text(updatedTitle))).toBeVisible();
  });

  it('should view proposals for a job', async () => {
    // Navigate to my jobs tab
    await element(by.id('my-jobs-tab')).tap();
    
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap view proposals button
    await element(by.id('view-proposals-button')).tap();
    
    // Verify proposals screen is visible
    await expect(element(by.id('proposals-screen'))).toBeVisible();
    await expect(element(by.text('Proposals'))).toBeVisible();
  });

  it('should view proposal details', async () => {
    // Navigate to my jobs tab
    await element(by.id('my-jobs-tab')).tap();
    
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap view proposals button
    await element(by.id('view-proposals-button')).tap();
    
    // Select first proposal
    await element(by.id('proposal-card')).atIndex(0).tap();
    
    // Verify proposal detail screen is visible
    await expect(element(by.id('proposal-detail-screen'))).toBeVisible();
    await expect(element(by.id('proposal-cover-letter'))).toBeVisible();
    await expect(element(by.id('proposal-budget'))).toBeVisible();
    await expect(element(by.id('freelancer-name'))).toBeVisible();
  });

  it('should accept a proposal', async () => {
    // Navigate to my jobs tab
    await element(by.id('my-jobs-tab')).tap();
    
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap view proposals button
    await element(by.id('view-proposals-button')).tap();
    
    // Select first proposal
    await element(by.id('proposal-card')).atIndex(0).tap();
    
    // Tap accept proposal button
    await element(by.id('accept-proposal-button')).tap();
    
    // Confirm acceptance
    await element(by.id('confirm-accept-button')).tap();
    
    // Wait for success message
    await waitFor(element(by.text('Proposal Accepted'))).toBeVisible().withTimeout(5000);
    
    // Verify proposal status is updated to accepted
    await expect(element(by.text('Accepted'))).toBeVisible();
  });

  it('should close a job', async () => {
    // Navigate to my jobs tab
    await element(by.id('my-jobs-tab')).tap();
    
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap more options button
    await element(by.id('job-options-button')).tap();
    
    // Tap close job option
    await element(by.text('Close Job')).tap();
    
    // Verify confirmation dialog appears
    await expect(element(by.text('Close this job?'))).toBeVisible();
    
    // Confirm closing
    await element(by.id('confirm-close-button')).tap();
    
    // Wait for success message
    await waitFor(element(by.text('Job Closed Successfully'))).toBeVisible().withTimeout(5000);
    
    // Verify job status is updated to closed
    await expect(element(by.text('Closed'))).toBeVisible();
  });

  it('should sort received proposals', async () => {
    // Navigate to my jobs tab
    await element(by.id('my-jobs-tab')).tap();
    
    // Select first job from the list
    await element(by.id('job-card')).atIndex(0).tap();
    
    // Tap view proposals button
    await element(by.id('view-proposals-button')).tap();
    
    // Tap sort button
    await element(by.id('sort-proposals-button')).tap();
    
    // Select sort by relevance
    await element(by.text('Sort by Relevance')).tap();
    
    // Verify proposals are sorted
    await expect(element(by.id('relevance-sorted-list'))).toBeVisible();
    
    // Tap sort button again
    await element(by.id('sort-proposals-button')).tap();
    
    // Select sort by date
    await element(by.text('Sort by Date')).tap();
    
    // Verify proposals are sorted by date
    await expect(element(by.id('date-sorted-list'))).toBeVisible();
  });
});