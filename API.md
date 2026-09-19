# EC 全服在线人数 · 公开数据 API

开放接口，无需密钥，可自由用于数据面板、脚本、可视化。

## 接口

```
GET https://ec-crystal-war.com/api/ec
```

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
| `count` | 返回点数量 |

- 采样频率：约每分钟 1 条
- 保留范围：最近 40 天
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
