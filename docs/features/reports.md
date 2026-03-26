# Reports

Reports aggregate transaction data to answer financial questions. All report endpoints aggregate `amountArs`, so results are always in ARS regardless of the account currency mix.

There are four report endpoints and three report pages in the frontend.

---

## Files

- `server/src/routes/reports.routes.js`
- `server/src/validators/report.validators.js`
- `client/src/pages/Reports.jsx` — report index (navigation)
- `client/src/pages/reports/Balances.jsx`
- `client/src/pages/reports/SpendByCategory.jsx`
- `client/src/pages/reports/Frequency.jsx`
- `client/src/services/reports.js`
- `client/src/components/dashboard/SpendingByCategory.jsx` — shared chart component

---

## Common Behavior

- All report endpoints require authentication
- Ownership is enforced by joining through `account.userId`
- `from` and `to` filters are inclusive date ranges
- All monetary values in responses are in ARS (aggregated from `amountArs`)

---

## `GET /api/reports/summary`

Used by the Dashboard for the current month's overview.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `from` | date string | Optional date filter start |
| `to` | date string | Optional date filter end |

**Response:**
```json
{
  "data": {
    "totalBalance": 125000.00,
    "accounts": [
      {
        "id": "uuid",
        "name": "Caja de ahorro",
        "type": "savings",
        "balance": "50000.00",
        "balanceArs": "50000.00",
        "currency": "ARS"
      }
    ],
    "totalIncome": 80000.00,
    "totalExpenses": 30000.00,
    "netFlow": 50000.00
  }
}
```

- `totalBalance` — sum of `balanceArs` across all accounts (current, not filtered by date)
- `totalIncome` / `totalExpenses` — aggregated from transactions in the date range
- `netFlow` = `totalIncome - totalExpenses`

---

## `GET /api/reports/by-category`

Groups income and expenses by category. Used by the Dashboard and the "Gastos por categoría" report page.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `from` | date string | Optional |
| `to` | date string | Optional |
| `accountId[]` | UUID array | Filter to specific accounts (supports both `accountId=x&accountId=y` and `accountId[]=x`) |
| `type[]` | string array | `income`, `expense`, or `transfer` — filters which types to include |
| `categoryId[]` | UUID array | Filter to specific categories |

All array params accept a single string or an array. The Zod validator handles both forms via `arrayOrString`.

**Response:**
```json
{
  "data": {
    "expenses": [
      {
        "categoryId": "uuid",
        "categoryName": "Comida",
        "categoryIcon": "utensils",
        "total": 15000.00
      }
    ],
    "incomes": [...]
  }
}
```

Results are ordered by `total DESC` (highest spending first). If `type[]` includes only `income`, `expenses` will be an empty array, and vice versa.

### Dashboard usage

The Dashboard calls this endpoint without `type[]` filters (gets both), then computes a **net per category** view:

```js
netByCategory = expenses.map(e => ({
  ...e,
  total: e.total - (incomeMap.get(e.categoryId) ?? 0)
})).filter(e => e.total > 0)
```

This subtracts income in the same category from expenses, showing "net spend" per category. Categories with net income are filtered out.

---

## `GET /api/reports/monthly`

Returns monthly income/expenses/net flow for a given year. Used by the "Balances" report page.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `year` | integer (2000–2100) | Optional, defaults to current year |

**Response:**
```json
{
  "data": {
    "year": 2026,
    "months": [
      { "month": 1, "income": 80000, "expenses": 30000, "netFlow": 50000 },
      { "month": 2, "income": 0, "expenses": 0, "netFlow": 0 },
      ...
    ],
    "totals": {
      "income": 80000,
      "expenses": 30000,
      "netFlow": 50000
    }
  }
}
```

Always returns 12 months (January–December). Months with no transactions have `income: 0`, `expenses: 0`, `netFlow: 0`. The frontend dims those rows (`opacity-40`).

Uses a raw SQL query with `EXTRACT(MONTH FROM t.date)` for efficient aggregation.

---

## `GET /api/reports/frequency`

Counts expense transactions per category in a date range. Used by the "Frecuencia de gastos" report page.

**Note:** This endpoint only counts `expense` type transactions. Incomes and transfers are excluded.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `from` | date string | Optional |
| `to` | date string | Optional |

**Response:**
```json
{
  "data": [
    {
      "categoryId": "uuid",
      "categoryName": "Comida",
      "categoryIcon": "utensils",
      "count": 12
    }
  ]
}
```

Ordered by `count DESC`. Categories with zero transactions are not included.

---

## Frontend Report Pages

### Reports Index (`/reports`)

A navigation list linking to the three report sub-pages.

### Balances (`/reports/balances`)

Year selector (current year ± 4 years). Clicking "Aplicar" fetches `GET /api/reports/monthly`. Displays a table with monthly rows; desktop shows income and expenses columns, mobile shows only the net flow column.

### Gastos por categoría (`/reports/gastos-por-categoria`)

Filter panel with: date range, account multi-select, type multi-select, category multi-select. Filters are applied manually (the user clicks "Aplicar filtros"). Results are shown using the `SpendingByCategory` chart component. Data is not loaded on page mount — the user must click "Aplicar filtros" first.

### Frecuencia de gastos (`/reports/frecuencia`)

Date range filter (applied manually). Shows a ranked list of categories by number of expense transactions.

---

## `SpendingByCategory` Component

`client/src/components/dashboard/SpendingByCategory.jsx`

Shared between the Dashboard and the SpendByCategory report page. Accepts `data` as an array of `{ categoryName, categoryIcon, total }` items and renders a ranked list with a CSS progress bar for each category (no external chart library — uses CSS custom properties for colors).

---

## How to Add a New Report

1. Add a route handler to `server/src/routes/reports.routes.js`
2. Add any new query params to the relevant Zod schema in `server/src/validators/report.validators.js`
3. Create `client/src/pages/reports/MyReport.jsx`
4. Add the route to `client/src/App.jsx` (`/reports/my-report`)
5. Add a `ReportCard` entry to `client/src/pages/Reports.jsx` — look at existing `ReportCard` usages in that file for the required props (`icon`, `title`, `description`, `to`)
6. Add a service function to `client/src/services/reports.js`

**Where to put backend logic:** Simple aggregations (groupBy, aggregate, raw SQL) go directly in the route handler — look at the `monthly` endpoint for an example using raw SQL and the `by-category` endpoint for Prisma groupBy. Extract to a service file only if the logic is reused across routes or becomes complex enough to warrant separate testing.
