-- CreateTable
CREATE TABLE "ArbitrageSnapshot" (
    "id" TEXT NOT NULL,
    "goldType" "GoldType" NOT NULL,
    "buyBrand" "GoldBrand" NOT NULL,
    "sellBrand" "GoldBrand" NOT NULL,
    "grossProfit" BIGINT NOT NULL,
    "profitPercent" DECIMAL(6,3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArbitrageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArbitrageSnapshot_goldType_recordedAt_idx" ON "ArbitrageSnapshot"("goldType", "recordedAt");
