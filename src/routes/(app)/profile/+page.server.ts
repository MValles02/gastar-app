import { fail } from '@sveltejs/kit';
import { PREFERENCE_COOKIE_OPTIONS, THEME_COOKIE } from '$lib/server/cookies';
import { pendingImportCount } from '$lib/server/mp-import-queries';
import { getConnectionInfo, mpOauthEnabled } from '$lib/server/mp-oauth';
import type { Actions, PageServerLoad } from './$types';

const THEMES = ['light', 'dark', 'system'] as const;
type Theme = (typeof THEMES)[number];

const isTheme = (value: unknown): value is Theme =>
	typeof value === 'string' && (THEMES as readonly string[]).includes(value);

const parseTheme = (value: string | undefined): Theme => (isTheme(value) ? value : 'system');

/** The Mercado Pago row: null when the feature is off; `pending` only when imports are usable. */
async function importsRow(userId: string) {
	if (!mpOauthEnabled()) return null;
	const conn = await getConnectionInfo(userId);
	if (conn?.needsReconnect) return { state: 'reconnect' as const };
	if (conn?.accountId)
		return { state: 'linked' as const, pending: await pendingImportCount(userId) };
	return { state: 'unlinked' as const };
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = locals.user!;
	return {
		user: { name: user.name, email: user.email },
		theme: parseTheme(cookies.get(THEME_COOKIE)),
		imports: await importsRow(user.id)
	};
};

export const actions: Actions = {
	theme: async ({ request, cookies }) => {
		const data = await request.formData();
		const value = data.get('theme');

		if (!isTheme(value)) {
			return fail(400, { error: 'Tema inválido.' });
		}

		cookies.set(THEME_COOKIE, value, PREFERENCE_COOKIE_OPTIONS);

		return { theme: value };
	}
};
