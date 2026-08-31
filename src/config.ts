export type Config = {
  port: number;
  mysqlHost: string;
  mysqlPort: number;
  mysqlUser: string;
  mysqlPassword: string;
  mysqlDatabase: string;
  tenantId: string;
  timeZone: string;
  hitLogDir: string;
};

function readInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mysqlPassword = env.MYSQL_PASSWORD ?? "";
  return {
    port: readInt(env.PORT, 43217),
    mysqlHost: env.MYSQL_HOST ?? "localhost",
    mysqlPort: readInt(env.MYSQL_PORT, 3306),
    mysqlUser: env.MYSQL_USER ?? "massiveRT-RW",
    mysqlPassword,
    mysqlDatabase: env.MYSQL_DATABASE ?? "massive-rt",
    tenantId: env.TENANT_ID ?? "massive",
    timeZone: env.CAMPAIGN_TZ ?? "America/Los_Angeles",
    hitLogDir: env.HIT_LOG_DIR ?? (mysqlPassword ? "/var/log/massive-rt" : "var/hits"),
  };
}

export function usesMysql(config: Config): boolean {
  return config.mysqlPassword.length > 0;
}
