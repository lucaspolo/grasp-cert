-- Backfill: set band_id from frequency → bands.name for existing QSOs
UPDATE "qsos" SET "band_id" = (
  SELECT "id" FROM "bands" WHERE "bands"."name" = "qsos"."frequency"
) WHERE "band_id" IS NULL AND EXISTS (
  SELECT 1 FROM "bands" WHERE "bands"."name" = "qsos"."frequency"
);

-- Backfill: set mode_id from mode → modes.name for existing QSOs
UPDATE "qsos" SET "mode_id" = (
  SELECT "id" FROM "modes" WHERE "modes"."name" = "qsos"."mode"
) WHERE "mode_id" IS NULL AND EXISTS (
  SELECT 1 FROM "modes" WHERE "modes"."name" = "qsos"."mode"
);

-- Delete QSOs that could not be backfilled (orphan data)
DELETE FROM "qsos" WHERE "band_id" IS NULL OR "mode_id" IS NULL;

-- Drop existing nullable FK constraints
ALTER TABLE "qsos" DROP CONSTRAINT "qsos_band_id_fkey";
ALTER TABLE "qsos" DROP CONSTRAINT "qsos_mode_id_fkey";

-- Make columns NOT NULL
ALTER TABLE "qsos" ALTER COLUMN "band_id" SET NOT NULL;
ALTER TABLE "qsos" ALTER COLUMN "mode_id" SET NOT NULL;

-- Drop legacy mode column
ALTER TABLE "qsos" DROP COLUMN "mode";

-- Re-add FK constraints with RESTRICT
ALTER TABLE "qsos" ADD CONSTRAINT "qsos_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "bands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "qsos" ADD CONSTRAINT "qsos_mode_id_fkey" FOREIGN KEY ("mode_id") REFERENCES "modes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
