-- CreateTable
CREATE TABLE "AnomalyReview" (
    "id" TEXT NOT NULL,
    "priceRecordId" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnomalyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnomalyReview_priceRecordId_key" ON "AnomalyReview"("priceRecordId");

-- AddForeignKey
ALTER TABLE "AnomalyReview" ADD CONSTRAINT "AnomalyReview_priceRecordId_fkey" FOREIGN KEY ("priceRecordId") REFERENCES "PriceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
