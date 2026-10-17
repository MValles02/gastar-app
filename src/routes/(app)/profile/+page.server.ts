import { fail } from '@sveltejs/kit';
import { PREFERENCE_COOKIE_OPTIONS, THEME_COOKIE } from '$lib/server/cookies';
import { getImportAccount, pendingImportCount } from '$lib/server/mp-import-queries';
import type { Actions, PageServerLoad } from './$types';

const THEMES = ['light', 'dark', 'system'] as const;
type Theme = (typeof THEMES)[number];

const isTheme = (value: unknown): value is Theme =>
	typeof value === 'string' && (THEMES as readonly string[]).includes(value);

const parseTheme = (value: string | undefined): Theme => (isTheme(value) ? value : 'system');

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = locals.user!;
	return {
		user: { name: user.name, email: user.email },
		theme: parseTheme(cookies.get(THEME_COOKIE)),
		imports: (await getImportAccount(user.id))
			? { pending: await pendingImportCount(user.id) }
			: null
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
