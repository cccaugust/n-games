import { getCurrentPlayer, logout, switchPlayer, requireAuth } from '../../js/auth.js';
import { resolvePath } from '../../js/config.js';

requireAuth();

const player = getCurrentPlayer();
// Assuming player object now has avatar since we updated selectPlayer to store full object
document.getElementById('playerName').innerHTML = `<span style="font-size: 1.5rem; margin-right: 5px;">${player.avatar || '👤'}</span> ${player.name}`;
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('switchBtn').addEventListener('click', switchPlayer);

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
  },
  {
    id: 'snake',
    title: 'はらぺこヘビ',
    desc: 'なが〜〜〜くなるよ',
    color: '#81ecec',
    icon: '🐍',
    link: '/games/snake/'
  },
  {
    id: 'brick-breaker',
    title: 'ブロックくずし',
    desc: 'ボールをおとすな！',
    color: '#ffeaa7',
    icon: '🧱',
    link: '/games/brick-breaker/'
  },
  {
    id: 'math-quiz',
    title: 'さんすうクイズ',
    desc: 'めざせ！けいさんマスター',
    color: '#55efc4',
    icon: '✏️',
    link: '/games/math-quiz/'
  },
  {
    id: 'slime-adventure',
    title: 'スライムの大冒険',
    desc: 'ゴールをめざせ！',
    color: '#81ecec',
    icon: '🛡️',
    link: '/games/slime-adventure/'
  },
  {
    id: 'warp-jump',
    title: 'ワープジャンプ！',
    desc: 'モンスターでジャンプしよう！',
    color: '#a8edea',
    icon: '👾',
    link: '/games/warp-jump/'
  },
  {
    id: 'pokedex',
    title: 'オリジナルポケモン図鑑',
    desc: 'キミだけの最強ポケモン！',
    color: '#ff7675',
    icon: '📖',
    link: '/pages/pokedex/'
  },
  {
    id: 'mon-paint',
    title: 'ポケモンスタンプお絵かき',
    desc: 'スタンプで自由にアート！',
    color: '#fab1a0',
    icon: '🎨',
    link: '/pages/mon-paint/'
  },
  {
    id: 'mon-survivor',
    title: 'モンスターサバイバー',
    desc: '大量の敵をなぎ倒せ！',
    color: '#ff4757',
    icon: '⚔️',
    link: '/pages/mon-survivor/'
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
