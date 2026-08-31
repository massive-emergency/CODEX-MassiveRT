import type { RouteStore, UserRoute } from "./store";

export const CHRIS_CEDAR_ID = "2vvtr";
export const MARGARET_MANX_ID = "2xdkp";
export const MISSING_USER_ID = "83838";
export const ILLEGAL_USER_ID = "A9dko";

export function memoryDestination(id: string, name: string, rule: "default" | "custom"): string {
  const params = new URLSearchParams({
    user: id,
    name,
    rule,
  });
  return `/_preview/landed?${params.toString()}`;
}

export const MEMORY_ROUTES: UserRoute[] = [
  {
    id: CHRIS_CEDAR_ID,
    user_name: "Chris Cedar",
    default_route: memoryDestination(CHRIS_CEDAR_ID, "Chris Cedar", "default"),
    custom_route: null,
  },
  {
    id: MARGARET_MANX_ID,
    user_name: "Margaret Manx",
    default_route: memoryDestination(MARGARET_MANX_ID, "Margaret Manx", "default"),
    custom_route: memoryDestination(MARGARET_MANX_ID, "Margaret Manx", "custom"),
  },
];

export function createMemoryStore(rows: UserRoute[] = MEMORY_ROUTES): RouteStore {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return {
    async findById(id: string) {
      return byId.get(id) ?? null;
    },
    async close() {
      // nothing to close
    },
  };
}
