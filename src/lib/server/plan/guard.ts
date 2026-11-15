import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { notFoundHelpers } from '../guards';
import { currentPlan, planLimits, PlanRejected } from './queries';

export function toPlan(): never {
	redirect(303, '/plan');
}

/** The user's current plan; a `/plan/*` route without one goes back to /plan. */
export async function requirePlan(userId: string) {
	return (await currentPlan(userId)) ?? toPlan();
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
