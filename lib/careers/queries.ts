import "server-only";

import { cache } from "react";
import { careersDb } from "@/lib/careers/db";

const publicJobSelect = {
  id: true,
  slug: true,
  title: true,
  team: true,
  location: true,
  summary: true,
  description: true,
  employmentType: true,
  workplaceType: true,
  applicationUrl: true,
  applicationEmail: true,
  publishedAt: true,
  closesAt: true,
} as const;

function activePublishedWhere(now = new Date()) {
  return {
    status: "PUBLISHED" as const,
    publishedAt: { lte: now },
    OR: [{ closesAt: null }, { closesAt: { gt: now } }],
  };
}

export function getPublishedJobs() {
  return careersDb.jobPosting.findMany({
    where: activePublishedWhere(),
    select: publicJobSelect,
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });
}

export const getPublishedJobBySlug = cache((slug: string) => {
  return careersDb.jobPosting.findFirst({
    where: { slug, ...activePublishedWhere() },
    select: publicJobSelect,
  });
});

export type PublicJob = Awaited<ReturnType<typeof getPublishedJobs>>[number];
