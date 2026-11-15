import type { Currency } from '#lib/money.ts';
import { ARS_WHOLE_MESSAGE, isWholeFor, parseAmount } from '#lib/money.ts';
import { SAVINGS_PERCENT_MAX, savingsFromPercent } from '#lib/plan.ts';

/**
 * Pure: reads the savings fields (`savingsOption` none|10|20|other, `savingsValue`, `savingsUnit`
 * percent|amount). A percentage is stored too (percent x 100) so savings follows income; `savings`
 * always holds the amount it gives for `income`.
 */
export function parseSavingsForm(
	fd: FormData,
	income: number,
	currency: Currency
): { ok: true; savings: number; savingsPercent: number | null } | { ok: false; message: string } {
	const get = (k: string) => {
		const v = fd.get(k);
		return typeof v === 'string' ? v : '';
	};
	const option = get('savingsOption');
	if (option === '10' || option === '20') {
		const savingsPercent = Number(option) * 100;
		return { ok: true, savings: savingsFromPercent(income, savingsPercent), savingsPercent };
	}
	if (option !== 'other') return { ok: true, savings: 0, savingsPercent: null };

	const value = parseAmount(get('savingsValue'));
	if (get('savingsUnit') === 'percent') {
		if (value === null || value <= 0 || value > SAVINGS_PERCENT_MAX)
			return { ok: false, message: 'Ingresá un porcentaje entre 0 y 100.' };
		return { ok: true, savings: savingsFromPercent(income, value), savingsPercent: value };
	}
	if (value === null || value < 0)
		return { ok: false, message: 'Ingresá un monto de ahorro válido.' };
	if (!isWholeFor(value, currency))
		return { ok: false, message: `Revisá “Monto a ahorrar”: ${ARS_WHOLE_MESSAGE}` };
	return { ok: true, savings: value, savingsPercent: null };
}
