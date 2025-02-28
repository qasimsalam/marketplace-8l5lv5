-- PostgreSQL version: 15.x

-- ==============================================
-- INITIAL DATABASE MIGRATION
-- Purpose: Sets up the foundation for the AI Talent Marketplace database
-- ==============================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- For cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For query monitoring
CREATE EXTENSION IF NOT EXISTS "btree_gin";     -- For GIN index support
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- For trigram-based text search

-- ==============================================
-- CUSTOM TYPES
-- ==============================================

-- User roles
CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'EMPLOYER',
    'FREELANCER',
    'GUEST'
);

-- User account statuses
CREATE TYPE user_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'PENDING_VERIFICATION'
);

-- Verification statuses
CREATE TYPE verification_status AS ENUM (
    'UNVERIFIED',
    'PENDING',
    'VERIFIED',
    'REJECTED'
);

-- Authentication providers
CREATE TYPE auth_provider AS ENUM (
    'LOCAL',
    'GITHUB',
    'LINKEDIN',
    'GOOGLE'
);

-- Job payment structures
CREATE TYPE job_type AS ENUM (
    'FIXED_PRICE',
    'HOURLY',
    'MILESTONE_BASED'
);

-- Job posting statuses
CREATE TYPE job_status AS ENUM (
    'DRAFT',
    'OPEN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'ON_HOLD'
);

-- Payment statuses
CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'REFUNDED',
    'CANCELLED',
    'HELD_IN_ESCROW',
    'RELEASED_FROM_ESCROW'
);

-- Payment methods
CREATE TYPE payment_method AS ENUM (
    'CREDIT_CARD',
    'BANK_TRANSFER',
    'PAYPAL',
    'PLATFORM_CREDIT'
);

-- ==============================================
-- AUDIT SYSTEM
-- ==============================================

-- Audit logs table to track all data changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_data JSONB NULL,
    new_data JSONB NULL,
    changed_by VARCHAR(255) NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45) NULL
);

-- Create indexes for efficient audit log queries
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);
CREATE INDEX idx_audit_logs_operation ON audit_logs(operation);

-- ==============================================
-- UTILITY FUNCTIONS
-- ==============================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log all changes to auditable tables
CREATE OR REPLACE FUNCTION audit_log_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_record_id UUID;
    audit_operation VARCHAR(10);
    old_record_data JSONB := NULL;
    new_record_data JSONB := NULL;
    current_user_id VARCHAR(255) := current_setting('app.current_user_id', TRUE);
    client_ip VARCHAR(45) := current_setting('app.client_ip', TRUE);
BEGIN
    -- Determine the operation type
    IF (TG_OP = 'INSERT') THEN
        audit_operation := 'INSERT';
        audit_record_id := NEW.id;
        new_record_data := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        audit_operation := 'UPDATE';
        audit_record_id := NEW.id;
        old_record_data := to_jsonb(OLD);
        new_record_data := to_jsonb(NEW);
    ELSIF (TG_OP = 'DELETE') THEN
        audit_operation := 'DELETE';
        audit_record_id := OLD.id;
        old_record_data := to_jsonb(OLD);
    END IF;

    -- Handle case when current_user_id or client_ip settings are not available
    IF current_user_id IS NULL THEN
        current_user_id := 'system';
    END IF;
    
    -- Insert the audit record
    INSERT INTO audit_logs (
        table_name,
        record_id,
        operation,
        old_data,
        new_data,
        changed_by,
        changed_at,
        ip_address
    ) VALUES (
        TG_TABLE_NAME,
        audit_record_id,
        audit_operation,
        old_record_data,
        new_record_data,
        current_user_id,
        NOW(),
        client_ip
    );

    -- For DELETE operations, return OLD to allow the deletion to proceed
    -- For INSERT and UPDATE operations, return NEW to allow the operation to proceed
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to handle automatic partitioning of large tables by date
CREATE OR REPLACE FUNCTION create_partition_function(p_table_name TEXT, p_date_column TEXT)
RETURNS VOID AS $$
DECLARE
    today DATE := CURRENT_DATE;
    next_month DATE := today + INTERVAL '1 month';
    prev_month DATE := today - INTERVAL '1 month';
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
    sql_statement TEXT;
BEGIN
    -- Create partitions for previous, current, and next month
    FOR i IN -1..1 LOOP
        start_date := DATE_TRUNC('month', today + (i * INTERVAL '1 month'));
        end_date := DATE_TRUNC('month', start_date + INTERVAL '1 month');
        partition_name := p_table_name || '_' || TO_CHAR(start_date, 'YYYY_MM');
        
        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE c.relname = partition_name AND n.nspname = 'public'
        ) THEN
            -- Create the partition
            sql_statement := 'CREATE TABLE IF NOT EXISTS ' || partition_name || 
                             ' PARTITION OF ' || p_table_name || 
                             ' FOR VALUES FROM (''' || start_date || ''') TO (''' || end_date || ''')';
            EXECUTE sql_statement;
            
            -- Create needed indexes on the partition
            -- This assumes the parent table has predefined indexes
            -- Additional logic may be needed for complex index configurations
            sql_statement := 'CREATE INDEX ' || partition_name || '_' || p_date_column || '_idx ON ' || 
                            partition_name || '(' || p_date_column || ')';
            EXECUTE sql_statement;
            
            RAISE NOTICE 'Created partition % for dates from % to %', 
                          partition_name, start_date, end_date;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Apply partitioning to the audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create a partitioned version of audit_logs if not already partitioned
DO $$ 
BEGIN
    -- Check if audit_logs is already partitioned
    IF NOT EXISTS (
        SELECT 1 FROM pg_partitioned_table pt 
        JOIN pg_class c ON c.oid = pt.partrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'audit_logs' AND n.nspname = 'public'
    ) THEN
        -- Drop existing table and recreate as partitioned
        DROP TABLE IF EXISTS audit_logs CASCADE;
        
        CREATE TABLE audit_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            table_name VARCHAR(255) NOT NULL,
            record_id UUID NOT NULL,
            operation VARCHAR(10) NOT NULL,
            old_data JSONB NULL,
            new_data JSONB NULL,
            changed_by VARCHAR(255) NULL,
            changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ip_address VARCHAR(45) NULL
        ) PARTITION BY RANGE (changed_at);
        
        -- Create indexes for efficient audit log queries
        CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
        CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
        CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);
        CREATE INDEX idx_audit_logs_operation ON audit_logs(operation);
        
        -- Create initial partitions
        PERFORM create_partition_function('audit_logs', 'changed_at');
    END IF;
END $$;

-- ==============================================
-- DOCUMENTATION
-- ==============================================

-- Add documentation comments
COMMENT ON TABLE audit_logs IS 'Stores audit log entries for all data changes in the database';
COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at timestamp when a record is modified';
COMMENT ON FUNCTION audit_log_function() IS 'Records all data changes to the audit_logs table for compliance and auditing';
COMMENT ON FUNCTION create_partition_function(text, text) IS 'Handles automatic table partitioning for large tables based on date columns';

-- Document custom types
COMMENT ON TYPE user_role IS 'User roles for access control in the system';
COMMENT ON TYPE user_status IS 'Possible states for user accounts';
COMMENT ON TYPE verification_status IS 'Status for identity and skills verification processes';
COMMENT ON TYPE auth_provider IS 'Authentication providers for OAuth integrations';
COMMENT ON TYPE job_type IS 'Types of job payment structures available on the platform';
COMMENT ON TYPE job_status IS 'Possible states for job postings';
COMMENT ON TYPE payment_status IS 'Status tracking for payment processing';
COMMENT ON TYPE payment_method IS 'Payment methods available on the platform';