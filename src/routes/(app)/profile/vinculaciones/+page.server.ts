import { error } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import {
	getConnectionInfo,
	getGaliciaConnection,
	getMpImportAccount,
	mpLinkState
} from '#lib/server/imports/connections.ts';
import { mpOauthEnabled } from '#lib/server/imports/mercado-pago/oauth.ts';
import { getSyncState, leaseActive, runMpSync } from '#lib/server/imports/mercado-pago/sync.ts';
import { gmailLinkState, gmailOauthEnabled } from '#lib/server/imports/gmail/oauth.ts';
import { acquireGmailSync, gmailSyncState } from '#lib/server/imports/gmail/sync.ts';
import {
	earliestImportDay,
	getImportFromDay,
	setImportFrom
} from '#lib/server/imports/settings.ts';
import { dayStart, localDay } from '#lib/server/month.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const mpOn = mpOauthEnabled();
	const gmailOn = gmailOauthEnabled();
	const [mp, galicia, gmail] = await Promise.all([
		// Mercado Pago only where its OAuth app is configured; Banco Galicia is always available.
		mpOn ? mpLinkState(userId) : null,
		getGaliciaConnection(userId),
		// Gmail only where its OAuth client is configured.
		gmailOn ? gmailLinkState(userId) : undefined
	]);
	const base = { mp, gmail, galiciaReady: !!galicia?.arsAccountId };
	if (!mpOn && !gmailOn)
		return { ...base, importFrom: null, today: '', earliest: '', running: false };
	const mpAccount = mpOn ? await getMpImportAccount(userId) : null;
	const [mpState, gmailState] = await Promise.all([
		mpAccount ? getSyncState(userId, mpAccount.id) : null,
		gmailOn ? gmailSyncState(userId) : null
	]);
	return {
		...base,
		// One minimum date for every automatic connection (Mercado Pago and Gmail alerts).
		importFrom: await getImportFromDay(userId),
		today: localDay(new Date()),
		earliest: earliestImportDay(),
		running: leaseActive(mpState?.runningSince) || leaseActive(gmailState?.runningSince)
	};
};

export const actions: Actions = {
	/** Autosaved "Importar desde": the minimum date of every automatic import. */
	importFrom: async ({ locals, request }) => {
		const mpOn = mpOauthEnabled();
		const gmailOn = gmailOauthEnabled();
		if (!mpOn && !gmailOn) error(404);
		const userId = requireUser(locals).id;
		const ymd = String((await request.formData()).get('from') ?? '');
		const from = dayStart(ymd);
		if (!from || ymd > localDay(new Date())) {
			return formFail(400, { errors: { from: 'Elegí una fecha válida.' } });
		}
		if (ymd < earliestImportDay()) {
			return formFail(400, { errors: { from: 'Podés traer hasta 12 meses para atrás.' } });
		}
		if (mpOn && (await getConnectionInfo(userId))?.needsReconnect) {
			return formFail(400, { errors: { from: 'Reconectá Mercado Pago primero.' } });
		}
		const gmailState = gmailOn ? await gmailLinkState(userId) : null;
		if (gmailState === 'reconnect') {
			return formFail(400, { errors: { from: 'Reconectá Gmail primero.' } });
		}
		// Mercado Pago without a receiving account has nothing to fetch or trim: skipped.
		const mpAccount = mpOn ? await getMpImportAccount(userId) : null;
		const busy = () =>
			formFail(409, {
				errors: { from: 'Ya hay una sincronización en curso. Probá en unos minutos.' }
			});

		// Moving earlier fetches the gap; same or later only trims what is already here.
		if (ymd < (await getImportFromDay(userId))) {
			const lease = gmailState === 'linked' ? await acquireGmailSync(userId) : null;
			if (gmailState === 'linked' && !lease) return busy();
			if (mpAccount && !(await runMpSync(userId, { from, report: true, background: true }))) {
				await lease?.release();
				return busy();
			}
			// Before the Gmail conversion, so its floor does not drop the backfilled alerts.
			await setImportFrom(userId, from);
			// Runs on in the background; the lease is released when it ends.
			void lease?.run(from).then(() => lease.release());
			return { from: ymd };
		}
		// Trimming while a run holds a lease would let it re-insert what was just deleted.
		const [mpSync, gmailSync] = await Promise.all([
			mpAccount ? getSyncState(userId, mpAccount.id) : null,
			gmailOn ? gmailSyncState(userId) : null
		]);
		if (leaseActive(mpSync?.runningSince) || leaseActive(gmailSync?.runningSince)) return busy();
		await setImportFrom(userId, from);
		return { from: ymd };
	}
};
