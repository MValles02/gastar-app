CREATE TYPE "public"."import_rule_match_kind" AS ENUM('counterparty', 'merchant', 'kind');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "mp_import_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"external_key" text NOT NULL,
	"kind" text NOT NULL,
	"status" "import_status" DEFAULT 'pending' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"amount" bigint NOT NULL,
	"is_credit" boolean NOT NULL,
	"source_id" text NOT NULL,
	"raw_description" text NOT NULL,
	"counterparty_id" text,
	"counterparty_nickname" text,
	"merchant" text,
	"operation_type" text,
	"poi_type" text,
	"movement_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mp_import_items_amount_positive_check" CHECK ("mp_import_items"."amount" > 0),
	CONSTRAINT "mp_import_items_kind_check" CHECK ("mp_import_items"."kind" IN ('payment', 'account_fund', 'yield', 'payout', 'other'))
);
--> statement-breakpoint
CREATE TABLE "mp_import_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"match_kind" "import_rule_match_kind" NOT NULL,
	"match_value" text NOT NULL,
	"type" "movement_type" NOT NULL,
	"category_id" uuid,
	"counter_account_id" uuid,
	"description" varchar(60),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mp_import_rules_shape_check" CHECK (("mp_import_rules"."type" = 'transfer' AND "mp_import_rules"."counter_account_id" IS NOT NULL AND "mp_import_rules"."category_id" IS NULL) OR ("mp_import_rules"."type" <> 'transfer' AND "mp_import_rules"."category_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "mp_sync_state" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"synced_until" timestamp with time zone,
	"running_since" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"last_error" text,
	"report_balance" bigint,
	"report_balance_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD CONSTRAINT "mp_import_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD CONSTRAINT "mp_import_items_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD CONSTRAINT "mp_import_items_movement_id_movements_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."movements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_import_rules" ADD CONSTRAINT "mp_import_rules_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_import_rules" ADD CONSTRAINT "mp_import_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_import_rules" ADD CONSTRAINT "mp_import_rules_counter_account_id_financial_accounts_id_fk" FOREIGN KEY ("counter_account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_sync_state" ADD CONSTRAINT "mp_sync_state_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mp_import_items_user_id_external_key_idx" ON "mp_import_items" USING btree ("user_id","external_key");--> statement-breakpoint
CREATE INDEX "mp_import_items_user_id_status_occurred_at_idx" ON "mp_import_items" USING btree ("user_id","status","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mp_import_rules_user_id_match_idx" ON "mp_import_rules" USING btree ("user_id","match_kind","match_value");