// QQ OAuth 登录回调 —— 授权码换 token → 拿 openid → 取用户信息 → 种会话 cookie
// 部署要求（Vercel 环境变量）：
//   QQ_CLIENT_ID     可选，默认 1905581543
//   QQ_CLIENT_SECRET 必填，QQ互联后台的 APP Key（不要在代码里写死）
import crypto from "crypto";

const CLIENT_ID = process.env.QQ_CLIENT_ID || "1905581543";
const REDIRECT_URI = "https://ec-crystal-war.com/api/auth/qq/callback";
const COOKIE_DAYS = 30;

// ---- 从 query 解析 urlencoded（token 接口返回 access_token=xxx&expires_in=xxx） ----
function parseQs(str) {
  const o = {};
  new URLSearchParams(str).forEach((v, k) => { o[k] = v; });
  return o;
}

function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const m = raw.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}

function clearCookies(res) {
  const names = ["ec_uid", "ec_nick", "ec_av", "qq_state"];
  res.setHeader("Set-Cookie", names.map((n) =>
    `${n}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  ));
}

async function exchangeToken(code, secret) {
  const q = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: secret,
    code,
    redirect_uri: REDIRECT_URI,
  });
  const r = await fetch("https://graph.qq.com/oauth2.0/token?" + q.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const text = await r.text();
  const j = parseQs(text);
  if (j.access_token) return j.access_token;
  // 也可能是 JSON 错误
  try { const jj = JSON.parse(text); throw new Error("换token失败: " + (jj.error_description || jj.error || text.slice(0,120))); } catch (e) { if (e.message.startsWith("换token失败")) throw e; throw new Error("换token失败: " + text.slice(0,120)); }
}

async function fetchOpenid(token) {
  const r = await fetch("https://graph.qq.com/oauth2.0/me?access_token=" + encodeURIComponent(token) + "&fmt=json");
  const text = await r.text();
  let j;
  try { j = JSON.parse(text); }
  catch { throw new Error("openid解析失败: " + text.slice(0,120)); }
  if (!j.openid) throw new Error("未拿到openid: " + (j.error_description || j.error || text.slice(0,120)));
  return j.openid;
}

async function fetchUserInfo(token, openid) {
  const q = new URLSearchParams({
    access_token: token,
    oauth_consumer_key: CLIENT_ID,
    openid,
  });
  const r = await fetch("https://graph.qq.com/user/get_user_info?" + q.toString());
  const j = await r.json().catch(() => ({}));
  if (j.ret !== 0) throw new Error("get_user_info失败: " + (j.msg || j.ret));
  return {
    nickname: j.nickname || "QQ用户",
    avatar: j.figureurl_qq_2 || j.figureurl_qq_1 || j.figureurl || "",
  };
}

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  const url = new URL(req.url, "http://x");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  try {
    // 校验 state，防登录 CSRF
    const savedState = getCookie(req, "qq_state");
    if (!code) {
      const err = url.searchParams.get("error");
      clearCookies(res);
      res.writeHead(302, { Location: "/login.html?err=" + encodeURIComponent(err || "取消登录") });
      return res.end();
    }
    if (!savedState || savedState !== state) {
      clearCookies(res);
      res.writeHead(302, { Location: "/login.html?err=" + encodeURIComponent("state校验失败，请重试") });
      return res.end();
    }

    const secret = process.env.QQ_CLIENT_SECRET;
    if (!secret) {
      res.writeHead(302, { Location: "/login.html?err=" + encodeURIComponent("服务端未配置 QQ_CLIENT_SECRET") });
      return res.end();
    }

    const token = await exchangeToken(code, secret);
    const openid = await fetchOpenid(token);
    const info = await fetchUserInfo(token, openid);

    const maxAge = COOKIE_DAYS * 86400;
    res.setHeader("Set-Cookie", [
      `ec_uid=${encodeURIComponent(openid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
      `ec_nick=${encodeURIComponent(info.nickname)}; Path=/; SameSite=Lax; Max-Age=${maxAge}`,
      `ec_av=${encodeURIComponent(info.avatar)}; Path=/; SameSite=Lax; Max-Age=${maxAge}`,
      `qq_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    ]);
    res.writeHead(302, { Location: "/" });
    return res.end();
  } catch (e) {
    const msg = String(e && e.message || e);
    clearCookies(res);
    res.writeHead(302, { Location: "/login.html?err=" + encodeURIComponent(msg.slice(0, 100)) });
    return res.end();
  }
}
