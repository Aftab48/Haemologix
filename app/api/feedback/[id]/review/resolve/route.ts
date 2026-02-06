import { prisma } from "@/db"
import { NextResponse } from "next/server"

export async function POST(_: Request, { params }: { params: { id: string } }) {
  await prisma.feedback.update({
    where: { id: params.id },
    data: { status: "RESOLVED" },
  })

  return NextResponse.redirect("/admin/feedback")
}
