/** Savings presets: none, 10 % or 20 % of income (whole units, rounded down; integer math), or a fixed amount. Shared by the plan setup form and its action. */
export function savingsFor(option: string, income: number, fixed: number | null): number {
	if (option === '10') return Math.floor(income / 1000) * 100;
	if (option === '20') return Math.floor(income / 500) * 100;
	if (option === 'fixed') return fixed ?? 0;
	return 0;
}
