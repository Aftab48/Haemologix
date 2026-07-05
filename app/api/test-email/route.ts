import { transporter } from "@/lib/mail";
import { NextResponse } from "next/server";

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
  } catch (err: any) {
    console.error("SMTP verify error:", {
      message: err.message,
      code: err.code,
    });

    return NextResponse.json(
      {
        ok: false,
        error: err.message,
        code: err.code || null,
      },
      { status: 500 }
    );
  }
}
