// 群人数采样 —— 由 cron-job.org 每 6 小时调用一次
// 流程：读仓库 data.js 里的群列表和 uapis key → 限速查询各群人数 → 缺失群用上轮快照补位 → 写入 Turso
// 完全不走 GitHub 提交，不耗 Vercel 部署额度
//
// 环境变量（Vercel 项目设置）：
//   TURSO_URL / TURSO_TOKEN —— 数据库
//   EC_CRON_SECRET          —— 调用密钥（cron 带 ?secret=xxx）
//
// 2026-09-17 修复：
//   uapis.cn 新网关按 key 限流 10 req/s（响应头 X-Ratelimit-Limit / code 429）。
//   旧版 8 worker 无间隔连发（瞬时 40~80 req/s）必然触发 429，完整度跌破 70% 后整轮弃写，
//   导致 2026-09-06 起曲线断更。现改为：全局限速 8 req/s + 429/503 退避重试
//   + 缺失群沿用上一轮 qq_groups 快照值补位（c 字段仍如实记录实时完整度）。

const UAPI = "https://uapis.cn/api/v1/social/qq/groupinfo";
const DATA_JS = "https://raw.githubusercontent.com/xingfangfa41-png/crystalwar-guide/main/data.js";
const KEEP_DAYS = 40;
const PER_REQ_TIMEOUT = 10000;
const BUDGET_MS = 50000;      // 总预算，留 10s 给补位查询/写库/返回，防撞 60s 上限
const RATE_QPS = 8;           // uapis 限流 10 req/s/key，保守取 8
const RATE_GAP_MS = 1000 / RATE_QPS;
const CONCURRENCY = 4;        // 并发 worker（节流是全局的，并发只用于吸收请求往返延迟）
const MIN_REALTIME_RATIO = 0.3;  // 实时成功低于 30% 视为上游大面积故障，本轮不写

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label + " 超时")), ms)),
  ]);
}

// ---- 全局限速器：任意时刻保证两次发请求间隔 ≥ RATE_GAP_MS ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let nextSlotAt = 0;
async function takeSlot() {
  const now = Date.now();
  const wait = Math.max(0, nextSlotAt - now);
  nextSlotAt = Math.max(now, nextSlotAt) + RATE_GAP_MS;
  if (wait) await sleep(wait);
}

// ---- Turso ----
function tursoUrl() {
  let u = process.env.TURSO_URL || "";
  if (u.startsWith("libsql://")) u = "https://" + u.slice("libsql://".length);
  return u.replace(/\/$/, "");
}
function aInt(v) { return v === null || v === undefined ? { type: "null" } : { type: "integer", "value": String(Math.round(v)) }; }
function aText(v) { return v === null || v === undefined ? { type: "null" } : { type: "text", "value": String(v) }; }
function aFloat(v) { return v === null || v === undefined ? { type: "null" } : { type: "float", "value": Number(v) }; }

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
// 返回 {status:'ok',data} | {status:'rate'} | {status:'upstream'} | {status:'fail'}
async function queryOnce(gid, key) {
  await takeSlot();
  try {
    const url = `${UAPI}?group_id=${gid}` + (key ? `&apikey=${key}` : "");
    const r = await withTimeout(fetch(url, { headers: { "User-Agent": "ec-stats-bot" } }), PER_REQ_TIMEOUT, "查询群");
    let j = null;
    try { j = await r.json(); } catch (e) { return { status: "fail" }; }
    if (r.status === 429 || (j && j.code === 429)) return { status: "rate" };
    if (r.status === 503 || (j && typeof j.error === "string" && j.error.includes("暂时不可用"))) return { status: "upstream" };
    const c = j && j.member_count;
    if (typeof c !== "number") return { status: "fail" };
    return { status: "ok", data: {
      count: c,
      name: typeof j.group_name === "string" ? j.group_name : "",
      max: typeof j.max_member_count === "number" ? j.max_member_count : null,
      join: typeof j.join_url === "string" ? j.join_url : "",
    } };
  } catch (e) { return { status: "fail" }; }
}

// rate：当场退避后重试（最多 3 次）；upstream/fail：放弃，交给补查轮
async function queryOne(gid, key) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await queryOnce(gid, key);
    if (res.status === "ok") return res.data;
    if (res.status === "rate") { await sleep(1200 + attempt * 800); continue; }
    if (attempt === 0) { await sleep(400); continue; }   // 上游抖动/网络错给一次即时重试
    return null;
  }
  return null;
}

// ---- 并发查询（全局限速）----
async function queryAll(ids, key, deadline, info) {
  let i = 0;
  async function worker() {
    while (i < ids.length && Date.now() < deadline) {
      const gid = ids[i++];
      if (gid in info) continue;
      const d = await queryOne(gid, key);
      if (d !== null) info[gid] = d;
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
  return info;
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

    const deadline = Date.now() + BUDGET_MS;
    const info = {};
    // 两轮：第二轮只补缺；限速下 120 群首轮约 15~20s，两轮通常 30s 内完成
    for (let round = 0; round < 2; round++) {
      const missing = ids.filter((id) => !(id in info));
      if (!missing.length || Date.now() >= deadline) break;
      await queryAll(missing, key, deadline, info);
    }
    const realtime = Object.keys(info).length;
    if (!realtime) {
      return send(res, { ok: false, error: "本轮全部查询失败，未写入" }, 502);
    }

    // ---- 快照补位：实时没查到的群沿用上轮 qq_groups 人数，避免总人数跳水 ----
    let reused = 0;
    const counts = {};
    Object.keys(info).forEach((gid) => { counts[gid] = info[gid].count; });
    const missingNow = ids.filter((id) => !(id in info));
    if (missingNow.length) {
      const ph = missingNow.map(() => "?").join(",");
      const qres = await tursoExec([{ sql: `SELECT id,cnt FROM qq_groups WHERE id IN (${ph})`,
        args: missingNow.map(aText) }]);
      const oldRows = (((qres.results || [])[0] || {}).response || {}).result?.rows || [];
      for (const row of oldRows) {
        const gid = row[0] && row[0].value;
        const cnt = row[1] && Number(row[1].value);
        if (gid && typeof cnt === "number" && cnt > 0) { counts[gid] = cnt; reused++; }
      }
    }

    const realtimeRatio = realtime / total;
    if (realtimeRatio < MIN_REALTIME_RATIO) {
      return send(res, { ok: false, error: `实时完整度过低 ${Math.round(realtimeRatio * 100)}%，本轮不写库`,
        realtime, total, reused }, 502);
    }

    const now = Date.now();
    const cutoff = now - KEEP_DAYS * 86400000;
    const stmts = [
      { sql: "INSERT OR REPLACE INTO samples(ts,g_json,ec,ecMax,n,t,c) VALUES(?,?,NULL,NULL,?,?,?)",
        args: [aInt(now), aText(JSON.stringify(counts)), aInt(Object.keys(counts).length), aInt(total),
               aFloat(Math.round(realtimeRatio * 1000) / 1000)] },
      { sql: "DELETE FROM samples WHERE ts < ?", args: [aInt(cutoff)] },
      { sql: "CREATE TABLE IF NOT EXISTS qq_groups (id TEXT PRIMARY KEY, name TEXT, cnt INTEGER, mx INTEGER, join_url TEXT, ts INTEGER)", args: [] },
    ];
    // 群资料快照只更新本轮实时查到的群；补位群保留旧 ts（陈旧状态可被识别）
    for (const gid of Object.keys(info)) {
      const d = info[gid];
      stmts.push({ sql: "INSERT OR REPLACE INTO qq_groups(id,name,cnt,mx,join_url,ts) VALUES(?,?,?,?,?,?)",
        args: [aText(gid), aText(d.name), aInt(d.count), aInt(d.max), aText(d.join), aInt(now)] });
    }
    await tursoExec(stmts);

    return send(res, {
      ok: true,
      realtime,                 // 本轮实时查到的群数
      reused,                   // 用旧快照补位的群数
      groups: Object.keys(counts).length,
      total,
      completeness: Math.round(realtimeRatio * 1000) / 1000,
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
