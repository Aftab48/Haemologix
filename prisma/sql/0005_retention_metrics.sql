-- haemologix-main :: eligibility-adjusted retention metrics
--
-- Implements the section 1.2 definitions in marketing-plan/2-retention-loop.md
-- on top of 0004's BloodDonationEvent / DeferralEvent / Donor.sexForInterval.
--
--   "DonorEligibilityWindow"   one row per donation n: E_n = D_n + interval
--                              (90 days MALE, 120 otherwise), the next donation
--                              and return_gap_days = D_(n+1) - E_n.
--   haemologix_return_rate(N)  RN-E per sex: of the windows whose E_n + N has
--                              passed (matured) and that were not deferred during
--                              [E_n, E_n + N], the share that donated again
--                              within N days of E_n. Early returns (donated
--                              before E_n) are a data-quality flag, reported
--                              apart and left out of the rate.
--
--   SELECT * FROM haemologix_return_rate(60);   -- R60-E, the headline metric
--
-- Read-only objects: nothing in the app depends on them. Safe to re-run.
--   npx prisma db execute --file prisma/sql/0005_retention_metrics.sql --schema prisma/schema.prisma
-- Apply to the production database AND to the ML database (ml/.env).

BEGIN;

CREATE OR REPLACE VIEW "DonorEligibilityWindow" AS
SELECT w."donorId",
       w."sexForInterval",
       w.donation_number,
       w."donatedAt",
       w.eligible_at,
       w.next_donated_at,
       (w.next_donated_at::date - w.eligible_at::date) AS return_gap_days
FROM (
  SELECT e."donorId",
         d."sexForInterval",
         ROW_NUMBER() OVER (PARTITION BY e."donorId" ORDER BY e."donatedAt") AS donation_number,
         e."donatedAt",
         e."donatedAt" + CASE WHEN d."sexForInterval" = 'MALE' THEN INTERVAL '90 days' ELSE INTERVAL '120 days' END AS eligible_at,
         LEAD(e."donatedAt") OVER (PARTITION BY e."donorId" ORDER BY e."donatedAt") AS next_donated_at
  FROM "BloodDonationEvent" e
  JOIN "Donor" d ON d.id = e."donorId"
) w;

CREATE OR REPLACE FUNCTION haemologix_return_rate(n_days INT, as_of TIMESTAMP DEFAULT now())
RETURNS TABLE (
  "sexForInterval" "SexForInterval",
  matured_windows  BIGINT,
  returned         BIGINT,
  rate             NUMERIC,
  early_returns    BIGINT,
  median_return_gap_days NUMERIC
)
LANGUAGE sql STABLE AS $$
  WITH windows AS (
    SELECT w.*,
           -- Deferred at any point in [E_n, E_n + N]. An open deferral with no
           -- date (permanent, or not yet given) runs until it is cleared.
           EXISTS (
             SELECT 1 FROM "DeferralEvent" f
             WHERE f."donorId" = w."donorId"
               AND f."deferredAt" <= w.eligible_at + make_interval(days => n_days)
               AND COALESCE(f."clearedAt",
                            CASE WHEN f.category = 'PERMANENT' THEN NULL ELSE f."recheckDate" END,
                            'infinity'::timestamp) >= w.eligible_at
           ) AS deferred_in_window
    FROM "DonorEligibilityWindow" w
    WHERE w.eligible_at + make_interval(days => n_days) <= as_of
  )
  SELECT w."sexForInterval",
         COUNT(*) FILTER (WHERE w.return_gap_days IS NULL OR w.return_gap_days >= 0),
         COUNT(*) FILTER (WHERE w.return_gap_days BETWEEN 0 AND n_days),
         ROUND(
           COUNT(*) FILTER (WHERE w.return_gap_days BETWEEN 0 AND n_days)::numeric
             / NULLIF(COUNT(*) FILTER (WHERE w.return_gap_days IS NULL OR w.return_gap_days >= 0), 0),
           4),
         COUNT(*) FILTER (WHERE w.return_gap_days < 0),
         percentile_cont(0.5) WITHIN GROUP (ORDER BY w.return_gap_days)
           FILTER (WHERE w.return_gap_days >= 0)::numeric
  FROM windows w
  WHERE NOT w.deferred_in_window
  GROUP BY w."sexForInterval"
  ORDER BY w."sexForInterval"
$$;

COMMIT;
