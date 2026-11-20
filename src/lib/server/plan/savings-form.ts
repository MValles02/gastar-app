import type { Currency } from '#lib/money.ts';
import {
	PLAN_CURRENCY,
	readSavings,
	SAVINGS_FIELDS,
	toSavingsOption,
	toSavingsUnit
} from '#lib/plan.ts';
import { str } from '../forms';
import { savingsBaseline } from './month-plan';
import { currentPlan, planIncome, updatePlan, upsertPlan } from './queries';

function parseSavingsForm(fd: FormData, income: number, currency: Currency) {
	return readSavings(
		{
			option: toSavingsOption(str(fd, SAVINGS_FIELDS.option)),
			unit: toSavingsUnit(str(fd, SAVINGS_FIELDS.unit)),
			value: str(fd, SAVINGS_FIELDS.value)
		},
		income,
		currency
	);
}

/** What the savings editors show: income, the month's baseline and the plan's current savings. */
export async function savingsView(
	userId: string,
	plan: { savings: number; savingsPercent: number | null } | null
) {
	const [income, savingsBase] = await Promise.all([planIncome(userId), savingsBaseline(userId)]);
	return {
		income,
		savingsBase,
		savings: plan?.savings ?? 0,
		savingsPercent: plan?.savingsPercent ?? null
	};
}

/** Parses and saves the savings form; `upsert` creates the plan when there is none (wizard), `update` edits the existing one. Returns the parse result. */
export async function saveSavings(userId: string, fd: FormData, mode: 'upsert' | 'update') {
	const r = parseSavingsForm(fd, await planIncome(userId), PLAN_CURRENCY);
	if (!r.ok) return r;
	if (mode === 'update') {
		await updatePlan(userId, { savings: r.savings, savingsPercent: r.savingsPercent });
	} else {
		const plan = await currentPlan(userId);
		await upsertPlan(userId, {
			savings: r.savings,
			savingsPercent: r.savingsPercent,
			month: plan ? plan.month : null
		});
	}
	return r;
}
