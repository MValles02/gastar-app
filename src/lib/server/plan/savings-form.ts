import type { Currency } from '#lib/money.ts';
import { readSavings, SAVINGS_FIELDS, toSavingsOption, toSavingsUnit } from '#lib/plan.ts';

/** The posted savings fields (`SAVINGS_FIELDS`) read as the plan stores them (`readSavings`). */
export function parseSavingsForm(fd: FormData, income: number, currency: Currency) {
	const get = (k: string) => {
		const v = fd.get(k);
		return typeof v === 'string' ? v : '';
	};
	return readSavings(
		{
			option: toSavingsOption(get(SAVINGS_FIELDS.option)),
			unit: toSavingsUnit(get(SAVINGS_FIELDS.unit)),
			value: get(SAVINGS_FIELDS.value)
		},
		income,
		currency
	);
}
