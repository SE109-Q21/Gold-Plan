-- AlterTable: make passwordHash nullable to support OAuth users
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
