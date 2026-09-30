// 退出登录 —— 清除会话 cookie 后跳回首页
export default function handler(req, res) {
  const names = ["ec_uid", "ec_nick", "ec_av", "qq_state"];
  res.setHeader("Set-Cookie", names.map((n) => `${n}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`));
  res.writeHead(302, { Location: "/" });
  res.end();
}
