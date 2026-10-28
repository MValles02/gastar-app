import { error, fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import {
	deleteConnection,
	getConnectionInfo,
	listReceivingAccounts,
	mpOauthEnabled,
	OAUTH_COOKIE,
	OAUTH_PATH,
	setReceivingAccount,
	startAuthorization
} from '$lib/server/mp-oauth';
import { startMpBackfill } from '$lib/server/mp-sync';
import { dayStart, localDay } from '$lib/server/month';
import type { Actions, PageServerLoad } from './$types';

const DAY_MS = 86_400_000;
const BACKFILL_DAYS = 365;
const earliestDay = () => localDay(new Date(Date.now() - BACKFILL_DAYS * DAY_MS));

const FLASHES = {
	denied: 'Cancelaste la vinculación.',
	state: 'La vinculación venció. Probá de nuevo.',
	exchange: 'Mercado Pago no respondió. Probá de nuevo.'
} as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!mpOauthEnabled()) error(404);
	const userId = locals.user!.id;
	const code = url.searchParams.get('error');
	return {
		connection: await getConnectionInfo(userId),
		accounts: await listReceivingAccounts(userId),
		today: localDay(new Date()),
		earliest: earliestDay(),
		linked: url.searchParams.get('linked') === '1',
		flash: code && code in FLASHES ? FLASHES[code as keyof typeof FLASHES] : null
	};
};

export const actions: Actions = {
	connect: async ({ locals, cookies, url }) => {
		if (!mpOauthEnabled()) error(404);
		const { state, verifier, url: authorizeUrl } = startAuthorization(url.origin);
		cookies.set(OAUTH_COOKIE, JSON.stringify({ userId: locals.user!.id, state, verifier }), {
			path: OAUTH_PATH,
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 600
		});
		redirect(303, authorizeUrl);
	},

	account: async ({ locals, request }) => {
		if (!mpOauthEnabled()) error(404);
		const accountId = String((await request.formData()).get('accountId') ?? '');
		if (!(await setReceivingAccount(locals.user!.id, accountId))) {
			return fail(400, { error: 'Elegí una cuenta en pesos.' });
		}
		redirect(303, OAUTH_PATH);
	},

	backfill: async ({ locals, request }) => {
		if (!mpOauthEnabled()) error(404);
		const userId = locals.user!.id;
		const ymd = String((await request.formData()).get('from') ?? '');
		const from = dayStart(ymd);
		if (!from || ymd > localDay(new Date())) {
			return fail(400, { backfillError: 'Elegí una fecha válida.' });
		}
		if (ymd < earliestDay()) {
			return fail(400, { backfillError: 'Podés traer hasta 12 meses para atrás.' });
		}
		const connection = await getConnectionInfo(userId);
		if (!connection?.accountId || connection.needsReconnect) {
			return fail(400, { backfillError: 'Vinculá Mercado Pago y elegí una cuenta primero.' });
		}
		if (!(await startMpBackfill(userId, from))) {
			return fail(409, {
				backfillError: 'Ya hay una sincronización en curso. Probá en unos minutos.'
			});
		}
		redirect(303, '/imports');
	},

	disconnect: async ({ locals }) => {
		if (!mpOauthEnabled()) error(404);
		await deleteConnection(locals.user!.id);
		redirect(303, OAUTH_PATH);
	}
};
