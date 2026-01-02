import { getCurrentPlayer, logout, switchPlayer, requireAuth } from '../../js/auth.js';
import { resolvePath } from '../../js/config.js';
import { avatarToHtml, escapeHtml } from '../../js/avatar.js';

requireAuth();

const player = getCurrentPlayer();
// Assuming player object now has avatar since we updated selectPlayer to store full object
document.getElementById('playerName').innerHTML = `${avatarToHtml(player?.avatar, {
  size: 22,
  className: 'portal-avatar',
  alt: ''
})} ${escapeHtml(player?.name || 'Player')}`;
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('switchBtn').addEventListener('click', switchPlayer);

const games = [
  {
    id: 'japan-map-quest',
    title: '日本マップクエスト',
    desc: '奈良県をめざせ！県ミッションつき🗾',
    color: '#74b9ff',
    icon: '🗾',
    link: '/games/japan-map-quest/'
  },
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
    id: 'yojijukugo-quiz',
    title: '四字熟語クイズ',
    desc: 'よみ/いみで たのしく学ぼう！',
    color: '#fdcb6e',
    icon: '📚',
    link: '/games/yojijukugo-quiz/'
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
    id: 'invaders',
    title: 'インベーダー',
    desc: 'したからうってたおそう！',
    color: '#00cec9',
    icon: '🛸',
    link: '/games/invaders/'
  },
  {
    id: 'berry-bounce',
    title: 'ベリーバウンス',
    desc: 'ベリーをキャッチ！💣はよけよう',
    color: '#a29bfe',
    icon: '🫐',
    link: '/games/berry-bounce/'
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
    id: 'pixel-art-maker',
    title: 'ドット絵メーカー',
    desc: 'ドットでキャラやタイルをつくろう！',
    color: '#dfe6ff',
    icon: '🧩',
    link: '/pages/pixel-art-maker/'
  },
  {
    id: 'mon-survivor',
    title: 'モンスターサバイバー',
    desc: '大量の敵をなぎ倒せ！',
    color: '#ff4757',
    icon: '⚔️',
    link: '/pages/mon-survivor/'
  },
  {
    id: 'poke-shooter',
    title: 'ポケモンシューター',
    desc: 'モンスターボールでポケモンをつかまえろ！',
    color: '#fab1a0',
    icon: '🎯',
    link: '/games/poke-shooter/'
  },
  {
    id: 'poke-drop',
    title: 'ポケ・ドロップ',
    desc: 'ポケモンをくっつけて進化させよう！',
    color: '#a29bfe',
    icon: '🔮',
    link: '/games/poke-drop/'
  },
  {
    id: 'poke-quiz',
    title: 'ポケモンクイズ',
    desc: 'シルエットでポケモンをあてよう！',
    color: '#ffeaa7',
    icon: '❓',
    link: '/games/poke-quiz/'
  },
  {
    id: 'poke-care',
    title: 'ポケモンのおせわ',
    desc: 'ポケモンをそだてよう！',
    color: '#55efc4',
    icon: '🥚',
    link: '/games/poke-care/'
  },
  {
    id: 'kama-surf',
    title: 'カマ・サーフ',
    desc: 'カマサウルスとなみにのろう！',
    color: '#74b9ff',
    icon: '🏄',
    link: '/games/kama-surf/'
  },
  {
    id: 'maze',
    title: '3D迷路メーカー',
    desc: 'つくって！3Dであそべる！',
    color: '#00cec9',
    icon: '🧩',
    link: '/games/maze/'
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
