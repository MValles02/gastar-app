import { toCategoryIconKey, toSwatchKey } from '$lib/appearance';
import type { Currency } from '$lib/money';
import { isRecurringActive } from '$lib/plan';
import { listRecurring, type RecurringRule } from './queries';

/** A rule as a picker item (linking a movement to a fixed payment). */
export const ruleItem = (r: RecurringRule) => ({
	id: r.id,
	name: r.description,
	icon: toCategoryIconKey(r.categoryIcon) ?? ('categories' as const),
	color: toSwatchKey(r.categoryColor)
});

/** Active rules of one type and currency, as picker items. */
export async function activeRuleItems(userId: string, cur: Currency, type: 'income' | 'outcome') {
	const rules = await listRecurring(userId, cur);
	return rules.filter((r) => isRecurringActive(r) && r.type === type).map(ruleItem);
}
