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
    const baseUrl = "https://www.haemologix.in/pilot";
    const publicDir = path.join(process.cwd(), "public");

    // QR Code 1: Hero Section
    const heroQrUrl = `${baseUrl}?utm_source=qr_code&utm_medium=qr_code&utm_campaign=pilot_program&utm_content=hero_section`;
    const heroQrPath = path.join(publicDir, "qr-code-hero.png");
    
    await QRCode.toFile(heroQrPath, heroQrUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: "#9B2226", // Primary color (ruby)
        light: "#FFFFFF",
      },
    });

    // QR Code 2: Footer Section
    const footerQrUrl = `${baseUrl}?utm_source=qr_code&utm_medium=qr_code&utm_campaign=pilot_program&utm_content=footer_section`;
    const footerQrPath = path.join(publicDir, "qr-code-footer.png");
    
    await QRCode.toFile(footerQrPath, footerQrUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: "#9B2226", // Primary color (ruby)
        light: "#FFFFFF",
      },
    });

    return NextResponse.json({
      success: true,
      message: "QR codes generated successfully",
      files: {
        hero: "/qr-code-hero.png",
        footer: "/qr-code-footer.png",
      },
    });
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
  });
}

