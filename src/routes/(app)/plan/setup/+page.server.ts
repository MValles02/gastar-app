import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import { parseStep, setupStepHref, WIZARD_STEPS, wizardStep } from '#lib/plan-wizard.ts';
import { PLAN_SAVED_HREF } from '#lib/toast-flags.ts';
import { listAccounts } from '#lib/server/accounts/queries.ts';
import { currentMonth } from '#lib/server/month.ts';
import { updatePlan, upsertLimits } from '#lib/server/plan/queries.ts';
import { requireWizardStep, toPlan } from '#lib/server/plan/guard.ts';
import { requireUser } from '#lib/server/guards.ts';
import { saveSavings } from '#lib/server/plan/savings-form.ts';
import { suggestedLimits, wizardStepView } from '#lib/server/plan/wizard.ts';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const param = parseStep(url.searchParams.get('step'));
	const step = param ?? wizardStep('income');

	if ((await listAccounts(userId)).length === 0) toPlan();
	const plan = await requireWizardStep(userId, WIZARD_STEPS[step - 1].name);
	if (!param && plan) toPlan();

	return wizardStepView(userId, step, plan);
};

export const actions: Actions = {
	savings: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		const r = await saveSavings(userId, await request.formData(), 'upsert');
		if (!r.ok) return formFail(400, { formError: r.message });
		redirect(303, setupStepHref(wizardStep('limits')));
	},
	suggested: async ({ locals }) => {
		const userId = requireUser(locals).id;
		const plan = await requireWizardStep(userId, 'limits');
		const limits = await suggestedLimits(userId, plan.id);
		if (limits.length > 0) await upsertLimits(userId, plan.id, limits);
		redirect(303, setupStepHref(wizardStep('limits')));
	},
	finish: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		await requireWizardStep(userId, 'summary');
		const repeat = (await request.formData()).get('repeat') === 'on';
		await updatePlan(userId, { month: repeat ? null : currentMonth(new Date()) });
		redirect(303, PLAN_SAVED_HREF);
	}
};
