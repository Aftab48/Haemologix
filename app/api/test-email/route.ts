import { transporter } from "@/lib/mail";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await new Promise((resolve, reject) => {
      transporter.verify((err, success) => {
        if (err) return reject(err);
        resolve(success);
      });
    });

    return NextResponse.json({
      ok: true,
      message: "SMTP server is ready to send emails ✅",
    });
  } catch (err: any) {
    console.error("❌ SMTP verify error:", {
      message: err.message,
      code: err.code,
      response: err.response,
      command: err.command,
    });

    return NextResponse.json(
      {
        ok: false,
        error: err.message,
        code: err.code || null,
        response: err.response || null,
        command: err.command || null,
      },
      { status: 500 }
    );
  }
}
