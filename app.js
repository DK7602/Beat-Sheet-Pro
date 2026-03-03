/* Beat Sheet Pro - app.js (FULL REPLACE v22_AUTOSCROLL_START_CARD_IN_VIEW_FIX */
(() => {
"use strict";

function syncHeaderHeightVar(){
  const header = document.querySelector("header");
  if(!header) return;

  const measure = ()=>{
    const collapsed = document.body.classList.contains("headerCollapsed");
    let h = 0;

    if(!collapsed){
      // Reserve space down to the drum row (.stickyTools) so the main view starts right below it.
      const sticky = header.querySelector(".stickyTools") || document.querySelector(".stickyTools");
      if(sticky){
        const r = sticky.getBoundingClientRect();
        h = Math.ceil(r.bottom); // bottom relative to viewport
      } else {
        h = Math.ceil(header.getBoundingClientRect().height || 0);
      }

      // ✅ Make the header itself extend exactly to the bottom of the drum row
      // so nothing looks "cut off" and there isn't a gray gap.
      header.style.height = h + "px";
      const hs = document.getElementById("headerScroll");
      if (hs){ hs.style.height = "100%"; hs.style.overflowY = (collapsed ? "hidden" : "auto"); }

      header.style.maxHeight = "none";
      header.style.overflow = "hidden";
    } else {
      // Collapsed: let CSS handle it
      h = Math.ceil(header.getBoundingClientRect().height || 0);
      header.style.height = "";
      header.style.maxHeight = "";
      header.style.overflow = "";
    }

    document.documentElement.style.setProperty("--headerH", h + "px");
  };

  // Run a few times to catch font/image/layout shifts
  measure();
  requestAnimationFrame(measure);
  setTimeout(measure, 60);
}
window.addEventListener("resize", ()=>syncHeaderHeightVar());

/***********************
✅ remembers last textarea user typed in (mobile fix)
***********************/
let lastTextarea = null;
document.addEventListener("focusin", (e)=>{
  const t = e.target;
  if(t && t.tagName === "TEXTAREA") lastTextarea = t;
});

/***********************
✅ STORAGE ISOLATION (IMPORTANT)
***********************/
const APP_VERSION = "Hobo Beat Sheet";

const need = (id) => document.getElementById(id);
const els = {
  exportBtn: need("exportBtn"),
  saveBtn: need("saveBtn"),
  bpm: need("bpm"),

  // upload
  mp3Btn: need("mp3Btn"),
  mp3Input: need("mp3Input"),

  // drums
  drum1Btn: need("drum1Btn"),
  drum2Btn: need("drum2Btn"),
  drum3Btn: need("drum3Btn"),
  drum4Btn: need("drum4Btn"),

  // autoscroll
  autoScrollBtn: need("autoScrollBtn"),

  // projects
  projectPicker: need("projectPicker"),
  editProjectBtn: need("editProjectBtn"),
  newProjectBtn: need("newProjectBtn"),
  copyProjectBtn: need("copyProjectBtn"),
  deleteProjectBtn: need("deleteProjectBtn"),

  toast: need("toast"),
  statusText: need("statusText"),

  headerToggle: need("headerToggle"),
  headerToggle2: need("headerToggle2"),
  refreshBtn: need("refreshBtn"),

  bars: need("barsInner"),

  recordBtn: need("recordBtn"),
  recordName: need("recordName"),
  recordingsList: need("recordingsList"),
  recHint: need("recHint"),

  rhymeDock: need("rhymeDock"),
  rhymeBase: need("rhymeBase"),
  rhymeList: need("rhymeList"),
  dockToggle: need("dockToggle"),
};

const STORAGE_SCOPE = (() => {
  const firstFolder = (location.pathname.split("/").filter(Boolean)[0] || "root");
  return firstFolder.replace(/[^a-z0-9_-]+/gi, "_");
})();
const KEY_PREFIX = `beatsheetpro__${STORAGE_SCOPE}__`;

const STORAGE_KEY = `${KEY_PREFIX}projects_v1`;
const RHYME_CACHE_KEY = `${KEY_PREFIX}rhyme_cache_v1`;
const DOCK_HIDDEN_KEY = `${KEY_PREFIX}rhymeDock_hidden_v1`;
const HEADER_COLLAPSED_KEY = `${KEY_PREFIX}header_collapsed_v1`;
const AUTOSCROLL_KEY = `${KEY_PREFIX}autoscroll_v1`;

const OLD_STORAGE_KEY = "beatsheetpro_projects_v1";
const OLD_RHYME_CACHE_KEY = "beatsheetpro_rhyme_cache_v1";
const OLD_DOCK_HIDDEN_KEY = "beatsheetpro_rhymeDock_hidden_v1";
const OLD_HEADER_COLLAPSED_KEY = "beatsheetpro_header_collapsed_v1";

(function migrateOldKeysOnce(){
  try{
    if(!localStorage.getItem(STORAGE_KEY) && localStorage.getItem(OLD_STORAGE_KEY)){
      localStorage.setItem(STORAGE_KEY, localStorage.getItem(OLD_STORAGE_KEY));
    }
    if(!localStorage.getItem(RHYME_CACHE_KEY) && localStorage.getItem(OLD_RHYME_CACHE_KEY)){
      localStorage.setItem(RHYME_CACHE_KEY, localStorage.getItem(OLD_RHYME_CACHE_KEY));
    }
    if(!localStorage.getItem(DOCK_HIDDEN_KEY) && localStorage.getItem(OLD_DOCK_HIDDEN_KEY)){
      localStorage.setItem(DOCK_HIDDEN_KEY, localStorage.getItem(OLD_DOCK_HIDDEN_KEY));
    }
    if(!localStorage.getItem(HEADER_COLLAPSED_KEY) && localStorage.getItem(OLD_HEADER_COLLAPSED_KEY)){
      localStorage.setItem(HEADER_COLLAPSED_KEY, localStorage.getItem(OLD_HEADER_COLLAPSED_KEY));
    }
  }catch{}
})();

/***********************
✅ SECTIONS (dynamic pages)
***********************/
const BASE_SECTION_DEFS = [
  { key:"intro",   title:"Intro"    },
  { key:"verse1",  title:"Verse 1"  },
  { key:"chorus1", title:"Chorus 1" },
  { key:"verse2",  title:"Verse 2"  },
  { key:"chorus2", title:"Chorus 2" },
  { key:"verse3",  title:"Verse 3"  },
  { key:"bridge",  title:"Bridge"   },
  { key:"chorus3", title:"Chorus 3" },
];

// base order never changes
const BASE_ORDER = BASE_SECTION_DEFS.map(s=>s.key);

// helpers
function isExtraKey(k){ return /^extra\d+$/.test(String(k||"")); }
function extraIndex(k){
  const m = String(k||"").match(/^extra(\d+)$/);
  return m ? parseInt(m[1],10) : 0;
}
function makeExtraKey(n){ return `extra${n}`; }

// FULL headings set (used by rhyme logic to skip headings)
function getHeadingTextForKey(p, key){
  if(key === "full") return "Full Song View";

  const sec = p?.sections?.[key];
  const custom = (sec?.title || "").trim();
  if(custom) return custom;

  const base = BASE_SECTION_DEFS.find(s=>s.key===key);
  if(base) return base.title;

  // extras fallback label (will still show placeholder in inputs)
  const n = extraIndex(key) || 1;
  return `Extra ${n}`;
}



function relocateMiniCard(){ /* keep miniCard inside header; no relocation */ }

function getFullOrder(p){
  // FULL always shows base headings + any extras that have been created/known
  const extras = (p?.extraKeys || []).filter(isExtraKey);
  return [...BASE_ORDER, ...extras];
}

function buildHeadingSet(p){
  const set = new Set();
  for(const k of getFullOrder(p)){
    set.add(getHeadingTextForKey(p, k));
  }
  return set;
}

// ---------- utils ----------
const nowISO = () => new Date().toISOString();
const uid = () => Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);

function showToast(msg){
  if(!els.toast) return;
  els.toast.textContent = msg || "Saved";
  els.toast.classList.add("show");
  setTimeout(()=>els.toast.classList.remove("show"), 1200);
}
function escapeHtml(s){
  return String(s || "").replace(/[&<>"]/g, (c)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"
  }[c]));
}
function clampInt(v,min,max){
  if(Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/***********************
✅ textarea auto-grow (mobile scroll fix)
- Used for FULL page editor so the OUTER panel does the scrolling.
***********************/
function autoGrowTextarea(el){
  if(!el) return;
  // Preserve user manual resize if they dragged it larger
  const prev = el.style.height;
  el.style.height = "auto";
  const next = (el.scrollHeight + 2) + "px";
  el.style.height = next;
  // If user manually resized bigger, keep that
  if(prev && prev.endsWith("px")){
    const p = parseFloat(prev);
    const n = parseFloat(next);
    if(p > n) el.style.height = prev;
  }
}

function isCollapsed(){
  return document.body.classList.contains("headerCollapsed");
}
function getActiveProject(){ return store.projects.find(p=>p.id===store.activeProjectId) || store.projects[0]; }
function getProjectBpm(){
  const p = getActiveProject();
  return clampInt(parseInt(els.bpm?.value || p.bpm || 95, 10), 40, 240);
}

/***********************
✅ AutoScroll (persisted)
***********************/
let autoScrollOn = false;


let autoScrollStartIdx = 0;
function loadAutoScroll(){
  try{ return localStorage.getItem(AUTOSCROLL_KEY) === "1"; }catch{ return false; }
}
function saveAutoScroll(v){
  try{ localStorage.setItem(AUTOSCROLL_KEY, v ? "1" : "0"); }catch{}
}
function updateAutoScrollBtn(){
  if(!els.autoScrollBtn) return;
  els.autoScrollBtn.classList.toggle("on", !!autoScrollOn);
  els.autoScrollBtn.textContent = "Scroll";
  els.autoScrollBtn.title = autoScrollOn ? "Auto Scroll: ON" : "Auto Scroll: OFF";
}
function setAutoScroll(v){
  const turningOn = !!v && !autoScrollOn;
  autoScrollOn = !!v;

  // Always stop the silent clock first; we only re-start it when needed.
  stopPracticeScroll();

  lastAutoScrollToken = null;
  clearAllPracticeAndActive();
  saveAutoScroll(autoScrollOn);
  updateAutoScrollBtn();
  showToast(autoScrollOn ? "Auto Scroll ON" : "Auto Scroll OFF");

  const p = (typeof getActiveProject === "function") ? getActiveProject() : null;
  if(p){
    p.playback = p.playback || {};
  }

  if(!autoScrollOn){
    // Just disable visuals; do NOT restart any silent clock.
    if(playback){
      playback.beatOffsetBeats = 0;
    }
    if(p){
      p.playback.anchorPageKey = null;
      p.playback.seqStartOffset = 0;
    }
    autoScrollMetroOffset16 = 0;

    // Persist toggle state without assuming saveProject exists in global scope
    if(p){
      try{ touchProject(p); }catch(e){}
    }
    return;
  }

  if(turningOn){
    // Anchor to the page + card currently IN VIEW (do not jump back to page 1).
    // We derive the real visible page from the pager's current index and then
    // start at the first visible bar card on that page.
    if(p){
      const visibleKey = getVisibleRealPageKeyFromPager(p) || p.activeSection || null;
      p.playback.anchorPageKey = visibleKey;
      // keep activeSection in sync so the highlight engine doesn't snap back
      if(visibleKey && p.activeSection !== visibleKey){
        p.activeSection = visibleKey;
      }
      const firstVisibleBarIdx = getFirstVisibleBarIdxInActivePage();
      p.playback.seqStartOffset = computeSeqStartOffsetFromAnchor(p, visibleKey, firstVisibleBarIdx);
    }

    // If user enables auto-scroll while audio is already playing,
    // start counting beats from ZERO at that moment (do NOT jump ahead).
    if(playback && playback.isPlaying){
      const t = (playerEl && typeof playerEl.currentTime === "number") ? playerEl.currentTime : 0;
      const bpmNow = getProjectBpm?.() || +((p && p.bpm) || (els.bpm && els.bpm.value) || 120);
      playback.beatOffsetBeats = (t * bpmNow) / 60;
    }else{
      if(playback) playback.beatOffsetBeats = 0;
    }

    // If drums are already running, re-zero the visual beat counter too.
    if(typeof metroBeat16 === "number" && metroOn){
      autoScrollMetroOffset16 = metroBeat16;
    }else{
      autoScrollMetroOffset16 = 0;
    }

    // If no audio + no drums, run a silent clock so Scroll still works.
    if(!metroOn && !(playback && playback.isPlaying)){
      startPracticeScroll();
    }
  }

  if(p){
    try{ touchProject(p); }catch(e){}
  }
}
els.autoScrollBtn?.addEventListener("click", ()=> setAutoScroll(!autoScrollOn));

/***********************
✅ IndexedDB AUDIO
***********************/
const AUDIO_DB_NAME = `${KEY_PREFIX}audio_db_v1`;
const AUDIO_STORE = "audio";
// ✅ cache for decoded audio buffers (prevents re-decode lag)
const decodedCache = new Map();

function openAudioDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(AUDIO_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(AUDIO_STORE)){
        db.createObjectStore(AUDIO_STORE, { keyPath:"id" });
      }
    };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}

async function idbPutAudio({ id, blob, name, mime, createdAt }){
  const db = await openAudioDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(AUDIO_STORE, "readwrite");
    tx.objectStore(AUDIO_STORE).put({
      id,
      blob,
      name: name || "",
      mime: mime || (blob?.type || ""),
      createdAt: createdAt || nowISO()
    });
    tx.oncomplete = ()=>resolve(true);
    tx.onerror = ()=>reject(tx.error);
    tx.onabort = ()=>reject(tx.error);
  });
}

async function idbGetAudio(id){
  const db = await openAudioDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(AUDIO_STORE, "readonly");
    const req = tx.objectStore(AUDIO_STORE).get(id);
    req.onsuccess = ()=>resolve(req.result || null);
    req.onerror = ()=>reject(req.error);
  });
}

async function idbDeleteAudio(id){
  const db = await openAudioDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(AUDIO_STORE, "readwrite");
    tx.objectStore(AUDIO_STORE).delete(id);
    tx.oncomplete = ()=>resolve(true);
    tx.onerror = ()=>reject(tx.error);
    tx.onabort = ()=>reject(tx.error);
  });
}

async function dataUrlToBlob(dataUrl){
  const res = await fetch(dataUrl);
  return await res.blob();
}

// migrate old stored dataUrl -> idb
async function ensureRecInIdb(rec){
  if(rec && rec.dataUrl && !rec.blobId){
    try{
      const blob = await dataUrlToBlob(rec.dataUrl);
      const id = rec.id || uid();
      await idbPutAudio({ id, blob, name: rec.name, mime: rec.mime || blob.type, createdAt: rec.createdAt });
      rec.blobId = id;
      rec.mime = rec.mime || blob.type || "audio/*";
      delete rec.dataUrl;
      return true;
    }catch(e){
      console.error(e);
      return false;
    }
  }
  return false;
}

async function getRecBlob(rec){
  if(!rec) return null;
  if(rec.dataUrl){
    try{ return await dataUrlToBlob(rec.dataUrl); }catch{ return null; }
  }
  const id = rec.blobId || rec.id;
  if(!id) return null;

  try{
    const row = await idbGetAudio(id);
    return row?.blob || null;
  }catch(e){
    console.error(e);
    return null;
  }
}

/***********************
✅ safer save
***********************/
function saveStoreSafe(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  }catch(e){
    console.error(e);
    showToast("Storage full (audio not saved)");
    return false;
  }
}

/***********************
✅ headshot eye blink
***********************/
let eyePulseTimer = null;
let metroOn = false;
let recording = false;

function headerIsVisibleForEyes(){ return !document.body.classList.contains("headerCollapsed"); }
function getEyeEls(){
  const eyeL = document.getElementById("eyeL");
  const eyeR = document.getElementById("eyeR");
  if(!eyeL || !eyeR) return null;
  return { eyeL, eyeR };
}
function flashEyes(){
  if(!headerIsVisibleForEyes()) return;
  const eyes = getEyeEls();
  if(!eyes) return;
  eyes.eyeL.classList.add("on");
  eyes.eyeR.classList.add("on");
  setTimeout(()=>{
    eyes.eyeL.classList.remove("on");
    eyes.eyeR.classList.remove("on");
  }, 90);
}
function stopEyePulse(){
  if(eyePulseTimer) clearInterval(eyePulseTimer);
  eyePulseTimer = null;
}
function startEyePulseFromBpm(){
  stopEyePulse();
  if(!headerIsVisibleForEyes()) return;
  if(!(metroOn || recording || playback.isPlaying)) return;

  const bpm = getProjectBpm();
  const intervalMs = 60000 / bpm;
  eyePulseTimer = setInterval(()=>flashEyes(), intervalMs);
}
window.updateBlinkTargets = window.updateBlinkTargets || function(){};

/***********************
✅ header collapse
***********************/
function loadHeaderCollapsed(){
  try{ return localStorage.getItem(HEADER_COLLAPSED_KEY) === "1"; }catch{ return false; }
}
function saveHeaderCollapsed(isCollapsed2){
  try{ localStorage.setItem(HEADER_COLLAPSED_KEY, isCollapsed2 ? "1" : "0"); }catch{}
}
function setHeaderCollapsed(isCol){
  document.body.classList.toggle("headerCollapsed", !!isCol);
  relocateMiniCard();
  syncHeaderHeightVar();
  if(els.headerToggle)  els.headerToggle.textContent  = isCol ? "Show" : "Hide";
  if(els.headerToggle2) els.headerToggle2.textContent = isCol ? "Show" : "Hide";
  saveHeaderCollapsed(!!isCol);

  updateDockForKeyboard();
  if(isCol) stopEyePulse();
  else startEyePulseFromBpm();

  // Re-render first so the header/layout is in its final state before we measure heights
  renderAll();
  syncHeaderHeightVar();
}
els.headerToggle?.addEventListener("click", ()=>setHeaderCollapsed(!isCollapsed()));
els.headerToggle2?.addEventListener("click", ()=>setHeaderCollapsed(!isCollapsed()));
els.refreshBtn?.addEventListener("click", ()=>{
  showToast("Refreshing…");
  setTimeout(()=>location.reload(), 150);
});

/***********************
✅ Keep rhyme dock visible above keyboard (Android)
***********************/
function updateDockForKeyboard(){
  const vv = window.visualViewport;
  if(!els.rhymeDock) return;
  if(!vv){ els.rhymeDock.style.bottom = "10px"; return; }
  const keyboardPx = Math.max(0, (window.innerHeight - vv.height - vv.offsetTop));
  els.rhymeDock.style.bottom = (10 + keyboardPx) + "px";
}
window.visualViewport?.addEventListener("resize", updateDockForKeyboard);
window.visualViewport?.addEventListener("scroll", updateDockForKeyboard);
window.addEventListener("resize", updateDockForKeyboard);

/***********************
✅ rhyme dock hide/show
***********************/
function loadDockHidden(){
  try{ return localStorage.getItem(DOCK_HIDDEN_KEY) === "1"; }catch{ return false; }
}
function saveDockHidden(isHidden){
  try{ localStorage.setItem(DOCK_HIDDEN_KEY, isHidden ? "1" : "0"); }catch{}
}
function setDockHidden(isHidden){
  if(!els.rhymeDock || !els.dockToggle) return;
  els.rhymeDock.classList.toggle("dockHidden", !!isHidden);
  els.dockToggle.textContent = isHidden ? "R" : "Hide";
  saveDockHidden(!!isHidden);
  updateDockForKeyboard();
}
els.dockToggle?.addEventListener("click", ()=>{
  const nowHidden = els.rhymeDock?.classList?.contains("dockHidden");
  setDockHidden(!nowHidden);
});

/***********************
✅ syllables (improved) + beat splitting (NO word splitting)
***********************/
function normalizeWord(w){
  return (w||"")
    .toLowerCase()
    .replace(/[’]/g,"'"); // normalize curly apostrophes
}

const SYLL_DICT = {
  "im":1,"i'm":1,"ive":1,"i've":1,"ill":1,"i'll":1,"id":1,"i'd":1,
  "dont":1,"don't":1,"cant":1,"can't":1,"wont":1,"won't":1,"aint":1,"ain't":1,
  "yeah":1,"ya":1,"yup":1,"nah":1,"yall":1,"y'all":1,"bruh":1,"bro":1,
  "wanna":2,"gonna":2,"tryna":2,"lemme":2,"gotta":2,"kinda":2,"outta":2,
  "toyota":3,"hiphop":2,"gfunk":2,"gangsta":2,"birthday":2
};

function countSyllablesWord(word){
  if(!word) return 0;

  // allow forced override: word(3)
  const forced = String(word).match(/\((\d+)\)\s*$/);
  if(forced) return Math.max(1, parseInt(forced[1],10));

  let raw = normalizeWord(word).trim();
  if(!raw) return 0;

  // keep hyphens as multi-part words (mother-in-law = sum(parts))
  // keep apostrophes for dictionary match first
  const dictKey = raw.replace(/[^a-z0-9'\-]/g,"");
  if(SYLL_DICT[dictKey] != null) return SYLL_DICT[dictKey];

  // numbers = 1 syllable placeholder (keeps it from going 0)
  if(/^\d+$/.test(dictKey)) return 1;

  // Split hyphenated words into parts and sum (no word splitting across beats)
  const hyParts = dictKey.split(/-+/).filter(Boolean);
  if(hyParts.length > 1){
    const sum = hyParts.reduce((acc,p)=>acc + countSyllablesWord(p), 0);
    return Math.max(1, sum);
  }

  // Now strip to letters only (remove apostrophes)
  let w = dictKey.replace(/'/g,"").replace(/[^a-z]/g,"");
  if(!w) return 0;
  if(w.length <= 3) return 1;

  // common silent endings
  // -e silent (but not -le like "table")
  if(/[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w)) w = w.slice(0,-1);

  // base vowel group count
  const groups = w.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 0;

  // add 1 for consonant + le (ta-ble, lit-tle)
  if(/[^aeiouy]le$/.test(w)) count += 1;

  // reduce for certain suffixes where a vowel group often collapses
  if(/(tion|sion|cion)$/.test(w)) count -= 1;
  if(/(ious|eous)$/.test(w)) count -= 1;

  // -ed often silent (walked, rocked) but NOT (wanted, ended)
  if(/[^aeiouy][^aeiouy]ed$/.test(w) && !/(ted|ded)$/.test(w)) count -= 1;

  // -es often silent (cakes, makes) but NOT (wishes, boxes, churches)
  if(/[^aeiouy]es$/.test(w) && !/(ses|xes|zes|ches|shes)$/.test(w)) count -= 1;

  return Math.max(1, count || 1);
}

function countSyllablesLine(line){
  const clean = (line||"").replace(/[\/]/g," ").trim();
  if(!clean) return 0;

  return clean
    .split(/\s+/)
    .filter(Boolean)
    .reduce((sum,w)=>sum + countSyllablesWord(w), 0);
}

function syllGlowClass(n){
  if(!n) return "";
  if(n <= 6) return "red";
  if(n <= 9) return "yellow";
  if(n <= 13) return "green";
  if(n <= 16) return "yellow";
  return "red";
}

/***********************
✅ beat splitting
***********************/
function splitBySlashes(text){
  const parts = (text||"").split("/").map(s=>s.trim());
  return [parts[0]||"", parts[1]||"", parts[2]||"", parts[3]||""];
}

function buildTargets(total){
  const base = Math.floor(total/4);
  const rem = total % 4;
  const t = [base,base,base,base];
  for(let i=0;i<rem;i++) t[i] += 1;
  if(total < 4){
    t.fill(0);
    for(let i=0;i<total;i++) t[i] = 1;
  }
  return t;
}

/**
 * Auto split into 4 beats WITHOUT splitting words.
 * Strategy:
 * - compute syllables per word
 * - use targets, but only move a word to next beat if current beat already has something
 *   and adding the word would overshoot current beat target.
 * - single long word is allowed to overshoot if it must (beat is empty).
 */
function autoSplitSyllablesClean(text){
  const clean = (text||"").replace(/[\/]/g," ").trim();
  if(!clean) return ["","","",""];

  const words = clean.split(/\s+/).filter(Boolean);
  const sylls = words.map(w=>countSyllablesWord(w));
  const total = sylls.reduce((a,b)=>a+b,0);
  if(!total) return ["","","",""];

  const targets = buildTargets(total);
  const beats = [[],[],[],[]];
  const beatSyll = [0,0,0,0];
  let b = 0;

  for(let i=0;i<words.length;i++){
    const w = words[i];
    const s = sylls[i];

    // advance past beats that are already "done"
    while(b < 3 && beatSyll[b] >= targets[b]) b++;

    const wouldOvershoot = (beatSyll[b] + s) > targets[b];

    // ✅ if it would overshoot AND we already have something in this beat AND we still have next beats,
    // move the whole word to the next beat (NO splitting).
    if(wouldOvershoot && beats[b].length > 0 && b < 3){
      b++;
    }

    beats[b].push(w);
    beatSyll[b] += s;
  }

  return beats.map(arr=>arr.join(" ").trim());
}

function computeBeats(text){
  if((text||"").includes("/")) return splitBySlashes(text);
  return autoSplitSyllablesClean(text);
}

/***********************
✅ rhymes
***********************/
const rhymeCache = (() => {
  try{ return JSON.parse(localStorage.getItem(RHYME_CACHE_KEY) || "{}"); }
  catch{ return {}; }
})();
function saveRhymeCache(){
  try{ localStorage.setItem(RHYME_CACHE_KEY, JSON.stringify(rhymeCache)); }catch{}
}
let rhymeAbort = null;

function lastWord(str){
  const s = (str||"").toLowerCase().replace(/[^a-z0-9'\s-]/g," ").trim();
  if(!s) return "";
  const parts = s.split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length-1].replace(/^-+|-+$/g,"") : "";
}

function escAttr(s){ return escapeHtml(s); }

function caretBeatIndex(text, caretPos){
  const before = (text||"").slice(0, Math.max(0, caretPos||0));
  const count = (before.match(/\//g) || []).length;
  return Math.max(0, Math.min(3, count));
}

async function updateRhymes(seed){
  const w = (seed||"").toLowerCase().replace(/[^a-z0-9']/g,"").trim();
  if(!w){
    if(els.rhymeBase) els.rhymeBase.textContent = "Tap into a beat…";
    if(els.rhymeList) els.rhymeList.innerHTML = `<span class="small">Rhymes appear for last word in previous beat box.</span>`;
    return;
  }
  if(els.rhymeBase) els.rhymeBase.textContent = w;

  if(Array.isArray(rhymeCache[w]) && rhymeCache[w].length){
    renderRhymes(rhymeCache[w]);
    return;
  }
  if(els.rhymeList) els.rhymeList.innerHTML = `<span class="small">Loading…</span>`;

  try{
    if(rhymeAbort) rhymeAbort.abort();
    rhymeAbort = new AbortController();

    const url = `https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(w)}&max=18`;
    const res = await fetch(url, { signal: rhymeAbort.signal });
    const data = await res.json();
    const words = (data||[]).map(x=>x.word).filter(Boolean);

    rhymeCache[w] = words;
    saveRhymeCache();
    renderRhymes(words);
  }catch(e){
    if(String(e).includes("AbortError")) return;
    if(els.rhymeList) els.rhymeList.innerHTML = `<span class="small" style="color:#b91c1c;">Rhyme lookup failed.</span>`;
  }
}
function renderRhymes(words){
  if(!els.rhymeList) return;
  if(!words || !words.length){
    els.rhymeList.innerHTML = `<span class="small">No rhymes found.</span>`;
    return;
  }
  els.rhymeList.innerHTML = words.slice(0,18)
    .map(w=>`<button type="button" class="rhymeChip" data-rhyme="${escapeHtml(w)}">${escapeHtml(w)}</button>`)
    .join("");
}

document.addEventListener("click", (e)=>{
  const chip = e.target.closest(".rhymeChip");
  if(!chip) return;

  const word = (chip.getAttribute("data-rhyme") || chip.textContent || "").trim();
  if(!word) return;

  let ta = null;
  if(document.activeElement && document.activeElement.tagName === "TEXTAREA") ta = document.activeElement;
  else ta = lastTextarea;

  if(ta && ta.tagName === "TEXTAREA"){
    ta.focus();

    const start = ta.selectionStart ?? ta.value.length;
    const end   = ta.selectionEnd ?? ta.value.length;

    const before = ta.value.slice(0,start);
    const after  = ta.value.slice(end);

    const match = before.match(/(^|[\s\/])([^\s\/]*)$/);
    const prefix = match ? before.slice(0, before.length - (match[2]||"").length) : before;

    const afterMatch = after.match(/^([^\s\/]*)(.*)$/);
    const afterRest = afterMatch ? afterMatch[2] : after;

    const space = prefix && !/[\s\/]$/.test(prefix) ? " " : "";
    const insert = space + word;

    ta.value = prefix + insert + afterRest;
    ta.dispatchEvent(new Event("input",{bubbles:true}));

    const pos = (prefix + insert).length;
    ta.setSelectionRange(pos,pos);

    showToast("Inserted");
    return;
  }

  navigator.clipboard?.writeText?.(word)
    .then(()=>showToast("Copied"))
    .catch(()=>showToast("Copy failed"));
});

/***********************
✅ projects
***********************/
function blankSections(){
  const sections = {};

  // base sections always exist in data
  for(const s of BASE_SECTION_DEFS){
    sections[s.key] = {
      key: s.key,
      title: "",       // user editable (no auto-fill)
      bars: [{ text:"" }],
      titleEditable: true
    };
  }

  // extras are created later
  return sections;
}
function newProject(name=""){
  return {
    id: uid(),
    name: name || "",
    createdAt: nowISO(),
    updatedAt: nowISO(),
    activeSection: "full",
    bpm: 95,
    highlightMode: "all",
    recordings: [],
    sections: blankSections(),

        pageKeysActive: [],      // only FULL exists initially
    pageDeleted: {},         // keys explicitly deleted (skip on +)
    extraKeys: [],           // ordered list of extras created
  };
}
function loadStore(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    const p = newProject("");
    const s = { activeProjectId: p.id, projects:[p] };
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }catch{}
    return s;
  }
  try{ return JSON.parse(raw); }
  catch{
    localStorage.removeItem(STORAGE_KEY);
    return loadStore();
  }
}
let store = loadStore();

function repairProject(p){
  if(!p.sections || typeof p.sections !== "object") p.sections = blankSections();

  // ✅ ensure page state
  if(!Array.isArray(p.pageKeysActive)) p.pageKeysActive = [];
  if(!p.pageDeleted || typeof p.pageDeleted !== "object") p.pageDeleted = {};
  if(!Array.isArray(p.extraKeys)) p.extraKeys = [];

  // ✅ ensure base sections exist
  for(const def of BASE_SECTION_DEFS){
    if(!p.sections[def.key] || typeof p.sections[def.key] !== "object"){
      // ✅ base sections exist but titles stay user-editable (no auto-fill)
      p.sections[def.key] = { key:def.key, title:"", bars:[{text:""}], titleEditable:true };
    }
    if(!Array.isArray(p.sections[def.key].bars)) p.sections[def.key].bars = [{ text:"" }];
    if(p.sections[def.key].bars.length === 0) p.sections[def.key].bars = [{ text:"" }];
    p.sections[def.key].bars = p.sections[def.key].bars.map(b => ({ text: (b?.text ?? "") }));

    // Do NOT auto-fill base titles (keep pills blank unless user types).
    if(p.sections[def.key].title == null) p.sections[def.key].title = "";
    if(typeof p.sections[def.key].titleEditable !== "boolean") p.sections[def.key].titleEditable = true;
  }

  // ✅ ensure extras listed exist as sections
  p.extraKeys = p.extraKeys.filter(isExtraKey);
  for(const k of p.extraKeys){
    if(!p.sections[k] || typeof p.sections[k] !== "object"){
      const n = extraIndex(k) || (p.extraKeys.indexOf(k)+1);
      p.sections[k] = { key:k, title:"", bars:[{text:""}], titleEditable:true, extraNum:n };
    }
    if(!Array.isArray(p.sections[k].bars)) p.sections[k].bars = [{ text:"" }];
    if(p.sections[k].bars.length === 0) p.sections[k].bars = [{ text:"" }];
    p.sections[k].bars = p.sections[k].bars.map(b => ({ text: (b?.text ?? "") }));
    p.sections[k].titleEditable = true;
  }

  if(!p.activeSection) p.activeSection = "full";
  if(!Array.isArray(p.recordings)) p.recordings = [];
  if(!p.bpm) p.bpm = 95;
  p.highlightMode = "all";

  p.recordings.forEach(r=>{
    if(r && r.kind === "backing") r.kind = "track";
    if(!r.kind) r.kind = "take";
    if(!r.blobId && r.id) r.blobId = r.blobId || r.id;
  });

  // ✅ if active section no longer exists as a page, snap to FULL
  const activePages = new Set(["full", ...(p.pageKeysActive||[])]);
  if(!activePages.has(p.activeSection)) p.activeSection = "full";

  return p;
}

store.projects = (store.projects || []).map(repairProject);
if(!store.projects.length){
  const p = newProject("");
  store.projects = [p];
  store.activeProjectId = p.id;
}
if(!store.activeProjectId || !store.projects.find(p=>p.id===store.activeProjectId)){
  store.activeProjectId = store.projects[0].id;
}

function touchProject(p){
  p.updatedAt = nowISO();
  saveStoreSafe();
}

// ✅ alias used by some UI actions (keeps older call sites safe)
function saveProject(p){
  try{ touchProject(p); }catch(e){}
}

// ✅ Ensure legacy/global call sites never throw a ReferenceError
// (some shared builds still call saveProject from inline handlers).
try{ window.saveProject = saveProject; }catch(_e){}


/***********************
✅ migrate old audio (dataUrl -> idb)
***********************/
async function migrateAllAudioOnce(){
  let changed = false;
  for(const p of store.projects){
    for(const rec of (p.recordings || [])){
      const did = await ensureRecInIdb(rec);
      if(did) changed = true;
    }
  }
  if(changed) saveStoreSafe();
}

/***********************
✅ project picker
***********************/
function renderProjectPicker(){
  if(!els.projectPicker) return;

  const projects = [...store.projects].sort((a,b)=>{
    const an = (a.name||"").trim() || "(unnamed)";
    const bn = (b.name||"").trim() || "(unnamed)";
    return an.localeCompare(bn, undefined, { sensitivity:"base" });
  });

  const active = getActiveProject();
  els.projectPicker.innerHTML = projects.map(p=>{
    const label = (p.name||"").trim() || "(unnamed)";
    const sel = (p.id === active.id) ? "selected" : "";
    return `<option value="${escapeHtml(p.id)}" ${sel}>${escapeHtml(label)}</option>`;
  }).join("");
}

/***********************
✅ AUDIO ENGINE
***********************/
let audioCtx = null;
let metroGain = null;
let playbackGain = null;

let masterMix = null;
let masterLimiter = null;

let recordDest = null;
let recordMix = null;      // ✅ sums mic + drums + playback for recording
let recordLimiter = null;  // ✅ prevents recording breakup

let metroTimer = null;
let metroBeat16 = 0;
let autoScrollMetroOffset16 = 0;

// ✅ practice-mode autoscroll (no audio, no drums)
// When Scroll is enabled with no playback + no metronome, we still advance beats visually at BPM.
let practiceScrollOn = false;
let practiceScrollTimer = null;
let practiceBeat16 = 0;
let practiceStartBarIdx = 0;

function stopPracticeScroll(){
  practiceScrollOn = false;
  if(practiceScrollTimer){
    clearInterval(practiceScrollTimer);
    practiceScrollTimer = null;
  }
  practiceBeat16 = 0;
}

function getFirstVisibleBarIdxInActivePage(){
  // ✅ Choose the bar/card with the MOST visible area in the current viewport.
  // This prevents "jumping back one" when the previous card is barely still visible.
  try{
    const p = (typeof getActiveProject === "function") ? getActiveProject() : null;
    const key = getVisibleRealPageKeyFromPager(p) || (p && p.activeSection) || "full";
    const pageEl = (typeof getActiveRealPageEl === "function") ? getActiveRealPageEl(key) : null;
    if(!pageEl) return 0;

    const scroller = (typeof findVerticalScroller === "function")
      ? (findVerticalScroller(pageEl) || document.scrollingElement)
      : document.scrollingElement;

    const bars = Array.from(pageEl.querySelectorAll('.bar[data-bar-idx], .barCard[data-bar-idx]'));
    if(!bars.length) return 0;

    const isInner = (scroller && scroller !== document.body && scroller !== document.documentElement && scroller !== document.scrollingElement);
    const vr = isInner ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    const viewTop = vr.top;
    const viewBottom = vr.bottom;

    let bestIdx = 0;
    let bestVisible = -1;
    let bestTopDist = Infinity;

    for(const el of bars){
      const r = el.getBoundingClientRect();

      // intersection height with viewport
      const visible = Math.max(0, Math.min(r.bottom, viewBottom) - Math.max(r.top, viewTop));
      if(visible <= 0) continue;

      const topDist = Math.abs(r.top - viewTop);

      // prefer most visible; tie-breaker: closer to top
      if(visible > bestVisible + 0.5 || (Math.abs(visible - bestVisible) <= 0.5 && topDist < bestTopDist)){
        const v = parseInt(el.getAttribute("data-bar-idx") || el.dataset.barIdx || "0", 10);
        bestIdx = Number.isFinite(v) ? v : 0;
        bestVisible = visible;
        bestTopDist = topDist;
      }
    }
    return bestVisible >= 0 ? bestIdx : 0;
  }catch(_e){
    return 0;
  }
}

function startPracticeScroll(p){
  stopPracticeScroll();
  practiceScrollOn = true;
  practiceBeat16 = 0;

  const activeProject = (typeof getActiveProject === "function") ? getActiveProject() : p;
  if(activeProject){
    activeProject.playback = activeProject.playback || {};
    const visibleKey = getVisibleRealPageKeyFromPager(activeProject) || activeProject.activeSection || null;
    if(visibleKey){
      activeProject.playback.anchorPageKey = visibleKey;
      if(activeProject.activeSection !== visibleKey) activeProject.activeSection = visibleKey;
    }
    const firstVisibleBarIdx = getFirstVisibleBarIdxInActivePage();
    activeProject.playback.seqStartOffset = computeSeqStartOffsetFromAnchor(activeProject, activeProject.playback.anchorPageKey, firstVisibleBarIdx);
  }

  const bpmRaw = (activeProject && typeof activeProject.bpm !== "undefined") ? activeProject.bpm : (els?.bpmInput ? parseFloat(els.bpmInput.value) : 90);
  const bpm = (Number.isFinite(bpmRaw) && bpmRaw > 0) ? bpmRaw : 90;
  const msPer16 = (60000 / bpm) / 4;

  // tick at 16th notes and drive the same highlight/scroll routine used by drums/audio
  practiceScrollTimer = setInterval(() => {
    if(!practiceScrollOn) return;

    const proj = (typeof getActiveProject === "function") ? getActiveProject() : activeProject;
    if(!proj) return;

    const pageKey = proj.playback?.anchorPageKey || proj.activeSection || "full";

    const step16 = practiceBeat16 % 16;
    const beatInBar = Math.floor(step16 / 4);
    const barIdx = Math.floor(practiceBeat16 / 16); // start at 0 and use seqStartOffset

    syncHighlightAndScroll(pageKey, barIdx, beatInBar, (proj.playback && proj.playback.seqStartOffset) || 0);

    practiceBeat16++;
  }, msPer16);
}

 // when Scroll engaged during drums, start visual beat count from 0


let activeDrum = 1;

function ensureAudio(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // speakers
    metroGain = audioCtx.createGain();
    metroGain.gain.value = 1.4;

    playbackGain = audioCtx.createGain();
    playbackGain.gain.value = 0.9;

    // recording destination
    recordDest = audioCtx.createMediaStreamDestination();

    // ✅ RECORD MIX BUS (record-only)
    recordMix = audioCtx.createGain();
    recordMix.gain.value = 0.95; // small headroom before limiter

    // ✅ LIMITER (record-only) to stop breakup
    recordLimiter = audioCtx.createDynamicsCompressor();
    recordLimiter.threshold.value = -10; // start limiting near peaks
    recordLimiter.knee.value = 0;        // hard knee = limiter feel
    recordLimiter.ratio.value = 20;      // high ratio = limiting
    recordLimiter.attack.value = 0.003;  // fast catch
    recordLimiter.release.value = 0.12;  // smooth recovery

    // connect record chain
    recordMix.connect(recordLimiter);
    recordLimiter.connect(recordDest);

    // ✅ MASTER SPEAKER BUS (prevents playback breakup/clipping)
masterMix = audioCtx.createGain();
masterMix.gain.value = 0.95; // tiny headroom

masterLimiter = audioCtx.createDynamicsCompressor();
masterLimiter.threshold.value = -10;
masterLimiter.knee.value = 0;
masterLimiter.ratio.value = 20;
masterLimiter.attack.value = 0.003;
masterLimiter.release.value = 0.12;

// route speakers through limiter
masterMix.connect(masterLimiter);
masterLimiter.connect(audioCtx.destination);

// send metro + playback into master speaker bus
metroGain.connect(masterMix);
playbackGain.connect(masterMix);


    // ✅ drums go to recording mix (not straight to recordDest)
    drumRecGain = audioCtx.createGain();
    drumRecGain.gain.value = 0.50;   // keep your loudness target
    metroGain.connect(drumRecGain);
    drumRecGain.connect(recordMix);

    // ✅ playback can be included in recordings if you want
    playbackGain.connect(recordMix);
  }
}

/***********************
✅ TRAP DRUMS
***********************/
function playKick(){
  ensureAudio();
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(155, t);
  o.frequency.exponentialRampToValueAtTime(52, t + 0.07);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.75, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  o.connect(g); g.connect(metroGain);
  o.start(t); o.stop(t + 0.13);
}
function playSnare(){
  ensureAudio();
  const t = audioCtx.currentTime;

  const bufferSize = Math.floor(audioCtx.sampleRate * 0.14);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * (1 - i/bufferSize);

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const bp = audioCtx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 0.9;

  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.45, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

  noise.connect(bp);
  bp.connect(g);
  g.connect(metroGain);

  noise.start(t);
  noise.stop(t + 0.16);
}
function playHat(atTime = null, amp = 0.18){
  ensureAudio();
  const t = atTime ?? audioCtx.currentTime;

  const bufferSize = Math.floor(audioCtx.sampleRate * 0.02);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * (1 - i/bufferSize);

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const hp = audioCtx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;

  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.02, amp), t + 0.0015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

  noise.connect(hp);
  hp.connect(g);
  g.connect(metroGain);

  noise.start(t);
  noise.stop(t + 0.02);
}

/***********************
✅ ACTIVE BAR + HIGHLIGHT ENGINE
Fix: AutoScroll ON now advances to the NEXT SECTION that has TEXT in a card (skips empty cards/sections).
AutoScroll OFF unchanged (ticks all cards on current page).
***********************/
let lastActiveBarKey = null;
let lastActiveBarIdx = -1;
let lastAutoScrollToken = null;

function getActiveRealPageEl(pageKey){
  return document.querySelector(`.page[data-page-key="${CSS.escape(pageKey)}"]:not([data-clone="1"])`);
}

function clearOldActiveBar(){
  if(lastActiveBarKey == null) return;
  const oldPage = getActiveRealPageEl(lastActiveBarKey);
  if(oldPage){
    oldPage.querySelectorAll(".bar.barActive").forEach(el=>el.classList.remove("barActive"));
    oldPage.querySelectorAll(".beat.flash").forEach(el=>el.classList.remove("flash"));
  }
}

function setActiveBarDOM(pageKey, barIdx){
  clearOldActiveBar();

  const page = getActiveRealPageEl(pageKey);
  if(!page) return null;

  const bar = page.querySelector(`.bar[data-bar-idx="${barIdx}"]`);
  if(!bar) return null;

  bar.classList.add("barActive");
  lastActiveBarKey = pageKey;
  lastActiveBarIdx = barIdx;
  return bar;
}

function findVerticalScroller(startEl){
  let el = startEl;
  while(el && el !== document.body){
    const cs = getComputedStyle(el);
    const oy = cs.overflowY;
    const canScrollY = (oy === "auto" || oy === "scroll") && (el.scrollHeight > el.clientHeight + 2);
    if(canScrollY) return el;
    el = el.parentElement;
  }
  const page = startEl?.closest?.(".page");
  if(page && page.scrollHeight > page.clientHeight + 2) return page;
  return document.scrollingElement || document.documentElement;
}

function scrollBarIntoView(barEl){
  if(!barEl) return;

  const scroller = findVerticalScroller(barEl);
  if(!scroller) return;

  const cRect = scroller.getBoundingClientRect();
  const bRect = barEl.getBoundingClientRect();

  const padTop = 70;
  const padBot = 140;

  const topOk = bRect.top >= (cRect.top + padTop);
  const botOk = bRect.bottom <= (cRect.bottom - padBot);
  if(topOk && botOk) return;

  const curTop = scroller.scrollTop || 0;
  const targetTop = curTop + (bRect.top - cRect.top) - (cRect.height * 0.22);

  if(typeof scroller.scrollTo === "function"){
    scroller.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  }else{
    scroller.scrollTop = Math.max(0, targetTop);
  }
}

function flashBeatOnBar(barEl, beatInBar){
  if(!barEl) return;
  const beats = barEl.querySelectorAll(".beat");
  if(!beats || beats.length < 4) return;

  beats.forEach(b=>b.classList.remove("flash"));
  const t = beats[beatInBar];
  if(t) t.classList.add("flash");
  setTimeout(()=>beats.forEach(b=>b.classList.remove("flash")), 90);
}

function flashBeatOnAllBars(pageKey, beatInBar){
  const page = getActiveRealPageEl(pageKey);
  if(!page) return;

  page.querySelectorAll(".bar.barActive").forEach(b=>b.classList.remove("barActive"));

  const bars = page.querySelectorAll(".bar");
  bars.forEach(bar=>{
    const beats = bar.querySelectorAll(".beat");
    if(beats && beats.length >= 4){
      beats.forEach(b=>b.classList.remove("flash"));
      const t = beats[beatInBar];
      if(t) t.classList.add("flash");
    }
  });

  setTimeout(()=>{
    const page2 = getActiveRealPageEl(pageKey);
    if(!page2) return;
    page2.querySelectorAll(".beat.flash").forEach(b=>b.classList.remove("flash"));
  }, 90);
}

function clearAllPracticeAndActive(){
  document.querySelectorAll(".bar.barActive").forEach(b=>b.classList.remove("barActive"));
  document.querySelectorAll(".beat.flash").forEach(b=>b.classList.remove("flash"));
  lastActiveBarKey = null;
  lastActiveBarIdx = -1;
  lastAutoScrollToken = null;
}

/*************
✅ NEW: build "play sequence" of ONLY text cards across all sections
*************/
let playSeqCache = { projId:null, updatedAt:null, seq:[] };

function barHasText(bar){
  const t = (bar?.text ?? "");
  return String(t).trim().length > 0;
}

function getPlaySequence(p){
  const u = p?.updatedAt || "";
  if(playSeqCache.projId === p?.id && playSeqCache.updatedAt === u && Array.isArray(playSeqCache.seq)){
    return playSeqCache.seq;
  }

  const seq = [];
  for(const secKey of getFullOrder(p)){
    const bars = p?.sections?.[secKey]?.bars || [];
    for(let i=0;i<bars.length;i++){
      if(barHasText(bars[i])) seq.push({ secKey, barIdx:i });
    }
  }

  playSeqCache = { projId: p?.id || null, updatedAt: u, seq };
  return seq;
}

function computeAutoScrollStartIdx(p){
  try{
    const seq = getPlaySequence(p);
    if(!seq || !seq.length) return 0;
    const anchor = (p && p.activeSection) ? p.activeSection : null;
    if(!anchor) return 0;
    let i = seq.findIndex(x => x.secKey === anchor && x.barIdx === 0);
    if(i < 0) i = seq.findIndex(x => x.secKey === anchor);
    return i < 0 ? 0 : i;
  }catch(e){
    return 0;
  }
}

// ✅ Determine the real (non-clone) page key currently visible in the horizontal pager.
// This is more reliable than p.activeSection when the user has scrolled/dragged but state
// hasn't updated yet.
function getVisibleRealPageKeyFromPager(p){
  try{
    const pagerEl = document.getElementById("pagesPager") || (els?.bars?.querySelector?.(".pager"));
    if(!pagerEl) return (p && p.activeSection) ? p.activeSection : null;

    const idx = getCurrentIdx(pagerEl);
    const order = getActivePageOrder(p) || ["full"];
    const CAROUSEL_ORDER = [order[order.length - 1], ...order, order[0]];

    let key = CAROUSEL_ORDER[idx] || "full";
    if(idx === 0) key = order[order.length - 1];
    if(idx === CAROUSEL_ORDER.length - 1) key = order[0];
    return key || null;
  }catch(e){
    return (p && p.activeSection) ? p.activeSection : null;
  }
}

// ✅ Convert an (anchor page key + bar idx) to the global play-sequence offset.
function computeSeqStartOffsetFromAnchor(p, pageKey, barIdx){
  try{
    const seq = getPlaySequence(p);
    if(!seq || !seq.length) return 0;
    const k = pageKey || (p && p.activeSection) || null;
    const i = Number.isFinite(+barIdx) ? +barIdx : 0;
    const off = seq.findIndex(x => (x.secKey === k || x.sectionKey === k) && Number(x.barIdx) === Number(i));
    return off >= 0 ? off : 0;
  }catch(e){
    return 0;
  }
}

function computeSeqStartOffsetFromViewport(p){
  try{
    const seq = getPlaySequence(p);
    if(!seq || !seq.length) return 0;

    // Scroller that contains the cards
    const scroller =
      (els && (els.cardsScroller || els.barsScroller)) ||
      document.getElementById('cardsScroller') ||
      document.getElementById('barsScroller') ||
      document.scrollingElement;

    const pageKey = (p && p.playback && p.playback.anchorPageKey) ? p.playback.anchorPageKey : (p && p.activeSection ? p.activeSection : null);
    if(!scroller || !pageKey) return 0;

    const esc = (window.CSS && CSS.escape) ? CSS.escape : (s)=>String(s).replace(/[^a-zA-Z0-9_\-]/g,'\\$&');
    const pageEl =
      document.querySelector(`.page[data-page-key="${esc(pageKey)}"]`) ||
      document.querySelector(`.page[data-sec-key="${esc(pageKey)}"]`);
    if(!pageEl) return 0;

    const scRect = scroller.getBoundingClientRect();
    const bars = Array.from(pageEl.querySelectorAll('.barCard, .bar, [data-bar-idx]'));
    if(!bars.length) return 0;

    let first = null;
    for(const b of bars){
      const r = b.getBoundingClientRect();
      if(r.bottom > scRect.top + 8){
        first = b; break;
      }
    }
    const barIdx = first ? parseInt(first.getAttribute('data-bar-idx') || (first.dataset ? first.dataset.barIdx : '0') || '0', 10) : 0;

    const off = seq.findIndex(x => (x.secKey === pageKey || x.sectionKey === pageKey) && Number(x.barIdx) === Number(barIdx));
    return off >= 0 ? off : 0;
  }catch(e){
    return 0;
  }
}



function gotoSectionKey(p, secKey, behavior="auto"){
  if(!p || !secKey) return;
  const order = getActivePageOrder(p);
  if(!order.includes(secKey)) return;

  if(p.activeSection !== secKey){
    p.activeSection = secKey;
    touchProject(p);
  }

  const pager = document.getElementById("pagesPager");
  if(pager){
    const realIdx = Math.max(0, order.indexOf(secKey));
    snapToIdx(pager, realIdx + 1, behavior);
  }

  lastAutoScrollToken = null;
}

/*************
✅ highlight driver (now supports global text sequence)
*************/
function syncHighlightAndScroll(pageKey, globalBarIdx, beatInBar, seqOffset=0){
  const p = getActiveProject();
  if(!p) return;

  const safeBeat = Math.max(0, Math.min(3, beatInBar|0));

  // FULL page doesn't participate in autoscroll highlighting
  if(pageKey === "full" && autoScrollOn){
    // if user is on FULL while autoscrolling, jump to first text section if possible
    const seq = getPlaySequence(p);
    if(seq.length){
      gotoSectionKey(p, seq[0].secKey, "auto");
      pageKey = p.activeSection;
      globalBarIdx = 0;
    }else{
      return;
    }
  }else if(pageKey === "full"){
    return;
  }

  // ✅ FIX #3: AutoScroll OFF = tick-highlight ALL cards on the active page (unchanged)
  if(!autoScrollOn){
    if(lastActiveBarKey && lastActiveBarKey !== pageKey) clearOldActiveBar();
    lastActiveBarKey = pageKey;
    lastActiveBarIdx = -1;
    lastAutoScrollToken = null;

    flashBeatOnAllBars(pageKey, safeBeat);
    return;
  }

  // ✅ AutoScroll ON = use text-only sequence across sections
  const seq = getPlaySequence(p);

  // fallback: if no text cards exist, just behave like old per-section loop
  if(!seq.length){
    const sec = p.sections?.[pageKey];
    const count = sec?.bars?.length || 1;
    const safeBarIdx = count ? (globalBarIdx % count) : 0;

    const barEl = setActiveBarDOM(pageKey, safeBarIdx);
    if(barEl) flashBeatOnBar(barEl, safeBeat);

    if(barEl && safeBeat === 0){
      const token = `${pageKey}:${safeBarIdx}`;
      if(token !== lastAutoScrollToken){
        lastAutoScrollToken = token;
        requestAnimationFrame(()=>scrollBarIntoView(barEl));
      }
    }
    return;
  }

  const base = (Number.isFinite(+seqOffset) ? (+seqOffset) : 0);
  const idx = (((base + globalBarIdx) % seq.length) + seq.length) % seq.length;
  const target = seq[idx];
  if(!target) return;

  // ensure we are on the right page (auto-advance pages that have text)
  if(p.activeSection !== target.secKey){
    gotoSectionKey(p, target.secKey, "smooth");
    clearAllPracticeAndActive();
  }

  const barEl = setActiveBarDOM(target.secKey, target.barIdx);
  if(barEl) flashBeatOnBar(barEl, safeBeat);

  // scroll once per (section,bar) on beat 1
  if(barEl && safeBeat === 0){
    const token = `${target.secKey}:${target.barIdx}`;
    if(token !== lastAutoScrollToken){
      lastAutoScrollToken = token;
      requestAnimationFrame(()=>scrollBarIntoView(barEl));
    }
  }
}

/***********************
✅ drums UI
***********************/
function drumButtons(){
  return [els.drum1Btn, els.drum2Btn, els.drum3Btn, els.drum4Btn].filter(Boolean);
}
function updateDrumButtonsUI(){
  const btns = drumButtons();
  btns.forEach((b, i)=>{
    b.classList.remove("active","running");
    if(metroOn) b.classList.add("running");
    if(metroOn && activeDrum === (i+1)) b.classList.add("active");
  });
}

/***********************
✅ Metronome (drums)
***********************/
function startMetronome(){
  ensureAudio();
  if(audioCtx.state === "suspended") audioCtx.resume();
  stopMetronome();

  metroOn = true;
  stopPracticeScroll();
  metroBeat16 = 0;
  startEyePulseFromBpm();
  updateDrumButtonsUI();

  const tick = () => {
    const bpm = getProjectBpm();
    const intervalMs = 60000 / bpm / 4;

    const step16 = metroBeat16 % 16; // absolute 16th within bar (drums)
    let beatInBar = Math.floor(step16 / 4);
    let barIdx = Math.floor(Math.floor(metroBeat16 / 4) / 4);

    // If auto-scroll was engaged while drums are already running, we "re-zero" the visual
    // beat counter so Beat 1 starts when Scroll is pressed (no jumping ahead).
    if(autoScrollOn){
      const rel16 = metroBeat16 - (typeof autoScrollMetroOffset16 === 'number' ? autoScrollMetroOffset16 : 0);
      const step16Rel = ((rel16 % 16) + 16) % 16;
      beatInBar = Math.floor(step16Rel / 4);
      barIdx = Math.floor(Math.floor(rel16 / 4) / 4);
    }

    // play drums
    if(activeDrum === 1){
      playHat(null, (step16 % 4 === 2) ? 0.14 : 0.18);
      if(step16 === 0 || step16 === 7 || step16 === 10) playKick();
      if(step16 === 4 || step16 === 12) playSnare();
    }else if(activeDrum === 2){
      const t = audioCtx.currentTime;
      playHat(t, 0.17);
      if(step16 === 3 || step16 === 11){
        playHat(t + (intervalMs/1000)*0.5, 0.12);
      }
      if(step16 === 0 || step16 === 6 || step16 === 9 || step16 === 14) playKick();
      if(step16 === 4 || step16 === 12) playSnare();
    }else if(activeDrum === 3){
      const t = audioCtx.currentTime;
      playHat(t, (step16 % 2 === 0) ? 0.18 : 0.14);
      if(step16 === 14){
        playHat(t + (intervalMs/1000)*0.33, 0.12);
        playHat(t + (intervalMs/1000)*0.66, 0.12);
      }
      if(step16 === 0 || step16 === 5 || step16 === 8 || step16 === 13) playKick();
      if(step16 === 4 || step16 === 12) playSnare();
    }else{
      const t = audioCtx.currentTime;
      if(step16 % 2 === 0) playHat(t, 0.18);
      if(step16 === 7 || step16 === 15) playHat(t, 0.12);
      if(step16 === 0 || step16 === 7 || step16 === 11) playKick();
      if(step16 === 4 || step16 === 12) playSnare();
    }

    const p = getActiveProject();
    const pageKey = playback.anchorPageKey || p?.activeSection || "full";
    syncHighlightAndScroll(pageKey, barIdx, beatInBar, (p && p.playback && p.playback.seqStartOffset) || 0);

    metroBeat16++;
    metroTimer = setTimeout(tick, intervalMs);
  };
  tick();
}
function stopMetronome(){
  if(metroTimer) clearTimeout(metroTimer);
  metroTimer = null;
  metroOn = false;
  updateDrumButtonsUI();
  if(!(recording || playback.isPlaying)) stopEyePulse();
  if(!playback.isPlaying && !recording) clearAllPracticeAndActive();
}
function handleDrumPress(which){
  if(!metroOn){
    activeDrum = which;
    startMetronome();
    showToast(`Trap ${which}`);
    return;
  }
  if(metroOn && activeDrum === which){
    stopMetronome();
    showToast("Stop");
    return;
  }
  activeDrum = which;
  updateDrumButtonsUI();
  showToast(`Trap ${which}`);
}

/***********************
✅ PLAYBACK (crackle-free)
Use native <audio> element for playback (stable on Android/Chrome),
but route it through AudioContext for volume + recording mix.
***********************/
let playerEl = null;
let playerNode = null;
let playerUrl = null;

function ensurePlayerNode(){
  ensureAudio();
  if(!playerEl){
    playerEl = document.createElement("audio");
    playerEl.preload = "auto";
    playerEl.playsInline = true;
    playerEl.crossOrigin = "anonymous"; // safe even for blob URLs
  }
  if(!playerNode){
    // IMPORTANT: only ONE MediaElementSource per element
    playerNode = audioCtx.createMediaElementSource(playerEl);
    playerNode.connect(playbackGain);
  }
}

const playback = {
  isPlaying: false,
  beatOffsetBeats: 0,
  anchorPageKey: null,
  recId: null,

  raf: null,

  stop(fromEnded){
    if(this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;

    this.isPlaying = false;
    this.beatOffsetBeats = 0;
    playback.anchorPageKey = null;

    // stop audio element cleanly
    try{
      if(playerEl){
        playerEl.onended = null;
        playerEl.pause();
        playerEl.currentTime = 0;
      }
    }catch{}

    // release object URL (prevents memory + glitch buildup)
    try{
      if(playerUrl){
        URL.revokeObjectURL(playerUrl);
        playerUrl = null;
      }
    }catch{}

    // clear src to fully stop streaming/decoding
    try{
      if(playerEl){
        playerEl.removeAttribute("src");
        playerEl.load();
      }
    }catch{}

    this.recId = null;

    renderRecordings();
    if(!(metroOn || recording)) stopEyePulse();
    if(fromEnded) showToast("Done");

    if(!metroOn && !recording) clearAllPracticeAndActive();
  },

  _startSyncLoop(){
    const loop = () => {
      if(!this.isPlaying || !playerEl) return;

      // Use native playback time (stable)
      const t = Math.max(0, playerEl.currentTime || 0);

      const bpm = getProjectBpm();
      let beatPos = (t * bpm) / 60 - (this.beatOffsetBeats||0);
      if(beatPos < 0) beatPos = 0;
      const beatInBar = Math.floor(beatPos) % 4;
      const barIdx = Math.floor(beatPos / 4);

      const p = getActiveProject();
      const pageKey = playback.anchorPageKey || p?.activeSection || "full";
      syncHighlightAndScroll(pageKey, barIdx, beatInBar, (p && p.playback && p.playback.seqStartOffset) || 0);

      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },

  async playRec(rec){
    ensureAudio();
    ensurePlayerNode();

    if(audioCtx.state === "suspended") await audioCtx.resume();

    this.stop(false);
    this.recId = rec.id;

    const blob = await getRecBlob(rec);
    if(!blob){
      showToast("Missing audio");
      this.recId = null;
      return;
    }

    // build fresh URL every time
    try{
      if(playerUrl) URL.revokeObjectURL(playerUrl);
    }catch{}
    playerUrl = URL.createObjectURL(blob);

    // wire up ended
    playerEl.onended = () => {
      // ended fires reliably even if tab is backgrounded
      if(this.isPlaying) this.stop(true);
    };

    // set src + play
    try{
      playerEl.src = playerUrl;
      playerEl.currentTime = 0;

      // IMPORTANT: call play() from a user gesture (your click handler does)
      await playerEl.play();
    }catch(e){
      console.error(e);
      this.stop(false);
      showToast("Play failed");
      return;
    }

    this.isPlaying = true;
    if(autoScrollOn){
      this.beatOffsetBeats = 0;
      playback.anchorPageKey = (getActiveProject && getActiveProject())?.activeSection || null;
    } else {
      this.beatOffsetBeats = 0;
      playback.anchorPageKey = null;
    }
    startEyePulseFromBpm();
    this._startSyncLoop();
    renderRecordings();
  }
};

/***********************
✅ MP3 ENCODE (Auto convert WebM take -> MP3 right after recording)
Requires: lame.min.js loaded before app.js (window.lamejs)
***********************/
async function webmBlobToAudioBuffer(blob){
  ensureAudio();
  const ab = await blob.arrayBuffer();
  return await new Promise((resolve, reject)=>{
    audioCtx.decodeAudioData(ab, resolve, reject);
  });
}

function mixToMono(audioBuffer){
  const len = audioBuffer.length;
  if(audioBuffer.numberOfChannels === 1){
    return audioBuffer.getChannelData(0).slice(0);
  }
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.getChannelData(1);
  const out = new Float32Array(len);
  for(let i=0;i<len;i++) out[i] = (ch0[i] + ch1[i]) * 0.5;
  return out;
}

function floatTo16BitPCM(float32){
  const out = new Int16Array(float32.length);
  for(let i=0;i<float32.length;i++){
    let s = float32[i];
    if(s > 1) s = 1;
    else if(s < -1) s = -1;
    out[i] = s < 0 ? (s * 0x8000) : (s * 0x7fff);
  }
  return out;
}

async function encodeMp3FromFloat32Mono(samples, sampleRate){
  if(!window.lamejs || !window.lamejs.Mp3Encoder){
    throw new Error("lamejs_missing");
  }

  // 128kbps is a good balance for voice + quick files
  const mp3enc = new window.lamejs.Mp3Encoder(1, sampleRate, 128);

  const blockSize = 1152;
  const mp3Chunks = [];

  for(let i=0;i<samples.length;i+=blockSize){
    const chunk = samples.subarray(i, i + blockSize);
    const int16 = floatTo16BitPCM(chunk);
    const buf = mp3enc.encodeBuffer(int16);
    if(buf && buf.length) mp3Chunks.push(new Uint8Array(buf));

    // yield sometimes so UI doesn’t freeze on longer takes
    if(i && (i % (blockSize * 60) === 0)){
      await new Promise(r=>setTimeout(r, 0));
    }
  }

  const end = mp3enc.flush();
  if(end && end.length) mp3Chunks.push(new Uint8Array(end));

  return new Blob(mp3Chunks, { type:"audio/mpeg" });
}

async function convertWebmBlobToMp3(webmBlob){
  const audioBuffer = await webmBlobToAudioBuffer(webmBlob);
  const mono = mixToMono(audioBuffer);
  return await encodeMp3FromFloat32Mono(mono, audioBuffer.sampleRate);
}


/***********************
✅ download (IDB)
***********************/
async function downloadRec(rec){
  try{
    const blob = await getRecBlob(rec);
    if(!blob){ showToast("Missing audio"); return; }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const safe = (rec.name || "take").replace(/[^\w\s.-]+/g,"").trim() || "take";
    const type = (rec.mime || blob.type || "").toLowerCase();

    const ext =
      type.includes("mpeg") ? "mp3" :
      type.includes("wav")  ? "wav" :
      type.includes("ogg")  ? "ogg" :
      type.includes("mp4")  ? "m4a" :
      type.includes("webm") ? "webm" :
      "audio";

    a.download = `${safe}.${ext}`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
  }catch(e){
    console.error(e);
    showToast("Download failed");
  }
}

/***********************
✅ MIC RECORDING
***********************/
let recorder = null;
let recChunks = [];
let micStream = null;
let micSource = null;
let micGain = null;
  let drumRecGain = null;

async function ensureMic(){
  if(micStream) return;

 // ✅ Ask for a "music-like" mic path (turn OFF call-processing)
try{
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,

      // Helpful on some devices/browsers (ignored if unsupported)
      channelCount: 1,
      sampleRate: 48000,
      sampleSize: 16,
      latency: 0.02,

      // Legacy Chrome flags (safe; ignored if unsupported)
      googEchoCancellation: false,
      googAutoGainControl: false,
      googNoiseSuppression: false,
      googHighpassFilter: false,
      googTypingNoiseDetection: false
    }
  });
  // ✅ after getUserMedia (after try/catch), force-disable call-processing if supported
try{
  const track = micStream?.getAudioTracks?.()[0];
  if(track?.applyConstraints){
    await track.applyConstraints({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    });
  }
}catch{}

}catch(err){
  // Fallback: still try to kill processing if possible
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  });
}


  ensureAudio();

  micSource = audioCtx.createMediaStreamSource(micStream);

  const hp = audioCtx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 110;

  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.value = -28;
  comp.knee.value = 18;
  comp.ratio.value = 4;
  comp.attack.value = 0.01;
  comp.release.value = 0.18;

  micGain = audioCtx.createGain();
  micGain.gain.value = 0.15;

  micSource.connect(hp);
  hp.connect(comp);
  comp.connect(micGain);
  micGain.connect(recordMix); // ✅ goes through limiter now
}

function pickBestMime(){
  const candidates = ["audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus","audio/ogg"];
  for(const m of candidates){
    if(window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}
function takeNameFromInput(){ return (els.recordName?.value || "").trim(); }
function clearTakeNameInput(){ if(els.recordName) els.recordName.value = ""; }

function updateRecordButtonUI(){
  if(!els.recordBtn) return;
  if(recording){
    els.recordBtn.textContent = "Stop";
    els.recordBtn.classList.add("recOn");
  }else{
    els.recordBtn.textContent = "Record";
    els.recordBtn.classList.remove("recOn");
  }
}

async function startRecording(){
  await ensureMic();
  ensureAudio();
  if(audioCtx.state === "suspended") await audioCtx.resume();

  recChunks = [];
  recording = true;
  updateRecordButtonUI();
  startEyePulseFromBpm();

  const mimeType = pickBestMime();
  const opts = {};
  if(mimeType) opts.mimeType = mimeType;
  opts.audioBitsPerSecond = 160000;

  recorder = new MediaRecorder(recordDest.stream, opts);

  recorder.ondataavailable = (e)=>{
    if(e.data && e.data.size > 0) recChunks.push(e.data);
  };

  recorder.onstop = async ()=>{
    recording = false;
    updateRecordButtonUI();
    if(metroOn) stopMetronome();
    if(!(metroOn || playback.isPlaying)) stopEyePulse();

  const webmBlob = new Blob(recChunks, { type: recorder.mimeType || mimeType || "audio/webm" });

const p = getActiveProject();
const typed = takeNameFromInput();
const name = typed || `Take ${new Date().toLocaleString()}`;

let mp3Blob;

try{
  showToast("Converting to MP3...");
 mp3Blob = await convertWebmBlobToMp3(webmBlob);

}catch(e){
  console.error(e);
  showToast("MP3 conversion failed");
  return;
}

const id = uid();

try{
  await idbPutAudio({
    id,
    blob: mp3Blob,
    name,
    mime: "audio/mpeg",
    createdAt: nowISO()
  });
}catch(e){
  console.error(e);
  showToast("Audio save failed");
  return;
}

const rec = {
  id,
  blobId: id,
  name,
  createdAt: nowISO(),
  mime: "audio/mpeg",
  kind: "take"
};

p.recordings.unshift(rec);

clearTakeNameInput();
touchProject(p);
renderRecordings();
showToast("Saved as MP3");
 
  };

  recorder.start(1000);
}
function stopRecording(){
  if(recorder && recording) recorder.stop();
}

/***********************
✅ Upload audio -> saves blob to IDB
***********************/
async function handleUploadFile(file){
  if(!file) return;
  const p = getActiveProject();

  const id = uid();
  const name = file.name || `Audio ${new Date().toLocaleString()}`;
  const mime = file.type || "audio/*";

  await idbPutAudio({ id, blob: file, name, mime, createdAt: nowISO() });
  if(id) decodedCache.delete(id);


  const rec = { id, blobId: id, name, createdAt: nowISO(), mime, kind: "track" };
  p.recordings.unshift(rec);
  touchProject(p);
  renderRecordings();
  showToast("Uploaded");
}

/***********************
✅ FULL editor helpers
***********************/
function buildFullTextFromProject(p){
  const out = [];
  const order = getFullOrder(p);

  for(const key of order){
    out.push(getHeadingTextForKey(p, key));

    const sec = p.sections[key];
    if(sec?.bars){
      for(const b of sec.bars){
        const t = (b.text || "").replace(/\s+$/,"");
        if(!t.trim()) continue;
        out.push(t);
        out.push("");
      }
    }
    out.push("");
  }
  return out.join("\n");
}
function applyFullTextToProject(p, fullText){
  const lines = String(fullText||"").replace(/\r/g,"").split("\n");
  let currentKey = null;

  for(const key of getFullOrder(p)){
    const sec = p.sections[key];
    if(sec?.bars) sec.bars.forEach(b => b.text = "");
  }

  function headingToKey(line){
    const up = String(line||"").trim().toUpperCase();
    if(!up) return null;

    // base headings
    for(const def of BASE_SECTION_DEFS){
      if(def.title.toUpperCase() === up) return def.key;
    }

    // extras headings: match current titles OR "EXTRA n"
    for(const k of (p.extraKeys || [])){
      const sec = p.sections?.[k];
      const t = (sec?.title || "").trim().toUpperCase();
      if(t && t === up) return k;

      const n = extraIndex(k) || 1;
      if(`EXTRA ${n}` === up) return k;
    }

    return null;
  }
  const writeIndex = {};
  for(const k of getFullOrder(p)) writeIndex[k] = 0;

  for(const raw of lines){
    const key = headingToKey(raw);
    if(key){ currentKey = key; continue; }
    if(!currentKey) continue;

    const txt = String(raw||"").replace(/\s+$/,"");
    if(!txt.trim()) continue;

    const sec = p.sections[currentKey];
    if(!sec?.bars) continue;

    const i = writeIndex[currentKey] || 0;
    if(i >= sec.bars.length){
      sec.bars.push({ text:"" });
    }
    sec.bars[i].text = txt;
    writeIndex[currentKey] = i + 1;
  }

  for(const key of getFullOrder(p)){
    const sec = p.sections[key];
    if(sec && Array.isArray(sec.bars) && sec.bars.length === 0){
      sec.bars = [{ text:"" }];
    }
  }
  // ✅ if user typed under a deleted heading, re-enable that page
        const _prevKeys = JSON.stringify(p.pageKeysActive||[]);
        ensurePagesForText(p);
        const _afterKeys = JSON.stringify(p.pageKeysActive||[]);
        if (_prevKeys !== _afterKeys){
          saveProject(p);
          requestAnimationFrame(()=>renderBars({preserveScroll:true, targetPageKey:"full", snapBehavior:"auto"}));
          return;
        }
touchProject(p);
}
function syncSectionCardsFromProject(p){
  const areas = document.querySelectorAll('textarea[data-sec][data-idx]');
  areas.forEach(ta=>{
    const secKey = ta.getAttribute("data-sec");
    const idx = parseInt(ta.getAttribute("data-idx"), 10);
    const bar = p.sections?.[secKey]?.bars?.[idx];
    if(!bar) return;

    const val = bar.text || "";
    if(ta.value !== val) ta.value = val;

    const wrap = ta.closest(".bar");
    if(!wrap) return;

    const n = countSyllablesLine(val);
    const syllVal = wrap.querySelector(`[data-syll="${secKey}:${idx}"]`);
    const pill = wrap.querySelector(".syllPill");
    if(syllVal) syllVal.textContent = n ? String(n) : "";
    if(pill){
      pill.classList.remove("red","yellow","green");
      const g = syllGlowClass(n);
      if(g) pill.classList.add(g);
    }

    const beats = computeBeats(val);
    const beatEls = wrap.querySelectorAll(".beat");
    for(let i=0;i<4;i++){
      if(beatEls[i]) beatEls[i].innerHTML = escapeHtml(beats[i] || "");
    }
  });
}


function updateRhymesFromSectionCaret(p, key, ta){
  try{
    if(!ta) return;

    const hs = buildHeadingSet(p);

    const isChordLine = (line) => {
      const t = (line||"").trim();
      if(!t) return true;
      if(/^[-_]{3,}$/.test(t)) return true;

      const cleaned = t.replace(/[\[\]\(\)\{\}]/g,"").trim();
      const toks = cleaned.split(/\s+/).filter(Boolean);
      if(!toks.length) return true;

      const chordRe = /^(\d+)?[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?)?$/i;
      let chordish = 0;
      for(const tok of toks){
        if(tok === "|" || tok === "/"){ chordish++; continue; }
        if(chordRe.test(tok)){ chordish++; continue; }
      }
      return chordish === toks.length && toks.length >= 2;
    };

    const pickPrevLyricLine = (text) => {
      const lines = (text||"").replace(/\r/g,"").split("\n");
      for(let i=lines.length-1; i>=0; i--){
        const raw = lines[i] ?? "";
        const t = raw.trim();
        if(!t) continue;
        const up = t.toUpperCase();
        if(hs.has(up)) continue;
        if(isChordLine(t)) continue;
        return t;
      }
      return "";
    };

    const textNow = ta.value || "";
    const caret = ta.selectionStart || 0;
    const before = textNow.slice(0, caret);

    let baseLine = pickPrevLyricLine(before);

    if(!baseLine){
      const order = getActivePageOrder(p).filter(k=>k!=="full");
      const idx = order.indexOf(key);
      for(let i=idx-1; i>=0; i--){
        const k2 = order[i];
        const t2 = sectionTextFromProject(p, k2);
        const picked = pickPrevLyricLine(t2);
        if(picked){ baseLine = picked; break; }
      }
    }

    updateRhymes(lastWord(baseLine));
  }catch(err){
    // fail silently; never block typing
  }
}

function updateRhymesFromFullCaret(fullTa){
  if(!fullTa) return;
  const text = fullTa.value || "";
  const caret = fullTa.selectionStart || 0;
  const before = text.slice(0, caret);
  const lines = before.replace(/\r/g,"").split("\n");

  let j = lines.length - 2;
  while(j >= 0){
    const line = (lines[j] ?? "");
    const trimmed = line.trim();
    if(!trimmed){ j--; continue; }
    const up = trimmed.toUpperCase();
  const hs = buildHeadingSet(getActiveProject());
if(hs.has(up)){ j--; continue; }
    updateRhymes(lastWord(trimmed));
    return;
  }
  updateRhymes("");
}

/***********************
✅ CAROUSEL PAGER (wrap) — dynamic pages
***********************/
function getCarouselOrder(p){
  const order = getActivePageOrder(p);
  return [order[order.length - 1], ...order, order[0]];
}


// ---------- FULL SONG VIEW (SRP-style flow) ----------
function getActiveSectionKeysForFullView(p){
  // all active pages except "full"
  const order = getActivePageOrder(p) || ["full"];
  return order.filter(k => k !== "full");
}

function sectionTextFromProject(p, key){
  const sec = p?.sections?.[key];
  const bars = (sec?.bars || []);
  // join bars with a blank line between, but trim trailing whitespace
  return bars.map(b => (b?.text ?? "")).join("\n\n").replace(/\s+$/g, "");
}

function setSectionBarsFromText(p, key, rawText){
  const sec = p.sections[key] || (p.sections[key] = { key, title:"", bars:[{text:""}], titleEditable:true });
  const t = String(rawText || "").replace(/\r\n/g, "\n");
  const lines = t.split("\n");
  // collapse into "bar blocks" separated by blank lines
  const blocks = [];
  let buf = [];
  for(const ln of lines){
    if(String(ln).trim() === ""){
      if(buf.length){
        blocks.push(buf.join("\n").replace(/\s+$/g,""));
        buf = [];
      }
    }else{
      buf.push(ln.replace(/\s+$/g,""));
    }
  }
  if(buf.length) blocks.push(buf.join("\n").replace(/\s+$/g,""));

  sec.bars = (blocks.length ? blocks : [""]).map(txt => ({ text: txt }));
}

function renderFullSongFlow(p, mount){
  mount.innerHTML = "";
  mount.className = "fullSongFlow";

  const keys = getActiveSectionKeysForFullView(p);

  // safety: if somehow no pages exist, create the first base page
  if(!keys.length){
    const first = BASE_ORDER[0] || "verse1";
    if(!p.pageKeysActive.includes(first)) p.pageKeysActive.push(first);
    keys.push(first);
  }

  for(const key of keys){
    const sec = p.sections[key] || (p.sections[key] = { key, title:"", bars:[{text:""}], titleEditable:true });
    const block = document.createElement("div");
    block.className = "fullSection";
    block.dataset.secKey = key;

    const hdr = document.createElement("div");
    hdr.className = "fullSectionHeader";
    hdr.innerHTML = `
      <div class="line"></div>
      <input class="sectionPill" data-sec-title="${escAttr(key)}" type="text" spellcheck="false" />
      <div class="line"></div>
    `;

    const pill = hdr.querySelector(".sectionPill");
    pill.value = (sec.title || "").trim();
    pill.placeholder = "Song Part";

    // editable title for base + extras (SRP behavior)
    pill.addEventListener("input", ()=>{
      sec.title = pill.value;
      touchProject(p);
      // ✅ sync this title everywhere (card page title pills + any other full pills)
      document.querySelectorAll(`input[data-sec-title="${key}"]`).forEach(inp=>{
        if(inp !== pill) inp.value = pill.value;
      });
    });

    const body = document.createElement("textarea");
    body.className = "fullSectionBody fullSectionEditor";
    body.spellcheck = false;
    body.rows = 1;
    body.dataset.secEditor = key;
    body.value = sectionTextFromProject(p, key);
    requestAnimationFrame(()=>autoGrowTextarea(body));
    body.addEventListener("input", ()=>{ autoGrowTextarea(body); });

    // commit edits (debounced) -> update section bars and cards
    let tmr = null;
    const commit = ()=>{
      clearTimeout(tmr);
      tmr = setTimeout(()=>{
        setSectionBarsFromText(p, key, body.value || "");
        syncSectionCardsFromProject(p);
        touchProject(p);
      }, 180);
    };
    body.addEventListener("input", commit);
    body.addEventListener("blur", commit);

        const btnRow = document.createElement("div");
    btnRow.className = "fullSectionBtnRow";
    const addBtn = document.createElement("button");
    addBtn.className = "smallBtn fullAddBtn";
    addBtn.type = "button";
    addBtn.textContent = "+";
    addBtn.addEventListener("click", (e)=>{
      e.preventDefault(); e.stopPropagation();
      // ✅ add the next PAGE (section) like SRP (not an extra text window)
      addNextPage(p, key, { preserveScroll:true, stayOnFull:true });
    });

    const delBtn = document.createElement("button");
    delBtn.className = "smallBtn fullDelBtn";
    delBtn.type = "button";
    delBtn.textContent = "×";
    delBtn.addEventListener("click", (e)=>{
      e.preventDefault(); e.stopPropagation();
      // ✅ delete THIS page (section)
      deletePageKey(p, key, { preserveScroll:true, stayOnFull:true });
    });

    btnRow.appendChild(addBtn);
    btnRow.appendChild(delBtn);
    block.appendChild(hdr);
    block.appendChild(body);
    block.appendChild(btnRow);
    mount.appendChild(block);
  }
}

function buildPager(p){
  const pager = document.createElement("div");
  pager.className = "pager";
  pager.id = "pagesPager";

  const CAROUSEL_ORDER = getCarouselOrder(p);

  CAROUSEL_ORDER.forEach((key, i)=>{
    const page = document.createElement("div");
    page.className = "page";
    page.dataset.pageKey = key;

    if(i === 0 || i === CAROUSEL_ORDER.length - 1){
      page.dataset.clone = "1";
    }

    // title row (FULL + / ×, all pages + / ×)
    const titleRow = document.createElement("div");
    titleRow.className = "pageTitleRow";

    let titleTxt;
    if(key === "full"){
      titleTxt = document.createElement("div");
      titleTxt.className = "pageTitle";
      titleTxt.textContent = "Full Song View";
    } else {
      const sec = p.sections[key] || (p.sections[key] = { key, title:"", bars:[{text:""}], titleEditable:true });
      titleTxt = document.createElement("input");
      titleTxt.type = "text";
      titleTxt.spellcheck = false;
      titleTxt.className = "pageTitlePill sectionPill";
      titleTxt.placeholder = "Song Part";
      titleTxt.value = (sec.title || "").trim();
      titleTxt.setAttribute("data-sec-title", key);
      titleTxt.addEventListener("input", ()=>{
        sec.title = titleTxt.value;
        touchProject(p);
        // sync to Full Song View pill(s)
        document.querySelectorAll(`input.sectionPill[data-sec-title="${key}"]`).forEach(inp=>{
          if(inp !== titleTxt) inp.value = titleTxt.value;
        });
      });
    }

    const btns = document.createElement("div");
    btns.className = "pageTitleBtns";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "pageTitleBtn";
    addBtn.textContent = "+";
    addBtn.title = "Add next page";
    addBtn.setAttribute("data-action","addPage");
    addBtn.setAttribute("data-page", key);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "pageTitleBtn del";
    delBtn.textContent = "×";
    delBtn.title = (key === "full") ? "Clear pages (FULL stays)" : "Delete page";
    delBtn.setAttribute("data-action","delPage");
    delBtn.setAttribute("data-page", key);

    btns.appendChild(addBtn);
    btns.appendChild(delBtn);

    titleRow.appendChild(titleTxt);
    titleRow.appendChild(btns);
    page.appendChild(titleRow);

    if(key === "full"){
  // SRP-style continuous Full Song View (no inner scrolling window)
  const mount = document.createElement("div");
  mount.className = "fullSongMount fullSongFlow";
  page.appendChild(mount);

  renderFullSongFlow(p, mount);

  pager.appendChild(page);
  return;
}

    const mount = document.createElement("div");
    mount.className = "sectionMount";
    mount.dataset.secMount = key;
    mount.style.display = "flex";
    mount.style.flexDirection = "column";
    mount.style.gap = "10px";

    renderSectionBarsInto(p, key, mount);
    page.appendChild(mount);
    pager.appendChild(page);
  });

  return pager;
}

function measurePager(pagerEl){
  const w = Math.round(pagerEl.clientWidth || pagerEl.getBoundingClientRect().width || window.innerWidth);
  return Math.max(1, w);
}
function getCurrentIdx(pagerEl){
  const w = measurePager(pagerEl);
  const idx = Math.round(pagerEl.scrollLeft / w);
  return Math.max(0, Math.min((pagerEl.children.length - 1), idx));
}
function snapToIdx(pagerEl, idx, behavior="auto"){
  const w = measurePager(pagerEl);
  idx = Math.max(0, Math.min((pagerEl.children.length - 1), idx));
  pagerEl.scrollTo({ left: idx * w, behavior });
}
function snapToPageKey(p, pageKey, opts={}){
  try{
    const pagerEl = els?.bars?.querySelector?.(".pager");
    if(!pagerEl) return;

    const pages = Array.from(pagerEl.children || []);
    const idx = pages.findIndex(el => (el && el.dataset && (el.dataset.pageKey === pageKey)));
    if(idx < 0) return;

    const behavior = opts && opts.smooth ? "smooth" : "auto";
    snapToIdx(pagerEl, idx, behavior);
    setActiveSectionFromIdx(p, idx);
  }catch(err){
    console.warn("snapToPageKey failed", err);
  }
}


function setActiveSectionFromIdx(p, idx){
  const order = getActivePageOrder(p);
  const CAROUSEL_ORDER = [order[order.length - 1], ...order, order[0]];

  let key = CAROUSEL_ORDER[idx] || "full";
  if(idx === 0) key = order[order.length - 1];
  if(idx === CAROUSEL_ORDER.length - 1) key = order[0];

  if(p.activeSection !== key){
    p.activeSection = key;
    touchProject(p);

    lastAutoScrollToken = null;
    clearAllPracticeAndActive();
  }
}
/***********************
✅ page sequencing / add-delete
***********************/
function getActivePageOrder(p){
  // swipe order: FULL + active pages (in base sequence, then extras)
  const active = new Set(p.pageKeysActive || []);
  const base = BASE_ORDER.filter(k => active.has(k));
  const extras = (p.extraKeys || []).filter(k => active.has(k));
  return ["full", ...base, ...extras];
}

function isDeleted(p, key){
  return !!(p.pageDeleted && p.pageDeleted[key]);
}
function markDeleted(p, key, v){
  if(!p.pageDeleted || typeof p.pageDeleted !== "object") p.pageDeleted = {};
  if(v) p.pageDeleted[key] = 1;
  else delete p.pageDeleted[key];
}

function sectionHasAnyText(p, key){
  const bars = p?.sections?.[key]?.bars || [];
  return bars.some(b => String(b?.text||"").trim().length > 0);
}

function ensurePagesForText(p){
  // if user typed text under a deleted heading in FULL, bring it back + un-delete
  for(const k of getFullOrder(p)){
    if(sectionHasAnyText(p, k)){
      markDeleted(p, k, false);
      if(!p.pageKeysActive.includes(k)) p.pageKeysActive.push(k);
    }
  }
}

function nextAddKeyFrom(p, fromKey){
  // From FULL: first non-active, non-deleted base section; then extras
  const active = new Set(p.pageKeysActive || []);

  if(fromKey === "full"){
    // base sequence first
    for(const k of BASE_ORDER){
      if(active.has(k)) continue;
      if(isDeleted(p,k)) continue;         // ✅ skip deleted until text restores
      return k;
    }
    // then extras: create new extra if needed
    return "__NEW_EXTRA__";
  }

  // from a section page: go to next in base order if possible
  const idx = BASE_ORDER.indexOf(fromKey);
  if(idx >= 0){
    for(let i=idx+1;i<BASE_ORDER.length;i++){
      const k = BASE_ORDER[i];
      if(active.has(k)) continue;
      if(isDeleted(p,k)) continue;
      return k;
    }
    return "__NEW_EXTRA__";
  }

  // from an extra: create the next extra
  return "__NEW_EXTRA__";
}

function createNextExtra(p){
  if(!Array.isArray(p.extraKeys)) p.extraKeys = [];
  const existingNums = p.extraKeys.map(extraIndex).filter(n=>n>0);
  const nextNum = existingNums.length ? (Math.max(...existingNums)+1) : 1;
  const key = makeExtraKey(nextNum);

  if(!p.sections[key]){
    p.sections[key] = { key, title:"", bars:[{text:""}], titleEditable:true, extraNum: nextNum };
  }
  if(!p.extraKeys.includes(key)) p.extraKeys.push(key);
  return key;
}

function addNextPage(p, fromKey, opts={}){
  const next = nextAddKeyFrom(p, fromKey);

  let key = next;
  if(next === "__NEW_EXTRA__"){
    key = createNextExtra(p);
  }

  // add to active pages
  if(!p.pageKeysActive.includes(key)) p.pageKeysActive.push(key);

  // switch to it (unless we are adding from Full Song View)
  if(!(opts && opts.stayOnFull)){
    p.activeSection = key;
  }else{
    p.activeSection = "full";
  }
  touchProject(p);
  // Render and snap exactly once to the newly-added page (prevents "bounce"/back-scroll).
  renderBars({
    preserveScroll: !!opts.preserveScroll,
    targetPageKey: (opts && opts.stayOnFull) ? (p.activeSection || "full") : key,
    snapBehavior: "auto"
  });

  showToast("Added page");
}

function deletePageKey(p, key, opts={}){
  if(!key || key === "full") return;

  // mark deleted + remove from active
  markDeleted(p, key, true);
  p.pageKeysActive = (p.pageKeysActive || []).filter(k => k !== key);

  // if we were on that page, go back to FULL
  if(p.activeSection === key) p.activeSection = "full";

  touchProject(p);
  renderBars({preserveScroll: !!opts.preserveScroll});
  if(opts && opts.stayOnFull){
    const p2 = getActiveProject();
    p2.activeSection = "full";
    touchProject(p2);
  }
  showToast("Deleted page");
}
function shouldIgnoreSwipeStart(target){
  if(!target) return false;
  return !!target.closest("button, .rhymeDock, .iconBtn, .projIconBtn, [data-noswipe], .noSwipe");
}

function setupCarouselPager(pagerEl, p){
  pagerEl.style.touchAction = "pan-y pinch-zoom";
  pagerEl.style.overscrollBehaviorX = "contain";
  pagerEl.style.webkitOverflowScrolling = "touch";
  pagerEl.style.scrollBehavior = "auto";

  const snapToActive = () => {
    const order = getActivePageOrder(p);
    const realIdx = Math.max(0, order.indexOf(p.activeSection || "full"));
    snapToIdx(pagerEl, realIdx + 1, "auto"); // +1 because first clone
  };

  window.addEventListener("resize", snapToActive);

  let tmr = null;
  pagerEl.addEventListener("scroll", ()=>{
    if(tmr) clearTimeout(tmr);
    tmr = setTimeout(()=>{
      const order = getActivePageOrder(p);
      const carousel = [order[order.length - 1], ...order, order[0]];
      const idx = getCurrentIdx(pagerEl);

      // wrap correction when landing on clones
      if(idx === 0){
        const lastRealCarouselIdx = carousel.length - 2;
        snapToIdx(pagerEl, lastRealCarouselIdx, "auto");
        setActiveSectionFromIdx(p, lastRealCarouselIdx);
        return;
      }
      if(idx === carousel.length - 1){
        const firstRealCarouselIdx = 1;
        snapToIdx(pagerEl, firstRealCarouselIdx, "auto");
        setActiveSectionFromIdx(p, firstRealCarouselIdx);
        return;
      }

      setActiveSectionFromIdx(p, idx);
    }, 120);
  }, { passive:true });

  let tracking = false;
  let locked = false;
  let startX = 0, startY = 0, lastX = 0;
  let startIdx = 0;

  const LOCK_X = 18;
  const COMMIT = 50;

  function finish(){
    if(!tracking) return;
    tracking = false;

    const dx = lastX - startX;
    let idx = startIdx;

    if(locked){
      if(dx <= -COMMIT) idx = startIdx + 1;
      else if(dx >= COMMIT) idx = startIdx - 1;
    }

    const maxIdx = Math.max(0, (pagerEl.children?.length || 1) - 1);
    idx = Math.max(0, Math.min(maxIdx, idx));

    snapToIdx(pagerEl, idx, "smooth");
    setActiveSectionFromIdx(p, idx);

    locked = false;
  }

  pagerEl.addEventListener("touchstart", (e)=>{
    if(shouldIgnoreSwipeStart(e.target)) return;
    const t = e.touches[0];
    if(!t) return;
    tracking = true;
    locked = false;
    startX = lastX = t.clientX;
    startY = t.clientY;
    startIdx = getCurrentIdx(pagerEl);
  }, { passive:true });

  pagerEl.addEventListener("touchmove", (e)=>{
    if(!tracking) return;
    const t = e.touches[0];
    if(!t) return;

    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    lastX = t.clientX;

    if(!locked){
      if(Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)){
        tracking = false;
        return;
      }
      if(Math.abs(dx) > LOCK_X && Math.abs(dx) > Math.abs(dy) * 1.2){
        locked = true;
      }else{
        return;
      }
    }
    e.preventDefault();
  }, { passive:false });

  pagerEl.addEventListener("touchend", finish, { passive:true });
  pagerEl.addEventListener("touchcancel", finish, { passive:true });
}

/***********************
✅ bar rendering helper
***********************/
function renderSectionBarsInto(p, sectionKey, mountEl){
  const sec = p.sections[sectionKey];
  if(!sec?.bars) return;

  // Rebuild list cleanly (needed when bar count changes from Full Song View)
  mountEl.innerHTML = "";

  sec.bars.forEach((bar, idx)=>{
    const wrap = document.createElement("div");
    wrap.className = "bar";
    wrap.dataset.barIdx = String(idx);
    wrap.setAttribute("data-bar-idx", String(idx));

    const n = countSyllablesLine(bar.text||"");
    const glow = syllGlowClass(n);
    const beats = computeBeats(bar.text||"");

    wrap.innerHTML = `
      <div class="barTop">
        <div class="barLeft">
          <div class="barNum">${idx+1}</div>
          <div class="syllPill ${glow}">
            <span class="lbl">Syllables</span>
            <span class="val" data-syll="${sectionKey}:${idx}">${n ? n : ""}</span>
          </div>
        </div>

        <div class="barRightBtns">
          <button type="button"
            class="barPlusBtn"
            title="Add card below"
            aria-label="Add card below"
            data-action="addBarAfter"
            data-sec="${escapeHtml(sectionKey)}"
            data-idx="${idx}">+</button>

          <button type="button"
            class="barDelBtn"
            title="Delete card"
            aria-label="Delete card"
            data-action="delBar"
            data-sec="${escapeHtml(sectionKey)}"
            data-idx="${idx}">×</button>
        </div>
      </div>

      <textarea data-sec="${escapeHtml(sectionKey)}" data-idx="${idx}" placeholder="Type your bar. Optional: use / for beat breaks.">${escapeHtml(bar.text||"")}</textarea>

      <div class="beats">
        <div class="beat">${escapeHtml(beats[0]||"")}</div>
        <div class="beat snare">${escapeHtml(beats[1]||"")}</div>
        <div class="beat">${escapeHtml(beats[2]||"")}</div>
        <div class="beat snare">${escapeHtml(beats[3]||"")}</div>
      </div>
    `;

    const ta = wrap.querySelector("textarea");
    const syllVal = wrap.querySelector(`[data-syll="${sectionKey}:${idx}"]`);
    const syllPill = wrap.querySelector(".syllPill");
    const beatEls = wrap.querySelectorAll(".beat");

    function refreshRhymesForCaret(){
      const text = ta.value || "";
      const caret = ta.selectionStart || 0;
      const beatIdx = caretBeatIndex(text, caret);
      const b = computeBeats(text);

      let prevText = "";
      if(beatIdx > 0){
        prevText = b[beatIdx-1] || "";
      }else{
        const prevBar = sec.bars[idx-1];
        if(prevBar && prevBar.text){
          const pb = computeBeats(prevBar.text);
          prevText = pb[3] || pb[2] || pb[1] || pb[0] || "";
        }
      }
      updateRhymes(lastWord(prevText));
    }

    ta.addEventListener("focus", ()=>{
      refreshRhymesForCaret();
      updateDockForKeyboard();
    });
    ta.addEventListener("click", refreshRhymesForCaret);
    ta.addEventListener("keyup", refreshRhymesForCaret);

    ta.addEventListener("input", (e)=>{
      const text = e.target.value;
      bar.text = text;
      touchProject(p);

      // invalidate play-sequence cache immediately (so autoscroll reacts instantly)
      playSeqCache.updatedAt = null;

      const newN = countSyllablesLine(text);
      syllVal.textContent = newN ? String(newN) : "";
      syllPill.classList.remove("red","yellow","green");
      const g = syllGlowClass(newN);
      if(g) syllPill.classList.add(g);

      const bb = computeBeats(text);
      for(let i=0;i<4;i++){
        beatEls[i].innerHTML = escapeHtml(bb[i]||"");
      }

      refreshRhymesForCaret();
    });

    ta.addEventListener("keydown", (e)=>{
      if(e.key === "Enter"){
        e.preventDefault();
        const next = mountEl.querySelector(`textarea[data-sec="${CSS.escape(sectionKey)}"][data-idx="${idx+1}"]`);
        if(next) next.focus();
      }
    });

    mountEl.appendChild(wrap);
  });
}

/***********************
✅ add/delete bar actions (delegation)
***********************/
document.addEventListener("click", (e)=>{
  const btn = e.target.closest("[data-action]");
  if(!btn) return;

  const p = getActiveProject();
  const action = btn.getAttribute("data-action");
    if(action === "addPage"){
    const key = btn.getAttribute("data-page") || "full";
    addNextPage(p, key);
    return;
  }

  if(action === "delPage"){
    const key = btn.getAttribute("data-page") || "full";

    // FULL: clear all pages but keep FULL
    if(key === "full"){
      p.pageKeysActive = [];
      p.pageDeleted = p.pageDeleted || {};
      for(const k of BASE_ORDER) p.pageDeleted[k] = 1;
      touchProject(p);
      renderBars();
      showToast("Cleared pages");
      return;
    }

    deletePageKey(p, key);
    return;
  }
  if(action === "addBarAfter"){
    const secKey = btn.getAttribute("data-sec");
    const idxStr = btn.getAttribute("data-idx");
    const idx = parseInt(idxStr, 10);
    if(!secKey || !p.sections?.[secKey]) return;
    const bars = p.sections[secKey].bars;
    if(!Array.isArray(bars)) return;
    if(Number.isNaN(idx) || idx < 0 || idx >= bars.length) return;

    bars.splice(idx + 1, 0, { text:"" });
    touchProject(p);
    renderBars();

    requestAnimationFrame(()=>{
      const page = getActiveRealPageEl(secKey);
      const newIdx = idx + 1;
      page?.querySelector(`textarea[data-sec="${CSS.escape(secKey)}"][data-idx="${newIdx}"]`)?.focus?.();
    });

    showToast("Added");
    return;
  }

  if(action === "delBar"){
    const secKey = btn.getAttribute("data-sec");
    const idxStr = btn.getAttribute("data-idx");
    const idx = parseInt(idxStr, 10);
    if(!secKey || !p.sections?.[secKey]) return;
    const bars = p.sections[secKey].bars;
    if(!Array.isArray(bars)) return;

    if(bars.length <= 1){
      showToast("Can’t delete last card");
      return;
    }
    if(Number.isNaN(idx) || idx < 0 || idx >= bars.length) return;

    bars.splice(idx, 1);
    touchProject(p);
    renderBars();
    showToast("Deleted");
    return;
  }
});

/***********************
✅ renderBars
***********************/
function renderBars(opts={}){
  const p = getActiveProject();
  if(!els.bars) return;

  const preserveScroll = !!(opts && opts.preserveScroll);
  const prevScrollTop = preserveScroll ? els.bars.scrollTop : 0;

  els.bars.innerHTML = "";
  const pager = buildPager(p);
  els.bars.appendChild(pager);

  if(preserveScroll){
    requestAnimationFrame(()=>{ try{ els.bars.scrollTop = prevScrollTop; }catch(e){} });
  }

  lastAutoScrollToken = null;

  
// FULL song view (SRP-style flow)
const fullMount = els.bars.querySelector(".fullSongMount");
if(fullMount){
  // keep UI in sync with current project state
  renderFullSongFlow(p, fullMount);

  const editors = fullMount.querySelectorAll(".fullSectionEditor");
  const timers = new Map();

  const commitSection = (key, ta) => {
    const prevLen = (p.sections[key]?.bars || []).length;

    setSectionBarsFromText(p, key, ta.value || "");
    const _prevKeys = JSON.stringify(p.pageKeysActive||[]);
    ensurePagesForText(p);
    const _afterKeys = JSON.stringify(p.pageKeysActive||[]);
    if (_prevKeys !== _afterKeys){
      touchProject(p);
      saveProject(p);
      requestAnimationFrame(()=>renderBars({preserveScroll:true, targetPageKey:"full", snapBehavior:"auto"}));
      return;
    }
touchProject(p);

    // Update any already-rendered card inputs
    syncSectionCardsFromProject(p);

    const newLen = (p.sections[key]?.bars || []).length;

    // If the bar count changed (e.g., pasted 16 bars), rebuild that card page immediately
    if(newLen !== prevLen){
      const pageEl = document.querySelector(`.page[data-page-key="${key}"]`);
      
    if (!pageEl){
      touchProject(p);
      saveProject(p);
      requestAnimationFrame(()=>renderBars({preserveScroll:true, targetPageKey:"full", snapBehavior:"auto"}));
      return;
    }
const mountEl = pageEl ? pageEl.querySelector(".sectionMount") : null;
      if(mountEl){
        renderSectionBarsInto(p, key, mountEl);
      }
    }

    playSeqCache.updatedAt = null;
  };

  const refreshRhymes = (key, ta) => {
    updateRhymesFromSectionCaret(p, key, ta);
    updateDockForKeyboard();
  };

  editors.forEach((ta)=>{
    const key = ta.dataset.secEditor;
    autoGrowTextarea(ta);

    let tmr = null;
    ta.addEventListener("input", ()=>{
      autoGrowTextarea(ta);
      if(tmr) clearTimeout(tmr);
      tmr = setTimeout(()=> commitSection(key, ta), 220);
      refreshRhymes(key, ta);
    });
    ta.addEventListener("click", ()=> refreshRhymes(key, ta));
    ta.addEventListener("keyup", ()=> refreshRhymes(key, ta));
    ta.addEventListener("focus", ()=>{ autoGrowTextarea(ta); refreshRhymes(key, ta); });
  });
}

  const order = getActivePageOrder(p);
  const wantKey = (opts && opts.targetPageKey) ? opts.targetPageKey : (p.activeSection || "full");
  const wantIdx = Math.max(0, order.indexOf(wantKey));
  const behavior = (opts && opts.snapBehavior) ? opts.snapBehavior : "auto";

  // Important: only snap once after render (prevents "scroll backwards then forward" glitches)
  setupCarouselPager(pager, p);
  snapToIdx(pager, wantIdx + 1, behavior);
}

/***********************
✅ recordings list
***********************/
let editingRecId = null;

function renderRecordings(){
  const p = getActiveProject();
  if(!els.recordingsList) return;

  els.recordingsList.innerHTML = "";

  if(!p.recordings?.length){
    els.recordingsList.innerHTML = `<div class="small">No recordings yet.</div>`;
    return;
  }

  for(const rec of p.recordings){
    const row = document.createElement("div");
    row.className = "audioItem";

    if(editingRecId === rec.id){
      const input = document.createElement("input");
      input.type = "text";
      input.value = rec.name || "";
      input.style.fontWeight = "1000";
      input.style.flex = "1";
      input.style.minWidth = "180px";
      input.style.padding = "10px 12px";
      input.style.borderRadius = "14px";
      input.style.border = "1px solid rgba(0,0,0,.12)";
      input.style.boxShadow = "0 6px 14px rgba(0,0,0,.05)";

      const save = document.createElement("button");
      save.textContent = "Save";
      save.addEventListener("click", async ()=>{
        const newName = (input.value || "").trim();
        rec.name = newName || rec.name || "Take";
        touchProject(p);

        try{
          const blob = await getRecBlob(rec);
          if(blob) await idbPutAudio({ id: rec.blobId || rec.id, blob, name: rec.name, mime: rec.mime, createdAt: rec.createdAt });
        }catch{}

        editingRecId = null;
        renderRecordings();
        showToast("Renamed");
      });

      const cancel = document.createElement("button");
      cancel.textContent = "Cancel";
      cancel.addEventListener("click", ()=>{
        editingRecId = null;
        renderRecordings();
      });

      input.addEventListener("keydown", (e)=>{
        if(e.key === "Enter"){ e.preventDefault(); save.click(); }
        if(e.key === "Escape"){ e.preventDefault(); cancel.click(); }
      });

      row.appendChild(input);
      row.appendChild(save);
      row.appendChild(cancel);
      els.recordingsList.appendChild(row);
      continue;
    }

    const isTrack = rec.kind === "track";
    const prefix = isTrack ? "🎵 " : "";

    const label = document.createElement("div");
    label.className = "audioLabel";
    label.textContent = prefix + (rec.name || (isTrack ? "Audio" : "Take"));

    const icons = document.createElement("div");
    icons.className = "iconRow";

    const editBtn = document.createElement("button");
    editBtn.className = "iconBtn";
    editBtn.title = "Edit name";
    editBtn.textContent = "i";
  editBtn.addEventListener("click", (ev)=>{
  ev.preventDefault();
  ev.stopPropagation();
      editingRecId = rec.id;
      renderRecordings();
      requestAnimationFrame(()=>{
        const inp = els.recordingsList.querySelector('input[type="text"]');
        inp?.focus?.();
        inp?.select?.();
      });
    });

    const playBtn = document.createElement("button");
    playBtn.className = "iconBtn play";
    playBtn.title = "Play";
    const isThisPlaying = playback.isPlaying && playback.recId === rec.id;
    playBtn.textContent = isThisPlaying ? "…" : "▶";
 playBtn.addEventListener("click", async (ev)=>{
  ev.preventDefault();
  ev.stopPropagation();
      try{
        await playback.playRec(rec);
        showToast("Play");
      }catch(e){
        console.error(e);
        showToast("Playback failed");
      }
    });

    const stopBtn = document.createElement("button");
    stopBtn.className = "iconBtn stop";
    stopBtn.title = "Stop";
    stopBtn.textContent = "■";
  stopBtn.addEventListener("click", (ev)=>{
  ev.preventDefault();
  ev.stopPropagation();
      playback.stop(false);
      showToast("Stop");
    });

    const dlBtn = document.createElement("button");
    dlBtn.className = "iconBtn";
    dlBtn.title = "Download";
    dlBtn.textContent = "⬇";
   dlBtn.addEventListener("click", (ev)=>{
  ev.preventDefault();
  ev.stopPropagation();
  downloadRec(rec);
});


    const delBtn = document.createElement("button");
    delBtn.className = "iconBtn delete";
    delBtn.title = "Delete";
    delBtn.textContent = "×";
   delBtn.addEventListener("click", async (ev)=>{
  ev.preventDefault();
  ev.stopPropagation();
      try{
        if(playback.recId === rec.id) playback.stop(false);
        if(editingRecId === rec.id) editingRecId = null;

        const id = rec.blobId || rec.id;
        if(id) await idbDeleteAudio(id);

        if(id) decodedCache.delete(id);

        p.recordings = p.recordings.filter(r=>r.id !== rec.id);
        touchProject(p);
        renderRecordings();
        showToast("Deleted");
      }catch(e){
        console.error(e);
        showToast("Delete failed");
      }
    });

    icons.appendChild(editBtn);
    icons.appendChild(playBtn);
    icons.appendChild(stopBtn);
    icons.appendChild(dlBtn);
    icons.appendChild(delBtn);

    row.appendChild(label);
    row.appendChild(icons);
    els.recordingsList.appendChild(row);
  }
}

/***********************
✅ renderAll
***********************/
function renderAll(){
  const p = getActiveProject();
  document.body.classList.toggle("fullMode", p.activeSection === "full");

  
  relocateMiniCard();
  syncHeaderHeightVar();
if(els.bpm) els.bpm.value = p.bpm || 95;

  renderProjectPicker();
  renderBars();
  renderRecordings();

  if(els.statusText) els.statusText.textContent = " ";
  updateDockForKeyboard();
  updateRecordButtonUI();
  updateDrumButtonsUI();
  updateAutoScrollBtn();

  if(!(metroOn || recording || playback.isPlaying)) stopEyePulse();
  else startEyePulseFromBpm();
  syncHeaderHeightVar();
}

/***********************
✅ EXPORT
***********************/
function safeFileName(name){
  const base = (name || "Beat Sheet Pro Export").trim() || "Beat Sheet Pro Export";
  return base.replace(/[^\w\s.-]+/g,"").replace(/\s+/g," ").trim();
}
function makeHtmlDoc(title, bodyText){
  const esc = escapeHtml(bodyText);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  body{ font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; margin:16px; }
  h1{ font-size:20px; margin:0 0 10px; }
  .meta{ color:#555; font-size:12px; margin-bottom:14px; }
  pre{
    white-space:pre-wrap;
    word-wrap:break-word;
    border:1px solid rgba(0,0,0,.12);
    border-radius:14px;
    padding:12px;
    background:#fff;
    font-size:14px;
    line-height:1.35;
    font-weight:700;
  }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">Exported: ${escapeHtml(new Date().toLocaleString())}</div>
  <pre>${esc}</pre>
</body>
</html>`;
}
function downloadTextAsFile(filename, text, mime="text/html"){
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 6000);
}
function buildSplitExportText(p){
  const out = [];
  const order = getFullOrder(p);

  for(const key of order){
    // skip FULL in split export (it’s the combined view)
    if(key === "full") continue;

    const heading = getHeadingTextForKey(p, key);
    out.push(`[${heading}]`);

    const sec = p.sections?.[key];
    for(const bar of (sec?.bars || [])){
      const raw = (bar.text || "").trim();
      if(!raw) continue;
      const beats = computeBeats(raw).map(x => (x||"").trim());
      const line = beats.filter(Boolean).join(" | ");
      out.push(line);
    }
    out.push("");
  }
return out.join("\n"); 
}

els.exportBtn?.addEventListener("click", ()=>{
  const p = getActiveProject();
  const name = safeFileName(p.name || "Beat Sheet Pro");

  const fullText = buildFullTextFromProject(p).trim() || "";
  const htmlA = makeHtmlDoc(`${name} — FULL`, fullText);
  downloadTextAsFile(`${name} - FULL.html`, htmlA);

  const splitText = buildSplitExportText(p).trim() || "";
  const htmlB = makeHtmlDoc(`${name} — SPLIT`, splitText);
  downloadTextAsFile(`${name} - SPLIT.html`, htmlB);

  showToast("Exported 2 HTML files");
});

/***********************
✅ events
***********************/
els.newProjectBtn?.addEventListener("click", ()=>{
  const p = newProject("");
  store.projects.unshift(p);
  store.activeProjectId = p.id;
  saveStoreSafe();
  playback.stop(false);
  renderAll();
  showToast("New project");
});

els.copyProjectBtn?.addEventListener("click", ()=>{
  const active = getActiveProject();
  const clone = JSON.parse(JSON.stringify(active));
  clone.id = uid();
  clone.name = (active.name || "Project") + " (copy)";
  clone.createdAt = nowISO();
  clone.updatedAt = nowISO();
  store.projects.unshift(repairProject(clone));
  store.activeProjectId = clone.id;
  saveStoreSafe();
  playback.stop(false);
  renderAll();
  showToast("Copied");
});

els.deleteProjectBtn?.addEventListener("click", async ()=>{
  const active = getActiveProject();
  if(store.projects.length <= 1){
    showToast("Can't delete last project");
    return;
  }

  playback.stop(false);

  try{
    for(const rec of (active.recordings || [])){
      const id = rec.blobId || rec.id;
      if(id) await idbDeleteAudio(id);
      if(id) decodedCache.delete(id);

    }
  }catch{}

  store.projects = store.projects.filter(p=>p.id !== active.id);
  store.activeProjectId = store.projects[0].id;
  saveStoreSafe();
  renderAll();
  showToast("Deleted");
});

els.projectPicker?.addEventListener("change", ()=>{
  const id = els.projectPicker.value;
  if(!id) return;
  if(store.projects.find(p=>p.id===id)){
    store.activeProjectId = id;
    saveStoreSafe();
    playback.stop(false);
    renderAll();
    showToast("Opened");
  }
});

els.editProjectBtn?.addEventListener("click", ()=>{
  const p = getActiveProject();
  const cur = (p.name || "").trim();
  const next = prompt("Project name:", cur);
  if(next === null) return;
  p.name = String(next || "").trim();
  touchProject(p);
  renderProjectPicker();
  showToast("Renamed");
});

els.saveBtn?.addEventListener("click", ()=>{
  const p = getActiveProject();
  touchProject(p);
  showToast("Saved");
});

els.bpm?.addEventListener("change", ()=>{
  const p = getActiveProject();
  p.bpm = clampInt(parseInt(els.bpm.value,10), 40, 240);
  els.bpm.value = p.bpm;
  touchProject(p);
  if(metroOn) startMetronome();
  if(metroOn || recording || playback.isPlaying) startEyePulseFromBpm();
});

// drum buttons
els.drum1Btn?.addEventListener("click", ()=>handleDrumPress(1));
els.drum2Btn?.addEventListener("click", ()=>handleDrumPress(2));
els.drum3Btn?.addEventListener("click", ()=>handleDrumPress(3));
els.drum4Btn?.addEventListener("click", ()=>handleDrumPress(4));

// record button
els.recordBtn?.addEventListener("click", async ()=>{
  try{
    if(!recording) await startRecording();
    else stopRecording();
  }catch(err){
    console.error(err);
    showToast("Record failed (mic?)");
  }
});

/***********************
✅ Upload button wiring (IDB)
***********************/
els.mp3Btn?.addEventListener("click", ()=>{
  try{ els.mp3Input?.click?.(); }
  catch(e){ console.error(e); showToast("Upload failed"); }
});
els.mp3Input?.addEventListener("change", async (e)=>{
  try{
    const file = e.target.files?.[0];
    e.target.value = "";
    if(!file) return;
    await handleUploadFile(file);
  }catch(err){
    console.error(err);
    showToast("Upload failed");
  }
});


/***********************
✅ pull-to-refresh (firm pull)
***********************/
function attachPullToRefresh(scrollEl, onRefresh){
  if(!scrollEl || scrollEl.__ptrAttached) return;
  scrollEl.__ptrAttached = true;

  let startY = 0;
  let startX = 0;
  let tracking = false;
  let pulled = false;

  const THRESH = 110; // px - "firm pull"
  const MAX_X = 60;   // ignore diagonal/horizontal drags

  const isTypingEl = (el)=>{
    if(!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    if(tag === "textarea" || tag === "input") return true;
    if(el.isContentEditable) return true;
    return false;
  };

  scrollEl.addEventListener("touchstart", (e)=>{
    if(isTypingEl(e.target)) return;
    if(scrollEl.scrollTop > 0) return;
    const t = e.touches && e.touches[0];
    if(!t) return;
    tracking = true;
    pulled = false;
    startY = t.clientY;
    startX = t.clientX;
  }, { passive:true });

  scrollEl.addEventListener("touchmove", (e)=>{
    if(!tracking) return;
    const t = e.touches && e.touches[0];
    if(!t) return;

    const dy = t.clientY - startY;
    const dx = Math.abs(t.clientX - startX);

    if(dx > MAX_X) { tracking = false; return; }
    if(dy > THRESH){
      pulled = true;
    }
  }, { passive:true });

  scrollEl.addEventListener("touchend", ()=>{
    if(tracking && pulled){
      try{ showToast("Refreshing…"); }catch(_){}
      setTimeout(()=>{ try{ onRefresh && onRefresh(); }catch(_){ location.reload(); } }, 30);
    }
    tracking = false;
    pulled = false;
  }, { passive:true });
}


/***********************
✅ boot
***********************/
(async function boot(){
  setDockHidden(loadDockHidden());
  document.body.classList.toggle("headerCollapsed", loadHeaderCollapsed());
  relocateMiniCard();
  autoScrollOn = loadAutoScroll();
  updateAutoScrollBtn();

  // First paint
  renderAll();
  syncHeaderHeightVar();
  attachPullToRefresh(els.bars, ()=>location.reload());

  // Fonts can change header size (spray font), re-measure when ready
  try{
    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(()=>syncHeaderHeightVar());
    }
  }catch(_){}

  await migrateAllAudioOnce();

  renderAll();
  syncHeaderHeightVar();
  updateRhymes("");
})();
})();
