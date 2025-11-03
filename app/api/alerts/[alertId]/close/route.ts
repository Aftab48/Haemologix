import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

/**
 * API Endpoint to close an alert with fulfillment details
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const alertId = params.alertId;
    const body = await req.json();
    const { source, donors, externalDonorEmail, otherDetails } = body;

    if (!source) {
      return NextResponse.json(
        { success: false, error: "Fulfillment source is required" },
        { status: 400 }
      );
    }

    // Get the alert
    const alert = await db.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return NextResponse.json(
        { success: false, error: "Alert not found" },
        { status: 404 }
      );
    }

    // Update alert status to FULFILLED
    await db.alert.update({
      where: { id: alertId },
      data: {
        status: "FULFILLED",
      },
    });

    // Update workflow state
    await db.workflowState.update({
      where: { requestId: alertId },
      data: {
        status: "fulfilled",
        currentStep: "completed",
        metadata: {
          ...(
            (await db.workflowState.findUnique({ where: { requestId: alertId } }))
              ?.metadata as object
          ),
          fulfilled_at: new Date().toISOString(),
          fulfillment_source: source,
          fulfillment_donors: donors || [],
          external_donor_email: externalDonorEmail || null,
          fulfillment_details: otherDetails || null,
        },
      },
    });

    console.log(`[CloseAlert] Alert ${alertId} closed successfully via ${source}`);

    return NextResponse.json({
      success: true,
      message: "Alert closed successfully",
    });
  } catch (error) {
    console.error("[CloseAlert] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

