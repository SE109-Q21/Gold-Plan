-- Drop existing foreign key and re-create with ON DELETE CASCADE
-- so deleting a PriceAlert also removes its AlertTriggerHistory rows.
ALTER TABLE "AlertTriggerHistory" DROP CONSTRAINT IF EXISTS "AlertTriggerHistory_alertId_fkey";
ALTER TABLE "AlertTriggerHistory" ADD CONSTRAINT "AlertTriggerHistory_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "PriceAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
