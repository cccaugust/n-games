// ===== OTRIO: 最大4人対戦 =====

const SIZES = ['s', 'm', 'l'];
const SIZE_LABEL = { s: '小', m: '中', l: '大' };
// 選べる色（順番ごとに好きな色を割り当てる）
const PALETTE = [
  { id: 'blue', color: '#38bdf8', name: '青', icon: '🐬' },
  { id: 'pink', color: '#f472b6', name: 'ピンク', icon: '🌸' },
  { id: 'green', color: '#34d399', name: '緑', icon: '🌿' },
  { id: 'yellow', color: '#facc15', name: '黄', icon: '⭐' },
  { id: 'orange', color: '#fb923c', name: 'オレンジ', icon: '🍊' },
  { id: 'purple', color: '#a78bfa', name: '紫', icon: '🍇' },
];
const DEFAULT_COLORS = ['blue', 'pink', 'green', 'yellow'];
const PLAYER_NAMES = {
  1: 'プレイヤー1',
  2: 'プレイヤー2',
  3: 'プレイヤー3',
  4: 'プレイヤー4',
};
const ORDER_LABEL = { 1: '1番目', 2: '2番目', 3: '3番目', 4: '4番目' };

function paletteOf(player) {
  const id = state.colors[player - 1];
  return PALETTE.find((c) => c.id === id) || PALETTE[player - 1];
}
function colorOf(player) {
  return paletteOf(player).color;
}
function iconOf(player) {
  return paletteOf(player).icon;
}
// CSS側（.ring.p1 など）が参照する --p1〜--p4 を現在の色に合わせる
function applyPlayerColors() {
  for (let p = 1; p <= 4; p++) {
    document.documentElement.style.setProperty(`--p${p}`, colorOf(p));
  }
}

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// ----- 状態 -----
const state = {
  numPlayers: 2,
  colors: [...DEFAULT_COLORS], // 順番(1番目〜)ごとの色ID
  current: 1,
  selectedSize: { 1: 's', 2: 's', 3: 's', 4: 's' },
  stock: {},
  board: Array.from({ length: 9 }, () => ({ s: null, m: null, l: null })),
  ended: false,
  winInfo: null, // { winner, cells, type, rings: [{ idx, size }] }
  hoverCell: -1,
  moves: [], // [{ player, idx, size }] ふりかえり用の手順
  tally: { games: 0, draws: 0, wins: {} }, // 通算成績（同じ人数で遊んでいる間だけ）
  replayStep: 0,
};

// ----- DOM参照 -----
const boardEl = document.getElementById('board');
const playersEl = document.getElementById('players');
const statusEl = document.getElementById('status');
const turnBadge = document.getElementById('turnBadge');
const turnLabel = document.getElementById('turnLabel');
const picksEl = document.getElementById('picks');
const setupEl = document.getElementById('setup');
const resultEl = document.getElementById('result');
const resultDialog = document.getElementById('resultDialog');
const resultEmoji = document.getElementById('resultEmoji');
const resultTitle = document.getElementById('resultTitle');
const resultSub = document.getElementById('resultSub');
const muteBtn = document.getElementById('muteBtn');
const statusBar = document.getElementById('statusBar');
const resultOpenBtn = document.getElementById('resultOpenBtn');
const miniBoardEl = document.getElementById('miniBoard');
const replaySlider = document.getElementById('replaySlider');
const replayCount = document.getElementById('replayCount');
const replayInfo = document.getElementById('replayInfo');
const statsEl = document.getElementById('stats');
const tallyEl = document.getElementById('tally');
const tallyGames = document.getElementById('tallyGames');

const fxCanvas = document.getElementById('fx');
const confettiCanvas = document.getElementById('confetti');
const fxCtx = fxCanvas.getContext('2d');
const confCtx = confettiCanvas.getContext('2d');

// ----- サウンド (Web Audio API) -----
let audioCtx = null;
let muted = false;
function ensureAudio() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    audioCtx = null;
  }
  return audioCtx;
}
function tone({ freq = 440, dur = 0.15, type = 'sine', vol = 0.18, attack = 0.005, release = 0.08, slide = 0 }) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, ctx.currentTime + dur);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur + release);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur + release + 0.02);
}
const SFX = {
  place(player) {
    const base = 480 + (player - 1) * 80;
    tone({ freq: base, dur: 0.08, type: 'sine', slide: 240, vol: 0.22 });
    setTimeout(() => tone({ freq: base + 220, dur: 0.06, type: 'triangle', vol: 0.12 }), 30);
  },
  select() {
    tone({ freq: 720, dur: 0.05, type: 'triangle', vol: 0.1 });
  },
  invalid() {
    tone({ freq: 180, dur: 0.18, type: 'sawtooth', vol: 0.12, slide: -60 });
  },
  turn() {
    tone({ freq: 540, dur: 0.05, type: 'sine', vol: 0.08 });
  },
  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      setTimeout(() => tone({ freq: f, dur: 0.15, type: 'triangle', vol: 0.18 }), i * 100);
    });
    setTimeout(() => tone({ freq: 1318.5, dur: 0.4, type: 'sine', vol: 0.18, release: 0.3 }), 420);
  },
  draw() {
    tone({ freq: 320, dur: 0.2, type: 'sine', vol: 0.12 });
    setTimeout(() => tone({ freq: 260, dur: 0.25, type: 'sine', vol: 0.12 }), 180);
  },
};

// ----- パーティクル -----
const particles = [];
function emitBurst(x, y, color, count = 22) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 1.2 + Math.random() * 2.6;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1.5 + Math.random() * 2.5,
      life: 1,
      decay: 0.018 + Math.random() * 0.02,
      color,
    });
  }
}
function emitRingPulse(x, y, color) {
  particles.push({
    x, y, vx: 0, vy: 0, r: 8, life: 1, decay: 0.04,
    color, ring: true,
  });
}

let fxRunning = false;
function fxTick() {
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    if (!p.ring) p.vy += 0.08;
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    fxCtx.globalAlpha = Math.max(0, p.life);
    fxCtx.fillStyle = p.color;
    fxCtx.strokeStyle = p.color;
    if (p.ring) {
      fxCtx.lineWidth = 3;
      const radius = (1 - p.life) * 80 + p.r;
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      fxCtx.stroke();
    } else {
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      fxCtx.fill();
    }
  }
  fxCtx.globalAlpha = 1;
  if (particles.length > 0) {
    requestAnimationFrame(fxTick);
  } else {
    fxRunning = false;
  }
}
function startFx() {
  if (!fxRunning) {
    fxRunning = true;
    requestAnimationFrame(fxTick);
  }
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = boardEl.getBoundingClientRect();
  fxCanvas.width = rect.width * dpr;
  fxCanvas.height = rect.height * dpr;
  fxCanvas.style.width = rect.width + 'px';
  fxCanvas.style.height = rect.height + 'px';
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  confettiCanvas.width = window.innerWidth * dpr;
  confettiCanvas.height = window.innerHeight * dpr;
  confettiCanvas.style.width = window.innerWidth + 'px';
  confettiCanvas.style.height = window.innerHeight + 'px';
  confCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ----- 紙吹雪 -----
const confetti = [];
function launchConfetti() {
  const colors = [];
  for (let p = 1; p <= state.numPlayers; p++) colors.push(colorOf(p));
  colors.push('#ffffff', '#fde047');
  for (let i = 0; i < 140; i++) {
    confetti.push({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      size: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.2,
      color: colors[(Math.random() * colors.length) | 0],
      life: 1,
    });
  }
  if (!confettiRunning) {
    confettiRunning = true;
    requestAnimationFrame(confettiTick);
  }
}
let confettiRunning = false;
function confettiTick() {
  confCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.06;
    c.rot += c.vr;
    if (c.y > window.innerHeight + 40) {
      confetti.splice(i, 1);
      continue;
    }
    confCtx.save();
    confCtx.translate(c.x, c.y);
    confCtx.rotate(c.rot);
    confCtx.fillStyle = c.color;
    confCtx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.4);
    confCtx.restore();
  }
  if (confetti.length > 0) {
    requestAnimationFrame(confettiTick);
  } else {
    confettiRunning = false;
  }
}

// ----- ゲームロジック -----
function makeStock() {
  const obj = {};
  for (let p = 1; p <= state.numPlayers; p++) {
    obj[p] = { s: 3, m: 3, l: 3 };
  }
  return obj;
}

function reset(keepCount = true) {
  if (!keepCount) state.numPlayers = 2;
  state.board = Array.from({ length: 9 }, () => ({ s: null, m: null, l: null }));
  state.current = 1;
  state.selectedSize = { 1: 's', 2: 's', 3: 's', 4: 's' };
  state.stock = makeStock();
  state.ended = false;
  state.winInfo = null;
  state.hoverCell = -1;
  state.moves = [];
  applyPlayerColors();
  statusBar.classList.remove('ended');
  resultEl.classList.add('hidden');
  buildPlayers();
  buildBoard();
  buildPicker();
  render();
}

function canPlace(player) {
  for (const s of SIZES) {
    if (state.stock[player][s] <= 0) continue;
    for (let i = 0; i < 9; i++) {
      if (state.board[i][s] === null) return true;
    }
  }
  return false;
}

function nextPlayer() {
  // 移動できないプレイヤーをスキップ
  let next = state.current;
  for (let i = 0; i < state.numPlayers; i++) {
    next = (next % state.numPlayers) + 1;
    if (canPlace(next)) {
      state.current = next;
      return true;
    }
  }
  return false; // 誰も置けない
}

function place(idx) {
  if (state.ended) return;
  const player = state.current;
  const size = state.selectedSize[player];
  const cell = state.board[idx];

  // 置けるサイズに自動切り替え
  let actualSize = size;
  if (state.stock[player][size] <= 0 || cell[size] !== null) {
    // 違法な手 → 置けるサイズを探す（在庫あり&そのマス空き）
    const fallback = SIZES.find((s) => state.stock[player][s] > 0 && cell[s] === null);
    if (!fallback) {
      SFX.invalid();
      shakeCell(idx);
      return;
    }
    actualSize = fallback;
    state.selectedSize[player] = fallback;
  }

  cell[actualSize] = player;
  state.stock[player][actualSize] -= 1;
  state.moves.push({ player, idx, size: actualSize });

  // エフェクト＆音
  SFX.place(player);
  const cellEl = boardEl.children[idx];
  const rect = cellEl.getBoundingClientRect();
  const boardRect = boardEl.getBoundingClientRect();
  const cx = rect.left - boardRect.left + rect.width / 2;
  const cy = rect.top - boardRect.top + rect.height / 2;
  emitBurst(cx, cy, colorOf(player), 18);
  emitRingPulse(cx, cy, colorOf(player));
  startFx();

  // 勝ち判定
  const win = checkWin(player);
  if (win) {
    state.winInfo = win;
    state.ended = true;
    render();
    setTimeout(() => endWithWinner(player), 350);
    return;
  }

  // 在庫切れチェック→次のプレイヤー
  const moved = nextPlayer();
  if (!moved) {
    state.ended = true;
    render();
    setTimeout(() => endWithDraw(), 250);
    return;
  }

  // 自動でそのプレイヤーが置けるサイズを再選択
  const cur = state.current;
  if (state.stock[cur][state.selectedSize[cur]] <= 0) {
    const next = SIZES.find((s) => state.stock[cur][s] > 0);
    if (next) state.selectedSize[cur] = next;
  }
  SFX.turn();
  render();
}

function checkWin(player) {
  // 同じサイズで3つ並ぶ
  for (const line of LINES) {
    for (const s of SIZES) {
      if (line.every((idx) => state.board[idx][s] === player)) {
        return { winner: player, cells: line, type: 'same-size', rings: line.map((idx) => ({ idx, size: s })) };
      }
    }
  }
  // 1マス内に小中大すべて
  for (let i = 0; i < 9; i++) {
    const c = state.board[i];
    if (c.s === player && c.m === player && c.l === player) {
      return { winner: player, cells: [i], type: 'nest', rings: SIZES.map((size) => ({ idx: i, size })) };
    }
  }
  // 直線上で 小→中→大 または 大→中→小
  const orders = [['s', 'm', 'l'], ['l', 'm', 's']];
  for (const line of LINES) {
    for (const order of orders) {
      if (line.every((idx, j) => state.board[idx][order[j]] === player)) {
        return { winner: player, cells: line, type: 'sequence', rings: line.map((idx, j) => ({ idx, size: order[j] })) };
      }
    }
  }
  return null;
}

function endWithWinner(player) {
  SFX.win();
  launchConfetti();
  state.tally.games += 1;
  state.tally.wins[player] = (state.tally.wins[player] || 0) + 1;
  showEnded({
    color: colorOf(player),
    emoji: '🎉',
    title: `${iconOf(player)} ${PLAYER_NAMES[player]}の勝ち！`,
    sub: winTypeMessage(state.winInfo?.type),
    status: `${iconOf(player)} ${PLAYER_NAMES[player]}の勝ち！`,
  });
}
function endWithDraw() {
  SFX.draw();
  state.tally.games += 1;
  state.tally.draws += 1;
  showEnded({
    color: '#94a3b8',
    emoji: '🤝',
    title: '引き分け',
    sub: 'だれも置けなくなったよ',
    status: '🤝 引き分け',
  });
}
function showEnded({ color, emoji, title, sub, status }) {
  resultDialog.style.setProperty('--c', color);
  resultOpenBtn.style.setProperty('--c', color);
  resultEmoji.textContent = emoji;
  resultTitle.textContent = title;
  resultSub.textContent = sub;
  statusEl.textContent = status;
  statusBar.classList.add('ended');
  buildResult();
  openResult();
}
function openResult() {
  resultEl.classList.remove('hidden');
  resultEl.scrollTop = 0;
}
function winTypeMessage(type) {
  if (type === 'same-size') return '同じサイズで3つそろえた！';
  if (type === 'nest') return '1マスに小中大ぜんぶ！';
  if (type === 'sequence') return 'サイズの階段で勝利！';
  return 'おめでとう！';
}

function shakeCell(idx) {
  const cellEl = boardEl.children[idx];
  cellEl.animate(
    [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
    { duration: 220 }
  );
}

// ----- 描画 -----
function buildBoard() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.type = 'button';
    cell.setAttribute('aria-label', `マス ${i + 1}`);
    cell.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      place(i);
    });
    cell.addEventListener('pointerenter', () => {
      state.hoverCell = i;
      updatePreview();
    });
    cell.addEventListener('pointerleave', () => {
      state.hoverCell = -1;
      updatePreview();
    });
    boardEl.appendChild(cell);
  }
  // 初期ゴーストリングを追加
  resizeCanvas();
}

function buildPlayers() {
  playersEl.innerHTML = '';
  for (let p = 1; p <= state.numPlayers; p++) {
    const chip = document.createElement('div');
    chip.className = 'pchip';
    chip.style.setProperty('--c', colorOf(p));
    chip.id = `pchip-${p}`;
    chip.innerHTML = `
      <div class="pchip-name">
        <span class="pchip-dot"></span>
        <span>${iconOf(p)} ${PLAYER_NAMES[p]}</span>
      </div>
      <div class="pchip-stock">
        <span class="stock-item"><span class="stock-ring s"></span><span data-stock="${p}-s">3</span></span>
        <span class="stock-item"><span class="stock-ring m"></span><span data-stock="${p}-m">3</span></span>
        <span class="stock-item"><span class="stock-ring l"></span><span data-stock="${p}-l">3</span></span>
      </div>
    `;
    playersEl.appendChild(chip);
  }
}

function buildPicker() {
  picksEl.innerHTML = '';
  SIZES.forEach((s) => {
    const btn = document.createElement('button');
    btn.className = 'pick';
    btn.type = 'button';
    btn.dataset.size = s;
    btn.innerHTML = `
      <div class="pick-vis"><span class="ring-vis ${s}"></span></div>
      <div class="pick-label">${SIZE_LABEL[s]}</div>
      <div class="pick-count" data-pickcount="${s}">×3</div>
    `;
    btn.addEventListener('click', () => {
      if (state.ended) return;
      if (state.stock[state.current][s] <= 0) {
        SFX.invalid();
        return;
      }
      state.selectedSize[state.current] = s;
      SFX.select();
      render();
    });
    picksEl.appendChild(btn);
  });
}

function updatePreview() {
  // 全セルのゴーストリングをクリア
  [...boardEl.children].forEach((cellEl) => {
    const ghosts = cellEl.querySelectorAll('.ghost-ring');
    ghosts.forEach((g) => g.remove());
    cellEl.classList.remove('preview');
  });
  if (state.ended) return;
  if (state.hoverCell < 0) return;
  const idx = state.hoverCell;
  const player = state.current;
  const cell = state.board[idx];
  let size = state.selectedSize[player];
  if (state.stock[player][size] <= 0 || cell[size] !== null) {
    size = SIZES.find((s) => state.stock[player][s] > 0 && cell[s] === null);
  }
  if (!size) return;
  const cellEl = boardEl.children[idx];
  const ghost = document.createElement('div');
  ghost.className = `ghost-ring size-${size} p${player}`;
  cellEl.appendChild(ghost);
  cellEl.classList.add('preview');
}

function render() {
  // 盤面の輪
  [...boardEl.children].forEach((cellEl, idx) => {
    // 既存リングを除去（ghostは preview で再生成されるため残す）
    cellEl.querySelectorAll('.ring').forEach((r) => r.remove());
    cellEl.classList.remove('win', 'locked');
    SIZES.forEach((s) => {
      const owner = state.board[idx][s];
      if (!owner) return;
      const ring = document.createElement('div');
      ring.className = `ring size-${s} p${owner}`;
      if (isWinRing(idx, s)) ring.classList.add('win');
      cellEl.appendChild(ring);
    });
    if (state.winInfo && state.winInfo.cells.includes(idx)) {
      cellEl.classList.add('win');
    }
    if (state.ended) cellEl.classList.add('locked');
  });

  // プレイヤーチップ
  for (let p = 1; p <= state.numPlayers; p++) {
    const chip = document.getElementById(`pchip-${p}`);
    if (!chip) continue;
    chip.classList.toggle('active', p === state.current && !state.ended);
    chip.classList.toggle('skipped', !canPlace(p) && !state.ended);
    SIZES.forEach((s) => {
      const el = chip.querySelector(`[data-stock="${p}-${s}"]`);
      if (el) el.textContent = state.stock[p][s];
    });
  }

  // ステータス
  if (!state.ended) {
    statusEl.textContent = `${iconOf(state.current)} ${PLAYER_NAMES[state.current]}の番`;
    turnLabel.textContent = `P${state.current}`;
    turnBadge.style.setProperty('--c', colorOf(state.current));
  }

  // ピッカー
  [...picksEl.children].forEach((btn) => {
    const s = btn.dataset.size;
    const p = state.current;
    const count = state.stock[p][s];
    btn.style.setProperty('--c', colorOf(p));
    btn.classList.toggle('active', state.selectedSize[p] === s && !state.ended);
    btn.disabled = state.ended || count <= 0;
    const cnt = btn.querySelector(`[data-pickcount="${s}"]`);
    if (cnt) cnt.textContent = `×${count}`;
    const ringVis = btn.querySelector('.ring-vis');
    if (ringVis) ringVis.style.borderColor = colorOf(p);
  });

  updatePreview();
}

function isWinRing(idx, size) {
  return !!state.winInfo?.rings.some((r) => r.idx === idx && r.size === size);
}

// ----- リザルト画面 -----
function buildResult() {
  // ふりかえり（ミニ盤面）
  miniBoardEl.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const c = document.createElement('div');
    c.className = 'mini-cell';
    miniBoardEl.appendChild(c);
  }
  replaySlider.max = String(state.moves.length);
  setReplayStep(state.moves.length);

  // 今回の記録
  statsEl.innerHTML = '';
  for (let p = 1; p <= state.numPlayers; p++) {
    const placed = state.moves.filter((m) => m.player === p).length;
    const left = SIZES.reduce((sum, s) => sum + state.stock[p][s], 0);
    const isWinner = state.winInfo?.winner === p;
    const row = document.createElement('div');
    row.className = 'stat-row' + (isWinner ? ' winner' : '');
    row.style.setProperty('--c', colorOf(p));
    row.innerHTML = `
      <span>${isWinner ? '👑' : iconOf(p)} ${PLAYER_NAMES[p]}</span>
      <span class="stat-num">置いた <b>${placed}</b></span>
      <span class="stat-num">のこり <b>${left}</b></span>
    `;
    statsEl.appendChild(row);
  }

  // 通算成績
  tallyGames.textContent = `${state.tally.games} 試合`;
  tallyEl.innerHTML = '';
  for (let p = 1; p <= state.numPlayers; p++) {
    const chip = document.createElement('span');
    chip.className = 'tally-chip';
    chip.style.setProperty('--c', colorOf(p));
    chip.innerHTML = `${iconOf(p)} P${p} <b>${state.tally.wins[p] || 0}</b>勝`;
    tallyEl.appendChild(chip);
  }
  if (state.tally.draws > 0) {
    const chip = document.createElement('span');
    chip.className = 'tally-chip';
    chip.style.setProperty('--c', '#94a3b8');
    chip.innerHTML = `🤝 引き分け <b>${state.tally.draws}</b>`;
    tallyEl.appendChild(chip);
  }
}

function setReplayStep(step) {
  const total = state.moves.length;
  step = Math.max(0, Math.min(total, step));
  state.replayStep = step;
  replaySlider.value = String(step);
  replayCount.textContent = `${step} / ${total} 手`;

  // step手目までの盤面を組み立て
  const board = Array.from({ length: 9 }, () => ({ s: null, m: null, l: null }));
  for (let i = 0; i < step; i++) {
    const m = state.moves[i];
    board[m.idx][m.size] = m.player;
  }
  const last = step > 0 ? state.moves[step - 1] : null;
  const isFinal = step === total && !!state.winInfo;
  miniBoardEl.classList.toggle('dim-others', isFinal);

  [...miniBoardEl.children].forEach((cellEl, idx) => {
    cellEl.innerHTML = '';
    cellEl.classList.toggle('win', isFinal && state.winInfo.cells.includes(idx));
    SIZES.forEach((s) => {
      const owner = board[idx][s];
      if (!owner) return;
      const ring = document.createElement('div');
      ring.className = `mring size-${s} p${owner}`;
      if (isFinal && isWinRing(idx, s)) ring.classList.add('win');
      else if (!isFinal && last && last.idx === idx && last.size === s) ring.classList.add('last');
      cellEl.appendChild(ring);
    });
  });

  if (step === 0) {
    replayInfo.textContent = 'スタート';
    replayInfo.style.color = '';
  } else if (isFinal) {
    replayInfo.textContent = `✨ ${winTypeMessage(state.winInfo.type)}`;
    replayInfo.style.color = colorOf(state.winInfo.winner);
  } else {
    replayInfo.textContent = `${iconOf(last.player)} ${PLAYER_NAMES[last.player]}が「${SIZE_LABEL[last.size]}」を置いた`;
    replayInfo.style.color = colorOf(last.player);
  }
  document.getElementById('replayPrev').disabled = step === 0;
  document.getElementById('replayNext').disabled = step === total;
}

// ----- セットアップUI -----
function setupCountUI() {
  const countGrid = document.getElementById('countGrid');
  const colorPicker = document.getElementById('colorPicker');

  // 順番ごとの色えらび
  function renderColorPicker() {
    colorPicker.innerHTML = '';
    for (let p = 1; p <= state.numPlayers; p++) {
      const row = document.createElement('div');
      row.className = 'color-row';
      row.style.setProperty('--c', colorOf(p));
      const label = document.createElement('div');
      label.className = 'color-row-label';
      label.innerHTML = `<span class="color-row-dot"></span><span><b>${ORDER_LABEL[p]}</b> ${iconOf(p)} ${paletteOf(p).name}</span>`;
      row.appendChild(label);

      const swatches = document.createElement('div');
      swatches.className = 'swatches';
      swatches.setAttribute('role', 'radiogroup');
      swatches.setAttribute('aria-label', `${ORDER_LABEL[p]}の色`);
      PALETTE.forEach((c) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'swatch';
        btn.style.setProperty('--c', c.color);
        const mine = state.colors[p - 1] === c.id;
        const usedBy = state.colors.findIndex((id, i) => id === c.id && i < state.numPlayers) + 1;
        btn.classList.toggle('selected', mine);
        btn.classList.toggle('taken', !mine && usedBy > 0);
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', String(mine));
        btn.setAttribute('aria-label', `${c.name}${!mine && usedBy > 0 ? `（${ORDER_LABEL[usedBy]}が使用中・タップで交換）` : ''}`);
        btn.title = !mine && usedBy > 0 ? `${ORDER_LABEL[usedBy]}と色を交換` : c.name;
        btn.innerHTML = `<span class="swatch-icon">${c.icon}</span>${!mine && usedBy > 0 ? `<span class="swatch-owner">${usedBy}</span>` : ''}`;
        btn.addEventListener('click', () => {
          if (mine) return;
          pickColor(p, c.id);
        });
        swatches.appendChild(btn);
      });
      row.appendChild(swatches);
      colorPicker.appendChild(row);
    }
  }

  // p番目の人に色を割り当てる。他の人が使っていたら入れ替え
  function pickColor(p, colorId) {
    const prev = state.colors[p - 1];
    const otherIdx = state.colors.findIndex((id) => id === colorId);
    if (otherIdx >= 0) state.colors[otherIdx] = prev;
    state.colors[p - 1] = colorId;
    SFX.select();
    renderColorPicker();
  }

  renderColorPicker();
  countGrid.querySelectorAll('.count-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      countGrid.querySelectorAll('.count-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.numPlayers = Number(btn.dataset.count);
      renderColorPicker();
      SFX.select();
    });
  });
  document.getElementById('startBtn').addEventListener('click', () => {
    ensureAudio();
    setupEl.classList.add('hidden');
    state.tally = { games: 0, draws: 0, wins: {} };
    SFX.turn();
    reset(true);
  });
}

// ----- イベント -----
document.getElementById('resetBtn').addEventListener('click', () => {
  resultEl.classList.add('hidden');
  reset(true);
  SFX.select();
});
document.getElementById('newBtn').addEventListener('click', () => {
  resultEl.classList.add('hidden');
  setupEl.classList.remove('hidden');
});
document.getElementById('resultMenuBtn').addEventListener('click', () => {
  resultEl.classList.add('hidden');
  setupEl.classList.remove('hidden');
});
document.getElementById('resultAgainBtn').addEventListener('click', () => {
  resultEl.classList.add('hidden');
  reset(true);
});
document.getElementById('resultBoardBtn').addEventListener('click', () => {
  resultEl.classList.add('hidden');
});
resultOpenBtn.addEventListener('click', () => {
  SFX.select();
  openResult();
});
replaySlider.addEventListener('input', () => setReplayStep(Number(replaySlider.value)));
document.getElementById('replayPrev').addEventListener('click', () => setReplayStep(state.replayStep - 1));
document.getElementById('replayNext').addEventListener('click', () => setReplayStep(state.replayStep + 1));
muteBtn.addEventListener('click', () => {
  muted = !muted;
  muteBtn.textContent = muted ? '🔇' : '🔊';
  if (!muted) {
    ensureAudio();
    SFX.select();
  }
});

window.addEventListener('resize', resizeCanvas);
const ro = new ResizeObserver(() => resizeCanvas());
ro.observe(boardEl);

// ----- 起動 -----
applyPlayerColors();
setupCountUI();
state.stock = makeStock();
buildPlayers();
buildBoard();
buildPicker();
render();
requestAnimationFrame(resizeCanvas);
