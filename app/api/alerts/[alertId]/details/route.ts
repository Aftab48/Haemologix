import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  void req;

  try {
    const { alertId } = await params;

    if (!alertId) {
      return NextResponse.json(
        { success: false, error: "Alert ID is required" },
        { status: 400 }
      );
    }

    // Fetch alert data
    const alert = await db.alert.findUnique({
      where: { id: alertId },
      include: {
        hospital: true,
        responses: {
          include: {
            donor: true,
          },
        },
      },
    });

    if (!alert) {
      return NextResponse.json(
        { success: false, error: "Alert not found" },
        { status: 404 }
      );
    }

    // Fetch workflow state
    const workflowState = await db.workflowState.findUnique({
      where: { requestId: alertId },
    });

    // Per-donor commitment state (arrival / no-show / release) lives on
    // DonorResponseHistory, not on AlertResponse — merge the latest row per donor
    // so the page can show "Arrived", "Released", "No-show" and offer release.
    const historyRows = await db.donorResponseHistory.findMany({
      where: { requestId: alertId, donorId: { in: alert.responses.map((r) => r.donorId) } },
      orderBy: { notifiedAt: "desc" },
      select: {
        donorId: true, status: true, confirmed: true, noShow: true, arrivedAt: true, expectedArrival: true,
        respondedAt: true, releasedAt: true, releasedBy: true, releaseReason: true, releaseNote: true,
      },
    });
    const historyByDonor = new Map<string, (typeof historyRows)[number]>();
    for (const h of historyRows) if (!historyByDonor.has(h.donorId)) historyByDonor.set(h.donorId, h);

    // Fetch agent decisions
    const agentDecisions = await db.agentDecision.findMany({
      where: { requestId: alertId },
      orderBy: { createdAt: "asc" },
    });

    // Fetch agent events
    const agentEvents = await db.agentEvent.findMany({
      where: {
        payload: {
          path: ["id"],
          equals: alertId,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Fetch transport request if exists
    const transportRequest = await db.transportRequest.findFirst({
      where: {
        OR: [
          { toHospitalId: alert.hospitalId },
          { fromHospitalId: alert.hospitalId },
        ],
      },
      include: {
        fromHospital: true,
        toHospital: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Check if inventory was matched (from workflow metadata)
    let inventoryMatch = null;
    if (
      workflowState?.metadata &&
      typeof workflowState.metadata === "object" &&
      !Array.isArray(workflowState.metadata)
    ) {
      const metadata = workflowState.metadata as Record<string, unknown>;
      if (metadata.inventory_source && transportRequest) {
        inventoryMatch = transportRequest;
      }
    }

    return NextResponse.json({
      success: true,
      alert: {
        ...alert,
        createdAt: alert.createdAt.toISOString(),
        updatedAt: alert.updatedAt.toISOString(),
      },
      workflowState: workflowState
        ? {
            ...workflowState,
            createdAt: workflowState.createdAt.toISOString(),
            updatedAt: workflowState.updatedAt.toISOString(),
          }
        : null,
      agentDecisions: agentDecisions.map((decision) => ({
        ...decision,
        createdAt: decision.createdAt.toISOString(),
      })),
      agentEvents: agentEvents.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
      donorResponses: alert.responses.map((response) => {
        const h = historyByDonor.get(response.donorId);
        const committed = Boolean(h && h.status === "accepted" && !h.confirmed && !h.noShow && !h.releasedAt);
        return {
          ...response,
          createdAt: response.createdAt.toISOString(),
          commitment: h
            ? {
                historyStatus: h.status,
                confirmed: h.confirmed,
                noShow: h.noShow,
                committed,
                arrivedAt: h.arrivedAt?.toISOString() ?? null,
                expectedArrival: h.expectedArrival?.toISOString() ?? null,
                respondedAt: h.respondedAt?.toISOString() ?? null,
                releasedAt: h.releasedAt?.toISOString() ?? null,
                releasedBy: h.releasedBy,
                releaseReason: h.releaseReason,
                releaseNote: h.releaseNote,
              }
            : null,
        };
      }),
      inventoryMatch,
      transportRequest: transportRequest
        ? {
            ...transportRequest,
            createdAt: transportRequest.createdAt.toISOString(),
            updatedAt: transportRequest.updatedAt.toISOString(),
            eta: transportRequest.eta?.toISOString(),
            pickupTime: transportRequest.pickupTime?.toISOString(),
            deliveryTime: transportRequest.deliveryTime?.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error("[API] Error fetching alert details:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
