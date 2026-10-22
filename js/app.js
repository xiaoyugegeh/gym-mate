/* =========================================================
 * 铁馆伴侣 GymMate - 移动端健身助手
 * 数据依赖: js/data.js (window.DB), js/curated.js (window.CURATED)
 * ========================================================= */
"use strict";

/* ---------------- 工具 ---------------- */
const $ = (s, p) => (p || document).querySelector(s);
const $$ = (s, p) => Array.from((p || document).querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayStr = (d) => { const t = d ? new Date(d) : new Date(); return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); };
const fmtDur = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return h ? `${h}小时${m}分` : (m ? `${m}分${ss}秒` : `${ss}秒`); };
const fmtClock = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), ss = s % 60; return String(m).padStart(2, "0") + ":" + String(ss).padStart(2, "0"); };
const WEEKCN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function toast(msg, ms) {
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.add("hidden"), ms || 1800);
}

/* WebAudio 提示音 */
let _ac = null;
function beep(times) {
  try {
    _ac = _ac || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < (times || 1); i++) {
      const o = _ac.createOscillator(), g = _ac.createGain();
      o.connect(g); g.connect(_ac.destination);
      o.type = "sine"; o.frequency.value = i % 2 ? 880 : 1320;
      const t0 = _ac.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24);
      o.start(t0); o.stop(t0 + 0.26);
    }
  } catch (e) { /* 忽略音频错误 */ }
}

/* ---------------- 本地存储 ---------------- */
const store = {
  get(k, def) { try { const v = localStorage.getItem("gym_" + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem("gym_" + k, JSON.stringify(v)); } catch (e) { toast("存储失败：空间不足"); } },
};
const getFavs = () => store.get("favs", []);
const isFav = id => getFavs().includes(id);
const toggleFav = id => { const f = getFavs(); const i = f.indexOf(id); i >= 0 ? f.splice(i, 1) : f.unshift(id); store.set("favs", f); return i < 0; };
const getPlans = () => store.get("plans", []);
const savePlans = p => store.set("plans", p);
const getHistory = () => store.get("history", []);
const addHistory = h => { const a = getHistory(); a.unshift(h); store.set("history", a.slice(0, 500)); };
const getSettings = () => store.get("settings", { theme: "light", goal: "增肌", rest: 75 });
const setSetting = (k, v) => { const s = getSettings(); s[k] = v; store.set("settings", s); };

/* ---------------- 数据访问 ---------------- */
const DB = () => window.DB || { exercises: [] };
const EX = id => DB().exercises.find(e => e.id === id);
const exImg = (e) => e ? (e.gif || "") : "";
const thumbImg = (e) => e ? (e.thumb || e.gif || "") : "";
const errImg = `this.onerror=null;this.removeAttribute('src');this.style.display='none';`;

/* 无详细内容的动作 -> 按部位给通用指导（大白话） */
const GENERIC = {
  "胸": { steps: ["调整好姿势坐稳或躺稳，双脚踩实地面", "双手握好器械，握距略宽于肩膀", "把重量慢慢放下来，感觉到胸部被拉开", "发力把重量推回去，推到顶时胸肌收紧", "做完一组，休息一会儿再做下一组"], tips: ["发力时呼气，放下时吸气", "肩膀往下沉，不要耸肩", "腰背贴紧凳子，不要悬空"], mistakes: ["重量太大，动作变形", "耸肩借力，肩膀疼", "速度快到失控，砸下去"] },
  "背": { steps: ["坐稳或站稳，双手握好把手/杆子", "肩膀先下沉，背部绷住", "用手肘带动，把重量往身体方向拉", "拉到顶时，感觉后背中间夹紧", "慢慢放回去，别让重量一下子拽回去"], tips: ["想着用手肘发力，不是用手抓", "身体不要前后晃太多", "背部发力时可以稍微憋一口气"], mistakes: ["用手臂硬拽，背部没感觉", "身体甩来甩去借力", "耸肩，脖子酸"] },
  "肩": { steps: ["站直或坐直，收腹挺胸", "双手握好器械，手肘略微弯曲", "把重量往目标方向推或举起来", "举到顶时肩膀收紧一下", "慢慢放回原位，全程控制住"], tips: ["重量宁轻勿重，肩膀容易受伤", "不要耸肩，脖子放松", "手腕保持平直，别往后塌"], mistakes: ["重量太大靠身体晃", "举太高伤肩膀", "手肘锁死"] },
  "手臂": { steps: ["站稳或坐稳，手肘固定在身体两侧", "双手握好器械", "慢慢弯起或推下，只有小臂在动", "到顶时肌肉收紧一下", "慢慢放回去，放到接近伸直"], tips: ["手肘夹紧不要乱飞", "速度放慢，感受肌肉发力", "两边次数一样，别练歪"], mistakes: ["身体前后晃借力", "手肘大幅移动", "放下去太快失控"] },
  "腿": { steps: ["调整器械到合适高度，坐稳或站好", "双脚踩实，与肩同宽或稍宽", "腰背挺直，核心收紧", "蹲下或发力时膝盖和脚尖方向一致", "站直或推起时腿发力，顶住一下再慢慢还原"], tips: ["膝盖别往内扣", "重量放在全脚掌，脚跟别离地", "腰背始终挺直，别弓腰"], mistakes: ["膝盖内扣，容易伤膝盖", "弯腰弓背", "蹲太深腰弯了，或太浅没效果"] },
  "臀": { steps: ["双脚踩稳，与肩同宽", "核心收紧，腰背挺直", "屁股往后坐/往上顶，感觉臀部收紧", "顶到最高点停一下，臀部夹紧", "慢慢还原，别完全放松"], tips: ["发力靠臀部，不是靠腰", "下巴微收，目视前方", "做之前先把臀部激活（可以做几组臀桥）"], mistakes: ["用腰代偿，练完腰酸", "膝盖内扣", "动作幅度太小没感觉"] },
  "核心": { steps: ["躺好或撑好，腰背贴地/身体成一条线", "收紧肚子，像有人要打你肚子一样", "按动作要求卷起、抬起或保持", "全程保持呼吸，不要憋死", "做完一组慢速还原休息"], tips: ["用肚子发力，不是用脖子拽", "腰不舒服就减小幅度", "宁少次数标准，多次数变形"], mistakes: ["用手拉头，脖子酸", "腰塌下去悬空", "憋气做完全程"] },
  "前臂": { steps: ["坐稳或站稳，前臂放在腿上或凳上", "手腕悬空，握好器械", "手腕慢慢卷起或放下", "顶点停一下，感受前臂发力", "慢慢还原，做完一组"], tips: ["幅度不用大，感觉对最重要", "重量轻一点，前臂容易累", "练完甩甩手放松"], mistakes: ["手臂大幅移动借力", "重量太大手腕疼", "速度太快没感觉"] },
  "小腿": { steps: ["前脚掌踩在踏板/台阶上，脚跟悬空", "扶稳保持平衡", "脚跟尽量往上提，小腿收紧", "顶点停 1 秒", "慢慢放下，感觉小腿被拉伸"], tips: ["幅度做满：最低拉伸、最高收紧", "速度放慢，别弹跳借力", "次数可以多一些（15-20次）"], mistakes: ["幅度太小没效果", "用反弹惯性做", "膝盖乱晃"] },
  "颈": { steps: ["头慢慢向一侧倾，用手轻压加大幅度", "感觉脖子侧面被拉开", "保持 15-30 秒，正常呼吸", "换另一边", "动作要慢，幅度宁小勿大"], tips: ["动作放慢，绝不发力对抗", "幅度以舒适为准", "肩膀放松下沉"], mistakes: ["用力掰头", "动作太快", "幅度大到疼痛"] },
  "有氧": { steps: ["开始前慢速热身 3-5 分钟", "保持中等强度：能说话但有点喘", "过程中保持稳定节奏", "结束前再慢 3-5 分钟让心率降下来", "练完拉伸一下腿"], tips: ["循序渐进，别一上来就猛冲", "有点喘但还能说话就是合适的强度", "记得喝水，少量多次"], mistakes: ["空腹猛练头晕", "强度太大坚持不了", "结束后马上坐下"] },
  "全身": { steps: ["先做 5 分钟热身", "按动作要领规范完成每个动作", "动作之间留够休息", "全程注意呼吸节奏", "结束后拉伸放松"], tips: ["新手从轻重量开始", "有任何疼痛马上停", "保持动作标准比重量重要"], mistakes: ["不热身直接上大重量", "动作变形硬撑", "练太勤不休息"] },
};
const LEVEL_TAG = { "初级": "g", "中级": "o", "高级": "r" };

/* 组次建议引擎：目标 x 难度/部位 */
function suggestSets(ex, goal) {
  if (ex.cat === "有氧" || ex.part === "有氧") {
    if (goal === "力量") return { sets: "—", reps: "20-30分钟", rest: "—" };
    if (goal === "耐力") return { sets: "—", reps: "30-45分钟", rest: "—" };
    return { sets: "—", reps: "20-40分钟", rest: "—" };
  }
  const hard = ex.level === "高级" || /深蹲|硬拉|卧推|挺举|抓举|bench|squat|deadlift|press|clean|jerk/i.test(ex.nameEn || "");
  if (goal === "力量") return { sets: hard ? "4-5组" : "4组", reps: hard ? "3-6次" : "6-8次", rest: "2-3分钟" };
  if (goal === "耐力") return { sets: "3组", reps: "15-20次", rest: "30-45秒" };
  return { sets: hard ? "4-5组" : "3-4组", reps: "8-12次", rest: "60-90秒" }; // 增肌
}
function restSeconds(restStr) {
  if (!restStr) return 75;
  const m = String(restStr).match(/(\d+)/);
  if (!m) return 75;
  let n = +m[1];
  if (/分钟/.test(restStr)) n *= 60;
  return n;
}

/* ---------------- 路由 ---------------- */
const routes = [];
function route() {
  let h = location.hash.replace(/^#/, "");
  if (!h || h === "/") h = "/home";
  const [pathPart, queryPart] = h.split("?");
  const seg = pathPart.split("/").filter(Boolean);
  window.scrollTo(0, 0);
  closeWorkoutIfStale();
  const name = seg[0] || "home";
  document.body.classList.toggle("detail-mode", name === "detail");
  if (name === "home") return renderHome();
  if (name === "library") return renderLibrary(queryPart);
  if (name === "detail") return renderDetail(seg[1]);
  if (name === "plans") return renderPlans();
  if (name === "plan") return renderPlanDetail(seg[1]);
  if (name === "log") return renderLog();
  if (name === "me") return renderMe();
  if (name === "tools") return renderTools();
  renderHome();
}
window.addEventListener("hashchange", route);

function setTopbar(title, showBack, showSearch) {
  $("#topbar-title").textContent = title;
  $("#btn-back").classList.toggle("hidden", !showBack);
  $("#btn-search-jump").classList.toggle("hidden", !showSearch);
}
function setTab(name) {
  $$("#tabbar a").forEach(a => a.classList.toggle("active", a.dataset.tab === name));
}
$("#btn-back").addEventListener("click", () => history.length > 1 ? history.back() : (location.hash = "#/home"));
$("#btn-search-jump").addEventListener("click", () => { location.hash = "#/library"; setTimeout(() => { const i = $("#q"); i && i.focus(); }, 60); });

/* ---------------- 首页 ---------------- */
function renderHome() {
  setTopbar("铁馆伴侣", false, true); setTab("home");
  const hist = getHistory();
  const streak = calcStreak(hist);
  const weekN = countThisWeek(hist);
  const totalN = hist.length;
  const today = todayPlan();

  const partIcons = DB().partsIcons || { "胸": "🫁", "背": "🔙", "肩": "🤷", "手臂": "💪", "腿": "🦵", "臀": "🍑", "核心": "🎯", "有氧": "🏃", "全身": "🧍", "颈": "🧣" };
  const parts = DB().partsList || [];
  const tips = [
    ["✅", "空杆先学动作，动作稳了再加重量", "good"],
    ["✅", "大重量一定找人保护，别自己硬上", "good"],
    ["❌", "练完不作拉伸、猛喝冰水", "bad"],
    ["❌", "关节刺痛还硬练 —— 疼就停", "bad"],
  ];
  $("#view").innerHTML = `
    <div class="hero">
      <h2>${greet()}，练起来！💪</h2>
      <p>坚持记录，进步看得见</p>
      <div class="hero-stats">
        <div class="hs"><b>${streak}</b><span>连续打卡(天)</span></div>
        <div class="hs"><b>${weekN}</b><span>本周训练</span></div>
        <div class="hs"><b>${totalN}</b><span>累计次数</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-t">📍 今天练哪里 <span class="more">${WEEKCN[new Date().getDay()]}推荐</span></div>
      <div id="today-list"></div>
      <button class="btn small" style="margin-top:10px" id="btn-today-go">▶ 一键开练（${today.length}个动作）</button>
    </div>

    <div class="sec-title">按部位找动作</div>
    <div class="home-grid">
      ${parts.map(p => `<a class="hg" href="#/library?part=${encodeURIComponent(p)}"><div class="e">${partIcons[p] || "🏋️"}</div><div class="n">${p}</div></a>`).join("")}
    </div>

    <div class="sec-title">快捷入口</div>
    <div class="home-grid" style="grid-template-columns:repeat(4,1fr)">
      <a class="hg" href="#/tools"><div class="e">⏱️</div><div class="n">计时器</div></a>
      <a class="hg" href="#/tools"><div class="e">🔥</div><div class="n">HIIT</div></a>
      <a class="hg" href="#/plans"><div class="e">📋</div><div class="n">训练计划</div></a>
      <a class="hg" href="#/log"><div class="e">📊</div><div class="n">训练统计</div></a>
    </div>

    <div class="card">
      <div class="card-t">🚨 新手安全红线</div>
      ${tips.map(t => `<div class="ob ${t[2]}" style="display:flex;gap:8px;padding:6px 0;font-size:13.5px"><span>${t[0]}</span><span>${t[1]}</span></div>`).join("")}
    </div>
  `;
  // 今日推荐渲染
  const tl = $("#today-list");
  tl.innerHTML = today.slice(0, 4).map((ex, i) => `
    <div class="today-card" data-id="${ex.id}">
      <img class="ex-img" src="${thumbImg(ex)}" onerror="${errImg}">
      <div class="ti"><b>${i + 1}. ${esc(ex.name)}</b><span>${esc(ex.muscles.join("、"))} · ${esc(ex.equip)}</span></div>
      <div style="color:var(--txt3)">›</div>
    </div>`).join("") || `<div class="empty">暂无推荐</div>`;
  $$(".today-card", tl).forEach(c => c.addEventListener("click", () => location.hash = "#/detail/" + c.dataset.id));
  $("#btn-today-go").addEventListener("click", () => startWorkout(today.map(ex => ({ id: ex.id, sets: 4, reps: "8-12", rest: getSettings().rest })), "今日推荐"));
}

function greet() { const h = new Date().getHours(); return h < 6 ? "夜猫子" : h < 11 ? "早上好" : h < 14 ? "中午好" : h < 18 ? "下午好" : "晚上好"; }

function countThisWeek(hist) {
  const now = new Date(); const day = (now.getDay() + 6) % 7; // 周一为一周开始
  const monday = new Date(now); monday.setDate(now.getDate() - day); monday.setHours(0, 0, 0, 0);
  return hist.filter(h => new Date(h.t) >= monday).length;
}
function calcStreak(hist) {
  if (!hist.length) return 0;
  const days = new Set(hist.map(h => todayStr(h.t)));
  let d = new Date(); let streak = 0;
  if (!days.has(todayStr(d))) { d.setDate(d.getDate() - 1); if (!days.has(todayStr(d))) return 0; }
  while (days.has(todayStr(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}
function todayPlan() {
  const day = new Date().getDay(); // 0周日
  const conf = {
    1: { kw: ["胸"], extra: "三头" }, 2: { kw: ["背"], extra: "二头" }, 3: { kw: ["腿", "臀"] },
    4: { kw: ["核心", "有氧"] }, 5: { kw: ["肩"] }, 6: { kw: ["手臂"], extra: "核心" },
    0: { kw: ["全身", "胸", "背", "腿"] },
  }[day];
  const pool = DB().exercises.filter(e => conf.kw.some(k => e.part === k || e.parts.includes(k)));
  const extra = conf.extra ? DB().exercises.filter(e => e.part === conf.extra) : [];
  const picks = [];
  const used = new Set();
  const pick = (arr) => { for (const e of arr) { if (!used.has(e.id) && picks.length < 5) { picks.push(e); used.add(e.id); return; } } };
  // 优先挑器械大动作
  conf.kw.forEach(k => {
    const w = pool.filter(e => e.part === k || e.parts.includes(k));
    pick(w.filter(e => /杠铃|哑铃|复合|器械/.test(e.equip)));
    pick(w);
  });
  if (extra.length) { pick(extra.filter(e => /绳索|哑铃|器械/.test(e.equip))); pick(extra); }
  return picks.slice(0, 5);
}

/* ---------------- 动作库 ---------------- */
const libState = { q: "", part: "", equip: "", level: "", page: 1, per: 30 };
function renderLibrary(queryPart) {
  setTopbar("动作库", false, true); setTab("library");
  const params = new URLSearchParams(queryPart || "");
  if (params.get("part")) libState.part = params.get("part");
  const parts = DB().partsList || [];
  const equips = DB().equipList || [];
  $("#view").innerHTML = `
    <div class="search-box"><span class="si">⌕</span>
      <input id="q" type="text" placeholder="搜动作 / 肌肉 / 器械，如：卧推" value="${esc(libState.q)}"></div>
    <div class="chips" id="part-chips">
      <span class="chip ${!libState.part ? "on" : ""}" data-v="">全部</span>
      ${parts.map(p => `<span class="chip ${libState.part === p ? "on" : ""}" data-v="${esc(p)}">${esc(p)}</span>`).join("")}
    </div>
    <div class="filter-row">
      <select id="f-equip"><option value="">全部器械</option>${equips.map(e => `<option ${libState.equip === e ? "selected" : ""} value="${esc(e)}">${esc(e)}</option>`).join("")}</select>
      <select id="f-level"><option value="">全部难度</option>${["初级", "中级", "高级"].map(l => `<option ${libState.level === l ? "selected" : ""} value="${l}">${l}</option>`).join("")}</select>
    </div>
    <div id="ex-list"></div>
    <button class="load-more hidden" id="more">加载更多 ↓</button>
  `;
  $("#q").addEventListener("input", debounce(() => { libState.q = $("#q").value.trim(); libState.page = 1; paintList(); }, 200));
  $$("#part-chips .chip").forEach(c => c.addEventListener("click", () => {
    libState.part = c.dataset.v; libState.page = 1;
    $$("#part-chips .chip").forEach(x => x.classList.toggle("on", x === c)); paintList();
  }));
  $("#f-equip").addEventListener("change", e => { libState.equip = e.target.value; libState.page = 1; paintList(); });
  $("#f-level").addEventListener("change", e => { libState.level = e.target.value; libState.page = 1; paintList(); });
  $("#more").addEventListener("click", () => { libState.page++; paintList(); });
  paintList();
}
function filtered() {
  const q = libState.q.toLowerCase();
  return DB().exercises.filter(e =>
    (!libState.part || e.part === libState.part || e.parts.includes(libState.part)) &&
    (!libState.equip || e.equip === libState.equip) &&
    (!libState.level || e.level === libState.level) &&
    (!q || (e.name + " " + e.nameEn + " " + e.muscles.join(" ") + " " + e.equip + " " + e.parts.join(" ")).toLowerCase().includes(q))
  );
}
function paintList() {
  const all = filtered();
  const show = all.slice(0, libState.page * libState.per);
  const list = $("#ex-list");
  list.innerHTML = show.map(e => `
    <div class="ex-item" data-id="${e.id}">
      <img class="ex-img" loading="lazy" src="${thumbImg(e)}" onerror="${errImg}">
      <div class="ei">
        <b>${esc(e.name)}</b>
        <div class="m">${esc(e.muscles.join("、"))} · ${esc(e.equip)}</div>
        <div class="tags"><span class="tag p">${esc(e.part)}</span><span class="tag ${LEVEL_TAG[e.level] || ""}">${e.level}</span>${hasCurated(e) ? '<span class="tag g">详解</span>' : ""}</div>
      </div>
      <button class="fav-btn ${isFav(e.id) ? "on" : ""}" data-fav="${e.id}">${isFav(e.id) ? "★" : "☆"}</button>
    </div>`).join("") || `<div class="empty"><div class="big">🔍</div>没找到，换个词试试</div>`;
  $("#more").classList.toggle("hidden", all.length <= show.length);
  $$(".ex-item", list).forEach(it => it.addEventListener("click", ev => {
    if (ev.target.closest("[data-fav]")) return;
    location.hash = "#/detail/" + it.dataset.id;
  }));
  $$("[data-fav]", list).forEach(b => b.addEventListener("click", () => {
    const on = toggleFav(b.dataset.fav);
    b.classList.toggle("on", on); b.textContent = on ? "★" : "☆";
    toast(on ? "已收藏" : "已取消收藏");
  }));
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function hasCurated(e) { return !!(window.CURATED_BY_KEY && CURATED_BY_KEY[(e.nameEn || "").toLowerCase()] || (window.CURATED && CURATED[e.id])); }
function getCurated(e) {
  if (window.CURATED && CURATED[e.id]) return CURATED[e.id];
  if (window.CURATED_BY_KEY) { const c = CURATED_BY_KEY[(e.nameEn || "").toLowerCase()]; if (c) return c; }
  return null;
}

/* ---------------- 动作详情 ---------------- */
let detailGoal = null;
function renderDetail(id) {
  const e = EX(id);
  if (!e) { $("#view").innerHTML = `<div class="empty">动作不存在</div>`; setTopbar("详情", true); setTab(""); return; }
  setTab(""); setTopbar("动作详情", true, false);
  detailGoal = detailGoal || getSettings().goal;
  const c = getCurated(e);
  const g = suggestSets(e, detailGoal);
  const generic = GENERIC[e.part] || GENERIC["全身"];
  const steps = (c && c.steps) || generic.steps;
  const tips = (c && c.tips) || generic.tips;
  const mistakes = (c && c.mistakes) || generic.mistakes;
  const breathing = (c && c.breathing) || "发力时呼气，还原时吸气，全程别憋气。";
  const related = DB().exercises.filter(x => x.part === e.part && x.id !== e.id).slice(0, 8);
  const hist = getHistory().filter(h => h.items && h.items.some(i => i.exId === e.id)).length;

  $("#view").innerHTML = `
    <div class="detail-gif">
      ${e.gif ? `<img src="${e.gif}" onerror="${errImg}">` : `<div class="gif-fallback">暂无演示图</div>`}
    </div>
    <div class="detail-name">${esc(e.name)}</div>
    <div class="detail-en">${esc(e.nameEn)}　${hist ? `· 你练过 ${hist} 次` : ""}</div>
    <div style="margin-bottom:12px">
      <span class="tag p">${esc(e.part)}</span>
      <span class="tag ${LEVEL_TAG[e.level] || ""}">${e.level}</span>
      <span class="tag b">🛠 ${esc(e.equip)}</span>
      ${c ? '<span class="tag g">✓ 教练详解</span>' : ""}
    </div>

    <div class="card">
      <div class="card-t">🎯 锻炼哪里</div>
      <div class="info-grid">
        <div class="ig"><div class="k">主要目标肌群</div><div class="v">${esc(e.muscles.join("、")) || "—"}</div></div>
        <div class="ig"><div class="k">身体部位</div><div class="v">${esc(e.parts.join("、"))}</div></div>
        <div class="ig"><div class="k">需要器械</div><div class="v">${esc(e.equip)}</div></div>
        <div class="ig"><div class="k">动作类型</div><div class="v">${esc(e.force || "—")}</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-t">🔢 练几组？练几次？</div>
      <div class="goal-switch">
        ${["增肌", "力量", "耐力"].map(x => `<button class="${detailGoal === x ? "on" : ""}" data-goal="${x}">${x}${x === "增肌" ? "(推荐)" : ""}</button>`).join("")}
      </div>
      <div class="sr-line">
        <div class="sr"><b>${g.sets}</b><span>组数</span></div>
        <div class="sr"><b>${g.reps}</b><span>每组次数</span></div>
        <div class="sr"><b>${g.rest}</b><span>组间休息</span></div>
      </div>
      <div style="font-size:12px;color:var(--txt3);margin-top:9px">💡 增肌=练大块头；力量=举更重；耐力=更持久不易累。有疼痛就减量。</div>
    </div>

    <div class="card">
      <div class="card-t">📖 怎么练（${steps.length} 步）</div>
      <ol class="step-list">${steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
      <div style="margin-top:10px;background:var(--blue-soft);border-radius:10px;padding:10px 12px;font-size:13px">
        🫁 <b>呼吸</b>：${esc(breathing)}
      </div>
    </div>

    <div class="card">
      <div class="card-t">✅❌ 对错要点</div>
      <div class="ok-bad">
        ${tips.map(t => `<div class="ob good"><span class="ic">✅</span><span>${esc(t)}</span></div>`).join("")}
        ${mistakes.map(t => `<div class="ob bad"><span class="ic">❌</span><span>${esc(t)}</span></div>`).join("")}
      </div>
    </div>

    ${related.length ? `
    <div class="card">
      <div class="card-t">🔄 换着练（同部位）</div>
      <div class="chips">${related.map(r => `<a class="chip" href="#/detail/${r.id}">${esc(r.name)}</a>`).join("")}</div>
    </div>` : ""}

    <div style="height:64px"></div>
  `;
  const bar = document.createElement("div");
  bar.className = "detail-actions";
  bar.innerHTML = `
    <button class="btn ghost small" style="flex:0 0 auto" id="d-fav">${isFav(e.id) ? "★ 已收藏" : "☆ 收藏"}</button>
    <button class="btn ghost small" style="flex:0 0 auto" id="d-plan">＋ 加入计划</button>
    <button class="btn small" style="flex:1" id="d-go">▶ 立即开练</button>
  `;
  $("#view").appendChild(bar);
  $("#d-fav").addEventListener("click", () => { const on = toggleFav(e.id); $("#d-fav").textContent = on ? "★ 已收藏" : "☆ 收藏"; toast(on ? "已收藏" : "已取消"); });
  $("#d-go").addEventListener("click", () => startWorkout([{ id: e.id, sets: 4, reps: g.reps, rest: restSeconds(g.rest) }], e.name));
  $("#d-plan").addEventListener("click", () => openAddToPlan(e, g));
  $$(".goal-switch button").forEach(b => b.addEventListener("click", () => {
    detailGoal = b.dataset.goal; setSetting("goal", detailGoal); renderDetail(id);
  }));
}

/* 加入计划弹窗 */
function openAddToPlan(e, g) {
  const plans = getPlans();
  openSheet(`
    <div class="mt">加入训练计划</div>
    ${plans.length ? `
      <div class="sec-title">选择已有计划</div>
      ${plans.map(p => `<button class="btn ghost small" style="width:100%;margin-bottom:8px;justify-content:flex-start" data-add="${p.id}">📋 ${esc(p.name)}（${p.items.length}个动作）</button>`).join("")}` : `<div class="empty" style="padding:18px">还没有计划，新建一个吧</div>`}
    <div class="mrow">
      <button class="btn ghost small" id="new-plan">＋ 新建计划并加入</button>
    </div>
  `);
  $$("[data-add]").forEach(b => b.addEventListener("click", () => {
    const plans = getPlans();
    const p = plans.find(x => x.id === b.dataset.add);
    if (!p) return;
    p.items.push({ id: e.id, sets: 4, reps: g.reps, rest: restSeconds(g.rest) });
    savePlans(plans); closeSheet(); toast("已加入「" + p.name + "」");
  }));
  $("#new-plan").addEventListener("click", () => {
    const name = prompt("给计划起个名字：", detailGoal + " · " + e.part);
    if (!name) return;
    const p = { id: uid(), name, emoji: "📋", items: [{ id: e.id, sets: 4, reps: g.reps, rest: restSeconds(g.rest) }] };
    plans.unshift(p); savePlans(plans); closeSheet(); toast("已创建并加入");
  });
}

/* ---------------- 计划 ---------------- */
const TEMPLATES = [
  { name: "新手全身适应", emoji: "🌱", desc: "适合头两个月，学动作打基础", items: [
    { m: /深蹲|squat/i, sets: 3, reps: "10-12", rest: 90 }, { m: /卧推|bench press/i, sets: 3, reps: "8-10", rest: 90 },
    { m: /高位下拉|lat pulldown/i, sets: 3, reps: "10-12", rest: 90 }, { m: /肩上推举|overhead press|shoulder press/i, sets: 3, reps: "10-12", rest: 90 },
    { m: /平板支撑|plank/i, sets: 3, reps: "30-45秒", rest: 60 }] },
  { name: "胸肩三头日", emoji: "🫁", desc: "推力日：胸+肩+三头", items: [
    { m: /卧推|bench press/i, sets: 4, reps: "8-12", rest: 90 }, { m: /上斜|incline/i, sets: 3, reps: "8-12", rest: 90 },
    { m: /飞鸟|fly/i, sets: 3, reps: "12-15", rest: 60 }, { m: /肩(上)?推举|overhead|shoulder press/i, sets: 4, reps: "8-12", rest: 90 },
    { m: /侧平举|lateral raise/i, sets: 4, reps: "12-15", rest: 60 }, { m: /三头|triceps/i, sets: 3, reps: "10-15", rest: 60 }] },
  { name: "背二头日", emoji: "🔙", desc: "拉力日：背+二头", items: [
    { m: /引体|pull[- ]?up/i, sets: 4, reps: "6-10", rest: 120 }, { m: /划船|row/i, sets: 4, reps: "8-12", rest: 90 },
    { m: /高位下拉|lat pulldown/i, sets: 3, reps: "10-12", rest: 90 }, { m: /直臂下压|pullover/i, sets: 3, reps: "12-15", rest: 60 },
    { m: /弯举|curl/i, sets: 4, reps: "10-15", rest: 60 }] },
  { name: "腿臀核心日", emoji: "🦵", desc: "下肢日：腿+臀+核心", items: [
    { m: /深蹲|squat/i, sets: 4, reps: "8-12", rest: 120 }, { m: /腿举|press.*leg|leg press/i, sets: 4, reps: "10-12", rest: 90 },
    { m: /硬拉|deadlift/i, sets: 3, reps: "8-10", rest: 120 }, { m: /腿弯举|leg curl/i, sets: 3, reps: "12-15", rest: 60 },
    { m: /臀桥|hip thrust|glute bridge/i, sets: 4, reps: "12-15", rest: 60 }, { m: /卷腹|crunch/i, sets: 3, reps: "15-20", rest: 45 }] },
  { name: "减脂燃脂循环", emoji: "🔥", desc: "动起来就瘦：全身循环+有氧", items: [
    { m: /深蹲|squat/i, sets: 3, reps: "15-20", rest: 40 }, { m: /俯卧撑|push[- ]?up/i, sets: 3, reps: "12-15", rest: 40 },
    { m: /划船|row/i, sets: 3, reps: "15-20", rest: 40 }, { m: /卷腹|crunch/i, sets: 3, reps: "20", rest: 30 },
    { m: /跑步机|treadmill|跑步/i, sets: 1, reps: "25-35分钟", rest: 0 }] },
  { name: "手臂专项日", emoji: "💪", desc: "二头+三头专项轰炸", items: [
    { m: /站姿.*弯举|barbell curl|bar.*curl/i, sets: 4, reps: "8-12", rest: 75 }, { m: /锤式弯举|hammer curl/i, sets: 3, reps: "10-12", rest: 60 },
    { m: /绳索下压|triceps pushdown|pushdown/i, sets: 4, reps: "10-15", rest: 60 }, { m: /仰卧臂屈伸|skull|lying triceps/i, sets: 3, reps: "10-12", rest: 75 },
    { m: /弯举.*反手|reverse curl/i, sets: 3, reps: "12-15", rest: 60 }] },
];
function resolveTemplate(t) {
  const items = [];
  for (const it of t.items) {
    const ex = DB().exercises.find(e => it.m.test(e.name) || it.m.test(e.nameEn));
    if (ex) items.push({ id: ex.id, sets: it.sets, reps: it.reps, rest: it.rest });
  }
  return items;
}

function renderPlans() {
  setTopbar("训练计划", false, false); setTab("plans");
  const plans = getPlans();
  $("#view").innerHTML = `
    <button class="btn" id="new-plan">＋ 新建计划</button>
    <div class="sec-title">我的计划（${plans.length}）</div>
    <div id="my-plans">${plans.map(p => planCard(p, true)).join("") || `<div class="empty"><div class="big">📋</div>还没有自己的计划，从下面模板挑一个吧</div>`}</div>
    <div class="sec-title">官方模板（一键添加）</div>
    ${TEMPLATES.map((t, i) => {
      const n = resolveTemplate(t).length;
      return `<div class="plan-card">
        <div class="ph"><div class="p-ico">${t.emoji}</div><div><b>${t.name}</b><span>${t.desc}</span></div></div>
        <div class="pm">${n} 个动作 · 覆盖约 ${[...new Set(resolveTemplate(t).map(it => (EX(it.id) || {}).part))].join("/")}　${n ? "" : "（素材缺失）"}</div>
        ${n ? `<div class="pb"><button class="btn small" data-tp="${i}" style="flex:1">使用此模板</button></div>` : ""}
      </div>`;
    }).join("")}
  `;
  $("#new-plan").addEventListener("click", () => openPlanEditor(null));
  $$("[data-tp]").forEach(b => b.addEventListener("click", () => {
    const t = TEMPLATES[+b.dataset.tp];
    const items = resolveTemplate(t);
    if (!items.length) return toast("模板动作在素材里没找到");
    const plans = getPlans();
    if (plans.some(p => p.name === t.name)) { toast("已存在同名计划"); return; }
    plans.unshift({ id: uid(), name: t.name, emoji: t.emoji, desc: t.desc, items });
    savePlans(plans); toast("已添加到我的计划"); renderPlans();
  }));
  bindPlanCards();
}
function planCard(p, brief) {
  const parts = [...new Set(p.items.map(i => (EX(i.id) || {}).part).filter(Boolean))];
  const est = p.items.reduce((s, i) => s + i.sets * 45 + i.rest, 0);
  return `<div class="plan-card" data-pid="${p.id}">
    <div class="ph"><div class="p-ico">${p.emoji || "📋"}</div>
      <div><b>${esc(p.name)}</b><span>${p.items.length} 个动作 · 约 ${Math.round(est / 60)} 分钟 · ${parts.join("/") || "—"}</span></div></div>
    ${brief ? "" : `<div class="pm" style="margin-top:10px">${p.desc || ""}</div>
      <div id="plan-items">${p.items.map((i, idx) => {
        const e = EX(i.id); if (!e) return "";
        return `<div class="plan-item">
          <img loading="lazy" src="${exImg(e)}" onerror="${errImg}">
          <div class="pi"><b>${idx + 1}. ${esc(e.name)}</b><span>${i.sets} 组 × ${esc(i.reps)} · 休 ${i.rest}s</span></div>
          <button class="del" data-up="${idx}" title="上移">▲</button>
          <button class="del" data-edit="${idx}" title="编辑">✎</button>
          <button class="del" data-rm="${idx}" title="移除">✕</button>
        </div>`;
      }).join("")}</div>`}
    <div class="pb">
      ${brief ? `<a class="btn ghost small" href="#/plan/${p.id}" style="flex:1">查看</a>` : ""}
      ${p.items.length ? `<button class="btn small" data-start="${p.id}" style="flex:2">▶ 开始训练</button>` : ""}
    </div>
  </div>`;
}
function bindPlanCards() {
  $$("[data-start]").forEach(b => b.addEventListener("click", () => {
    const p = getPlans().find(x => x.id === b.dataset.start);
    startWorkout(p.items, p.name);
  }));
  $$("[data-rm]").forEach(b => b.addEventListener("click", () => {
    const pid = b.closest("[data-pid]").dataset.pid;
    const p = getPlans().find(x => x.id === pid); const i = +b.dataset.rm;
    p.items.splice(i, 1); savePlans(getPlans()); renderPlanDetail(pid);
  }));
  $$("[data-up]").forEach(b => b.addEventListener("click", () => {
    const pid = b.closest("[data-pid]").dataset.pid;
    const p = getPlans().find(x => x.id === pid); const i = +b.dataset.up;
    if (i > 0) { [p.items[i - 1], p.items[i]] = [p.items[i], p.items[i - 1]]; savePlans(getPlans()); renderPlanDetail(pid); }
  }));
  $$("[data-edit]").forEach(b => b.addEventListener("click", () => {
    const pid = b.closest("[data-pid]").dataset.pid;
    const p = getPlans().find(x => x.id === pid); const i = +b.dataset.edit;
    openEditItem(p, i);
  }));
}
function renderPlanDetail(pid) {
  const p = getPlans().find(x => x.id === pid);
  if (!p) { location.hash = "#/plans"; return; }
  setTab("plans"); setTopbar(p.name, true, false);
  const est = p.items.reduce((s, i) => s + i.sets * 45 + i.rest, 0);
  $("#view").innerHTML = `
    <div class="card"><div class="pm">${p.desc || "我的自定义计划"} · ${p.items.length} 个动作 · 约 ${Math.round(est / 60)} 分钟</div></div>
    <div class="card" style="padding:6px 14px">
      <div id="plan-items">${p.items.map((i, idx) => {
        const e = EX(i.id); if (!e) return "";
        return `<div class="plan-item">
          <img loading="lazy" src="${exImg(e)}" onerror="${errImg}">
          <div class="pi"><b>${idx + 1}. ${esc(e.name)}</b><span>${i.sets} 组 × ${esc(i.reps)} · 休 ${i.rest}s</span></div>
          <button class="del" data-up="${idx}">▲</button>
          <button class="del" data-edit="${idx}">✎</button>
          <button class="del" data-rm="${idx}">✕</button>
        </div>`;
      }).join("") || `<div class="empty">还没有动作，去添加</div>`}
      </div>
      <button class="btn ghost small" id="add-ex" style="margin:10px 0 6px">＋ 添加动作</button>
    </div>
    ${p.items.length ? `<button class="btn" data-start="${p.id}">▶ 开始训练</button>` : ""}
    <button class="btn ghost" id="rename" style="margin-top:9px">✎ 修改计划名称</button>
    <button class="btn ghost" id="del-plan" style="margin-top:9px">🗑 删除计划</button>
  `;
  $("#add-ex").addEventListener("click", () => openExercisePicker(list => {
    list.forEach(x => p.items.push(x)); savePlans(getPlans()); renderPlanDetail(pid);
  }));
  $("#rename").addEventListener("click", () => {
    const n = prompt("新名称：", p.name); if (!n) return;
    p.name = n; savePlans(getPlans()); renderPlanDetail(pid);
  });
  $("#del-plan").addEventListener("click", () => {
    if (!confirm("确定删除计划「" + p.name + "」？")) return;
    savePlans(getPlans().filter(x => x.id !== pid)); location.hash = "#/plans";
  });
  bindPlanCards();
}
function openEditItem(p, i) {
  const it = p.items[i]; const e = EX(it.id);
  openSheet(`
    <div class="mt">编辑：${esc(e ? e.name : "")}</div>
    <div class="form-3">
      <div class="form-line"><label>组数</label><input id="e-sets" type="number" min="1" max="20" value="${it.sets}"></div>
      <div class="form-line"><label>次数</label><input id="e-reps" type="text" value="${esc(it.reps)}"></div>
      <div class="form-line"><label>休息(秒)</label><input id="e-rest" type="number" min="0" max="600" value="${it.rest}"></div>
    </div>
    <div class="mrow"><button class="btn" id="e-save">保存</button></div>
  `);
  $("#e-save").addEventListener("click", () => {
    it.sets = Math.max(1, +$("#e-sets").value || 1);
    it.reps = $("#e-reps").value.trim() || "10";
    it.rest = Math.max(0, +$("#e-rest").value || 0);
    savePlans(getPlans()); closeSheet(); renderPlanDetail(p.id);
  });
}
function openPlanEditor() {
  openSheet(`
    <div class="mt">新建计划</div>
    <div class="form-line"><label>计划名称</label><input id="np-name" type="text" placeholder="如：我的增肌计划"></div>
    <div class="mrow"><button class="btn" id="np-go">下一步：添加动作</button></div>
  `);
  $("#np-go").addEventListener("click", () => {
    const name = $("#np-name").value.trim();
    if (!name) return toast("先起个名字");
    const plans = getPlans();
    const p = { id: uid(), name, emoji: "📋", items: [] };
    plans.unshift(p); savePlans(plans); closeSheet();
    location.hash = "#/plan/" + p.id;
    setTimeout(() => openExercisePicker(list => {
      const pp = getPlans().find(x => x.id === p.id);
      if (pp) { pp.items.push(...list); savePlans(getPlans()); }
      if (location.hash.includes(p.id)) renderPlanDetail(p.id);
    }), 80);
  });
}
function openExercisePicker(cb) {
  openSheet(`
    <div class="mt">添加动作（可多选）</div>
    <div class="search-box"><span class="si">⌕</span><input id="pk-q" type="text" placeholder="搜索动作"></div>
    <div class="pick-list" id="pk-list"></div>
    <div class="mrow"><button class="btn" id="pk-done">完成（已选 <span id="pk-n">0</span> 个）</button></div>
  `);
  const sel = new Map();
  const paint = () => {
    const q = ($("#pk-q").value || "").toLowerCase();
    const list = DB().exercises.filter(e => !q || (e.name + e.nameEn + e.muscles.join("")).toLowerCase().includes(q)).slice(0, 60);
    $("#pk-list").innerHTML = list.map(e => `
      <div class="pk ${sel.has(e.id) ? "sel" : ""}" data-id="${e.id}">
        <img loading="lazy" src="${thumbImg(e)}" onerror="${errImg}">
        <div><b>${esc(e.name)}</b><span>${esc(e.part)} · ${esc(e.equip)}</span></div>
      </div>`).join("");
    $$("#pk-list .pk").forEach(k => k.addEventListener("click", () => {
      const id = k.dataset.id;
      if (sel.has(id)) sel.delete(id); else sel.set(id, { id, sets: 4, reps: "8-12", rest: 75 });
      k.classList.toggle("sel"); $("#pk-n").textContent = sel.size;
    }));
  };
  paint();
  $("#pk-q").addEventListener("input", debounce(paint, 200));
  $("#pk-done").addEventListener("click", () => { if (!sel.size) return toast("至少选一个动作"); closeSheet(); cb([...sel.values()]); });
}

/* ---------------- 记录/统计 ---------------- */
function renderLog() {
  setTopbar("训练记录", false, false); setTab("log");
  const hist = getHistory();
  const totalSets = hist.reduce((s, h) => s + (h.setsDone || 0), 0);
  const totalDur = hist.reduce((s, h) => s + (h.durSec || 0), 0);
  const partCnt = {};
  hist.forEach(h => { Object.entries(h.parts || {}).forEach(([p, n]) => partCnt[p] = (partCnt[p] || 0) + n); });
  const parts = Object.entries(partCnt).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxP = parts.length ? parts[0][1] : 1;
  $("#view").innerHTML = `
    <div class="card">
      <div class="card-t">📊 总览</div>
      <div class="stat-grid">
        <div class="sg"><b>${hist.length}</b><span>累计训练(次)</span></div>
        <div class="sg"><b>${calcStreak(hist)}</b><span>连续打卡(天)</span></div>
        <div class="sg"><b>${totalSets}</b><span>累计总组数</span></div>
        <div class="sg"><b>${fmtDur(totalDur)}</b><span>累计总时长</span></div>
      </div>
    </div>
    <div class="card">
      <div class="card-t">🔥 打卡日历（近12周）</div>
      ${heatHTML(hist)}
      <div style="display:flex;align-items:center;gap:5px;margin-top:8px;font-size:11px;color:var(--txt3)">少
        <span class="hc" style="width:12px;height:12px;border-radius:3px;display:inline-block;background:var(--card2)"></span>
        <span class="hc" style="width:12px;height:12px;border-radius:3px;display:inline-block;background:#ffd8c2"></span>
        <span class="hc" style="width:12px;height:12px;border-radius:3px;display:inline-block;background:#ffab85"></span>
        <span class="hc" style="width:12px;height:12px;border-radius:3px;display:inline-block;background:#ff7a4d"></span>
        <span class="hc" style="width:12px;height:12px;border-radius:3px;display:inline-block;background:var(--pri)"></span> 多（每天练得越久颜色越深）
      </div>
    </div>
    ${parts.length ? `
    <div class="card">
      <div class="card-t">💪 部位分布（按组数）</div>
      ${parts.map(([p, n]) => `<div class="bar-row"><span class="bl">${esc(p)}</span><div class="btrack"><div class="bfill" style="width:${Math.round(n / maxP * 100)}%"></div></div><span class="bv">${n}组</span></div>`).join("")}
    </div>` : ""}
    <div class="sec-title">历史记录</div>
    <div class="card" style="padding:2px 14px">
      ${hist.slice(0, 30).map(h => {
        const d = new Date(h.t);
        return `<div class="log-item">
          <div class="li-date"><b>${d.getMonth() + 1}/${d.getDate()}</b><span>${WEEKCN[d.getDay()]}</span></div>
          <div class="li-mid"><b>${esc(h.name)}</b><span>${h.setsDone} 组 · ${fmtDur(h.durSec)}</span></div>
          <div style="color:var(--txt3)">›</div>
        </div>`;
      }).join("") || `<div class="empty"><div class="big">🏋️</div>还没有记录，去练一发！</div>`}
    </div>
  `;
}
function heatHTML(hist) {
  const map = {};
  hist.forEach(h => { const d = todayStr(h.t); map[d] = (map[d] || 0) + (h.durSec || 600); });
  const cells = [];
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(end.getDate() - 83); // 12周
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // 对齐周一
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = todayStr(d); const v = map[k] || 0;
    const lv = v === 0 ? 0 : v < 1800 ? 1 : v < 3600 ? 2 : v < 5400 ? 3 : 4;
    cells.push(`<div class="hc ${lv ? "l" + lv : ""}" title="${k}"></div>`);
  }
  return `<div class="heat">${cells.join("")}</div>`;
}

/* ---------------- 我的 ---------------- */
function renderMe() {
  setTopbar("我的", false, false); setTab("me");
  const s = getSettings();
  const favs = getFavs().map(EX).filter(Boolean);
  $("#view").innerHTML = `
    <div class="card" style="padding:6px 14px">
      <div class="sec-title" style="margin-top:8px">⭐ 收藏的动作（${favs.length}）</div>
      ${favs.slice(0, 10).map(e => `<a class="me-row" href="#/detail/${e.id}"><div class="ic">🏋️</div><div class="mt2">${esc(e.name)}<span>${esc(e.part)} · ${esc(e.equip)}</span></div><div class="arr">›</div></a>`).join("") || `<div class="empty" style="padding:16px">去动作库点 ☆ 收藏</div>`}
      ${favs.length > 10 ? `<div class="empty" style="padding:10px">…等 ${favs.length} 个</div>` : ""}
    </div>
    <div class="card" style="padding:6px 14px">
      <div class="me-row" id="m-tools"><div class="ic">⏱️</div><div class="mt2">计时工具<span>组间休息计时 / HIIT 间歇</span></div><div class="arr">›</div></div>
      <div class="me-row" id="m-theme"><div class="ic">🌙</div><div class="mt2">深色模式<span>晚上练不刺眼</span></div><div class="switch ${s.theme === "dark" ? "on" : ""}" id="theme-sw"></div></div>
      <div class="me-row" id="m-export"><div class="ic">📤</div><div class="mt2">导出数据<span>备份我的记录和计划</span></div><div class="arr">›</div></div>
      <div class="me-row" id="m-import"><div class="ic">📥</div><div class="mt2">导入数据<span>从备份文件恢复</span></div><div class="arr">›</div></div>
    </div>
    <div class="card">
      <div class="card-t">ℹ️ 关于</div>
      <div class="about-doc">
        <b>铁馆伴侣 GymMate</b> — 给健身馆伙伴用的动作查询 + 跟练打卡工具。<br>
        · ${DB().exercises.length} 个动作，全中文，配动态演示图<br>
        · 动作数据基于开源项目 exercises-dataset 整理翻译<br>
        · 数据只存在你手机里，不联网、不上传
      </div>
      <button class="btn ghost small" id="m-guide" style="margin-top:10px;width:100%">📖 使用指南</button>
    </div>
  `;
  $("#m-tools").addEventListener("click", () => location.hash = "#/tools");
  $("#m-theme").addEventListener("click", () => {
    const t = getSettings().theme === "dark" ? "light" : "dark";
    setSetting("theme", t); applyTheme(); renderMe();
  });
  $("#m-export").addEventListener("click", exportData);
  $("#m-import").addEventListener("click", importData);
  $("#m-guide").addEventListener("click", () => openSheet(`
    <div class="mt">📖 使用指南（大白话版）</div>
    <div class="about-doc">
      <h4>1️⃣ 想练某个部位？</h4>
      首页点部位（胸/背/腿…）→ 挑一个动作 → 看演示 GIF + 步骤 + 对错要点。<br>
      不认识器械？筛选栏选器械名就能找到对应动作。
      <h4>2️⃣ 不知道练几组几次？</h4>
      每个动作详情页有【练几组】卡片，切换 增肌/力量/耐力 三种目标看建议。
      <h4>3️⃣ 想照着计划练？</h4>
      计划页 → 挑一个官方模板点【使用此模板】→ 点【开始训练】，App 会一个组一个组带你练，组间自动倒计时。
      <h4>4️⃣ 想记录练了什么？</h4>
      跟练结束自动打卡。记录页能看到打卡日历、连续天数、部位分布。
      <h4>5️⃣ 只想要个计时器？</h4>
      首页快捷入口 → 计时器，休息计时、HIIT 间歇都有。
    </div>
  `));
}
function applyTheme() { document.documentElement.dataset.theme = getSettings().theme; }
function exportData() {
  const data = {};
  ["favs", "plans", "history", "settings"].forEach(k => data[k] = store.get(k, null));
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "gymmate-backup-" + todayStr() + ".json";
  a.click(); URL.revokeObjectURL(a.href);
  toast("已导出备份文件");
}
function importData() {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = ".json,application/json";
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        ["favs", "plans", "history", "settings"].forEach(k => { if (d[k]) store.set(k, d[k]); });
        applyTheme(); toast("导入成功"); route();
      } catch (e) { toast("文件格式不对，导入失败"); }
    };
    r.readAsText(f);
  };
  inp.click();
}

/* ---------------- 计时工具 ---------------- */
function renderTools() {
  setTopbar("计时工具", true, false); setTab("");
  $("#view").innerHTML = `
    <div class="card">
      <div class="card-t">⏱️ 组间休息计时</div>
      <div style="font-size:12.5px;color:var(--txt2);margin-bottom:10px">点一下就开始倒计时，结束会响铃</div>
      <div class="chips">
        ${[30, 45, 60, 75, 90, 120, 180].map(s => `<span class="chip" data-rest="${s}">${s < 60 ? s + "秒" : (s / 60) + "分钟"}</span>`).join("")}
      </div>
    </div>
    <div class="card">
      <div class="card-t">🔥 HIIT 间歇计时</div>
      <div class="form-3">
        <div class="form-line"><label>运动(秒)</label><input id="h-work" type="number" value="40"></div>
        <div class="form-line"><label>休息(秒)</label><input id="h-rest" type="number" value="20"></div>
        <div class="form-line"><label>轮数</label><input id="h-rounds" type="number" value="8"></div>
      </div>
      <button class="btn" id="h-start">开始 HIIT</button>
    </div>
  `;
  $$("[data-rest]").forEach(c => c.addEventListener("click", () => startRestTimer(+c.dataset.rest)));
  $("#h-start").addEventListener("click", () => {
    const w = +$("#h-work").value, r = +$("#h-rest").value, n = +$("#h-rounds").value;
    if (!w || !r || !n || n > 50) return toast("填正确的数字");
    startHiit(w, r, n);
  });
}

/* 休息计时器（全屏层） */
let timerState = null;
function startRestTimer(sec, onEnd) {
  const layer = $("#timer-layer");
  layer.classList.remove("hidden");
  layer.innerHTML = `<div class="wk-wrap" style="justify-content:center;text-align:center">
    <div class="sec-title" style="margin-top:0">⏱️ 休息中</div>
    <div class="hiit-screen"><div class="time pulse" id="rt-num">${fmtClock(sec)}</div>
      <div class="round">结束自动响铃</div></div>
    <div class="wk-btns" style="margin-top:30px">
      <button class="btn ok" id="rt-stop">✓ 提前结束休息</button>
      <button class="btn ghost" id="rt-quit">✕ 取消</button>
    </div></div>`;
  let left = sec;
  timerState = setInterval(() => {
    left--;
    const n = $("#rt-num"); if (!n) { clearInterval(timerState); return; }
    n.textContent = fmtClock(left);
    if (left <= 3 && left > 0) beep(1);
    if (left <= 0) { clearInterval(timerState); beep(3); closeTimerLayer(); toast("休息结束，开练！"); onEnd && onEnd(); }
  }, 1000);
  $("#rt-stop").addEventListener("click", () => { clearInterval(timerState); closeTimerLayer(); onEnd && onEnd(); });
  $("#rt-quit").addEventListener("click", () => { clearInterval(timerState); closeTimerLayer(); });
}
function closeTimerLayer() { $("#timer-layer").classList.add("hidden"); $("#timer-layer").innerHTML = ""; timerState = null; }

function startHiit(work, rest, rounds) {
  const layer = $("#timer-layer");
  layer.classList.remove("hidden");
  const st = { round: 1, phase: "work", left: work };
  const paint = () => {
    const isWork = st.phase === "work";
    layer.innerHTML = `<div class="wk-wrap" style="justify-content:center;text-align:center">
      <div class="hiit-screen">
        <div class="phase">${isWork ? "💪 运动！" : "😮‍💨 休息"}</div>
        <div class="time ${!isWork ? "rest pulse" : "pulse"}" id="hh-num">${fmtClock(st.left)}</div>
        <div class="round">第 ${st.round} / ${rounds} 轮</div>
      </div>
      <div class="wk-btns" style="margin-top:26px">
        ${!isWork ? `<button class="btn ok" id="hh-skip">跳过休息 ▶</button>` : `<button class="btn ok" id="hh-skip">进入休息 ▶</button>`}
        <button class="btn ghost" id="hh-quit">✕ 结束</button>
      </div></div>`;
    $("#hh-skip").addEventListener("click", nextPhase);
    $("#hh-quit").addEventListener("click", () => { clearInterval(timerState); closeTimerLayer(); });
  };
  const nextPhase = () => {
    if (st.phase === "work") { st.phase = "rest"; st.left = rest; }
    else { st.round++; if (st.round > rounds) { clearInterval(timerState); closeTimerLayer(); beep(3); toast("HIIT 完成！太棒了"); return; } st.phase = "work"; st.left = work; }
    beep(st.phase === "work" ? 2 : 1); paint();
  };
  paint();
  timerState = setInterval(() => {
    st.left--;
    const n = $("#hh-num"); if (!n) { clearInterval(timerState); return; }
    n.textContent = fmtClock(st.left);
    if (st.left <= 3 && st.left > 0) beep(1);
    if (st.left <= 0) nextPhase();
  }, 1000);
}

/* ---------------- 跟练引擎 ---------------- */
let wk = null; // 当前会话
function startWorkout(items, name) {
  if (!items || !items.length) return toast("计划是空的");
  const valid = items.filter(i => EX(i.id));
  if (!valid.length) return toast("素材里找不到这些动作");
  wk = {
    name, items: valid.map(i => ({ ...i })), exIdx: 0, setIdx: 0,
    done: [], startT: Date.now(), phase: "work", left: 0, timer: null,
  };
  localStorage.setItem("gym_wk", JSON.stringify({ name, items: wk.items }));
  renderWorkout();
}
function restoreWorkout() {
  const raw = localStorage.getItem("gym_wk");
  if (!raw) return false;
  try { const d = JSON.parse(raw); if (d && d.items && d.items.length) { wk = { name: d.name, items: d.items, exIdx: 0, setIdx: 0, done: [], startT: Date.now(), phase: "work", left: 0, timer: null }; return true; } } catch (e) { }
  return false;
}
function closeWorkoutIfStale() { /* 路由切换时保持跟练层不动；无需处理 */ }

function wkCur() { return wk.items[wk.exIdx]; }
function wkTotalSets() { return wk.items.reduce((s, i) => s + i.sets, 0); }
function wkDoneSets() { return wk.done.length; }

function renderWorkout() {
  if (!wk) return;
  const layer = $("#workout-layer");
  layer.classList.remove("hidden");
  const e = EX(wkCur().id);
  const isRest = wk.phase === "rest";
  const c = getCurated(e);
  const generic = GENERIC[e.part] || GENERIC["全身"];
  const tip = (c && c.tips && c.tips[0]) || generic.tips[0];
  const pct = Math.round(wkDoneSets() / wkTotalSets() * 100);

  if (wk.phase === "done") return renderWorkoutDone();

  layer.innerHTML = `<div class="wk-wrap">
    <div class="wk-head">
      <b>${esc(wk.name)}</b>
      <button class="quit" id="wk-quit">✕ 结束</button>
    </div>
    <div class="wk-progress"><div class="wfill" style="width:${pct}%"></div></div>

    ${isRest ? `
      <div class="hiit-screen"><div class="phase">😮‍💨 组间休息</div>
        <div class="time rest pulse" id="wk-num">${fmtClock(wk.left)}</div>
        <div class="round">下一个：${esc((EX(wkNextId() || "") || {}).name || "…")}</div>
      </div>
    ` : `
      <div class="wk-gif"><img src="${e.gif || ""}" onerror="${errImg}"></div>
      <div class="wk-name">${esc(e.name)}</div>
      <div class="wk-sub">第 ${wk.setIdx + 1} / ${wkCur().sets} 组 · 目标 ${esc(wkCur().reps)} 次 · 器械：${esc(e.equip)}</div>
      <div class="wk-sets-row">
        ${Array.from({ length: wkCur().sets }, (_, i) => `<div class="sdot ${i < wk.setIdx ? "done" : i === wk.setIdx ? "cur" : ""}"></div>`).join("")}
      </div>
      <div class="wk-tips">💡 ${esc(tip)}<div class="tt" style="margin-top:5px">🫁 发力呼气，还原吸气；疼就停。</div></div>
      <div class="wk-queue">
        ${wk.items.map((it, i) => {
          const ee = EX(it.id);
          const st = i < wk.exIdx ? "done" : i === wk.exIdx ? "cur" : "";
          return `<div class="q ${st}"><span>${i < wk.exIdx ? "✓" : i + 1}</span><img loading="lazy" src="${thumbImg(ee)}" onerror="${errImg}"><span>${esc(ee.name)}</span></div>`;
        }).join("")}
      </div>
    `}

    <div class="wk-btns">
      ${isRest
      ? `<button class="btn ok" id="wk-skip">跳过休息，开练 ▶</button>`
      : `<button class="btn ok" id="wk-done-set">✓ 完成本组（${wk.setIdx + 1}/${wkCur().sets}）</button>`}
    </div>
  </div>`;

  $("#wk-quit").addEventListener("click", () => {
    if (confirm("训练还没保存就退出，确定结束？")) { stopWkTimer(); $("#workout-layer").classList.add("hidden"); $("#workout-layer").innerHTML = ""; wk = null; localStorage.removeItem("gym_wk"); }
  });
  if (isRest) {
    $("#wk-skip").addEventListener("click", () => { stopWkTimer(); wk.phase = "work"; advanceIfNeed(); renderWorkout(); });
    stopWkTimer();
    wk.timer = setInterval(() => {
      wk.left--;
      const n = $("#wk-num"); if (!n) { stopWkTimer(); return; }
      n.textContent = fmtClock(wk.left);
      if (wk.left <= 3 && wk.left > 0) beep(1);
      if (wk.left <= 0) { stopWkTimer(); beep(3); wk.phase = "work"; advanceIfNeed(); renderWorkout(); }
    }, 1000);
  } else {
    $("#wk-done-set").addEventListener("click", () => {
      wk.done.push({ exId: wkCur().id, set: wk.setIdx + 1 });
      if (wk.setIdx + 1 < wkCur().sets) {
        wk.setIdx++; startWkRest();
      } else {
        wk.exIdx++;
        if (wk.exIdx >= wk.items.length) return renderWorkoutDone();
        wk.setIdx = 0; startWkRest(true);
      }
    });
  }
  function startWkRest(nextEx) {
    wk.phase = "rest"; wk.left = wkCur().rest || 75; wk._nextEx = !!nextEx;
    renderWorkout();
  }
  function advanceIfNeed() { if (wk._nextEx) { wk._nextEx = false; } }
  function wkNextId() {
    if (wk.setIdx + 1 < wkCur().sets) return wkCur().id;
    return (wk.items[wk.exIdx + 1] || {}).id;
  }
}
function stopWkTimer() { if (wk && wk.timer) { clearInterval(wk.timer); wk.timer = null; } }

function renderWorkoutDone() {
  stopWkTimer();
  const layer = $("#workout-layer");
  const durSec = Math.round((Date.now() - wk.startT) / 1000);
  const parts = {};
  wk.done.forEach(d => { const e = EX(d.exId); if (e) parts[e.part] = (parts[e.part] || 0) + 1; });
  const byEx = {};
  wk.done.forEach(d => byEx[d.exId] = (byEx[d.exId] || 0) + 1);
  addHistory({
    id: uid(), t: Date.now(), name: wk.name, durSec,
    setsDone: wk.done.length, parts,
    items: Object.entries(byEx).map(([exId, n]) => ({ exId, sets: n, reps: (wk.items.find(i => i.id === exId) || {}).reps || "" })),
  });
  localStorage.removeItem("gym_wk");
  beep(3);
  layer.innerHTML = `<div class="wk-wrap"><div class="wk-done">
    <div class="big">🎉</div>
    <h2>训练完成！</h2>
    <div class="stats">
      <div class="sg"><b>${fmtDur(durSec)}</b><span>总时长</span></div>
      <div class="sg"><b>${wk.done.length}</b><span>总组数</span></div>
      <div class="sg"><b>${Object.keys(parts).length}</b><span>练到部位</span></div>
    </div>
    <div class="card" style="text-align:left">
      <div class="card-t">📋 本次练了</div>
      ${Object.entries(byEx).map(([exId, n]) => { const e = EX(exId); return e ? `<div style="padding:4px 0;font-size:13.5px">✓ ${esc(e.name)} × ${n} 组</div>` : ""; }).join("")}
    </div>
    <div class="wk-btns" style="margin-top:6px">
      <button class="btn" id="wd-home">太棒了，收工！</button>
    </div>
  </div></div>`;
  $("#wd-home").addEventListener("click", () => {
    $("#workout-layer").classList.add("hidden"); $("#workout-layer").innerHTML = "";
    wk = null; location.hash = "#/log";
  });
  wk = null;
}

/* ---------------- 弹窗 ---------------- */
function openSheet(html) {
  const m = $("#modal-layer");
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.classList.remove("hidden");
  m.onclick = ev => { if (ev.target === m) closeSheet(); };
}
function closeSheet() { const m = $("#modal-layer"); m.classList.add("hidden"); m.innerHTML = ""; }

/* ---------------- 启动 ---------------- */
function boot() {
  applyTheme();
  if (!window.DB) {
    $("#view").innerHTML = `<div class="card"><div class="card-t">⚠️ 数据未生成</div>
      <div style="font-size:13.5px;color:var(--txt2)">请在项目目录运行 <code>node build.js</code> 生成 js/data.js 后刷新。</div></div>`;
    return;
  }
  if (!location.hash || location.hash === "#") location.hash = "#/home";
  route();
  // 若有未完成的跟练（刷新页面），恢复入口
  if (localStorage.getItem("gym_wk")) {
    setTimeout(() => {
      if (confirm("检测到上一次跟练还没完成，要继续吗？")) { restoreWorkout(); renderWorkout(); }
      else localStorage.removeItem("gym_wk");
    }, 300);
  }
}
boot();
