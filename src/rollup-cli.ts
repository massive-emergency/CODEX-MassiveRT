import "dotenv/config";
import { loadConfig, usesMysql } from "./config";
import { hourKey, hourStartSqlFromKey } from "./time";
import { aggregateHits, listHitHourFiles, readHitFile } from "./rollup";
import { createMysqlPool } from "./store.leaderboard.mysql";
import { createMysqlRollupSink } from "./store.rollup.mysql";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const config = loadConfig();
  if (!usesMysql(config)) {
    throw new Error("MYSQL_PASSWORD is required to roll up hits into MySQL");
  }

  const includeCurrent = process.argv.includes("--include-current");
  const onlyHour = argValue("--hour");
  const currentHour = hourKey(new Date(), config.timeZone);
  const files = await listHitHourFiles(config.hitLogDir);
  const selected = files.filter((file) => {
    if (onlyHour) return file.hourKey === onlyHour;
    if (!includeCurrent && file.hourKey >= currentHour) return false;
    return true;
  });

  if (selected.length === 0) {
    const skippedCurrent = files.filter((file) => file.hourKey >= currentHour);
    console.log(`No closed hours to roll up in ${config.hitLogDir} (current hour ${currentHour})`);
    if (skippedCurrent.length > 0) {
      console.log(
        `In-progress file(s) left for later: ${skippedCurrent.map((file) => file.hourKey).join(", ")}. Use --include-current to process now.`,
      );
    } else if (files.length === 0) {
      console.log("No hits-YYYYMMDDHH.jsonl files found. Check HIT_LOG_DIR.");
    }
    return;
  }

  const pool = createMysqlPool(config);
  const sink = createMysqlRollupSink(pool);

  try {
    for (const file of selected) {
      const hourStart = hourStartSqlFromKey(file.hourKey);
      if (!hourStart) {
        console.log(`skip ${file.hourKey} (bad hour key)`);
        continue;
      }
      const already = await sink.hasProcessedHour(config.tenantId, hourStart);
      if (already) {
        console.log(`skip ${file.hourKey} (already processed)`);
        continue;
      }
      const events = await readHitFile(file.filePath);
      const aggregate = aggregateHits(events, config.tenantId, config.timeZone, file.hourKey);
      if (!aggregate) {
        console.log(`skip ${file.hourKey} (bad hour key)`);
        continue;
      }
      const result = await sink.commitHour(aggregate);
      console.log(`${result} ${file.hourKey} (${aggregate.users.size} user-days, ${events.length} lines)`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
