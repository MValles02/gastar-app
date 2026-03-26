# Authentication

Gastar supports two authentication methods: email/password and Google OAuth. Both methods produce a JWT that is stored in an HTTP-only cookie. All protected routes accept either the cookie or a `Bearer` token in the `Authorization` header.

---

## Files

- `server/src/routes/auth.routes.js` — all auth endpoints
- `server/src/middleware/auth.middleware.js` — JWT verification middleware
- `server/src/utils/token.js` — JWT generation and cookie setting
- `server/src/utils/reset-token.js` — SHA-256 hashing for reset tokens
- `server/src/services/email.service.js` — password reset email via Resend
- `server/src/services/google-auth.service.js` — Google OAuth flow
- `server/src/validators/auth.validators.js` — Zod schemas
- `client/src/context/AuthContext.jsx` — frontend auth state
- `client/src/pages/Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`

---

## Rate Limiting

All auth endpoints (register, login, forgot-password, reset-password, Google callback) are protected by a rate limiter: **10 requests per IP per 15 minutes** (`express-rate-limit`). Exceeding this returns a 429 with the message `"Demasiados intentos. Intentá de nuevo más tarde."`.

---

## Email/Password Registration

### Endpoint

`POST /api/auth/register`

### Request

```json
{
  "name": "string (min 2, max 100)",
  "email": "string (valid email)",
  "password": "string (min 8 chars)"
}
```

### Behavior

1. Validates body with `registerSchema`
2. Checks for duplicate email — returns 409 if found
3. Hashes password with bcrypt (cost factor 10)
4. Creates user record
5. **Seeds 13 default categories** for the new user (see [Categories](./categories.md))
6. Generates JWT, sets `token` HTTP-only cookie
7. Returns 201 with `{ data: { user } }`

### Default categories seeded

Salario, Freelance, Inversiones, Otros ingresos, Comida, Transporte, Alquiler, Entretenimiento, Salud, Educación, Ropa, Servicios, Otros gastos.

---

## Email/Password Login

### Endpoint

`POST /api/auth/login`

### Request

```json
{
  "email": "string",
  "password": "string"
}
```

### Behavior

1. Finds user by email
2. If user not found or `passwordHash` is null (Google-only user): returns 401 with `"Credenciales inválidas"`
3. Compares password with bcrypt
4. Sets `token` cookie, returns `{ data: { user } }`

The error message is deliberately generic (doesn't distinguish "user not found" from "wrong password") to prevent user enumeration.

---

## Logout

### Endpoint

`POST /api/auth/logout`

Clears the `token` cookie by setting `maxAge: 0`. Does not require authentication — always returns 200.

---

## Get Current User

### Endpoint

`GET /api/auth/me` (requires auth)

Returns `{ data: { id, email, name, cotizacionPreference } }`. Used on app load by `AuthContext` to restore the session.

---

## Update Profile

### Endpoint

`PATCH /api/auth/me` (requires auth)

Currently only supports updating `cotizacionPreference`.

### Request

```json
{
  "cotizacionPreference": "blue" | "oficial"
}
```

Returns `{ data: { id, email, name, cotizacionPreference } }`.

---

## Delete Account

### Endpoint

`DELETE /api/auth/me` (requires auth)

Permanently deletes the user and all their data (accounts, transactions, categories — cascaded by Prisma). Clears the `token` cookie. Returns `{ data: { message: "Cuenta eliminada" } }`.

The frontend shows a destructive confirmation dialog before calling this endpoint.

---

## Password Reset Flow

### Step 1 — Request reset

`POST /api/auth/forgot-password`

```json
{ "email": "string" }
```

Behavior:
1. Looks up user by email
2. If user exists AND has a `passwordHash` (i.e., not a Google-only account): generates a 32-byte random token, hashes it with SHA-256, stores the hash and a 1-hour expiry on the user record
3. Sends a password reset email via Resend with a link to `APP_URL/reset-password?token=<raw_token>`
4. Always returns the same success message regardless of whether the email exists — prevents user enumeration

### Step 2 — Reset password

`POST /api/auth/reset-password`

```json
{
  "token": "string (raw token from email link)",
  "password": "string (min 8 chars)"
}
```

Behavior:
1. Hashes the incoming token with SHA-256
2. Finds a user where `resetToken === hashedToken` AND `resetTokenExpiry > now`
3. If not found: returns 400 `"Token inválido o expirado"`
4. Hashes new password, updates user, clears `resetToken` and `resetTokenExpiry`

### Token security

Reset tokens are stored as SHA-256 hashes, not plaintext. The raw token only exists in the email link. This means a database leak does not expose usable reset tokens.

---

## Google OAuth Flow

### Endpoints

- `GET /api/auth/google` — redirects to Google's consent screen
- `GET /api/auth/google/callback` — handles the OAuth callback

### Flow

1. User clicks "Iniciar sesión con Google"
2. Frontend redirects to `GET /api/auth/google`
3. Server builds the Google authorization URL (scopes: `email`, `profile`) and redirects
4. Google redirects back to `/api/auth/google/callback?code=...`
5. Server exchanges the code for tokens, verifies the ID token, extracts profile
6. Google requires the email to be verified (`email_verified: true`) — if not, redirects to `/login?authError=email_not_verified`
7. **Account linking logic:**
   - If a user with this `googleId` exists: log them in
   - If no user with this `googleId` but a user with this email exists: link the Google ID to the existing account
   - Otherwise: create a new user (no `passwordHash`, `googleId` set)
8. Sets JWT cookie, redirects to `/`

### Known gap

New users created via Google OAuth do **not** get the 13 default categories seeded. They start with zero categories. This should be fixed to match the email registration behavior.

### Error redirects

| Error | Redirect |
|-------|---------|
| User denied access | `/login?authError=access_denied` |
| Email not verified by Google | `/login?authError=email_not_verified` |
| Any other error | `/login?authError=server_error` |

The Login page reads the `authError` query param and displays an appropriate message.

---

## JWT Details

- Generated with `jsonwebtoken`, signed with `JWT_SECRET`
- Payload: `{ userId: "uuid" }`
- No explicit expiry set (tokens don't expire — session ends on logout or cookie eviction)
- Cookie name: `token`, flags: `httpOnly: true`, `path: '/'`

## `authenticate` Middleware

`server/src/middleware/auth.middleware.js`

Reads the JWT from:
1. `req.cookies.token` (HTTP-only cookie, used by the browser)
2. `req.headers.authorization` stripped of `"Bearer "` (used by tests and programmatic clients)

Sets `req.userId` on success. Returns 401 on missing or invalid token.

---

## Frontend Auth Flow

`AuthContext` calls `GET /api/auth/me` on mount. While loading, `PrivateRoute` shows a full-screen spinner. Once resolved:
- User found → render protected page inside `AppLayout`
- 401 → redirect to `/login`
- Other error → show full-screen error with retry button

After logout, `AuthContext` sets `user = null`, causing `PrivateRoute` to redirect to `/login`.

---

## Adding a New OAuth Provider

1. Add credentials to `.env`
2. Create `server/src/services/<provider>-auth.service.js` following the Google pattern
3. Add two routes to `auth.routes.js`: `GET /api/auth/<provider>` and `GET /api/auth/<provider>/callback`
4. Apply the same account-linking logic (find by provider ID → find by email → create new)
5. **Remember to seed default categories for newly created users**
