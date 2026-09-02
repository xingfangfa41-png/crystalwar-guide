// 群资料快照接口 —— 从 Turso 读最新一轮采样的 群人数/群名/加群链接
// 前端打开页面只发这 1 个请求拿全量，替代原来逐群 119 次实时查询
// （不卡、不耗访客接口额度、不触发 uapis 限流）
// 数据由 api/group-sample.js 每 6 小时写入 qq_groups 表
//
// 环境变量：TURSO_URL、TURSO_TOKEN

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
    const j = await tursoExec([
      { sql: "CREATE TABLE IF NOT EXISTS qq_groups (id TEXT PRIMARY KEY, name TEXT, cnt INTEGER, mx INTEGER, join_url TEXT, ts INTEGER)", args: [] },
      { sql: "SELECT id,name,cnt,mx,join_url,ts FROM qq_groups", args: [] },
    ]);
    const result = j.results[1].response.result;
    const rows = result.rows || [];
    const cols = result.cols.map((c) => c.name);
    const groups = {};
    let latest = 0;
    rows.forEach((row) => {
      const o = {};
      cols.forEach((cn, i) => { o[cn] = cellVal(row[i]); });
      if (!o.id) return;
      groups[o.id] = {
        name: o.name || "",
        count: o.cnt !== null ? Number(o.cnt) : null,
        max: o.mx !== null ? Number(o.mx) : 0,
        join: o.join_url || "",
      };
      const ts = Number(o.ts || 0);
      if (ts > latest) latest = ts;
    });
    const updated = latest
      ? new Date(latest).toISOString().replace("T", " ").slice(0, 19) + " UTC"
      : "";
    return send(res, { groups, updated });
  } catch (e) {
    return send(res, { error: String(e && e.message || e) }, 500);
  }
}

function send(res, obj, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  /* 数据每 6 小时才变一次，边缘缓存 5 分钟完全够用，还能挡掉重复刷新 */
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(obj));
}
