import { GMAIL_ENV } from './imports/gmail/oauth';
import { MP_ENV } from './imports/mercado-pago/oauth';

/** Real client IP header behind Cloudflare; ADDRESS_HEADER (adapter-node) must name it too. */
export const CLIENT_IP_HEADER = 'cf-connecting-ip';

const MIN_SECRET_LENGTH = 32;

const REQUIRED = [
	'BETTER_AUTH_SECRET',
	'BETTER_AUTH_URL',
	'DATABASE_URL',
	'ORIGIN',
	'ADDRESS_HEADER',
	'RESEND_API_KEY',
	'EMAIL_FROM'
];

/**
 * An optional feature's env vars, exported by the feature's module: it is on only when every one of
 * `vars` is set, and `key` (one of them) must be base64 of 32 bytes. With `allOrNone`, a partial set
 * fails startup instead of leaving the feature off.
 */
export type EnvGroup = { vars: readonly string[]; key: string; allOrNone: boolean };

const FEATURE_GROUPS: readonly EnvGroup[] = [MP_ENV, GMAIL_ENV];

const listed = (names: readonly string[]) =>
	`${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** Throws listing the names (never values) of missing or invalid env vars. */
export function checkEnv(env: Record<string, string | undefined>): void {
	const problems = REQUIRED.filter((name) => !env[name]).map((name) => `${name} is missing`);
	const secret = env.BETTER_AUTH_SECRET;
	if (secret && secret.length < MIN_SECRET_LENGTH)
		problems.push(`BETTER_AUTH_SECRET is shorter than ${MIN_SECRET_LENGTH} chars`);
	const header = env.ADDRESS_HEADER;
	if (header && header.toLowerCase() !== CLIENT_IP_HEADER)
		problems.push('ADDRESS_HEADER must be CF-Connecting-IP');
	for (const { vars, key, allOrNone } of FEATURE_GROUPS) {
		const value = env[key];
		if (value && Buffer.from(value, 'base64').length !== 32)
			problems.push(`${key} must be base64 of 32 bytes`);
		if (allOrNone && new Set(vars.map((name) => !!env[name])).size > 1)
			problems.push(`set all of ${listed(vars)} or none`);
	}
	if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET))
		problems.push('set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET or neither');
	if (problems.length) throw new Error(`Invalid environment: ${problems.join('; ')}`);
}
