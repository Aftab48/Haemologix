-- haemologix-main :: donor commitment release
--
-- Adds the columns behind the donor "hold": once a donor accepts an alert they
-- are committed to it (excluded from other alerts' matching, cannot accept a
-- second alert) until the hospital confirms arrival, the no-show timer fires,
-- or someone *releases* them — the donor ("I can't make it"), a coordinator, or
-- the system when the alert reaches a terminal state. Release is recorded on
-- DonorResponseHistory and stays distinct from noShow forever:
--
--   noShow      = accepted, did not arrive, did not tell us
--   releasedAt  = accepted, then someone said they are not coming
--
-- The hold itself is *derived* (no Donor column): an accepted row with
-- confirmed=false, noShow=false, "releasedAt" IS NULL is an open commitment.
-- See lib/agents/commitment.ts.
--
-- Run BEFORE deploying the code that uses these columns (the opposite of
-- 0002): as soon as the Prisma client is regenerated every unselected read of
-- DonorResponseHistory SELECTs the new columns and would fail on a database
-- that does not have them yet.
--   psql "$DATABASE_URL" -f prisma/sql/0003_donor_release.sql
-- Apply to the production database AND to the ML database (ml/.env), which the
-- ml scripts read with the same client.
--
-- Safe to re-run.

-- New enum values cannot be used inside the transaction that adds them, so this
-- statement lives outside BEGIN/COMMIT. Requires PostgreSQL 12+.
ALTER TYPE "ResponseStatus" ADD VALUE IF NOT EXISTS 'RELEASED';

BEGIN;

ALTER TABLE "DonorResponseHistory" ADD COLUMN IF NOT EXISTS "releasedAt"    TIMESTAMP(3);
ALTER TABLE "DonorResponseHistory" ADD COLUMN IF NOT EXISTS "releasedBy"    TEXT;
ALTER TABLE "DonorResponseHistory" ADD COLUMN IF NOT EXISTS "releaseReason" TEXT;
ALTER TABLE "DonorResponseHistory" ADD COLUMN IF NOT EXISTS "releaseNote"   TEXT;

-- One-shot backfill so nobody is retroactively put on hold at deploy: legacy
-- accepted rows that were never confirmed or no-showed but whose alert is over.
-- "Over" is deliberately wide — the same condition the scheduler sweep uses:
--   * alert FULFILLED / CLOSED
--   * alert has an outcome (ESCALATED alerts stay open for manual follow-up and
--     never auto-close; their old rows have no expectedArrival, so the no-show
--     timer never fires either)
--   * alert older than the 6 h resolution window
--   * no Alert row at all (requestId carries no FK; orphans exist)
UPDATE "DonorResponseHistory" h
SET    "releasedAt"    = now(),
       "releasedBy"    = 'system',
       "releaseReason" = 'backfill'
WHERE  h.status = 'accepted'
  AND  h.confirmed = false
  AND  h."noShow" = false
  AND  h."releasedAt" IS NULL
  AND  NOT EXISTS (
         SELECT 1 FROM "Alert" a
         WHERE a.id = h."requestId"
           AND a.status NOT IN ('FULFILLED', 'CLOSED')
           AND a.outcome IS NULL
           AND a."createdAt" >= now() - interval '6 hours'
       );

COMMIT;
