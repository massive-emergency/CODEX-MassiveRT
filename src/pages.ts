import type { LeaderboardResult } from "./leaderboard";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout(title: string, body: string, extraCss = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #12141a;
      --panel: #1c2029;
      --line: #2c3340;
      --text: #e8e6df;
      --muted: #9aa3b2;
      --accent: #e0a24b;
      --ok: #7dba7a;
      --bad: #d16b6b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
    }
    main {
      width: min(720px, calc(100% - 32px));
      margin: 0 auto;
      padding: 40px 0 64px;
    }
    h1 { font-size: 1.6rem; margin: 0 0 8px; }
    p { color: var(--muted); }
    a { color: var(--accent); }
    .kicker {
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-size: 0.75rem;
      color: var(--accent);
      margin-bottom: 12px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 16px 18px;
      margin: 12px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      align-items: baseline;
    }
    code, .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .status-ok { color: var(--ok); }
    .status-bad { color: var(--bad); }
    .cases { display: grid; gap: 12px; }
    @media (min-width: 700px) {
      .cases { grid-template-columns: 1fr 1fr; }
    }
    ${extraCss}
  </style>
</head>
<body>
  <main>
    ${body}
  </main>
</body>
</html>`;
}

export function notFoundPage(): string {
  return layout(
    "Link not found",
    `<p class="kicker">RT</p>
     <h1>This user link was not found</h1>
     <p>The address you opened is not a valid Massive Exchange user route. Check the code on the QR or typed URL and try again.</p>`,
  );
}

export function harnessPage(storeName: string): string {
  return layout(
    "RT user routing",
    `<p class="kicker">Massive Exchange · RT</p>
     <h1>User traffic router</h1>
     <p>Open a <span class="mono">/u/$id</span> link. Legal ids are looked up in <span class="mono">user_routes</span>. Custom route wins when present; otherwise the default route is used. Illegal characters (I, i, L, l, O, o, 1, 0, or any capital) 404 before the database.</p>
     <div class="card row">
       <span>Active store</span>
       <strong class="mono">${escapeHtml(storeName)}</strong>
     </div>
     <p><a href="/leaderboard">Scan leaderboard</a></p>
     <h2>Acceptance cases</h2>
     <div class="cases">
       <article class="card">
         <div class="row"><strong>Chris Cedar</strong><span class="status-ok">default</span></div>
         <p><span class="mono">2vvtr</span> exists. Custom route is empty, so the default route is used.</p>
         <a href="/u/2vvtr?utm_source=foce&utm_medium=button&utm_campaign=week35_2026&utm_content=lapel">Open /u/2vvtr with UTM</a>
       </article>
       <article class="card">
         <div class="row"><strong>Margaret Manx</strong><span class="status-ok">custom</span></div>
         <p><span class="mono">2xdkp</span> exists. Custom route is present, so it takes precedence.</p>
         <a href="/u/2xdkp?utm_source=foce&utm_medium=button&utm_campaign=week35_2026&utm_content=lapel">Open /u/2xdkp with UTM</a>
       </article>
       <article class="card">
         <div class="row"><strong>Missing user</strong><span class="status-bad">404</span></div>
         <p><span class="mono">83838</span> is a legal id that is not in the table.</p>
         <a href="/u/83838">Open /u/83838</a>
       </article>
       <article class="card">
         <div class="row"><strong>Illegal id</strong><span class="status-bad">404, no DB</span></div>
         <p><span class="mono">A9dko</span> contains a capital A and the letter o. Reject immediately.</p>
         <a href="/u/A9dko">Open /u/A9dko</a>
       </article>
     </div>`,
  );
}

export function landedPage(query: Record<string, string | undefined>): string {
  const rule = query.rule === "custom" ? "custom route" : "default route";
  const name = query.name || "Unknown user";
  const user = query.user || "";
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const utmRows = utmKeys
    .filter((key) => query[key])
    .map(
      (key) =>
        `<div class="row"><span class="mono">${escapeHtml(key)}</span><span>${escapeHtml(query[key] ?? "")}</span></div>`,
    )
    .join("");

  return layout(
    `Landed · ${name}`,
    `<p class="kicker">Preview destination</p>
     <h1>${escapeHtml(name)}</h1>
     <p>The router sent this browser here. In production this would be the URL stored on the user row.</p>
     <div class="card">
       <div class="row"><span>User id</span><strong class="mono">${escapeHtml(user)}</strong></div>
       <div class="row"><span>Rule</span><strong class="status-ok">${escapeHtml(rule)}</strong></div>
     </div>
     <div class="card">
       <strong>Forwarded query</strong>
       ${utmRows || "<p>No UTM parameters were forwarded.</p>"}
     </div>
     <p><a href="/">Back to test cases</a></p>`,
  );
}

const LEADERBOARD_CSS = `
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
    .tabs a {
      text-decoration: none;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 6px 12px;
      color: var(--muted);
    }
    .tabs a.active {
      color: var(--bg);
      background: var(--accent);
      border-color: var(--accent);
    }
    .trophies { display: grid; gap: 12px; }
    @media (min-width: 700px) {
      .trophies { grid-template-columns: 1fr 1fr; }
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 4px; border-bottom: 1px solid var(--line); }
    th { color: var(--muted); font-weight: 600; font-size: 0.85rem; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    .rank { color: var(--muted); width: 2.5rem; }
    .empty { margin: 24px 0; }
`;

const PERIOD_LABELS = {
  today: "Today",
  week: "This week",
  month: "This month",
  all: "All time",
} as const;

export function leaderboardPage(result: LeaderboardResult, preview: boolean): string {
  const tabs = (["today", "week", "month", "all"] as const)
    .map((period) => {
            const active = period === result.period ? "active" : "";
      return `<a class="${active}" href="/leaderboard?period=${period}">${PERIOD_LABELS[period]}</a>`;
    })
    .join("");

  const range =
    result.period === "all"
      ? "The whole campaign so far"
      : result.fromDay === result.toDay
        ? result.asOfDay
        : `${result.fromDay} to ${result.toDay}`;

  const trophyCards =
    result.rows.length === 0
      ? ""
      : `<div class="trophies">
           <article class="card">
             <div class="row"><strong>Most Uniques</strong><span class="status-ok">trophy</span></div>
             <p>${
               result.trophies.mostUniques
                 ? `<strong>${escapeHtml(result.trophies.mostUniques)}</strong> is bringing the most unique eyes.`
                 : "No unique scans yet."
             }</p>
           </article>
           <article class="card">
             <div class="row"><strong>Most Volume</strong><span class="status-ok">trophy</span></div>
             <p>${
               result.trophies.mostVolume
                 ? `<strong>${escapeHtml(result.trophies.mostVolume)}</strong> has the most raw scans.`
                 : "No scans yet."
             }</p>
           </article>
         </div>`;

  const table =
    result.rows.length === 0
      ? `<p class="empty">No scans counted for this period yet. Counts land after the hourly rollup.</p>`
      : `<table>
           <thead>
             <tr>
               <th class="rank">#</th>
               <th>Scout</th>
               <th class="num">Uniques</th>
               <th class="num">Raw</th>
             </tr>
           </thead>
           <tbody>
             ${result.rows
               .map(
                 (row) => `<tr>
               <td class="rank">${row.rank}</td>
               <td>${escapeHtml(row.userName)}</td>
               <td class="num">${row.uniqueHits}</td>
               <td class="num">${row.rawHits}</td>
             </tr>`,
               )
               .join("")}
           </tbody>
         </table>`;

  const previewNote = preview
    ? `<p>Preview data — live counts come from MySQL after <span class="mono">npm run rollup</span>.</p>`
    : "";

  return layout(
    `Leaderboard · ${PERIOD_LABELS[result.period]}`,
    `<p class="kicker">The Button Game - Leaderboard</p>
     <h1>Scan leaderboard</h1>
     <p>Who is driving the most unique eyes. Ranked by unique scans; raw hits are shown for heat. Names are pseudonyms.</p>
     ${previewNote}
     <div class="tabs">${tabs}</div>
     <p>${escapeHtml(range)}</p>
     ${trophyCards}
     <div class="card">${table}</div>
     <p><a href="/">Router test cases</a></p>`,
    LEADERBOARD_CSS,
  );
}

export function leaderboardErrorPage(): string {
  return layout(
    "Leaderboard unavailable",
    `<p class="kicker">RT</p>
     <h1>Leaderboard unavailable</h1>
     <p>The scan totals could not be read right now. Try again in a minute.</p>
     <p><a href="/leaderboard">Retry</a> · <a href="/">Home</a></p>`,
  );
}
