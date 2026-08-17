import { Prisma } from "@/lib/generated/careers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function careersApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Check the job details and try again.", issues: error.flatten() },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "That job URL slug is already in use." }, { status: 409 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
  }

  console.error("Careers API error", error);
  return NextResponse.json({ error: "The careers service could not complete that request." }, { status: 500 });
}

export function unauthorizedCareersResponse() {
  return NextResponse.json({ error: "Careers admin authentication required." }, { status: 401 });
}
