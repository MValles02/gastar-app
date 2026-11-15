import { AMOUNT_EXAMPLE } from './money';
import { DESCRIPTION_TOO_LONG_MESSAGE } from './fields';

export const MOVEMENT_TYPES = ['income', 'outcome', 'transfer'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** A category's kind; a category with no kind (null) fits both. */
export const CATEGORY_KINDS = ['outcome', 'income'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

/** Whether a category of `kind` can hold a movement of `type`. */
export const kindFits = (kind: string | null, type: string) => kind === null || kind === type;

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
