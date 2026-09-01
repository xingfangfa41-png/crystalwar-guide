// EC 服务器在线人数采样 —— 由 cron-job.org 每分钟调用
// 方案：查中转站 mcsrvstat.us 拿在线人数 → 写入 Turso 数据库（samples 表）
// 不再写 GitHub history.json —— 彻底不触发 Vercel 部署、不耗部署额度
//
// 环境变量（Vercel 项目设置）：
//   TURSO_URL       —— Turso 数据库地址，形如 libsql://xxx.turso.io（或 https://xxx.turso.io）
//   TURSO_TOKEN     —— Turso 访问令牌
//   EC_CRON_SECRET  —— 可选，防止别人乱调接口（cron 时带 ?secret=xxx 或 Authorization）

const EC_STATUS = "https://api.mcsrvstat.us/bedrock/3/play.easecation.net";
const KEEP_DAYS = 40;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label + " 超时")), ms)),
  ]);
}

async function queryECOnce(ms) {
  const r = await withTimeout(fetch(EC_STATUS, {
    headers: { "User-Agent": "ec-stats-bot", Accept: "application/json" },
    cache: "no-store",
  }), ms, "查询中转站");
  if (!r.ok) throw new Error("中转站 HTTP " + r.status);
  const j = await r.json();
  if (!j || j.online !== true) throw new Error("服务器离线或查询失败");
  const online = j.players && typeof j.players.online === "number" ? j.players.online : null;
  if (online === null) throw new Error("返回里没有在线人数");
  return {
    online,
    max: (j.players && j.players.max) || 0,
    version: j.version || "",
    motd: (j.motd && j.motd.clean && j.motd.clean[0]) || "",
  };
}

// 中转站偶发慢响应（实测偶超 10s），失败自动重试一次
async function queryEC() {
  try { return await queryECOnce(12000); }
  catch (e) { return await queryECOnce(8000); }
}

// ---- Turso HTTP pipeline API ----
function tursoUrl() {
  let u = process.env.TURSO_URL || "";
  if (u.startsWith("libsql://")) u = "https://" + u.slice("libsql://".length);
  return u.replace(/\/$/, "");
}

// 构造参数：数字用 integer/float，字符串用 text，空用 null
function aInt(v) { return v === null || v === undefined ? { type: "null" } : { type: "integer", value: String(Math.round(v)) }; }
function aText(v) { return v === null || v === undefined ? { type: "null" } : { type: "text", value: String(v) }; }

async function tursoExec(stmts) {
  const body = { requests: stmts.map((s) => ({ type: "execute", stmt: s })).concat([{ type: "close" }]) };
  const r = await withTimeout(fetch(tursoUrl() + "/v2/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.TURSO_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), 12000, "写数据库");
  const j = await r.json();
  if (!r.ok) throw new Error("数据库 HTTP " + r.status + " " + JSON.stringify(j).slice(0, 200));
  const err = (j.results || []).find((x) => x.type === "error");
  if (err) throw new Error("数据库错误: " + (err.error && err.error.message || "unknown"));
  return j;
}

// 写入一个 EC 采样点（每分钟）
async function writeEC(now, ec) {
  const cutoff = now - KEEP_DAYS * 86400000;
  await tursoExec([
    // 只含 EC 的轻量点：g_json 留空，与群采样点区分
    { sql: "INSERT OR REPLACE INTO samples(ts,g_json,ec,ecMax,n,t,c) VALUES(?,NULL,?,?,NULL,NULL,NULL)",
      args: [aInt(now), aInt(ec.online), aInt(ec.max)] },
    // 顺带清理 40 天前的旧数据，防止无限增长
    { sql: "DELETE FROM samples WHERE ts < ?", args: [aInt(cutoff)] },
  ]);
}

// 读出当前总点数（用于返回提示）
async function countPoints() {
  const j = await tursoExec([{ sql: "SELECT COUNT(*) AS c FROM samples", args: [] }]);
  const rows = j.results[0] && j.results[0].response && j.results[0].response.result.rows;
  return rows && rows[0] && rows[0][0] ? Number(rows[0][0].value) : 0;
}

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  try {
    // 密钥校验
    const secret = process.env.EC_CRON_SECRET;
    if (secret) {
      const url = new URL(req.url, "http://x");
      const auth = (req.headers && req.headers["authorization"]) || "";
      if (url.searchParams.get("secret") !== secret && auth !== `Bearer ${secret}`) {
        return send(res, { error: "unauthorized" }, 401);
      }
    }
    if (!process.env.TURSO_URL || !process.env.TURSO_TOKEN) {
      return send(res, { error: "未配置 TURSO_URL / TURSO_TOKEN" }, 500);
    }

    const ec = await queryEC();
    const now = Date.now();
    await writeEC(now, ec);
    const points = await countPoints();
    const updated = new Date(now).toISOString().replace("T", " ").slice(0, 19) + " UTC";
    return send(res, { ok: true, ec, points, updated });
  } catch (e) {
    return send(res, { ok: false, error: String(e && e.message || e) }, 500);
  }
}

function send(res, obj, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}
