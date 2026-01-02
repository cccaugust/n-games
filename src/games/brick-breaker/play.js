import { getCurrentPlayer } from '../../js/auth.js';
import { getRankings, saveScore } from '../../js/score.js';
import { initOverlay } from './overlay.js';
import { clamp, ensureStages, escapeHtml, normalizeStage, refreshStageCacheFromSupabase, TILE, STAGE_COLS, STAGE_ROWS } from './shared.js';

// =========================================================
// Play page (fullscreen) - Brick Breaker
// =========================================================

function qs(id) {
  return document.getElementById(id);
}

function getStageFromUrl() {
  const sp = new URLSearchParams(location.search);
  const s = sp.get('stage');
  return typeof s === 'string' && s.trim() ? s.trim() : null;
}

// --------------------
// DOM
// --------------------
const canvas = qs('gameCanvas');
const ctx = canvas.getContext('2d');
const stageLabel = qs('stageLabel');

const scoreEl = qs('score');
const livesEl = qs('lives');
const ballsEl = qs('balls');
const continuesEl = qs('continues');

const pauseBtn = qs('pauseBtn');
const resetBtn = qs('resetBtn');

const { showOverlay, closeOverlay } = initOverlay();

// --------------------
// Canvas Resize (DPR対応)
// --------------------
let viewW = 600;
let viewH = 500;

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
  layoutPaddleToBottom();
}

window.addEventListener('resize', () => {
  resizeGameCanvas();
  drawGame();
});

// --------------------
// Game (Play)
// --------------------
const paddle = {
  x: 0,
  y: 0,
  w: 100,
  h: 14,
  color: '#74b9ff'
};

function layoutPaddleToBottom() {
  paddle.w = clamp(viewW * 0.18, 70, 130);
  paddle.h = clamp(viewH * 0.028, 12, 18);
  paddle.y = viewH - clamp(viewH * 0.08, 36, 52);
  paddle.x = clamp(paddle.x, 0, Math.max(0, viewW - paddle.w));
}

function makeBall(x, y, speed, angleRad) {
  const r = clamp(viewW * 0.013, 6, 9);
  return {
    x,
    y,
    r,
    vx: Math.cos(angleRad) * speed,
    vy: Math.sin(angleRad) * speed,
    color: '#ffffff'
  };
}

function getBrickMetrics() {
  const pad = clamp(viewW * 0.02, 8, 16);
  const gap = clamp(viewW * 0.012, 5, 12);
  const top = clamp(viewH * 0.12, 54, 74);
  const brickH = clamp(viewH * 0.045, 16, 24);
  const areaW = viewW - pad * 2;
  const brickW = (areaW - gap * (STAGE_COLS + 1)) / STAGE_COLS;
  return { pad, gap, top, brickW, brickH };
}

function brickRect(brick) {
  const { pad, gap, top, brickW, brickH } = getBrickMetrics();
  const x = pad + gap + brick.col * (brickW + gap);
  const y = top + brick.row * (brickH + gap);
  return { x, y, w: brickW, h: brickH };
}

function gridIndex(x, y) {
  return y * STAGE_COLS + x;
}

function makeBricksFromStage(stage) {
  const s = normalizeStage(stage);
  const bricks = [];
  for (let row = 0; row < STAGE_ROWS; row++) {
    for (let col = 0; col < STAGE_COLS; col++) {
      const t = s.grid[gridIndex(col, row)];
      if (t === TILE.EMPTY) continue;
      const hp = t === TILE.TOUGH ? 3 : 1;
      bricks.push({
        col,
        row,
        type: t,
        hp,
        alive: true
      });
    }
  }
  return bricks;
}

function circleRectHit(ballObj, rect) {
  const cx = clamp(ballObj.x, rect.x, rect.x + rect.w);
  const cy = clamp(ballObj.y, rect.y, rect.y + rect.h);
  const dx = ballObj.x - cx;
  const dy = ballObj.y - cy;
  return (dx * dx + dy * dy) <= (ballObj.r * ballObj.r);
}

function brickBaseColor(brick) {
  if (brick.type === TILE.SPLIT) return '#00cec9';
  if (brick.type === TILE.TOUGH) return '#a29bfe';
  return '#74b9ff';
}

function brickPoints(brick) {
  if (brick.type === TILE.SPLIT) return 25;
  if (brick.type === TILE.TOUGH) return 35;
  return 10;
}

let isRunning = false;
let isPaused = false;
let lastT = 0;

let score = 0;
let lives = 3;
let continueCount = 0;

let playingStageName = null;
let bricks = [];
let balls = [];

function resetRunStats() {
  score = 0;
  lives = 3;
  continueCount = 0;
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
  ballsEl.textContent = String(balls.length);
  continuesEl.textContent = String(continueCount);
}

function setPaused(paused) {
  isPaused = paused;
  pauseBtn.textContent = paused ? '再開' : '一時停止';
}

function stopGameLoop() {
  isRunning = false;
  setPaused(false);
}

function ballSpeed() {
  return clamp(viewW * 0.75, 420, 760); // px/s
}

function resetPaddleAndBall({ keepBricks = true } = {}) {
  layoutPaddleToBottom();
  paddle.x = viewW / 2 - paddle.w / 2;
  balls = [];
  const speed = ballSpeed();
  const angle = (-Math.PI / 2) + (Math.random() * 0.55 - 0.275);
  balls.push(makeBall(viewW / 2, paddle.y - 18, speed, angle));
  if (!keepBricks) {
    const list = ensureStages();
    const s = list.find(x => x.name === playingStageName) ?? list[0];
    bricks = makeBricksFromStage(s);
  }
  updateHud();
}

function setStageLabel(name) {
  if (stageLabel) stageLabel.textContent = `ステージ：${name || '—'}`;
}

function startStage(stageName, { resetStats = true } = {}) {
  const list = ensureStages();
  const stage = list.find(x => x.name === stageName) ?? list[0];
  if (!stage) return;

  playingStageName = stage.name;
  setStageLabel(stage.name);

  if (resetStats) resetRunStats();

  bricks = makeBricksFromStage(stage);
  resetPaddleAndBall({ keepBricks: true });
  resizeGameCanvas();
  setPaused(false);
  isRunning = true;
  lastT = performance.now();
  requestAnimationFrame(loop);
}

function nextStageName() {
  const list = ensureStages();
  const names = list.map(s => s.name);
  const idx = Math.max(0, names.indexOf(playingStageName));
  return names[(idx + 1) % names.length] ?? names[0];
}

function spawnSplitBalls(fromBall, atX, atY) {
  const MAX_BALLS = 6;
  if (balls.length >= MAX_BALLS) return;

  const speed = Math.max(ballSpeed() * 0.95, Math.hypot(fromBall.vx, fromBall.vy));
  const base = Math.atan2(fromBall.vy, fromBall.vx);
  const angles = [base - 0.55, base + 0.55];

  for (const a of angles) {
    if (balls.length >= MAX_BALLS) break;
    const b = makeBall(atX, atY, speed, a);
    b.y -= 2;
    balls.push(b);
  }
}

function onAllBallsLost() {
  lives = Math.max(0, lives - 1);
  updateHud();

  stopGameLoop();

  if (lives > 0) {
    showOverlay(
      'ミス！',
      `のこりLIFE: ${lives}。いまの状態からつづけられるよ。`,
      `
        <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap; margin-top: 10px;">
          <button class="btn-primary" id="ovContinue">つづける</button>
          <button class="bb-tool-btn" id="ovToSelect">ステージ選択へ</button>
        </div>
      `,
      { closable: false }
    );
    qs('ovContinue').onclick = () => {
      closeOverlay();
      resetPaddleAndBall({ keepBricks: true });
      isRunning = true;
      lastT = performance.now();
      requestAnimationFrame(loop);
    };
    qs('ovToSelect').onclick = () => {
      closeOverlay();
      location.href = './stage-select.html';
    };
    return;
  }

  showOverlay(
    'ゲームオーバー…',
    `SCORE: ${score}（CONTINUE: ${continueCount}）`,
    `
      <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap; margin-top: 10px;">
        <button class="btn-primary" id="ovRevive">コンティニュー</button>
        <button class="bb-tool-btn" id="ovFinish">おしまい（ランキング）</button>
      </div>
    `,
    { closable: false }
  );
  qs('ovRevive').onclick = () => {
    closeOverlay();
    continueCount += 1;
    lives = 1;
    updateHud();
    resetPaddleAndBall({ keepBricks: true });
    isRunning = true;
    lastT = performance.now();
    requestAnimationFrame(loop);
  };
  qs('ovFinish').onclick = () => {
    void finishRunAndShowRanking();
  };
}

async function finishRunAndShowRanking() {
  stopGameLoop();
  closeOverlay();

  const player = getCurrentPlayer();
  if (player?.id) {
    await saveScore('brick-breaker', player.id, score);
  }

  const rankings = await getRankings('brick-breaker');
  const rankingHtml = rankings.map((r, i) => `
    <div style="display: flex; justify-content: space-between; width: 100%; padding: 8px 6px; border-bottom: 1px solid rgba(255,255,255,0.15);">
      <div style="display: flex; align-items: center; gap: 8px; min-width:0;">
        <span style="font-weight: 900; width: 26px;">${i + 1}.</span>
        <span style="font-size: 1.5rem;">${escapeHtml(r.avatar || '')}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; max-width: 160px; white-space: nowrap;">${escapeHtml(r.name || '')}</span>
      </div>
      <span style="font-weight: 900;">${escapeHtml(r.score || '')}</span>
    </div>
  `).join('');

  showOverlay(
    'おしまい！',
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
    startStage(playingStageName ?? getStageFromUrl(), { resetStats: true });
  };
}

function stageCleared() {
  stopGameLoop();
  showOverlay(
    'ステージクリア！',
    `「${playingStageName}」 クリア！`,
    `
      <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap; margin-top: 10px;">
        <button class="btn-primary" id="ovNext">つぎへ</button>
        <button class="bb-tool-btn" id="ovSelect">ステージ選択へ</button>
      </div>
    `,
    { closable: false }
  );
  qs('ovNext').onclick = () => {
    closeOverlay();
    startStage(nextStageName(), { resetStats: false });
  };
  qs('ovSelect').onclick = () => {
    closeOverlay();
    location.href = './stage-select.html';
  };
}

function updateGame(dt) {
  if (isPaused) return;

  const aliveBricks = bricks.filter(b => b.alive);

  const nextBalls = [];
  for (const b of balls) {
    const prevX = b.x;
    const prevY = b.y;

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Wall
    if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
    if (b.x + b.r > viewW) { b.x = viewW - b.r; b.vx = -Math.abs(b.vx); }
    if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }

    // Paddle
    const hitPaddle =
      b.vy > 0 &&
      b.y + b.r >= paddle.y &&
      b.y - b.r <= paddle.y + paddle.h &&
      b.x >= paddle.x - 2 &&
      b.x <= paddle.x + paddle.w + 2;

    if (hitPaddle) {
      b.y = paddle.y - b.r;
      const speed = Math.max(ballSpeed() * 0.85, Math.hypot(b.vx, b.vy));
      const center = paddle.x + paddle.w / 2;
      const rel = clamp((b.x - center) / (paddle.w / 2), -1, 1);
      const vx = rel * speed * 0.92;
      const vy = -Math.sqrt(Math.max(60, speed * speed - vx * vx));
      b.vx = vx;
      b.vy = vy;
    }

    // Bricks
    let hitSomething = false;
    for (const brick of aliveBricks) {
      if (!brick.alive) continue;
      const rect = brickRect(brick);
      if (!circleRectHit(b, rect)) continue;

      // Reflect (ざっくり)
      const cameFromTop = prevY + b.r <= rect.y && b.y + b.r > rect.y;
      const cameFromBottom = prevY - b.r >= rect.y + rect.h && b.y - b.r < rect.y + rect.h;
      const cameFromLeft = prevX + b.r <= rect.x && b.x + b.r > rect.x;
      const cameFromRight = prevX - b.r >= rect.x + rect.w && b.x - b.r < rect.x + rect.w;

      if (cameFromTop) b.vy = -Math.abs(b.vy);
      else if (cameFromBottom) b.vy = Math.abs(b.vy);
      else if (cameFromLeft) b.vx = -Math.abs(b.vx);
      else if (cameFromRight) b.vx = Math.abs(b.vx);
      else b.vy = -b.vy;

      // Hit brick
      brick.hp -= 1;
      if (brick.hp <= 0) {
        brick.alive = false;
        score += brickPoints(brick);
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        if (brick.type === TILE.SPLIT) spawnSplitBalls(b, cx, cy);
      } else {
        score += 2;
      }
      hitSomething = true;
      break;
    }

    if (b.y - b.r > viewH) {
      continue;
    }

    nextBalls.push(b);
    if (hitSomething) {
      b.x += b.vx * (dt * 0.35);
      b.y += b.vy * (dt * 0.35);
    }
  }

  balls = nextBalls;
  updateHud();

  if (balls.length === 0) {
    onAllBallsLost();
    return;
  }

  const remaining = bricks.some(b => b.alive);
  if (!remaining) {
    stageCleared();
  }
}

function drawGame() {
  ctx.clearRect(0, 0, viewW, viewH);

  // 背景グラデ
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, '#2d3436');
  g.addColorStop(1, '#111827');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  // Bricks
  for (const brick of bricks) {
    if (!brick.alive) continue;
    const rect = brickRect(brick);
    ctx.fillStyle = brickBaseColor(brick);
    ctx.globalAlpha = 1;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    if (brick.type === TILE.TOUGH) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.72))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(brick.hp), rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.SPLIT) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.72))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✶', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
  }
  ctx.globalAlpha = 1;

  // Paddle
  ctx.fillStyle = paddle.color;
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

  // Balls
  for (const b of balls) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function loop(t) {
  if (!isRunning) return;
  const dt = Math.min(0.033, (t - lastT) / 1000);
  lastT = t;
  updateGame(dt);
  drawGame();
  requestAnimationFrame(loop);
}

// --------------------
// Input (Paddle)
// --------------------
let paddlePointerId = null;
function movePaddleFromClientX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left);
  paddle.x = clamp(x - paddle.w / 2, 0, Math.max(0, viewW - paddle.w));
}

canvas.addEventListener('pointerdown', (e) => {
  paddlePointerId = e.pointerId;
  canvas.setPointerCapture?.(e.pointerId);
  movePaddleFromClientX(e.clientX);
  e.preventDefault();
});
canvas.addEventListener('pointermove', (e) => {
  if (paddlePointerId == null) return;
  if (e.pointerId !== paddlePointerId) return;
  movePaddleFromClientX(e.clientX);
  e.preventDefault();
});
function endPaddle(e) {
  if (paddlePointerId == null) return;
  if (e?.pointerId != null && e.pointerId !== paddlePointerId) return;
  paddlePointerId = null;
}
canvas.addEventListener('pointerup', endPaddle);
canvas.addEventListener('pointercancel', endPaddle);
canvas.addEventListener('pointerleave', endPaddle);

// --------------------
// UI
// --------------------
pauseBtn.addEventListener('click', () => {
  if (!playingStageName) {
    showOverlay('まだだよ', '先に始まってないみたい。');
    return;
  }
  if (!isRunning) {
    showOverlay('止まってるよ', '「最初から」で始めてね。');
    return;
  }
  setPaused(!isPaused);
});

resetBtn.addEventListener('click', () => {
  closeOverlay();
  startStage(playingStageName ?? getStageFromUrl(), { resetStats: true });
});

// --------------------
// Init
// --------------------
async function init() {
  // キャッシュ準備
  ensureStages();

  resizeGameCanvas();
  updateHud();

  // URL指定のステージ（なければ先頭）
  const desired = getStageFromUrl();
  const initial = ensureStages();
  const stageName = (desired && initial.some(s => s.name === desired)) ? desired : (initial[0]?.name ?? null);
  if (stageName) startStage(stageName, { resetStats: true });

  // Supabaseから最新を取り込み（失敗してもキャッシュで動く）
  await refreshStageCacheFromSupabase({
    showError: false
  });

  // 取り込み後に、指定ステージが見つかるならラベル更新（プレイ中は変えない）
  if (!playingStageName) {
    const list = ensureStages();
    const name2 = (desired && list.some(s => s.name === desired)) ? desired : (list[0]?.name ?? null);
    if (name2) startStage(name2, { resetStats: true });
  }
}

init();

