import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, USER_NAME_MAX_LENGTH } from '#lib/fields.ts';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { genericOAuth } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { requestEvent } from './request-memo';
import * as env from '$app/env/private';
import { existingAccount, resetPassword, verifyEmail } from './auth-emails';
import { db } from './db';
import { sendEmail } from './email';
import { E2E, LIMITS } from './rate-limit';
import { GOOGLE_PROVIDER_ID } from './reauth';
import { CLIENT_IP_HEADER } from './env-check';
import * as schema from './db/schema';

/** Base URL for links in emails when BETTER_AUTH_URL is unset (local dev). */
const DEV_BASE_URL = 'http://localhost:5173';

// Better Auth takes seconds. The email copy in auth-emails.ts states the token lifetimes.
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const RESET_PASSWORD_TOKEN_TTL = HOUR;
const VERIFY_EMAIL_TOKEN_TTL = 24 * HOUR;

const rule = ({ max, windowMs }: { max: number; windowMs: number }) => ({
	window: windowMs / 1000,
	max
});

/** "Continuar con Google" is on only when both credentials are set (env-check.ts rejects just one). */
export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

/**
 * Profile of a Google sign-in, read from the ID token (the plugin has already verified its signature,
 * issuer, audience and nonce). null (sign-in ends on /login?error=unable_to_get_user_info) unless
 * Google vouches for the email, so no user, account or email is created for an unverified one.
 */
async function googleProfile({ idToken }: { idToken?: string }) {
	if (!idToken) return null;
	const claims = JSON.parse(Buffer.from(idToken.split('.')[1] ?? '', 'base64url').toString());
	if (claims.email_verified !== true || typeof claims.email !== 'string') return null;
	const name = typeof claims.name === 'string' ? claims.name.trim() : '';
	return {
		sub: claims.sub,
		email: claims.email,
		emailVerified: true,
		// The picture is not stored.
		name: (name || claims.email.split('@')[0]).slice(0, USER_NAME_MAX_LENGTH)
	};
}

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
	// Google tokens are never used after sign-in, but they are stored encrypted anyway.
	account: { encryptOAuthTokens: true },
	// The id_token (email, name, picture) is never needed after sign-in: do not persist it.
	databaseHooks: {
		account: {
			create: { before: async (account) => ({ data: { ...account, idToken: null } }) },
			update: { before: async (account) => ({ data: { ...account, idToken: null } }) }
		}
	},
	// State errors (lost or mismatched cookie) end on /login like the other Google errors.
	onAPIError: { errorURL: `${new URL(env.BETTER_AUTH_URL ?? DEV_BASE_URL).origin}/login` },
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
			'/sign-in/email': rule(LIMITS.signIn),
			'/send-verification-email': { window: 15 * MINUTE, max: 3 },
			'/request-password-reset': { window: 15 * MINUTE, max: 3 },
			// e2e builds sign up many test users from one IP.
			'/sign-up/email': rule(LIMITS.signUp),
			'/verify-email': { window: MINUTE, max: E2E ? 50 : 10 },
			'/sign-in/social': rule(LIMITS.oauthStart),
			'/callback/*': { window: MINUTE, max: E2E ? 50 : 10 }
		}
	},
	plugins: [
		...(googleEnabled
			? [
					genericOAuth({
						config: [
							{
								providerId: GOOGLE_PROVIDER_ID,
								clientId: env.GOOGLE_CLIENT_ID!,
								clientSecret: env.GOOGLE_CLIENT_SECRET,
								discoveryUrl:
									env.GOOGLE_DISCOVERY_URL ??
									'https://accounts.google.com/.well-known/openid-configuration',
								requireIdTokenVerification: true,
								scopes: ['openid', 'email', 'profile'],
								pkce: true,
								getUserInfo: googleProfile
							}
						]
					})
				]
			: []),
		sveltekitCookies(requestEvent)
	]
});
