ALTER TABLE "categories" ADD COLUMN "kind" "movement_type";--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_kind_check" CHECK ("categories"."kind" <> 'transfer');