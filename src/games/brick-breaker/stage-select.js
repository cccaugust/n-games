import { countBlocks, ensureStages, escapeHtml, refreshStageCacheFromSupabase, TILE, normalizeStage } from './shared.js';
import { initOverlay } from './overlay.js';

function qs(id) {
  return document.getElementById(id);
}

function stageHref(page, name) {
  if (!name) return page;
  return `${page}?stage=${encodeURIComponent(name)}`;
}

let lastRenderedStages = [];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function applyDpr(canvasEl, context2d) {
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const rect = canvasEl.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvasEl.width = Math.round(w * dpr);
  canvasEl.height = Math.round(h * dpr);
  context2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
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
  return '#000000';
}

function drawStagePreview(canvasEl, stage) {
  if (!canvasEl || !stage) return;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;

  const s = normalizeStage(stage);
  const { w: W, h: H } = applyDpr(canvasEl, ctx);

  ctx.clearRect(0, 0, W, H);

  // 背景
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#111827');
  g.addColorStop(1, '#0b1020');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const cols = s.cols || 14;
  const rows = s.rows || 10;

  const pad = Math.max(6, Math.round(Math.min(W, H) * 0.06));
  const innerW = Math.max(1, W - pad * 2);
  const innerH = Math.max(1, H - pad * 2);
  const cellW = innerW / cols;
  const cellH = innerH / rows;
  const gap = clamp(Math.min(cellW, cellH) * 0.12, 0.6, 2.2);

  // タイル
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const t = s.grid[idx];
      if (t === TILE.EMPTY) continue;
      const px = pad + x * cellW;
      const py = pad + y * cellH;
      ctx.fillStyle = tileColor(t);
      ctx.fillRect(px + gap, py + gap, Math.max(1, cellW - gap * 2), Math.max(1, cellH - gap * 2));
    }
  }

  // ふち
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(pad + 0.5, pad + 0.5, innerW - 1, innerH - 1);
}

function drawAllPreviews(list) {
  const listEl = qs('stageList');
  if (!listEl) return;
  const canvases = Array.from(listEl.querySelectorAll('canvas[data-stage-index]'));
  canvases.forEach((c) => {
    const idx = Number(c.dataset.stageIndex);
    const s = list[idx];
    if (!s) return;
    drawStagePreview(c, s);
  });
}

function renderStages(list) {
  const listEl = qs('stageList');
  const countEl = qs('stageCount');
  if (!listEl) return;

  lastRenderedStages = Array.isArray(list) ? list : [];
  countEl.textContent = `${list.length}こ`;

  if (list.length === 0) {
    listEl.innerHTML = `<div class="bb-card">まだステージがないよ。右上の「新しく作る」で作ってね。</div>`;
    return;
  }

  listEl.innerHTML = list.map((s, i) => {
    const blocks = countBlocks(s);
    const name = escapeHtml(s.name);
    const playLink = stageHref('./play.html', s.name);
    const editLink = stageHref('./editor.html', s.name);
    return `
      <div class="bb-card">
        <div class="bb-stage-preview-wrap" aria-hidden="true">
          <canvas class="bb-stage-preview" data-stage-index="${i}"></canvas>
        </div>
        <div style="display:flex; gap: 10px; flex-wrap: wrap; align-items: baseline;">
          <div style="font-weight: 900; font-size: 1.1rem;">${name}</div>
          <div style="color: var(--text-light); font-size: 0.95rem;">ブロック ${blocks}こ</div>
        </div>
        <div style="margin-top: 2px; color: var(--text-light); font-size: 0.9rem;">${s.cols}×${s.rows}</div>
        <div style="display:flex; gap: 10px; flex-wrap: wrap; margin-top: 12px;">
          <a class="btn-primary" href="${playLink}" style="text-decoration:none; border-radius: 999px; padding: 10px 14px;">プレイ</a>
          <a class="bb-tool-btn" href="${editLink}" style="text-decoration:none; border-radius: 999px; padding: 10px 14px; display:inline-flex; align-items:center;">編集</a>
        </div>
      </div>
    `;
  }).join('');

  // レイアウト確定後に描画（サイズが取れるように）
  requestAnimationFrame(() => drawAllPreviews(list));
}

async function refresh(showOverlay) {
  const refreshBtn = qs('refreshBtn');
  const prev = refreshBtn?.disabled;
  if (refreshBtn) refreshBtn.disabled = true;
  const list = await refreshStageCacheFromSupabase({
    showError: true,
    onError: () => {
      showOverlay?.('通信エラー', 'Supabaseからステージを読みこめなかったよ。ネットワークを確認してね。');
    }
  });
  renderStages(list);
  if (refreshBtn) refreshBtn.disabled = prev ?? false;
}

function init() {
  const { showOverlay } = initOverlay();

  const initial = ensureStages();
  renderStages(initial);

  qs('refreshBtn')?.addEventListener('click', () => {
    void refresh(showOverlay);
  });
  qs('newBtn')?.addEventListener('click', () => {
    location.href = './editor.html';
  });

  // 背景で最新を取り込み（失敗してもキャッシュで動く）
  void refresh(showOverlay);

  let raf = 0;
  window.addEventListener('resize', () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      drawAllPreviews(lastRenderedStages);
    });
  });
}

init();

