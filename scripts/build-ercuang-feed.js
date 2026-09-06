#!/usr/bin/env node
/* 从二创馆导出的 CSV 生成 ercuang-feed.js（页面「全部帖子」视图的数据源） */
const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2];
const outPath = process.argv[3] || path.join(__dirname, '..', 'ercuang-feed.js');
if (!csvPath) { console.error('用法: node build-ercuang-feed.js <csv路径> [输出路径]'); process.exit(1); }

function parseLine(l) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) { if (c === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else { if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; }
  }
  out.push(cur); return out;
}

const text = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
const lines = text.split(/\r?\n/).filter(l => l.trim());
const header = parseLine(lines[0]);
const idx = {};
header.forEach((h, i) => idx[h.trim()] = i);
const need = ['作者', '标题', '发布时间', '评论数', '点赞数', '分享链接'];
for (const k of need) if (idx[k] === undefined) { console.error('CSV 缺少列: ' + k); process.exit(1); }

const seen = new Set();
const posts = [];
for (const line of lines.slice(1)) {
  const c = parseLine(line);
  if (c.length < header.length) continue;
  const link = (c[idx['分享链接']] || '').trim();
  if (!link || seen.has(link)) continue;
  seen.add(link);
  posts.push({
    author: (c[idx['作者']] || '').trim(),
    title: (c[idx['标题']] || '').trim(),
    time: (c[idx['发布时间']] || '').trim(),
    comments: parseInt(c[idx['评论数']], 10) || 0,
    likes: parseInt(c[idx['点赞数']], 10) || 0,
    link,
  });
}
posts.sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));

const latest = posts.length ? posts[0].time : '';
const body = posts.map(p =>
  '  { author: ' + JSON.stringify(p.author) + ', title: ' + JSON.stringify(p.title) +
  ', time: ' + JSON.stringify(p.time) + ', comments: ' + p.comments +
  ', likes: ' + p.likes + ', link: ' + JSON.stringify(p.link) + ' }'
).join(',\n');

const out = '/* EC 二创馆 · 全部帖子数据\n' +
  '   由 scripts/build-ercuang-feed.js 从 CSV 导出生成，请勿手工编辑\n' +
  '   生成时间: ' + new Date().toISOString().slice(0, 19).replace('T', ' ') + '\n' +
  '   帖子数: ' + posts.length + ' · 最新一条: ' + latest + ' */\n' +
  'window.EC_FEED = [\n' + body + '\n];\n';

fs.writeFileSync(outPath, out, 'utf8');
console.log('已生成 ' + outPath + '：' + posts.length + ' 条帖子，最新 ' + latest);
