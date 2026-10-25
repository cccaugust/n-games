// クアルト！ - 2人対戦 / CPU対戦
// コマは4ビットで属性表現:
//   bit0: 1=高い / 0=低い
//   bit1: 1=暗い / 0=明るい
//   bit2: 1=四角 / 0=丸
//   bit3: 1=穴あり / 0=詰まり

// ==========================================================================
// 定数
// ==========================================================================
const ALL_PIECES = Array.from({ length: 16 }, (_, i) => i);

const LINES = [
  [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
  [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
  [0, 5, 10, 15], [3, 6, 9, 12]
];

// 共通属性のラベル（bit → [1のとき, 0のとき]）
const CELL_LINES = Array.from({ length: 16 }, (_, i) => LINES.filter((l) => l.includes(i)));

const ATTR_WORDS = [
  ['高い', '低い'],
  ['暗い', '明るい'],
  ['四角', '丸'],
  ['穴あり', '穴なし']
];

const CPU_LEVEL_LABEL = { easy: 'やさしい', normal: 'ふつう', hard: 'つよい' };

const SETTINGS_KEY = 'quarto.settings.v2';
const RECORDS_KEY = 'quarto.records.v2';

const $ = (sel) => document.querySelector(sel);
const rand = (arr) => arr[(Math.random() * arr.length) | 0];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ==========================================================================
// 設定 / 成績（localStorage）
// ==========================================================================
const DEFAULT_SETTINGS = { sound: true, hints: true, face: true, haptics: true, cpuLevel: 'normal' };
const DEFAULT_RECORDS = {
  pvp: { p1: 0, p2: 0, draw: 0 },
  cpu: {
    easy: { win: 0, lose: 0, draw: 0 },
    normal: { win: 0, lose: 0, draw: 0 },
    hard: { win: 0, lose: 0, draw: 0 }
  }
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    const parsed = JSON.parse(raw);
    return deepMerge(structuredClone(fallback), parsed);
  } catch {
    return structuredClone(fallback);
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* プライベートモード等は無視 */
  }
}
function deepMerge(base, extra) {
  if (!extra || typeof extra !== 'object') return base;
  for (const k of Object.keys(extra)) {
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      base[k] = deepMerge(base[k], extra[k]);
    } else if (extra[k] !== undefined) {
      base[k] = extra[k];
    }
  }
  return base;
}

const settings = loadJSON(SETTINGS_KEY, DEFAULT_SETTINGS);
const records = loadJSON(RECORDS_KEY, DEFAULT_RECORDS);
const saveSettings = () => saveJSON(SETTINGS_KEY, settings);
const saveRecords = () => saveJSON(RECORDS_KEY, records);

// ==========================================================================
// コマのビジュアル（SVG・疑似3D）
// ==========================================================================
function pieceAttrs(p) {
  return {
    tall: !!(p & 1),
    dark: !!(p & 2),
    square: !!(p & 4),
    hollow: !!(p & 8)
  };
}

function describePiece(p) {
  const a = pieceAttrs(p);
  return `${a.dark ? '暗い' : '明るい'}・${a.tall ? '高い' : '低い'}・${a.square ? '四角' : '丸'}・${a.hollow ? '穴あり' : '穴なし'}`;
}

function pieceSVG(p) {
  const a = pieceAttrs(p);
  const w = a.tall ? 64 : 56;          // 上面の大きさ
  const h = a.tall ? 24 : 8;           // 側面の高さ
  const x = (100 - w) / 2;
  const bottom = 91;
  const y = bottom - w - h;
  const rx = a.square ? w * 0.2 : w / 2;
  const tone = a.dark ? 'dark' : 'light';
  const cy = y + w / 2;
  const holeR = w * 0.21;

  const shadow = `<ellipse cx="50" cy="${bottom}" rx="${w / 2 + 6}" ry="${a.tall ? 9 : 6}" fill="url(#q-shadow)"/>`;
  const side = `<rect x="${x}" y="${y}" width="${w}" height="${w + h}" rx="${rx}" fill="url(#q-side-${tone})"/>`;
  const sideEdge = `<rect x="${x + 0.75}" y="${y + 0.75}" width="${w - 1.5}" height="${w + h - 1.5}" rx="${Math.max(0, rx - 0.75)}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/>`;
  const top = `<rect x="${x}" y="${y}" width="${w}" height="${w}" rx="${rx}" fill="url(#q-top-${tone})"/>`;
  const grain = `<rect x="${x}" y="${y}" width="${w}" height="${w}" rx="${rx}" fill="url(#q-grain-${tone})"/>`;
  const rim = `<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${w - 2}" rx="${Math.max(0, rx - 1)}" fill="none" stroke="rgba(255,255,255,${a.dark ? 0.2 : 0.5})" stroke-width="1.6"/>`;
  const gloss = `<ellipse cx="${50 - w * 0.14}" cy="${y + w * 0.24}" rx="${w * 0.26}" ry="${w * 0.12}" fill="url(#q-gloss)" opacity="${a.dark ? 0.32 : 0.5}"/>`;

  let center = '';
  if (a.hollow) {
    const hx1 = 50 - holeR * 0.72;
    const hx2 = 50 + holeR * 0.72;
    const hy = cy + holeR * 0.62;
    center =
      `<circle cx="50" cy="${cy}" r="${holeR}" fill="url(#q-hole)"/>` +
      `<circle cx="50" cy="${cy}" r="${holeR}" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="1.6"/>` +
      `<path d="M ${hx1} ${hy} A ${holeR} ${holeR} 0 0 0 ${hx2} ${hy}" fill="none" stroke="rgba(255,225,180,0.3)" stroke-width="1.8"/>`;
  } else {
    // 詰まり: ごく薄い木口の輪
    center = `<circle cx="50" cy="${cy}" r="${holeR * 0.55}" fill="none" stroke="rgba(${a.dark ? '255,220,180' : '120,80,30'},0.12)" stroke-width="1.2"/>`;
  }

  return `<svg viewBox="0 0 100 100" role="img" aria-label="${describePiece(p)}">${shadow}${side}${sideEdge}${top}${grain}${rim}${gloss}${center}</svg>`;
}

function buildPieceVisual(p, extraClass = '') {
  const wrap = document.createElement('div');
  wrap.className = 'piece-vis' + (extraClass ? ' ' + extraClass : '');
  wrap.innerHTML = pieceSVG(p);
  return wrap;
}

// ==========================================================================
// サウンド（WebAudio 合成）
// ==========================================================================
const sound = (() => {
  let ctx = null;
  function ensure() {
    if (!settings.sound) return null;
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
  function tone({ freq = 440, type = 'sine', dur = 0.12, vol = 0.16, attack = 0.005, slideTo = null, delay = 0 }) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + delay;
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
  function noise({ dur = 0.08, vol = 0.12, delay = 0, hp = 800 }) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + delay;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hp;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t);
  }
  return {
    tap: () => tone({ freq: 560, type: 'sine', dur: 0.05, vol: 0.07 }),
    select: () => tone({ freq: 760, type: 'triangle', dur: 0.07, vol: 0.1 }),
    handoff: () => {
      tone({ freq: 420, type: 'sine', dur: 0.16, vol: 0.12, slideTo: 840 });
      tone({ freq: 1260, type: 'sine', dur: 0.1, vol: 0.05, delay: 0.1 });
    },
    place: () => {
      noise({ dur: 0.05, vol: 0.18, hp: 1500 });
      tone({ freq: 190, type: 'triangle', dur: 0.16, vol: 0.2, slideTo: 120 });
      tone({ freq: 95, type: 'sine', dur: 0.22, vol: 0.16 });
    },
    invalid: () => tone({ freq: 170, type: 'sawtooth', dur: 0.14, vol: 0.08 }),
    undo: () => tone({ freq: 640, type: 'sine', dur: 0.14, vol: 0.1, slideTo: 320 }),
    think: () => tone({ freq: 880, type: 'sine', dur: 0.04, vol: 0.03 }),
    win: () => {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.26, vol: 0.14, delay: i * 0.085 }));
      [523.25, 659.25, 783.99].forEach((f) => tone({ freq: f, type: 'sine', dur: 0.9, vol: 0.07, delay: 0.5 }));
    },
    draw: () => {
      tone({ freq: 440, type: 'sine', dur: 0.22, vol: 0.12 });
      tone({ freq: 330, type: 'sine', dur: 0.34, vol: 0.12, delay: 0.14 });
    }
  };
})();

function haptic(pattern) {
  if (!settings.haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* 未対応 */
  }
}

// ==========================================================================
// ゲームロジック
// ==========================================================================
/** 4つの共通ビット(1でそろい)と、0でそろいのビットをまとめて返す */
function sharedBits(pieces) {
  let andBits = 0xf;
  let orBits = 0;
  for (const p of pieces) {
    andBits &= p;
    orBits |= p;
  }
  return { ones: andBits, zeros: ~orBits & 0xf };
}

function checkWin(board) {
  for (const line of LINES) {
    const pieces = line.map((i) => board[i]);
    if (pieces.some((p) => p === null)) continue;
    const { ones, zeros } = sharedBits(pieces);
    if ((ones | zeros) !== 0) return { line, ones, zeros };
  }
  return null;
}

function winReason({ ones, zeros }) {
  const words = [];
  for (let b = 0; b < 4; b++) {
    if (ones & (1 << b)) words.push(ATTR_WORDS[b][0]);
    else if (zeros & (1 << b)) words.push(ATTR_WORDS[b][1]);
  }
  return `ぜんぶ「${words.join('・')}」で そろった！`;
}

/** piece を置くと即勝ちになる空マス一覧 */
function winningCells(board, piece) {
  const cells = [];
  for (let i = 0; i < 16; i++) {
    if (board[i] !== null) continue;
    board[i] = piece;
    if (lineWinAt(board, i)) cells.push(i);
    board[i] = null;
  }
  return cells;
}

/** マス i を通る列だけを見て勝ちか判定（高速版） */
function lineWinAt(board, i) {
  for (const line of CELL_LINES[i]) {
    const a = board[line[0]];
    const b = board[line[1]];
    const c = board[line[2]];
    const d = board[line[3]];
    if (a === null || b === null || c === null || d === null) continue;
    const ones = a & b & c & d;
    const zeros = ~(a | b | c | d) & 0xf;
    if ((ones | zeros) !== 0) return true;
  }
  return false;
}

function isRisky(board, piece) {
  return winningCells(board, piece).length > 0;
}

function safePieces(board, available) {
  return [...available].filter((p) => !isRisky(board, p));
}

// ==========================================================================
// CPU
// ==========================================================================
function cpuChoosePlace(board, piece, available, level) {
  const empties = [];
  for (let i = 0; i < 16; i++) if (board[i] === null) empties.push(i);
  const wins = winningCells(board, piece);
  if (wins.length && (level !== 'easy' || Math.random() < 0.65)) return rand(wins);
  if (level === 'easy') return rand(empties);

  let best = [];
  let bestScore = -Infinity;
  for (const c of empties) {
    const b2 = board.slice();
    b2[c] = piece;
    let score;
    if (available.size === 0) {
      score = 0;
    } else {
      const safe = safePieces(b2, available);
      score = safe.length * 10;
      if (level === 'hard' && safe.length > 0) {
        // 安全なコマのうち最良のものを渡したときの、相手の余裕（小さいほど良い）
        let bestGive = Infinity;
        for (const p of safe) {
          const oppRoom = opponentRoom(b2, p, available);
          if (oppRoom < bestGive) bestGive = oppRoom;
        }
        score += 100 - bestGive;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = [c];
    } else if (score === bestScore) {
      best.push(c);
    }
  }
  return rand(best);
}

/** p を渡したとき、相手が最善に置いた後に持てる「安全なコマ」の最大数 */
function opponentRoom(board, p, available) {
  const rest = new Set(available);
  rest.delete(p);
  let max = -1;
  for (let c = 0; c < 16; c++) {
    if (board[c] !== null) continue;
    board[c] = p;
    const n = rest.size === 0 ? 0 : safePieces(board, rest).length;
    board[c] = null;
    if (n > max) max = n;
  }
  return max;
}

function cpuChooseGive(board, available, level) {
  const list = [...available];
  const safe = list.filter((p) => !isRisky(board, p));
  if (level === 'easy') {
    return Math.random() < 0.45 ? rand(list) : rand(safe.length ? safe : list);
  }
  if (level === 'normal') return rand(safe.length ? safe : list);

  // hard
  if (!safe.length) {
    // どれを渡しても負け筋。勝ちマスが最も少ないコマを渡して祈る
    let best = list[0];
    let min = Infinity;
    for (const p of list) {
      const n = winningCells(board, p).length;
      if (n < min) {
        min = n;
        best = p;
      }
    }
    return best;
  }
  let best = [];
  let bestRoom = Infinity;
  for (const p of safe) {
    const room = opponentRoom(board, p, available);
    if (room < bestRoom) {
      bestRoom = room;
      best = [p];
    } else if (room === bestRoom) {
      best.push(p);
    }
  }
  return rand(best);
}

// ==========================================================================
// 状態
// ==========================================================================
const state = {
  mode: 'pvp', // 'pvp' | 'cpu'
  cpuLevel: settings.cpuLevel,
  inGame: false,
  board: Array(16).fill(null),
  available: new Set(ALL_PIECES),
  selectedPiece: null,
  phase: 'select', // 'select' | 'place' | 'over'
  currentPlayer: 1,
  roundStarter: 1,
  winner: null, // 1 | 2 | 'draw' | null
  winLine: null,
  winInfo: null,
  lastMove: null, // { cell, player, fresh }
  lastTaken: null, // { piece, fresh }
  scores: { 1: 0, 2: 0 },
  history: [],
  cpuBusy: false,
  cpuToken: 0,
  roundSeq: 0
};

const isCpuTurn = () => state.mode === 'cpu' && state.currentPlayer === 2;
const humanActing = () => state.winner === null && !isCpuTurn() && !state.cpuBusy;

function playerName(player) {
  if (state.mode === 'cpu') return player === 1 ? 'あなた' : `CPU（${CPU_LEVEL_LABEL[state.cpuLevel]}）`;
  return `プレイヤー${player}`;
}
function playerShort(player) {
  if (state.mode === 'cpu') return player === 1 ? 'あなた' : 'CPU';
  return `プレイヤー${player}`;
}
const playerColor = (player) => (player === 1 ? 'var(--p1)' : 'var(--p2)');

const layoutMQ = window.matchMedia('(orientation: landscape) and (min-width: 700px)');
const isFlipLayout = () => settings.face && state.mode === 'pvp' && !layoutMQ.matches;

// ==========================================================================
// 履歴（もどす）
// ==========================================================================
function pushHistory() {
  state.history.push({
    board: state.board.slice(),
    available: [...state.available],
    selectedPiece: state.selectedPiece,
    phase: state.phase,
    currentPlayer: state.currentPlayer
  });
  if (state.history.length > 64) state.history.shift();
}

function undo() {
  if (!state.history.length || state.phase === 'over' || state.cpuBusy) return;
  const snap = state.history.pop();
  state.board = snap.board.slice();
  state.available = new Set(snap.available);
  state.selectedPiece = snap.selectedPiece;
  state.phase = snap.phase;
  state.currentPlayer = snap.currentPlayer;
  state.lastMove = null;
  state.lastTaken = null;
  sound.undo();
  renderAll();
}

// ==========================================================================
// レンダリング
// ==========================================================================
function renderPanels() {
  for (const player of [1, 2]) {
    const panel = $(`#panel-${player}`);
    const active = state.currentPlayer === player && state.winner === null;
    panel.classList.toggle('active', active);
    panel.classList.toggle('winner', state.winner === player);

    $(`#name-${player}`).textContent = playerName(player);
    const avatar = $(`#avatar-${player}`);
    const isCpu = state.mode === 'cpu' && player === 2;
    avatar.classList.toggle('cpu', isCpu);
    avatar.firstChild.textContent = isCpu ? '🤖' : String(player);

    const score = $(`#score-${player}`);
    if (score.textContent !== String(state.scores[player])) {
      score.textContent = String(state.scores[player]);
      score.classList.remove('bump');
      void score.offsetWidth;
      score.classList.add('bump');
    }

    const role = $(`#role-${player}`);
    if (state.winner !== null) {
      role.textContent = state.winner === player ? '🏆 かち！' : state.winner === 'draw' ? '🤝 ひきわけ' : 'つぎは まけないぞ';
    } else if (active) {
      if (isCpu) {
        role.innerHTML = '<span class="thinking">かんがえ中</span>';
      } else {
        role.textContent = state.phase === 'select' ? 'わたす コマを えらぼう' : 'コマを 盤に 置こう';
      }
    } else {
      role.textContent = 'あいての番…';
    }
  }
}

function renderBoard() {
  const board = $('#board');
  board.innerHTML = '';
  const canPlace = state.phase === 'place' && state.selectedPiece !== null && humanActing();
  const hintCells = canPlace && settings.hints ? winningCells(state.board, state.selectedPiece) : [];

  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.type = 'button';
    cell.dataset.index = String(i);
    const slot = state.board[i];
    if (slot !== null) {
      cell.setAttribute('aria-label', `マス${i + 1}: ${describePiece(slot)}`);
      cell.appendChild(buildPieceVisual(slot));
      cell.disabled = true;
      if (state.lastMove && state.lastMove.cell === i) {
        cell.classList.add('last-move');
        cell.style.setProperty('--last-c', playerColor(state.lastMove.player));
        if (state.lastMove.fresh) cell.classList.add('just-placed');
      }
    } else {
      cell.setAttribute('aria-label', `マス${i + 1}: あき`);
      if (canPlace) {
        cell.classList.add('placeable');
        cell.appendChild(buildPieceVisual(state.selectedPiece, 'preview'));
        if (hintCells.includes(i)) cell.classList.add('hint-win');
      } else {
        cell.disabled = true;
      }
    }
    if (state.winLine && state.winLine.includes(i)) cell.classList.add('win-cell');
    board.appendChild(cell);
  }
  if (state.lastMove) state.lastMove.fresh = false;
}

function renderRack() {
  const rack = $('#rack');
  rack.innerHTML = '';
  const selecting = state.phase === 'select' && humanActing();
  $('#rackWrap').classList.toggle('live', selecting);
  $('#rackCount').textContent = `${state.available.size} / 16`;

  for (let p = 0; p < 16; p++) {
    const used = !state.available.has(p);
    const item = document.createElement('button');
    item.className = 'rack-item';
    item.type = 'button';
    item.dataset.piece = String(p);
    item.setAttribute('aria-label', describePiece(p));
    item.appendChild(buildPieceVisual(p));
    if (used) {
      if (state.lastTaken && state.lastTaken.piece === p && state.lastTaken.fresh) {
        item.classList.add('just-taken');
      } else {
        item.classList.add('used');
      }
      item.disabled = true;
    } else if (selecting) {
      item.classList.add('selectable');
      if (settings.hints && isRisky(state.board, p)) {
        item.classList.add('risky');
        item.setAttribute('aria-label', describePiece(p) + '（相手が勝てる）');
      }
    } else {
      item.disabled = true;
    }
    rack.appendChild(item);
  }
  if (state.lastTaken) state.lastTaken.fresh = false;
}

function renderTray(opts = {}) {
  const tray = $('#tray');
  const slot = $('#traySlot');
  const title = $('#trayTitle');
  const sub = $('#traySub');
  const undoBtn = $('#undoBtn');

  tray.style.setProperty('--c', playerColor(state.currentPlayer));
  tray.classList.toggle('flip', isFlipLayout() && state.currentPlayer === 2 && state.winner === null);

  slot.innerHTML = '';
  slot.classList.remove('has-piece', 'pop');
  const who = `<span class="who">${playerShort(state.currentPlayer)}</span>`;

  if (state.winner !== null) {
    if (state.winner === 'draw') {
      title.textContent = 'ひきわけ！';
      sub.textContent = 'コマを 置ききったよ。もう一回 あそぶ？';
    } else {
      title.innerHTML = `<span class="who">${playerShort(state.winner)}</span> の かち！`;
      sub.textContent = state.winInfo ? winReason(state.winInfo) : 'クアルト！';
    }
    slot.innerHTML = '<span class="q">🏆</span>';
  } else if (state.phase === 'place' && state.selectedPiece !== null) {
    slot.classList.add('has-piece');
    if (opts.pop) slot.classList.add('pop');
    slot.appendChild(buildPieceVisual(state.selectedPiece));
    title.innerHTML = `${who} の番`;
    sub.textContent = isCpuTurn() ? 'どこに 置くか かんがえ中…' : 'この コマを 盤の 好きな マスに 置こう';
  } else {
    slot.innerHTML = '<span class="q">?</span>';
    title.innerHTML = `${who} の番`;
    sub.textContent = isCpuTurn() ? 'わたす コマを かんがえ中…' : 'あいてに わたす コマを 下から えらぼう';
  }

  undoBtn.disabled = !(state.history.length && state.phase !== 'over' && !state.cpuBusy && humanActing());
}

function renderChrome() {
  const app = $('#app');
  app.classList.toggle('face-to-face', isFlipLayout());
  app.style.setProperty('--turn-c', playerColor(state.currentPlayer));
  $('#modeChipText').textContent = state.mode === 'cpu' ? `CPU・${CPU_LEVEL_LABEL[state.cpuLevel]}` : 'ふたりで';
  const mute = $('#muteBtn');
  mute.textContent = settings.sound ? '🔊' : '🔇';
  mute.setAttribute('aria-pressed', String(!settings.sound));
}

function renderAll(opts = {}) {
  renderChrome();
  renderPanels();
  renderBoard();
  renderRack();
  renderTray(opts);
  drawWinLine();
}

function drawWinLine(animate = true) {
  const svg = $('#winLine');
  svg.innerHTML = '';
  if (!state.winLine) return;
  const board = $('#board');
  const rect = board.getBoundingClientRect();
  if (rect.width === 0) return;
  const cells = board.querySelectorAll('.cell');
  const center = (idx) => {
    const r = cells[idx].getBoundingClientRect();
    return { x: r.left - rect.left + r.width / 2, y: r.top - rect.top + r.height / 2 };
  };
  const a = center(state.winLine[0]);
  const b = center(state.winLine[3]);
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', a.x);
  line.setAttribute('y1', a.y);
  line.setAttribute('x2', b.x);
  line.setAttribute('y2', b.y);
  if (!animate) line.style.animation = 'none';
  if (!animate) line.style.strokeDashoffset = '0';
  svg.appendChild(line);
}

function showToast(text, player) {
  const toast = $('#turnToast');
  $('#turnToastText').textContent = text;
  toast.style.setProperty('--toast-c', playerColor(player));
  toast.classList.toggle('flip', isFlipLayout() && player === 2);
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
}

function showStamp(text) {
  const stamp = $('#stamp');
  stamp.querySelector('span').textContent = text;
  stamp.classList.remove('show');
  void stamp.offsetWidth;
  stamp.classList.add('show');
}
function hideStamp() {
  $('#stamp').classList.remove('show');
}

// ==========================================================================
// 進行
// ==========================================================================
function startRound({ keepScores = true, starter = null } = {}) {
  state.cpuToken++;
  state.roundSeq++;
  state.cpuBusy = false;
  state.board = Array(16).fill(null);
  state.available = new Set(ALL_PIECES);
  state.selectedPiece = null;
  state.phase = 'select';
  state.winner = null;
  state.winLine = null;
  state.winInfo = null;
  state.lastMove = null;
  state.lastTaken = null;
  state.history = [];
  if (starter) state.roundStarter = starter;
  state.currentPlayer = state.roundStarter;
  if (!keepScores) state.scores = { 1: 0, 2: 0 };
  hideStamp();
  hideOverlay('#result');
  renderAll();
  showToast(`${playerShort(state.currentPlayer)} から スタート！`, state.currentPlayer);
  if (isCpuTurn()) runCpuGive();
}

function selectPiece(p) {
  if (state.phase !== 'select' || state.winner !== null) return;
  if (!state.available.has(p)) return;
  state.selectedPiece = p;
  state.available.delete(p);
  state.lastTaken = { piece: p, fresh: true };
  state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
  state.phase = 'place';
  sound.handoff();
  renderAll({ pop: true });
  showToast(`${playerShort(state.currentPlayer)} の番！`, state.currentPlayer);
  if (isCpuTurn()) runCpuPlace();
}

function placePiece(i) {
  if (state.phase !== 'place' || state.winner !== null) return;
  if (state.board[i] !== null) {
    sound.invalid();
    return;
  }
  const placed = state.selectedPiece;
  const player = state.currentPlayer;
  state.board[i] = placed;
  state.selectedPiece = null;
  state.lastMove = { cell: i, player, fresh: true };
  sound.place();
  haptic(12);

  const result = checkWin(state.board);
  if (result) {
    finishRound({ winner: player, result });
    return;
  }
  if (state.available.size === 0) {
    finishRound({ winner: 'draw' });
    return;
  }
  state.phase = 'select';
  renderAll();
}

function onRackClick(p) {
  if (!humanActing()) return;
  pushHistory();
  selectPiece(p);
}

function onCellClick(i) {
  if (!humanActing()) return;
  if (state.board[i] !== null) {
    sound.invalid();
    const board = $('#board');
    board.classList.remove('shake');
    void board.offsetWidth;
    board.classList.add('shake');
    return;
  }
  pushHistory();
  placePiece(i);
}

async function finishRound({ winner, result }) {
  const seq = state.roundSeq;
  const alive = () => seq === state.roundSeq;
  state.phase = 'over';
  state.winner = winner;
  state.cpuBusy = false;
  state.cpuToken++;
  if (winner !== 'draw') {
    state.winLine = result.line;
    state.winInfo = { ones: result.ones, zeros: result.zeros };
  }
  renderAll();

  if (winner === 'draw') {
    recordResult('draw');
    await wait(350);
    if (!alive()) return;
    sound.draw();
    showStamp('ひきわけ');
    await wait(1100);
    if (!alive()) return;
    showResult();
    return;
  }

  recordResult(winner);
  await wait(280);
  if (!alive()) return;
  sound.win();
  haptic([20, 40, 20, 40, 60]);
  showStamp('QUARTO!');
  await wait(380);
  if (!alive()) return;
  launchConfetti();
  await wait(1200);
  if (!alive()) return;
  state.scores[winner] += 1;
  renderPanels();
  showResult();
}

function recordResult(winner) {
  if (state.mode === 'pvp') {
    if (winner === 'draw') records.pvp.draw++;
    else records.pvp[winner === 1 ? 'p1' : 'p2']++;
  } else {
    const rec = records.cpu[state.cpuLevel];
    if (winner === 'draw') rec.draw++;
    else if (winner === 1) rec.win++;
    else rec.lose++;
  }
  saveRecords();
}

// ---- CPU ----
async function runCpuPlace() {
  const token = ++state.cpuToken;
  state.cpuBusy = true;
  renderAll({ pop: true });
  await wait(700 + Math.random() * 500);
  if (token !== state.cpuToken) return;
  const cell = cpuChoosePlace(state.board, state.selectedPiece, state.available, state.cpuLevel);
  if (token !== state.cpuToken) return;
  state.cpuBusy = false;
  placePiece(cell);
  if (state.winner === null) runCpuGive();
}

async function runCpuGive() {
  const token = ++state.cpuToken;
  state.cpuBusy = true;
  renderAll();
  await wait(650 + Math.random() * 450);
  if (token !== state.cpuToken) return;
  const piece = cpuChooseGive(state.board, state.available, state.cpuLevel);
  if (token !== state.cpuToken) return;
  state.cpuBusy = false;
  selectPiece(piece);
}

// ==========================================================================
// オーバーレイ
// ==========================================================================
function showOverlay(sel) {
  $(sel).classList.remove('hidden');
}
function hideOverlay(sel) {
  $(sel).classList.add('hidden');
}
function anyOverlayOpen() {
  return ['#menu', '#settings', '#rules', '#result'].some((s) => !$(s).classList.contains('hidden'));
}

function showResult() {
  const dialog = $('#resultDialog');
  const title = $('#resultTitle');
  const sub = $('#resultSub');
  const emoji = $('#resultEmoji');
  const pieces = $('#resultPieces');
  pieces.innerHTML = '';

  if (state.winner === 'draw') {
    dialog.style.setProperty('--c', '#9aa7bf');
    emoji.textContent = '🤝';
    title.textContent = 'ひきわけ！';
    sub.textContent = '16コマ ぜんぶ 置いても そろわなかった';
    pieces.classList.add('hidden');
  } else {
    dialog.style.setProperty('--c', playerColor(state.winner));
    emoji.textContent = state.mode === 'cpu' && state.winner === 2 ? '🤖' : '🏆';
    title.textContent = `${playerName(state.winner)} の かち！`;
    sub.textContent = state.winInfo ? winReason(state.winInfo) : 'クアルト！';
    pieces.classList.remove('hidden');
    for (const idx of state.winLine) {
      const cell = document.createElement('div');
      cell.className = 'mini-cell';
      cell.appendChild(buildPieceVisual(state.board[idx]));
      pieces.appendChild(cell);
    }
  }
  $('#resultScore').innerHTML =
    `<span class="s"><i style="background:var(--p1)"></i><span class="n">${playerShort(1)}</span><b>${state.scores[1]}</b></span>` +
    `<span class="vs">VS</span>` +
    `<span class="s"><b>${state.scores[2]}</b><span class="n">${playerShort(2)}</span><i style="background:var(--p2)"></i></span>`;
  showOverlay('#result');
}

function nextRoundStarter() {
  // 負けた人（引き分けなら前回と逆）が先手
  if (state.winner === 1) return 2;
  if (state.winner === 2) return 1;
  return state.roundStarter === 1 ? 2 : 1;
}

// ---- タイトル ----
function showTitle() {
  state.cpuToken++;
  state.roundSeq++;
  state.cpuBusy = false;
  state.inGame = false;
  hideOverlay('#result');
  hideOverlay('#menu');
  hideStamp();
  const t = $('#titleScreen');
  t.classList.remove('hidden', 'leaving');
  $('#cpuPick').classList.add('hidden');
  renderRecordLine();
}

function leaveTitle() {
  const t = $('#titleScreen');
  t.classList.add('leaving');
  setTimeout(() => {
    t.classList.add('hidden');
    t.classList.remove('leaving');
  }, 360);
}

function startGame(mode) {
  state.mode = mode;
  state.cpuLevel = settings.cpuLevel;
  state.inGame = true;
  leaveTitle();
  startRound({ keepScores: false, starter: 1 });
}

function renderRecordLine() {
  const pvp = records.pvp;
  const cpuAll = Object.values(records.cpu).reduce(
    (acc, r) => ({ win: acc.win + r.win, lose: acc.lose + r.lose, draw: acc.draw + r.draw }),
    { win: 0, lose: 0, draw: 0 }
  );
  $('#recordLine').innerHTML =
    `<span>ふたりで <b>${pvp.p1}</b> - <b>${pvp.p2}</b>（ひきわけ ${pvp.draw}）</span>` +
    `<span>CPUせん <b>${cpuAll.win}</b>勝 <b>${cpuAll.lose}</b>敗（ひきわけ ${cpuAll.draw}）</span>`;
}

function renderCpuLevelSeg() {
  $('#cpuLevelSeg')
    .querySelectorAll('button')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.level === settings.cpuLevel)));
}

// ---- 設定 ----
function renderSettings() {
  $('#optSound').setAttribute('aria-checked', String(settings.sound));
  $('#optHints').setAttribute('aria-checked', String(settings.hints));
  $('#optFace').setAttribute('aria-checked', String(settings.face));
  $('#optHaptics').setAttribute('aria-checked', String(settings.haptics));
}

function bindSwitch(id, key, after) {
  $(id).addEventListener('click', () => {
    settings[key] = !settings[key];
    saveSettings();
    sound.tap();
    renderSettings();
    if (after) after();
    if (state.inGame) renderAll();
  });
}

// ==========================================================================
// 装飾（タイトル・ルール・ロゴ）
// ==========================================================================
function decorate() {
  // ブランドマーク
  $('#brandMark').innerHTML = pieceSVG(0b1001);

  // タイトルロゴのコマ（全部「暗い」で そろった列）
  const logo = $('#logoPieces');
  [0b0011, 0b1110, 0b0111, 0b1010].forEach((p) => {
    const c = document.createElement('div');
    c.className = 'mini-cell';
    c.appendChild(buildPieceVisual(p));
    logo.appendChild(c);
  });

  // タイトル背景にふわふわ浮くコマ
  const bg = $('#titleBg');
  const spots = [
    [6, 8], [82, 6], [10, 72], [86, 70], [50, 4], [30, 90], [70, 92], [92, 40]
  ];
  spots.forEach(([x, y], i) => {
    const f = document.createElement('div');
    f.className = 'floater';
    f.style.left = `${x}%`;
    f.style.top = `${y}%`;
    f.style.setProperty('--d', `${7 + (i % 4) * 1.3}s`);
    f.style.setProperty('--delay', `${-i * 1.1}s`);
    f.innerHTML = pieceSVG((i * 5 + 3) & 0xf);
    bg.appendChild(f);
  });

  // ルール内のコマ
  const set = (id, ...pieces) => {
    const el = document.getElementById(id);
    pieces.forEach((p) => el.appendChild(buildPieceVisual(p)));
  };
  set('rule-attr-1', 0b0001, 0b0011); // 明/暗（高い・丸・穴なし）
  set('rule-attr-2', 0b0011, 0b0010); // 高/低
  set('rule-attr-3', 0b0011, 0b0111); // 丸/四角
  set('rule-attr-4', 0b1011, 0b0011); // 穴あり/なし
  const winLine = document.getElementById('rule-win-line');
  [0b0011, 0b1110, 0b0111, 0b1010].forEach((p) => {
    const cell = document.createElement('div');
    cell.className = 'mini-cell';
    cell.appendChild(buildPieceVisual(p));
    winLine.appendChild(cell);
  });
}

// ==========================================================================
// 紙吹雪
// ==========================================================================
function launchConfetti() {
  const canvas = $('#confetti');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
  };
  resize();
  const W = () => canvas.width;
  const H = () => canvas.height;
  const colors = ['#ffd54a', '#ff9f43', '#4cc3ff', '#ff7aa8', '#86efac', '#c4b5fd', '#fff'];
  const pieces = Array.from({ length: 160 }, () => ({
    x: Math.random() * W(),
    y: -20 * dpr - Math.random() * H() * 0.4,
    vx: (Math.random() - 0.5) * 3 * dpr,
    vy: (2 + Math.random() * 4) * dpr,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.22,
    size: (6 + Math.random() * 8) * dpr,
    round: Math.random() < 0.3,
    color: rand(colors)
  }));
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    ctx.clearRect(0, 0, W(), H());
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06 * dpr;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      }
      ctx.restore();
    }
    if (elapsed < 4200) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, W(), H());
  }
  requestAnimationFrame(tick);
}

// ==========================================================================
// イベント
// ==========================================================================
function bindEvents() {
  // 盤 / ラック（イベント委譲）
  $('#board').addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    onCellClick(Number(cell.dataset.index));
  });
  $('#rack').addEventListener('click', (e) => {
    const item = e.target.closest('.rack-item');
    if (!item || item.disabled) return;
    sound.select();
    onRackClick(Number(item.dataset.piece));
  });
  $('#undoBtn').addEventListener('click', undo);

  // ヘッダー
  $('#rulesBtn').addEventListener('click', () => {
    sound.tap();
    showOverlay('#rules');
  });
  $('#muteBtn').addEventListener('click', () => {
    settings.sound = !settings.sound;
    saveSettings();
    renderChrome();
    renderSettings();
    sound.tap();
  });
  $('#menuBtn').addEventListener('click', () => {
    sound.tap();
    showOverlay('#menu');
  });

  // タイトル
  $('#startPvpBtn').addEventListener('click', () => {
    sound.tap();
    startGame('pvp');
  });
  $('#startCpuBtn').addEventListener('click', () => {
    sound.tap();
    renderCpuLevelSeg();
    $('#cpuPick').classList.toggle('hidden');
  });
  $('#cpuLevelSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-level]');
    if (!b) return;
    sound.select();
    settings.cpuLevel = b.dataset.level;
    saveSettings();
    renderCpuLevelSeg();
  });
  $('#cpuGoBtn').addEventListener('click', () => {
    sound.tap();
    startGame('cpu');
  });
  $('#titleRulesBtn').addEventListener('click', () => {
    sound.tap();
    showOverlay('#rules');
  });
  $('#titleSettingsBtn').addEventListener('click', () => {
    sound.tap();
    renderSettings();
    showOverlay('#settings');
  });

  // メニュー
  const closeMenu = () => hideOverlay('#menu');
  $('#menuClose').addEventListener('click', closeMenu);
  $('#menuResume').addEventListener('click', () => {
    sound.tap();
    closeMenu();
  });
  $('#menuRestart').addEventListener('click', () => {
    sound.tap();
    closeMenu();
    startRound({ keepScores: true });
  });
  $('#menuRules').addEventListener('click', () => {
    sound.tap();
    closeMenu();
    showOverlay('#rules');
  });
  $('#menuSettings').addEventListener('click', () => {
    sound.tap();
    closeMenu();
    renderSettings();
    showOverlay('#settings');
  });
  $('#menuTitle2').addEventListener('click', () => {
    sound.tap();
    showTitle();
  });
  $('#menu').addEventListener('click', (e) => {
    if (e.target.id === 'menu') closeMenu();
  });

  // 設定
  bindSwitch('#optSound', 'sound', () => renderChrome());
  bindSwitch('#optHints', 'hints');
  bindSwitch('#optFace', 'face');
  bindSwitch('#optHaptics', 'haptics');
  $('#settingsClose').addEventListener('click', () => hideOverlay('#settings'));
  $('#settingsOk').addEventListener('click', () => {
    sound.tap();
    hideOverlay('#settings');
  });
  $('#settings').addEventListener('click', (e) => {
    if (e.target.id === 'settings') hideOverlay('#settings');
  });
  $('#resetRecordsBtn').addEventListener('click', () => {
    if (!confirm('通算成績を 0 に もどします。いいですか？')) return;
    Object.assign(records, structuredClone(DEFAULT_RECORDS));
    saveRecords();
    renderRecordLine();
    sound.undo();
  });

  // ルール
  $('#rulesClose').addEventListener('click', () => hideOverlay('#rules'));
  $('#rulesOk').addEventListener('click', () => {
    sound.tap();
    hideOverlay('#rules');
  });
  $('#rules').addEventListener('click', (e) => {
    if (e.target.id === 'rules') hideOverlay('#rules');
  });

  // リザルト
  $('#resultAgainBtn').addEventListener('click', () => {
    sound.tap();
    startRound({ keepScores: true, starter: nextRoundStarter() });
  });
  $('#resultTitleBtn').addEventListener('click', () => {
    sound.tap();
    showTitle();
  });

  // キーボード
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (anyOverlayOpen()) {
        ['#menu', '#settings', '#rules'].forEach(hideOverlay);
      } else if (state.inGame) {
        showOverlay('#menu');
      }
    }
  });

  // リサイズ: 勝利ライン再計算 / 対面モードの切替
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      drawWinLine(false);
      renderChrome();
      renderTray();
    }, 80);
  });
  layoutMQ.addEventListener?.('change', () => {
    renderChrome();
    renderTray();
  });

  // 初回タップでオーディオ解放
  document.addEventListener('pointerdown', () => sound.tap(), { once: true });
}

// ==========================================================================
// 起動
// ==========================================================================
function init() {
  decorate();
  bindEvents();
  renderSettings();
  renderCpuLevelSeg();
  renderAll();
  showTitle();
}

init();
