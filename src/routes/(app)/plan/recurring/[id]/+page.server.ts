import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseStep, planReturn } from '#lib/plan-wizard.ts';
import {
	deleteRecurring,
	setRecurringArchived,
	updateRecurring
} from '#lib/server/recurring/queries.ts';
import { detailOf, findRule } from '#lib/server/recurring/detail.ts';
import { requireUser } from '#lib/server/guards.ts';
import { editedForm, readRecurringForm } from '#lib/server/recurring/form.ts';
import { undoArchivedOk } from '#lib/server/forms.ts';

export const load: PageServerLoad = async ({ locals, params, url }) => ({
	...(await detailOf(requireUser(locals).id, params.id)),
	wizard: parseStep(url.searchParams.get('wizard'))
});

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const userId = requireUser(locals).id;
		const rule = await findRule(userId, params.id);
		const posted = await request.formData();
		// An undo may restore the archived account/category the rule had.
		const archivedOk = undoArchivedOk(posted, ['accountId', 'categoryId']);
		const r = await readRecurringForm(userId, editedForm(rule, posted), { ...rule, archivedOk });
		if (r.failure) return r.failure;
		await updateRecurring(userId, params.id, r.data);
		return { rule: await detailOf(userId, params.id) };
	},
	archive: async ({ locals, params }) => {
		const userId = requireUser(locals).id;
		const rule = await findRule(userId, params.id);
		await setRecurringArchived(userId, rule.id, rule.archivedAt === null);
		return { archived: rule.archivedAt === null };
	},
	delete: async ({ locals, params, url }) => {
		const userId = requireUser(locals).id;
		await findRule(userId, params.id);
		await deleteRecurring(userId, params.id);
		redirect(303, planReturn(url.searchParams.get('wizard')));
	}
};
