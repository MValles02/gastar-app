CREATE TABLE "galicia_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"ars_account_id" uuid,
	"usd_account_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mp_import_items" DROP CONSTRAINT "mp_import_items_kind_check";--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD COLUMN "source" text DEFAULT 'mercado_pago' NOT NULL;--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD COLUMN "installment" text;--> statement-breakpoint
ALTER TABLE "galicia_connections" ADD CONSTRAINT "galicia_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "galicia_connections" ADD CONSTRAINT "galicia_connections_ars_account_id_financial_accounts_id_fk" FOREIGN KEY ("ars_account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "galicia_connections" ADD CONSTRAINT "galicia_connections_usd_account_id_financial_accounts_id_fk" FOREIGN KEY ("usd_account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD CONSTRAINT "mp_import_items_source_check" CHECK ("mp_import_items"."source" IN ('mercado_pago', 'galicia_visa', 'galicia_mastercard'));--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD CONSTRAINT "mp_import_items_kind_check" CHECK ("mp_import_items"."kind" IN ('payment', 'account_fund', 'yield', 'payout', 'merchant_payout', 'refund', 'other', 'card_purchase', 'card_installment', 'card_taxes'));