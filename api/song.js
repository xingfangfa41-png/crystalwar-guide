/* 歌曲数据代理：QQ X5 等旧内核不支持 CDN 对 /music/*.json 的 Brotli(br) 压缩，
   fetch 静态 json 会解码失败。此接口读取部署内的歌曲 json 原文返回（Vercel 函数响应不经过
   静态文件的 br 压缩通道），供引擎降级加载。
   纯 CommonJS 写法（module.exports），避免 ESM 转换在云端构建器引发的问题。 */
const { readFileSync, existsSync } = require("fs");
const { join } = require("path");

const SAFE = /^[\w\-]+\.json$/; /* 只允许纯文件名，防路径穿越 */

module.exports = function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method" });
    return;
  }
  const file = String((req.query && req.query.file) || "");
  if (!SAFE.test(file)) {
    res.status(400).json({ error: "bad file" });
    return;
  }
  /* 部署目录结构：music/ 根（前几首）或 music/nbs/（其余） */
  let p = join(process.cwd(), "music", file);
  if (!existsSync(p)) p = join(process.cwd(), "music", "nbs", file);
  if (!existsSync(p)) {
    res.status(404).json({ error: "not found: " + file });
    return;
  }
  const data = readFileSync(p, "utf8");
  /* 服务广场(market 子域)跨域也要能用；只读接口，放开 CORS 风险可控 */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(data);
};
