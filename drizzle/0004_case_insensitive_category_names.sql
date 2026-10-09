DROP INDEX "categories_user_id_name_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_id_lower_name_idx" ON "categories" USING btree ("user_id",lower("name"));