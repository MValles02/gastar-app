import { error, fail, redirect } from '@sveltejs/kit';
import {
	getImportAccount,
	getSyncState,
	importDateTime,
	importPrefill,
	importTitle,
	listImportRules,
	listPendingImports
} from '$lib/server/mp-import-queries';
import {
	getConnectionInfo,
	getImportFromDay,
	mpOauthEnabled,
	setImportFrom
} from '$lib/server/mp-oauth';
import { startMpBackfill, startMpSync } from '$lib/server/mp-sync';
import { dayHeading, dayStart, localDay } from '$lib/server/month';
import { pgErrorCode } from '$lib/server/db/errors';
import { movementPickers } from '../movements/form.server';
import { approveWithValues } from './approve.server';
import type { Actions, PageServerLoad } from './$types';

const LEASE_MS = 15 * 60_000;
const DAY_MS = 86_400_000;
const BACKFILL_DAYS = 365;
const earliestDay = () => localDay(new Date(Date.now() - BACKFILL_DAYS * DAY_MS));

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
		importFrom: await getImportFromDay(userId, account.id),
		today,
		earliest: earliestDay(),
		running,
		// 'payments' (also before the first step is recorded) or 'report'; null when idle.
		phase: running ? (sync?.phase === 'report' ? 'report' : 'payments') : null,
		newItems: sync?.newItems ?? null,
		lastError: sync?.lastError ?? null,
		lastRun: sync?.lastRunAt ? importDateTime(sync.lastRunAt) : null,
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

	importFrom: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const account = await requireAccount(userId);
		const ymd = String((await request.formData()).get('from') ?? '');
		const from = dayStart(ymd);
		if (!from || ymd > localDay(new Date())) {
			return fail(400, { importFromError: 'Elegí una fecha válida.' });
		}
		if (ymd < earliestDay()) {
			return fail(400, { importFromError: 'Podés traer hasta 12 meses para atrás.' });
		}
		if ((await getConnectionInfo(userId))?.needsReconnect) {
			return fail(400, { importFromError: 'Reconectá Mercado Pago primero.' });
		}
		// Moving earlier fetches the gap; same or later only trims what is already here.
		const earlier = ymd < (await getImportFromDay(userId, account.id));
		// Trimming while a run holds the lease would let it re-insert what was just deleted.
		const since = earlier ? null : (await getSyncState(userId, account.id))?.runningSince;
		if (
			earlier
				? !(await startMpBackfill(userId, from))
				: !!since && Date.now() - since.getTime() < LEASE_MS
		) {
			return fail(409, {
				importFromError: 'Ya hay una sincronización en curso. Probá en unos minutos.'
			});
		}
		await setImportFrom(userId, account.id, from);
		redirect(303, '/imports');
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
