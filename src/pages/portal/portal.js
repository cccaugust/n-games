import { getCurrentPlayer, logout, requireAuth } from '../../js/auth.js';
import { resolvePath } from '../../js/config.js';

requireAuth();

const player = getCurrentPlayer();
document.getElementById('playerName').textContent = player.name;
document.getElementById('logoutBtn').addEventListener('click', logout);

const games = [
  {
    id: 'whack-a-mole',
    title: 'モグラたたき',
    desc: 'ピコピコハンマーでやっつけろ！',
    color: '#fab1a0',
    icon: '🐹',
    link: '/games/whack-a-mole/'
  },
  {
    id: 'space-jumper',
    title: '宇宙ジャンプ',
    desc: 'うちゅうのかなたへ！',
    color: '#74b9ff',
    icon: '🚀',
    link: '/games/space-jumper/'
  },
  {
    id: 'memory-match',
    title: '神経衰弱',
    desc: 'カードをあわせてね',
    color: '#a29bfe',
    icon: '🃏',
    link: '/games/memory-match/'
  }
];

const grid = document.getElementById('gameGrid');

games.forEach(game => {
  const card = document.createElement('a');
  card.href = resolvePath(game.link);
  card.className = 'game-card';
  card.style.textDecoration = 'none';
  card.style.color = 'inherit';

  card.innerHTML = `
    <div class="game-thumbnail" style="background-color: ${game.color}">
      <div class="game-icon">${game.icon}</div>
    </div>
    <div class="game-info">
      <h3>${game.title}</h3>
      <p>${game.desc}</p>
      <div class="play-tag">PLAY</div>
    </div>
  `;

  grid.appendChild(card);
});
