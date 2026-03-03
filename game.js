// Clicker Evolution — clean, beginner-friendly code with cool effects ✨

/* ---------------------------
  Helpers
----------------------------*/
const $ = (id) => document.getElementById(id);

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function format(n) {
  // Simple short formatter: 1,234 -> 1.23K -> 4.56M -> 7.89B
  const abs = Math.abs(n);
  if (abs < 1000) return Math.floor(n).toString();
  const units = ["K","M","B","T"];
  let u = -1;
  let num = n;
  while (Math.abs(num) >= 1000 && u < units.length - 1) {
    num /= 1000;
    u++;
  }
  return `${num.toFixed(num < 10 ? 2 : num < 100 ? 1 : 0)}${units[u]}`;
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => (t.hidden = true), 1400);
}

/* ---------------------------
  Evolutions
----------------------------*/
const EVOS = [
  { level: 1,  name: "Tiny Spark",     desc: "A small start… but not for long.",        orbGlow: 0.10 },
  { level: 10, name: "Glowing Orb",    desc: "You’re gaining momentum. Keep clicking.", orbGlow: 0.15 },
  { level: 25, name: "Neon Core",      desc: "Now you’re basically a walking battery.", orbGlow: 0.22 },
  { level: 50, name: "Star Fragment",  desc: "Your points are getting spicy.",         orbGlow: 0.28 },
  { level: 80, name: "Mini Galaxy",    desc: "Okay… you might be unstoppable.",        orbGlow: 0.34 },
  { level: 120,name: "Cosmic Engine",  desc: "Infinite vibes. Infinite clicks.",       orbGlow: 0.40 },
];

/* ---------------------------
  Shop Items
----------------------------*/
const SHOP = [
  {
    id: "tap",
    name: "Stronger Tap",
    desc: "+1 per click",
    baseCost: 25,
    growth: 1.18,
    type: "ppc",
    value: 1
  },
  {
    id: "glove",
    name: "Clicking Glove",
    desc: "+5 per click",
    baseCost: 250,
    growth: 1.20,
    type: "ppc",
    value: 5
  },
  {
    id: "auto",
    name: "Auto Clicker",
    desc: "+1 per second",
    baseCost: 75,
    growth: 1.17,
    type: "pps",
    value: 1
  },
  {
    id: "bot",
    name: "Click Bot",
    desc: "+8 per second",
    baseCost: 800,
    growth: 1.19,
    type: "pps",
    value: 8
  },
  {
    id: "lab",
    name: "Evolution Lab",
    desc: "Cheaper upgrades (−2% cost each)",
    baseCost: 1200,
    growth: 1.35,
    type: "discount",
    value: 0.02,
    cap: 15
  }
];

/* ---------------------------
  Achievements
----------------------------*/
const ACH = [
  { id:"first",   title:"First Click",       check:(s)=>s.totalClicks >= 1,         reward:"+10 points",   give:(s)=> s.points += 10 },
  { id:"hundred", title:"100 Clicks",        check:(s)=>s.totalClicks >= 100,       reward:"+50 points",   give:(s)=> s.points += 50 },
  { id:"rich",    title:"1,000 Points",      check:(s)=>s.totalEarned >= 1000,      reward:"+1 PPC",       give:(s)=> s.ppc += 1 },
  { id:"auto",    title:"First Auto Income", check:(s)=>s.pps >= 1,                 reward:"+25 points",   give:(s)=> s.points += 25 },
  { id:"evo",     title:"First Evolution",   check:(s)=>s.evoIndex >= 1,            reward:"+2 PPC",       give:(s)=> s.ppc += 2 },
  { id:"big",     title:"Level 50",          check:(s)=>s.level >= 50,              reward:"+200 points",  give:(s)=> s.points += 200 },
];

/* ---------------------------
  Save Data
----------------------------*/
const SAVE_KEY = "clicker_evolution_save_v1";

const state = {
  points: 0,
  totalEarned: 0,
  totalClicks: 0,

  level: 1,
  xp: 0,
  xpToLevel: 20,

  ppc: 1,
  pps: 0,

  evoIndex: 0,

  prestige: 0, // each prestige = +5% all gains
  shopCounts: {}, // itemId -> count
  unlockedAch: {}, // achId -> true
};

function prestigeBonusMultiplier() {
  return 1 + state.prestige * 0.05;
}

function getDiscountMultiplier() {
  const count = state.shopCounts["lab"] || 0;
  const capped = clamp(count, 0, SHOP.find(x=>x.id==="lab").cap || 999);
  return 1 - (capped * 0.02);
}

function costOf(item) {
  const count = state.shopCounts[item.id] || 0;
  const raw = item.baseCost * Math.pow(item.growth, count);
  const discounted = raw * getDiscountMultiplier();
  return Math.ceil(discounted);
}

/* ---------------------------
  Leveling / Evolution
----------------------------*/
function gainXP(amount) {
  state.xp += amount;
  while (state.xp >= state.xpToLevel) {
    state.xp -= state.xpToLevel;
    state.level += 1;
    // small scaling
    state.xpToLevel = Math.ceil(20 + state.level * 6);
    toast(`Level up! Now Level ${state.level}`);
  }
}

function currentEvoIndex() {
  // highest evo where level >= evo.level
  let idx = 0;
  for (let i = 0; i < EVOS.length; i++) {
    if (state.level >= EVOS[i].level) idx = i;
  }
  return idx;
}

function nextEvoLevel() {
  const idx = currentEvoIndex();
  const next = EVOS[idx + 1];
  return next ? next.level : null;
}

function applyEvoUI() {
  const idx = currentEvoIndex();
  state.evoIndex = idx;

  $("evoName").textContent = EVOS[idx].name;
  $("evoDesc").textContent = EVOS[idx].desc;
  $("level").textContent = state.level;

  const nxt = nextEvoLevel();
  if (nxt) {
    $("nextEvoLevel").textContent = nxt;
    $("evolveBtn").disabled = state.level < nxt;
  } else {
    $("nextEvoLevel").textContent = "MAX";
    $("evolveBtn").disabled = true;
  }

  // orb glow tweak
  const orb = $("orb");
  const glow = EVOS[idx].orbGlow;
  orb.style.boxShadow = `0 0 0 10px rgba(122,167,255,${glow}), 0 22px 60px rgba(122,167,255,${glow + 0.12})`;
}

function evolve() {
  const nxt = nextEvoLevel();
  if (!nxt || state.level < nxt) return;

  // reward: boost click + auto a bit
  state.ppc += 3 + state.evoIndex;
  state.pps += 1 + Math.floor(state.evoIndex / 2);

  toast(`Evolved! +PPC & +PPS`);
  burstFX(window.innerWidth/2, window.innerHeight/2, 26);
  applyEvoUI();
  updateUI();
}

/* ---------------------------
  Achievements
----------------------------*/
function checkAchievements() {
  let unlockedAny = false;
  for (const a of ACH) {
    if (state.unlockedAch[a.id]) continue;
    if (a.check(state)) {
      state.unlockedAch[a.id] = true;
      a.give(state);
      toast(`Achievement: ${a.title} ✓`);
      unlockedAny = true;
    }
  }
  if (unlockedAny) renderAchievements();
}

/* ---------------------------
  UI Rendering
----------------------------*/
function updateUI() {
  $("points").textContent = format(state.points);
  $("ppc").textContent = format(state.ppc);
  $("pps").textContent = format(state.pps);

  $("prestigeBtn").disabled = state.level < 50;

  applyEvoUI();
  renderShop();
}

function renderShop() {
  const wrap = $("shop");
  wrap.innerHTML = "";

  for (const item of SHOP) {
    const count = state.shopCounts[item.id] || 0;
    const cost = costOf(item);
    const canBuy = state.points >= cost;

    const row = document.createElement("div");
    row.className = "shopItem";
    row.innerHTML = `
      <div class="left">
        <div class="name">${item.name} <span class="muted">x${count}</span></div>
        <div class="meta">${item.desc} • Cost: <b>${format(cost)}</b></div>
      </div>
      <button class="buy" ${canBuy ? "" : "disabled"}>Buy</button>
    `;
    row.querySelector("button").addEventListener("click", () => buy(item));
    wrap.appendChild(row);
  }
}

function renderAchievements() {
  const wrap = $("achievements");
  wrap.innerHTML = "";

  for (const a of ACH) {
    const unlocked = !!state.unlockedAch[a.id];
    const row = document.createElement("div");
    row.className = "ach" + (unlocked ? " unlocked" : "");
    row.innerHTML = `
      <div>
        <div class="title">${a.title}</div>
        <div class="state">${unlocked ? "Unlocked ✓" : a.reward}</div>
      </div>
      <div class="state">${unlocked ? "✅" : "🔒"}</div>
    `;
    wrap.appendChild(row);
  }
}

/* ---------------------------
  Buying
----------------------------*/
function buy(item) {
  const cost = costOf(item);
  if (state.points < cost) return;

  // caps (for discount item)
  if (item.cap != null) {
    const count = state.shopCounts[item.id] || 0;
    if (count >= item.cap) {
      toast("Maxed!");
      return;
    }
  }

  state.points -= cost;
  state.shopCounts[item.id] = (state.shopCounts[item.id] || 0) + 1;

  // apply effect
  const mult = prestigeBonusMultiplier();
  if (item.type === "ppc") state.ppc += Math.floor(item.value * 1); // keep clean integers
  if (item.type === "pps") state.pps += Math.floor(item.value * 1);
  // discount is handled via multiplier, nothing to add

  toast(`Bought ${item.name}`);
  checkAchievements();
  updateUI();
}

/* ---------------------------
  Clicking
----------------------------*/
const clickBtn = $("clickBtn");

clickBtn.addEventListener("click", (e) => {
  const mult = prestigeBonusMultiplier();

  const gained = Math.floor(state.ppc * mult);
  state.points += gained;
  state.totalEarned += gained;

  state.totalClicks += 1;

  // XP scales a bit with clicks so leveling feels good
  gainXP(2);

  // FX
  const rect = clickBtn.getBoundingClientRect();
  const x = rect.left + rect.width * (0.25 + Math.random() * 0.5);
  const y = rect.top + rect.height * (0.25 + Math.random() * 0.5);
  burstFX(x, y, 10);

  // tiny shake
  document.body.classList.remove("shake");
  void document.body.offsetWidth; // reflow to restart animation
  document.body.classList.add("shake");

  checkAchievements();
  updateUI();
});

/* ---------------------------
  Auto Income Tick
----------------------------*/
setInterval(() => {
  if (state.pps <= 0) return;
  const mult = prestigeBonusMultiplier();
  const gained = Math.floor(state.pps * mult);

  state.points += gained;
  state.totalEarned += gained;

  // smaller XP for passive
  gainXP(1);

  checkAchievements();
  updateUI();
}, 1000);

/* ---------------------------
  Prestige
----------------------------*/
$("prestigeBtn").addEventListener("click", () => {
  if (state.level < 50) return;

  // confirm with a simple browser confirm (beginner friendly)
  const ok = confirm("Prestige resets your progress for a permanent +5% bonus to ALL gains. Continue?");
  if (!ok) return;

  state.prestige += 1;

  // reset progress but keep prestige + achievements
  state.points = 0;
  state.totalEarned = 0;
  state.totalClicks = 0;

  state.level = 1;
  state.xp = 0;
  state.xpToLevel = 20;

  state.ppc = 1;
  state.pps = 0;

  state.evoIndex = 0;
  state.shopCounts = {};

  toast(`Prestiged! Bonus is now +${state.prestige * 5}%`);
  saveGame();
  renderAchievements();
  updateUI();
});

/* ---------------------------
  Save / Load / Reset
----------------------------*/
function saveGame() {
  const data = JSON.stringify(state);
  localStorage.setItem(SAVE_KEY, data);
  toast("Saved!");
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    // Copy only known keys to avoid weird saves
    for (const k of Object.keys(state)) {
      if (parsed[k] !== undefined) state[k] = parsed[k];
    }
    return true;
  } catch {
    return false;
  }
}

$("saveBtn").addEventListener("click", saveGame);

$("resetBtn").addEventListener("click", () => {
  const ok = confirm("Reset EVERYTHING? This cannot be undone.");
  if (!ok) return;
  localStorage.removeItem(SAVE_KEY);
  location.reload();
});

$("evolveBtn").addEventListener("click", evolve);

// Auto-save every 15s
setInterval(() => {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}, 15000);

/* ---------------------------
  Canvas FX (particles)
----------------------------*/
const canvas = $("fx");
const ctx = canvas.getContext("2d");
let W = 0, H = 0;

function resize() {
  W = canvas.width = window.innerWidth * devicePixelRatio;
  H = canvas.height = window.innerHeight * devicePixelRatio;
}
window.addEventListener("resize", resize);
resize();

const particles = [];

function burstFX(x, y, amount = 12) {
  // convert to device pixels
  const px = x * devicePixelRatio;
  const py = y * devicePixelRatio;

  for (let i = 0; i < amount; i++) {
    particles.push({
      x: px,
      y: py,
      vx: (Math.random() - 0.5) * 6 * devicePixelRatio,
      vy: (Math.random() - 0.7) * 7 * devicePixelRatio,
      life: 30 + Math.random() * 20,
      r: 2 + Math.random() * 3,
    });
  }
}

function tickFX() {
  ctx.clearRect(0, 0, W, H);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 1;
    p.vy += 0.15 * devicePixelRatio;
    p.x += p.vx;
    p.y += p.vy;

    const alpha = clamp(p.life / 45, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * devicePixelRatio, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();

    if (p.life <= 0) particles.splice(i, 1);
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(tickFX);
}
tickFX();

/* ---------------------------
  Boot
----------------------------*/
const loaded = loadGame();
renderAchievements();
updateUI();

if (loaded) toast("Loaded save ✓");
