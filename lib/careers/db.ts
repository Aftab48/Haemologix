import { PrismaClient } from "@/lib/generated/careers";

const globalForCareers = globalThis as unknown as {
  careersDb?: PrismaClient;
};

/**
 * Build the client on first use, not at import time. `next build` imports
 * every route module while collecting page data — with an eager check the
 * whole build failed on machines (CI) that have no CAREERS_DATABASE_URL, even
 * though nothing touches the careers DB at build time. A missing URL still
 * fails loudly, just on the first query instead of on import.
 */
function getCareersDb(): PrismaClient {
  if (globalForCareers.careersDb) return globalForCareers.careersDb;

  const url = process.env.CAREERS_DATABASE_URL;
  if (!url) {
    throw new Error("CAREERS_DATABASE_URL is required for the careers database.");
  }
  const client = new PrismaClient({ datasourceUrl: url });
  // Cache in dev to survive HMR; in production one module instance is enough
  // but caching is harmless and keeps the singleton across the Proxy calls.
  globalForCareers.careersDb = client;
  return client;
}

/**
 * Lazy singleton: `careersDb.job.findMany()` etc. resolve the real client on
 * first property access.
 */
export const careersDb: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getCareersDb();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
