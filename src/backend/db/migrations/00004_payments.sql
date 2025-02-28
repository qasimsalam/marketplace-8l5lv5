-- PostgreSQL version: 15.x

-- ==============================================
-- PAYMENT SYSTEM MIGRATION
-- Purpose: Creates payment-related tables for the AI Talent Marketplace
-- Dependencies: 00001_init.sql (for custom types and functions),
--               00002_users.sql (for users table),
--               00003_jobs.sql (for jobs and proposals tables)
-- ==============================================

-- ==============================================
-- CUSTOM TYPES
-- ==============================================

-- Milestone status values
CREATE TYPE milestone_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'PAID'
);

-- Contract status values
CREATE TYPE contract_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
    'DISPUTED'
);

-- Transaction type values
CREATE TYPE transaction_type AS ENUM (
    'PAYMENT',
    'REFUND',
    'FEE',
    'WITHDRAWAL',
    'DEPOSIT',
    'ESCROW_HOLD',
    'ESCROW_RELEASE'
);

-- ==============================================
-- CONTRACTS TABLE
-- Agreements between clients and freelancers
-- ==============================================
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    freelancer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status contract_status NOT NULL DEFAULT 'DRAFT',
    terms TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]',
    client_signed_at TIMESTAMPTZ NULL,
    freelancer_signed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_contracts_job_id UNIQUE (job_id)
);

-- Create indexes for efficient lookups and filtering
CREATE INDEX idx_contracts_job_id ON contracts(job_id);
CREATE INDEX idx_contracts_client_id ON contracts(client_id);
CREATE INDEX idx_contracts_freelancer_id ON contracts(freelancer_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_start_date ON contracts(start_date);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);

-- ==============================================
-- MILESTONES TABLE
-- Contract milestone deliverables
-- ==============================================
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    status milestone_status NOT NULL DEFAULT 'PENDING',
    order INTEGER NOT NULL,
    completion_proof JSONB NOT NULL DEFAULT '[]',
    payment_id UUID NULL,
    submitted_at TIMESTAMPTZ NULL,
    approved_at TIMESTAMPTZ NULL,
    rejection_reason TEXT NULL,
    paid_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create indexes for efficient lookups and filtering
CREATE INDEX idx_milestones_contract_id ON milestones(contract_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);
CREATE INDEX idx_milestones_payment_id ON milestones(payment_id);
CREATE INDEX idx_milestones_order ON milestones(contract_id, order);

-- ==============================================
-- PAYMENTS TABLE
-- Financial transactions
-- ==============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    milestone_id UUID NULL REFERENCES milestones(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    payee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status payment_status NOT NULL DEFAULT 'PENDING',
    method payment_method NOT NULL,
    description TEXT NOT NULL,
    stripe_payment_intent_id VARCHAR(255) NULL,
    stripe_transfer_id VARCHAR(255) NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    escrow_hold_date TIMESTAMPTZ NULL,
    escrow_release_date TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create indexes for efficient lookups and filtering
CREATE INDEX idx_payments_contract_id ON payments(contract_id);
CREATE INDEX idx_payments_milestone_id ON payments(milestone_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_payee_id ON payments(payee_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_completed_at ON payments(completed_at);
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);

-- Set up partitioning for payments table by creation date
-- Retention policy: 36 months of data
SELECT create_partition_function('payments', 'created_at');

-- ==============================================
-- TRANSACTIONS TABLE
-- Detailed financial record-keeping
-- ==============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NULL REFERENCES payments(id) ON DELETE SET NULL ON UPDATE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    type transaction_type NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT NOT NULL,
    balance DECIMAL(12, 2) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient lookups and filtering
CREATE INDEX idx_transactions_payment_id ON transactions(payment_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Set up partitioning for transactions table by creation date
-- Retention policy: 36 months of data
SELECT create_partition_function('transactions', 'created_at');

-- ==============================================
-- USER_BALANCES TABLE
-- User account balances
-- ==============================================
CREATE TABLE user_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    available_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    pending_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient filtering
CREATE INDEX idx_user_balances_available_balance ON user_balances(available_balance);
CREATE INDEX idx_user_balances_pending_balance ON user_balances(pending_balance);

-- ==============================================
-- PAYMENT_METHODS TABLE
-- Stored user payment methods
-- ==============================================
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    type payment_method NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    name VARCHAR(255) NOT NULL,
    last_four VARCHAR(4) NULL,
    expiry_month INTEGER NULL,
    expiry_year INTEGER NULL,
    stripe_payment_method_id VARCHAR(255) NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create indexes for efficient lookups and filtering
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_type ON payment_methods(type);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(user_id, is_default);
CREATE INDEX idx_payment_methods_stripe_payment_method_id ON payment_methods(stripe_payment_method_id);

-- ==============================================
-- TRIGGERS
-- For timestamp updates and audit logging
-- ==============================================

-- Triggers for updated_at columns
CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON contracts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at
BEFORE UPDATE ON milestones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_balances_updated_at
BEFORE UPDATE ON user_balances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Audit log triggers for contracts table
CREATE TRIGGER audit_contracts_insert
AFTER INSERT ON contracts
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_contracts_update
AFTER UPDATE ON contracts
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_contracts_delete
AFTER DELETE ON contracts
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- Audit log triggers for milestones table
CREATE TRIGGER audit_milestones_insert
AFTER INSERT ON milestones
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_milestones_update
AFTER UPDATE ON milestones
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_milestones_delete
AFTER DELETE ON milestones
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- Audit log triggers for payments table
CREATE TRIGGER audit_payments_insert
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_payments_update
AFTER UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_payments_delete
AFTER DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- Audit log triggers for transactions table
CREATE TRIGGER audit_transactions_insert
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_transactions_update
AFTER UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_transactions_delete
AFTER DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- Audit log triggers for payment_methods table
CREATE TRIGGER audit_payment_methods_insert
AFTER INSERT ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_payment_methods_update
AFTER UPDATE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_payment_methods_delete
AFTER DELETE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- Audit log triggers for user_balances table
CREATE TRIGGER audit_user_balances_insert
AFTER INSERT ON user_balances
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_user_balances_update
AFTER UPDATE ON user_balances
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

CREATE TRIGGER audit_user_balances_delete
AFTER DELETE ON user_balances
FOR EACH ROW
EXECUTE FUNCTION audit_log_function();

-- ==============================================
-- DOCUMENTATION
-- ==============================================

-- Add documentation comments for tables
COMMENT ON TABLE contracts IS 'Stores contract agreements between clients and freelancers';
COMMENT ON TABLE milestones IS 'Stores contract milestones with deliverables and payment amounts';
COMMENT ON TABLE payments IS 'Stores payment transactions including escrow and milestone payments';
COMMENT ON TABLE transactions IS 'Stores detailed financial transaction records for all platform money movements';
COMMENT ON TABLE user_balances IS 'Stores current balance information for platform users';
COMMENT ON TABLE payment_methods IS 'Stores user payment methods including credit cards and bank accounts';

-- Add documentation comments for custom types
COMMENT ON TYPE milestone_status IS 'Enumeration of milestone statuses throughout the milestone lifecycle';
COMMENT ON TYPE contract_status IS 'Enumeration of contract statuses throughout the contract lifecycle';
COMMENT ON TYPE transaction_type IS 'Enumeration of transaction types for financial tracking';