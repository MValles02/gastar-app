import { formFail } from '$lib/form';
import { auth } from '$lib/server/auth';
import { userNameError } from '$lib/server/auth-forms';
import { PREFERENCE_COOKIE_OPTIONS, THEME_COOKIE } from '$lib/server/cookies';
import { profileCounts } from '$lib/server/profile-queries';
import { getConnectionInfo, mpOauthEnabled } from '$lib/server/mp-oauth';
import type { Actions, PageServerLoad } from './$types';

const THEMES = ['light', 'dark', 'system'] as const;
type Theme = (typeof THEMES)[number];

const isTheme = (value: unknown): value is Theme =>
	typeof value === 'string' && (THEMES as readonly string[]).includes(value);

const parseTheme = (value: string | undefined): Theme => (isTheme(value) ? value : 'system');

/** The Mercado Pago row: null when the feature is off, else the link state it shows as its value. */
async function importsRow(userId: string) {
	if (!mpOauthEnabled()) return null;
	const conn = await getConnectionInfo(userId);
	if (conn?.needsReconnect) return { state: 'reconnect' as const };
	if (conn?.accountId) return { state: 'linked' as const };
	return { state: 'unlinked' as const };
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = locals.user!;
	return {
		user: { name: user.name, email: user.email },
		theme: parseTheme(cookies.get(THEME_COOKIE)),
		counts: await profileCounts(user.id),
		imports: await importsRow(user.id)
	};
};

export const actions: Actions = {
	/** Saves the name as typed in the row (`undo` posts the previous one back through the same action). */
	name: async ({ request }) => {
		const name = String((await request.formData()).get('name') ?? '').trim();
		const error = userNameError(name);
		if (error) return formFail(400, { errors: { name: error } });

		await auth.api.updateUser({ body: { name }, headers: request.headers });
		return { name };
	},

	theme: async ({ request, cookies }) => {
		const data = await request.formData();
		const value = data.get('theme');

		if (!isTheme(value)) {
			return formFail(400, { formError: 'Tema inválido.' });
		}

		cookies.set(THEME_COOKIE, value, PREFERENCE_COOKIE_OPTIONS);

		return { theme: value };
	}
};
