import { defineEnvVars } from '@sveltejs/kit/env';

// Every variable the server reads. They are all optional (a missing one stays `undefined`); the
// production requirements live in `checkEnv` (src/lib/server/env-check.ts).
const optional = { schema: (value: string | undefined) => value };

export const variables = defineEnvVars({
	BETTER_AUTH_SECRET: optional,
	BETTER_AUTH_URL: optional,
	DATABASE_URL: optional,
	EMAIL_FROM: optional,
	GIT_SHA: optional,
	GOOGLE_CLIENT_ID: optional,
	GOOGLE_CLIENT_SECRET: optional,
	GOOGLE_DISCOVERY_URL: optional,
	GMAIL_API_BASE_URL: optional,
	GMAIL_AUTH_BASE_URL: optional,
	GMAIL_CLIENT_ID: optional,
	GMAIL_CLIENT_SECRET: optional,
	GMAIL_TOKEN_KEY: optional,
	MP_API_BASE_URL: optional,
	MP_AUTH_BASE_URL: optional,
	MP_CLIENT_ID: optional,
	MP_CLIENT_SECRET: optional,
	MP_REPORT_POLL_MS: optional,
	MP_REPORT_TIMEOUT_MS: optional,
	MP_SYNC_INTERVAL_HOURS: optional,
	MP_TOKEN_KEY: optional,
	RESEND_API_KEY: optional
});
