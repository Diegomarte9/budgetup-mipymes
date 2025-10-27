# Dashboard Metrics System

This document explains the dashboard metrics system implemented for BudgetUp MiPymes.

## Database Views and Functions

### Views Created

#### `v_monthly_balance`
Aggregates monthly income, expense, and net balance by organization.

```sql
SELECT * FROM v_monthly_balance 
WHERE organization_id = 'your-org-id' 
ORDER BY month DESC;
```

#### `v_top_expense_categories`
Shows top expense categories by month with amounts and percentages.

```sql
SELECT * FROM v_top_expense_categories 
WHERE organization_id = 'your-org-id' 
AND month = '2024-01-01'
ORDER BY total_amount DESC;
```

#### `mv_monthly_metrics` (Materialized View)
Optimized materialized view for better performance on large datasets.

```sql
-- Refresh the materialized view
SELECT refresh_monthly_metrics();
```

### Functions Created

#### `get_current_month_kpis(organization_id)`
Returns current month KPIs with comparison to previous month.

```sql
SELECT * FROM get_current_month_kpis('your-org-id');
```

Returns:
- `current_month_income`
- `current_month_expense` 
- `current_month_balance`
- `previous_month_income`
- `previous_month_expense`
- `previous_month_balance`
- `income_change_pct`
- `expense_change_pct`
- `balance_change_pct`

#### `get_last_12_months_balance(organization_id)`
Returns balance data for the last 12 months for charts.

```sql
SELECT * FROM get_last_12_months_balance('your-org-id');
```

#### `get_current_month_top_categories(organization_id, limit)`
Returns top expense categories for the current month.

```sql
SELECT * FROM get_current_month_top_categories('your-org-id', 5);
```

## API Endpoints

### `/api/metrics`
Combined endpoint returning all dashboard metrics.

**Query Parameters:**
- `organizationId` (required): UUID of the organization

**Response:**
```json
{
  "kpis": { /* KPI data */ },
  "monthlyBalance": [ /* 12 months data */ ],
  "topCategories": [ /* top 5 categories */ ]
}
```

### `/api/metrics/kpis`
Current month KPIs with comparison to previous month.

### `/api/metrics/monthly`
Monthly balance data for charts.

**Query Parameters:**
- `organizationId` (required)
- `months` (optional, default: 12)

### `/api/metrics/top-categories`
Top expense categories.

**Query Parameters:**
- `organizationId` (required)
- `limit` (optional, default: 5)
- `month` (optional, format: YYYY-MM)

## React Hooks

### `useDashboardMetrics(organizationId)`
Fetches all dashboard metrics in one call.

```typescript
const { data, isLoading, error } = useDashboardMetrics(organizationId);
```

### `useCurrentMonthKPIs(organizationId)`
Fetches current month KPIs with real-time updates.

```typescript
const { data: kpis } = useCurrentMonthKPIs(organizationId);
```

### `useMonthlyBalance(organizationId, months)`
Fetches monthly balance data for charts.

```typescript
const { data: monthlyData } = useMonthlyBalance(organizationId, 12);
```

### `useTopCategories(organizationId, limit, month)`
Fetches top expense categories.

```typescript
const { data: categories } = useTopCategories(organizationId, 5);
```

## Performance Optimizations

### Indexes Created
- `idx_transactions_org_month_type`: For monthly aggregations
- `idx_transactions_current_month`: For current month queries
- `idx_transactions_last_12_months`: For 12-month charts
- `idx_transactions_expense_category`: For expense category analysis
- `idx_transactions_income`: For income analysis

### Materialized View
The `mv_monthly_metrics` materialized view can be refreshed periodically for better performance:

```sql
-- Manual refresh
SELECT refresh_monthly_metrics();

-- Or set up a cron job to refresh every hour
SELECT cron.schedule('refresh-metrics', '0 * * * *', 'SELECT refresh_monthly_metrics();');
```

## Usage Examples

### Dashboard Component
```typescript
function Dashboard({ organizationId }: { organizationId: string }) {
  const { data: metrics, isLoading } = useDashboardMetrics(organizationId);
  
  if (isLoading) return <DashboardSkeleton />;
  
  return (
    <div>
      <KPICards kpis={metrics.kpis} />
      <MonthlyChart data={metrics.monthlyBalance} />
      <CategoryChart data={metrics.topCategories} />
    </div>
  );
}
```

### Currency Formatting
```typescript
import { formatCurrency, formatChangePercentage } from '@/lib/utils/currency';

// Format Dominican Peso
formatCurrency(1500.50); // "RD$1,500.50"

// Format percentage change
const change = formatChangePercentage(15.5);
// { formatted: "15.5%", color: "positive", symbol: "+" }
```

## Requirements Fulfilled

- ✅ **8.1**: Monthly balance view and KPIs calculation
- ✅ **8.3**: Top expense categories with percentages
- ✅ Performance optimization with indexes
- ✅ Real-time metrics updates
- ✅ Dominican Peso (DOP) formatting
- ✅ RLS security policies applied

## Next Steps

1. Apply the migration: `019_dashboard_views_and_metrics.sql`
2. Test the views and functions using: `scripts/test-dashboard-metrics.sql`
3. Implement dashboard UI components using the provided hooks
4. Set up periodic refresh of materialized view if needed
5. Monitor query performance and adjust indexes as needed