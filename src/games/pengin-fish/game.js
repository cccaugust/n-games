// それはオレの魚だ！ - 2〜4人対戦 (1画面対面プレイ)
// ヘックス盤面、ペンギンで陣取り、魚を集める

// ==== 定数 ====
const HEX_R = 38; // 半径(SVG内)
const HEX_W = HEX_R * Math.sqrt(3);
const HEX_H = HEX_R * 2;
const ROW_STEP = HEX_R * 1.5;

// 6方向（pointy-top axial）
const DIRS = [
  [+1, 0], [+1, -1], [0, -1],
  [-1, 0], [-1, +1], [0, +1]
];

const PLAYER_PRESETS = [
  { id: 1, name: 'プレイヤー1', color: '#fb923c', accent: '#fed7aa' },
  { id: 2, name: 'プレイヤー2', color: '#60a5fa', accent: '#bfdbfe' },
  { id: 3, name: 'プレイヤー3', color: '#34d399', accent: '#a7f3d0' },
  { id: 4, name: 'プレイヤー4', color: '#f472b6', accent: '#fbcfe8' }
];

const PENGUINS_BY_COUNT = { 2: 4, 3: 3, 4: 2 };

// ==== 状態 ====
const state = {
  phase: 'menu', // 'menu' | 'placing' | 'playing' | 'over'
  numPlayers: 2,
  players: [], // [{id, name, color, accent, score, penguinIds, stuck}]
  tiles: new Map(), // "q,r" -> { q, r, fish, removed:false }
  bounds: { minQ: 0, maxQ: 0, minR: 0, maxR: 0, minX: 0, maxX: 0, minY: 0, maxY: 0 },
  penguins: [], // [{id, player, q, r}]
  currentPlayer: 1,
  selectedPenguinId: null,
  movableTargets: [], // [{q,r}]
  winner: null, // [playerIds...] or 'draw'
  muted: false,
  scores: {} // historical wins counter (cumulative across rounds)
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
    select: () => tone({ freq: 720, type: 'triangle', dur: 0.08, vol: 0.13 }),
    place: () => {
      tone({ freq: 320, type: 'triangle', dur: 0.08, vol: 0.12 });
      setTimeout(() => tone({ freq: 480, type: 'sine', dur: 0.1, vol: 0.1 }), 60);
    },
    move: () => tone({ freq: 540, type: 'sine', dur: 0.12, vol: 0.1, slideTo: 320 }),
    eat: (fish) => {
      // bubble blip with score-based pitch
      const base = 380 + fish * 80;
      tone({ freq: base, type: 'triangle', dur: 0.16, vol: 0.18, slideTo: base * 1.4 });
      setTimeout(() => tone({ freq: base * 1.6, type: 'sine', dur: 0.12, vol: 0.12 }), 80);
    },
    invalid: () => tone({ freq: 180, type: 'sawtooth', dur: 0.12, vol: 0.1 }),
    tap: () => tone({ freq: 540, type: 'sine', dur: 0.05, vol: 0.07 }),
    win: () => {
      const c = ensure(); if (!c) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => tone({ freq: f, type: 'triangle', dur: 0.28, vol: 0.16 }), i * 90);
      });
    }
  };
})();

// ==== 座標変換 ====
function hexToPixel(q, r) {
  const x = HEX_W * (q + r / 2);
  const y = ROW_STEP * r;
  return { x, y };
}

function tileKey(q, r) { return `${q},${r}`; }

// ==== 盤面生成 ====
function generateBoard() {
  // クラシック配置: 8行、奇数行は7タイル、偶数行は8タイル(または逆)
  // 合計 30 + 30 = 60タイル
  const tiles = [];
  for (let row = 0; row < 8; row++) {
    const isShort = row % 2 === 1;
    const cols = isShort ? 7 : 8;
    for (let col = 0; col < cols; col++) {
      // axialへ変換: q = col - floor(row/2)
      const q = col - Math.floor(row / 2);
      const r = row;
      tiles.push({ q, r });
    }
  }
  // 魚数の分布: 1匹×30, 2匹×20, 3匹×10
  const fishPool = [
    ...Array(30).fill(1),
    ...Array(20).fill(2),
    ...Array(10).fill(3)
  ];
  // shuffle
  for (let i = fishPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fishPool[i], fishPool[j]] = [fishPool[j], fishPool[i]];
  }
  state.tiles = new Map();
  let xs = [], ys = [], qs = [], rs = [];
  tiles.forEach((t, i) => {
    state.tiles.set(tileKey(t.q, t.r), { q: t.q, r: t.r, fish: fishPool[i], removed: false });
    const { x, y } = hexToPixel(t.q, t.r);
    xs.push(x); ys.push(y); qs.push(t.q); rs.push(t.r);
  });
  state.bounds = {
    minQ: Math.min(...qs), maxQ: Math.max(...qs),
    minR: Math.min(...rs), maxR: Math.max(...rs),
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys)
  };
}

// ==== ゲーム制御 ====
function startGame(numPlayers) {
  state.numPlayers = numPlayers;
  const perPlayer = PENGUINS_BY_COUNT[numPlayers];
  state.players = PLAYER_PRESETS.slice(0, numPlayers).map((p) => ({
    ...p, score: 0, stuck: false
  }));
  // accumulate scoreboard if not exist
  state.players.forEach((p) => {
    if (!(p.id in state.scores)) state.scores[p.id] = 0;
  });
  generateBoard();
  state.penguins = [];
  let pid = 1;
  for (const p of state.players) {
    for (let i = 0; i < perPlayer; i++) {
      state.penguins.push({ id: pid++, player: p.id, q: null, r: null, placed: false });
    }
  }
  state.currentPlayer = 1;
  state.selectedPenguinId = null;
  state.movableTargets = [];
  state.winner = null;
  state.phase = 'placing';
  hideOverlay('menu');
  hideOverlay('result');
  renderAll();
}

// ==== ロジック ====
function getPenguinAt(q, r) {
  return state.penguins.find((p) => p.placed && p.q === q && p.r === r);
}

function getMovableTargets(penguin) {
  if (!penguin || !penguin.placed) return [];
  const out = [];
  for (const [dq, dr] of DIRS) {
    let q = penguin.q, r = penguin.r;
    while (true) {
      q += dq; r += dr;
      const tile = state.tiles.get(tileKey(q, r));
      if (!tile || tile.removed) break;
      if (getPenguinAt(q, r)) break;
      out.push({ q, r });
    }
  }
  return out;
}

function isPenguinStuck(peng) {
  return getMovableTargets(peng).length === 0;
}

function isPlayerStuck(playerId) {
  const list = state.penguins.filter((p) => p.player === playerId && p.placed);
  if (list.length === 0) return false; // まだ配置中
  return list.every(isPenguinStuck);
}

function nextActivePlayer(fromPlayer) {
  // 次の動けるプレイヤーを探す
  for (let i = 1; i <= state.numPlayers; i++) {
    const next = ((fromPlayer - 1 + i) % state.numPlayers) + 1;
    if (state.phase === 'placing') {
      // 配置中: そのプレイヤーがまだ未配置のペンギンを持っているか
      if (state.penguins.some((p) => p.player === next && !p.placed)) return next;
    } else {
      if (!isPlayerStuck(next)) return next;
    }
  }
  return null;
}

function placePenguin(q, r) {
  if (state.phase !== 'placing') return;
  const tile = state.tiles.get(tileKey(q, r));
  if (!tile || tile.removed) { sound.invalid(); return; }
  if (tile.fish !== 1) { sound.invalid(); return; }
  if (getPenguinAt(q, r)) { sound.invalid(); return; }
  const next = state.penguins.find((p) => p.player === state.currentPlayer && !p.placed);
  if (!next) return;
  next.q = q; next.r = r; next.placed = true;
  sound.place();
  // animation: drop in
  animatePlacement(next);
  // turn pass
  const nxt = nextActivePlayer(state.currentPlayer);
  if (nxt === null) {
    // 全員配置完了 → playingへ
    state.phase = 'playing';
    state.currentPlayer = 1;
    if (isPlayerStuck(1)) {
      const np = nextActivePlayer(1);
      if (np === null) endGame();
      else state.currentPlayer = np;
    }
  } else {
    state.currentPlayer = nxt;
  }
  renderAll();
}

function selectPenguin(penguinId) {
  if (state.phase !== 'playing') return;
  // 同じペンギンタップで選択解除
  if (state.selectedPenguinId === penguinId) {
    state.selectedPenguinId = null;
    state.movableTargets = [];
    sound.tap();
    renderAll();
    return;
  }
  const peng = state.penguins.find((p) => p.id === penguinId);
  if (!peng || peng.player !== state.currentPlayer) { sound.invalid(); return; }
  const targets = getMovableTargets(peng);
  if (targets.length === 0) { sound.invalid(); return; }
  state.selectedPenguinId = penguinId;
  state.movableTargets = targets;
  sound.select();
  renderAll();
}

function movePenguinTo(q, r) {
  if (state.phase !== 'playing' || state.selectedPenguinId === null) return;
  const peng = state.penguins.find((p) => p.id === state.selectedPenguinId);
  if (!peng) return;
  const isTarget = state.movableTargets.some((t) => t.q === q && t.r === r);
  if (!isTarget) { sound.invalid(); return; }
  const oldKey = tileKey(peng.q, peng.r);
  const oldTile = state.tiles.get(oldKey);
  const fish = oldTile.fish;
  // animate: penguin slides, tile sinks
  animatePenguinMove(peng, q, r, () => {
    oldTile.removed = true;
    const player = state.players.find((p) => p.id === peng.player);
    player.score += fish;
    sound.eat(fish);
    showFloatScore(oldTile, fish, player.color);
    peng.q = q; peng.r = r;
    state.selectedPenguinId = null;
    state.movableTargets = [];
    // ターン切り替え
    advanceTurn();
    renderAll();
  });
}

function advanceTurn() {
  // 次の動けるプレイヤーへ
  const nxt = nextActivePlayer(state.currentPlayer);
  if (nxt === null) {
    endGame();
    return;
  }
  state.currentPlayer = nxt;
}

function endGame() {
  // 残ってる自分のペンギンの下のタイルの魚も得点
  for (const peng of state.penguins) {
    if (!peng.placed) continue;
    const tile = state.tiles.get(tileKey(peng.q, peng.r));
    if (tile && !tile.removed) {
      tile.removed = true;
      const player = state.players.find((p) => p.id === peng.player);
      player.score += tile.fish;
    }
  }
  // 勝者
  const maxScore = Math.max(...state.players.map((p) => p.score));
  const winners = state.players.filter((p) => p.score === maxScore);
  if (winners.length === 1) {
    state.winner = [winners[0].id];
    state.scores[winners[0].id] = (state.scores[winners[0].id] || 0) + 1;
  } else {
    state.winner = winners.map((w) => w.id);
  }
  state.phase = 'over';
  renderAll();
  setTimeout(() => {
    sound.win();
    showResult();
    if (winners.length === 1) launchConfetti(winners[0].color);
  }, 500);
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
  const pad = HEX_R + 8;
  const minX = state.bounds.minX - pad, minY = state.bounds.minY - pad;
  const maxX = state.bounds.maxX + pad, maxY = state.bounds.maxY + pad;
  const w = maxX - minX, h = maxY - minY;
  svg.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`);

  // タイル描画
  for (const tile of state.tiles.values()) {
    if (tile.removed) continue;
    const { x, y } = hexToPixel(tile.q, tile.r);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${x}, ${y})`);
    g.setAttribute('class', `tile fish-${tile.fish}`);
    g.dataset.q = String(tile.q);
    g.dataset.r = String(tile.r);
    // 六角形
    const hex = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    hex.setAttribute('points', hexPoints(HEX_R - 2));
    hex.setAttribute('class', 'tile-bg');
    g.appendChild(hex);
    // 魚マーク
    drawFish(g, tile.fish);
    // 配置可能ハイライト
    if (state.phase === 'placing' && tile.fish === 1 && !getPenguinAt(tile.q, tile.r)) {
      g.classList.add('placeable');
      g.addEventListener('click', () => placePenguin(tile.q, tile.r));
    }
    // 移動先ハイライト
    if (state.movableTargets.some((t) => t.q === tile.q && t.r === tile.r)) {
      g.classList.add('movable');
      g.addEventListener('click', () => movePenguinTo(tile.q, tile.r));
    }
    svg.appendChild(g);
  }

  // ペンギン描画
  for (const peng of state.penguins) {
    if (!peng.placed) continue;
    const { x, y } = hexToPixel(peng.q, peng.r);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${x}, ${y})`);
    const player = state.players.find((p) => p.id === peng.player);
    g.setAttribute('class', `penguin player-${peng.player}` +
      (state.selectedPenguinId === peng.id ? ' selected' : '') +
      (state.phase === 'playing' && peng.player === state.currentPlayer && !isPenguinStuck(peng) ? ' my-turn' : ''));
    g.dataset.pengId = String(peng.id);

    // ハロー
    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    halo.setAttribute('r', String(HEX_R * 0.62));
    halo.setAttribute('class', 'penguin-halo');
    halo.setAttribute('fill', player.color);
    g.appendChild(halo);

    // ペンギン絵文字
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('y', '2');
    text.setAttribute('class', 'penguin-emoji');
    text.textContent = '🐧';
    g.appendChild(text);

    if (state.phase === 'playing' && peng.player === state.currentPlayer && !isPenguinStuck(peng)) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => selectPenguin(peng.id));
    }
    svg.appendChild(g);
  }
}

function hexPoints(R) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i + Math.PI / 6; // pointy-top
    const x = R * Math.cos(angle);
    const y = R * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(' ');
}

function drawFish(g, count) {
  // タイル中央に🐟絵文字を魚数分配置
  const positions = {
    1: [{ x: 0, y: 0 }],
    2: [{ x: -10, y: -2 }, { x: 10, y: 4 }],
    3: [{ x: -12, y: -8 }, { x: 12, y: -8 }, { x: 0, y: 8 }]
  };
  const ps = positions[count] || positions[1];
  for (const p of ps) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', String(p.x));
    t.setAttribute('y', String(p.y));
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.setAttribute('class', 'fish-emoji');
    t.textContent = '🐟';
    g.appendChild(t);
  }
}

function renderPanels() {
  const top = $('#panels-top');
  const bottom = $('#panels-bottom');
  top.innerHTML = '';
  bottom.innerHTML = '';
  // 偶数IDのプレイヤー(P2,P4)は上段(反転表示)、奇数IDは下段
  for (const player of state.players) {
    const isTop = player.id % 2 === 0;
    const div = document.createElement('div');
    div.className = 'panel' + (isTop ? ' flip' : '');
    if (state.currentPlayer === player.id && state.phase !== 'over') div.classList.add('active');
    if (state.winner && state.winner.includes(player.id)) div.classList.add('winner');
    div.style.setProperty('--c', player.color);
    div.innerHTML = `
      <div class="panel-name">
        <span class="panel-dot"></span>
        <span>${player.name}</span>
      </div>
      <div class="panel-status">${playerStatusText(player)}</div>
      <div class="panel-score">
        <div class="panel-score-num">${player.score}</div>
        <div class="panel-score-label">🐟</div>
      </div>
    `;
    if (isTop) top.appendChild(div);
    else bottom.appendChild(div);
  }
}

function playerStatusText(player) {
  if (state.phase === 'over') {
    if (state.winner && state.winner.includes(player.id)) {
      return state.winner.length > 1 ? '🤝 同点！' : '🏆 かち！';
    }
    return '';
  }
  if (state.phase === 'placing') {
    const remaining = state.penguins.filter((p) => p.player === player.id && !p.placed).length;
    if (state.currentPlayer === player.id) {
      return `配置: のこり ${remaining}匹`;
    }
    return remaining > 0 ? `のこり ${remaining}匹` : '配置完了';
  }
  // playing
  if (state.currentPlayer === player.id) {
    return state.selectedPenguinId !== null ? '進む先をタップ' : 'ペンギンをタップ';
  }
  return isPlayerStuck(player.id) ? 'もう動けない…' : '相手の番…';
}

function renderHud() {
  const phase = $('#phase');
  if (state.phase === 'placing') {
    phase.textContent = 'ペンギンの配置 (魚1匹のマス)';
  } else if (state.phase === 'playing') {
    phase.textContent = '直線で動かして魚をゲット';
  } else if (state.phase === 'over') {
    phase.textContent = 'ゲーム終了';
  } else {
    phase.textContent = '';
  }
  const cancelBtn = $('#cancelSelectBtn');
  if (cancelBtn) {
    cancelBtn.style.display = state.selectedPenguinId !== null ? '' : 'none';
  }
}

// ==== アニメーション ====
function animatePlacement(peng) {
  // svg 内の penguin を再描画後にdrop-inクラスをつける（CSS animation）
  setTimeout(() => {
    const g = document.querySelector(`.penguin[data-peng-id="${peng.id}"]`);
    if (g) g.classList.add('drop-in');
  }, 10);
}

function animatePenguinMove(peng, q, r, done) {
  const g = document.querySelector(`.penguin[data-peng-id="${peng.id}"]`);
  if (!g) { done(); return; }
  const from = hexToPixel(peng.q, peng.r);
  const to = hexToPixel(q, r);
  const dur = 380;
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / dur);
    const ease = 1 - Math.pow(1 - t, 3);
    const x = from.x + (to.x - from.x) * ease;
    const y = from.y + (to.y - from.y) * ease;
    g.setAttribute('transform', `translate(${x}, ${y})`);
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      // タイル沈降開始
      const old = document.querySelector(`.tile[data-q="${peng.q}"][data-r="${peng.r}"]`);
      if (old) old.classList.add('sinking');
      setTimeout(done, 320);
    }
  }
  requestAnimationFrame(step);
}

function showFloatScore(tile, fish, color) {
  const svg = $('#board');
  const { x, y } = hexToPixel(tile.q, tile.r);
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', String(x));
  t.setAttribute('y', String(y));
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('class', 'float-score');
  t.setAttribute('fill', color);
  t.textContent = `+${fish}🐟`;
  svg.appendChild(t);
  setTimeout(() => t.remove(), 1100);
}

// ==== オーバーレイ ====
function showOverlay(id) { $(`#${id}`).classList.remove('hidden'); }
function hideOverlay(id) { $(`#${id}`).classList.add('hidden'); }

function showResult() {
  const dlg = $('#resultDialog');
  const emoji = $('#resultEmoji');
  const title = $('#resultTitle');
  const sub = $('#resultSub');
  const list = $('#resultList');
  list.innerHTML = '';
  // sort by score desc
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  ranked.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'result-row';
    if (state.winner.includes(p.id)) row.classList.add('winner');
    row.innerHTML = `
      <span class="result-rank">${i + 1}</span>
      <span class="result-dot" style="background:${p.color}"></span>
      <span class="result-name">${p.name}</span>
      <span class="result-score">${p.score}🐟</span>
    `;
    list.appendChild(row);
  });
  if (state.winner.length === 1) {
    const w = state.players.find((p) => p.id === state.winner[0]);
    emoji.textContent = '🏆';
    title.textContent = `${w.name} の勝ち！`;
    title.style.color = w.color;
    sub.textContent = `${w.score}匹の🐟をゲット！`;
    dlg.style.setProperty('--c', w.color);
  } else {
    emoji.textContent = '🤝';
    title.textContent = '引き分け！';
    title.style.color = '#fde047';
    sub.textContent = '同点でフィニッシュ';
    dlg.style.setProperty('--c', '#fde047');
  }
  showOverlay('result');
}

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
  // メニュー: 人数選択
  document.querySelectorAll('[data-count]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sound.tap();
      document.querySelectorAll('[data-count]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.numPlayers = Number(btn.dataset.count);
    });
  });
  $('#startBtn').addEventListener('click', () => {
    sound.tap();
    startGame(state.numPlayers);
  });
  $('#newBtn').addEventListener('click', () => {
    sound.tap();
    showOverlay('menu');
  });
  $('#resetBtn').addEventListener('click', () => {
    sound.tap();
    state.scores = {};
    showOverlay('menu');
  });
  $('#muteBtn').addEventListener('click', () => {
    state.muted = !state.muted;
    $('#muteBtn').textContent = state.muted ? '🔇' : '🔊';
  });
  $('#rulesBtn').addEventListener('click', () => {
    sound.tap();
    showOverlay('rules');
  });
  $('#rulesClose').addEventListener('click', () => {
    sound.tap();
    hideOverlay('rules');
  });
  $('#rules').addEventListener('click', (e) => {
    if (e.target.id === 'rules') hideOverlay('rules');
  });
  $('#resultAgainBtn').addEventListener('click', () => {
    sound.tap();
    startGame(state.numPlayers);
  });
  $('#resultMenuBtn').addEventListener('click', () => {
    sound.tap();
    hideOverlay('result');
    showOverlay('menu');
  });
  $('#cancelSelectBtn').addEventListener('click', () => {
    sound.tap();
    state.selectedPenguinId = null;
    state.movableTargets = [];
    renderAll();
  });
  // ESC で選択解除
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selectedPenguinId !== null) {
      state.selectedPenguinId = null;
      state.movableTargets = [];
      renderAll();
    }
  });
  // first interaction unlock
  document.addEventListener('pointerdown', () => sound.tap(), { once: true });
}

function init() {
  bindEvents();
  showOverlay('menu');
  // 盤面プレビューを少し描いておく（メニュー裏）
  generateBoard();
  state.phase = 'menu';
  renderBoard();
  renderHud();
}

init();
