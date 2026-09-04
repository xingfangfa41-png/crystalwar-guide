// 布吉岛数据接入 —— 网易登录态管理（短信验证登录，全程手机号+验证码，无需密码）
// 流程移植自开源项目 Fantnel 的网易启动器协议实现：
//   设备注册 → 发短信码 → 验证码换 ticket → 完成登录拿 mpay user → 组装 sauth cookie
//   → /login-otp → /authentication-otp(AES加密) → user-id + user-token
// 拿到的登录态存 Turso kv 表，ec-sample.js 每分钟用它签名查询网络游戏列表，
// 取布吉岛(entity_id=4661334467366178884)的 online_count。
//
// 环境变量：TURSO_URL、TURSO_TOKEN、EC_CRON_SECRET（本接口所有操作都要带 secret）

import crypto from "crypto";

const GAME_ID = "aecfrxodyqaaaajp-g-x19";
const GAME_VER = "3.6.27.285626";
const MKEY = "https://service.mkey.163.com";
const CORE = "https://x19obtcore.nie.netease.com:8443";

// ---- 基础工具 ----
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
function aText(v) { return v === null || v === undefined ? { type: "null" } : { type: "text", value: String(v) }; }

async function tursoExec(stmts) {
  const body = { requests: stmts.map((s) => ({ type: "execute", stmt: s })).concat([{ type: "close" }]) };
  const r = await withTimeout(fetch(tursoUrl() + "/v2/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.TURSO_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), 12000, "访问数据库");
  const j = await r.json();
  if (!r.ok) throw new Error("数据库 HTTP " + r.status);
  const err = (j.results || []).find((x) => x.type === "error");
  if (err) throw new Error("数据库错误: " + (err.error && err.error.message || "unknown"));
  return j;
}

async function kvGet(k) {
  const j = await tursoExec([{ sql: "SELECT v FROM kv WHERE k=?", args: [aText(k)] }]);
  const rows = j.results[0] && j.results[0].response && j.results[0].response.result.rows;
  const v = rows && rows[0] && rows[0][0] && rows[0][0].value;
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
}
async function kvSet(k, obj) {
  await tursoExec([{ sql: "INSERT OR REPLACE INTO kv(k,v) VALUES(?,?)", args: [aText(k), aText(JSON.stringify(obj))] }]);
}

// ---- 网易启动器 HTTP 加密层（HttpUtil 移植）----
const HTTP_KEYS = "MK6mipwmOUedplb6,OtEylfId6dyhrfdn,VNbhn5mvUaQaeOo9,bIEoQGQYjKd02U0J,fuaJrPwaH2cfXXLP,LEkdyiroouKQ4XN1,jM1h27H4UROu427W,DhReQada7gZybTDk,ZGXfpSTYUvcdKqdY,AZwKf7MWZrJpGR5W,amuvbcHw38TcSyPU,SI4QotspbjhyFdT0,VP4dhjKnDGlSJtbB,UXDZx4KhZywQ2tcn,NIK73ZNvNqzva4kd,WeiW7qU766Q1YQZI"
  .split(",").map((s) => Buffer.from(s, "ascii"));

function httpEncrypt(plain) {
  const padLen = Math.ceil((plain.length + 16) / 16) * 16;
  const body = Buffer.alloc(padLen);
  Buffer.from(plain, "utf8").copy(body, 0);
  const iv = Buffer.from("szkgpbyimxavqjcn", "ascii");
  iv.copy(body, Buffer.from(plain, "utf8").length);
  const keyIndex = ((crypto.randomInt(0, HTTP_KEYS.length - 1) << 4) | 2) & 0xff;
  const cipher = crypto.createCipheriv("aes-128-cbc", HTTP_KEYS[(keyIndex >> 4) & 0xf], iv);
  cipher.setAutoPadding(false);
  const enc = Buffer.concat([cipher.update(body), cipher.final()]);
  return Buffer.concat([iv, enc, Buffer.from([keyIndex])]);
}

function httpDecrypt(body) {
  if (!body || body.length < 18) throw new Error("加密响应长度异常");
  const iv = body.subarray(0, 16);
  const enc = body.subarray(16, body.length - 1);
  const key = HTTP_KEYS[(body[body.length - 1] >> 4) & 0xf];
  const d = crypto.createDecipheriv("aes-128-cbc", key, iv);
  d.setAutoPadding(false);
  let dec = Buffer.concat([d.update(enc), d.final()]);
  let end = dec.length;
  while (end > 0 && dec[end - 1] === 0) end--;   // 去尾部零填充
  end = Math.max(0, end - 16);                    // 再去尾部附加的 IV
  return dec.subarray(0, end);
}

// ---- 网易 mpay 接口参数 ----
function baseParams() {
  const p = new URLSearchParams();
  p.set("app_channel", "netease"); p.set("app_mode", "2"); p.set("app_type", "games");
  p.set("arch", "win_x64"); p.set("cv", "c4.2.0");
  p.set("mcount_app_key", "EEkEEXLymcNjM42yLY3Bn6AO15aGy4yq");
  p.set("mcount_transaction_id", "0"); p.set("process_id", String(process.pid || 1234));
  p.set("sv", "10.0.22621"); p.set("updater_cv", "c1.0.0");
  p.set("game_id", GAME_ID); p.set("gv", GAME_VER);
  return p;
}
function randMac() {
  const h = () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase();
  return ["02", h(), h(), h(), h(), h()].join(":");
}

async function mpayPost(path, params, label) {
  const r = await withTimeout(fetch(MKEY + path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  }), 10000, label);
  const text = await r.text();
  let j = null;
  try { j = JSON.parse(text); } catch {}
  return { status: r.status, json: j, raw: text.slice(0, 300) };
}

// 设备注册（每个登录态只需一次，device 落库复用）
async function ensureDevice() {
  let dev = await kvGet("bj_device");
  if (dev && dev.id && dev.key) return dev;
  const unique = crypto.randomUUID().replaceAll("-", "");
  const p = baseParams();
  p.set("unique_id", unique);
  p.set("brand", "Microsoft"); p.set("device_model", "pc_mode");
  p.set("device_name", "PC-" + Math.random().toString(36).slice(2, 14));
  p.set("device_type", "Computer"); p.set("init_urs_device", "0");
  p.set("mac", randMac()); p.set("resolution", "1920x1080");
  p.set("system_name", "windows"); p.set("system_version", "10.0.22621");
  const r = await mpayPost(`/mpay/games/${GAME_ID}/devices`, p, "注册设备");
  if (r.status !== 201 && r.status !== 200) {
    throw new Error("注册设备失败 HTTP " + r.status + " " + r.raw);
  }
  const d = r.json && r.json.device;
  if (!d || !d.id || !d.key) throw new Error("注册设备返回异常 " + r.raw);
  dev = { id: d.id, key: d.key, unique };
  await kvSet("bj_device", dev);
  return dev;
}

// 带一次重试的 POST JSON（跨境高端口偶发抖动时用）
async function postJsonRetry(url, body, label) {
  try {
    const r = await withTimeout(fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, body,
    }), 8000, label);
    return await r.json().catch(() => null);
  } catch (e) {
    const r = await withTimeout(fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, body,
    }), 15000, label);
    return await r.json().catch(() => null);
  }
}

async function sendSms(phone) {
  const dev = await ensureDevice();
  const p = baseParams();
  p.set("device_id", dev.id); p.set("mobile", phone);
  const r = await mpayPost("/mpay/api/users/login/mobile/get_sms", p, "发送短信");
  if (!r.status || r.status >= 300) {
    const reason = (r.json && (r.json.reason || r.json.message)) || r.raw;
    throw new Error("发送短信失败 HTTP " + r.status + " " + reason);
  }
  return true;
}

async function verifyAndLogin(phone, code) {
  const dev = await ensureDevice();
  // 1) 校验短信码 → ticket
  let p = baseParams();
  p.set("device_id", dev.id); p.set("mobile", phone); p.set("smscode", code); p.set("up_content", "");
  let r = await mpayPost("/mpay/api/users/login/mobile/verify_sms", p, "校验验证码");
  const ticket = r.json && r.json.ticket;
  if (!ticket) throw new Error("验证码校验失败 " + ((r.json && (r.json.reason || r.json.message)) || r.raw));
  // 2) 完成登录 → mpay user
  p = baseParams();
  p.set("device_id", dev.id);
  p.set("opt_fields", "nickname,avatar,realname_status,mobile_bind_status,mask_related_mobile,related_login_status");
  p.set("ticket", ticket);
  r = await mpayPost("/mpay/api/users/login/mobile/finish?un=" + Buffer.from(phone, "utf8").toString("base64"), p, "完成登录");
  const user = r.json && r.json.user;
  if (!user || !user.id || !user.token) throw new Error("登录未完成 " + ((r.json && (r.json.reason || r.json.message)) || r.raw));
  // 3) 组装 sauth cookie
  const cookie = JSON.stringify({
    gameid: "x19", login_channel: "netease", app_channel: "netease", platform: "pc",
    sdkuid: user.id, sessionid: user.token, sdk_version: "4.2.0",
    udid: crypto.randomUUID().replaceAll("-", "").toUpperCase(),
    deviceid: dev.id,
    aim_info: '{"aim":"127.0.0.1","country":"CN","tz":"+0800","tzid":""}',
  });
  // 4) /login-otp
  const j = await postJsonRetry(CORE + "/login-otp", JSON.stringify({ sauth_json: cookie }), "获取OTP");
  if (!j || j.code !== 0 || !j.entity) throw new Error("获取OTP失败 " + (j && j.message || "服务无响应"));
  const otp = j.entity;
  // 5) /authentication-otp（AES 加密请求/响应）
  const hex4 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const saData = JSON.stringify({
    os_name: "windows", os_ver: "Microsoft Windows 11 专业版", mac_addr: randMac(),
    udid: "0000000000000000" + hex4, app_ver: GAME_VER, sdk_ver: "", network: "",
    disk: hex4, is64bit: "1", video_card1: "Microsoft Hyper-V 视频",
    video_card2: "Microsoft Remote Display Adapter", video_card3: "", video_card4: "",
    launcher_type: "PC_java", pay_channel: "netease", dotnet_ver: "4.8.0",
    cpu_type: "Intel64 Family 6 Model 142 Stepping 12", ram_size: "16384",
    device_width: "1920", device_height: "1080", os_detail: "10.0.26100",
  });
  const authData = JSON.stringify({
    sa_data: saData, sauth_json: cookie,
    version: { version: GAME_VER, launcher_md5: "", updater_md5: "" },
    sdkuid: null, aid: String(otp.aid), hasMessage: false, hasGmail: false,
    otp_token: otp.otp_token, otp_pwd: null, lock_time: 0, env: null,
    min_engine_version: null, min_patch_version: null, verify_status: 0,
    unisdk_login_json: null, token: null, is_register: true, entity_id: null,
  });
  const resp = await withTimeout(fetch(CORE + "/authentication-otp", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: httpEncrypt(Buffer.from(authData, "utf8")),
  }), 10000, "换取登录态");
  const plain = httpDecrypt(Buffer.from(await resp.arrayBuffer()));
  j = JSON.parse(plain.toString("utf8"));
  if (!j || j.code !== 0 || !j.entity || !j.entity.entity_id || !j.entity.token) {
    throw new Error("换取登录态失败 " + (j && j.message || "响应异常"));
  }
  const cred = { userId: j.entity.entity_id, token: j.entity.token, phone, ts: Date.now(), dead: 0 };
  await kvSet("bj_cred", cred);
  return { userId: cred.userId };
}

function maskPhone(p) { return p && p.length >= 7 ? p.slice(0, 3) + "****" + p.slice(-4) : "***"; }

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  try {
    const secret = process.env.EC_CRON_SECRET;
    const url = new URL(req.url, "http://x");
    let body = {};
    if (req.method === "POST") {
      body = await new Promise((resolve) => {
        let s = "";
        req.on("data", (c) => (s += c));
        req.on("end", () => { try { resolve(JSON.parse(s || "{}")); } catch { resolve({}); } });
      });
    }
    const given = body.secret || url.searchParams.get("secret") || "";
    if (!secret || given !== secret) return send(res, { error: "unauthorized" }, 401);

    const action = body.action || url.searchParams.get("action") || "status";

    if (action === "status") {
      const cred = await kvGet("bj_cred");
      if (!cred) return send(res, { ok: true, logged: false });
      return send(res, {
        ok: true, logged: !cred.dead, dead: !!cred.dead,
        phone: maskPhone(cred.phone),
        since: new Date(cred.ts).toISOString().replace("T", " ").slice(0, 19) + " UTC",
      });
    }
    if (action === "probe") {
      // 连通性诊断：分别计时 CORE:8443 与网关 443
      async function probe(u, body) {
        const t0 = Date.now();
        try {
          const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body });
          const t = await r.text();
          return { ms: Date.now() - t0, http: r.status, body: t.slice(0, 120) };
        } catch (e) { return { ms: Date.now() - t0, error: String(e && e.message || e) }; }
      }
      const [core, gw] = await Promise.all([
        probe(CORE + "/login-otp", '{"sauth_json":"{}"}'),
        probe("https://x19apigatewayobt.nie.netease.com/item/query/available", '{"available_mc_versions":[],"item_type":1,"length":1,"offset":0,"master_type_id":"2","secondary_type_id":""}'),
      ]);
      return send(res, { ok: true, core8443: core, gateway443: gw });
    }
    if (action === "send_sms") {
      const phone = String(body.phone || "").replace(/\D/g, "");
      if (!/^1\d{10}$/.test(phone)) return send(res, { error: "手机号格式不对" }, 400);
      await sendSms(phone);
      return send(res, { ok: true, msg: "验证码已发送，注意查收短信" });
    }
    if (action === "verify") {
      const phone = String(body.phone || "").replace(/\D/g, "");
      const code = String(body.code || "").replace(/\D/g, "");
      if (!/^1\d{10}$/.test(phone) || !code) return send(res, { error: "手机号或验证码缺失" }, 400);
      const r = await verifyAndLogin(phone, code);
      return send(res, { ok: true, msg: "登录成功，布吉岛采样将在下一分钟自动开始", userId: r.userId });
    }
    if (action === "logout") {
      await tursoExec([{ sql: "DELETE FROM kv WHERE k IN ('bj_cred')", args: [] }]);
      return send(res, { ok: true, msg: "已清除登录态" });
    }
    return send(res, { error: "未知 action" }, 400);
  } catch (e) {
    return send(res, { ok: false, error: String(e && e.message || e) }, 500);
  }
}

function send(res, obj, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(obj));
}
