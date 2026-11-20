ALTER TABLE "mp_import_items" ADD COLUMN "installments" smallint;--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD COLUMN "recurring_id" uuid;--> statement-breakpoint
ALTER TABLE "recurring_movements" ADD COLUMN "ends_month" varchar(7);--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD CONSTRAINT "mp_import_items_recurring_id_recurring_movements_id_fk" FOREIGN KEY ("recurring_id") REFERENCES "public"."recurring_movements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD CONSTRAINT "mp_import_items_installments_check" CHECK ("mp_import_items"."installments" IS NULL OR "mp_import_items"."installments" >= 2);--> statement-breakpoint
ALTER TABLE "recurring_movements" ADD CONSTRAINT "recurring_movements_ends_month_check" CHECK ("recurring_movements"."ends_month" IS NULL OR "recurring_movements"."ends_month" ~ '^\d{4}-(0[1-9]|1[0-2])$');