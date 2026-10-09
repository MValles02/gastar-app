import { fail, redirect } from '@sveltejs/kit';
import { pgErrorCode } from '$lib/server/db/errors';
import type { Actions, PageServerLoad } from './$types';
import { notFoundHelpers } from '$lib/server/not-found';
import { DELETE_REFERENCED_MESSAGE, accountActions, withBalances } from '$lib/server/accounts';
import {
	accountOriginSums,
	accountReferenced,
	accountTransfersIn,
	deleteAccount,
	getAccount,
	setArchived
} from '$lib/server/accounts-queries';

const { notFound, requireId } = notFoundHelpers('Cuenta no encontrada.');

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	requireId(params.id);
	const [account] = await getAccount(userId, params.id);
	if (!account) notFound();

	const [sums, ins, referenced] = await Promise.all([
		accountOriginSums(userId, account.id),
		accountTransfersIn(userId, account.id),
		accountReferenced(userId, account.id)
	]);
	const [{ balance }] = withBalances(
		[account],
		sums,
		ins.flatMap((t) => (t.accountId ? [{ ...t, accountId: t.accountId }] : []))
	);
	const { archivedAt, ...rest } = account;
	const archived = archivedAt !== null;

	return {
		account: { ...rest, archived },
		balance,
		actions: accountActions({ referenced: referenced.length > 0, archived })
	};
};

const archiveAction =
	(archive: boolean): Actions[string] =>
	async ({ locals, params }) => {
		requireId(params.id);
		const rows = await setArchived(locals.user!.id, params.id, archive ? new Date() : null);
		if (rows.length === 0) notFound();
		return { done: true };
	};

export const actions: Actions = {
	archive: archiveAction(true),
	unarchive: archiveAction(false),
	delete: async ({ locals, params }) => {
		const userId = locals.user!.id;
		requireId(params.id);
		if ((await accountReferenced(userId, params.id)).length > 0)
			return fail(409, { error: DELETE_REFERENCED_MESSAGE });
		let rows;
		try {
			rows = await deleteAccount(userId, params.id);
		} catch (e) {
			const code = pgErrorCode(e);
			if (code === '23503') return fail(409, { error: DELETE_REFERENCED_MESSAGE });
			throw e;
		}
		if (rows.length === 0) notFound();
		redirect(303, '/accounts');
	}
};
