import { toIconKey } from '#lib/appearance.ts';
import { es } from '#lib/copy/es.ts';
import { cannotRegister, inactiveReason, isRecurringActive } from '#lib/plan.ts';
import { notFoundHelpers } from '../guards';
import { monthLabel } from '../month';
import { movementPickers } from '../movements/pickers';
import { ruleDueThisMonth } from '../plan/month-plan';
import { toFormValues } from './form';
import { getRecurring } from './queries';

const { notFound, requireId } = notFoundHelpers(es.plan.errors.recurringNotFound);

export async function findRule(userId: string, id: string) {
	requireId(id);
	const [rule] = await getRecurring(userId, id);
	if (!rule) notFound();
	return rule;
}

/** The rule as the detail shows it (the load without `wizard`; what `update` returns). */
export async function detailOf(userId: string, id: string) {
	const rule = await findRule(userId, id);
	const pickers = await movementPickers(userId);
	// The rule's own account and category may be archived since, so they are not in the pickers.
	const account = pickers.accounts.find((a) => a.id === rule.accountId) ?? {
		id: rule.accountId,
		name: rule.accountName,
		icon: toIconKey(null),
		color: null,
		meta: rule.currency,
		currency: rule.currency
	};
	const category = pickers.categories.find((c) => c.id === rule.categoryId) ?? {
		id: rule.categoryId,
		name: rule.categoryName,
		icon: 'categories' as const,
		color: null,
		kind: null
	};
	const thisMonth = isRecurringActive(rule) ? await ruleDueThisMonth(userId, rule) : null;
	return {
		id: rule.id,
		type: rule.type,
		description: rule.description,
		amount: rule.amount,
		previousAmount: rule.previousAmount,
		currency: rule.currency,
		dayOfMonth: rule.dayOfMonth,
		endsMonthLabel: rule.endsMonth ? monthLabel(rule.endsMonth) : null,
		account,
		category,
		thisMonth,
		// Pickers for the rows; the rule's own archived account/category stays listed, flagged.
		accounts: pickers.accounts.some((a) => a.id === account.id)
			? pickers.accounts
			: [...pickers.accounts, { ...account, archived: true }],
		categories: pickers.categories.some((c) => c.id === category.id)
			? pickers.categories
			: [...pickers.categories, { ...category, archived: true }],
		inactiveReason: inactiveReason(rule),
		cannotRegister: cannotRegister(rule),
		archived: rule.archivedAt !== null,
		values: toFormValues(rule)
	};
}
