import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { notFoundHelpers } from '../guards';
import { setupStepHref, wizardStep, type WizardStepName } from '#lib/plan-wizard.ts';
import { currentPlan, planLimits, PlanRejected } from './queries';

export function toPlan(): never {
	redirect(303, '/plan');
}

/** The user's current plan; a `/plan/*` route without one goes back to /plan. */
export async function requirePlan(userId: string) {
	return (await currentPlan(userId)) ?? toPlan();
}

type Plan = NonNullable<Awaited<ReturnType<typeof currentPlan>>>;

/** The wizard steps that work on the plan the savings step creates. */
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

/** The limit on the plan's category `categoryId`, or a 404 (malformed, foreign and missing alike). */
export async function requireLimit(userId: string, planId: string, categoryId: string) {
	requireId(categoryId);
	const limit = (await planLimits(userId, planId)).find((l) => l.categoryId === categoryId);
	return limit ?? notFound();
}

/** A rejected plan write as a form failure on `field`; any other error is rethrown. */
export function planFail<V extends object, K extends string>(e: unknown, field: K, values: V) {
	if (!(e instanceof PlanRejected)) throw e;
	return formFail(400, { values, errors: { [field]: e.message } as Record<K, string> });
}
