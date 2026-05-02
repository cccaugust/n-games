// Offline fallback helpers.
// Supabase が落ちている時でも、家族のプレイヤー情報やスコアをローカルで使えるようにする。

export const LOCAL_PLAYERS_KEY = 'n-games-players-local';
export const LOCAL_SCORES_KEY = 'n-games-scores-local';

let offlineNoticeShown = false;

export function genLocalId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function loadLocalPlayers() {
  try {
    const raw = localStorage.getItem(LOCAL_PLAYERS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveLocalPlayers(list) {
  try {
    localStorage.setItem(LOCAL_PLAYERS_KEY, JSON.stringify(list || []));
  } catch (e) {
    console.warn('saveLocalPlayers failed:', e);
  }
}

export function getLocalPlayerById(id) {
  return loadLocalPlayers().find((p) => p.id === id) || null;
}

export function loadLocalScores() {
  try {
    const raw = localStorage.getItem(LOCAL_SCORES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

export function saveLocalScoresMap(map) {
  try {
    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(map || {}));
  } catch (e) {
    console.warn('saveLocalScoresMap failed:', e);
  }
}

export function appendLocalScore(gameId, playerId, score) {
  if (!gameId) return;
  const map = loadLocalScores();
  const arr = Array.isArray(map[gameId]) ? map[gameId] : [];
  arr.push({
    player_id: playerId,
    score: Number(score) || 0,
    created_at: new Date().toISOString()
  });
  arr.sort((a, b) => (b.score || 0) - (a.score || 0));
  map[gameId] = arr.slice(0, 50);
  saveLocalScoresMap(map);
}

export function localRankings(gameId, limit = 5) {
  const map = loadLocalScores();
  const arr = Array.isArray(map[gameId]) ? map[gameId].slice() : [];
  arr.sort((a, b) => (b.score || 0) - (a.score || 0));
  const players = new Map(loadLocalPlayers().map((p) => [p.id, p]));
  return arr.slice(0, limit).map((item) => {
    const p = players.get(item.player_id);
    return {
      score: item.score,
      name: p?.name || 'プレイヤー',
      avatar: p?.avatar || '❓',
      date: new Date(item.created_at).toLocaleDateString()
    };
  });
}

/**
 * 画面右上にオフライン通知を一度だけ出す。
 * @param {string} [message]
 */
export function showOfflineNotice(message = 'オフラインモードで動作中（データはこの端末にだけ保存されます）') {
  if (offlineNoticeShown) return;
  offlineNoticeShown = true;
  if (typeof document === 'undefined') return;

  const ensure = () => {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', ensure, { once: true });
      return;
    }
    const el = document.createElement('div');
    el.textContent = message;
    el.setAttribute('role', 'status');
    el.style.cssText = [
      'position:fixed',
      'top:12px',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:99999',
      'background:rgba(255, 165, 0, 0.95)',
      'color:#3a2200',
      'padding:8px 14px',
      'border-radius:999px',
      'font-size:0.85rem',
      'font-weight:bold',
      'box-shadow:0 4px 14px rgba(0,0,0,0.2)',
      'max-width:calc(100vw - 24px)',
      'text-align:center',
      'pointer-events:none'
    ].join(';');
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 600ms';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 700);
    }, 4000);
  };
  ensure();
}

/**
 * Supabase エラーを観測したらオフライン通知を出す。
 * @param {unknown} err
 * @param {string} [context]
 */
export function noticeSupabaseFailure(err, context = '') {
  if (context) console.warn(`[offline] ${context}:`, err);
  showOfflineNotice();
}
