import { PIECE_PACKS, getPieceDef, listPiecesByPack, listAllPieces, toHandKind } from './pieces.js';

/** @typedef {'SENTE'|'GOTE'} Owner */

const STORAGE_KEY = 'ngames.shogiStudio.v1';
const LIB_KEY = 'ngames.shogiStudio.library.v1';

const UI = {
  LONG_PRESS_MS: 460,
  DRAG_START_PX: 6,
};

const el = {
  boardArea: document.getElementById('boardArea'),
  boardWrap: document.getElementById('boardWrap'),
  board: document.getElementById('board'),
  turnLabel: document.getElementById('turnLabel'),
  boardPreset: document.getElementById('boardPreset'),
  boardCustom: document.getElementById('boardCustom'),
  piecePack: document.getElementById('piecePack'),

  tabPlay: document.getElementById('tabPlay'),
  tabEdit: document.getElementById('tabEdit'),
  tabDex: document.getElementById('tabDex'),

  handList: document.getElementById('handList'),
  btnUndo: document.getElementById('btnUndo'),
  btnFlip: document.getElementById('btnFlip'),
  btnReset: document.getElementById('btnReset'),

  editOverlay: document.getElementById('editOverlay'),
  btnEditClose: document.getElementById('btnEditClose'),
  btnDoneEdit: document.getElementById('btnDoneEdit'),
  presetPicker: document.getElementById('presetPicker'),
  ownerPicker: document.getElementById('ownerPicker'),
  editPieceSelect: document.getElementById('editPieceSelect'),
  btnErase: document.getElementById('btnErase'),
  btnApplyPreset: document.getElementById('btnApplyPreset'),
  btnExport: document.getElementById('btnExport'),
  btnImport: document.getElementById('btnImport'),
  importFile: document.getElementById('importFile'),
  layoutName: document.getElementById('layoutName'),
  btnSaveLayout: document.getElementById('btnSaveLayout'),
  btnClearHands: document.getElementById('btnClearHands'),
  btnFillHands: document.getElementById('btnFillHands'),
  toggleMoveCheck: document.getElementById('toggleMoveCheck'),

  dexOverlay: document.getElementById('dexOverlay'),
  btnDexClose: document.getElementById('btnDexClose'),
  dexGrid: document.getElementById('dexGrid'),
  dexFilter: document.getElementById('dexFilter'),

  // Piece info (long press)
  infoOverlay: document.getElementById('infoOverlay'),
  btnInfoClose: document.getElementById('btnInfoClose'),
  infoTitle: document.getElementById('infoTitle'),
  infoDesc: document.getElementById('infoDesc'),
  infoMove: document.getElementById('infoMove'),
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function uuid() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadLibrary() {
  try {
    const raw = localStorage.getItem(LIB_KEY);
    if (!raw) return { version: 1, items: [] };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return { version: 1, items };
  } catch {
    return { version: 1, items: [] };
  }
}

function saveLibrary(lib) {
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify({ version: 1, items: lib.items || [] }));
  } catch {
    // ignore
  }
}

function ownerLabel(owner) {
  return owner === 'SENTE' ? '先手' : '後手';
}

function otherOwner(owner) {
  return owner === 'SENTE' ? 'GOTE' : 'SENTE';
}

function makeEmptyState() {
  return {
    version: 1,
    packId: 'standard',
    boardN: 9,
    current: 'SENTE',
    flipped: false,
    // 対局での「不正な移動」を防ぐため、基本は常にON
    moveCheck: true,
    board: [], // filled by resizeBoard
    hands: { SENTE: {}, GOTE: {} },
    history: []
  };
}

/** @typedef {{ kind:string, owner:Owner }} Piece */

/** @param {number} n */
function makeEmptyBoard(n) {
  /** @type {(Piece|null)[]} */
  const b = Array.from({ length: n * n }, () => null);
  return b;
}

function idxOf(x, y, n) {
  return y * n + x;
}

function xyOf(idx, n) {
  return { x: idx % n, y: Math.floor(idx / n) };
}

function inBounds(x, y, n) {
  return x >= 0 && y >= 0 && x < n && y < n;
}

function normalizeHands(h) {
  const out = { SENTE: {}, GOTE: {} };
  for (const o of ['SENTE', 'GOTE']) {
    const src = h?.[o] && typeof h[o] === 'object' ? h[o] : {};
    for (const [k, v] of Object.entries(src)) {
      const n = Math.max(0, Math.floor(Number(v) || 0));
      if (n > 0) out[o][k] = n;
    }
  }
  return out;
}

function normalizePayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const n = clamp(Math.floor(Number(parsed.boardN) || 9), 5, 25);
  const out = {
    version: 1,
    packId: PIECE_PACKS[parsed.packId] ? parsed.packId : 'standard',
    boardN: n,
    current: parsed.current === 'GOTE' ? 'GOTE' : 'SENTE',
    flipped: !!parsed.flipped,
    moveCheck: !!parsed.moveCheck,
    board: makeEmptyBoard(n),
    hands: normalizeHands(parsed.hands)
  };
  const b = Array.isArray(parsed.board) ? parsed.board : [];
  for (let i = 0; i < out.board.length; i++) {
    const p = b[i];
    if (!p) continue;
    const kind = typeof p.kind === 'string' ? p.kind : '';
    const owner = p.owner === 'GOTE' ? 'GOTE' : 'SENTE';
    if (!getPieceDef(kind)) continue;
    out.board[i] = { kind, owner };
  }
  return out;
}

function applyPayloadToState(state, payload) {
  const p = normalizePayload(payload);
  if (!p) return false;
  resizeBoard(state, p.boardN);
  state.packId = p.packId;
  state.current = p.current;
  state.flipped = !!p.flipped;
  // ヒント/チェックは基本ON（保存データでOFFでも戻す）
  state.moveCheck = true;
  state.hands = p.hands;
  state.board = p.board;
  state.history = [];
  return true;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    const safe = {
      version: 1,
      packId: state.packId,
      boardN: state.boardN,
      current: state.current,
      flipped: !!state.flipped,
      moveCheck: !!state.moveCheck,
      board: state.board,
      hands: state.hands
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch {
    // ignore
  }
}

function resizeBoard(state, n) {
  state.boardN = clamp(Math.floor(Number(n) || 9), 5, 25);
  state.board = makeEmptyBoard(state.boardN);
}

function clearHighlights() {
  el.board.querySelectorAll('.cell').forEach((c) => {
    c.dataset.highlight = '';
  });
}

function setSelectedCell(cellEl) {
  el.board.querySelectorAll('.cell').forEach((c) => {
    if (c === cellEl) c.dataset.highlight = 'select';
    else if (c.dataset.highlight === 'select') c.dataset.highlight = '';
  });
}

function applyBoardCssSize(state) {
  el.board.style.setProperty('--n', String(state.boardN));
}

function computeBoardPx() {
  const area = el.boardArea.getBoundingClientRect();
  const padding = 8; // board-area内の余白ぶん
  const max = Math.floor(Math.min(area.width, area.height) - padding);
  const boardPx = clamp(max, 240, 980);
  el.boardWrap.style.setProperty('--boardPx', `${boardPx}px`);
  const cellPx = Math.floor(boardPx / Math.max(1, state.boardN));
  el.boardWrap.style.setProperty('--cellPx', `${cellPx}px`);
}

function makeCell(idx) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cell';
  btn.dataset.idx = String(idx);
  btn.dataset.highlight = '';
  btn.dataset.hover = 'false';
  return btn;
}

function renderPiece(piece) {
  const def = getPieceDef(piece.kind);
  const p = document.createElement('div');
  p.className = 'piece';
  p.dataset.owner = piece.owner;
  p.dataset.kind = piece.kind;
  p.dataset.promoted = String(!!def?.demoteTo);
  p.textContent = def?.label || piece.kind;
  return p;
}

function renderBoard(state) {
  applyBoardCssSize(state);
  el.board.innerHTML = '';
  for (let i = 0; i < state.board.length; i++) {
    const cell = makeCell(i);
    const piece = state.board[i];
    if (piece) cell.appendChild(renderPiece(piece));
    el.board.appendChild(cell);
  }
}

function listDropKindsForPack(packId) {
  // 持ち駒は「成り」を持てない想定（将棋準拠）。拡張駒はそのまま。
  const defs = listPiecesByPack(packId);
  const base = new Map();
  defs.forEach((d) => {
    const k = d.demoteTo || d.id;
    if (!base.has(k)) base.set(k, d.demoteTo ? getPieceDef(k) || d : d);
  });
  // 玉は持ち駒にしない（基本の将棋感）
  base.delete('K');
  return Array.from(base.keys());
}

function renderHand(state) {
  const hand = state.hands[state.current] || {};
  el.handList.innerHTML = '';
  // 基本は「駒パック由来の持ち駒一覧」だが、
  // 対局中に取った駒（例: 玉など）が一覧に含まれないと「使えない」ので、
  // “いま手元に存在する種類” は必ず表示対象に含める。
  const baseKinds = listDropKindsForPack(state.packId);
  const extraKinds = Object.keys(hand || {}).filter((k) => !baseKinds.includes(k));
  const kinds = baseKinds.concat(extraKinds);
  let hasAny = false;
  kinds.forEach((k) => {
    const n = Math.max(0, Math.floor(Number(hand[k]) || 0));
    if (n <= 0) return;
    hasAny = true;
    const def = getPieceDef(k);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hand-piece';
    btn.dataset.kind = k;
    btn.dataset.active = selection.type === 'hand' && selection.kind === k ? 'true' : 'false';
    btn.innerHTML = `<span>${def?.label || k}</span><span class="count">×${n}</span>`;
    el.handList.appendChild(btn);
  });
  if (!hasAny) {
    const tip = document.createElement('div');
    tip.style.color = 'var(--text-light)';
    tip.style.fontWeight = '800';
    tip.style.fontSize = '0.95rem';
    tip.textContent = 'いまは持ち駒なし';
    el.handList.appendChild(tip);
  }
}

function updateTurnUi(state) {
  el.turnLabel.textContent = ownerLabel(state.current);
}

function setActiveTab(tab) {
  const m = tab;
  el.tabPlay.setAttribute('aria-selected', m === 'play' ? 'true' : 'false');
  el.tabEdit.setAttribute('aria-selected', m === 'edit' ? 'true' : 'false');
  el.tabDex.setAttribute('aria-selected', m === 'dex' ? 'true' : 'false');
}

function openOverlay(overlayEl) {
  overlayEl.style.display = 'flex';
  overlayEl.setAttribute('aria-hidden', 'false');
}

function closeOverlay(overlayEl) {
  overlayEl.style.display = 'none';
  overlayEl.setAttribute('aria-hidden', 'true');
}

function setSegmentActive(container, selector, activeEl) {
  container.querySelectorAll(selector).forEach((b) => b.classList.toggle('active', b === activeEl));
}

function standardSetup9(state) {
  resizeBoard(state, 9);
  state.packId = 'standard';
  state.hands = { SENTE: {}, GOTE: {} };
  state.current = 'SENTE';
  state.history = [];
  // 先手（下）
  const n = 9;
  const place = (x, y, kind, owner) => {
    state.board[idxOf(x, y, n)] = { kind, owner };
  };
  // 後手（上）
  // 1段目
  ['L', 'N', 'S', 'G', 'K', 'G', 'S', 'N', 'L'].forEach((k, x) => place(x, 0, k, 'GOTE'));
  place(1, 1, 'R', 'GOTE');
  place(7, 1, 'B', 'GOTE');
  for (let x = 0; x < 9; x++) place(x, 2, 'P', 'GOTE');
  // 先手（下）
  for (let x = 0; x < 9; x++) place(x, 6, 'P', 'SENTE');
  place(1, 7, 'B', 'SENTE');
  place(7, 7, 'R', 'SENTE');
  ['L', 'N', 'S', 'G', 'K', 'G', 'S', 'N', 'L'].forEach((k, x) => place(x, 8, k, 'SENTE'));
}

function makadaidaiLiteSetup19(state) {
  // 摩訶大大将棋（簡易）: 19×19 + 拡張駒入りの“それっぽい”初期配置
  resizeBoard(state, 19);
  state.packId = 'makadaidai-lite';
  state.hands = { SENTE: {}, GOTE: {} };
  state.current = 'SENTE';
  state.history = [];

  const n = 19;
  const place = (x, y, kind, owner) => {
    state.board[idxOf(x, y, n)] = { kind, owner };
  };

  const back = ['L', 'N', 'S', 'G', 'BE', 'WF', 'EL', 'TB', 'DR', 'K', 'DR', 'TB', 'EL', 'WF', 'BE', 'G', 'S', 'N', 'L'];
  back.forEach((k, x) => place(x, 0, k, 'GOTE'));
  back.forEach((k, x) => place(x, 18, k, 'SENTE'));

  // 2段目: 飛/角＋麒麟/鳳凰＋獅子（中心）
  place(4, 1, 'R', 'GOTE');
  place(14, 1, 'B', 'GOTE');
  place(7, 1, 'KI', 'GOTE');
  place(11, 1, 'HO', 'GOTE');
  place(9, 1, 'LI', 'GOTE');

  place(4, 17, 'B', 'SENTE');
  place(14, 17, 'R', 'SENTE');
  place(7, 17, 'HO', 'SENTE');
  place(11, 17, 'KI', 'SENTE');
  place(9, 17, 'LI', 'SENTE');

  // 歩をずらして2列（19枚）
  for (let x = 0; x < 19; x++) place(x, 2, 'P', 'GOTE');
  for (let x = 0; x < 19; x++) place(x, 16, 'P', 'SENTE');
}

function emptySetup(state) {
  resizeBoard(state, state.boardN);
  state.hands = { SENTE: {}, GOTE: {} };
  state.current = 'SENTE';
  state.history = [];
}

function pushHistory(state) {
  state.history.push({
    board: deepCopy(state.board),
    hands: deepCopy(state.hands),
    current: state.current
  });
  if (state.history.length > 200) state.history.shift();
}

function popHistory(state) {
  const last = state.history.pop();
  if (!last) return false;
  state.board = last.board;
  state.hands = last.hands;
  state.current = last.current;
  return true;
}

// === Move generation (simple, supported pieces only) ===
function getMovesFrom(state, fromIdx) {
  const n = state.boardN;
  const piece = state.board[fromIdx];
  if (!piece) return [];
  const def = getPieceDef(piece.kind);
  if (!def?.moves) return [];

  const from = xyOf(fromIdx, n);
  /** @type {{to:number, capture:boolean}[]} */
  const out = [];

  const orient = piece.owner === 'SENTE' ? 1 : -1;

  for (const m of def.moves) {
    const dx = m.dx;
    const dy = m.dy * orient;
    let step = 1;
    while (true) {
      const x = from.x + dx * step;
      const y = from.y + dy * step;
      if (!inBounds(x, y, n)) break;
      const to = idxOf(x, y, n);
      const target = state.board[to];
      if (!target) {
        out.push({ to, capture: false });
      } else {
        if (target.owner !== piece.owner) out.push({ to, capture: true });
        break;
      }
      if (!m.repeat) break;
      step++;
    }
  }
  return out;
}

function canMoveTo(state, fromIdx, toIdx) {
  const piece = state.board[fromIdx];
  if (!piece) return false;
  const def = getPieceDef(piece.kind);
  // moves が未定義の駒は「チェック対象外」として従来どおり自由に（拡張/将来追加の保険）
  if (!def?.moves) return true;
  const moves = getMovesFrom(state, fromIdx);
  return moves.some((m) => m.to === toIdx);
}

function highlightMoves(state, fromIdx, force = false) {
  clearHighlights();
  const cell = el.board.querySelector(`.cell[data-idx="${fromIdx}"]`);
  if (cell) cell.dataset.highlight = 'select';
  if (!force && !state.moveCheck) return;
  const moves = getMovesFrom(state, fromIdx);
  for (const m of moves) {
    const c = el.board.querySelector(`.cell[data-idx="${m.to}"]`);
    if (c) c.dataset.highlight = m.capture ? 'capture' : 'move';
  }
}

function highlightDropTargets(state) {
  // 持ち駒の打てる場所（現状: 空マスのみ）
  clearHighlights();
  for (let i = 0; i < state.board.length; i++) {
    if (state.board[i]) continue;
    const c = el.board.querySelector(`.cell[data-idx="${i}"]`);
    if (c) c.dataset.highlight = 'move';
  }
}

// === Interaction state ===
const selection = {
  type: /** @type {'none'|'cell'|'hand'} */ ('none'),
  idx: -1,
  kind: ''
};

// Drag & drop state
const drag = {
  active: false,
  pointerId: -1,
  source: /** @type {'none'|'cell'|'hand'} */ ('none'),
  fromIdx: -1,
  kind: '',
  owner: /** @type {Owner|null} */ (null),
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  moved: false,
  hoverIdx: -1,
  ghostEl: /** @type {HTMLElement|null} */ (null),
  longPressTimer: /** @type {number} */ (0),
};

let suppressClickUntil = 0;

// Editor state
const editor = {
  preset: 'standard',
  owner: /** @type {Owner} */ ('SENTE'),
  kind: 'P',
  erase: false
};

function clearSelection() {
  selection.type = 'none';
  selection.idx = -1;
  selection.kind = '';
  clearHighlights();
  renderHand(state);
}

function setHandSelection(kind) {
  selection.type = 'hand';
  selection.kind = kind;
  selection.idx = -1;
  clearHighlights();
  renderHand(state);
}

function setCellSelection(idx) {
  selection.type = 'cell';
  selection.idx = idx;
  selection.kind = '';
  highlightMoves(state, idx);
  renderHand(state);
}

/** @returns {{ok:true, capture:boolean}|{ok:false}} */
function tryMove(fromIdx, toIdx) {
  const src = state.board[fromIdx];
  if (!src) return { ok: false };
  if (src.owner !== state.current) return { ok: false };
  if (!canMoveTo(state, fromIdx, toIdx)) return { ok: false };
  const dst = state.board[toIdx];
  pushHistory(state);
  const didCapture = !!(dst && dst.owner !== src.owner);
  if (dst && dst.owner !== src.owner) {
    const capturedKind = toHandKind(dst.kind);
    state.hands[state.current][capturedKind] = (state.hands[state.current][capturedKind] || 0) + 1;
  }
  state.board[toIdx] = src;
  state.board[fromIdx] = null;
  state.current = otherOwner(state.current);
  return { ok: true, capture: didCapture };
}

/** @returns {{ok:true}|{ok:false}} */
function tryDrop(kind, toIdx) {
  const dst = state.board[toIdx];
  if (dst) return { ok: false };
  const n = Math.max(0, Math.floor(Number(state.hands[state.current][kind]) || 0));
  if (n <= 0) return { ok: false };
  pushHistory(state);
  state.board[toIdx] = { kind, owner: state.current };
  if (n === 1) delete state.hands[state.current][kind];
  else state.hands[state.current][kind] = n - 1;
  state.current = otherOwner(state.current);
  return { ok: true };
}

function handleBoardClick(idx) {
  if (activeMode !== 'play' && activeMode !== 'edit') return;

  // Edit: place/erase directly
  if (activeMode === 'edit') {
    pushHistory(state);
    if (editor.erase) {
      state.board[idx] = null;
    } else {
      state.board[idx] = { kind: editor.kind, owner: editor.owner };
    }
    renderAll();
    return;
  }

  // Play mode
  const piece = state.board[idx];

  if (selection.type === 'hand') {
    const res = tryDrop(selection.kind, idx);
    if (res.ok) {
      clearSelection();
      queueFx({ type: 'drop', idx });
      playSfx('drop');
      renderAll();
      return;
    }
    // drop失敗ならそのまま
    return;
  }

  if (selection.type === 'cell') {
    if (selection.idx === idx) {
      clearSelection();
      return;
    }
    const res = tryMove(selection.idx, idx);
    if (res.ok) {
      clearSelection();
      queueFx({ type: res.capture ? 'capture' : 'move', idx });
      playSfx(res.capture ? 'capture' : 'move');
      renderAll();
      return;
    }
    // うまく動けないとき、選び直し（自分の駒なら）
    if (piece && piece.owner === state.current) {
      setCellSelection(idx);
      return;
    }
    return;
  }

  // nothing selected
  if (piece && piece.owner === state.current) {
    setCellSelection(idx);
  } else {
    clearSelection();
  }
}

// === Piece info (long press) ===
function renderMoveGrid5x5(containerEl, pieceDef) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  // 5x5, center=(2,2)
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const c = document.createElement('div');
      c.className = 'dex-cell';
      c.dataset.kind = '';
      if (x === 2 && y === 2) c.dataset.kind = 'self';
      containerEl.appendChild(c);
    }
  }
  if (!Array.isArray(pieceDef?.moves)) return;
  const center = { x: 2, y: 2 };
  for (const m of pieceDef.moves) {
    const tx = center.x + m.dx;
    const ty = center.y + m.dy;
    if (tx < 0 || ty < 0 || tx >= 5 || ty >= 5) continue;
    const idx = ty * 5 + tx;
    const cell = containerEl.children[idx];
    if (!cell) continue;
    cell.dataset.kind = m.repeat ? 'slide' : 'move';
  }
}

function openPieceInfo(kind) {
  if (!el.infoOverlay) return;
  const def = getPieceDef(kind);
  if (!def) return;
  // 情報表示を優先（長押し＝説明）: ドラッグはキャンセル扱い
  if (drag.active) {
    endDrag(false);
  }
  if (el.infoTitle) el.infoTitle.textContent = `${def.label}：${def.name}`;
  if (el.infoDesc) el.infoDesc.textContent = def.description || '';
  renderMoveGrid5x5(el.infoMove, def);
  openOverlay(el.infoOverlay);
}

function closePieceInfo() {
  if (!el.infoOverlay) return;
  closeOverlay(el.infoOverlay);
}

// === SFX ===
let audioCtx = /** @type {AudioContext|null} */ (null);
function getAudioCtx() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // iOSなどでsuspendされてたら起こす（失敗してもOK）
    void audioCtx.resume?.();
  } catch {
    audioCtx = null;
  }
  return audioCtx;
}

function playTone(freq, ms, type = 'sine', gain = 0.05) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.02);
}

function playSfx(kind) {
  // kind: 'move'|'capture'|'drop'|'invalid'
  if (kind === 'capture') {
    playTone(740, 70, 'triangle', 0.06);
    setTimeout(() => playTone(520, 90, 'triangle', 0.06), 60);
    return;
  }
  if (kind === 'drop') {
    playTone(520, 60, 'sine', 0.05);
    return;
  }
  if (kind === 'invalid') {
    playTone(180, 120, 'sawtooth', 0.04);
    return;
  }
  // move
  playTone(620, 55, 'sine', 0.045);
}

// === FX (visual) ===
let fxQueue = /** @type {{type:'move'|'capture'|'drop'|'invalid', idx:number}|null} */ (null);
function queueFx(fx) {
  fxQueue = fx;
}

function applyQueuedFx() {
  const fx = fxQueue;
  if (!fx) return;
  fxQueue = null;
  const cell = el.board.querySelector(`.cell[data-idx="${fx.idx}"]`);
  if (!cell) return;
  cell.classList.remove('fx-move', 'fx-capture', 'fx-drop', 'fx-invalid');
  // 強制reflowして連続適用でも動くように
  void cell.offsetWidth;
  cell.classList.add(`fx-${fx.type}`);
  window.setTimeout(() => {
    cell.classList.remove(`fx-${fx.type}`);
  }, 420);
}

function setHoverIdx(idx) {
  if (drag.hoverIdx === idx) return;
  // clear old
  if (drag.hoverIdx >= 0) {
    const old = el.board.querySelector(`.cell[data-idx="${drag.hoverIdx}"]`);
    if (old) old.dataset.hover = 'false';
  }
  drag.hoverIdx = idx;
  if (idx >= 0) {
    const c = el.board.querySelector(`.cell[data-idx="${idx}"]`);
    if (c) c.dataset.hover = 'true';
  }
}

function clearHover() {
  setHoverIdx(-1);
}

function cleanupDragVisual() {
  if (drag.ghostEl) {
    drag.ghostEl.remove();
    drag.ghostEl = null;
  }
  // show original piece (if still there)
  el.board.querySelectorAll('.piece[data-drag-hidden="true"]').forEach((p) => {
    p.dataset.dragHidden = 'false';
    p.style.opacity = '';
  });
  clearHover();
  clearHighlights();
}

function cancelLongPress() {
  if (drag.longPressTimer) {
    clearTimeout(drag.longPressTimer);
    drag.longPressTimer = 0;
  }
}

function scheduleLongPress(kind) {
  cancelLongPress();
  drag.longPressTimer = window.setTimeout(() => {
    // まだ押していて、ほとんど動いてない時だけ
    if (!drag.active) return;
    if (drag.moved) return;
    openPieceInfo(kind);
  }, UI.LONG_PRESS_MS);
}

function startGhost(pieceKind, owner, clientX, clientY) {
  const g = document.createElement('div');
  g.className = 'drag-ghost';
  g.style.left = `${clientX}px`;
  g.style.top = `${clientY}px`;
  const def = getPieceDef(pieceKind);
  const p = document.createElement('div');
  p.className = 'piece';
  p.dataset.owner = owner;
  p.dataset.kind = pieceKind;
  p.dataset.promoted = String(!!def?.demoteTo);
  p.textContent = def?.label || pieceKind;
  g.appendChild(p);
  document.body.appendChild(g);
  drag.ghostEl = g;
}

function updateGhost(clientX, clientY) {
  if (!drag.ghostEl) return;
  drag.ghostEl.style.left = `${clientX}px`;
  drag.ghostEl.style.top = `${clientY}px`;
}

function cellIdxFromPoint(clientX, clientY) {
  const hit = document.elementFromPoint(clientX, clientY);
  const cell = hit?.closest?.('.cell');
  if (!cell) return -1;
  const idx = Number(cell.dataset.idx);
  return Number.isFinite(idx) ? idx : -1;
}

function beginDragFromCell(fromIdx, clientX, clientY, pointerId) {
  const piece = state.board[fromIdx];
  if (!piece) return false;
  if (activeMode !== 'play') return false;
  if (piece.owner !== state.current) return false;

  drag.active = true;
  drag.pointerId = pointerId;
  drag.source = 'cell';
  drag.fromIdx = fromIdx;
  drag.kind = piece.kind;
  drag.owner = piece.owner;
  drag.startX = clientX;
  drag.startY = clientY;
  drag.lastX = clientX;
  drag.lastY = clientY;
  drag.moved = false;
  drag.hoverIdx = -1;
  scheduleLongPress(piece.kind);

  // 見た目: 元の駒を薄く（ドラッグ開始まで ghost は出さない）
  const cellEl = el.board.querySelector(`.cell[data-idx="${fromIdx}"]`);
  const pieceEl = cellEl?.querySelector?.('.piece');
  if (pieceEl) {
    pieceEl.dataset.dragHidden = 'true';
    pieceEl.style.opacity = '0.25';
  }
  // 合法手ハイライト（常に表示）
  highlightMoves(state, fromIdx, true);
  return true;
}

function beginDragFromHand(kind, clientX, clientY, pointerId) {
  if (activeMode !== 'play') return false;
  const n = Math.max(0, Math.floor(Number(state.hands[state.current][kind]) || 0));
  if (n <= 0) return false;

  drag.active = true;
  drag.pointerId = pointerId;
  drag.source = 'hand';
  drag.fromIdx = -1;
  drag.kind = kind;
  drag.owner = state.current;
  drag.startX = clientX;
  drag.startY = clientY;
  drag.lastX = clientX;
  drag.lastY = clientY;
  drag.moved = false;
  drag.hoverIdx = -1;
  scheduleLongPress(kind);

  // 打てる場所（空き）をハイライト
  highlightDropTargets(state);
  return true;
}

function updateDrag(clientX, clientY) {
  if (!drag.active) return;
  if (drag.pointerId < 0) return;
  drag.lastX = clientX;
  drag.lastY = clientY;

  const dx = clientX - drag.startX;
  const dy = clientY - drag.startY;
  const dist = Math.hypot(dx, dy);
  if (!drag.moved && dist >= UI.DRAG_START_PX) {
    drag.moved = true;
    cancelLongPress();
    if (!drag.ghostEl && drag.owner) startGhost(drag.kind, drag.owner, clientX, clientY);
  }
  if (drag.moved) updateGhost(clientX, clientY);

  const idx = cellIdxFromPoint(clientX, clientY);
  setHoverIdx(idx);
}

function endDrag(commit) {
  if (!drag.active) return;
  cancelLongPress();

  const hover = drag.hoverIdx;
  const source = drag.source;
  const fromIdx = drag.fromIdx;
  const kind = drag.kind;

  // cleanup state first (so clicks won't act on stale)
  drag.active = false;
  drag.pointerId = -1;
  drag.source = 'none';
  drag.fromIdx = -1;
  drag.kind = '';
  drag.owner = null;
  drag.moved = false;
  drag.hoverIdx = -1;

  const moved = commit && hover >= 0;

  cleanupDragVisual();

  // ドラッグ後に click が飛ぶ端末があるので、少しだけ抑制
  suppressClickUntil = Date.now() + 320;

  if (!moved) return;

  // 元の場所 / 置けない場所ならキャンセル
  if (source === 'cell') {
    if (hover === fromIdx) {
      playSfx('invalid');
      queueFx({ type: 'invalid', idx: hover });
      applyQueuedFx();
      return;
    }
    const res = tryMove(fromIdx, hover);
    if (!res.ok) {
      playSfx('invalid');
      queueFx({ type: 'invalid', idx: hover });
      renderAll();
      return;
    }
    queueFx({ type: res.capture ? 'capture' : 'move', idx: hover });
    playSfx(res.capture ? 'capture' : 'move');
    clearSelection();
    renderAll();
    return;
  }

  if (source === 'hand') {
    const res = tryDrop(kind, hover);
    if (!res.ok) {
      playSfx('invalid');
      queueFx({ type: 'invalid', idx: hover });
      renderAll();
      return;
    }
    queueFx({ type: 'drop', idx: hover });
    playSfx('drop');
    clearSelection();
    renderAll();
  }
}

function updateEditorPieceOptions(packId) {
  const defs = listPiecesByPack(packId);
  el.editPieceSelect.innerHTML = '';
  defs.forEach((d) => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.label}：${d.name}`;
    el.editPieceSelect.appendChild(opt);
  });
  if (defs.some((d) => d.id === editor.kind)) el.editPieceSelect.value = editor.kind;
  else {
    editor.kind = defs[0]?.id || 'P';
    el.editPieceSelect.value = editor.kind;
  }
}

function renderDex() {
  const filter = el.dexFilter.value || 'current';
  const defs = filter === 'all' ? listAllPieces() : listPiecesByPack(state.packId);

  el.dexGrid.innerHTML = '';
  defs.forEach((d) => {
    const item = document.createElement('div');
    item.className = 'dex-item';
    item.innerHTML = `
      <div class="dex-badge">${d.label}</div>
      <div>
        <div class="dex-name">${d.name}</div>
        <div class="dex-desc">${d.description}</div>
        <div class="dex-move" data-id="${d.id}"></div>
      </div>
    `;
    el.dexGrid.appendChild(item);

    const grid = item.querySelector('.dex-move');
    if (!grid) return;
    // 5x5, center=(2,2)
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const c = document.createElement('div');
        c.className = 'dex-cell';
        c.dataset.kind = '';
        if (x === 2 && y === 2) c.dataset.kind = 'self';
        grid.appendChild(c);
      }
    }
    // moves (先手視点)
    if (!Array.isArray(d.moves)) return;
    const center = { x: 2, y: 2 };
    for (const m of d.moves) {
      const tx = center.x + m.dx;
      const ty = center.y + m.dy;
      if (tx < 0 || ty < 0 || tx >= 5 || ty >= 5) continue;
      const idx = ty * 5 + tx;
      const cell = grid.children[idx];
      if (!cell) continue;
      cell.dataset.kind = m.repeat ? 'slide' : 'move';
    }
  });
}

function renderAll() {
  updateTurnUi(state);
  renderBoard(state);
  renderHand(state);
  saveState(state);
  requestAnimationFrame(() => {
    computeBoardPx();
    applyQueuedFx();
  });
}

// === Mode management ===
let activeMode = /** @type {'play'|'edit'|'dex'} */ ('play');

function openEdit() {
  activeMode = 'edit';
  setActiveTab('edit');
  openOverlay(el.editOverlay);
  clearSelection();
}

function closeEdit(toPlay = true) {
  closeOverlay(el.editOverlay);
  if (toPlay) {
    activeMode = 'play';
    setActiveTab('play');
  }
  renderAll();
}

function openDex() {
  activeMode = 'dex';
  setActiveTab('dex');
  renderDex();
  openOverlay(el.dexOverlay);
  clearSelection();
}

function closeDex(toPlay = true) {
  closeOverlay(el.dexOverlay);
  if (toPlay) {
    activeMode = 'play';
    setActiveTab('play');
  }
  renderAll();
}

// === Event wiring ===
el.tabPlay.addEventListener('click', () => {
  activeMode = 'play';
  setActiveTab('play');
  closeOverlay(el.editOverlay);
  closeOverlay(el.dexOverlay);
  clearSelection();
});
el.tabEdit.addEventListener('click', openEdit);
el.tabDex.addEventListener('click', openDex);

el.btnEditClose.addEventListener('click', () => closeEdit(true));
el.btnDoneEdit.addEventListener('click', () => closeEdit(true));
el.editOverlay.addEventListener('click', (e) => {
  if (e.target === el.editOverlay) closeEdit(true);
});

el.btnDexClose.addEventListener('click', () => closeDex(true));
el.dexOverlay.addEventListener('click', (e) => {
  if (e.target === el.dexOverlay) closeDex(true);
});

// piece info overlay
el.btnInfoClose?.addEventListener('click', () => closePieceInfo());
el.infoOverlay?.addEventListener('click', (e) => {
  if (e.target === el.infoOverlay) closePieceInfo();
});

// board click (tap) remains
el.board.addEventListener('click', (e) => {
  if (drag.active) return;
  if (Date.now() < suppressClickUntil) return;
  if (activeMode !== 'play' && activeMode !== 'edit') return;
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const idx = Number(cell.dataset.idx);
  if (!Number.isFinite(idx)) return;
  handleBoardClick(idx);
});

// drag start on board (play mode only)
el.board.addEventListener('pointerdown', (e) => {
  if (activeMode !== 'play') return;
  const pieceEl = e.target.closest('.piece');
  if (!pieceEl) return;
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const idx = Number(cell.dataset.idx);
  if (!Number.isFinite(idx)) return;
  const ok = beginDragFromCell(idx, e.clientX, e.clientY, e.pointerId);
  if (!ok) return;
  // capture move events
  el.board.setPointerCapture?.(e.pointerId);
  e.preventDefault();
  e.stopPropagation();
}, { passive: false });

el.board.addEventListener('pointermove', (e) => {
  if (!drag.active) return;
  if (e.pointerId !== drag.pointerId) return;
  updateDrag(e.clientX, e.clientY);
  e.preventDefault();
}, { passive: false });

el.board.addEventListener('pointerup', (e) => {
  if (!drag.active) return;
  if (e.pointerId !== drag.pointerId) return;
  // ドロップ確定（ただし動いてない＝タップ扱いは commit=false）
  const commit = !!drag.moved;
  endDrag(commit);
  e.preventDefault();
}, { passive: false });

el.board.addEventListener('pointercancel', (e) => {
  if (!drag.active) return;
  if (e.pointerId !== drag.pointerId) return;
  endDrag(false);
});

el.handList.addEventListener('click', (e) => {
  if (Date.now() < suppressClickUntil) return;
  const btn = e.target.closest('.hand-piece');
  if (!btn) return;
  const kind = btn.dataset.kind || '';
  if (!kind) return;
  if (selection.type === 'hand' && selection.kind === kind) clearSelection();
  else setHandSelection(kind);
});

// drag start from hand (play mode)
el.handList.addEventListener('pointerdown', (e) => {
  if (activeMode !== 'play') return;
  const btn = e.target.closest('.hand-piece');
  if (!btn) return;
  const kind = btn.dataset.kind || '';
  if (!kind) return;
  const ok = beginDragFromHand(kind, e.clientX, e.clientY, e.pointerId);
  if (!ok) return;
  el.handList.setPointerCapture?.(e.pointerId);
  e.preventDefault();
  e.stopPropagation();
}, { passive: false });

el.handList.addEventListener('pointermove', (e) => {
  if (!drag.active) return;
  if (e.pointerId !== drag.pointerId) return;
  updateDrag(e.clientX, e.clientY);
  e.preventDefault();
}, { passive: false });

el.handList.addEventListener('pointerup', (e) => {
  if (!drag.active) return;
  if (e.pointerId !== drag.pointerId) return;
  const commit = !!drag.moved;
  endDrag(commit);
  e.preventDefault();
}, { passive: false });

el.handList.addEventListener('pointercancel', (e) => {
  if (!drag.active) return;
  if (e.pointerId !== drag.pointerId) return;
  endDrag(false);
});

el.btnUndo.addEventListener('click', () => {
  const ok = popHistory(state);
  if (!ok) return;
  clearSelection();
  renderAll();
});

el.btnFlip.addEventListener('click', () => {
  state.flipped = !state.flipped;
  el.boardWrap.style.transform = state.flipped ? 'rotate(180deg)' : '';
  renderAll();
});

el.btnReset.addEventListener('click', () => {
  // 現在の盤サイズに合わせたリセット（9x9は標準、それ以外は空盤）
  state.history = [];
  if (state.boardN === 9) standardSetup9(state);
  else emptySetup(state);
  clearSelection();
  renderAll();
});

el.boardPreset.addEventListener('change', () => {
  const v = el.boardPreset.value;
  el.boardCustom.style.display = v === 'custom' ? '' : 'none';
  const n = v === 'custom' ? Number(el.boardCustom.value || 9) : Number(v);
  resizeBoard(state, n);
  state.history = [];
  if (state.boardN === 9) standardSetup9(state);
  else emptySetup(state);
  clearSelection();
  renderAll();
});

el.boardCustom.addEventListener('change', () => {
  const n = Number(el.boardCustom.value || 9);
  resizeBoard(state, n);
  state.history = [];
  emptySetup(state);
  clearSelection();
  renderAll();
});

el.piecePack.addEventListener('change', () => {
  state.packId = el.piecePack.value || 'standard';
  updateEditorPieceOptions(state.packId);
  renderHand(state);
  renderDex();
  saveState(state);
});

el.dexFilter.addEventListener('change', () => renderDex());

el.presetPicker.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-preset]');
  if (!btn) return;
  setSegmentActive(el.presetPicker, '.seg', btn);
  editor.preset = btn.dataset.preset || 'standard';
});

el.ownerPicker.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-owner]');
  if (!btn) return;
  setSegmentActive(el.ownerPicker, '.seg', btn);
  editor.owner = btn.dataset.owner === 'GOTE' ? 'GOTE' : 'SENTE';
});

el.editPieceSelect.addEventListener('change', () => {
  editor.kind = el.editPieceSelect.value || 'P';
  editor.erase = false;
  el.btnErase.classList.remove('active');
});

el.btnErase.addEventListener('click', () => {
  editor.erase = !editor.erase;
  el.btnErase.classList.toggle('active', editor.erase);
});

el.btnApplyPreset.addEventListener('click', () => {
  if (editor.preset === 'empty') emptySetup(state);
  else {
    if (state.boardN === 9) standardSetup9(state);
    else emptySetup(state);
  }
  clearSelection();
  renderAll();
});

el.btnExport.addEventListener('click', () => {
  const payload = {
    version: 1,
    packId: state.packId,
    boardN: state.boardN,
    current: state.current,
    flipped: !!state.flipped,
    moveCheck: !!state.moveCheck,
    board: state.board,
    hands: state.hands
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shogi-setup-${state.boardN}x${state.boardN}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

el.btnSaveLayout?.addEventListener('click', () => {
  const name = String(el.layoutName?.value || '').trim().slice(0, 24) || 'マイ配置';
  const payload = {
    version: 1,
    packId: state.packId,
    boardN: state.boardN,
    current: state.current,
    flipped: !!state.flipped,
    moveCheck: !!state.moveCheck,
    board: state.board,
    hands: state.hands
  };
  const lib = loadLibrary();
  lib.items = Array.isArray(lib.items) ? lib.items : [];
  lib.items.unshift({ id: uuid(), name, updatedAt: Date.now(), payload });
  if (lib.items.length > 60) lib.items.length = 60;
  saveLibrary(lib);
  // ささやかなフィードバック
  if (el.layoutName) el.layoutName.value = '';
});

el.btnImport.addEventListener('click', () => {
  el.importFile.value = '';
  el.importFile.click();
});

el.importFile.addEventListener('change', async () => {
  const f = el.importFile.files?.[0];
  if (!f) return;
  let parsed;
  try {
    parsed = JSON.parse(await f.text());
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== 'object') return;
  const ok = applyPayloadToState(state, parsed);
  if (!ok) return;
  // UI sync
  el.piecePack.value = state.packId;
  updateEditorPieceOptions(state.packId);
  el.boardPreset.value = ['9', '19'].includes(String(state.boardN)) ? String(state.boardN) : 'custom';
  el.boardCustom.style.display = el.boardPreset.value === 'custom' ? '' : 'none';
  el.boardCustom.value = String(state.boardN);
  el.toggleMoveCheck.checked = !!state.moveCheck;
  el.boardWrap.style.transform = state.flipped ? 'rotate(180deg)' : '';
  clearSelection();
  renderAll();
});

el.btnClearHands.addEventListener('click', () => {
  pushHistory(state);
  state.hands = { SENTE: {}, GOTE: {} };
  renderAll();
});

el.btnFillHands.addEventListener('click', () => {
  pushHistory(state);
  const kinds = listDropKindsForPack(state.packId);
  for (const o of ['SENTE', 'GOTE']) {
    for (const k of kinds) {
      state.hands[o][k] = (state.hands[o][k] || 0) + 1;
    }
  }
  renderAll();
});

el.toggleMoveCheck.addEventListener('change', () => {
  state.moveCheck = !!el.toggleMoveCheck.checked;
  clearSelection();
  renderAll();
});

window.addEventListener('resize', () => computeBoardPx());

// === init ===
let state = makeEmptyState();

// URL params（setup画面からの遷移）
const params = new URLSearchParams(location.search);
const preset = params.get('preset') || '';
const layoutId = params.get('layoutId') || '';
const isNew = params.get('new') === '1';
const autoEdit = params.get('edit') === '1';

let initializedByParams = false;

if (preset === 'standard') {
  standardSetup9(state);
  initializedByParams = true;
} else if (preset === 'makadaidai') {
  makadaidaiLiteSetup19(state);
  initializedByParams = true;
} else if (layoutId) {
  const lib = loadLibrary();
  const it = (lib.items || []).find((x) => x?.id === layoutId);
  if (it?.payload) {
    const ok = applyPayloadToState(state, it.payload);
    if (ok) initializedByParams = true;
  }
} else if (isNew) {
  // 新規: とりあえず空盤（デフォ9×9）
  resizeBoard(state, 9);
  state.packId = 'standard';
  emptySetup(state);
  initializedByParams = true;
}

if (!initializedByParams) {
  const saved = loadState();
  if (saved) {
    applyPayloadToState(state, saved);
  } else {
    standardSetup9(state);
  }
}

// initial UI sync
el.piecePack.value = state.packId;
updateEditorPieceOptions(state.packId);
el.boardPreset.value = ['9', '19'].includes(String(state.boardN)) ? String(state.boardN) : 'custom';
el.boardCustom.style.display = el.boardPreset.value === 'custom' ? '' : 'none';
el.boardCustom.value = String(state.boardN);
el.toggleMoveCheck.checked = true;
el.toggleMoveCheck.disabled = true;
el.boardWrap.style.transform = state.flipped ? 'rotate(180deg)' : '';

renderAll();
computeBoardPx();

// setupから「編集で開く」場合は最初に編集モーダルを出す
if (autoEdit) {
  openEdit();
}

