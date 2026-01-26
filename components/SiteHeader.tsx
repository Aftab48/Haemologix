"use client"

import Link from "next/link"
import { useState } from "react"
import FeedbackForm from "@/components/feedback/FeedbackForm"

export default function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="w-full border-b bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Logo / Brand */}
          <Link href="/" className="text-xl font-bold text-red-600">
            HaemoLogix
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex gap-6 items-center text-sm font-medium">
            <Link href="/blood-donation">Donate</Link>
            <Link href="/find-blood-donor">Find Donor</Link>
            <Link href="/hospital">Hospital</Link>
            <Link href="/contact">Contact</Link>

            {/* Feedback Button */}
            <button
              onClick={() => setOpen(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
            >
              Give Feedback
            </button>
          </nav>
        </div>
      </header>

      {/* Feedback Modal */}
      <FeedbackForm open={open} onOpenChange={setOpen} />
    </>
  )
}
