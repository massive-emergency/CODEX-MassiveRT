import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { hourKey } from "./time";

export type HitEvent = {
  t: string;
  tenant: string;
  channel: string;
  id: string;
  ip: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
};

export type HitRecorder = (event: HitEvent) => Promise<void>;

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function hitLogFileName(date: Date, timeZone: string): string {
  return `hits-${hourKey(date, timeZone)}.jsonl`;
}

export function formatHitLine(event: HitEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function parseHitLine(line: string): HitEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as Partial<HitEvent>;
    if (typeof parsed.id !== "string" || typeof parsed.tenant !== "string") {
      return null;
    }
    if (typeof parsed.ip !== "string" || typeof parsed.t !== "string") {
      return null;
    }
    return {
      t: parsed.t,
      tenant: parsed.tenant,
      channel: typeof parsed.channel === "string" ? parsed.channel : "u",
      id: parsed.id,
      ip: parsed.ip,
      utm_source: parsed.utm_source ?? null,
      utm_medium: parsed.utm_medium ?? null,
      utm_campaign: parsed.utm_campaign ?? null,
      utm_content: parsed.utm_content ?? null,
    };
  } catch {
    return null;
  }
}

export function createFileHitRecorder(dir: string, timeZone: string): HitRecorder {
  let ready: Promise<void> | null = null;
  const ensureDir = () => {
    ready ??= mkdir(dir, { recursive: true }).then(() => undefined);
    return ready;
  };

  return async (event: HitEvent) => {
    await ensureDir();
    const at = new Date(event.t);
    const file = path.join(dir, hitLogFileName(Number.isNaN(at.getTime()) ? new Date() : at, timeZone));
    await appendFile(file, formatHitLine(event), "utf8");
  };
}

export function silentHitRecorder(): HitRecorder {
  return async () => undefined;
}
