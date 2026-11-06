ALTER TABLE "mp_import_items" ADD COLUMN "auto_approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD COLUMN "auto_approve_blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mp_sync_state" ADD COLUMN "auto_approved" integer;