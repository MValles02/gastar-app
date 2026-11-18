import { AMOUNT_EXAMPLE } from './money';
import { DESCRIPTION_TOO_LONG_MESSAGE } from './fields';

/** The new-movement form's path (its own page, and the one a save never returns to). */
export const NEW_MOVEMENT_PATH = '/movements/new';

/** The single-valued movement list filters, as URL params (`account`/`category` repeat; `all`, `page` are not filters). */
export const FILTER_PARAMS = ['q', 'from', 'to', 'type', 'currency'] as const;

export const MOVEMENT_TYPES = ['income', 'outcome', 'transfer'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** A category's kind; a category with no kind (null) fits both. */
export const CATEGORY_KINDS = ['outcome', 'income'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

/** Whether a category of `kind` can hold a movement of `type`. */
export const kindFits = (kind: string | null, type: string) => (kind ?? type) === type;

/**
 * The categories a movement or rule of `type` can pick: those whose kind fits, plus `savedId`, the
 * category it already has (pass null where a saved category gets no exemption).
 */
export const categoriesFor = <C extends { id: string; kind: string | null }>(
	categories: C[],
	type: string,
	savedId: string | null
) => categories.filter((c) => kindFits(c.kind, type) || (!!savedId && c.id === savedId));

/**
 * The fields a movement of `type` needs besides amount, description, account and date: a category
 * (income, outcome), or a destination and, between accounts of different currencies, a rate.
 */
export function movementNeeds(
	type: string,
	{ origin, destination }: { origin?: string; destination?: string }
) {
	const transfer = type === 'transfer';
	return {
		category: !transfer,
		destination: transfer,
		rate: transfer && !!origin && !!destination && origin !== destination
	};
}

/** How an amount of `type` reads: income up, outcome down, transfers neither. */
export const signOf = (type: MovementType): 'positive' | 'negative' | 'neutral' =>
	type === 'income' ? 'positive' : type === 'outcome' ? 'negative' : 'neutral';

export const KIND_LABEL = { outcome: 'Gastos', income: 'Ingresos' } as const satisfies Record<
	CategoryKind,
	string
>;

/** Kind picker options; each screen adds its own '' entry ("Ambos" or "Todas"). */
export const KIND_OPTIONS = CATEGORY_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }));

export const MOVEMENT_MESSAGES = {
	type: 'Elegí un tipo de movimiento.',
	date: 'Ingresá una fecha válida.',
	descEmpty: 'Ingresá una descripción.',
	descLong: DESCRIPTION_TOO_LONG_MESSAGE,
	amount: `Ingresá un monto mayor a cero ${AMOUNT_EXAMPLE}.`,
	account: 'Elegí una cuenta.',
	archivedAccount: 'Esa cuenta está archivada. Elegí otra.',
	destination: 'Elegí la cuenta de destino.',
	sameAccount: 'Elegí una cuenta distinta de la de origen.',
	rate: 'Ingresá la cotización (1 USD = X ARS) en pesos enteros y mayor a cero.',
	zero: 'El monto convertido da 0. Revisá el monto o la cotización.',
	overflow: 'El monto convertido es demasiado grande.',
	category: 'Elegí una categoría.',
	archivedCategory: 'Esa categoría está archivada. Elegí otra.',
	kindMismatch: {
		income: 'Esa categoría es de ingresos. Elegí otra.',
		outcome: 'Esa categoría es de gastos. Elegí otra.'
	}
};

/**
 * Why a picked account or category can't be used, or null: archived (unless `kept`: the ref it
 * already had, or one an undo restores), or a category whose kind doesn't fit `kindFor` (omit it
 * where the kind is exempt or doesn't apply). Each form maps the reason to its own message.
 */
export function refError(
	ref: { archivedAt: Date | null; kind?: string | null },
	{ kept, kindFor }: { kept: boolean; kindFor?: string }
): 'archived' | 'kind' | null {
	if (ref.archivedAt && !kept) return 'archived';
	if (
		kindFor !== undefined &&
		(ref.kind === 'income' || ref.kind === 'outcome') &&
		ref.kind !== kindFor
	)
		return 'kind';
	return null;
}
