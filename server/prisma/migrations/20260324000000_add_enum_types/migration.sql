-- Create native PostgreSQL enum types to match Prisma schema declarations.
-- The initial migration created type columns as TEXT; this migration converts
-- them to the proper enum types so Prisma-generated casts (::transaction_type,
-- ::account_type) succeed at runtime.

-- Step 1: create enum types
CREATE TYPE "transaction_type" AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE "account_type" AS ENUM ('checking', 'savings', 'credit_card', 'cash', 'investment');

-- Step 2: convert existing TEXT columns to the new enum types
ALTER TABLE "transactions"
  ALTER COLUMN "type" TYPE "transaction_type"
  USING "type"::"transaction_type";

ALTER TABLE "accounts"
  ALTER COLUMN "type" TYPE "account_type"
  USING "type"::"account_type";
