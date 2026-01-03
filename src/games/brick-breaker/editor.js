import { initOverlay } from './overlay.js';
import {
  encodeTile,
  applyCanvasDpr,
  clamp,
  countBlocks,
  downloadJson,
  ensureStages,
  escapeHtml,
  fitStageToWrap,
  makeEmptyStage,
  normalizeStage,
  refreshStageCacheFromSupabase,
  STAGE_COLS,
  STAGE_ROWS,
  TILE,
  uniqueName,
  createStageToSupabase,
  updateStageToSupabaseByName,
  deleteStageFromSupabaseByName
} from './shared.js';

// =========================================================
// Editor page (fullscreen) - Brick Breaker
// =========================================================

function qs(id) {
  return document.getElementById(id);
}

function getStageFromUrl() {
  const sp = new URLSearchParams(location.search);
  const s = sp.get('stage');
  return typeof s === 'string' && s.trim() ? s.trim() : null;
}

// --------------------
// DOM
// --------------------
const editorCanvas = qs('editorCanvas');
const ectx = editorCanvas.getContext('2d');
const eWrap = editorCanvas?.closest('.bb-canvas-wrap');
const eStageBox = qs('editorStage');
const toolButtons = Array.from(document.querySelectorAll('.bb-tool-btn[data-tool]'));
const stageNameEl = qs('stageName');
const toughHpEl = qs('toughHp');
const splitTotalEl = qs('splitTotal');
const toughHpWrap = qs('toughHpWrap');
const splitTotalWrap = qs('splitTotalWrap');
const boingHpEl = qs('boingHp');
const boingHpWrap = qs('boingHpWrap');
const saveBtn = qs('saveBtn');
const loadBtn = qs('loadBtn');
const clearBtn = qs('clearBtn');
const editorStatus = qs('editorStatus');

const libraryOverlay = qs('libraryOverlay');
const libraryClose = qs('libraryClose');
const libraryNew = qs('libraryNew');
const libraryExportAll = qs('libraryExportAll');
const libraryImportBtn = qs('libraryImportBtn');
const libraryImportFile = qs('libraryImportFile');
const libraryListEl = qs('libraryList');
const libraryCountEl = qs('libraryCount');

const { showOverlay } = initOverlay();

// --------------------
// Canvas Resize (DPR対応)
// --------------------
let eViewW = 800;
let eViewH = 420;

function resizeEditorCanvas() {
  // ステージ(14×10)と同じ比率で、画面に収まる最大サイズにする
  if (eWrap && eStageBox) {
    fitStageToWrap({ wrapEl: eWrap, stageEl: eStageBox, designW: STAGE_COLS, designH: STAGE_ROWS });
  }
  const { w, h } = applyCanvasDpr(editorCanvas, ectx);
  eViewW = w;
  eViewH = h;
}

window.addEventListener('resize', () => {
  resizeEditorCanvas();
  drawEditor();
});

// --------------------
// Editor state
// --------------------
let currentTool = 'normal';
let currentStage = makeEmptyStage('新しいステージ');
let loadedStageName = null; // 既存ステージをロードして編集しているときの「元の名前」

function isUniqueViolation(e) {
  // Postgres unique_violation: 23505
  if (e?.code === '23505') return true;
  const msg = String(e?.message || e?.details || '');
  return msg.includes('duplicate key') || msg.includes('unique') || msg.includes('23505');
}

function setTool(tool) {
  currentTool = tool;
  toolButtons.forEach(btn => {
    btn.dataset.active = btn.dataset.tool === tool ? 'true' : 'false';
  });
  // UIをすっきり：必要なパラメータだけ見せる
  if (toughHpWrap) toughHpWrap.style.display = tool === 'tough' ? 'inline-flex' : 'none';
  if (splitTotalWrap) splitTotalWrap.style.display = tool === 'split' ? 'inline-flex' : 'none';
  if (boingHpWrap) boingHpWrap.style.display = tool === 'boingx' ? 'inline-flex' : 'none';
}
setTool('normal');

function gridIndex(x, y) {
  return y * STAGE_COLS + x;
}

function getCellFromPointer(evt) {
  const rect = editorCanvas.getBoundingClientRect();
  const nx = (evt.clientX - rect.left) / rect.width;
  const ny = (evt.clientY - rect.top) / rect.height;
  const cx = clamp(Math.floor(nx * STAGE_COLS), 0, STAGE_COLS - 1);
  const cy = clamp(Math.floor(ny * STAGE_ROWS), 0, STAGE_ROWS - 1);
  return { x: cx, y: cy };
}

function toolToTile(tool) {
  if (tool === 'empty') return TILE.EMPTY;
  if (tool === 'tough') return TILE.TOUGH;
  if (tool === 'split') return TILE.SPLIT;
  if (tool === 'soft') return TILE.SOFT;
  if (tool === 'wall') return TILE.WALL;
  if (tool === 'bomb') return TILE.BOMB;
  if (tool === 'portal') return TILE.PORTAL;
  if (tool === 'reverse') return TILE.REVERSE;
  if (tool === 'big') return TILE.BIG;
  if (tool === 'oneway') return TILE.ONE_WAY;
  if (tool === 'slow') return TILE.SLOW;
  if (tool === 'fast') return TILE.FAST;
  if (tool === 'sticky') return TILE.STICKY;
  if (tool === 'invincible') return TILE.INVINCIBLE;
  if (tool === 'boingx') return TILE.BOING_X;
  return TILE.NORMAL;
}

function applyToolAt(x, y) {
  const idx = gridIndex(x, y);
  const t = toolToTile(currentTool);
  if (t === TILE.TOUGH) {
    const hp = clamp(Number(toughHpEl?.value || 3), 1, 50);
    currentStage.grid[idx] = encodeTile(t, hp);
    return;
  }
  if (t === TILE.SPLIT) {
    const total = clamp(Number(splitTotalEl?.value || 5), 2, 50);
    currentStage.grid[idx] = encodeTile(t, total);
    return;
  }
  if (t === TILE.BOING_X) {
    const hp = clamp(Number(boingHpEl?.value || 2), 1, 10);
    currentStage.grid[idx] = encodeTile(t, hp);
    return;
  }
  currentStage.grid[idx] = encodeTile(t, 0);
}

function tileColor(t) {
  if (t === TILE.NORMAL) return '#74b9ff';
  if (t === TILE.TOUGH) return '#a29bfe';
  if (t === TILE.SPLIT) return '#00cec9';
  if (t === TILE.SOFT) return '#ffeaa7';
  if (t === TILE.WALL) return '#636e72';
  if (t === TILE.BOMB) return '#ff7675';
  if (t === TILE.PORTAL) return '#74f8ff';
  if (t === TILE.REVERSE) return '#55efc4';
  if (t === TILE.BIG) return '#81ecec';
  if (t === TILE.ONE_WAY) return '#fab1a0';
  if (t === TILE.SLOW) return '#74f8ff';
  if (t === TILE.FAST) return '#ff5252';
  if (t === TILE.STICKY) return '#b388ff';
  if (t === TILE.INVINCIBLE) return '#ffe66d';
  if (t === TILE.BOING_X) return '#fd79a8';
  return '#ffffff';
}

function drawEditor() {
  const W = eViewW;
  const H = eViewH;
  ectx.clearRect(0, 0, W, H);

  // 背景
  ectx.fillStyle = '#f8f9ff';
  ectx.fillRect(0, 0, W, H);

  const cellW = W / STAGE_COLS;
  const cellH = H / STAGE_ROWS;

  // タイル
  for (let y = 0; y < STAGE_ROWS; y++) {
    for (let x = 0; x < STAGE_COLS; x++) {
      const raw = currentStage.grid[gridIndex(x, y)];
      const t = (Number(raw) || 0) & 0xff;
      const p = ((Number(raw) || 0) >> 8) & 0xff;
      if (t === TILE.EMPTY) continue;
      ectx.fillStyle = tileColor(t);
      const px = x * cellW;
      const py = y * cellH;
      ectx.fillRect(px + 2, py + 2, cellW - 4, cellH - 4);

      // かたい/ぶんれつはアイコンを少し
      ectx.fillStyle = 'rgba(0,0,0,0.65)';
      ectx.font = `${Math.max(12, Math.floor(Math.min(cellW, cellH) * 0.42))}px Outfit, sans-serif`;
      ectx.textAlign = 'center';
      ectx.textBaseline = 'middle';
      if (t === TILE.TOUGH) ectx.fillText(String(p || 3), px + cellW / 2, py + cellH / 2);
      if (t === TILE.SPLIT) ectx.fillText(`✶${p || 5}`, px + cellW / 2, py + cellH / 2);
      if (t === TILE.SOFT) ectx.fillText('≈', px + cellW / 2, py + cellH / 2);
      if (t === TILE.WALL) ectx.fillText('■', px + cellW / 2, py + cellH / 2);
      if (t === TILE.BOMB) ectx.fillText('💣', px + cellW / 2, py + cellH / 2);
      if (t === TILE.PORTAL) ectx.fillText('🌀', px + cellW / 2, py + cellH / 2);
      if (t === TILE.REVERSE) ectx.fillText('🙃', px + cellW / 2, py + cellH / 2);
      if (t === TILE.BIG) ectx.fillText('🔵', px + cellW / 2, py + cellH / 2);
      if (t === TILE.ONE_WAY) ectx.fillText('⬇', px + cellW / 2, py + cellH / 2);
      if (t === TILE.SLOW) ectx.fillText('🐌', px + cellW / 2, py + cellH / 2);
      if (t === TILE.FAST) ectx.fillText('⚡', px + cellW / 2, py + cellH / 2);
      if (t === TILE.STICKY) ectx.fillText('🩹', px + cellW / 2, py + cellH / 2);
      if (t === TILE.INVINCIBLE) ectx.fillText('🌈', px + cellW / 2, py + cellH / 2);
      if (t === TILE.BOING_X) ectx.fillText(`↔${p || 2}`, px + cellW / 2, py + cellH / 2);
    }
  }

  // グリッド線
  ectx.strokeStyle = 'rgba(0,0,0,0.06)';
  ectx.lineWidth = 1;
  for (let x = 0; x <= STAGE_COLS; x++) {
    const p = Math.round(x * cellW) + 0.5;
    ectx.beginPath();
    ectx.moveTo(p, 0);
    ectx.lineTo(p, H);
    ectx.stroke();
  }
  for (let y = 0; y <= STAGE_ROWS; y++) {
    const p = Math.round(y * cellH) + 0.5;
    ectx.beginPath();
    ectx.moveTo(0, p);
    ectx.lineTo(W, p);
    ectx.stroke();
  }

  if (editorStatus) editorStatus.textContent = `${STAGE_COLS}×${STAGE_ROWS}`;
}

let isPainting = false;
let lastPaint = null;
editorCanvas.addEventListener('pointerdown', (e) => {
  editorCanvas.setPointerCapture?.(e.pointerId);
  isPainting = true;
  const c = getCellFromPointer(e);
  lastPaint = c;
  applyToolAt(c.x, c.y);
  drawEditor();
  e.preventDefault();
});
editorCanvas.addEventListener('pointermove', (e) => {
  if (!isPainting) return;
  const c = getCellFromPointer(e);
  if (lastPaint && c.x === lastPaint.x && c.y === lastPaint.y) return;
  lastPaint = c;
  applyToolAt(c.x, c.y);
  drawEditor();
  e.preventDefault();
});
function endPaint() {
  isPainting = false;
  lastPaint = null;
}
editorCanvas.addEventListener('pointerup', endPaint);
editorCanvas.addEventListener('pointercancel', endPaint);

toolButtons.forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

// --------------------
// Library (Overlay)
// --------------------
function openLibrary() {
  renderLibrary();
  libraryOverlay.style.display = 'flex';
  libraryOverlay.setAttribute('aria-hidden', 'false');
}

function closeLibrary() {
  libraryOverlay.style.display = 'none';
  libraryOverlay.setAttribute('aria-hidden', 'true');
}

libraryClose?.addEventListener('click', closeLibrary);
libraryOverlay?.addEventListener('click', (e) => {
  if (e.target === libraryOverlay) closeLibrary();
});

libraryNew?.addEventListener('click', () => {
  closeLibrary();
  currentStage = makeEmptyStage('新しいステージ');
  stageNameEl.value = currentStage.name;
  loadedStageName = null;
  drawEditor();
});

libraryExportAll?.addEventListener('click', () => {
  const list = ensureStages();
  downloadJson('n-games-brick-breaker-stages.json', list);
  showOverlay('書き出したよ', '全部のステージを1つのファイルにしたよ。');
});

libraryImportBtn?.addEventListener('click', () => {
  libraryImportFile.value = '';
  libraryImportFile.click();
});

async function importFromFile(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    showOverlay('インポート失敗', 'JSONファイルじゃないみたい。');
    return;
  }

  const incoming = Array.isArray(parsed) ? parsed : [parsed];
  const normalized = incoming.map(normalizeStage);
  const existing = ensureStages();
  const names = new Set(existing.map(s => s.name));

  let ok = 0;
  for (const s of normalized) {
    const name = uniqueName(s.name, names);
    names.add(name);
    try {
      await createStageToSupabase({ ...s, name });
      ok++;
    } catch (e) {
      console.error('Import upsert failed:', e);
    }
  }
  await refreshStageCacheFromSupabase();
  renderLibrary();
  showOverlay('インポートOK', `${ok}こ取りこんだよ。`);
}

libraryImportFile?.addEventListener('change', async () => {
  const f = libraryImportFile.files?.[0];
  if (!f) return;
  await importFromFile(f);
});

function renderLibrary() {
  const list = ensureStages();
  libraryCountEl.textContent = `${list.length}こ`;
  libraryListEl.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.style.padding = '12px';
    empty.style.borderRadius = '14px';
    empty.style.background = 'rgba(255,255,255,0.08)';
    empty.style.border = '1px solid rgba(255,255,255,0.12)';
    empty.innerHTML = `
      <div style="font-weight: 900;">まだステージがないよ</div>
      <div style="opacity: 0.9; margin-top: 4px; font-size: 0.95rem;">作って「保存」するとここに出てくるよ。</div>
    `;
    libraryListEl.appendChild(empty);
    return;
  }

  list.forEach((s) => {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr auto';
    row.style.gap = '10px';
    row.style.alignItems = 'center';
    row.style.padding = '12px';
    row.style.borderRadius = '14px';
    row.style.background = 'rgba(255, 255, 255, 0.08)';
    row.style.border = '1px solid rgba(255,255,255,0.12)';

    const blocks = countBlocks(s);
    const info = document.createElement('div');
    info.innerHTML = `
      <div style="display:flex; gap: 10px; flex-wrap: wrap; align-items: baseline;">
        <div style="font-weight: 900; font-size: 1.1rem;">${escapeHtml(s.name)}</div>
        <div style="opacity: 0.9; font-size: 0.9rem;">ブロック ${blocks}こ</div>
      </div>
      <div style="opacity: 0.85; margin-top: 4px; font-size: 0.9rem;">${s.cols}×${s.rows}</div>
    `;

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.flexWrap = 'wrap';
    actions.style.justifyContent = 'flex-end';

    const btnLoadStage = document.createElement('button');
    btnLoadStage.className = 'bb-mini-btn';
    btnLoadStage.textContent = 'ロード';
    btnLoadStage.addEventListener('click', () => {
      currentStage = normalizeStage(s);
      stageNameEl.value = currentStage.name;
      loadedStageName = currentStage.name;
      closeLibrary();
      drawEditor();
      showOverlay('ロードしたよ', `「${currentStage.name}」を読みこみました。`);
    });

    const btnExport = document.createElement('button');
    btnExport.className = 'bb-mini-btn';
    btnExport.textContent = '書き出し';
    btnExport.addEventListener('click', () => {
      downloadJson(`${s.name}.brick-breaker.stage.json`, s);
      showOverlay('書き出したよ', `「${s.name}」をファイルにしました。`);
    });

    const btnDelete = document.createElement('button');
    btnDelete.className = 'bb-mini-btn danger';
    btnDelete.textContent = '削除';
    btnDelete.addEventListener('click', () => {
      void (async () => {
        if (!confirm(`「${s.name}」を削除する？（元に戻せないよ）`)) return;
        try {
          await deleteStageFromSupabaseByName(s.name);
          await refreshStageCacheFromSupabase();
          renderLibrary();
          showOverlay('削除したよ', `「${s.name}」を削除しました。`);
        } catch (e) {
          console.error(e);
          showOverlay('削除できなかった…', 'Supabaseから削除できなかったよ。');
        }
      })();
    });

    actions.appendChild(btnLoadStage);
    actions.appendChild(btnExport);
    actions.appendChild(btnDelete);
    row.appendChild(info);
    row.appendChild(actions);
    libraryListEl.appendChild(row);
  });
}

// --------------------
// Buttons
// --------------------
saveBtn.addEventListener('click', () => {
  void (async () => {
    const name = (stageNameEl.value || '').trim();
    if (!name) {
      showOverlay('名前がいるよ', '「名前」を入れてから保存してね。');
      return;
    }
    const prevDisabled = saveBtn.disabled;
    saveBtn.disabled = true;
    try {
      currentStage.name = name;
      showOverlay('保存中…', 'Supabaseに保存しているよ。', '', { closable: false });
      if (loadedStageName) {
        await updateStageToSupabaseByName(loadedStageName, currentStage);
      } else {
        await createStageToSupabase(currentStage);
      }
      loadedStageName = currentStage.name;
      await refreshStageCacheFromSupabase();
      showOverlay('保存したよ', `「${currentStage.name}」を保存しました。`);
      renderLibrary();
    } catch (e) {
      console.error(e);
      if (e?.code === 'STAGE_NOT_FOUND') {
        showOverlay('保存できなかった…', 'このステージが見つからなかったよ。いちど読みこみ直してね。');
      } else if (isUniqueViolation(e)) {
        showOverlay('同じ名前があるよ', '同名のステージがすでにあるので、別の名前にして保存してね。');
      } else {
        showOverlay('保存できなかった…', 'Supabaseに保存できなかったよ。');
      }
    } finally {
      saveBtn.disabled = prevDisabled;
    }
  })();
});

loadBtn.addEventListener('click', () => {
  void (async () => {
    await refreshStageCacheFromSupabase({
      showError: true,
      onError: () => {
        showOverlay('通信エラー', 'Supabaseからステージを読みこめなかったよ。ネットワークを確認してね。');
      }
    });
    openLibrary();
  })();
});

clearBtn.addEventListener('click', () => {
  if (!confirm('いまのステージをぜんぶ消す？（保存してないと元に戻せないよ）')) return;
  const name = (stageNameEl.value || '').trim() || '新しいステージ';
  currentStage = makeEmptyStage(name);
  drawEditor();
});

// --------------------
// Init
// --------------------
async function init() {
  // キャッシュ準備
  ensureStages();
  resizeEditorCanvas();

  // URL指定があればロード（キャッシュ上にあるもの）
  const desired = getStageFromUrl();
  if (desired) {
    const list = ensureStages();
    const found = list.find(s => s.name === desired);
    if (found) {
      currentStage = normalizeStage(found);
      stageNameEl.value = currentStage.name;
      loadedStageName = currentStage.name;
    }
  }

  // 空なら初期名
  if (!stageNameEl.value) stageNameEl.value = currentStage.name;

  drawEditor();

  // Supabaseから最新を取り込み（失敗してもキャッシュで動く）
  await refreshStageCacheFromSupabase();

  // 取り込み後、URL指定があるなら更新してロードし直す（存在すれば）
  if (desired) {
    const list = ensureStages();
    const found = list.find(s => s.name === desired);
    if (found) {
      currentStage = normalizeStage(found);
      stageNameEl.value = currentStage.name;
      loadedStageName = currentStage.name;
      drawEditor();
    }
  }
}

init();

