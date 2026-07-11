import { transporter } from "@/lib/mail";
import { NextResponse } from "next/server";

function getErrorField(error: unknown, field: string): unknown {
  return typeof error === "object" && error !== null && field in error
    ? (error as Record<string, unknown>)[field]
    : undefined;
}

/**
 * SMTP connectivity check — development only.
 * SECURITY: Only available in development/test environments.
 */

function productionGuard(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

export async function GET() {
  const guard = productionGuard();
  if (guard) return guard;

  try {
    await new Promise((resolve, reject) => {
      transporter.verify((err, success) => {
        if (err) return reject(err);
        resolve(success);
      });
    });

    return NextResponse.json({
      ok: true,
      message: "SMTP server is ready to send emails",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = getErrorField(err, "code");
    console.error("SMTP verify error:", {
      message,
      code,
    });

    return NextResponse.json(
      {
        ok: false,
        error: message,
        code: code || null,
      },
      { status: 500 }
    );
  }
}
