-- =====================================================
-- UANGKU DATABASE MIGRATION - INITIAL SCHEMA
-- =====================================================
-- This migration creates the core database structure for Uangku
-- personal finance application.
--
-- IMPORTANT: Review this migration before executing it.
-- DO NOT run this automatically.
--
-- Tables:
-- 1. profiles - User profile information
-- 2. accounts - Where money is stored (cash, bank, e-wallet, etc.)
-- 3. categories - Income and expense categories
-- 4. transactions - Income and expense records
-- 5. transfers - Internal transfers between accounts
--
-- All monetary amounts use BIGINT to store values in the smallest
-- currency unit (e.g., cents, sen) to avoid floating-point errors.
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================

-- Note: Using gen_random_uuid() instead of uuid_generate_v4()
-- gen_random_uuid() is built into PostgreSQL 13+ and doesn't require extensions

-- =====================================================
-- TABLE: profiles
-- =====================================================
-- Stores user profile information linked to auth.users
-- One profile per authenticated user

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_profiles_id ON profiles(id);

-- =====================================================
-- TABLE: accounts
-- =====================================================
-- Represents where user's money is stored
-- Types: cash, bank, ewallet, other

CREATE TYPE account_type AS ENUM ('cash', 'bank', 'ewallet', 'other');

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type account_type NOT NULL,
    initial_balance BIGINT NOT NULL DEFAULT 0,
    icon VARCHAR(50),
    color VARCHAR(7),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT accounts_name_not_empty CHECK (TRIM(name) <> ''),
    CONSTRAINT accounts_user_name_unique UNIQUE (user_id, name)
);

-- Indexes
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_user_id_not_archived ON accounts(user_id) WHERE is_archived = FALSE;

-- =====================================================
-- TABLE: categories
-- =====================================================
-- Categories for income and expense transactions
-- Supports both system/default and user-created categories

CREATE TYPE category_type AS ENUM ('income', 'expense');

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type category_type NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT categories_name_not_empty CHECK (TRIM(name) <> ''),
    -- Default categories have NULL user_id
    -- User categories must have user_id
    CONSTRAINT categories_user_default_check CHECK (
        (is_default = TRUE AND user_id IS NULL) OR
        (is_default = FALSE AND user_id IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_user_id_not_archived ON categories(user_id, type) WHERE is_archived = FALSE;
CREATE INDEX idx_categories_default ON categories(type) WHERE is_default = TRUE;

-- Unique constraints
-- For user categories: user_id, name, and type must be unique
CREATE UNIQUE INDEX idx_categories_user_unique ON categories(user_id, name, type) WHERE user_id IS NOT NULL;
-- For default categories: name and type must be unique (user_id is NULL)
CREATE UNIQUE INDEX idx_categories_default_unique ON categories(name, type) WHERE user_id IS NULL;

-- =====================================================
-- TABLE: transactions
-- =====================================================
-- Income and expense transactions

CREATE TYPE transaction_type AS ENUM ('income', 'expense');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    type transaction_type NOT NULL,
    amount BIGINT NOT NULL,
    description VARCHAR(200),
    recipient VARCHAR(100),
    note TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT transactions_amount_positive CHECK (amount > 0),
    CONSTRAINT transactions_description_not_empty CHECK (
        description IS NULL OR TRIM(description) <> ''
    ),
    CONSTRAINT transactions_recipient_not_empty CHECK (
        recipient IS NULL OR TRIM(recipient) <> ''
    )
);

-- Indexes for common queries
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);

-- =====================================================
-- TABLE: transfers
-- =====================================================
-- Internal transfers between accounts owned by the same user

CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    to_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL,
    description VARCHAR(200),
    transaction_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT transfers_amount_positive CHECK (amount > 0),
    CONSTRAINT transfers_different_accounts CHECK (from_account_id <> to_account_id),
    CONSTRAINT transfers_description_not_empty CHECK (
        description IS NULL OR TRIM(description) <> ''
    )
);

-- Indexes
CREATE INDEX idx_transfers_user_id ON transfers(user_id);
CREATE INDEX idx_transfers_from_account ON transfers(from_account_id);
CREATE INDEX idx_transfers_to_account ON transfers(to_account_id);
CREATE INDEX idx_transfers_user_date ON transfers(user_id, transaction_date DESC);
CREATE INDEX idx_transfers_date ON transfers(transaction_date DESC);

-- =====================================================
-- FUNCTIONS: updated_at trigger
-- =====================================================
-- Automatically update updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfers_updated_at BEFORE UPDATE ON transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS: Archived validation for updates
-- =====================================================
-- Prevent changing transactions/transfers to use archived accounts/categories
-- while allowing edits to existing records if references remain unchanged

CREATE OR REPLACE FUNCTION check_transaction_archived_references()
RETURNS TRIGGER AS $$
BEGIN
    -- If account_id changed, verify new account is not archived
    IF NEW.account_id IS DISTINCT FROM OLD.account_id THEN
        IF EXISTS (
            SELECT 1 FROM accounts 
            WHERE id = NEW.account_id 
            AND is_archived = TRUE
        ) THEN
            RAISE EXCEPTION 'Cannot change transaction to use archived account';
        END IF;
    END IF;
    
    -- If category_id changed, verify new category is not archived
    IF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
        IF EXISTS (
            SELECT 1 FROM categories 
            WHERE id = NEW.category_id 
            AND is_archived = TRUE
        ) THEN
            RAISE EXCEPTION 'Cannot change transaction to use archived category';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_transfer_archived_references()
RETURNS TRIGGER AS $$
BEGIN
    -- If from_account_id changed, verify new account is not archived
    IF NEW.from_account_id IS DISTINCT FROM OLD.from_account_id THEN
        IF EXISTS (
            SELECT 1 FROM accounts 
            WHERE id = NEW.from_account_id 
            AND is_archived = TRUE
        ) THEN
            RAISE EXCEPTION 'Cannot change transfer to use archived source account';
        END IF;
    END IF;
    
    -- If to_account_id changed, verify new account is not archived
    IF NEW.to_account_id IS DISTINCT FROM OLD.to_account_id THEN
        IF EXISTS (
            SELECT 1 FROM accounts 
            WHERE id = NEW.to_account_id 
            AND is_archived = TRUE
        ) THEN
            RAISE EXCEPTION 'Cannot change transfer to use archived destination account';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER check_transaction_archived_before_update
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION check_transaction_archived_references();

CREATE TRIGGER check_transfer_archived_before_update
    BEFORE UPDATE ON transfers
    FOR EACH ROW
    EXECUTE FUNCTION check_transfer_archived_references();

-- =====================================================
-- FUNCTION: Auto-create profile on user signup
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: profiles
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- RLS POLICIES: accounts
-- =====================================================

-- Users can read their own accounts
CREATE POLICY "Users can read own accounts"
    ON accounts FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own accounts
CREATE POLICY "Users can insert own accounts"
    ON accounts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own accounts
CREATE POLICY "Users can update own accounts"
    ON accounts FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own accounts (soft delete via is_archived is recommended)
CREATE POLICY "Users can delete own accounts"
    ON accounts FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES: categories
-- =====================================================

-- Users can read default categories and their own categories
CREATE POLICY "Users can read default and own categories"
    ON categories FOR SELECT
    TO authenticated
    USING (
        is_default = TRUE OR auth.uid() = user_id
    );

-- Users can insert their own categories
CREATE POLICY "Users can insert own categories"
    ON categories FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND is_default = FALSE
    );

-- Users can update their own categories (not default ones)
CREATE POLICY "Users can update own categories"
    ON categories FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id AND is_default = FALSE)
    WITH CHECK (auth.uid() = user_id AND is_default = FALSE);

-- Users can delete their own categories (not default ones)
CREATE POLICY "Users can delete own categories"
    ON categories FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id AND is_default = FALSE);

-- =====================================================
-- RLS POLICIES: transactions
-- =====================================================

-- Users can read their own transactions
CREATE POLICY "Users can read own transactions"
    ON transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert transactions
-- Must verify account and category belong to the user and are not archived
CREATE POLICY "Users can insert own transactions"
    ON transactions FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM accounts 
            WHERE accounts.id = account_id 
            AND accounts.user_id = auth.uid()
            AND accounts.is_archived = FALSE
        )
        AND EXISTS (
            SELECT 1 FROM categories 
            WHERE categories.id = category_id 
            AND (categories.user_id = auth.uid() OR categories.is_default = TRUE)
            AND categories.type::text = transactions.type::text
            AND categories.is_archived = FALSE
        )
    );

-- Users can update their own transactions
-- Must verify account and category ownership
-- Note: Archived validation handled by trigger to allow editing existing transactions with archived references
CREATE POLICY "Users can update own transactions"
    ON transactions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM accounts 
            WHERE accounts.id = account_id 
            AND accounts.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM categories 
            WHERE categories.id = category_id 
            AND (categories.user_id = auth.uid() OR categories.is_default = TRUE)
            AND categories.type::text = transactions.type::text
        )
    );

-- Users can delete their own transactions
CREATE POLICY "Users can delete own transactions"
    ON transactions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES: transfers
-- =====================================================

-- Users can read their own transfers
CREATE POLICY "Users can read own transfers"
    ON transfers FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert transfers
-- Must verify both accounts belong to the user and are not archived
CREATE POLICY "Users can insert own transfers"
    ON transfers FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM accounts 
            WHERE accounts.id = from_account_id 
            AND accounts.user_id = auth.uid()
            AND accounts.is_archived = FALSE
        )
        AND EXISTS (
            SELECT 1 FROM accounts 
            WHERE accounts.id = to_account_id 
            AND accounts.user_id = auth.uid()
            AND accounts.is_archived = FALSE
        )
    );

-- Users can update their own transfers
-- Must verify both accounts belong to the user
-- Note: Archived validation handled by trigger to allow editing existing transfers with archived references
CREATE POLICY "Users can update own transfers"
    ON transfers FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM accounts 
            WHERE accounts.id = from_account_id 
            AND accounts.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM accounts 
            WHERE accounts.id = to_account_id 
            AND accounts.user_id = auth.uid()
        )
    );

-- Users can delete their own transfers
CREATE POLICY "Users can delete own transfers"
    ON transfers FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =====================================================
-- DEFAULT CATEGORIES SEED DATA
-- =====================================================

-- Default Expense Categories (Indonesian)
INSERT INTO categories (name, type, icon, color, is_default) VALUES
    ('Makanan', 'expense', '🍽️', '#EF4444', TRUE),
    ('Transportasi', 'expense', '🚗', '#3B82F6', TRUE),
    ('Belanja', 'expense', '🛒', '#8B5CF6', TRUE),
    ('Tagihan', 'expense', '📄', '#F59E0B', TRUE),
    ('Rumah', 'expense', '🏠', '#10B981', TRUE),
    ('Kesehatan', 'expense', '⚕️', '#EC4899', TRUE),
    ('Hiburan', 'expense', '🎮', '#6366F1', TRUE),
    ('Pendidikan', 'expense', '📚', '#14B8A6', TRUE),
    ('Pakaian', 'expense', '👕', '#F97316', TRUE),
    ('Keluarga', 'expense', '👨‍👩‍👧', '#A855F7', TRUE),
    ('Lainnya', 'expense', '📦', '#6B7280', TRUE);

-- Default Income Categories (Indonesian)
INSERT INTO categories (name, type, icon, color, is_default) VALUES
    ('Gaji', 'income', '💰', '#10B981', TRUE),
    ('Freelance', 'income', '💼', '#3B82F6', TRUE),
    ('Bonus', 'income', '🎁', '#F59E0B', TRUE),
    ('Investasi', 'income', '📈', '#8B5CF6', TRUE),
    ('Hadiah', 'income', '🎉', '#EC4899', TRUE),
    ('Lainnya', 'income', '📦', '#6B7280', TRUE);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
-- Review completed. Execute this migration using:
-- supabase db push (for local)
-- or apply via Supabase dashboard for production
-- =====================================================
