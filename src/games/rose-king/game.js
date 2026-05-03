// ローゼンケーニッヒ (Rose King) 簡略MVP - 2人専用 1画面対面プレイ
// 9x9 盤、王の駒を動かしながら自分のバラタイルを置いて陣地を作る

// ==== 定数 ====
const SIZE = 9;
const TOTAL_TURNS = 30; // 各15ターンずつ
const MAX_DIST = 3;
// 8方向
const DIRS = [
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1]
];

const PLAYER_PRESETS = [
  { id: 1, name: '紅バラ', short: 'P1', color: '#dc2626', accent: '#fecaca', icon: '🌹' },
  { id: 2, name: '蒼バラ', short: 'P2', color: '#2563eb', accent: '#bfdbfe', icon: '🌷' }
];

// ==== 状態 ====
const state = {
  phase: 'menu', // 'menu' | 'playing' | 'over'
  board: [],     // 9x9 of null | playerId
  king: { c: 4, r: 4 },
  players: [],
  currentPlayer: 1,
  turnsLeft: TOTAL_TURNS,
  captures: { 1: 0, 2: 0 },
  reachable: [], // [{c,r,captures}]
  winner: null,
  scores: null,
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
    move: () => tone({ freq: 540, type: 'sine', dur: 0.1, vol: 0.12, slideTo: 720 }),
    place: () => {
      tone({ freq: 320, type: 'triangle', dur: 0.08, vol: 0.13 });
      setTimeout(() => tone({ freq: 480, type: 'sine', dur: 0.1, vol: 0.1 }), 50);
    },
    capture: () => {
      tone({ freq: 220, type: 'square', dur: 0.06, vol: 0.1 });
      setTimeout(() => tone({ freq: 660, type: 'triangle', dur: 0.18, vol: 0.16, slideTo: 1320 }), 80);
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

// ==== ロジック ====
function inBounds(c, r) { return c >= 0 && c < SIZE && r >= 0 && r < SIZE; }
function emptyBoard() { return Array.from({ length: SIZE }, () => Array(SIZE).fill(null)); }

function getReachable(playerId) {
  const out = [];
  const k = state.king;
  for (const [dc, dr] of DIRS) {
    for (let dist = 1; dist <= MAX_DIST; dist++) {
      const nc = k.c + dc * dist, nr = k.r + dr * dist;
      if (!inBounds(nc, nr)) break;
      const occ = state.board[nr][nc];
      // 自分のタイル → 通過も着地もできない
      if (occ === playerId) break;
      // 相手タイル or 空きマス → 着地可能だがそれ以上は進めない
      out.push({ c: nc, r: nr, capture: occ !== null && occ !== playerId });
      if (occ !== null) break;
    }
  }
  return out;
}

function canMove(playerId) {
  return getReachable(playerId).length > 0;
}

// 連結成分の最大サイズ (orthogonal+diagonal=8方向で隣接判定)
function largestCluster(playerId) {
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  let best = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.board[r][c] !== playerId || visited[r][c]) continue;
      // BFS
      let size = 0;
      const queue = [[c, r]];
      visited[r][c] = true;
      while (queue.length) {
        const [cc, rr] = queue.shift();
        size++;
        for (const [dc, dr] of DIRS) {
          const nc = cc + dc, nr = rr + dr;
          if (!inBounds(nc, nr)) continue;
          if (visited[nr][nc]) continue;
          if (state.board[nr][nc] !== playerId) continue;
          visited[nr][nc] = true;
          queue.push([nc, nr]);
        }
      }
      if (size > best) best = size;
    }
  }
  return best;
}

// ==== ゲーム制御 ====
function startGame() {
  state.players = PLAYER_PRESETS.slice();
  state.board = emptyBoard();
  state.king = { c: 4, r: 4 };
  state.currentPlayer = 1;
  state.turnsLeft = TOTAL_TURNS;
  state.captures = { 1: 0, 2: 0 };
  state.winner = null;
  state.scores = null;
  state.phase = 'playing';
  state.reachable = getReachable(state.currentPlayer);
  hideOverlay('menu');
  hideOverlay('result');
  renderAll();
}

function moveKingAndPlace(c, r) {
  if (state.phase !== 'playing') return;
  const cell = state.reachable.find((t) => t.c === c && t.r === r);
  if (!cell) { sound.invalid(); return; }
  const cp = state.currentPlayer;
  // capture
  const wasCapture = cell.capture;
  if (wasCapture) {
    state.captures[cp] += 1;
    sound.capture();
  } else {
    sound.place();
  }
  // place
  state.board[r][c] = cp;
  // animate king move (visual only)
  const fromKing = { ...state.king };
  state.king = { c, r };
  sound.move();
  state.turnsLeft -= 1;
  // turn switch
  state.currentPlayer = cp === 1 ? 2 : 1;
  state.reachable = getReachable(state.currentPlayer);
  // skip if can't move (rare)
  if (state.reachable.length === 0 && state.turnsLeft > 0) {
    // pass back
    state.currentPlayer = cp;
    state.reachable = getReachable(cp);
    if (state.reachable.length === 0) {
      // both stuck → end
      finalize(true);
      return;
    }
  }
  if (state.turnsLeft <= 0) {
    finalize(false);
    return;
  }
  renderAll(fromKing);
}

function finalize(stuck = false) {
  state.phase = 'over';
  state.reachable = [];
  const cluster1 = largestCluster(1);
  const cluster2 = largestCluster(2);
  const stones1 = state.board.flat().filter((x) => x === 1).length;
  const stones2 = state.board.flat().filter((x) => x === 2).length;
  state.scores = [
    { id: 1, cluster: cluster1, stones: stones1, captures: state.captures[1] },
    { id: 2, cluster: cluster2, stones: stones2, captures: state.captures[2] }
  ];
  // tiebreak: cluster, then stones, then captures
  let winners = [];
  const s1 = state.scores[0], s2 = state.scores[1];
  if (s1.cluster !== s2.cluster) winners = [s1.cluster > s2.cluster ? 1 : 2];
  else if (s1.stones !== s2.stones) winners = [s1.stones > s2.stones ? 1 : 2];
  else if (s1.captures !== s2.captures) winners = [s1.captures > s2.captures ? 1 : 2];
  else winners = [1, 2];
  state.winner = winners;
  state.endReason = stuck ? '両者動けなくなったので終了' : '30ターン終了';
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

function renderAll(fromKing = null) {
  renderBoard(fromKing);
  renderPanels();
  renderHud();
}

function renderBoard(fromKing = null) {
  const svg = $('#board');
  svg.innerHTML = '';
  const cell = 48;
  const pad = 6;
  const total = SIZE * cell + pad * 2;
  svg.setAttribute('viewBox', `0 0 ${total} ${total}`);

  // 背景: 大理石/木目調
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', 0); bg.setAttribute('y', 0);
  bg.setAttribute('width', total); bg.setAttribute('height', total);
  bg.setAttribute('rx', 12);
  bg.setAttribute('fill', 'url(#boardGrad)');
  svg.appendChild(bg);

  // gradient defs
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="boardGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="100%" stop-color="#fcd34d"/>
    </linearGradient>
    <radialGradient id="reachableGrad">
      <stop offset="0%" stop-color="rgba(253,224,71,0.6)"/>
      <stop offset="100%" stop-color="rgba(253,224,71,0)"/>
    </radialGradient>
  `;
  svg.appendChild(defs);

  // セル
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const x = pad + c * cell;
      const y = pad + r * cell;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x + 1); rect.setAttribute('y', y + 1);
      rect.setAttribute('width', cell - 2); rect.setAttribute('height', cell - 2);
      rect.setAttribute('rx', 6);
      const isCenter = c === 4 && r === 4;
      const isDark = (c + r) % 2 === 1;
      rect.setAttribute('fill', isCenter ? 'rgba(253,224,71,0.45)' : (isDark ? 'rgba(101,67,33,0.08)' : 'rgba(255,255,255,0.25)'));
      rect.setAttribute('stroke', 'rgba(101,67,33,0.18)');
      rect.setAttribute('stroke-width', '1');
      rect.dataset.c = String(c); rect.dataset.r = String(r);
      const reach = state.reachable.find((t) => t.c === c && t.r === r);
      if (reach) {
        rect.setAttribute('class', 'cell-reachable' + (reach.capture ? ' cell-capture' : ''));
        rect.style.cursor = 'pointer';
        rect.addEventListener('click', () => moveKingAndPlace(c, r));
      }
      svg.appendChild(rect);
    }
  }

  // 到達可能マスのグロー
  for (const t of state.reachable) {
    const x = pad + t.c * cell + cell / 2;
    const y = pad + t.r * cell + cell / 2;
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glow.setAttribute('cx', x); glow.setAttribute('cy', y);
    glow.setAttribute('r', cell * 0.42);
    glow.setAttribute('fill', t.capture ? 'rgba(239,68,68,0.35)' : 'url(#reachableGrad)');
    glow.setAttribute('class', 'reach-glow');
    glow.setAttribute('pointer-events', 'none');
    svg.appendChild(glow);
  }

  // タイル
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const owner = state.board[r][c];
      if (!owner) continue;
      const player = state.players.find((p) => p.id === owner);
      const x = pad + c * cell + cell / 2;
      const y = pad + r * cell + cell / 2;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${x}, ${y})`);
      g.setAttribute('class', 'stone');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', cell * 0.4);
      circle.setAttribute('fill', player.color);
      circle.setAttribute('class', 'stone-bg');
      g.appendChild(circle);
      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      inner.setAttribute('r', cell * 0.32);
      inner.setAttribute('fill', player.accent);
      inner.setAttribute('class', 'stone-inner');
      g.appendChild(inner);
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('dominant-baseline', 'central');
      icon.setAttribute('y', 2);
      icon.setAttribute('class', 'stone-icon');
      icon.textContent = player.icon;
      g.appendChild(icon);
      svg.appendChild(g);
    }
  }

  // 王
  const k = state.king;
  const kx = pad + k.c * cell + cell / 2;
  const ky = pad + k.r * cell + cell / 2;
  const kg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  if (fromKing && (fromKing.c !== k.c || fromKing.r !== k.r)) {
    const fx = pad + fromKing.c * cell + cell / 2;
    const fy = pad + fromKing.r * cell + cell / 2;
    kg.setAttribute('transform', `translate(${fx}, ${fy})`);
    const start = performance.now();
    const dur = 380;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      const cx = fx + (kx - fx) * ease;
      const cy = fy + (ky - fy) * ease;
      kg.setAttribute('transform', `translate(${cx}, ${cy})`);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  } else {
    kg.setAttribute('transform', `translate(${kx}, ${ky})`);
  }
  kg.setAttribute('class', 'king');
  const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  halo.setAttribute('r', cell * 0.46);
  halo.setAttribute('fill', '#fde047');
  halo.setAttribute('class', 'king-halo');
  kg.appendChild(halo);
  const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  inner.setAttribute('r', cell * 0.36);
  inner.setAttribute('fill', '#fff7c2');
  kg.appendChild(inner);
  const crown = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  crown.setAttribute('text-anchor', 'middle');
  crown.setAttribute('dominant-baseline', 'central');
  crown.setAttribute('y', 2);
  crown.setAttribute('class', 'king-icon');
  crown.textContent = '👑';
  kg.appendChild(crown);
  svg.appendChild(kg);
}

function renderPanels() {
  const top = $('#panel-2');
  const bottom = $('#panel-1');
  for (const player of state.players) {
    const el = player.id === 2 ? top : bottom;
    const isCurrent = state.phase === 'playing' && state.currentPlayer === player.id;
    el.classList.toggle('active', isCurrent);
    el.classList.toggle('winner', state.winner && state.winner.includes(player.id));
    el.style.setProperty('--c', player.color);
    const stones = state.board.flat().filter((x) => x === player.id).length;
    const cluster = state.scores ? state.scores.find((s) => s.id === player.id).cluster : largestCluster(player.id);
    const status = state.phase === 'over'
      ? (state.winner && state.winner.includes(player.id) ? '🏆 勝利' : '惜しい！')
      : (isCurrent ? '行き先をタップ' : '相手の番…');
    el.innerHTML = `
      <div class="panel-name"><span class="panel-icon">${player.icon}</span>${player.name}</div>
      <div class="panel-status">${status}</div>
      <div class="panel-info">
        <div class="info-chip"><span>🌹</span><b>${stones}</b></div>
        <div class="info-chip"><span>🔗</span><b>${cluster}</b></div>
        <div class="info-chip"><span>⚔️</span><b>${state.captures[player.id]}</b></div>
      </div>
    `;
  }
}

function renderHud() {
  const phase = $('#phase');
  if (state.phase === 'playing') {
    const cp = state.players.find((p) => p.id === state.currentPlayer);
    phase.textContent = `${cp.name} の番（残り${state.turnsLeft}ターン）`;
  } else if (state.phase === 'over') {
    phase.textContent = state.endReason || 'ゲーム終了';
  } else {
    phase.textContent = '';
  }
}

// ==== 結果 ====
function showResult() {
  const dlg = $('#resultDialog');
  const list = $('#resultList');
  list.innerHTML = '';
  const sorted = state.scores.slice().sort((a, b) => b.cluster - a.cluster || b.stones - a.stones || b.captures - a.captures);
  for (const s of sorted) {
    const player = state.players.find((p) => p.id === s.id);
    const row = document.createElement('div');
    row.className = 'result-row';
    if (state.winner.includes(s.id)) row.classList.add('winner');
    row.innerHTML = `
      <span class="result-icon" style="color:${player.color}">${player.icon}</span>
      <span class="result-name">${player.name}</span>
      <span class="result-detail">🌹${s.stones} ⚔️${s.captures}</span>
      <span class="result-score">${s.cluster}</span>
    `;
    list.appendChild(row);
  }
  if (state.winner.length === 1) {
    const w = state.players.find((p) => p.id === state.winner[0]);
    $('#resultEmoji').textContent = w.icon;
    $('#resultTitle').textContent = `${w.name} の勝ち！`;
    $('#resultTitle').style.color = w.color;
    dlg.style.setProperty('--c', w.color);
    $('#resultSub').textContent = `最大連結 ${sorted[0].cluster} 個`;
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
  $('#rulesFromMenuBtn').addEventListener('click', () => showOverlay('rules'));
  document.addEventListener('pointerdown', () => sound.tap(), { once: true });
}

function init() {
  bindEvents();
  showOverlay('menu');
  // メニュー裏面プレビュー
  state.players = PLAYER_PRESETS.slice();
  state.board = emptyBoard();
  state.king = { c: 4, r: 4 };
  state.captures = { 1: 0, 2: 0 };
  state.reachable = [];
  renderBoard();
  renderPanels();
  renderHud();
}

init();
