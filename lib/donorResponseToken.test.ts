import assert from "node:assert/strict";
import test from "node:test";
import { buildResponseToken, parseResponseToken } from "./donorResponseToken";

test("round-trips UUID donor/request ids (which contain dashes)", () => {
  const donor = "2c6c141b-7537-491d-a589-d4836cdfb54f";
  const req = "7184136b-68ed-43e7-89e8-2322eaf40bf2";
  const ts = 1755300000000;
  const p = parseResponseToken(buildResponseToken(donor, req, ts));
  assert.deepEqual(p, { donor_id: donor, request_id: req, timestamp: ts });
});

test("supports legacy non-UUID ids", () => {
  assert.deepEqual(parseResponseToken("d1-a1-123"), { donor_id: "d1", request_id: "a1", timestamp: 123 });
});

test("rejects malformed tokens", () => {
  assert.equal(parseResponseToken("nodashes"), null);
  assert.equal(parseResponseToken("a-b"), null);
  assert.equal(parseResponseToken("a-b-notanumber"), null);
});
