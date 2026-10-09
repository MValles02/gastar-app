import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
import type { Currency } from '$lib/money';
import type { MovementType } from './dashboard';
import { AMOUNT_EXAMPLE, parseAmount } from '../money';
import { isUuid } from './db/util';
import { daysInMonth, elapsedDays, lastMonths, monthRange, shiftMonth } from './month';

/** Full months of history behind suggested rules and limits; a suggested rule appears in each of them. */
export const HISTORY_MONTHS = 3;
export const MAX_DAY_OF_MONTH = 31;

/** Setup wizard steps, as shown to the user (1-based); errors send the user back to one of them. */
export const PLAN_STEP = { income: 1, bills: 2, savings: 3, summary: 4 } as const;

export type RecurringStatus = 'paid' | 'overdue' | 'today' | 'upcoming';

/** Due day clamped to the month (31 → 30 in September); daysLeft is negative when overdue. */
export function recurringStatus(dayOfMonth: number, paid: boolean, ym: string, todayYmd: string) {
	const day = Math.min(dayOfMonth, daysInMonth(ym));
	const daysLeft = day - elapsedDays(ym, todayYmd);
	const status: RecurringStatus = paid
		? 'paid'
		: daysLeft < 0 || ym < todayYmd.slice(0, 7)
			? 'overdue'
			: daysLeft === 0
				? 'today'
				: 'upcoming';
	return { day, daysLeft, status };
}

export function dueLabel(status: RecurringStatus, daysLeft: number, type: MovementType): string {
	if (status === 'paid') return type === 'income' ? 'Cobrado' : 'Pagado';
	if (status === 'today') return 'Vence hoy';
	if (status === 'overdue')
		return daysLeft === -1 ? 'Venció ayer' : `Venció hace ${-daysLeft} días`;
	return daysLeft === 1 ? 'Mañana' : `En ${daysLeft} días`;
}

/** A rule counts only while the rule, its account and its category are all unarchived. */
export function isRecurringActive(r: {
	archivedAt: Date | null;
	accountArchivedAt: Date | null;
	categoryArchivedAt: Date | null;
}): boolean {
	return !r.archivedAt && !r.accountArchivedAt && !r.categoryArchivedAt;
}

/** Why a rule is inactive (the rule itself first, then its account, then its category); null when active. */
export function inactiveReason(r: {
	archivedAt: Date | null;
	accountArchivedAt: Date | null;
	categoryArchivedAt: Date | null;
}): string | null {
	if (r.archivedAt) return 'Archivado';
	if (r.accountArchivedAt) return 'Cuenta archivada';
	if (r.categoryArchivedAt) return 'Categoría archivada';
	return null;
}

export type PlanStatus = 'ok' | 'warn' | 'over';

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
	ok: 'Vas bien',
	warn: 'Atención',
	over: 'Te pasaste'
};

/** The `HISTORY_MONTHS` full months before `ym`, as a range (the window for suggested rules and limits). */
export function lastFullMonths(ym: string) {
	const [oldest] = lastMonths(shiftMonth(ym, -1), HISTORY_MONTHS);
	return { start: monthRange(oldest).start, end: monthRange(ym).start };
}

/**
 * Pure: month outcomes (one currency) that count as spent, total and per category. Payments linked to
 * an active rule are skipped (the rule's full amount is already deducted as `bills`); a payment linked
 * to an inactive or deleted rule counts.
 */
export function planSpent(
	rows: { categoryId: string | null; recurringId: string | null; amount: number }[],
	activeIds: ReadonlySet<string>
) {
	const byCategory = new Map<string, number>();
	let total = 0;
	for (const r of rows) {
		if (r.recurringId && activeIds.has(r.recurringId)) continue;
		total += r.amount;
		if (r.categoryId) byCategory.set(r.categoryId, (byCategory.get(r.categoryId) ?? 0) + r.amount);
	}
	return { total, byCategory };
}

export type PlanInput = {
	/** Sum of active recurring incomes. */
	recurringIncome: number;
	extraIncome: number;
	/** Sum of active recurring outcomes. */
	bills: number;
	savings: number;
	/** Month outcomes not linked to a recurring rule (bills are already deducted). */
	spent: number;
	limits: { categoryId: string; name: string; amount: number; spent: number }[];
	ym: string;
	todayYmd: string;
};

/** All inputs must be in `currency`; nothing here converts or sums across currencies. */
export function planSummary(p: PlanInput & { currency: Currency }) {
	const income = p.recurringIncome + p.extraIncome;
	const forSpending = income - p.bills - p.savings;
	const available = forSpending - p.spent;
	const days = daysInMonth(p.ym);
	const elapsed = elapsedDays(p.ym, p.todayYmd);
	// Today still counts as a day to spend in.
	const daysLeft = Math.min(Math.max(days - elapsed + 1, 1), days);
	// The daily figure is rounded down to whole pesos in ARS, to the cent in USD.
	const perDayStep = p.currency === 'ARS' ? 100 : 1;
	const elapsedShare = elapsed / days;
	const spentShare = forSpending > 0 ? p.spent / forSpending : p.spent > 0 ? 1 : 0;
	const status: PlanStatus = available < 0 ? 'over' : spentShare > elapsedShare ? 'warn' : 'ok';
	const limits = p.limits.map((l) => {
		const share = l.spent / l.amount;
		return {
			...l,
			share,
			over: l.spent > l.amount,
			fast: l.spent <= l.amount && share > elapsedShare
		};
	});
	return {
		income,
		bills: p.bills,
		savings: p.savings,
		forSpending,
		spent: p.spent,
		available,
		perDay: available > 0 ? Math.floor(available / daysLeft / perDayStep) * perDayStep : 0,
		daysLeft,
		elapsed,
		days,
		spentShare,
		elapsedShare,
		status,
		limits,
		unassigned: forSpending - p.limits.reduce((a, l) => a + l.amount, 0)
	};
}

/** Savings presets: none, 10 % or 20 % of income (whole units, rounded down; integer math), or a fixed amount. */
export function savingsFor(option: string, income: number, fixed: number | null): number {
	if (option === '10') return Math.floor(income / 1000) * 100;
	if (option === '20') return Math.floor(income / 500) * 100;
	if (option === 'fixed') return fixed ?? 0;
	return 0;
}

export type RecurringFormValues = Record<
	'type' | 'description' | 'amount' | 'accountId' | 'categoryId' | 'dayOfMonth',
	string
>;
export type RecurringFormResult =
	| {
			ok: true;
			values: RecurringFormValues;
			data: {
				type: Exclude<MovementType, 'transfer'>;
				description: string;
				amount: number;
				accountId: string;
				categoryId: string;
				dayOfMonth: number;
			};
	  }
	| { ok: false; values: RecurringFormValues; errors: Partial<RecurringFormValues> };

/**
 * Pure: validates the recurring income/payment form (ownership is checked by the caller).
 * The currency is unknown here, so the ARS whole-peso check (`isWholeFor`) is the actions' job.
 */
export function parseRecurringForm(fd: FormData): RecurringFormResult {
	const get = (k: string) => {
		const v = fd.get(k);
		return typeof v === 'string' ? v : '';
	};
	const values: RecurringFormValues = {
		type: get('type'),
		description: get('description'),
		amount: get('amount'),
		accountId: get('accountId'),
		categoryId: get('categoryId'),
		dayOfMonth: get('dayOfMonth')
	};
	const errors: Partial<RecurringFormValues> = {};
	const type = values.type === 'income' || values.type === 'outcome' ? values.type : null;
	if (!type) errors.type = 'Elegí si es un ingreso o un pago.';
	const description = values.description.trim();
	if (!description) errors.description = 'Ingresá una descripción.';
	else if (description.length > DESCRIPTION_MAX_LENGTH)
		errors.description = `La descripción puede tener hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`;
	const amount = parseAmount(values.amount);
	if (amount === null || amount <= 0)
		errors.amount = `Ingresá un monto mayor a cero ${AMOUNT_EXAMPLE}.`;
	if (!isUuid(values.accountId)) errors.accountId = 'Elegí una cuenta.';
	if (!isUuid(values.categoryId)) errors.categoryId = 'Elegí una categoría.';
	const day = Number(values.dayOfMonth);
	if (!/^\d{1,2}$/.test(values.dayOfMonth) || day < 1 || day > MAX_DAY_OF_MONTH)
		errors.dayOfMonth = `Elegí un día entre 1 y ${MAX_DAY_OF_MONTH}.`;
	if (Object.keys(errors).length > 0) return { ok: false, values, errors };
	return {
		ok: true,
		values,
		data: {
			type: type!,
			description,
			amount: amount!,
			accountId: values.accountId,
			categoryId: values.categoryId,
			dayOfMonth: day
		}
	};
}
