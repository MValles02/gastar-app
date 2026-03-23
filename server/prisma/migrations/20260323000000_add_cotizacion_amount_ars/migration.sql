-- Add balance_ars to accounts (ARS-equivalent running total)
ALTER TABLE "accounts" ADD COLUMN "balance_ars" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Seed existing accounts: balance_ars = balance (all prior data was ARS)
UPDATE "accounts" SET "balance_ars" = "balance";

-- Add cotizacion to transactions (nullable: null means ARS transaction, no exchange rate needed)
ALTER TABLE "transactions" ADD COLUMN "cotizacion" DECIMAL(65,30);

-- Add amount_ars to transactions (always the peso-equivalent of the transaction)
ALTER TABLE "transactions" ADD COLUMN "amount_ars" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Seed existing transactions: amount_ars = amount (all prior data was ARS)
UPDATE "transactions" SET "amount_ars" = "amount";
