import { getPieceDef } from './pieces.js';

const LIB_KEY = 'ngames.shogiStudio.library.v1';

function qs(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function applyDpr(canvasEl, ctx) {
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const rect = canvasEl.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvasEl.width = Math.round(w * dpr);
  canvasEl.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
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

function uuid() {
  try {
    if (crypto?.randomUUID) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const boardN = clamp(Math.floor(Number(parsed.boardN) || 9), 5, 25);
  const board = Array.isArray(parsed.board) ? parsed.board : [];
  const out = {
    version: 1,
    packId: typeof parsed.packId === 'string' ? parsed.packId : 'standard',
    boardN,
    current: parsed.current === 'GOTE' ? 'GOTE' : 'SENTE',
    flipped: !!parsed.flipped,
    moveCheck: !!parsed.moveCheck,
    board: [],
    hands: parsed.hands && typeof parsed.hands === 'object' ? parsed.hands : { SENTE: {}, GOTE: {} }
  };
  out.board = Array.from({ length: boardN * boardN }, (_, i) => {
    const p = board[i];
    if (!p) return null;
    const kind = typeof p.kind === 'string' ? p.kind : '';
    const owner = p.owner === 'GOTE' ? 'GOTE' : 'SENTE';
    if (!getPieceDef(kind)) return null;
    return { kind, owner };
  });
  return out;
}

function drawShogiPreview(canvasEl, payload) {
  if (!canvasEl || !payload) return;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;

  const { w: W, h: H } = applyDpr(canvasEl, ctx);
  ctx.clearRect(0, 0, W, H);

  // 背景
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#111827');
  g.addColorStop(1, '#0b1020');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const n = clamp(Math.floor(Number(payload.boardN) || 9), 5, 25);
  const pad = Math.max(8, Math.round(Math.min(W, H) * 0.06));
  const inner = Math.min(W, H) - pad * 2;
  const cell = inner / n;

  // 盤の地
  const boardG = ctx.createLinearGradient(0, pad, 0, pad + inner);
  boardG.addColorStop(0, '#ffe9b9');
  boardG.addColorStop(1, '#f8d898');
  ctx.fillStyle = boardG;
  ctx.fillRect(pad, pad, inner, inner);

  // 罫線
  ctx.strokeStyle = 'rgba(17, 24, 39, 0.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= n; i++) {
    const x = pad + i * cell;
    const y = pad + i * cell;
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, pad + inner);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(pad + inner, y);
    ctx.stroke();
  }

  // 駒
  const b = Array.isArray(payload.board) ? payload.board : [];
  for (let idx = 0; idx < n * n; idx++) {
    const p = b[idx];
    if (!p) continue;
    const x = idx % n;
    const y = Math.floor(idx / n);
    const cx = pad + x * cell + cell / 2;
    const cy = pad + y * cell + cell / 2;

    const owner = p.owner === 'GOTE' ? 'GOTE' : 'SENTE';
    const base = owner === 'SENTE' ? '#6c5ce7' : '#fd79a8';
    const fill = owner === 'SENTE' ? 'rgba(108,92,231,0.22)' : 'rgba(253,121,168,0.20)';

    ctx.fillStyle = fill;
    ctx.strokeStyle = base;
    ctx.lineWidth = Math.max(1, cell * 0.06);

    const r = cell * 0.42;
    ctx.beginPath();
    // ひし形っぽいコマ
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.82, cy - r * 0.45);
    ctx.lineTo(cx + r, cy + r);
    ctx.lineTo(cx - r, cy + r);
    ctx.lineTo(cx - r * 0.82, cy - r * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const def = getPieceDef(p.kind);
    const label = def?.label || p.kind || '?';
    ctx.fillStyle = 'rgba(17, 24, 39, 0.92)';
    ctx.font = `900 ${clamp(cell * 0.46, 8, 16)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + cell * 0.06);
  }

  // ふち
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(pad + 0.5, pad + 0.5, inner - 1, inner - 1);
}

function defaultPresets() {
  return [
    {
      id: 'preset-standard',
      name: '通常将棋（9×9）',
      desc: 'いちばんふつうの将棋の配置',
      hrefPlay: './index.html?preset=standard',
      hrefEdit: './index.html?preset=standard&edit=1',
      previewPayload: { version: 1, boardN: 9, board: [], packId: 'standard', current: 'SENTE', hands: { SENTE: {}, GOTE: {} } }
    },
    {
      id: 'preset-makadaidai',
      name: '摩訶大大将棋（19×19・簡易）',
      desc: '拡張駒入りの大きい盤（遊びやすい簡易版）',
      hrefPlay: './index.html?preset=makadaidai',
      hrefEdit: './index.html?preset=makadaidai&edit=1',
      previewPayload: { version: 1, boardN: 19, board: [], packId: 'makadaidai-lite', current: 'SENTE', hands: { SENTE: {}, GOTE: {} } }
    }
  ];
}

function renderList() {
  const listEl = qs('layoutList');
  const countEl = qs('layoutCount');
  if (!listEl) return;

  const lib = loadLibrary();
  const saved = Array.isArray(lib.items) ? lib.items : [];
  const presets = defaultPresets();
  countEl.textContent = `${presets.length + saved.length}こ`;

  const cards = [];

  presets.forEach((p, i) => {
    cards.push(`
      <div class="ss-card">
        <div class="ss-preview-wrap" aria-hidden="true">
          <canvas class="ss-preview" data-preview-kind="preset" data-preview-index="${i}"></canvas>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items: baseline;">
          <div style="font-weight: 900; font-size: 1.1rem;">${escapeHtml(p.name)}</div>
        </div>
        <div class="ss-muted" style="margin-top: 4px;">${escapeHtml(p.desc)}</div>
        <div class="ss-actions">
          <a class="btn-primary" href="${p.hrefPlay}" style="text-decoration:none; border-radius: 999px; padding: 10px 14px;">プレイ</a>
          <a class="ss-mini-btn" href="${p.hrefEdit}" style="text-decoration:none; display:inline-flex; align-items:center;">編集</a>
        </div>
      </div>
    `);
  });

  saved.forEach((it, i) => {
    const name = escapeHtml(it?.name || 'マイ配置');
    const boardN = Number(it?.payload?.boardN) || 9;
    const packId = escapeHtml(it?.payload?.packId || 'standard');
    const id = encodeURIComponent(it?.id || '');
    cards.push(`
      <div class="ss-card" data-layout-id="${escapeHtml(it?.id || '')}">
        <div class="ss-preview-wrap" aria-hidden="true">
          <canvas class="ss-preview" data-preview-kind="saved" data-preview-index="${i}"></canvas>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items: baseline;">
          <div style="font-weight: 900; font-size: 1.1rem;">${name}</div>
        </div>
        <div class="ss-muted" style="margin-top: 4px;">${boardN}×${boardN} / pack: ${packId}</div>
        <div class="ss-actions">
          <a class="btn-primary" href="./index.html?layoutId=${id}" style="text-decoration:none; border-radius: 999px; padding: 10px 14px;">プレイ</a>
          <a class="ss-mini-btn" href="./index.html?layoutId=${id}&edit=1" style="text-decoration:none; display:inline-flex; align-items:center;">編集</a>
          <button class="ss-mini-btn danger" data-action="delete" data-id="${escapeHtml(it?.id || '')}">削除</button>
        </div>
      </div>
    `);
  });

  if (cards.length === 0) {
    listEl.innerHTML = `<div class="ss-card">まだ配置がないよ。「新しく作る」で作ってね。</div>`;
    return;
  }

  listEl.innerHTML = cards.join('');

  // プレビュー描画
  requestAnimationFrame(() => {
    const presetCanvases = Array.from(listEl.querySelectorAll('canvas[data-preview-kind="preset"]'));
    presetCanvases.forEach((c) => {
      const idx = Number(c.dataset.previewIndex);
      const p = presets[idx];
      if (!p) return;
      // 実際の盤面は index 側で作るので、ここでは雰囲気プレビュー（空でもOK）
      drawShogiPreview(c, p.previewPayload);
    });

    const savedCanvases = Array.from(listEl.querySelectorAll('canvas[data-preview-kind="saved"]'));
    savedCanvases.forEach((c) => {
      const idx = Number(c.dataset.previewIndex);
      const it = saved[idx];
      const payload = normalizePayload(it?.payload);
      if (!payload) return;
      drawShogiPreview(c, payload);
    });
  });
}

function deleteLayout(id) {
  const lib = loadLibrary();
  lib.items = (lib.items || []).filter((x) => x?.id !== id);
  saveLibrary(lib);
  renderList();
}

function importLayoutFile(file) {
  if (!file) return;
  void (async () => {
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      return;
    }
    const payload = normalizePayload(parsed);
    if (!payload) return;
    const lib = loadLibrary();
    lib.items = Array.isArray(lib.items) ? lib.items : [];
    const nameBase = typeof parsed?.name === 'string' ? parsed.name : 'インポート';
    const name = String(nameBase).slice(0, 24) || 'インポート';
    lib.items.unshift({ id: uuid(), name, updatedAt: Date.now(), payload });
    if (lib.items.length > 60) lib.items.length = 60;
    saveLibrary(lib);
    renderList();
  })();
}

function init() {
  renderList();

  qs('newBtn')?.addEventListener('click', () => {
    location.href = './index.html?new=1&edit=1';
  });

  qs('importBtn')?.addEventListener('click', () => {
    const f = qs('importFile');
    if (!f) return;
    f.value = '';
    f.click();
  });

  qs('importFile')?.addEventListener('change', () => {
    const f = qs('importFile')?.files?.[0];
    if (!f) return;
    importLayoutFile(f);
  });

  qs('layoutList')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="delete"]');
    if (!btn) return;
    const id = btn.dataset.id || '';
    if (!id) return;
    // confirmはシンプルに
    const ok = window.confirm('この配置を削除する？（元に戻せません）');
    if (!ok) return;
    deleteLayout(id);
  });

  let raf = 0;
  window.addEventListener('resize', () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      // 再描画
      const listEl = qs('layoutList');
      if (!listEl) return;
      const lib = loadLibrary();
      const saved = Array.isArray(lib.items) ? lib.items : [];
      const presets = defaultPresets();
      const presetCanvases = Array.from(listEl.querySelectorAll('canvas[data-preview-kind="preset"]'));
      presetCanvases.forEach((c) => {
        const idx = Number(c.dataset.previewIndex);
        const p = presets[idx];
        if (!p) return;
        drawShogiPreview(c, p.previewPayload);
      });
      const savedCanvases = Array.from(listEl.querySelectorAll('canvas[data-preview-kind="saved"]'));
      savedCanvases.forEach((c) => {
        const idx = Number(c.dataset.previewIndex);
        const it = saved[idx];
        const payload = normalizePayload(it?.payload);
        if (!payload) return;
        drawShogiPreview(c, payload);
      });
    });
  });
}

init();

