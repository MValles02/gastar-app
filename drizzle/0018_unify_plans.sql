-- A user with only a USD plan gets the unified (ARS) plan: same month and percent; fixed USD savings are not carried.
INSERT INTO "spending_plans" ("user_id", "currency", "extra_income", "savings", "savings_percent", "month")
SELECT p."user_id", 'ARS', 0, 0, p."savings_percent", p."month"
FROM "spending_plans" p
WHERE p."currency" = 'USD'
  AND NOT EXISTS (SELECT 1 FROM "spending_plans" a WHERE a."user_id" = p."user_id" AND a."currency" = 'ARS')
ON CONFLICT ("user_id", "currency") DO NOTHING;
--> statement-breakpoint
-- USD limits move onto the ARS plan with their currency; an existing ARS limit on the category wins.
INSERT INTO "plan_category_limits" ("plan_id", "category_id", "amount", "currency")
SELECT a."id", l."category_id", l."amount", 'USD'
FROM "plan_category_limits" l
JOIN "spending_plans" u ON u."id" = l."plan_id" AND u."currency" = 'USD'
JOIN "spending_plans" a ON a."user_id" = u."user_id" AND a."currency" = 'ARS'
ON CONFLICT ("plan_id", "category_id") DO NOTHING;
