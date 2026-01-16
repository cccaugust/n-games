import { getCurrentPlayer, logout, requireAuth, switchPlayer } from '../../js/auth.js';
import { navigateTo, resolvePath } from '../../js/config.js';
import { avatarToHtml, escapeHtml } from '../../js/avatar.js';
import { utilityApps } from './apps.js';

requireAuth();

const player = getCurrentPlayer();
const playerNameEl = document.getElementById('playerName');
const grid = document.getElementById('appGrid');

playerNameEl.innerHTML = `${avatarToHtml(player?.avatar, {
  size: 22,
  className: 'portal-avatar',
  alt: ''
})} ${escapeHtml(player?.name || 'Player')}`;

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('switchBtn').addEventListener('click', switchPlayer);
document.getElementById('toGamesBtn').addEventListener('click', () => {
  navigateTo('/pages/portal/portal.html');
});

(utilityApps || []).forEach((app) => {
  const card = document.createElement('a');
  card.href = resolvePath(app.link);
  card.className = 'app-card';
  card.innerHTML = `
    <div class="app-icon">${escapeHtml(app.icon || '🧰')}</div>
    <div class="app-title">${escapeHtml(app.title || 'Utility')}</div>
    <div class="app-desc">${escapeHtml(app.desc || '')}</div>
    <div class="app-tag">OPEN</div>
  `;
  grid.appendChild(card);
});

