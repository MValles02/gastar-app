// One home for what the e2e config, the fakes (plain Node) and the specs share: each fake's port (set the
// FAKE_*_PORT env vars to unique values per worktree), OAuth client and token key, and the fixture date helpers.
import { existsSync } from 'node:fs';
import { APP_TZ, DAY_MS } from '../src/lib/shared/runtime.js';

// Local runs read DATABASE_URL, SEED_PASSWORD and any E2E_PORT/FAKE_*_PORT from .env, like the app and the db
// scripts; variables already set win. CI sets them in the environment.
if (existsSync('.env')) process.loadEnvFile('.env');

/** @param {number} port @param {string} clientId @param {string} clientSecret */
const fake = (port, clientId, clientSecret) => ({
	port,
	url: `http://127.0.0.1:${port}`,
	clientId,
	clientSecret
});
/** Base64 of 32 ASCII chars: a token encryption key (MP_TOKEN_KEY, GMAIL_TOKEN_KEY). */
/** @param {string} chars */
const tokenKey = (chars) => Buffer.from(chars).toString('base64');

/** e2e/fake-mp.js */
export const FAKE_MP = {
	...fake(Number(process.env.FAKE_MP_PORT) || 5199, 'test-client-id', 'test-client-secret'),
	tokenKey: tokenKey('0123456789abcdef0123456789abcdef')
};
/** e2e/fake-google.js */
export const FAKE_GOOGLE = fake(
	Number(process.env.FAKE_GOOGLE_PORT) || 5198,
	'test-google-client-id',
	'test-google-client-secret'
);
/** e2e/fake-gmail.js */
export const FAKE_GMAIL = {
	...fake(
		Number(process.env.FAKE_GMAIL_PORT) || 5197,
		'test-gmail-client-id',
		'test-gmail-client-secret'
	),
	tokenKey: tokenKey('fedcba9876543210fedcba9876543210')
};

export { DAY_MS };

/**
 * The app time zone's calendar day of an instant, as YYYY-MM-DD.
 * @param {number | Date} at
 */
export const appDay = (at) => new Intl.DateTimeFormat('en-CA', { timeZone: APP_TZ }).format(at);

/** The app time zone's UTC offset now, as "-03:00". */
export const appOffset = () =>
	new Intl.DateTimeFormat('en-US', { timeZone: APP_TZ, timeZoneName: 'longOffset' })
		.formatToParts(new Date())
		.find((p) => p.type === 'timeZoneName')
		?.value.replace('GMT', '') ?? '';

/**
 * The app time zone's calendar day `n` days ago, as YYYY-MM-DD.
 * @param {number} n
 */
export const arDaysAgo = (n) => appDay(Date.now() - n * DAY_MS);
