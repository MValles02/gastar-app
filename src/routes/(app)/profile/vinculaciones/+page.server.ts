import { error } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { automaticEnabled, changeImportFrom, sourceStatus } from '#lib/server/imports/automatic.ts';
import { str } from '#lib/server/forms.ts';
import { getGaliciaConnection } from '#lib/server/imports/galicia/connection.ts';
import { earliestImportDay, getImportFromDay } from '#lib/server/imports/settings.ts';
import { localDay } from '#lib/server/month.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const [{ mp, gmail }, galicia] = await Promise.all([
		sourceStatus(userId),
		getGaliciaConnection(userId)
	]);
	const base = {
		// Mercado Pago and Gmail only where their OAuth clients are configured; Banco Galicia is always available.
		mp: mp ? (mp.state ?? 'unlinked') : null,
		gmail: gmail ? gmail.state : undefined,
		galiciaReady: !!galicia?.arsAccountId
	};
	if (!mp && !gmail) return { ...base, importFrom: null, today: '', earliest: '', running: false };
	return {
		...base,
		// One minimum date for every automatic connection (Mercado Pago and Gmail alerts).
		importFrom: await getImportFromDay(userId),
		today: localDay(new Date()),
		earliest: earliestImportDay(),
		running: !!mp?.running || !!gmail?.running
	};
};

export const actions: Actions = {
	/** Autosaved "Importar desde": the minimum date of every automatic import. */
	importFrom: async ({ locals, request }) => {
		if (!automaticEnabled()) error(404);
		const userId = requireUser(locals).id;
		const ymd = str(await request.formData(), 'from');
		const result = await changeImportFrom(userId, ymd);
		if ('error' in result) return formFail(result.status, { errors: { from: result.error } });
		return { from: ymd };
	}
};
