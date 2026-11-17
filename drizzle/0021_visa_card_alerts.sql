CREATE TABLE "card_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"gmail_message_id" text NOT NULL,
	"network" text NOT NULL,
	"last4" text NOT NULL,
	"merchant" text NOT NULL,
	"country" text NOT NULL,
	"currency" text NOT NULL,
	"amount" bigint NOT NULL,
	"foreign" boolean NOT NULL,
	"transaction_type" text NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"import_item_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_alerts_network_check" CHECK ("card_alerts"."network" IN ('visa')),
	CONSTRAINT "card_alerts_last4_check" CHECK ("card_alerts"."last4" ~ '^[0-9]{4}$'),
	CONSTRAINT "card_alerts_currency_check" CHECK ("card_alerts"."currency" IN ('ARS', 'USD')),
	CONSTRAINT "card_alerts_amount_positive_check" CHECK ("card_alerts"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "import_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"network" text NOT NULL,
	"last4" text NOT NULL,
	"type" text NOT NULL,
	"ars_account_id" uuid,
	"usd_account_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_cards_network_check" CHECK ("import_cards"."network" IN ('visa')),
	CONSTRAINT "import_cards_last4_check" CHECK ("import_cards"."last4" ~ '^[0-9]{4}$'),
	CONSTRAINT "import_cards_type_check" CHECK ("import_cards"."type" IN ('credit', 'debit'))
);
--> statement-breakpoint
ALTER TABLE "mp_import_items" DROP CONSTRAINT "mp_import_items_source_check";--> statement-breakpoint
ALTER TABLE "gmail_connections" ADD COLUMN "sync_running_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "card_alerts" ADD CONSTRAINT "card_alerts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_alerts" ADD CONSTRAINT "card_alerts_import_item_id_mp_import_items_id_fk" FOREIGN KEY ("import_item_id") REFERENCES "public"."mp_import_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_cards" ADD CONSTRAINT "import_cards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_cards" ADD CONSTRAINT "import_cards_ars_account_id_financial_accounts_id_fk" FOREIGN KEY ("ars_account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_cards" ADD CONSTRAINT "import_cards_usd_account_id_financial_accounts_id_fk" FOREIGN KEY ("usd_account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_alerts_user_id_gmail_message_id_idx" ON "card_alerts" USING btree ("user_id","gmail_message_id");--> statement-breakpoint
CREATE INDEX "card_alerts_user_id_network_last4_idx" ON "card_alerts" USING btree ("user_id","network","last4");--> statement-breakpoint
CREATE UNIQUE INDEX "import_cards_user_id_network_last4_idx" ON "import_cards" USING btree ("user_id","network","last4");--> statement-breakpoint
ALTER TABLE "mp_import_items" ADD CONSTRAINT "mp_import_items_source_check" CHECK ("mp_import_items"."source" IN ('mercado_pago', 'galicia_visa', 'galicia_mastercard', 'visa_debit'));