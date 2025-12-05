import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

/**
 * API endpoint to get donation history for a donor
 * Used by the mobile donor app to display past donations
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const donorId = searchParams.get("donorId");

    if (!donorId) {
      return NextResponse.json(
        { success: false, error: "donorId is required" },
        { status: 400 }
      );
    }

    // Fetch donation history from DonorResponseHistory
    // Only include accepted/completed donations
    const history = await db.donorResponseHistory.findMany({
      where: {
        donorId,
        status: {
          in: ["accepted", "confirmed"], // Include both accepted and confirmed statuses
        },
      },
      include: {
        donor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            bloodGroup: true,
          },
        },
      },
      orderBy: {
        respondedAt: "desc",
      },
    });

    // Batch fetch all alerts at once for better performance
    const alertIds = [...new Set(history.map((item) => item.requestId))];
    const alerts = await db.alert.findMany({
      where: {
        id: {
          in: alertIds,
        },
      },
      include: {
        hospital: {
          select: {
            hospitalName: true,
            hospitalAddress: true,
          },
        },
      },
    });

    // Create a map for quick lookup
    const alertMap = new Map(alerts.map((alert) => [alert.id, alert]));

    // Format history with alert details
    const formattedHistory = history.map((item) => {
      const alert = alertMap.get(item.requestId);

      return {
        id: item.id,
        date: item.respondedAt?.toISOString() || item.notifiedAt.toISOString(),
        hospital: alert?.hospital?.hospitalName || "Unknown Hospital",
        bloodType: alert?.bloodType || item.donor.bloodGroup || "Unknown",
        units: parseInt(alert?.unitsNeeded || "1"),
        status: item.confirmed ? "Completed" : item.status === "accepted" ? "Pending" : "Completed",
        respondedAt: item.respondedAt?.toISOString(),
        expectedArrival: item.expectedArrival?.toISOString(),
      };
    });

    return NextResponse.json(formattedHistory);
  } catch (error: any) {
    console.error("[Donation History API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

