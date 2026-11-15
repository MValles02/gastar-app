import { undoApprovalAction } from '#lib/server/imports/actions.ts';
import { importTitle } from '#lib/server/imports/rules.ts';
import { listAutoApproved } from '#lib/server/imports/store.ts';
import { formatDay } from '#lib/locale.ts';
import { dayHeading, localDay } from '#lib/server/month.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const today = localDay(new Date());
	const rows = await listAutoApproved(userId);
	// Short enough to sit beside the category on a phone: "Hoy", "Ayer" or "25/10".
	const shortDate = (ymd: string) => {
		const h = dayHeading(ymd, today);
		return h === 'Hoy' || h === 'Ayer' ? h : formatDay(ymd).slice(0, 5);
	};
	return {
		items: rows.map((i) => ({
			id: i.id,
			title: importTitle(i),
			amount: i.amount,
			currency: i.currency,
			isCredit: i.isCredit,
			date: shortDate(localDay(i.occurredAt)),
			target: i.category ?? i.counterAccount
		}))
	};
};

export const actions: Actions = {
	undo: undoApprovalAction
};
