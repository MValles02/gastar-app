import { error, redirect } from '@sveltejs/kit';
import {
	getImportAccount,
	getSyncState,
	importDateTime,
	importPrefill,
	importTitle,
	listImportRules,
	listPendingImports
} from '$lib/server/mp-import-queries';
import { mpConfigured, startMpSync } from '$lib/server/mp-sync';
import { dayHeading, localDay } from '$lib/server/month';
import { pgErrorCode } from '$lib/server/db/errors';
import { movementPickers } from '../movements/form.server';
import { approveWithValues } from './approve.server';
import type { Actions, PageServerLoad } from './$types';

const LEASE_MS = 15 * 60_000;

const DONE = ['approved', 'rejected', 'stale'] as const;

/** 404 unless the configured import account is the signed-in user's. */
async function requireAccount(userId: string) {
	const account = await getImportAccount(userId);
	if (!account) error(404, 'No encontrado');
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
	const configured = mpConfigured();
	const [sync, items, rules, pickers] = await Promise.all([
		getSyncState(userId, account.id),
		configured ? listPendingImports(userId) : [],
		configured ? listImportRules(userId) : [],
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

	const done = url.searchParams.get('done');
	const approved = countParam(url.searchParams.get('approved'));
	const skipped = countParam(url.searchParams.get('skipped'));
	return {
		suggested,
		bulk: approved === null ? null : { approved, skipped: skipped ?? 0 },
		configured,
		running: !!sync?.runningSince && now.getTime() - sync.runningSince.getTime() < LEASE_MS,
		lastError: sync?.lastError ?? null,
		lastRun: sync?.lastRunAt ? importDateTime(sync.lastRunAt) : null,
		done: DONE.find((d) => d === done) ?? null,
		groups
	};
};

export const actions: Actions = {
	sync: async ({ locals }) => {
		await requireAccount(locals.user!.id);
		if (mpConfigured()) await startMpSync();
		redirect(303, '/imports');
	},

	approveSuggested: async ({ locals }) => {
		const userId = locals.user!.id;
		const account = await requireAccount(userId);
		if (!mpConfigured()) redirect(303, '/imports');
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
				const out = await approveWithValues(userId, item, prefill);
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
