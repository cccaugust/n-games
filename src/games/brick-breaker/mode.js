import { STAGE_COLS, STAGE_ROWS, ensureStages, refreshStageCacheFromSupabase } from './shared.js';

function qs(id) {
  return document.getElementById(id);
}

function init() {
  // 初回起動でキャッシュが空ならサンプル投入
  ensureStages();
  void refreshStageCacheFromSupabase();

  const sizeEl = qs('stageSize');
  if (sizeEl) sizeEl.textContent = `${STAGE_COLS}×${STAGE_ROWS}`;

  qs('goPlay')?.addEventListener('click', () => {
    location.href = './stage-select.html';
  });
  qs('goEdit')?.addEventListener('click', () => {
    location.href = './editor.html';
  });
}

init();

