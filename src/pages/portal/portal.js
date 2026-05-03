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
    id: 'quarto',
    title: 'クアルト！',
    desc: '4つの違いをそろえろ！相手にコマを渡す名作対戦◎',
    color: '#1f2937',
    icon: '◐',
    link: '/games/quarto/'
  },
  {
    id: 'pengin-fish',
    title: 'それはオレの魚だ！',
    desc: 'ペンギンで魚を取り合え！氷が沈む陣取り🐧',
    color: '#0e7490',
    icon: '🐧',
    link: '/games/pengin-fish/'
  },
  {
    id: 'corridor',
    title: 'コリドール',
    desc: '壁で道をふさいで先にゴールせよ！戦略派の名作🚧',
    color: '#1f1d4a',
    icon: '🚧',
    link: '/games/corridor/'
  },
  {
    id: 'blokus-duel-lite',
    title: 'ブロックス バトル',
    desc: '2〜4人で遊べる陣取りパズル！角つなぎで勝負🧩',
    color: '#5f3dc4',
    icon: '🧩',
    link: '/games/blokus-duel-lite/'
  },
  {
    id: 'otrio',
    title: 'OTRIO',
    desc: '輪をならべて3つそろえよう！2人対戦ボードゲーム⭕',
    color: '#0f172a',
    icon: '⭕',
    link: '/games/otrio/'
  },
  {
    id: 'pencil-color-run',
    title: 'えんぴつカラーダッシュ',
    desc: '3Dで色を集めて伸びろ！色ちがいはアウト✏️',
    color: '#ff8fab',
    icon: '✏️',
    link: '/games/pencil-color-run/'
  },
  {
    id: 'paint-wars',
    title: 'PAINT WARS',
    desc: '塗りつくせ！インクシューティング🎨',
    color: '#ff6b35',
    icon: '🎨',
    link: '/games/paint-wars/'
  },
  {
    id: 'chase-survival',
    title: '逃走サバイバル',
    desc: 'ハンターから逃げて賞金を稼げ！3Dチェイス🏃',
    color: '#1a1a2e',
    icon: '🏃',
    link: '/games/chase-survival/'
  },
  {
    id: 'bomberman',
    title: 'ボンバーマン',
    desc: '爆弾で道を切り開け！ステージエディター付き💣',
    color: '#ff6b35',
    icon: '💣',
    link: '/games/bomberman/'
  },
  {
    id: '3d-assets-library',
    title: '3Dアセットライブラリ',
    desc: '3Dモデルを自由に配置して遊ぼう！🎮',
    color: '#6366f1',
    icon: '🏰',
    link: '/games/3d-assets-library/'
  },
  {
    id: 'voice-beat-lab',
    title: 'ボイスビートラボ',
    desc: 'こえでドラム！ヘンテコ曲づくり🎤',
    color: '#00cec9',
    icon: '🎤',
    link: '/games/voice-beat-lab/'
  },
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
    id: 'math-battle',
    title: '算数バトル',
    desc: 'モンスターと算数でバトル！パズドラ風RPG⚔️',
    color: '#e94560',
    icon: '⚔️',
    link: '/games/math-battle/'
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
    id: 'flag-quiz',
    title: '国旗あてクイズ',
    desc: 'はたを見て くにをあてよう！',
    color: '#6c5ce7',
    icon: '🏳️',
    link: '/games/flag-quiz/'
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
    id: 'unity-catch',
    title: 'ユニティキャッチ',
    desc: 'Unityの素材で見た目を変えられる！🪙',
    color: '#f59e0b',
    icon: '🪙',
    link: '/games/unity-catch/'
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
  },
  {
    id: 'panel-pop',
    title: 'パネルポップ',
    desc: '連鎖でハイスコア！せり上がる本格パズル',
    color: '#5b7cfa',
    icon: '🧱',
    link: '/games/panel-pop/'
  },
  {
    id: 'pixel-quest',
    title: 'ピクセルクエスト',
    desc: '💎を集めて🏁へ！ステージも作れる',
    color: '#111827',
    icon: '💎',
    link: '/games/pixel-quest/'
  },
  {
    id: 'shogi-studio',
    title: '将棋スタジオ',
    desc: '盤サイズ自由！配置編集＆対人戦＆図鑑',
    color: '#ffeaa7',
    icon: '♟️',
    link: '/games/shogi-studio/setup.html'
  },
  {
    id: 'aquarium',
    title: '水槽シミュレーター',
    desc: '魚を作って泳がせよう！🐠',
    color: '#0ea5e9',
    icon: '🐠',
    link: '/games/aquarium/'
  },
  {
    id: 'pixel-miner',
    title: 'ピクセルマイナー',
    desc: '掘って→集めて→置く！2Dマイクラっぽい⛏️',
    color: '#1a2456',
    icon: '⛏️',
    link: '/games/pixel-miner/'
  },
  {
    id: 'battle-arena',
    title: 'バトルアリーナ',
    desc: 'ふっとばして勝て！2人対戦🥊',
    color: '#ff6b6b',
    icon: '🥊',
    link: '/games/battle-arena/'
  },
  {
    id: 'star-runner',
    title: 'スターランナー・アドベンチャー',
    desc: '本格横スクロール！走って跳んでコインを集めよう⭐',
    color: '#2563eb',
    icon: '⭐',
    link: '/games/star-runner/'
  },
  {
    id: 'tokichiro-koichiro-karakuri-dochu',
    title: '藤吉郎と小一郎 からくり道中',
    desc: '兄弟チェンジで進む、明るい戦国からくりアクション！',
    color: '#d9572c',
    icon: '🏯',
    link: '/games/tokichiro-koichiro-karakuri-dochu/'
  },
  {
    id: 'kanahebi-no-komichi',
    title: 'カナヘビのこみち',
    desc: '庭のこみちを進む、絵本風の横スクロールアクション。',
    color: '#8dcf7e',
    icon: '🦎',
    link: '/games/kanahebi-no-komichi/'
  },
  {
    id: 'kakuriyo',
    title: '幽世の試練',
    desc: '和風ローグライク！100階を踏破せよ',
    color: '#1a1a2e',
    icon: '⛩️',
    link: '/games/kakuriyo/'
  },
  {
    id: 'ikinokoori',
    title: 'イキノコオリ',
    desc: '2〜4人でバトル！氷の床を渡って最後の1人になろう❄️',
    color: '#7dd3fc',
    icon: '❄️',
    link: '/games/ikinokoori/'
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
