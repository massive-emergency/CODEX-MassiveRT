import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { assignRanks, parsePeriod, trophiesFor } from "./leaderboard";

describe("leaderboard ranking", () => {
  test("ranks by unique hits then raw then name", () => {
    const rows = assignRanks([
      { userName: "Chris Cedar", uniqueHits: 10, rawHits: 40 },
      { userName: "Larry Lemon", uniqueHits: 12, rawHits: 12 },
      { userName: "Margaret Manx", uniqueHits: 10, rawHits: 10 },
    ]);
    assert.equal(rows[0].userName, "Larry Lemon");
    assert.equal(rows[0].rank, 1);
    assert.equal(rows[1].userName, "Chris Cedar");
    assert.equal(rows[2].userName, "Margaret Manx");
  });

  test("awards Most Uniques and Most Volume", () => {
    const rows = assignRanks([
      { userName: "Larry Lemon", uniqueHits: 12, rawHits: 12 },
      { userName: "Chris Cedar", uniqueHits: 10, rawHits: 40 },
    ]);
    const trophies = trophiesFor(rows);
    assert.equal(trophies.mostUniques, "Larry Lemon");
    assert.equal(trophies.mostVolume, "Chris Cedar");
  });

  test("defaults unknown periods to today", () => {
    assert.equal(parsePeriod(undefined), "today");
    assert.equal(parsePeriod("nope"), "today");
    assert.equal(parsePeriod("week"), "week");
  });
});
