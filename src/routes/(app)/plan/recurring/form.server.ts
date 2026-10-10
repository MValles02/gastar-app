import { fail } from '@sveltejs/kit';
import { toIconKey, toSwatchKey } from '$lib/appearance';
import { getAccount, listAccounts } from '$lib/server/accounts-queries';
import { getCategory, listCategories } from '$lib/server/categories-queries';
import { ARS_WHOLE_MESSAGE, isWholeFor } from '$lib/money';
import { parseRecurringForm } from '$lib/server/plan';

/** Active accounts and categories for the pickers. */
export async function recurringPickers(userId: string) {
	const [accountRows, categoryRows] = await Promise.all([
		listAccounts(userId),
		listCategories(userId)
	]);
	return {
		accounts: accountRows.map((a) => ({
			id: a.id,
			name: a.name,
			icon: toIconKey(a.icon),
			color: toSwatchKey(a.color),
			meta: a.currency
		})),
		categories: categoryRows.map((c) => ({
			id: c.id,
			name: c.name,
			icon: 'categories' as const,
			color: toSwatchKey(c.color),
			kind: c.kind
		}))
	};
}

/** Parses the form and checks that the account and category are the user's and active. */
export async function readRecurringForm(
	userId: string,
	request: Request,
	current?: { accountId: string; categoryId: string }
) {
	const parsed = parseRecurringForm(await request.formData());
	if (!parsed.ok) return { failure: fail(400, { values: parsed.values, errors: parsed.errors }) };
	const [[account], [category]] = await Promise.all([
		getAccount(userId, parsed.data.accountId),
		getCategory(userId, parsed.data.categoryId)
	]);
	const errors: Record<string, string> = {};
	// An edit may keep the rule's own account/category even if archived since.
	if (!account || (account.archivedAt && account.id !== current?.accountId))
		errors.accountId = 'Elegí una cuenta activa.';
	else if (!isWholeFor(parsed.data.amount, account.currency)) errors.amount = ARS_WHOLE_MESSAGE;
	if (!category || (category.archivedAt && category.id !== current?.categoryId))
		errors.categoryId = 'Elegí una categoría activa.';
	else if (
		category.kind &&
		category.kind !== parsed.data.type &&
		category.id !== current?.categoryId
	)
		errors.categoryId =
			parsed.data.type === 'income'
				? 'Elegí una categoría de ingresos.'
				: 'Elegí una categoría de gastos.';
	if (Object.keys(errors).length > 0)
		return { failure: fail(400, { values: parsed.values, errors }) };
	return { data: parsed.data };
}
