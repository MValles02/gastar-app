import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { Actions, PageServerLoad } from './$types';
import { toIconKey, toSwatchKey } from '$lib/appearance';
import { getAccount, listAccounts } from '$lib/server/accounts-queries';
import { getCategory, listCategories } from '$lib/server/categories-queries';
import { toLocalInput } from '$lib/server/month';
import { parseMovementForm, resolveMovement } from '$lib/server/movements';
import { createMovement } from '$lib/server/movements-queries';

const UNAVAILABLE = 'La cuenta o la categoría ya no está disponible.';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const userId = locals.user!.id;
	const [accountRows, categoryRows] = await Promise.all([
		listAccounts(userId),
		listCategories(userId)
	]);
	const accounts = accountRows.map((a) => ({
		id: a.id,
		name: a.name,
		icon: toIconKey(a.icon),
		color: toSwatchKey(a.color),
		meta: a.currency,
		currency: a.currency
	}));
	const categories = categoryRows.map((c) => ({
		id: c.id,
		name: c.name,
		icon: 'categories' as const,
		color: toSwatchKey(c.color)
	}));
	const last = cookies.get('last_account');
	const defaultAccountId = accounts.some((a) => a.id === last)
		? last!
		: accounts.length === 1
			? accounts[0].id
			: '';
	return {
		accounts,
		categories,
		now: toLocalInput(new Date()),
		saved: url.searchParams.get('saved') === '1',
		formKey: crypto.randomUUID(),
		defaultAccountId
	};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		const userId = locals.user!.id;
		const fd = await request.formData();
		const parsed = parseMovementForm(fd);
		const { values } = parsed;
		if (!parsed.ok) return fail(400, { values, errors: parsed.errors });
		const { data } = parsed;

		const [origin, destination, category] = await Promise.all([
			getAccount(userId, data.accountId),
			data.type === 'transfer' && data.destinationAccountId
				? getAccount(userId, data.destinationAccountId)
				: Promise.resolve([]),
			data.type !== 'transfer' && data.categoryId
				? getCategory(userId, data.categoryId)
				: Promise.resolve([])
		]);
		const resolved = resolveMovement(data, {
			origin: origin[0],
			destination: destination[0],
			category: category[0]
		});
		if (!resolved.ok) return fail(400, { values, errors: resolved.errors });

		try {
			await createMovement(userId, resolved.row);
		} catch (e) {
			const code = (e as { code?: string })?.code;
			const causeCode = (e as { cause?: { code?: string } })?.cause?.code;
			if (code === '23503' || causeCode === '23503')
				return fail(400, { values, errors: { accountId: UNAVAILABLE } });
			throw e;
		}
		cookies.set('last_account', data.accountId, {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			sameSite: 'lax',
			httpOnly: true,
			secure: !dev
		});
		redirect(303, '/movements/new?saved=1');
	}
};
