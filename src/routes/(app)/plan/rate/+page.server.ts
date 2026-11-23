import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import { formatAmountInput, isValidRate, parseAmount, RATE_CURRENCY } from '#lib/money.ts';
import { MOVEMENT_MESSAGES } from '#lib/movement.ts';
import { latestTransferRate, updatePlan } from '#lib/server/plan/queries.ts';
import { planView } from '#lib/server/plan/month-plan.ts';
import { requirePlan, toPlan } from '#lib/server/plan/guard.ts';
import { requireUser } from '#lib/server/guards.ts';
import { str } from '#lib/server/forms.ts';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	await requirePlan(userId);
	const [{ rate }, transfer] = await Promise.all([planView(userId), latestTransferRate(userId)]);
	return {
		amount: rate.value === null ? '' : formatAmountInput(rate.value, RATE_CURRENCY),
		manual: rate.manual,
		hasTransfer: transfer !== null
	};
};

export const actions: Actions = {
	/** A manual rate overrides the latest transfer's. */
	set: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		await requirePlan(userId);
		const raw = str(await request.formData(), 'rate');
		const rate = parseAmount(raw);
		if (!isValidRate(rate))
			return formFail(400, { values: { rate: raw }, errors: { rate: MOVEMENT_MESSAGES.rate } });
		await updatePlan(userId, { exchangeRate: rate });
		toPlan();
	},
	/** Back to the latest transfer's rate. */
	auto: async ({ locals }) => {
		const userId = requireUser(locals).id;
		await requirePlan(userId);
		await updatePlan(userId, { exchangeRate: null });
		toPlan();
	}
};
