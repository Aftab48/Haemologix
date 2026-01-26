import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

/**
 * Generate QR Codes API Endpoint
 * Generates QR codes as PNG files and saves them to the public folder
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type = "pilot" } = body;
    
    const publicDir = path.join(process.cwd(), "public");

    if (type === "donor") {
      // Generate donor onboarding QR code with UTM parameters
      const donorBaseUrl = "https://www.haemologix.in/donor/onboard";
      const utmParams = new URLSearchParams({
        utm_source: "qr_code",
        utm_medium: "qrcode",
        utm_campaign: "donor_drive",
      });
      const donorQrUrl = `${donorBaseUrl}?${utmParams.toString()}`;
      const donorQrPath = path.join(publicDir, "qr-donor-onboard.png");
      
      await QRCode.toFile(donorQrPath, donorQrUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      });

      return NextResponse.json({
        success: true,
        message: "Donor onboarding QR code generated successfully",
        files: {
          donor: "/qr-donor-onboard.png",
        },
        url: donorQrUrl,
      });
    } else {
      // Generate pilot QR codes (existing functionality)
      const baseUrl = "https://www.haemologix.in/pilot";
      const heroQrUrl = `${baseUrl}?utm_source=qr_code&utm_medium=qr_code&utm_campaign=pilot_program&utm_content=hero_section`;
      const heroQrPath = path.join(publicDir, "qr-code-black.png");
      
      await QRCode.toFile(heroQrPath, heroQrUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: "#010101",
          light: "#FFFFFF",
        },
      });

      return NextResponse.json({
        success: true,
        message: "QR codes generated successfully",
        files: {
          hero: "/qr-code-hero.png",
        },
      });
    }
  } catch (error) {
    console.error("[Generate QR Codes API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate QR codes",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    endpoint: "POST /api/generate-qr-codes",
    description: "Generate QR code PNG files and save to public folder",
    usage: "POST to this endpoint to generate QR codes",
    body: {
      type: "pilot | donor (optional, defaults to 'pilot')",
    },
    examples: {
      pilot: { type: "pilot" },
      donor: { type: "donor" },
    },
  });
}

