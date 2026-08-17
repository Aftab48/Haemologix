import { NextResponse } from "next/server";
import { getPublishedJobs } from "@/lib/careers/queries";
import { careersApiError } from "@/lib/careers/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ jobs: await getPublishedJobs() });
  } catch (error) {
    return careersApiError(error);
  }
}
