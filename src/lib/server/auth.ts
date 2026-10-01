import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { db } from './db';
import * as schema from './db/schema';

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	emailAndPassword: { enabled: true, disableSignUp: true },
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] } },
	// ponytail: in-memory, single instance; move to DB/Redis if the app is scaled out
	rateLimit: {
		enabled: true,
		storage: 'memory',
		window: 60,
		max: 100,
		customRules: { '/sign-in/email': { window: 60, max: 5 } }
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
