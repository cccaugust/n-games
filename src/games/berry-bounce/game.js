import { getCurrentPlayer } from '../../js/auth.js';
import { saveScore, getRankings } from '../../js/score.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const startOverlay = document.getElementById('startOverlay');
const resultOverlay = document.getElementById('resultOverlay');
const startBtn = document.getElementById('startBtn');

const BASE_W = 360;
const BASE_H = 640;

const state = {
  running: false,
  rafId: 0,
  score: 0,
  lives: 3,
  time: 0,
  spawnTimer: 0,
  spawnEvery: 0.65, // seconds
  speed: 130, // px/sec
};

const input = {
  left: false,
  right: false,
  pointerDown: false,
  pointerX: BASE_W / 2,
};

const playerImg = new Image();
playerImg.src = './assets/player.png';

const player = {
  x: BASE_W / 2,
  y: BASE_H - 80,
  w: 72,
  h: 72,
  speed: 260, // px/sec
};

/** @type {{x:number,y:number,r:number,vy:number,type:'berry'|'bomb',value:number}[]} */
let drops = [];

function setLivesText() {
  livesEl.textContent = '❤️'.repeat(Math.max(0, state.lives));
}

function resetGame() {
  state.running = false;
  state.score = 0;
  state.lives = 3;
  state.time = 0;
  state.spawnTimer = 0;
  state.spawnEvery = 0.65;
  state.speed = 130;
  drops = [];

  player.x = BASE_W / 2;

  scoreEl.textContent = '0';
  setLivesText();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function resizeCanvas() {
  // Keep internal coordinate system stable, but render crisp on HiDPI.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(BASE_W * dpr);
  canvas.height = Math.round(BASE_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function toCanvasX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const t = (clientX - rect.left) / rect.width;
  return clamp(t * BASE_W, 0, BASE_W);
}

function spawnDrop() {
  const isBomb = Math.random() < 0.12 + Math.min(0.18, state.time / 1200);
  const r = isBomb ? rand(13, 18) : rand(12, 18);
  const x = rand(20 + r, BASE_W - 20 - r);
  const y = -30;
  const speedJitter = rand(0.9, 1.15);

  drops.push({
    x,
    y,
    r,
    vy: state.speed * speedJitter,
    type: isBomb ? 'bomb' : 'berry',
    value: isBomb ? 0 : 1,
  });
}

function intersectsCircleRect(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= cr * cr;
}

function drawBackground() {
  ctx.clearRect(0, 0, BASE_W, BASE_H);

  // ground stripe
  ctx.fillStyle = 'rgba(76, 175, 80, 0.25)';
  ctx.fillRect(0, BASE_H - 90, BASE_W, 90);
  ctx.fillStyle = 'rgba(76, 175, 80, 0.35)';
  ctx.fillRect(0, BASE_H - 90, BASE_W, 10);

  // subtle clouds
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) {
    const x = (i * 90 + (state.time * 18) % (BASE_W + 180)) - 90;
    const y = 70 + (i % 2) * 34;
    ctx.beginPath();
    ctx.ellipse(x, y, 44, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 30, y + 5, 34, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 28, y + 7, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  const rx = player.x - player.w / 2;
  const ry = player.y - player.h / 2;

  if (playerImg.complete && playerImg.naturalWidth > 0) {
    ctx.drawImage(playerImg, rx, ry, player.w, player.h);
    return;
  }

  // Fallback: cute blob
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = '#6C5CE7';
  ctx.beginPath();
  ctx.ellipse(0, 0, player.w * 0.45, player.h * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // face
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(-12, -6, 8, 0, Math.PI, false);
  ctx.arc(12, -6, 8, 0, Math.PI, false);
  ctx.stroke();
  ctx.restore();
}

function drawDrop(d) {
  if (d.type === 'bomb') {
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fd79a8';
    ctx.font = 'bold 14px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', d.x, d.y + 1);
    return;
  }

  // berry
  ctx.fillStyle = '#6C5CE7';
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(d.x - d.r * 0.35, d.y - d.r * 0.35, d.r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function step(dt) {
  if (!state.running) return;

  state.time += dt;

  // Difficulty ramp
  state.speed = 130 + Math.min(220, state.time * 1.5);
  state.spawnEvery = 0.65 - Math.min(0.3, state.time / 300);

  // Spawn
  state.spawnTimer += dt;
  while (state.spawnTimer >= state.spawnEvery) {
    state.spawnTimer -= state.spawnEvery;
    spawnDrop();
  }

  // Player movement
  let vx = 0;
  if (input.left) vx -= 1;
  if (input.right) vx += 1;

  if (input.pointerDown) {
    const dx = input.pointerX - player.x;
    // Smooth follow
    player.x += clamp(dx, -player.speed * dt, player.speed * dt);
  } else if (vx !== 0) {
    player.x += vx * player.speed * dt;
  }
  player.x = clamp(player.x, 20, BASE_W - 20);

  // Update drops
  const rx = player.x - player.w / 2;
  const ry = player.y - player.h / 2;

  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.vy = state.speed * clamp(d.vy / Math.max(1, state.speed), 0.9, 1.2);
    d.y += d.vy * dt;

    // Catch check
    if (intersectsCircleRect(d.x, d.y, d.r, rx, ry, player.w, player.h)) {
      drops.splice(i, 1);
      if (d.type === 'bomb') {
        state.lives -= 2;
        setLivesText();
      } else {
        state.score += d.value;
        scoreEl.textContent = String(state.score);
      }
      continue;
    }

    // Missed
    if (d.y - d.r > BASE_H + 10) {
      drops.splice(i, 1);
      if (d.type === 'berry') {
        state.lives -= 1;
        setLivesText();
      }
    }
  }

  if (state.lives <= 0) {
    endGame();
  }
}

function render() {
  drawBackground();

  for (const d of drops) drawDrop(d);
  drawPlayer();

  if (!state.running) {
    // Keep a tiny hint if stopped mid-game (e.g., at start)
    return;
  }
}

let lastTs = 0;
function loop(ts) {
  const t = ts / 1000;
  const dt = lastTs ? Math.min(0.033, t - lastTs) : 0;
  lastTs = t;

  step(dt);
  render();

  if (state.running) {
    state.rafId = requestAnimationFrame(loop);
  }
}

function startGame() {
  resetGame();
  state.running = true;
  lastTs = 0;
  startOverlay.style.display = 'none';
  resultOverlay.style.display = 'none';
  requestAnimationFrame(loop);
}

function formatRankingHtml(rankings) {
  if (!rankings.length) return '<div style="opacity:0.9;">まだスコアがありません</div>';

  return rankings
    .map(
      (r, i) => `
      <div style="display:flex; justify-content:space-between; width:100%; padding:5px; border-bottom:1px solid rgba(255,255,255,0.2);">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:bold; width:20px;">${i + 1}.</span>
          <span style="font-size:1.5rem;">${r.avatar}</span>
          <span style="overflow:hidden; text-overflow:ellipsis; max-width:140px; white-space:nowrap;">${r.name}</span>
        </div>
        <span style="font-weight:bold;">${r.score}点</span>
      </div>
    `,
    )
    .join('');
}

async function endGame() {
  state.running = false;
  cancelAnimationFrame(state.rafId);

  // Save score (best effort)
  const playerInfo = getCurrentPlayer();
  if (playerInfo) {
    await saveScore('berry-bounce', playerInfo.id, state.score);
  }
  const rankings = await getRankings('berry-bounce');

  resultOverlay.innerHTML = `
    <div class="overlay-card">
      <h1>おしまい！</h1>
      <p style="font-size: 2rem; font-weight: 900;">スコア: ${state.score}</p>

      <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 12px; margin: 15px 0; width: 100%; text-align: left;">
        <h3 style="text-align:center; margin-bottom: 10px; color: white;">🏆 ランキング</h3>
        ${formatRankingHtml(rankings)}
      </div>

      <button class="btn-primary" id="retryBtn">もういっかい</button>
      <a href="../../pages/portal/portal.html" style="color: white; margin-top: 18px; display: block;">&larr; ほかのゲーム</a>
    </div>
  `;
  resultOverlay.style.display = 'flex';
  const retryBtn = document.getElementById('retryBtn');
  retryBtn?.addEventListener('click', startGame);
}

// Input
document.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft') input.left = true;
  if (e.code === 'ArrowRight') input.right = true;
  if (e.code === 'Space') {
    // quick restart from result overlay
    if (!state.running && resultOverlay.style.display === 'flex') startGame();
    e.preventDefault();
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft') input.left = false;
  if (e.code === 'ArrowRight') input.right = false;
});

function onPointerDown(clientX) {
  input.pointerDown = true;
  input.pointerX = toCanvasX(clientX);
}
function onPointerMove(clientX) {
  if (!input.pointerDown) return;
  input.pointerX = toCanvasX(clientX);
}
function onPointerUp() {
  input.pointerDown = false;
}

canvas.addEventListener(
  'pointerdown',
  (e) => {
    onPointerDown(e.clientX);
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener(
  'pointermove',
  (e) => {
    onPointerMove(e.clientX);
    e.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener(
  'pointerup',
  (e) => {
    onPointerUp();
    e.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener(
  'pointercancel',
  (e) => {
    onPointerUp();
    e.preventDefault();
  },
  { passive: false },
);

// Boot
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
resetGame();
render();

startBtn.addEventListener('click', startGame);

