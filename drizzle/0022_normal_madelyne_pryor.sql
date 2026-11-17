CREATE TABLE "card_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"number_hash" text NOT NULL,
	"closing" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_statements_source_check" CHECK ("card_statements"."source" IN ('galicia_visa', 'galicia_mastercard'))
);
--> statement-breakpoint
ALTER TABLE "mp_import_items" DROP CONSTRAINT "mp_import_items_kind_check";--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD COLUMN "alias_key" text;--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD COLUMN "unmatched_kept_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "card_statements" ADD CONSTRAINT "card_statements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_statements_user_id_source_number_hash_idx" ON "card_statements" USING btree ("user_id","source","number_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "mp_import_items_user_id_alias_key_idx" ON "mp_import_items" USING btree ("user_id","alias_key");--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD CONSTRAINT "mp_import_items_kind_check" CHECK ("mp_import_items"."kind" IN ('payment', 'account_fund', 'yield', 'payout', 'merchant_payout', 'refund', 'other', 'card_purchase', 'card_installment', 'card_taxes', 'card_adjustment'));