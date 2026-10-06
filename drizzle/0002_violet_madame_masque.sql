CREATE TABLE "plan_category_limits" (
	"plan_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	CONSTRAINT "plan_category_limits_plan_id_category_id_pk" PRIMARY KEY("plan_id","category_id"),
	CONSTRAINT "plan_category_limits_amount_positive_check" CHECK ("plan_category_limits"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "recurring_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "movement_type" NOT NULL,
	"description" varchar(60) NOT NULL,
	"amount" bigint NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"day_of_month" smallint NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_movements_amount_positive_check" CHECK ("recurring_movements"."amount" > 0),
	CONSTRAINT "recurring_movements_type_check" CHECK ("recurring_movements"."type" <> 'transfer'),
	CONSTRAINT "recurring_movements_day_of_month_check" CHECK ("recurring_movements"."day_of_month" BETWEEN 1 AND 31)
);
--> statement-breakpoint
CREATE TABLE "spending_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"currency" "currency" NOT NULL,
	"extra_income" bigint DEFAULT 0 NOT NULL,
	"savings" bigint DEFAULT 0 NOT NULL,
	"month" varchar(7),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spending_plans_amounts_check" CHECK ("spending_plans"."extra_income" >= 0 AND "spending_plans"."savings" >= 0),
	CONSTRAINT "spending_plans_month_check" CHECK ("spending_plans"."month" IS NULL OR "spending_plans"."month" ~ '^\d{4}-(0[1-9]|1[0-2])$')
);
--> statement-breakpoint
ALTER TABLE "movements" ADD COLUMN "recurring_id" uuid;--> statement-breakpoint
ALTER TABLE "plan_category_limits" ADD CONSTRAINT "plan_category_limits_plan_id_spending_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."spending_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_category_limits" ADD CONSTRAINT "plan_category_limits_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_movements" ADD CONSTRAINT "recurring_movements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_movements" ADD CONSTRAINT "recurring_movements_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_movements" ADD CONSTRAINT "recurring_movements_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spending_plans" ADD CONSTRAINT "spending_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_movements_user_id_idx" ON "recurring_movements" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spending_plans_user_id_currency_idx" ON "spending_plans" USING btree ("user_id","currency");--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_recurring_id_recurring_movements_id_fk" FOREIGN KEY ("recurring_id") REFERENCES "public"."recurring_movements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movements_recurring_id_idx" ON "movements" USING btree ("recurring_id");