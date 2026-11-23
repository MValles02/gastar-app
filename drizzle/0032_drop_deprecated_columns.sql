ALTER TABLE "spending_plans" DROP CONSTRAINT "spending_plans_amounts_check";--> statement-breakpoint
ALTER TABLE "mp_connections" DROP COLUMN "import_from";--> statement-breakpoint
ALTER TABLE "spending_plans" DROP COLUMN "extra_income";--> statement-breakpoint
ALTER TABLE "spending_plans" ADD CONSTRAINT "spending_plans_savings_check" CHECK ("spending_plans"."savings" >= 0);