//lib/actions/user.actions.ts

"use server";

import { currentUser } from "@clerk/nextjs/server";
import { clerkClient as getClerkClient } from "@clerk/nextjs/server";

/**
 * Mark the logged-in user as having applied
 */
export async function markUserAsApplied() {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");

  const clerk = await getClerkClient();
  await clerk.users.updateUser(user.id, {
    publicMetadata: { hasApplied: true },
  });
}

/**
 * Check if logged-in user has already applied
 */
export async function checkIfUserApplied(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;

  return Boolean(user.publicMetadata?.hasApplied);
}

/**
 * Fetch all users
 */
export async function fetchAllUsers() {
  const clerk = await getClerkClient();
  const { data } = await clerk.users.getUserList({
    limit: 100, // adjust as needed
  });
  return data;
}

/**
 * Fetch user by ID
 */
export async function fetchUserById(userId: string) {
  if (!userId) throw new Error("User ID is required");

  const clerk = await getClerkClient();
  const user = await clerk.users.getUser(userId);
  return user;
}
