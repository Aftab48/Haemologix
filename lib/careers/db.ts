import { PrismaClient } from "@/lib/generated/careers";

if (!process.env.CAREERS_DATABASE_URL) {
  throw new Error("CAREERS_DATABASE_URL is required for the careers database.");
}

const globalForCareers = globalThis as unknown as {
  careersDb?: PrismaClient;
};

export const careersDb =
  globalForCareers.careersDb ??
  new PrismaClient({
    datasourceUrl: process.env.CAREERS_DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForCareers.careersDb = careersDb;
}
