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
	if (problems.length) throw new Error(`Invalid environment: ${problems.join('; ')}`);
}
