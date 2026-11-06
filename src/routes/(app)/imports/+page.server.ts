import { error, fail, redirect } from '@sveltejs/kit';
import {
	getImport,
	getImportAccount,
	getSyncState,
	importPrefill,
	importTitle,
	listPendingImports,
	undoApproval
} from '$lib/server/mp-import-queries';
import { getConnectionInfo, mpOauthEnabled } from '$lib/server/mp-oauth';
import { startMpSync } from '$lib/server/mp-sync';
import { dayHeading, localDay } from '$lib/server/month';
import { isUuid } from '$lib/server/db/util';
import { pgErrorCode } from '$lib/server/db/errors';
import { requireUser } from '$lib/server/require-user';
import { approveSuggestedImports, approveSuggestion, suggestionContext } from './approve.server';
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

const ALREADY_REVIEWED = 'Ese movimiento ya fue revisado.';
const APPROVE_FAILED = 'No se pudo aprobar.';

/** A non-negative integer query param, else null. */
const countParam = (v: string | null) => (v !== null && /^\d{1,9}$/.test(v) ? Number(v) : null);

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const account = await requireAccount(userId);
	const needsReconnect = (await getConnectionInfo(userId))?.needsReconnect ?? false;
	const [sync, items, ctx] = await Promise.all([
		getSyncState(userId, account.id),
		listPendingImports(userId),
		suggestionContext(userId, account.id)
	]);

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
		const suggestion = importPrefill(i, ctx.rules, ctx.categories, ctx.counterAccounts).suggestion;
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
		await requireAccount(requireUser(locals).id);
		await startMpSync(requireUser(locals).id);
		redirect(303, '/imports');
	},

	/** Quick "Aprobar" of one suggested row; answers with the id so the page can offer Deshacer. */
	approveOne: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		const account = await requireAccount(userId);
		const id = String((await request.formData()).get('id') ?? '');
		if (!isUuid(id)) return fail(400, { message: APPROVE_FAILED });
		const item = await getImport(userId, id);
		if (!item || item.status !== 'pending') return fail(409, { message: ALREADY_REVIEWED });
		const ctx = await suggestionContext(userId, account.id);
		try {
			const out = await approveSuggestion(userId, item, ctx);
			if (out === 'none') return fail(400, { message: 'Revisá este movimiento.' });
			if (out === 'approved') return { approvedId: id };
			return fail(409, { message: ALREADY_REVIEWED });
		} catch (e) {
			console.error('[imports] quick approve failed', pgErrorCode(e) ?? 'unknown');
			return fail(400, { message: APPROVE_FAILED });
		}
	},

	/** Deshacer of a quick approval: removes its movement and puts the item back to pending. */
	undoApprove: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
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
		const userId = requireUser(locals).id;
		const account = await requireAccount(userId);
		const { approved, skipped } = await approveSuggestedImports(userId, account.id);
		redirect(303, `/imports?approved=${approved}&skipped=${skipped}`);
	}
};
