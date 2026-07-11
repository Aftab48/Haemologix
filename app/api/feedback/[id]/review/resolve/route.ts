import { prisma } from "@/db";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  const { id } = await params;
  await prisma.feedback.update({
    where: { id },
    data: { status: "RESOLVED" },
  });

  return NextResponse.redirect(new URL("/admin/feedback", request.url));
}
