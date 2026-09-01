/* ============================================================
 * EC NBS 全站共享播放引擎
 * - 真实 Minecraft 音盒采样 + WebAudio HiFi 合成
 * - 开屏手势触发播放（浏览器自动播放策略要求）
 * - 跨页面记住曲目/进度/音量，切页近乎无缝续播
 * 暴露 window.EC_NBS = { play, pause, toggle, next, prev, isPlaying, currentTitle, openPanel }
 * ============================================================ */
(function(){
"use strict";
if(window.EC_NBS) return;

var BASE = "./music/";           // 共享资源目录（与页面同级）
var SAMPLE_NAMES = ["harp","bass","bassattack","basedrum","snare","hat","guitar","flute",
  "bell","chime","xylophone","iron_xylophone","cow_bell","didgeridoo","bit","banjo","pling","harp2"];
var INST = {0:"harp",1:"bass",2:"basedrum",3:"snare",4:"hat",5:"guitar",
  6:"flute",7:"bell",8:"chime",9:"xylophone",10:"iron_xylophone",
  11:"cow_bell",12:"didgeridoo",13:"bit",14:"banjo",15:"pling"};
var LEVEL = {harp:0.8,harp2:0.8,bass:0.55,bassattack:0.55,guitar:0.72,flute:0.72,
  bell:0.66,chime:0.66,xylophone:0.68,iron_xylophone:0.66,pling:0.75,bit:0.66,banjo:0.72,
  cow_bell:0.66,didgeridoo:0.6,basedrum:0.72,snare:0.58,hat:0.5};

var AC = window.AudioContext || window.webkitAudioContext;
var ctx=null, master=null;
var samples={}, samplesReady=false, ctxStarted=false;
var playlist=[], song=null, curIdx=0;
var playing=false, startCtxTime=0, offsetTick=0, notePtr=0, schedTimer=null, activeSrcs=[];
var vol=1.0, muted=false, loopMode=0;
var BOOST = 1.5;   // 整体响度补偿：抵消音色电平与混响分流造成的衰减
var BASE_F=87.31;
var listeners=[];

/* ---------- 持久化 ---------- */
function save(){
  try{ localStorage.setItem("EC_NBS", JSON.stringify({
    i:curIdx, t:curTick(), play:playing, vol:vol, muted:muted, loop:loopMode, ts:Date.now()
  })); }catch(e){}
}
function load(){
  try{ return JSON.parse(localStorage.getItem("EC_NBS")||"null"); }catch(e){ return null; }
}

/* ---------- 音频上下文 ---------- */
function ensureCtx(){
  if(ctx) return Promise.resolve();
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = (muted?0:vol)*BOOST;
  /* 动态范围保护：压缩限幅器，杜绝叠音爆音，同时保留音质细节 */
  var comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -6;    // dB，接近峰值才介入
  comp.knee.value = 6;
  comp.ratio.value = 12;
  comp.attack.value = 0.002;
  comp.release.value = 0.18;
  /* 轻空气感混响（HiFi） */
  var verb = ctx.createConvolver(); verb.buffer = makeIR(1.6, 2.6);
  var vg = ctx.createGain(); vg.gain.value = 0.16;
  var dry = ctx.createGain(); dry.gain.value = 1.0;
  master.connect(dry); dry.connect(comp);
  master.connect(verb); verb.connect(vg); vg.connect(comp);
  comp.connect(ctx.destination);
  return loadSamples();
}
function makeIR(dur, decay){
  var rate=ctx.sampleRate, len=Math.floor(rate*dur);
  var buf=ctx.createBuffer(2,len,rate);
  for(var c=0;c<2;c++){ var d=buf.getChannelData(c);
    for(var i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay)*0.5;
  }
  return buf;
}
function loadSamples(){
  if(samplesReady) return Promise.resolve();
  var jobs = SAMPLE_NAMES.map(function(n){
    return fetch(BASE+"samples/"+n+".ogg")
      .then(function(r){return r.arrayBuffer();})
      .then(function(ab){return ctx.decodeAudioData(ab);})
      .then(function(b){samples[n]=b;})
      .catch(function(){});
  });
  return Promise.all(jobs).then(function(){ samplesReady=true; });
}

/* ---------- 调度 ---------- */
function midiRatio(k){ return Math.pow(2,(k-45)/12); }
function curTick(){ return playing ? offsetTick+(ctx.currentTime-startCtxTime)*song.tempo : offsetTick; }
function findPtr(t){ var lo=0,hi=song.notes.length; while(lo<hi){var m=(lo+hi)>>1; if(song.notes[m][0]<t)lo=m+1; else hi=m;} return lo; }

function schedule(){
  if(!playing||!song) return;
  var horizon = curTick()+song.tempo*0.6, notes=song.notes, layers=song.layers||[];
  while(notePtr<notes.length && notes[notePtr][0]<=horizon){
    var n=notes[notePtr++];
    var when=startCtxTime+(n[0]-offsetTick)/song.tempo;
    if(when<ctx.currentTime-0.05) continue;
    playNote(n[2],n[3],n[1],when,layers);
  }
  if(notePtr>=notes.length && curTick()>=song.length) onEnd();
}
function playNote(inst,key,layer,when,layers){
  var name=INST[inst]||"harp", buf=samples[name]||samples.harp;
  if(!buf) return;
  var src=ctx.createBufferSource(); src.buffer=buf; src.playbackRate.value=midiRatio(key);
  var g=ctx.createGain();
  var lvl=LEVEL[name]!=null?LEVEL[name]:0.55;
  if(layers[layer]) lvl*=(layers[layer][0]/100);
  g.gain.value=lvl;
  var pan=0; if(layers[layer]) pan=(layers[layer][1]-100)/100;
  pan+=((key-45)/24)*0.12; pan=Math.max(-1,Math.min(1,pan));
  if(ctx.createStereoPanner){
    var sp=ctx.createStereoPanner(); sp.pan.value=pan;
    src.connect(g); g.connect(sp); sp.connect(master);
  } else { src.connect(g); g.connect(master); }
  src.start(when);
  activeSrcs.push(src);
  src.onended=function(){ var i=activeSrcs.indexOf(src); if(i>=0)activeSrcs.splice(i,1); };
}
function stopSrcs(){ activeSrcs.forEach(function(s){try{s.stop();}catch(e){}}); activeSrcs=[]; }

/* ---------- 控制 ---------- */
function loadTrack(idx, autoplay){
  stopSrcs();
  curIdx=(idx+playlist.length)%playlist.length;
  offsetTick=0; notePtr=0;
  var item=playlist[curIdx];
  emit();
  return fetch(BASE+item.file)
    .then(function(r){return r.json();})
    .then(function(j){ song=j; save(); if(autoplay) doPlay(); emit(); });
}
function doPlay(){
  if(!song||playing) return;
  ensureCtx().then(function(){
    if(ctx.state==="suspended") ctx.resume();
    if(offsetTick>=song.length){ offsetTick=0; notePtr=0; }
    playing=true; startCtxTime=ctx.currentTime;
    schedTimer=setInterval(schedule,40);
    save(); emit();
  });
}
function doPause(){
  if(!playing) return;
  offsetTick=curTick(); playing=false;
  clearInterval(schedTimer); stopSrcs(); save(); emit();
}
function onEnd(){
  var nx = loopMode===1 ? curIdx : (loopMode===2 ? Math.floor(Math.random()*playlist.length) : curIdx+1);
  playing=false; clearInterval(schedTimer); stopSrcs();
  loadTrack(nx,true);
}
function emit(){ listeners.forEach(function(f){ try{f(api);}catch(e){} }); }

/* ---------- 启动：读歌单 + 恢复状态 ---------- */
fetch(BASE+"manifest.json")
  .then(function(r){return r.json();})
  .then(function(list){
    playlist=list;
    var st=load();
    var idx=st&&typeof st.i==="number"?st.i:0;
    if(st){
      vol=st.vol!=null?st.vol:1.0; muted=!!st.muted; loopMode=st.loop||0;
    }
    loadTrack(idx,false).then(function(){
      if(st&&st.t){ offsetTick=Math.min(st.t,song.length); notePtr=findPtr(offsetTick); }
      /* 若上次在播放且本次无需手势（部分浏览器允许），尝试直接续播；否则等待手势 */
      if(st&&st.play){ tryResume(); }
      emit();
    });
  }).catch(function(){});

/* 尝试无手势续播（多数桌面浏览器允许；QQ/微信会被拒，转由首次手势触发） */
function tryResume(){
  ensureCtx().then(function(){
    if(ctx.state==="running"){ doPlay(); }
    else{ bindGestureResume(); }
  });
}
/* 供其他页面调用：本页"上次在播放"时恢复（供 trends 等页 onload 调用，替代开屏手势） */
function resumeIfPlayed(){
  var st=load();
  if(st&&st.play && !playing){
    ensureCtx().then(function(){
      if(ctx.state==="running"){ doPlay(); }
      else{ bindGestureResume(); }
    });
  }
}
/* QQ/微信：首次任意触摸/点击即恢复播放 */
var gestureBound=false;
function bindGestureResume(){
  if(gestureBound) return; gestureBound=true;
  var h=function(){
    var st=load();
    if(st&&st.play && !playing){ ensureCtx().then(function(){ if(ctx.resume)ctx.resume(); doPlay(); }); }
    document.removeEventListener("pointerdown",h,true);
    document.removeEventListener("touchstart",h,true);
    document.removeEventListener("keydown",h,true);
  };
  document.addEventListener("pointerdown",h,true);
  document.addEventListener("touchstart",h,true);
  document.addEventListener("keydown",h,true);
}

/* 切页/隐藏前保存 */
window.addEventListener("pagehide",save);
document.addEventListener("visibilitychange",function(){ if(document.hidden)save(); });

/* ---------- 对外 API ---------- */
var api = {
  play:function(){ ensureCtx().then(function(){ if(ctx.resume)ctx.resume(); doPlay(); }); },
  pause:function(){ doPause(); },
  toggle:function(){ playing?doPause():api.play(); },
  next:function(){ doPause(); loadTrack(curIdx+1,true); },
  prev:function(){ if(song&&curTick()/song.tempo>3){offsetTick=0;notePtr=0;if(playing){var p=true;doPause();doPlay();}else{save();emit();}} else {doPause();loadTrack(curIdx-1,true);} },
  seek:function(pct){ if(!song)return; var t=Math.max(0,Math.min(song.length,pct*song.length)); var w=playing; if(playing)doPause(); offsetTick=t; notePtr=findPtr(t); if(w)doPlay(); save(); emit(); },
  setVol:function(v){ vol=Math.max(0,Math.min(1,v)); muted=false; if(master)master.gain.value=vol*BOOST; save(); },
  isPlaying:function(){ return playing; },
  title:function(){ return playlist[curIdx]?playlist[curIdx].title:""; },
  progress:function(){ return song?Math.min(1,curTick()/song.length):0; },
  cur:function(){ return song?curTick()/song.tempo:0; },
  dur:function(){ return song?song.length/song.tempo:0; },
  playlist:function(){ return playlist.map(function(p,i){return{title:p.title,dur:p.dur,on:i===curIdx};}); },
  select:function(i){ doPause(); loadTrack(i,true); },
  onChange:function(f){ if(typeof f==="function") listeners.push(f); },
  resumeIfPlayed: resumeIfPlayed
};
window.EC_NBS = api;
})();
