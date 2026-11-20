import { fail, redirect } from '@sveltejs/kit';
import { ALREADY_REVIEWED } from '#lib/imports.ts';
import type { Currency } from '#lib/money.ts';
import { undoApprovalAction } from '#lib/server/imports/actions.ts';
import {
	approveAllSuggested,
	approveSuggestion,
	counterAccountsOf,
	suggestionContext
} from '#lib/server/imports/approve.ts';
import { sourceStatus, syncNow } from '#lib/server/imports/automatic.ts';
import { getGaliciaConnection } from '#lib/server/imports/galicia/connection.ts';
import {
	discardUnmatched,
	keepUnmatched,
	listUnmatchedAlerts
} from '#lib/server/imports/galicia/unmatched.ts';
import { listUnknownCards } from '#lib/server/imports/cards.ts';
import { importPrefill, importTitle, installmentAmounts } from '#lib/server/imports/rules.ts';
import { importSource } from '#lib/server/imports/sources.ts';
import { getImport, listAutoApproved, listPendingImports } from '#lib/server/imports/store.ts';
import { dayHeading, localDay } from '#lib/server/month.ts';
import { isUuid } from '#lib/server/db/util.ts';
import { pgErrorCode } from '#lib/server/db/errors.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';
import { importBulkHref, readImportFlags } from '#lib/toast-flags.ts';

/** "Recién", "Hace 5 min", "Hace 2 h", "Hace 3 d". */
function agoLabel(at: Date, now: Date): string {
	const min = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000));
	if (min < 1) return 'Recién';
	if (min < 60) return `Hace ${min} min`;
	if (min < 24 * 60) return `Hace ${Math.floor(min / 60)} h`;
	return `Hace ${Math.floor(min / (24 * 60))} d`;
}

const APPROVE_FAILED = 'No se pudo aprobar.';
const DISCARD_FAILED = 'No se pudo descartar.';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const [{ mp, gmail }, galicia, items, ctx, autoRows, unmatched] = await Promise.all([
		sourceStatus(userId),
		getGaliciaConnection(userId),
		listPendingImports(userId),
		suggestionContext(userId),
		listAutoApproved(userId),
		listUnmatchedAlerts(userId)
	]);
	// Mercado Pago counts once it feeds an account (also while a reconnect is pending); Gmail once linked.
	const mpOn = !!mp?.accountId;
	const gmailOn = !!gmail?.state;
	// Nothing to review and no source linked: send the user to the connections.
	if (!mpOn && !galicia?.arsAccountId && !gmailOn && items.length === 0 && autoRows.length === 0) {
		redirect(303, '/profile/vinculaciones');
	}
	// The source only disambiguates when the pending items come from more than one.
	const mixed = new Set(items.map((i) => i.source)).size > 1;
	const sync = mpOn ? mp : null;
	const gmailState = gmailOn ? gmail : null;
	const unknownCards = gmailOn ? await listUnknownCards(userId) : [];

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
			currency: Currency;
			isCredit: boolean;
			suggestion: string | null;
			source: string | null;
			/** Cuotas of an installment purchase and the fixed payment amount of each; null otherwise. */
			cuotas: { n: number; amount: number } | null;
		}[];
	}[] = [];
	for (const i of items) {
		const day = localDay(i.occurredAt);
		let group = groups.at(-1);
		if (group?.day !== day) {
			group = { day, heading: dayHeading(day, today), items: [] };
			groups.push(group);
		}
		const suggestion = importPrefill(
			i,
			ctx.rules,
			ctx.categories,
			counterAccountsOf(ctx.accounts, i),
			ctx.fixed
		).suggestion;
		if (suggestion !== null) suggested++;
		group.items.push({
			id: i.id,
			title: importTitle(i),
			amount: i.amount,
			currency: i.currency,
			isCredit: i.isCredit,
			suggestion,
			source: mixed ? importSource(i.source).label : null,
			cuotas:
				i.installments && i.installmentTotal
					? {
							n: i.installments,
							amount: installmentAmounts(i.installmentTotal, i.installments, i.currency).rule
						}
					: null
		});
	}

	const { done, bulk, upload } = readImportFlags(url.searchParams);
	return {
		mpLinked: mpOn,
		gmailLinked: gmail?.state === 'linked',
		// Cards with alerts whose type the user has not said yet.
		unknownCards,
		// Credit-card alerts still without a statement line after two statements.
		unmatched: unmatched.map((i) => ({
			id: i.id,
			title: importTitle(i),
			amount: i.amount,
			currency: i.currency,
			day: localDay(i.occurredAt)
		})),
		// Gmail's failure, labelled (shown next to Mercado Pago's result).
		gmailError: gmailState?.errorLabel ?? null,
		suggested,
		bulk,
		// A statement upload just landed (Banco Galicia): new items and how many were auto-approved.
		upload,
		needsReconnect: mp?.state === 'reconnect',
		running: !!sync?.running,
		// 'payments' or 'report' while running; null when idle.
		phase: sync?.progress.phase ?? null,
		newItems: sync?.progress.newItems ?? null,
		autoApproved: sync?.progress.autoApproved ?? null,
		// Mercado Pago's failure, labelled.
		lastError: sync?.errorLabel ?? null,
		lastRun:
			sync?.lastRunAt || gmailState?.lastRunAt
				? agoLabel((sync?.lastRunAt ?? gmailState?.lastRunAt)!, now)
				: null,
		done,
		groups,
		// Approved automatically in the last 30 days; the line opens their list (/imports/auto).
		autoCount: autoRows.length
	};
};

export const actions: Actions = {
	sync: async ({ locals }) => {
		if (!(await syncNow(requireUser(locals).id))) redirect(303, '/profile/vinculaciones');
		redirect(303, '/imports');
	},

	/** Quick "Aprobar" of one suggested row; answers with the id so the page can offer Deshacer. */
	approveOne: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		const id = String((await request.formData()).get('id') ?? '');
		if (!isUuid(id)) return fail(400, { message: APPROVE_FAILED });
		const item = await getImport(userId, id);
		if (!item || item.status !== 'pending') return fail(409, { message: ALREADY_REVIEWED });
		const ctx = await suggestionContext(userId);
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

	undoApprove: undoApprovalAction,

	/** "Descartar" of an alert that never appeared in a statement: undoes its movement and rejects the item. */
	discardUnmatched: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		const id = String((await request.formData()).get('id') ?? '');
		if (!isUuid(id)) return fail(400, { message: DISCARD_FAILED });
		const result = await discardUnmatched(userId, id);
		if (result === 'changed') {
			return fail(409, { message: 'No se pudo descartar: el movimiento ya cambió.' });
		}
		if (result === 'stale') return fail(409, { message: DISCARD_FAILED });
		return { discardedId: id };
	},

	/** "Dejar": keeps the alert's movement and drops it from the list. */
	keepUnmatched: async ({ locals, request }) => {
		const id = String((await request.formData()).get('id') ?? '');
		if (!isUuid(id) || !(await keepUnmatched(requireUser(locals).id, id))) {
			return fail(409, { message: 'No se pudo guardar.' });
		}
		return { keptId: id };
	},

	approveSuggested: async ({ locals }) => {
		const userId = requireUser(locals).id;
		const { approved, skipped } = await approveAllSuggested(userId, false);
		redirect(303, importBulkHref(approved, skipped));
	}
};
