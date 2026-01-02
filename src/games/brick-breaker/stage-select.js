import { countBlocks, ensureStages, escapeHtml, refreshStageCacheFromSupabase } from './shared.js';
import { initOverlay } from './overlay.js';

function qs(id) {
  return document.getElementById(id);
}

function stageHref(page, name) {
  if (!name) return page;
  return `${page}?stage=${encodeURIComponent(name)}`;
}

function renderStages(list) {
  const listEl = qs('stageList');
  const countEl = qs('stageCount');
  if (!listEl) return;

  countEl.textContent = `${list.length}こ`;

  if (list.length === 0) {
    listEl.innerHTML = `<div class="bb-card">まだステージがないよ。右上の「新しく作る」で作ってね。</div>`;
    return;
  }

  listEl.innerHTML = list.map((s) => {
    const blocks = countBlocks(s);
    const name = escapeHtml(s.name);
    const playLink = stageHref('./play.html', s.name);
    const editLink = stageHref('./editor.html', s.name);
    return `
      <div class="bb-card">
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
}

init();

