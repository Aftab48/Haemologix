import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

/**
 * Pilot Request API Endpoint
 * Handles pilot program registration requests from hospitals and blood banks
 */

interface PilotRequestData {
  hospitalName: string;
  contactPerson: string;
  email: string;
  phone: string;
  location: string;
  hasBloodBank: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      hospitalName,
      contactPerson,
      email,
      phone,
      location,
      hasBloodBank,
    }: PilotRequestData = body;

    // Validate required fields
    if (!hospitalName || !contactPerson || !email || !phone || !location) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: hospitalName, contactPerson, email, phone, location",
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

    // Validate hasBloodBank is boolean
    if (typeof hasBloodBank !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "hasBloodBank must be a boolean value",
        },
        { status: 400 }
      );
    }

    // Save pilot request to database
    const pilotRequest = await db.pilotRequest.create({
      data: {
        hospitalName,
        contactPerson,
        email,
        phone,
        location,
        hasBloodBank,
      },
    });

    // TODO: In production, you would:
    // 1. Send notification email to admin
    // 2. Send confirmation email to requester

    return NextResponse.json({
      success: true,
      message: "Pilot request submitted successfully. We'll contact you soon!",
      data: pilotRequest,
    });
  } catch (error) {
    console.error("[Pilot Request API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again later.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where = status ? { status } : {};

    const requests = await db.pilotRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("[Pilot Request API] GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again later.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "id and status are required",
        },
        { status: 400 }
      );
    }

    const validStatuses = ["PENDING", "CONTACTED", "APPROVED", "REJECTED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Status must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updatedRequest = await db.pilotRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: "Request status updated successfully",
    });
  } catch (error) {
    console.error("[Pilot Request API] PUT Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again later.",
      },
      { status: 500 }
    );
  }
}

