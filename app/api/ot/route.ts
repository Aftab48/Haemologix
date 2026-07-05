import { NextRequest, NextResponse } from "next/server";
import {
  createOTSchedule,
  getOTSchedulesByDate,
  updateOTScheduleStatus,
} from "@/lib/actions/ot.actions";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hospitalId = searchParams.get("hospitalId");
  const date = searchParams.get("date");
  if (!hospitalId || !date) {
    return NextResponse.json({ error: "hospitalId and date required" }, { status: 400 });
  }
  const schedules = await getOTSchedulesByDate(hospitalId, date);
  return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, ...data } = body;

  if (action === "update-status") {
    const result = await updateOTScheduleStatus(data.id, data.status);
    return NextResponse.json(result);
  }

  const result = await createOTSchedule(data);
  return NextResponse.json(result);
}
