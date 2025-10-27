# Database Schema for BudgetUp MiPymes

This directory contains the database schema, migrations, and seed files for the BudgetUp application.

## Structure

```
database/
├── migrations/           # SQL migration files
│   ├── 001_initial_schema.sql
│   ├── 002_rls_functions_and_policies.sql
│   ├── 003_views_and_functions.sql
│   └── 004_audit_triggers.sql
├── seeds/               # Seed data files
│   └── 001_default_categories.sql
└── README.md           # This file
```

## Migrations

### 001_initial_schema.sql
Creates the core database tables:
- `organizations` - Company/business entities
- `memberships` - User-organization relationships with roles
- `invitations` - Invitation system for adding users to organizations
- `accounts` - Financial accounts (cash, bank, credit card)
- `categories` - Transaction categories (income/expense)
- `transactions` - Financial transactions (income, expense, transfer)
- `audit_logs` - Audit trail for all changes

### 002_rls_functions_and_policies.sql
Implements Row Level Security (RLS):
- Helper functions: `is_member()`, `has_role()`, `is_owner()`
- RLS policies for all tables ensuring data isolation between organizations
- Role-based access control (owner, admin, member)

### 003_views_and_functions.sql
Creates database views and utility functions:
- `v_monthly_balance` - Monthly income/expense summaries
- `v_account_balances` - Current account balances including transfers
- `v_category_expenses` - Category expense summaries
- `get_organization_kpis()` - KPI calculation function
- `get_top_expense_categories()` - Top expense categories function
- `generate_invitation_code()` - Unique invitation code generator

### 004_audit_triggers.sql
Sets up automatic audit logging:
- Audit trigger functions for all tables
- Automatic logging of create, update, delete operations
- Preserves old and new values for change tracking

## Seeds

### 001_default_categories.sql
Creates default categories and accounts for new organizations:
- Default income categories (Ventas, Servicios, etc.)
- Default expense categories (Nómina, Renta, Servicios Públicos, etc.)
- Default accounts (Efectivo, Cuenta Corriente)
- Automatic setup trigger for new organizations

## How to Apply Migrations

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file in order
4. Execute each migration

### Option 2: Supabase CLI (if configured)
```bash
# Apply all migrations
pnpm run db:migrate

# Reset database (careful - this will delete all data)
pnpm run supabase:reset
```

### Option 3: Manual SQL Execution
Connect to your PostgreSQL database and execute the files in order:
1. `001_initial_schema.sql`
2. `002_rls_functions_and_policies.sql`
3. `003_views_and_functions.sql`
4. `004_audit_triggers.sql`
5. `001_default_categories.sql` (seed)

## Key Features

### Multi-tenancy
- Organization-based data isolation
- RLS policies ensure users only see their organization's data
- Automatic organization_id filtering on all queries

### Role-based Access Control
- **Owner**: Full control over organization, can manage all users and data
- **Admin**: Can manage users and all organization data except ownership transfer
- **Member**: Can view and create transactions, accounts, categories

### Audit Trail
- Automatic logging of all changes to critical tables
- Preserves old and new values for change tracking
- User attribution for all changes

### Dominican MiPyme Optimizations
- Default currency: DOP (Dominican Peso)
- ITBIS tax field (18% default)
- Default categories tailored for Dominican small businesses
- Spanish language field names and values

## Security Considerations

1. **RLS Enabled**: All tables have Row Level Security enabled
2. **Function Security**: All functions are marked as SECURITY DEFINER
3. **Input Validation**: Database constraints prevent invalid data
4. **Audit Trail**: All changes are logged for compliance

## Performance Optimizations

1. **Indexes**: Strategic indexes on frequently queried columns
2. **Views**: Pre-computed views for common reporting queries
3. **Functions**: Efficient functions for KPI calculations
4. **Constraints**: Database-level constraints for data integrity

## Maintenance

### Updating Types
After applying migrations, update TypeScript types:
```bash
pnpm run supabase:types
```

### Backup Considerations
- Regular backups of the database
- Test migrations on staging environment first
- Keep migration files in version control