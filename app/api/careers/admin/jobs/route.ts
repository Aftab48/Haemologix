import { NextRequest, NextResponse } from "next/server";
import { isCareersAdmin } from "@/lib/careers/auth";
import { careersDb } from "@/lib/careers/db";
import { careersApiError, unauthorizedCareersResponse } from "@/lib/careers/responses";
import { jobPostingInputSchema, normalizeJobInput } from "@/lib/careers/validation";

export async function GET() {
  if (!(await isCareersAdmin())) return unauthorizedCareersResponse();

  try {
    const jobs = await careersDb.jobPosting.findMany({
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json({ jobs });
  } catch (error) {
    return careersApiError(error);
  }
}

export async function POST(request: NextRequest) {
  if (!(await isCareersAdmin())) return unauthorizedCareersResponse();

  try {
    const input = jobPostingInputSchema.parse(await request.json());
    const job = await careersDb.jobPosting.create({ data: normalizeJobInput(input) });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return careersApiError(error);
  }
}
