import "dotenv/config";
import { createApp } from "./app";
import { loadConfig, usesMysql } from "./config";
import { createFileHitRecorder } from "./hit-log";
import { createMemoryLeaderboardStore } from "./store.leaderboard.memory";
import { createMysqlLeaderboardStore, createMysqlPool } from "./store.leaderboard.mysql";
import { createMemoryStore } from "./store.memory";
import { createMysqlStore } from "./store.mysql";
import type { LeaderboardStore } from "./leaderboard";
import type { RouteStore } from "./store";

async function main(): Promise<void> {
  const config = loadConfig();
  let store: RouteStore;
  let storeName: "memory" | "mysql";
  let leaderboard: LeaderboardStore;
  let previewLeaderboard = false;
  let close = async () => undefined;

  if (usesMysql(config)) {
    const pool = createMysqlPool(config);
    store = await createMysqlStore(pool);
    storeName = "mysql";
    leaderboard = createMysqlLeaderboardStore(pool, config.tenantId, config.timeZone);
    close = async () => {
      await pool.end();
    };
    console.log(
      `RT using MySQL ${config.mysqlUser}@${config.mysqlHost}:${config.mysqlPort}/${config.mysqlDatabase} tenant=${config.tenantId}`,
    );
  } else {
    store = createMemoryStore();
    storeName = "memory";
    leaderboard = createMemoryLeaderboardStore(config.tenantId);
    previewLeaderboard = true;
    console.log("RT using in-memory store (set MYSQL_PASSWORD to use MySQL)");
  }

  const recordHit = createFileHitRecorder(config.hitLogDir, config.timeZone);
  const app = createApp({
    store,
    storeName,
    tenantId: config.tenantId,
    leaderboard,
    recordHit,
    previewLeaderboard,
  });
  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`RT listening on http://127.0.0.1:${config.port}`);
    console.log(`Hit log directory ${config.hitLogDir}`);
  });

  const shutdown = async () => {
    server.close();
    await close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
