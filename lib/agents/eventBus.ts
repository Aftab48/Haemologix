/**
 * Event Bus for Agent Communication
 * Uses database as primary event store
 * Can integrate Redis pub/sub later for real-time updates
 */

import { db } from "@/db";

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

export interface EventPayload {
  [key: string]: any;
}

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
export async function publishEvent(
  type: AgentEventType,
  payload: EventPayload,
  agentType: string
): Promise<string> {
  try {
    const event = await db.agentEvent.create({
      data: {
        type,
        payload: payload as any,
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
): Promise<any[]> {
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
export async function getEventsByRequest(requestId: string): Promise<any[]> {
  try {
    const events = await db.agentEvent.findMany({
      where: {
        payload: {
          path: ["request_id"],
          equals: requestId,
        } as any,
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
export async function getRecentEvents(limit: number = 50): Promise<any[]> {
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
