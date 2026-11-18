# EC 全服在线人数 · 公开数据 API

开放接口，无需密钥，可自由用于数据面板、脚本、可视化。

## 接口

```
GET https://ec-crystal-war.com/api/ec
```

数据接口默认返回最近 40 天的记录，也可用 `?range=1`、`?range=7`、`?range=30` 或 `?range=all` 查询指定范围。

## 返回

```json
{
  "points": [
    { "ts": 1788254887359, "ec": 918 }
  ],
  "updated": "2026-09-19 07:13:10 UTC",
  "count": 22253
}
```

| 字段 | 说明 |
|---|---|
| `ts` | 毫秒时间戳（采样时刻） |
| `ec` | 当时 EC 全服在线人数 |
| `updated` | 最新一条采样的时间 |
| `count` | 查询范围内的原始采样点数量。指定范围后，长区间返回的绘图点会保留各时段峰谷，`points.length` 可能小于 `count` |

- 采样频率：约每分钟 1 条
- 默认查询范围：最近 40 天。全部历史请用 `range=all`
- CORS：`*`，任意网站可跨域调用
- 数据来源：EC 服务器 MOTD 轮询

## 示例（Python）

```python
import requests, datetime
d = requests.get("https://ec-crystal-war.com/api/ec").json()
for p in d["points"][-5:]:
    print(datetime.datetime.fromtimestamp(p["ts"]/1000), p["ec"])
```

## 示例（浏览器 JS）

```js
fetch("https://ec-crystal-war.com/api/ec")
  .then(r => r.json())
  .then(d => console.log("当前在线:", d.points.at(-1).ec));
```

数据更新于每分钟整点附近，无需缓存。

## QQ 推送图

```
GET https://ec-crystal-war.com/api/ec-card?range=7
```

公开接口，直接返回 `image/png`。可选 `range=1`、`7`、`30`、`all`，省略时为 7 天。机器人可将图片 URL 交给 QQ 富媒体接口，或下载 PNG 后上传。图上时间为北京时间，卡片上显示的是最新采样值。
