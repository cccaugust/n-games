// コリドール (Quoridor) - 2人対戦 / CPU対戦
// 9x9マス、各プレイヤー 10枚（または6枚）の壁

// ==== 定数 ====
const SIZE = 9;
const N = SIZE * SIZE;
const CELL = 50;      // SVG内 1マスの辺
const GAP = 12;       // 壁の幅 (マス間の隙間)
const STEP = CELL + GAP;
const BOARD_PX = SIZE * CELL + (SIZE - 1) * GAP; // 546
const PAD = 8;
const VIEW = BOARD_PX + PAD * 2;
const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const SVG_NS = 'http://www.w3.org/2000/svg';

const PLAYERS = [
  { id: 1, name: 'プレイヤー1', color: '#38bdf8', accent: '#e0f2fe', goal: 0, start: { c: 4, r: SIZE - 1 }, glyph: '▲' },
  { id: 2, name: 'プレイヤー2', color: '#f472b6', accent: '#fce7f3', goal: SIZE - 1, start: { c: 4, r: 0 }, glyph: '▼' }
];
const LEVEL_LABEL = { easy: 'やさしい', normal: 'ふつう', hard: 'つよい' };
const STORAGE_SETTINGS = 'corridor.settings.v2';
const STORAGE_STATS = 'corridor.stats.v1';

// ==== 盤モデル（純粋ロジック。UIに依存しない） ====
class Board {
  constructor(wallsPer = 10, firstTurn = 0) {
    this.h = new Uint8Array(N);     // h[r*9+c]=1: (c,r)と(c,r+1)の間が壁
    this.v = new Uint8Array(N);     // v[r*9+c]=1: (c,r)と(c+1,r)の間が壁
    this.anchor = new Uint8Array(64); // 交点 r*8+c: 0なし / 1よこ / 2たて
    this.walls = [];                // [{ o:'h'|'v', c, r, by }]
    this.pawns = PLAYERS.map(p => ({ ...p.start }));
    this.wallsLeft = [wallsPer, wallsPer];
    this.turn = firstTurn;          // 0 or 1 (PLAYERS index)
    this.moveCount = 0;
  }
  clone() {
    const b = Object.create(Board.prototype);
    b.h = this.h.slice(); b.v = this.v.slice(); b.anchor = this.anchor.slice();
    b.walls = this.walls.slice();
    b.pawns = this.pawns.map(p => ({ ...p }));
    b.wallsLeft = [...this.wallsLeft];
    b.turn = this.turn; b.moveCount = this.moveCount;
    return b;
  }
  static goalRow(pi) { return PLAYERS[pi].goal; }
  pawnAt(c, r) { return this.pawns.findIndex(p => p.c === c && p.r === r); }
  canStep(c, r, dc, dr) {
    const nc = c + dc, nr = r + dr;
    if (nc < 0 || nc >= SIZE || nr < 0 || nr >= SIZE) return false;
    if (dr === 1) return !this.h[r * SIZE + c];
    if (dr === -1) return !this.h[nr * SIZE + c];
    if (dc === 1) return !this.v[r * SIZE + c];
    return !this.v[r * SIZE + nc];
  }
  conflict(o, c, r) {
    if (c < 0 || c > SIZE - 2 || r < 0 || r > SIZE - 2) return true;
    const a = this.anchor;
    if (a[r * 8 + c]) return true;
    if (o === 'h') return (c > 0 && a[r * 8 + c - 1] === 1) || (c < 7 && a[r * 8 + c + 1] === 1);
    return (r > 0 && a[(r - 1) * 8 + c] === 2) || (r < 7 && a[(r + 1) * 8 + c] === 2);
  }
  setWall(o, c, r, on) {
    const val = on ? 1 : 0;
    if (o === 'h') { this.h[r * SIZE + c] = val; this.h[r * SIZE + c + 1] = val; }
    else { this.v[r * SIZE + c] = val; this.v[(r + 1) * SIZE + c] = val; }
    this.anchor[r * 8 + c] = on ? (o === 'h' ? 1 : 2) : 0;
  }
  // ゴール行からの多始点BFS。各マスのゴールまでの歩数（-1=到達不能）
  distMap(pi) {
    const goal = Board.goalRow(pi);
    const d = new Int16Array(N).fill(-1);
    const q = new Int16Array(N);
    let qh = 0, qt = 0;
    for (let c = 0; c < SIZE; c++) { const i = goal * SIZE + c; d[i] = 0; q[qt++] = i; }
    while (qh < qt) {
      const i = q[qh++];
      const c = i % SIZE, r = (i - c) / SIZE;
      const nd = d[i] + 1;
      for (let k = 0; k < 4; k++) {
        const dc = DIRS[k][0], dr = DIRS[k][1];
        if (!this.canStep(c, r, dc, dr)) continue;
        const j = (r + dr) * SIZE + c + dc;
        if (d[j] !== -1) continue;
        d[j] = nd; q[qt++] = j;
      }
    }
    return d;
  }
  dist(pi) {
    const p = this.pawns[pi];
    return this.distMap(pi)[p.r * SIZE + p.c];
  }
  isWallLegal(o, c, r, pi = this.turn) {
    if (this.wallsLeft[pi] <= 0) return { ok: false, reason: 'none' };
    if (this.conflict(o, c, r)) return { ok: false, reason: 'conflict' };
    this.setWall(o, c, r, true);
    const ok = this.dist(0) >= 0 && this.dist(1) >= 0;
    this.setWall(o, c, r, false);
    return ok ? { ok: true } : { ok: false, reason: 'no-path' };
  }
  placeWall(o, c, r) {
    this.setWall(o, c, r, true);
    this.walls.push({ o, c, r, by: this.turn });
    this.wallsLeft[this.turn]--;
    this.endTurn();
  }
  legalMoves(pi = this.turn) {
    const me = this.pawns[pi];
    const out = [];
    for (const [dc, dr] of DIRS) {
      if (!this.canStep(me.c, me.r, dc, dr)) continue;
      const nc = me.c + dc, nr = me.r + dr;
      if (this.pawnAt(nc, nr) < 0) { out.push({ c: nc, r: nr }); continue; }
      // 相手がいる: 飛び越え
      if (this.canStep(nc, nr, dc, dr) && this.pawnAt(nc + dc, nr + dr) < 0) {
        out.push({ c: nc + dc, r: nr + dr, jump: true });
      } else {
        // 向こうが壁/盤外: 斜めに回り込む
        const perps = dc === 0 ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
        for (const [pdc, pdr] of perps) {
          if (!this.canStep(nc, nr, pdc, pdr)) continue;
          if (this.pawnAt(nc + pdc, nr + pdr) >= 0) continue;
          out.push({ c: nc + pdc, r: nr + pdr, jump: true });
        }
      }
    }
    return out;
  }
  movePawn(c, r) {
    const p = this.pawns[this.turn];
    p.c = c; p.r = r;
    this.endTurn();
  }
  endTurn() { this.turn = 1 - this.turn; this.moveCount++; }
  winner() {
    for (let pi = 0; pi < 2; pi++) if (this.pawns[pi].r === Board.goalRow(pi)) return pi;
    return -1;
  }
}

// ==== CPU ====
const AI = {
  evaluate(board, me) {
    const opp = 1 - me;
    const dm = board.dist(me), dop = board.dist(opp);
    if (dm === 0) return 1000;
    if (dop === 0) return -1000;
    return (dop - dm) + 0.35 * (board.wallsLeft[me] - board.wallsLeft[opp]);
  },
  apply(board, act) {
    const b = board.clone();
    if (act.type === 'move') b.movePawn(act.c, act.r); else b.placeWall(act.o, act.c, act.r);
    return b;
  },
  // 候補: 全ての合法移動 + 「相手の道のりを伸ばす」合法な壁（効果順に上位だけ）
  candidates(board, me, maxWalls = 18) {
    const opp = 1 - me;
    const acts = board.legalMoves(me).map(m => ({ type: 'move', c: m.c, r: m.r }));
    if (board.wallsLeft[me] > 0) {
      const base = board.dist(opp), baseMe = board.dist(me);
      const walls = [];
      for (let r = 0; r < SIZE - 1; r++) for (let c = 0; c < SIZE - 1; c++) for (const o of ['h', 'v']) {
        if (board.conflict(o, c, r)) continue;
        board.setWall(o, c, r, true);
        const dOpp = board.dist(opp), dMe = board.dist(me);
        board.setWall(o, c, r, false);
        if (dOpp < 0 || dMe < 0) continue;
        const gain = (dOpp - base) - (dMe - baseMe);
        if (dOpp - base >= 1) walls.push({ type: 'wall', o, c, r, gain });
      }
      walls.sort((a, b) => b.gain - a.gain);
      acts.push(...walls.slice(0, maxWalls));
    }
    return acts;
  },
  choose(board, level) {
    const me = board.turn, opp = 1 - me;
    const moves = board.legalMoves(me);
    const goal = Board.goalRow(me);
    const win = moves.find(m => m.r === goal);
    if (win) return { type: 'move', c: win.c, r: win.r };

    if (level === 'easy') {
      // 基本は最短路を進む。たまに壁、たまに寄り道
      const dmap = board.distMap(me);
      const roll = Math.random();
      if (roll < 0.22 && board.wallsLeft[me] > 0 && board.dist(opp) <= 5) {
        const walls = this.candidates(board, me, 8).filter(a => a.type === 'wall');
        if (walls.length) return walls[(Math.random() * Math.min(3, walls.length)) | 0];
      }
      if (roll > 0.85) return pick(moves.map(m => ({ type: 'move', c: m.c, r: m.r })));
      moves.sort((a, b) => dmap[a.r * SIZE + a.c] - dmap[b.r * SIZE + b.c]);
      const best = moves[0];
      return { type: 'move', c: best.c, r: best.r };
    }

    const cands = this.candidates(board, me, level === 'hard' ? 16 : 24);
    const scored = cands.map(act => {
      const b1 = this.apply(board, act);
      let score;
      if (b1.winner() === me) score = 1000;
      else if (level === 'normal') {
        score = this.evaluate(b1, me) + Math.random() * 0.4;
      } else {
        // 相手の最善応手（1手読み）を仮定して評価
        const replies = this.candidates(b1, opp, 12);
        let worst = Infinity;
        for (const rep of replies) {
          const b2 = this.apply(b1, rep);
          const s = b2.winner() === opp ? -1000 : this.evaluate(b2, me);
          if (s < worst) worst = s;
          if (worst <= -1000) break;
        }
        score = (worst === Infinity ? this.evaluate(b1, me) : worst) + Math.random() * 0.15;
      }
      return { act, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].act;
  }
};
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

// ==== 設定 / 成績 (localStorage) ====
const DEFAULT_SETTINGS = { mode: 'pvp', level: 'normal', first: 'human', walls: 10, faceToFace: true, confirmMoves: false, muted: false };
function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback }; }
  catch { return { ...fallback }; }
}
function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ } }
const settings = loadJSON(STORAGE_SETTINGS, DEFAULT_SETTINGS);
const stats = loadJSON(STORAGE_STATS, { pvp: { 1: 0, 2: 0 }, cpu: { easy: { win: 0, lose: 0 }, normal: { win: 0, lose: 0 }, hard: { win: 0, lose: 0 } } });
const saveSettings = () => saveJSON(STORAGE_SETTINGS, settings);

// ==== 状態 ====
const state = {
  phase: 'menu',       // 'menu' | 'playing' | 'over'
  board: new Board(settings.walls),
  history: [],         // Board snapshots (undo用)
  mode: 'move',        // 'move' | 'wall'
  orient: 'h',         // 'h' | 'v'
  pending: null,       // { type:'wall', o, c, r, legal } | { type:'move', c, r }
  hover: null,         // マウスホバー中の壁候補 { o, c, r, legal }
  lastMove: null,      // { pi, from:{c,r}, to:{c,r} }
  lastWallKey: null,
  winner: -1,
  cpu: null,           // null | { pi, level }
  thinking: false,
  cpuTimer: 0
};
const humanTurn = () => state.phase === 'playing' && !(state.cpu && state.cpu.pi === state.board.turn);
const cur = () => PLAYERS[state.board.turn];
const nameOf = (pi) => {
  if (!state.cpu) return PLAYERS[pi].name;
  return state.cpu.pi === pi ? `CPU（${LEVEL_LABEL[state.cpu.level]}）` : 'あなた';
};

// ==== サウンド ====
const sound = (() => {
  let ctx = null;
  function ensure() {
    if (settings.muted) return null;
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone({ freq = 440, type = 'sine', dur = 0.12, vol = 0.16, slideTo = null, delay = 0 }) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + delay;
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
    tap: () => tone({ freq: 540, type: 'sine', dur: 0.05, vol: 0.07 }),
    select: () => tone({ freq: 660, type: 'triangle', dur: 0.07, vol: 0.12 }),
    move: () => tone({ freq: 520, type: 'sine', dur: 0.1, vol: 0.1, slideTo: 380 }),
    jump: () => { tone({ freq: 380, type: 'triangle', dur: 0.08, vol: 0.13 }); tone({ freq: 720, type: 'sine', dur: 0.1, vol: 0.12, delay: 0.06 }); },
    wall: () => { tone({ freq: 220, type: 'square', dur: 0.06, vol: 0.07 }); tone({ freq: 130, type: 'triangle', dur: 0.18, vol: 0.18, delay: 0.03 }); },
    preview: () => tone({ freq: 420, type: 'triangle', dur: 0.05, vol: 0.08 }),
    cancel: () => tone({ freq: 300, type: 'sine', dur: 0.08, vol: 0.08, slideTo: 200 }),
    undo: () => tone({ freq: 600, type: 'sine', dur: 0.14, vol: 0.1, slideTo: 300 }),
    invalid: () => tone({ freq: 160, type: 'sawtooth', dur: 0.16, vol: 0.12 }),
    turn: () => tone({ freq: 880, type: 'sine', dur: 0.08, vol: 0.06 }),
    win: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.28, vol: 0.16, delay: i * 0.09 })),
    lose: () => [392, 329.63, 261.63].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.12, delay: i * 0.14 }))
  };
})();

// ==== ユーティリティ ====
const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, cls = '') => {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (cls) n.setAttribute('class', cls);
  return n;
};
const cellXY = (c, r) => ({ x: PAD + c * STEP, y: PAD + r * STEP });
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wallKey = (o, c, r) => `${o}${c}${r}`;

// ==== ゲーム制御 ====
function startGame() {
  const cpuMode = settings.mode === 'cpu';
  state.board = new Board(settings.walls, cpuMode && settings.first === 'cpu' ? 1 : 0);
  state.history = [];
  state.mode = 'move';
  state.pending = null;
  state.hover = null;
  state.lastMove = null;
  state.lastWallKey = null;
  state.winner = -1;
  state.thinking = false;
  clearTimeout(state.cpuTimer);
  state.cpu = cpuMode ? { pi: 1, level: settings.level } : null;
  state.phase = 'playing';
  hideOverlay('menu'); hideOverlay('result');
  applyLayoutSettings();
  renderAll();
  showTurnToast();
  maybeCpuTurn();
}

function pushHistory() {
  state.history.push({ board: state.board.clone(), lastMove: state.lastMove, lastWallKey: state.lastWallKey });
  if (state.history.length > 200) state.history.shift();
}

function commitMove(c, r) {
  const b = state.board;
  const pi = b.turn;
  const from = { ...b.pawns[pi] };
  const isJump = Math.abs(c - from.c) + Math.abs(r - from.r) > 1;
  pushHistory();
  b.movePawn(c, r);
  state.lastMove = { pi, from, to: { c, r } };
  state.lastWallKey = null;
  state.pending = null;
  state.mode = 'move';
  if (isJump) sound.jump(); else sound.move();
  afterAction();
}

function commitWall(o, c, r) {
  const b = state.board;
  const legal = b.isWallLegal(o, c, r);
  if (!legal.ok) { sound.invalid(); flashHint(reasonText(legal.reason)); return; }
  pushHistory();
  b.placeWall(o, c, r);
  state.lastWallKey = wallKey(o, c, r);
  state.lastMove = null;
  state.pending = null;
  state.mode = 'move';
  sound.wall();
  afterAction();
}

function afterAction() {
  const w = state.board.winner();
  if (w >= 0) {
    state.winner = w;
    state.phase = 'over';
    renderAll();
    recordResult(w);
    setTimeout(() => {
      if (state.cpu && state.cpu.pi === w) sound.lose(); else sound.win();
      showResult();
      launchConfetti(PLAYERS[w].color);
    }, 450);
    return;
  }
  renderAll();
  showTurnToast();
  maybeCpuTurn();
}

function undo() {
  if (state.phase !== 'playing' || state.thinking || !state.history.length) { sound.invalid(); return; }
  let snap = state.history.pop();
  // CPU戦では自分の番に戻るまで（CPUの手も一緒に）戻す
  if (state.cpu && snap.board.turn === state.cpu.pi && state.history.length) snap = state.history.pop();
  state.board = snap.board;
  state.lastMove = snap.lastMove;
  state.lastWallKey = snap.lastWallKey;
  state.pending = null;
  state.mode = 'move';
  sound.undo();
  renderAll();
  maybeCpuTurn();
}

function setMode(mode) {
  if (!humanTurn()) return;
  if (mode === 'wall' && state.board.wallsLeft[state.board.turn] <= 0) { sound.invalid(); flashHint('壁がもうないよ'); return; }
  if (state.mode === mode) return;
  state.mode = mode;
  state.pending = null;
  state.hover = null;
  sound.tap();
  renderAll();
}
function setOrient(o) {
  if (!humanTurn()) return;
  if (state.orient === o && state.mode === 'wall') return;
  state.orient = o;
  state.mode = 'wall';
  if (state.pending && state.pending.type === 'wall') {
    setPendingWall(o, state.pending.c, state.pending.r, true);
  } else {
    state.pending = null;
  }
  sound.tap();
  renderAll();
}
function rotatePending() {
  if (!state.pending || state.pending.type !== 'wall') { setOrient(state.orient === 'h' ? 'v' : 'h'); return; }
  const o = state.pending.o === 'h' ? 'v' : 'h';
  state.orient = o;
  setPendingWall(o, state.pending.c, state.pending.r, true);
  sound.tap();
  renderAll();
}
function setPendingWall(o, c, r, silent = false) {
  const legal = state.board.isWallLegal(o, c, r);
  state.pending = { type: 'wall', o, c, r, legal };
  if (!silent) { if (legal.ok) sound.preview(); else sound.invalid(); }
}
function cancelPending() {
  if (!state.pending) return;
  state.pending = null;
  sound.cancel();
  renderAll();
}
function confirmPending() {
  const p = state.pending;
  if (!p || !humanTurn()) return;
  if (p.type === 'wall') {
    if (!p.legal.ok) { sound.invalid(); flashHint(reasonText(p.legal.reason)); return; }
    commitWall(p.o, p.c, p.r);
  } else {
    commitMove(p.c, p.r);
  }
}
function reasonText(reason) {
  if (reason === 'conflict') return 'ほかの壁とぶつかるよ';
  if (reason === 'no-path') return 'そこに置くと ゴールへの道がなくなるよ';
  if (reason === 'none') return '壁がもうないよ';
  return 'そこには置けないよ';
}

// タップ位置 → 壁候補へスナップ（同じ列/行の近い候補のうち合法なものを優先）
function snapWall(x, y, o) {
  const b = state.board;
  const gapX = (x - PAD - CELL - GAP / 2) / STEP; // 交点列（0..7）実数
  const gapY = (y - PAD - CELL - GAP / 2) / STEP;
  let c, r;
  if (o === 'h') {
    r = clamp(Math.round(gapY), 0, 7);
    const c0 = clamp(Math.round(gapX), 0, 7);
    const alt = gapX < c0 ? c0 - 1 : c0 + 1;
    const order = [c0, alt].filter(v => v >= 0 && v <= 7);
    c = order.find(v => !b.conflict('h', v, r));
    if (c === undefined) c = c0;
  } else {
    c = clamp(Math.round(gapX), 0, 7);
    const r0 = clamp(Math.round(gapY), 0, 7);
    const alt = gapY < r0 ? r0 - 1 : r0 + 1;
    const order = [r0, alt].filter(v => v >= 0 && v <= 7);
    r = order.find(v => !b.conflict('v', c, v));
    if (r === undefined) r = r0;
  }
  return { o, c, r };
}

function onBoardTap(x, y) {
  if (!humanTurn() || state.thinking) return;
  const b = state.board;
  if (state.mode === 'wall') {
    if (b.wallsLeft[b.turn] <= 0) { sound.invalid(); flashHint('壁がもうないよ'); return; }
    const { o, c, r } = snapWall(x, y, state.orient);
    const p = state.pending;
    if (p && p.type === 'wall' && p.o === o && p.c === c && p.r === r) { confirmPending(); return; }
    setPendingWall(o, c, r);
    if (!state.pending.legal.ok) flashHint(reasonText(state.pending.legal.reason));
    renderAll();
    return;
  }
  // 移動モード: タップしたマス
  const c = clamp(Math.round((x - PAD - CELL / 2) / STEP), 0, SIZE - 1);
  const r = clamp(Math.round((y - PAD - CELL / 2) / STEP), 0, SIZE - 1);
  const moves = b.legalMoves();
  const target = moves.find(m => m.c === c && m.r === r);
  if (!target) {
    if (state.pending) { cancelPending(); return; }
    const me = b.pawns[b.turn];
    if (me.c === c && me.r === r) { sound.select(); return; }
    sound.tap();
    return;
  }
  if (settings.confirmMoves) {
    const p = state.pending;
    if (p && p.type === 'move' && p.c === c && p.r === r) { confirmPending(); return; }
    state.pending = { type: 'move', c, r };
    sound.preview();
    renderAll();
    return;
  }
  commitMove(c, r);
}

function moveByKey(dc, dr) {
  if (!humanTurn() || state.thinking) return;
  const b = state.board;
  const me = b.pawns[b.turn];
  const moves = b.legalMoves();
  // 指定方向にある候補（最も近いもの）
  const cand = moves
    .filter(m => Math.sign(m.c - me.c) === dc && Math.sign(m.r - me.r) === dr)
    .sort((a, b2) => Math.abs(a.c - me.c) + Math.abs(a.r - me.r) - Math.abs(b2.c - me.c) - Math.abs(b2.r - me.r));
  if (!cand.length) { sound.invalid(); return; }
  state.mode = 'move';
  if (settings.confirmMoves) { state.pending = { type: 'move', c: cand[0].c, r: cand[0].r }; sound.preview(); renderAll(); }
  else commitMove(cand[0].c, cand[0].r);
}

// ==== CPU ====
function maybeCpuTurn() {
  if (state.phase !== 'playing' || !state.cpu || state.cpu.pi !== state.board.turn) return;
  state.thinking = true;
  state.pending = null;
  state.mode = 'move';
  renderAll();
  const delay = 500 + Math.random() * 400;
  clearTimeout(state.cpuTimer);
  state.cpuTimer = setTimeout(() => {
    if (state.phase !== 'playing' || !state.cpu) { state.thinking = false; return; }
    const act = AI.choose(state.board, state.cpu.level);
    state.thinking = false;
    if (act.type === 'move') commitMove(act.c, act.r);
    else commitWall(act.o, act.c, act.r);
  }, delay);
}

// ==== レンダリング ====
const layers = {};
function buildBoard() {
  const svg = $('#board');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${VIEW} ${VIEW}`);

  const defs = el('defs');
  const grad = el('linearGradient', { id: 'woodGrad', x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.appendChild(el('stop', { offset: '0%', 'stop-color': '#b9843c' }));
  grad.appendChild(el('stop', { offset: '55%', 'stop-color': '#8a5a27' }));
  grad.appendChild(el('stop', { offset: '100%', 'stop-color': '#5e3d1b' }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  for (const name of ['cells', 'marks', 'walls', 'slots', 'ghost', 'pawns', 'fx']) {
    layers[name] = el('g', {}, `layer-${name}`);
    svg.appendChild(layers[name]);
  }

  // セル
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const { x, y } = cellXY(c, r);
    const rect = el('rect', { x, y, width: CELL, height: CELL, rx: 8 }, 'cell');
    if (r === PLAYERS[0].goal) rect.classList.add('goal-p1');
    if (r === PLAYERS[1].goal) rect.classList.add('goal-p2');
    rect.dataset.c = String(c); rect.dataset.r = String(r);
    layers.cells.appendChild(rect);
  }
  // ゴールの旗マーク（両端）
  for (const p of PLAYERS) {
    for (const c of [0, SIZE - 1]) {
      const { x, y } = cellXY(c, p.goal);
      const t = el('text', { x: x + CELL / 2, y: y + CELL / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: p.color }, 'goal-mark');
      t.textContent = '🏁';
      layers.marks.appendChild(t);
    }
  }
  // 交点ドット（壁モードで表示）
  for (let r = 0; r < SIZE - 1; r++) for (let c = 0; c < SIZE - 1; c++) {
    const { x, y } = cellXY(c, r);
    const dot = el('circle', { cx: x + CELL + GAP / 2, cy: y + CELL + GAP / 2, r: 4.5 }, 'anchor-dot');
    dot.dataset.c = String(c); dot.dataset.r = String(r);
    layers.marks.appendChild(dot);
  }
  // ポーン
  PLAYERS.forEach((p, pi) => {
    const g = el('g', {}, 'pawn');
    g.style.setProperty('--c', p.color);
    g.dataset.pi = String(pi);
    g.appendChild(el('circle', { cx: 2, cy: 3, r: CELL * 0.4 }, 'pawn-shadow'));
    g.appendChild(el('circle', { r: CELL * 0.4, fill: p.color }, 'pawn-body'));
    g.appendChild(el('circle', { r: CELL * 0.26, fill: p.accent }, 'pawn-inner'));
    const label = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: p.color }, 'pawn-label');
    label.textContent = p.glyph;
    g.appendChild(label);
    g.appendChild(el('circle', { r: CELL * 0.47 }, 'pawn-ring'));
    layers.pawns.appendChild(g);
  });

  // 入力: 1つのハンドラで座標から判定（タップ領域を広く・確実に）
  const toSvg = (ev) => {
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  svg.addEventListener('click', (ev) => {
    const p = toSvg(ev); if (!p) return;
    onBoardTap(p.x, p.y);
  });
  svg.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    if (!humanTurn() || state.mode !== 'wall' || state.thinking) { if (state.hover) { state.hover = null; renderGhost(); } return; }
    const p = toSvg(ev); if (!p) return;
    const w = snapWall(p.x, p.y, state.orient);
    if (state.hover && state.hover.c === w.c && state.hover.r === w.r && state.hover.o === w.o) return;
    state.hover = { ...w, legal: state.board.isWallLegal(w.o, w.c, w.r) };
    renderGhost();
  });
  svg.addEventListener('pointerleave', () => { if (state.hover) { state.hover = null; renderGhost(); } });
}

function renderAll() {
  renderBoard();
  renderSides();
  fitBoard();
}

function renderBoard() {
  const b = state.board;
  const svg = $('#board');
  const playing = state.phase === 'playing';
  const human = humanTurn();
  const me = cur();
  svg.classList.toggle('thinking', state.thinking);
  svg.style.setProperty('--c', me.color);

  // セル状態
  const moves = (playing && human && state.mode === 'move') ? b.legalMoves() : [];
  const movKeys = new Set(moves.map(m => `${m.c},${m.r}`));
  layers.fx.innerHTML = '';
  for (const rect of layers.cells.children) {
    const c = +rect.dataset.c, r = +rect.dataset.r;
    const key = `${c},${r}`;
    rect.classList.toggle('movable', movKeys.has(key));
    rect.classList.toggle('target', !!(state.pending && state.pending.type === 'move' && state.pending.c === c && state.pending.r === r));
    rect.classList.toggle('dim', playing && state.mode === 'wall' && human);
    rect.classList.toggle('last-from', !!(state.lastMove && state.lastMove.from.c === c && state.lastMove.from.r === r));
    if (movKeys.has(key)) {
      const { x, y } = cellXY(c, r);
      layers.fx.appendChild(el('circle', { cx: x + CELL / 2, cy: y + CELL / 2, r: 6 }, 'move-dot'));
    }
  }
  if (state.lastMove) {
    const p = PLAYERS[state.lastMove.pi];
    const rect = layers.cells.children[state.lastMove.from.r * SIZE + state.lastMove.from.c];
    rect.style.setProperty('--c', p.color);
  }

  // 交点ドット（壁モード時のみ）
  const showDots = playing && human && state.mode === 'wall' && b.wallsLeft[b.turn] > 0;
  for (const dot of layers.marks.querySelectorAll('.anchor-dot')) {
    const c = +dot.dataset.c, r = +dot.dataset.r;
    dot.classList.remove('legal', 'blocked');
    dot.style.display = showDots ? '' : 'none';
    if (!showDots) continue;
    const legal = b.isWallLegal(state.orient, c, r);
    if (legal.ok) dot.classList.add('legal');
    else if (legal.reason === 'no-path') dot.classList.add('blocked');
    else dot.style.display = 'none';
  }
  // 向きのガイド帯
  layers.slots.innerHTML = '';
  if (showDots) {
    for (let i = 0; i < SIZE - 1; i++) {
      const pos = PAD + i * STEP + CELL;
      const band = state.orient === 'h'
        ? el('rect', { x: PAD, y: pos, width: BOARD_PX, height: GAP, rx: 3 }, 'slot-band')
        : el('rect', { x: pos, y: PAD, width: GAP, height: BOARD_PX, rx: 3 }, 'slot-band');
      layers.slots.appendChild(band);
    }
  }

  // 壁（差分更新）
  const present = new Set();
  for (const w of b.walls) {
    const key = wallKey(w.o, w.c, w.r);
    present.add(key);
    let g = layers.walls.querySelector(`[data-key="${key}"]`);
    if (!g) {
      g = el('g', {}, 'wall new');
      g.dataset.key = key;
      g.appendChild(wallRect(w.o, w.c, w.r));
      g.style.setProperty('--owner', PLAYERS[w.by].color + '99');
      layers.walls.appendChild(g);
      setTimeout(() => g.classList.remove('new'), 400);
    }
    g.classList.toggle('last', key === state.lastWallKey);
  }
  for (const g of [...layers.walls.children]) if (!present.has(g.dataset.key)) g.remove();

  // ポーン
  b.pawns.forEach((p, pi) => {
    const g = layers.pawns.children[pi];
    const { x, y } = cellXY(p.c, p.r);
    g.setAttribute('transform', `translate(${x + CELL / 2}, ${y + CELL / 2})`);
    g.classList.toggle('my-turn', playing && pi === b.turn && !state.thinking);
  });

  renderGhost();
}

function wallRect(o, c, r) {
  const { x, y } = cellXY(c, r);
  return o === 'h'
    ? el('rect', { x, y: y + CELL, width: 2 * CELL + GAP, height: GAP, rx: 3 }, 'body')
    : el('rect', { x: x + CELL, y, width: GAP, height: 2 * CELL + GAP, rx: 3 }, 'body');
}

function renderGhost() {
  layers.ghost.innerHTML = '';
  const p = state.pending;
  if (p && p.type === 'wall') {
    const g = el('g', {}, 'ghost' + (p.legal.ok ? '' : ' bad'));
    g.appendChild(wallRect(p.o, p.c, p.r));
    const { x, y } = cellXY(p.c, p.r);
    const mark = el('text', { x: x + CELL + GAP / 2, y: y + CELL + GAP / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, 'mark');
    mark.textContent = p.legal.ok ? '✓' : '✕';
    g.appendChild(mark);
    layers.ghost.appendChild(g);
  } else if (state.hover && state.mode === 'wall') {
    const h = state.hover;
    const g = el('g', {}, 'ghost hover' + (h.legal.ok ? '' : ' bad'));
    g.appendChild(wallRect(h.o, h.c, h.r));
    layers.ghost.appendChild(g);
  }
  if (p && p.type === 'move') {
    const pi = state.board.turn;
    const src = layers.pawns.children[pi];
    const g = src.cloneNode(true);
    g.classList.add('ghost-pawn');
    g.classList.remove('my-turn');
    const { x, y } = cellXY(p.c, p.r);
    g.setAttribute('transform', `translate(${x + CELL / 2}, ${y + CELL / 2})`);
    layers.ghost.appendChild(g);
  }
}

// ---- サイド（パネル + 操作） ----
function renderSides() {
  const top = $('#side-top'), bottom = $('#side-bottom');
  top.innerHTML = ''; bottom.innerHTML = '';
  const topPi = 1, bottomPi = 0;
  top.appendChild(panelEl(topPi));
  bottom.appendChild(panelEl(bottomPi));
  bottom.appendChild(controlsEl(bottomPi));
  if (!state.cpu && settings.faceToFace) top.appendChild(controlsEl(topPi));
}

function panelEl(pi) {
  const b = state.board;
  const p = PLAYERS[pi];
  const div = document.createElement('div');
  div.className = 'panel';
  div.style.setProperty('--c', p.color);
  if (state.phase === 'playing' && b.turn === pi) div.classList.add('active');
  if (state.winner === pi) div.classList.add('winner');
  const dist = b.dist(pi);
  const total = settings.walls;
  const pips = Array.from({ length: total }, (_, i) => `<span class="wall-pip${i < b.wallsLeft[pi] ? '' : ' used'}"></span>`).join('');
  div.innerHTML = `
    <div class="panel-name"><span class="panel-dot"></span><span>${nameOf(pi)}</span></div>
    <div class="panel-mid">${panelStatus(pi, dist)}</div>
    <div class="panel-walls" title="のこりの壁"><span class="wall-ico">🧱</span>${pips}<span class="num">${b.wallsLeft[pi]}</span></div>
  `;
  return div;
}
function panelStatus(pi, dist) {
  if (state.phase === 'over') return state.winner === pi ? '🏆 ゴール！' : 'おしい！';
  if (state.phase !== 'playing') return '';
  const distHtml = `<span class="panel-dist"><span class="long">ゴールまで </span>あと <b>${dist < 0 ? '?' : dist}</b> 歩</span>`;
  if (state.board.turn === pi && state.cpu && state.cpu.pi === pi) return '考え中…';
  return distHtml;
}

function controlsEl(pi) {
  const b = state.board;
  const p = PLAYERS[pi];
  const active = state.phase === 'playing' && b.turn === pi && !state.thinking;
  const div = document.createElement('div');
  div.className = 'controls' + (active ? '' : ' inactive') + (active && state.mode === 'wall' ? ' wall' : '');
  div.style.setProperty('--c', p.color);
  const wallsLeft = b.wallsLeft[pi];
  const inWall = active && state.mode === 'wall';
  const canUndo = active && state.history.length > 0;
  div.innerHTML = `
    <div class="controls-row">
      <div class="controls-left">
        <div class="seg act-seg" role="group" aria-label="行動">
          <button data-act="move" class="${!inWall ? 'on' : ''}" aria-pressed="${!inWall}" aria-label="うごく">🚶<span class="lbl2"> うごく</span></button>
          <button data-act="wall" class="${inWall ? 'on' : ''}" aria-pressed="${inWall}" ${wallsLeft <= 0 ? 'disabled' : ''} aria-label="かべ">🧱<span class="lbl2"> かべ</span> <span class="count">${wallsLeft}</span></button>
        </div>
        <div class="seg orient-seg${inWall ? '' : ' off'}" role="group" aria-label="壁の向き">
          <button data-orient="h" class="${state.orient === 'h' ? 'on' : ''}" aria-pressed="${state.orient === 'h'}"><span class="orient-icon h"></span>よこ</button>
          <button data-orient="v" class="${state.orient === 'v' ? 'on' : ''}" aria-pressed="${state.orient === 'v'}"><span class="orient-icon v"></span>たて</button>
        </div>
      </div>
      <button class="btn ghost sm" data-act="undo" ${canUndo ? '' : 'disabled'} aria-label="ひとつ前に戻す">↩<span class="lbl"> もどす</span></button>
    </div>
    ${hintOrConfirmHtml(pi)}
  `;
  div.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn || btn.disabled) return;
    if (btn.dataset.act === 'move') setMode('move');
    else if (btn.dataset.act === 'wall') setMode('wall');
    else if (btn.dataset.act === 'undo') undo();
    else if (btn.dataset.act === 'cancel') cancelPending();
    else if (btn.dataset.act === 'rotate') rotatePending();
    else if (btn.dataset.act === 'confirm') confirmPending();
    else if (btn.dataset.orient) setOrient(btn.dataset.orient);
  });
  return div;
}

function hintOrConfirmHtml(pi) {
  const b = state.board;
  const p = state.pending;
  if (state.phase !== 'playing' || b.turn !== pi) return `<div class="hint">${state.phase === 'over' ? 'おつかれさま！' : '相手の番…'}</div>`;
  if (state.thinking) return `<div class="hint think">CPUが考え中<span class="dots"></span></div>`;
  if (p && p.type === 'wall') {
    const ok = p.legal.ok;
    return `<div class="confirm-bar">
      <button class="btn ghost sm" data-act="cancel">やめる</button>
      <button class="btn ghost sm" data-act="rotate">🔄 回転</button>
      <button class="btn ok" data-act="confirm" ${ok ? '' : 'disabled'}>${ok ? '✓ ここに置く' : reasonText(p.legal.reason)}</button>
    </div>`;
  }
  if (p && p.type === 'move') {
    return `<div class="confirm-bar">
      <button class="btn ghost sm" data-act="cancel">やめる</button>
      <button class="btn ok" data-act="confirm">✓ ここに進む</button>
    </div>`;
  }
  if (state.mode === 'wall') {
    return `<div class="hint">${state.orient === 'h' ? 'よこ' : 'たて'}の壁：置きたい場所をタップ</div>`;
  }
  return `<div class="hint">光っているマスをタップして進む</div>`;
}

let hintTimer = 0;
function flashHint(msg) {
  const hints = document.querySelectorAll('.controls:not(.inactive) .hint, .controls:not(.inactive) .confirm-bar');
  hints.forEach(h => {
    if (h.classList.contains('confirm-bar')) {
      const btn = h.querySelector('[data-act="confirm"]');
      if (btn) { btn.classList.add('warn'); setTimeout(() => btn.classList.remove('warn'), 400); }
      return;
    }
    h.textContent = msg;
    h.classList.add('warn');
  });
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { if (state.phase === 'playing') renderSides(); }, 1500);
}

// ターン表示トースト
let toastTimer = 0;
function showTurnToast() {
  if (state.phase !== 'playing') return;
  const toast = $('#turnToast');
  const pi = state.board.turn;
  const p = PLAYERS[pi];
  toast.style.setProperty('--c', p.color);
  toast.textContent = state.cpu && state.cpu.pi === pi ? `${nameOf(pi)} の番` : `${p.glyph} ${nameOf(pi)} の番！`;
  toast.classList.toggle('flip', pi === 1 && settings.faceToFace && !state.cpu);
  toast.classList.add('show');
  if (!(state.cpu && state.cpu.pi === pi)) sound.turn();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), state.cpu ? 700 : 1000);
}

// 盤のサイズを画面に収める（スクロールなしで全部見える）
const landscapeMQ = window.matchMedia('(orientation: landscape) and (max-height: 720px), (orientation: landscape) and (min-width: 1000px)');
function fitBoard() {
  const svg = $('#board');
  const app = $('.app');
  const stage = $('.stage');
  const landscape = landscapeMQ.matches;
  app.classList.toggle('landscape', landscape);
  app.classList.toggle('narrow', landscape || window.innerWidth <= 520);
  let avail;
  if (landscape) {
    avail = window.innerHeight - 20;
  } else {
    const others = [...app.children].filter(ch => ch !== stage).reduce((s, ch) => s + ch.getBoundingClientRect().height, 0);
    const gaps = (app.children.length - 1) * 8 + 16;
    avail = window.innerHeight - others - gaps;
  }
  const width = stage.clientWidth;
  const size = Math.max(200, Math.min(width, avail, 620));
  svg.style.width = `${size}px`;
  svg.style.height = `${size}px`;
}

function applyLayoutSettings() {
  const top = $('#side-top');
  top.classList.toggle('flip', settings.faceToFace && !state.cpu);
}

// ==== 結果 ====
function recordResult(w) {
  if (state.cpu) {
    const rec = stats.cpu[state.cpu.level];
    if (w === state.cpu.pi) rec.lose++; else rec.win++;
  } else {
    stats.pvp[PLAYERS[w].id]++;
  }
  saveJSON(STORAGE_STATS, stats);
}
function showResult() {
  const w = state.winner;
  const p = PLAYERS[w];
  const b = state.board;
  const humanWon = !state.cpu || state.cpu.pi !== w;
  $('#resultEmoji').textContent = humanWon ? '🏆' : '🤖';
  $('#resultTitle').textContent = `${nameOf(w)} の勝ち！`;
  $('#resultTitle').style.color = p.color;
  const used = settings.walls - b.wallsLeft[w];
  $('#resultSub').textContent = `${Math.ceil(b.moveCount / 2)}手でゴール ・ 使った壁 ${used}枚`;
  $('#resultDialog').style.setProperty('--c', p.color);
  const st = $('#resultStats');
  if (state.cpu) {
    const rec = stats.cpu[state.cpu.level];
    st.innerHTML = `<span>CPU（${LEVEL_LABEL[state.cpu.level]}）との通算</span><span><b>${rec.win}</b>勝 <b>${rec.lose}</b>敗</span>`;
  } else {
    st.innerHTML = `<span>通算</span><span style="color:${PLAYERS[0].color}">${PLAYERS[0].name} <b>${stats.pvp[1]}</b>勝</span><span style="color:${PLAYERS[1].color}">${PLAYERS[1].name} <b>${stats.pvp[2]}</b>勝</span>`;
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

// ==== メニュー ====
function syncMenu() {
  document.querySelectorAll('#modeCards .mode-card').forEach(b => b.classList.toggle('on', b.dataset.mode === settings.mode));
  $('#cpuOpts').classList.toggle('hidden', settings.mode !== 'cpu');
  $('#faceRow').style.display = settings.mode === 'cpu' ? 'none' : '';
  document.querySelectorAll('#levelSeg button').forEach(b => b.classList.toggle('on', b.dataset.level === settings.level));
  document.querySelectorAll('#firstSeg button').forEach(b => b.classList.toggle('on', b.dataset.first === settings.first));
  document.querySelectorAll('#wallSeg button').forEach(b => b.classList.toggle('on', +b.dataset.walls === settings.walls));
  $('#faceToggle').checked = settings.faceToFace;
  $('#confirmMoveToggle').checked = settings.confirmMoves;
  $('#muteBtn').textContent = settings.muted ? '🔇' : '🔊';
}

function bindEvents() {
  $('#startBtn').addEventListener('click', () => { sound.tap(); startGame(); });
  $('#menuBtn').addEventListener('click', () => { sound.tap(); syncMenu(); showOverlay('menu'); });
  $('#muteBtn').addEventListener('click', () => { settings.muted = !settings.muted; saveSettings(); syncMenu(); });
  $('#rulesBtn').addEventListener('click', () => { sound.tap(); showOverlay('rules'); });
  $('#rulesClose').addEventListener('click', () => { sound.tap(); hideOverlay('rules'); });
  $('#rules').addEventListener('click', (e) => { if (e.target.id === 'rules') hideOverlay('rules'); });
  $('#rulesFromMenuBtn').addEventListener('click', () => { sound.tap(); showOverlay('rules'); });
  $('#resultAgainBtn').addEventListener('click', () => { sound.tap(); startGame(); });
  $('#resultMenuBtn').addEventListener('click', () => { sound.tap(); hideOverlay('result'); syncMenu(); showOverlay('menu'); });
  $('#resultViewBtn').addEventListener('click', () => { sound.tap(); hideOverlay('result'); });
  $('#result').addEventListener('click', (e) => { if (e.target.id === 'result') hideOverlay('result'); });
  $('#menu').addEventListener('click', (e) => { if (e.target.id === 'menu' && state.phase !== 'menu') hideOverlay('menu'); });

  $('#modeCards').addEventListener('click', (e) => {
    const card = e.target.closest('.mode-card'); if (!card) return;
    settings.mode = card.dataset.mode; saveSettings(); sound.tap(); syncMenu();
  });
  $('#levelSeg').addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    settings.level = btn.dataset.level; saveSettings(); sound.tap(); syncMenu();
  });
  $('#firstSeg').addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    settings.first = btn.dataset.first; saveSettings(); sound.tap(); syncMenu();
  });
  $('#wallSeg').addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    settings.walls = +btn.dataset.walls; saveSettings(); sound.tap(); syncMenu();
  });
  $('#faceToggle').addEventListener('change', (e) => { settings.faceToFace = e.target.checked; saveSettings(); applyLayoutSettings(); renderAll(); });
  $('#confirmMoveToggle').addEventListener('change', (e) => { settings.confirmMoves = e.target.checked; saveSettings(); });

  document.addEventListener('keydown', (e) => {
    if (!$('#menu').classList.contains('hidden') || !$('#rules').classList.contains('hidden') || !$('#result').classList.contains('hidden')) {
      if (e.key === 'Escape') { hideOverlay('rules'); if (state.phase !== 'menu') hideOverlay('menu'); }
      return;
    }
    if (state.phase !== 'playing') return;
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); moveByKey(0, -1); break;
      case 'ArrowDown': e.preventDefault(); moveByKey(0, 1); break;
      case 'ArrowLeft': e.preventDefault(); moveByKey(-1, 0); break;
      case 'ArrowRight': e.preventDefault(); moveByKey(1, 0); break;
      case 'w': case 'W': setMode(state.mode === 'wall' ? 'move' : 'wall'); break;
      case 'r': case 'R': if (humanTurn()) rotatePending(); break;
      case 'Enter': case ' ': if (state.pending) { e.preventDefault(); confirmPending(); } break;
      case 'Escape': if (state.pending) cancelPending(); else if (state.mode === 'wall') setMode('move'); break;
      case 'z': case 'Z': case 'Backspace': e.preventDefault(); undo(); break;
      default: break;
    }
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitBoard, 60); });
  window.addEventListener('orientationchange', () => setTimeout(fitBoard, 120));
  document.addEventListener('pointerdown', () => sound.tap(), { once: true });
}

function init() {
  buildBoard();
  bindEvents();
  syncMenu();
  showOverlay('menu');
  applyLayoutSettings();
  renderAll();
  requestAnimationFrame(fitBoard);
}

init();
