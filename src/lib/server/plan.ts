import type { MovementType } from './dashboard';
import { AMOUNT_EXAMPLE, parseAmount } from '../money';
import { isUuid } from './db/util';
import { daysInMonth, elapsedDays, monthRange, shiftMonth } from './month';

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

export type PlanStatus = 'ok' | 'warn' | 'over';

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
	ok: 'Vas bien',
	warn: 'Atención',
	over: 'Te pasaste'
};

/** The 3 full months before `ym`, as a range (the window for suggested rules and limits). */
export function lastFullMonths(ym: string) {
	return {
		start: monthRange(shiftMonth(shiftMonth(shiftMonth(ym, -1), -1), -1)).start,
		end: monthRange(ym).start
	};
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
export function planSummary(p: PlanInput & { currency: 'ARS' | 'USD' }) {
	const income = p.recurringIncome + p.extraIncome;
	const forSpending = income - p.bills - p.savings;
	const available = forSpending - p.spent;
	const days = daysInMonth(p.ym);
	const elapsed = elapsedDays(p.ym, p.todayYmd);
	// Today still counts as a day to spend in.
	const daysLeft = Math.min(Math.max(days - elapsed + 1, 1), days);
	const unit = p.currency === 'ARS' ? 100 : 1;
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
		perDay: available > 0 ? Math.floor(available / daysLeft / unit) * unit : 0,
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
	else if (description.length > 60)
		errors.description = 'La descripción puede tener hasta 60 caracteres.';
	const amount = parseAmount(values.amount);
	if (amount === null || amount <= 0)
		errors.amount = `Ingresá un monto mayor a cero ${AMOUNT_EXAMPLE}.`;
	if (!isUuid(values.accountId)) errors.accountId = 'Elegí una cuenta.';
	if (!isUuid(values.categoryId)) errors.categoryId = 'Elegí una categoría.';
	const day = Number(values.dayOfMonth);
	if (!/^\d{1,2}$/.test(values.dayOfMonth) || day < 1 || day > 31)
		errors.dayOfMonth = 'Elegí un día entre 1 y 31.';
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
