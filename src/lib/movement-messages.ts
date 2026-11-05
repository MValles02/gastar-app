import { DESCRIPTION_MAX_LENGTH } from '$lib/limits';
import { AMOUNT_EXAMPLE } from '$lib/money';

export const MOVEMENT_MESSAGES = {
	type: 'Elegí un tipo de movimiento.',
	date: 'Ingresá una fecha válida.',
	descEmpty: 'Ingresá una descripción.',
	descLong: `La descripción puede tener hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`,
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
