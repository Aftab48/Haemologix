import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { performDemoAction } from "@/lib/demo/store";
import type { DemoAction } from "@/lib/demo/types";

export const dynamic = "force-dynamic";

const bloodType = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);
const status = z.enum(["APPROVED", "PENDING", "REJECTED"]);
const action = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("HOSPITAL_CREATE_ALERT"),
    payload: z.object({
      alertType: z.enum(["Blood", "Plasma", "Platelets"]),
      bloodType,
      urgency: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      unitsNeeded: z.number().int().min(1).max(20),
      searchRadius: z.number().int().min(1).max(100),
      description: z.string().trim().min(3).max(500),
    }),
  }),
  z.object({
    type: z.literal("HOSPITAL_UPDATE_INVENTORY"),
    payload: z.object({ bloodType, units: z.number().int().min(0).max(500), minimum: z.number().int().min(1).max(500) }),
  }),
  z.object({ type: z.literal("HOSPITAL_CONFIRM_RESPONSE"), payload: z.object({ alertId: z.string().max(100), responseId: z.string().max(100) }) }),
  z.object({ type: z.literal("HOSPITAL_CLOSE_ALERT"), payload: z.object({ alertId: z.string().max(100) }) }),
  z.object({
    type: z.literal("HOSPITAL_CREATE_OT"),
    payload: z.object({
      patientName: z.string().trim().min(2).max(80),
      surgeryType: z.string().trim().min(2).max(120),
      bloodType,
      unitsRequired: z.number().int().min(1).max(20),
      scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
      notes: z.string().trim().max(300).optional(),
    }),
  }),
  z.object({ type: z.literal("HOSPITAL_UPDATE_OT"), payload: z.object({ scheduleId: z.string().max(100), status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) }) }),
  z.object({ type: z.literal("DONOR_SET_AVAILABILITY"), payload: z.object({ available: z.boolean() }) }),
  z.object({ type: z.literal("DONOR_RESPOND"), payload: z.object({ alertId: z.string().max(100), outcome: z.enum(["ACCEPTED", "DECLINED"]) }) }),
  z.object({ type: z.literal("ADMIN_SET_USER_STATUS"), payload: z.object({ userType: z.enum(["DONOR", "HOSPITAL"]), userId: z.string().max(100), status }) }),
]);

const envelope = z.object({
  actionId: z.string().min(8).max(100),
  action,
});

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") || "0");
  if (length > 16_384) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  try {
    const parsed = envelope.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid demo action", issues: parsed.error.flatten() }, { status: 400 });
    }
    const result = await performDemoAction(parsed.data.actionId, parsed.data.action as DemoAction);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[Demo action]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to apply demo action" },
      { status: 400 }
    );
  }
}

