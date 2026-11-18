import { toCategoryIconKey, toSwatchKey } from '#lib/appearance.ts';
import type { Currency } from '#lib/money.ts';
import { isRecurringActive } from '#lib/plan.ts';
import { listRecurring, type RecurringRule } from './queries';

export const ruleItem = (r: RecurringRule) => ({
	id: r.id,
	name: r.description,
	icon: toCategoryIconKey(r.categoryIcon) ?? ('categories' as const),
	color: toSwatchKey(r.categoryColor)
});

export async function activeRuleItems(userId: string, cur: Currency, type: 'income' | 'outcome') {
	const rules = await listRecurring(userId, cur);
	return rules.filter((r) => isRecurringActive(r) && r.type === type).map(ruleItem);
}
