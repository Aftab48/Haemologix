import { NextRequest, NextResponse } from "next/server";

/**
 * API proxy route for serving S3 files with caching headers
 * This allows better caching control and can be extended for image optimization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    
    if (!key) {
      return NextResponse.json({ error: "File key is required" }, { status: 400 });
    }

    // Decode the key (it might be URL encoded)
    const decodedKey = decodeURIComponent(key);
    
    // Construct the S3 URL
    const bucketName = process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    
    if (!bucketName || !region) {
      return NextResponse.json(
        { error: "S3 configuration missing" },
        { status: 500 }
      );
    }

    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${decodedKey}`;

    // Fetch the file from S3
    const response = await fetch(s3Url, {
      headers: {
        "Accept": request.headers.get("Accept") || "*/*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "File not found" },
        { status: response.status }
      );
    }

    // Get the file content
    const fileBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    // Set caching headers
    // Cache for 1 hour, revalidate in background
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
    headers.set("X-Content-Type-Options", "nosniff");

    // Add CORS headers if needed
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET");

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

