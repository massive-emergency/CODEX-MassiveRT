-- Scan tracking tables for massive-rt
-- Tenant-scoped daily buckets; JSONL is the hot-path source, hourly rollup writes here.

CREATE TABLE IF NOT EXISTS scan_day_buckets (
  tenant_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  bucket_day DATE NOT NULL,
  raw_hits INT UNSIGNED NOT NULL DEFAULT 0,
  unique_hits INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, user_id, bucket_day),
  KEY scan_day_unique (tenant_id, bucket_day, unique_hits)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='hourly rollup: raw and unique scans per tenant per user per calendar day';

CREATE TABLE IF NOT EXISTS scan_day_ips (
  tenant_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  bucket_day DATE NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  PRIMARY KEY (tenant_id, user_id, bucket_day, ip_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='dedupe set: one row per tenant per user per day per IP';

CREATE TABLE IF NOT EXISTS scan_processed_hours (
  tenant_id VARCHAR(32) NOT NULL,
  hour_start DATETIME NOT NULL,
  PRIMARY KEY (tenant_id, hour_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='hours already rolled up; prevents double-count on rerun';
