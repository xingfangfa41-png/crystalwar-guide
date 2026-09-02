// 群人数采样 —— 由 cron-job.org 每 6 小时调用一次
// 流程：读仓库 data.js 里的群列表和 uapis key → 并发查询各群人数 → 写入 Turso 数据库
// 完全不走 GitHub 提交，不耗 Vercel 部署额度
//
// 环境变量（Vercel 项目设置）：
//   TURSO_URL / TURSO_TOKEN —— 数据库
//   EC_CRON_SECRET          —— 调用密钥（cron 带 ?secret=xxx）

const UAPI = "https://uapis.cn/api/v1/social/qq/groupinfo";
const DATA_JS = "https://raw.githubusercontent.com/xingfangfa41-png/crystalwar-guide/main/data.js";
const KEEP_DAYS = 40;
const CONCURRENCY = 15;      // 并发查询数
const PER_REQ_TIMEOUT = 12000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label + " 超时")), ms)),
  ]);
}

// ---- Turso ----
function tursoUrl() {
  let u = process.env.TURSO_URL || "";
  if (u.startsWith("libsql://")) u = "https://" + u.slice("libsql://".length);
  return u.replace(/\/$/, "");
}
function aInt(v) { return v === null || v === undefined ? { type: "null" } : { type: "integer", value: String(Math.round(v)) }; }
function aText(v) { return v === null || v === undefined ? { type: "null" } : { type: "text", value: String(v) }; }
function aFloat(v) { return v === null || v === undefined ? { type: "null" } : { type: "float", value: Number(v) }; }

async function tursoExec(stmts) {
  const body = { requests: stmts.map((s) => ({ type: "execute", stmt: s })).concat([{ type: "close" }]) };
  const r = await withTimeout(fetch(tursoUrl() + "/v2/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.TURSO_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), 12000, "写数据库");
  const j = await r.json();
  if (!r.ok) throw new Error("数据库 HTTP " + r.status);
  const err = (j.results || []).find((x) => x.type === "error");
  if (err) throw new Error("数据库错误: " + (err.error && err.error.message || "unknown"));
  return j;
}

// ---- 读 data.js：群列表 + uapis key ----
async function loadGroupConfig() {
  const r = await withTimeout(fetch(DATA_JS, { cache: "no-store" }), 10000, "读取群列表");
  const src = await r.text();
  const ids = [...new Set([...src.matchAll(/id:\s*"(\d+)"/g)].map((m) => m[1]))];
  const km = src.match(/uapiKey:\s*"([^"]+)"/);
  return { ids, key: km ? km[1] : "" };
}

// ---- 查单个群 ----
async function queryOne(gid, key) {
  try {
    const url = `${UAPI}?group_id=${gid}` + (key ? `&apikey=${key}` : "");
    const r = await withTimeout(fetch(url, { headers: { "User-Agent": "ec-stats-bot" } }), PER_REQ_TIMEOUT, "查询群");
    const j = await r.json();
    const c = j.member_count;
    return typeof c === "number" ? c : null;
  } catch (e) { return null; }
}

// ---- 并发池 ----
async function queryAll(ids, key) {
  const counts = {};
  let idx = 0;
  async function worker() {
    while (idx < ids.length) {
      const gid = ids[idx++];
      const c = await queryOne(gid, key);
      if (c !== null) counts[gid] = c;
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
  return counts;
}

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  try {
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

    const { ids, key } = await loadGroupConfig();
    const total = ids.length;
    if (!total) return send(res, { ok: false, error: "群列表为空" }, 500);

    // 第一轮
    let counts = await queryAll(ids, key);
    // 失败的群重试一次
    const failed = ids.filter((id) => !(id in counts));
    if (failed.length) {
      const retry = await queryAll(failed, key);
      Object.assign(counts, retry);
    }
    if (!Object.keys(counts).length) {
      return send(res, { ok: false, error: "本轮全部查询失败，未写入" }, 502);
    }

    const completeness = Object.keys(counts).length / total;
    const now = Date.now();
    const cutoff = now - KEEP_DAYS * 86400000;
    await tursoExec([
      { sql: "INSERT OR REPLACE INTO samples(ts,g_json,ec,ecMax,n,t,c) VALUES(?,?,NULL,NULL,?,?,?)",
        args: [aInt(now), aText(JSON.stringify(counts)), aInt(Object.keys(counts).length), aInt(total), aFloat(Math.round(completeness * 1000) / 1000)] },
      { sql: "DELETE FROM samples WHERE ts < ?", args: [aInt(cutoff)] },
    ]);

    return send(res, {
      ok: true,
      groups: Object.keys(counts).length,
      total,
      completeness: Math.round(completeness * 1000) / 1000,
      updated: new Date(now).toISOString().replace("T", " ").slice(0, 19) + " UTC",
    });
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
