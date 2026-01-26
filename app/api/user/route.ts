import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";

/**
 * API endpoint to get current user by email
 * Used by the mobile donor app for authentication
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const result = await getCurrentUser(email);
    
    // Return the result as-is (it already has the correct structure)
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[User API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

