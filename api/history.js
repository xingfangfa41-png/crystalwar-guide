// history 数据接口 —— 从 Turso 数据库读采样点，返回与旧 history.json 完全相同的格式
// 前端两个页面（trends.html / EC社群自治.html）都走这里，无需改动前端
// 数据不再存 GitHub 文件，采样写库不触发 Vercel 部署、不耗额度
//
// 环境变量：TURSO_URL、TURSO_TOKEN

const KEEP_DAYS = 40;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label + " 超时")), ms)),
  ]);
}
function tursoUrl() {
  let u = process.env.TURSO_URL || "";
  if (u.startsWith("libsql://")) u = "https://" + u.slice("libsql://".length);
  return u.replace(/\/$/, "");
}
function aInt(v) { return { type: "integer", value: String(Math.round(v)) }; }

async function tursoExec(stmts) {
  const body = { requests: stmts.map((s) => ({ type: "execute", stmt: s })).concat([{ type: "close" }]) };
  const r = await withTimeout(fetch(tursoUrl() + "/v2/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.TURSO_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), 12000, "读数据库");
  const j = await r.json();
  if (!r.ok) throw new Error("数据库 HTTP " + r.status);
  const err = (j.results || []).find((x) => x.type === "error");
  if (err) throw new Error("数据库错误: " + (err.error && err.error.message || "unknown"));
  return j;
}

function cellVal(c) { return c && c.value !== undefined ? c.value : null; }

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  try {
    if (!process.env.TURSO_URL || !process.env.TURSO_TOKEN) {
      return send(res, { error: "未配置 TURSO_URL / TURSO_TOKEN" }, 500);
    }
    const cutoff = Date.now() - KEEP_DAYS * 86400000;
    const j = await tursoExec([
      { sql: "SELECT ts,g_json,ec,ecMax,bj,n,t,c FROM samples WHERE ts>=? ORDER BY ts ASC", args: [aInt(cutoff)] },
    ]);
    const rows = j.results[0].response.result.rows || [];
    const cols = j.results[0].response.result.cols.map((c) => c.name);
    const points = rows.map((row) => {
      const o = {};
      cols.forEach((cn, i) => { o[cn] = cellVal(row[i]); });
      const p = { ts: Number(o.ts) };
      if (o.g_json) { try { p.g = JSON.parse(o.g_json); } catch (e) {} }
      if (o.ec !== null) p.ec = Number(o.ec);
      if (o.ecMax !== null) p.ecMax = Number(o.ecMax);
      if (o.bj !== null) p.bj = Number(o.bj);
      if (o.n !== null) p.n = Number(o.n);
      if (o.t !== null) p.t = Number(o.t);
      if (o.c !== null) p.c = Number(o.c);
      return p;
    });
    const updated = points.length
      ? new Date(points[points.length - 1].ts).toISOString().replace("T", " ").slice(0, 19) + " UTC"
      : "";
    return send(res, { points, updated });
  } catch (e) {
    return send(res, { error: String(e && e.message || e) }, 500);
  }
}

function send(res, obj, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(obj));
}
