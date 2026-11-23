import { formFail } from '#lib/form.ts';
import { isCurrency, type Currency } from '#lib/money.ts';
import { PLAN_CURRENCY } from '#lib/plan.ts';
import { parseLimitAmount } from '#lib/plan-wizard.ts';
import { readFields } from '../forms';
import { planFail } from './guard';
import { limitCandidates } from './month-plan';
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

/**
 * Validates the new-limit form (currency, then a category still without a limit) and saves it.
 * Returns the stored cents, or the form failure.
 */
export async function createLimit(userId: string, planId: string, fd: FormData) {
	const { categoryId, amount } = readFields(fd, ['categoryId', 'amount']);
	const posted = fd.get('currency');
	const currency = isCurrency(posted) ? posted : undefined;
	const values = { categoryId, amount, currency: currency ?? PLAN_CURRENCY };
	const reject = (errors: { categoryId?: string; amount?: string; currency?: string }) => ({
		failure: formFail(400, { values, errors })
	});

	if (!currency) return reject({ currency: 'Elegí una moneda.' });
	if (!(await limitCandidates(userId, planId)).some((c) => c.id === categoryId))
		return reject({ categoryId: 'Elegí una categoría.' });
	return saveLimit(
		userId,
		planId,
		{ categoryId, amount, currency },
		{ values, rejectedOn: 'categoryId' }
	);
}
