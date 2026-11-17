import { fail, redirect } from '@sveltejs/kit';
import { ALREADY_REVIEWED, type SyncPhase } from '#lib/imports.ts';
import type { Currency } from '#lib/money.ts';
import { undoApprovalAction } from '#lib/server/imports/actions.ts';
import {
	approveAllSuggested,
	approveSuggestion,
	counterAccountsOf,
	suggestionContext
} from '#lib/server/imports/approve.ts';
import { getMpImportAccount, importLinks } from '#lib/server/imports/connections.ts';
import { listUnknownCards } from '#lib/server/imports/gmail/cards.ts';
import { gmailLinkState } from '#lib/server/imports/gmail/oauth.ts';
import { gmailSyncState, runGmailSync } from '#lib/server/imports/gmail/sync.ts';
import { mpOauthEnabled } from '#lib/server/imports/mercado-pago/oauth.ts';
import { getSyncState, leaseActive, runMpSync } from '#lib/server/imports/mercado-pago/sync.ts';
import { importPrefill, importTitle } from '#lib/server/imports/rules.ts';
import { importSource } from '#lib/server/imports/sources.ts';
import { getImport, listAutoApproved, listPendingImports } from '#lib/server/imports/store.ts';
import { dayHeading, localDay } from '#lib/server/month.ts';
import { isUuid } from '#lib/server/db/util.ts';
import { pgErrorCode } from '#lib/server/db/errors.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';
import { IMPORT_DONE } from '#lib/toast-flags.ts';

/** "Recién", "Hace 5 min", "Hace 2 h", "Hace 3 d". */
function agoLabel(at: Date, now: Date): string {
	const min = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000));
	if (min < 1) return 'Recién';
	if (min < 60) return `Hace ${min} min`;
	if (min < 24 * 60) return `Hace ${Math.floor(min / 60)} h`;
	return `Hace ${Math.floor(min / (24 * 60))} d`;
}

const APPROVE_FAILED = 'No se pudo aprobar.';

const countParam = (v: string | null) => (v !== null && /^\d{1,9}$/.test(v) ? Number(v) : null);

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals).id;
	const [{ mpAccount: mp, needsReconnect, galiciaReady }, items, ctx, autoRows, gmail] =
		await Promise.all([
			importLinks(userId),
			listPendingImports(userId),
			suggestionContext(userId),
			listAutoApproved(userId),
			gmailLinkState(userId)
		]);
	// Nothing to review and no source linked: send the user to the connections.
	if (!mp && !galiciaReady && !gmail && items.length === 0 && autoRows.length === 0) {
		redirect(303, '/profile/vinculaciones');
	}
	// The source only disambiguates when the pending items come from more than one.
	const mixed = new Set(items.map((i) => i.source)).size > 1;
	const sync = mp ? await getSyncState(userId, mp.id) : null;
	const [gmailState, unknownCards] = gmail
		? await Promise.all([gmailSyncState(userId), listUnknownCards(userId)])
		: [null, []];

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
			counterAccountsOf(ctx.accounts, i)
		).suggestion;
		if (suggestion !== null) suggested++;
		group.items.push({
			id: i.id,
			title: importTitle(i),
			amount: i.amount,
			currency: i.currency,
			isCredit: i.isCredit,
			suggestion,
			source: mixed ? importSource(i.source).label : null
		});
	}

	const running = leaseActive(sync?.runningSince);
	// 'payments' (also before the first step is recorded) or 'report'; null when idle.
	const phase: SyncPhase | null = running
		? sync?.phase === 'report'
			? 'report'
			: 'payments'
		: null;
	const done = url.searchParams.get('done');
	const approved = countParam(url.searchParams.get('approved'));
	const skipped = countParam(url.searchParams.get('skipped'));
	const imported = countParam(url.searchParams.get('imported'));
	const autoImported = countParam(url.searchParams.get('auto'));
	return {
		mpLinked: !!mp,
		gmailLinked: gmail === 'linked',
		// Cards with alerts whose type the user has not said yet.
		unknownCards,
		gmailError: gmailState?.lastErrorCode ?? null,
		suggested,
		bulk: approved === null ? null : { approved, skipped: skipped ?? 0 },
		// A statement upload just landed (Banco Galicia): new items and how many were auto-approved.
		upload: imported === null ? null : { created: imported, auto: autoImported ?? 0 },
		needsReconnect,
		running,
		phase,
		newItems: sync?.newItems ?? null,
		autoApproved: sync?.autoApproved ?? null,
		lastError: sync?.lastError ?? null,
		lastRun:
			sync?.lastRunAt || gmailState?.lastRunAt
				? agoLabel((sync?.lastRunAt ?? gmailState?.lastRunAt)!, now)
				: null,
		done: IMPORT_DONE.find((d) => d === done) ?? null,
		groups,
		// Approved automatically in the last 30 days; the line opens their list (/imports/auto).
		autoCount: autoRows.length
	};
};

export const actions: Actions = {
	sync: async ({ locals }) => {
		const userId = requireUser(locals).id;
		const gmail = (await gmailLinkState(userId)) === 'linked';
		const mp = mpOauthEnabled() && !!(await getMpImportAccount(userId));
		if (!gmail && !mp) redirect(303, '/profile/vinculaciones');
		if (gmail) await runGmailSync(userId);
		if (mp) await runMpSync(userId, { report: true, background: true });
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

	approveSuggested: async ({ locals }) => {
		const userId = requireUser(locals).id;
		const { approved, skipped } = await approveAllSuggested(userId, false);
		redirect(303, `/imports?approved=${approved}&skipped=${skipped}`);
	}
};
