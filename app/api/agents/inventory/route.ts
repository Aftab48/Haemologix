import { NextRequest, NextResponse } from "next/server";
import { processInventorySearch, releaseReservedUnits } from "@/lib/agents/inventoryAgent";

/**
 * Inventory Agent API Endpoint
 * Searches for available blood units across hospital network
 * when donors are unavailable.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, request_id } = body;

    if (!request_id) {
      return NextResponse.json(
        { success: false, error: "request_id is required" },
        { status: 400 }
      );
    }

    console.log(`[InventoryAgent API] Action: ${action || 'search'}, Request: ${request_id}`);

    if (action === "release") {
      // Release reserved units
      await releaseReservedUnits(request_id);
      return NextResponse.json({
        success: true,
        message: "Reserved units released",
      });
    }

    // Default action: search inventory
    const result = await processInventorySearch(request_id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      unitsFound: result.unitsFound,
      reserved: result.reserved,
      message: result.reserved
        ? `Found and reserved ${result.unitsFound} unit(s) from hospital network`
        : `No inventory available in network`,
    });
  } catch (error) {
    console.error("[InventoryAgent API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for Inventory Agent status
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Inventory Agent API is running",
    actions: ["search", "release"],
  });
}

