import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

/**
 * API proxy route for serving S3 files with caching headers.
 * Requires authentication — medical documents must not be publicly accessible.
 *
 * Path traversal protection: only allows alphanumeric, dash, underscore, dot, and slash.
 */

const ALLOWED_KEY_PATTERN = /^[\w.\-/]+$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { key } = await params;

    if (!key) {
      return NextResponse.json({ error: "File key is required" }, { status: 400 });
    }

    // Decode the key (it might be URL encoded)
    const decodedKey = decodeURIComponent(key);

    // Prevent path traversal attacks
    if (
      !ALLOWED_KEY_PATTERN.test(decodedKey) ||
      decodedKey.includes("..") ||
      decodedKey.startsWith("/")
    ) {
      return NextResponse.json({ error: "Invalid file key" }, { status: 400 });
    }

    const bucketName = process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;

    if (!bucketName || !region) {
      return NextResponse.json(
        { error: "S3 configuration missing" },
        { status: 500 }
      );
    }

    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${decodedKey}`;

    const response = await fetch(s3Url, {
      headers: {
        Accept: request.headers.get("Accept") || "*/*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "File not found" },
        { status: response.status }
      );
    }

    const fileBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    // Private cache — do not serve to public CDN
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set("X-Content-Type-Options", "nosniff");

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error proxying file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}
