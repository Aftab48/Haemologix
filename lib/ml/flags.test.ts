import assert from "node:assert/strict";
import test from "node:test";
import {
  getMlConnection,
  getMlMode,
  policyHasAuthority,
  shouldCallModel,
} from "./flags";

test("defaults to shadow when nothing is configured", () => {
  assert.equal(getMlMode("DONOR", {}), "shadow");
  assert.equal(shouldCallModel("DONOR", {}), true);
  assert.equal(policyHasAuthority("DONOR", {}), false);
});

test("ML_MODE_DEFAULT applies to every agent", () => {
  const env = { ML_MODE_DEFAULT: "authority" };
  assert.equal(getMlMode("DONOR", env), "authority");
  assert.equal(getMlMode("LOGISTICS", env), "authority");
  assert.equal(policyHasAuthority("HOSPITAL", env), true);
});

test("per-agent override beats the default and is case-insensitive", () => {
  const env = { ML_MODE_DEFAULT: "shadow", ML_MODE_DONOR: " Authority " };
  assert.equal(getMlMode("DONOR", env), "authority");
  assert.equal(getMlMode("INVENTORY", env), "shadow");
});

test("invalid values fall through to the next level", () => {
  assert.equal(getMlMode("DONOR", { ML_MODE_DONOR: "banana", ML_MODE_DEFAULT: "off" }), "off");
  assert.equal(getMlMode("DONOR", { ML_MODE_DONOR: "banana", ML_MODE_DEFAULT: "nope" }), "shadow");
});

test("off disables model calls entirely", () => {
  assert.equal(shouldCallModel("VERIFICATION", { ML_MODE_VERIFICATION: "off" }), false);
});

test("connection settings have safe defaults and strip trailing slashes", () => {
  const c = getMlConnection({});
  assert.equal(c.apiUrl, "http://localhost:8000");
  assert.equal(c.apiSecret, null);
  assert.equal(c.timeoutMs, 3000);

  const c2 = getMlConnection({
    ML_API_URL: "https://ml.example.com/",
    ML_API_SECRET: "s3cret",
    ML_TIMEOUT_MS: "1500",
  });
  assert.equal(c2.apiUrl, "https://ml.example.com");
  assert.equal(c2.apiSecret, "s3cret");
  assert.equal(c2.timeoutMs, 1500);
});
