import { PLAN_CURRENCY } from '#lib/plan.ts';
import type { WizardStep } from '#lib/plan-wizard.ts';
import { limitOptions, planView, recurringLists, recurringSuggestions } from './month-plan';
import { savingsView } from './savings-form';

/** Suggested limits the wizard can apply: limit candidates with a suggestion above zero. */
export async function suggestedLimits(userId: string, planId: string | null) {
	return (await limitOptions(userId, planId))
		.map((o) => {
			// The pesos average wins; with no pesos spending the limit is in dollars.
			const currency = o.suggested[PLAN_CURRENCY] > 0 ? PLAN_CURRENCY : ('USD' as const);
			return { categoryId: o.id, amount: o.suggested[currency], currency };
		})
		.filter((l) => l.amount > 0);
}

/** One shape per step, told apart by `step`. */
export async function wizardStepView(
	userId: string,
	step: WizardStep,
	plan: { id: string; month: string | null; savings: number; savingsPercent: number | null } | null
) {
	if (step === 1 || step === 2) {
		const [lists, suggestions] = await Promise.all([
			recurringLists(userId),
			step === 2 ? recurringSuggestions(userId) : []
		]);
		const type = step === 1 ? 'income' : 'outcome';
		const active = step === 1 ? lists.incomes : lists.outcomes;
		return {
			step,
			active,
			inactive: lists.inactive.filter((r) => r.type === type),
			suggestions,
			// In plan pesos: ARS as is, USD at the plan rate (left out without one).
			total: active.reduce(
				(a, r) => a + (r.currency === PLAN_CURRENCY ? r.amount : (r.converted ?? 0)),
				0
			)
		};
	}
	if (step === 3) {
		const { income, savingsBase, savings, savingsPercent } = await savingsView(userId, plan);
		return { step, income, savingsBase, savings: { savings, savingsPercent } };
	}

	const view = await planView(userId);
	const summary = view.summary!;
	if (step === 4)
		return {
			step,
			limits: summary.limits,
			canSuggest: (await suggestedLimits(userId, plan!.id)).length > 0
		};
	return { step, summary, monthName: view.monthName, repeats: plan!.month === null };
}
