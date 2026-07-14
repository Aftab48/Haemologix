import type { DemoCoordinates, DemoDeliveryStatus, DemoDeliveryTrack } from "./types";

export function deliveryProgress(track: DemoDeliveryTrack, now: Date): number {
  const start = new Date(track.departureAt).getTime();
  const end = new Date(track.arrivalAt).getTime();
  return Math.max(0, Math.min(1, (now.getTime() - start) / Math.max(1, end - start)));
}

export function deliveryStatusAt(track: DemoDeliveryTrack, now: Date): DemoDeliveryStatus {
  const progress = deliveryProgress(track, now);
  if (progress >= 1) return "DELIVERED";
  if (progress >= 0.82) return "ARRIVING";
  if (progress >= 0.2) return "IN_TRANSIT";
  if (progress >= 0.08) return "PICKED_UP";
  return "PREPARING";
}

export function interpolateTrack(track: DemoDeliveryTrack, now: Date): DemoCoordinates {
  const progress = deliveryProgress(track, now);
  return {
    latitude: track.origin.latitude + (track.destination.latitude - track.origin.latitude) * progress,
    longitude: track.origin.longitude + (track.destination.longitude - track.origin.longitude) * progress,
  };
}

