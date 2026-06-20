import { WORDS, CATEGORIES, getRarity } from './data/words.js';
import { generateMonster, drawMonster } from './monster.js';
import { Sound, Speech } from './audio.js';

// ===== セーブ =====
const SAVE_KEY = 'wm-save-v2';
function defaultSave() {
  return { v: 2, dex: {}, xp: 0, settings: { sound: true, voice: true } };
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const s = JSON.parse(raw);
    return { ...defaultSave(), ...s, settings: { ...defaultSave().settings, ...(s.settings || {}) }, dex: s.dex || {} };
  } catch { return defaultSave(); }
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
}
const save = loadSave();
Sound.enabled = save.settings.sound;
Speech.enabled = save.settings.voice;

// ===== モンスター生成キャッシュ =====
const monCache = new Map();
function getMon(word, shiny = false) {
  const key = word.en + (shiny ? '#s' : '');
  if (!monCache.has(key)) monCache.set(key, generateMonster(word, { shiny }));
  return monCache.get(key);
}

// ===== ユーティリティ =====
const $ = (id) => document.getElementById(id);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (arr, n) => shuffle(arr).slice(0, n);

function dexEntry(en) { return save.dex[en] || { correct: 0, wrong: 0, caught: false }; }
function starsFor(correct) { return correct >= 8 ? 3 : correct >= 4 ? 2 : correct >= 1 ? 1 : 0; }
function shinyUnlocked(en) { return dexEntry(en).correct >= 8; }
function caughtCount() { return WORDS.filter(w => dexEntry(w.en).caught).length; }
function level() { return Math.floor(save.xp / 200) + 1; }

// ===== 画面切り替え =====
const SCREENS = ['Home', 'Category', 'Quiz', 'Result', 'Dex'];
function show(name) {
  SCREENS.forEach(s => $('screen' + s).classList.toggle('is-active', s === name));
  window.scrollTo(0, 0);
  if (name === 'Home') renderHome();
}

document.querySelectorAll('[data-go]').forEach(btn => {
  btn.addEventListener('click', () => {
    Sound.click();
    const dest = btn.dataset.go;
    if (dest === 'category') show('Category'), renderCategories();
    else if (dest === 'dex') openDex();
    else show(dest.charAt(0).toUpperCase() + dest.slice(1));
  });
});

// ===== ホーム =====
function renderHome() {
  const total = WORDS.length;
  $('homeStats').innerHTML = `
    <div class="wm-stat"><b>${caughtCount()}/${total}</b><span>ずかん</span></div>
    <div class="wm-stat"><b>Lv.${level()}</b><span>レベル</span></div>
    <div class="wm-stat"><b>${save.xp}</b><span>けいけんち</span></div>`;
  $('setSound').checked = save.settings.sound;
  $('setVoice').checked = save.settings.voice;
}
$('btnStart').addEventListener('click', () => { Sound.unlock(); Sound.click(); show('Category'); renderCategories(); });
$('btnDex').addEventListener('click', () => { Sound.click(); openDex(); });
$('setSound').addEventListener('change', e => { save.settings.sound = Sound.enabled = e.target.checked; persist(); if (e.target.checked) Sound.click(); });
$('setVoice').addEventListener('change', e => { save.settings.voice = Speech.enabled = e.target.checked; persist(); });

// ===== カテゴリ =====
function catProgress(catId) {
  const words = WORDS.filter(w => w.cat === catId);
  const got = words.filter(w => dexEntry(w.en).caught).length;
  return { got, total: words.length };
}
function renderCategories() {
  const grid = $('catGrid');
  grid.innerHTML = '';
  // おまかせ
  const all = document.createElement('button');
  all.className = 'wm-cat all';
  const ap = { got: caughtCount(), total: WORDS.length };
  all.innerHTML = `<span class="wm-cat-emoji">🎲</span><div class="wm-cat-name">ぜんぶ（おまかせ）</div>
    <div class="wm-cat-prog">${ap.got}/${ap.total} ゲット</div>`;
  all.addEventListener('click', () => startSession('all'));
  grid.appendChild(all);

  CATEGORIES.forEach(c => {
    const p = catProgress(c.id);
    const el = document.createElement('button');
    el.className = 'wm-cat';
    el.style.borderColor = 'transparent';
    el.innerHTML = `<span class="wm-cat-emoji">${c.emoji}</span>
      <div class="wm-cat-name">${c.name}</div>
      <div class="wm-cat-prog">${p.got}/${p.total}</div>
      <div class="wm-cat-bar"><i style="width:${p.total ? (p.got / p.total * 100) : 0}%"></i></div>`;
    el.addEventListener('click', () => startSession(c.id));
    grid.appendChild(el);
  });
}

// ===== クイズ =====
const QLEN = 10;
let session = null;

function buildQueue(catId) {
  let pool = catId === 'all' ? WORDS.slice() : WORDS.filter(w => w.cat === catId);
  // 未ゲット・苦手を優先して出題（学習効率＆収集が進む）
  const weight = (w) => {
    const e = dexEntry(w.en);
    if (!e.caught) return 0;            // まだ捕まえてない＝最優先
    return starsFor(e.correct) + 1;     // 星が少ないほど先に
  };
  const sorted = shuffle(pool).sort((a, b) => weight(a) - weight(b));
  let queue = sorted.slice(0, Math.min(QLEN, sorted.length));
  // プールが少ない時はくり返して10問にする
  while (queue.length < Math.min(QLEN, pool.length || QLEN) && pool.length) {
    queue.push(pool[(Math.random() * pool.length) | 0]);
  }
  return shuffle(queue);
}

function startSession(catId) {
  Sound.unlock(); Sound.click();
  session = {
    catId, queue: buildQueue(catId), idx: 0,
    score: 0, streak: 0, bestStreak: 0, correctCount: 0, xpGained: 0,
    newCaptures: [], leveledUp: false, startLevel: level(), pendingCapture: null,
  };
  $('hudTotal').textContent = session.queue.length;
  show('Quiz');
  nextQuestion();
}

const MODES_ALL = ['meaning', 'word', 'listen', 'spell'];
function pickMode() {
  let modes = MODES_ALL.slice();
  if (!Speech.supported) modes = modes.filter(m => m !== 'listen');
  return modes[(Math.random() * modes.length) | 0];
}

function makeMisspellings(en) {
  const vowels = 'aeiou';
  const variants = new Set();
  const lower = en.toLowerCase();
  const tryAdd = (s) => { if (s && s !== lower && s.length >= 2) variants.add(s); };
  // 隣どうし入れ替え
  for (let i = 0; i < lower.length - 1; i++) {
    const a = lower.split(''); [a[i], a[i + 1]] = [a[i + 1], a[i]]; tryAdd(a.join(''));
  }
  // 1文字消す
  for (let i = 0; i < lower.length; i++) tryAdd(lower.slice(0, i) + lower.slice(i + 1));
  // 母音を入れ替え
  for (let i = 0; i < lower.length; i++) {
    if (vowels.includes(lower[i])) {
      for (const v of vowels) if (v !== lower[i]) tryAdd(lower.slice(0, i) + v + lower.slice(i + 1));
    }
  }
  // 文字を重ねる
  for (let i = 0; i < lower.length; i++) tryAdd(lower.slice(0, i + 1) + lower[i] + lower.slice(i + 1));
  return shuffle([...variants]);
}

function buildQuestion(word) {
  const mode = pickMode();
  const sameCat = WORDS.filter(w => w.cat === word.cat && w.en !== word.en);
  const others = (sameCat.length >= 3 ? sameCat : WORDS.filter(w => w.en !== word.en));

  let options, correctVal, promptText, promptEn = false, modeLabel;
  if (mode === 'meaning') {
    modeLabel = 'いみは？'; promptText = word.en; promptEn = true; correctVal = word.ja;
    options = shuffle([word.ja, ...sample(others, 3).map(w => w.ja)]);
  } else if (mode === 'word') {
    modeLabel = 'えいごで なんていう？'; promptText = word.ja; correctVal = word.en;
    options = shuffle([word.en, ...sample(others, 3).map(w => w.en)]);
  } else if (mode === 'listen') {
    modeLabel = '🔊 きこえた たんごの いみは？'; promptText = '🔊'; correctVal = word.ja;
    options = shuffle([word.ja, ...sample(others, 3).map(w => w.ja)]);
  } else { // spell
    modeLabel = 'ただしい スペルは？'; promptText = word.ja; correctVal = word.en;
    const miss = makeMisspellings(word.en).slice(0, 3);
    while (miss.length < 3) { const r = sample(others, 1)[0]; if (r && !miss.includes(r.en)) miss.push(r.en); }
    options = shuffle([word.en, ...miss.slice(0, 3)]);
  }
  return { word, mode, modeLabel, promptText, promptEn, correctVal, options };
}

let revealRAF = 0;
function stopReveal() { if (revealRAF) cancelAnimationFrame(revealRAF), revealRAF = 0; }

function nextQuestion() {
  stopReveal();
  if (session.idx >= session.queue.length) return finishSession();
  const word = session.queue[session.idx];
  const q = session.current = buildQuestion(word);

  $('hudScore').textContent = session.score;
  $('hudStreak').textContent = session.streak;
  $('hudProg').textContent = session.idx + 1;
  $('progBar').style.width = (session.idx / session.queue.length * 100) + '%';

  $('qMode').textContent = q.modeLabel;
  const prompt = $('qPrompt');
  prompt.textContent = q.promptText;
  prompt.classList.toggle('en', q.promptEn);

  // モンスターはシルエットで出題 → 正解で色が見える！
  drawMonster($('qCanvas'), getMon(word), { silhouette: true, size: 160 });

  // リスニング/スペルは読み上げ
  const listenBtn = $('btnListen');
  if (q.mode === 'listen' || q.mode === 'spell') {
    listenBtn.hidden = false;
    setTimeout(() => Speech.speak(word.en), 250);
  } else {
    listenBtn.hidden = true;
  }

  $('feedback').textContent = '';
  $('feedback').className = 'wm-feedback';

  const box = $('options');
  box.innerHTML = '';
  q.options.forEach(val => {
    const b = document.createElement('button');
    b.className = 'wm-opt';
    b.textContent = val;
    b.addEventListener('click', () => onAnswer(b, val, q));
    box.appendChild(b);
  });
}

$('btnListen').addEventListener('click', () => { if (session?.current) Speech.speak(session.current.word.en); });

const PRAISE = ['せいかい！', 'やったね！', 'ナイス！', 'すごい！', 'かんぺき！', 'てんさい！'];
function onAnswer(btn, val, q) {
  const opts = [...$('options').children];
  opts.forEach(o => o.style.pointerEvents = 'none');
  const correct = val === q.correctVal;
  const word = q.word;
  const e = dexEntry(word.en);
  const wasCaught = e.caught;

  if (correct) {
    btn.classList.add('correct');
    const pts = (q.mode === 'spell' ? 150 : q.mode === 'listen' ? 120 : 100) + Math.min(session.streak, 10) * 10;
    session.score += pts;
    session.streak++; session.correctCount++;
    session.bestStreak = Math.max(session.bestStreak, session.streak);
    const gain = 10 + getRarity(word).stars * 5;
    session.xpGained += gain; save.xp += gain;
    e.correct++; e.caught = true; save.dex[word.en] = e;

    Sound.correct();
    $('feedback').textContent = PRAISE[(Math.random() * PRAISE.length) | 0];
    $('feedback').className = 'wm-feedback good';
    confetti(18);
    // モンスター色つきで登場！
    revealMonster(word);
    Speech.speak(word.en);

    if (!wasCaught) session.newCaptures.push(word);
  } else {
    btn.classList.add('wrong');
    opts.forEach(o => { if (o.textContent === q.correctVal) o.classList.add('correct'); else if (o !== btn) o.classList.add('dim'); });
    session.streak = 0;
    e.wrong++; save.dex[word.en] = e;
    Sound.wrong();
    $('qcard').classList.add('shake');
    setTimeout(() => $('qcard').classList.remove('shake'), 350);
    $('feedback').textContent = `せいかいは「${q.correctVal}」`;
    $('feedback').className = 'wm-feedback bad';
    Speech.speak(word.en);
  }
  persist();
  $('hudScore').textContent = session.score;
  $('hudStreak').textContent = session.streak;

  const delay = correct ? 1100 : 1700;
  setTimeout(() => {
    session.idx++;
    if (correct && !wasCaught) {
      showCapture(word, () => nextQuestion());
    } else {
      nextQuestion();
    }
  }, delay);
}

function revealMonster(word) {
  const canvas = $('qCanvas');
  const mon = getMon(word, shinyUnlocked(word.en));
  const t0 = performance.now();
  const loop = (t) => {
    const bob = (t - t0) / 320;
    drawMonster(canvas, mon, { silhouette: false, bob, size: 160 });
    if (t - t0 < 1100) revealRAF = requestAnimationFrame(loop);
  };
  stopReveal();
  revealRAF = requestAnimationFrame(loop);
}

function finishSession() {
  stopReveal();
  // レベルアップ判定
  const lvUp = level() > session.startLevel;
  if (lvUp) Sound.levelup();
  const total = session.queue.length;
  const acc = Math.round(session.correctCount / total * 100);
  $('resultTitle').textContent = acc === 100 ? 'パーフェクト！🏆' : acc >= 70 ? 'クリア！🎉' : 'おつかれさま！';
  $('resultScore').textContent = session.score + ' てん';
  $('resultStats').innerHTML = `
    <div class="wm-stat"><b>${session.correctCount}/${total}</b><span>せいかい</span></div>
    <div class="wm-stat"><b>${acc}%</b><span>せいかいりつ</span></div>
    <div class="wm-stat"><b>+${session.xpGained}</b><span>けいけんち</span></div>
    <div class="wm-stat"><b>🔥${session.bestStreak}</b><span>さいこうれんぞく</span></div>
    ${lvUp ? `<div class="wm-stat" style="background:var(--primary)"><b>Lv.${level()}</b><span>レベルアップ！</span></div>` : ''}`;

  const nb = $('resultNew');
  if (session.newCaptures.length) {
    nb.innerHTML = `<div style="width:100%;font-weight:700;color:var(--accent)">✨ あたらしく ${session.newCaptures.length}たい ゲット！</div>`;
    session.newCaptures.forEach(w => {
      const mini = buildMiniCard(w);
      nb.appendChild(mini);
    });
    confetti(40);
  } else {
    nb.innerHTML = '';
  }
  show('Result');
}

$('btnRetry').addEventListener('click', () => { Sound.click(); startSession(session.catId); });

// ===== キャプチャ演出 =====
let captureNext = null;
function showCapture(word, onNext) {
  captureNext = onNext;
  const card = buildBigCard(word, shinyUnlocked(word.en));
  const host = $('captureCard');
  host.replaceWith(Object.assign(card, { id: 'captureCard' }));
  Sound.capture();
  confetti(30);
  $('captureOverlay').classList.add('is-open');
}
$('btnCaptureNext').addEventListener('click', () => {
  Sound.click();
  $('captureOverlay').classList.remove('is-open');
  const fn = captureNext; captureNext = null;
  if (fn) fn();
});

// ===== カード生成 =====
function buildBigCard(word, shiny) {
  const r = getRarity(word);
  const rk = word.rarity || 'N';
  const e = dexEntry(word.en);
  const stars = starsFor(e.correct);
  const card = document.createElement('div');
  card.className = 'wm-card r-' + rk + (rk !== 'N' ? ' holo' : '');
  card.innerHTML = `
    <div class="wm-card-rarity" style="color:${r.color}">${'★'.repeat(r.stars)} ${r.label}</div>
    <div class="wm-card-art"><canvas></canvas></div>
    <div class="wm-card-en">${word.en}</div>
    <div class="wm-card-ja">${word.ja}</div>
    <div class="wm-card-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>`;
  const cv = card.querySelector('canvas');
  cv.style.width = '120px'; cv.style.height = '120px';
  requestAnimationFrame(() => drawMonster(cv, getMon(word, shiny), { silhouette: false, size: 120 }));
  return card;
}

function buildMiniCard(word) {
  const rk = word.rarity || 'N';
  const r = getRarity(word);
  const el = document.createElement('div');
  el.className = 'wm-dex-cell r-' + rk;
  el.innerHTML = `<canvas></canvas><div class="wm-dex-name">${word.en}</div>
    <div class="wm-dex-stars" style="color:${r.color}">${'★'.repeat(r.stars)}</div>`;
  const cv = el.querySelector('canvas');
  cv.style.width = '72px'; cv.style.height = '72px';
  requestAnimationFrame(() => drawMonster(cv, getMon(word), { silhouette: false, size: 72 }));
  return el;
}

// ===== ずかん =====
let dexFilterCat = 'all';
function openDex() {
  show('Dex');
  $('dexProg').textContent = `${caughtCount()} / ${WORDS.length}`;
  renderDexFilter();
  renderDexGrid();
}
function renderDexFilter() {
  const box = $('dexFilter');
  box.innerHTML = '';
  const mk = (id, label) => {
    const c = document.createElement('button');
    c.className = 'wm-fchip' + (dexFilterCat === id ? ' active' : '');
    c.textContent = label;
    c.addEventListener('click', () => { Sound.click(); dexFilterCat = id; renderDexFilter(); renderDexGrid(); });
    box.appendChild(c);
  };
  mk('all', 'ぜんぶ');
  CATEGORIES.forEach(c => mk(c.id, c.emoji + c.name));
}
function renderDexGrid() {
  const grid = $('dexGrid');
  grid.innerHTML = '';
  const list = dexFilterCat === 'all' ? WORDS : WORDS.filter(w => w.cat === dexFilterCat);
  list.forEach(word => {
    const e = dexEntry(word.en);
    const rk = word.rarity || 'N';
    const stars = starsFor(e.correct);
    const cell = document.createElement('div');
    cell.className = 'wm-dex-cell r-' + rk + (e.caught ? '' : ' locked');
    cell.innerHTML = `<canvas></canvas>
      <div class="wm-dex-name">${e.caught ? word.en : '???'}</div>
      <div class="wm-dex-stars">${e.caught ? '★'.repeat(stars) : ''}</div>`;
    const cv = cell.querySelector('canvas');
    cv.style.width = '72px'; cv.style.height = '72px';
    requestAnimationFrame(() => drawMonster(cv, getMon(word), { silhouette: !e.caught, size: 72 }));
    if (e.caught) cell.addEventListener('click', () => { Sound.click(); openDetail(word); });
    grid.appendChild(cell);
  });
}

// ===== カード詳細 =====
let detailRAF = 0, detailShiny = false;
function openDetail(word) {
  detailShiny = false;
  renderDetail(word);
  $('detailOverlay').classList.add('is-open');
}
function renderDetail(word) {
  const r = getRarity(word);
  const e = dexEntry(word.en);
  const stars = starsFor(e.correct);
  const canShiny = shinyUnlocked(word.en);
  const host = $('detailCard');
  const card = buildBigCard(word, detailShiny && canShiny);
  card.id = 'detailCard';
  host.replaceWith(card);

  // ふわふわアニメ
  const cv = card.querySelector('canvas');
  const mon = getMon(word, detailShiny && canShiny);
  const t0 = performance.now();
  if (detailRAF) cancelAnimationFrame(detailRAF);
  const loop = (t) => { drawMonster(cv, mon, { bob: (t - t0) / 380, size: 120 }); detailRAF = requestAnimationFrame(loop); };
  detailRAF = requestAnimationFrame(loop);

  $('detailInfo').innerHTML = `
    <div class="wm-card-stars" style="font-size:1.3rem">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} <span style="font-size:.8rem;color:var(--muted)">マスタリー</span></div>
    <div class="wm-ex">${word.ex}</div>
    <div class="wm-exja">${word.exJa}</div>
    <div class="wm-detail-row">
      <button class="wm-btn wm-btn-listen" id="detailSpeak">🔊 はつおん</button>
      ${canShiny ? `<button class="wm-btn wm-btn-secondary" id="detailShinyBtn">✨ いろちがい</button>` : ''}
    </div>
    <div style="margin-top:8px;font-size:.8rem;color:var(--muted)">せいかい ${e.correct}かい ・ ${r.label}</div>`;
  $('detailSpeak').addEventListener('click', () => Speech.speak(word.en));
  const shinyBtn = $('detailShinyBtn');
  if (shinyBtn) shinyBtn.addEventListener('click', () => { Sound.click(); detailShiny = !detailShiny; renderDetail(word); });
  Speech.speak(word.en);
}
$('btnDetailClose').addEventListener('click', () => {
  Sound.click();
  $('detailOverlay').classList.remove('is-open');
  if (detailRAF) cancelAnimationFrame(detailRAF), detailRAF = 0;
});
$('detailOverlay').addEventListener('click', (e) => { if (e.target === $('detailOverlay')) $('btnDetailClose').click(); });

// ===== 紙吹雪 =====
const COLORS = ['#ffcb3d', '#5b6cff', '#2ee6a6', '#ff5d73', '#a855f7', '#6ef0c8'];
function confetti(n) {
  const layer = $('confetti');
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = COLORS[(Math.random() * COLORS.length) | 0];
    p.style.animationDuration = (1 + Math.random() * 1.2) + 's';
    p.style.animationDelay = (Math.random() * 0.2) + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(p);
    setTimeout(() => p.remove(), 2600);
  }
}

// shakeクラスをqcardに（CSS流用）
const styleFix = document.createElement('style');
styleFix.textContent = '.wm-qcard.shake{animation:shake .35s ease}';
document.head.appendChild(styleFix);

// ===== 起動 =====
renderHome();
