const COUNTRY_BANK = [
  { code: 'jp', name: '日本' },
  { code: 'kr', name: '韓国' },
  { code: 'cn', name: '中国' },
  { code: 'tw', name: '台湾' },
  { code: 'hk', name: '香港' },
  { code: 'th', name: 'タイ' },
  { code: 'vn', name: 'ベトナム' },
  { code: 'ph', name: 'フィリピン' },
  { code: 'id', name: 'インドネシア' },
  { code: 'my', name: 'マレーシア' },
  { code: 'sg', name: 'シンガポール' },
  { code: 'in', name: 'インド' },
  { code: 'pk', name: 'パキスタン' },
  { code: 'bd', name: 'バングラデシュ' },
  { code: 'lk', name: 'スリランカ' },
  { code: 'np', name: 'ネパール' },
  { code: 'mm', name: 'ミャンマー' },
  { code: 'kh', name: 'カンボジア' },
  { code: 'la', name: 'ラオス' },
  { code: 'mn', name: 'モンゴル' },
  { code: 'au', name: 'オーストラリア' },
  { code: 'nz', name: 'ニュージーランド' },
  { code: 'us', name: 'アメリカ' },
  { code: 'ca', name: 'カナダ' },
  { code: 'mx', name: 'メキシコ' },
  { code: 'br', name: 'ブラジル' },
  { code: 'ar', name: 'アルゼンチン' },
  { code: 'cl', name: 'チリ' },
  { code: 'co', name: 'コロンビア' },
  { code: 'pe', name: 'ペルー' },
  { code: 'gb', name: 'イギリス' },
  { code: 'ie', name: 'アイルランド' },
  { code: 'fr', name: 'フランス' },
  { code: 'de', name: 'ドイツ' },
  { code: 'it', name: 'イタリア' },
  { code: 'es', name: 'スペイン' },
  { code: 'pt', name: 'ポルトガル' },
  { code: 'nl', name: 'オランダ' },
  { code: 'be', name: 'ベルギー' },
  { code: 'ch', name: 'スイス' },
  { code: 'at', name: 'オーストリア' },
  { code: 'se', name: 'スウェーデン' },
  { code: 'no', name: 'ノルウェー' },
  { code: 'fi', name: 'フィンランド' },
  { code: 'dk', name: 'デンマーク' },
  { code: 'is', name: 'アイスランド' },
  { code: 'pl', name: 'ポーランド' },
  { code: 'cz', name: 'チェコ' },
  { code: 'sk', name: 'スロバキア' },
  { code: 'hu', name: 'ハンガリー' },
  { code: 'ro', name: 'ルーマニア' },
  { code: 'bg', name: 'ブルガリア' },
  { code: 'gr', name: 'ギリシャ' },
  { code: 'tr', name: 'トルコ' },
  { code: 'ru', name: 'ロシア' },
  { code: 'ua', name: 'ウクライナ' },
  { code: 'eg', name: 'エジプト' },
  { code: 'ma', name: 'モロッコ' },
  { code: 'za', name: '南アフリカ' },
  { code: 'ng', name: 'ナイジェリア' },
  { code: 'ke', name: 'ケニア' },
  { code: 'et', name: 'エチオピア' },
  { code: 'sa', name: 'サウジアラビア' },
  { code: 'ae', name: 'アラブ首長国連邦' },
  { code: 'il', name: 'イスラエル' },
  { code: 'ir', name: 'イラン' }
];

const els = {
  score: document.getElementById('score'),
  streak: document.getElementById('streak'),
  remainingChip: document.getElementById('remainingChip'),
  remaining: document.getElementById('remaining'),
  options: document.getElementById('options'),
  flagCard: document.getElementById('flagCard'),
  flagImg: document.getElementById('flagImg'),
  flagEmoji: document.getElementById('flagEmoji'),
  flagSkeleton: document.getElementById('flagSkeleton'),
  toast: document.getElementById('toast'),
  confettiLayer: document.getElementById('confettiLayer'),
  overlay: document.getElementById('overlay'),
  startBtn: document.getElementById('startBtn'),
  practiceBtn: document.getElementById('practiceBtn'),
  seToggle: document.getElementById('seToggle')
};

const MODE_KEY = 'flagQuiz.mode';
const SE_KEY = 'flagQuiz.se';
const BEST_KEY = 'flagQuiz.best';

let mode = 'ten'; // ten | endless
let seEnabled = true;

let score = 0;
let streak = 0;
let locked = false;

let total = 10;
let index = 0;
let correctCount = 0;
let wrongCount = 0;

let current = null; // { correct, options[] }
let lastCorrectCode = null;
let flagLoadId = 0;

function shuffleInPlace(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uniqByCode(arr) {
  const map = new Map();
  for (const it of arr) map.set(it.code, it);
  return [...map.values()];
}

function flagUrl(code) {
  // FlagCDN: ISO 3166-1 alpha-2 (lowercase), PNG
  return `https://flagcdn.com/w320/${code}.png`;
}

function countryCodeToEmoji(code) {
  const cc = (code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🏳️';
  const base = 0x1f1e6;
  const a = cc.charCodeAt(0) - 65;
  const b = cc.charCodeAt(1) - 65;
  return String.fromCodePoint(base + a, base + b);
}

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => els.toast.classList.remove('show'), 950);
}

let audioCtx = null;
function beep(kind = 'ok') {
  if (!seEnabled) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  try {
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    o.type = kind === 'ok' ? 'triangle' : 'sawtooth';
    o.frequency.value = kind === 'ok' ? 880 : 220;

    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(audioCtx.destination);

    o.start(now);
    g.gain.exponentialRampToValueAtTime(kind === 'ok' ? 0.15 : 0.11, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.stop(now + 0.2);
  } catch {
    // ignore
  }
}

function confettiBurst() {
  const colors = ['#ff7675', '#fdcb6e', '#55efc4', '#74b9ff', '#a29bfe', '#00cec9'];
  const count = 70;
  const vw = window.innerWidth;
  const startX = vw * (0.25 + Math.random() * 0.5);
  const startY = Math.min(190, window.innerHeight * 0.25);

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.background = colors[i % colors.length];
    const x0 = startX + (Math.random() * 120 - 60);
    const y0 = startY + (Math.random() * 30 - 15);
    const x1 = x0 + (Math.random() * 520 - 260);
    const y1 = y0 + (380 + Math.random() * 560);
    el.style.setProperty('--x0', `${Math.round(x0)}px`);
    el.style.setProperty('--y0', `${Math.round(y0)}px`);
    el.style.setProperty('--x1', `${Math.round(x1)}px`);
    el.style.setProperty('--y1', `${Math.round(y1)}px`);
    el.style.setProperty('--t', `${Math.round(750 + Math.random() * 650)}ms`);
    el.style.left = '0px';
    el.style.top = '0px';

    els.confettiLayer.appendChild(el);
    window.setTimeout(() => el.remove(), 1600);
  }
}

function syncModeUI() {
  document.querySelectorAll('.segmented .seg').forEach(label => {
    const input = label.querySelector('input[type="radio"]');
    if (!input) return;
    label.classList.toggle('checked', input.checked);
  });
}

function loadSettings() {
  const savedMode = localStorage.getItem(MODE_KEY);
  if (savedMode === 'ten' || savedMode === 'endless') mode = savedMode;

  const savedSe = localStorage.getItem(SE_KEY);
  seEnabled = savedSe == null ? true : savedSe === 'true';
  els.seToggle.checked = seEnabled;

  const input = document.querySelector(`input[name="mode"][value="${mode}"]`);
  if (input) input.checked = true;
  syncModeUI();
  applyModeVisibility();
}

function applyModeVisibility() {
  const isTen = mode === 'ten';
  els.remainingChip.style.display = isTen ? '' : 'none';
}

function setMode(next) {
  mode = next;
  localStorage.setItem(MODE_KEY, mode);
  syncModeUI();
  applyModeVisibility();
}

function setSeEnabled(next) {
  seEnabled = Boolean(next);
  localStorage.setItem(SE_KEY, String(seEnabled));
}

function resetGame({ isPractice = false } = {}) {
  score = 0;
  streak = 0;
  locked = false;
  index = 0;
  correctCount = 0;
  wrongCount = 0;
  total = isPractice ? 1 : 10;
  lastCorrectCode = null;
  current = null;
  updateHud();
}

function updateHud() {
  els.score.textContent = String(score);
  els.streak.textContent = String(streak);
  els.remaining.textContent = String(Math.max(0, total - index));
}

function buildQuestion() {
  const pool = COUNTRY_BANK.length >= 8 ? COUNTRY_BANK : uniqByCode(COUNTRY_BANK);
  let correct = pickRandom(pool);
  if (pool.length >= 2 && lastCorrectCode && correct.code === lastCorrectCode) {
    const alt = pool.filter(x => x.code !== lastCorrectCode);
    if (alt.length) correct = pickRandom(alt);
  }

  const wrongs = shuffleInPlace(pool.filter(x => x.code !== correct.code)).slice(0, 3);
  const options = shuffleInPlace([correct, ...wrongs]);
  return { correct, options };
}

function setFlag(country) {
  const loadId = (flagLoadId += 1);
  const emoji = countryCodeToEmoji(country.code);
  els.flagEmoji.textContent = emoji;
  els.flagEmoji.style.display = 'none';

  els.flagImg.style.display = 'none';
  els.flagSkeleton.style.display = '';

  const src = flagUrl(country.code);
  const img = new Image();
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.onload = () => {
    if (loadId !== flagLoadId) return;
    els.flagImg.src = src;
    els.flagImg.alt = `${country.name} の国旗`;
    els.flagSkeleton.style.display = 'none';
    els.flagImg.style.display = '';
  };
  img.onerror = () => {
    if (loadId !== flagLoadId) return;
    els.flagImg.removeAttribute('src');
    els.flagSkeleton.style.display = 'none';
    els.flagEmoji.style.display = '';
  };
  img.src = src;
}

function renderOptions(options) {
  els.options.innerHTML = '';
  options.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'option-btn';
    b.dataset.code = c.code;
    b.setAttribute('aria-label', `こたえ ${i + 1}: ${c.name}`);
    b.innerHTML = `<span class="name">${c.name}</span><span class="k">${i + 1}</span>`;
    b.addEventListener('click', () => answer(c.code));
    els.options.appendChild(b);
  });
}

function showOverlayStart() {
  els.overlay.setAttribute('aria-hidden', 'false');
  els.overlay.innerHTML = `
    <div class="overlay-card">
      <div class="overlay-title">国旗あてクイズ</div>
      <div class="overlay-sub">はたを見て、くにの名前をえらぼう！</div>
      <div class="overlay-actions">
        <button class="btn-primary" id="startBtn" type="button">スタート！</button>
        <button class="btn-secondary" id="practiceBtn" type="button">ためしに 1もん</button>
      </div>
      <div class="overlay-note">
        ※ 国旗画像はオンライン（FlagCDN）から読みこみます。<br />
        オフラインのときは絵文字表示になることがあります。
      </div>
    </div>
  `;
  document.getElementById('startBtn')?.addEventListener('click', () => startGame({ isPractice: false }));
  document.getElementById('practiceBtn')?.addEventListener('click', () => startGame({ isPractice: true }));
}

function showOverlayResult() {
  const best = Number(localStorage.getItem(BEST_KEY) || '0') || 0;
  const nextBest = Math.max(best, score);
  localStorage.setItem(BEST_KEY, String(nextBest));

  const player = (() => {
    try {
      return JSON.parse(localStorage.getItem('n-games-player') || 'null');
    } catch {
      return null;
    }
  })();

  const who = player?.name ? `${player.name} の` : '';

  els.overlay.setAttribute('aria-hidden', 'false');
  els.overlay.innerHTML = `
    <div class="overlay-card">
      <div class="overlay-title">けっか</div>
      <div class="overlay-sub">${who}スコア：<b>${score}</b> / せいかい ${correctCount} / まちがい ${wrongCount}</div>
      <div class="overlay-sub" style="margin-top:6px;">ベスト：<b>${nextBest}</b></div>
      <div class="overlay-actions">
        <button class="btn-primary" id="retryBtn" type="button">もういっかい！</button>
        <a class="btn-secondary" href="../../pages/portal/portal.html" style="text-decoration:none; display:inline-flex; align-items:center;">ゲームえらびへ</a>
      </div>
      <div class="overlay-note">エンドレスは「モード」で切りかえられるよ。</div>
    </div>
  `;
  document.getElementById('retryBtn')?.addEventListener('click', () => startGame({ isPractice: false }));
}

function hideOverlay() {
  els.overlay.setAttribute('aria-hidden', 'true');
}

function nextQuestion() {
  locked = false;
  els.flagCard.classList.remove('flash');
  els.options.classList.remove('shake');

  current = buildQuestion();
  lastCorrectCode = current.correct.code;
  setFlag(current.correct);
  renderOptions(current.options);
  updateHud();

  toast('どこのくにかな？');
}

function answer(code) {
  if (locked || !current) return;
  locked = true;

  const ok = code === current.correct.code;
  const btns = [...els.options.querySelectorAll('.option-btn')];
  const correctBtn = btns.find(b => b.dataset.code === current.correct.code);
  const pickedBtn = btns.find(b => b.dataset.code === code);

  if (ok) {
    correctCount += 1;
    streak += 1;
    score += 100 + Math.min(100, streak * 10);
    pickedBtn?.classList.add('correct');
    btns.forEach(b => b !== pickedBtn && b.classList.add('dim'));
    els.flagCard.classList.add('flash');
    confettiBurst();
    beep('ok');
    toast('せいかい！');
  } else {
    wrongCount += 1;
    streak = 0;
    pickedBtn?.classList.add('wrong');
    correctBtn?.classList.add('correct');
    btns.forEach(b => b !== pickedBtn && b !== correctBtn && b.classList.add('dim'));
    els.options.classList.remove('shake');
    void els.options.offsetWidth;
    els.options.classList.add('shake');
    beep('ng');
    toast(`ちがうよ！ こたえは「${current.correct.name}」`);
  }

  index += 1;
  updateHud();

  const isPractice = total === 1;
  const isTen = mode === 'ten';

  const shouldEnd = isPractice || (isTen && index >= total);
  window.setTimeout(() => {
    if (shouldEnd) {
      showOverlayResult();
      return;
    }
    nextQuestion();
  }, ok ? 900 : 1050);
}

function startGame({ isPractice = false } = {}) {
  hideOverlay();
  resetGame({ isPractice });
  nextQuestion();
}

function setupControls() {
  document.querySelectorAll('input[name="mode"]').forEach(r => {
    r.addEventListener('change', () => {
      setMode(r.value);
      if (els.overlay.getAttribute('aria-hidden') === 'true') {
        // running game: reset for fairness
        showOverlayStart();
      }
    });
  });

  els.seToggle.addEventListener('change', () => setSeEnabled(els.seToggle.checked));

  window.addEventListener('keydown', e => {
    if (els.overlay.getAttribute('aria-hidden') === 'false') return;
    if (locked) return;
    const key = e.key;
    if (!['1', '2', '3', '4'].includes(key)) return;
    const idx = Number(key) - 1;
    const btn = els.options.querySelectorAll('.option-btn')[idx];
    if (btn) btn.click();
  });
}

function init() {
  loadSettings();
  setupControls();
  showOverlayStart();
}

init();

