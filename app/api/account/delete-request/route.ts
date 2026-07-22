import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  sendDeletionRequestAdminNotification,
  sendDeletionRequestUserConfirmation,
} from "@/lib/actions/mails.actions";

/**
 * Records a request to delete an account and its associated data.
 *
 * This endpoint is intentionally public — Google Play requires the deletion
 * request path to be reachable without signing in. Because the submitter is
 * therefore unauthenticated, this route never deletes anything: it records the
 * request and notifies the admin team, who verify ownership before acting.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, phone, reason, confirm } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (!confirm) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must confirm that you understand this request permanently deletes your account.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Collapse repeat submissions so one person spamming the form does not
    // create a queue of duplicate rows for the admin team to work through.
    const existing = await db.accountDeletionRequest.findFirst({
      where: { email: normalizedEmail, status: "PENDING" },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        requestId: existing.id,
        message:
          "A deletion request for this email is already in progress. We will complete it within 30 days.",
      });
    }

    const request = await db.accountDeletionRequest.create({
      data: {
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        reason: reason ? String(reason).trim() : null,
      },
    });

    const requestedAt = request.requestedAt.toISOString();

    // Email failures must not lose the request — it is already persisted, and
    // the admin team can still find it in the dashboard.
    try {
      await Promise.all([
        sendDeletionRequestAdminNotification({
          requestId: request.id,
          email: request.email,
          phone: request.phone,
          reason: request.reason,
          requestedAt,
        }),
        sendDeletionRequestUserConfirmation({
          requestId: request.id,
          email: request.email,
          requestedAt,
        }),
      ]);
    } catch (mailError) {
      console.error(
        "[Account Deletion API] Request saved but email failed:",
        mailError
      );
    }

    return NextResponse.json({
      success: true,
      requestId: request.id,
      message:
        "Your deletion request has been received. We will verify it and complete the deletion within 30 days.",
    });
  } catch (error) {
    console.error("[Account Deletion API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to submit your request. Please try again later, or email us directly at haemologix@gmail.com.",
      },
      { status: 500 }
    );
  }
}
