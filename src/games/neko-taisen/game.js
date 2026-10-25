// ねこぐんだん大戦争 - 画面制御 / 入力 / ゲームループ
import { requireAuth } from '../../js/auth.js';
import { resolvePath } from '../../js/config.js';
import {
  UNITS, UNIT_BY_ID, STAGES, THEMES, DECK_SIZE, MAX_UNIT_LEVEL, MAX_CASTLE_LEVEL,
  levelMult, unitLevelCost, castleLevelCost, castleStats, workerStats
} from './data.js';
import { Battle } from './battle.js';
import { Renderer, renderIcon } from './render.js';
import { drawSprite, idleAnim } from './sprites.js';
import { audio } from './audio.js';
import {
  loadSave, persist, resetSave, isStageUnlocked, isUnitUnlocked, normalizeDeck,
  canLevelUpUnit, levelUpUnit, canLevelUpCastle, levelUpCastle, recordResult
} from './save.js';

requireAuth();

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.floor(n).toLocaleString('ja-JP');

// ---------- 状態 ----------
let save = loadSave();
normalizeDeck(save);
audio.setSfx(save.settings.sfx);
audio.setBgm(save.settings.bgm);

let currentStage = null;
let battle = null;
let renderer = null;
let rafId = 0;
let lastTs = 0;
let fighting = false;   // 「たたかう」を押した後
let paused = false;
let speed = save.settings.speed === 2 ? 2 : 1;
let resultShown = false;
let bossMusic = false;
let hudTick = 0;
let cards = [];

// ---------- 画面切り替え ----------
const screens = ['screen-title', 'screen-stages', 'screen-deck', 'screen-battle'];
function show(id) {
  for (const s of screens) $(s).classList.toggle('is-active', s === id);
  if (id === 'screen-title') startTitleAnim(); else stopTitleAnim();
  if (id !== 'screen-battle') { stopBattleLoop(); audio.startBgm('menu'); }
}

$('backLink').href = resolvePath('/pages/portal/portal.html');

// ---------- タイトルのねこ行進 ----------
let titleRaf = 0;
function startTitleAnim() {
  const canvas = $('titleCanvas');
  const ctx = canvas.getContext('2d');
  const ids = ['neko', 'tank', 'axe', 'legs', 'cow', 'bird', 'ninja', 'fish', 'mage', 'lizard', 'knight', 'titan'];
  let t0 = performance.now();
  const loop = (ts) => {
    titleRaf = requestAnimationFrame(loop);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const t = (ts - t0) / 1000;
    // 地面
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, h - 70, w, 70);
    const sc = Math.min(1, w / 700) * 0.9;
    const gap = 110 * sc;
    const total = ids.length * gap;
    for (let i = 0; i < ids.length; i++) {
      const x = ((i * gap + t * 50 * sc) % (total + w + 200)) - 100;
      const ph = t * 8 + i;
      ctx.save();
      ctx.translate(x, h - 74);
      ctx.scale(sc, sc);
      drawSprite(ctx, ids[i], { ...idleAnim(t), bob: Math.abs(Math.sin(ph)), step: Math.sin(ph) });
      ctx.restore();
    }
  };
  stopTitleAnim();
  titleRaf = requestAnimationFrame(loop);
}
function stopTitleAnim() { if (titleRaf) cancelAnimationFrame(titleRaf); titleRaf = 0; }

// ---------- ステージ選択 ----------
function starsHtml(n, cls = '') {
  let s = '';
  for (let i = 1; i <= 3; i++) s += `<span class="${i <= n ? '' : 'off'}">★</span>`;
  return `<span class="${cls}">${s}</span>`;
}

function renderStages() {
  $('xpStages').textContent = fmt(save.xp);
  const grid = $('stageGrid');
  grid.innerHTML = '';
  let nextMarked = false;
  for (const st of STAGES) {
    const rec = save.stages[st.id];
    const unlocked = isStageUnlocked(save, st.id);
    const theme = THEMES[st.theme];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'stage-card' + (unlocked ? '' : ' is-locked');
    if (unlocked && !(rec && rec.stars) && !nextMarked) { btn.classList.add('is-next'); nextMarked = true; }
    btn.style.setProperty('--sky', `linear-gradient(180deg, ${theme.sky[0]}, ${theme.sky[1]})`);
    const best = rec && rec.bestTime != null ? `ベスト ${Math.floor(rec.bestTime / 60)}:${String(Math.floor(rec.bestTime % 60)).padStart(2, '0')}` : '';
    btn.innerHTML = `
      <div class="num">ステージ ${st.id}</div>
      <div class="name">${st.name}</div>
      <div class="stars">${starsHtml(rec ? rec.stars : 0)}</div>
      <div class="meta"><span>初回 +${st.xp} XP</span><span>${best}</span></div>
      ${unlocked ? '' : '<span class="lock">🔒</span>'}`;
    btn.disabled = !unlocked;
    btn.addEventListener('click', () => { audio.sfx('click'); openBattle(st); });
    grid.appendChild(btn);
  }
}

// ---------- デッキ / 強化 ----------
function unitStatsHtml(u, lv) {
  const m = levelMult(lv);
  return `<span>HP ${fmt(u.hp * m)}</span><span>こうげき ${fmt(u.atk * m)}</span><span>しゃてい ${u.range}</span><span>¥${u.cost}</span>${u.area ? '<span>はんい</span>' : ''}`;
}

function renderDeck() {
  $('xpDeck').textContent = fmt(save.xp);
  normalizeDeck(save);
  // デッキバー
  const bar = $('deckBar');
  bar.innerHTML = '';
  for (let i = 0; i < DECK_SIZE; i++) {
    const id = save.deck[i];
    const slot = document.createElement('div');
    slot.className = 'deck-slot' + (id ? ' is-filled' : '');
    if (id) {
      const c = document.createElement('canvas');
      slot.appendChild(c);
      renderIcon(c, id, 44);
      slot.insertAdjacentHTML('beforeend', `<span class="nm">${UNIT_BY_ID[id].name}</span><span class="lv">Lv${save.unitLevels[id]}</span>`);
    }
    bar.appendChild(slot);
  }
  $('deckNote').textContent = `出撃する ねこを ${DECK_SIZE}体まで えらべるよ（いま ${save.deck.length}体）`;

  // お城
  const cs = castleStats(save.castleLevel);
  const castleMax = save.castleLevel >= MAX_CASTLE_LEVEL;
  $('castleCard').innerHTML = `
    <div class="icon">🏰</div>
    <div class="info">
      <div class="ttl"><span class="nm">ねこ城</span><span class="lvb">Lv ${save.castleLevel}</span></div>
      <div class="desc">城のHP ${fmt(cs.baseHp)} ／ キャノン ${fmt(cs.cannonDamage)} ダメージ ／ じゅうでん ${cs.cannonCooldown.toFixed(0)}秒</div>
    </div>
    <div class="acts">
      <button class="btn btn-up" id="btnCastleUp" type="button" ${castleMax || !canLevelUpCastle(save) ? 'disabled' : ''}>${castleMax ? 'MAX' : `レベルアップ<br>${fmt(castleLevelCost(save.castleLevel))} XP`}</button>
    </div>`;
  const cb = $('btnCastleUp');
  if (cb) cb.addEventListener('click', () => { if (levelUpCastle(save)) { audio.sfx('levelup'); renderDeck(); } });

  // ユニット一覧
  const list = $('unitList');
  list.innerHTML = '';
  for (const u of UNITS) {
    const unlocked = isUnitUnlocked(save, u);
    const lv = save.unitLevels[u.id] || 1;
    const inDeck = save.deck.includes(u.id);
    const card = document.createElement('div');
    card.className = 'unit-card' + (unlocked ? '' : ' is-locked') + (inDeck ? ' is-in-deck' : '');
    const iconWrap = document.createElement('div');
    iconWrap.className = 'icon';
    if (unlocked) { const c = document.createElement('canvas'); iconWrap.appendChild(c); renderIcon(c, u.id, 60); }
    else iconWrap.textContent = '❓';
    card.appendChild(iconWrap);
    const info = document.createElement('div');
    info.className = 'info';
    if (unlocked) {
      info.innerHTML = `
        <div class="ttl"><span class="nm">${u.name}</span><span class="role">${u.role}</span><span class="lvb">Lv ${lv}</span></div>
        <div class="desc">${u.desc}</div>
        <div class="stats">${unitStatsHtml(u, lv)}</div>`;
    } else {
      info.innerHTML = `
        <div class="ttl"><span class="nm">？？？</span><span class="role">${u.role}</span></div>
        <div class="unlock-note">ステージ ${u.unlock} を クリアで 解放</div>`;
    }
    card.appendChild(info);
    const acts = document.createElement('div');
    acts.className = 'acts';
    if (unlocked) {
      const tog = document.createElement('button');
      tog.type = 'button';
      tog.className = 'btn ' + (inDeck ? 'btn-deck-on' : 'btn-deck-off');
      tog.textContent = inDeck ? '✓ デッキ入り' : 'デッキに入れる';
      tog.addEventListener('click', () => {
        if (inDeck) {
          if (save.deck.length <= 1) { audio.sfx('error'); toastDeck('さいごの1体は はずせないよ'); return; }
          save.deck = save.deck.filter((id) => id !== u.id);
        } else {
          if (save.deck.length >= DECK_SIZE) { audio.sfx('error'); toastDeck(`デッキは ${DECK_SIZE}体まで！ どれかを はずそう`); return; }
          save.deck.push(u.id);
        }
        audio.sfx('click');
        persist(save);
        renderDeck();
      });
      acts.appendChild(tog);
      const up = document.createElement('button');
      up.type = 'button';
      up.className = 'btn btn-up';
      const maxed = lv >= MAX_UNIT_LEVEL;
      up.innerHTML = maxed ? 'MAX' : `レベルアップ<br>${fmt(unitLevelCost(lv))} XP`;
      up.disabled = maxed || !canLevelUpUnit(save, u.id);
      up.addEventListener('click', () => { if (levelUpUnit(save, u.id)) { audio.sfx('levelup'); renderDeck(); } });
      acts.appendChild(up);
    }
    card.appendChild(acts);
    list.appendChild(card);
  }
}

let deckToastTimer = 0;
function toastDeck(msg) {
  const el = $('deckNote');
  const prev = el.textContent;
  el.textContent = msg;
  clearTimeout(deckToastTimer);
  deckToastTimer = setTimeout(() => { el.textContent = prev; }, 1800);
}

// ---------- バトル ----------
function openBattle(stage) {
  currentStage = stage;
  normalizeDeck(save);
  battle = new Battle({ stage, deck: save.deck, unitLevels: save.unitLevels, castleLevel: save.castleLevel });
  const canvas = $('battleCanvas');
  renderer = new Renderer(canvas, battle, stage.theme);
  renderer.showBase();
  fighting = false;
  paused = false;
  resultShown = false;
  bossMusic = false;
  $('battleStageName').textContent = `${stage.id}. ${stage.name}`;
  $('readyNum').textContent = `ステージ ${stage.id}`;
  $('readyName').textContent = stage.name;
  $('readyHint').textContent = `💡 ${stage.hint}`;
  $('readyOverlay').classList.add('is-on');
  $('pauseOverlay').classList.remove('is-on');
  $('resultOverlay').classList.remove('is-on');
  $('bossBar').classList.remove('is-on');
  $('bossBanner').classList.remove('is-on');
  $('battleStage').style.background = THEMES[stage.theme].sky[0];
  buildDeployCards();
  updateSpeedBtn();
  updateSoundBtn();
  show('screen-battle');
  stopTitleAnim();
  requestAnimationFrame(() => { renderer.resize(); renderer.showBase(); startBattleLoop(); });
}

function buildDeployCards() {
  const bar = $('deployBar');
  bar.innerHTML = '';
  cards = [];
  for (let i = 0; i < DECK_SIZE; i++) {
    const slot = battle.slots[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    if (!slot) {
      btn.className = 'card is-empty';
      btn.disabled = true;
      bar.appendChild(btn);
      cards.push(null);
      continue;
    }
    btn.className = 'card';
    const c = document.createElement('canvas');
    btn.appendChild(c);
    renderIcon(c, slot.id, 42);
    btn.insertAdjacentHTML('beforeend', `<span class="key">${(i + 1) % 10}</span><span class="lv">Lv${slot.level}</span><span class="nm">${slot.def.name}</span><span class="cost">¥${slot.def.cost}</span><i class="cd"></i>`);
    btn.setAttribute('aria-label', `${slot.def.name} を出す（¥${slot.def.cost}）`);
    btn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); tryDeploy(i); });
    bar.appendChild(btn);
    cards.push({ btn, cd: btn.querySelector('.cd'), slot });
  }
}

function tryDeploy(i) {
  if (!battle || !fighting || paused || battle.result) return;
  if (battle.deploy(i)) {
    audio.sfx('deploy');
    const c = cards[i];
    if (c) { c.btn.classList.remove('is-flash'); void c.btn.offsetWidth; c.btn.classList.add('is-flash'); }
  } else {
    const s = battle.slots[i];
    if (s && battle.money < s.def.cost) { audio.sfx('error'); toast('お金が たりない！'); }
  }
}

let toastTimer = 0;
function toast(msg, ms = 1200) {
  const el = $('hintToast');
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), ms);
}

function beginFight() {
  $('readyOverlay').classList.remove('is-on');
  fighting = true;
  paused = false;
  audio.ensure();
  audio.sfx('start');
  audio.startBgm('battle');
  renderer.centerOnFront();
  renderer.showBase();
  renderer.followHold = 1.2;
  toast(currentStage.hint, 4000);
}

function startBattleLoop() {
  stopBattleLoop();
  lastTs = performance.now();
  const loop = (ts) => {
    rafId = requestAnimationFrame(loop);
    let dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!battle || !renderer) return;
    const running = fighting && !paused;
    if (running) {
      const sdt = dt * speed;
      battle.update(sdt);
      handleEvents(battle.drainEvents());
      renderer.update(sdt);
    } else {
      battle.drainEvents();
      renderer.update(dt);
    }
    renderer.draw();
    hudTick += dt;
    if (hudTick > 0.08) { hudTick = 0; updateHud(); }
    if (battle.result && !resultShown && battle.resultT > 1.7) showResult();
  };
  rafId = requestAnimationFrame(loop);
}

function stopBattleLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

function handleEvents(events) {
  renderer.handleEvents(events);
  for (const ev of events) {
    switch (ev.type) {
      case 'hit': if (ev.crit) audio.sfx('crit'); else audio.sfx('hit'); break;
      case 'kill': audio.sfx('kill'); audio.sfx('coin'); break;
      case 'catdown': audio.sfx('catdown'); break;
      case 'kb': audio.sfx('kb'); break;
      case 'cannon': audio.sfx('cannon'); break;
      case 'worker': audio.sfx('worker'); break;
      case 'boss': {
        audio.sfx('boss');
        const b = $('bossBanner');
        b.textContent = `⚠ ${ev.entity.def.name} 出現！`;
        b.classList.remove('is-on'); void b.offsetWidth; b.classList.add('is-on');
        if (!bossMusic) { bossMusic = true; audio.startBgm('boss'); }
        renderer.follow = false; renderer.followHold = 0.01;
        renderer.camX = renderer.clampCam(ev.entity.x - renderer.viewW * 0.3);
        break;
      }
      case 'win': audio.stopBgm(); audio.sfx('win'); break;
      case 'lose': audio.stopBgm(); audio.sfx('lose'); break;
      default: break;
    }
  }
}

function updateHud() {
  const b = battle;
  const ws = workerStats(b.workerLevel);
  $('moneyNow').textContent = fmt(b.money);
  $('moneyCap').textContent = fmt(ws.cap);
  // はたらきねこ
  const cost = b.workerUpgradeCost;
  $('workerLv').textContent = `Lv ${b.workerLevel}`;
  $('workerCost').textContent = cost === null ? 'MAX' : `¥${cost}`;
  $('btnWorker').disabled = !b.canUpgradeWorker();
  // キャノン
  const ready = b.cannon.charge >= 1;
  $('cannonFill').style.height = `${Math.round(b.cannon.charge * 100)}%`;
  $('cannonText').textContent = ready ? 'はっしゃ！' : `${Math.round(b.cannon.charge * 100)}%`;
  $('btnCannon').classList.toggle('is-ready', ready);
  $('btnCannon').disabled = !ready || !fighting;
  // カード
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (!c) continue;
    const s = c.slot;
    const poor = b.money < s.def.cost;
    const cd = s.cdT > 0;
    c.btn.classList.toggle('is-poor', poor && !cd);
    c.btn.classList.toggle('is-cd', cd);
    c.cd.style.height = cd ? `${Math.round((s.cdT / s.def.cd) * 100)}%` : '0%';
  }
  // ボスバー
  const boss = b.enemies.find((e) => e.isBoss && e.alive);
  const bar = $('bossBar');
  if (boss) {
    bar.classList.add('is-on');
    $('bossName').textContent = `BOSS ${boss.def.name}`;
    $('bossFill').style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`;
  } else {
    bar.classList.remove('is-on');
    if (bossMusic && fighting && !b.result) { bossMusic = false; audio.startBgm('battle'); }
  }
}

function showResult() {
  resultShown = true;
  const b = battle;
  const win = b.result === 'win';
  const baseRatio = b.playerBase.hp / b.playerBase.maxHp;
  const r = recordResult(save, currentStage, { win, baseHpRatio: baseRatio, time: b.time, deploys: b.deployCount, kills: b.killCount });
  const dlg = $('resultDialog');
  const mm = Math.floor(b.time / 60), ss = String(Math.floor(b.time % 60)).padStart(2, '0');
  let html = '';
  if (win) {
    html += `<h3 class="win">🎉 ステージクリア！</h3>
      <div class="big-stars">${starsHtml(baseRatio >= 0.999 ? 3 : baseRatio >= 0.5 ? 2 : 1)}</div>
      <div class="reward">XP <b>+${fmt(r.xp)}</b></div>
      <div class="result-stats"><span>⏱ ${mm}:${ss}</span><span>🐱 ${b.deployCount}体 出撃</span><span>💥 ${b.killCount}体 げきは</span></div>`;
    for (const u of r.newUnlocks) {
      html += `<div class="unlock"><canvas data-icon="${u.id}"></canvas><span>新しい ねこ「${u.name}」が なかまに！</span></div>`;
    }
    html += `<div class="actions">
      ${r.nextStage ? `<button class="btn btn-primary btn-lg" id="resNext" type="button">つぎのステージへ ▶</button>` : `<p>すべてのステージを クリア！ きみは ねこぐんだんの えいゆうだ！</p>`}
      <button class="btn btn-secondary" id="resDeck" type="button">🐱 ねこを強化する</button>
      <button class="btn btn-ghost" id="resRetry" type="button" style="color:#2b2b2b">もう一度</button>
      <button class="btn btn-ghost" id="resBack" type="button" style="color:#2b2b2b">ステージ選択へ</button>
    </div>`;
  } else {
    html += `<h3 class="lose">😿 まけちゃった…</h3>
      <p>ねこ城が こわされてしまった。<br>XP で ねこを 強くして もういちど ちょうせんしよう！</p>
      <div class="reward">XP <b>+${fmt(r.xp)}</b></div>
      <div class="result-stats"><span>⏱ ${mm}:${ss}</span><span>🐱 ${b.deployCount}体 出撃</span><span>💥 ${b.killCount}体 げきは</span></div>
      <div class="stage-hint">💡 ${currentStage.hint}</div>
      <div class="actions">
        <button class="btn btn-primary btn-lg" id="resRetry" type="button">もう一度 ちょうせん</button>
        <button class="btn btn-secondary" id="resDeck" type="button">🐱 ねこを強化する</button>
        <button class="btn btn-ghost" id="resBack" type="button" style="color:#2b2b2b">ステージ選択へ</button>
      </div>`;
  }
  dlg.innerHTML = html;
  dlg.querySelectorAll('canvas[data-icon]').forEach((c) => renderIcon(c, c.dataset.icon, 48));
  $('resultOverlay').classList.add('is-on');
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', () => { audio.sfx('click'); fn(); }); };
  on('resNext', () => openBattle(STAGES.find((s) => s.id === r.nextStage)));
  on('resRetry', () => openBattle(currentStage));
  on('resDeck', () => { renderDeck(); show('screen-deck'); });
  on('resBack', () => { renderStages(); show('screen-stages'); });
}

// ---------- 入力 ----------
$('btnStart').addEventListener('click', () => { audio.ensure(); audio.sfx('click'); audio.startBgm('menu'); renderStages(); show('screen-stages'); });
$('btnHowto').addEventListener('click', () => { audio.ensure(); audio.sfx('click'); $('howtoOverlay').classList.add('is-on'); });
$('btnHowtoClose').addEventListener('click', () => { audio.sfx('click'); $('howtoOverlay').classList.remove('is-on'); });
$('btnReset').addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('セーブデータを ぜんぶ けします。ほんとうに いい？')) {
    save = resetSave();
    persist(save);
    audio.sfx('click');
    alert('リセットしました');
  }
});
$('btnStagesBack').addEventListener('click', () => { audio.sfx('click'); show('screen-title'); });
$('btnDeck').addEventListener('click', () => { audio.sfx('click'); renderDeck(); show('screen-deck'); });
$('btnDeckBack').addEventListener('click', () => { audio.sfx('click'); renderStages(); show('screen-stages'); });

$('btnFight').addEventListener('click', beginFight);
$('btnReadyBack').addEventListener('click', () => { audio.sfx('click'); renderStages(); show('screen-stages'); });

$('btnPause').addEventListener('click', () => { if (!fighting || battle.result) return; togglePause(); });
function togglePause() {
  paused = !paused;
  $('pauseOverlay').classList.toggle('is-on', paused);
  updateToggleBtns();
  audio.sfx('click');
}
$('btnResume').addEventListener('click', () => { if (paused) togglePause(); });
$('btnRetry').addEventListener('click', () => { audio.sfx('click'); openBattle(currentStage); });
$('btnGiveup').addEventListener('click', () => { audio.sfx('click'); renderStages(); show('screen-stages'); });

$('btnSpeed').addEventListener('click', () => {
  speed = speed === 1 ? 2 : 1;
  save.settings.speed = speed; persist(save);
  updateSpeedBtn(); audio.sfx('click');
});
function updateSpeedBtn() {
  const b = $('btnSpeed');
  b.textContent = `x${speed}`;
  b.classList.toggle('is-fast', speed === 2);
}

$('btnSound').addEventListener('click', () => {
  const on = !(save.settings.sfx || save.settings.bgm);
  save.settings.sfx = on; save.settings.bgm = on; persist(save);
  audio.setSfx(on); audio.setBgm(on);
  updateSoundBtn(); updateToggleBtns();
  if (on) audio.sfx('click');
});
function updateSoundBtn() { $('btnSound').textContent = (save.settings.sfx || save.settings.bgm) ? '🔊' : '🔇'; }

$('togSfx').addEventListener('click', () => { save.settings.sfx = !save.settings.sfx; persist(save); audio.setSfx(save.settings.sfx); updateToggleBtns(); updateSoundBtn(); audio.sfx('click'); });
$('togBgm').addEventListener('click', () => { save.settings.bgm = !save.settings.bgm; persist(save); audio.setBgm(save.settings.bgm); updateToggleBtns(); updateSoundBtn(); audio.sfx('click'); });
function updateToggleBtns() {
  for (const [id, on] of [['togSfx', save.settings.sfx], ['togBgm', save.settings.bgm]]) {
    const el = $(id);
    el.textContent = on ? 'ON' : 'OFF';
    el.classList.toggle('is-on', on);
    el.classList.toggle('is-off', !on);
  }
}
updateToggleBtns();

$('btnWorker').addEventListener('pointerdown', (e) => { e.preventDefault(); if (battle && fighting && !paused) { if (!battle.upgradeWorker()) audio.sfx('error'); } });
$('btnCannon').addEventListener('pointerdown', (e) => { e.preventDefault(); if (battle && fighting && !paused) battle.fireCannon(); });
$('btnCenter').addEventListener('click', () => { if (renderer) renderer.centerOnFront(); });

// キャンバスのドラッグでスクロール
(() => {
  const canvas = $('battleCanvas');
  let dragging = false;
  let lastX = 0;
  let moved = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; moved = 0; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !renderer) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    renderer.pan(dx);
  });
  const end = () => { dragging = false; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
})();

// キーボード
const keysDown = new Set();
window.addEventListener('keydown', (e) => {
  if (!$('screen-battle').classList.contains('is-active')) return;
  if (e.repeat) return;
  const k = e.key;
  if (k >= '1' && k <= '9') { tryDeploy(Number(k) - 1); e.preventDefault(); }
  else if (k === '0') { tryDeploy(9); e.preventDefault(); }
  else if (k === ' ' || k.toLowerCase() === 'c') { if (battle && fighting && !paused) battle.fireCannon(); e.preventDefault(); }
  else if (k.toLowerCase() === 'w') { if (battle && fighting && !paused) battle.upgradeWorker(); }
  else if (k.toLowerCase() === 'p' || k === 'Escape') { if (fighting && battle && !battle.result) togglePause(); }
  else if (k.toLowerCase() === 'f') { $('btnSpeed').click(); }
  else if (k === 'Enter') { if (!fighting && $('readyOverlay').classList.contains('is-on')) beginFight(); }
  else if (k === 'ArrowLeft' || k === 'ArrowRight') { keysDown.add(k); e.preventDefault(); }
});
window.addEventListener('keyup', (e) => keysDown.delete(e.key));
setInterval(() => {
  if (!renderer || !keysDown.size) return;
  if (keysDown.has('ArrowLeft')) renderer.pan(18);
  if (keysDown.has('ArrowRight')) renderer.pan(-18);
}, 16);

// リサイズ
const onResize = () => { if (renderer) renderer.resize(); };
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 150));
if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);

// 非表示になったら自動ポーズ
document.addEventListener('visibilitychange', () => {
  if (document.hidden && fighting && battle && !battle.result && !paused) togglePause();
});

// 開発用フック（コンソールから状態を見るため）
window.__nekoTaisen = { getBattle: () => battle, getSave: () => save };

// 開始
show('screen-title');
