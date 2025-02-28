-- PostgreSQL version: 15.x

-- ==============================================
-- USER SYSTEM MIGRATION
-- Purpose: Creates user-related tables for the AI Talent Marketplace
-- Dependencies: 00001_init.sql (for custom types and functions)
-- ==============================================

-- ==============================================
-- USERS TABLE
-- Core user accounts with authentication data
-- ==============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    status user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    auth_provider auth_provider NOT NULL DEFAULT 'LOCAL',
    auth_provider_id VARCHAR(255) NULL,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret VARCHAR(255) NULL,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    verification_token VARCHAR(255) NULL,
    verification_token_expiry TIMESTAMPTZ NULL,
    password_reset_token VARCHAR(255) NULL,
    password_reset_expiry TIMESTAMPTZ NULL,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create indexes for efficient lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id);

-- ==============================================
-- PROFILES TABLE
-- AI professional profiles
-- ==============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    bio TEXT NOT NULL,
    avatar_url VARCHAR(512) NULL,
    hourly_rate DECIMAL(10, 2) NULL,
    skills JSONB NOT NULL DEFAULT '[]',
    identity_verified verification_status NOT NULL DEFAULT 'UNVERIFIED',
    skills_verified verification_status NOT NULL DEFAULT 'UNVERIFIED',
    is_top_rated BOOLEAN NOT NULL DEFAULT FALSE,
    location VARCHAR(255) NULL,
    availability VARCHAR(100) NULL,
    github_url VARCHAR(512) NULL,
    linkedin_url VARCHAR(512) NULL,
    kaggle_url VARCHAR(512) NULL,
    website VARCHAR(512) NULL,
    experience_years INTEGER NULL,
    education JSONB NOT NULL DEFAULT '[]',
    certifications JSONB NOT NULL DEFAULT '[]',
    rating DECIMAL(3, 2) NULL,
    total_jobs INTEGER NOT NULL DEFAULT 0,
    total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_profiles_user_id UNIQUE (user_id)
);

-- Create indexes for efficient lookups and filtering
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_skills ON profiles USING GIN(skills);
CREATE INDEX idx_profiles_hourly_rate ON profiles(hourly_rate);
CREATE INDEX idx_profiles_location ON profiles(location);
CREATE INDEX idx_profiles_is_top_rated ON profiles(is_top_rated);
CREATE INDEX idx_profiles_rating ON profiles(rating);

-- ==============================================
-- PORTFOLIO_ITEMS TABLE
-- AI professional work samples
-- ==============================================
CREATE TABLE portfolio_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(512) NULL,
    project_url VARCHAR(512) NULL,
    github_url VARCHAR(512) NULL,
    kaggle_url VARCHAR(512) NULL,
    technologies JSONB NOT NULL DEFAULT '[]',
    category VARCHAR(100) NOT NULL,
    ai_models JSONB NOT NULL DEFAULT '[]',
    problem_solved TEXT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create indexes for efficient lookups and filtering
CREATE INDEX idx_portfolio_items_profile_id ON portfolio_items(profile_id);
CREATE INDEX idx_portfolio_items_category ON portfolio_items(category);
CREATE INDEX idx_portfolio_items_technologies ON portfolio_items USING GIN(technologies);

-- ==============================================
-- COMPANIES TABLE
-- Employer organizations
-- ==============================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    logo_url VARCHAR(512) NULL,
    website VARCHAR(512) NULL,
    industry VARCHAR(100) NOT NULL,
    size VARCHAR(50) NULL,
    location VARCHAR(255) NULL,
    verified verification_status NOT NULL DEFAULT 'UNVERIFIED',
    ai_interests JSONB NOT NULL DEFAULT '[]',
    previous_ai_projects JSONB NOT NULL DEFAULT '[]',
    founded_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create indexes for efficient lookups and filtering
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_verified ON companies(verified);
CREATE INDEX idx_companies_location ON companies(location);

-- ==============================================
-- TRIGGERS
-- For timestamp updates and audit logging
-- ==============================================

-- Triggers for updated_at columns
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_items_updated_at
BEFORE UPDATE ON portfolio_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Audit log triggers for users table
CREATE TRIGGER audit_users_insert
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_users_update
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_users_delete
AFTER DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- Audit log triggers for profiles table
CREATE TRIGGER audit_profiles_insert
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_profiles_update
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_profiles_delete
AFTER DELETE ON profiles
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- Audit log triggers for portfolio_items table
CREATE TRIGGER audit_portfolio_items_insert
AFTER INSERT ON portfolio_items
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_portfolio_items_update
AFTER UPDATE ON portfolio_items
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_portfolio_items_delete
AFTER DELETE ON portfolio_items
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- Audit log triggers for companies table
CREATE TRIGGER audit_companies_insert
AFTER INSERT ON companies
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_companies_update
AFTER UPDATE ON companies
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_companies_delete
AFTER DELETE ON companies
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- ==============================================
-- DOCUMENTATION
-- ==============================================

-- Add documentation comments for tables
COMMENT ON TABLE users IS 'Stores user accounts including authentication information and core attributes';
COMMENT ON TABLE profiles IS 'Stores AI professional profiles including skills, verification status, and work history';
COMMENT ON TABLE portfolio_items IS 'Stores AI project portfolio items showcasing professional experience';
COMMENT ON TABLE companies IS 'Stores company profiles for employers seeking AI talent';