import { NextResponse } from "next/server";
import { getPublishedJobBySlug } from "@/lib/careers/queries";
import { careersApiError } from "@/lib/careers/responses";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const job = await getPublishedJobBySlug(slug);
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json({ job });
  } catch (error) {
    return careersApiError(error);
  }
}
