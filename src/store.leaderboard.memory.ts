import type { LeaderboardPeriod, LeaderboardResult, LeaderboardStore } from "./leaderboard";
import { buildLeaderboardResult } from "./leaderboard";
import { CAMPAIGN_TZ } from "./time";

const PREVIEW_SCORES = {
  today: [
    { userName: "Larry Lemon", uniqueHits: 14, rawHits: 19 },
    { userName: "Chris Cedar", uniqueHits: 11, rawHits: 28 },
    { userName: "Margaret Manx", uniqueHits: 7, rawHits: 9 },
  ],
  week: [
    { userName: "Larry Lemon", uniqueHits: 41, rawHits: 55 },
    { userName: "Chris Cedar", uniqueHits: 33, rawHits: 90 },
    { userName: "Margaret Manx", uniqueHits: 22, rawHits: 31 },
    { userName: "Nina Needle", uniqueHits: 18, rawHits: 20 },
  ],
  month: [
    { userName: "Chris Cedar", uniqueHits: 120, rawHits: 310 },
    { userName: "Larry Lemon", uniqueHits: 118, rawHits: 150 },
    { userName: "Margaret Manx", uniqueHits: 77, rawHits: 88 },
    { userName: "Nina Needle", uniqueHits: 54, rawHits: 61 },
  ],
  all: [
    { userName: "Chris Cedar", uniqueHits: 240, rawHits: 620 },
    { userName: "Larry Lemon", uniqueHits: 210, rawHits: 280 },
    { userName: "Margaret Manx", uniqueHits: 140, rawHits: 175 },
    { userName: "Nina Needle", uniqueHits: 96, rawHits: 110 },
  ],
};

export function createMemoryLeaderboardStore(
  tenantId: string,
  scores: typeof PREVIEW_SCORES = PREVIEW_SCORES,
): LeaderboardStore {
  return {
    async getLeaderboard(period: LeaderboardPeriod, now = new Date()): Promise<LeaderboardResult> {
      return buildLeaderboardResult(period, tenantId, now, CAMPAIGN_TZ, scores[period]);
    },
  };
}

export function createEmptyLeaderboardStore(tenantId: string): LeaderboardStore {
  return {
    async getLeaderboard(period: LeaderboardPeriod, now = new Date()): Promise<LeaderboardResult> {
      return buildLeaderboardResult(period, tenantId, now, CAMPAIGN_TZ, []);
    },
  };
}
