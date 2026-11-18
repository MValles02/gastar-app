import { ARS_WHOLE_MESSAGE, isWholeFor, parseAmount, type Currency } from './money';

/**
 * The plan setup wizard's steps in order: step N (`/plan/setup?step=N`) is entry N - 1, with the question
 * it asks (the last one titles the summary).
 */
export const WIZARD_STEPS = [
	{ name: 'income', title: '¿Cuánto cobrás por mes?' },
	{ name: 'bills', title: '¿Qué pagos fijos tenés?' },
	{ name: 'savings', title: '¿Cuánto querés ahorrar?' },
	{ name: 'limits', title: '¿Dónde querés cuidar el gasto?' },
	{ name: 'summary', title: 'Tu plan' }
] as const;

/** A wizard step number, 1 to `WIZARD_STEPS.length` (a partial tuple's lengths, minus 0). */
export type WizardStep = Exclude<Partial<typeof WIZARD_STEPS>['length'], 0>;

export type WizardStepName = (typeof WIZARD_STEPS)[number]['name'];

/** Each step's question, in step order. */
export const WIZARD_TITLES = WIZARD_STEPS.map((s) => s.title);

export const wizardStep = (name: WizardStepName) =>
	(WIZARD_STEPS.findIndex((s) => s.name === name) + 1) as WizardStep;

/** The wizard step in a `?step=` / `?wizard=` value: a step number written as is, else null. */
export function parseStep(raw: string | null): WizardStep | null {
	const i = WIZARD_STEPS.findIndex((_, i) => String(i + 1) === raw);
	return i < 0 ? null : ((i + 1) as WizardStep);
}

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
