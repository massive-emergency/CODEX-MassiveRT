import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { hashIp, type HitEvent } from "./hit-log";
import { aggregateHits, splitUserDay } from "./rollup";

function hit(overrides: Partial<HitEvent>): HitEvent {
  return {
    t: "2026-08-25T18:10:00.000Z",
    tenant: "massive",
    channel: "u",
    id: "2vvtr",
    ip: "203.0.113.40",
    utm_source: "foce",
    utm_medium: "button",
    utm_campaign: "week35_2026",
    utm_content: "lapel",
    ...overrides,
  };
}

describe("aggregateHits", () => {
  test("dedupes the same IP for one user in the same hour", () => {
    const hourKeyForFile = "2026082511";
    const aggregate = aggregateHits(
      [
        hit({}),
        hit({ t: "2026-08-25T18:40:00.000Z" }),
        hit({ id: "2xdkp", ip: "198.51.100.10" }),
      ],
      "massive",
      "America/Los_Angeles",
      hourKeyForFile,
    );
    assert.ok(aggregate);
    assert.equal(aggregate.users.size, 2);
    const chris = [...aggregate.users.entries()].find(([key]) => splitUserDay(key).userId === "2vvtr");
    assert.ok(chris);
    assert.equal(chris[1].rawHits, 2);
    assert.equal(chris[1].ipHashes.size, 1);
    assert.ok(chris[1].ipHashes.has(hashIp("203.0.113.40")));
  });

  test("ignores other tenants and other hours", () => {
    const aggregate = aggregateHits(
      [
        hit({ tenant: "other" }),
        hit({ t: "2026-08-25T10:00:00.000Z" }),
      ],
      "massive",
      "America/Los_Angeles",
      "2026082511",
    );
    assert.ok(aggregate);
    assert.equal(aggregate.users.size, 0);
  });
});
