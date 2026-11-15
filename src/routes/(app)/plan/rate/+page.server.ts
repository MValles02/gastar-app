import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import { formatAmountInput, isValidRate, parseAmount } from '#lib/money.ts';
import { MOVEMENT_MESSAGES } from '#lib/movement.ts';
import { currentPlan, latestTransferRate, updatePlan } from '#lib/server/plan/queries.ts';
import { planView } from '#lib/server/plan/month-plan.ts';
import { requireUser } from '#lib/server/guards.ts';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	if (!(await currentPlan(userId))) redirect(303, '/plan');
	const [{ rate }, transfer] = await Promise.all([planView(userId), latestTransferRate(userId)]);
	return {
		rate,
		amount: rate.value === null ? '' : formatAmountInput(rate.value, 'ARS'),
		hasTransfer: transfer !== null
	};
};

export const actions: Actions = {
	/** A manual rate overrides the latest transfer's. */
	set: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		if (!(await currentPlan(userId))) redirect(303, '/plan');
		const raw = String((await request.formData()).get('rate') ?? '');
		const rate = parseAmount(raw);
		if (!isValidRate(rate))
			return formFail(400, { values: { rate: raw }, errors: { rate: MOVEMENT_MESSAGES.rate } });
		await updatePlan(userId, { exchangeRate: rate });
		redirect(303, '/plan');
	},
	/** Back to the latest transfer's rate. */
	auto: async ({ locals }) => {
		const userId = requireUser(locals).id;
		if (!(await currentPlan(userId))) redirect(303, '/plan');
		await updatePlan(userId, { exchangeRate: null });
		redirect(303, '/plan');
	}
};
