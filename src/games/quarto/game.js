// クアルト！ - 2人専用 1画面対戦
// コマは4ビットで属性表現:
//   bit0: 1=高い / 0=低い
//   bit1: 1=暗い / 0=明るい
//   bit2: 1=四角 / 0=丸
//   bit3: 1=穴あり / 0=詰まり

const ALL_PIECES = Array.from({ length: 16 }, (_, i) => i);

const LINES = [
  // 行
  [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
  // 列
  [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
  // 対角
  [0, 5, 10, 15], [3, 6, 9, 12]
];

const LINE_DIRS = ['row', 'row', 'row', 'row', 'col', 'col', 'col', 'col', 'diag', 'antidiag'];

const ATTR_LABELS = {
  1: '高さがそろった！',
  2: '色がそろった！',
  4: '形がそろった！',
  8: '穴の有無がそろった！'
};

// ==== 状態 ====
const state = {
  board: Array(16).fill(null),
  available: new Set(ALL_PIECES),
  selectedPiece: null,
  phase: 'select', // 'select' | 'place' | 'over'
  currentPlayer: 1, // 1 or 2
  winner: null, // 1 | 2 | 'draw' | null
  winningLine: null,
  winningAttr: 0,
  hoverCell: null,
  muted: false,
  scores: { 1: 0, 2: 0 }
};

// ==== サウンド (WebAudio) ====
const sound = (() => {
  let ctx = null;
  function ensure() {
    if (state.muted) return null;
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone({ freq = 440, type = 'sine', dur = 0.12, vol = 0.16, attack = 0.005, decay = 0.04, slideTo = null }) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  return {
    select: () => tone({ freq: 720, type: 'triangle', dur: 0.08, vol: 0.12 }),
    handoff: () => {
      tone({ freq: 360, type: 'sine', dur: 0.18, vol: 0.14, slideTo: 720 });
    },
    place: () => {
      tone({ freq: 220, type: 'square', dur: 0.05, vol: 0.05 });
      tone({ freq: 140, type: 'triangle', dur: 0.18, vol: 0.18 });
    },
    invalid: () => tone({ freq: 180, type: 'sawtooth', dur: 0.15, vol: 0.1 }),
    tap: () => tone({ freq: 540, type: 'sine', dur: 0.05, vol: 0.08 }),
    win: () => {
      const c = ensure();
      if (!c) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        setTimeout(() => tone({ freq: f, type: 'triangle', dur: 0.28, vol: 0.16 }), i * 90);
      });
    },
    draw: () => {
      tone({ freq: 440, type: 'sine', dur: 0.2, vol: 0.12 });
      setTimeout(() => tone({ freq: 330, type: 'sine', dur: 0.3, vol: 0.12 }), 120);
    }
  };
})();

// ==== ロジック ====
function pieceAttrs(p) {
  return {
    tall: !!(p & 1),
    dark: !!(p & 2),
    square: !!(p & 4),
    hollow: !!(p & 8)
  };
}

function checkWin(board) {
  for (let i = 0; i < LINES.length; i++) {
    const line = LINES[i];
    const pieces = line.map((idx) => board[idx]);
    if (pieces.some((p) => p === null)) continue;
    let andBits = 0xf;
    let orBits = 0;
    for (const p of pieces) {
      andBits &= p;
      orBits |= p;
    }
    // shared attribute = 1 if all 1 (andBits) OR all 0 (~orBits)
    const shared = (~orBits & 0xf) | andBits;
    if (shared !== 0) {
      // pick lowest set bit for label
      const attr = shared & -shared;
      return { line, dir: LINE_DIRS[i], attr };
    }
  }
  return null;
}

// ==== レンダリング ====
const $ = (sel) => document.querySelector(sel);

function buildPieceVisual(p, opts = {}) {
  const a = pieceAttrs(p);
  const wrap = document.createElement('div');
  wrap.className = 'piece-vis';
  if (opts.size) wrap.style.setProperty('--vis-size', opts.size);
  const piece = document.createElement('div');
  piece.className = 'piece';
  piece.classList.add(a.tall ? 'tall' : 'short');
  piece.classList.add(a.dark ? 'dark' : 'light');
  piece.classList.add(a.square ? 'square' : 'round');
  piece.classList.add(a.hollow ? 'hollow' : 'solid');
  wrap.appendChild(piece);
  return wrap;
}

function renderBoard() {
  const board = $('#board');
  board.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.dataset.index = String(i);
    cell.setAttribute('aria-label', `マス${i + 1}`);
    const slot = state.board[i];
    if (slot !== null) {
      cell.classList.add('filled');
      cell.appendChild(buildPieceVisual(slot));
      cell.disabled = true;
    } else if (state.phase === 'place' && state.selectedPiece !== null) {
      // hover preview
      const preview = buildPieceVisual(state.selectedPiece);
      preview.classList.add('preview');
      cell.appendChild(preview);
      cell.classList.add('placeable');
    } else {
      cell.disabled = true;
    }
    if (state.winningLine && state.winningLine.includes(i)) {
      cell.classList.add('winning');
    }
    cell.addEventListener('click', () => onCellClick(i));
    board.appendChild(cell);
  }
}

function renderStock() {
  const stock = $('#stock');
  stock.innerHTML = '';
  for (let p = 0; p < 16; p++) {
    const used = !state.available.has(p);
    const isSelected = state.selectedPiece === p;
    const item = document.createElement('button');
    item.className = 'stock-item';
    if (used) item.classList.add('used');
    if (isSelected) item.classList.add('selected');
    item.dataset.piece = String(p);
    item.setAttribute('aria-label', describePiece(p));
    item.appendChild(buildPieceVisual(p));
    if (state.phase === 'select' && !used && state.winner === null) {
      item.classList.add('selectable');
      item.addEventListener('click', () => onStockClick(p));
    } else {
      item.disabled = true;
    }
    stock.appendChild(item);
  }
}

function describePiece(p) {
  const a = pieceAttrs(p);
  return `${a.dark ? '濃い' : '明るい'}・${a.tall ? '高い' : '低い'}・${a.square ? '四角' : '丸'}・${a.hollow ? '穴あり' : '詰まり'}`;
}

function renderPanels() {
  for (const player of [1, 2]) {
    const panel = $(`#panel-${player}`);
    panel.classList.toggle('active', state.currentPlayer === player && state.winner === null);
    panel.classList.toggle('winner', state.winner === player);
    const score = $(`#score-${player}`);
    if (score) score.textContent = String(state.scores[player]);
    const role = $(`#role-${player}`);
    if (role) {
      if (state.winner !== null) {
        role.textContent = state.winner === player ? '🏆 かち' : state.winner === 'draw' ? '🤝 ひきわけ' : '';
      } else if (state.currentPlayer === player) {
        role.textContent = state.phase === 'select' ? '相手にコマをわたそう' : 'コマを盤に置こう';
      } else {
        role.textContent = '相手の番…';
      }
    }
  }
}

function renderHandoff() {
  const slot = $('#handoff');
  slot.innerHTML = '';
  if (state.phase === 'place' && state.selectedPiece !== null && state.winner === null) {
    const card = document.createElement('div');
    card.className = 'handoff-card';
    const label = document.createElement('div');
    label.className = 'handoff-label';
    label.textContent = `P${state.currentPlayer} このコマを置いて`;
    const vis = buildPieceVisual(state.selectedPiece, { size: '72px' });
    vis.classList.add('handoff-vis');
    card.appendChild(label);
    card.appendChild(vis);
    slot.appendChild(card);
    slot.classList.add('show');
  } else if (state.phase === 'select' && state.winner === null) {
    const card = document.createElement('div');
    card.className = 'handoff-card empty';
    const label = document.createElement('div');
    label.className = 'handoff-label';
    label.textContent = `P${state.currentPlayer} 相手にわたすコマをタップ`;
    card.appendChild(label);
    slot.appendChild(card);
    slot.classList.add('show');
  } else {
    slot.classList.remove('show');
  }
}

function renderAll() {
  renderBoard();
  renderStock();
  renderPanels();
  renderHandoff();
}

// ==== 操作 ====
function onStockClick(p) {
  if (state.phase !== 'select' || state.winner !== null) return;
  if (!state.available.has(p)) return;
  state.selectedPiece = p;
  state.available.delete(p);
  // hand off to opponent
  state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
  state.phase = 'place';
  sound.handoff();
  renderAll();
  flashHandoff();
}

function onCellClick(i) {
  if (state.phase !== 'place' || state.winner !== null) return;
  if (state.board[i] !== null) {
    sound.invalid();
    return;
  }
  const placed = state.selectedPiece;
  state.board[i] = placed;
  state.selectedPiece = null;
  sound.place();
  // win check
  const result = checkWin(state.board);
  if (result) {
    state.winner = state.currentPlayer;
    state.winningLine = result.line;
    state.winningAttr = result.attr;
    state.scores[state.currentPlayer] += 1;
    state.phase = 'over';
    renderAll();
    setTimeout(() => {
      sound.win();
      showResult({ winner: state.currentPlayer, attr: result.attr });
      launchConfetti();
    }, 300);
    return;
  }
  // draw check
  if (state.available.size === 0) {
    state.winner = 'draw';
    state.phase = 'over';
    renderAll();
    setTimeout(() => {
      sound.draw();
      showResult({ winner: 'draw' });
    }, 300);
    return;
  }
  // next: same player selects piece for opponent
  state.phase = 'select';
  // currentPlayer stays, then will swap on next select
  renderAll();
}

function flashHandoff() {
  const slot = $('#handoff');
  slot.classList.remove('flash');
  void slot.offsetWidth;
  slot.classList.add('flash');
}

// ==== リセット ====
function newGame(keepScores = true) {
  state.board = Array(16).fill(null);
  state.available = new Set(ALL_PIECES);
  state.selectedPiece = null;
  state.phase = 'select';
  state.currentPlayer = state.winner === 'draw' || state.winner === null ? 1 : (state.winner === 1 ? 2 : 1);
  state.winner = null;
  state.winningLine = null;
  state.winningAttr = 0;
  if (!keepScores) state.scores = { 1: 0, 2: 0 };
  hideResult();
  renderAll();
}

// ==== 結果モーダル ====
function showResult({ winner, attr }) {
  const overlay = $('#result');
  overlay.classList.remove('hidden');
  const title = $('#resultTitle');
  const sub = $('#resultSub');
  const emoji = $('#resultEmoji');
  if (winner === 'draw') {
    title.textContent = '引き分け！';
    sub.textContent = 'もう一度勝負しよう';
    emoji.textContent = '🤝';
    overlay.style.setProperty('--c', '#94a3b8');
  } else {
    const playerColor = winner === 1 ? 'var(--p1)' : 'var(--p2)';
    title.textContent = `プレイヤー${winner} の勝ち！`;
    sub.textContent = ATTR_LABELS[attr] || 'クアルト！';
    emoji.textContent = winner === 1 ? '🟦' : '🟪';
    overlay.style.setProperty('--c', playerColor);
  }
}

function hideResult() {
  $('#result').classList.add('hidden');
}

// ==== 紙吹雪 ====
function launchConfetti() {
  const canvas = $('#confetti');
  const ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  const colors = ['#7dd3fc', '#f0abfc', '#fde68a', '#86efac', '#fca5a5', '#a5b4fc'];
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
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (elapsed < 4500) {
      requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  requestAnimationFrame(tick);
}

// ==== ルール / メニュー ====
function openRules() {
  $('#rules').classList.remove('hidden');
}
function closeRules() {
  $('#rules').classList.add('hidden');
}

function toggleMute() {
  state.muted = !state.muted;
  const btn = $('#muteBtn');
  btn.textContent = state.muted ? '🔇' : '🔊';
  btn.setAttribute('aria-pressed', String(state.muted));
}

// ==== セットアップ ====
function bindEvents() {
  $('#newBtn').addEventListener('click', () => {
    sound.tap();
    newGame(true);
  });
  $('#resetBtn').addEventListener('click', () => {
    sound.tap();
    newGame(false);
  });
  $('#muteBtn').addEventListener('click', () => {
    toggleMute();
  });
  $('#rulesBtn').addEventListener('click', () => {
    sound.tap();
    openRules();
  });
  $('#rulesClose').addEventListener('click', () => {
    sound.tap();
    closeRules();
  });
  $('#rules').addEventListener('click', (e) => {
    if (e.target.id === 'rules') closeRules();
  });
  $('#resultAgainBtn').addEventListener('click', () => {
    sound.tap();
    newGame(true);
  });
  $('#resultRulesBtn').addEventListener('click', () => {
    sound.tap();
    hideResult();
    openRules();
  });
  // resize handler for confetti canvas
  window.addEventListener('resize', () => {
    const canvas = $('#confetti');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
  // first interaction unlocks audio
  document.addEventListener('pointerdown', () => sound.tap(), { once: true });
}

function init() {
  bindEvents();
  renderAll();
}

init();
