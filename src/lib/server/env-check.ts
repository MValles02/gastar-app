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

/** Throws listing the names (never values) of missing or invalid env vars. */
export function checkEnv(env: Record<string, string | undefined>): void {
	const problems = REQUIRED.filter((name) => !env[name]).map((name) => `${name} is missing`);
	const secret = env.BETTER_AUTH_SECRET;
	if (secret && secret.length < MIN_SECRET_LENGTH)
		problems.push(`BETTER_AUTH_SECRET is shorter than ${MIN_SECRET_LENGTH} chars`);
	const header = env.ADDRESS_HEADER;
	if (header && header.toLowerCase() !== CLIENT_IP_HEADER)
		problems.push('ADDRESS_HEADER must be CF-Connecting-IP');
	if (env.MP_TOKEN_KEY && Buffer.from(env.MP_TOKEN_KEY, 'base64').length !== 32)
		problems.push('MP_TOKEN_KEY must be base64 of 32 bytes');
	if (env.GMAIL_TOKEN_KEY && Buffer.from(env.GMAIL_TOKEN_KEY, 'base64').length !== 32)
		problems.push('GMAIL_TOKEN_KEY must be base64 of 32 bytes');
	if (new Set([!!env.GMAIL_CLIENT_ID, !!env.GMAIL_CLIENT_SECRET, !!env.GMAIL_TOKEN_KEY]).size > 1)
		problems.push('set all of GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_TOKEN_KEY or none');
	if (Boolean(env.GOOGLE_CLIENT_ID) !== Boolean(env.GOOGLE_CLIENT_SECRET))
		problems.push('set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET or neither');
	if (problems.length) throw new Error(`Invalid environment: ${problems.join('; ')}`);
}
