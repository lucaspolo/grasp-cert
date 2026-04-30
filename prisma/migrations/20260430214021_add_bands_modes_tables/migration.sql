/*
  Warnings:

  - You are about to drop the column `bands` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `modes` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "bands",
DROP COLUMN "modes";

-- AlterTable
ALTER TABLE "qsos" ADD COLUMN     "band_id" TEXT,
ADD COLUMN     "mode_id" TEXT;

-- CreateTable
CREATE TABLE "bands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_bands" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "band_id" TEXT NOT NULL,

    CONSTRAINT "event_bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_modes" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "mode_id" TEXT NOT NULL,

    CONSTRAINT "event_modes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bands_name_key" ON "bands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "modes_name_key" ON "modes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "event_bands_event_id_band_id_key" ON "event_bands"("event_id", "band_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_modes_event_id_mode_id_key" ON "event_modes"("event_id", "mode_id");

-- AddForeignKey
ALTER TABLE "qsos" ADD CONSTRAINT "qsos_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "bands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qsos" ADD CONSTRAINT "qsos_mode_id_fkey" FOREIGN KEY ("mode_id") REFERENCES "modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bands" ADD CONSTRAINT "event_bands_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bands" ADD CONSTRAINT "event_bands_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "bands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_modes" ADD CONSTRAINT "event_modes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_modes" ADD CONSTRAINT "event_modes_mode_id_fkey" FOREIGN KEY ("mode_id") REFERENCES "modes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
