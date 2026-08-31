import { bucketDay, CAMPAIGN_TZ, startOfMonth, startOfWeekMonday } from "./time";

export type LeaderboardPeriod = "today" | "week" | "month" | "all";

export type LeaderboardRow = {
  rank: number;
  userName: string;
  uniqueHits: number;
  rawHits: number;
};

export type LeaderboardTrophies = {
  mostUniques: string | null;
  mostVolume: string | null;
};

export type LeaderboardResult = {
  period: LeaderboardPeriod;
  tenantId: string;
  asOfDay: string;
  fromDay: string | null;
  toDay: string | null;
  rows: LeaderboardRow[];
  trophies: LeaderboardTrophies;
};

export type DateRange = {
  fromDay: string | null;
  toDay: string | null;
};

export type LeaderboardStore = {
  getLeaderboard(period: LeaderboardPeriod, now?: Date): Promise<LeaderboardResult>;
};

export const PERIODS: LeaderboardPeriod[] = ["today", "week", "month", "all"];

export function parsePeriod(value: string | undefined): LeaderboardPeriod {
  if (value === "week" || value === "month" || value === "all" || value === "today") {
    return value;
  }
  return "today";
}

export function rangeForPeriod(period: LeaderboardPeriod, now: Date, timeZone: string): DateRange {
  const today = bucketDay(now, timeZone);
  if (period === "today") return { fromDay: today, toDay: today };
  if (period === "week") return { fromDay: startOfWeekMonday(today), toDay: today };
  if (period === "month") return { fromDay: startOfMonth(today), toDay: today };
  return { fromDay: null, toDay: null };
}

export function assignRanks(
  scores: { userName: string; uniqueHits: number; rawHits: number }[],
): LeaderboardRow[] {
  const sorted = [...scores].sort((a, b) => {
    if (b.uniqueHits !== a.uniqueHits) return b.uniqueHits - a.uniqueHits;
    if (b.rawHits !== a.rawHits) return b.rawHits - a.rawHits;
    return a.userName.localeCompare(b.userName);
  });
  return sorted.map((row, index) => ({
    rank: index + 1,
    userName: row.userName,
    uniqueHits: row.uniqueHits,
    rawHits: row.rawHits,
  }));
}

export function trophiesFor(rows: LeaderboardRow[]): LeaderboardTrophies {
  if (rows.length === 0) {
    return { mostUniques: null, mostVolume: null };
  }
  const mostUniques = [...rows].sort((a, b) => b.uniqueHits - a.uniqueHits || a.userName.localeCompare(b.userName))[0];
  const mostVolume = [...rows].sort((a, b) => b.rawHits - a.rawHits || a.userName.localeCompare(b.userName))[0];
  return {
    mostUniques: mostUniques.uniqueHits > 0 ? mostUniques.userName : null,
    mostVolume: mostVolume.rawHits > 0 ? mostVolume.userName : null,
  };
}

export function buildLeaderboardResult(
  period: LeaderboardPeriod,
  tenantId: string,
  now: Date,
  timeZone: string,
  scores: { userName: string; uniqueHits: number; rawHits: number }[],
): LeaderboardResult {
  const asOfDay = bucketDay(now, timeZone);
  const range = rangeForPeriod(period, now, timeZone);
  const rows = assignRanks(scores.filter((row) => row.uniqueHits > 0 || row.rawHits > 0));
  return {
    period,
    tenantId,
    asOfDay,
    fromDay: range.fromDay,
    toDay: range.toDay,
    rows,
    trophies: trophiesFor(rows),
  };
}

export { CAMPAIGN_TZ };
