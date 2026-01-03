import { initOverlay } from './overlay.js';
import { clamp, countGems, ensureStages, escapeHtml, normalizeStage, stageHref, STAGE_COLS, STAGE_ROWS, TILE } from './shared.js';

function qs(id) {
  return document.getElementById(id);
}

let lastRenderedStages = [];

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
  if (t === TILE.WALL) return 'rgba(255,255,255,0.22)';
  if (t === TILE.GEM) return 'rgba(0, 206, 201, 0.85)';
  if (t === TILE.SPIKE) return 'rgba(255, 118, 117, 0.85)';
  if (t === TILE.GOAL) return 'rgba(162, 155, 254, 0.90)';
  if (t === TILE.START) return 'rgba(255, 234, 167, 0.92)';
  return 'rgba(255,255,255,0.03)';
}

function drawStagePreview(canvasEl, stage) {
  if (!canvasEl || !stage) return;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;

  const s = normalizeStage(stage);
  const { w: W, h: H } = applyDpr(canvasEl, ctx);

  ctx.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#111827');
  g.addColorStop(1, '#0b1020');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const cols = s.cols || STAGE_COLS;
  const rows = s.rows || STAGE_ROWS;
  const pad = Math.max(6, Math.round(Math.min(W, H) * 0.08));
  const innerW = Math.max(1, W - pad * 2);
  const innerH = Math.max(1, H - pad * 2);
  const cellW = innerW / cols;
  const cellH = innerH / rows;
  const gap = clamp(Math.min(cellW, cellH) * 0.10, 0.6, 2.2);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const t = s.grid[idx];
      if (t === TILE.FLOOR) continue;
      const px = pad + x * cellW;
      const py = pad + y * cellH;
      ctx.fillStyle = tileColor(t);
      ctx.fillRect(px + gap, py + gap, Math.max(1, cellW - gap * 2), Math.max(1, cellH - gap * 2));
    }
  }

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
  if (countEl) countEl.textContent = `${list.length}こ`;

  if (list.length === 0) {
    listEl.innerHTML = `<div class="pq-card">まだステージがないよ。「新規作成」で作ってね。</div>`;
    return;
  }

  listEl.innerHTML = list
    .map((s, i) => {
      const gems = countGems(s);
      const name = escapeHtml(s.name);
      const playLink = stageHref('./play.html', s.name);
      const editLink = stageHref('./editor.html', s.name);
      return `
      <div class="pq-card">
        <div class="pq-stage-preview-wrap" aria-hidden="true">
          <canvas class="pq-stage-preview" data-stage-index="${i}"></canvas>
        </div>
        <div style="display:flex; gap: 10px; flex-wrap: wrap; align-items: baseline; margin-top: 10px;">
          <div style="font-weight: 900; font-size: 1.1rem;">${name}</div>
          <div style="opacity: 0.85; font-size: 0.95rem;">宝石 ${gems}こ</div>
        </div>
        <div style="margin-top: 2px; opacity: 0.85; font-size: 0.9rem;">${s.cols}×${s.rows}</div>
        <div style="display:flex; gap: 10px; flex-wrap: wrap; margin-top: 12px;">
          <a class="btn-primary" href="${playLink}" style="text-decoration:none; border-radius: 999px; padding: 10px 14px;">プレイ</a>
          <a class="pq-tool-btn" href="${editLink}" style="text-decoration:none; border-radius: 999px; padding: 10px 14px; display:inline-flex; align-items:center;">編集</a>
        </div>
      </div>
    `;
    })
    .join('');

  requestAnimationFrame(() => drawAllPreviews(list));
}

function init() {
  const { showOverlay } = initOverlay();

  const initial = ensureStages();
  renderStages(initial);

  qs('newBtn')?.addEventListener('click', () => {
    location.href = './editor.html';
  });
  qs('refreshBtn')?.addEventListener('click', () => {
    try {
      renderStages(ensureStages());
    } catch (e) {
      console.error(e);
      showOverlay?.('読みこみ失敗', 'ステージを読みこめなかったよ。');
    }
  });

  let raf = 0;
  window.addEventListener('resize', () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      drawAllPreviews(lastRenderedStages);
    });
  });
}

init();

