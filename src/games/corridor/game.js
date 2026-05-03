// コリドール (Quoridor) - 2人対戦 1画面対面プレイ
// 9x9マス、各プレイヤー10枚の壁

// ==== 定数 ====
const SIZE = 9;
const WALLS_PER_PLAYER = 10;
const CELL = 50;     // SVG内 1マスの辺
const GAP = 12;      // 壁の幅 (cell間の隙間)
const STEP = CELL + GAP;
const BOARD_PX = SIZE * CELL + (SIZE - 1) * GAP; // 9*50 + 8*12 = 546
const PAD = 6;       // SVG周囲のpadding

const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

const PLAYER_PRESETS = [
  { id: 1, name: 'プレイヤー1', color: '#38bdf8', accent: '#bae6fd', goal: 0,        startC: 4, startR: 8, dirLabel: '↑ 上をめざす' },
  { id: 2, name: 'プレイヤー2', color: '#f472b6', accent: '#fbcfe8', goal: SIZE - 1, startC: 4, startR: 0, dirLabel: '↓ 下をめざす' }
];

// ==== 状態 ====
const state = {
  phase: 'menu', // 'menu' | 'playing' | 'over'
  players: [],   // [{ id, name, color, goal, walls(残数) }]
  pawns: [],     // [{ player, c, r }]
  walls: [],     // [{ orient: 'h'|'v', c, r }]  c,r in 0..7
  currentPlayer: 1,
  selected: false, // 自分のポーンを選択中（移動候補表示）
  movables: [],
  mode: 'move',  // 'move' | 'wall'
  winner: null,
  hoverWall: null, // {orient, c, r, valid}
  muted: false
};

// ==== サウンド ====
const sound = (() => {
  let ctx = null;
  function ensure() {
    if (state.muted) return null;
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone({ freq = 440, type = 'sine', dur = 0.12, vol = 0.16, slideTo = null }) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  return {
    select: () => tone({ freq: 660, type: 'triangle', dur: 0.07, vol: 0.12 }),
    move: () => tone({ freq: 520, type: 'sine', dur: 0.1, vol: 0.1, slideTo: 380 }),
    jump: () => {
      tone({ freq: 380, type: 'triangle', dur: 0.08, vol: 0.13 });
      setTimeout(() => tone({ freq: 720, type: 'sine', dur: 0.1, vol: 0.12 }), 60);
    },
    wall: () => {
      tone({ freq: 220, type: 'square', dur: 0.06, vol: 0.07 });
      setTimeout(() => tone({ freq: 130, type: 'triangle', dur: 0.18, vol: 0.18 }), 30);
    },
    invalid: () => tone({ freq: 160, type: 'sawtooth', dur: 0.16, vol: 0.12 }),
    tap: () => tone({ freq: 540, type: 'sine', dur: 0.05, vol: 0.07 }),
    win: () => {
      const c = ensure(); if (!c) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => tone({ freq: f, type: 'triangle', dur: 0.28, vol: 0.16 }), i * 90);
      });
    }
  };
})();

// ==== 座標 ====
function cellPx(c, r) {
  return { x: PAD + c * STEP, y: PAD + r * STEP };
}
function inBounds(c, r) {
  return c >= 0 && c < SIZE && r >= 0 && r < SIZE;
}

// ==== 壁ロジック ====
// 壁 (orient, c, r) anchor at corner (c+1, r+1)
// h壁: cells (c,r)-(c,r+1) と (c+1,r)-(c+1,r+1) の縦方向移動を遮る
// v壁: cells (c,r)-(c+1,r) と (c,r+1)-(c+1,r+1) の横方向移動を遮る

function isWallBetween(c1, r1, c2, r2) {
  // 隣接2マスの間に壁があるか
  if (c1 === c2) {
    if (r2 === r1 + 1) {
      return state.walls.some(w => w.orient === 'h' && w.r === r1 && (w.c === c1 || w.c === c1 - 1));
    }
    if (r2 === r1 - 1) {
      return state.walls.some(w => w.orient === 'h' && w.r === r2 && (w.c === c1 || w.c === c1 - 1));
    }
  }
  if (r1 === r2) {
    if (c2 === c1 + 1) {
      return state.walls.some(w => w.orient === 'v' && w.c === c1 && (w.r === r1 || w.r === r1 - 1));
    }
    if (c2 === c1 - 1) {
      return state.walls.some(w => w.orient === 'v' && w.c === c2 && (w.r === r1 || w.r === r1 - 1));
    }
  }
  return false;
}

function isWallConflict(orient, c, r) {
  for (const w of state.walls) {
    // 同anchor: 縦横同位置で交差
    if (w.c === c && w.r === r) return true;
    if (w.orient === orient) {
      if (orient === 'h' && w.r === r && Math.abs(w.c - c) === 1) return true;
      if (orient === 'v' && w.c === c && Math.abs(w.r - r) === 1) return true;
    }
  }
  return false;
}

function pawnAt(c, r) {
  return state.pawns.find(p => p.c === c && p.r === r);
}

function getPossibleMoves(playerId) {
  const me = state.pawns.find(p => p.player === playerId);
  const out = [];
  for (const [dc, dr] of DIRS) {
    const nc = me.c + dc, nr = me.r + dr;
    if (!inBounds(nc, nr)) continue;
    if (isWallBetween(me.c, me.r, nc, nr)) continue;
    const occ = pawnAt(nc, nr);
    if (!occ) {
      out.push({ c: nc, r: nr });
    } else {
      // ジャンプ: 相手の向こう側
      const jc = nc + dc, jr = nr + dr;
      if (inBounds(jc, jr) && !isWallBetween(nc, nr, jc, jr) && !pawnAt(jc, jr)) {
        out.push({ c: jc, r: jr });
      } else {
        // 斜め移動
        const perps = (dc === 0) ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
        for (const [pdc, pdr] of perps) {
          const dc2 = nc + pdc, dr2 = nr + pdr;
          if (!inBounds(dc2, dr2)) continue;
          if (isWallBetween(nc, nr, dc2, dr2)) continue;
          if (pawnAt(dc2, dr2)) continue;
          out.push({ c: dc2, r: dr2 });
        }
      }
    }
  }
  return out;
}

// 壁を仮置きしたとき、両プレイヤーがゴールへ到達可能か (BFS)
function hasPathToGoal(pawn, goalRow, simulatedWalls) {
  const saved = state.walls;
  state.walls = simulatedWalls;
  const visited = new Set();
  const queue = [{ c: pawn.c, r: pawn.r }];
  visited.add(`${pawn.c},${pawn.r}`);
  let found = false;
  while (queue.length) {
    const cur = queue.shift();
    if (cur.r === goalRow) { found = true; break; }
    for (const [dc, dr] of DIRS) {
      const nc = cur.c + dc, nr = cur.r + dr;
      if (!inBounds(nc, nr)) continue;
      const key = `${nc},${nr}`;
      if (visited.has(key)) continue;
      if (isWallBetween(cur.c, cur.r, nc, nr)) continue;
      visited.add(key);
      queue.push({ c: nc, r: nr });
    }
  }
  state.walls = saved;
  return found;
}

function isWallLegal(orient, c, r) {
  if (c < 0 || c > SIZE - 2 || r < 0 || r > SIZE - 2) return { ok: false, reason: 'out' };
  if (isWallConflict(orient, c, r)) return { ok: false, reason: 'conflict' };
  // パスチェック: 仮置き
  const sim = [...state.walls, { orient, c, r }];
  for (const pawn of state.pawns) {
    const player = state.players.find(p => p.id === pawn.player);
    if (!hasPathToGoal(pawn, player.goal, sim)) return { ok: false, reason: 'no-path' };
  }
  return { ok: true };
}

// ==== ゲーム制御 ====
function startGame() {
  state.players = PLAYER_PRESETS.map(p => ({ ...p, walls: WALLS_PER_PLAYER }));
  state.pawns = state.players.map(p => ({ player: p.id, c: p.startC, r: p.startR }));
  state.walls = [];
  state.currentPlayer = 1;
  state.selected = false;
  state.movables = [];
  state.mode = 'move';
  state.winner = null;
  state.hoverWall = null;
  state.phase = 'playing';
  hideOverlay('menu');
  hideOverlay('result');
  renderAll();
}

function selectPawn() {
  if (state.phase !== 'playing') return;
  if (state.mode !== 'move') return;
  if (state.selected) {
    state.selected = false;
    state.movables = [];
    sound.tap();
    renderAll();
    return;
  }
  state.movables = getPossibleMoves(state.currentPlayer);
  state.selected = true;
  sound.select();
  renderAll();
}

function moveTo(c, r) {
  if (state.phase !== 'playing' || !state.selected) return;
  const isTarget = state.movables.some(t => t.c === c && t.r === r);
  if (!isTarget) { sound.invalid(); return; }
  const pawn = state.pawns.find(p => p.player === state.currentPlayer);
  const dx = Math.abs(c - pawn.c), dy = Math.abs(r - pawn.r);
  const isJump = dx + dy > 1;
  pawn.c = c; pawn.r = r;
  state.selected = false;
  state.movables = [];
  if (isJump) sound.jump(); else sound.move();
  // 勝利判定
  const me = state.players.find(p => p.id === state.currentPlayer);
  if (pawn.r === me.goal) {
    state.winner = state.currentPlayer;
    state.phase = 'over';
    renderAll();
    setTimeout(() => {
      sound.win();
      showResult();
      launchConfetti(me.color);
    }, 350);
    return;
  }
  // ターン切替
  state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
  renderAll();
}

function placeWall(orient, c, r) {
  if (state.phase !== 'playing' || state.mode !== 'wall') return;
  const me = state.players.find(p => p.id === state.currentPlayer);
  if (me.walls <= 0) { sound.invalid(); flashHud('壁がもうない！'); return; }
  const legal = isWallLegal(orient, c, r);
  if (!legal.ok) {
    sound.invalid();
    if (legal.reason === 'conflict') flashHud('ここには置けない（重なる/交差）');
    else if (legal.reason === 'no-path') flashHud('置くと相手が ゴールに行けなくなる');
    return;
  }
  state.walls.push({ orient, c, r });
  me.walls--;
  sound.wall();
  state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
  // 自動でmoveモードに戻る
  state.mode = 'move';
  state.selected = false;
  state.movables = [];
  renderAll();
}

function toggleMode() {
  if (state.phase !== 'playing') return;
  if (state.mode === 'move') {
    state.mode = 'wall';
    state.selected = false;
    state.movables = [];
  } else {
    state.mode = 'move';
  }
  sound.tap();
  renderAll();
}

// ==== レンダリング ====
const $ = (sel) => document.querySelector(sel);

function renderAll() {
  renderBoard();
  renderPanels();
  renderHud();
}

function renderBoard() {
  const svg = $('#board');
  svg.innerHTML = '';
  const w = BOARD_PX + PAD * 2;
  svg.setAttribute('viewBox', `0 0 ${w} ${w}`);

  // ゴール行のハイライト
  for (const player of state.players) {
    const { y } = cellPx(0, player.goal);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', PAD);
    rect.setAttribute('y', y);
    rect.setAttribute('width', BOARD_PX);
    rect.setAttribute('height', CELL);
    rect.setAttribute('class', 'goal-row');
    rect.setAttribute('fill', player.color);
    svg.appendChild(rect);
  }

  // セル
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const { x, y } = cellPx(c, r);
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', CELL);
      rect.setAttribute('height', CELL);
      rect.setAttribute('rx', 8);
      rect.setAttribute('class', 'cell');
      rect.dataset.c = String(c);
      rect.dataset.r = String(r);
      // 移動可能ハイライト
      if (state.movables.some(m => m.c === c && m.r === r)) {
        rect.classList.add('movable');
        rect.addEventListener('click', () => moveTo(c, r));
      } else if (state.mode === 'move' && state.selected) {
        rect.classList.add('dim');
      }
      svg.appendChild(rect);
    }
  }

  // 既設の壁
  for (const w of state.walls) {
    drawWall(svg, w.orient, w.c, w.r, 'placed');
  }

  // 壁モード時：候補スロット表示
  if (state.phase === 'playing' && state.mode === 'wall') {
    const me = state.players.find(p => p.id === state.currentPlayer);
    if (me.walls > 0) {
      for (let c = 0; c < SIZE - 1; c++) {
        for (let r = 0; r < SIZE - 1; r++) {
          for (const orient of ['h', 'v']) {
            // skip if already conflicting (visual, no need to validate path here)
            if (isWallConflict(orient, c, r)) continue;
            const slot = drawWall(svg, orient, c, r, 'slot');
            slot.dataset.orient = orient;
            slot.dataset.c = String(c);
            slot.dataset.r = String(r);
            slot.addEventListener('click', () => placeWall(orient, c, r));
          }
        }
      }
    }
  }

  // ポーン
  for (const pawn of state.pawns) {
    const { x, y } = cellPx(pawn.c, pawn.r);
    const player = state.players.find(p => p.id === pawn.player);
    const cx = x + CELL / 2, cy = y + CELL / 2;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${cx}, ${cy})`);
    g.setAttribute('class', 'pawn' +
      (pawn.player === state.currentPlayer && state.phase === 'playing' && state.mode === 'move' ? ' my-turn' : '') +
      (state.selected && pawn.player === state.currentPlayer ? ' selected' : ''));
    g.dataset.player = String(pawn.player);

    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    halo.setAttribute('r', String(CELL * 0.42));
    halo.setAttribute('fill', player.color);
    halo.setAttribute('class', 'pawn-halo');
    g.appendChild(halo);

    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    inner.setAttribute('r', String(CELL * 0.32));
    inner.setAttribute('fill', player.accent);
    inner.setAttribute('class', 'pawn-inner');
    g.appendChild(inner);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'central');
    label.setAttribute('class', 'pawn-label');
    label.setAttribute('fill', player.color);
    label.textContent = pawn.player === 1 ? '↑' : '↓';
    g.appendChild(label);

    if (state.mode === 'move' && state.phase === 'playing' && pawn.player === state.currentPlayer) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', selectPawn);
    }
    svg.appendChild(g);
  }
}

function drawWall(svg, orient, c, r, kind) {
  const { x, y } = cellPx(c, r);
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', `wall ${orient} ${kind}`);
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  if (orient === 'h') {
    rect.setAttribute('x', x);
    rect.setAttribute('y', y + CELL);
    rect.setAttribute('width', 2 * CELL + GAP);
    rect.setAttribute('height', GAP);
  } else {
    rect.setAttribute('x', x + CELL);
    rect.setAttribute('y', y);
    rect.setAttribute('width', GAP);
    rect.setAttribute('height', 2 * CELL + GAP);
  }
  rect.setAttribute('rx', 3);
  g.appendChild(rect);
  // 拡張tap領域 (slotのみ)
  if (kind === 'slot') {
    const tap = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    if (orient === 'h') {
      tap.setAttribute('x', x);
      tap.setAttribute('y', y + CELL - 6);
      tap.setAttribute('width', 2 * CELL + GAP);
      tap.setAttribute('height', GAP + 12);
    } else {
      tap.setAttribute('x', x + CELL - 6);
      tap.setAttribute('y', y);
      tap.setAttribute('width', GAP + 12);
      tap.setAttribute('height', 2 * CELL + GAP);
    }
    tap.setAttribute('class', 'wall-tap');
    g.appendChild(tap);
  }
  svg.appendChild(g);
  return g;
}

function renderPanels() {
  const top = $('#panels-top');
  const bottom = $('#panels-bottom');
  top.innerHTML = '';
  bottom.innerHTML = '';
  for (const player of state.players) {
    const pawn = state.pawns.find(p => p.player === player.id);
    const isTop = player.id === 2;
    const div = document.createElement('div');
    div.className = 'panel' + (isTop ? ' flip' : '');
    if (state.currentPlayer === player.id && state.phase === 'playing') div.classList.add('active');
    if (state.winner === player.id) div.classList.add('winner');
    div.style.setProperty('--c', player.color);
    div.innerHTML = `
      <div class="panel-name">
        <span class="panel-dot"></span>
        <span>${player.name}</span>
      </div>
      <div class="panel-status">${playerStatusText(player)}</div>
      <div class="panel-walls">
        <span class="walls-icon">🧱</span>
        <span class="walls-num">${player.walls}</span>
      </div>
    `;
    if (isTop) top.appendChild(div); else bottom.appendChild(div);
  }
}

function playerStatusText(player) {
  if (state.phase === 'over') {
    return state.winner === player.id ? '🏆 ゴール！' : '惜しい！';
  }
  if (state.currentPlayer === player.id) {
    if (state.mode === 'move') return state.selected ? '進む先をタップ' : `${player.dirLabel}`;
    return '壁を置く場所をタップ';
  }
  return '相手の番…';
}

function renderHud() {
  const phase = $('#phase');
  if (state.phase === 'playing') {
    const me = state.players.find(p => p.id === state.currentPlayer);
    phase.textContent = state.mode === 'move'
      ? `${me.name} の番: コマを動かす`
      : `${me.name} の番: 壁を置く`;
  } else {
    phase.textContent = '';
  }
  const modeBtn = $('#modeBtn');
  if (modeBtn) {
    if (state.phase !== 'playing') {
      modeBtn.style.display = 'none';
    } else {
      modeBtn.style.display = '';
      modeBtn.textContent = state.mode === 'move' ? '🧱 壁モード' : '🚶 移動モード';
      modeBtn.classList.toggle('active', state.mode === 'wall');
    }
  }
}

function flashHud(msg) {
  const phase = $('#phase');
  const orig = phase.textContent;
  phase.textContent = msg;
  phase.classList.add('flash');
  setTimeout(() => {
    phase.classList.remove('flash');
    if (state.phase === 'playing') renderHud();
  }, 1400);
}

// ==== 結果 ====
function showResult() {
  const w = state.players.find(p => p.id === state.winner);
  $('#resultEmoji').textContent = w.id === 1 ? '🥇' : '🏆';
  $('#resultTitle').textContent = `${w.name} の勝ち！`;
  $('#resultTitle').style.color = w.color;
  $('#resultSub').textContent = 'ゴール行に到達！';
  $('#resultDialog').style.setProperty('--c', w.color);
  showOverlay('result');
}

function showOverlay(id) { $(`#${id}`).classList.remove('hidden'); }
function hideOverlay(id) { $(`#${id}`).classList.add('hidden'); }

// ==== 紙吹雪 ====
function launchConfetti(baseColor) {
  const canvas = $('#confetti');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = [baseColor, '#fde68a', '#a5b4fc', '#86efac', '#fca5a5', '#7dd3fc'];
  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.4,
    vx: (Math.random() - 0.5) * 3,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.2,
    size: 6 + Math.random() * 8,
    color: colors[(Math.random() * colors.length) | 0]
  }));
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (elapsed < 4500) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(tick);
}

// ==== UI バインド ====
function bindEvents() {
  $('#startBtn').addEventListener('click', () => { sound.tap(); startGame(); });
  $('#newBtn').addEventListener('click', () => { sound.tap(); showOverlay('menu'); });
  $('#resetBtn').addEventListener('click', () => { sound.tap(); startGame(); });
  $('#muteBtn').addEventListener('click', () => {
    state.muted = !state.muted;
    $('#muteBtn').textContent = state.muted ? '🔇' : '🔊';
  });
  $('#rulesBtn').addEventListener('click', () => { sound.tap(); showOverlay('rules'); });
  $('#rulesClose').addEventListener('click', () => { sound.tap(); hideOverlay('rules'); });
  $('#rules').addEventListener('click', (e) => { if (e.target.id === 'rules') hideOverlay('rules'); });
  $('#resultAgainBtn').addEventListener('click', () => { sound.tap(); startGame(); });
  $('#resultMenuBtn').addEventListener('click', () => { sound.tap(); hideOverlay('result'); showOverlay('menu'); });
  $('#modeBtn').addEventListener('click', () => toggleMode());
  $('#rulesFromMenuBtn').addEventListener('click', () => showOverlay('rules'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selected) {
      state.selected = false; state.movables = []; renderAll();
    }
  });
  document.addEventListener('pointerdown', () => sound.tap(), { once: true });
}

function init() {
  bindEvents();
  showOverlay('menu');
  // メニュー裏に空盤面プレビュー
  state.players = PLAYER_PRESETS.map(p => ({ ...p, walls: WALLS_PER_PLAYER }));
  state.pawns = state.players.map(p => ({ player: p.id, c: p.startC, r: p.startR }));
  state.walls = [];
  renderBoard();
  renderHud();
}

init();
