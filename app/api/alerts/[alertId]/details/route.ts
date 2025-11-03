import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
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
        } as any,
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
    if (workflowState?.metadata && typeof workflowState.metadata === 'object') {
      const metadata = workflowState.metadata as any;
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
      donorResponses: alert.responses.map((response) => ({
        ...response,
        createdAt: response.createdAt.toISOString(),
      })),
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
        error: String(error),
      },
      { status: 500 }
    );
  }
}

