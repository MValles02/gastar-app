import { relations, sql } from 'drizzle-orm';
import {
	bigint,
	boolean,
	check,
	date,
	index,
	integer,
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
// Relative imports only: drizzle-kit loads this file outside SvelteKit, so the #lib alias does not resolve.
import { MONTH_RE } from '../../dates';
import { CARD_NETWORKS, CARD_TYPES, GALICIA_SOURCE, KIND, SOURCE } from '../../imports';
import { CURRENCIES } from '../../money';
import { MOVEMENT_TYPES, type CategoryKind } from '../../movement';
import { MAX_DAY_OF_MONTH, SAVINGS_PERCENT_MAX } from '../../constants';

const inList = (xs: readonly string[]) => sql.raw(xs.map((x) => `'${x}'`).join(', '));

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

export const currencyEnum = pgEnum('currency', CURRENCIES);
export const movementTypeEnum = pgEnum('movement_type', MOVEMENT_TYPES);

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
		icon: text('icon'),
		// NULL = both income and outcome.
		kind: movementTypeEnum('kind').$type<CategoryKind>(),
		archivedAt: timestamp('archived_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	// Case-insensitive, matching categoryNameTaken; a concurrent duplicate surfaces as 23505.
	(table) => [
		uniqueIndex('categories_user_id_lower_name_idx').on(table.userId, sql`lower(${table.name})`),
		check('categories_kind_check', sql`${table.kind} <> 'transfer'`)
	]
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
		// Amount before the last change that came from a linked charge; NULL otherwise.
		previousAmount: bigint('previous_amount', { mode: 'number' }),
		archivedAt: timestamp('archived_at', { withTimezone: true }),
		// Installment rule: its last month ('YYYY-MM'); NULL = no end. A non-null rule never follows linked charges.
		endsMonth: varchar('ends_month', { length: 7 }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('recurring_movements_user_id_idx').on(table.userId),
		check(
			'recurring_movements_ends_month_check',
			sql`${table.endsMonth} IS NULL OR ${table.endsMonth} ~ ${sql.raw(`'${MONTH_RE.source}'`)}`
		),
		check('recurring_movements_amount_positive_check', sql`${table.amount} > 0`),
		check(
			'recurring_movements_previous_amount_positive_check',
			sql`${table.previousAmount} IS NULL OR ${table.previousAmount} > 0`
		),
		check('recurring_movements_type_check', sql`${table.type} <> 'transfer'`),
		check(
			'recurring_movements_day_of_month_check',
			sql`${table.dayOfMonth} BETWEEN 1 AND ${sql.raw(String(MAX_DAY_OF_MONTH))}`
		)
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
		savings: bigint('savings', { mode: 'number' }).default(0).notNull(),
		// Percent x 100 (1000 = 10 %); NULL = fixed `savings` amount.
		savingsPercent: integer('savings_percent'),
		// NULL = every month; 'YYYY-MM' = that month only.
		month: varchar('month', { length: 7 }),
		// Manual plan rate (rate x 100, whole pesos); NULL = the latest ARS<->USD transfer rate.
		exchangeRate: bigint('exchange_rate', { mode: 'number' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('spending_plans_user_id_currency_idx').on(table.userId, table.currency),
		check('spending_plans_savings_check', sql`${table.savings} >= 0`),
		check(
			'spending_plans_savings_percent_check',
			sql`${table.savingsPercent} IS NULL OR ${table.savingsPercent} BETWEEN 0 AND ${sql.raw(String(SAVINGS_PERCENT_MAX))}`
		),
		check(
			'spending_plans_exchange_rate_positive_check',
			sql`${table.exchangeRate} IS NULL OR ${table.exchangeRate} > 0`
		),
		check(
			'spending_plans_month_check',
			sql`${table.month} IS NULL OR ${table.month} ~ ${sql.raw(`'${MONTH_RE.source}'`)}`
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
		amount: bigint('amount', { mode: 'number' }).notNull(),
		// The limit's own currency (the plan itself is in ARS).
		currency: currencyEnum('currency').default('ARS').notNull()
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

export const importStatusEnum = pgEnum('import_status', ['pending', 'approved', 'rejected']);
export const importRuleMatchKindEnum = pgEnum('import_rule_match_kind', [
	'counterparty',
	'merchant',
	'kind'
]);

export const importItems = pgTable(
	'import_items',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		accountId: uuid('account_id')
			.notNull()
			.references(() => financialAccounts.id, { onDelete: 'restrict' }),
		externalKey: text('external_key').notNull(),
		// Where the item came from: Mercado Pago, or a Banco Galicia card statement of one network.
		source: text('source').default('mercado_pago').notNull(),
		kind: text('kind').notNull(),
		status: importStatusEnum('status').default('pending').notNull(),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
		// Exact net amount in minor units; direction is `isCredit`.
		amount: bigint('amount', { mode: 'number' }).notNull(),
		isCredit: boolean('is_credit').notNull(),
		// Null when the source has no id (e.g. Galicia taxes/adjustments, lines without a comprobante).
		sourceId: text('source_id'),
		rawDescription: text('raw_description').notNull(),
		counterpartyId: text('counterparty_id'),
		counterpartyNickname: text('counterparty_nickname'),
		merchant: text('merchant'),
		operationType: text('operation_type'),
		poiType: text('poi_type'),
		// Card statements: the cuota as printed (`05/12`) of an installment line; null otherwise.
		installment: text('installment'),
		// Galicia Mastercard alert of a purchase in N cuotas (N >= 2): the item is its first cuota and approving it creates a fixed payment.
		installments: smallint('installments'),
		// The fixed payment an approved installment item created (or, for a later cuota line, belongs to).
		recurringId: uuid('recurring_id').references(() => recurringMovements.id, {
			onDelete: 'set null'
		}),
		// Card alert and statement line of one purchase: the key of the other side of the match (one item for both).
		aliasKey: text('alias_key'),
		// "No apareció en el resumen": the user chose to keep an unmatched alert item.
		unmatchedKeptAt: timestamp('unmatched_kept_at', { withTimezone: true }),
		movementId: uuid('movement_id').references(() => movements.id, { onDelete: 'set null' }),
		// Set when the approval was automatic (a learned rule after an import); cleared by an undo.
		autoApprovedAt: timestamp('auto_approved_at', { withTimezone: true }),
		// The user undid an automatic approval: the item is never auto-approved again.
		autoApproveBlocked: boolean('auto_approve_blocked').default(false).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('import_items_user_id_external_key_idx').on(table.userId, table.externalKey),
		uniqueIndex('import_items_user_id_alias_key_idx').on(table.userId, table.aliasKey),
		index('import_items_user_id_status_occurred_at_idx').on(
			table.userId,
			table.status,
			table.occurredAt
		),
		check('import_items_amount_positive_check', sql`${table.amount} > 0`),
		check(
			'import_items_installments_check',
			sql`${table.installments} IS NULL OR ${table.installments} >= 2`
		),
		check('import_items_kind_check', sql`${table.kind} IN (${inList(Object.values(KIND))})`),
		check('import_items_source_check', sql`${table.source} IN (${inList(Object.values(SOURCE))})`)
	]
);

export const importRules = pgTable(
	'import_rules',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		matchKind: importRuleMatchKindEnum('match_kind').notNull(),
		matchValue: text('match_value').notNull(),
		type: movementTypeEnum('type').notNull(),
		categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'cascade' }),
		counterAccountId: uuid('counter_account_id').references(() => financialAccounts.id, {
			onDelete: 'cascade'
		}),
		description: varchar('description', { length: 60 }),
		// Fixed payment the matching items link to; NULL = match by description only.
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
		uniqueIndex('import_rules_user_id_match_idx').on(
			table.userId,
			table.matchKind,
			table.matchValue
		),
		check(
			'import_rules_shape_check',
			sql`(${table.type} = 'transfer' AND ${table.counterAccountId} IS NOT NULL AND ${table.categoryId} IS NULL) OR (${table.type} <> 'transfer' AND ${table.categoryId} IS NOT NULL)`
		)
	]
);

export const mpSyncState = pgTable('mp_sync_state', {
	accountId: uuid('account_id')
		.primaryKey()
		.references(() => financialAccounts.id, { onDelete: 'cascade' }),
	syncedUntil: timestamp('synced_until', { withTimezone: true }),
	runningSince: timestamp('running_since', { withTimezone: true }),
	lastRunAt: timestamp('last_run_at', { withTimezone: true }),
	// Error code only, never a message or payload.
	lastError: text('last_error'),
	// Step of the running sync ('payments' | 'report'), read only while the lease is held.
	phase: text('phase'),
	// Items the current (or last) run stored: payments first, report items added when it lands.
	newItems: integer('new_items'),
	// Items the last run approved automatically; null while running or before the first run that recorded it.
	autoApproved: integer('auto_approved'),
	// Earliest instant from which payments and report have been read by a successful run; a run backfills while the chosen floor is earlier.
	coveredFrom: timestamp('covered_from', { withTimezone: true })
});

// Tokens are AES-256-GCM ciphertext ("v1:" + base64(iv | tag | ct), AAD = user_id), never plaintext.
export const mpConnections = pgTable('mp_connections', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	// Null: linked but no receiving account chosen yet.
	accountId: uuid('account_id').references(() => financialAccounts.id, { onDelete: 'set null' }),
	mpUserId: text('mp_user_id').notNull(),
	accessToken: text('access_token').notNull(),
	refreshToken: text('refresh_token'),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	needsReconnect: boolean('needs_reconnect').default(false).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

// Gmail link for card alerts. Tokens are encrypted like mp_connections (GMAIL_TOKEN_KEY).
export const gmailConnections = pgTable('gmail_connections', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	googleAccountId: text('google_account_id').notNull(),
	email: text('email').notNull(),
	accessToken: text('access_token').notNull(),
	refreshToken: text('refresh_token').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	needsReconnect: boolean('needs_reconnect').default(false).notNull(),
	syncCursor: timestamp('sync_cursor', { withTimezone: true }),
	// Earliest instant from which mail has been read at least once (null = not yet, or a legacy row).
	coveredFrom: timestamp('covered_from', { withTimezone: true }),
	// Lease of a running sync (the Mercado Pago pattern): a later run may take over after 15 minutes.
	syncRunningSince: timestamp('sync_running_since', { withTimezone: true }),
	lastRunAt: timestamp('last_run_at', { withTimezone: true }),
	lastErrorCode: text('last_error_code'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

// Banco Galicia card statements land on the user's own bank accounts (no card accounts).
export const galiciaConnections = pgTable('galicia_connections', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	// Null: not chosen yet (or the account was deleted). Pesos lines need it.
	arsAccountId: uuid('ars_account_id').references(() => financialAccounts.id, {
		onDelete: 'set null'
	}),
	// Optional: only statements with dollar lines need it.
	usdAccountId: uuid('usd_account_id').references(() => financialAccounts.id, {
		onDelete: 'set null'
	}),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

// The user's "Importar desde": the minimum date of every automatic import (Mercado Pago and Gmail alerts).
// A row exists only once a date is chosen. Galicia statements are never filtered by it.
export const importSettings = pgTable('import_settings', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	// Local day start.
	importFrom: timestamp('import_from', { withTimezone: true }).notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

// One row per statement uploaded: how many closed after an alert tells whether the alert never appeared.
export const cardStatements = pgTable(
	'card_statements',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		source: text('source').notNull(),
		// SHA-256 prefix of the statement number (Statement.numberHash).
		numberHash: text('number_hash').notNull(),
		closing: date('closing', { mode: 'string' }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('card_statements_user_id_source_number_hash_idx').on(
			table.userId,
			table.source,
			table.numberHash
		),
		check(
			'card_statements_source_check',
			sql`${table.source} IN (${inList(Object.values(GALICIA_SOURCE))})`
		)
	]
);

// A card seen in Gmail alerts: what it is decides whether its alerts become import items (debit) or wait (credit).
export const importCards = pgTable(
	'import_cards',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		network: text('network').notNull(),
		last4: text('last4').notNull(),
		type: text('type').notNull(),
		arsAccountId: uuid('ars_account_id').references(() => financialAccounts.id, {
			onDelete: 'set null'
		}),
		usdAccountId: uuid('usd_account_id').references(() => financialAccounts.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('import_cards_user_id_network_last4_idx').on(
			table.userId,
			table.network,
			table.last4
		),
		check('import_cards_network_check', sql`${table.network} IN (${inList(CARD_NETWORKS)})`),
		check('import_cards_last4_check', sql`${table.last4} ~ '^[0-9]{4}$'`),
		check('import_cards_type_check', sql`${table.type} IN (${inList(CARD_TYPES)})`)
	]
);

// One row per card-alert email: only the parsed fields, never the email itself.
export const cardAlerts = pgTable(
	'card_alerts',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		gmailMessageId: text('gmail_message_id').notNull(),
		network: text('network').notNull(),
		last4: text('last4').notNull(),
		merchant: text('merchant').notNull(),
		country: text('country').notNull(),
		currency: text('currency').notNull(),
		// Minor units of `currency`.
		amount: bigint('amount', { mode: 'number' }).notNull(),
		foreign: boolean('foreign').notNull(),
		transactionType: text('transaction_type').notNull(),
		// The purchase's installment count (cuotas) when the alert says it (Mastercard); null for Visa.
		installments: smallint('installments'),
		receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
		// The item this alert became; null while it waits (unknown or credit card) or after the item is gone.
		importItemId: uuid('import_item_id').references(() => importItems.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('card_alerts_user_id_gmail_message_id_idx').on(table.userId, table.gmailMessageId),
		index('card_alerts_user_id_network_last4_idx').on(table.userId, table.network, table.last4),
		check('card_alerts_network_check', sql`${table.network} IN (${inList(CARD_NETWORKS)})`),
		check('card_alerts_last4_check', sql`${table.last4} ~ '^[0-9]{4}$'`),
		check('card_alerts_currency_check', sql`${table.currency} IN (${inList(CURRENCIES)})`),
		check('card_alerts_amount_positive_check', sql`${table.amount} > 0`),
		check('card_alerts_installments_check', sql`${table.installments} >= 1`)
	]
);
