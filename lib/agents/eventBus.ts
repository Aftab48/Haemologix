/**
 * Event Bus for Agent Communication
 * Uses database as primary event store
 * Can integrate Redis pub/sub later for real-time updates
 */

import { db } from "@/db";
import type { AgentEvent, Prisma } from "@prisma/client";

export type AgentEventType =
  | "shortage.request.v1"
  | "donor.candidate.v1"
  | "donor.response.v1"
  | "coordinator.fulfillment.v1"
  | "inventory.match.v1"
  | "logistics.plan.v1"
  | "logistics.status.v1"
  | "compliance.check.v1"
  | "verification.document.failed.v1"
  | "verification.eligibility.passed.v1"
  | "verification.eligibility.failed.v1";

export interface ShortageRequestEvent {
  type: "shortage.request.v1";
  id: string;
  hospital_id: string;
  blood_type: string;
  units_needed: number;
  urgency: "low" | "medium" | "high" | "critical";
  location: { lat: number; lng: number };
  search_radius_km: number;
  expiry_time?: string;
  priority_score: number;
  metadata: {
    contact_person?: string;
    contact_phone?: string;
    reason?: string;
    estimated_procedure_time?: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toUrgency(
  value: unknown
): ShortageRequestEvent["urgency"] | null {
  if (typeof value !== "string") return null;

  switch (value.trim().toLowerCase()) {
    case "low":
      return "low";
    case "medium":
      return "medium";
    case "high":
      return "high";
    case "critical":
      return "critical";
    default:
      return null;
  }
}

function getOptionalString(
  value: Record<string, unknown>,
  key: string
): string | undefined {
  return typeof value[key] === "string" ? value[key] : undefined;
}

function toNestedJsonValue(
  value: unknown
): Prisma.InputJsonValue | null | undefined {
  if (value === null) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Date) return value.toJSON();
  if (Array.isArray(value)) {
    return value.map((item) => toNestedJsonValue(item) ?? null);
  }
  if (isRecord(value)) {
    return toInputJsonObject(value);
  }
  return undefined;
}

function toInputJsonObject(value: object): Prisma.InputJsonObject {
  const result: Record<string, Prisma.InputJsonValue | null> = {};
  for (const [key, item] of Object.entries(value)) {
    const jsonValue = toNestedJsonValue(item);
    if (jsonValue !== undefined) {
      result[key] = jsonValue;
    }
  }
  return result;
}

export function parseShortageRequestEvent(
  value: unknown
): ShortageRequestEvent | null {
  if (
    !isRecord(value) ||
    !isRecord(value.location) ||
    value.type !== "shortage.request.v1" ||
    typeof value.id !== "string" ||
    typeof value.hospital_id !== "string" ||
    typeof value.blood_type !== "string"
  ) {
    return null;
  }

  const unitsNeeded = toFiniteNumber(value.units_needed);
  const latitude = toFiniteNumber(value.location.lat);
  const longitude = toFiniteNumber(value.location.lng);
  const searchRadius = toFiniteNumber(value.search_radius_km);
  const priorityScore = toFiniteNumber(value.priority_score);
  const urgency = toUrgency(value.urgency);
  if (
    unitsNeeded === null ||
    latitude === null ||
    longitude === null ||
    searchRadius === null ||
    priorityScore === null ||
    urgency === null
  ) {
    return null;
  }

  const metadata = isRecord(value.metadata) ? value.metadata : {};
  return {
    type: "shortage.request.v1",
    id: value.id,
    hospital_id: value.hospital_id,
    blood_type: value.blood_type,
    units_needed: unitsNeeded,
    urgency,
    location: { lat: latitude, lng: longitude },
    search_radius_km: searchRadius,
    expiry_time: getOptionalString(value, "expiry_time"),
    priority_score: priorityScore,
    metadata: {
      contact_person: getOptionalString(metadata, "contact_person"),
      contact_phone: getOptionalString(metadata, "contact_phone"),
      reason: getOptionalString(metadata, "reason"),
      estimated_procedure_time: getOptionalString(
        metadata,
        "estimated_procedure_time"
      ),
    },
  };
}

export interface DonorCandidateEvent {
  type: "donor.candidate.v1";
  request_id: string;
  donor_id: string;
  distance_km: number;
  eligibility_score: number;
  rank: number;
  notification_sent: boolean;
  timestamp: string;
}

export interface DonorResponseEvent {
  type: "donor.response.v1";
  request_id: string;
  donor_id: string;
  status: "accepted" | "declined";
  eta_minutes?: number;
  timestamp: string;
}

/**
 * Publish an event to the event bus
 */
export async function publishEvent<Payload extends object>(
  type: AgentEventType,
  payload: Payload,
  agentType: string
): Promise<string> {
  try {
    const event = await db.agentEvent.create({
      data: {
        type,
        payload: toInputJsonObject(payload),
        agentType,
        processed: false,
      },
    });

    console.log(`[EventBus] Published ${type} by ${agentType}:`, event.id);

    // TODO: If Redis is configured, also publish to Redis channel
    // await publishToRedis(`events:${agentType}`, payload);

    return event.id;
  } catch (error) {
    console.error(`[EventBus] Error publishing event:`, error);
    throw error;
  }
}

/**
 * Get unprocessed events of a specific type
 */
export async function getUnprocessedEvents(
  type: AgentEventType
): Promise<AgentEvent[]> {
  try {
    const events = await db.agentEvent.findMany({
      where: {
        type,
        processed: false,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return events;
  } catch (error) {
    console.error(`[EventBus] Error fetching events:`, error);
    return [];
  }
}

/**
 * Mark an event as processed
 */
export async function markEventProcessed(eventId: string): Promise<void> {
  try {
    await db.agentEvent.update({
      where: { id: eventId },
      data: { processed: true },
    });
  } catch (error) {
    console.error(`[EventBus] Error marking event processed:`, error);
  }
}

/**
 * Get all events for a specific request (for debugging/logging)
 */
export async function getEventsByRequest(requestId: string): Promise<AgentEvent[]> {
  try {
    const events = await db.agentEvent.findMany({
      where: {
        payload: {
          path: ["request_id"],
          equals: requestId,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return events;
  } catch (error) {
    console.error(`[EventBus] Error fetching events by request:`, error);
    return [];
  }
}

/**
 * Get recent events for dashboard (live activity feed)
 */
export async function getRecentEvents(limit: number = 50): Promise<AgentEvent[]> {
  try {
    const events = await db.agentEvent.findMany({
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    return events;
  } catch (error) {
    console.error(`[EventBus] Error fetching recent events:`, error);
    return [];
  }
}
