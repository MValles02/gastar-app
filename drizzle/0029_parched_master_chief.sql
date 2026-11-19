ALTER TABLE "card_alerts" DROP CONSTRAINT "card_alerts_network_check";--> statement-breakpoint
ALTER TABLE "import_cards" DROP CONSTRAINT "import_cards_network_check";--> statement-breakpoint
ALTER TABLE "card_alerts" ADD COLUMN "installments" smallint;--> statement-breakpoint
ALTER TABLE "card_alerts" ADD CONSTRAINT "card_alerts_installments_check" CHECK ("card_alerts"."installments" >= 1);--> statement-breakpoint
ALTER TABLE "card_alerts" ADD CONSTRAINT "card_alerts_network_check" CHECK ("card_alerts"."network" IN ('visa', 'mastercard'));--> statement-breakpoint
ALTER TABLE "import_cards" ADD CONSTRAINT "import_cards_network_check" CHECK ("import_cards"."network" IN ('visa', 'mastercard'));