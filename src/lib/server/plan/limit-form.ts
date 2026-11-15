import { formFail } from '#lib/form.ts';
import type { Currency } from '#lib/money.ts';
import { parseLimitAmount } from '#lib/plan-wizard.ts';
import { planFail } from './guard';
import { upsertLimits } from './queries';

/**
 * Parses the posted limit `amount` and saves the limit on `categoryId`. Returns the stored cents, or
 * the form failure: an invalid amount on `amount`, a rejected plan write on `rejectedOn`.
 */
export async function saveLimit<V extends object>(
	userId: string,
	planId: string,
	limit: { categoryId: string; amount: string; currency: Currency },
	{ values, rejectedOn }: { values: V; rejectedOn: 'categoryId' | 'amount' }
) {
	const parsed = parseLimitAmount(limit.amount, limit.currency);
	if ('message' in parsed)
		return { failure: formFail(400, { values, errors: { amount: parsed.message } }) };
	try {
		await upsertLimits(userId, planId, [
			{ categoryId: limit.categoryId, amount: parsed.cents, currency: limit.currency }
		]);
	} catch (e) {
		return { failure: planFail(e, rejectedOn, values) };
	}
	return { cents: parsed.cents };
}
