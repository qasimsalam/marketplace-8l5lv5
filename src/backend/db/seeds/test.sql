-- ==========================================
-- TEST DATABASE SEED FILE
-- ==========================================
-- Version: 1.0.0
-- 
-- This file populates the test database with controlled test data
-- for all tables in the AI Talent Marketplace application.
-- All data has fixed identifiers for predictable automated testing.
-- ==========================================

BEGIN;

-- ==========================================
-- SETUP: CLEAN DATABASE
-- ==========================================

-- Temporarily disable triggers
SET session_replication_role = 'replica';

-- Truncate all tables (in reverse order of dependencies)
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE milestones CASCADE;
TRUNCATE TABLE contracts CASCADE;
TRUNCATE TABLE proposals CASCADE;
TRUNCATE TABLE jobs CASCADE;
TRUNCATE TABLE portfolio_items CASCADE;
TRUNCATE TABLE skills CASCADE;
TRUNCATE TABLE profile_skills CASCADE;
TRUNCATE TABLE company_profiles CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE users CASCADE;

-- Reset sequences
ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS milestones_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS contracts_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS proposals_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS jobs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS portfolio_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS skills_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS profile_skills_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS company_profiles_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS profiles_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- ==========================================
-- 1. SKILLS
-- ==========================================

INSERT INTO skills (id, name, category) VALUES
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Machine Learning', 'AI'),
('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'Deep Learning', 'AI'),
('f47ac10b-58cc-4372-a567-0e02b2c3d481', 'Computer Vision', 'AI'),
('f47ac10b-58cc-4372-a567-0e02b2c3d482', 'Natural Language Processing', 'AI'),
('f47ac10b-58cc-4372-a567-0e02b2c3d483', 'Reinforcement Learning', 'AI'),
('f47ac10b-58cc-4372-a567-0e02b2c3d484', 'Python', 'Programming'),
('f47ac10b-58cc-4372-a567-0e02b2c3d485', 'TensorFlow', 'Framework'),
('f47ac10b-58cc-4372-a567-0e02b2c3d486', 'PyTorch', 'Framework'),
('f47ac10b-58cc-4372-a567-0e02b2c3d487', 'Data Science', 'AI'),
('f47ac10b-58cc-4372-a567-0e02b2c3d488', 'Neural Networks', 'AI');

-- ==========================================
-- 2. USERS
-- ==========================================

-- Admin user
INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@test.com', '$2a$10$Mcqn4tVNXDt49/bhOM2HEuiEHwskJpzFGIGOx9r.U8qwYFasRlANm', 'ADMIN', 'ACTIVE', NOW() - INTERVAL '30 days', NOW());

-- Employer users
INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'employer1@test.com', '$2a$10$Mcqn4tVNXDt49/bhOM2HEuiEHwskJpzFGIGOx9r.U8qwYFasRlANm', 'EMPLOYER', 'ACTIVE', NOW() - INTERVAL '28 days', NOW()),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'employer2@test.com', '$2a$10$Mcqn4tVNXDt49/bhOM2HEuiEHwskJpzFGIGOx9r.U8qwYFasRlANm', 'EMPLOYER', 'ACTIVE', NOW() - INTERVAL '26 days', NOW()),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'employer3@test.com', '$2a$10$Mcqn4tVNXDt49/bhOM2HEuiEHwskJpzFGIGOx9r.U8qwYFasRlANm', 'EMPLOYER', 'PENDING_VERIFICATION', NOW() - INTERVAL '24 days', NOW()),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'employer4@test.com', '$2a$10$Mcqn4tVNXDt49/bhOM2HEuiEHwskJpzFGIGOx9r.U8qwYFasRlANm', 'EMPLOYER', 'INACTIVE', NOW() - INTERVAL '22 days', NOW());

-- Freelancer users
INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'freelancer1@test.com', '$2a$10$Mcqn4tVNXDt49/bhOM2HEuiEHwskJpzFGIGOx9r.U8qwYFasRlANm', 'FREELANCER', 'ACTIVE', NOW() - INTERVAL '27 days', NOW()),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'freelancer2@test.com', '$2a$10$Mcqn4tVNXDt49/bhOM2HEuiEHwskJpzFGIGOx9r.U8qwYFasRlANm', 'FREELANCER', 'ACTIVE', NOW() - INTERVAL '25 days', NOW()),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'freelancer3@test.com', '$2a$10$Mcqn4tVNXDt49/bhOM2HEuiEHwskJpzFGIGOx9r.U8qwYFasRlANm', 'FREELANCER', 'PENDING_VERIFICATION', NOW() - INTERVAL '23 days', NOW()),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'freelancer4@test.com', '$2a$10$Mcqn4tVNXDt49/bhOM2HEuiEHwskJpzFGIGOx9r.U8qwYFasRlANm', 'FREELANCER', 'ACTIVE', NOW() - INTERVAL '21 days', NOW()),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'freelancer5@test.com', '$2a$10$Mcqn4tVNXDt49/bhOM2HEuiEHwskJpzFGIGOx9r.U8qwYFasRlANm', 'FREELANCER', 'INACTIVE', NOW() - INTERVAL '19 days', NOW());

-- ==========================================
-- 3. PROFILES FOR FREELANCERS
-- ==========================================

INSERT INTO profiles (id, user_id, first_name, last_name, title, bio, hourly_rate, is_verified, availability_status, created_at, updated_at) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'John', 'Doe', 'Senior ML Engineer', 'Experienced machine learning engineer with focus on computer vision applications.', 120.00, TRUE, 'AVAILABLE', NOW() - INTERVAL '27 days', NOW()),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Jane', 'Smith', 'NLP Specialist', 'Expert in natural language processing with strong academic background.', 95.00, TRUE, 'AVAILABLE', NOW() - INTERVAL '25 days', NOW()),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Mike', 'Johnson', 'AI Researcher', 'AI researcher focusing on reinforcement learning and robotics applications.', 110.00, FALSE, 'AVAILABLE', NOW() - INTERVAL '23 days', NOW()),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Sarah', 'Williams', 'Deep Learning Engineer', 'Deep learning engineer with expertise in TensorFlow and PyTorch.', 105.00, TRUE, 'UNAVAILABLE', NOW() - INTERVAL '21 days', NOW()),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'David', 'Brown', 'Data Scientist', 'Data scientist with strong background in statistical modeling and machine learning.', 85.00, FALSE, 'AVAILABLE', NOW() - INTERVAL '19 days', NOW());

-- ==========================================
-- 4. PROFILE SKILLS
-- ==========================================

-- John Doe's skills
INSERT INTO profile_skills (profile_id, skill_id, proficiency_level, years_experience) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'EXPERT', 8),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', 'EXPERT', 7),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f47ac10b-58cc-4372-a567-0e02b2c3d484', 'EXPERT', 10),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f47ac10b-58cc-4372-a567-0e02b2c3d485', 'ADVANCED', 6);

-- Jane Smith's skills
INSERT INTO profile_skills (profile_id, skill_id, proficiency_level, years_experience) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'ADVANCED', 5),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'f47ac10b-58cc-4372-a567-0e02b2c3d482', 'EXPERT', 6),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'f47ac10b-58cc-4372-a567-0e02b2c3d484', 'ADVANCED', 7),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'f47ac10b-58cc-4372-a567-0e02b2c3d486', 'INTERMEDIATE', 3);

-- Mike Johnson's skills
INSERT INTO profile_skills (profile_id, skill_id, proficiency_level, years_experience) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'ADVANCED', 4),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'f47ac10b-58cc-4372-a567-0e02b2c3d483', 'EXPERT', 5),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'f47ac10b-58cc-4372-a567-0e02b2c3d484', 'ADVANCED', 6);

-- Sarah Williams's skills
INSERT INTO profile_skills (profile_id, skill_id, proficiency_level, years_experience) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'EXPERT', 7),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'EXPERT', 6),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'f47ac10b-58cc-4372-a567-0e02b2c3d485', 'EXPERT', 5),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'f47ac10b-58cc-4372-a567-0e02b2c3d486', 'EXPERT', 5),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'f47ac10b-58cc-4372-a567-0e02b2c3d488', 'EXPERT', 7);

-- David Brown's skills
INSERT INTO profile_skills (profile_id, skill_id, proficiency_level, years_experience) VALUES
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 'ADVANCED', 4),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'f47ac10b-58cc-4372-a567-0e02b2c3d487', 'EXPERT', 6),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'f47ac10b-58cc-4372-a567-0e02b2c3d484', 'ADVANCED', 5);

-- ==========================================
-- 5. PORTFOLIO ITEMS
-- ==========================================

-- John Doe's portfolio
INSERT INTO portfolio_items (id, profile_id, title, description, url, image_url, item_type, created_at, updated_at) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Facial Recognition System', 'Built a facial recognition system for a major security company.', 'https://github.com/test/facial-recognition', 'https://example.com/portfolio/facial-recognition.jpg', 'PROJECT', NOW() - INTERVAL '26 days', NOW()),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Object Detection Framework', 'Open-source framework for real-time object detection.', 'https://github.com/test/object-detection', 'https://example.com/portfolio/object-detection.jpg', 'OPEN_SOURCE', NOW() - INTERVAL '25 days', NOW());

-- Jane Smith's portfolio
INSERT INTO portfolio_items (id, profile_id, title, description, url, image_url, item_type, created_at, updated_at) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Sentiment Analysis Tool', 'Developed a sentiment analysis tool for social media monitoring.', 'https://github.com/test/sentiment-analysis', 'https://example.com/portfolio/sentiment-analysis.jpg', 'PROJECT', NOW() - INTERVAL '24 days', NOW()),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'NLP Research Paper', 'Published research on advanced NLP techniques.', 'https://example.com/papers/nlp-research.pdf', 'https://example.com/portfolio/nlp-paper.jpg', 'PUBLICATION', NOW() - INTERVAL '23 days', NOW());

-- Mike Johnson's portfolio
INSERT INTO portfolio_items (id, profile_id, title, description, url, image_url, item_type, created_at, updated_at) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Reinforcement Learning for Robotics', 'Applied RL techniques to robotic control systems.', 'https://github.com/test/rl-robotics', 'https://example.com/portfolio/rl-robotics.jpg', 'PROJECT', NOW() - INTERVAL '22 days', NOW());

-- Sarah Williams's portfolio
INSERT INTO portfolio_items (id, profile_id, title, description, url, image_url, item_type, created_at, updated_at) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Deep Learning Framework Comparison', 'Benchmarked performance of popular deep learning frameworks.', 'https://github.com/test/dl-benchmark', 'https://example.com/portfolio/dl-benchmark.jpg', 'RESEARCH', NOW() - INTERVAL '20 days', NOW()),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Image Generation with GANs', 'Created advanced GAN models for realistic image generation.', 'https://github.com/test/image-gans', 'https://example.com/portfolio/image-gans.jpg', 'PROJECT', NOW() - INTERVAL '19 days', NOW());

-- David Brown's portfolio
INSERT INTO portfolio_items (id, profile_id, title, description, url, image_url, item_type, created_at, updated_at) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Predictive Analytics Dashboard', 'Built a dashboard for business intelligence and predictions.', 'https://github.com/test/analytics-dashboard', 'https://example.com/portfolio/analytics-dashboard.jpg', 'PROJECT', NOW() - INTERVAL '18 days', NOW());

-- ==========================================
-- 6. COMPANY PROFILES
-- ==========================================

INSERT INTO company_profiles (id, user_id, company_name, industry, description, website, is_verified, employee_count, created_at, updated_at) VALUES
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TechCorp Inc.', 'Technology', 'Leading technology company focused on AI solutions.', 'https://techcorp-test.com', TRUE, '50-200', NOW() - INTERVAL '28 days', NOW()),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'DataScience Partners', 'Data Services', 'Consulting firm specializing in data science and AI projects.', 'https://datasciencepartners-test.com', TRUE, '10-50', NOW() - INTERVAL '26 days', NOW()),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'AI Startup Ltd.', 'AI Technology', 'Innovative startup working on cutting-edge AI applications.', 'https://aistartup-test.com', FALSE, '1-10', NOW() - INTERVAL '24 days', NOW()),
('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Enterprise Solutions', 'Enterprise Software', 'Enterprise software provider expanding into AI capabilities.', 'https://enterprise-solutions-test.com', FALSE, '200-500', NOW() - INTERVAL '22 days', NOW());

-- ==========================================
-- 7. JOBS
-- ==========================================

-- Draft Jobs (for testing creation flow)
INSERT INTO jobs (id, title, description, employer_id, budget_type, min_budget, max_budget, status, required_skills, duration_type, location_type, created_at, updated_at) VALUES
('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'AI Model Prototype (DRAFT)', 'Creating a prototype for our new AI initiative.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'FIXED', 5000.00, 7000.00, 'DRAFT', ARRAY['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d484'], 'SHORT_TERM', 'REMOTE', NOW() - INTERVAL '27 days', NOW());

-- Open Jobs
INSERT INTO jobs (id, title, description, employer_id, budget_type, min_budget, max_budget, status, required_skills, duration_type, location_type, created_at, updated_at) VALUES
('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Computer Vision Expert Needed', 'Looking for an expert in computer vision to develop a facial recognition system.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'FIXED', 10000.00, 15000.00, 'OPEN', ARRAY['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', 'f47ac10b-58cc-4372-a567-0e02b2c3d484'], 'SHORT_TERM', 'REMOTE', NOW() - INTERVAL '25 days', NOW()),
('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'NLP Specialist for Chatbot Development', 'Need an NLP specialist to improve our customer service chatbot.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'HOURLY', 80.00, 120.00, 'OPEN', ARRAY['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d482', 'f47ac10b-58cc-4372-a567-0e02b2c3d484'], 'LONG_TERM', 'REMOTE', NOW() - INTERVAL '24 days', NOW()),
('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Deep Learning Engineer', 'Seeking a deep learning engineer to optimize our neural network models.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MILESTONE', 20000.00, 25000.00, 'OPEN', ARRAY['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', 'f47ac10b-58cc-4372-a567-0e02b2c3d488'], 'MEDIUM_TERM', 'HYBRID', NOW() - INTERVAL '23 days', NOW());

-- In Progress Jobs
INSERT INTO jobs (id, title, description, employer_id, budget_type, min_budget, max_budget, status, required_skills, duration_type, location_type, created_at, updated_at) VALUES
('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Ongoing ML Model Development', 'Machine learning model development for predictive analytics.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'MILESTONE', 18000.00, 22000.00, 'IN_PROGRESS', ARRAY['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d487', 'f47ac10b-58cc-4372-a567-0e02b2c3d484'], 'MEDIUM_TERM', 'REMOTE', NOW() - INTERVAL '22 days', NOW()),
('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Computer Vision Implementation', 'Implementing computer vision solution for retail analytics.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'FIXED', 12000.00, 15000.00, 'IN_PROGRESS', ARRAY['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', 'f47ac10b-58cc-4372-a567-0e02b2c3d484'], 'SHORT_TERM', 'REMOTE', NOW() - INTERVAL '21 days', NOW());

-- Completed Jobs
INSERT INTO jobs (id, title, description, employer_id, budget_type, min_budget, max_budget, status, required_skills, duration_type, location_type, created_at, updated_at, completed_at) VALUES
('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'Sentiment Analysis Tool', 'Developed a sentiment analysis tool for our marketing team.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'FIXED', 8000.00, 10000.00, 'COMPLETED', ARRAY['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d482', 'f47ac10b-58cc-4372-a567-0e02b2c3d484'], 'SHORT_TERM', 'REMOTE', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

-- Cancelled Jobs
INSERT INTO jobs (id, title, description, employer_id, budget_type, min_budget, max_budget, status, required_skills, duration_type, location_type, created_at, updated_at) VALUES
('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'AI Research Project (Cancelled)', 'Research project exploring new AI techniques.', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'HOURLY', 90.00, 120.00, 'CANCELLED', ARRAY['f47ac10b-58cc-4372-a567-0e02b2c3d479', 'f47ac10b-58cc-4372-a567-0e02b2c3d483'], 'MEDIUM_TERM', 'REMOTE', NOW() - INTERVAL '19 days', NOW() - INTERVAL '15 days');

-- ==========================================
-- 8. PROPOSALS
-- ==========================================

-- Pending Proposals
INSERT INTO proposals (id, job_id, freelancer_id, cover_letter, proposed_rate, estimated_duration, status, created_at, updated_at) VALUES
('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'I have extensive experience with computer vision and would be perfect for this project.', 12000.00, 30, 'PENDING', NOW() - INTERVAL '24 days', NOW()),
('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'As an NLP specialist, I can greatly improve your chatbot capabilities.', 100.00, 160, 'PENDING', NOW() - INTERVAL '23 days', NOW()),
('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'I specialize in neural network optimization and can help improve your models.', 22000.00, 45, 'PENDING', NOW() - INTERVAL '22 days', NOW());

-- Under Review Proposals
INSERT INTO proposals (id, job_id, freelancer_id, cover_letter, proposed_rate, estimated_duration, status, created_at, updated_at) VALUES
('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'My deep learning expertise can be applied to your computer vision project.', 14000.00, 35, 'UNDER_REVIEW', NOW() - INTERVAL '22 days', NOW());

-- Accepted Proposals
INSERT INTO proposals (id, job_id, freelancer_id, cover_letter, proposed_rate, estimated_duration, status, created_at, updated_at) VALUES
('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'I can develop a high-quality machine learning model for your predictive analytics needs.', 20000.00, 60, 'ACCEPTED', NOW() - INTERVAL '22 days', NOW() - INTERVAL '20 days'),
('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'I would love to implement your computer vision solution for retail analytics.', 14000.00, 30, 'ACCEPTED', NOW() - INTERVAL '21 days', NOW() - INTERVAL '20 days'),
('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'My NLP expertise makes me the perfect fit for your sentiment analysis project.', 9000.00, 25, 'ACCEPTED', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days');

-- Rejected Proposals
INSERT INTO proposals (id, job_id, freelancer_id, cover_letter, proposed_rate, estimated_duration, status, rejection_reason, created_at, updated_at) VALUES
('h0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'I have some experience with NLP and can help with your chatbot.', 110.00, 200, 'REJECTED', 'We found a candidate with more specific NLP experience.', NOW() - INTERVAL '23 days', NOW() - INTERVAL '21 days');

-- ==========================================
-- 9. CONTRACTS
-- ==========================================

-- Draft Contracts
INSERT INTO contracts (id, job_id, freelancer_id, employer_id, status, contract_terms, created_at, updated_at) VALUES
('i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'DRAFT', 'Standard contract terms for milestone-based ML model development project.', NOW() - INTERVAL '20 days', NOW());

-- Active Contracts
INSERT INTO contracts (id, job_id, freelancer_id, employer_id, status, contract_terms, start_date, created_at, updated_at) VALUES
('i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'ACTIVE', 'Milestone-based contract for ML model development with 3 deliverable phases.', NOW() - INTERVAL '19 days', NOW() - INTERVAL '20 days', NOW()),
('i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ACTIVE', 'Fixed price contract for computer vision implementation with weekly progress reports.', NOW() - INTERVAL '18 days', NOW() - INTERVAL '19 days', NOW());

-- Completed Contracts
INSERT INTO contracts (id, job_id, freelancer_id, employer_id, status, contract_terms, start_date, end_date, created_at, updated_at) VALUES
('i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'COMPLETED', 'Fixed price contract for sentiment analysis tool development.', NOW() - INTERVAL '19 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days');

-- Disputed Contracts
INSERT INTO contracts (id, job_id, freelancer_id, employer_id, status, contract_terms, start_date, dispute_reason, created_at, updated_at) VALUES
('i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DISPUTED', 'Hourly contract for AI research with weekly deliverables.', NOW() - INTERVAL '17 days', 'Disagreement on scope of work and deliverables.', NOW() - INTERVAL '19 days', NOW() - INTERVAL '12 days');

-- ==========================================
-- 10. MILESTONES
-- ==========================================

-- Active Contract Milestones - ML Model Project
INSERT INTO milestones (id, contract_id, title, description, amount, due_date, status, created_at, updated_at) VALUES
('j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Data Processing and Preparation', 'Prepare and clean the data for model training.', 6000.00, NOW() + INTERVAL '3 days', 'APPROVED', NOW() - INTERVAL '19 days', NOW()),
('j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Model Development', 'Develop and train the machine learning model.', 8000.00, NOW() + INTERVAL '15 days', 'PENDING', NOW() - INTERVAL '19 days', NOW()),
('j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Integration and Testing', 'Integrate the model and perform testing.', 6000.00, NOW() + INTERVAL '25 days', 'PENDING', NOW() - INTERVAL '19 days', NOW());

-- Active Contract Milestones - Computer Vision Project
INSERT INTO milestones (id, contract_id, title, description, amount, due_date, status, created_at, updated_at) VALUES
('j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'System Architecture', 'Design the CV system architecture.', 4000.00, NOW() + INTERVAL '5 days', 'IN_PROGRESS', NOW() - INTERVAL '18 days', NOW()),
('j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'CV Algorithm Implementation', 'Implement the computer vision algorithms.', 6000.00, NOW() + INTERVAL '15 days', 'PENDING', NOW() - INTERVAL '18 days', NOW()),
('j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Deployment and Optimization', 'Deploy and optimize the CV solution.', 4000.00, NOW() + INTERVAL '25 days', 'PENDING', NOW() - INTERVAL '18 days', NOW());

-- Completed Contract Milestones
INSERT INTO milestones (id, contract_id, title, description, amount, due_date, completion_date, status, created_at, updated_at) VALUES
('j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'NLP Model Development', 'Develop the NLP model for sentiment analysis.', 4500.00, NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days', 'COMPLETED', NOW() - INTERVAL '19 days', NOW() - INTERVAL '12 days'),
('j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Sentiment Analysis Tool Integration', 'Integrate the NLP model into the tool interface.', 4500.00, NOW() - INTERVAL '5 days', NOW() - INTERVAL '7 days', 'COMPLETED', NOW() - INTERVAL '19 days', NOW() - INTERVAL '7 days');

-- ==========================================
-- 11. PAYMENTS
-- ==========================================

-- Pending Payments
INSERT INTO payments (id, contract_id, milestone_id, amount, status, created_at, updated_at) VALUES
('k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 6000.00, 'PENDING', NOW() - INTERVAL '3 days', NOW());

-- Completed Payments
INSERT INTO payments (id, contract_id, milestone_id, amount, status, payment_date, created_at, updated_at) VALUES
('k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 4500.00, 'COMPLETED', NOW() - INTERVAL '11 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days'),
('k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 4500.00, 'COMPLETED', NOW() - INTERVAL '6 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days');

-- Failed Payments
INSERT INTO payments (id, contract_id, milestone_id, amount, status, failure_reason, created_at, updated_at) VALUES
('k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', NULL, 3000.00, 'FAILED', 'Payment method declined', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

-- Escrow Payments
INSERT INTO payments (id, contract_id, milestone_id, amount, status, created_at, updated_at) VALUES
('k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'i0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 4000.00, 'HELD_IN_ESCROW', NOW() - INTERVAL '5 days', NOW());

-- ==========================================
-- 12. TRANSACTIONS
-- ==========================================

-- Payment Transactions
INSERT INTO transactions (id, payment_id, from_user_id, to_user_id, amount, type, status, transaction_date, created_at, updated_at) VALUES
('l0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 4500.00, 'PAYMENT', 'COMPLETED', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),
('l0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 4500.00, 'PAYMENT', 'COMPLETED', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days');

-- Fee Transactions
INSERT INTO transactions (id, payment_id, from_user_id, to_user_id, amount, type, status, transaction_date, created_at, updated_at) VALUES
('l0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 450.00, 'FEE', 'COMPLETED', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),
('l0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 450.00, 'FEE', 'COMPLETED', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days');

-- Escrow Transactions
INSERT INTO transactions (id, payment_id, from_user_id, to_user_id, amount, type, status, transaction_date, created_at, updated_at) VALUES
('l0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'k0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 4000.00, 'ESCROW_HOLD', 'COMPLETED', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days');

COMMIT;