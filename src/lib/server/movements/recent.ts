import { categoryLook } from '#lib/appearance.ts';
import type { Currency } from '#lib/money.ts';
import { signOf, type MovementType } from '#lib/movement.ts';
import { dayHeading, localDay, monthHeading } from '../month';
import { PAGE_SIZE } from './queries';

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
	destinationCurrency: Currency | null;
	categoryName: string | null;
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
		categoryName: row.categoryName,
		categoryIcon: look.icon,
		categoryColor: look.color,
		destinationAccountName: row.destinationAccountName,
		occurredAt: row.occurredAt,
		currency,
		amount: sign === 'negative' ? -raw : raw,
		sign
	};
}

type Item = ReturnType<typeof toRecentItem> & {
	currency: Currency;
	secondary: { cents: number; currency: Currency } | null;
};

export function groupByMonthDay(
	rows: RecentRow[],
	today: string,
	filterCurrency: Currency | undefined
) {
	const months: {
		ym: string;
		label: string;
		days: {
			day: string;
			heading: string;
			spend: { cents: number; currency: Currency }[];
			items: Item[];
		}[];
	}[] = [];
	for (const r of rows) {
		const day = localDay(r.occurredAt);
		const ym = day.slice(0, 7);
		const currency = filterCurrency ?? r.accountCurrency;
		let month = months.at(-1);
		if (month?.ym !== ym) {
			month = { ym, label: monthHeading(ym), days: [] };
			months.push(month);
		}
		let group = month.days.at(-1);
		if (group?.day !== day) {
			group = { day, heading: dayHeading(day, today, true), spend: [], items: [] };
			month.days.push(group);
		}
		// Cross-currency transfer shown in its origin currency: the destination amount goes underneath.
		const secondary =
			r.type === 'transfer' &&
			currency === r.accountCurrency &&
			r.destinationCurrency &&
			r.destinationCurrency !== currency &&
			r.destinationAmount !== null
				? { cents: r.destinationAmount, currency: r.destinationCurrency }
				: null;
		group.items.push({ ...toRecentItem(r, currency), currency, secondary });
	}
	return months;
}

/** One page of rows (fetched with a lookahead row) grouped by month and day, and whether another page follows. */
export function movementPage(rows: RecentRow[], today: string, currency: Currency | undefined) {
	const hasNext = rows.length > PAGE_SIZE;
	return { months: groupByMonthDay(rows.slice(0, PAGE_SIZE), today, currency), hasNext };
}
