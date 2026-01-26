import FeedbackForm from "@/components/feedback/FeedbackForm"
import { useState } from "react"

const [open, setOpen] = useState(false)

<Button onClick={() => setOpen(true)}>Give Feedback</Button>

<FeedbackForm open={open} onOpenChange={setOpen} />
