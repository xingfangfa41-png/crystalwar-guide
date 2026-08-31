#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EC 群人数采样脚本 —— 由 GitHub Actions 每小时运行一次
读取仓库 data.js 里的群列表和 uapis.cn Key，批量查询群人数，
把结果追加到 history.json（保留最近 40 天），供 trends.html 直接读取。
"""
import json, re, time, os
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request
from urllib.error import URLError

UAPI = "https://uapis.cn/api/v1/social/qq/groupinfo"
KEEP_DAYS = 40

def main():
    src = open("data.js", encoding="utf-8").read()
    ids = list(dict.fromkeys(re.findall(r'id:\s*"(\d+)"', src)))  # 去重保序
    m = re.search(r'uapiKey:\s*"([^"]+)"', src)
    key = m.group(1) if m else ""
    print(f"群数量: {len(ids)}")

    def query(gid):
        try:
            url = f"{UAPI}?group_id={gid}" + (f"&apikey={key}" if key else "")
            req = Request(url, headers={"User-Agent": "ec-stats-bot"})
            with urlopen(req, timeout=10) as r:
                j = json.loads(r.read())
            c = j.get("member_count")
            return gid, c if isinstance(c, int) else None
        except Exception as e:
            print(f"  [{gid}] 失败: {e}")
            return gid, None

    counts, fail = {}, 0
    with ThreadPoolExecutor(max_workers=4) as ex:
        for gid, c in ex.map(query, ids):
            if c is None: fail += 1
            else: counts[gid] = c
    print(f"成功 {len(counts)} / {len(ids)}，失败 {fail}")

    if not counts:
        print("本轮全部失败，不写入"); return

    # 读入历史，追加，裁剪
    path = "history.json"
    hist = {"points": []}
    if os.path.exists(path):
        try: hist = json.load(open(path, encoding="utf-8"))
        except Exception: pass
    hist["points"].append({"ts": int(time.time() * 1000), "g": counts})
    cutoff = (time.time() - KEEP_DAYS * 86400) * 1000
    hist["points"] = [p for p in hist["points"] if p.get("ts", 0) >= cutoff]
    hist["updated"] = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    json.dump(hist, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"history.json 现有 {len(hist['points'])} 个采样点")

if __name__ == "__main__":
    main()
