import { NextRequest, NextResponse } from "next/server";
import {
  createOTSchedule,
  getOTSchedulesByDate,
  updateOTScheduleStatus,
} from "@/lib/actions/ot.actions";

const VALID_BLOOD_TYPES = new Set([
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
]);

const VALID_STATUSES = new Set([
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hospitalId = searchParams.get("hospitalId");
  const date = searchParams.get("date");

  if (!hospitalId || !date) {
    return NextResponse.json(
      { error: "hospitalId and date required" },
      { status: 400 }
    );
  }

  if (!DATE_RE.test(date)) {
    return NextResponse.json(
      { error: "date must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  try {
    const schedules = await getOTSchedulesByDate(hospitalId, date);
    return NextResponse.json({ schedules });
  } catch (err) {
    console.error("[API /ot GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "update-status") {
      if (!data.id || typeof data.id !== "string") {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }
      if (!data.status || !VALID_STATUSES.has(data.status)) {
        return NextResponse.json(
          {
            error:
              "status must be one of SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED",
          },
          { status: 400 }
        );
      }
      const result = await updateOTScheduleStatus(data.id, data.status);
      if (!result.success) {
        return NextResponse.json(
          { error: "Failed to update status" },
          { status: 500 }
        );
      }
      return NextResponse.json(result);
    }

    const {
      hospitalId,
      patientName,
      surgeryType,
      bloodType,
      unitsRequired,
      scheduledDate,
      scheduledTime,
      notes,
    } = data;

    if (
      !hospitalId ||
      !patientName ||
      !surgeryType ||
      !bloodType ||
      unitsRequired == null ||
      !scheduledDate ||
      !scheduledTime
    ) {
      return NextResponse.json(
        {
          error:
            "hospitalId, patientName, surgeryType, bloodType, unitsRequired, scheduledDate, and scheduledTime are required",
        },
        { status: 400 }
      );
    }

    if (!VALID_BLOOD_TYPES.has(bloodType)) {
      return NextResponse.json(
        { error: "Invalid bloodType" },
        { status: 400 }
      );
    }

    const units =
      typeof unitsRequired === "number"
        ? unitsRequired
        : parseInt(String(unitsRequired), 10);

    if (!Number.isFinite(units) || units < 1) {
      return NextResponse.json(
        { error: "unitsRequired must be a positive integer" },
        { status: 400 }
      );
    }

    if (!DATE_RE.test(scheduledDate)) {
      return NextResponse.json(
        { error: "scheduledDate must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (!TIME_RE.test(scheduledTime)) {
      return NextResponse.json(
        { error: "scheduledTime must be HH:MM" },
        { status: 400 }
      );
    }

    const result = await createOTSchedule({
      hospitalId: String(hospitalId),
      patientName: String(patientName).trim(),
      surgeryType: String(surgeryType).trim(),
      bloodType,
      unitsRequired: units,
      scheduledDate,
      scheduledTime,
      notes: notes ? String(notes).trim() : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create schedule" },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[API /ot POST]", err);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
