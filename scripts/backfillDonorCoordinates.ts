/**
 * Backfill `Donor.latitude/longitude` for donors created before onboarding
 * started geocoding.
 *
 * Why it matters: the matching agent discards any donor it cannot place, so a
 * donor without coordinates is invisible to every alert no matter how well they
 * match on blood group or distance.
 *
 * Safe to re-run — donors that already have coordinates are skipped.
 *
 * Run with: npx tsx scripts/backfillDonorCoordinates.ts [--dry-run]
 */

import { db } from "@/db";
import { geocodeDonorAddress } from "@/lib/geocoding";

const dryRun = process.argv.includes("--dry-run");

// Nominatim's usage policy is one request per second; going faster gets the
// caller blocked, which would leave the backfill half-done.
const RATE_LIMIT_MS = 1100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const donors = await db.donor.findMany({
    where: { OR: [{ latitude: null }, { longitude: null }] },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
    },
  });

  console.log(
    `${donors.length} donor(s) without coordinates${dryRun ? " (dry run)" : ""}\n`
  );

  let filled = 0;
  let failed = 0;

  for (const donor of donors) {
    try {
      const coords = await geocodeDonorAddress(donor);

      if (!dryRun) {
        await db.donor.update({
          where: { id: donor.id },
          data: { latitude: coords.latitude, longitude: coords.longitude },
        });
      }

      filled += 1;
      console.log(
        `  OK   ${donor.name} -> ${coords.latitude}, ${coords.longitude} (${coords.precision})`
      );
    } catch (error) {
      failed += 1;
      console.warn(
        `  FAIL ${donor.name} (${donor.city}, ${donor.pincode}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // The cascade may have issued several lookups already; pause between donors.
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\nfilled: ${filled}  failed: ${failed}`);

  if (failed > 0) {
    console.log(
      "Donors that failed still cannot be matched. Fix their address, or set " +
        "coordinates by hand, and re-run."
    );
  }
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
