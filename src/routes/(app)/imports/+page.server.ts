import { error, fail, redirect } from '@sveltejs/kit';
import {
	getImport,
	getImportAccount,
	getSyncState,
	importPrefill,
	importTitle,
	listImportRules,
	listPendingImports,
	undoApproval
} from '$lib/server/mp-import-queries';
import { getConnectionInfo, mpOauthEnabled } from '$lib/server/mp-oauth';
import { startMpSync } from '$lib/server/mp-sync';
import { dayHeading, localDay } from '$lib/server/month';
import { isUuid } from '$lib/server/db/util';
import { pgErrorCode } from '$lib/server/db/errors';
import { movementPickers } from '../movements/form.server';
import { approveWithValues } from './approve.server';
import type { Actions, PageServerLoad } from './$types';

const LEASE_MS = 15 * 60_000;

/** "Recién", "Hace 5 min", "Hace 2 h", "Hace 3 d". */
function agoLabel(at: Date, now: Date): string {
	const min = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000));
	if (min < 1) return 'Recién';
	if (min < 60) return `Hace ${min} min`;
	if (min < 24 * 60) return `Hace ${Math.floor(min / 60)} h`;
	return `Hace ${Math.floor(min / (24 * 60))} d`;
}

const DONE = ['approved', 'rejected', 'stale'] as const;

/** 404 when the feature is off; sends the user to link (or pick an account) when there is no usable connection. */
async function requireAccount(userId: string) {
	if (!mpOauthEnabled()) error(404, 'No encontrado');
	const account = await getImportAccount(userId);
	if (!account) redirect(303, '/profile/mercado-pago');
	return account;
}

/** Active ARS accounts other than the import account: the only valid counter accounts. */
const counterAccountsOf = <A extends { currency: string; id: string }>(
	accounts: A[],
	importAccountId: string
) => accounts.filter((a) => a.currency === 'ARS' && a.id !== importAccountId);

/** A non-negative integer query param, else null. */
const countParam = (v: string | null) => (v !== null && /^\d{1,9}$/.test(v) ? Number(v) : null);

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const account = await requireAccount(userId);
	const needsReconnect = (await getConnectionInfo(userId))?.needsReconnect ?? false;
	const [sync, items, rules, pickers] = await Promise.all([
		getSyncState(userId, account.id),
		listPendingImports(userId),
		listImportRules(userId),
		movementPickers(userId)
	]);
	const counterAccounts = counterAccountsOf(pickers.accounts, account.id);

	const now = new Date();
	const today = localDay(now);
	let suggested = 0;
	const groups: {
		day: string;
		heading: string;
		items: {
			id: string;
			title: string;
			amount: number;
			isCredit: boolean;
			suggestion: string | null;
		}[];
	}[] = [];
	for (const i of items) {
		const day = localDay(i.occurredAt);
		let group = groups.at(-1);
		if (group?.day !== day) {
			group = { day, heading: dayHeading(day, today), items: [] };
			groups.push(group);
		}
		const suggestion = importPrefill(i, rules, pickers.categories, counterAccounts).suggestion;
		if (suggestion !== null) suggested++;
		group.items.push({
			id: i.id,
			title: importTitle(i),
			amount: i.amount,
			isCredit: i.isCredit,
			suggestion
		});
	}

	const running = !!sync?.runningSince && now.getTime() - sync.runningSince.getTime() < LEASE_MS;
	const done = url.searchParams.get('done');
	const approved = countParam(url.searchParams.get('approved'));
	const skipped = countParam(url.searchParams.get('skipped'));
	return {
		suggested,
		bulk: approved === null ? null : { approved, skipped: skipped ?? 0 },
		needsReconnect,
		running,
		// 'payments' (also before the first step is recorded) or 'report'; null when idle.
		phase: running ? (sync?.phase === 'report' ? 'report' : 'payments') : null,
		newItems: sync?.newItems ?? null,
		lastError: sync?.lastError ?? null,
		lastRun: sync?.lastRunAt ? agoLabel(sync.lastRunAt, now) : null,
		done: DONE.find((d) => d === done) ?? null,
		groups
	};
};

export const actions: Actions = {
	sync: async ({ locals }) => {
		await requireAccount(locals.user!.id);
		await startMpSync(locals.user!.id);
		redirect(303, '/imports');
	},

	/** Quick "Aprobar" of one suggested row; answers with the id so the page can offer Deshacer. */
	approveOne: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const account = await requireAccount(userId);
		const id = String((await request.formData()).get('id') ?? '');
		if (!isUuid(id)) return fail(400, { message: 'No se pudo aprobar.' });
		const item = await getImport(userId, id);
		if (!item || item.status !== 'pending') {
			return fail(409, { message: 'Ese movimiento ya fue revisado.' });
		}
		const [rules, pickers] = await Promise.all([listImportRules(userId), movementPickers(userId)]);
		const prefill = importPrefill(
			item,
			rules,
			pickers.categories,
			counterAccountsOf(pickers.accounts, account.id)
		);
		// Only rows that show "Aprobar" have a suggestion; the rest go through the review form.
		if (prefill.suggestion === null) return fail(400, { message: 'Revisá este movimiento.' });
		try {
			// The values come from the rule itself: nothing new to remember.
			const out = await approveWithValues(userId, item, prefill, false);
			if (out.result === 'approved') return { approvedId: id };
			return fail(409, { message: 'Ese movimiento ya fue revisado.' });
		} catch (e) {
			console.error('[imports] quick approve failed', pgErrorCode(e) ?? 'unknown');
			return fail(400, { message: 'No se pudo aprobar.' });
		}
	},

	/** Deshacer of a quick approval: removes its movement and puts the item back to pending. */
	undoApprove: async ({ locals, request }) => {
		const userId = locals.user!.id;
		await requireAccount(userId);
		const id = String((await request.formData()).get('id') ?? '');
		if (!isUuid(id)) return fail(400, { message: 'No se pudo deshacer.' });
		const result = await undoApproval(userId, id);
		if (result === 'changed') {
			return fail(409, { message: 'No se pudo deshacer: el movimiento ya cambió.' });
		}
		if (result === 'stale') return fail(409, { message: 'No se pudo deshacer.' });
		return { undoneId: id };
	},

	approveSuggested: async ({ locals }) => {
		const userId = locals.user!.id;
		const account = await requireAccount(userId);
		const [items, rules, pickers] = await Promise.all([
			listPendingImports(userId),
			listImportRules(userId),
			movementPickers(userId)
		]);
		const counterAccounts = counterAccountsOf(pickers.accounts, account.id);

		let approved = 0;
		let skipped = 0;
		for (const item of items) {
			const prefill = importPrefill(item, rules, pickers.categories, counterAccounts);
			if (prefill.suggestion === null) continue;
			try {
				// The values come from the rule itself: nothing new to remember.
				const out = await approveWithValues(userId, item, prefill, false);
				if (out.result === 'approved') approved++;
				else skipped++;
			} catch (e) {
				console.error('[imports] bulk approve failed', pgErrorCode(e) ?? 'unknown');
				skipped++;
			}
		}
		redirect(303, `/imports?approved=${approved}&skipped=${skipped}`);
	}
};
