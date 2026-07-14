import assert from "node:assert/strict";
import test from "node:test";
import { applyDemoAction, canDonateTo, materializeDemoState } from "./engine";
import { deliveryProgress, deliveryStatusAt, interpolateTrack } from "./delivery";
import { createDemoSeed, DEMO_PRIMARY_DONOR_ID } from "./seed";
import type { DemoDeliveryTrack } from "./types";

test("seed contains the agreed synthetic population", () => {
  const state = createDemoSeed(new Date("2026-07-15T10:00:00.000Z"));
  assert.equal(state.donors.length, 15);
  assert.equal(state.hospitals.length, 5);
  assert.equal(state.donors.filter((donor) => donor.autonomous).length, 8);
  assert.deepEqual(
    [...new Set(state.donors.filter((donor) => donor.autonomous).map((donor) => donor.bloodGroup))].sort(),
    ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"].sort()
  );
  assert.ok(state.donors.every((donor) => donor.email.endsWith("@example.com")));
  assert.ok(state.donors.every((donor) => donor.phone.includes("00000")));
});

test("blood compatibility follows red-cell donation rules", () => {
  assert.equal(canDonateTo("O-", "AB+"), true);
  assert.equal(canDonateTo("O+", "O-"), false);
  assert.equal(canDonateTo("AB+", "A+"), false);
});

test("new alerts schedule autonomous donors but never the primary donor", () => {
  const now = new Date("2026-07-15T10:00:00.000Z");
  const state = createDemoSeed(now);
  applyDemoAction(state, {
    type: "HOSPITAL_CREATE_ALERT",
    payload: { alertType: "Blood", bloodType: "O+", urgency: "CRITICAL", unitsNeeded: 6, searchRadius: 100, description: "Test synchronized alert" },
  }, now);
  const newest = state.alerts[0];
  const responseEvents = state.scheduledEvents.filter((event) => event.type === "DONOR_RESPONSE" && event.alertId === newest.id);
  assert.ok(responseEvents.length > 0 && responseEvents.length <= 4);
  assert.equal(responseEvents.some((event) => event.type === "DONOR_RESPONSE" && event.donorId === DEMO_PRIMARY_DONOR_ID), false);
});

test("scheduled responses create donor tracks and hospital fallback for a shortfall", () => {
  const now = new Date("2026-07-15T10:00:00.000Z");
  const state = createDemoSeed(now);
  applyDemoAction(state, {
    type: "HOSPITAL_CREATE_ALERT",
    payload: { alertType: "Blood", bloodType: "O+", urgency: "CRITICAL", unitsNeeded: 6, searchRadius: 100, description: "Fallback test alert" },
  }, now);
  const alert = state.alerts[0];
  assert.equal(materializeDemoState(state, new Date(now.getTime() + 11_000)), true);
  assert.ok(state.responses.some((response) => response.alertId === alert.id && response.outcome === "ACCEPTED"));
  assert.ok(state.deliveries.some((track) => track.alertId === alert.id && track.sourceType === "DONOR"));
  assert.ok(state.deliveries.some((track) => track.alertId === alert.id && track.sourceType === "HOSPITAL"));
  const coordinatedUnits = state.deliveries.filter((track) => track.alertId === alert.id).reduce((sum, track) => sum + track.units, 0);
  assert.ok(coordinatedUnits >= alert.unitsNeeded);
});

test("delivery interpolation and status are deterministic", () => {
  const track: DemoDeliveryTrack = {
    id: "track", alertId: "alert", sourceType: "DONOR", sourceId: "donor", sourceName: "Donor",
    origin: { latitude: 10, longitude: 20 }, destination: { latitude: 20, longitude: 40 }, units: 1,
    mode: "car", distanceKm: 5, departureAt: "2026-07-15T10:00:00.000Z", arrivalAt: "2026-07-15T10:00:30.000Z", status: "PREPARING",
  };
  const midpoint = new Date("2026-07-15T10:00:15.000Z");
  assert.equal(deliveryProgress(track, midpoint), 0.5);
  assert.deepEqual(interpolateTrack(track, midpoint), { latitude: 15, longitude: 30 });
  assert.equal(deliveryStatusAt(track, midpoint), "IN_TRANSIT");
  assert.equal(deliveryStatusAt(track, new Date("2026-07-15T10:00:30.000Z")), "DELIVERED");
});

