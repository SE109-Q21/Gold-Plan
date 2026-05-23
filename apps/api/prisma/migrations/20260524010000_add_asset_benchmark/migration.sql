-- CreateTable
CREATE TABLE "AssetBenchmark" (
    "id" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetBenchmark_assetType_date_key" ON "AssetBenchmark"("assetType", "date");

-- CreateIndex
CREATE INDEX "AssetBenchmark_assetType_date_idx" ON "AssetBenchmark"("assetType", "date");
