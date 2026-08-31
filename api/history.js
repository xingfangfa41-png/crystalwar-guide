// 历史数据读取接口：/api/history?days=7
// 返回 { points: [{ts, total, groups:{id:count}}...] }，按时间升序

export default async function handler(req) {
  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;
  if (!KV_URL || !KV_TOKEN) {
    return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500 });
  }

  const url = new URL(req.url, "http://x");
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "7", 10) || 7, 1), 40);

  const points = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const day = d.toISOString().slice(0, 10).replace(/-/g, "");
    const r = await fetch(`${KV_URL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KV_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(["HGETALL", `ec:hist:${day}`])
    }).then(r => r.json()).catch(() => null);

    if (!r || !r.result) continue;
    const arr = r.result; // [field, value, field, value...]
    for (let k = 0; k < arr.length; k += 2) {
      try {
        const groups = JSON.parse(arr[k + 1]);
        const total = Object.values(groups).reduce((a, b) => a + b, 0);
        points.push({ ts: Number(arr[k]), total, groups });
      } catch { /* 跳过坏数据 */ }
    }
  }
  points.sort((a, b) => a.ts - b.ts);

  return new Response(JSON.stringify({ points, count: points.length }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=120" }
  });
}
