import { formFail } from '#lib/form.ts';
import type { Currency } from '#lib/money.ts';
import { NEW_MOVEMENT_PATH } from '#lib/movement.ts';
import { TOAST_FLAGS, withSavedMovement } from '#lib/toast-flags.ts';
import { dayOfMonth } from '#lib/dates.ts';
import { withBalances } from '../accounts/balance';
import { accountOriginSums, accountTransfersIn, listAccounts } from '../accounts/queries';
import { PG_FOREIGN_KEY_VIOLATION, pgErrorCode } from '../db/errors';
import { dateLabel, localDay } from '../month';
import { notFoundHelpers } from '../guards';
import { createMovementWithRule, getRecurring } from '../recurring/queries';
import { activeRuleItems, ruleItem } from '../recurring/rule-items';
import { type KeptRefs, type MovementRow, toFormValues, UNAVAILABLE_MESSAGE } from './form';
import { movementPickers } from './pickers';
import { categoryUsage, createMovement, getMovement } from './queries';

export const { notFound, requireId } = notFoundHelpers('Movimiento no encontrado.');

/** The user's movement, or a 404 (invalid, foreign and missing ids alike). */
export async function findMovement(userId: string, id: string) {
	requireId(id);
	const [m] = await getMovement(userId, id);
	if (!m) notFound();
	return m;
}

export const keptRefs = (m: {
	accountId: string;
	destinationAccountId: string | null;
	categoryId: string | null;
	amount: number;
	accountCurrency: Currency;
}): KeptRefs => ({
	accountIds: m.destinationAccountId ? [m.accountId, m.destinationAccountId] : [m.accountId],
	categoryId: m.categoryId,
	// Only an ARS amount is kept: a USD amount with cents must not skip the check on an ARS account.
	amount: m.accountCurrency === 'ARS' ? m.amount : null
});

/** Detail payload: display fields, ids, pickers (archived refs kept) and the form values. */
export async function detailOf(userId: string, id: string) {
	const m = await findMovement(userId, id);
	const { accounts, categories } = await movementPickers(userId, keptRefs(m));
	// Active fixed payments of the movement's type and currency; its current one stays listed even if inactive.
	const rules =
		m.type === 'transfer' ? [] : await activeRuleItems(userId, m.accountCurrency, m.type);
	if (m.recurringId && !rules.some((r) => r.id === m.recurringId)) {
		const [r] = await getRecurring(userId, m.recurringId);
		if (r) rules.push(ruleItem(r));
	}
	return {
		movement: {
			id: m.id,
			type: m.type,
			dateLabel: dateLabel(m.occurredAt),
			occurredAt: localDay(m.occurredAt),
			description: m.description,
			amount: m.amount,
			destinationAmount: m.destinationAmount,
			exchangeRate: m.exchangeRate,
			accountId: m.accountId,
			destinationAccountId: m.destinationAccountId,
			categoryId: m.categoryId,
			recurringId: m.recurringId,
			accountName: m.accountName,
			accountIcon: m.accountIcon,
			accountColor: m.accountColor,
			accountCurrency: m.accountCurrency,
			accountArchived: m.accountArchivedAt !== null,
			destinationName: m.destinationName,
			destinationIcon: m.destinationIcon,
			destinationColor: m.destinationColor,
			destinationCurrency: m.destinationCurrency,
			destinationArchived: m.destinationArchivedAt !== null,
			categoryName: m.categoryName,
			categoryColor: m.categoryColor,
			categoryIcon: m.categoryIcon,
			categoryArchived: m.categoryArchivedAt !== null
		},
		accounts,
		categories,
		rules,
		values: toFormValues(m)
	};
}

/** What `update` and `link` hand back: the parts of the detail the client replaces. */
export async function savedSlice(userId: string, id: string) {
	const { movement, rules, values } = await detailOf(userId, id);
	return { movement, rules, values };
}

/**
 * `movementPickers` for the new-movement drawer: accounts carry their current balance and categories
 * come most used first (ties by name).
 */
export async function drawerPickers(userId: string) {
	const [{ accounts, categories }, rows, sums, ins, usage] = await Promise.all([
		movementPickers(userId),
		listAccounts(userId),
		accountOriginSums(userId),
		accountTransfersIn(userId),
		categoryUsage(userId)
	]);
	const balances = new Map(withBalances(rows, sums, ins).map((a) => [a.id, a.balance]));
	const uses = new Map(usage.map((u) => [u.categoryId, u.uses]));
	return {
		accounts: accounts.map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 })),
		categories: categories.toSorted(
			(a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'es')
		)
	};
}

/** A write that hit an account/category deleted meanwhile fails on the form; anything else rethrows. */
export function failIfUnavailable(e: unknown, values: Record<string, string>) {
	if (pgErrorCode(e) === PG_FOREIGN_KEY_VIOLATION)
		return formFail(400, { values, errors: { accountId: UNAVAILABLE_MESSAGE } });
	throw e;
}

/**
 * The screen to return to after saving: a same-origin app path other than the new-movement form,
 * with its toast flags dropped, or null. Anything else (absolute or protocol-relative URLs, another
 * origin) is rejected, so the action can't be turned into an open redirect.
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
	if (url.origin !== base.origin || url.pathname.startsWith('//') || path === NEW_MOVEMENT_PATH)
		return null;
	for (const flag of TOAST_FLAGS) url.searchParams.delete(flag);
	return url.pathname + url.search;
}

/** The page the new-movement form was opened from, by the Referer (no-JS; the client replaces it with its own). */
export function refererPath(request: Request, base: URL) {
	const referer = request.headers.get('referer');
	if (!referer) return null;
	try {
		const url = new URL(referer);
		return url.origin === base.origin ? originPath(url.pathname + url.search, base) : null;
	} catch {
		return null;
	}
}

/** The new-movement form's own fields, echoed into `values` so a failed submit keeps them. */
export function newMovementExtras(fd: FormData, values: Record<string, string>) {
	// Keeps the checkbox state when the form is shown again with errors.
	if (fd.get('repeat') === 'on') values.repeat = 'on';
	// Keeps the origin when the form is shown again with errors (the Referer is now this form).
	const returnTo = fd.get('returnTo');
	if (typeof returnTo === 'string') values.returnTo = returnTo;
}

/**
 * Saves a new movement and its monthly rule when "Repetir todos los meses" is on, and returns where
 * to go: back to the screen the form was opened from (which toasts), else this form for the next one.
 */
export async function createNewMovement(userId: string, row: MovementRow, fd: FormData, base: URL) {
	let movementId: string;
	// Set when "Repetir todos los meses" created a rule: the client's Deshacer removes it too.
	let ruleId: string | null = null;
	const { type, categoryId } = row;
	if (fd.get('repeat') === 'on' && type !== 'transfer' && categoryId) {
		// The rule repeats on the movement's Buenos Aires day (clamped by recurringStatus in short months).
		({ movementId, ruleId } = await createMovementWithRule(userId, row, {
			type,
			description: row.description,
			amount: row.amount,
			accountId: row.accountId,
			categoryId,
			dayOfMonth: dayOfMonth(localDay(row.occurredAt))
		}));
	} else {
		[{ id: movementId }] = await createMovement(userId, row);
	}
	const back = originPath(fd.get('returnTo'), base);
	return back
		? withSavedMovement(back, 'movementSaved', movementId, ruleId)
		: withSavedMovement(NEW_MOVEMENT_PATH, 'saved', movementId, ruleId);
}
