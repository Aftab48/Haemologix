import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  _: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  await prisma.feedback.update({
    where: { id: params.id },
    data: { status: "IN_REVIEW" },
  });

  return NextResponse.redirect("/admin/feedback");
}
