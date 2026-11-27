/** Server-only business numbers (limits, lifetimes, page sizes, backfill windows), one named place. */
import { e2eOr } from '#lib/e2e.ts';

const MINUTE_MS = 60_000;

/**
 * Per-bucket rate limits. Better Auth's limiter covers the HTTP endpoints (keyed by IP + path); the
 * form-action buckets cover direct auth.api calls. They are separate counters, so their numbers
 * are independent (e.g. `resend` vs `resendHttp`).
 */
export const RATE_LIMITS = {
	signIn: { max: 5, windowMs: MINUTE_MS },
	// e2e builds sign up many test users from one IP (matches Better Auth's /sign-up/email rule).
	signUp: { max: e2eOr(10), windowMs: 60 * MINUTE_MS },
	resetRequestIp: { max: 5, windowMs: 15 * MINUTE_MS },
	resetRequestEmail: { max: 3, windowMs: 15 * MINUTE_MS },
	resend: { max: 5, windowMs: 15 * MINUTE_MS },
	// Better Auth HTTP endpoints (see above).
	resendHttp: { max: 3, windowMs: 15 * MINUTE_MS },
	resetRequestHttp: { max: 3, windowMs: 15 * MINUTE_MS },
	verifyEmail: { max: e2eOr(10), windowMs: MINUTE_MS },
	oauthCallback: { max: e2eOr(10), windowMs: MINUTE_MS },
	changePassword: { max: 5, windowMs: 15 * MINUTE_MS },
	deleteAccount: { max: 5, windowMs: 15 * MINUTE_MS },
	// Starting a Google sign-in (the form action calls auth.api, which skips Better Auth's limiter).
	// e2e builds start many from one IP.
	oauthStart: { max: e2eOr(10), windowMs: MINUTE_MS },
	// PDF parsing is the heaviest request a user can send.
	statementUpload: { max: e2eOr(10), windowMs: 15 * MINUTE_MS }
} as const;

/** Token lifetimes in seconds (Better Auth takes seconds). The email copy in auth-emails.ts states them. */
export const RESET_PASSWORD_TOKEN_TTL_S = 3600;
export const VERIFY_EMAIL_TOKEN_TTL_S = 86400;

/** How long after signing in a password-less user may still create a password or delete the account. */
export const RECENT_SESSION_MS = 5 * MINUTE_MS;

/** How far back "Importar desde" may reach. */
export const MAX_BACKFILL_DAYS = 365;
/** How far back a first sync reaches when the user has not chosen an "importar desde" day. */
export const DEFAULT_BACKFILL_DAYS = 30;
/** How long an automatically approved item stays in the "approved automatically" list. */
export const AUTO_APPROVED_DAYS = 30;

/** Upload cap; the real statements are well under 1 MB. BODY_SIZE_LIMIT (Dockerfile) sits above it. */
export const MAX_STATEMENT_BYTES = 5 * 1024 * 1024;
/** A statement PDF with more pages is rejected. */
export const STATEMENT_MAX_PAGES = 20;

/** The movements list shows this many rows per page; `?page` is capped at MOVEMENTS_MAX_PAGE. */
export const MOVEMENTS_PAGE_SIZE = 50;
export const MOVEMENTS_MAX_PAGE = 10000;
/** Latest movements shown on a short list. */
export const RECENT_MOVEMENTS_LIMIT = 10;

/** Full months of history behind suggested rules and limits; a suggested rule appears in each of them. */
export const HISTORY_MONTHS = 3;

/** Categories ranked on Inicio. */
export const HOME_TOP_CATEGORIES = 3;
/** Months in the Reportes flow chart. */
export const REPORTS_FLOW_MONTHS = 6;
/** Categories listed as their own row in Reportes; the rest are summed into "Otros". */
export const REPORTS_TOP_CATEGORIES = 4;

/** Longest search text on the accounts screen. */
export const ACCOUNT_SEARCH_MAX_LENGTH = 40;
