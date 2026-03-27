-- Rename Spanish column names to English equivalents.
-- Using RENAME COLUMN to preserve all existing row data (never DROP + ADD).

ALTER TABLE "users" RENAME COLUMN "cotizacion_preference" TO "exchange_rate_preference";

ALTER TABLE "transactions" RENAME COLUMN "cotizacion" TO "exchange_rate";
