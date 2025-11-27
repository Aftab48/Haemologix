import QRCode from "qrcode";
import fs from "fs";
import path from "path";

/**
 * Generate QR code for donor onboarding page
 * Saves to public/qr-donor-onboard.png
 */

async function generateDonorOnboardQR() {
  try {
    const url = "https://www.haemologix.in/donor/onboard";
    const publicDir = path.join(process.cwd(), "public");
    const qrPath = path.join(publicDir, "qr-donor-onboard.png");

    // Generate black QR code
    await QRCode.toFile(qrPath, url, {
      width: 512,
      margin: 2,
      color: {
        dark: "#000000", // Pure black
        light: "#FFFFFF", // White background
      },
      errorCorrectionLevel: "M",
    });

    console.log("✅ QR code generated successfully!");
    console.log(`📁 Saved to: ${qrPath}`);
    console.log(`🔗 URL: ${url}`);
    console.log(`🌐 Access at: /qr-donor-onboard.png`);
  } catch (error) {
    console.error("❌ Error generating QR code:", error);
    process.exit(1);
  }
}

generateDonorOnboardQR();

