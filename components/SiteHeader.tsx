"use client"

import { useState } from "react"
import FeedbackForm from "@/components/feedback/FeedbackForm"
import { Button } from "@/components/ui/button"

export default function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="flex justify-between items-center p-4 bg-white shadow-md">
      <div className="text-xl font-bold">Haemologix</div>

      <div className="flex items-center gap-4">
        {/* Other header items here, e.g., nav links */}

        {/* Feedback button */}
        <Button onClick={() => setOpen(true)} variant="secondary">
          Give Feedback
        </Button>

        {/* Feedback modal */}
        <FeedbackForm open={open} onOpenChange={setOpen} />
      </div>
    </header>
  )
}
