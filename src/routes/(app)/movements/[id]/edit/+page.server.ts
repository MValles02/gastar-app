import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { toIconKey, toSwatchKey } from '$lib/appearance';
import { formatAmountInput } from '$lib/money';
import { isUuid } from '$lib/server/accounts';
import { getAccount, listAccounts } from '$lib/server/accounts-queries';
import { getCategory, listCategories } from '$lib/server/categories-queries';
import { toLocalInput } from '$lib/server/month';
import { parseMovementForm, resolveMovement, UNAVAILABLE_MESSAGE } from '$lib/server/movements';
import { getMovement, updateMovement } from '$lib/server/movements-queries';

const notFound = () => error(404, 'Movimiento no encontrado.');

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	if (!isUuid(params.id)) notFound();
	const [m] = await getMovement(userId, params.id);
	if (!m) notFound();

	const [accountRows, categoryRows] = await Promise.all([
		listAccounts(userId, { archived: true }),
		listCategories(userId, { archived: true })
	]);
	const accounts = accountRows
		.filter((a) => !a.archivedAt || a.id === m.accountId || a.id === m.destinationAccountId)
		.map((a) => ({
			id: a.id,
			name: a.name,
			icon: toIconKey(a.icon),
			color: toSwatchKey(a.color),
			meta: a.currency,
			currency: a.currency,
			archived: a.archivedAt !== null
		}));
	const categories = categoryRows
		.filter((c) => !c.archivedAt || c.id === m.categoryId)
		.map((c) => ({
			id: c.id,
			name: c.name,
			icon: 'categories' as const,
			color: toSwatchKey(c.color),
			archived: c.archivedAt !== null
		}));
	return {
		id: m.id,
		accounts,
		categories,
		now: toLocalInput(new Date()),
		values: {
			type: m.type,
			occurredAt: toLocalInput(m.occurredAt),
			description: m.description,
			amount: formatAmountInput(m.amount),
			accountId: m.accountId,
			destinationAccountId: m.destinationAccountId ?? '',
			exchangeRate: m.exchangeRate !== null ? formatAmountInput(m.exchangeRate) : '',
			categoryId: m.categoryId ?? ''
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const userId = locals.user!.id;
		if (!isUuid(params.id)) notFound();
		const [m] = await getMovement(userId, params.id);
		if (!m) notFound();

		const parsed = parseMovementForm(await request.formData());
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
		const resolved = resolveMovement(
			data,
			{ origin: origin[0], destination: destination[0], category: category[0] },
			{
				accountIds: m.destinationAccountId ? [m.accountId, m.destinationAccountId] : [m.accountId],
				categoryId: m.categoryId
			}
		);
		if (!resolved.ok) return fail(400, { values, errors: resolved.errors });

		let rows;
		try {
			rows = await updateMovement(userId, params.id, resolved.row);
		} catch (e) {
			const code = (e as { code?: string })?.code;
			const causeCode = (e as { cause?: { code?: string } })?.cause?.code;
			if (code === '23503' || causeCode === '23503')
				return fail(400, { values, errors: { accountId: UNAVAILABLE_MESSAGE } });
			throw e;
		}
		if (rows.length === 0) notFound();
		redirect(303, `/movements/${params.id}`);
	}
};
