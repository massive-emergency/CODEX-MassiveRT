import mysql from "mysql2/promise";
import type { Config } from "./config";
import {
  buildLeaderboardResult,
  rangeForPeriod,
  type LeaderboardPeriod,
  type LeaderboardResult,
  type LeaderboardStore,
} from "./leaderboard";
import { CAMPAIGN_TZ } from "./time";

type ScoreRow = {
  user_id: string;
  user_name: string | null;
  unique_hits: number | string;
  raw_hits: number | string;
};

export function createMysqlPool(config: Config): mysql.Pool {
  return mysql.createPool({
    host: config.mysqlHost,
    port: config.mysqlPort,
    user: config.mysqlUser,
    password: config.mysqlPassword,
    database: config.mysqlDatabase,
    waitForConnections: true,
    connectionLimit: 8,
    enableKeepAlive: true,
  });
}

export function createMysqlLeaderboardStore(
  pool: mysql.Pool,
  tenantId: string,
  timeZone = CAMPAIGN_TZ,
): LeaderboardStore {
  return {
    async getLeaderboard(period: LeaderboardPeriod, now = new Date()): Promise<LeaderboardResult> {
      const range = rangeForPeriod(period, now, timeZone);
      let sql = `
        SELECT b.user_id,
               r.user_name,
               SUM(b.unique_hits) AS unique_hits,
               SUM(b.raw_hits) AS raw_hits
        FROM scan_day_buckets b
        LEFT JOIN user_routes r ON r.id = b.user_id
        WHERE b.tenant_id = ?
      `;
      const params: Array<string> = [tenantId];
      if (range.fromDay && range.toDay) {
        sql += " AND b.bucket_day >= ? AND b.bucket_day <= ?";
        params.push(range.fromDay, range.toDay);
      }
      sql +=
        " GROUP BY b.user_id, r.user_name HAVING SUM(b.unique_hits) > 0 OR SUM(b.raw_hits) > 0";

      const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, params);
      const scores = (rows as ScoreRow[]).map((row) => ({
        userName: row.user_name?.trim() || "Unknown scout",
        uniqueHits: Number(row.unique_hits) || 0,
        rawHits: Number(row.raw_hits) || 0,
      }));
      return buildLeaderboardResult(period, tenantId, now, timeZone, scores);
    },
  };
}
