// 公开接口：EC 全服在线人数（分钟级采样）
// GET /api/ec（最近 40 天）；截图可指定 range=1、7、30 或 all。
// 返回 { points: [{ts:毫秒时间戳, ec:在线人数}], updated: "yyyy-mm-dd hh:mm:ss" }
// 无需密钥，CORS 全开，供外部脚本/数据面板使用。

const RECENT_DAYS = 40;

// SQLite 的单个 MIN/MAX 聚合会将 ts 取自对应极值所在的行。
// 点数较多时，每个时间桶保留实际峰值和谷值，另外保留首尾记录。
const SCREENSHOT_SQL = `
  WITH selected AS (
    SELECT ts, ec FROM samples WHERE ts >= ? AND ec >= 0
  ),
  summary AS (
    SELECT MIN(ts) AS first_ts, MAX(ts) AS last_ts, COUNT(*) AS sample_count
    FROM selected
  ),
  buckets AS (
    SELECT ts, ec, CASE WHEN sample_count <= 2400 THEN ts
      ELSE (ts - first_ts) * 1100 / (last_ts - first_ts + 1) END AS bucket
    FROM selected CROSS JOIN summary
  ),
  chart AS (
    SELECT ts, MIN(ec) AS ec FROM buckets GROUP BY bucket
    UNION
    SELECT ts, MAX(ec) AS ec FROM buckets GROUP BY bucket
    UNION
    SELECT ts, ec FROM selected CROSS JOIN summary WHERE ts IN (first_ts, last_ts)
  )
  SELECT ts, ec, sample_count FROM chart CROSS JOIN summary ORDER BY ts ASC
`;

async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + " 超时")), ms);
    })]);
  } finally {
    clearTimeout(timer);
  }
}
function tursoUrl() {
  let u = process.env.TURSO_URL || "";
  if (u.startsWith("libsql://")) u = "https://" + u.slice("libsql://".length);
  return u.replace(/\/$/, "");
}
function aInt(v) { return { type: "integer", value: String(Math.round(v)) }; }
function cellVal(c) { return c && c.value !== undefined ? c.value : null; }

export const config = { maxDuration: 20 };

const EC_RANGES = ["1", "7", "30", "all"];

async function readEcHistory(range) {
  if (!process.env.TURSO_URL || !process.env.TURSO_TOKEN) {
    throw new Error("数据库未配置");
  }
  const screenshot = EC_RANGES.includes(range);
  const now = Date.now();
  const stmt = screenshot ? {
    sql: SCREENSHOT_SQL,
    args: [aInt(range === "all" ? 0 : now - Number(range) * 86400000)],
  } : {
    sql: "SELECT ts,ec FROM samples WHERE ec IS NOT NULL AND ts>=? ORDER BY ts ASC",
    args: [aInt(now - RECENT_DAYS * 86400000)],
  };
  const body = {
    requests: [
      { type: "execute", stmt },
      { type: "close" },
    ],
  };
  const r = await withTimeout(fetch(tursoUrl() + "/v2/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.TURSO_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), 12000, "读数据库");
  const j = await r.json();
  if (!r.ok) throw Object.assign(new Error("数据库 HTTP " + r.status), { status: 502 });
  const err = (j.results || []).find((x) => x.type === "error");
  if (err) throw Object.assign(new Error(err.error && err.error.message || "db error"), { status: 502 });
  const rows = j.results[0].response.result.rows || [];
  const points = rows.map((row) => ({ ts: Number(cellVal(row[0])), ec: Number(cellVal(row[1])) }));
  const count = screenshot && rows.length ? Number(cellVal(rows[0][2])) : points.length;
  const updated = points.length ? new Date(points[points.length - 1].ts).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "";
  return { points, updated, count };
}

function sendError(res, status, error) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify({ error }));
}

async function sendCard(req, res, range = "7") {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return sendError(res, 405, "仅支持 GET 和 HEAD");
  }
  if (!EC_RANGES.includes(range)) return sendError(res, 400, "range 可选 1、7、30、all");

  try {
    const history = await readEcHistory(range);
    const { renderEcCard } = await import("../lib/ec-card.js");
    const png = renderEcCard(history, range);
    res.statusCode = 200;
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", png.length);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(req.method === "HEAD" ? undefined : png);
  } catch (error) {
    console.error("EC trend card generation failed:", error);
    sendError(res, 502, "暂时无法生成趋势图");
  }
}

export default async function handler(req, res) {
  try {
    const params = new URL(req.url, "http://localhost").searchParams;
    const range = params.get("range");
    if (params.get("format") === "png") return await sendCard(req, res, range ?? "7");
    const history = await readEcHistory(range);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(history));
  } catch (e) {
    res.statusCode = e.status || 500; res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: String(e && e.message || e) }));
  }
}
