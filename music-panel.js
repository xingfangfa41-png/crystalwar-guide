/* ============================================================
 * EC NBS 音乐盒面板（自包含注入版）
 * 供未内嵌面板的页面使用：注入右下角悬浮金色音符按钮 + 与主站同款抽屉面板。
 * 引擎本体在 nbs-sync.js（需先于本文件引入）。本文件只负责 UI。
 * 防重复：页面若已有内嵌面板（.music-drawer / #btnMusic）则不注入。
 * ============================================================ */
(function(){
"use strict";
if(!window.EC_NBS) return;
if(document.querySelector(".music-drawer") || document.getElementById("btnMusic")) return;
if(window.__EC_MUSIC_PANEL__) return; window.__EC_MUSIC_PANEL__ = true;

var CSS = ""
+ ".ecm-fab{position:fixed;right:22px;bottom:calc(22px + env(safe-area-inset-bottom,0px));width:52px;height:52px;border-radius:50%;z-index:9998;"
+ "background:linear-gradient(160deg,#ffe08a 0%,#ffca34 45%,#eda91c 100%);color:#14100a;border:none;cursor:pointer;"
+ "display:flex;align-items:center;justify-content:center;box-shadow:0 10px 28px rgba(255,202,52,.35),0 4px 14px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.5);"
+ "transition:transform .18s,box-shadow .25s;-webkit-tap-highlight-color:transparent}"
+ ".ecm-fab:hover{transform:scale(1.07)}"
+ ".ecm-fab:active{transform:scale(.93)}"
+ ".ecm-fab .ecm-eq{display:none;gap:2.5px;align-items:flex-end;height:16px}"
+ ".ecm-fab.playing .ecm-eq{display:flex}"
+ ".ecm-fab.playing .ecm-note{display:none}"
+ ".ecm-eq i{width:3px;background:#14100a;border-radius:2px;animation:ecmEq .9s ease-in-out infinite}"
+ ".ecm-eq i:nth-child(1){height:55%}.ecm-eq i:nth-child(2){height:100%;animation-delay:.25s}.ecm-eq i:nth-child(3){height:40%;animation-delay:.5s}"
+ "@keyframes ecmEq{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}"
+ ".ecm-fab::after{content:\"\";position:absolute;inset:-5px;border-radius:50%;border:1.5px solid rgba(255,202,52,.55);opacity:0;pointer-events:none}"
+ ".ecm-fab.playing::after{animation:ecmRipple 2.4s ease-out infinite}"
+ "@keyframes ecmRipple{0%{opacity:.8;transform:scale(.92)}70%{opacity:0;transform:scale(1.22)}100%{opacity:0}}"
+ ".music-drawer{position:fixed;inset:0;z-index:10000;display:none}"
+ ".music-drawer.open{display:block}"
+ ".music-mask{position:absolute;inset:0;background:rgba(4,4,8,.7);backdrop-filter:blur(4px)}"
+ ".music-panel{position:absolute;top:0;right:0;bottom:0;width:min(520px,100%);background:linear-gradient(200deg,#0e0e16 0%,#0a0a11 45%,#08080e 100%);"
+ "border-left:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;animation:ecmSlide .3s cubic-bezier(.22,1,.36,1);box-shadow:-24px 0 70px rgba(0,0,0,.55);color:#e8e4dc;font-family:system-ui,-apple-system,\"PingFang SC\",\"Microsoft YaHei\",sans-serif}"
+ "@keyframes ecmSlide{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}"
+ ".music-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.06)}"
+ ".music-head b{font-size:14px;letter-spacing:.1em;position:relative;padding-left:14px;font-weight:600}"
+ ".music-head b::before{content:\"\";position:absolute;left:0;top:50%;transform:translateY(-50%);width:4px;height:14px;border-radius:2px;background:linear-gradient(180deg,#ffe08a,#d9a019);box-shadow:0 0 10px rgba(255,202,52,.4)}"
+ ".music-head button{background:none;border:1px solid rgba(255,255,255,.1);color:#8a8478;border-radius:8px;padding:6px 12px;font-size:12px;transition:.2s;cursor:pointer}"
+ ".music-head button:hover{color:#FFD700;border-color:rgba(255,215,0,.4)}"
+ ".np-body{flex:1;overflow-y:auto;padding:18px 20px 30px;-webkit-overflow-scrolling:touch}"
+ ".np-hero{text-align:center;padding:10px 0 6px}"
+ ".np-disc{width:132px;height:132px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;"
+ "background:repeating-radial-gradient(circle at 50% 50%,rgba(255,255,255,.032) 0 1px,transparent 1px 4px),radial-gradient(circle at 50% 50%,#20202a 0%,#17171f 52%,#101018 100%);"
+ "border:1px solid rgba(255,202,52,.12);box-shadow:0 14px 40px rgba(0,0,0,.6),inset 0 0 0 5px #0a0a10,inset 0 1px 0 rgba(255,255,255,.05)}"
+ ".np-disc::after{content:\"\";position:absolute;inset:0;border-radius:50%;pointer-events:none;background:conic-gradient(from 210deg,transparent 0deg,rgba(255,232,170,.10) 28deg,transparent 60deg,transparent 180deg,rgba(255,232,170,.06) 208deg,transparent 240deg)}"
+ ".np-disc::before{content:\"\";position:absolute;inset:-7px;border-radius:50%;border:1px solid rgba(255,202,52,.45);opacity:0;transform:scale(.96);pointer-events:none}"
+ ".np-disc.spin{animation:npSpin 9s linear infinite;box-shadow:0 14px 44px rgba(0,0,0,.62),0 0 38px rgba(255,202,52,.14),inset 0 0 0 5px #0a0a10}"
+ ".np-disc.spin::before{animation:npAura 2.6s ease-in-out infinite}"
+ "@keyframes npSpin{to{transform:rotate(360deg)}}"
+ "@keyframes npAura{0%,100%{opacity:.25;transform:scale(.97)}50%{opacity:.85;transform:scale(1.02)}}"
+ ".np-disc span{width:48px;height:48px;border-radius:50%;background:radial-gradient(circle at 36% 30%,#3b3320,#1a1608 70%);border:1px solid rgba(255,202,52,.55);"
+ "box-shadow:0 0 18px rgba(255,202,52,.25),inset 0 1px 0 rgba(255,235,180,.25);display:flex;align-items:center;justify-content:center;font-size:22px;color:#FFD700;text-shadow:0 0 12px rgba(255,202,52,.6)}"
+ ".np-spec{display:block;width:100%;height:44px;margin:12px auto 0}"
+ ".np-title{font-size:17px;font-weight:600;letter-spacing:.04em;color:#e8e4dc}"
+ ".np-sub{font-size:11.5px;color:#5a5448;margin-top:5px;letter-spacing:.08em}"
+ ".np-prog{padding:14px 2px 2px}"
+ ".np-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.08);box-shadow:inset 0 1px 2px rgba(0,0,0,.5);cursor:pointer;position:relative;touch-action:none}"
+ ".np-fill{position:absolute;left:0;top:0;bottom:0;width:0%;border-radius:3px;background:linear-gradient(90deg,#b9b4a6,#e8e4dc);pointer-events:none}"
+ ".np-dot{position:absolute;top:50%;width:12px;height:12px;border-radius:50%;background:#e8e4dc;transform:translate(-50%,-50%);left:0%;box-shadow:0 0 0 4px rgba(232,228,220,.12),0 0 10px rgba(232,228,220,.35);pointer-events:none}"
+ ".np-times{display:flex;justify-content:space-between;font-size:11px;color:#5a5448;margin-top:7px;font-variant-numeric:tabular-nums}"
+ ".np-ctrl{display:flex;align-items:center;justify-content:center;gap:26px;padding:14px 0 4px}"
+ ".np-btn{background:none;border:none;color:#8a8478;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color .2s,transform .15s}"
+ ".np-btn:active{transform:scale(.9)}"
+ ".np-btn.big{width:60px;height:60px;border-radius:50%;background:linear-gradient(160deg,#ffe08a 0%,#ffca34 45%,#eda91c 100%);color:#14100a;box-shadow:0 8px 24px rgba(255,202,52,.38),inset 0 1px 0 rgba(255,255,255,.5);transition:transform .18s,box-shadow .25s}"
+ ".np-btn.big:hover{transform:scale(1.06);box-shadow:0 10px 30px rgba(255,202,52,.5),inset 0 1px 0 rgba(255,255,255,.55)}"
+ ".np-btn.big:active{transform:scale(.94)}"
+ ".np-btn.mid{width:42px;height:42px;color:#e8e4dc}"
+ ".np-btn.mid:hover{color:#FFD700}"
+ ".np-vol{display:flex;align-items:center;gap:10px;padding:4px 6px 14px}"
+ ".np-vol .np-vico{display:flex;align-items:center;justify-content:center;width:20px;height:20px;color:#5a5448}"
+ ".np-vol input{flex:1;accent-color:#ffca34;height:24px}"
+ ".np-listhead{font-size:11.5px;color:#5a5448;letter-spacing:.14em;padding:8px 4px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between}"
+ ".np-listhead-l{display:flex;align-items:center;gap:8px}"
+ ".np-modebtn{background:none;border:none;color:#8a8478;cursor:pointer;display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;transition:.15s}"
+ ".np-modebtn:hover{color:#FFD700}.np-modebtn:active{transform:scale(.9)}"
+ ".np-modebtn.on{color:#FFD700;filter:drop-shadow(0 0 5px rgba(255,202,52,.5))}"
+ ".np-modetxt{font-size:11.5px;color:#5a5448;letter-spacing:.14em;transition:.15s;cursor:pointer}"
+ ".np-modetxt.on{color:#FFD700}"
+ ".np-track{display:flex;align-items:center;gap:12px;padding:11px 10px;border-radius:10px;cursor:pointer;transition:.15s;position:relative}"
+ ".np-track:hover{background:rgba(255,255,255,.03)}"
+ ".np-track.on{background:linear-gradient(90deg,rgba(255,202,52,.10),rgba(255,202,52,.03))}"
+ ".np-track.on::before{content:\"\";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:2px;background:linear-gradient(180deg,#ffe08a,#d9a019);box-shadow:0 0 8px rgba(255,202,52,.45)}"
+ ".np-track .nidx{width:22px;text-align:center;font-size:12px;color:#5a5448}"
+ ".np-track.on .nidx{display:none}"
+ ".np-track .nti{flex:1;min-width:0}"
+ ".np-track .nti b{display:block;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e8e4dc}"
+ ".np-track.on .nti b{color:#ffe08a}"
+ ".np-track .nti i{display:block;font-style:normal;font-size:11px;color:#5a5448;margin-top:2px}"
+ ".np-track .ndur{font-size:11px;color:#5a5448;font-variant-numeric:tabular-nums}"
+ ".np-eq{display:none;gap:2.5px;align-items:flex-end;height:13px;width:16px}"
+ ".np-track.on .np-eq{display:flex}"
+ ".np-eq i{width:3px;background:#FFD700;border-radius:2px;animation:npEq .9s ease-in-out infinite}"
+ ".np-eq i:nth-child(1){height:60%}.np-eq i:nth-child(2){height:100%;animation-delay:.25s}.np-eq i:nth-child(3){height:40%;animation-delay:.5s}"
+ ".np-eq.paused i{animation-play-state:paused;height:25%!important}"
+ "@keyframes npEq{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}"
+ ".np-bgrow{display:flex;align-items:center;gap:10px;padding:0 6px 12px}"
+ ".np-bgrow-l{font-size:12px;color:#8a8478;letter-spacing:.08em;flex-shrink:0}"
+ ".np-bgdesc{flex:1;font-size:11px;color:#5a5448;opacity:.8}"
+ ".np-sw{position:relative;display:inline-block;width:38px;height:22px;flex-shrink:0}"
+ ".np-sw input{display:none}"
+ ".np-sw i{position:absolute;inset:0;border-radius:11px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);transition:.22s;cursor:pointer}"
+ ".np-sw i::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#8a8578;transition:.22s;box-shadow:0 1px 3px rgba(0,0,0,.4)}"
+ ".np-sw input:checked+i{background:rgba(255,202,52,.28);border-color:rgba(255,202,52,.55)}"
+ ".np-sw input:checked+i::after{left:18px;background:#ffca34;box-shadow:0 0 8px rgba(255,202,52,.55)}"
+ ".np-tip{font-size:11px;color:#5a5448;text-align:center;padding:12px 0 0;line-height:1.7}";

var HTML = ""
+ '<button class="ecm-fab" id="ecmFab" title="音乐播放器" aria-label="音乐播放器">'
+   '<svg class="ecm-note" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
+   '<span class="ecm-eq"><i></i><i></i><i></i></span>'
+ '</button>'
+ '<div class="music-drawer" id="musicDrawer">'
+   '<div class="music-mask" id="musicMask"></div>'
+   '<div class="music-panel">'
+     '<div class="music-head"><b>NBS 音乐播放器</b><button id="musicClose">关闭</button></div>'
+     '<div class="np-body">'
+       '<div class="np-hero">'
+         '<div class="np-disc" id="npDisc"><span>♫</span></div>'
+         '<div class="np-title" id="npTitle">加载中…</div>'
+         '<div class="np-sub">Minecraft 音盒 · 真实采样</div>'
+         '<canvas class="np-spec" id="npSpec" aria-hidden="true"></canvas>'
+       '</div>'
+       '<div class="np-prog">'
+         '<div class="np-bar" id="npBar"><div class="np-fill" id="npFill"></div><div class="np-dot" id="npDot"></div></div>'
+         '<div class="np-times"><span id="npCur">0:00</span><span id="npTot">0:00</span></div>'
+       '</div>'
+       '<div class="np-ctrl">'
+         '<button class="np-btn mid" id="npPrev" title="上一首"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L8.5 12z"/></svg></button>'
+         '<button class="np-btn big" id="npPlay" title="播放/暂停">'
+           '<svg id="npIcoPlay" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
+           '<svg id="npIcoPause" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>'
+         '</button>'
+         '<button class="np-btn mid" id="npNext" title="下一首"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14H6zM4 5v14l11.5-7z"/></svg></button>'
+       '</div>'
+       '<div class="np-vol">'
+         '<span class="np-vico" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/></svg></span>'
+         '<input type="range" id="npVol" min="0" max="100" value="100"/>'
+         '<span class="np-vico" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.4 5.6a9 9 0 0 1 0 12.8"/></svg></span>'
+       '</div>'
+       '<div class="np-bgrow">'
+         '<span class="np-bgrow-l">后台播放</span>'
+         '<span class="np-bgdesc">切页后音乐继续播放</span>'
+         '<label class="np-sw" title="关闭后，切到其他页面再回来不会自动续播"><input type="checkbox" id="npBg"><i></i></label>'
+       '</div>'
+       '<div class="np-listhead"><span class="np-listhead-l">播放列表<button class="np-modebtn" id="npMode" title="切换播放模式"></button></span><span class="np-modetxt" id="npModeTxt">顺序</span></div>'
+       '<div class="np-list" id="npList"></div>'
+       '<p class="np-tip">真实 Minecraft 音盒采样 · 全站同步播放</p>'
+     '</div>'
+   '</div>'
+ '</div>';

var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
var wrap = document.createElement("div"); wrap.id = "ecMusicPanel"; wrap.innerHTML = HTML;
document.body.appendChild(wrap);

/* ===== 面板驱动（与主站内嵌面板同一套交互逻辑） ===== */
var $ = function(s){ return document.querySelector(s); };
function npFmt(s){ s=Math.max(0,Math.floor(s||0)); var m=Math.floor(s/60); return m+":"+("0"+(s%60)).slice(-2); }

function npSync(){
  var on = EC_NBS.isPlayingAnywhere ? EC_NBS.isPlayingAnywhere() : EC_NBS.isPlaying();
  $("#npIcoPlay").style.display = on?"none":"block";
  $("#npIcoPause").style.display = on?"block":"none";
  $("#npDisc").classList.toggle("spin", on);
  $("#ecmFab").classList.toggle("playing", on);
  var t = EC_NBS.title(); if(t) $("#npTitle").textContent = t;
  $("#npTot").textContent = npFmt(EC_NBS.dur());
  var eq = document.querySelector(".np-track.on .np-eq"); if(eq) eq.classList.toggle("paused", !on);
  document.querySelectorAll(".np-track").forEach(function(el){
    el.classList.toggle("on", el.dataset.title === t);
  });
}
function npProg(){
  if(!EC_NBS.isPlaying()) return;
  var pct = EC_NBS.progress()*100;
  $("#npFill").style.width = pct+"%"; $("#npDot").style.left = pct+"%";
  $("#npCur").textContent = npFmt(EC_NBS.cur());
}
setInterval(npProg, 150);
/* 悬浮按钮呼吸态也跟随跨页状态（别页在播/暂停时按钮能反映） */
setInterval(npSync, 1200);

function npBuildList(){
  var box = $("#npList"); box.innerHTML = "";
  EC_NBS.playlist().forEach(function(p, i){
    var d = document.createElement("div");
    d.className = "np-track"+(p.on?" on":""); d.dataset.title = p.title;
    d.innerHTML = '<span class="nidx">'+(i+1)+'</span>'+
      '<span class="np-eq"><i></i><i></i><i></i></span>'+
      '<div class="nti"><b></b><i>Minecraft 音盒</i></div>'+
      '<span class="ndur">'+npFmt(p.dur)+'</span>';
    d.querySelector("b").textContent = p.title;
    d.addEventListener("click", function(){
      var t = EC_NBS.title();
      if(p.title === t){ EC_NBS.toggle(); } else { EC_NBS.select(i); }
      setTimeout(function(){ npBuildList(); npSync(); }, 60);
    });
    box.appendChild(d);
  });
  npSync();
}

function openMusic(){ $("#musicDrawer").classList.add("open"); npBuildList(); setTimeout(syncSpec, 40); }
function closeMusic(){ $("#musicDrawer").classList.remove("open"); setTimeout(syncSpec, 40); }
$("#ecmFab").addEventListener("click", openMusic);
$("#musicClose").addEventListener("click", closeMusic);
$("#musicMask").addEventListener("click", closeMusic);
$("#npPlay").addEventListener("click", function(){
  var on = EC_NBS.isPlayingAnywhere ? EC_NBS.isPlayingAnywhere() : EC_NBS.isPlaying();
  if(on && EC_NBS.pauseEverywhere){ EC_NBS.pauseEverywhere(); } else { EC_NBS.play(); }
  setTimeout(npSync, 80);
});
$("#npNext").addEventListener("click", function(){ EC_NBS.next(); setTimeout(npBuildList,80); });
$("#npPrev").addEventListener("click", function(){ EC_NBS.prev(); setTimeout(npBuildList,80); });
$("#npVol").addEventListener("input", function(){ EC_NBS.setVol(this.value/100); });

/* 播放模式切换：顺序 → 单曲 → 随机 */
(function(){
  var btn = $("#npMode"), txt = $("#npModeTxt");
  var ICONS = [
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="16" font-size="10" text-anchor="middle" fill="currentColor" font-weight="bold">1</text></svg>',
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10.6 9.2L7.4 6H3v2h3.6l3.2 3.2.8-2zm6.8 9.8L14.2 16l.8-2 3.2 3H21v2h-3.6zM14 4h7v2h-4.4l-1.9 1.9-.8-2L16.6 4H14zM3 18h4.4l7-7 2.4-2.4L18.2 7H14V5h7v2"/></svg>'
  ];
  var NAMES = ["顺序","单曲","随机"], TITLES = ["顺序播放","单曲循环","随机播放"];
  function refresh(){
    var m = EC_NBS.getLoop ? EC_NBS.getLoop() : 0;
    btn.innerHTML = ICONS[m]; btn.title = "播放模式：" + TITLES[m];
    btn.classList.toggle("on", m!==0);
    if(txt){ txt.textContent = NAMES[m]; txt.classList.toggle("on", m!==0); }
  }
  function cycle(){ if(EC_NBS.cycleLoop) EC_NBS.cycleLoop(); refresh(); }
  btn.addEventListener("click", cycle);
  if(txt) txt.addEventListener("click", cycle);
  refresh();
})();

/* 后台播放开关 */
(function(){
  var sw = $("#npBg");
  sw.checked = EC_NBS.getBg ? EC_NBS.getBg() : true;
  sw.addEventListener("change", function(){ if(EC_NBS.setBg) EC_NBS.setBg(sw.checked); });
})();

/* 进度条拖拽 */
(function(){
  var bar = $("#npBar"), drag=false;
  function sk(e){
    var r=bar.getBoundingClientRect();
    var x=(e.touches?e.touches[0].clientX:e.clientX)-r.left;
    EC_NBS.seek(Math.max(0,Math.min(1,x/r.width)));
  }
  bar.addEventListener("pointerdown", function(e){ drag=true; sk(e); if(bar.setPointerCapture)bar.setPointerCapture(e.pointerId); });
  bar.addEventListener("pointermove", function(e){ if(drag) sk(e); });
  bar.addEventListener("pointerup", function(){ drag=false; });
})();

/* 初始化音量条 = 引擎当前音量 */
try{ var _sv = JSON.parse(localStorage.getItem("EC_NBS")||"{}"); $("#npVol").value = Math.round((_sv.vol!=null?_sv.vol:1)*100); }catch(e){}

/* 引擎状态变化时刷新（含切歌） */
EC_NBS.onChange(function(){ npSync(); });

/* 频谱条：旁路只读 analyser，抽屉打开时才运行（对数刻度 40Hz–16kHz，分段取峰值） */
var spec = document.getElementById("npSpec");
var sx = spec.getContext("2d"), sRun = false, sAnalyser = null, sData = null;
function specSize(){ var w = spec.clientWidth || 320; spec.width = w * 2; spec.height = 88; }
function specDraw(){
  if(!sRun) return;
  if(!sAnalyser && EC_NBS.getAnalyser && EC_NBS.getAnalyser()){
    sAnalyser = EC_NBS.getAnalyser(); sData = new Uint8Array(sAnalyser.frequencyBinCount);
  }
  var playing = EC_NBS.isPlaying && EC_NBS.isPlaying();
  if(playing && sAnalyser) sAnalyser.getByteFrequencyData(sData);
  var W = spec.width, H = spec.height, N = 44, bw = W / N;
  sx.clearRect(0, 0, W, H);
  var now = Date.now();
  var M = sData ? sData.length : 128, sr = 44100, fMin = 40, fMax = Math.min(16000, sr/2);
  var logMin = Math.log(fMin), logRange = Math.log(fMax) - logMin;
  for(var i = 0; i < N; i++){
    var v;
    if(playing && sData){
      var f0 = Math.exp(logMin + logRange*i/N), f1 = Math.exp(logMin + logRange*(i+1)/N);
      var b0 = Math.max(0, Math.floor(f0/sr*M*2)), b1 = Math.min(M-1, Math.max(b0, Math.ceil(f1/sr*M*2)));
      var peak = 0; for(var b = b0; b <= b1; b++){ if(sData[b] > peak) peak = sData[b]; }
      v = peak / 255;
    }else{
      v = .05 + .03 * Math.sin(now/900 + i*.55);
    }
    var h = Math.max(3, v*H*.92), x = i*bw + bw*.28, w = bw*.44, r = w/2;
    var g = sx.createLinearGradient(0, H, 0, H-h);
    g.addColorStop(0, "rgba(255,202,52,.14)");
    g.addColorStop(1, "rgba(255,224,138," + (playing ? (.35+v*.6) : .25) + ")");
    sx.fillStyle = g;
    sx.beginPath(); sx.moveTo(x, H); sx.lineTo(x, H-h+r);
    sx.arc(x+r, H-h+r, r, Math.PI, 0); sx.lineTo(x+w, H); sx.closePath(); sx.fill();
  }
  requestAnimationFrame(specDraw);
}
function syncSpec(){
  var open = $("#musicDrawer").classList.contains("open");
  if(open && !sRun){ sRun = true; specSize(); specDraw(); }
  else if(!open){ sRun = false; }
}
addEventListener("resize", function(){ if(sRun) specSize(); });

/* 引擎异步就绪后同步一次 */
var _rdy = setInterval(function(){ if(EC_NBS.playlist){ npSync(); clearInterval(_rdy); } }, 200);
setTimeout(function(){ clearInterval(_rdy); }, 10000);
})();
