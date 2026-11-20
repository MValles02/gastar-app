import { fail, redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { isCurrency } from '#lib/money.ts';
import { accountOption } from '#lib/server/accounts/queries.ts';
import { chooseGaliciaAccount } from '#lib/server/imports/cards.ts';
import { ACCOUNT_ERRORS, activeAccountsIn } from '#lib/server/imports/connections.ts';
import { getGaliciaConnection } from '#lib/server/imports/galicia/connection.ts';
import { importStatement } from '#lib/server/imports/galicia/import.ts';
import {
	parseGaliciaStatement,
	STATEMENT_ERRORS,
	StatementError
} from '#lib/server/imports/galicia/statement.ts';
import {
	checkStatementFile,
	MISSING_ACCOUNT_ERRORS,
	readStatementPdf
} from '#lib/server/imports/galicia/upload.ts';
import { pgErrorCode } from '#lib/server/db/errors.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
import { requireUser } from '#lib/server/guards.ts';
import { importUploadHref } from '#lib/toast-flags.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const [connection, ars, usd] = await Promise.all([
		getGaliciaConnection(userId),
		activeAccountsIn(userId, 'ARS'),
		activeAccountsIn(userId, 'USD')
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
		const currency = fd.get('currency');
		if (!isCurrency(currency)) return formFail(400, { errors: { accountId: 'Elegí la cuenta.' } });
		const accountId = String(fd.get('accountId') ?? '');
		// Credit alerts that waited for the Banco Galicia accounts become items now.
		if (!(await chooseGaliciaAccount(requireUser(locals).id, currency, accountId))) {
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
		const fileError = checkStatementFile(file);
		if (fileError) return fail(400, { upload: fileError });
		// Counts uploads that pass the size checks, before parsing.
		record('statementUpload', userId);

		const bytes = await readStatementPdf(file as File);
		if (!bytes) return fail(400, { upload: STATEMENT_ERRORS.unreadable });
		let result;
		try {
			result = await importStatement(userId, await parseGaliciaStatement(bytes));
		} catch (e) {
			if (e instanceof StatementError) return fail(400, { upload: STATEMENT_ERRORS[e.code] });
			// Never log the statement itself: only that it failed and the DB code, if any.
			console.error('[galicia] statement import failed', pgErrorCode(e) ?? 'unknown');
			return fail(500, { upload: 'No se pudo importar el resumen. Probá de nuevo.' });
		}
		if (!result.ok) {
			return fail(400, { upload: MISSING_ACCOUNT_ERRORS[result.missing] });
		}
		redirect(303, importUploadHref(result.created, result.autoApproved));
	}
};
