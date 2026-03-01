-- AlterTable: Add ndaaCompliant column to devices
ALTER TABLE "devices" ADD COLUMN "ndaaCompliant" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "mount_configs" (
    "id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "cameraModel" TEXT,
    "locationType" TEXT NOT NULL,
    "components" JSONB NOT NULL DEFAULT '[]',
    "colorSuffix" JSONB NOT NULL DEFAULT '{}',
    "colorPattern" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mount_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calc_reference_data" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calc_reference_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_jurisdictions" (
    "id" TEXT NOT NULL,
    "stateLabel" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "adoptedCodes" JSONB NOT NULL DEFAULT '[]',
    "maglockRequiresPirRex" BOOLEAN NOT NULL DEFAULT true,
    "maglockRequiresPneumaticPte" BOOLEAN NOT NULL DEFAULT false,
    "fireRatedFailSafeRequired" BOOLEAN NOT NULL DEFAULT true,
    "fireRatedCloserRequired" BOOLEAN NOT NULL DEFAULT true,
    "facpTieInRequired" BOOLEAN NOT NULL DEFAULT true,
    "stairwellReIlluminationRequired" BOOLEAN NOT NULL DEFAULT false,
    "panicHardwareOnEgressDoors" BOOLEAN NOT NULL DEFAULT true,
    "additionalNotes" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mount_configs_manufacturer_idx" ON "mount_configs"("manufacturer");

-- CreateIndex
CREATE UNIQUE INDEX "mount_configs_manufacturer_cameraModel_locationType_key" ON "mount_configs"("manufacturer", "cameraModel", "locationType");

-- CreateIndex
CREATE INDEX "calc_reference_data_category_idx" ON "calc_reference_data"("category");

-- CreateIndex
CREATE UNIQUE INDEX "calc_reference_data_category_key_key" ON "calc_reference_data"("category", "key");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_jurisdictions_stateLabel_key" ON "compliance_jurisdictions"("stateLabel");
