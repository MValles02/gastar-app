// Shared by the app and the Node scripts (scripts import it with plain node: no imports, no TypeScript).

/** Postgres advisory lock id shared by migrate.js and the dev sync. */
export const ADVISORY_LOCK_ID = 727274001;

/** The app's one time zone: days, months and "today" are Buenos Aires time. */
export const APP_TZ = 'America/Argentina/Buenos_Aires';

/** Minimum password length for sign-up and the create-user script. */
export const PASSWORD_MIN_LENGTH = 8;

/** Email domain of local demo/E2E users (never real accounts). */
export const LOCAL_EMAIL_DOMAIN = '@gastar.local';

/**
 * Descriptions match ignoring case, accents and surrounding spaces (rule vs movement).
 * @param {string} s
 */
export const normalizeDescription = (s) =>
	s.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
