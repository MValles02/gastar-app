import { ARS_WHOLE_MESSAGE, isWholeFor, parseAmount, type Currency } from './money';

/** Steps of the plan setup wizard (`/plan/setup?step=N`). */
export const WIZARD_STEPS = 5;

/** The wizard step in a `?step=` / `?wizard=` value: digits 1 to `WIZARD_STEPS` only, else null. */
export function parseStep(raw: string | null): 1 | 2 | 3 | 4 | 5 | null {
	if (raw === null || !/^[1-5]$/.test(raw)) return null;
	return Number(raw) as 1 | 2 | 3 | 4 | 5;
}

/** The wizard's step `n` (`/plan/setup?step=N`). */
export const setupStepHref = (n: number) => `/plan/setup?step=${n}`;

/** `href` opened from wizard step `step` (`?wizard=N`, or `&wizard=N` after a query); as is without one. */
export const withWizard = (href: string, step: number | null | undefined) =>
	step ? `${href}${href.includes('?') ? '&' : '?'}wizard=${step}` : href;

/** Where a limit screen returns to: the wizard step it was opened from, else the plan. */
export function planReturn(raw: string | null): string {
	const step = parseStep(raw);
	return step ? setupStepHref(step) : '/plan';
}

/** A category limit typed by the user: a positive amount, whole in ARS. */
export function parseLimitAmount(
	raw: string,
	currency: Currency
): { cents: number } | { message: string } {
	const cents = parseAmount(raw);
	if (cents === null || cents <= 0) return { message: 'Ingresá un límite válido.' };
	if (!isWholeFor(cents, currency)) return { message: ARS_WHOLE_MESSAGE };
	return { cents };
}
