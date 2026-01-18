import { NextResponse } from "next/server";

export function GET() {
  const health = {
    status: "ok",
    env: {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      CLERK_SECRET_KEY: Boolean(process.env.CLERK_SECRET_KEY),
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: Boolean(
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      ),
      NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(health, { status: 200 });
}
