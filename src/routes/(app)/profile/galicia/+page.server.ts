import { fail, redirect } from '@sveltejs/kit';
import { es } from '#lib/copy/es.ts';
import { formFail } from '#lib/form.ts';
import { CURRENCY_NAME, isCurrency } from '#lib/money.ts';
import { str } from '#lib/server/forms.ts';
import { chooseGaliciaAccount } from '#lib/server/imports/cards.ts';
import { currencyAccountOptions } from '#lib/server/imports/connections.ts';
import { getGaliciaConnection } from '#lib/server/imports/galicia/connection.ts';
import { importStatement } from '#lib/server/imports/galicia/import.ts';
import { parseGaliciaStatement, StatementError } from '#lib/server/imports/galicia/statement.ts';
import { checkStatementFile, readStatementPdf } from '#lib/server/imports/galicia/upload.ts';
import { pgErrorCode } from '#lib/server/db/errors.ts';
import { isBlocked, record } from '#lib/server/rate-limit.ts';
import { requireUser } from '#lib/server/guards.ts';
import { importUploadHref } from '#lib/toast-flags.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUser(locals).id;
	const [connection, options] = await Promise.all([
		getGaliciaConnection(userId),
		currencyAccountOptions(userId)
	]);
	return {
		arsAccountId: connection?.arsAccountId ?? null,
		usdAccountId: connection?.usdAccountId ?? null,
		...options
	};
};

export const actions: Actions = {
	/** Autosaved pick of the pesos or dollar account: answers with the stored value (Deshacer posts the previous one). */
	account: async ({ locals, request }) => {
		const fd = await request.formData();
		const currency = fd.get('currency');
		if (!isCurrency(currency))
			return formFail(400, { errors: { accountId: es.common.fields.pickAccount } });
		const accountId = str(fd, 'accountId');
		// Credit alerts that waited for the Banco Galicia accounts become items now.
		if (!(await chooseGaliciaAccount(requireUser(locals).id, currency, accountId))) {
			return formFail(400, {
				errors: { accountId: es.imports.accountIn(CURRENCY_NAME[currency]) }
			});
		}
		return { currency, accountId };
	},

	/** Parses the statement in memory (never stored), stores its items, then auto-approves. */
	upload: async ({ locals, request }) => {
		const userId = requireUser(locals).id;
		if (isBlocked('statementUpload', userId)) {
			return fail(429, { upload: es.profile.galicia.rateLimited });
		}
		const file = (await request.formData()).get('statement');
		const fileError = checkStatementFile(file);
		if (fileError) return fail(400, { upload: fileError });
		// Counts uploads that pass the size checks, before parsing.
		record('statementUpload', userId);

		const bytes = await readStatementPdf(file as File);
		if (!bytes) return fail(400, { upload: es.profile.galicia.statement.unreadable });
		let result;
		try {
			result = await importStatement(userId, await parseGaliciaStatement(bytes));
		} catch (e) {
			if (e instanceof StatementError)
				return fail(400, { upload: es.profile.galicia.statement[e.code] });
			// Never log the statement itself: only that it failed and the DB code, if any.
			console.error('[galicia] statement import failed', pgErrorCode(e) ?? 'unknown');
			return fail(500, { upload: es.profile.galicia.importFailed });
		}
		if (!result.ok) {
			return fail(400, { upload: es.profile.galicia.missingAccount[result.missing] });
		}
		redirect(303, importUploadHref(result.created, result.autoApproved));
	}
};
