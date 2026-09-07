# 二创馆整改说明（内部）

2026-09-07 起，`ercuang.html`  temporarily 替换为「整改中」公告页，原因：需要为作品收录建立
作者授权机制与下架通道，避免未经许可转载他人二创作品。

## 保留了什么

- **帖子数据与页面实现**：完整保存在 Git 历史中，本次提交只替换了工作区文件，没有删除历史。
  - 完整版页面：`git show 39dc526:ercuang.html`（含三档画质、抽屉筛选、瀑布流、灯箱多图）
  - 帖子数据：`git show 39dc526:ercuang-feed.js`（1088 帖 / 1860 图链接）
- **Cloudinary 图片资产**：`ercuang/` 目录下 1860 张图片**未删除**，仍完整保留。
- **构建管线**：`scripts/crawl-posts`、`upload-to-cloudinary`、`build-feed-from-manifest.js`
  与下架名单 `scripts/excluded-authors.json` 均保留可用。

## 移出了公开访问范围

- `ercuang-feed.js` 从工作区移除（站点根目录下的文件都是公开可访问的，留着等于帖子清单和
  图片直链仍可被抓取）。需要时从上面的 Git 提交恢复。

## 恢复开放的方式

授权机制就绪后：

```bash
git show 39dc526:ercuang.html     > ercuang.html
git show 39dc526:ercuang-feed.js  > ercuang-feed.js
git add -A && git commit -m "二创馆：恢复开放" && git push
```

或按新的白名单机制，用 `scripts/build-feed-from-manifest.js` 重新生成只含已授权作品的数据文件。

## 仍待处理

- Git 历史与 Vercel 历史部署（保留 30 天）中仍可访问旧版页面与数据，如需彻底下线需重写历史 / 删除历史部署。
