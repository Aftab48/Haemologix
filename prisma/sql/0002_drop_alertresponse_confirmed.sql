-- haemologix-main :: drop AlertResponse."confirmed"
--
-- The column was a denormalization of `status`: every writer set it to
-- `status === 'CONFIRMED'` in the same statement, so it carried no information
-- of its own while leaving room for the two to drift. Reads now derive it from
-- `status` (see lib/actions/alerts.actions.ts).
--
-- Not to be confused with DonorResponseHistory."confirmed", which is a distinct
-- fact — the hospital verified the donor physically arrived — and stays.
--
-- Run *after* the code that stops writing the column is deployed, otherwise
-- in-flight writes from the old build fail on the missing column:
--   psql "$DATABASE_URL" -f prisma/sql/0002_drop_alertresponse_confirmed.sql
--
-- Safe to re-run.

BEGIN;

ALTER TABLE "AlertResponse" DROP COLUMN IF EXISTS "confirmed";

COMMIT;
