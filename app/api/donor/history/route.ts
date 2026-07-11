import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

/**
 * API endpoint to get donation history for a donor.
 * Used by the mobile donor app to display past donations.
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
    const history = await db.donorResponseHistory.findMany({
      where: {
        donorId,
        status: {
          in: ["accepted", "confirmed"],
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
      const alertEntry = alertMap.get(item.requestId) as typeof alerts[0] | undefined;
      return {
        id: item.id,
        date: item.respondedAt?.toISOString() || item.notifiedAt.toISOString(),
        hospital: alertEntry?.hospital?.hospitalName || "Unknown Hospital",
        bloodType: alertEntry?.bloodType || item.donor.bloodGroup || "Unknown",
        units: parseInt(alertEntry?.unitsNeeded || "1"),
        status:
          item.confirmed
            ? "Completed"
            : item.status === "accepted"
            ? "Pending"
            : "Completed",
        respondedAt: item.respondedAt?.toISOString(),
        expectedArrival: item.expectedArrival?.toISOString(),
      };
    });

    return NextResponse.json(formattedHistory);
  } catch (error) {
    console.error("[Donation History API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
