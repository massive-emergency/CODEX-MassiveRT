import express, { type Express, type Request, type Response } from "express";
import type { HitRecorder } from "./hit-log";
import { isLegalUserId } from "./id";
import type { LeaderboardStore } from "./leaderboard";
import { parsePeriod } from "./leaderboard";
import { harnessPage, landedPage, leaderboardErrorPage, leaderboardPage, notFoundPage } from "./pages";
import { pickDestination, queryStringFromUrl, withForwardedQuery } from "./redirect";
import type { RouteStore } from "./store";

export type AppOptions = {
  store: RouteStore;
  storeName: "memory" | "mysql";
  tenantId?: string;
  leaderboard?: LeaderboardStore;
  recordHit?: HitRecorder;
  previewLeaderboard?: boolean;
};

function sendNotFound(res: Response): void {
  res.status(404).type("html").send(notFoundPage());
}

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

function utmValue(req: Request, key: string): string | null {
  return firstQueryValue(req.query[key]) ?? null;
}

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "";
}

export function createApp({
  store,
  storeName,
  tenantId = "massive",
  leaderboard,
  recordHit,
  previewLeaderboard = false,
}: AppOptions): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple");
  app.set("trust proxy", 1);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, store: storeName, tenant: tenantId });
  });

  app.get("/", (_req, res) => {
    res.type("html").send(harnessPage(storeName));
  });

  app.get("/leaderboard", async (req, res) => {
    if (!leaderboard) {
      res.status(503).type("html").send(leaderboardErrorPage());
      return;
    }
    const period = parsePeriod(firstQueryValue(req.query.period));
    try {
      const result = await leaderboard.getLeaderboard(period);
      res.type("html").send(leaderboardPage(result, previewLeaderboard));
    } catch {
      res.status(500).type("html").send(leaderboardErrorPage());
    }
  });

  app.get("/_preview/landed", (req, res) => {
    const query: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(req.query)) {
      query[key] = firstQueryValue(value);
    }
    res.type("html").send(landedPage(query));
  });

  app.get("/u/:id", async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || !isLegalUserId(id)) {
      sendNotFound(res);
      return;
    }

    try {
      const row = await store.findById(id);
      if (!row) {
        sendNotFound(res);
        return;
      }

      const destination = pickDestination(row);
      if (!destination) {
        sendNotFound(res);
        return;
      }

      const location = withForwardedQuery(destination, queryStringFromUrl(req.originalUrl));
      res.redirect(302, location);

      if (recordHit) {
        void recordHit({
          t: new Date().toISOString(),
          tenant: tenantId,
          channel: "u",
          id,
          ip: clientIp(req),
          utm_source: utmValue(req, "utm_source"),
          utm_medium: utmValue(req, "utm_medium"),
          utm_campaign: utmValue(req, "utm_campaign"),
          utm_content: utmValue(req, "utm_content"),
        }).catch((error: unknown) => {
          console.error("hit log failed", error);
        });
      }
    } catch {
      res.status(500).type("text").send("Router failed to look up that user.");
    }
  });

  app.use((_req, res) => {
    sendNotFound(res);
  });

  return app;
}
