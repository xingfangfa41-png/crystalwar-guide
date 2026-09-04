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
const MGB = "https://mgbsdk.matrix.netease.com";
const PT4399 = "https://ptlogin.4399.com";
const OCR_SPACE_KEY = "K82345575688957"; // ocr.space 公共演示 Key，仅用于识别4399图形验证码

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
  const r = await fetchRetry(MKEY + path, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  }, label);
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

// 底层 fetch 重试：3 次尝试，8s/12s/16s 超时，间隔 0.6s/1.2s（抗跨境抖动）
// 注：探活请求（带 probe 标记）不重试，直接快速失败
async function fetchRetry(url, opts, label) {
  if (label === "探活") {
    return await withTimeout(fetch(url, opts), 6000, label);
  }
  let lastErr = null;
  for (let i = 0; i < 3; i++) {
    try {
      return await withTimeout(fetch(url, opts), [8000, 12000, 16000][i], label);
    } catch (e) {
      lastErr = e;
      if (i < 2) await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 带重试的 POST JSON
async function postJsonRetry(url, body, label) {
  const r = await fetchRetry(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, body,
  }, label);
  return await r.json().catch(() => null);
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
  // 4) 5) OTP 两步换登录态（与4399通道共用）
  const entity = await neteaseOtpLogin(cookie, "短信");
  const cred = { userId: entity.entity_id, token: entity.token, phone, ts: Date.now(), dead: 0 };
  await kvSet("bj_cred", cred);
  return { userId: cred.userId };
}

function maskPhone(p) { return p && p.length >= 7 ? p.slice(0, 3) + "****" + p.slice(-4) : "***"; }

// ==================== 4399 账号登录通道 ====================
// 手机上注册一个4399账号即可，不用发验证短信、不碰网易短信风控。
// 链路：4399账密登录(带图形验证码) → 统一认证拿 uid/token → MgbSdk sauth
//       → mgbsdk.matrix.netease.com 会话认证 → login-otp/authentication-otp 换登录态

// 简易 cookie jar（4399 登录态全程靠 Set-Cookie 串联）
class CookieJar {
  constructor() { this.jar = {}; }
  absorb(resp) {
    const list = resp.headers.getSetCookie ? resp.headers.getSetCookie() : (resp.headers.get("set-cookie") ? [resp.headers.get("set-cookie")] : []);
    for (const c of list) {
      const pair = c.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq > 0) this.jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
    }
  }
  header() {
    return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function http(url, opts = {}, label = "请求", jar = null) {
  if (jar) opts.headers = { ...(opts.headers || {}), Cookie: jar.header() };
  const r = await fetchRetry(url, opts, label);
  if (jar) jar.absorb(r);
  return r;
}

// ocr.space 识别4399图形验证码（4位字母数字，单行）
async function ocr4399(imageBuf) {
  const form = new FormData();
  form.append("apikey", OCR_SPACE_KEY);
  form.append("language", "eng");
  form.append("OCREngine", "2");
  form.append("scale", "true");
  form.append("file", new Blob([imageBuf], { type: "image/png" }), "captcha.png");
  const r = await fetchRetry("https://api.ocr.space/parse/image", { method: "POST", body: form }, "识别验证码");
  const j = await r.json().catch(() => null);
  const raw = j && j.ParsedResults && j.ParsedResults[0] && j.ParsedResults[0].ParsedText || "";
  return raw.replace(/[^A-Za-z0-9]/g, "").slice(0, 4);
}

// 4399 账号密码登录 → sauth cookie 字符串
async function login4399(account, password, maxRound = 4) {
  for (let round = 1; round <= maxRound; round++) {
    // 1) 取验证码（用本次登录独立的 cookie jar，保证验证码与登录请求同会话）
    const jar = new CookieJar();
    const captchaId = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const imgResp = await http(`${PT4399}/ptlogin/captcha.do?captchaId=${captchaId}`, {}, "获取4399验证码", jar);
    const imgBuf = Buffer.from(await imgResp.arrayBuffer());
    const captcha = await ocr4399(imgBuf);
    if (!captcha || captcha.length < 3) {
      // 自动识别不行：把图回给用户人工输，jar 存库等回填
      await kvSet("bj_4399_pending", { account, password, jar: jar.jar, captchaId, ts: Date.now() });
      const err = new Error("NEED_CAPTCHA");
      err.needCaptcha = true;
      err.imageBase64 = "data:image/png;base64," + imgBuf.toString("base64");
      throw err;
    }
    const p = new URLSearchParams();
    p.set("postLoginHandler", "default"); p.set("layoutSelfAdapting", "true");
    p.set("externalLogin", "qq"); p.set("displayMode", "popup");
    p.set("layout", "vertical"); p.set("bizId", "2201001794");
    p.set("appId", "kid_wdsj"); p.set("gameId", "wd");
    p.set("redirectUrl", ""); p.set("mainDivId", "popup_login_div");
    p.set("includeFcmInfo", "false"); p.set("level", "8"); p.set("regLevel", "8");
    p.set("userNameLabel", "4399用户名"); p.set("userNameTip", "请输入4399用户名");
    p.set("welcomeTip", "欢迎回到4399"); p.set("sec", "1");
    p.set("iframeId", "popup_login_frame"); p.set("autoLogin", "on");
    p.set("username", account); p.set("password", password);
    p.set("sessionId", captchaId); p.set("inputCaptcha", captcha);
    const loginResp = await http(`${PT4399}/ptlogin/login.do?v=1`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Referer: "http://ptlogin.4399.com/ptlogin/loginFrame.do" },
      body: p.toString(),
    }, "4399登录", jar);
    const loginText = await loginResp.text();
    // 错误提示提取（登录页 html 里的 login_err_tip）
    if (loginText.includes("<html>")) {
      const m = loginText.match(/login_err_tip">([\s\S]*?)<\/div>/);
      const tip = m ? m[1].trim() : "";
      if (/验证码/.test(tip)) continue;                     // 验证码识别错，换图重试
      throw new Error("4399登录失败 " + (tip || "页面异常"));
    }
    if (/验证码/.test(loginText)) continue;                 // 纯文本错误提示
    if (/密码|账号|冻结|锁定|不存在/.test(loginText) && loginText.length < 200) {
      throw new Error("4399登录失败 " + loginText.trim());
    }

    // 3) 登录态校验 → 统一认证 → sauth（抽出的共享段）
    return await finish4399FromJar(jar);
  }
  throw new Error("4399验证码多次识别失败，请重试");
}

// 4399 登录态已有（cookie jar 有效）→ 统一认证 → sauth（自动与人工回填共用）
async function finish4399FromJar(jar) {
  // 检查登录态 → 拿 sig/uid
  const t = Math.floor(Date.now() / 1000);
  const q = new URLSearchParams();
  q.set("appId", "kid_wdsj");
  q.set("gameUrl", "https://cdn.h5wan.4399sj.com/microterminal-h5-frame?game_id=500352");
  q.set("isCrossDomain", "1"); q.set("nick", "null"); q.set("onLineStart", "false");
  q.set("ptLogin", "true"); q.set("rand_time", "$randTime");
  q.set("retUrl", "https://ptlogin.4399.com/resource/ucenter.html?action=login");
  q.set("show", "1");
  const checkResp = await http(`${PT4399}/ptlogin/checkKidLoginUserCookie.do?${q}`, { redirect: "manual" }, "检查4399登录态", jar);
  const loc = checkResp.headers.get("location") || "";
  let qs = null;
  try { qs = new URL(loc).searchParams; } catch {}
  if (!qs || !qs.get("sig")) throw new Error("4399登录态校验失败（可能是密码错误或触发4399风控）");

  // 统一认证 → uid/token
  const qs2 = new URLSearchParams();
  qs2.set("game_id", "500352"); qs2.set("nick", "null");
  qs2.set("sig", qs.get("sig")); qs2.set("uid", qs.get("uid") || "");
  qs2.set("fcm", "0"); qs2.set("isCrossDomain", "1"); qs2.set("show", "1");
  qs2.set("rand_time", "$randTime"); qs2.set("ptusertype", "4399"); qs2.set("ptLogin", "true");
  qs2.set("time", qs.get("time") || ""); qs2.set("validateState", qs.get("validateState") || "");
  qs2.set("username", qs.get("username") || "");
  const infoQ = new URLSearchParams();
  infoQ.set("_", qs.get("time") || String(t));
  infoQ.set("queryStr", qs2.toString());
  const uniResp = await http(`https://microgame.5054399.net/v2/service/sdk/info?${infoQ}`, {}, "4399统一认证", jar);
  const uniText = await uniResp.text();
  let uni = null;
  try { uni = JSON.parse(uniText); } catch {}
  const sdkData = uni && uni.data && uni.data.sdkLoginData;
  if (!sdkData) throw new Error("4399统一认证失败 " + uniText.slice(0, 120));
  const uq = new URLSearchParams(sdkData);
  const uid = uq.get("uid"), token = uq.get("token");
  if (!uid || !token) throw new Error("4399统一认证缺 uid/token");

  // MgbSdk sauth（4399pc 渠道）
  const rand = crypto.randomUUID().replaceAll("-", "");
  const sauth = JSON.stringify({
    aim_info: '{"aim":"127.0.0.1","tz":"+0800","tzid":"","country":"CN"}',
    app_channel: "4399pc", client_login_sn: rand, deviceid: rand,
    gameid: "x19", gas_token: "", ip: "127.0.0.1",
    login_channel: "4399pc", platform: "pc",
    realname: '{"realname_type":"0"}', sdk_version: "1.0.0",
    sdkuid: uid, sessionid: token, source_platform: "pc",
    timestamp: uq.get("time") || "", udid: rand, userid: uq.get("username") || "",
  });

  // mgbsdk 会话认证（netease 直连可跳过，4399 必须）
  const authResp = await http(`${MGB}/x19/sdk/uni_sauth`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: sauth,
  }, "mgbsdk会话认证");
  const authJ = await authResp.json().catch(() => null);
  if (!authJ || String(authJ.code) !== "200") {
    throw new Error("mgbsdk会话认证失败 " + ((authJ && (authJ.msg || authJ.status)) || "HTTP " + authResp.status));
  }
  return sauth;
}

// sauth cookie → 网易登录态（OTP 两步，短信与4399共用）
async function neteaseOtpLogin(cookie, label) {
  const otpResp = await postJsonRetry(CORE + "/login-otp", JSON.stringify({ sauth_json: cookie }), label + "-OTP");
  if (!otpResp || otpResp.code !== 0 || !otpResp.entity) throw new Error("获取OTP失败 " + (otpResp && otpResp.message || "服务无响应"));
  const otp = otpResp.entity;
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
  const resp = await fetchRetry(CORE + "/authentication-otp", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: httpEncrypt(Buffer.from(authData, "utf8")),
  }, "换取登录态");
  const plain = httpDecrypt(Buffer.from(await resp.arrayBuffer()));
  const authResp = JSON.parse(plain.toString("utf8"));
  if (!authResp || authResp.code !== 0 || !authResp.entity || !authResp.entity.entity_id || !authResp.entity.token) {
    throw new Error("换取登录态失败 " + (authResp && authResp.message || "响应异常"));
  }
  return authResp.entity;
}

async function login4399Full(account, password) {
  const sauth = await login4399(account, password);
  const entity = await neteaseOtpLogin(sauth, "4399");
  const cred = { userId: entity.entity_id, token: entity.token, phone: "4399:" + account, ts: Date.now(), dead: 0 };
  await kvSet("bj_cred", cred);
  return { userId: cred.userId };
}

// 人工回填验证码：用之前存库的 cookie jar + 用户输入的验证码重新提交 4399 登录
async function login4399WithManualCaptcha(captchaText) {
  const pending = await kvGet("bj_4399_pending");
  if (!pending || !pending.captchaId || !pending.jar) throw new Error("没有待验证的4399登录会话，请重新发起登录");
  if (Date.now() - (pending.ts || 0) > 5 * 60 * 1000) throw new Error("验证码已过期（5分钟），请重新发起登录");
  const jar = new CookieJar();
  jar.jar = pending.jar;
  const p = new URLSearchParams();
  p.set("postLoginHandler", "default"); p.set("layoutSelfAdapting", "true");
  p.set("externalLogin", "qq"); p.set("displayMode", "popup");
  p.set("layout", "vertical"); p.set("bizId", "2201001794");
  p.set("appId", "kid_wdsj"); p.set("gameId", "wd");
  p.set("redirectUrl", ""); p.set("mainDivId", "popup_login_div");
  p.set("includeFcmInfo", "false"); p.set("level", "8"); p.set("regLevel", "8");
  p.set("userNameLabel", "4399用户名"); p.set("userNameTip", "请输入4399用户名");
  p.set("welcomeTip", "欢迎回到4399"); p.set("sec", "1");
  p.set("iframeId", "popup_login_frame"); p.set("autoLogin", "on");
  p.set("username", pending.account); p.set("password", pending.password);
  p.set("sessionId", pending.captchaId); p.set("inputCaptcha", String(captchaText || "").trim());
  const loginResp = await http(`${PT4399}/ptlogin/login.do?v=1`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Referer: "http://ptlogin.4399.com/ptlogin/loginFrame.do" },
    body: p.toString(),
  }, "4399登录", jar);
  const loginText = await loginResp.text();
  if (loginText.includes("<html>")) {
    const m = loginText.match(/login_err_tip">([\s\S]*?)<\/div>/);
    throw new Error("4399登录失败 " + (m ? m[1].trim() : "页面异常"));
  }
  if (/验证码/.test(loginText)) throw new Error("验证码不对，请核对后重试");
  if (/密码|账号|冻结|锁定|不存在/.test(loginText) && loginText.length < 200) {
    throw new Error("4399登录失败 " + loginText.trim());
  }
  let sauth;
  try {
    sauth = await finish4399FromJar(jar);
  } catch (e) {
    if (e && /登录态校验失败/.test(String(e.message))) {
      throw new Error("4399 不接受这个验证码（字母易混淆，如 0/O、1/l），请重新发起登录换一张图再输");
    }
    throw e;
  }
  await tursoExec([{ sql: "DELETE FROM kv WHERE k='bj_4399_pending'", args: [] }]);
  const entity = await neteaseOtpLogin(sauth, "4399");
  const cred = { userId: entity.entity_id, token: entity.token, phone: "4399:" + pending.account, ts: Date.now(), dead: 0 };
  await kvSet("bj_cred", cred);
  return { userId: cred.userId };
}

export const config = { maxDuration: 90 };

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
      // 连通性诊断：摸清各网易端点从本区域的可达性
      async function probe(u, body) {
        const t0 = Date.now();
        try {
          const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body });
          const t = await r.text();
          return { ms: Date.now() - t0, http: r.status, body: t.slice(0, 80) };
        } catch (e) { return { ms: Date.now() - t0, error: String(e && e.message || e) }; }
      }
      async function probeGet(u) {
        const t0 = Date.now();
        try {
          const r = await fetch(u);
          return { ms: Date.now() - t0, http: r.status };
        } catch (e) { return { ms: Date.now() - t0, error: String(e && e.message || e) }; }
      }
      const [mkey, core, gw, g79, mcl, upd] = await Promise.all([
        probe(MKEY + "/mpay/api/users/login/mobile/get_sms", "mobile=13800000000&device_id=x"),
        probe(CORE + "/login-otp", '{"sauth_json":"{}"}'),
        probe("https://x19apigatewayobt.nie.netease.com/item/query/available", '{"available_mc_versions":[],"item_type":1,"length":1,"offset":0,"master_type_id":"2","secondary_type_id":""}'),
        probe("https://g79apigatewayobt.minecraft.cn/item/query/available", '{"available_mc_versions":[],"item_type":1,"length":1,"offset":0,"master_type_id":"2","secondary_type_id":""}'),
        probe("https://x19mclobt.nie.netease.com/login-otp", '{"sauth_json":"{}"}'),
        probeGet("https://x19.update.netease.com/pl/x19_java_patchlist"),
      ]);
      return send(res, { ok: true, mkey_163: mkey, core8443: core, x19gateway: gw, g79mc: g79, x19mcl: mcl, x19update: upd });
    }
    if (action === "send_sms") {
      const phone = String(body.phone || "").replace(/\D/g, "");
      if (!/^1\d{10}$/.test(phone)) return send(res, { error: "手机号格式不对" }, 400);
      await sendSms(phone);
      return send(res, { ok: true, msg: "验证码已发送，注意查收短信" });
    }
    if (action === "login4399") {
      const account = String(body.account || "").trim();
      const password = String(body.password || "");
      if (!account || !password) return send(res, { error: "4399账号或密码缺失" }, 400);
      try {
        const r = await login4399Full(account, password);
        return send(res, { ok: true, msg: "4399登录成功，布吉岛采样将在下一分钟自动开始", userId: r.userId });
      } catch (e) {
        if (e && e.needCaptcha) {
          return send(res, { needCaptcha: true, imageBase64: e.imageBase64, error: "captcha" });
        }
        throw e;
      }
    }
    if (action === "login4399_captcha") {
      const code = String(body.code || "").trim();
      if (!code) return send(res, { error: "请填入图中验证码" }, 400);
      const r = await login4399WithManualCaptcha(code);
      return send(res, { ok: true, msg: "4399登录成功，布吉岛采样将在下一分钟自动开始", userId: r.userId });
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
    if (action === "set_cred") {
      const userId = String(body.userId || "").trim();
      const token = String(body.token || "").trim();
      if (!userId || !token) return send(res, { error: "缺少 userId 或 token" }, 400);
      const cred = { userId, token, phone: "web-tool", ts: Date.now(), dead: 0 };
      await kvSet("bj_cred", cred);
      return send(res, { ok: true, msg: "登录态已保存，布吉岛采样将在下一分钟自动开始", userId });
    }
    if (action === "web_login") {
      // 单请求内完成完整登录（网页工具用）：网易账密 或 4399账密+验证码
      const mode = String(body.mode || "");
      const user = String(body.user || "").trim();
      const pass = String(body.pass || "");
      if (!user || !pass) return send(res, { error: "账号或密码缺失" }, 400);

      if (mode === "netease") {
        // 分段探活：先确认网易登录服务可达，避免用户撞上链路掐断期白等
        try {
          await withTimeout(fetch(MKEY + "/mpay/api/users/login/mobile/get_sms", {
            method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "mobile=13800000000&device_id=probe",
          }), 6000, "探活");
        } catch (e) {
          throw new Error("NETWORK_DOWN：当前服务器到网易的链路被运营商掐断（周期性波动），请 10-30 分钟后再试，或开个 VPN/代理换个出口再点");
        }
        const dev = await ensureDevice();
        const passMd5 = crypto.createHash("md5").update(pass, "utf8").digest("hex");
        const paramsJson = JSON.stringify({ password: passMd5, unique: dev.unique, username: user });
        // AES-128-ECB 加密（密钥=device.key hex，PKCS7）——与官方启动器一致
        const cipher = crypto.createCipheriv("aes-128-ecb", Buffer.from(dev.key, "hex"), null);
        const enc = Buffer.concat([cipher.update(Buffer.from(paramsJson, "utf8")), cipher.final()]);
        const q = baseParams();
        q.set("opt_fields", "nickname,avatar,realname_status,mobile_bind_status,mask_related_mobile,related_login_status");
        q.set("params", enc.toString("hex"));
        q.set("un", Buffer.from(user, "utf8").toString("base64"));
        const r = await mpayPost(`/mpay/games/${GAME_ID}/devices/${dev.id}/users`, q, "网易登录");
        const u = r.json && r.json.user;
        if (!u || !u.id || !u.token) throw new Error("网易登录失败：" + ((r.json && (r.json.reason || r.json.message)) || "账号或密码错误"));
        const cookie = JSON.stringify({
          gameid: "x19", login_channel: "netease", app_channel: "netease", platform: "pc",
          sdkuid: u.id, sessionid: u.token, sdk_version: "4.2.0",
          udid: crypto.randomUUID().replaceAll("-", "").toUpperCase(),
          deviceid: dev.id,
          aim_info: '{"aim":"127.0.0.1","country":"CN","tz":"+0800","tzid":""}',
        });
        const entity = await neteaseOtpLogin(cookie, "网页");
        const cred = { userId: entity.entity_id, token: entity.token, phone: user.replace(/^(.{3}).+(.{2})$/, "$1****$2"), ts: Date.now(), dead: 0 };
        await kvSet("bj_cred", cred);
        return send(res, { ok: true, msg: "登录成功，布吉岛采样将在下一分钟自动开始", userId: cred.userId });
      }

      if (mode === "4399") {
        const captchaId = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
        const jar = new CookieJar();
        const imgResp = await http(`${PT4399}/ptlogin/captcha.do?captchaId=${captchaId}`, {}, "获取4399验证码", jar);
        const imgBuf = Buffer.from(await imgResp.arrayBuffer());
        await kvSet("bj_4399_pending", { account: user, password: pass, jar: jar.jar, captchaId, ts: Date.now() });
        return send(res, { needCaptcha: true, imageBase64: "data:image/png;base64," + imgBuf.toString("base64") });
      }

      return send(res, { error: "未知 mode" }, 400);
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
