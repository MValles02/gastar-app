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
import { movementPickers } from '../movements/form.server';
import type { Actions, PageServerLoad } from './$types';

const LEASE_MS = 15 * 60_000;

const DONE = ['approved', 'rejected', 'stale'] as const;

/** 404 unless the configured import account is the signed-in user's. */
async function requireAccount(userId: string) {
	const account = await getImportAccount(userId);
	if (!account) error(404, 'No encontrado');
	return account;
}

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
	const counterAccounts = pickers.accounts.filter(
		(a) => a.currency === 'ARS' && a.id !== account.id
	);

	const now = new Date();
	const today = localDay(now);
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
		group.items.push({
			id: i.id,
			title: importTitle(i),
			amount: i.amount,
			isCredit: i.isCredit,
			suggestion: importPrefill(i, rules, pickers.categories, counterAccounts).suggestion
		});
	}

	const done = url.searchParams.get('done');
	return {
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
	}
};
