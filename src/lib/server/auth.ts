import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '$lib/limits';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { existingAccount, resetPassword, verifyEmail } from './auth-emails';
import { db } from './db';
import { sendEmail } from './email';
import { CLIENT_IP_HEADER } from './env-check';
import * as schema from './db/schema';

/** Base URL for links in emails when BETTER_AUTH_URL is unset (local dev). */
const DEV_BASE_URL = 'http://localhost:5173';

// Better Auth takes seconds. The email copy in auth-emails.ts states the token lifetimes.
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const RESET_PASSWORD_TOKEN_TTL = HOUR;
const VERIFY_EMAIL_TOKEN_TTL = 24 * HOUR;

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		minPasswordLength: PASSWORD_MIN_LENGTH,
		maxPasswordLength: PASSWORD_MAX_LENGTH,
		resetPasswordTokenExpiresIn: RESET_PASSWORD_TOKEN_TTL,
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user, url }) => {
			// Not awaited on purpose: awaiting the send would make known emails slower than
			// unknown ones (timing side-channel). sendEmail never throws.
			void sendEmail({ to: user.email, link: url, ...resetPassword(user.name, url) });
		},
		onExistingUserSignUp: async ({ user }) => {
			const origin = new URL(env.BETTER_AUTH_URL ?? DEV_BASE_URL).origin;
			const login = `${origin}/login`;
			const forgot = `${origin}/forgot-password`;
			// Not awaited: same timing side-channel reason as sendResetPassword.
			void sendEmail({
				to: user.email,
				link: login,
				...existingAccount(user.name, login, forgot)
			});
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		sendOnSignIn: true,
		autoSignInAfterVerification: true,
		expiresIn: VERIFY_EMAIL_TOKEN_TTL,
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail({ to: user.email, link: url, ...verifyEmail(user.name, url) });
		}
	},
	logger: { level: 'warn' },
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	advanced: { ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] } },
	// ponytail: in-memory, single instance; move to DB/Redis if the app is scaled out
	rateLimit: {
		enabled: true,
		storage: 'memory',
		window: MINUTE,
		max: 100,
		customRules: {
			'/sign-in/email': { window: MINUTE, max: 5 },
			'/send-verification-email': { window: 15 * MINUTE, max: 3 },
			'/request-password-reset': { window: 15 * MINUTE, max: 3 },
			// e2e builds sign up many test users from one IP.
			'/sign-up/email': { window: HOUR, max: import.meta.env.VITE_E2E === '1' ? 50 : 10 },
			'/verify-email': { window: MINUTE, max: 10 }
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
