// 批量评论数统计 —— 前端打开播放器时一次拉取所有曲目的评论数
// GET /api/comments/counts -> { counts: { "曲目标题": N, ... } }
// 环境变量：TURSO_URL、TURSO_TOKEN（与采样接口共用）
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
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("数据库 HTTP " + r.status + ": " + JSON.stringify(j).slice(0, 200));
  const err = (j.results || []).find((x) => x.type === "error");
  if (err) throw new Error("数据库错误: " + (err.error && err.error.message || "unknown"));
  return j;
}

function send(res, obj, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return send(res, { error: "方法不支持" }, 405);
    if (!process.env.TURSO_URL || !process.env.TURSO_TOKEN) {
      return send(res, { error: "未配置 TURSO_URL / TURSO_TOKEN" }, 500);
    }
    // 建表（幂等，保证表存在）
    await tursoExec([{
      sql: "CREATE TABLE IF NOT EXISTS music_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, track TEXT NOT NULL, uid TEXT NOT NULL, nickname TEXT, avatar TEXT, content TEXT NOT NULL, created_at INTEGER NOT NULL)",
      args: [],
    }]);
    const j = await tursoExec([{
      sql: "SELECT track, COUNT(*) AS c FROM music_comments GROUP BY track",
      args: [],
    }]);
    const result = j.results[0].response.result;
    const counts = {};
    (result.rows || []).forEach((row) => {
      const track = row[0] && row[0].value !== undefined ? row[0].value : "";
      const c = row[1] && row[1].value !== undefined ? row[1].value : 0;
      if (track) counts[track] = Number(c);
    });
    return send(res, { counts });
  } catch (e) {
    return send(res, { error: String(e && e.message || e) }, 500);
  }
}
