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
const PER_REQ_TIMEOUT = 8000;
const REQ_GAP_MS = 250;      // 每个请求之间的间隔，避免触发限流
const BUDGET_MS = 45000;     // 查询总预算：到点就用手头数据写库，避免被 60s 上限杀掉而整轮丢失
const MAX_STREAK_FAIL = 40;  // 分轮补查模式下放宽：避免一轮内被零星连续失败提前掐断

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
    if (typeof c !== "number") return null;
    return {
      count: c,
      name: typeof j.group_name === "string" ? j.group_name : "",
      max: typeof j.max_member_count === "number" ? j.max_member_count : null,
      join: typeof j.join_url === "string" ? j.join_url : "",
    };
  } catch (e) { return null; }
}

// ---- 串行查询（上游限流/故障期并发会被批量拒绝，实测串行成功率显著更高、且总耗时更短）----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function queryAll(ids, key, deadline) {
  const info = {};
  let streak = 0;   // 连续失败计数
  for (const gid of ids) {
    if (Date.now() >= deadline) break;
    if (streak >= MAX_STREAK_FAIL) break;   // 上游故障，提前收工
    const d = await queryOne(gid, key);
    if (d !== null) { info[gid] = d; streak = 0; }
    else streak++;
    await sleep(REQ_GAP_MS);
  }
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

    // 总预算 45s：留足写库和返回的时间，宁可少查几个群也不能被 60s 上限杀掉（06:07 曾因此整轮丢失）
    const deadline = Date.now() + BUDGET_MS;
    // 分三轮：每轮只查仍缺失的群，轮间休息 3s 避开上游瞬时限流
    let info = {};
    for (let round = 0; round < 3; round++) {
      if (round > 0) await sleep(3000);
      const missing = ids.filter((id) => !(id in info));
      if (!missing.length || Date.now() >= deadline) break;
      Object.assign(info, await queryAll(missing, key, deadline));
    }
    if (!Object.keys(info).length) {
      return send(res, { ok: false, error: "本轮全部查询失败，未写入" }, 502);
    }
    const counts = {};
    Object.keys(info).forEach((gid) => { counts[gid] = info[gid].count; });

    const completeness = Object.keys(counts).length / total;
    // 完整度太低（<70%）说明接口限流/故障，写入会污染曲线——直接放弃本轮
    if (completeness < 0.7) {
      return send(res, { ok: false, error: `完整度过低 ${Math.round(completeness*100)}%，本轮不写库`, groups: Object.keys(counts).length, total }, 502);
    }
    const now = Date.now();
    const cutoff = now - KEEP_DAYS * 86400000;
    const stmts = [
      { sql: "INSERT OR REPLACE INTO samples(ts,g_json,ec,ecMax,n,t,c) VALUES(?,?,NULL,NULL,?,?,?)",
        args: [aInt(now), aText(JSON.stringify(counts)), aInt(Object.keys(counts).length), aInt(total), aFloat(Math.round(completeness * 1000) / 1000)] },
      { sql: "DELETE FROM samples WHERE ts < ?", args: [aInt(cutoff)] },
      { sql: "CREATE TABLE IF NOT EXISTS qq_groups (id TEXT PRIMARY KEY, name TEXT, cnt INTEGER, mx INTEGER, join_url TEXT, ts INTEGER)", args: [] },
    ];
    // 群资料快照表：前端一次读全量（人数/群名/加群链接），不再逐群实时查询
    for (const gid of Object.keys(info)) {
      const d = info[gid];
      stmts.push({ sql: "INSERT OR REPLACE INTO qq_groups(id,name,cnt,mx,join_url,ts) VALUES(?,?,?,?,?,?)",
        args: [aText(gid), aText(d.name), aInt(d.count), aInt(d.max), aText(d.join), aInt(now)] });
    }
    await tursoExec(stmts);

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
