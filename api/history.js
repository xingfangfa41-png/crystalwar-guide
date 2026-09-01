// history.json 同域代理 —— 前端不再直连 raw.githubusercontent.com（国内移动网络/QQ X5 内核访问不稳定）
// 由 Vercel 服务器端读取 GitHub 上最新的 history.json 并原样返回，保证：
//   1) 同域名请求，国内手机可通，无跨域问题
//   2) 数据始终是仓库里的最新版本（采样函数每分钟写回，构建跳过不影响）
// 用法：GET /api/history  → 返回 history.json 内容（Cache-Control: no-store）

const GH_API = "https://api.github.com";

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label + " 超时")), ms)),
  ]);
}

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  try {
    const token = process.env.GH_TOKEN;
    const repo = process.env.GH_REPO;
    const path = process.env.GH_PATH || "history.json";
    if (!token || !repo) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "未配置 GH_TOKEN / GH_REPO" }));
    }
    const r = await withTimeout(fetch(`${GH_API}/repos/${repo}/contents/${encodeURIComponent(path)}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.raw",   // 直接拿文件内容，省一次 base64 解码
        "User-Agent": "ec",
      },
      cache: "no-store",
    }), 12000, "读取仓库");
    if (!r.ok) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "读取仓库失败 HTTP " + r.status }));
    }
    const text = await r.text();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");  // 采样每分钟更新，禁止任何缓存
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.end(text);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: String(e && e.message || e) }));
  }
}
