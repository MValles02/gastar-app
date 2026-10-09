// Shared constants for the E2E specs.

// Same defaults as scripts/seed.js (local demo users, not secrets).
export const SEED_EMAIL = process.env.SEED_EMAIL || 'demo@gastar.local';
export const SEED_PASSWORD = process.env.SEED_PASSWORD || 'demo1234';
/** Second seeded user, same password: ARS "Otra cuenta pesos", category "Ajena", USD rule "Regla ajena". */
export const OTHER_EMAIL = 'otro@gastar.local';

/** The app time zone (`TZ` in src/lib/server/month.ts, which is not importable here: it uses `$lib`). */
export const APP_TZ = 'America/Argentina/Buenos_Aires';

/** Minimum touch target, in CSS px. */
export const MIN_TARGET_PX = 44;
export const PHONE = { width: 390, height: 844 };
export const SMALL_PHONE = { width: 320, height: 640 };

/** A movement detail URL (no trailing path). */
export const MOVEMENT_DETAIL_RE = /\/movements\/[0-9a-f-]{36}$/;

export const WHOLE_PESOS_ERROR = 'Los montos en pesos van sin decimales.';
