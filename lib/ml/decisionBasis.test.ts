import assert from "node:assert/strict";
import test from "node:test";
import { ConsultResult, decisionBasis } from "./agentBridge";

const authority = (conf: number | null = null) => decisionBasis(new ConsultResult("authority", "v1", new Map(), [], null, 5), conf);

test("decisionBasis: rule-only paths are deterministic with no confidence", () => {
  assert.deepEqual(decisionBasis(), { decision_method: "deterministic", model_confidence: null });
  assert.deepEqual(decisionBasis(null, 0.9), { decision_method: "deterministic", model_confidence: null });
  assert.deepEqual(decisionBasis(ConsultResult.off("DONOR")), { decision_method: "deterministic", model_confidence: null });
});

test("decisionBasis: a failed model call is a fallback, never '100% confident'", () => {
  const failed = new ConsultResult("shadow", null, new Map(), [], "timeout", 5);
  assert.deepEqual(decisionBasis(failed, 0.9), { decision_method: "deterministic_fallback", model_confidence: null });
  const failedAuthority = new ConsultResult("authority", null, new Map(), [], "http_500", 5);
  assert.equal(decisionBasis(failedAuthority).decision_method, "deterministic_fallback");
});

test("decisionBasis: model consulted in shadow → rules decided", () => {
  const shadow = new ConsultResult("shadow", "v1", new Map(), [], null, 5);
  assert.deepEqual(decisionBasis(shadow, 0.72), { decision_method: "deterministic", model_confidence: null });
});

test("decisionBasis: authority → model, confidence clamped to [0,1] or null", () => {
  assert.deepEqual(authority(0.72), { decision_method: "model", model_confidence: 0.72 });
  assert.deepEqual(authority(1.4), { decision_method: "model", model_confidence: 1 });
  assert.deepEqual(authority(-0.2), { decision_method: "model", model_confidence: 0 });
  assert.deepEqual(authority(null), { decision_method: "model", model_confidence: null });
  assert.deepEqual(authority(Number.NaN), { decision_method: "model", model_confidence: null });
});
