-- ====================================================================
-- BIZKHATA LEDGER PLATFORM - SUPABASE SCHEMA DEFINITIONS
-- ====================================================================
-- This SQL file provides two database design approaches for your app:
--
-- OPTION A: INSTANT SYNC ENGINE SCHEMA (Recommended for quick deployment)
-- Keeps 100% of the complex server calculations intact by mirroring the
-- database state in a single row with PostgreSQL JSONB capabilities.
--
-- OPTION B: RELATIONAL GENERAL LEDGER SCHEMA (Production Scale)
-- Normalizes the data structure representing customers, accounts, invoices, and journals.
-- ====================================================================

-- ====================================================================
-- OPTION A: INSTANT STATE SYNC (Mirror Engine)
-- ====================================================================

CREATE TABLE IF NOT EXISTS bizkhata_state (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default_ledger',
    state JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to auto-update the timestamp on state modifications
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_bizkhata_state_modtime ON bizkhata_state;
CREATE TRIGGER update_bizkhata_state_modtime
    BEFORE UPDATE ON bizkhata_state
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- Seed default empty container in case of high-concurrency boot up
INSERT INTO bizkhata_state (id, state)
VALUES ('default_ledger', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- ====================================================================
-- OPTION B: RELATIONAL LEDGER SCHEMA (Normalized PostgreSQL)
-- ====================================================================

-- 1. Company Profiling
CREATE TABLE IF NOT EXISTS company_info (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'co_main',
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15),
    pan VARCHAR(10),
    address TEXT,
    state VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'INR',
    financial_year VARCHAR(50) DEFAULT '2026-2027',
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customer Master Register
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15),
    pan VARCHAR(10),
    email VARCHAR(255),
    phone VARCHAR(50),
    billing_address TEXT,
    state VARCHAR(100),
    payment_terms VARCHAR(50) DEFAULT 'Net 45',
    opening_balance NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Vendor Master Register
CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15),
    pan VARCHAR(10),
    msme_status VARCHAR(50) DEFAULT 'Non-MSME', -- Micro, Small, Medium, Non-MSME
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    opening_balance NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Catalog Items
CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hsn_sac VARCHAR(20),
    gst_rate NUMERIC(5,2) DEFAULT 18.00, -- represent percentage e.g. 18.00
    unit VARCHAR(50),
    sales_rate NUMERIC(15,2) DEFAULT 0.00,
    purchase_rate NUMERIC(15,2) DEFAULT 0.00,
    income_account VARCHAR(100), -- Chart code
    expense_account VARCHAR(100), -- Chart code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Chart of Accounts (COA)
CREATE TABLE IF NOT EXISTS accounts (
    code VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- Asset, Liability, Income, Expense, Equity
    balance NUMERIC(15,2) DEFAULT 0.00
);

-- 6. Invoices / Proformas Register
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC(15,2) DEFAULT 0.00,
    total_gst NUMERIC(15,2) DEFAULT 0.00,
    total_cgst NUMERIC(15,2) DEFAULT 0.00,
    total_sgst NUMERIC(15,2) DEFAULT 0.00,
    total_igst NUMERIC(15,2) DEFAULT 0.00,
    total NUMERIC(15,2) DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Sent, Paid, etc.
    is_proforma BOOLEAN NOT NULL DEFAULT FALSE,
    payment_received NUMERIC(15,2) DEFAULT 0.00,
    converted_to_tax BOOLEAN DEFAULT FALSE,
    converted_invoice_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Nested Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) REFERENCES invoices(id) ON DELETE CASCADE,
    item_id VARCHAR(50) REFERENCES items(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    hsn_sac VARCHAR(20),
    qty NUMERIC(12,3) NOT NULL DEFAULT 1,
    rate NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5,2) DEFAULT 18.00,
    amount NUMERIC(15,2) NOT NULL,
    cgst NUMERIC(15,2) DEFAULT 0.00,
    sgst NUMERIC(15,2) DEFAULT 0.00,
    igst NUMERIC(15,2) DEFAULT 0.00
);

-- 8. Double-Entry General Ledger Journals
CREATE TABLE IF NOT EXISTS journal_entries (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    reference VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id VARCHAR(50) PRIMARY KEY,
    journal_entry_id VARCHAR(50) REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_code VARCHAR(100) REFERENCES accounts(code) ON DELETE RESTRICT,
    account_name VARCHAR(255) NOT NULL,
    debit NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(15,2) NOT NULL DEFAULT 0.00
);

-- 9. Audit Log Streams
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "user" VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) FOR MULTI-TENANCY / PRIVACY (OPTIONAL)
-- ====================================================================
ALTER TABLE IF EXISTS bizkhata_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read and write access" ON bizkhata_state;
CREATE POLICY "Allow authenticated read and write access"
    ON bizkhata_state
    FOR ALL
    USING (true)
    WITH CHECK (true);
