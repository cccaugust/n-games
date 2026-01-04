import { initOverlay } from './overlay.js';
import {
  ENEMY_DEFAULT,
  countEnemies,
  ensureStages,
  escapeHtml,
  loadEnemySprite,
  normalizeStage,
  stageHref,
  STAGE_COLS,
  STAGE_ROWS,
  WALL_CELL,
  WALL_ROWS
} from './shared.js';

function qs(id) {
  return document.getElementById(id);
}

let lastRenderedStages = [];
let spriteCache = new Map(); // token -> EnemySprite
let previewAnimRaf = 0;
let lastPreviewDrawMs = 0;

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

function drawStagePreview(canvasEl, stage) {
  if (!canvasEl || !stage) return;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;

  const s = normalizeStage(stage);
  const { w: W, h: H } = applyDpr(canvasEl, ctx);

  ctx.clearRect(0, 0, W, H);

  // Background
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#111827');
  g.addColorStop(1, '#0b1020');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const cols = s.cols || STAGE_COLS;
  const rows = s.rows || STAGE_ROWS;
  const wallRows = s.wallRows || WALL_ROWS;

  const pad = Math.max(6, Math.round(Math.min(W, H) * 0.06));
  const innerW = Math.max(1, W - pad * 2);
  const innerH = Math.max(1, H - pad * 2);
  const cellW = innerW / cols;

  // Split: top=enemies, bottom=walls
  const splitGap = clamp(innerH * 0.03, 2, 6);
  const wallZoneH = innerH * 0.28;
  const enemyZoneH = Math.max(1, innerH - wallZoneH - splitGap);
  const enemyCellH = enemyZoneH / rows;
  const wallCellH = wallZoneH / wallRows;
  const gap = clamp(Math.min(cellW, enemyCellH) * 0.12, 0.6, 2.2);

  function drawDefaultInvaderAt(x, y, w, h) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const bmp = [
      '00111100',
      '01111110',
      '11111111',
      '11011011',
      '11111111',
      '00100100',
      '01000010',
      '10000001'
    ];
    const sx = w / 8;
    const sy = h / 8;
    for (let yy = 0; yy < 8; yy++) {
      for (let xx = 0; xx < 8; xx++) {
        if (bmp[yy][xx] === '1') ctx.fillRect(xx * sx, yy * sy, Math.max(1, sx), Math.max(1, sy));
      }
    }
    ctx.restore();
  }

  function pickAnimatedFrame(sprite, nowMs, offsetMs = 0) {
    const frames = sprite?.frames || [];
    if (frames.length === 0) return null;
    if (frames.length === 1) return frames[0];
    const total =
      Math.max(
        1,
        Number(sprite.totalDurationMs) ||
          frames.reduce((sum, f) => sum + (Number(f.durationMs) || 120), 0) ||
          1
      ) || 1;
    let t = (nowMs + (Number(offsetMs) || 0)) % total;
    for (const f of frames) {
      const d = Math.max(1, Number(f.durationMs) || 120);
      if (t < d) return f;
      t -= d;
    }
    return frames[frames.length - 1];
  }

  function drawSpriteToken(token, x, y, w, h, nowMs, offsetMs) {
    if (token === ENEMY_DEFAULT) {
      drawDefaultInvaderAt(x, y, w, h);
      return;
    }
    const spr = spriteCache.get(token);
    const frame = spr ? pickAnimatedFrame(spr, nowMs, offsetMs) : null;
    const img = frame?.img;
    if (img) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, x, y, w, h);
      return;
    }
    // fallback: tinted placeholder
    ctx.fillStyle = 'rgba(0, 206, 201, 0.9)';
    ctx.fillRect(x, y, w, h);
  }

  const nowMs = performance.now();

  // Enemies as pixels
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const v = s.grid[idx];
      if (v == null) continue;
      const px = pad + x * cellW;
      const py = pad + y * enemyCellH;
      const rw = Math.max(1, cellW - gap * 2);
      const rh = Math.max(1, enemyCellH - gap * 2);
      // subtle glow behind sprite
      ctx.fillStyle = 'rgba(0, 206, 201, 0.10)';
      ctx.fillRect(px + gap - 1, py + gap - 1, rw + 2, rh + 2);
      drawSpriteToken(v, px + gap, py + gap, rw, rh, nowMs, (x * 97 + y * 53) * 7);
    }
  }

  // Walls
  const wallY0 = pad + enemyZoneH + splitGap;
  for (let y = 0; y < wallRows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const v = s.walls?.[idx];
      if (v !== WALL_CELL) continue;
      const px = pad + x * cellW;
      const py = wallY0 + y * wallCellH;
      const g2 = clamp(Math.min(cellW, wallCellH) * 0.10, 0.6, 2.2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(px + g2, py + g2, Math.max(1, cellW - g2 * 2), Math.max(1, wallCellH - g2 * 2));
    }
  }

  // Border
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

async function prepareSpritesForStages(list) {
  const tokens = new Set();
  const stages = Array.isArray(list) ? list : [];
  for (const st of stages) {
    const s = normalizeStage(st);
    for (const cell of s.grid) {
      if (cell == null) continue;
      if (cell === ENEMY_DEFAULT) continue;
      tokens.add(cell);
    }
  }
  const tasks = [];
  for (const t of tokens) {
    if (spriteCache.has(t)) continue;
    tasks.push(
      (async () => {
        const spr = await loadEnemySprite(t);
        spriteCache.set(t, spr);
      })()
    );
  }
  await Promise.all(tasks);
}

function schedulePreviewAnimation() {
  if (previewAnimRaf) return;
  previewAnimRaf = requestAnimationFrame(function tick(now) {
    previewAnimRaf = 0;
    // throttle to ~12fps to keep it light
    if (now - lastPreviewDrawMs >= 80) {
      lastPreviewDrawMs = now;
      drawAllPreviews(lastRenderedStages);
    }
    previewAnimRaf = requestAnimationFrame(tick);
  });
}

function renderStages(list) {
  const listEl = qs('stageList');
  const countEl = qs('stageCount');
  if (!listEl) return;

  lastRenderedStages = Array.isArray(list) ? list : [];
  countEl.textContent = `${list.length}こ`;

  if (list.length === 0) {
    listEl.innerHTML = `<div class="iv-card">まだステージがないよ。「新規作成」で作ってね。</div>`;
    return;
  }

  listEl.innerHTML = list
    .map((s, i) => {
      const enemies = countEnemies(s);
      const name = escapeHtml(s.name);
      const playLink = stageHref('./play.html', s.name);
      const editLink = stageHref('./editor.html', s.name);
      return `
      <div class="iv-card">
        <div class="iv-stage-preview-wrap" aria-hidden="true">
          <canvas class="iv-stage-preview" data-stage-index="${i}"></canvas>
        </div>
        <div style="display:flex; gap: 10px; flex-wrap: wrap; align-items: baseline;">
          <div style="font-weight: 900; font-size: 1.1rem;">${name}</div>
          <div style="color: var(--text-light); font-size: 0.95rem;">敵 ${enemies}体</div>
        </div>
        <div style="margin-top: 2px; color: var(--text-light); font-size: 0.9rem;">${s.cols}×${s.rows}</div>
        <div style="display:flex; gap: 10px; flex-wrap: wrap; margin-top: 12px;">
          <a class="btn-primary" href="${playLink}" style="text-decoration:none; border-radius: 999px; padding: 10px 14px;">プレイ</a>
          <a class="iv-tool-btn" href="${editLink}" style="text-decoration:none; border-radius: 999px; padding: 10px 14px; display:inline-flex; align-items:center;">編集</a>
        </div>
      </div>
    `;
    })
    .join('');

  // Load sprites (including sample assets) then draw with actual art.
  void (async () => {
    try {
      await prepareSpritesForStages(list);
    } catch (e) {
      console.warn('prepareSpritesForStages failed:', e);
    }
    drawAllPreviews(list);
    schedulePreviewAnimation();
  })();
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

