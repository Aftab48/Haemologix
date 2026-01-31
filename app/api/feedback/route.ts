import { NextResponse } from "next/server"
import { prisma } from "@/db" // adjust if prisma export path is different
import { auth } from "@clerk/nextjs/server"

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = auth()

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { type, message, screenshot } = body

    if (!type || !message) {
      return NextResponse.json(
        { error: "Type and message are required" },
        { status: 400 }
      )
    }

    // Find internal user from Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        role: user.role, // auto-detect role
        type,
        message,
        screenshot: screenshot || null,
      },
    })

    return NextResponse.json({ success: true, feedback })
  } catch (error) {
    console.error("Feedback Error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
