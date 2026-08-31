export const CAMPAIGN_TZ = "America/Los_Angeles";

type ZoneParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
};

export function zonedParts(date: Date, timeZone: string): ZoneParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
  };
}

export function hourKey(date: Date, timeZone: string): string {
  const part = zonedParts(date, timeZone);
  return `${part.year}${part.month}${part.day}${part.hour}`;
}

export function bucketDay(date: Date, timeZone: string): string {
  const part = zonedParts(date, timeZone);
  return `${part.year}-${part.month}-${part.day}`;
}

export function hourStartSql(date: Date, timeZone: string): string {
  const part = zonedParts(date, timeZone);
  return `${part.year}-${part.month}-${part.day} ${part.hour}:00:00`;
}

export function parseHourKey(key: string): { year: number; month: number; day: number; hour: number } | null {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})$/.exec(key);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
  };
}

export function hourStartSqlFromKey(key: string): string | null {
  const parsed = parseHourKey(key);
  if (!parsed) return null;
  const month = String(parsed.month).padStart(2, "0");
  const day = String(parsed.day).padStart(2, "0");
  const hour = String(parsed.hour).padStart(2, "0");
  return `${parsed.year}-${month}-${day} ${hour}:00:00`;
}

export function startOfWeekMonday(dayIso: string): string {
  const [year, month, day] = dayIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dow = date.getUTCDay();
  const offset = dow === 0 ? 6 : dow - 1;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

export function startOfMonth(dayIso: string): string {
  return `${dayIso.slice(0, 7)}-01`;
}

export function addDays(dayIso: string, days: number): string {
  const [year, month, day] = dayIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}
