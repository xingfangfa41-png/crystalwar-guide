// 音乐评论区 —— 按曲目存取评论（Turso）
// GET  /api/comments?track=xxx       取该曲目评论列表（最多 100 条，新的在前）
// POST /api/comments {track, content} 发评论（需 QQ 登录态，60 秒一条防刷）
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
function aInt(v) { return { type: "integer", value: String(Number(v) || 0) }; }

async function tursoExec(stmts) {
  const body = { requests: stmts.map((s) => ({ type: "execute", stmt: s })).concat([{ type: "close" }]) };
  const r = await withTimeout(fetch(tursoUrl() + "/v2/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.TURSO_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), 12000, "访问数据库");
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("数据库 HTTP " + r.status + ": " + JSON.stringify(j).slice(0, 300));
  const err = (j.results || []).find((x) => x.type === "error");
  if (err) throw new Error("数据库错误: " + (err.error && err.error.message || "unknown"));
  return j;
}

function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const m = raw.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}
function send(res, obj, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(obj));
}

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  try {
    if (!process.env.TURSO_URL || !process.env.TURSO_TOKEN) {
      return send(res, { error: "未配置 TURSO_URL / TURSO_TOKEN" }, 500);
    }
    // 建表（幂等）
    await tursoExec([{
      sql: "CREATE TABLE IF NOT EXISTS music_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, track TEXT NOT NULL, uid TEXT NOT NULL, nickname TEXT, avatar TEXT, content TEXT NOT NULL, created_at INTEGER NOT NULL)",
      args: [],
    }]);

    // 【临时】管理端点：DELETE /api/comments?id=1 清理验证数据（部署后即移除）
    if (req.method === "DELETE") {
      const url = new URL(req.url, "http://x");
      const id = Number(url.searchParams.get("id") || 0);
      if (!id) return send(res, { error: "缺 id" }, 400);
      await tursoExec([{ sql: "DELETE FROM music_comments WHERE id=?", args: [aInt(id)] }]);
      return send(res, { ok: true });
    }

    if (req.method === "GET") {
      const url = new URL(req.url, "http://x");
      const track = String(url.searchParams.get("track") || "").slice(0, 200);
      if (!track) return send(res, { error: "缺 track 参数" }, 400);
      const j = await tursoExec([{
        sql: "SELECT id,nickname,avatar,content,created_at FROM music_comments WHERE track=? ORDER BY created_at DESC LIMIT 100",
        args: [aText(track)],
      }]);
      const result = j.results[0].response.result;
      const rows = result.rows || [];
      const cols = result.cols.map((c) => c.name);
      const list = rows.map((row) => {
        const o = {};
        cols.forEach((cn, i) => { o[cn] = row[i] && row[i].value !== undefined ? row[i].value : null; });
        return {
          id: Number(o.id), nickname: o.nickname || "QQ用户",
          avatar: o.avatar || "", content: o.content,
          created_at: Number(o.created_at || 0),
        };
      });
      return send(res, { track, list });
    }

    if (req.method === "POST") {
      const body = await new Promise((resolve) => {
        let s = "";
        req.on("data", (c) => (s += c));
        req.on("end", () => { try { resolve(JSON.parse(s || "{}")); } catch { resolve({}); } });
      });
      const track = String(body.track || "").slice(0, 200);
      const content = String(body.content || "").trim();
      if (!track) return send(res, { error: "缺 track 参数" }, 400);
      if (!content) return send(res, { error: "评论不能为空" }, 400);
      if (content.length > 500) return send(res, { error: "评论最长 500 字" }, 400);

      const uid = getCookie(req, "ec_uid");
      if (!uid) return send(res, { error: "请先登录再评论", code: "no_login" }, 401);

      // 60 秒防刷：查该用户最近一条评论时间
      const now = Date.now();
      const lastJ = await tursoExec([{
        sql: "SELECT created_at FROM music_comments WHERE uid=? ORDER BY created_at DESC LIMIT 1",
        args: [aText(uid)],
      }]);
      const lastRes = lastJ.results[0].response.result;
      if (lastRes.rows && lastRes.rows[0]) {
        const lastTs = Number(lastRes.rows[0][0].value || 0);
        if (now - lastTs < 60000) {
          return send(res, { error: "评论太频繁，请 60 秒后再发" }, 429);
        }
      }

      const nickname = getCookie(req, "ec_nick") || "QQ用户";
      const avatar = getCookie(req, "ec_av") || "";
      await tursoExec([{
        sql: "INSERT INTO music_comments (track,uid,nickname,avatar,content,created_at) VALUES (?,?,?,?,?,?)",
        args: [aText(track), aText(uid), aText(nickname), aText(avatar), aText(content), aInt(now)],
      }]);
      return send(res, { ok: true, id: 0 });
    }

    return send(res, { error: "方法不支持" }, 405);
  } catch (e) {
    return send(res, { error: String(e && e.message || e) }, 500);
  }
}
