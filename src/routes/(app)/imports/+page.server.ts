import { error, redirect } from '@sveltejs/kit';
import { formatDay } from '$lib/locale';
import { getImportAccount, getSyncState, listPendingImports } from '$lib/server/mp-import-queries';
import { mpConfigured, startMpSync } from '$lib/server/mp-sync';
import { dayHeading, localDay, TZ } from '$lib/server/month';
import type { Actions, PageServerLoad } from './$types';

const LEASE_MS = 15 * 60_000;

const FALLBACK_TITLE: Record<string, string> = {
	yield: 'Rendimientos',
	payout: 'Retiro',
	account_fund: 'Ingreso de dinero'
};

/** dd/mm/aaaa hh:mm, 24 h, Buenos Aires. */
function dateTime(d: Date): string {
	const time = new Intl.DateTimeFormat('es-AR', {
		timeZone: TZ,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).format(d);
	return `${formatDay(localDay(d))} ${time}`;
}

/** 404 unless the configured import account is the signed-in user's. */
async function requireAccount(userId: string) {
	const account = await getImportAccount(userId);
	if (!account) error(404, 'No encontrado');
	return account;
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const account = await requireAccount(userId);
	const configured = mpConfigured();
	const [sync, items] = await Promise.all([
		getSyncState(userId, account.id),
		configured ? listPendingImports(userId) : []
	]);

	const now = new Date();
	const today = localDay(now);
	const groups: {
		day: string;
		heading: string;
		items: { id: string; title: string; amount: number; isCredit: boolean }[];
	}[] = [];
	for (const i of items) {
		const day = localDay(i.occurredAt);
		let group = groups.at(-1);
		if (group?.day !== day) {
			group = { day, heading: dayHeading(day, today), items: [] };
			groups.push(group);
		}
		const title =
			i.counterpartyNickname ??
			i.merchant ??
			(i.kind === 'payment'
				? i.isCredit
					? 'Transferencia recibida'
					: 'Pago'
				: (FALLBACK_TITLE[i.kind] ?? i.rawDescription));
		group.items.push({ id: i.id, title, amount: i.amount, isCredit: i.isCredit });
	}

	return {
		configured,
		running: !!sync?.runningSince && now.getTime() - sync.runningSince.getTime() < LEASE_MS,
		lastError: sync?.lastError ?? null,
		lastRun: sync?.lastRunAt ? dateTime(sync.lastRunAt) : null,
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
