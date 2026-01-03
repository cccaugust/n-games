import { initOverlay } from './overlay.js';
import {
  clamp,
  countGems,
  ensureStages,
  findGoal,
  findStart,
  getStageFromUrl,
  loadAssetImage,
  normalizeStage,
  stageHref,
  TILE
} from './shared.js';

function qs(id) {
  return document.getElementById(id);
}

const canvas = qs('gameCanvas');
const ctx = canvas.getContext('2d');
const playTitle = qs('playTitle');
const playStatus = qs('playStatus');
const editBtn = qs('editBtn');

const restartBtn = qs('restartBtn');
const helpBtn = qs('helpBtn');
const btnUp = qs('btnUp');
const btnDown = qs('btnDown');
const btnLeft = qs('btnLeft');
const btnRight = qs('btnRight');

const { showOverlay, closeOverlay } = initOverlay();

let viewW = 800;
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

function resize() {
  const { w, h } = applyDpr(canvas, ctx);
  viewW = w;
  viewH = h;
  draw();
}
window.addEventListener('resize', () => resize());

// Stage / state
let stageList = [];
let stageIndex = 0;
let stage = null;
let player = { x: 0, y: 0 };
let remainingGems = 0;
let moves = 0;
let busy = false;

// Skin images (loaded async)
const skinImgs = {
  player: null,
  wall: null,
  gem: null,
  goal: null,
  spike: null
};

function indexOfStageByName(name) {
  if (!name) return -1;
  return stageList.findIndex((s) => s.name === name);
}

function loadStageByIndex(i) {
  const idx = clamp(i, 0, Math.max(0, stageList.length - 1));
  stageIndex = idx;
  stage = normalizeStage(stageList[idx] || stageList[0]);

  const start = findStart(stage);
  player = { x: start.x, y: start.y };
  remainingGems = countGems(stage);
  moves = 0;
  busy = false;

  if (playTitle) playTitle.textContent = stage?.name ? `ピクセルクエスト：${stage.name}` : 'ピクセルクエスト';
  if (editBtn) editBtn.href = stageHref('./editor.html', stage?.name || '');

  updateStatus();
  void loadSkinImagesForStage(stage);
  draw();
}

async function loadSkinImagesForStage(s) {
  const skin = s?.skin || {};
  const ids = {
    player: skin.playerAssetId,
    wall: skin.wallAssetId,
    gem: skin.gemAssetId,
    goal: skin.goalAssetId,
    spike: skin.spikeAssetId
  };
  const [p, w, g, go, sp] = await Promise.all([
    loadAssetImage(ids.player),
    loadAssetImage(ids.wall),
    loadAssetImage(ids.gem),
    loadAssetImage(ids.goal),
    loadAssetImage(ids.spike)
  ]);
  skinImgs.player = p?.img || null;
  skinImgs.wall = w?.img || null;
  skinImgs.gem = g?.img || null;
  skinImgs.goal = go?.img || null;
  skinImgs.spike = sp?.img || null;
  draw();
}

function updateStatus(extra = '') {
  if (!playStatus) return;
  const parts = [`宝石 ${remainingGems}こ`, `うごいた ${moves}回`];
  if (extra) parts.push(extra);
  playStatus.textContent = parts.join(' / ');
}

function cellAt(x, y) {
  if (!stage) return TILE.WALL;
  if (x < 0 || y < 0 || x >= stage.cols || y >= stage.rows) return TILE.WALL;
  return stage.grid[y * stage.cols + x];
}

function setCellAt(x, y, t) {
  if (!stage) return;
  if (x < 0 || y < 0 || x >= stage.cols || y >= stage.rows) return;
  stage.grid[y * stage.cols + x] = t;
}

function drawSprite(img, x, y, size) {
  if (!img) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, y, size, size);
  return true;
}

function draw() {
  if (!stage) return;

  const W = viewW;
  const H = viewH;
  ctx.clearRect(0, 0, W, H);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b1020');
  bg.addColorStop(1, '#070b16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const cols = stage.cols;
  const rows = stage.rows;

  const pad = clamp(Math.min(W, H) * 0.05, 10, 20);
  const innerW = Math.max(1, W - pad * 2);
  const innerH = Math.max(1, H - pad * 2);
  const cell = Math.floor(Math.min(innerW / cols, innerH / rows));
  const gridW = cell * cols;
  const gridH = cell * rows;
  const ox = Math.round((W - gridW) / 2);
  const oy = Math.round((H - gridH) / 2);

  // Floor
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(ox, oy, gridW, gridH);

  // Cells
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = stage.grid[y * cols + x];
      const px = ox + x * cell;
      const py = oy + y * cell;

      if (t === TILE.WALL) {
        const drawn = drawSprite(skinImgs.wall, px, py, cell);
        if (!drawn) {
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
        }
      } else if (t === TILE.GEM) {
        const drawn = drawSprite(skinImgs.gem, px, py, cell);
        if (!drawn) {
          ctx.fillStyle = 'rgba(0,206,201,0.92)';
          ctx.beginPath();
          ctx.arc(px + cell / 2, py + cell / 2, Math.max(3, cell * 0.22), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (t === TILE.SPIKE) {
        const drawn = drawSprite(skinImgs.spike, px, py, cell);
        if (!drawn) {
          ctx.fillStyle = 'rgba(255,118,117,0.95)';
          ctx.beginPath();
          ctx.moveTo(px + cell * 0.20, py + cell * 0.78);
          ctx.lineTo(px + cell * 0.50, py + cell * 0.22);
          ctx.lineTo(px + cell * 0.80, py + cell * 0.78);
          ctx.closePath();
          ctx.fill();
        }
      } else if (t === TILE.GOAL) {
        const drawn = drawSprite(skinImgs.goal, px, py, cell);
        if (!drawn) {
          ctx.fillStyle = 'rgba(162,155,254,0.25)';
          ctx.fillRect(px + 2, py + 2, cell - 4, cell - 4);
          ctx.fillStyle = 'rgba(162,155,254,0.95)';
          ctx.fillRect(px + cell * 0.44, py + cell * 0.22, cell * 0.12, cell * 0.56);
          ctx.fillRect(px + cell * 0.54, py + cell * 0.22, cell * 0.22, cell * 0.16);
        }
      } else if (t === TILE.START) {
        // Start marker (optional)
        ctx.fillStyle = 'rgba(255, 234, 167, 0.10)';
        ctx.fillRect(px + 2, py + 2, cell - 4, cell - 4);
      }
    }
  }

  // Player
  const ppx = ox + player.x * cell;
  const ppy = oy + player.y * cell;
  const drawn = drawSprite(skinImgs.player, ppx, ppy, cell);
  if (!drawn) {
    ctx.fillStyle = 'rgba(255, 234, 167, 0.95)';
    ctx.beginPath();
    ctx.arc(ppx + cell / 2, ppy + cell / 2, Math.max(3, cell * 0.28), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(ppx + cell * 0.40, ppy + cell * 0.40, Math.max(2, cell * 0.08), Math.max(2, cell * 0.08));
    ctx.fillRect(ppx + cell * 0.54, ppy + cell * 0.40, Math.max(2, cell * 0.08), Math.max(2, cell * 0.08));
  }

  // Subtle border
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox + 0.5, oy + 0.5, gridW - 1, gridH - 1);
}

function tryMove(dx, dy) {
  if (!stage || busy) return;
  const nx = player.x + dx;
  const ny = player.y + dy;
  const t = cellAt(nx, ny);
  if (t === TILE.WALL) return;

  player.x = nx;
  player.y = ny;
  moves++;

  // Collect gem
  if (t === TILE.GEM) {
    setCellAt(nx, ny, TILE.FLOOR);
    remainingGems = Math.max(0, remainingGems - 1);
  }

  // Spike -> restart
  if (t === TILE.SPIKE) {
    updateStatus('あっ！トゲ！');
    draw();
    busy = true;
    setTimeout(() => {
      busy = false;
      restartStage();
    }, 350);
    return;
  }

  // Goal -> clear if no gems
  if (t === TILE.GOAL) {
    if (remainingGems === 0) {
      onClear();
      return;
    } else {
      updateStatus('まだ宝石があるよ');
    }
  } else {
    updateStatus();
  }

  draw();
}

function restartStage() {
  if (!stage) return;
  const start = findStart(stage);
  player = { x: start.x, y: start.y };
  // Re-load original stage from list to restore gems/spikes edits during play.
  const original = normalizeStage(stageList[stageIndex]);
  stage = original;
  remainingGems = countGems(stage);
  moves = 0;
  updateStatus();
  void loadSkinImagesForStage(stage);
  draw();
}

function onClear() {
  busy = true;
  const nextIndex = stageIndex + 1;
  const hasNext = nextIndex < stageList.length;
  const extra = hasNext
    ? `<div style="display:flex; gap: 10px; flex-wrap: wrap; justify-content:center; margin-top: 12px;">
         <a class="btn-primary" href="${stageHref('./play.html', stageList[nextIndex].name)}" style="text-decoration:none;">つぎへ</a>
         <a class="pq-tool-btn" href="./stage-select.html" style="text-decoration:none; display:inline-flex; align-items:center;">ステージ選択</a>
       </div>`
    : `<div style="display:flex; gap: 10px; flex-wrap: wrap; justify-content:center; margin-top: 12px;">
         <a class="btn-primary" href="./stage-select.html" style="text-decoration:none;">ステージ選択へ</a>
       </div>`;
  showOverlay('クリア！', 'おめでとう！', extra);
  updateStatus('クリア！');
}

function bindMoveButton(btn, dx, dy) {
  if (!btn) return;
  const go = (e) => {
    e.preventDefault();
    tryMove(dx, dy);
  };
  btn.addEventListener('click', go);
  btn.addEventListener('pointerdown', go);
}

function onKeyDown(e) {
  if (e.key === 'ArrowUp') tryMove(0, -1);
  if (e.key === 'ArrowDown') tryMove(0, 1);
  if (e.key === 'ArrowLeft') tryMove(-1, 0);
  if (e.key === 'ArrowRight') tryMove(1, 0);
  if (e.key === 'r' || e.key === 'R') restartStage();
}

restartBtn?.addEventListener('click', () => restartStage());
helpBtn?.addEventListener('click', () => {
  showOverlay('あそびかた', '💎をぜんぶ取ってから🏁に入るとクリア！⚠️にのるとやり直し。', '');
});

bindMoveButton(btnUp, 0, -1);
bindMoveButton(btnDown, 0, 1);
bindMoveButton(btnLeft, -1, 0);
bindMoveButton(btnRight, 1, 0);

window.addEventListener('keydown', onKeyDown);

async function init() {
  stageList = ensureStages();
  if (stageList.length === 0) {
    showOverlay('ステージがないよ', 'ステージ選択で「新規作成」してね。', `<a class="btn-primary" href="./stage-select.html" style="text-decoration:none;">ステージ選択</a>`);
    return;
  }

  const desired = getStageFromUrl();
  const idx = indexOfStageByName(desired);
  if (idx >= 0) loadStageByIndex(idx);
  else loadStageByIndex(0);

  resize();
}

init();

