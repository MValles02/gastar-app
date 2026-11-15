import { MIN_DAY } from '#lib/dates.ts';
import { DESCRIPTION_MAX_LENGTH } from '#lib/fields.ts';
import { MOVEMENT_MESSAGES as MSG, MOVEMENT_TYPES, type MovementType } from '#lib/movement.ts';
import {
	convertAmount,
	type Currency,
	formatAmountInput,
	isValidRate,
	parseAmount
} from '#lib/money.ts';
import { isUuid } from '../db/util';
import { amountFor, editFormData, readFields, requiredText } from '../forms';
import { dayStart, localDay } from '../month';

export type MovementData = {
	type: MovementType;
	occurredAt: Date;
	description: string;
	amount: number;
	accountId: string;
	destinationAccountId: string | null;
	categoryId: string | null;
	exchangeRate: number | null;
};
export const FIELDS = [
	'type',
	'occurredAt',
	'description',
	'amount',
	'accountId',
	'destinationAccountId',
	'categoryId',
	'exchangeRate'
] as const;
type MovementField = (typeof FIELDS)[number];
/** Every field: `?/update` takes any of them, `type` included, through the same parse/resolve path. */
export const EDITABLE = FIELDS;
type MovementFormErrors = Partial<Record<MovementField, string>>;
type MovementFormResult =
	| { ok: true; values: Record<string, string>; data: MovementData }
	| { ok: false; values: Record<string, string>; errors: MovementFormErrors };

/** Row to insert (the owner is added by createMovement). */
export type MovementRow = MovementData & { destinationAmount: number | null };
type MovementResolveResult =
	{ ok: true; row: MovementRow } | { ok: false; errors: MovementFormErrors };

/** Archived accounts/category already referenced by the movement being edited (they stay valid). */
export type KeptRefs = {
	accountIds: string[];
	categoryId: string | null;
	amount?: number | null;
	/** Ids whose archived checks are skipped (an undo restoring what the movement had). */
	archivedOk?: string[];
};

export const UNAVAILABLE_MESSAGE = 'La cuenta o la categoría ya no está disponible.';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
// Year 9999 is rejected so the day after `to` is always representable.
export const validDay = (s: string) => YMD_RE.test(s) && s < '9999' && dayStart(s) !== null;

export const kindMismatchMessage = (kind: 'income' | 'outcome') => MSG.kindMismatch[kind];

/** The movement type posted, if `types` (every type by default; an import narrows them) has it. */
export const movementTypeOf = (raw: string, types: readonly MovementType[] = MOVEMENT_TYPES) =>
	types.find((t) => t === raw);

export const descriptionField = requiredText(DESCRIPTION_MAX_LENGTH, {
	empty: MSG.descEmpty,
	long: MSG.descLong
});

/** The stored movement as the form's strings (what `parseMovementForm` takes back). */
export const toFormValues = (m: {
	type: MovementType;
	occurredAt: Date;
	description: string;
	amount: number;
	accountId: string;
	accountCurrency: Currency;
	destinationAccountId: string | null;
	exchangeRate: number | null;
	categoryId: string | null;
}) => ({
	type: m.type,
	occurredAt: localDay(m.occurredAt),
	description: m.description,
	amount: formatAmountInput(m.amount, m.accountCurrency),
	accountId: m.accountId,
	destinationAccountId: m.destinationAccountId ?? '',
	exchangeRate: m.exchangeRate !== null ? formatAmountInput(m.exchangeRate, 'ARS') : '',
	categoryId: m.categoryId ?? ''
});

/** The form `?/update` validates: `row`'s stored values with the posted EDITABLE fields over them. */
export const editedForm = (row: Parameters<typeof toFormValues>[0], posted: FormData) =>
	editFormData(toFormValues(row), posted, EDITABLE);

/** The new-movement form's starting values: an outcome today on `accountId`. */
export const emptyMovementValues = (accountId: string, today: string) => ({
	type: 'outcome',
	amount: '',
	description: '',
	accountId,
	destinationAccountId: '',
	exchangeRate: '',
	categoryId: '',
	occurredAt: today
});

export function parseMovementForm(fd: FormData): MovementFormResult {
	const values: Record<string, string> = readFields(fd, FIELDS);
	const errors: MovementFormErrors = {};

	const type = movementTypeOf(values.type);
	if (!type) errors.type = MSG.type;

	const day = values.occurredAt;
	const occurredAt = validDay(day) && day >= MIN_DAY ? dayStart(day) : null;
	if (!occurredAt) errors.occurredAt = MSG.date;

	const { value: description, error: descriptionError } = descriptionField(values.description);
	if (descriptionError) errors.description = descriptionError;

	const amount = parseAmount(values.amount);
	if (amount === null || amount <= 0) errors.amount = MSG.amount;

	if (!isUuid(values.accountId)) errors.accountId = MSG.account;

	const isTransfer = type === 'transfer';
	if (isTransfer && !isUuid(values.destinationAccountId))
		errors.destinationAccountId = MSG.destination;
	if ((type === 'income' || type === 'outcome') && !isUuid(values.categoryId))
		errors.categoryId = MSG.category;

	if (Object.keys(errors).length > 0) return { ok: false, values, errors };
	// Malformed/absent rate becomes null; resolveMovement rejects it only for cross-currency transfers.
	const rate = isTransfer ? parseAmount(values.exchangeRate) : null;
	return {
		ok: true,
		values,
		data: {
			type: type!,
			occurredAt: occurredAt!,
			description,
			amount: amount!,
			accountId: values.accountId,
			destinationAccountId: isTransfer ? values.destinationAccountId : null,
			categoryId: isTransfer ? null : values.categoryId,
			exchangeRate: rate
		}
	};
}

type AccountRef = { id: string; currency: Currency; archivedAt: Date | null };
type CategoryRef = { id: string; archivedAt: Date | null; kind: MovementType | null };

/** Pure over looked-up (owner-checked) rows; undefined means not found / not owned. */
export function resolveMovement(
	data: MovementData,
	rows: {
		origin: AccountRef | undefined;
		destination?: AccountRef | undefined;
		category?: CategoryRef | undefined;
	},
	keep: KeptRefs = {
		accountIds: [],
		categoryId: null,
		amount: null
	}
): MovementResolveResult {
	const errors: MovementFormErrors = {};
	const { origin, destination, category } = rows;
	const base = { ...data, destinationAccountId: null, categoryId: null, exchangeRate: null };

	if (!origin) errors.accountId = MSG.account;
	else if (
		origin.archivedAt &&
		!keep.accountIds.includes(origin.id) &&
		!keep.archivedOk?.includes(origin.id)
	)
		errors.accountId = MSG.archivedAccount;
	else if (!(keep.amount != null && data.amount === keep.amount)) {
		const whole = amountFor(origin.currency)(data.amount);
		if (whole) errors.amount = whole;
	}

	if (data.type !== 'transfer') {
		if (!category) errors.categoryId = MSG.category;
		else if (
			category.archivedAt &&
			category.id !== keep.categoryId &&
			!keep.archivedOk?.includes(category.id)
		)
			errors.categoryId = MSG.archivedCategory;
		else if (
			(category.kind === 'income' || category.kind === 'outcome') &&
			category.kind !== data.type &&
			category.id !== keep.categoryId
		)
			errors.categoryId = MSG.kindMismatch[category.kind];
		if (Object.keys(errors).length > 0) return { ok: false, errors };
		return {
			ok: true,
			row: { ...base, categoryId: category!.id, destinationAmount: null }
		};
	}

	if (!destination) errors.destinationAccountId = MSG.destination;
	else if (origin && destination.id === origin.id) errors.destinationAccountId = MSG.sameAccount;
	else if (
		destination.archivedAt &&
		!keep.accountIds.includes(destination.id) &&
		!keep.archivedOk?.includes(destination.id)
	)
		errors.destinationAccountId = MSG.archivedAccount;
	if (Object.keys(errors).length > 0) return { ok: false, errors };

	const o = origin!;
	const d = destination!;
	if (o.currency === d.currency) {
		return {
			ok: true,
			row: { ...base, destinationAccountId: d.id, destinationAmount: data.amount }
		};
	}
	if (!isValidRate(data.exchangeRate)) return { ok: false, errors: { exchangeRate: MSG.rate } };
	const converted = convertAmount(data.amount, data.exchangeRate, o.currency, d.currency);
	if (converted === null) return { ok: false, errors: { amount: MSG.overflow } };
	if (converted <= 0) return { ok: false, errors: { amount: MSG.zero } };
	return {
		ok: true,
		row: {
			...base,
			destinationAccountId: d.id,
			destinationAmount: converted,
			exchangeRate: data.exchangeRate
		}
	};
}
