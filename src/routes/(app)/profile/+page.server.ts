import { fail } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { Actions, PageServerLoad } from './$types';

const THEMES = ['light', 'dark', 'system'] as const;
type Theme = (typeof THEMES)[number];

function parseTheme(value: string | undefined): Theme {
	return (THEMES as readonly string[]).includes(value ?? '') ? (value as Theme) : 'system';
}

export const load: PageServerLoad = ({ locals, cookies }) => {
	const user = locals.user!;
	return {
		user: { name: user.name, email: user.email },
		theme: parseTheme(cookies.get('theme'))
	};
};

export const actions: Actions = {
	theme: async ({ request, cookies }) => {
		const data = await request.formData();
		const value = data.get('theme');

		if (typeof value !== 'string' || !(THEMES as readonly string[]).includes(value)) {
			return fail(400, { error: 'Tema inválido.' });
		}

		cookies.set('theme', value, {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			sameSite: 'lax',
			httpOnly: true,
			secure: !dev
		});

		return { theme: value as Theme };
	}
};
