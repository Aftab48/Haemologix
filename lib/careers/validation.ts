import { z } from "zod";

const optionalUrl = z.union([z.literal(""), z.string().trim().url().max(2048)]).optional().nullable();
const optionalEmail = z.union([z.literal(""), z.string().trim().email().max(254)]).optional().nullable();
const optionalDate = z.union([z.literal(""), z.string().datetime(), z.null()]).optional();

export const jobPostingInputSchema = z
  .object({
    slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1).max(160),
    team: z.string().trim().min(1).max(100),
    location: z.string().trim().min(1).max(160),
    summary: z.string().trim().min(1).max(300),
    description: z.string().trim().min(1).max(50_000),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]),
    workplaceType: z.enum(["ON_SITE", "HYBRID", "REMOTE"]),
    applicationUrl: optionalUrl,
    applicationEmail: optionalEmail,
    status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]),
    publishedAt: optionalDate,
    closesAt: optionalDate,
    sortOrder: z.coerce.number().int().min(-10_000).max(10_000).default(0),
  })
  .superRefine((value, context) => {
    if (value.status === "PUBLISHED" && !value.applicationUrl && !value.applicationEmail) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["applicationEmail"],
        message: "Add an application URL or email before publishing.",
      });
    }
    if (value.publishedAt && value.closesAt && new Date(value.closesAt) <= new Date(value.publishedAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["closesAt"],
        message: "Closing time must be after publishing time.",
      });
    }
  });

export type JobPostingInput = z.infer<typeof jobPostingInputSchema>;

export function normalizeJobInput(input: JobPostingInput) {
  return {
    ...input,
    applicationUrl: input.applicationUrl || null,
    applicationEmail: input.applicationEmail || null,
    publishedAt:
      input.status === "PUBLISHED"
        ? input.publishedAt
          ? new Date(input.publishedAt)
          : new Date()
        : input.publishedAt
          ? new Date(input.publishedAt)
          : null,
    closesAt: input.closesAt ? new Date(input.closesAt) : null,
  };
}

export function slugifyJobTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}
