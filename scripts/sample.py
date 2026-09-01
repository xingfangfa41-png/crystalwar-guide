#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EC 群人数采样脚本 —— 由 GitHub Actions 每小时运行一次
读取仓库 data.js 里的群列表和 uapis.cn Key，批量查询群人数，
把结果追加到 history.json（保留最近 40 天），供 trends.html 直接读取。

改进：
- 失败的群重试一次
- 记录 complete 标记：数据完整度（采样群数/应有群数）
- 完整度 < 90% 时标记为不可靠，前端展示时提示
"""
import json, re, time, os
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request

UAPI = "https://uapis.cn/api/v1/social/qq/groupinfo"
KEEP_DAYS = 40

def query_one(gid, key):
    """查询单个群，失败返回 None"""
    try:
        url = f"{UAPI}?group_id={gid}" + (f"&apikey={key}" if key else "")
        req = Request(url, headers={"User-Agent": "ec-stats-bot"})
        with urlopen(req, timeout=12) as r:
            j = json.loads(r.read())
        c = j.get("member_count")
        return c if isinstance(c, int) else None
    except Exception:
        return None

def main():
    src = open("data.js", encoding="utf-8").read()
    ids = list(dict.fromkeys(re.findall(r'id:\s*"(\d+)"', src)))  # 去重保序
    m = re.search(r'uapiKey:\s*"([^"]+)"', src)
    key = m.group(1) if m else ""
    total = len(ids)
    print(f"群数量: {total}")

    # 第一轮查询
    counts = {}
    failed = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        results = list(ex.map(lambda gid: (gid, query_one(gid, key)), ids))
    for gid, c in results:
        if c is not None:
            counts[gid] = c
        else:
            failed.append(gid)
    print(f"第一轮: 成功 {len(counts)} / {total}，失败 {len(failed)}")

    # 第二轮：失败的重试
    if failed:
        print("重试失败群...")
        with ThreadPoolExecutor(max_workers=2) as ex:  # 重试降低并发
            results2 = list(ex.map(lambda gid: (gid, query_one(gid, key)), failed))
        retry_ok = 0
        for gid, c in results2:
            if c is not None:
                counts[gid] = c
                retry_ok += 1
        print(f"重试成功 {retry_ok} / {len(failed)}")

    if not counts:
        print("本轮全部失败，不写入"); return

    # 计算完整度
    completeness = len(counts) / total
    print(f"完整度: {completeness*100:.1f}% ({len(counts)}/{total})")

    # 读入历史，追加，裁剪
    path = "history.json"
    hist = {"points": []}
    if os.path.exists(path):
        try: hist = json.load(open(path, encoding="utf-8"))
        except Exception: pass

    point = {
        "ts": int(time.time() * 1000),
        "g": counts,
        "n": len(counts),      # 采样群数
        "t": total,            # 应有群数
        "c": round(completeness, 3)  # 完整度 0-1
    }
    hist["points"].append(point)
    cutoff = (time.time() - KEEP_DAYS * 86400) * 1000
    hist["points"] = [p for p in hist["points"] if p.get("ts", 0) >= cutoff]
    hist["updated"] = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    json.dump(hist, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"history.json 现有 {len(hist['points'])} 个采样点")

if __name__ == "__main__":
    main()
