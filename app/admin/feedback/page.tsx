import { prisma } from "@/db"

export const dynamic = "force-dynamic"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"

async function getFeedback() {
  try {
    return {
      feedback: await prisma.feedback.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
      }),
      unavailable: false,
    }
  } catch (error) {
    console.error("Feedback data is unavailable:", error)
    return { feedback: [], unavailable: true }
  }
}

export default async function AdminFeedbackPage() {
  const { feedback: feedbackList, unavailable } = await getFeedback()

  return (
    <div className="dashboard-surface admin-feedback-page min-h-screen p-6 space-y-6">
      <div className="border-b border-text-dark pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Admin / Listening post</p>
        <h1 className="mt-2 text-4xl font-bold uppercase">User Feedback</h1>
      </div>

      {feedbackList.length === 0 && (
        <Card className="dash-card max-w-2xl">
          <CardContent className="p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary">
              {unavailable ? "Connection / offline" : "Inbox / clear"}
            </p>
            <h2 className="mt-3 text-2xl font-bold uppercase">
              {unavailable ? "Feedback data is temporarily unavailable" : "No feedback submitted yet"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {unavailable
                ? "The admin workspace is ready. Feedback will appear here when the data service reconnects."
                : "New product feedback will be collected here for review."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {feedbackList.map((fb) => (
          <Card key={fb.id} className="dash-card dash-card-interactive">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="text-lg">
                {fb.type} • {fb.role}
              </CardTitle>
              <Badge
                variant={
                  fb.status === "OPEN"
                    ? "destructive"
                    : fb.status === "IN_REVIEW"
                    ? "secondary"
                    : "default"
                }
              >
                {fb.status}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                From: {fb.user?.email}
              </p>

              <p>{fb.message}</p>

              {fb.screenshot && (
                <Image
                  src={fb.screenshot}
                  alt="User-submitted feedback screenshot"
                  width={1024}
                  height={768}
                  unoptimized
                  className="rounded-md border max-h-64 w-auto h-auto"
                />
              )}

              <div className="flex gap-2">
                <form action={`/api/feedback/${fb.id}/review`} method="POST">
                  <Button size="sm" variant="secondary">
                    Mark In Review
                  </Button>
                </form>

                <form action={`/api/feedback/${fb.id}/review/resolve`} method="POST">
                  <Button size="sm">Mark Resolved</Button>
                </form>
              </div>

              <p className="text-xs text-muted-foreground">
                Submitted: {new Date(fb.createdAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
