#!/usr/bin/env node
/* 生成 ercuang-feed.js —— 二创馆「全部帖子」数据源
 *
 * 完整流程（三步，脚本见同目录）：
 *   1) python3 crawl-posts.py            # 抓帖子页，下载原图 + 记录图片 URL → /tmp/dl2/manifest.json
 *   2) python3 upload-to-cloudinary.py   # 原图上传 Cloudinary ercuang/ → /tmp/upload-result2.json
 *   3) python3 classify-empty-posts.py   # 零图帖判定 视频/文字 → /tmp/classify.json
 *      node scripts/build-feed-from-manifest.js <csv> [manifest] [uploads] [prev] [classify]
 *
 * 说明：prev-uploads 用于复用上一批已上传、但本地已清理的图片链接，避免重复上传。
 */
const fs = require('fs');
const path = require('path');

const CSV = process.argv[2];
const MANIFEST = process.argv[3] || '/tmp/dl2/manifest.json';
const UPLOADS = process.argv[4] || '/tmp/upload-result2.json';
const PREV = process.argv[5] || '/tmp/prev-uploads.json';
const CLASSIFY = process.argv[6] || '/tmp/classify.json';
const OUT = process.argv[7] || path.join(__dirname, '..', 'ercuang-feed.js');
if (!CSV) { console.error('用法: node build-feed-from-manifest.js <csv> [manifest] [uploads] [prev] [classify] [out]'); process.exit(1); }

function parseLine(l) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) { if (c === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else { if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; }
  }
  out.push(cur); return out;
}
const readJson = (p) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;

/* ---- CSV：帖子元数据（按帖子ID去重） ---- */
const lines = fs.readFileSync(CSV, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
const header = parseLine(lines[0]);
const idx = {}; header.forEach((h, i) => idx[h.trim()] = i);
for (const k of ['帖子ID', '作者', '标题', '发布时间', '评论数', '点赞数', '分享链接']) {
  if (idx[k] === undefined) { console.error('CSV 缺少列: ' + k); process.exit(1); }
}
// 下架名单：撤回授权的作者，任何一次重新生成都不会带回来
const EXCLUDE_FILE = path.join(__dirname, 'excluded-authors.json');
const excluded = fs.existsSync(EXCLUDE_FILE)
  ? (JSON.parse(fs.readFileSync(EXCLUDE_FILE, 'utf8')).authors || []).map(x => String(x).toLowerCase())
  : [];
const isExcluded = (a) => { const l = String(a || '').toLowerCase(); return excluded.some(e => l.indexOf(e) >= 0); };

const seen = new Set(); const posts = []; let dropped = 0;
for (const line of lines.slice(1)) {
  const c = parseLine(line);
  if (c.length < header.length) continue;
  const id = (c[idx['帖子ID']] || '').trim();
  const link = (c[idx['分享链接']] || '').trim();
  if (!id || !link || seen.has(id)) continue;
  seen.add(id);
  if (isExcluded(c[idx['作者']])) { dropped++; continue; }
  posts.push({ id, author: (c[idx['作者']] || '').trim(), title: (c[idx['标题']] || '').trim(),
    time: (c[idx['发布时间']] || '').trim(), comments: parseInt(c[idx['评论数']], 10) || 0,
    likes: parseInt(c[idx['点赞数']], 10) || 0, link });
}

/* ---- 图片：本轮上传结果 + 上一批复用结果 ---- */
const byFile = {}, byLink = {};
const put = (postLink, rec) => { (byLink[postLink] = byLink[postLink] || []).push(rec); };

const uploads = readJson(UPLOADS) || [];
const manifest = readJson(MANIFEST) || [];
const fileToPost = {};
manifest.forEach(m => (m.imgs || []).forEach(f => { if (f.file) fileToPost[f.file] = m.link; }));
uploads.filter(x => x.ok).forEach(x => {
  const link = x.post_id ? null : fileToPost[x.file];
  if (link) put(link, { url: x.url, w: x.w || 0, h: x.h || 0, raw: x.resource_type === 'raw' });
});
(readJson(PREV) || []).filter(x => x.ok !== false).forEach(x => {
  put(x.link, { url: x.url, w: x.w || 0, h: x.h || 0, raw: x.resource_type === 'raw' });
});

/* ---- 零图帖类型标签 ---- */
const cls = readJson(CLASSIFY) || {};

const thumbOf = (u, raw) => raw ? u : u.replace('/image/upload/', '/image/upload/w_600,c_limit,q_auto:good,f_auto/');
let imgTotal = 0, kindCnt = {};
posts.forEach(p => {
  const list = (byLink[p.link] || []).slice();
  list.sort((a, b) => a.url.localeCompare(b.url));
  if (list.length) { p.imgs = list.map(x => ({ full: x.url, thumb: thumbOf(x.url, x.raw), w: x.w, h: x.h })); imgTotal += p.imgs.length; }
  const c = cls[p.link];
  if (c && !p.imgs) { p.kind = c.kind === 'video' ? 'video' : (c.kind === 'audio' ? 'audio' : 'text'); if (c.dur) p.dur = c.dur; }
  if (p.kind) kindCnt[p.kind] = (kindCnt[p.kind] || 0) + 1;
});

posts.sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));

const ser = p => '  { author: ' + JSON.stringify(p.author) + ', title: ' + JSON.stringify(p.title) +
  ', time: ' + JSON.stringify(p.time) + ', comments: ' + p.comments + ', likes: ' + p.likes +
  ', link: ' + JSON.stringify(p.link) +
  (p.kind ? ', kind: ' + JSON.stringify(p.kind) : '') +
  (p.dur ? ', dur: ' + JSON.stringify(p.dur) : '') +
  (p.imgs ? ', imgs: ' + JSON.stringify(p.imgs) : '') + ' }';

const latest = posts.length ? posts[0].time : '';
fs.writeFileSync(OUT, '/* EC 二创馆 · 全部帖子数据\n' +
  '   由 scripts/build-feed-from-manifest.js 生成（抓帖 → 上传图床 → 零图帖判定），请勿手工编辑\n' +
  '   生成时间: ' + new Date().toISOString().slice(0, 19).replace('T', ' ') + '\n' +
  '   帖子 ' + posts.length + ' 条 · 图片 ' + imgTotal + ' 张 · 零图帖标签 ' + JSON.stringify(kindCnt) + '\n' +
  '   最新一条: ' + latest + ' */\n' +
  'window.EC_FEED = [\n' + posts.map(ser).join(',\n') + '\n];\n', 'utf8');

console.log(`已生成 ${OUT}`);
console.log(`  帖子 ${posts.length} 条（CSV 行 ${lines.length - 1}，按帖子ID去重）`);
console.log(`  图片 ${imgTotal} 张，覆盖 ${posts.filter(p => p.imgs).length} 条帖子`);
console.log(`  零图帖标签：${JSON.stringify(kindCnt)}`);
if (excluded.length) console.log(`  已按下架名单过滤：${excluded.join(', ')} → 剔除 ${dropped} 条帖子`);
