import { redirect } from '@sveltejs/kit';
import { formFail } from '$lib/form';
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from '$lib/server/validation';
import type { Actions, PageServerLoad } from './$types';
import { notFoundHelpers } from '$lib/server/not-found';
import {
	DELETE_REFERENCED_MESSAGE,
	accountActions,
	parseAccountForm,
	withBalances
} from '$lib/server/accounts';
import {
	accountOriginSums,
	accountTransfersIn,
	deleteAccount,
	getAccount,
	isAccountReferenced,
	setArchived,
	updateAccount
} from '$lib/server/accounts-queries';
import { requireUser } from '$lib/server/require-user';
import { toIconKey, toSwatchKey } from '$lib/appearance';
import { formatAmountInput } from '$lib/money';

const { notFound, requireId } = notFoundHelpers('Cuenta no encontrada.');

/** The only fields `?/update` takes; the currency never changes here. */
const EDITABLE = ['name', 'icon', 'color', 'initialBalance'] as const;

/** The account as the detail shows it (what the load returns and `update` hands back). */
async function detailOf(userId: string, id: string) {
	const [account] = await getAccount(userId, id);
	if (!account) notFound();
	const [sums, ins] = await Promise.all([
		accountOriginSums(userId, account.id),
		accountTransfersIn(userId, account.id)
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
	return { ...detail, actions: accountActions({ referenced, archived: detail.account.archived }) };
};

const archiveAction =
	(archive: boolean): Actions[string] =>
	async ({ locals, params }) => {
		requireId(params.id);
		const rows = await setArchived(requireUser(locals).id, params.id, archive ? new Date() : null);
		if (rows.length === 0) notFound();
		return { done: true };
	};

export const actions: Actions = {
	/** Saves the posted subset of fields over the stored values, with the create form's validation. */
	update: async ({ locals, params, request }) => {
		const userId = requireUser(locals).id;
		requireId(params.id);
		const { account } = await detailOf(userId, params.id);
		const posted = await request.formData();
		const fd = new FormData();
		fd.set('name', account.name);
		fd.set('currency', account.currency);
		fd.set('initialBalance', formatAmountInput(account.initialBalance, account.currency));
		fd.set('icon', toIconKey(account.icon));
		fd.set('color', toSwatchKey(account.color) ?? 'green');
		for (const k of EDITABLE) {
			const v = posted.get(k);
			if (typeof v === 'string') fd.set(k, v);
		}
		const parsed = parseAccountForm(fd, 'edit');
		if (!parsed.ok) return formFail(400, { values: parsed.values, errors: parsed.errors });
		const rows = await updateAccount(userId, params.id, parsed.data);
		if (rows.length === 0) notFound();
		return await detailOf(userId, params.id);
	},
	archive: archiveAction(true),
	unarchive: archiveAction(false),
	delete: async ({ locals, params }) => {
		const userId = requireUser(locals).id;
		requireId(params.id);
		if (await isAccountReferenced(userId, params.id))
			return formFail(409, { formError: DELETE_REFERENCED_MESSAGE });
		let rows;
		try {
			rows = await deleteAccount(userId, params.id);
		} catch (e) {
			if (pgErrorCode(e) === PG_FOREIGN_KEY_VIOLATION)
				return formFail(409, { formError: DELETE_REFERENCED_MESSAGE });
			throw e;
		}
		if (rows.length === 0) notFound();
		redirect(303, '/accounts');
	}
};
