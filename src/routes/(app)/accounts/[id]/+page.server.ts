import { error, fail, redirect } from '@sveltejs/kit';
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from '$lib/server/db/errors';
import type { Actions, PageServerLoad } from './$types';
import { DELETE_REFERENCED_MESSAGE, accountActions, withBalances } from '$lib/server/accounts';
import { isUuid } from '$lib/server/db/util';
import {
	accountOriginSums,
	accountTransfersIn,
	deleteAccount,
	getAccount,
	isAccountReferenced,
	setArchived
} from '$lib/server/accounts-queries';

const notFound = () => error(404, 'Cuenta no encontrada.');

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user!.id;
	if (!isUuid(params.id)) notFound();
	const [account] = await getAccount(userId, params.id);
	if (!account) notFound();

	const [sums, ins, referenced] = await Promise.all([
		accountOriginSums(userId, account.id),
		accountTransfersIn(userId, account.id),
		isAccountReferenced(userId, account.id)
	]);
	const [{ balance }] = withBalances([account], sums, ins);
	const { archivedAt, ...rest } = account;
	const archived = archivedAt !== null;

	return {
		account: { ...rest, archived },
		balance,
		actions: accountActions({ referenced, archived })
	};
};

const archiveAction =
	(archive: boolean): Actions[string] =>
	async ({ locals, params }) => {
		if (!isUuid(params.id)) notFound();
		const rows = await setArchived(locals.user!.id, params.id, archive ? new Date() : null);
		if (rows.length === 0) notFound();
		return { done: true };
	};

export const actions: Actions = {
	archive: archiveAction(true),
	unarchive: archiveAction(false),
	delete: async ({ locals, params }) => {
		const userId = locals.user!.id;
		if (!isUuid(params.id)) notFound();
		if (await isAccountReferenced(userId, params.id))
			return fail(409, { error: DELETE_REFERENCED_MESSAGE });
		let rows;
		try {
			rows = await deleteAccount(userId, params.id);
		} catch (e) {
			if (pgErrorCode(e) === PG_FOREIGN_KEY_VIOLATION)
				return fail(409, { error: DELETE_REFERENCED_MESSAGE });
			throw e;
		}
		if (rows.length === 0) notFound();
		redirect(303, '/accounts');
	}
};
