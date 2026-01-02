// 3D迷路メーカー（最小版）
// - 作成モード: 64x64 グリッドをペイント
// - プレイモード: レイキャストで簡易3D表示

const SIZE = 64;
const STORAGE_KEY = 'ngames.mazes.v1';

// Tile types
const TILE = {
  PATH: 0,
  WALL: 1
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function makeEmptyMaze(name = '新しい迷路') {
  const grid = new Uint8Array(SIZE * SIZE);
  // outer border as wall
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const isBorder = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
      grid[y * SIZE + x] = isBorder ? TILE.WALL : TILE.PATH;
    }
  }
  return {
    version: 1,
    name,
    w: SIZE,
    h: SIZE,
    grid: Array.from(grid), // localStorage用に配列化
    start: { x: 1, y: 1, dir: 0 },
    goal: { x: SIZE - 2, y: SIZE - 2 }
  };
}

function normalizeMaze(maze) {
  const w = maze?.w === SIZE ? SIZE : SIZE;
  const h = maze?.h === SIZE ? SIZE : SIZE;

  const raw = Array.isArray(maze?.grid) ? maze.grid : [];
  const grid = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < grid.length; i++) grid[i] = raw[i] === TILE.WALL ? TILE.WALL : TILE.PATH;

  // ensure border wall
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const isBorder = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
      if (isBorder) grid[y * SIZE + x] = TILE.WALL;
    }
  }

  const start = maze?.start ?? { x: 1, y: 1, dir: 0 };
  const goal = maze?.goal ?? { x: SIZE - 2, y: SIZE - 2 };
  const safe = {
    version: 1,
    name: typeof maze?.name === 'string' && maze.name.trim() ? maze.name.trim() : 'ななしの迷路',
    w,
    h,
    grid: Array.from(grid),
    start: {
      x: clamp(Math.floor(start.x ?? 1), 1, SIZE - 2),
      y: clamp(Math.floor(start.y ?? 1), 1, SIZE - 2),
      dir: Number.isFinite(start.dir) ? start.dir : 0
    },
    goal: {
      x: clamp(Math.floor(goal.x ?? SIZE - 2), 1, SIZE - 2),
      y: clamp(Math.floor(goal.y ?? SIZE - 2), 1, SIZE - 2)
    }
  };

  // make sure start/goal are on path
  const sIdx = safe.start.y * SIZE + safe.start.x;
  const gIdx = safe.goal.y * SIZE + safe.goal.x;
  if (grid[sIdx] === TILE.WALL) safe.grid[sIdx] = TILE.PATH;
  if (grid[gIdx] === TILE.WALL) safe.grid[gIdx] = TILE.PATH;
  return safe;
}

function loadAllMazes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeMaze);
  } catch {
    return [];
  }
}

function saveAllMazes(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function upsertMaze(maze) {
  const list = loadAllMazes();
  const m = normalizeMaze(maze);
  const idx = list.findIndex(x => x.name === m.name);
  if (idx >= 0) list[idx] = m;
  else list.unshift(m);
  saveAllMazes(list);
  return list;
}

function getDefaultMazes() {
  const m = makeEmptyMaze('サンプル');
  // add some simple walls
  for (let x = 2; x < SIZE - 2; x++) m.grid[10 * SIZE + x] = TILE.WALL;
  for (let y = 12; y < SIZE - 6; y++) m.grid[y * SIZE + 20] = TILE.WALL;
  m.start = { x: 2, y: 2, dir: 0 };
  m.goal = { x: SIZE - 3, y: SIZE - 3 };
  return [normalizeMaze(m)];
}

// DOM
const tabEditor = document.getElementById('tabEditor');
const tabPlay = document.getElementById('tabPlay');
const panelEditor = document.getElementById('panelEditor');
const panelPlay = document.getElementById('panelPlay');
const mazeStatus = document.getElementById('mazeStatus');

const editorCanvas = document.getElementById('editorCanvas');
const ectx = editorCanvas.getContext('2d');
const playCanvas = document.getElementById('playCanvas');
const pctx = playCanvas.getContext('2d');

const toolButtons = Array.from(document.querySelectorAll('.tool-btn[data-tool]'));
const mazeNameEl = document.getElementById('mazeName');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const clearBtn = document.getElementById('clearBtn');

const mazeSelect = document.getElementById('mazeSelect');
const playBtn = document.getElementById('playBtn');
const resetBtn = document.getElementById('resetBtn');
const mobileControls = document.getElementById('mobileControls');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const overlayClose = document.getElementById('overlayClose');

// State (Editor)
let currentTool = 'wall';
let currentMaze = makeEmptyMaze('新しい迷路');

function setTool(tool) {
  currentTool = tool;
  toolButtons.forEach(btn => {
    btn.dataset.active = btn.dataset.tool === tool ? 'true' : 'false';
  });
}
setTool('wall');

function setTab(tab) {
  const isEditor = tab === 'editor';
  tabEditor.setAttribute('aria-selected', isEditor ? 'true' : 'false');
  tabPlay.setAttribute('aria-selected', isEditor ? 'false' : 'true');
  panelEditor.classList.toggle('hidden', !isEditor);
  panelPlay.classList.toggle('hidden', isEditor);
  if (!isEditor) {
    syncMazeSelect();
    resizePlayCanvas();
    draw3D(); // show preview
  } else {
    resizeEditorCanvas();
    drawEditor();
  }
}

tabEditor.addEventListener('click', () => setTab('editor'));
tabPlay.addEventListener('click', () => setTab('play'));

function gridIndex(x, y) {
  return y * SIZE + x;
}

function getCellFromPointer(evt) {
  const rect = editorCanvas.getBoundingClientRect();
  const x = (evt.clientX - rect.left) / rect.width;
  const y = (evt.clientY - rect.top) / rect.height;
  const cx = clamp(Math.floor(x * SIZE), 0, SIZE - 1);
  const cy = clamp(Math.floor(y * SIZE), 0, SIZE - 1);
  return { x: cx, y: cy };
}

function applyToolAt(x, y) {
  // keep border as wall
  const isBorder = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
  if (isBorder) return;

  const idx = gridIndex(x, y);
  if (currentTool === 'wall') {
    currentMaze.grid[idx] = TILE.WALL;
  } else if (currentTool === 'path') {
    currentMaze.grid[idx] = TILE.PATH;
  } else if (currentTool === 'start') {
    currentMaze.start = { x, y, dir: currentMaze.start.dir ?? 0 };
    currentMaze.grid[idx] = TILE.PATH;
  } else if (currentTool === 'goal') {
    currentMaze.goal = { x, y };
    currentMaze.grid[idx] = TILE.PATH;
  }
}

function resizeEditorCanvas() {
  // Keep canvas crisp while matching layout width
  const max = Math.min(900, window.innerWidth - 40);
  const px = Math.max(320, max);
  editorCanvas.width = px;
  editorCanvas.height = px;
}

function drawEditor() {
  const w = editorCanvas.width;
  const h = editorCanvas.height;
  ectx.clearRect(0, 0, w, h);

  const cell = w / SIZE;

  // Background
  ectx.fillStyle = '#f8f9ff';
  ectx.fillRect(0, 0, w, h);

  // Tiles
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const t = currentMaze.grid[gridIndex(x, y)] === TILE.WALL ? TILE.WALL : TILE.PATH;
      if (t === TILE.WALL) {
        ectx.fillStyle = '#2d3436';
        ectx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }

  // Grid lines (light)
  ectx.strokeStyle = 'rgba(0,0,0,0.06)';
  ectx.lineWidth = 1;
  for (let i = 0; i <= SIZE; i++) {
    const p = Math.round(i * cell) + 0.5;
    ectx.beginPath();
    ectx.moveTo(p, 0);
    ectx.lineTo(p, h);
    ectx.stroke();
    ectx.beginPath();
    ectx.moveTo(0, p);
    ectx.lineTo(w, p);
    ectx.stroke();
  }

  // Start/Goal markers
  const { start, goal } = currentMaze;
  ectx.fillStyle = '#00cec9';
  ectx.fillRect(start.x * cell, start.y * cell, cell, cell);
  ectx.fillStyle = '#ffeaa7';
  ectx.fillRect(goal.x * cell, goal.y * cell, cell, cell);

  ectx.fillStyle = 'rgba(0,0,0,0.75)';
  ectx.font = `${Math.max(10, Math.floor(cell * 0.55))}px Outfit, sans-serif`;
  ectx.textAlign = 'center';
  ectx.textBaseline = 'middle';
  ectx.fillText('S', start.x * cell + cell / 2, start.y * cell + cell / 2);
  ectx.fillText('G', goal.x * cell + cell / 2, goal.y * cell + cell / 2);

  mazeStatus.textContent = `${SIZE}×${SIZE}`;
}

let isPainting = false;
let lastPaint = null;
editorCanvas.addEventListener('pointerdown', (e) => {
  editorCanvas.setPointerCapture?.(e.pointerId);
  isPainting = true;
  const c = getCellFromPointer(e);
  lastPaint = c;
  applyToolAt(c.x, c.y);
  drawEditor();
  e.preventDefault();
});
editorCanvas.addEventListener('pointermove', (e) => {
  if (!isPainting) return;
  const c = getCellFromPointer(e);
  if (lastPaint && c.x === lastPaint.x && c.y === lastPaint.y) return;
  lastPaint = c;
  applyToolAt(c.x, c.y);
  drawEditor();
  e.preventDefault();
});
editorCanvas.addEventListener('pointerup', () => {
  isPainting = false;
  lastPaint = null;
});
editorCanvas.addEventListener('pointercancel', () => {
  isPainting = false;
  lastPaint = null;
});

toolButtons.forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

saveBtn.addEventListener('click', () => {
  const name = (mazeNameEl.value || '').trim();
  if (!name) {
    showOverlay('名前がいるよ', '「名前」を入れてから保存してね。');
    return;
  }
  currentMaze.name = name;
  upsertMaze(currentMaze);
  showOverlay('保存したよ', `「${currentMaze.name}」を保存しました。`);
  syncMazeSelect(currentMaze.name);
});

loadBtn.addEventListener('click', () => {
  const list = ensureMazes();
  if (list.length === 0) {
    showOverlay('まだないよ', '保存した迷路がないみたい。まず作って保存してね。');
    return;
  }
  // Simple prompt selection
  const names = list.map(m => m.name).join('\n');
  const pick = prompt(`読みこみたい迷路の名前を入力してね:\n\n${names}`, list[0].name);
  if (!pick) return;
  const found = list.find(m => m.name === pick);
  if (!found) {
    showOverlay('みつからない…', 'その名前の迷路が見つからなかったよ。');
    return;
  }
  currentMaze = normalizeMaze(found);
  mazeNameEl.value = currentMaze.name;
  drawEditor();
});

clearBtn.addEventListener('click', () => {
  if (!confirm('いまの迷路をぜんぶ消す？（保存してないと元に戻せないよ）')) return;
  const name = (mazeNameEl.value || '').trim() || '新しい迷路';
  currentMaze = makeEmptyMaze(name);
  drawEditor();
});

function ensureMazes() {
  let list = loadAllMazes();
  if (list.length === 0) {
    list = getDefaultMazes();
    saveAllMazes(list);
  }
  return list;
}

function syncMazeSelect(selectName) {
  const list = ensureMazes();
  mazeSelect.innerHTML = '';
  list.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.name;
    opt.textContent = m.name;
    mazeSelect.appendChild(opt);
  });
  if (selectName) mazeSelect.value = selectName;
}

// Overlay
function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.style.display = 'flex';
}
overlayClose.addEventListener('click', () => {
  overlay.style.display = 'none';
});
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) overlay.style.display = 'none';
});

// ==========================
// Play mode (Raycasting)
// ==========================

const keys = new Set();
document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
    e.preventDefault();
  }
  keys.add(k);
});
document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const mobileAct = new Set();
if (mobileControls && isTouchDevice()) {
  mobileControls.querySelectorAll('button[data-act]').forEach(btn => {
    const act = btn.dataset.act;
    btn.addEventListener('pointerdown', (e) => {
      mobileAct.add(act);
      btn.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });
    btn.addEventListener('pointerup', () => mobileAct.delete(act));
    btn.addEventListener('pointercancel', () => mobileAct.delete(act));
    btn.addEventListener('pointerleave', () => mobileAct.delete(act));
  });
}

let playingMaze = null;
let player = {
  x: 1.5,
  y: 1.5,
  a: 0, // angle
  speed: 2.6,
  turnSpeed: 2.3
};
let isPlaying = false;
let lastT = 0;

function resizePlayCanvas() {
  const maxW = Math.min(980, window.innerWidth - 40);
  const w = Math.max(320, maxW);
  playCanvas.width = w;
  playCanvas.height = Math.floor(w * 0.56);
}

function mazeAt(mx, my) {
  if (!playingMaze) return TILE.WALL;
  const x = Math.floor(mx);
  const y = Math.floor(my);
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return TILE.WALL;
  return playingMaze.grid[gridIndex(x, y)] === TILE.WALL ? TILE.WALL : TILE.PATH;
}

function canMove(nx, ny) {
  // simple circle-ish collision by sampling a few points
  const r = 0.18;
  const samples = [
    [nx + r, ny],
    [nx - r, ny],
    [nx, ny + r],
    [nx, ny - r],
    [nx + r, ny + r],
    [nx - r, ny - r]
  ];
  return samples.every(([sx, sy]) => mazeAt(sx, sy) !== TILE.WALL);
}

function startPlay() {
  const list = ensureMazes();
  const name = mazeSelect.value || list[0]?.name;
  playingMaze = normalizeMaze(list.find(m => m.name === name) ?? list[0]);
  player.x = playingMaze.start.x + 0.5;
  player.y = playingMaze.start.y + 0.5;
  player.a = (playingMaze.start.dir ?? 0) * (Math.PI / 2);
  isPlaying = true;
  lastT = performance.now();
  requestAnimationFrame(loop);
}

playBtn.addEventListener('click', startPlay);
resetBtn.addEventListener('click', () => {
  if (!playingMaze) return;
  player.x = playingMaze.start.x + 0.5;
  player.y = playingMaze.start.y + 0.5;
  player.a = (playingMaze.start.dir ?? 0) * (Math.PI / 2);
});

function loop(t) {
  if (!isPlaying) return;
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;
  updatePlayer(dt);
  draw3D();
  checkGoal();
  requestAnimationFrame(loop);
}

function updatePlayer(dt) {
  const fwd = keys.has('w') || keys.has('arrowup') || mobileAct.has('fwd');
  const back = keys.has('s') || keys.has('arrowdown') || mobileAct.has('back');
  const left = keys.has('a') || mobileAct.has('left');
  const right = keys.has('d') || mobileAct.has('right');
  const turnL = keys.has('arrowleft') || mobileAct.has('turnL');
  const turnR = keys.has('arrowright') || mobileAct.has('turnR');

  const move = (Number(fwd) - Number(back)) * player.speed * dt;
  const strafe = (Number(right) - Number(left)) * player.speed * dt;
  const turn = (Number(turnR) - Number(turnL)) * player.turnSpeed * dt;

  player.a += turn;
  const ca = Math.cos(player.a);
  const sa = Math.sin(player.a);

  const nx = player.x + ca * move + Math.cos(player.a + Math.PI / 2) * strafe;
  const ny = player.y + sa * move + Math.sin(player.a + Math.PI / 2) * strafe;
  if (canMove(nx, ny)) {
    player.x = nx;
    player.y = ny;
  } else {
    // try axis separated
    if (canMove(nx, player.y)) player.x = nx;
    if (canMove(player.x, ny)) player.y = ny;
  }
}

function castRay(angle) {
  // DDA
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  let mapX = Math.floor(player.x);
  let mapY = Math.floor(player.y);

  const deltaDistX = Math.abs(1 / (dx || 1e-6));
  const deltaDistY = Math.abs(1 / (dy || 1e-6));

  let stepX, stepY;
  let sideDistX, sideDistY;

  if (dx < 0) {
    stepX = -1;
    sideDistX = (player.x - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
  }

  if (dy < 0) {
    stepY = -1;
    sideDistY = (player.y - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
  }

  let hit = 0;
  let side = 0; // 0: x-side, 1: y-side

  for (let i = 0; i < 256; i++) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    if (mapX < 0 || mapY < 0 || mapX >= SIZE || mapY >= SIZE) break;
    if (playingMaze.grid[gridIndex(mapX, mapY)] === TILE.WALL) {
      hit = 1;
      break;
    }
  }

  // perpendicular distance
  let perpWallDist;
  if (side === 0) {
    perpWallDist = (mapX - player.x + (1 - stepX) / 2) / (dx || 1e-6);
  } else {
    perpWallDist = (mapY - player.y + (1 - stepY) / 2) / (dy || 1e-6);
  }

  return { dist: Math.max(0.001, perpWallDist), side };
}

function draw3D() {
  if (!playingMaze) {
    // quick fallback preview from currentMaze
    playingMaze = normalizeMaze(currentMaze);
  }

  const W = playCanvas.width;
  const H = playCanvas.height;

  // ceiling & floor
  pctx.fillStyle = '#111827';
  pctx.fillRect(0, 0, W, H / 2);
  pctx.fillStyle = '#2d3436';
  pctx.fillRect(0, H / 2, W, H / 2);

  // raycast
  const fov = Math.PI / 3;
  const half = fov / 2;
  for (let x = 0; x < W; x++) {
    const camX = (x / W) * 2 - 1;
    const angle = player.a + camX * half;
    const { dist, side } = castRay(angle);

    // fish-eye correction
    const corrected = dist * Math.cos(angle - player.a);
    const lineH = Math.min(H, H / corrected);
    const y0 = Math.floor((H - lineH) / 2);

    const shadeBase = side === 1 ? 0.65 : 0.85;
    const fog = clamp(1 / (1 + corrected * 0.25), 0.2, 1);
    const shade = shadeBase * fog;
    const c = Math.floor(255 * shade);
    pctx.fillStyle = `rgb(${c}, ${c}, ${c})`;
    pctx.fillRect(x, y0, 1, lineH);
  }

  // Goal indicator (top mini hint)
  const gx = playingMaze.goal.x + 0.5;
  const gy = playingMaze.goal.y + 0.5;
  const angToGoal = Math.atan2(gy - player.y, gx - player.x);
  let diff = angToGoal - player.a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const center = W / 2;
  const indicatorX = clamp(center + (diff / (fov / 2)) * (W * 0.25), 10, W - 10);
  pctx.fillStyle = '#ffeaa7';
  pctx.fillRect(indicatorX - 3, 10, 6, 14);

  // Small text
  pctx.fillStyle = 'rgba(255,255,255,0.9)';
  pctx.font = '14px Outfit, sans-serif';
  pctx.textAlign = 'left';
  pctx.fillText('🏁 にむかってね', 12, 28);
}

function checkGoal() {
  if (!playingMaze) return;
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  if (px === playingMaze.goal.x && py === playingMaze.goal.y) {
    isPlaying = false;
    showOverlay('ゴール！', `「${playingMaze.name}」クリア！`);
  }
}

// init
function init() {
  // first paint state
  mazeNameEl.value = currentMaze.name;
  resizeEditorCanvas();
  drawEditor();
  syncMazeSelect();
  resizePlayCanvas();

  window.addEventListener('resize', () => {
    resizeEditorCanvas();
    resizePlayCanvas();
    if (panelEditor.classList.contains('hidden')) draw3D();
    else drawEditor();
  });
}

init();

