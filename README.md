# RT v1 — Massive Exchange traffic router

**Status: V1 is locked.** This is the running system at `https://rt.massive.exchange` (Node on port 43217 behind Apache, pm2, hourly cron). Do not change routing rules, charset, rollup semantics, or table keys without a V2 discussion.

RT accepts an HTTP request, inspects `$id`, and 302-redirects to that user's custom URL when one exists, otherwise their default URL. Successful scans are logged to JSONL and rolled into MySQL once an hour. `/leaderboard` is the public scoreboard.

Tenant `massive`, channel `u` (users). One live use case; tenant/channel are on every log line and table key so a second tenant does not require a schema rewrite.

## V1 surface

| Path | What it does |
| --- | --- |
| `GET /u/$id` | User router. 302 on a known legal id. HTML 404 otherwise. |
| `GET /leaderboard` | Public unique-scan ladder. `?period=today\|week\|month\|all` |
| `GET /health` | `{ ok, store, tenant }` |
| `GET /` | Local test harness (the four acceptance ids) |

Inbound query strings (UTM) are forwarded onto the destination URL.

**Not in V1:** `/e/` events, `/a/` activities, auth, realtime counters, campaign-scoped bucket tables, extra trophies beyond Most Uniques / Most Volume, parsing Apache logs as the source of truth.

## Routing (`/u/$id`)

1. Charset gate. No database hit if this fails.
2. `SELECT default_route, custom_route, user_name FROM user_routes WHERE id = ?`
3. No row → 404.
4. Non-empty `custom_route` wins; otherwise `default_route` (never null).
5. 302 (not 301).

### Id charset

- Lowercase `a-z` and digits `2-9` only
- Never `I`, `i`, `L`, `l`, `O`, `o`, `1`, or `0`
- Capitals and any other character are illegal
- **Never** lowercased or otherwise normalized
- Length is not a filter (ids are five characters today)

Pattern: `^[abcdefghjkmnpqrstuvwxyz2-9]+$`

### Acceptance ids

| ID | Account | Expected |
| --- | --- | --- |
| `2vvtr` | Chris Cedar | 302 to default route |
| `2xdkp` | Margaret Manx | 302 to custom route |
| `83838` | (none) | 404 |
| `A9dko` | illegal charset | 404, no database round-trip |

Example: `https://rt.massive.exchange/u/2vvtr?utm_source=foce&utm_medium=button&utm_campaign=week35_2026&utm_content=lapel`

## Scan tracking

Hot path does **not** write MySQL. After a successful 302, one JSON line is appended (404s are not logged):

```json
{"t":"2026-08-25T16:14:22.259Z","tenant":"massive","channel":"u","id":"2vvtr","ip":"203.0.113.40","utm_source":"foce","utm_medium":"button","utm_campaign":"week35_2026","utm_content":"lapel"}
```

Files: `$HIT_LOG_DIR/hits-YYYYMMDDHH.jsonl` in `CAMPAIGN_TZ` (America/Los_Angeles). Production directory is `/var/log/massive-rt`, owned by the same user as pm2 and cron (`ubuntu`). Unique counts use `X-Forwarded-For` from Apache, not `127.0.0.1`.

### Hourly rollup

`npm run rollup` (crontab at minute 5, as `ubuntu`) reads **closed** hours only. The in-progress hour is left alone so Node can keep appending. That is why a hand-run right after a click reports nothing to fold; wait for the next `:05`.

Idempotent via `scan_processed_hours`. Unique = one `(tenant, user id, IP)` per Pacific calendar day. Raw hits still increment. CGNAT / wifi-vs-cell inaccuracy is accepted.

```cron
5 * * * * cd /path/to/CUR-MassiveRT && /usr/bin/npm run rollup >> /var/log/massive-rt/rollup.log 2>&1
```

Optional: `npm run rollup -- --include-current` or `--hour 2026082511` (ops only, not the V1 cron contract).

UTM stays on the JSONL. It is not part of the bucket primary key.

## Leaderboard

`https://rt.massive.exchange/leaderboard`

- Ranked by **unique** scans; raw shown as heat
- Periods: today, this week (Monday start, Pacific), this month, all time
- Names from `user_routes.user_name` (Chris Cedar, Larry Lemon, …). No ids or IPs on the page
- Trophies: Most Uniques, Most Volume
- Empty until at least one closed hour has been rolled up

## Data

Database `massive-rt` on localhost MySQL.

`user_routes` (existing): `id`, `default_route`, `custom_route`, `memo`, `user_name`.

Scan tables (V1): see [`sql/scan_tables.sql`](sql/scan_tables.sql).

| Table | Role |
| --- | --- |
| `scan_day_buckets` | `tenant_id + user_id + bucket_day` → `raw_hits`, `unique_hits` |
| `scan_day_ips` | Dedupe set (hashed IP per tenant/user/day) |
| `scan_processed_hours` | Hours already committed |

## Production shape

```
browser → Apache TLS vhost rt.massive.exchange
       → http://127.0.0.1:43217  (pm2 name massive-rt)
       → MySQL massive-rt
cron   → npm run rollup at :05
```

Per-site Apache file (same pattern as `api.massiveemergency.com.conf`):

```apache
<VirtualHost *:80>
    ServerName rt.massive.exchange
    Redirect permanent / https://rt.massive.exchange/
</VirtualHost>

<VirtualHost *:443>
    ServerName rt.massive.exchange
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:43217/
    ProxyPassReverse / http://127.0.0.1:43217/
    # SSLEngine + certificate lines as on the other vhosts
</VirtualHost>
```

```bash
pm2 restart massive-rt
pm2 logs massive-rt --lines 50
curl -s http://127.0.0.1:43217/health
```

`/health` should report `"store":"mysql"` when `MYSQL_PASSWORD` is set.

### After `git pull`

Restart pm2 so the running process matches the tree. Cron already invokes `npm run rollup` from the clone; it does not need a restart.

## Local

```bash
npm install
cp .env.example .env
npm test
npm start
```

Listens on `http://127.0.0.1:43217`. Without `MYSQL_PASSWORD`: in-memory routes (Chris / Margaret), preview leaderboard ranks, JSONL under `var/hits`.

Node 20+.

## Environment

| Variable | V1 default | Notes |
| --- | --- | --- |
| `PORT` | `43217` | |
| `TENANT_ID` | `massive` | On every log line and scan row |
| `CAMPAIGN_TZ` | `America/Los_Angeles` | Hour files and calendar buckets |
| `HIT_LOG_DIR` | `var/hits` locally; `/var/log/massive-rt` when MySQL is on | Must be writable by the pm2 user |
| `MYSQL_HOST` | `localhost` | |
| `MYSQL_PORT` | `3306` | |
| `MYSQL_USER` | `massiveRT-RW` | |
| `MYSQL_PASSWORD` | empty | Empty → memory store; set → live DB |
| `MYSQL_DATABASE` | `massive-rt` | |
