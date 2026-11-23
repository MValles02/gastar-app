INSERT INTO "import_settings" ("user_id", "import_from")
SELECT "user_id", "import_from" FROM "mp_connections" WHERE "import_from" IS NOT NULL
ON CONFLICT ("user_id") DO NOTHING;
