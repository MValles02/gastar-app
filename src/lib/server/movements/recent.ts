import { categoryLook } from '#lib/appearance.ts';
import type { Currency } from '#lib/money.ts';
import { signOf, type MovementType } from '#lib/movement.ts';

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
	categoryIcon: string | null;
	categoryColor: string | null;
};

export function toRecentItem(row: RecentRow, currency: Currency) {
	const raw =
		row.type === 'transfer' && row.accountCurrency !== currency
			? (row.destinationAmount ?? row.amount)
			: row.amount;
	const sign = signOf(row.type);
	const look = categoryLook({ icon: row.categoryIcon, color: row.categoryColor }, null);
	return {
		id: row.id,
		type: row.type,
		description: row.description,
		accountName: row.accountName,
		categoryIcon: look.icon,
		categoryColor: look.color,
		destinationAccountName: row.destinationAccountName,
		occurredAt: row.occurredAt,
		currency,
		amount: sign === 'negative' ? -raw : raw,
		sign
	};
}
