"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function FeedbackForm({ open, onOpenChange }: Props) {
  const [type, setType] = useState("")
  const [message, setMessage] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!type || !message) {
      toast.error("Please fill all required fields")
      return
    }

    setLoading(true)

    try {
      let screenshotUrl = null

      // 👉 If screenshot selected, upload (you can connect S3 later)
      if (file) {
        const formData = new FormData()
        formData.append("file", file)

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        const uploadData = await uploadRes.json()
        screenshotUrl = uploadData.url
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message,
          screenshot: screenshotUrl,
        }),
      })

      if (!res.ok) throw new Error("Failed")

      toast.success("Feedback submitted 💙")
      setMessage("")
      setType("")
      setFile(null)
      onOpenChange(false)
    } catch (err) {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Give Feedback</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Select onValueChange={setType} value={type}>
            <SelectTrigger>
              <SelectValue placeholder="Select feedback type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUG">Bug</SelectItem>
              <SelectItem value="SUGGESTION">Suggestion</SelectItem>
              <SelectItem value="EXPERIENCE">Experience</SelectItem>
              <SelectItem value="EMERGENCY">Emergency Issue</SelectItem>
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Describe your issue or suggestion..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
