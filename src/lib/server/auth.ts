import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { existingAccount, resetPassword, verifyEmail } from './auth-emails';
import { db } from './db';
import { sendEmail } from './email';
import * as schema from './db/schema';

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		minPasswordLength: 8,
		maxPasswordLength: 128,
		resetPasswordTokenExpiresIn: 3600,
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: async ({ user, url }) => {
			await sendEmail({ to: user.email, link: url, ...resetPassword(user.name, url) });
		},
		onExistingUserSignUp: async ({ user }) => {
			const origin = new URL(env.BETTER_AUTH_URL ?? 'http://localhost:5173').origin;
			const login = `${origin}/login`;
			const forgot = `${origin}/forgot-password`;
			await sendEmail({
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
		expiresIn: 86400,
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail({ to: user.email, link: url, ...verifyEmail(user.name, url) });
		}
	},
	logger: { level: 'warn' },
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] } },
	// ponytail: in-memory, single instance; move to DB/Redis if the app is scaled out
	rateLimit: {
		enabled: true,
		storage: 'memory',
		window: 60,
		max: 100,
		customRules: {
			'/sign-in/email': { window: 60, max: 5 },
			'/send-verification-email': { window: 900, max: 3 },
			'/request-password-reset': { window: 900, max: 3 },
			'/verify-email': { window: 60, max: 10 }
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
