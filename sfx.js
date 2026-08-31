/* ============================================================
 * EC 交互音效模块（sfx.js）
 * - 懒加载：首次用户交互时才创建 Audio，不占首屏
 * - 低音量（0.35），hover 音效节流 90ms 且仅指针设备启用
 * - 开关持久化在 localStorage（EC_SFX_OFF=1 关闭）
 * - 用法：EC_SFX.play("click" | "hover" | "success" | "error" | "open")
 *         EC_SFX.toggle() 切换开关，返回当前状态
 * ============================================================ */
window.EC_SFX = (function () {
  "use strict";
  var BASE = "./sfx/";
  var FILES = {
    click:   { src: "click.mp3",   vol: 0.35 },
    hover:   { src: "hover.mp3",   vol: 0.18 },
    success: { src: "success.mp3", vol: 0.40 },
    error:   { src: "error.mp3",   vol: 0.40 },
    open:    { src: "open.mp3",    vol: 0.30 }
  };
  var pool = {}, lastHover = 0, unlocked = false;

  function off() {
    try { return localStorage.getItem("EC_SFX_OFF") === "1"; } catch (e) { return false; }
  }
  function get(name) {
    var f = FILES[name];
    if (!f) return null;
    if (!pool[name]) {
      var a = new Audio(BASE + f.src);
      a.preload = "auto";
      a.volume = f.vol;
      pool[name] = a;
    }
    return pool[name];
  }
  function play(name) {
    if (off()) return;
    if (name === "hover") {
      var now = Date.now();
      if (now - lastHover < 90) return;   // 节流
      lastHover = now;
    }
    var a = get(name);
    if (!a) return;
    try {
      a.currentTime = 0;
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function toggle() {
    var next = !off();
    try { localStorage.setItem("EC_SFX_OFF", next ? "1" : "0"); } catch (e) {}
    if (!next) play("success");   // 刚打开时给个提示音
    return !next;                 // 返回“现在是否开启”
  }
  /* 首次任意交互时预载常用音效（满足浏览器自动播放策略） */
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    Object.keys(FILES).forEach(function (k) { get(k); });
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
  }
  document.addEventListener("pointerdown", unlock, { passive: true });
  document.addEventListener("keydown", unlock, { passive: true });

  return { play: play, toggle: toggle, isOn: function () { return !off(); } };
})();
