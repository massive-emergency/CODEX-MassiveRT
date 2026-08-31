import mysql from "mysql2/promise";
import type { RouteStore, UserRoute } from "./store";

type RouteRow = {
  default_route: string;
  custom_route: string | null;
  user_name: string | null;
};

export async function createMysqlStore(pool: mysql.Pool): Promise<RouteStore> {
  const connection = await pool.getConnection();
  connection.release();

  return {
    async findById(id: string): Promise<UserRoute | null> {
      const [rows] = await pool.execute<mysql.RowDataPacket[]>(
        "SELECT default_route, custom_route, user_name FROM user_routes WHERE id = ?",
        [id],
      );
      const row = rows[0] as RouteRow | undefined;
      if (!row) return null;
      return {
        id,
        default_route: row.default_route,
        custom_route: row.custom_route,
        user_name: row.user_name ?? undefined,
      };
    },
    async close() {
      // Pool lifetime is owned by the process, not the route store.
    },
  };
}
