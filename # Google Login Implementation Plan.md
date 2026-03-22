# Google Login Implementation Plan

## Summary
Add Google sign-in/sign-up as a second auth method on top of the existing JWT cookie session model. The backend will own the OAuth authorization-code callback, create or resolve the local user, issue the same token cookie already used today, and redirect back into the SPA. Existing password auth remains intact; Google-created accounts are Google-only in v1.

## Key Changes

### Auth flow and interfaces
- Add GET /api/auth/google to start the Google OAuth redirect.
- Add GET /api/auth/google/callback to exchange the auth code, validate Google identity, resolve/create the local user, set the JWT cookie, and redirect to the SPA.
- Success redirect: send users to / after cookie issuance.
- Failure redirect: send users to /login?authError=<code> so the existing login page can render a friendly message.
- Frontend login page: add a prominent “Continuar con Google” action that hits the backend start endpoint directly with window.location.href.

### Backend auth/data model
- Extend User so Google-backed identities can be represented without a password:
  - passwordHash becomes nullable.
  - Add googleId as nullable + unique.
- Resolution rules:
  - If a user with matching googleId exists, sign them in.
  - Else if a user with the same email exists, auto-link by storing googleId on that row and sign them in.
  - Else create a new user with email, name, nullable passwordHash, and googleId, then sign them in.
  - For new Google users, derive name from Google profile; if missing, default to the email local-part.
- Password login behavior:
  - Existing /api/auth/login must reject users whose passwordHash is null with the same generic invalid-credentials response.
  - Forgot/reset-password routes should ignore Google-only accounts in v1 rather than creating a password path.
  - Keep JWT payload/cookie format unchanged so the rest of the app stays compatible.

### Implementation details
- Use Google OAuth authorization code flow on the server with google-auth-library.
- Add env vars in .env.example:
  - GOOGLE_CLIENT_ID
  - GOOGLE_CLIENT_SECRET
  - GOOGLE_CALLBACK_URL
- Reuse APP_URL as the SPA base URL for post-auth redirects.
- Add a small auth helper/service for:
  - building the Google auth URL,
  - exchanging code for tokens,
  - validating that Google returned a verified email,
  - normalizing profile fields used by the app.

### UX and copy
- Parse authError query param and map known values to user-facing Spanish messages.
- Register page:
  - Add equivalent Google CTA so “signup with Google” is explicit.
  - No account settings/unlink UI in v1.

## Public APIs / Types
- New routes:
  - GET /api/auth/google
  - GET /api/auth/google/callback
- User persistence contract changes:
  - passwordHash: string | null
  - googleId: string | null
- No change to the response shape of /api/auth/me, /api/auth/login, /api/auth/register, or JWT contents.

## Test Plan
- Unit/service tests:
  - auth helper builds correct Google authorization URL
  - callback handler rejects missing code, unverified email, token exchange failure, and malformed profile
  - user resolution logic covers existing googleId, same-email auto-link, and new-user creation
- Integration tests:
  - Google callback for a new email creates a user, sets cookie, and redirects successfully
  - Google callback for an existing password account links googleId and signs in
  - Google callback for an already linked user signs in without creating duplicates
  - Password login fails for Google-only users
  - GET /api/auth/me works after Google login using the issued cookie
  - Failure cases redirect to /login?authError=... and do not create a session
- UI tests/manual verification:
  - login/register pages show Google CTA
  - failed Google auth shows a readable banner
  - successful Google auth lands on the authenticated app shell

## Assumptions
- Google sign-in should support both new account creation and login in the first version.
- Email match is sufficient for automatic linking when Google confirms the email as verified.
- Google-created accounts are OAuth-only in v1; adding “set password later” is out of scope.
- No unlinking, provider management, or multi-provider account settings are included in this implementation.