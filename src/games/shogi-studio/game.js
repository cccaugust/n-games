import { PIECE_PACKS, getPieceDef, listPiecesByPack, listAllPieces, toHandKind } from './pieces.js';

/** @typedef {'SENTE'|'GOTE'} Owner */

const STORAGE_KEY = 'ngames.shogiStudio.v1';

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
  btnClearHands: document.getElementById('btnClearHands'),
  btnFillHands: document.getElementById('btnFillHands'),
  toggleMoveCheck: document.getElementById('toggleMoveCheck'),

  dexOverlay: document.getElementById('dexOverlay'),
  btnDexClose: document.getElementById('btnDexClose'),
  dexGrid: document.getElementById('dexGrid'),
  dexFilter: document.getElementById('dexFilter'),
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
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
    moveCheck: false,
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
  return btn;
}

function renderPiece(piece) {
  const def = getPieceDef(piece.kind);
  const p = document.createElement('div');
  p.className = 'piece';
  p.dataset.owner = piece.owner;
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
  const kinds = listDropKindsForPack(state.packId);
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
  if (!state.moveCheck) return [];
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
  if (!state.moveCheck) return true;
  const moves = getMovesFrom(state, fromIdx);
  return moves.some((m) => m.to === toIdx);
}

function highlightMoves(state, fromIdx) {
  clearHighlights();
  const cell = el.board.querySelector(`.cell[data-idx="${fromIdx}"]`);
  if (cell) cell.dataset.highlight = 'select';
  if (!state.moveCheck) return;
  const moves = getMovesFrom(state, fromIdx);
  for (const m of moves) {
    const c = el.board.querySelector(`.cell[data-idx="${m.to}"]`);
    if (c) c.dataset.highlight = m.capture ? 'capture' : 'move';
  }
}

// === Interaction state ===
const selection = {
  type: /** @type {'none'|'cell'|'hand'} */ ('none'),
  idx: -1,
  kind: ''
};

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

function tryMove(fromIdx, toIdx) {
  const src = state.board[fromIdx];
  if (!src) return false;
  if (src.owner !== state.current) return false;
  if (!canMoveTo(state, fromIdx, toIdx)) return false;
  const dst = state.board[toIdx];
  pushHistory(state);
  if (dst && dst.owner !== src.owner) {
    const capturedKind = toHandKind(dst.kind);
    state.hands[state.current][capturedKind] = (state.hands[state.current][capturedKind] || 0) + 1;
  }
  state.board[toIdx] = src;
  state.board[fromIdx] = null;
  state.current = otherOwner(state.current);
  return true;
}

function tryDrop(kind, toIdx) {
  const dst = state.board[toIdx];
  if (dst) return false;
  const n = Math.max(0, Math.floor(Number(state.hands[state.current][kind]) || 0));
  if (n <= 0) return false;
  pushHistory(state);
  state.board[toIdx] = { kind, owner: state.current };
  if (n === 1) delete state.hands[state.current][kind];
  else state.hands[state.current][kind] = n - 1;
  state.current = otherOwner(state.current);
  return true;
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
    const ok = tryDrop(selection.kind, idx);
    if (ok) {
      clearSelection();
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
    const ok = tryMove(selection.idx, idx);
    if (ok) {
      clearSelection();
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

el.board.addEventListener('pointerdown', (e) => {
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const idx = Number(cell.dataset.idx);
  if (!Number.isFinite(idx)) return;
  handleBoardClick(idx);
  e.preventDefault();
}, { passive: false });

el.handList.addEventListener('click', (e) => {
  const btn = e.target.closest('.hand-piece');
  if (!btn) return;
  const kind = btn.dataset.kind || '';
  if (!kind) return;
  if (selection.type === 'hand' && selection.kind === kind) clearSelection();
  else setHandSelection(kind);
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
  const n = clamp(Math.floor(Number(parsed.boardN) || 9), 5, 25);
  resizeBoard(state, n);
  state.packId = PIECE_PACKS[parsed.packId] ? parsed.packId : 'standard';
  state.current = parsed.current === 'GOTE' ? 'GOTE' : 'SENTE';
  state.flipped = !!parsed.flipped;
  state.moveCheck = !!parsed.moveCheck;
  state.hands = normalizeHands(parsed.hands);
  state.history = [];
  // board
  const b = Array.isArray(parsed.board) ? parsed.board : [];
  state.board = makeEmptyBoard(state.boardN);
  for (let i = 0; i < state.board.length; i++) {
    const p = b[i];
    if (!p) continue;
    const kind = typeof p.kind === 'string' ? p.kind : '';
    const owner = p.owner === 'GOTE' ? 'GOTE' : 'SENTE';
    if (!getPieceDef(kind)) continue;
    state.board[i] = { kind, owner };
  }
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
const saved = loadState();
if (saved) {
  state.packId = PIECE_PACKS[saved.packId] ? saved.packId : 'standard';
  resizeBoard(state, saved.boardN || 9);
  state.current = saved.current === 'GOTE' ? 'GOTE' : 'SENTE';
  state.flipped = !!saved.flipped;
  state.moveCheck = !!saved.moveCheck;
  state.hands = normalizeHands(saved.hands);
  // board
  const b = Array.isArray(saved.board) ? saved.board : [];
  for (let i = 0; i < state.board.length; i++) {
    const p = b[i];
    if (!p) continue;
    const kind = typeof p.kind === 'string' ? p.kind : '';
    const owner = p.owner === 'GOTE' ? 'GOTE' : 'SENTE';
    if (!getPieceDef(kind)) continue;
    state.board[i] = { kind, owner };
  }
} else {
  standardSetup9(state);
}

// initial UI sync
el.piecePack.value = state.packId;
updateEditorPieceOptions(state.packId);
el.boardPreset.value = ['9', '19'].includes(String(state.boardN)) ? String(state.boardN) : 'custom';
el.boardCustom.style.display = el.boardPreset.value === 'custom' ? '' : 'none';
el.boardCustom.value = String(state.boardN);
el.toggleMoveCheck.checked = !!state.moveCheck;
el.boardWrap.style.transform = state.flipped ? 'rotate(180deg)' : '';

renderAll();
computeBoardPx();

