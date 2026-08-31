import assert from "node:assert/strict";
import { describe, test } from "node:test";
import request from "supertest";
import { createApp } from "./app";
import type { HitEvent } from "./hit-log";
import { createMemoryLeaderboardStore } from "./store.leaderboard.memory";
import {
  CHRIS_CEDAR_ID,
  ILLEGAL_USER_ID,
  MARGARET_MANX_ID,
  MISSING_USER_ID,
  createMemoryStore,
  memoryDestination,
} from "./store.memory";
import type { RouteStore, UserRoute } from "./store";

function trackingStore(inner: RouteStore): { store: RouteStore; lookups: string[] } {
  const lookups: string[] = [];
  return {
    lookups,
    store: {
      async findById(id: string): Promise<UserRoute | null> {
        lookups.push(id);
        return inner.findById(id);
      },
      close: () => inner.close(),
    },
  };
}

describe("GET /u/:id", () => {
  test("Chris Cedar uses the default route and keeps UTM params", async () => {
    const app = createApp({ store: createMemoryStore(), storeName: "memory" });
    const response = await request(app)
      .get(`/u/${CHRIS_CEDAR_ID}?utm_source=foce&utm_medium=button&utm_campaign=week35_2026&utm_content=lapel`)
      .redirects(0);

    assert.equal(response.status, 302);
    const location = new URL(response.headers.location, "http://rt.local");
    assert.equal(location.pathname, "/_preview/landed");
    assert.equal(location.searchParams.get("user"), CHRIS_CEDAR_ID);
    assert.equal(location.searchParams.get("rule"), "default");
    assert.equal(location.searchParams.get("utm_source"), "foce");
    assert.equal(location.searchParams.get("utm_medium"), "button");
    assert.equal(location.searchParams.get("utm_campaign"), "week35_2026");
    assert.equal(location.searchParams.get("utm_content"), "lapel");
  });

  test("Margaret Manx uses the custom route", async () => {
    const app = createApp({ store: createMemoryStore(), storeName: "memory" });
    const response = await request(app).get(`/u/${MARGARET_MANX_ID}`).redirects(0);

    assert.equal(response.status, 302);
    assert.equal(response.headers.location, memoryDestination(MARGARET_MANX_ID, "Margaret Manx", "custom"));
  });

  test("a legal id with no row returns 404", async () => {
    const app = createApp({ store: createMemoryStore(), storeName: "memory" });
    const response = await request(app).get(`/u/${MISSING_USER_ID}`);

    assert.equal(response.status, 404);
    assert.match(response.text, /not found/i);
  });

  test("an illegal id returns 404 without querying the store", async () => {
    const tracked = trackingStore(createMemoryStore());
    const app = createApp({ store: tracked.store, storeName: "memory" });
    const response = await request(app).get(`/u/${ILLEGAL_USER_ID}`);

    assert.equal(response.status, 404);
    assert.deepEqual(tracked.lookups, []);
  });
});

describe("ops routes", () => {
  test("health reports the active store", async () => {
    const app = createApp({ store: createMemoryStore(), storeName: "memory" });
    const response = await request(app).get("/health");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true, store: "memory", tenant: "massive" });
  });

  test("leaderboard renders preview ranks and trophies", async () => {
    const app = createApp({
      store: createMemoryStore(),
      storeName: "memory",
      leaderboard: createMemoryLeaderboardStore("massive"),
      previewLeaderboard: true,
    });
    const response = await request(app).get("/leaderboard?period=week");
    assert.equal(response.status, 200);
    assert.match(response.text, /The Button Game - Leaderboard/);
    assert.match(response.text, /Larry Lemon/);
    assert.match(response.text, /Most Uniques/);
    assert.match(response.text, /This week/);
  });
});

describe("hit logging", () => {
  test("records a successful scan with UTM and skips 404s", async () => {
    const hits: HitEvent[] = [];
    const app = createApp({
      store: createMemoryStore(),
      storeName: "memory",
      recordHit: async (event) => {
        hits.push(event);
      },
    });

    await request(app)
      .get(`/u/${CHRIS_CEDAR_ID}?utm_source=foce&utm_medium=button&utm_campaign=week35_2026&utm_content=lapel`)
      .set("X-Forwarded-For", "203.0.113.40")
      .redirects(0);
    await request(app).get(`/u/${MISSING_USER_ID}`);
    await request(app).get(`/u/${ILLEGAL_USER_ID}`);

    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, CHRIS_CEDAR_ID);
    assert.equal(hits[0].tenant, "massive");
    assert.equal(hits[0].channel, "u");
    assert.equal(hits[0].ip, "203.0.113.40");
    assert.equal(hits[0].utm_source, "foce");
    assert.equal(hits[0].utm_campaign, "week35_2026");
    assert.equal(hits[0].utm_content, "lapel");
  });
});
