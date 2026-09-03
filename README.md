# Uangku - Personal Finance Management

Uangku is a personal finance web application built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **ORM**: Supabase Client

## Project Structure

```
uangku/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── auth/              # Auth API routes
│   ├── dashboard/         # Protected dashboard
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── lib/
│   └── supabase/          # Supabase client utilities
│       ├── client.ts      # Browser client
│       ├── server.ts      # Server client
│       └── middleware.ts  # Auth middleware
├── types/
│   └── database.types.ts  # Database TypeScript types
├── supabase/
│   ├── migrations/        # Database migrations
│   └── config.toml        # Supabase configuration
├── middleware.ts          # Next.js middleware for auth
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

**IMPORTANT**: This project requires npm/npx to be executable. If you encounter PowerShell execution policy errors:

```powershell
# Run PowerShell as Administrator and execute:
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Then install dependencies:

```bash
npm install
```

### 2. Configure Supabase

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project dashboard under Settings > API.

### 3. Database Setup

**IMPORTANT: Review Before Executing**

The database migration is located at:
```
supabase/migrations/20260901000000_initial_schema.sql
```

**DO NOT execute this migration automatically.**

#### Option A: Using Supabase CLI (Recommended for Local Development)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Initialize Supabase (if not already done):
   ```bash
   supabase init
   ```

3. Start local Supabase:
   ```bash
   supabase start
   ```

4. Apply migration:
   ```bash
   supabase db push
   ```

#### Option B: Using Supabase Dashboard (Production)

1. Go to your Supabase project dashboard
2. Navigate to Database > Migrations
3. Create a new migration
4. Copy the contents of `supabase/migrations/20260901000000_initial_schema.sql`
5. Review carefully
6. Execute the migration

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Core Tables

#### 1. **profiles**
User profile information linked to auth.users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | References auth.users(id) |
| created_at | TIMESTAMPTZ | Profile creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### 2. **accounts**
Where user's money is stored (cash, bank, e-wallet, etc.).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users(id) |
| name | VARCHAR(100) | Account name |
| type | ENUM | cash, bank, ewallet, other |
| initial_balance | BIGINT | Starting balance in smallest unit |
| icon | VARCHAR(50) | Icon identifier |
| color | VARCHAR(7) | Hex color code |
| is_archived | BOOLEAN | Archive status |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Notes:**
- `initial_balance` uses BIGINT to store amounts in the smallest currency unit (e.g., cents, sen)
- Archived accounts preserve historical transaction integrity

#### 3. **categories**
Income and expense categories (system defaults + user-created).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | NULL for defaults, user ID for custom |
| name | VARCHAR(100) | Category name |
| type | ENUM | income, expense |
| icon | VARCHAR(50) | Icon identifier |
| color | VARCHAR(7) | Hex color code |
| is_archived | BOOLEAN | Archive status |
| is_default | BOOLEAN | System default category |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Default Categories:**

*Expense:* Makanan, Transportasi, Belanja, Tagihan, Rumah, Kesehatan, Hiburan, Pendidikan, Pakaian, Keluarga, Lainnya

*Income:* Gaji, Freelance, Bonus, Investasi, Hadiah, Lainnya

#### 4. **transactions**
Income and expense records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users(id) |
| account_id | UUID | References accounts(id) |
| category_id | UUID | References categories(id) |
| type | ENUM | income, expense |
| amount | BIGINT | Amount in smallest unit (> 0) |
| description | VARCHAR(200) | Optional description |
| recipient | VARCHAR(100) | Optional recipient name |
| note | TEXT | Optional additional notes |
| transaction_date | DATE | When transaction occurred |
| created_at | TIMESTAMPTZ | When recorded in system |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Important Concepts:**
- **recipient** field is for expenses to external parties (e.g., "Andi", "PLN", "Store Name")
- This is NOT for internal transfers between accounts
- Example: BCA → Andi (Rp200,000) is an EXPENSE, not a transfer

#### 5. **transfers**
Internal transfers between user's own accounts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users(id) |
| from_account_id | UUID | Source account |
| to_account_id | UUID | Destination account |
| amount | BIGINT | Amount in smallest unit (> 0) |
| description | VARCHAR(200) | Optional description |
| transaction_date | DATE | When transfer occurred |
| created_at | TIMESTAMPTZ | When recorded in system |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Key Rules:**
- Both accounts must belong to the same user
- `from_account_id` ≠ `to_account_id`
- Transfers are NOT income or expenses
- Example: BCA → Cash (Rp500,000) is a TRANSFER

### Balance Calculation Model

The current balance is DERIVED, not stored:

```
Current Balance = Initial Balance
                + Sum(Income Transactions)
                - Sum(Expense Transactions)
                + Sum(Transfers In)
                - Sum(Transfers Out)
```

**Transaction history is the source of truth.**

### Monetary Storage

All monetary amounts use **BIGINT** to store values in the smallest currency unit:
- Indonesian Rupiah: store in Rupiah (no decimal places needed)
- Example: Rp 100,000 → store as `100000`

**DO NOT use FLOAT or REAL for money** to avoid floating-point precision errors.

### Row Level Security (RLS)

RLS is enabled on all tables with the following policies:

#### Profiles
- Users can read and update their own profile

#### Accounts
- Users can CRUD their own accounts
- Cannot access other users' accounts

#### Categories
- Users can read default categories + their own custom categories
- Users can CRUD only their own custom categories (not defaults)

#### Transactions
- Users can CRUD their own transactions
- Ownership validation enforced for referenced accounts and categories
- Category type must match transaction type (income/expense)

#### Transfers
- Users can CRUD their own transfers
- Both source and destination accounts must belong to user

### Data Integrity

- **Foreign Keys**: Enforce relationships between tables
- **CHECK Constraints**: Validate data (positive amounts, non-empty strings, etc.)
- **RESTRICT on DELETE**: Prevents accidental deletion of accounts/categories with historical data
- **Unique Constraints**: Prevent duplicate account names per user
- **Indexes**: Optimize common query patterns

## Authentication

### Flow

1. **Sign Up**: Create account with email/password
2. **Email Verification**: Supabase handles email confirmation (configured in Supabase dashboard)
3. **Sign In**: Authenticate with email/password
4. **Session**: Maintained via Supabase Auth cookies
5. **Protected Routes**: Middleware checks authentication status
6. **Sign Out**: Clear session and redirect to login

### Route Protection

The middleware (`middleware.ts`) handles:
- Session refresh on every request
- Automatic redirect to login for unauthenticated users accessing protected routes

## Development Guidelines

### Do NOT Build Yet

This is Phase 1 - Foundation only. Do NOT implement:
- Dashboard UI
- Transaction forms
- Account management
- Reports/Charts
- AI features
- Google OAuth
- Mobile app
- Payment systems

### Key Principles

1. **Financial Data Integrity First**: Never compromise data accuracy for speed
2. **No Floating-Point Money**: Always use BIGINT for amounts
3. **RLS is Mandatory**: Never bypass Row Level Security
4. **No Mock Data**: Use real Supabase connection
5. **Simple Architecture**: Prefer maintainable over clever
6. **No Secrets in Code**: Use environment variables

## Next Steps

After reviewing and executing the migration:

1. Test authentication flow (sign up, sign in, sign out)
2. Verify RLS policies work correctly
3. Test database operations via Supabase client
4. Begin implementing transaction entry UI (Phase 2)

## Troubleshooting

### PowerShell Execution Policy Error

If you see "running scripts is disabled on this system":

```powershell
# Run as Administrator
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Environment Variables Not Loading

Ensure `.env.local` exists and is in the project root. Restart the dev server after creating/modifying it.

### Database Connection Issues

1. Verify environment variables are correct
2. Check Supabase project is active
3. Confirm RLS policies allow operations
4. Check browser console for detailed error messages

### Migration Errors

1. Review migration file for syntax errors
2. Ensure PostgreSQL version compatibility (v15+)
3. Check for existing table conflicts
4. Verify Supabase project permissions

## License

Private project - All rights reserved
