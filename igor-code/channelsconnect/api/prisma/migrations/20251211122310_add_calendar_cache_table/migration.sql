-- CreateTable
CREATE TABLE "calendar" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "price" DECIMAL(10,2),
    "numAvail" INTEGER,
    "minStay" INTEGER,
    "maxStay" INTEGER,
    "override" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_listingId_idx" ON "calendar"("listingId");

-- CreateIndex
CREATE INDEX "calendar_date_idx" ON "calendar"("date");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_listingId_date_key" ON "calendar"("listingId", "date");

-- AddForeignKey
ALTER TABLE "calendar" ADD CONSTRAINT "calendar_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
