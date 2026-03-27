-- No column renames needed: all Prisma field renames keep their @map directives,
-- so the underlying DB columns are unchanged.
-- This migration only updates stored enum values from Spanish to English.

UPDATE "users"
SET "cotizacion_preference" = 'official'
WHERE "cotizacion_preference" = 'oficial';
