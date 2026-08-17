import { NextRequest, NextResponse } from "next/server";
import { isCareersAdmin } from "@/lib/careers/auth";
import { careersDb } from "@/lib/careers/db";
import { careersApiError, unauthorizedCareersResponse } from "@/lib/careers/responses";
import { jobPostingInputSchema, normalizeJobInput } from "@/lib/careers/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  if (!(await isCareersAdmin())) return unauthorizedCareersResponse();

  try {
    const { id } = await params;
    const input = jobPostingInputSchema.parse(await request.json());
    const job = await careersDb.jobPosting.update({
      where: { id },
      data: normalizeJobInput(input),
    });
    return NextResponse.json({ job });
  } catch (error) {
    return careersApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  if (!(await isCareersAdmin())) return unauthorizedCareersResponse();

  try {
    const { id } = await params;
    await careersDb.jobPosting.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return careersApiError(error);
  }
}
