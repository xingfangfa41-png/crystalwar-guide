import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const WIDTH = 960, HEIGHT = 700;
const PLOT = { left: 119, right: 861, top: 361, bottom: 558 };
const ASSETS = join(process.cwd(), "assets", "ec-card");
const RANGE_LABELS = { "1": "近 1 天", "7": "近 7 天", "30": "近 30 天", all: "全部历史" };
const COLORS = { ink: "#f2f5e9", muted: "#a6bfb0", mint: "#7be6b3", gold: "#f0cf90" };
const number = new Intl.NumberFormat("en-US");
const chinaTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
let avatarUri;

function dateParts(ts) {
  return Object.fromEntries(chinaTime.formatToParts(ts).map(({type, value}) => [type, value]));
}

function fullDate(ts) {
  const d = dateParts(ts);
  return `${d.year}-${d.month}-${d.day} ${d.hour}:${d.minute}`;
}

function tickDate(ts, showTime) {
  const d = dateParts(ts);
  return showTime ? `${d.hour}:${d.minute}` : `${d.month}/${d.day}`;
}

function text(value, x, y, size, { color = COLORS.ink, weight = 400, anchor = "start" } = {}) {
  const escaped = String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${escaped}</text>`;
}

function stat(x, label, value, color) {
  return text(label, x, 221, 23, {color: COLORS.muted})
    + text(value, x, 280, 56, {color, weight: 700});
}

function chart(points, maximum, range) {
  const first = points[0].ts;
  const span = points.at(-1).ts - first;
  const {left, right, top, bottom} = PLOT;
  const rawStep = Math.max(1, maximum / 4);
  const step = Math.ceil(rawStep / (10 ** Math.floor(Math.log10(rawStep))))
    * (10 ** Math.floor(Math.log10(rawStep)));
  const x = (ts) => span ? left + (right - left) * (ts - first) / span : (left + right) / 2;
  const y = (ec) => bottom - (bottom - top) * ec / (4 * step);
  const grid = Array.from({length: 5}, (_, i) => {
    const py = y(i * step);
    return `<path d="M${left} ${py}H${right}" stroke="#35504a" stroke-dasharray="${i ? "5 6" : "0"}"/>`
      + text(number.format(i * step), left - 15, py + 6, 19, {color: COLORS.muted, anchor: "end"});
  }).join("");

  const showTime = range === "1" || span < 86400000;
  const labels = (span ? [0, 0.5, 1] : [0]).map((fraction) => {
    const ts = first + span * fraction;
    return text(tickDate(ts, showTime), x(ts), bottom + 31, 21, {color: COLORS.muted, anchor: "middle"});
  }).join("");
  const path = points.map(({ts, ec}, i) => `${i ? "L" : "M"}${x(ts).toFixed(1)} ${y(ec).toFixed(1)}`).join(" ");
  const area = span ? `<path d="${path} L${right} ${bottom} H${left}Z" fill="url(#area)"/>` : "";
  const dots = (points.length <= 10 ? points : points.slice(-1)).map(({ts, ec}) =>
    `<circle cx="${x(ts)}" cy="${y(ec)}" r="5.5" fill="${COLORS.mint}" stroke="#172a27" stroke-width="2"/>`).join("");
  return grid + area + `<path d="${path}" stroke="${COLORS.mint}" stroke-width="3.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` + dots + labels;
}

export function renderEcCard({ points, count }, range) {
  avatarUri ??= "data:image/png;base64," + readFileSync(join(ASSETS, "aila.png")).toString("base64");
  const latest = points.at(-1);
  const peak = latest ? points.reduce((max, {ec}) => Math.max(max, ec), 0) : 0;
  const figure = latest ? chart(points, peak, range)
    : text("所选范围暂无采样", WIDTH / 2, 472, 32, {color: COLORS.muted, anchor: "middle"});
  const actualRange = latest ? `采样区间 ${fullDate(points[0].ts)} — ${fullDate(latest.ts)}` : "暂无记录";
  const fmt = (value) => latest ? number.format(value) : "—";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${WIDTH}" height="${HEIGHT}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.86" y2="1"><stop offset="0" stop-color="#214038"/><stop offset="1" stop-color="#101d1c"/></linearGradient>
      <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#69d3a2" stop-opacity=".30"/><stop offset="1" stop-color="#69d3a2" stop-opacity=".03"/></linearGradient>
    </defs>
    <rect width="960" height="700" fill="url(#bg)"/>
    <rect x="36" y="35" width="888" height="630" rx="31" fill="#172926" stroke="#426258" stroke-width="1.5"/>
    <g font-family="EC Card Sans">
      <rect x="69" y="62" width="7" height="25" rx="3.5" fill="${COLORS.gold}"/>
      ${text("艾拉  /  EC 社群推送", 90, 84, 25, {color: COLORS.gold, weight: 700})}
      ${text("EC 全服在线人数", 68, 148, 48, {weight: 700})}
      <image x="806" y="57" width="87" height="87" xlink:href="${avatarUri}"/>
      ${text(RANGE_LABELS[range], 891, 166, 21, {color: COLORS.muted, anchor: "end"})}
      <rect x="66" y="185" width="828" height="117" rx="17" fill="#203833"/>
      <path d="M337 206v75 M612 206v75" stroke="#3a5850"/>
      ${stat(93, "最新在线", fmt(latest?.ec), COLORS.mint)}
      ${stat(367, "区间峰值", fmt(peak), COLORS.ink)}
      ${stat(641, "采样次数", number.format(count), COLORS.gold)}
      ${text("在线趋势", 75, 337, 22, {color: COLORS.ink, weight: 700})}
      ${figure}
      <path d="M66 612h828" stroke="#35504a"/>
      ${text(actualRange, 73, 641, 19, {color: COLORS.muted})}
      ${text("北京时间", 888, 641, 19, {color: COLORS.muted, anchor: "end"})}
    </g>
  </svg>`;
  return new Resvg(svg, { font: {
    loadSystemFonts: false,
    fontFiles: [join(ASSETS, "noto-sc-regular.otf"), join(ASSETS, "noto-sc-bold.otf")],
    defaultFontFamily: "EC Card Sans",
  }}).render().asPng();
}
