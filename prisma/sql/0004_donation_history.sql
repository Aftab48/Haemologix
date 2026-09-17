-- haemologix-main :: donation history, deferrals, sex for the donation interval
--
-- 1. Donor."sexForInterval" (MALE / FEMALE / UNKNOWN) decides the 90 vs 120-day
--    gap and the haemoglobin cutoff. It is kept apart from "gender" (identity)
--    and derived from it by a trigger, so every writer — this app, app-backend,
--    the donor app — gets it without code changes. "M", "Male ", etc. normalise;
--    anything unrecognised stays UNKNOWN, which the rules treat like FEMALE
--    (the longer, safer gap). An explicit write to the column wins.
--
-- 2. "BloodDonationEvent" — one row per whole-blood donation, so return rates
--    can be measured (Donor."lastDonationDate" is a single overwritten value).
--    Filled by triggers, again so no writer can forget:
--      * a hospital confirms a donor (DonorResponseHistory.confirmed)  → HOSPITAL_CONFIRMED
--      * Donor."lastDonationDate" moves (onboarding, profile edits,
--        "donated recently" releases)                                   → SELF_REPORT
--    The app-backend sweep copies confirmed donations into lastDonationDate;
--    those are recognised and not logged twice. Moving lastDonationDate
--    earlier (or clearing it) is a correction and removes the self-report it
--    replaced. At most one donation per donor per day.
--
-- 3. "DeferralEvent" — a donor turned away at screening, with a category and
--    re-check date only (no haemoglobin values). Written by the app.
--
-- Run BEFORE deploying the code that uses these: the regenerated Prisma client
-- selects Donor."sexForInterval" on every donor read.
--   npx prisma db execute --file prisma/sql/0004_donation_history.sql --schema prisma/schema.prisma
-- Apply to the production database AND to the ML database (ml/.env).
--
-- Safe to re-run. Requires PostgreSQL 13+ (gen_random_uuid).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. sexForInterval
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "SexForInterval" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Donor" ADD COLUMN IF NOT EXISTS "sexForInterval" "SexForInterval" NOT NULL DEFAULT 'UNKNOWN';

CREATE OR REPLACE FUNCTION haemologix_sex_from_gender(g TEXT) RETURNS "SexForInterval"
LANGUAGE sql STABLE AS $$
  SELECT (CASE lower(btrim(coalesce(g, '')))
    WHEN 'male'   THEN 'MALE'
    WHEN 'm'      THEN 'MALE'
    WHEN 'man'    THEN 'MALE'
    WHEN 'female' THEN 'FEMALE'
    WHEN 'f'      THEN 'FEMALE'
    WHEN 'woman'  THEN 'FEMALE'
    ELSE 'UNKNOWN'
  END)::"SexForInterval"
$$;

CREATE OR REPLACE FUNCTION haemologix_set_sex_for_interval() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW."sexForInterval" = 'UNKNOWN')
     OR (TG_OP = 'UPDATE' AND NEW."sexForInterval" IS NOT DISTINCT FROM OLD."sexForInterval") THEN
    NEW."sexForInterval" := haemologix_sex_from_gender(NEW.gender);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS donor_sex_for_interval ON "Donor";
CREATE TRIGGER donor_sex_for_interval
  BEFORE INSERT OR UPDATE OF gender ON "Donor"
  FOR EACH ROW EXECUTE FUNCTION haemologix_set_sex_for_interval();

UPDATE "Donor" SET "sexForInterval" = haemologix_sex_from_gender(gender)
WHERE "sexForInterval" = 'UNKNOWN';

-- ---------------------------------------------------------------------------
-- 2. BloodDonationEvent
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "DonationSource" AS ENUM ('SELF_REPORT', 'HOSPITAL_CONFIRMED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "BloodDonationEvent" (
  "id"        TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  "donorId"   TEXT             NOT NULL,
  "donatedAt" TIMESTAMP(3)     NOT NULL,
  "source"    "DonationSource" NOT NULL,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BloodDonationEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BloodDonationEvent_donorId_fkey" FOREIGN KEY ("donorId")
    REFERENCES "Donor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- One whole-blood donation per donor per day. Also what stops the two
-- triggers below from logging the same donation twice.
CREATE UNIQUE INDEX IF NOT EXISTS "BloodDonationEvent_donorId_day_key"
  ON "BloodDonationEvent" ("donorId", (("donatedAt")::date));

-- A response row counts as a donation exactly when the app-backend sweep says so.
CREATE OR REPLACE FUNCTION haemologix_log_confirmed_donation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT (NEW.confirmed OR NEW.status = 'confirmed') THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD.confirmed OR OLD.status = 'confirmed') THEN
    RETURN NULL;
  END IF;
  INSERT INTO "BloodDonationEvent" ("donorId", "donatedAt", "source", "requestId")
  VALUES (NEW."donorId", COALESCE(NEW."arrivedAt", NEW."respondedAt", NEW."notifiedAt"), 'HOSPITAL_CONFIRMED', NEW."requestId")
  -- The donor may have self-reported the same day: the hospital's word wins.
  ON CONFLICT ("donorId", (("donatedAt")::date))
  DO UPDATE SET "source" = 'HOSPITAL_CONFIRMED', "requestId" = EXCLUDED."requestId";
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS donor_response_logs_donation ON "DonorResponseHistory";
CREATE TRIGGER donor_response_logs_donation
  AFTER INSERT OR UPDATE OF confirmed, status ON "DonorResponseHistory"
  FOR EACH ROW EXECUTE FUNCTION haemologix_log_confirmed_donation();

CREATE OR REPLACE FUNCTION haemologix_log_self_reported_donation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."lastDonationDate" IS NOT DISTINCT FROM OLD."lastDonationDate" THEN
    RETURN NULL;
  END IF;

  -- Moving the date earlier, or clearing it, corrects the previous self-report.
  IF TG_OP = 'UPDATE' AND OLD."lastDonationDate" IS NOT NULL
     AND (NEW."lastDonationDate" IS NULL OR NEW."lastDonationDate" < OLD."lastDonationDate") THEN
    DELETE FROM "BloodDonationEvent"
    WHERE "donorId" = NEW.id
      AND "donatedAt" = OLD."lastDonationDate"
      AND "source" = 'SELF_REPORT';
  END IF;

  IF NEW."lastDonationDate" IS NULL THEN
    RETURN NULL;
  END IF;

  -- The app-backend sweep stamps lastDonationDate = respondedAt ?? notifiedAt of
  -- a confirmed response. That donation is already logged above.
  IF EXISTS (
    SELECT 1 FROM "DonorResponseHistory" h
    WHERE h."donorId" = NEW.id
      AND (h.confirmed OR h.status = 'confirmed')
      AND COALESCE(h."respondedAt", h."notifiedAt") = NEW."lastDonationDate"
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO "BloodDonationEvent" ("donorId", "donatedAt", "source")
  VALUES (NEW.id, NEW."lastDonationDate", 'SELF_REPORT')
  ON CONFLICT DO NOTHING;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS donor_logs_self_reported_donation ON "Donor";
CREATE TRIGGER donor_logs_self_reported_donation
  AFTER INSERT OR UPDATE OF "lastDonationDate" ON "Donor"
  FOR EACH ROW EXECUTE FUNCTION haemologix_log_self_reported_donation();

-- Backfill: confirmed donations first, so a same-day self-report never shadows one.
INSERT INTO "BloodDonationEvent" ("donorId", "donatedAt", "source", "requestId")
SELECT h."donorId", COALESCE(h."arrivedAt", h."respondedAt", h."notifiedAt"), 'HOSPITAL_CONFIRMED', h."requestId"
FROM   "DonorResponseHistory" h
WHERE  h.confirmed OR h.status = 'confirmed'
ON CONFLICT DO NOTHING;

INSERT INTO "BloodDonationEvent" ("donorId", "donatedAt", "source")
SELECT d.id, d."lastDonationDate", 'SELF_REPORT'
FROM   "Donor" d
WHERE  d."lastDonationDate" IS NOT NULL
  AND  NOT EXISTS (
         SELECT 1 FROM "DonorResponseHistory" h
         WHERE h."donorId" = d.id
           AND (h.confirmed OR h.status = 'confirmed')
           AND COALESCE(h."respondedAt", h."notifiedAt") = d."lastDonationDate"
       )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. DeferralEvent
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "DeferralCategory" AS ENUM ('LOW_HB', 'OTHER_TEMPORARY', 'PERMANENT', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DeferralEvent" (
  "id"          TEXT               NOT NULL,
  "donorId"     TEXT               NOT NULL,
  "deferredAt"  TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "category"    "DeferralCategory" NOT NULL,
  "recheckDate" TIMESTAMP(3),
  "clearedAt"   TIMESTAMP(3),
  "source"      TEXT               NOT NULL,
  "requestId"   TEXT,
  "createdAt"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeferralEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeferralEvent_donorId_fkey" FOREIGN KEY ("donorId")
    REFERENCES "Donor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DeferralEvent_donorId_idx" ON "DeferralEvent" ("donorId");

COMMIT;
