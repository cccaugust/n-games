/**
 * シティチェイス - ゲーム本体（進行・UI・演出の指揮）
 *
 * モード
 *  - police : あなた = 警察（ヘリ3機）/ AI = 犯人
 *  - thief  : あなた = 犯人 / AI = 警察
 *  - hotseat: 1台を交代で使う（犯人 vs 警察チーム）
 */
import {
  CityChaseGame, HELIS, MAX_ROUNDS, NUM_INTERSECTIONS, randomHeights, createRng, traceColor, bRow, bCol,
} from './rules.js';
import { Belief } from './belief.js';
import { policeDecide, policePlaceHelis, thiefDecide, DIFFICULTIES } from './ai.js';
import { CityRenderer } from './renderer.js';
import { audio } from './audio.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SETTINGS_KEY = 'city-chase:settings';
const COLOR_NAME = { yellow: '黄', red: '赤', blue: '青' };
const HELI_HEX = { pink: 0xff4fa3, yellow: 0xffd53d, green: 0x4ade80 };

function loadSettings() {
  try { return { sound: true, bloom: true, difficulty: 'normal', ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')) }; }
  catch (e) { return { sound: true, bloom: true, difficulty: 'normal' }; }
}
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* noop */ } }

const settings = loadSettings();
const rng = createRng();

const S = {
  session: 0,
  mode: null,
  game: null,
  renderer: null,
  busy: false,
  selectedHeli: null,
  pendingThief: null,
  setupIndex: 0,
  hint: false,
  stats: { searches: 0, traces: 0 },
  routeShown: false,
};

const ui = {};
[
  'scene', 'loading', 'hud', 'roundNum', 'phaseChip', 'aiChip', 'btnHint', 'btnSound', 'btnMenu', 'roundBoard', 'heliChips', 'foundChips',
  'bottomBar', 'message', 'actions', 'toast', 'banner', 'dim',
  'titleOverlay', 'difficulty', 'btnRules', 'btnTitleSound',
  'handoverOverlay', 'handoverIcon', 'handoverTitle', 'handoverText', 'handoverBtn',
  'resultOverlay', 'resultBadge', 'resultTitle', 'resultText', 'resultStats', 'btnRevealRoute', 'btnReplay', 'btnTitle',
  'menuOverlay', 'btnResume', 'btnMenuSound', 'btnMenuBloom', 'btnMenuRules', 'btnMenuTitle',
  'rulesOverlay', 'btnRulesClose',
].forEach((id) => { ui[id] = $(id); });

// ---------- 小さなUIヘルパー ----------
const show = (el) => el.classList.remove('is-hidden');
const hide = (el) => el.classList.add('is-hidden');
const coordName = (b) => `${String.fromCharCode(65 + bCol(b))}${bRow(b) + 1}`;
const heliName = (id) => `<b style="color:${HELIS[id].css}">${HELIS[id].name}</b>`;

function setMessage(html, role = '') {
  ui.message.innerHTML = html || '';
  ui.message.className = `message ${role}`;
}

function setActions(list) {
  ui.actions.innerHTML = '';
  for (const a of list) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${a.cls || 'secondary'}`;
    btn.innerHTML = a.label;
    btn.addEventListener('click', () => { audio.init(); a.onClick(); });
    ui.actions.appendChild(btn);
  }
}

let toastTimer = null;
function toast(text, ms = 1800) {
  ui.toast.textContent = text;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), ms);
}

function showBanner(main, sub = '', cls = '') {
  ui.banner.querySelector('.banner-main').textContent = main;
  ui.banner.querySelector('.banner-sub').textContent = sub;
  ui.banner.className = `banner ${cls}`;
  // 再生し直す
  void ui.banner.offsetWidth;
  ui.banner.classList.add('show');
  return wait(900);
}

function showDim(on) { ui.dim.classList.toggle('show', on); }

function humanControls(role) {
  if (S.mode === 'hotseat') return true;
  return S.mode === role;
}

function humanRoleLabel() {
  if (S.mode === 'police') return 'police';
  if (S.mode === 'thief') return 'thief';
  return null;
}

// ---------- HUD ----------
function buildRoundBoard() {
  // 実物のラウンドボード: 上段 1→5、下段 11←6（蛇行）
  const order = [1, 2, 3, 4, 5, null, 11, 10, 9, 8, 7, 6];
  ui.roundBoard.innerHTML = '';
  for (const r of order) {
    const slot = document.createElement('div');
    if (r === null) { slot.className = 'slot gap'; ui.roundBoard.appendChild(slot); continue; }
    slot.className = 'slot';
    slot.dataset.round = String(r);
    slot.textContent = String(r);
    const tk = document.createElement('div');
    const color = traceColor(r);
    tk.className = `tk-on ${color}`;
    tk.textContent = color === 'yellow' ? '1' : '!';
    slot.appendChild(tk);
    ui.roundBoard.appendChild(slot);
  }
}

function updateRoundBoard() {
  const g = S.game;
  const placed = g ? g.thief.path.length : 0;
  const slots = ui.roundBoard.querySelectorAll('.slot[data-round]');
  slots.forEach((slot) => {
    const r = Number(slot.dataset.round);
    slot.classList.toggle('used', r <= placed);
    slot.classList.toggle('current', g && g.phase !== 'over' && r === g.round);
    const found = g && g.thief.path[r - 1] !== undefined && g.traces[g.thief.path[r - 1]] && g.traces[g.thief.path[r - 1]].found && (r === 1 || r === 6);
    slot.classList.toggle('found', !!found);
  });
  // 発見した痕跡のチップ
  ui.foundChips.innerHTML = '';
  if (!g) return;
  const found = g.revealedTraces();
  if (!found.length) { ui.foundChips.innerHTML = '<span class="count">痕跡: まだ無し</span>'; return; }
  const counts = { yellow: 0, red: 0, blue: 0 };
  for (const f of found) counts[f.color]++;
  const parts = [];
  for (const c of ['yellow', 'red', 'blue']) {
    if (!counts[c]) continue;
    parts.push(`<span class="tk ${c}">${c === 'yellow' ? '1' : '!'}</span><span class="count">×${counts[c]}</span>`);
  }
  ui.foundChips.innerHTML = parts.join('');
}

function updateHeliChips() {
  const g = S.game;
  ui.heliChips.innerHTML = '';
  if (!g) return;
  for (const h of HELIS) {
    const st = g.helis[h.id];
    const chip = document.createElement('button');
    chip.type = 'button';
    const selectable = g.phase === 'police' && !st.acted && humanControls('police') && !S.busy;
    chip.className = `heli-chip ${st.acted ? 'acted' : ''} ${S.selectedHeli === h.id ? 'selected' : ''} ${selectable ? 'selectable' : ''}`;
    const status = g.phase === 'police' ? (st.acted ? '済' : '…') : '';
    chip.innerHTML = `<span class="dot" style="background:${h.css};color:${h.css}"></span><span class="name">${h.name}</span><span class="status">${status}</span>`;
    chip.addEventListener('click', () => { if (selectable) selectHeli(h.id); });
    ui.heliChips.appendChild(chip);
  }
}

function updateHud() {
  const g = S.game;
  if (!g) return;
  ui.roundNum.textContent = String(Math.max(1, g.round));
  const phaseText = { setup: 'ヘリ配置', thief: '犯人フェーズ', police: '警察フェーズ', over: 'ゲーム終了' }[g.phase];
  ui.phaseChip.textContent = phaseText;
  ui.phaseChip.className = `chip chip-phase ${g.phase}`;
  updateRoundBoard();
  updateHeliChips();
  updateHint();
}

function showAiChip(on) { ui.aiChip.classList.toggle('is-hidden', !on); }

function updateHint() {
  const g = S.game;
  const r = S.renderer;
  if (!g || !r) return;
  if (S.hint && g.phase === 'police' && humanControls('police')) {
    const belief = new Belief(g.publicView(), g.round);
    let max = 0;
    for (let b = 0; b < 25; b++) max = Math.max(max, belief.pNow[b]);
    const heat = Array.from(belief.pNow, (p) => (max > 0 ? p / max : 0));
    r.setHeat(heat);
  } else {
    r.setHeat(null);
  }
}

function updateSoundButtons() {
  const on = settings.sound;
  ui.btnSound.textContent = on ? '🔊' : '🔇';
  ui.btnSound.classList.toggle('muted', !on);
  ui.btnTitleSound.textContent = on ? '🔊 サウンド ON' : '🔇 サウンド OFF';
  ui.btnMenuSound.textContent = on ? '🔊 サウンド ON' : '🔇 サウンド OFF';
  ui.btnMenuBloom.textContent = settings.bloom ? '✨ 光のエフェクト ON' : '✨ 光のエフェクト OFF';
}

function toggleSound() {
  settings.sound = !settings.sound;
  saveSettings();
  audio.init();
  audio.setEnabled(settings.sound);
  updateSoundButtons();
  if (settings.sound) audio.tap();
}

// ---------- 交代画面 ----------
function handover(to) {
  return new Promise((resolve) => {
    const isThief = to === 'thief';
    ui.handoverOverlay.className = `overlay handover ${to}`;
    ui.handoverIcon.textContent = isThief ? '🚗' : '🚁';
    ui.handoverTitle.textContent = isThief ? '犯人の番' : '警察チームの番';
    ui.handoverText.innerHTML = isThief
      ? '警察のみんなは<b>目を閉じて</b>！<br>犯人は画面を受け取ったら OK を押してね'
      : '犯人は画面を警察に渡そう<br><small>（車はちゃんと隠れました）</small>';
    ui.handoverBtn.textContent = isThief ? 'OK（犯人）' : 'OK（警察）';
    show(ui.handoverOverlay);
    audio.handover();
    ui.handoverBtn.onclick = () => { hide(ui.handoverOverlay); audio.tap(); resolve(); };
  });
}

// ---------- ゲーム開始・終了 ----------
async function startGame(mode) {
  S.session++;
  const sid = S.session;
  S.mode = mode;
  S.stats = { searches: 0, traces: 0 };
  S.selectedHeli = null; S.pendingThief = null; S.busy = false; S.routeShown = false;
  S.game = new CityChaseGame({ heights: randomHeights(rng), rng });
  const r = S.renderer;
  r.resetBoard();
  r.setHeights(S.game.heights);
  r.setTitleMode(false);
  hide(ui.titleOverlay); hide(ui.resultOverlay); hide(ui.menuOverlay);
  show(ui.hud); show(ui.bottomBar);
  // 推理ヒントは警察を人間が操作するモードだけ
  ui.btnHint.classList.toggle('is-hidden', mode === 'thief');
  updateHud();
  audio.init();
  audio.startBgm();
  await setupPhase(sid);
}

function goTitle() {
  S.session++;
  S.game = null;
  S.mode = null;
  const r = S.renderer;
  r.resetBoard();
  r.setHeights(randomHeights(rng));
  decorateTitleBoard();
  r.setTitleMode(true);
  hide(ui.hud); hide(ui.bottomBar); hide(ui.resultOverlay); hide(ui.menuOverlay); hide(ui.handoverOverlay);
  showDim(false);
  show(ui.titleOverlay);
  setActions([]); setMessage('');
  audio.stopBgm();
  audio.siren(false);
}

function decorateTitleBoard() {
  const r = S.renderer;
  const used = new Set();
  for (const h of HELIS) {
    let i;
    do { i = Math.floor(rng() * NUM_INTERSECTIONS); } while (used.has(i));
    used.add(i);
    r.placeHeli(h.id, i, false);
  }
}

// ---------- セットアップ（ヘリ配置） ----------
async function setupPhase(sid) {
  const g = S.game;
  if (humanControls('police')) {
    S.setupIndex = 0;
    promptPlaceHeli();
  } else {
    setMessage('警察がヘリを配置しています…', 'police');
    showAiChip(true);
    const pos = policePlaceHelis(settings.difficulty, rng);
    for (let id = 0; id < HELIS.length; id++) {
      if (sid !== S.session) return;
      g.placeHeli(id, pos[id]);
      audio.heliPlace();
      await S.renderer.placeHeli(id, pos[id]);
      await wait(120);
    }
    showAiChip(false);
    if (sid !== S.session) return;
    await beginGame(sid);
  }
}

function freeIntersections() {
  const g = S.game;
  const out = [];
  for (let i = 0; i < NUM_INTERSECTIONS; i++) if (!g.heliAt(i)) out.push(i);
  return out;
}

function promptPlaceHeli() {
  const r = S.renderer;
  const id = S.setupIndex;
  const free = freeIntersections();
  r.clearHighlights();
  r.highlightIntersections(free, HELI_HEX[HELIS[id].key]);
  r.setPickable({ intersections: free });
  setMessage(`${heliName(id)}のヘリを置く<span class="k move">交差点</span>をタップ（${id + 1}/3）`, 'police');
  setActions(id > 0 ? [{ label: '置き直す', onClick: redoSetup }] : []);
}

function redoSetup() {
  const g = S.game;
  if (S.busy) return;
  for (const h of g.helis) h.pos = null;
  S.renderer.hideHelis();
  S.setupIndex = 0;
  audio.cancel();
  promptPlaceHeli();
}

async function onSetupTap(hit) {
  if (hit.type !== 'intersection') return;
  const g = S.game;
  const id = S.setupIndex;
  if (id >= HELIS.length) return;
  if (!g.canPlaceHeli(id, hit.index)) { audio.invalid(); return; }
  // 連打対策: 状態の更新は同期で済ませてからアニメーションを待つ
  S.busy = true;
  g.placeHeli(id, hit.index);
  S.setupIndex++;
  audio.heliPlace();
  S.renderer.setPickable({});
  S.renderer.clearHighlights();
  const sid = S.session;
  await S.renderer.placeHeli(id, hit.index);
  if (sid !== S.session) return;
  S.busy = false;
  if (S.setupIndex < HELIS.length) { promptPlaceHeli(); return; }
  setMessage('配置OK！ 「スタート」で犯人が隠れます', 'police');
  setActions([
    { label: '🚨 スタート', cls: 'primary', onClick: () => beginGame(S.session) },
    { label: '置き直す', onClick: redoSetup },
  ]);
}

async function beginGame(sid) {
  const g = S.game;
  if (!g.isSetupComplete()) return;
  setActions([]);
  g.start();
  updateHud();
  await thiefPhase(sid);
}

// ---------- 犯人フェーズ ----------
async function thiefPhase(sid) {
  const g = S.game;
  if (sid !== S.session) return;
  updateHud();
  S.renderer.resetFocus();
  audio.roundStart();
  await showBanner(`ROUND ${g.round}`, g.round === 1 ? '犯人がどこかに隠れる…' : g.round === MAX_ROUNDS ? '最終ラウンド！' : '犯人が移動する…');
  if (sid !== S.session) return;
  if (g.isSurrounded()) {
    g.declareSurrounded();
    await endGame(sid);
    return;
  }
  if (humanControls('thief')) {
    if (S.mode === 'hotseat') await handover('thief');
    if (sid !== S.session) return;
    await humanThiefTurn(sid);
  } else {
    await aiThiefTurn(sid);
  }
}

async function humanThiefTurn(sid) {
  const g = S.game;
  const r = S.renderer;
  S.busy = true;
  r.showPathMarkers(g.thief.path);
  if (g.thief.pos !== null) await r.showThiefPosition(g.thief.pos);
  if (sid !== S.session) return;
  S.busy = false;
  S.pendingThief = null;
  const cands = g.thiefCandidates();
  r.clearHighlights();
  r.highlightBuildings(cands, 0xff4d6d);
  r.setPickable({ buildings: cands });
  setMessage(g.round === 1
    ? '<span class="k thief">赤く光るビル</span>をタップして隠れる場所を決めよう（どこでもOK）'
    : '<span class="k thief">となり（タテヨコ）のビル</span>をタップして移動しよう', 'thief');
  setActions([]);
}

function onThiefTap(hit) {
  if (hit.type !== 'building') return;
  const g = S.game;
  const cands = g.thiefCandidates();
  if (!cands.includes(hit.index)) { audio.invalid(); return; }
  S.pendingThief = hit.index;
  audio.select();
  const r = S.renderer;
  r.clearHighlights();
  r.highlightBuildings(cands, 0xff4d6d);
  r.highlightBuildings([hit.index], 0xffffff);
  setMessage(`<b>${coordName(hit.index)}</b> のビルに隠れる？`, 'thief');
  setActions([
    { label: '🚗 ここに隠れる', cls: 'accent', onClick: confirmThief },
    { label: 'やめる', onClick: () => { S.pendingThief = null; audio.cancel(); humanThiefTurn(S.session); } },
  ]);
}

async function confirmThief() {
  const g = S.game;
  const r = S.renderer;
  const sid = S.session;
  const b = S.pendingThief;
  if (b === null || g.phase !== 'thief') return;
  S.busy = true;
  S.pendingThief = null;
  r.setPickable({}); r.clearHighlights(); setActions([]);
  const from = g.thief.pos;
  const ev = g.thiefMove(b);
  updateRoundBoard();
  setMessage('移動中…', 'thief');
  audio.engine();
  await r.animateThiefMove({ from, to: b, color: ev.color, round: g.round });
  if (sid !== S.session) return;
  r.clearPathMarkers();
  await r.hideThiefPosition();
  if (sid !== S.session) return;
  S.busy = false;
  if (S.mode === 'hotseat') await handover('police');
  if (sid !== S.session) return;
  await policePhase(sid);
}

async function aiThiefTurn(sid) {
  const g = S.game;
  setMessage('犯人が移動中… 警察は目を閉じて！', 'thief');
  setActions([]);
  S.renderer.setPickable({});
  showDim(true);
  audio.sneak();
  await wait(1000);
  if (sid !== S.session) return;
  const b = thiefDecide(g, settings.difficulty, rng);
  g.thiefMove(b);
  updateRoundBoard();
  await wait(450);
  showDim(false);
  if (sid !== S.session) return;
  await wait(300);
  await policePhase(sid);
}

// ---------- 警察フェーズ ----------
async function policePhase(sid) {
  if (sid !== S.session) return;
  updateHud();
  if (humanControls('police')) humanPoliceTurn();
  else await aiPoliceTurn(sid);
}

function humanPoliceTurn() {
  const g = S.game;
  const r = S.renderer;
  S.selectedHeli = null;
  r.clearHighlights();
  r.setSelectedHeli(null);
  const unacted = g.unactedHelis().map((h) => h.id);
  r.setPickable({ helis: unacted });
  setMessage('行動する<span class="k">ヘリ</span>をタップ（移動 か 捜索）', 'police');
  setActions([]);
  updateHeliChips();
  updateHint();
}

function selectHeli(id) {
  const g = S.game;
  if (S.busy || g.phase !== 'police' || g.helis[id].acted) return;
  S.selectedHeli = id;
  audio.select();
  const r = S.renderer;
  const { moves, searches } = g.heliOptions(id);
  r.clearHighlights();
  r.setSelectedHeli(id);
  r.highlightIntersections(moves, 0x7dd3fc);
  r.highlightBuildings(searches, 0xffa94d);
  r.setPickable({ intersections: moves, buildings: searches, helis: g.unactedHelis().map((h) => h.id) });
  setMessage(`${heliName(id)}：<span class="k move">青い交差点</span>へ移動 か <span class="k search">オレンジのビル</span>を捜索`, 'police');
  setActions([{ label: 'ヘリを選び直す', onClick: () => { audio.cancel(); humanPoliceTurn(); } }]);
  updateHeliChips();
}

function onPoliceTap(hit) {
  const g = S.game;
  if (hit.type === 'heli') { selectHeli(hit.index); return; }
  if (S.selectedHeli === null) return;
  const id = S.selectedHeli;
  const { moves, searches } = g.heliOptions(id);
  if (hit.type === 'intersection' && moves.includes(hit.index)) runPoliceAction({ heliId: id, type: 'move', target: hit.index }).then(() => afterPoliceAction(S.session));
  else if (hit.type === 'building' && searches.includes(hit.index)) runPoliceAction({ heliId: id, type: 'search', target: hit.index }).then(() => afterPoliceAction(S.session));
  else audio.invalid();
}

/** ヘリの行動を適用して演出する（人間/AI共通） */
async function runPoliceAction(act) {
  const g = S.game;
  const r = S.renderer;
  const sid = S.session;
  S.busy = true;
  S.selectedHeli = null;
  r.setPickable({}); r.clearHighlights(); r.setSelectedHeli(null);
  setActions([]);
  if (act.type === 'move') {
    g.heliMove(act.heliId, act.target);
    updateHeliChips();
    audio.heliMove();
    setMessage(`${heliName(act.heliId)}が移動`, 'police');
    await r.moveHeli(act.heliId, act.target);
  } else {
    const ev = g.heliSearch(act.heliId, act.target);
    S.stats.searches++;
    updateHeliChips();
    audio.lift();
    setMessage(`${heliName(act.heliId)}が <b>${coordName(act.target)}</b> のビルを捜索中…`, 'police');
    r.focusBuilding(act.target, 0.3);
    const resultTimer = setTimeout(() => {
      if (sid !== S.session) return;
      if (ev.result === 'nothing') { audio.nothing(); toast(`${coordName(act.target)}：何もなし…`); }
      else if (ev.result === 'trace') {
        S.stats.traces++;
        audio.trace(ev.color);
        showBanner('痕跡発見！', `${COLOR_NAME[ev.color]}の痕跡コマ（${ev.color === 'yellow' ? 'スタート地点' : ev.color === 'red' ? '6ラウンド目' : '2〜5・7〜11ラウンド目'}）`, 'trace');
      } else {
        audio.arrest();
        showBanner('逮捕！！', `${coordName(act.target)} のビルで車を発見`, 'danger');
      }
    }, 700);
    await r.animateSearch({ heliId: act.heliId, building: act.target, result: ev.result, color: ev.color, onLower: () => audio.drop() });
    clearTimeout(resultTimer);
    if (ev.result === 'trace') setMessage(`<b>${coordName(act.target)}</b> で <span class="tk ${ev.color}">${ev.color === 'yellow' ? '1' : '!'}</span>${COLOR_NAME[ev.color]}の痕跡を発見！`, 'police');
    else if (ev.result === 'nothing') setMessage(`<b>${coordName(act.target)}</b> には何もなかった…`, 'police');
  }
  updateRoundBoard();
  S.busy = false;
}

async function afterPoliceAction(sid) {
  const g = S.game;
  if (sid !== S.session) return;
  updateHud();
  if (g.isOver()) { await endGame(sid); return; }
  if (g.phase === 'police') { humanPoliceTurn(); return; }
  await thiefPhase(sid);
}

async function aiPoliceTurn(sid) {
  const g = S.game;
  while (g.phase === 'police' && sid === S.session) {
    showAiChip(true);
    setMessage('警察が考え中…', 'police');
    audio.thinking();
    await wait(700);
    if (sid !== S.session) return;
    const act = policeDecide(g, settings.difficulty, rng);
    showAiChip(false);
    if (!act) break;
    await runPoliceAction(act);
    if (sid !== S.session) return;
    updateHud();
    if (g.isOver()) { await endGame(sid); return; }
    await wait(350);
  }
  if (sid !== S.session) return;
  if (g.phase === 'thief') await thiefPhase(sid);
}

// ---------- 終了 ----------
async function endGame(sid) {
  const g = S.game;
  const r = S.renderer;
  const res = g.result;
  r.setPickable({}); r.clearHighlights(); r.setSelectedHeli(null); r.setHeat(null);
  setActions([]);
  updateHud();
  audio.stopBgm();
  const humanRole = humanRoleLabel();
  const humanWon = humanRole ? res.winner === humanRole : null;
  if (res.reason === 'arrested') {
    setMessage('🚨 逮捕！ 警察チームの勝ち！', 'police');
    await wait(1400);
  } else if (res.reason === 'escaped') {
    setMessage('🏁 逃走成功！ 犯人の勝ち！', 'thief');
    await showBanner('逃走成功！', '11ラウンド逃げ切った！');
    audio.escape();
    await r.animateEscape(res.building);
  } else if (res.reason === 'surrounded') {
    setMessage('🚧 包囲！ 犯人は動けない… 警察チームの勝ち！', 'police');
    audio.surrounded();
    await showBanner('包囲！', '犯人は動けなくなった', 'danger');
    r.showCarAt(res.building, true);
    await r.liftBuilding(res.building, 1.45, 0.5, undefined, 0.95);
    r.startStrobe(res.building);
    await wait(900);
  }
  if (sid !== S.session) return;
  if (humanWon === true) audio.win(); else if (humanWon === false) audio.lose();
  showResult(res, humanWon);
}

function showResult(res, humanWon) {
  const g = S.game;
  const policeWin = res.winner === 'police';
  ui.resultOverlay.querySelector('.result-card').className = `result-card ${res.winner}`;
  ui.resultBadge.textContent = res.reason === 'arrested' ? '🚨' : res.reason === 'escaped' ? '🏁' : '🚧';
  ui.resultTitle.textContent = res.reason === 'arrested' ? '逮捕！' : res.reason === 'escaped' ? '逃走成功！' : '包囲！';
  let text = policeWin ? '警察チームの勝ち！' : '犯人の勝ち！';
  if (humanWon === true) text += ' あなたの勝ちです🎉';
  else if (humanWon === false) text += ' ざんねん…';
  if (res.reason === 'arrested') text += `<br><small>${HELIS[res.heliId].name}のヘリが ${coordName(res.building)} で車を発見</small>`;
  if (res.reason === 'surrounded') text += `<br><small>${coordName(res.building)} から動けるビルがなくなった</small>`;
  ui.resultText.innerHTML = text;
  const leftBehind = Math.max(0, g.thief.path.length - 1);
  ui.resultStats.innerHTML = [
    ['ラウンド', `${res.round}<small>/11</small>`],
    ['捜索した回数', String(S.stats.searches)],
    ['見つけた痕跡', `${S.stats.traces}<small>/${leftBehind}</small>`],
  ].map(([l, v]) => `<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');
  show(ui.resultOverlay);
}

async function revealRoute() {
  const g = S.game;
  const r = S.renderer;
  hide(ui.resultOverlay);
  S.routeShown = true;
  audio.tap();
  setMessage(`🗺️ 犯人の逃走ルート（<span class="tk yellow">1</span>→ … →<b>${g.thief.path.length}</b>）`, 'thief');
  setActions([
    { label: '🔁 もう一回', cls: 'primary', onClick: () => startGame(S.mode) },
    { label: '結果を見る', onClick: () => { audio.tap(); show(ui.resultOverlay); } },
    { label: 'タイトルへ', onClick: goTitle },
  ]);
  r.stopStrobe();
  await r.revealRoute(g.thief.path);
}

// ---------- 入力 ----------
function onTap(hit) {
  const g = S.game;
  if (!g || S.busy) return;
  audio.init();
  if (!ui.menuOverlay.classList.contains('is-hidden') || !ui.rulesOverlay.classList.contains('is-hidden')) return;
  if (g.phase === 'setup' && humanControls('police')) { onSetupTap(hit); return; }
  if (g.phase === 'thief' && humanControls('thief')) { onThiefTap(hit); return; }
  if (g.phase === 'police' && humanControls('police')) { onPoliceTap(hit); return; }
}

function bindUi() {
  // 難易度
  for (const d of DIFFICULTIES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'seg-btn';
    btn.setAttribute('role', 'radio');
    btn.dataset.diff = d.key;
    btn.title = d.desc;
    btn.textContent = d.name;
    btn.setAttribute('aria-checked', settings.difficulty === d.key ? 'true' : 'false');
    btn.addEventListener('click', () => {
      settings.difficulty = d.key; saveSettings();
      ui.difficulty.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-checked', b.dataset.diff === d.key ? 'true' : 'false'));
      audio.init(); audio.tap();
    });
    ui.difficulty.appendChild(btn);
  }
  // モード
  document.querySelectorAll('.mode-card').forEach((card) => {
    card.addEventListener('click', () => { audio.init(); audio.select(); startGame(card.dataset.mode); });
  });
  ui.btnRules.addEventListener('click', () => { audio.init(); audio.tap(); show(ui.rulesOverlay); });
  ui.btnMenuRules.addEventListener('click', () => { audio.tap(); show(ui.rulesOverlay); });
  ui.btnRulesClose.addEventListener('click', () => { audio.tap(); hide(ui.rulesOverlay); });
  ui.btnTitleSound.addEventListener('click', toggleSound);
  ui.btnSound.addEventListener('click', toggleSound);
  ui.btnMenuSound.addEventListener('click', toggleSound);
  ui.btnMenuBloom.addEventListener('click', () => {
    settings.bloom = !settings.bloom; saveSettings();
    S.renderer.setBloom(settings.bloom);
    updateSoundButtons(); audio.tap();
  });
  ui.btnMenu.addEventListener('click', () => { audio.init(); audio.tap(); show(ui.menuOverlay); });
  ui.btnResume.addEventListener('click', () => { audio.tap(); hide(ui.menuOverlay); });
  ui.btnMenuTitle.addEventListener('click', () => {
    if (S.game && !S.game.isOver() && !window.confirm('ゲームを終了してタイトルにもどりますか？')) return;
    audio.tap(); goTitle();
  });
  ui.btnHint.addEventListener('click', () => {
    S.hint = !S.hint;
    ui.btnHint.setAttribute('aria-pressed', S.hint ? 'true' : 'false');
    audio.init(); audio.tap();
    updateHint();
    toast(S.hint ? '🔍 推理ヒント ON：色が濃いビルほど犯人がいそう' : '推理ヒント OFF', 2200);
  });
  ui.btnReplay.addEventListener('click', () => { audio.tap(); startGame(S.mode); });
  ui.btnTitle.addEventListener('click', () => { audio.tap(); goTitle(); });
  ui.btnRevealRoute.addEventListener('click', revealRoute);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!ui.rulesOverlay.classList.contains('is-hidden')) { hide(ui.rulesOverlay); return; }
      if (!ui.menuOverlay.classList.contains('is-hidden')) { hide(ui.menuOverlay); return; }
      if (S.game && S.game.phase === 'police' && S.selectedHeli !== null && !S.busy) humanPoliceTurn();
      if (S.game && S.game.phase === 'thief' && S.pendingThief !== null && !S.busy) { S.pendingThief = null; humanThiefTurn(S.session); }
    }
    if (e.key === 'Enter' && S.game && S.game.phase === 'thief' && S.pendingThief !== null && !S.busy) confirmThief();
    if (['1', '2', '3'].includes(e.key) && S.game && S.game.phase === 'police' && humanControls('police') && !S.busy) selectHeli(Number(e.key) - 1);
  });
  // 最初の操作でオーディオを起動（iOS対策）
  const unlock = () => { audio.init(); audio.setEnabled(settings.sound); };
  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
}

// ---------- 起動 ----------
function init() {
  buildRoundBoard();
  bindUi();
  audio.enabled = settings.sound;
  updateSoundButtons();
  S.renderer = new CityRenderer(ui.scene, { rng, onTap, bloom: settings.bloom });
  S.renderer.setHeights(randomHeights(rng));
  decorateTitleBoard();
  S.renderer.setTitleMode(true);
  hide(ui.loading);

  // 開発用フック（?debug=1）
  if (new URLSearchParams(location.search).has('debug')) {
    window.__cityChase = { S, startGame, goTitle, selectHeli, runPoliceAction, afterPoliceAction, confirmThief, onTap, settings };
  }
}

init();
