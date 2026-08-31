import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { bucketDay, hourKey, hourStartSqlFromKey, startOfMonth, startOfWeekMonday } from "./time";

describe("campaign timezone helpers", () => {
  test("formats Pacific hour keys without using length of the id", () => {
    const winter = new Date("2026-01-15T20:30:00Z");
    assert.equal(hourKey(winter, "America/Los_Angeles"), "2026011512");
    assert.equal(bucketDay(winter, "America/Los_Angeles"), "2026-01-15");
    assert.equal(hourStartSqlFromKey("2026011512"), "2026-01-15 12:00:00");
  });

  test("week starts Monday and month starts on the first", () => {
    assert.equal(startOfWeekMonday("2026-08-25"), "2026-08-24");
    assert.equal(startOfWeekMonday("2026-08-24"), "2026-08-24");
    assert.equal(startOfWeekMonday("2026-08-23"), "2026-08-17");
    assert.equal(startOfMonth("2026-08-25"), "2026-08-01");
  });
});
