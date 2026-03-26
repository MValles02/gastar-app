# Testing

Tests live in `server/test/` and use the **Node.js built-in test runner** (`node:test`). There is no Jest, Mocha, or Vitest — only the native `test`, `assert`, `beforeEach`, and `after` APIs.

---

## Test Types

### Unit Tests

**Location:** `server/test/*.test.js`

Test individual modules in isolation. No HTTP server, no database. These run fast.

| File | What it tests |
|------|--------------|
| `transaction.service.test.js` | `applyTransactionBalances`, `reverseTransactionBalances`, `getBalanceDelta` |
| `transaction-rules.test.js` | `getEffectiveTransaction` — all field merge scenarios and edge cases |
| `transaction.validators.test.js` | `createTransactionSchema` and `updateTransactionSchema` — valid/invalid inputs |
| `report.validators.test.js` | `reportQuerySchema`, `monthlyQuerySchema`, `byCategoryQuerySchema` |
| `misc.validators-and-utils.test.js` | Auth validators, account validators, category validators, misc utilities |
| `reset-token.test.js` | `hashResetToken` — deterministic SHA-256 hashing |

### Integration Tests

**Location:** `server/test/integration/*.test.js`

Spin up a real Express server (on a random port via `listen(0)`) against a real PostgreSQL test database. They use the native `fetch` API to make HTTP requests, so they test the full stack: middleware, routing, validation, service logic, and DB writes.

| File | What it tests |
|------|--------------|
| `core.routes.test.js` | Auth flow, accounts CRUD, categories CRUD, reports endpoints |
| `transactions.routes.test.js` | Transaction CRUD, balance updates, transfers, password reset flow |

Each test file starts its own server instance and cleans up after itself. The `beforeEach` hook calls `resetDb()` to wipe all data before every test case.

---

## Test Helpers

All helpers are in `server/test/helpers/`.

### `server.js` — `startTestServer()`

Starts the Express app on port `0` (OS assigns a random available port) and returns `{ baseUrl, close }`.

```js
import { startTestServer } from '../helpers/server.js';

const { baseUrl, close } = await startTestServer();

after(async () => {
  await close();
  await disconnectDb();
});
```

Uses the `createApp()` factory from `server/src/app.js` — the same app used in production, no test-specific wiring.

### `db.js` — `resetDb()`, `disconnectDb()`, `prisma`

- `resetDb()` — deletes all rows in dependency order: transactions → categories → accounts → users. Call this in `beforeEach`.
- `disconnectDb()` — gracefully disconnects Prisma. Call this in `after`.
- `prisma` — re-exports the Prisma singleton for direct DB assertions in tests.

```js
import { resetDb, disconnectDb, prisma } from '../helpers/db.js';
```

### `factories.js` — seed helpers

Creates real DB records for use in tests. Each factory accepts an `overrides` object.

```js
import { createUser, createAccount, createCategory } from '../helpers/factories.js';

const { user, password } = await createUser({ name: 'Alice' });
const account = await createAccount(user.id, { balance: 1000, currency: 'ARS' });
const category = await createCategory(user.id, { name: 'Comida' });
```

| Function | Returns | Notes |
|----------|---------|-------|
| `createUser(overrides?)` | `{ user, password }` | Generates a unique email with a counter; hashes password. **Does NOT seed default categories** — only the HTTP `POST /api/auth/register` endpoint does that. If a test needs categories, call `createCategory()` explicitly. |
| `createAccount(userId, overrides?)` | `Account` | Defaults: type `checking`, balance `0`, currency `ARS` |
| `createCategory(userId, overrides?)` | `Category` | Defaults: icon `wallet` |

### `auth.js` — `registerAndGetSession(baseUrl, overrides?)`

Performs a full HTTP register request and returns `{ response, payload, cookie, body }`. Use this when you need a session cookie to make authenticated requests.

```js
import { registerAndGetSession } from '../helpers/auth.js';

const session = await registerAndGetSession(baseUrl, {
  email: 'test@example.com',
  password: 'secret123',
});

// Use session.cookie in subsequent requests
const res = await fetch(`${baseUrl}/api/accounts`, {
  headers: { cookie: session.cookie },
});
```

---

## Running Tests

```bash
# All unit tests
npm test

# All integration tests (requires DATABASE_URL_TEST in .env)
npm run test:integration

# A single test file
node --test server/test/transaction.service.test.js
node --test server/test/integration/transactions.routes.test.js
```

Integration tests require a separate test database configured in `DATABASE_URL_TEST`. They will fully reset this database on every `beforeEach` — never point it at your development or production database.

---

## Email Testing in Integration Tests

`server/src/services/email.service.js` detects `NODE_ENV === 'test'` and instead of calling Resend, it stores sent emails in an in-memory array. Use `getTestEmails()` to inspect them and `clearTestEmails()` to reset between tests.

```js
import { getTestEmails, clearTestEmails } from '../../src/services/email.service.js';

beforeEach(() => clearTestEmails());

// After triggering a password reset:
const emails = getTestEmails();
assert.equal(emails.length, 1);
assert.equal(emails[0].email, 'user@example.com');
// emails[0].resetToken contains the raw token you can use to call /api/auth/reset-password
```

---

## Coverage Map

| Module | Unit tests | Integration tests |
|--------|-----------|------------------|
| `transaction.service.js` | Yes | Yes (via transactions routes) |
| `transaction-rules.js` | Yes | Yes (via PUT /api/transactions) |
| `transaction.validators.js` | Yes | Yes |
| `report.validators.js` | Yes | Yes (via reports routes) |
| `auth.validators.js` | Yes | Yes |
| `account.validators.js` | Yes | Yes |
| `category.validators.js` | Yes | Yes |
| `reset-token.js` | Yes | Yes (via password reset flow) |
| `auth.routes.js` | No unit | Yes |
| `accounts.routes.js` | No unit | Yes |
| `transactions.routes.js` | No unit | Yes |
| `categories.routes.js` | No unit | Yes |
| `reports.routes.js` | No unit | Yes |
| `exchange-rates.routes.js` | No unit | No |
| `exchange-rate.service.js` | No | No |
| `email.service.js` | No | Partial (reset flow) |
| `google-auth.service.js` | No | No |

---

## Writing a New Test

### Unit test

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { myFunction } from '../../src/services/my.service.js';

test('description of behavior', () => {
  const result = myFunction(input);
  assert.equal(result, expected);
});
```

### Integration test

```js
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/server.js';
import { createUser, createAccount, createCategory } from '../helpers/factories.js';
import { disconnectDb, prisma, resetDb } from '../helpers/db.js';
import { registerAndGetSession } from '../helpers/auth.js';

const { baseUrl, close } = await startTestServer();

after(async () => {
  await close();
  await disconnectDb();
});

beforeEach(async () => {
  await resetDb();
});

test('POST /api/my-resource creates a record', async () => {
  const session = await registerAndGetSession(baseUrl);

  const res = await fetch(`${baseUrl}/api/my-resource`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: session.cookie,
    },
    body: JSON.stringify({ name: 'Test' }),
  });

  const body = await res.json();
  assert.equal(res.status, 201);
  assert.equal(body.data.name, 'Test');

  // Optionally verify in DB directly
  const record = await prisma.myModel.findFirst({ where: { name: 'Test' } });
  assert.ok(record);
});
```
