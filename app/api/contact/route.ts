import { NextRequest, NextResponse } from "next/server";
import {
  sendContactAdminNotification,
  sendContactUserConfirmation,
} from "@/lib/actions/mails.actions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message, acceptTerms } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Name, email, and message are required fields.",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email format",
        },
        { status: 400 }
      );
    }

    // Validate terms acceptance
    if (!acceptTerms) {
      return NextResponse.json(
        {
          success: false,
          error: "You must accept the Terms of Service to submit the form.",
        },
        { status: 400 }
      );
    }

    // Send both emails using the mail actions
    await Promise.all([
      sendContactAdminNotification({ name, email, message }),
      sendContactUserConfirmation({ name, email, message }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Thank you for contacting us! We'll get back to you soon.",
    });
  } catch (error) {
    console.error("[Contact Form API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send message. Please try again later or contact us directly.",
      },
      { status: 500 }
    );
  }
}

