/** Plan vocabulary shared by the server and the screens: statuses, their tones and labels, savings rules. */
import { formatPercentInput } from './locale';
import type { MovementType } from './movement';
import {
	ARS_WHOLE_MESSAGE,
	currencyStep,
	formatAmountInput,
	isWholeFor,
	parseAmount,
	type Currency
} from './money';

/** The plan is always in pesos; USD items convert at the plan rate. */
export const PLAN_CURRENCY = 'ARS' as const;

/** Savings percent is stored as percent x 100 (1000 = 10 %), at most 100 %. */
export const SAVINGS_PERCENT_MAX = 10000;

/** Visual tone shared by every status pill. */
export type StatusTone = 'ok' | 'warning' | 'bad' | 'neutral';

export type PlanStatus = 'ok' | 'warn' | 'over';
export type RecurringStatus = 'paid' | 'pending';
/** What a recurring rule's total counts: its incomes or its outcomes. */
export type RecurringType = Exclude<MovementType, 'transfer'>;

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
	ok: 'Vas bien',
	warn: 'Vas rápido',
	over: 'Te pasaste'
};

export const PLAN_TONE = {
	ok: 'ok',
	warn: 'warning',
	over: 'bad'
} as const satisfies Record<PlanStatus, StatusTone>;

const DUE_TONE = {
	paid: 'ok',
	pending: 'neutral'
} as const satisfies Record<RecurringStatus, StatusTone>;

/** A recurring rule's pill tone: paid this month, or pending (neutral). */
export const dueTone = (status: RecurringStatus): StatusTone => DUE_TONE[status];

/** `day` is the due day clamped to the month. */
export function dueLabel(
	{ status, day }: { status: RecurringStatus; day: number },
	type: MovementType
) {
	if (status === 'paid') return type === 'income' ? 'Cobrado' : 'Pagado';
	return `Pendiente · día ${day}`;
}

/** How far off a due day is, `n` days from today. */
export const dueInLabel = (n: number) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`);

export const MAX_DAY_OF_MONTH = 31;

export type RuleState = {
	archivedAt: Date | null;
	/** An installment rule past its last month. */
	ended: boolean;
	accountArchivedAt: Date | null;
	categoryArchivedAt: Date | null;
};

/** A rule counts only while it has not ended and the rule, its account and its category are all unarchived. */
export function isRecurringActive(r: RuleState): boolean {
	return !r.ended && !r.archivedAt && !r.accountArchivedAt && !r.categoryArchivedAt;
}

/** Why a rule is inactive (the rule itself first, then its account, then its category); null when active. */
export function inactiveReason(r: RuleState): string | null {
	if (r.archivedAt) return 'Desactivado';
	if (r.accountArchivedAt) return 'Cuenta archivada';
	if (r.categoryArchivedAt) return 'Categoría archivada';
	if (r.ended) return 'Terminado';
	return null;
}

/** Share of `budget` spent (1 when there is no budget left but some spending), and whether it outpaces the month. */
export function paceOf(spent: number, budget: number, elapsedShare: number) {
	const share = budget > 0 ? spent / budget : spent > 0 ? 1 : 0;
	return { share, fast: share > elapsedShare };
}

/** A category limit's pace: over it, or within it but spending faster than the month elapses. */
export function limitPace(spent: number, limit: number, elapsedShare: number) {
	const { share, fast } = paceOf(spent, limit, elapsedShare);
	return { share, over: spent > limit, fast: spent <= limit && fast };
}

/** Why a rule does not count in the plan now; null when it does (or when the rule itself is deactivated). */
export function cannotRegister(r: RuleState): string | null {
	if (r.archivedAt) return null;
	if (r.accountArchivedAt) return 'No cuenta en el plan mientras la cuenta esté archivada.';
	if (r.categoryArchivedAt) return 'No cuenta en el plan mientras la categoría esté archivada.';
	return null;
}

/** Whole percent of a limit spent, rounded down (0 without a limit). */
export const limitPercent = (spent: number, limit: number) =>
	limit > 0 ? Math.floor((spent * 100) / limit) : 0;

/** Left to spend per day, rounded down to the currency step (0 when nothing is left). */
export function perDayLeft(available: number, daysLeft: number, currency: Currency): number {
	const step = currencyStep(currency);
	return available > 0 ? Math.floor(available / daysLeft / step) * step : 0;
}

/** Whole units (ARS has no decimals), rounded down, in cents. `p` is percent x 100 (1000 = 10 %). */
export function savingsFromPercent(income: number, p: number): number {
	return Number((BigInt(income) * BigInt(p)) / 1_000_000n) * 100;
}

/** The savings presets offered besides Nada and Otro, in whole percent. */
export const SAVINGS_PRESETS = [10, 20] as const;

export type SavingsOption = 'none' | `${(typeof SAVINGS_PRESETS)[number]}` | 'other';
export type SavingsUnit = 'percent' | 'amount';

/** The savings form fields: `option` a `SavingsOption`; for "other", `value` in `unit` (a `SavingsUnit`). */
export const SAVINGS_FIELDS = {
	option: 'savingsOption',
	unit: 'savingsUnit',
	value: 'savingsValue'
} as const;

export type SavingsChoice = { option: SavingsOption; unit: SavingsUnit; value: string };
export type PlanSavings = { savings: number; savingsPercent: number | null };

const isPreset = (raw: string) => SAVINGS_PRESETS.some((n) => String(n) === raw);

/** The preset options' percent (x 100); null for none and other. */
export const presetPercent = (option: SavingsOption) =>
	isPreset(option) ? Number(option) * 100 : null;

/** A posted option as a `SavingsOption`; anything else counts as none. */
export const toSavingsOption = (raw: string): SavingsOption =>
	raw === 'other' || isPreset(raw) ? (raw as SavingsOption) : 'none';

/** A posted unit as a `SavingsUnit`; anything but percent is an amount. */
export const toSavingsUnit = (raw: string): SavingsUnit =>
	raw === 'percent' ? 'percent' : 'amount';

/** The choice a stored plan maps to. */
export function savingsChoice(
	{ savings, savingsPercent: p }: PlanSavings,
	currency: Currency
): SavingsChoice {
	const preset = SAVINGS_PRESETS.find((n) => n * 100 === p);
	if (preset !== undefined) return { option: `${preset}`, unit: 'percent', value: '' };
	if (p != null && p > 0) return { option: 'other', unit: 'percent', value: formatPercentInput(p) };
	if (p == null && savings > 0)
		return { option: 'other', unit: 'amount', value: formatAmountInput(savings, currency) };
	return { option: 'none', unit: 'percent', value: '' };
}

/** What an "Otro" value saves for `income`; null while it is not a valid percent or amount. */
export function otherSavings(unit: SavingsUnit, raw: string, income: number): PlanSavings | null {
	const v = parseAmount(raw);
	if (unit === 'percent')
		return v !== null && v > 0 && v <= SAVINGS_PERCENT_MAX
			? { savings: savingsFromPercent(income, v), savingsPercent: v }
			: null;
	return v !== null && v >= 0 ? { savings: v, savingsPercent: null } : null;
}

/**
 * A savings choice as the plan stores it. A percentage is stored too (percent x 100) so savings follows
 * income; `savings` always holds the amount it gives for `income`.
 */
export function readSavings(
	c: SavingsChoice,
	income: number,
	currency: Currency
): ({ ok: true } & PlanSavings) | { ok: false; message: string } {
	const preset = presetPercent(c.option);
	if (preset !== null)
		return { ok: true, savings: savingsFromPercent(income, preset), savingsPercent: preset };
	if (c.option !== 'other') return { ok: true, savings: 0, savingsPercent: null };

	const percent = c.unit === 'percent';
	const other = otherSavings(c.unit, c.value, income);
	if (!other)
		return {
			ok: false,
			message: percent
				? 'Ingresá un porcentaje entre 0 y 100.'
				: 'Ingresá un monto de ahorro válido.'
		};
	if (!percent && !isWholeFor(other.savings, currency))
		return { ok: false, message: `Revisá “Monto a ahorrar”: ${ARS_WHOLE_MESSAGE}` };
	return { ok: true, ...other };
}

/** The plan's savings for `income`: the percentage of it when set, else the fixed amount. */
export function effectiveSavings(plan: PlanSavings, income: number): number {
	return plan.savingsPercent != null
		? savingsFromPercent(income, plan.savingsPercent)
		: plan.savings;
}
