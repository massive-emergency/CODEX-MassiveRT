import mysql from "mysql2/promise";
import { splitUserDay, type HourAggregate, type RollupSink } from "./rollup";

export function createMysqlRollupSink(pool: mysql.Pool): RollupSink {
  return {
    async hasProcessedHour(tenantId: string, hourStartSql: string): Promise<boolean> {
      const [rows] = await pool.execute<mysql.RowDataPacket[]>(
        "SELECT 1 AS ok FROM scan_processed_hours WHERE tenant_id = ? AND hour_start = ? LIMIT 1",
        [tenantId, hourStartSql],
      );
      return rows.length > 0;
    },

    async commitHour(aggregate: HourAggregate): Promise<"applied" | "skipped"> {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        try {
          await connection.execute(
            "INSERT INTO scan_processed_hours (tenant_id, hour_start) VALUES (?, ?)",
            [aggregate.tenantId, aggregate.hourStartSql],
          );
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (code === "ER_DUP_ENTRY") {
            await connection.rollback();
            return "skipped";
          }
          throw error;
        }

        for (const [key, stats] of aggregate.users) {
          const { userId, bucketDay } = splitUserDay(key);
          let newUniques = 0;
          for (const ipHash of stats.ipHashes) {
            const [result] = await connection.execute<mysql.ResultSetHeader>(
              `INSERT IGNORE INTO scan_day_ips (tenant_id, user_id, bucket_day, ip_hash)
               VALUES (?, ?, ?, ?)`,
              [aggregate.tenantId, userId, bucketDay, ipHash],
            );
            if (result.affectedRows > 0) newUniques += 1;
          }

          await connection.execute(
            `INSERT INTO scan_day_buckets (tenant_id, user_id, bucket_day, raw_hits, unique_hits)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               raw_hits = raw_hits + VALUES(raw_hits),
               unique_hits = unique_hits + VALUES(unique_hits)`,
            [aggregate.tenantId, userId, bucketDay, stats.rawHits, newUniques],
          );
        }

        await connection.commit();
        return "applied";
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}
