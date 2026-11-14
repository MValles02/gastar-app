ALTER TABLE "plan_category_limits" ADD COLUMN "currency" "currency" DEFAULT 'ARS' NOT NULL;--> statement-breakpoint
ALTER TABLE "spending_plans" ADD COLUMN "exchange_rate" bigint;--> statement-breakpoint
ALTER TABLE "spending_plans" ADD CONSTRAINT "spending_plans_exchange_rate_positive_check" CHECK ("spending_plans"."exchange_rate" IS NULL OR "spending_plans"."exchange_rate" > 0);