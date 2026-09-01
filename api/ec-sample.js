// EC 服务器在线人数采样 —— 由外部 cron（cron-job.org 等）每分钟/每几分钟调用
// 原理：通过中转站 mcsrvstat.us（HTTP）查询 EC 基岩服务器状态，无需自己发 UDP
// 拿到在线人数后，追加/合并进仓库的 history.json，供趋势页读取画曲线
// 注：采样写回的 history.json-only 提交已被 Vercel Ignored Build Step 跳过构建，不会触发全量部署
// （trends.html 直接读 raw.githubusercontent.com 上的最新 history.json，不受跳过影响）
//
// 环境变量（在 Vercel 项目设置里配置）：
//   GH_TOKEN     —— 有 repo 写权限的 GitHub token（用于把 history.json 写回仓库）
//   GH_REPO      —— 形如 "user/repo"
//   GH_PATH      —— history 文件在仓库里的路径，默认 "history.json"
//   EC_CRON_SECRET —— 可选，防止别人乱调你的接口（cron 时带 ?secret=xxx 或 Authorization）

const GH_API = "https://api.github.com";
const EC_STATUS = "https://api.mcsrvstat.us/bedrock/3/play.easecation.net";
const KEEP_DAYS = 40;

// 单次网络请求超时兜底（毫秒），避免某一步卡死拖垮整个函数
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label + " 超时")), ms)),
  ]);
}
async function fetchJson(url, opts, ms, label) {
  const r = await withTimeout(fetch(url, opts || {}), ms || 12000, label || "请求");
  return r;
}

// 查询一次中转站
async function queryECOnce(ms) {
  const r = await fetchJson(EC_STATUS, {
    headers: { "User-Agent": "ec-stats-bot", Accept: "application/json" },
    cache: "no-store",
  }, ms, "查询中转站");
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

// 中转站偶发慢响应（实测偶超 10s），失败/超时时自动重试一次；
// 两次合计最坏约 20s，仍留出余量给 GitHub 读写（maxDuration 30s）
async function queryEC() {
  try {
    return await queryECOnce(12000);
  } catch (e) {
    return await queryECOnce(8000);
  }
}

// 从 GitHub 读文件（不存在返回 null）
async function ghRead(repo, path, token) {
  const r = await fetchJson(`${GH_API}/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json", "User-Agent": "ec" },
  }, 12000, "读取仓库");
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("读取仓库失败 HTTP " + r.status);
  const j = await r.json();
  return { sha: j.sha, text: Buffer.from(j.content, "base64").toString("utf8") };
}

// 写回 GitHub
async function ghWrite(repo, path, token, text, sha, message) {
  const body = { message, content: Buffer.from(text, "utf8").toString("base64") };
  if (sha) body.sha = sha;
  const r = await fetchJson(`${GH_API}/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: { Authorization: `token ${token}`, Accept: "application/vnd.github+json", "User-Agent": "ec" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("写回仓库失败 HTTP " + r.status + " " + (await r.text()));
  return true;
}

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  try {
    // 可选密钥校验
    const secret = process.env.EC_CRON_SECRET;
    if (secret) {
      const url = new URL(req.url, "http://x");
      const auth = (req.headers && req.headers["authorization"]) || "";
      if (url.searchParams.get("secret") !== secret && auth !== `Bearer ${secret}`) {
        return send(res, { error: "unauthorized" }, 401);
      }
    }

    const token = process.env.GH_TOKEN;
    const repo = process.env.GH_REPO;
    const path = process.env.GH_PATH || "history.json";
    if (!token || !repo) return send(res, { error: "未配置 GH_TOKEN / GH_REPO" }, 500);

    // 1) 查 EC 在线人数
    const ec = await queryEC();
    const now = Date.now();

    // 2) 读现有 history.json
    const cur = await ghRead(repo, path, token);
    let hist = { points: [], updated: "" };
    let sha;
    if (cur) {
      sha = cur.sha;
      try { hist = JSON.parse(cur.text); } catch (e) {}
    }
    if (!Array.isArray(hist.points)) hist.points = [];

    // 3) 写入 EC 人数：
    //    若最近一个采样点距现在 < 55 秒（说明和 QQ 群采样几乎同刻），就把 ec 合并进那个点；
    //    否则新建一个只含 ec 的轻量点。
    const last = hist.points[hist.points.length - 1];
    if (last && Math.abs(now - (last.ts || 0)) < 55000) {
      last.ec = ec.online;       // 合并进同一时刻的点
      last.ecMax = ec.max;
    } else {
      hist.points.push({ ts: now, ec: ec.online, ecMax: ec.max });
    }

    // 4) 裁剪到最近 KEEP_DAYS 天
    const cutoff = now - KEEP_DAYS * 86400000;
    hist.points = hist.points.filter((p) => (p.ts || 0) >= cutoff);
    hist.updated = new Date(now).toISOString().replace("T", " ").slice(0, 19) + " UTC";

    // 5) 写回仓库
    await ghWrite(repo, path, token, JSON.stringify(hist), sha,
      `sample: EC 在线 ${ec.online} 人 @ ${hist.updated}`);

    return send(res, { ok: true, ec, points: hist.points.length, updated: hist.updated });
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
