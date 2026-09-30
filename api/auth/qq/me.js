// 查询当前登录态 —— 前端 fetch 这个接口决定显示"QQ登录"还是用户信息
export default function handler(req, res) {
  const raw = req.headers.cookie || "";
  const get = (n) => {
    const m = raw.match(new RegExp("(?:^|;\\s*)" + n + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  };
  const uid = get("ec_uid");
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (!uid) {
    res.end(JSON.stringify({ logged: false }));
    return;
  }
  res.end(JSON.stringify({
    logged: true,
    user: { uid, nickname: get("ec_nick") || "QQ用户", avatar: get("ec_av") || "" },
  }));
}
