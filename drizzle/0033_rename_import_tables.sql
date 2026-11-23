ALTER TABLE "mp_import_items" RENAME TO "import_items";--> statement-breakpoint
ALTER TABLE "mp_import_rules" RENAME TO "import_rules";--> statement-breakpoint
ALTER INDEX "mp_import_items_pkey" RENAME TO "import_items_pkey";--> statement-breakpoint
ALTER INDEX "mp_import_rules_pkey" RENAME TO "import_rules_pkey";--> statement-breakpoint
ALTER INDEX "mp_import_items_user_id_external_key_idx" RENAME TO "import_items_user_id_external_key_idx";--> statement-breakpoint
ALTER INDEX "mp_import_items_user_id_alias_key_idx" RENAME TO "import_items_user_id_alias_key_idx";--> statement-breakpoint
ALTER INDEX "mp_import_items_user_id_status_occurred_at_idx" RENAME TO "import_items_user_id_status_occurred_at_idx";--> statement-breakpoint
ALTER INDEX "mp_import_rules_user_id_match_idx" RENAME TO "import_rules_user_id_match_idx";--> statement-breakpoint
ALTER TABLE "import_items" RENAME CONSTRAINT "mp_import_items_user_id_user_id_fk" TO "import_items_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "import_items" RENAME CONSTRAINT "mp_import_items_account_id_financial_accounts_id_fk" TO "import_items_account_id_financial_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "import_items" RENAME CONSTRAINT "mp_import_items_recurring_id_recurring_movements_id_fk" TO "import_items_recurring_id_recurring_movements_id_fk";--> statement-breakpoint
ALTER TABLE "import_items" RENAME CONSTRAINT "mp_import_items_movement_id_movements_id_fk" TO "import_items_movement_id_movements_id_fk";--> statement-breakpoint
ALTER TABLE "import_items" RENAME CONSTRAINT "mp_import_items_amount_positive_check" TO "import_items_amount_positive_check";--> statement-breakpoint
ALTER TABLE "import_items" RENAME CONSTRAINT "mp_import_items_installments_check" TO "import_items_installments_check";--> statement-breakpoint
ALTER TABLE "import_items" RENAME CONSTRAINT "mp_import_items_kind_check" TO "import_items_kind_check";--> statement-breakpoint
ALTER TABLE "import_items" RENAME CONSTRAINT "mp_import_items_source_check" TO "import_items_source_check";--> statement-breakpoint
ALTER TABLE "import_rules" RENAME CONSTRAINT "mp_import_rules_user_id_user_id_fk" TO "import_rules_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "import_rules" RENAME CONSTRAINT "mp_import_rules_category_id_categories_id_fk" TO "import_rules_category_id_categories_id_fk";--> statement-breakpoint
ALTER TABLE "import_rules" RENAME CONSTRAINT "mp_import_rules_counter_account_id_financial_accounts_id_fk" TO "import_rules_counter_account_id_financial_accounts_id_fk";--> statement-breakpoint
ALTER TABLE "import_rules" RENAME CONSTRAINT "mp_import_rules_recurring_id_recurring_movements_id_fk" TO "import_rules_recurring_id_recurring_movements_id_fk";--> statement-breakpoint
ALTER TABLE "import_rules" RENAME CONSTRAINT "mp_import_rules_shape_check" TO "import_rules_shape_check";--> statement-breakpoint
ALTER TABLE "card_alerts" RENAME CONSTRAINT "card_alerts_import_item_id_mp_import_items_id_fk" TO "card_alerts_import_item_id_import_items_id_fk";--> statement-breakpoint
UPDATE "import_items" SET "source_id" = NULL WHERE "source_id" = '';--> statement-breakpoint
CREATE VIEW "mp_import_items" AS SELECT * FROM "import_items";--> statement-breakpoint
CREATE VIEW "mp_import_rules" AS SELECT * FROM "import_rules";
