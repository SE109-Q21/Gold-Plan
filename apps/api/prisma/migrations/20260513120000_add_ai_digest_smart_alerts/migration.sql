-- CreateTable
CREATE TABLE "GoldDigest" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sjcBuyVnd" BIGINT NOT NULL,
    "sjcSellVnd" BIGINT NOT NULL,
    "xauUsd" DOUBLE PRECISION NOT NULL,
    "pctChangeSjc" DOUBLE PRECISION NOT NULL,
    "highlight" TEXT NOT NULL,
    "aiSummary" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoldDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brand" "GoldBrand" NOT NULL,
    "goldType" "GoldType" NOT NULL,
    "condition1" JSONB NOT NULL,
    "condition2" JSONB,
    "status" "AlertStatus" NOT NULL DEFAULT 'active',
    "lastFiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmartAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoldDigest_date_key" ON "GoldDigest"("date");

-- CreateIndex
CREATE INDEX "GoldDigest_date_idx" ON "GoldDigest"("date" DESC);

-- CreateIndex
CREATE INDEX "SmartAlert_userId_status_idx" ON "SmartAlert"("userId", "status");

-- AddForeignKey
ALTER TABLE "SmartAlert" ADD CONSTRAINT "SmartAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
