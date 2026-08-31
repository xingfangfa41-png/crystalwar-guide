// 群人数历史采样 —— 由 Vercel Cron 每 30 分钟调用一次
// 数据存入 Vercel KV（key: ec:hist:<YYYYMMDD>），供 /api/history 读取
// 环境变量：
//   KV_REST_API_URL / KV_REST_API_TOKEN  —— Vercel KV 绑定后自动注入
//   UAPI_KEY                              —— uapis.cn 的 API Key（不暴露给前端）
//   CRON_SECRET                           —— 可选，防止外部手动触发

const UAPI = "https://uapis.cn/api/v1/social/qq/groupinfo";

export default async function handler(req) {
  // 仅允许 Vercel Cron 或持密钥者触发
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  const isVercelCron = req.headers["user-agent"]?.includes("vercel-cron") || auth === `Bearer ${secret}`;
  if (secret && !isVercelCron) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;
  if (!KV_URL || !KV_TOKEN) {
    return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500 });
  }

  // 1. 拉取群列表（data.js 是前端文件，正则提取 id）
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const dataJs = await fetch(`${proto}://${host}/data.js`).then(r => r.text());
  const ids = [...new Set([...dataJs.matchAll(/id:\s*"(\d+)"/g)].map(m => m[1]))];

  // 2. 并发 4 路查询，失败不影响整体
  const key = process.env.UAPI_KEY || "";
  const result = {};   // id -> 人数
  let fail = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      try {
        const sep = key ? `&apikey=${encodeURIComponent(key)}` : "";
        const r = await fetch(`${UAPI}?group_id=${id}${sep}`, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) { fail++; continue; }
        const j = await r.json();
        if (typeof j.member_count === "number") result[id] = j.member_count;
        else fail++;
      } catch { fail++; }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);

  // 3. 写入 KV：当天一个 hash，field 为时间戳，value 为 {id:count} JSON
  const now = new Date();
  const day = now.toISOString().slice(0, 10).replace(/-/g, "");
  const kvKey = `ec:hist:${day}`;
  const field = String(now.getTime());
  const value = JSON.stringify(result);

  await fetch(`${KV_URL}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(["HSET", kvKey, field, value])
  });
  // 过期 40 天，避免 KV 无限增长
  await fetch(`${KV_URL}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(["EXPIRE", kvKey, String(40 * 86400)])
  });

  return new Response(JSON.stringify({
    ok: true, sampled: Object.keys(result).length, failed: fail, total: ids.length, at: now.toISOString()
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}
