export type Currency = 'ARS' | 'USD';
export type MovementType = 'income' | 'outcome' | 'transfer';
export type TypeSum = { type: MovementType; amount: number };

const sumOf = (sums: TypeSum[], type: MovementType) =>
	sums.filter((s) => s.type === type).reduce((a, s) => a + s.amount, 0);

/** transfersIn = sum of destination_amount of transfers landing in this currency. */
export function totalBalance(initial: number, originSums: TypeSum[], transfersIn: number): number {
	return (
		initial +
		sumOf(originSums, 'income') -
		sumOf(originSums, 'outcome') -
		sumOf(originSums, 'transfer') +
		transfersIn
	);
}

export function monthNet(sums: TypeSum[]): number {
	return sumOf(sums, 'income') - sumOf(sums, 'outcome');
}

export function topCategories(
	rows: { id: string; name: string; outcome: number; income: number }[]
): { id: string; name: string; net: number; share: number }[] {
	const positive = rows
		.map((r) => ({ id: r.id, name: r.name, net: r.outcome - r.income }))
		.filter((r) => r.net > 0);
	const total = positive.reduce((a, r) => a + r.net, 0);
	return positive
		.sort((a, b) => b.net - a.net || a.name.localeCompare(b.name))
		.slice(0, 3)
		.map((r) => ({ ...r, share: r.net / total }));
}

export type RecentRow = {
	id: string;
	type: MovementType;
	description: string;
	occurredAt: Date;
	amount: number;
	destinationAmount: number | null;
	accountName: string;
	accountCurrency: Currency;
	destinationAccountName: string | null;
	categoryName: string | null;
};

export function toRecentItem(row: RecentRow, currency: Currency) {
	const raw =
		row.type === 'transfer' && row.accountCurrency !== currency
			? (row.destinationAmount ?? row.amount)
			: row.amount;
	const sign = row.type === 'income' ? 'positive' : row.type === 'outcome' ? 'negative' : 'neutral';
	return {
		id: row.id,
		type: row.type,
		description: row.description,
		accountName: row.accountName,
		categoryName: row.categoryName,
		destinationAccountName: row.destinationAccountName,
		occurredAt: row.occurredAt,
		amount: sign === 'negative' ? -raw : raw,
		sign: sign as 'positive' | 'negative' | 'neutral'
	};
}
