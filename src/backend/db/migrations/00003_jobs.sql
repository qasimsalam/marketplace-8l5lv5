-- PostgreSQL version: 15.x

-- ==============================================
-- JOBS SYSTEM MIGRATION
-- Purpose: Creates job-related tables for the AI Talent Marketplace
-- Dependencies: 00001_init.sql (for custom types and functions), 00002_users.sql (for users table)
-- ==============================================

-- ==============================================
-- CUSTOM TYPES
-- ==============================================

-- Job difficulty levels
CREATE TYPE job_difficulty AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'EXPERT'
);

-- Proposal status values
CREATE TYPE proposal_status AS ENUM (
    'PENDING',
    'UNDER_REVIEW',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN'
);

-- ==============================================
-- JOBS TABLE
-- AI projects and positions
-- ==============================================
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    poster_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    poster_company_id UUID NULL REFERENCES companies(id) ON DELETE SET NULL ON UPDATE CASCADE,
    type job_type NOT NULL,
    status job_status NOT NULL DEFAULT 'DRAFT',
    budget DECIMAL(12, 2) NULL,
    min_budget DECIMAL(12, 2) NULL,
    max_budget DECIMAL(12, 2) NULL,
    hourly_rate DECIMAL(10, 2) NULL,
    estimated_duration INTEGER NULL,
    estimated_hours INTEGER NULL,
    difficulty job_difficulty NULL,
    location VARCHAR(255) NULL,
    is_remote BOOLEAN NOT NULL DEFAULT TRUE,
    required_skills JSONB NOT NULL DEFAULT '[]',
    preferred_skills JSONB NOT NULL DEFAULT '[]',
    attachments JSONB NOT NULL DEFAULT '[]',
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100) NULL,
    expires_at TIMESTAMPTZ NULL,
    start_date TIMESTAMPTZ NULL,
    end_date TIMESTAMPTZ NULL,
    contract_id UUID NULL,
    freelancer_id UUID NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create indexes for efficient lookups and filtering
CREATE INDEX idx_jobs_poster_id ON jobs(poster_id);
CREATE INDEX idx_jobs_poster_company_id ON jobs(poster_company_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_difficulty ON jobs(difficulty);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_required_skills ON jobs USING GIN(required_skills);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_is_remote ON jobs(is_remote);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_budget ON jobs(budget);
CREATE INDEX idx_jobs_hourly_rate ON jobs(hourly_rate);

-- Set up partitioning for jobs table by creation date
-- Retention policy: 36 months of data
-- Note: A separate maintenance job should be created to drop partitions older than 36 months
SELECT create_partition_function('jobs', 'created_at');

-- ==============================================
-- PROPOSALS TABLE
-- Freelancer job applications
-- ==============================================
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    cover_letter TEXT NOT NULL,
    proposed_rate DECIMAL(10, 2) NULL,
    proposed_budget DECIMAL(12, 2) NULL,
    estimated_duration INTEGER NULL,
    estimated_hours INTEGER NULL,
    attachments JSONB NOT NULL DEFAULT '[]',
    status proposal_status NOT NULL DEFAULT 'PENDING',
    relevance_score DECIMAL(5, 2) NULL,
    rejection_reason TEXT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_proposals_job_freelancer UNIQUE (job_id, freelancer_id)
);

-- Create indexes for efficient lookups and filtering
CREATE INDEX idx_proposals_job_id ON proposals(job_id);
CREATE INDEX idx_proposals_freelancer_id ON proposals(freelancer_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_relevance_score ON proposals(relevance_score);
CREATE INDEX idx_proposals_created_at ON proposals(created_at);
CREATE INDEX idx_proposals_expires_at ON proposals(expires_at);

-- ==============================================
-- PROPOSAL_MILESTONES TABLE
-- Milestone-based payment structures for proposals
-- ==============================================
CREATE TABLE proposal_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE ON UPDATE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient lookups and filtering
CREATE INDEX idx_proposal_milestones_proposal_id ON proposal_milestones(proposal_id);
CREATE INDEX idx_proposal_milestones_due_date ON proposal_milestones(due_date);
CREATE INDEX idx_proposal_milestones_order ON proposal_milestones(proposal_id, order);

-- ==============================================
-- JOB_MATCHES TABLE
-- AI-powered job matching with detailed scores
-- ==============================================
CREATE TABLE job_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
    freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    match_score DECIMAL(5, 2) NOT NULL,
    skill_match DECIMAL(5, 2) NOT NULL,
    experience_match DECIMAL(5, 2) NOT NULL,
    rate_match DECIMAL(5, 2) NOT NULL,
    availability_match DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_job_matches_job_freelancer UNIQUE (job_id, freelancer_id)
);

-- Create indexes for efficient lookups and filtering
CREATE INDEX idx_job_matches_job_id ON job_matches(job_id);
CREATE INDEX idx_job_matches_freelancer_id ON job_matches(freelancer_id);
CREATE INDEX idx_job_matches_match_score ON job_matches(match_score);

-- ==============================================
-- TRIGGERS
-- For timestamp updates and audit logging
-- ==============================================

-- Triggers for updated_at columns
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposal_milestones_updated_at
BEFORE UPDATE ON proposal_milestones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_matches_updated_at
BEFORE UPDATE ON job_matches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Audit log triggers for jobs table
CREATE TRIGGER audit_jobs_insert
AFTER INSERT ON jobs
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_jobs_update
AFTER UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_jobs_delete
AFTER DELETE ON jobs
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- Audit log triggers for proposals table
CREATE TRIGGER audit_proposals_insert
AFTER INSERT ON proposals
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_proposals_update
AFTER UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_proposals_delete
AFTER DELETE ON proposals
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- Audit log triggers for proposal_milestones table
CREATE TRIGGER audit_proposal_milestones_insert
AFTER INSERT ON proposal_milestones
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_proposal_milestones_update
AFTER UPDATE ON proposal_milestones
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_proposal_milestones_delete
AFTER DELETE ON proposal_milestones
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- Audit log triggers for job_matches table
CREATE TRIGGER audit_job_matches_insert
AFTER INSERT ON job_matches
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_job_matches_update
AFTER UPDATE ON job_matches
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_job_matches_delete
AFTER DELETE ON job_matches
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- ==============================================
-- DOCUMENTATION
-- ==============================================

-- Add documentation comments
COMMENT ON TABLE jobs IS 'Stores AI job postings with detailed requirements, skills, and payment information';
COMMENT ON TABLE proposals IS 'Stores freelancer proposals for specific jobs with cover letters and payment terms';
COMMENT ON TABLE proposal_milestones IS 'Stores detailed milestones for milestone-based proposals with payment amounts and due dates';
COMMENT ON TABLE job_matches IS 'Stores AI-calculated job matches between jobs and freelancers with detailed match score components';

COMMENT ON TYPE job_difficulty IS 'Enumeration of job difficulty levels from BEGINNER to EXPERT';
COMMENT ON TYPE proposal_status IS 'Enumeration of proposal statuses throughout the proposal lifecycle';