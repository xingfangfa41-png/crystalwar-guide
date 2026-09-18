#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""批量上传素材空间贴图到 Cloudinary（复用二创馆图床），生成 CDN 映射。
用法: python3 upload-cloudinary.py
环境变量 CLOUD_NAME/CLOUD_API_KEY/CLOUD_API_SECRET，或改下方常量。
输出: textures-cf.json {分类: {文件名: "secure_url"}}，断点续传（已存在跳过）。
"""
import os, json, time, uuid, base64, urllib.request, urllib.error, concurrent.futures as cf

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "textures")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "textures-cf.json")
CLOUD_NAME = os.environ.get("CLOUD_NAME", "dubpl7gp6")
API_KEY = os.environ.get("CLOUD_API_KEY", "687852635982568")
API_SECRET = os.environ.get("CLOUD_API_SECRET", "A59UdTIGxhXClg75zhROzJz6ktw")
API = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload"
AUTH = "Basic " + base64.b64encode(f"{API_KEY}:{API_SECRET}".encode()).decode()
MAX_WORKERS = 10
DELAY = 0.02

def upload_one(fpath, pubid):
    boundary = "----" + uuid.uuid4().hex
    with open(fpath, "rb") as f:
        data = f.read()
    fn = os.path.basename(fpath)
    parts = []
    parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{fn}\"\r\nContent-Type: image/png\r\n\r\n".encode() + data + b"\r\n")
    parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"public_id\"\r\n\r\n{pubid}\r\n".encode())
    parts.append(f"--{boundary}--\r\n".encode())
    req = urllib.request.Request(API, data=b"".join(parts), method="POST")
    req.add_header("Authorization", AUTH)
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            d = json.loads(r.read().decode())
        if d.get("secure_url"):
            return d["secure_url"]
        return {"error": (d.get("error", {}).get("message") if isinstance(d.get("error"), dict) else d.get("error")) or "unknown"}
    except urllib.error.HTTPError as e:
        try:
            err = json.loads(e.read().decode()).get("error", {}).get("message", str(e))
        except Exception:
            err = str(e)
        return {"error": err}
    except Exception as e:
        return {"error": str(e)}

def main():
    files = []
    for root, _, fs in os.walk(ROOT):
        for f in sorted(fs):
            if f.endswith(".png"):
                cat = os.path.relpath(root, ROOT).replace("\\", "/")
                files.append((cat, os.path.join(root, f)))
    print(f"共 {len(files)} 张", flush=True)
    done = {}
    if os.path.exists(OUT):
        try: done = json.load(open(OUT, encoding="utf-8"))
        except Exception: done = {}
    todo = [(c, p) for c, p in files if c not in done or os.path.basename(p) not in done[c]]
    print(f"已完成 {len(files)-len(todo)}，剩余 {len(todo)}", flush=True)

    newmap = dict(done)
    ok = fail = 0
    def work(item):
        cat, path = item
        time.sleep(DELAY)
        pubid = f"textures/{cat}/{os.path.basename(path)[:-4]}"
        return cat, os.path.basename(path), upload_one(path, pubid)
    with cf.ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futs = [ex.submit(work, it) for it in todo]
        for fut in cf.as_completed(futs):
            cat, fn, res = fut.result()
            if isinstance(res, dict):
                fail += 1
                print(f"FAIL {cat}/{fn}: {res['error']}", flush=True)
            else:
                ok += 1
                newmap.setdefault(cat, {})[fn] = res
                if ok % 50 == 0:
                    json.dump(newmap, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
                    print(f"进度 {ok}/{len(todo)}", flush=True)
    json.dump(newmap, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"完成：成功 {ok}，失败 {fail}", flush=True)

if __name__ == "__main__":
    main()
