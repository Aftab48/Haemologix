/**
 * Resolve the signed-in donor for donor-facing API routes.
 *
 * Most of /api is public (see middleware.ts); routes that act *as* a donor —
 * releasing a commitment, reading their own hold — must not trust a donor_id in
 * the body. Identity comes from the Clerk session: Donor.clerkUserId when it was
 * captured at onboarding, otherwise the session's primary e-mail (Donor.email is
 * unique), which is how the dashboard itself resolves the donor
 * (lib/actions/user.actions.ts getCurrentUser).
 */

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";

export interface SessionDonor {
  id: string;
  name: string;
  email: string;
  bloodGroup: string;
}

export async function resolveSessionDonor(): Promise<SessionDonor | null> {
  const user = await currentUser().catch(() => null);
  if (!user) return null;
  const select = { id: true, name: true, email: true, bloodGroup: true } as const;
  const byClerk = await db.donor.findFirst({ where: { clerkUserId: user.id }, select });
  if (byClerk) return byClerk;
  const emails = new Set<string>();
  const primary = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress;
  if (primary) emails.add(primary.toLowerCase());
  for (const e of user.emailAddresses ?? []) if (e.emailAddress) emails.add(e.emailAddress.toLowerCase());
  if (emails.size === 0) return null;
  return db.donor.findFirst({ where: { email: { in: [...emails], mode: "insensitive" } }, select });
}
