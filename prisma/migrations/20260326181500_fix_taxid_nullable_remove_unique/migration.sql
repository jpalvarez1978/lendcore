-- Fix taxId nullable and remove unique constraint
-- The @unique constraint on taxId was causing errors when multiple clients
-- had empty taxId values (stored as ''). Since taxId values are encrypted
-- (AES-256-GCM with random IV), the unique constraint at DB level never
-- worked correctly anyway. Uniqueness is validated in clientService.

-- Step 1: Drop unique constraints on taxId
DROP INDEX IF EXISTS "individual_profiles_taxId_key";
DROP INDEX IF EXISTS "business_profiles_taxId_key";

-- Step 2: Make taxId nullable in individual_profiles
ALTER TABLE "individual_profiles" ALTER COLUMN "taxId" DROP NOT NULL;

-- Step 3: Make taxId and legalRepTaxId nullable in business_profiles
ALTER TABLE "business_profiles" ALTER COLUMN "taxId" DROP NOT NULL;
ALTER TABLE "business_profiles" ALTER COLUMN "legalRepTaxId" DROP NOT NULL;

-- Step 4: Clean up existing empty string taxIds to NULL
UPDATE "individual_profiles" SET "taxId" = NULL WHERE "taxId" = '';
UPDATE "business_profiles" SET "taxId" = NULL WHERE "taxId" = '';
UPDATE "business_profiles" SET "legalRepTaxId" = NULL WHERE "legalRepTaxId" = '';
