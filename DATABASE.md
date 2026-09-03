# Uangku Database Architecture

## Overview

The Uangku database uses PostgreSQL via Supabase with a focus on data integrity, security, and maintainability for personal finance management.

## Core Design Principles

### 1. Integer-Based Monetary Storage

All monetary amounts use `BIGINT` to store values in the smallest currency unit (Rupiah for Indonesian currency).

**Why?**
- Avoids floating-point precision errors
- Ensures accurate financial calculations
- Standard practice in financial systems

**Example:**
```sql
-- Store Rp 100,000 as:
amount: 100000  -- BIGINT

-- NOT as:
amount: 100000.00  -- FLOAT/REAL (causes precision errors)
```

### 2. Derived Balance Model

Account balances are **calculated**, not stored as mutable fields.

**Formula:**
```
Current Balance = initial_balance
                + SUM(income transactions)
                - SUM(expense transactions)
                + SUM(transfers in)
                - SUM(transfers out)
```

**Why?**
- Transaction history remains the single source of truth
- Prevents data inconsistency
- Enables accurate historical analysis
- Allows balance reconstruction at any point in time

### 3. Soft Deletion via Archiving

Categories and accounts use `is_archived` flag instead of hard deletion.

**Why?**
- Preserves historical transaction integrity
- Allows users to "delete" without breaking data relationships
- Enables restoration if needed
- Maintains audit trail

### 4. Row Level Security (RLS)

Every table has RLS enabled with explicit policies.

**Why?**
- Backend authorization is mandatory
- Frontend checks are insufficient for security
- Prevents unauthorized data access
- Supabase best practice

## Table Details

### profiles

**Purpose:** Application-level user information

**Key Points:**
- One profile per authenticated user
- Auto-created when user signs up (via trigger)
- Minimal data for now (extensible for future features)

**Trigger:**
```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### accounts

**Purpose:** Represent where user's money is stored

**Account Types:**
- `cash`: Physical cash
- `bank`: Bank accounts
- `ewallet`: Digital wallets (GoPay, OVO, Dana, etc.)
- `other`: Other storage types

**Key Constraints:**
- Account name must be unique per user
- Name cannot be empty (trimmed)
- Initial balance defaults to 0

**Archiving:**
When `is_archived = TRUE`:
- Account hidden from active views
- Historical transactions remain intact
- Balance calculations still work
- Cannot delete if transactions exist (RESTRICT)

**Why RESTRICT on DELETE?**
```sql
account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT
```
Prevents accidental deletion of accounts that have transaction history.

### categories

**Purpose:** Classify income and expense transactions

**Two Types of Categories:**

1. **Default Categories** (`is_default = TRUE`)
   - `user_id = NULL`
   - Shared across all users
   - Cannot be modified or deleted by users
   - Seeded during migration

2. **User Categories** (`is_default = FALSE`)
   - `user_id = specific user`
   - User-created custom categories
   - Can be modified/archived by owner

**Category Types:**
- `income`: For income transactions
- `expense`: For expense transactions

**Key Constraints:**
```sql
CONSTRAINT categories_user_default_check CHECK (
    (is_default = TRUE AND user_id IS NULL) OR
    (is_default = FALSE AND user_id IS NOT NULL)
)
```
Ensures default categories have no owner, and user categories have an owner.

**Archiving:**
- Archived categories hidden from selection
- Historical transactions preserve category reference
- Cannot delete if transactions exist (RESTRICT)

**Default Categories:**

*Expense (11):*
- Makanan (Food) 🍽️
- Transportasi (Transportation) 🚗
- Belanja (Shopping) 🛒
- Tagihan (Bills) 📄
- Rumah (Home) 🏠
- Kesehatan (Health) ⚕️
- Hiburan (Entertainment) 🎮
- Pendidikan (Education) 📚
- Pakaian (Clothing) 👕
- Keluarga (Family) 👨‍👩‍👧
- Lainnya (Others) 📦

*Income (6):*
- Gaji (Salary) 💰
- Freelance 💼
- Bonus 🎁
- Investasi (Investment) 📈
- Hadiah (Gift) 🎉
- Lainnya (Others) 📦

### transactions

**Purpose:** Record income and expense events

**Transaction Types:**
- `income`: Money coming in
- `expense`: Money going out

**Key Fields:**

**amount** (BIGINT, > 0)
- Stored in smallest currency unit
- CHECK constraint ensures positive values

**description** (VARCHAR(200), optional)
- Brief description of transaction
- E.g., "Lunch at restaurant", "Monthly salary"

**recipient** (VARCHAR(100), optional)
- Who received the money (for expenses)
- E.g., "Andi", "PLN", "Indomaret"
- **NOT for internal transfers** (use transfers table)

**note** (TEXT, optional)
- Additional details
- No length limit

**transaction_date** (DATE)
- When the financial event occurred
- Different from `created_at` (when recorded in system)

**Important Distinction:**

```sql
-- EXPENSE with recipient (external payment)
{
  type: 'expense',
  account_id: 'bca_account',
  recipient: 'Andi',
  amount: 200000,
  description: 'Payment to Andi'
}

-- TRANSFER between accounts (internal)
-- Use transfers table instead!
{
  from_account_id: 'bca_account',
  to_account_id: 'cash_account',
  amount: 200000
}
```

**RLS Policy Validation:**

The insert policy verifies:
1. User owns the account
2. User owns the category (or it's a default category)
3. Category type matches transaction type

```sql
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM accounts WHERE id = account_id AND user_id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM categories 
        WHERE id = category_id 
        AND (user_id = auth.uid() OR is_default = TRUE)
        AND type = transactions.type
    )
)
```

### transfers

**Purpose:** Internal transfers between user's own accounts

**Key Rules:**

1. **Same User**: Both accounts must belong to the same user
2. **Different Accounts**: `from_account_id ≠ to_account_id`
3. **Positive Amount**: `amount > 0`
4. **Not Income/Expense**: Transfers are neutral transactions

**Use Cases:**
- Moving cash from bank to wallet
- Transferring between different bank accounts
- Reallocating funds

**Example:**
```sql
-- Correct: Internal transfer
INSERT INTO transfers (
    user_id, 
    from_account_id,  -- BCA
    to_account_id,    -- Cash
    amount,           -- 500000
    description,      -- 'Withdraw cash'
    transaction_date
)

-- Wrong: Don't create a transaction for this
-- Use transfers table instead!
```

**RLS Policy Validation:**

Verifies both accounts belong to the user:
```sql
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM accounts WHERE id = from_account_id AND user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM accounts WHERE id = to_account_id AND user_id = auth.uid())
)
```

## Indexes

### Purpose of Each Index

**accounts:**
```sql
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
-- Fast lookup of all accounts for a user

CREATE INDEX idx_accounts_user_id_not_archived ON accounts(user_id) WHERE is_archived = FALSE;
-- Fast lookup of active accounts only (common query)
```

**categories:**
```sql
CREATE INDEX idx_categories_user_id ON categories(user_id);
-- Fast lookup of user's custom categories

CREATE INDEX idx_categories_type ON categories(type);
-- Filter by income/expense type

CREATE INDEX idx_categories_user_id_not_archived ON categories(user_id, type) WHERE is_archived = FALSE;
-- Fast lookup of active categories by type (most common query)

CREATE INDEX idx_categories_default ON categories(type) WHERE is_default = TRUE;
-- Fast lookup of default categories
```

**transactions:**
```sql
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
-- All transactions for a user

CREATE INDEX idx_transactions_account_id ON transactions(account_id);
-- All transactions for an account (balance calculation)

CREATE INDEX idx_transactions_category_id ON transactions(category_id);
-- Category analysis

CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
-- Recent transactions for a user (primary view)

CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
-- Income/expense filtering

CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
-- Date-based queries
```

**transfers:**
```sql
CREATE INDEX idx_transfers_user_id ON transfers(user_id);
-- All transfers for a user

CREATE INDEX idx_transfers_from_account ON transfers(from_account_id);
-- Transfers from a specific account (balance calculation)

CREATE INDEX idx_transfers_to_account ON transfers(to_account_id);
-- Transfers to a specific account (balance calculation)

CREATE INDEX idx_transfers_user_date ON transfers(user_id, transaction_date DESC);
-- Recent transfers for a user

CREATE INDEX idx_transfers_date ON transfers(transaction_date DESC);
-- Date-based queries
```

## Automatic Timestamps

All tables have `updated_at` automatically maintained via trigger:

```sql
CREATE TRIGGER update_[table]_updated_at BEFORE UPDATE ON [table]
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Benefits:
- Automatic audit trail
- No need to manually set updated_at in application code
- Consistent timestamp behavior

## Security Considerations

### 1. RLS Policies

Every table requires RLS policies. Users can only:
- Read their own data
- Modify their own data
- Access default categories (read-only)

### 2. Foreign Key Validation

RLS policies include explicit foreign key validation:
```sql
-- Example: Verify account ownership before creating transaction
EXISTS (
    SELECT 1 FROM accounts 
    WHERE id = account_id 
    AND user_id = auth.uid()
)
```

Why explicit validation?
- RLS on related tables might not be sufficient
- Prevents reference to archived or deleted resources
- Clear error messages

### 3. DELETE Behavior

**RESTRICT**: Used for accounts/categories
- Prevents deletion if referenced by transactions
- User must archive instead

**CASCADE**: Used for user deletion
- When user account deleted, all data removed
- Supabase Auth handles this automatically

## Query Examples

### Calculate Account Balance

```sql
SELECT 
    a.id,
    a.name,
    a.initial_balance +
    COALESCE(
        (SELECT SUM(amount) FROM transactions 
         WHERE account_id = a.id AND type = 'income'),
        0
    ) -
    COALESCE(
        (SELECT SUM(amount) FROM transactions 
         WHERE account_id = a.id AND type = 'expense'),
        0
    ) +
    COALESCE(
        (SELECT SUM(amount) FROM transfers 
         WHERE to_account_id = a.id),
        0
    ) -
    COALESCE(
        (SELECT SUM(amount) FROM transfers 
         WHERE from_account_id = a.id),
        0
    ) as current_balance
FROM accounts a
WHERE a.user_id = auth.uid()
AND a.is_archived = FALSE;
```

### Get Recent Transactions

```sql
SELECT 
    t.id,
    t.type,
    t.amount,
    t.description,
    t.recipient,
    t.transaction_date,
    a.name as account_name,
    c.name as category_name,
    c.icon as category_icon
FROM transactions t
JOIN accounts a ON t.account_id = a.id
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = auth.uid()
ORDER BY t.transaction_date DESC, t.created_at DESC
LIMIT 50;
```

### Monthly Income vs Expense

```sql
SELECT 
    DATE_TRUNC('month', transaction_date) as month,
    type,
    SUM(amount) as total
FROM transactions
WHERE user_id = auth.uid()
AND transaction_date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', transaction_date), type
ORDER BY month DESC, type;
```

## Migration Safety

The migration file includes:
- ✅ Comprehensive comments
- ✅ Logical section organization
- ✅ Deterministic execution (idempotent where possible)
- ✅ Data integrity constraints
- ✅ Security policies
- ✅ Seed data for default categories

**Always review before execution.**

## Future Considerations

Features NOT implemented yet but architecture supports:

1. **Recurring Transactions**: Add `recurring_transactions` table
2. **Budgets**: Add `budgets` table linking to categories
3. **Tags**: Add `tags` and `transaction_tags` junction table
4. **Attachments**: Add `attachments` table for receipts
5. **Shared Accounts**: Modify RLS to support shared access
6. **Multi-Currency**: Add currency fields and exchange rates
7. **Credit Cards**: Add credit account type with statement tracking

The current schema is designed to be extended without breaking changes.

## Maintenance

### Regenerate TypeScript Types

After schema changes:

```bash
npx supabase gen types typescript --local > types/database.types.ts
```

### Create New Migration

```bash
supabase migration new migration_name
```

### Reset Local Database

```bash
supabase db reset
```

### Dump Production Schema

```bash
supabase db dump --schema public > backup.sql
```

## Troubleshooting

### RLS Policy Errors

If operations fail with "permission denied":
1. Check user is authenticated
2. Verify policy allows the operation
3. Test policy with specific user ID
4. Check foreign key references

### Balance Calculation Discrepancies

If balances don't match expected:
1. Verify no FLOAT/REAL types used
2. Check for missing COALESCE in queries
3. Ensure transfers counted in both directions
4. Verify transaction types are correct

### Migration Conflicts

If migration fails:
1. Check for duplicate table/function names
2. Verify PostgreSQL version compatibility
3. Test migration on local Supabase first
4. Review error messages carefully

## Summary

This database architecture prioritizes:
- ✅ **Data Integrity**: Constraints and validation
- ✅ **Accuracy**: Integer-based money storage
- ✅ **Security**: RLS on all tables
- ✅ **Maintainability**: Clear structure and documentation
- ✅ **Performance**: Strategic indexes
- ✅ **Auditability**: Automatic timestamps and history preservation

The foundation is solid and ready for feature implementation.
