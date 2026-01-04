import { getCurrentPlayer } from '../../js/auth.js';
import { getRankings, saveScore } from '../../js/score.js';
import { avatarToHtml } from '../../js/avatar.js';
import { initOverlay } from './overlay.js';
import {
  ENEMY_DEFAULT,
  GAME_ID,
  STAGE_COLS,
  STAGE_ROWS,
  WALL_CELL,
  WALL_ROWS,
  clamp,
  ensureStages,
  escapeHtml,
  getStageFromUrl,
  loadEnemySprite,
  normalizeStage
} from './shared.js';

function qs(id) {
  return document.getElementById(id);
}

// DOM
const canvas = qs('gameCanvas');
const ctx = canvas.getContext('2d');
const stageLabel = qs('stageLabel');
const scoreEl = qs('score');
const livesEl = qs('lives');
const enemiesEl = qs('enemies');
const pauseBtn = qs('pauseBtn');
const resetBtn = qs('resetBtn');

const btnLeft = qs('btnLeft');
const btnRight = qs('btnRight');
const btnFire = qs('btnFire');

const { showOverlay, closeOverlay } = initOverlay();

// Canvas (DPR)
let viewW = 600;
let viewH = 520;

function applyDpr(canvasEl, context2d) {
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const rect = canvasEl.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvasEl.width = Math.round(w * dpr);
  canvasEl.height = Math.round(h * dpr);
  context2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}

function resizeGameCanvas() {
  const { w, h } = applyDpr(canvas, ctx);
  viewW = w;
  viewH = h;
  layout();
}

window.addEventListener('resize', () => {
  resizeGameCanvas();
  draw();
});

// Input
const keys = new Set();
document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'a', 'd', ' ', 'space'].includes(k)) e.preventDefault();
  keys.add(k);
});
document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const touch = { left: false, right: false, fire: false };

function setupHoldButton(btn, key) {
  if (!btn) return;
  btn.addEventListener('pointerdown', (e) => {
    btn.setPointerCapture?.(e.pointerId);
    touch[key] = true;
    e.preventDefault();
  });
  function end() {
    touch[key] = false;
  }
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('pointerleave', end);
}
setupHoldButton(btnLeft, 'left');
setupHoldButton(btnRight, 'right');

// Fire is tap (and hold works as rapid but limited by cooldown)
if (btnFire) {
  btnFire.addEventListener('pointerdown', (e) => {
    btnFire.setPointerCapture?.(e.pointerId);
    touch.fire = true;
    e.preventDefault();
  });
  btnFire.addEventListener('pointerup', () => (touch.fire = false));
  btnFire.addEventListener('pointercancel', () => (touch.fire = false));
  btnFire.addEventListener('pointerleave', () => (touch.fire = false));
}

// Stage
let playingStageName = null;
let stage = null;
let spriteCache = new Map(); // token -> EnemySprite

function setStageLabel(name) {
  if (stageLabel) stageLabel.textContent = `ステージ：${name || '—'}`;
}

async function prepareSpritesForStage(s) {
  const tokens = new Set();
  for (const cell of s.grid) {
    if (cell == null) continue;
    tokens.add(cell);
  }
  const tasks = [];
  for (const t of tokens) {
    if (spriteCache.has(t)) continue;
    tasks.push(
      (async () => {
        const spr = await loadEnemySprite(t);
        spriteCache.set(t, spr);
      })()
    );
  }
  await Promise.all(tasks);
}

// Game state
let isRunning = false;
let isPaused = false;
let lastT = 0;

let score = 0;
let lives = 3;

const player = {
  x: 0,
  y: 0,
  w: 44,
  h: 18,
  speed: 520,
  cool: 0
};

const WALL_HP = 3;

let enemies = [];
let bullets = []; // player bullets
let enemyBullets = [];
let walls = [];

const formation = {
  offX: 0,
  offY: 0,
  dir: 1,
  speed: 60,
  descend: 18,
  stepCooldown: 0
};

let enemyShootCooldown = 0;

function layout() {
  player.w = clamp(viewW * 0.08, 38, 64);
  player.h = clamp(viewH * 0.03, 16, 22);
  player.y = viewH - clamp(viewH * 0.10, 48, 70);
  player.speed = clamp(viewW * 0.9, 360, 720);
  player.x = clamp(player.x || (viewW / 2 - player.w / 2), 0, Math.max(0, viewW - player.w));
}

function resetRunStats() {
  score = 0;
  lives = 3;
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
  enemiesEl.textContent = String(enemies.filter((e) => e.alive).length);
}

function setPaused(paused) {
  isPaused = paused;
  pauseBtn.textContent = paused ? '再開' : '一時停止';
}

function stopLoop() {
  isRunning = false;
  setPaused(false);
}

function enemySize() {
  return clamp(viewW * 0.05, 18, 36);
}

function bulletSpeed() {
  return clamp(viewH * 1.3, 720, 980);
}

function enemyBulletSpeed() {
  return clamp(viewH * 0.7, 380, 620);
}

function buildEnemiesFromStage(s) {
  const size = enemySize();
  const gapX = size * 0.35;
  const gapY = size * 0.35;
  const cols = s.cols || STAGE_COLS;
  const rows = s.rows || STAGE_ROWS;

  const totalW = cols * size + (cols - 1) * gapX;
  const left = Math.max(12, Math.floor((viewW - totalW) / 2));
  const top = clamp(viewH * 0.10, 44, 70);

  const list = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const t = s.grid[row * cols + col];
      if (t == null) continue;
      list.push({
        token: t,
        col,
        row,
        x0: left + col * (size + gapX),
        y0: top + row * (size + gapY),
        w: size,
        h: size,
        alive: true,
        animOffsetMs: (col * 97 + row * 53) * 7
      });
    }
  }
  return list;
}

function pickAnimatedFrame(sprite, nowMs, offsetMs = 0) {
  const frames = sprite?.frames || [];
  if (frames.length === 0) return null;
  if (frames.length === 1) return frames[0];
  const total = Math.max(1, Number(sprite.totalDurationMs) || frames.reduce((s, f) => s + (f.durationMs || 120), 0) || 1);
  let t = (nowMs + (Number(offsetMs) || 0)) % total;
  for (const f of frames) {
    const d = Math.max(1, Number(f.durationMs) || 120);
    if (t < d) return f;
    t -= d;
  }
  return frames[frames.length - 1];
}

function buildWallsFromStage(s) {
  const cols = s.cols || STAGE_COLS;
  const wallRows = s.wallRows || WALL_ROWS;
  const rawWalls = Array.isArray(s.walls) ? s.walls : [];

  const padX = Math.max(16, Math.round(viewW * 0.06));
  const innerW = Math.max(1, viewW - padX * 2);
  const cellW = innerW / cols;
  const blockW = cellW * 0.92;
  const gapX = cellW - blockW;

  const blockH = clamp(viewH * 0.035, 14, 22);
  const gapY = Math.max(2, Math.round(blockH * 0.25));
  const zoneH = wallRows * blockH + (wallRows - 1) * gapY;
  const bottom = player.y - 18;
  const top = bottom - zoneH;

  const list = [];
  for (let row = 0; row < wallRows; row++) {
    for (let col = 0; col < cols; col++) {
      const v = rawWalls[row * cols + col];
      if (v !== WALL_CELL) continue;
      list.push({
        x: padX + col * cellW + gapX / 2,
        y: top + row * (blockH + gapY),
        w: blockW,
        h: blockH,
        hp: WALL_HP,
        maxHp: WALL_HP
      });
    }
  }
  return list;
}

async function startStage(stageName, { resetStats = true } = {}) {
  const list = ensureStages();
  const found = list.find((x) => x.name === stageName) ?? list[0];
  if (!found) return;

  playingStageName = found.name;
  stage = normalizeStage(found);
  setStageLabel(stage.name);

  if (resetStats) resetRunStats();

  await prepareSpritesForStage(stage);

  formation.offX = 0;
  formation.offY = 0;
  formation.dir = 1;
  formation.speed = clamp(40 + (countStageDifficulty(stage) * 10), 45, 120);
  formation.descend = clamp(enemySize() * 0.55, 12, 24);
  formation.stepCooldown = 0;

  bullets = [];
  enemyBullets = [];
  enemyShootCooldown = 0.35;

  layout();
  player.x = viewW / 2 - player.w / 2;
  player.cool = 0;

  enemies = buildEnemiesFromStage(stage);
  walls = buildWallsFromStage(stage);
  updateHud();

  isRunning = true;
  lastT = performance.now();
  requestAnimationFrame(loop);
}

function countStageDifficulty(s) {
  // very simple: based on enemy count
  const n = s.grid.filter((x) => x != null).length;
  return clamp(n / 20, 0, 3);
}

function nextStageName() {
  const list = ensureStages();
  const names = list.map((s) => s.name);
  const idx = Math.max(0, names.indexOf(playingStageName));
  return names[(idx + 1) % names.length] ?? names[0];
}

function rectHit(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function spawnPlayerBullet() {
  if (player.cool > 0) return;
  const MAX = 3;
  if (bullets.length >= MAX) return;

  bullets.push({
    x: player.x + player.w / 2,
    y: player.y - 4,
    vy: -bulletSpeed(),
    r: clamp(viewW * 0.006, 3, 5)
  });
  player.cool = 0.22;
}

function computeFormationBounds() {
  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const x = e.x0 + formation.offX;
    const y = e.y0 + formation.offY;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + e.w);
    maxY = Math.max(maxY, y + e.h);
  }
  if (!Number.isFinite(minX)) return { minX: 0, maxX: 0, maxY: 0, alive: 0 };
  const alive = enemies.filter((e) => e.alive).length;
  return { minX, maxX, maxY, alive };
}

function pickEnemyShooter() {
  // Prefer bottom-most enemy in a random column (classic)
  const byCol = new Map();
  for (const e of enemies) {
    if (!e.alive) continue;
    const cur = byCol.get(e.col);
    if (!cur || e.row > cur.row) byCol.set(e.col, e);
  }
  const list = Array.from(byCol.values());
  if (list.length === 0) return null;
  return list[(Math.random() * list.length) | 0];
}

function spawnEnemyBullet() {
  const shooter = pickEnemyShooter();
  if (!shooter) return;
  const x = shooter.x0 + formation.offX + shooter.w / 2;
  const y = shooter.y0 + formation.offY + shooter.h + 2;
  enemyBullets.push({
    x,
    y,
    vy: enemyBulletSpeed(),
    r: clamp(viewW * 0.006, 3, 5)
  });
}

function onPlayerHit() {
  lives = Math.max(0, lives - 1);
  updateHud();
  if (lives > 0) {
    showOverlay(
      'やられた！',
      `のこりLIFE: ${lives}`,
      `
        <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap; margin-top: 10px;">
          <button class="btn-primary" id="ovContinue">つづける</button>
          <a class="iv-tool-btn" href="./stage-select.html" style="text-decoration:none; border-radius: 999px; padding: 10px 14px; display:inline-flex; align-items:center;">ステージ選択</a>
        </div>
      `,
      { closable: false }
    );
    qs('ovContinue').onclick = () => {
      closeOverlay();
      enemyBullets = [];
      bullets = [];
      player.x = viewW / 2 - player.w / 2;
      player.cool = 0.2;
      isRunning = true;
      lastT = performance.now();
      requestAnimationFrame(loop);
    };
    stopLoop();
    return;
  }
  void finishRunAndShowRanking();
}

async function finishRunAndShowRanking() {
  stopLoop();
  closeOverlay();

  const p = getCurrentPlayer();
  if (p?.id) {
    await saveScore(GAME_ID, p.id, score);
  }

  const rankings = await getRankings(GAME_ID);
  const rankingHtml = rankings
    .map(
      (r, i) => `
      <div style="display:flex; justify-content: space-between; width: 100%; padding: 8px 6px; border-bottom: 1px solid rgba(255,255,255,0.15);">
        <div style="display:flex; align-items: center; gap: 8px; min-width:0;">
          <span style="font-weight: 900; width: 26px;">${i + 1}.</span>
          <span style="display:inline-flex; align-items:center;">${avatarToHtml(r.avatar || '👤', { size: 24, className: 'ng-avatar', alt: '' })}</span>
          <span style="overflow: hidden; text-overflow: ellipsis; max-width: 160px; white-space: nowrap;">${escapeHtml(r.name || '')}</span>
        </div>
        <span style="font-weight: 900;">${escapeHtml(r.score || '')}</span>
      </div>
    `
    )
    .join('');

  showOverlay(
    'ゲームオーバー…',
    `SCORE: ${score}`,
    `
      <div style="background: rgba(255,255,255,0.12); padding: 14px; border-radius: 14px; margin: 14px 0; width: 100%; max-width: 440px; text-align: left;">
        <h3 style="text-align: center; margin-bottom: 10px; color: white;">🏆 ランキング</h3>
        ${rankingHtml || '<div style="opacity:0.9; text-align:center;">まだランキングがないよ</div>'}
      </div>
      <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap;">
        <button class="btn-primary" id="ovRestart">もういっかい</button>
        <a href="./stage-select.html" style="color: white; display:inline-block; padding: 12px 14px;">&larr; ステージ選択</a>
      </div>
    `,
    { closable: false }
  );
  qs('ovRestart').onclick = () => {
    closeOverlay();
    void startStage(playingStageName ?? getStageFromUrl(), { resetStats: true });
  };
}

function stageCleared() {
  stopLoop();
  showOverlay(
    'ステージクリア！',
    `「${playingStageName}」 クリア！`,
    `
      <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap; margin-top: 10px;">
        <button class="btn-primary" id="ovNext">つぎへ</button>
        <a class="iv-tool-btn" href="./stage-select.html" style="text-decoration:none; border-radius: 999px; padding: 10px 14px; display:inline-flex; align-items:center;">ステージ選択</a>
      </div>
    `,
    { closable: false }
  );
  qs('ovNext').onclick = () => {
    closeOverlay();
    void startStage(nextStageName(), { resetStats: false });
  };
}

function update(dt) {
  if (isPaused) return;
  if (!stage) return;

  // Player move
  const left = keys.has('arrowleft') || keys.has('a') || touch.left;
  const right = keys.has('arrowright') || keys.has('d') || touch.right;
  const moveAxis = Number(right) - Number(left);
  player.x = clamp(player.x + moveAxis * player.speed * dt, 0, Math.max(0, viewW - player.w));

  // Fire
  const fire = keys.has(' ') || keys.has('space') || touch.fire;
  if (fire) spawnPlayerBullet();

  // Cooldown
  player.cool = Math.max(0, player.cool - dt);

  // Formation movement
  const bounds = computeFormationBounds();
  const sidePad = 10;
  formation.offX += formation.dir * formation.speed * dt;

  if (bounds.alive > 0) {
    const b2 = computeFormationBounds();
    if (b2.minX < sidePad || b2.maxX > viewW - sidePad) {
      formation.offX -= formation.dir * formation.speed * dt;
      formation.dir *= -1;
      formation.offY += formation.descend;
      formation.speed = clamp(formation.speed * 1.05, 50, 220);
    }
  }

  // Enemy shoot
  enemyShootCooldown = Math.max(0, enemyShootCooldown - dt);
  const alive = bounds.alive;
  const desiredRate = clamp(0.65 + (alive / 25) * 0.9, 0.6, 2.2); // bullets per second
  if (alive > 0 && enemyShootCooldown === 0) {
    spawnEnemyBullet();
    enemyShootCooldown = 1 / desiredRate;
  }

  // Bullets update
  bullets = bullets
    .map((b) => ({ ...b, y: b.y + b.vy * dt }))
    .filter((b) => b.y + b.r > -10);

  enemyBullets = enemyBullets
    .map((b) => ({ ...b, y: b.y + b.vy * dt }))
    .filter((b) => b.y - b.r < viewH + 10);

  // Collisions: bullets vs walls (both sides)
  for (const b of bullets) {
    for (const w of walls) {
      if (w.hp <= 0) continue;
      const hit = rectHit(w.x, w.y, w.w, w.h, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      if (!hit) continue;
      w.hp = Math.max(0, w.hp - 1);
      b.y = -9999;
      break;
    }
  }
  bullets = bullets.filter((b) => b.y > -1000);
  walls = walls.filter((w) => w.hp > 0);

  // Collisions: player bullets vs enemies
  for (const b of bullets) {
    for (const e of enemies) {
      if (!e.alive) continue;
      const ex = e.x0 + formation.offX;
      const ey = e.y0 + formation.offY;
      const hit = rectHit(ex, ey, e.w, e.h, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      if (!hit) continue;
      e.alive = false;
      b.y = -9999; // remove later
      score += 10;
      formation.speed = clamp(formation.speed + 1.0, 50, 260);
      break;
    }
  }
  bullets = bullets.filter((b) => b.y > -1000);

  for (const b of enemyBullets) {
    for (const w of walls) {
      if (w.hp <= 0) continue;
      const hit = rectHit(w.x, w.y, w.w, w.h, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
      if (!hit) continue;
      w.hp = Math.max(0, w.hp - 1);
      b.y = 9999;
      break;
    }
  }
  enemyBullets = enemyBullets.filter((b) => b.y < 9000);
  walls = walls.filter((w) => w.hp > 0);

  // Collisions: enemy bullets vs player
  for (const b of enemyBullets) {
    const hit = rectHit(player.x, player.y, player.w, player.h, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    if (!hit) continue;
    b.y = 9999;
    enemyBullets = enemyBullets.filter((bb) => bb.y < 9000);
    onPlayerHit();
    return;
  }
  enemyBullets = enemyBullets.filter((b) => b.y < 9000);

  // Lose if enemies reached player line
  const bounds2 = computeFormationBounds();
  if (bounds2.alive > 0 && bounds2.maxY >= player.y - 10) {
    lives = 0;
    updateHud();
    void finishRunAndShowRanking();
    return;
  }

  updateHud();
  if (enemies.every((e) => !e.alive)) {
    stageCleared();
  }
}

function drawDefaultInvaderAt(x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const bmp = [
    '00111100',
    '01111110',
    '11111111',
    '11011011',
    '11111111',
    '00100100',
    '01000010',
    '10000001'
  ];
  const sx = w / 8;
  const sy = h / 8;
  for (let yy = 0; yy < 8; yy++) {
    for (let xx = 0; xx < 8; xx++) {
      if (bmp[yy][xx] === '1') ctx.fillRect(xx * sx, yy * sy, Math.max(1, sx), Math.max(1, sy));
    }
  }
  ctx.restore();
}

function drawWalls() {
  for (const w of walls) {
    const t = w.maxHp > 0 ? w.hp / w.maxHp : 0;
    ctx.fillStyle = `rgba(255,255,255,${0.10 + 0.18 * t})`;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);

    // cracks
    ctx.strokeStyle = 'rgba(17,24,39,0.28)';
    ctx.lineWidth = 2;
    if (w.hp <= 2) {
      ctx.beginPath();
      ctx.moveTo(w.x + w.w * 0.15, w.y + w.h * 0.35);
      ctx.lineTo(w.x + w.w * 0.85, w.y + w.h * 0.55);
      ctx.stroke();
    }
    if (w.hp <= 1) {
      ctx.beginPath();
      ctx.moveTo(w.x + w.w * 0.25, w.y + w.h * 0.15);
      ctx.lineTo(w.x + w.w * 0.55, w.y + w.h * 0.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w.x + w.w * 0.70, w.y + w.h * 0.20);
      ctx.lineTo(w.x + w.w * 0.42, w.y + w.h * 0.78);
      ctx.stroke();
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, viewW, viewH);
  ctx.imageSmoothingEnabled = false;
  const nowMs = performance.now();

  // Background
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, '#0b1020');
  g.addColorStop(1, '#111827');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 97) % viewW;
    const y = (i * 151) % viewH;
    ctx.fillRect(x, y, 2, 2);
  }

  // Enemies
  for (const e of enemies) {
    if (!e.alive) continue;
    const x = e.x0 + formation.offX;
    const y = e.y0 + formation.offY;

    // subtle cell glow
    ctx.fillStyle = 'rgba(0, 206, 201, 0.10)';
    ctx.fillRect(x - 2, y - 2, e.w + 4, e.h + 4);

    if (e.token === ENEMY_DEFAULT) {
      drawDefaultInvaderAt(x, y, e.w, e.h);
      continue;
    }
    const spr = spriteCache.get(e.token);
    const frame = spr ? pickAnimatedFrame(spr, nowMs, e.animOffsetMs) : null;
    const img = frame?.img;
    if (img) {
      ctx.drawImage(img, x, y, e.w, e.h);
    } else {
      ctx.fillStyle = 'rgba(0, 206, 201, 0.95)';
      ctx.fillRect(x, y, e.w, e.h);
    }
  }

  // Walls
  drawWalls();

  // Player
  ctx.fillStyle = '#6c5ce7';
  ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(player.x + player.w * 0.42, player.y - 6, player.w * 0.16, 6);

  // Bullets
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(253, 121, 168, 0.95)';
  for (const b of enemyBullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground line
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, player.y + player.h + 10);
  ctx.lineTo(viewW, player.y + player.h + 10);
  ctx.stroke();
}

function loop(t) {
  if (!isRunning) return;
  const dt = Math.min(0.033, (t - lastT) / 1000);
  lastT = t;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// UI
pauseBtn.addEventListener('click', () => {
  if (!playingStageName) {
    showOverlay('まだだよ', '先にステージが始まってないみたい。');
    return;
  }
  setPaused(!isPaused);
});

resetBtn.addEventListener('click', () => {
  closeOverlay();
  void startStage(playingStageName ?? getStageFromUrl(), { resetStats: true });
});

// Init
async function init() {
  // Cache prep
  const list = ensureStages();
  const desired = getStageFromUrl();
  const found = (desired && list.some((s) => s.name === desired)) ? desired : (list[0]?.name ?? null);

  resizeGameCanvas();
  updateHud();

  if (!found) {
    showOverlay('ステージがない…', 'ステージを作ってから遊ぼう！', `<a class="btn-primary" href="./editor.html" style="text-decoration:none; border-radius: 999px; padding: 12px 16px; display:inline-flex; align-items:center;">新規作成</a>`);
    return;
  }

  await startStage(found, { resetStats: true });
}

init();

