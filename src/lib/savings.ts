/** Whole units (ARS has no decimals), rounded down, in cents. `p` is percent x 100 (1000 = 10 %). */
export function savingsFromPercent(income: number, p: number): number {
	return Number((BigInt(income) * BigInt(p)) / 1_000_000n) * 100;
}

/** The plan's savings for `income`: the percentage of it when set, else the fixed amount. */
export function effectiveSavings(
	plan: { savings: number; savingsPercent: number | null },
	income: number
): number {
	return plan.savingsPercent != null
		? savingsFromPercent(income, plan.savingsPercent)
		: plan.savings;
}
