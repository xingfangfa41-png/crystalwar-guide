// 公开接口：EC 全服在线人数（分钟级采样）
// GET /api/ec
// 返回 { points: [{ts:毫秒时间戳, ec:在线人数}], updated: "yyyy-mm-dd hh:mm:ss" }
// 无需密钥，CORS 全开，供外部脚本/数据面板使用。

const KEEP_DAYS = 40;

function withTimeout(promise, ms, label) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(label + " 超时")), ms))]);
}
function tursoUrl() {
  let u = process.env.TURSO_URL || "";
  if (u.startsWith("libsql://")) u = "https://" + u.slice("libsql://".length);
  return u.replace(/\/$/, "");
}
function aInt(v) { return { type: "integer", value: String(Math.round(v)) }; }
function cellVal(c) { return c && c.value !== undefined ? c.value : null; }

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  try {
    if (!process.env.TURSO_URL || !process.env.TURSO_TOKEN) {
      res.statusCode = 500; res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "数据库未配置" }));
    }
    const cutoff = Date.now() - KEEP_DAYS * 86400000;
    const body = {
      requests: [
        { type: "execute", stmt: { sql: "SELECT ts,ec FROM samples WHERE ec IS NOT NULL AND ts>=? ORDER BY ts ASC", args: [aInt(cutoff)] } },
        { type: "close" },
      ],
    };
    const r = await withTimeout(fetch(tursoUrl() + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.TURSO_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }), 12000, "读数据库");
    const j = await r.json();
    if (!r.ok) { res.statusCode = 502; return res.end(JSON.stringify({ error: "数据库 HTTP " + r.status })); }
    const err = (j.results || []).find((x) => x.type === "error");
    if (err) { res.statusCode = 502; return res.end(JSON.stringify({ error: err.error && err.error.message || "db error" })); }
    const rows = j.results[0].response.result.rows || [];
    const points = rows.map((row) => ({ ts: Number(cellVal(row[0])), ec: Number(cellVal(row[1])) }));
    const updated = points.length ? new Date(points[points.length - 1].ts).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "";
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify({ points, updated, count: points.length }));
  } catch (e) {
    res.statusCode = 500; res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: String(e && e.message || e) }));
  }
}
