import { prisma } from "@/db"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

async function getFeedback() {
  return await prisma.feedback.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  })
}

export default async function AdminFeedbackPage() {
  const feedbackList = await getFeedback()

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">User Feedback</h1>

      {feedbackList.length === 0 && (
        <p className="text-muted-foreground">No feedback submitted yet.</p>
      )}

      <div className="grid gap-4">
        {feedbackList.map((fb) => (
          <Card key={fb.id}>
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
                <img
                  src={fb.screenshot}
                  alt="Screenshot"
                  className="rounded-md border max-h-64"
                />
              )}

              <div className="flex gap-2">
                <form action={`/api/feedback/${fb.id}/review`} method="POST">
                  <Button size="sm" variant="secondary">
                    Mark In Review
                  </Button>
                </form>

                <form action={`/api/feedback/${fb.id}/resolve`} method="POST">
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
