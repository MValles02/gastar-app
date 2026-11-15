import { error, redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { dev } from '$app/env';
import { accountOption } from '#lib/server/accounts/queries.ts';
import { DAY_MS } from '#lib/dates.ts';
import { dayStart, localDay } from '#lib/server/month.ts';
import { getConnectionInfo, getMpImportAccount } from '#lib/server/imports/connections.ts';
import {
	deleteConnection,
	mpOauthEnabled,
	OAUTH_COOKIE,
	OAUTH_PATH,
	startAuthorization
} from '#lib/server/imports/mercado-pago/oauth.ts';
import {
	getImportFromDay,
	listReceivingAccounts,
	setImportFrom,
	setReceivingAccount
} from '#lib/server/imports/mercado-pago/settings.ts';
import {
	getSyncState,
	leaseActive,
	startMpBackfill
} from '#lib/server/imports/mercado-pago/sync.ts';
import { requireUser } from '#lib/server/guards.ts';
import type { Actions, PageServerLoad } from './$types';

const FLASHES = {
	denied: 'Cancelaste la vinculación.',
	state: 'La vinculación venció. Probá de nuevo.',
	exchange: 'Mercado Pago no respondió. Probá de nuevo.'
} as const;

const BACKFILL_DAYS = 365;
const earliestDay = () => localDay(new Date(Date.now() - BACKFILL_DAYS * DAY_MS));

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!mpOauthEnabled()) error(404);
	const userId = requireUser(locals).id;
	const code = url.searchParams.get('error');
	const connection = await getConnectionInfo(userId);
	const account = connection?.accountId ? await getMpImportAccount(userId) : null;
	return {
		connection,
		accounts: (await listReceivingAccounts(userId)).map(accountOption),
		// The minimum date of every sync; only once an account receives the movements.
		importFrom: account ? await getImportFromDay(userId, account.id) : null,
		today: localDay(new Date()),
		earliest: earliestDay(),
		running: account ? leaseActive((await getSyncState(userId, account.id))?.runningSince) : false,
		linked: url.searchParams.get('linked') === '1',
		flash: code && code in FLASHES ? FLASHES[code as keyof typeof FLASHES] : null
	};
};

export const actions: Actions = {
	connect: async ({ locals, cookies, url }) => {
		if (!mpOauthEnabled()) error(404);
		const { state, verifier, url: authorizeUrl } = startAuthorization(url.origin);
		cookies.set(OAUTH_COOKIE, JSON.stringify({ userId: requireUser(locals).id, state, verifier }), {
			path: OAUTH_PATH,
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 600
		});
		// Mercado Pago's OAuth page: the only external redirect, allowed by origin.
		redirect(303, authorizeUrl, { external: [new URL(authorizeUrl).origin] });
	},

	/** Autosaved: answers with the stored value (an undo posts the previous one the same way). */
	account: async ({ locals, request }) => {
		if (!mpOauthEnabled()) error(404);
		const accountId = String((await request.formData()).get('accountId') ?? '');
		if (!(await setReceivingAccount(requireUser(locals).id, accountId))) {
			return formFail(400, { errors: { accountId: 'Elegí una cuenta en pesos.' } });
		}
		return { accountId };
	},

	/** Autosaved "Importar desde": the minimum date of every sync. */
	importFrom: async ({ locals, request }) => {
		if (!mpOauthEnabled()) error(404);
		const userId = requireUser(locals).id;
		const account = await getMpImportAccount(userId);
		if (!account) return formFail(400, { errors: { from: 'Elegí primero la cuenta.' } });
		const ymd = String((await request.formData()).get('from') ?? '');
		const from = dayStart(ymd);
		if (!from || ymd > localDay(new Date())) {
			return formFail(400, { errors: { from: 'Elegí una fecha válida.' } });
		}
		if (ymd < earliestDay()) {
			return formFail(400, { errors: { from: 'Podés traer hasta 12 meses para atrás.' } });
		}
		if ((await getConnectionInfo(userId))?.needsReconnect) {
			return formFail(400, { errors: { from: 'Reconectá Mercado Pago primero.' } });
		}
		// Moving earlier fetches the gap; same or later only trims what is already here.
		const earlier = ymd < (await getImportFromDay(userId, account.id));
		// Trimming while a run holds the lease would let it re-insert what was just deleted.
		const busy = earlier
			? !(await startMpBackfill(userId, from))
			: leaseActive((await getSyncState(userId, account.id))?.runningSince);
		if (busy) {
			return formFail(409, {
				errors: { from: 'Ya hay una sincronización en curso. Probá en unos minutos.' }
			});
		}
		await setImportFrom(userId, account.id, from);
		return { from: ymd };
	},

	disconnect: async ({ locals }) => {
		if (!mpOauthEnabled()) error(404);
		await deleteConnection(requireUser(locals).id);
		redirect(303, OAUTH_PATH);
	}
};
