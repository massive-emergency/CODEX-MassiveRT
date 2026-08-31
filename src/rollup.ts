import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { hashIp, parseHitLine, type HitEvent } from "./hit-log";
import { bucketDay, hourKey, hourStartSqlFromKey } from "./time";

export type HourAggregate = {
  hourKey: string;
  hourStartSql: string;
  tenantId: string;
  users: Map<
    string,
    {
      rawHits: number;
      ipHashes: Set<string>;
    }
  >;
};

export type RollupSink = {
  hasProcessedHour(tenantId: string, hourStartSql: string): Promise<boolean>;
  commitHour(aggregate: HourAggregate): Promise<"applied" | "skipped">;
};

const FILE_PATTERN = /^hits-(\d{10})\.jsonl$/;

export function aggregateHits(
  events: HitEvent[],
  tenantId: string,
  timeZone: string,
  hourKeyForFile: string,
): HourAggregate | null {
  const hourStartSql = hourStartSqlFromKey(hourKeyForFile);
  if (!hourStartSql) return null;

  const users = new Map<string, { rawHits: number; ipHashes: Set<string> }>();
  for (const event of events) {
    if (event.tenant !== tenantId) continue;
    if (event.channel && event.channel !== "u") continue;
    const at = new Date(event.t);
    if (Number.isNaN(at.getTime())) continue;
    if (hourKey(at, timeZone) !== hourKeyForFile) continue;

    const day = bucketDay(at, timeZone);
    const ipHash = hashIp(event.ip);
    const key = `${event.id}\t${day}`;
    let row = users.get(key);
    if (!row) {
      row = { rawHits: 0, ipHashes: new Set() };
      users.set(key, row);
    }
    row.rawHits += 1;
    row.ipHashes.add(ipHash);
  }

  return { hourKey: hourKeyForFile, hourStartSql, tenantId, users };
}

export async function readHitFile(filePath: string): Promise<HitEvent[]> {
  const text = await readFile(filePath, "utf8");
  const events: HitEvent[] = [];
  for (const line of text.split("\n")) {
    const event = parseHitLine(line);
    if (event) events.push(event);
  }
  return events;
}

export async function listHitHourFiles(dir: string): Promise<{ hourKey: string; filePath: string }[]> {
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw error;
  }

  const files: { hourKey: string; filePath: string }[] = [];
  for (const name of names) {
    const match = FILE_PATTERN.exec(name);
    if (!match) continue;
    files.push({ hourKey: match[1], filePath: path.join(dir, name) });
  }
  files.sort((a, b) => a.hourKey.localeCompare(b.hourKey));
  return files;
}

export function splitUserDay(key: string): { userId: string; bucketDay: string } {
  const [userId, day] = key.split("\t");
  return { userId, bucketDay: day };
}
