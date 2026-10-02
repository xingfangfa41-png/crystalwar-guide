// 评论与 Wiki 综合接口（Turso）
// ── 音乐评论 ──────────────────────────────────────
// GET  /api/comments?track=xxx        取该曲目评论
// POST /api/comments {track, content} 发评论（需登录，60 秒一条）
// ── EC 社群自治 Wiki（kind=wiki 时走 wikiHandler）──
// GET  /api/comments?kind=wiki&action=index|page|revisions|revision|comments|user
// POST /api/comments?kind=wiki  body: {action:"save|like|comment", ...}
// 环境变量：TURSO_URL、TURSO_TOKEN
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

async function tursoExec(stmts, ms) {
  const body = { requests: stmts.map((s) => ({ type: "execute", stmt: s })).concat([{ type: "close" }]) };
  const r = await withTimeout(fetch(tursoUrl() + "/v2/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.TURSO_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), ms || 12000, "访问数据库");
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
function send(res, obj, status) {
  res.statusCode = status || 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(obj));
}
/* Turso 查询结果 → 对象数组 */
function rowsToObjects(j, index) {
  const result = j.results[index || 0].response.result;
  const rows = result.rows || [];
  const cols = result.cols.map((c) => c.name);
  return rows.map(function (row) {
    const o = {};
    cols.forEach(function (cn, i) { o[cn] = row[i] && row[i].value !== undefined ? row[i].value : null; });
    return o;
  });
}

/* ============ Wiki 安全工具 ============ */
function unsafeHTML(s) {
  return /<\s*script/i.test(s) || /<\s*iframe/i.test(s) || /<\s*object/i.test(s) ||
    /<\s*embed/i.test(s) || /<\s*meta/i.test(s) || /<\s*link/i.test(s) ||
    /javascript\s*:/i.test(s) || /\son\w+\s*=/i.test(s) || /data\s*:/i.test(s);
}
function contentIsSafe(s) {
  const stripped = s.replace(/data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+/g, "");
  return !unsafeHTML(stripped);
}
/* 幂等补齐 wiki_comments 新列（SQLite 旧版 ALTER 不支持 IF NOT EXISTS，先查 PRAGMA） */
async function ensureCommentColumns() {
  const pr = await tursoExec([{ sql: "PRAGMA table_info(wiki_comments)", args: [] }]);
  const names = rowsToObjects(pr).map(function (r) { return r.name; });
  const alters = [];
  if (names.indexOf("parent_id") < 0) alters.push({ sql: "ALTER TABLE wiki_comments ADD COLUMN parent_id INTEGER", args: [] });
  if (names.indexOf("root_id") < 0) alters.push({ sql: "ALTER TABLE wiki_comments ADD COLUMN root_id INTEGER", args: [] });
  if (names.indexOf("reply_to_name") < 0) alters.push({ sql: "ALTER TABLE wiki_comments ADD COLUMN reply_to_name TEXT", args: [] });
  if (alters.length) await tursoExec(alters, 15000);
}
const WIKI_SLUG_RE = /^[\w一-龥\-]{1,60}$/;
const WIKI_HOME = '<h1>欢迎来到 EC 社群自治 Wiki</h1><p>这里是属于 EC 玩家的知识库，任何人都可以用 QQ 登录后编辑页面、分享资料。</p><h2>你可以做什么</h2><ul><li><b>写攻略</b>：把你对各模式（水晶战争、超级战墙、生化等）的心得整理成页面</li><li><b>补资料</b>：模式机制、地图、皮肤、历史，都可以记录</li><li><b>点赞、评论</b>：为有用的页面点赞，和大家讨论</li><li><b>点击作者</b>：查看每位玩家的贡献记录</li></ul><p>点右上角的「编辑」开始吧。</p>';

/* ============ Wiki Handler ============ */
async function wikiHandler(req, res) {
  const url = new URL(req.url, "http://x");
  /* 建表（幂等） */
  await tursoExec([
    { sql: "CREATE TABLE IF NOT EXISTS wiki_pages (slug TEXT PRIMARY KEY, title TEXT, content TEXT, created_at INTEGER, updated_at INTEGER, uid TEXT, nickname TEXT, avatar TEXT)", args: [] },
    { sql: "CREATE TABLE IF NOT EXISTS wiki_revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, title TEXT, content TEXT, uid TEXT, nickname TEXT, avatar TEXT, created_at INTEGER)", args: [] },
    { sql: "CREATE TABLE IF NOT EXISTS wiki_likes (slug TEXT, uid TEXT, created_at INTEGER, PRIMARY KEY(slug, uid))", args: [] },
    { sql: "CREATE TABLE IF NOT EXISTS wiki_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, uid TEXT, nickname TEXT, avatar TEXT, content TEXT, created_at INTEGER)", args: [] },
  ], 15000);
  await ensureCommentColumns();

  if (req.method === "GET") {
    const action = url.searchParams.get("action") || "index";

    if (action === "index") {
      const homeJ = await tursoExec([{ sql: "SELECT slug FROM wiki_pages WHERE slug=?", args: [aText("Home")] }]);
      if (!rowsToObjects(homeJ).length) {
        const now = Date.now();
        await tursoExec([{
          sql: "INSERT INTO wiki_pages (slug,title,content,created_at,updated_at,uid,nickname,avatar) VALUES (?,?,?,?,?,?,?,?)",
          args: [aText("Home"), aText("首页"), aText(WIKI_HOME), aInt(now), aInt(now), aText("system"), aText("Wiki"), aText("")],
        }]);
      }
      const j = await tursoExec([
        { sql: "SELECT p.slug, p.title, p.updated_at, p.nickname, p.avatar, (SELECT COUNT(*) FROM wiki_likes l WHERE l.slug=p.slug) AS likes, (SELECT COUNT(*) FROM wiki_comments c WHERE c.slug=p.slug) AS comments FROM wiki_pages p ORDER BY p.updated_at DESC", args: [] },
      ]);
      const pages = rowsToObjects(j).map(function (o) {
        return {
          slug: o.slug, title: o.title, updated_at: Number(o.updated_at || 0),
          nickname: o.nickname || "Wiki", avatar: o.avatar || "",
          likes: Number(o.likes || 0), comments: Number(o.comments || 0),
        };
      });
      return send(res, { pages: pages });
    }

    if (action === "page") {
      const slug = String(url.searchParams.get("slug") || "Home");
      if (!WIKI_SLUG_RE.test(slug)) return send(res, { error: "页面名不合法" }, 400);
      const j = await tursoExec([
        { sql: "SELECT slug,title,content,created_at,updated_at,uid,nickname,avatar FROM wiki_pages WHERE slug=?", args: [aText(slug)] },
        { sql: "SELECT COUNT(*) AS n FROM wiki_likes WHERE slug=?", args: [aText(slug)] },
        { sql: "SELECT COUNT(*) AS n FROM wiki_comments WHERE slug=?", args: [aText(slug)] },
      ]);
      const rows = rowsToObjects(j, 0);
      if (!rows.length) return send(res, { missing: true, slug: slug });
      const o = rows[0];
      const myUid = getCookie(req, "ec_uid");
      let liked = false;
      if (myUid) {
        const lj = await tursoExec([{ sql: "SELECT uid FROM wiki_likes WHERE slug=? AND uid=?", args: [aText(slug), aText(myUid)] }]);
        liked = rowsToObjects(lj).length > 0;
      }
      return send(res, {
        slug: o.slug, title: o.title, content: o.content,
        created_at: Number(o.created_at || 0), updated_at: Number(o.updated_at || 0),
        uid: o.uid, nickname: o.nickname, avatar: o.avatar,
        likes: Number(rowsToObjects(j, 1)[0].n || 0),
        comments_count: Number(rowsToObjects(j, 2)[0].n || 0),
        liked: liked,
      });
    }

    if (action === "revisions") {
      const slug = String(url.searchParams.get("slug") || "");
      if (!WIKI_SLUG_RE.test(slug)) return send(res, { error: "页面名不合法" }, 400);
      const j = await tursoExec([
        { sql: "SELECT id,slug,title,uid,nickname,avatar,created_at FROM wiki_revisions WHERE slug=? ORDER BY id DESC LIMIT 100", args: [aText(slug)] },
      ]);
      const list = rowsToObjects(j).map(function (o) {
        return { id: Number(o.id), slug: o.slug, title: o.title, uid: o.uid, nickname: o.nickname || "QQ用户", avatar: o.avatar || "", created_at: Number(o.created_at || 0) };
      });
      return send(res, { list: list });
    }

    if (action === "revision") {
      const id = Number(url.searchParams.get("id") || 0);
      if (!id) return send(res, { error: "缺 id" }, 400);
      const j = await tursoExec([
        { sql: "SELECT id,slug,title,content,uid,nickname,avatar,created_at FROM wiki_revisions WHERE id=?", args: [aInt(id)] },
      ]);
      const rows = rowsToObjects(j);
      if (!rows.length) return send(res, { error: "版本不存在" }, 404);
      const o = rows[0];
      return send(res, { id: Number(o.id), slug: o.slug, title: o.title, content: o.content, uid: o.uid, nickname: o.nickname, avatar: o.avatar, created_at: Number(o.created_at || 0) });
    }

    if (action === "comments") {
      const slug = String(url.searchParams.get("slug") || "");
      if (!WIKI_SLUG_RE.test(slug)) return send(res, { error: "页面名不合法" }, 400);
      const j = await tursoExec([
        { sql: "SELECT id,uid,nickname,avatar,content,created_at,parent_id,root_id,reply_to_name FROM wiki_comments WHERE slug=? ORDER BY id DESC LIMIT 500", args: [aText(slug)] },
      ]);
      const all = rowsToObjects(j).map(function (o) {
        return {
          id: Number(o.id), uid: o.uid, nickname: o.nickname || "QQ用户", avatar: o.avatar || "",
          content: o.content, created_at: Number(o.created_at || 0),
          parent_id: Number(o.parent_id || 0), root_id: Number(o.root_id || 0),
          reply_to_name: o.reply_to_name || "",
        };
      });
      /* 组织两层楼：顶层评论 + 其下全部回复（回复按时间正序） */
      const tops = all.filter(function (c) { return c.parent_id === 0; });
      for (let i = 0; i < tops.length; i++) {
        tops[i].replies = all.filter(function (c) { return c.root_id === tops[i].id && c.id !== tops[i].id; })
          .sort(function (a, b) { return a.id - b.id; });
        tops[i].reply_count = tops[i].replies.length;
      }
      return send(res, { list: tops, total: all.length });
    }

    if (action === "user") {
      const uid = String(url.searchParams.get("uid") || "");
      if (!uid || uid.length > 100) return send(res, { error: "缺 uid" }, 400);
      const j = await tursoExec([
        { sql: "SELECT slug,title,nickname,avatar,created_at FROM wiki_revisions WHERE uid=? ORDER BY id DESC LIMIT 100", args: [aText(uid)] },
        { sql: "SELECT slug,created_at FROM wiki_likes WHERE uid=? ORDER BY created_at DESC LIMIT 100", args: [aText(uid)] },
        { sql: "SELECT slug,content,created_at,parent_id,reply_to_name FROM wiki_comments WHERE uid=? ORDER BY id DESC LIMIT 100", args: [aText(uid)] },
      ]);
      const edits = rowsToObjects(j, 0).map(function (o) {
        return { slug: o.slug, title: o.title, nickname: o.nickname, avatar: o.avatar, created_at: Number(o.created_at || 0) };
      });
      const likes = rowsToObjects(j, 1).map(function (o) { return { slug: o.slug, created_at: Number(o.created_at || 0) }; });
      const comments = rowsToObjects(j, 2).map(function (o) {
        return { slug: o.slug, content: o.content, created_at: Number(o.created_at || 0), parent_id: Number(o.parent_id || 0), reply_to_name: o.reply_to_name || "" };
      });
      const profile = edits.length ? { nickname: edits[0].nickname, avatar: edits[0].avatar } : { nickname: "", avatar: "" };
      return send(res, { uid: uid, profile: profile, edits: edits, likes: likes, comments: comments });
    }

    return send(res, { error: "未知动作" }, 400);
  }

  if (req.method === "POST") {
    const body = await new Promise(function (resolve) {
      let s = "";
      req.on("data", function (c) { s += c; });
      req.on("end", function () { try { resolve(JSON.parse(s || "{}")); } catch { resolve({}); } });
    });
    const act = String(body.action || "");
    const uid = getCookie(req, "ec_uid");
    if (!uid) return send(res, { error: "请先 QQ 登录", code: "no_login" }, 401);
    const nickname = getCookie(req, "ec_nick") || "QQ用户";
    const avatar = getCookie(req, "ec_av") || "";
    const now = Date.now();

    if (act === "save") {
      let slug = String(body.slug || "").trim();
      const title = String(body.title || "").trim().slice(0, 80);
      const content = String(body.content || "");
      if (!slug) slug = title || "未命名页面";
      if (!WIKI_SLUG_RE.test(slug)) return send(res, { error: "页面名只能含中文、字母、数字、-、_" }, 400);
      if (!title) return send(res, { error: "标题不能为空" }, 400);
      if (!content || !content.replace(/<[^>]*>/g, "").trim()) return send(res, { error: "内容不能为空" }, 400);
      if (content.length > 100000) return send(res, { error: "页面内容过大（上限 100KB）" }, 400);
      if (!contentIsSafe(content)) return send(res, { error: "内容含不被允许的元素（脚本/事件属性等）" }, 400);

      const lastJ = await tursoExec([
        { sql: "SELECT created_at FROM wiki_revisions WHERE uid=? ORDER BY id DESC LIMIT 1", args: [aText(uid)] },
      ]);
      const lastRows = rowsToObjects(lastJ);
      if (lastRows.length && now - Number(lastRows[0].created_at) < 30000) {
        return send(res, { error: "保存太频繁，请稍后再试" }, 429);
      }

      const existJ = await tursoExec([{ sql: "SELECT slug FROM wiki_pages WHERE slug=?", args: [aText(slug)] }]);
      const exists = rowsToObjects(existJ).length > 0;
      if (exists) {
        await tursoExec([
          { sql: "UPDATE wiki_pages SET title=?, content=?, updated_at=?, uid=?, nickname=?, avatar=? WHERE slug=?", args: [aText(title), aText(content), aInt(now), aText(uid), aText(nickname), aText(avatar), aText(slug)] },
          { sql: "INSERT INTO wiki_revisions (slug,title,content,uid,nickname,avatar,created_at) VALUES (?,?,?,?,?,?,?)", args: [aText(slug), aText(title), aText(content), aText(uid), aText(nickname), aText(avatar), aInt(now)] },
        ]);
      } else {
        await tursoExec([
          { sql: "INSERT INTO wiki_pages (slug,title,content,created_at,updated_at,uid,nickname,avatar) VALUES (?,?,?,?,?,?,?,?)", args: [aText(slug), aText(title), aText(content), aInt(now), aInt(now), aText(uid), aText(nickname), aText(avatar)] },
          { sql: "INSERT INTO wiki_revisions (slug,title,content,uid,nickname,avatar,created_at) VALUES (?,?,?,?,?,?,?)", args: [aText(slug), aText(title), aText(content), aText(uid), aText(nickname), aText(avatar), aInt(now)] },
        ]);
      }
      return send(res, { ok: true, slug: slug });
    }

    if (act === "like") {
      const slug = String(body.slug || "");
      if (!WIKI_SLUG_RE.test(slug)) return send(res, { error: "页面名不合法" }, 400);
      const existJ = await tursoExec([
        { sql: "SELECT uid FROM wiki_likes WHERE slug=? AND uid=?", args: [aText(slug), aText(uid)] },
        { sql: "SELECT slug FROM wiki_pages WHERE slug=?", args: [aText(slug)] },
      ]);
      const liked = rowsToObjects(existJ, 0).length > 0;
      const pageExists = rowsToObjects(existJ, 1).length > 0;
      if (!pageExists) return send(res, { error: "页面不存在" }, 404);
      if (liked) {
        await tursoExec([{ sql: "DELETE FROM wiki_likes WHERE slug=? AND uid=?", args: [aText(slug), aText(uid)] }]);
        return send(res, { ok: true, liked: false });
      }
      await tursoExec([{ sql: "INSERT INTO wiki_likes (slug,uid,created_at) VALUES (?,?,?)", args: [aText(slug), aText(uid), aInt(now)] }]);
      return send(res, { ok: true, liked: true });
    }

    if (act === "comment") {
      const slug = String(body.slug || "");
      const content = String(body.content || "").trim();
      let parent_id = Number(body.parent_id) || 0;
      let root_id = Number(body.root_id) || 0;
      let reply_to_name = String(body.reply_to_name || "").slice(0, 50);
      if (!WIKI_SLUG_RE.test(slug)) return send(res, { error: "页面名不合法" }, 400);
      if (!content) return send(res, { error: "评论不能为空" }, 400);
      if (content.length > 500) return send(res, { error: "评论最长 500 字" }, 400);

      /* 回复：校验被回复评论存在、同属一个页面，并推导 root_id / 被回复者昵称 */
      if (parent_id) {
        const pj = await tursoExec([
          { sql: "SELECT id,parent_id,root_id,nickname FROM wiki_comments WHERE id=? AND slug=?", args: [aInt(parent_id), aText(slug)] },
        ]);
        const pr = rowsToObjects(pj);
        if (!pr.length) return send(res, { error: "回复的评论不存在" }, 400);
        const target = pr[0];
        root_id = Number(target.parent_id) !== 0 ? Number(target.root_id) : parent_id;
        if (!reply_to_name) reply_to_name = target.nickname || "";
      }

      const lastJ = await tursoExec([
        { sql: "SELECT created_at FROM wiki_comments WHERE uid=? ORDER BY id DESC LIMIT 1", args: [aText(uid)] },
      ]);
      const lastRows = rowsToObjects(lastJ);
      if (lastRows.length && now - Number(lastRows[0].created_at) < 60000) {
        return send(res, { error: "评论太频繁，请 60 秒后再发" }, 429);
      }
      await tursoExec([
        { sql: "INSERT INTO wiki_comments (slug,uid,nickname,avatar,content,created_at,parent_id,root_id,reply_to_name) VALUES (?,?,?,?,?,?,?,?,?)",
          args: [aText(slug), aText(uid), aText(nickname), aText(avatar), aText(content), aInt(now), aInt(parent_id), aInt(root_id), aText(reply_to_name)] },
      ]);
      return send(res, { ok: true });
    }

    return send(res, { error: "未知动作" }, 400);
  }

  return send(res, { error: "方法不支持" }, 405);
}

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  try {
    if (!process.env.TURSO_URL || !process.env.TURSO_TOKEN) {
      return send(res, { error: "未配置 TURSO_URL / TURSO_TOKEN" }, 500);
    }
    const url = new URL(req.url, "http://x");
    /* Wiki 分流 */
    if (url.searchParams.get("kind") === "wiki") {
      return wikiHandler(req, res);
    }

    // 建表（幂等）
    await tursoExec([{
      sql: "CREATE TABLE IF NOT EXISTS music_comments (id INTEGER PRIMARY KEY AUTOINCREMENT, track TEXT NOT NULL, uid TEXT NOT NULL, nickname TEXT, avatar TEXT, content TEXT NOT NULL, created_at INTEGER NOT NULL)",
      args: [],
    }]);

    if (req.method === "GET") {
      // 全部评论（音乐播放器评论板块：播放器评论 + 所有歌曲评论，按时间倒序）
      if (url.searchParams.get("all") === "1") {
        const j = await tursoExec([{
          sql: "SELECT id,track,nickname,avatar,content,created_at FROM music_comments ORDER BY created_at DESC LIMIT 100",
          args: [],
        }]);
        const list = rowsToObjects(j).map(function (o) {
          return {
            id: Number(o.id), track: o.track || "", nickname: o.nickname || "QQ用户",
            avatar: o.avatar || "", content: o.content,
            created_at: Number(o.created_at || 0),
          };
        });
        return send(res, { list });
      }
      const track = String(url.searchParams.get("track") || "").slice(0, 200);
      if (!track) return send(res, { error: "缺 track 参数" }, 400);
      const totalJ = await tursoExec([{
        sql: "SELECT COUNT(*) AS c FROM music_comments WHERE track=?",
        args: [aText(track)],
      }]);
      const total = Number(rowsToObjects(totalJ)[0].c || 0);
      const j = await tursoExec([{
        sql: "SELECT id,nickname,avatar,content,created_at FROM music_comments WHERE track=? ORDER BY created_at DESC LIMIT 100",
        args: [aText(track)],
      }]);
      const list = rowsToObjects(j).map(function (o) {
        return {
          id: Number(o.id), nickname: o.nickname || "QQ用户",
          avatar: o.avatar || "", content: o.content,
          created_at: Number(o.created_at || 0),
        };
      });
      return send(res, { track, total, list });
    }

    if (req.method === "POST") {
      const body = await new Promise(function (resolve) {
        let s = "";
        req.on("data", function (c) { s += c; });
        req.on("end", function () { try { resolve(JSON.parse(s || "{}")); } catch { resolve({}); } });
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
      const lastRows = rowsToObjects(lastJ);
      if (lastRows.length && now - Number(lastRows[0].created_at) < 60000) {
        return send(res, { error: "评论太频繁，请 60 秒后再发" }, 429);
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
