// EC 服务器在线人数采样 —— 由 cron-job.org 每分钟调用
// 方案：查中转站 mcsrvstat.us 拿在线人数 → 写入 Turso 数据库（samples 表）
// 顺带：若 kv.bj_cred 存在（见 api/bj-auth.js 短信登录），用网易启动器登录态
//       签名查询网络游戏列表，取布吉岛(4661334467366178884)的 online_count 一并写入 bj 列。
//       两路独立容错：一路失败不影响另一路落库。
// 不再写 GitHub history.json —— 彻底不触发 Vercel 部署、不耗部署额度
//
// 环境变量（Vercel 项目设置）：
//   TURSO_URL       —— Turso 数据库地址，形如 libsql://xxx.turso.io（或 https://xxx.turso.io）
//   TURSO_TOKEN     —— Turso 访问令牌
//   EC_CRON_SECRET  —— 可选，防止别人乱调接口（cron 时带 ?secret=xxx 或 Authorization）

import crypto from "crypto";

const EC_STATUS = "https://api.mcsrvstat.us/bedrock/3/play.easecation.net";
const BJ_GATEWAY = "https://x19apigatewayobt.nie.netease.com";
const BJ_LIST_PATH = "/item/query/available";
const BJ_ENTITY_ID = "4661334467366178884"; // 布吉岛·新玩法上线
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

// ---- 布吉岛：网易启动器登录态签名（TokenUtil 移植）----
function neSignHeaders(path, body, userId, userToken) {
  const md5token = crypto.createHash("md5").update(String(userToken), "utf8").digest("hex");
  const h = crypto.createHash("md5");
  h.update(Buffer.from(md5token, "utf8"));
  h.update(Buffer.from(body, "utf8"));
  h.update(Buffer.from("0eGsBkhl", "utf8"));
  h.update(Buffer.from(path, "utf8"));
  const lower = h.digest("hex");
  // C# HexToBinary：hex 串每个字符按 ASCII 码转 8 位二进制
  let binary = "";
  for (const ch of lower) binary += ch.charCodeAt(0).toString(2).padStart(8, "0");
  const secretBin = binary.slice(6) + binary.slice(0, 6);
  const bytes = Buffer.from(lower, "utf8");
  for (let i = 0; i < Math.floor(secretBin.length / 8); i++) {
    const end = Math.min(8, secretBin.length - i * 8);
    let num = 0;
    for (let j = 0; j < end; j++) if (secretBin[i * 8 + (7 - j)] === "1") num |= 1 << j;
    bytes[i] ^= num;
  }
  const tok = (bytes.subarray(0, 12).toString("base64") + "1").replace(/\+/g, "m").replace(/\//g, "o");
  return { "user-id": String(userId), "user-token": tok };
}

async function kvGet(k) {
  const j = await tursoExec([{ sql: "SELECT v FROM kv WHERE k=?", args: [aText(k)] }]);
  const rows = j.results[0] && j.results[0].response && j.results[0].response.result.rows;
  const v = rows && rows[0] && rows[0][0] && rows[0][0].value;
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
}

async function markBjDead(cred) {
  try {
    cred.dead = 1;
    await tursoExec([{ sql: "INSERT OR REPLACE INTO kv(k,v) VALUES('bj_cred',?)", args: [aText(JSON.stringify(cred))] }]);
  } catch {}
}

// 查一次布吉岛在线人数；未登录/已失效返回 null，其它异常向外抛
async function queryBJ() {
  const cred = await kvGet("bj_cred");
  if (!cred || cred.dead || !cred.userId || !cred.token) return null;
  const body = JSON.stringify({
    available_mc_versions: [], item_type: 1, length: 50, offset: 0,
    master_type_id: "2", secondary_type_id: "",
  });
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "WPFLauncher/0.0.0.0",
    ...neSignHeaders(BJ_LIST_PATH, body, cred.userId, cred.token),
  };
  // 跨境抖动常见，最多试 2 次
  let j = null, lastErr = null;
  for (let i = 0; i < 2 && !j; i++) {
    try {
      const r = await withTimeout(fetch(BJ_GATEWAY + BJ_LIST_PATH, { method: "POST", headers, body }), i ? 12000 : 8000, "查询布吉岛");
      j = await r.json().catch(() => null);
      if (!j) lastErr = new Error("布吉岛列表响应非 JSON");
    } catch (e) { lastErr = e; }
  }
  if (!j) throw lastErr;
  if (j.code === 10) { // 登录态失效：标记停用，等用户重新短信验证
    await markBjDead(cred);
    throw new Error("网易登录态已失效，需重新验证");
  }
  if (j.code !== 0 || !Array.isArray(j.entities)) throw new Error("布吉岛列表错误 code=" + j.code + " " + (j.message || ""));
  const item = j.entities.find((x) => String(x.entity_id) === BJ_ENTITY_ID);
  if (!item) throw new Error("列表里没找到布吉岛");
  const n = parseInt(item.online_count, 10);
  if (!Number.isFinite(n)) throw new Error("布吉岛人数解析失败");
  return { online: n, name: item.name || "布吉岛" };
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

// 写入一个采样点（每分钟）；ec / bj 任意一路成功即落库，另一路留 NULL
async function writeSample(now, ec, bj) {
  const cutoff = now - KEEP_DAYS * 86400000;
  await tursoExec([
    // 只含服务器在线的轻量点：g_json 留空，与群采样点区分
    { sql: "INSERT OR REPLACE INTO samples(ts,g_json,ec,ecMax,bj,n,t,c) VALUES(?,NULL,?,?,?,NULL,NULL,NULL)",
      args: [aInt(now), ec ? aInt(ec.online) : aInt(null), ec ? aInt(ec.max) : aInt(null), bj ? aInt(bj.online) : aInt(null)] },
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

    // 两路独立采样，互不影响
    const [ecR, bjR] = await Promise.all([
      queryEC().then((v) => ({ v })).catch((e) => ({ e: String(e && e.message || e) })),
      queryBJ().then((v) => ({ v })).catch((e) => ({ e: String(e && e.message || e) })),
    ]);
    if (!ecR.v && !bjR.v) {
      // 都失败才不写库（保持原有"失败不污染数据"语义）
      return send(res, { ok: false, error: "EC: " + (ecR.e || "?") + " | BJ: " + (bjR.e || "?") }, 502);
    }
    const now = Date.now();
    await writeSample(now, ecR.v || null, bjR.v || null);
    const points = await countPoints();
    const updated = new Date(now).toISOString().replace("T", " ").slice(0, 19) + " UTC";
    return send(res, {
      ok: true, points, updated,
      ec: ecR.v || null, ecError: ecR.e,
      bj: bjR.v || null, bjError: bjR.e,
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
