import { fail, redirect } from '@sveltejs/kit';
import { formFail } from '$lib/form';
import { accountOption } from '$lib/server/account-options';
import {
	getGaliciaConnection,
	importStatement,
	listStatementAccounts,
	setGaliciaAccount
} from '$lib/server/galicia';
import {
	parseGaliciaStatement,
	StatementError,
	type StatementErrorCode
} from '$lib/server/galicia-statement';
import { pgErrorCode } from '$lib/server/db/errors';
import { isBlocked, record } from '$lib/server/rate-limit';
import { requireUser } from '$lib/server/guards';
import type { Actions, PageServerLoad } from './$types';

/** Upload cap; the real statements are well under 1 MB. BODY_SIZE_LIMIT (Dockerfile) sits above it. */
const MAX_BYTES = 5 * 1024 * 1024;

const PARSE_ERRORS: Record<StatementErrorCode, string> = {
	unreadable: 'No pudimos leer el PDF. Subí el resumen tal como lo descargaste de Galicia.',
	too_many_pages: 'El PDF tiene demasiadas páginas para ser un resumen.',
	not_galicia: 'Ese PDF no es un resumen de tarjeta de Banco Galicia.',
	unbalanced: 'El resumen no cuadra con el total; no se importó nada.'
};

const ACCOUNT_ERRORS = {
	ARS: 'Elegí una cuenta en pesos.',
	USD: 'Elegí una cuenta en dólares.'
} as const;

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const [connection, ars, usd] = await Promise.all([
		getGaliciaConnection(userId),
		listStatementAccounts(userId, 'ARS'),
		listStatementAccounts(userId, 'USD')
	]);
	return {
		arsAccountId: connection?.arsAccountId ?? null,
		usdAccountId: connection?.usdAccountId ?? null,
		arsAccounts: ars.map(accountOption),
		usdAccounts: usd.map(accountOption)
	};
};

export const actions: Actions = {
	/** Autosaved pick of the pesos or dollar account: answers with the stored value (Deshacer posts the previous one). */
	account: async ({ locals, request }) => {
		const fd = await request.formData();
		const currency = fd.get('currency') === 'USD' ? 'USD' : 'ARS';
		const accountId = String(fd.get('accountId') ?? '');
		if (!(await setGaliciaAccount(requireUser(locals).id, currency, accountId))) {
			return formFail(400, { errors: { accountId: ACCOUNT_ERRORS[currency] } });
		}
		return { currency, accountId };
	},

	/** Parses the statement in memory (never stored), stores its items, then auto-approves. */
	upload: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		if (isBlocked('statementUpload', userId)) {
			return fail(429, { upload: 'Subiste muchos resúmenes seguidos. Probá en unos minutos.' });
		}
		const file = (await request.formData()).get('statement');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { upload: 'Elegí el PDF del resumen.' });
		}
		if (file.size > MAX_BYTES) return fail(400, { upload: 'El archivo supera los 5 MB.' });
		record('statementUpload', userId);

		const bytes = new Uint8Array(await file.arrayBuffer());
		if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') {
			return fail(400, { upload: PARSE_ERRORS.unreadable });
		}
		let result;
		try {
			result = await importStatement(userId, await parseGaliciaStatement(bytes));
		} catch (e) {
			if (e instanceof StatementError) return fail(400, { upload: PARSE_ERRORS[e.code] });
			// Never log the statement itself: only that it failed and the DB code, if any.
			console.error('[galicia] statement import failed', pgErrorCode(e) ?? 'unknown');
			return fail(500, { upload: 'No se pudo importar el resumen. Probá de nuevo.' });
		}
		if (!result.ok) {
			return fail(400, {
				upload:
					result.missing === 'USD'
						? 'El resumen tiene consumos en dólares: elegí una cuenta en dólares.'
						: 'Elegí la cuenta en pesos antes de subir el resumen.'
			});
		}
		redirect(303, `/imports?imported=${result.created}&auto=${result.autoApproved}`);
	}
};
