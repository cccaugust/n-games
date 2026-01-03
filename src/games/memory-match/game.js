import { pokemonData } from '../../data/pokemonData.js';

const grid = document.getElementById('grid');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');
const winOverlay = document.getElementById('winOverlay');

// Settings
const SETTINGS_KEY_PAIRS = 'n-games-memory-match-pairs';
const pairCountSelect = document.getElementById('pairCountSelect');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const openSettingsFromOverlayBtn = document.getElementById('openSettingsFromOverlayBtn');
const openSettingsFromWinBtn = document.getElementById('openSettingsFromWinBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const applySettingsBtn = document.getElementById('applySettingsBtn');

const PAIR_OPTIONS = [
  { pairs: 6, label: '12枚（6ペア）かんたん' },
  { pairs: 8, label: '16枚（8ペア）ふつう' },
  { pairs: 10, label: '20枚（10ペア）むずかしい' },
  { pairs: 12, label: '24枚（12ペア）かなり' },
  { pairs: 15, label: '30枚（15ペア）むずかしめ' },
  { pairs: 18, label: '36枚（18ペア）げきむず' },
  { pairs: 24, label: '48枚（24ペア）チャレンジ' }
];

function clampInt(n, min, max) {
  const v = Number.isFinite(n) ? Math.round(n) : min;
  return Math.max(min, Math.min(max, v));
}

function getSavedPairCount() {
  const raw = localStorage.getItem(SETTINGS_KEY_PAIRS);
  const parsed = raw ? Number(raw) : NaN;
  // Allow up to 30 pairs; we can always fill with emoji.
  return clampInt(parsed || 8, 2, 30);
}

function savePairCount(pairs) {
  localStorage.setItem(SETTINGS_KEY_PAIRS, String(pairs));
}

let pairCount = getSavedPairCount();

// Deck
let gameDeck = [];

function initGameData() {
  const faces = buildFaces(pairCount);
  gameDeck = [...faces, ...faces];
}

let hasFlippedCard = false;
let lockBoard = false;
let firstCard, secondCard;
let matchesFound = 0;
let isPaused = false;

function pauseGame() {
  isPaused = true;
}

function resumeGame() {
  isPaused = false;
}

function openSettings() {
  pauseGame();
  settingsModal.classList.remove('hidden');
  settingsModal.setAttribute('aria-hidden', 'false');
}

function closeSettings() {
  settingsModal.classList.add('hidden');
  settingsModal.setAttribute('aria-hidden', 'true');
  resumeGame();
}

function ensurePairOptionsRendered() {
  if (!pairCountSelect) return;
  pairCountSelect.innerHTML = '';
  PAIR_OPTIONS.forEach((opt) => {
    const option = document.createElement('option');
    option.value = String(opt.pairs);
    option.textContent = opt.label;
    pairCountSelect.appendChild(option);
  });
  // If saved value isn't in presets, add a custom option.
  const hasPreset = PAIR_OPTIONS.some((o) => o.pairs === pairCount);
  if (!hasPreset) {
    const custom = document.createElement('option');
    custom.value = String(pairCount);
    custom.textContent = `${pairCount * 2}枚（${pairCount}ペア）`;
    pairCountSelect.appendChild(custom);
  }
  pairCountSelect.value = String(pairCount);
}

function applySettingsFromUI() {
  const nextPairs = clampInt(Number(pairCountSelect?.value || 8), 2, 30);
  pairCount = nextPairs;
  savePairCount(pairCount);
  closeSettings();
  resetAndStartNewGame();
}

function resetStateOnly() {
  hasFlippedCard = false;
  lockBoard = false;
  firstCard = null;
  secondCard = null;
  matchesFound = 0;
}

function resetAndStartNewGame() {
  resetStateOnly();
  winOverlay.style.display = 'none';
  overlay.style.display = 'none';
  createBoard();
}

function shuffleCopy(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const EMOJI_FALLBACK = [
  '🍎',
  '🍋',
  '🍇',
  '🍉',
  '🍓',
  '🍒',
  '🍑',
  '🥝',
  '🍪',
  '🍩',
  '🍰',
  '🍫',
  '🧁',
  '🍿',
  '⚽',
  '🏀',
  '🎾',
  '🏓',
  '🎲',
  '🎯',
  '🎹',
  '🎸',
  '🚗',
  '🚀',
  '🛸',
  '🦖',
  '🐶',
  '🐱',
  '🐼',
  '🦊',
  '🐸',
  '🦁',
  '🐙',
  '🦄',
  '🧠',
  '👑',
  '⭐',
  '🌈',
  '🔥',
  '❄️',
  '⚡',
  '🌙',
  '🍀',
  '💎',
  '🧩',
  '🪁',
  '🎁',
  '📚',
  '🧸',
  '🦋',
  '🐬',
  '🐳',
  '🦜',
  '🪐',
  '🌋',
  '🏰',
  '🗺️',
  '⏳'
];

function buildFaces(pairs) {
  const need = Math.max(2, pairs);
  const shuffledPokemon = shuffleCopy(pokemonData || []);
  const pokemonFaces = shuffledPokemon.slice(0, Math.min(need, shuffledPokemon.length)).map((p) => ({
    key: `poke-${p.id}`,
    kind: 'pokemon',
    pokemon: p
  }));

  const remaining = need - pokemonFaces.length;
  if (remaining <= 0) return pokemonFaces.slice(0, need);

  const emojiPool = shuffleCopy(EMOJI_FALLBACK);
  const emojiFaces = [];
  for (let i = 0; i < remaining; i++) {
    const emoji = emojiPool[i % emojiPool.length] || '❓';
    emojiFaces.push({
      key: `emoji-${i}`,
      kind: 'emoji',
      emoji
    });
  }
  return [...pokemonFaces, ...emojiFaces].slice(0, need);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function computeLayout(totalCards) {
  const n = Math.max(4, Number(totalCards) || 16);
  const vw = Math.max(320, window.innerWidth || 800);
  const vh = Math.max(480, window.innerHeight || 800);

  // Space available for the grid (rough estimate, keeps it safe on mobile).
  const availableW = Math.min(vw * 0.94, 980);
  const availableH = vh * 0.72;

  // Pick columns that best fit (try 3..10).
  let best = { cols: 4, rows: Math.ceil(n / 4), cardW: 64, gap: 10, score: -Infinity };
  for (let cols = 3; cols <= 10; cols++) {
    const rows = Math.ceil(n / cols);
    // Smaller gaps when many cards.
    const gap = cols >= 8 || rows >= 6 ? 6 : cols >= 6 || rows >= 5 ? 8 : 10;

    const maxCardWByW = (availableW - gap * (cols - 1)) / cols;
    const maxCardWByH = ((availableH - gap * (rows - 1)) / rows) * (3 / 4); // because height = width * 4/3
    const cardW = Math.floor(Math.max(38, Math.min(maxCardWByW, maxCardWByH)));

    // Score: prefer larger cards, but avoid extreme skinny boards.
    const aspectPenalty = Math.abs(cols - rows) * 1.2;
    const score = cardW - aspectPenalty;
    if (score > best.score) best = { cols, rows, cardW, gap, score };
  }

  // Emoji/back font size follows card size.
  const faceFontPx = Math.floor(Math.max(18, Math.min(42, best.cardW * 0.62)));
  return { cols: best.cols, cardW: best.cardW, gap: best.gap, faceFontPx };
}

function applyGridLayout() {
  const totalCards = pairCount * 2;
  const { cols, cardW, gap, faceFontPx } = computeLayout(totalCards);
  grid.style.setProperty('--cols', String(cols));
  grid.style.setProperty('--card-size', `${cardW}px`);
  grid.style.setProperty('--grid-gap', `${gap}px`);
  grid.style.setProperty('--face-font-size', `${faceFontPx}px`);
}

function createBoard() {
    initGameData();
    shuffle(gameDeck);
    grid.innerHTML = '';
    applyGridLayout();
    gameDeck.forEach((face) => {
        const slot = document.createElement('div');
        slot.className = 'card-slot';

        const card = document.createElement('div');
        card.className = 'memory-card';
        card.dataset.id = face.key; // Use key for matching

        const frontHtml =
          face.kind === 'pokemon'
            ? `<img src="${face.pokemon.image}" alt="${face.pokemon.name}" style="width: 100%; height: 100%; object-fit: contain;">`
            : `<span aria-label="${face.emoji}">${face.emoji}</span>`;

        card.innerHTML = `
      <div class="face front" style="background: #1a1a2e; padding: 5px;">${frontHtml}</div>
      <div class="face back">?</div>
    `;

        card.addEventListener('click', flipCard);

        slot.appendChild(card);
        grid.appendChild(slot);
    });
}

function flipCard() {
    if (isPaused) return;
    if (lockBoard) return;
    if (this === firstCard) return;

    this.classList.add('flipped');

    if (!hasFlippedCard) {
        // First flip
        hasFlippedCard = true;
        firstCard = this;
        return;
    }

    // Second flip
    secondCard = this;
    checkForMatch();
}

function checkForMatch() {
    let isMatch = firstCard.dataset.id === secondCard.dataset.id;

    if (isMatch) {
        disableCards();
    } else {
        unflipCards();
    }
}

function disableCards() {
    firstCard.removeEventListener('click', flipCard);
    secondCard.removeEventListener('click', flipCard);

    matchesFound++;
    if (matchesFound === pairCount) {
        setTimeout(() => {
            winOverlay.style.display = 'flex';
            // Fire confetti here if we had library!
        }, 500);
    }

    resetBoard();
}

function unflipCards() {
    lockBoard = true;
    setTimeout(() => {
        firstCard.classList.remove('flipped');
        secondCard.classList.remove('flipped');
        resetBoard();
    }, 1000);
}

function resetBoard() {
    [hasFlippedCard, lockBoard] = [false, false];
    [firstCard, secondCard] = [null, null];
}

startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    createBoard();
});

// Settings wiring
ensurePairOptionsRendered();

openSettingsBtn?.addEventListener('click', openSettings);
openSettingsFromOverlayBtn?.addEventListener('click', openSettings);
openSettingsFromWinBtn?.addEventListener('click', openSettings);
closeSettingsBtn?.addEventListener('click', closeSettings);
applySettingsBtn?.addEventListener('click', applySettingsFromUI);

settingsModal?.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings();
});

// Keep layout responsive on rotate/resize.
window.addEventListener('resize', () => {
  // Only re-apply; no need to rebuild deck.
  if (grid.children.length > 0 && overlay.style.display === 'none' && winOverlay.style.display === 'none') {
    applyGridLayout();
  }
});
