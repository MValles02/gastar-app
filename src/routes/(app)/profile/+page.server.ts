import { formFail } from '#lib/form.ts';
import { auth } from '#lib/server/auth.ts';
import { userNameError } from '#lib/fields.ts';
import { PREFERENCE_COOKIE_OPTIONS, THEME_COOKIE } from '#lib/server/cookies.ts';
import { profileCounts } from '#lib/server/profile-queries.ts';
import { requireUser } from '#lib/server/guards.ts';
import { hasPassword } from '#lib/server/reauth.ts';
import { isTheme, type Theme } from '#lib/theme.ts';
import type { Actions, PageServerLoad } from './$types';

const parseTheme = (value: string | undefined): Theme => (isTheme(value) ? value : 'system');

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = requireUser(locals);
	return {
		user: { name: user.name, email: user.email },
		theme: parseTheme(cookies.get(THEME_COOKIE)),
		counts: await profileCounts(user.id),
		hasPassword: await hasPassword(user.id)
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
