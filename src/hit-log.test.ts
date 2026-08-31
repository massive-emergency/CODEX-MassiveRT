import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatHitLine, hashIp, parseHitLine, type HitEvent } from "./hit-log";

const sample: HitEvent = {
  t: "2026-08-25T17:14:22.000Z",
  tenant: "massive",
  channel: "u",
  id: "2vvtr",
  ip: "203.0.113.40",
  utm_source: "foce",
  utm_medium: "button",
  utm_campaign: "week35_2026",
  utm_content: "lapel",
};

describe("hit log lines", () => {
  test("round-trips a successful scan including UTM fields", () => {
    const parsed = parseHitLine(formatHitLine(sample));
    assert.deepEqual(parsed, sample);
  });

  test("hashes IPs to 64 hex chars", () => {
    assert.equal(hashIp("203.0.113.40").length, 64);
    assert.notEqual(hashIp("203.0.113.40"), hashIp("203.0.113.41"));
  });

  test("skips malformed lines", () => {
    assert.equal(parseHitLine(""), null);
    assert.equal(parseHitLine("{not json"), null);
    assert.equal(parseHitLine('{"id":"2vvtr"}'), null);
  });
});
