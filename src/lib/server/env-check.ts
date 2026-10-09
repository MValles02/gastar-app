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
	if (secret && secret.length < 32) problems.push('BETTER_AUTH_SECRET is shorter than 32 chars');
	const header = env.ADDRESS_HEADER;
	if (header && header.toLowerCase() !== 'cf-connecting-ip')
		problems.push('ADDRESS_HEADER must be CF-Connecting-IP');
	if (problems.length) throw new Error(`Invalid environment: ${problems.join('; ')}`);
}
