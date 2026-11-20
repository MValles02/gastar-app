// Prints non-secret KEY=VALUE placeholders for CI; the workflow appends them to $GITHUB_ENV.
// Later lines win. DATABASE_URL is set by the workflow and never printed here.
import { DEFAULT_SEED_PASSWORD } from './lib/seed-identities.js';

const checks = [
	'BETTER_AUTH_SECRET=ci-placeholder-secret-not-used-anywhere-000000',
	'BETTER_AUTH_URL=http://localhost:3000',
	'ORIGIN=http://localhost:3000'
];
const e2e = [
	...checks,
	'BETTER_AUTH_URL=http://localhost:5173',
	'ORIGIN=http://localhost:5173',
	// CI-only demo password for the throwaway database.
	`SEED_PASSWORD=${DEFAULT_SEED_PASSWORD}`,
	// Google Chrome preinstalled on the ubuntu runner image; no browser download.
	'CHROMIUM_PATH=/usr/bin/google-chrome'
];
const lines = { checks, e2e }[process.argv[2]];
if (!lines) {
	console.error('usage: node scripts/ci-env.mjs <checks|e2e>');
	process.exit(1);
}
console.log(lines.join('\n'));
