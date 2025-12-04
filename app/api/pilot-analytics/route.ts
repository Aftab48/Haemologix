import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

/**
 * Pilot Analytics API Endpoint
 * Tracks QR code scans, page views, and other pilot page events
 */

interface AnalyticsData {
  eventType: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventType,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      referrer,
      metadata,
    }: AnalyticsData = body;

    if (!eventType) {
      return NextResponse.json(
        {
          success: false,
          error: "eventType is required",
        },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Save analytics event
    const analytics = await db.pilotAnalytics.create({
      data: {
        eventType,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        referrer,
        userAgent,
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
        metadata: metadata || {},
      },
    });

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("[Pilot Analytics API] Error:", error);
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
    const eventType = searchParams.get("eventType");
    const utmMedium = searchParams.get("utmMedium");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (utmMedium) where.utmMedium = utmMedium;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const analytics = await db.pilotAnalytics.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Calculate statistics
    const stats = {
      totalEvents: analytics.length,
      qrScans: analytics.filter((a: any) => a.eventType === "qr_scan" || a.eventType === "donor_qr_scan").length,
      pageViews: analytics.filter((a: any) => a.eventType === "page_view" || a.eventType === "donor_page_view")
        .length,
      formSubmissions: analytics.filter(
        (a: any) => a.eventType === "form_submission" || a.eventType === "donor_form_submission"
      ).length,
      donorQrScans: analytics.filter((a: any) => a.eventType === "donor_qr_scan").length,
      donorPageViews: analytics.filter((a: any) => a.eventType === "donor_page_view").length,
      donorFormSubmissions: analytics.filter((a: any) => a.eventType === "donor_form_submission").length,
      pilotQrScans: analytics.filter((a: any) => a.eventType === "qr_scan").length,
      pilotPageViews: analytics.filter((a: any) => a.eventType === "page_view").length,
      pilotFormSubmissions: analytics.filter((a: any) => a.eventType === "form_submission").length,
      byUtmMedium: {} as Record<string, number>,
      byDate: {} as Record<string, number>,
      byEventType: {} as Record<string, number>,
    };

    // Group by UTM medium, date, and event type
    analytics.forEach((a: any) => {
      const medium = a.utmMedium || "direct";
      stats.byUtmMedium[medium] = (stats.byUtmMedium[medium] || 0) + 1;

      // Group by date
      const date = new Date(a.createdAt).toISOString().split("T")[0];
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;

      // Group by event type
      const eventType = a.eventType || "unknown";
      stats.byEventType[eventType] = (stats.byEventType[eventType] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: analytics,
      stats,
      count: analytics.length,
    });
  } catch (error) {
    console.error("[Pilot Analytics API] GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again later.",
      },
      { status: 500 }
    );
  }
}

