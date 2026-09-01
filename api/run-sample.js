// 触发 GitHub Actions「每小时群人数采样」—— 由 cron-job.org 每小时调用
// 作用：替代 GitHub schedule 定时任务（它经常延迟/跳过），用外部 cron 保证每小时准点跑
// 原理：函数内部调 GitHub 的 workflow_dispatch 接口，token 留在 Vercel 环境变量，不暴露给 cron
//
// 环境变量（Vercel 项目设置）：
//   GH_TOKEN        —— 有 repo + actions 权限的 GitHub token
//   GH_REPO         —— 形如 "user/repo"
//   EC_CRON_SECRET  —— 与 EC 采样共用的密钥（cron 时带 ?secret=xxx）

const GH_API = "https://api.github.com";
const WORKFLOW = "sample.yml";  // .github/workflows/sample.yml

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  try {
    // 密钥校验（与 ec-sample 同一个 secret）
    const secret = process.env.EC_CRON_SECRET;
    if (secret) {
      const url = new URL(req.url, "http://x");
      const auth = (req.headers && req.headers["authorization"]) || "";
      if (url.searchParams.get("secret") !== secret && auth !== `Bearer ${secret}`) {
        return send(res, { error: "unauthorized" }, 401);
      }
    }

    const token = process.env.GH_TOKEN;
    const repo = process.env.GH_REPO;
    if (!token || !repo) return send(res, { error: "未配置 GH_TOKEN / GH_REPO" }, 500);

    // 调 workflow_dispatch 触发采样（ref=main）
    const r = await fetch(`${GH_API}/repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ec",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
    });

    if (r.status === 204) {
      return send(res, { ok: true, triggered: true, workflow: WORKFLOW });
    }
    const text = await r.text();
    return send(res, { ok: false, error: "触发失败 HTTP " + r.status + " " + text }, 502);
  } catch (e) {
    return send(res, { ok: false, error: String(e && e.message || e) }, 500);
  }
}

function send(res, obj, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}
