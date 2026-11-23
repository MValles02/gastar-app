import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { notFoundHelpers } from '../guards';
import { setupStepHref, wizardStep, type WizardStepName } from '#lib/plan-wizard.ts';
import { currentMonth } from '../month';
import { getPlan, planLimits, PlanRejected } from './queries';
import { isCurrentPlan } from './summary';

/** The user's plan when it is the current one (a plan for another month counts as none). */
export async function currentPlan(userId: string) {
	const [plan] = await getPlan(userId);
	return plan && isCurrentPlan(plan, currentMonth(new Date())) ? plan : null;
}

export function toPlan(): never {
	redirect(303, '/plan');
}

export async function requirePlan(userId: string) {
	return (await currentPlan(userId)) ?? toPlan();
}

type Plan = NonNullable<Awaited<ReturnType<typeof currentPlan>>>;

const PLAN_STEPS = ['limits', 'summary'] as const satisfies readonly WizardStepName[];
type PlanStep = (typeof PLAN_STEPS)[number];

/**
 * The user's current plan at wizard step `step` (null before one exists). A step in `PLAN_STEPS`
 * without a plan goes back to the savings step.
 */
export async function requireWizardStep(userId: string, step: PlanStep): Promise<Plan>;
export async function requireWizardStep(userId: string, step: WizardStepName): Promise<Plan | null>;
export async function requireWizardStep(userId: string, step: WizardStepName) {
	const plan = await currentPlan(userId);
	if (!plan && (PLAN_STEPS as readonly WizardStepName[]).includes(step))
		redirect(303, setupStepHref(wizardStep('savings')));
	return plan;
}

const { notFound, requireId } = notFoundHelpers('Límite no encontrado.');

export async function requireLimit(userId: string, planId: string, categoryId: string) {
	requireId(categoryId);
	const limit = (await planLimits(userId, planId)).find((l) => l.categoryId === categoryId);
	return limit ?? notFound();
}

export function planFail<V extends object, K extends string>(e: unknown, field: K, values: V) {
	if (!(e instanceof PlanRejected)) throw e;
	return formFail(400, { values, errors: { [field]: e.message } as Record<K, string> });
}
