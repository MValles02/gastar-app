import { redirect } from '@sveltejs/kit';
import { formFail } from '$lib/form';
import { PREFERENCE_COOKIE_OPTIONS } from '$lib/server/cookies';
import { preferredCurrency } from '$lib/server/currency-pref';
import type { Actions, PageServerLoad } from './$types';
import { TOAST_FLAGS } from '$lib/url-flags';
import { dayOfMonth } from '$lib/dates';
import { localDay } from '$lib/server/month';
import { parseMovementForm } from '$lib/server/movements/form';
import { createMovement } from '$lib/server/movements/queries';
import { createMovementWithRule } from '$lib/server/recurring/queries';
import { requireUser } from '$lib/server/guards';
import { drawerPickers, failIfUnavailable } from '$lib/server/movements/detail';
import { resolvePostedMovement } from '$lib/server/movements/pickers';

/** Remembers the account of the last saved movement as the next form's default. */
const LAST_ACCOUNT_COOKIE = 'last_account';

const FORM_PATH = '/movements/new';

/**
 * The screen to return to after saving: a same-origin app path other than this form, with its toast
 * flags dropped, or null. Anything else (absolute or protocol-relative URLs, another origin) is
 * rejected, so the action can't be turned into an open redirect.
 */
function originPath(value: unknown, base: URL): string | null {
	if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
	let url: URL;
	let path: string;
	try {
		url = new URL(value, base);
		// Compared decoded and without a trailing slash: `/movements/%6Eew/` is this form too.
		path = decodeURIComponent(url.pathname).replace(/\/+$/, '');
	} catch {
		return null;
	}
	// Dot segments can normalize to a protocol-relative path (`/.//evil.com` → `//evil.com`).
	if (url.origin !== base.origin || url.pathname.startsWith('//') || path === FORM_PATH)
		return null;
	for (const flag of TOAST_FLAGS) url.searchParams.delete(flag);
	return url.pathname + url.search;
}

/** The page the form was opened from, by the Referer (no-JS; the client replaces it with its own). */
function refererPath(request: Request, base: URL) {
	const referer = request.headers.get('referer');
	if (!referer) return null;
	try {
		const url = new URL(referer);
		return url.origin === base.origin ? originPath(url.pathname + url.search, base) : null;
	} catch {
		return null;
	}
}

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
		saved: url.searchParams.get('saved') || null,
		savedRule: url.searchParams.get('rule') || null,
		formKey: crypto.randomUUID(),
		from: refererPath(request, url),
		defaultAccountId
	};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies, url }) => {
		const userId = requireUser(locals).id;
		const fd = await request.formData();
		const parsed = parseMovementForm(fd);
		const { values } = parsed;
		// Keeps the checkbox state when the form is shown again with errors.
		if (fd.get('repeat') === 'on') values.repeat = 'on';
		// Keeps the origin when the form is shown again with errors (the Referer is now this form).
		const returnTo = fd.get('returnTo');
		if (typeof returnTo === 'string') values.returnTo = returnTo;
		if (!parsed.ok) return formFail(400, { values, errors: parsed.errors });
		const { data } = parsed;

		const { resolved } = await resolvePostedMovement(userId, data);
		if (!resolved.ok) return formFail(400, { values, errors: resolved.errors });

		let movementId: string;
		// Set when "Repetir todos los meses" created a rule: the client's Deshacer removes it too.
		let ruleId: string | null = null;
		try {
			const { type, categoryId } = resolved.row;
			if (fd.get('repeat') === 'on' && type !== 'transfer' && categoryId) {
				// The rule repeats on the movement's Buenos Aires day (clamped by recurringStatus in short months).
				({ movementId, ruleId } = await createMovementWithRule(userId, resolved.row, {
					type,
					description: resolved.row.description,
					amount: resolved.row.amount,
					accountId: resolved.row.accountId,
					categoryId,
					dayOfMonth: dayOfMonth(localDay(resolved.row.occurredAt))
				}));
			} else {
				[{ id: movementId }] = await createMovement(userId, resolved.row);
			}
		} catch (e) {
			return failIfUnavailable(e, values);
		}
		cookies.set(LAST_ACCOUNT_COOKIE, data.accountId, PREFERENCE_COOKIE_OPTIONS);
		// Back to the screen the form was opened from, which toasts; else stay here for the next one.
		const back = originPath(fd.get('returnTo'), url);
		const ruleFlag = ruleId ? `&rule=${ruleId}` : '';
		if (!back) redirect(303, `${FORM_PATH}?saved=${movementId}${ruleFlag}`);
		const flags = `movementSaved=${movementId}${ruleFlag}`;
		redirect(303, `${back}${back.includes('?') ? '&' : '?'}${flags}`);
	}
};
