import { formFail } from '#lib/form.ts';
import type { Actions, PageServerLoad } from './$types';
import {
	DELETE_REFERENCED_MESSAGE,
	editedForm,
	NOT_FOUND_MESSAGE,
	parseAccountForm
} from '#lib/server/accounts/form.ts';
import {
	accountOriginSums,
	accountTransfersIn,
	deleteAccount,
	getAccount,
	isAccountReferenced,
	setArchived,
	updateAccount
} from '#lib/server/accounts/queries.ts';
import { withBalances } from '#lib/server/accounts/balance.ts';
import { archiveActions, deleteUnlessReferenced, lifecycleState } from '#lib/server/lifecycle.ts';
import { notFoundHelpers, requireUser } from '#lib/server/guards.ts';

const guards = notFoundHelpers(NOT_FOUND_MESSAGE);
const { notFound, requireId } = guards;

/** The account as the detail shows it (what the load returns and `update` hands back). */
async function detailOf(userId: string, id: string) {
	const [account] = await getAccount(userId, id);
	if (!account) notFound();
	const [sums, ins] = await Promise.all([
		accountOriginSums(userId, { id: account.id }),
		accountTransfersIn(userId, { id: account.id })
	]);
	const [{ balance }] = withBalances([account], sums, ins);
	const { archivedAt, ...rest } = account;
	return { account: { ...rest, archived: archivedAt !== null }, balance };
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = requireUser(locals).id;
	requireId(params.id);
	const detail = await detailOf(userId, params.id);
	const referenced = await isAccountReferenced(userId, params.id);
	return {
		...detail,
		actions: lifecycleState({ referenced, archived: detail.account.archived })
	};
};

export const actions: Actions = {
	/** Saves the posted subset of fields over the stored values, with the create form's validation. */
	update: async ({ locals, params, request }) => {
		const userId = requireUser(locals).id;
		requireId(params.id);
		const { account } = await detailOf(userId, params.id);
		const posted = await request.formData();
		const parsed = parseAccountForm(editedForm(account, posted), 'edit');
		if (!parsed.ok) return formFail(400, { values: parsed.values, errors: parsed.errors });
		const rows = await updateAccount(userId, params.id, parsed.data);
		if (rows.length === 0) notFound();
		return await detailOf(userId, params.id);
	},
	...archiveActions(setArchived, guards),
	delete: deleteUnlessReferenced(
		{
			isReferenced: isAccountReferenced,
			remove: deleteAccount,
			message: DELETE_REFERENCED_MESSAGE,
			redirectTo: '/accounts'
		},
		guards
	)
};
