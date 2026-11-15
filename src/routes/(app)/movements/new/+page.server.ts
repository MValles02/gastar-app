import { redirect } from '@sveltejs/kit';
import { formFail } from '#lib/form.ts';
import { savedMovement } from '#lib/toast-flags.ts';
import { PREFERENCE_COOKIE_OPTIONS } from '#lib/server/cookies.ts';
import { preferredCurrency } from '#lib/server/currency-pref.ts';
import type { Actions, PageServerLoad } from './$types';
import { localDay } from '#lib/server/month.ts';
import { emptyMovementValues, parseMovementForm } from '#lib/server/movements/form.ts';
import { requireUser } from '#lib/server/guards.ts';
import {
	createNewMovement,
	drawerPickers,
	failIfUnavailable,
	newMovementExtras,
	refererPath
} from '#lib/server/movements/detail.ts';
import { resolvePostedMovement } from '#lib/server/movements/pickers.ts';

/** Remembers the account of the last saved movement as the next form's default. */
const LAST_ACCOUNT_COOKIE = 'last_account';

export const load: PageServerLoad = async ({ locals, cookies, url, request }) => {
	const userId = requireUser(locals).id;
	const { accounts, categories } = await drawerPickers(userId);
	const last = cookies.get(LAST_ACCOUNT_COOKIE);
	// The last-used account, else the first active account in the selected currency, else the first one.
	const currency = preferredCurrency(cookies);
	const defaultAccountId = accounts.some((a) => a.id === last)
		? last!
		: ((accounts.find((a) => a.currency === currency) ?? accounts[0])?.id ?? '');
	const now = localDay(new Date());
	return {
		accounts,
		categories,
		now,
		saved: savedMovement(url.searchParams, 'saved'),
		formKey: crypto.randomUUID(),
		from: refererPath(request, url),
		defaultAccountId,
		values: emptyMovementValues(defaultAccountId, now)
	};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies, url }) => {
		const userId = requireUser(locals).id;
		const fd = await request.formData();
		const parsed = parseMovementForm(fd);
		const { values } = parsed;
		newMovementExtras(fd, values);
		if (!parsed.ok) return formFail(400, { values, errors: parsed.errors });
		const { data } = parsed;

		const { resolved } = await resolvePostedMovement(userId, data);
		if (!resolved.ok) return formFail(400, { values, errors: resolved.errors });

		let next: string;
		try {
			next = await createNewMovement(userId, resolved.row, fd, url);
		} catch (e) {
			return failIfUnavailable(e, values);
		}
		cookies.set(LAST_ACCOUNT_COOKIE, data.accountId, PREFERENCE_COOKIE_OPTIONS);
		redirect(303, next);
	}
};
