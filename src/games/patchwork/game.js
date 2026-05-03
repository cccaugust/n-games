// パッチワーク (Patchwork) - 2人専用 1画面対面プレイ
// 簡略化MVP: 9x9キルト、時間トラック25、パッチ16〜20種

// ==== 定数 ====
const QUILT_SIZE = 9;
const TIME_END = 25;
const STARTING_BUTTONS = 5;
const BUTTON_SPACES = [5, 10, 15, 20, 25];
const EMPTY_PENALTY = 2;

const PLAYER_PRESETS = [
  { id: 1, name: 'プレイヤー1', color: '#ec4899', accent: '#fbcfe8' },
  { id: 2, name: 'プレイヤー2', color: '#0ea5e9', accent: '#bae6fd' }
];

// パッチ定義: shape, cost(button), time, income(button印の数)
const PATCH_LIBRARY = [
  { id: 'p01', shape: [[1, 1]], cost: 2, time: 1, income: 0 },
  { id: 'p02', shape: [[1, 1, 1]], cost: 2, time: 2, income: 0 },
  { id: 'p03', shape: [[1, 1, 1, 1]], cost: 3, time: 3, income: 1 },
  { id: 'p04', shape: [[1, 1], [1, 1]], cost: 6, time: 5, income: 2 },
  { id: 'p05', shape: [[1, 1, 0], [0, 1, 1]], cost: 4, time: 2, income: 0 },
  { id: 'p06', shape: [[1, 0], [1, 1], [0, 1]], cost: 5, time: 4, income: 1 },
  { id: 'p07', shape: [[1, 1, 1], [0, 1, 0]], cost: 3, time: 3, income: 1 },
  { id: 'p08', shape: [[1, 1, 1], [1, 0, 0]], cost: 4, time: 6, income: 2 },
  { id: 'p09', shape: [[1, 1, 1, 1], [0, 1, 0, 0]], cost: 5, time: 4, income: 1 },
  { id: 'p10', shape: [[1, 1], [0, 1], [0, 1]], cost: 2, time: 3, income: 0 },
  { id: 'p11', shape: [[1, 1, 1, 1, 1]], cost: 7, time: 1, income: 1 },
  { id: 'p12', shape: [[1, 1, 1], [1, 1, 0]], cost: 5, time: 3, income: 1 },
  { id: 'p13', shape: [[1, 0, 1], [1, 1, 1]], cost: 3, time: 4, income: 0 },
  { id: 'p14', shape: [[0, 1, 0], [1, 1, 1], [0, 1, 0]], cost: 5, time: 4, income: 2 },
  { id: 'p15', shape: [[1, 1, 0, 0], [0, 1, 1, 1]], cost: 7, time: 2, income: 2 },
  { id: 'p16', shape: [[1, 1], [1, 0], [1, 0]], cost: 4, time: 2, income: 1 },
  { id: 'p17', shape: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], cost: 6, time: 5, income: 2 },
  { id: 'p18', shape: [[1, 0, 0, 1], [1, 1, 1, 1]], cost: 5, time: 3, income: 1 },
  { id: 'p19', shape: [[1, 1, 1], [1, 1, 1]], cost: 8, time: 6, income: 3 },
  { id: 'p20', shape: [[1, 1, 1, 1, 1], [0, 0, 1, 0, 0]], cost: 6, time: 5, income: 2 }
];

// ==== 状態 ====
const state = {
  phase: 'menu', // 'menu' | 'playing' | 'over'
  players: [],
  quilts: {},
  incomes: {},
  patches: [],   // 残り (circular)
  marketIndex: 0,
  selectedPatchId: null,
  selectedShape: null,
  lastMover: null,
  winner: null,
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
    rotate: () => tone({ freq: 480, type: 'sine', dur: 0.1, vol: 0.1, slideTo: 720 }),
    place: () => {
      tone({ freq: 320, type: 'triangle', dur: 0.08, vol: 0.13 });
      setTimeout(() => tone({ freq: 480, type: 'sine', dur: 0.1, vol: 0.1 }), 50);
    },
    coin: (n = 1) => {
      const c = ensure(); if (!c) return;
      for (let i = 0; i < n; i++) {
        setTimeout(() => tone({ freq: 880 + i * 40, type: 'sine', dur: 0.08, vol: 0.12 }), i * 60);
      }
    },
    skip: () => tone({ freq: 540, type: 'sine', dur: 0.12, vol: 0.1, slideTo: 360 }),
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

// ==== ユーティリティ ====
function deepCopy(x) { return JSON.parse(JSON.stringify(x)); }

function rotateShape(shape) {
  const rows = shape.length, cols = shape[0].length;
  const out = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out[c][rows - 1 - r] = shape[r][c];
    }
  }
  return out;
}

function flipShape(shape) {
  return shape.map((row) => row.slice().reverse());
}

function shapeCells(shape) {
  let n = 0;
  for (const row of shape) for (const v of row) if (v) n++;
  return n;
}

function canPlace(quilt, shape, c0, r0) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const cc = c0 + c, rr = r0 + r;
      if (cc < 0 || cc >= QUILT_SIZE || rr < 0 || rr >= QUILT_SIZE) return false;
      if (quilt[rr][cc]) return false;
    }
  }
  return true;
}

// ==== 初期化 ====
function emptyQuilt() {
  return Array.from({ length: QUILT_SIZE }, () => Array(QUILT_SIZE).fill(null));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startGame() {
  state.players = PLAYER_PRESETS.map((p) => ({ ...p, buttons: STARTING_BUTTONS, time: 0 }));
  state.quilts = { 1: emptyQuilt(), 2: emptyQuilt() };
  state.incomes = { 1: 0, 2: 0 };
  state.patches = shuffle(PATCH_LIBRARY).map((p) => ({ ...p, shape: deepCopy(p.shape) }));
  state.marketIndex = 0;
  state.selectedPatchId = null;
  state.selectedShape = null;
  state.lastMover = 2;
  state.winner = null;
  state.phase = 'playing';
  hideOverlay('menu');
  hideOverlay('result');
  renderAll();
}

// ==== ターン制御 ====
function getCurrentPlayer() {
  const [a, b] = state.players;
  if (a.time < b.time) return a;
  if (b.time < a.time) return b;
  // tie: 最後に動いた人と逆
  return a.id === state.lastMover ? b : a;
}

function isFinished(player) { return player.time >= TIME_END; }

function maybeEndGame() {
  if (state.players.every(isFinished)) {
    finalize();
    return true;
  }
  return false;
}

function moveTimeAndCollect(player, newTime) {
  const old = player.time;
  const target = Math.min(newTime, TIME_END);
  for (const sq of BUTTON_SPACES) {
    if (sq > old && sq <= target) {
      const inc = state.incomes[player.id];
      if (inc > 0) {
        player.buttons += inc;
        sound.coin(Math.min(inc, 3));
      }
    }
  }
  player.time = target;
}

function getMarketPatches() {
  // next 3 patches starting from marketIndex
  const out = [];
  for (let i = 0; i < 3 && i < state.patches.length; i++) {
    out.push(state.patches[(state.marketIndex + i) % state.patches.length]);
  }
  return out;
}

// ==== アクション ====
function selectMarketPatch(patchId) {
  if (state.phase !== 'playing') return;
  const cp = getCurrentPlayer();
  if (isFinished(cp)) return;
  const market = getMarketPatches();
  const patch = market.find((p) => p.id === patchId);
  if (!patch) { sound.invalid(); return; }
  if (cp.buttons < patch.cost) { sound.invalid(); flashHud(`ボタンが足りない (必要 ${patch.cost})`); return; }
  state.selectedPatchId = patchId;
  state.selectedShape = deepCopy(patch.shape);
  sound.select();
  renderAll();
}

function rotateActive() {
  if (!state.selectedShape) return;
  state.selectedShape = rotateShape(state.selectedShape);
  sound.rotate();
  renderAll();
}

function flipActive() {
  if (!state.selectedShape) return;
  state.selectedShape = flipShape(state.selectedShape);
  sound.rotate();
  renderAll();
}

function cancelSelection() {
  if (!state.selectedShape) return;
  state.selectedPatchId = null;
  state.selectedShape = null;
  sound.tap();
  renderAll();
}

function tryPlacePatch(c0, r0) {
  if (!state.selectedShape) return;
  const cp = getCurrentPlayer();
  const patchInMarket = state.patches.find((p) => p.id === state.selectedPatchId);
  if (!patchInMarket) return;
  if (!canPlace(state.quilts[cp.id], state.selectedShape, c0, r0)) {
    sound.invalid();
    flashHud('ここには置けない');
    return;
  }
  // commit
  const fillId = patchInMarket.id;
  const color = cp.color;
  for (let r = 0; r < state.selectedShape.length; r++) {
    for (let c = 0; c < state.selectedShape[r].length; c++) {
      if (state.selectedShape[r][c]) {
        state.quilts[cp.id][r0 + r][c0 + c] = { patchId: fillId, color, hasButton: false };
      }
    }
  }
  // mark income on first 'income' filled cells (just for visual)
  const filled = [];
  for (let r = 0; r < state.selectedShape.length; r++) {
    for (let c = 0; c < state.selectedShape[r].length; c++) {
      if (state.selectedShape[r][c]) filled.push({ r: r0 + r, c: c0 + c });
    }
  }
  for (let i = 0; i < patchInMarket.income && i < filled.length; i++) {
    state.quilts[cp.id][filled[i].r][filled[i].c].hasButton = true;
  }
  // pay
  cp.buttons -= patchInMarket.cost;
  state.incomes[cp.id] += patchInMarket.income;
  // remove from market, advance neutral token to its position
  const idxInList = state.patches.findIndex((p) => p.id === fillId);
  state.patches.splice(idxInList, 1);
  // marketIndex stays at the position where this patch was (next becomes new "first")
  if (state.patches.length > 0) {
    state.marketIndex = idxInList % state.patches.length;
  } else {
    state.marketIndex = 0;
  }
  // time
  moveTimeAndCollect(cp, cp.time + patchInMarket.time);
  state.selectedPatchId = null;
  state.selectedShape = null;
  state.lastMover = cp.id;
  sound.place();
  if (maybeEndGame()) return;
  renderAll();
}

function passTurn() {
  if (state.phase !== 'playing') return;
  const cp = getCurrentPlayer();
  if (isFinished(cp)) return;
  if (state.selectedShape) cancelSelection();
  const opp = state.players.find((p) => p.id !== cp.id);
  const target = Math.min(opp.time + 1, TIME_END);
  if (target <= cp.time) { sound.invalid(); return; }
  const gained = target - cp.time;
  cp.buttons += Math.max(0, gained);
  if (gained > 0) sound.coin(Math.min(gained, 3));
  moveTimeAndCollect(cp, target);
  sound.skip();
  state.lastMover = cp.id;
  if (maybeEndGame()) return;
  renderAll();
}

// ==== 終了 ====
function finalize() {
  const scores = state.players.map((p) => {
    const empty = state.quilts[p.id].flat().filter((x) => !x).length;
    const score = p.buttons - empty * EMPTY_PENALTY;
    return { id: p.id, score, buttons: p.buttons, empty };
  });
  const max = Math.max(...scores.map((s) => s.score));
  const winners = scores.filter((s) => s.score === max).map((s) => s.id);
  state.winner = winners;
  state.phase = 'over';
  state.scores = scores;
  renderAll();
  setTimeout(() => {
    sound.win();
    showResult();
    if (winners.length === 1) {
      const w = state.players.find((p) => p.id === winners[0]);
      launchConfetti(w.color);
    }
  }, 400);
}

// ==== レンダリング ====
const $ = (sel) => document.querySelector(sel);

function renderAll() {
  renderQuilt(1);
  renderQuilt(2);
  renderPanels();
  renderMarket();
  renderActivePatch();
  renderTimeTrack();
  renderHud();
}

function renderQuilt(playerId) {
  const wrap = document.getElementById(`quilt-${playerId}`);
  wrap.innerHTML = '';
  const quilt = state.quilts[playerId];
  if (!quilt) return;
  const cp = state.phase === 'playing' ? getCurrentPlayer() : null;
  const myTurn = cp && cp.id === playerId;
  const placeable = myTurn && state.selectedShape !== null;
  for (let r = 0; r < QUILT_SIZE; r++) {
    for (let c = 0; c < QUILT_SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'qcell';
      cell.dataset.c = String(c);
      cell.dataset.r = String(r);
      const v = quilt[r][c];
      if (v) {
        cell.classList.add('filled');
        cell.style.background = v.color;
        if (v.hasButton) {
          const dot = document.createElement('span');
          dot.className = 'qbutton';
          dot.textContent = '●';
          cell.appendChild(dot);
        }
      }
      if (placeable && !v) {
        cell.classList.add('targetable');
        cell.addEventListener('pointerenter', () => previewPlacement(playerId, c, r));
        cell.addEventListener('pointerleave', () => clearPreview(playerId));
        cell.addEventListener('click', () => tryPlacePatch(c, r));
      }
      wrap.appendChild(cell);
    }
  }
}

function previewPlacement(playerId, c0, r0) {
  const wrap = document.getElementById(`quilt-${playerId}`);
  const cp = state.phase === 'playing' ? getCurrentPlayer() : null;
  if (!cp || cp.id !== playerId || !state.selectedShape) return;
  const valid = canPlace(state.quilts[playerId], state.selectedShape, c0, r0);
  // clear previous preview
  wrap.querySelectorAll('.qcell.preview').forEach((el) => el.classList.remove('preview', 'preview-bad'));
  for (let r = 0; r < state.selectedShape.length; r++) {
    for (let c = 0; c < state.selectedShape[r].length; c++) {
      if (!state.selectedShape[r][c]) continue;
      const cc = c0 + c, rr = r0 + r;
      if (cc < 0 || cc >= QUILT_SIZE || rr < 0 || rr >= QUILT_SIZE) continue;
      const cell = wrap.querySelector(`.qcell[data-c="${cc}"][data-r="${rr}"]`);
      if (!cell) continue;
      cell.classList.add('preview');
      if (!valid) cell.classList.add('preview-bad');
    }
  }
}

function clearPreview(playerId) {
  const wrap = document.getElementById(`quilt-${playerId}`);
  wrap.querySelectorAll('.qcell.preview').forEach((el) => el.classList.remove('preview', 'preview-bad'));
}

function renderPanels() {
  const top = $('#panel-2');
  const bottom = $('#panel-1');
  for (const player of state.players) {
    const el = player.id === 2 ? top : bottom;
    const isCurrent = state.phase === 'playing' && getCurrentPlayer().id === player.id;
    el.classList.toggle('active', isCurrent);
    el.classList.toggle('winner', state.winner && state.winner.includes(player.id));
    el.style.setProperty('--c', player.color);
    const status = isFinished(player) ? '⏰ 完了' : (isCurrent ? 'あなたの番' : '相手の番…');
    el.innerHTML = `
      <div class="panel-name"><span class="panel-dot"></span>${player.name}</div>
      <div class="panel-status">${status}</div>
      <div class="panel-info">
        <div class="info-chip"><span>🪙</span><b>${player.buttons}</b></div>
        <div class="info-chip"><span>📈</span><b>+${state.incomes[player.id] || 0}</b></div>
        <div class="info-chip"><span>⏰</span><b>${player.time}/${TIME_END}</b></div>
      </div>
    `;
  }
}

function renderMarket() {
  const row = $('#market-row');
  row.innerHTML = '';
  const market = getMarketPatches();
  const cp = state.phase === 'playing' ? getCurrentPlayer() : null;
  const cpFinished = cp && isFinished(cp);
  for (let i = 0; i < market.length; i++) {
    const patch = market[i];
    const tile = renderPatchTile(patch);
    tile.classList.add('market-tile');
    if (state.selectedPatchId === patch.id) tile.classList.add('selected');
    if (!cp || cpFinished || cp.buttons < patch.cost) tile.classList.add('locked');
    if (cp && !cpFinished && cp.buttons >= patch.cost) {
      tile.addEventListener('click', () => selectMarketPatch(patch.id));
      tile.classList.add('buyable');
    }
    row.appendChild(tile);
  }
  // 残りの数
  const more = $('#market-more');
  more.textContent = `あと ${Math.max(0, state.patches.length - market.length)} 枚 ▶︎`;
}

function renderPatchTile(patch) {
  const wrap = document.createElement('div');
  wrap.className = 'patch-tile';
  // shape minigrid
  const grid = document.createElement('div');
  grid.className = 'patch-grid';
  const shape = patch.shape;
  grid.style.gridTemplateColumns = `repeat(${shape[0].length}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${shape.length}, 1fr)`;
  let buttonsLeft = patch.income;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      const cell = document.createElement('div');
      cell.className = 'patch-cell';
      if (!shape[r][c]) cell.classList.add('empty');
      else if (buttonsLeft > 0) {
        cell.classList.add('with-button');
        cell.textContent = '●';
        buttonsLeft--;
      }
      grid.appendChild(cell);
    }
  }
  wrap.appendChild(grid);
  // info
  const info = document.createElement('div');
  info.className = 'patch-info';
  info.innerHTML = `
    <span class="cost">🪙${patch.cost}</span>
    <span class="time">⏰${patch.time}</span>
  `;
  wrap.appendChild(info);
  return wrap;
}

function renderActivePatch() {
  const wrap = $('#active-patch');
  wrap.innerHTML = '';
  if (!state.selectedShape || !state.selectedPatchId) {
    wrap.classList.add('empty');
    wrap.innerHTML = `<div class="active-empty">パッチを選んで配置しよう</div>`;
    return;
  }
  wrap.classList.remove('empty');
  const patch = state.patches.find((p) => p.id === state.selectedPatchId);
  if (!patch) return;
  const cp = getCurrentPlayer();
  // current oriented shape
  const shape = state.selectedShape;
  const grid = document.createElement('div');
  grid.className = 'patch-grid big';
  grid.style.gridTemplateColumns = `repeat(${shape[0].length}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${shape.length}, 1fr)`;
  let buttonsLeft = patch.income;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      const cell = document.createElement('div');
      cell.className = 'patch-cell';
      if (!shape[r][c]) cell.classList.add('empty');
      else {
        cell.style.background = cp.color;
        if (buttonsLeft > 0) {
          cell.classList.add('with-button');
          cell.textContent = '●';
          buttonsLeft--;
        }
      }
      grid.appendChild(cell);
    }
  }
  const left = document.createElement('div');
  left.className = 'active-shape';
  left.appendChild(grid);
  const right = document.createElement('div');
  right.className = 'active-controls';
  right.innerHTML = `
    <div class="active-info">
      <div>🪙 <b>${patch.cost}</b></div>
      <div>⏰ <b>${patch.time}</b></div>
      ${patch.income > 0 ? `<div>📈 <b>+${patch.income}</b></div>` : ''}
    </div>
    <div class="active-actions">
      <button class="ctrl-btn" id="rotateBtn">↻ 回転</button>
      <button class="ctrl-btn" id="flipBtn">⇋ 反転</button>
      <button class="ctrl-btn cancel" id="cancelBtn">✕ やめる</button>
    </div>
    <div class="active-hint">${cp.name} の盤に配置！</div>
  `;
  wrap.appendChild(left);
  wrap.appendChild(right);
  $('#rotateBtn').addEventListener('click', rotateActive);
  $('#flipBtn').addEventListener('click', flipActive);
  $('#cancelBtn').addEventListener('click', cancelSelection);
}

function renderTimeTrack() {
  const wrap = $('#time-track');
  wrap.innerHTML = '';
  for (let i = 0; i <= TIME_END; i++) {
    const cell = document.createElement('div');
    cell.className = 'tcell';
    if (BUTTON_SPACES.includes(i)) {
      cell.classList.add('button-space');
      cell.textContent = '🪙';
    } else if (i === 0) {
      cell.textContent = 'スタート';
      cell.classList.add('start');
    } else if (i === TIME_END) {
      cell.textContent = '🏁';
      cell.classList.add('end');
    } else {
      cell.textContent = i;
    }
    // markers
    for (const player of state.players) {
      if (player.time === i) {
        const tok = document.createElement('span');
        tok.className = 'token';
        tok.style.background = player.color;
        tok.textContent = player.id;
        cell.appendChild(tok);
      }
    }
    wrap.appendChild(cell);
  }
}

function renderHud() {
  const phase = $('#phase');
  if (state.phase === 'playing') {
    const cp = getCurrentPlayer();
    if (state.selectedShape) {
      phase.textContent = `${cp.name}: ${cp.id === 1 ? '下' : '上'}の盤に配置`;
    } else {
      phase.textContent = `${cp.name}の番: パッチを買うか、進む`;
    }
  } else if (state.phase === 'over') {
    phase.textContent = 'ゲーム終了';
  } else {
    phase.textContent = '';
  }
  const passBtn = $('#passBtn');
  if (passBtn) {
    if (state.phase !== 'playing') {
      passBtn.style.display = 'none';
    } else {
      passBtn.style.display = '';
      const cp = getCurrentPlayer();
      const opp = state.players.find((p) => p.id !== cp.id);
      const gain = Math.max(0, Math.min(opp.time + 1, TIME_END) - cp.time);
      passBtn.textContent = `▶ ${gain}進む (+${gain}🪙)`;
      passBtn.disabled = isFinished(cp) || gain === 0;
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
  const dlg = $('#resultDialog');
  const list = $('#resultList');
  list.innerHTML = '';
  const sorted = state.scores.slice().sort((a, b) => b.score - a.score);
  for (const s of sorted) {
    const player = state.players.find((p) => p.id === s.id);
    const row = document.createElement('div');
    row.className = 'result-row';
    if (state.winner.includes(s.id)) row.classList.add('winner');
    row.innerHTML = `
      <span class="result-dot" style="background:${player.color}"></span>
      <span class="result-name">${player.name}</span>
      <span class="result-detail">🪙${s.buttons} − 空き${s.empty}×2</span>
      <span class="result-score">${s.score}</span>
    `;
    list.appendChild(row);
  }
  if (state.winner.length === 1) {
    const w = state.players.find((p) => p.id === state.winner[0]);
    $('#resultEmoji').textContent = '🏆';
    $('#resultTitle').textContent = `${w.name} の勝ち！`;
    $('#resultTitle').style.color = w.color;
    dlg.style.setProperty('--c', w.color);
    $('#resultSub').textContent = `${sorted[0].score}点でフィニッシュ`;
  } else {
    $('#resultEmoji').textContent = '🤝';
    $('#resultTitle').textContent = '引き分け！';
    $('#resultTitle').style.color = '#fde047';
    dlg.style.setProperty('--c', '#fde047');
    $('#resultSub').textContent = '同点でフィニッシュ';
  }
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

// ==== バインド ====
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
  $('#passBtn').addEventListener('click', () => passTurn());
  $('#rulesFromMenuBtn').addEventListener('click', () => showOverlay('rules'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') rotateActive();
    if (e.key === 'f' || e.key === 'F') flipActive();
    if (e.key === 'Escape') cancelSelection();
  });
  document.addEventListener('pointerdown', () => sound.tap(), { once: true });
}

function init() {
  bindEvents();
  showOverlay('menu');
  // メニュー裏面プレビュー: 空のキルトを表示
  state.players = PLAYER_PRESETS.map((p) => ({ ...p, buttons: STARTING_BUTTONS, time: 0 }));
  state.quilts = { 1: emptyQuilt(), 2: emptyQuilt() };
  state.incomes = { 1: 0, 2: 0 };
  state.patches = PATCH_LIBRARY.slice();
  renderQuilt(1); renderQuilt(2);
  renderPanels();
  renderMarket();
  renderActivePatch();
  renderTimeTrack();
  renderHud();
}

init();
