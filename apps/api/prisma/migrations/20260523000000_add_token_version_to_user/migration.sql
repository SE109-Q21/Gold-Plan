-- AlterTable: add token versioning for logout revocation
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- DropTable: MorningDigest (orphaned — no code reads this table)
DROP TABLE IF EXISTS "MorningDigest";

-- DropTable: BehavioralEvent (write-only dead table — viewCount in UserPreference serves the same purpose)
DROP TABLE IF EXISTS "BehavioralEvent";
