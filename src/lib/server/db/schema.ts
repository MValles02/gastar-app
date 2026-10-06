import { relations, sql } from 'drizzle-orm';
import {
	bigint,
	boolean,
	check,
	index,
	pgEnum,
	pgTable,
	primaryKey,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';

// --- Better Auth core tables (email+password only) ---
// Generated with `npx @better-auth/cli generate` against better-auth 1.7.6.

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] })
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] })
}));

// --- Finance domain tables (see docs/DATA_MODEL.md) ---

export const currencyEnum = pgEnum('currency', ['ARS', 'USD']);
export const movementTypeEnum = pgEnum('movement_type', ['income', 'outcome', 'transfer']);

// ponytail: money columns use bigint mode 'number' (JS number, not JS bigint).
// Ceiling is Number.MAX_SAFE_INTEGER (2^53 - 1) ≈ 9.007e15 minor units, i.e.
// ~9e13 ARS/USD in whole currency — far beyond any realistic personal-finance
// amount. Switch to mode 'bigint' if that ceiling is ever a real risk.

export const financialAccounts = pgTable('financial_accounts', {
	id: uuid('id').defaultRandom().primaryKey(),
	ownerId: text('owner_id')
		.notNull()
		.references(() => user.id),
	name: text('name').notNull(),
	currency: currencyEnum('currency').notNull(),
	initialBalance: bigint('initial_balance', { mode: 'number' }).notNull(),
	icon: text('icon'),
	color: text('color'),
	archivedAt: timestamp('archived_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const categories = pgTable(
	'categories',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		name: text('name').notNull(),
		color: text('color'),
		archivedAt: timestamp('archived_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [uniqueIndex('categories_user_id_name_idx').on(table.userId, table.name)]
);

export const recurringMovements = pgTable(
	'recurring_movements',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		type: movementTypeEnum('type').notNull(),
		description: varchar('description', { length: 60 }).notNull(),
		amount: bigint('amount', { mode: 'number' }).notNull(),
		accountId: uuid('account_id')
			.notNull()
			.references(() => financialAccounts.id, { onDelete: 'cascade' }),
		categoryId: uuid('category_id')
			.notNull()
			.references(() => categories.id, { onDelete: 'cascade' }),
		dayOfMonth: smallint('day_of_month').notNull(),
		archivedAt: timestamp('archived_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('recurring_movements_user_id_idx').on(table.userId),
		check('recurring_movements_amount_positive_check', sql`${table.amount} > 0`),
		check('recurring_movements_type_check', sql`${table.type} <> 'transfer'`),
		check('recurring_movements_day_of_month_check', sql`${table.dayOfMonth} BETWEEN 1 AND 31`)
	]
);

export const spendingPlans = pgTable(
	'spending_plans',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		currency: currencyEnum('currency').notNull(),
		extraIncome: bigint('extra_income', { mode: 'number' }).default(0).notNull(),
		savings: bigint('savings', { mode: 'number' }).default(0).notNull(),
		// NULL = every month; 'YYYY-MM' = that month only.
		month: varchar('month', { length: 7 }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('spending_plans_user_id_currency_idx').on(table.userId, table.currency),
		check('spending_plans_amounts_check', sql`${table.extraIncome} >= 0 AND ${table.savings} >= 0`),
		check(
			'spending_plans_month_check',
			sql`${table.month} IS NULL OR ${table.month} ~ '^\\d{4}-(0[1-9]|1[0-2])$'`
		)
	]
);

export const planCategoryLimits = pgTable(
	'plan_category_limits',
	{
		planId: uuid('plan_id')
			.notNull()
			.references(() => spendingPlans.id, { onDelete: 'cascade' }),
		categoryId: uuid('category_id')
			.notNull()
			.references(() => categories.id, { onDelete: 'cascade' }),
		amount: bigint('amount', { mode: 'number' }).notNull()
	},
	(table) => [
		primaryKey({ columns: [table.planId, table.categoryId] }),
		check('plan_category_limits_amount_positive_check', sql`${table.amount} > 0`)
	]
);

export const movements = pgTable(
	'movements',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		type: movementTypeEnum('type').notNull(),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
		description: varchar('description', { length: 60 }).notNull(),
		amount: bigint('amount', { mode: 'number' }).notNull(),
		accountId: uuid('account_id')
			.notNull()
			.references(() => financialAccounts.id, { onDelete: 'restrict' }),
		categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'restrict' }),
		destinationAccountId: uuid('destination_account_id').references(() => financialAccounts.id, {
			onDelete: 'restrict'
		}),
		destinationAmount: bigint('destination_amount', { mode: 'number' }),
		exchangeRate: bigint('exchange_rate', { mode: 'number' }),
		recurringId: uuid('recurring_id').references(() => recurringMovements.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('movements_account_id_occurred_at_idx').on(table.accountId, table.occurredAt),
		index('movements_destination_account_id_idx').on(table.destinationAccountId),
		index('movements_category_id_idx').on(table.categoryId),
		index('movements_recurring_id_idx').on(table.recurringId),
		index('movements_user_id_occurred_at_idx').on(table.userId, table.occurredAt),
		check('movements_amount_positive_check', sql`${table.amount} > 0`),
		check(
			'movements_destination_amount_positive_check',
			sql`${table.destinationAmount} IS NULL OR ${table.destinationAmount} > 0`
		),
		check(
			'movements_exchange_rate_positive_check',
			sql`${table.exchangeRate} IS NULL OR ${table.exchangeRate} > 0`
		),
		check(
			'movements_income_outcome_shape_check',
			sql`${table.type} NOT IN ('income', 'outcome') OR (
				${table.categoryId} IS NOT NULL
				AND ${table.destinationAccountId} IS NULL
				AND ${table.destinationAmount} IS NULL
				AND ${table.exchangeRate} IS NULL
			)`
		),
		check(
			'movements_transfer_shape_check',
			sql`${table.type} <> 'transfer' OR (
				${table.categoryId} IS NULL
				AND ${table.destinationAccountId} IS NOT NULL
				AND ${table.destinationAccountId} <> ${table.accountId}
				AND ${table.destinationAmount} IS NOT NULL
			)`
		)
	]
);
