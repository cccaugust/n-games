const BANK = [
  { word: '一期一会', yomi: 'いちごいちえ', meaning: '一生に一度の出会いみたいに、今を大切にすること。' },
  { word: '十人十色', yomi: 'じゅうにんといろ', meaning: '人それぞれ、考え方や好みがちがうこと。' },
  { word: '温故知新', yomi: 'おんこちしん', meaning: '昔のことを学んで、新しい考えを見つけること。' },
  { word: '有言実行', yomi: 'ゆうげんじっこう', meaning: '言ったことをちゃんとやること。' },
  { word: '百聞一見', yomi: 'ひゃくぶんいっけん', meaning: '何回聞くより、一回見たほうがよくわかること。' },
  { word: '日進月歩', yomi: 'にっしんげっぽ', meaning: '毎日少しずつどんどん進歩すること。' },
  { word: '自業自得', yomi: 'じごうじとく', meaning: '自分のしたことの結果は自分に返ってくること。' },
  { word: '因果応報', yomi: 'いんがおうほう', meaning: 'いいこと・悪いことは、あとで自分に返ってくること。' },
  { word: '七転八起', yomi: 'しちてんはっき', meaning: '何回失敗してもあきらめず立ち上がること。' },
  { word: '勇猛果敢', yomi: 'ゆうもうかかん', meaning: 'こわがらず、思いきってやること。' },
  { word: '一致団結', yomi: 'いっちだんけつ', meaning: 'みんなが心をひとつにして協力すること。' },
  { word: '以心伝心', yomi: 'いしんでんしん', meaning: '言葉にしなくても気持ちが伝わること。' },
  { word: '臨機応変', yomi: 'りんきおうへん', meaning: 'その場に合わせて、うまくやり方を変えること。' },
  { word: '晴耕雨読', yomi: 'せいこううどく', meaning: '晴れの日は働き、雨の日は読書…落ち着いたくらし。' },
  { word: '一石二鳥', yomi: 'いっせきにちょう', meaning: '一つのことで二つの得をすること。' },
  { word: '一日千秋', yomi: 'いちじつせんしゅう', meaning: '待ち遠しくて、時間がすごく長く感じること。' },
  { word: '電光石火', yomi: 'でんこうせっか', meaning: 'とても速いこと。' },
  { word: '起死回生', yomi: 'きしかいせい', meaning: 'もうダメだと思ったところから立て直すこと。' },
  { word: '千載一遇', yomi: 'せんざいいちぐう', meaning: 'めったにない大チャンス。' },
  { word: '前代未聞', yomi: 'ぜんだいみもん', meaning: '今まで聞いたことがないすごいこと。' },
  { word: '大同小異', yomi: 'だいどうしょうい', meaning: '大きくは同じで、少しだけ違うこと。' },
  { word: '優柔不断', yomi: 'ゆうじゅうふだん', meaning: 'なかなか決められないこと。' },
  { word: '悪戦苦闘', yomi: 'あくせんくとう', meaning: 'とても大変で、苦しみながらがんばること。' },
  { word: '四苦八苦', yomi: 'しくはっく', meaning: 'ものすごく困って苦しむこと。' },
  { word: '試行錯誤', yomi: 'しこうさくご', meaning: 'いろいろやって、うまくいく方法を探すこと。' },
  { word: '粉骨砕身', yomi: 'ふんこつさいしん', meaning: '力のかぎり一生けんめいがんばること。' },
  { word: '切磋琢磨', yomi: 'せっさたくま', meaning: '友だち同士で高め合って努力すること。' },
  { word: '初志貫徹', yomi: 'しょしかんてつ', meaning: '最初に決めた目標を最後までやりぬくこと。' },
  { word: '不言実行', yomi: 'ふげんじっこう', meaning: 'あれこれ言わず、行動でやりとげること。' },
  { word: '栄枯盛衰', yomi: 'えいこせいすい', meaning: 'さかえたり、おちぶれたり、世の中は変わること。' },
  { word: '弱肉強食', yomi: 'じゃくにくきょうしょく', meaning: '強い人が有利になりやすいこと。' },
  { word: '明鏡止水', yomi: 'めいきょうしすい', meaning: '心が静かで、よごれがないこと。' },
  { word: '公明正大', yomi: 'こうめいせいだい', meaning: 'かくしごとがなく、正しく堂々としていること。' },
  { word: '質実剛健', yomi: 'しつじつごうけん', meaning: 'むだがなく、まじめで強いこと。' },
  { word: '天真爛漫', yomi: 'てんしんらんまん', meaning: '心がきれいで、のびのびしていること。' },
  { word: '喜怒哀楽', yomi: 'きどあいらく', meaning: 'うれしい・おこる・かなしい・たのしい気持ち。' },
  { word: '朝令暮改', yomi: 'ちょうれいぼかい', meaning: '決めたことがすぐ変わってしまうこと。' },
  { word: '右往左往', yomi: 'うおうさおう', meaning: 'あわてて、うろうろすること。' },
  { word: '前途洋洋', yomi: 'ぜんとようよう', meaning: 'これから先が明るく、希望があること。' },
  { word: '危機一髪', yomi: 'ききいっぱつ', meaning: 'もう少しで大変なことになる、ギリギリの状態。' },
  { word: '縁起担ぎ', yomi: 'えんぎかつぎ', meaning: 'うまくいくように、いいことを願って行動すること。' },
  { word: '心機一転', yomi: 'しんきいってん', meaning: '気持ちを切りかえて、新しくがんばること。' },
  { word: '大胆不敵', yomi: 'だいたんふてき', meaning: 'こわがらず、どーんとしていること。' },
  { word: '優勝劣敗', yomi: 'ゆうしょうれっぱい', meaning: 'すぐれた人が勝ち、劣る人が負けること。' },
  { word: '一心不乱', yomi: 'いっしんふらん', meaning: 'ひとつのことに集中してがんばること。' },
  { word: '一部始終', yomi: 'いちぶしじゅう', meaning: 'はじめから終わりまで、ぜんぶ。' },
  { word: '絶体絶命', yomi: 'ぜったいぜつめい', meaning: 'どうにもならない大ピンチ。' },
  { word: '千差万別', yomi: 'せんさばんべつ', meaning: 'いろいろちがって、同じものがほとんどないこと。' },
  { word: '疑心暗鬼', yomi: 'ぎしんあんき', meaning: '疑いすぎて、こわくなってしまうこと。' },
  { word: '自画自賛', yomi: 'じがじさん', meaning: '自分で自分をほめること。' },
  { word: '花鳥風月', yomi: 'かちょうふうげつ', meaning: '自然の美しさを楽しむこと。' },
  { word: '五里霧中', yomi: 'ごりむちゅう', meaning: 'どうしたらいいか分からず、迷っていること。' },
  { word: '三日坊主', yomi: 'みっかぼうず', meaning: 'すぐにやめてしまって続かないこと。' },
  { word: '千客万来', yomi: 'せんきゃくばんらい', meaning: 'お客さんがたくさん来ること。' },
  { word: '理路整然', yomi: 'りろせいぜん', meaning: '話や考えがきちんと順番だっていること。' },
  { word: '意味深長', yomi: 'いみしんちょう', meaning: '言葉や出来事に、深い意味がありそうなこと。' },
  { word: '本末転倒', yomi: 'ほんまつてんとう', meaning: '大事なことと、どうでもいいことが逆になること。' },
  { word: '支離滅裂', yomi: 'しりめつれつ', meaning: '話がバラバラでまとまっていないこと。' },
  { word: '馬耳東風', yomi: 'ばじとうふう', meaning: '人の言うことを聞き流すこと。' },
  { word: '取捨選択', yomi: 'しゅしゃせんたく', meaning: '必要なものを選び、いらないものを捨てること。' },
  { word: '一朝一夕', yomi: 'いっちょういっせき', meaning: '短い時間のこと（すぐにはできない、という時によく使う）。' },
  { word: '当意即妙', yomi: 'とういそくみょう', meaning: 'その場で気のきいた返事をすること。' },
  { word: '完全無欠', yomi: 'かんぜんむけつ', meaning: '欠点がなく、すごく完ぺきなこと。' },
  { word: '意気消沈', yomi: 'いきしょうちん', meaning: '元気がなくなって、しょんぼりすること。' },
  { word: '半信半疑', yomi: 'はんしんはんぎ', meaning: '信じたいけど、うたがいもある気持ち。' },
  { word: '疑問氷解', yomi: 'ぎもんひょうかい', meaning: '疑問がすっきり解けること。' },
  { word: '東奔西走', yomi: 'とうほんせいそう', meaning: 'あちこち走り回って忙しいこと。' },
  { word: '誠心誠意', yomi: 'せいしんせいい', meaning: 'うそをつかず、心をこめて真剣にやること。' },
  { word: '喜色満面', yomi: 'きしょくまんめん', meaning: 'うれしさが顔いっぱいに出ていること。' },
  { word: '堅忍不抜', yomi: 'けんにんふばつ', meaning: 'どんなことがあってもがまんしてやりぬくこと。' }
];

const els = {
  question: document.getElementById('question'),
  pool: document.getElementById('pool'),
  slots: document.getElementById('slots'),
  score: document.getElementById('score'),
  streak: document.getElementById('streak'),
  resetBtn: document.getElementById('resetBtn'),
  skipBtn: document.getElementById('skipBtn'),
  toast: document.getElementById('toast'),
  confettiLayer: document.getElementById('confettiLayer')
};

const MODE_KEY = 'yojijukugo.mode';
const DEFAULT_MODE = 'both';

let mode = DEFAULT_MODE;
let current = null;
let tiles = [];
let slots = [null, null, null, null]; // tileId
let selectedTileId = null;
let score = 0;
let streak = 0;
let locked = false;
let lastDragAt = 0;

function hueForChar(ch) {
  // stable "pop" color per character
  const cp = ch.codePointAt(0) ?? 0;
  return 30 + (cp * 37) % 330; // avoid too-red extremes
}

function uniq(arr) {
  return [...new Set(arr)];
}

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

function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => els.toast.classList.remove('show'), 900);
}

function beep(kind = 'ok') {
  // lightweight WebAudio (no assets)
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = kind === 'ok' ? 880 : 220;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    o.stop(ctx.currentTime + 0.2);
    o.onended = () => ctx.close();
  } catch {
    // ignore
  }
}

function setMode(next) {
  mode = next;
  localStorage.setItem(MODE_KEY, mode);
  syncModeUI();
  renderQuestion();
}

function loadMode() {
  const saved = localStorage.getItem(MODE_KEY);
  const ok = saved === 'yomi' || saved === 'meaning' || saved === 'both';
  mode = ok ? saved : DEFAULT_MODE;
  const input = document.querySelector(`input[name="mode"][value="${mode}"]`);
  if (input) input.checked = true;
  syncModeUI();
}

function syncModeUI() {
  document.querySelectorAll('.segmented .seg').forEach(label => {
    const input = label.querySelector('input[type="radio"]');
    if (!input) return;
    label.classList.toggle('checked', input.checked);
  });
}

function renderQuestion() {
  if (!current) return;
  const lines = [];
  if (mode === 'yomi' || mode === 'both') lines.push(`よみ：${current.yomi}`);
  if (mode === 'meaning' || mode === 'both') lines.push(`いみ：${current.meaning}`);
  els.question.textContent = lines.join(' / ');
}

function makeTilesForWord(word) {
  const answerChars = word.split('');
  const allChars = uniq(BANK.flatMap(x => x.word.split('')));
  const dummyCandidates = allChars.filter(ch => !answerChars.includes(ch));
  shuffleInPlace(dummyCandidates);

  const need = 10;
  const picked = [...answerChars];
  for (const ch of dummyCandidates) {
    if (picked.length >= need) break;
    picked.push(ch);
  }

  const made = shuffleInPlace(
    picked.map((ch, idx) => ({
      id: `t${Date.now()}_${idx}_${Math.random().toString(16).slice(2)}`,
      ch
    }))
  );

  return made;
}

function clearSelection() {
  selectedTileId = null;
  document.querySelectorAll('.tile.selected').forEach(el => el.classList.remove('selected'));
}

function clearSlots() {
  slots = [null, null, null, null];
  locked = false;
  clearSelection();
  renderSlots();
  renderPool();
}

function newRound() {
  locked = false;
  clearSelection();
  slots = [null, null, null, null];
  current = pickRandom(BANK);
  tiles = makeTilesForWord(current.word);
  renderQuestion();
  renderSlots();
  renderPool();
}

function renderSlots() {
  const slotEls = [...els.slots.querySelectorAll('.slot')];
  slotEls.forEach((btn, idx) => {
    const tileId = slots[idx];
    btn.classList.toggle('filled', Boolean(tileId));
    btn.classList.remove('correct', 'wrong', 'over');
    const ch = tileId ? (tiles.find(t => t.id === tileId)?.ch ?? '') : '';
    btn.textContent = ch;
    if (ch) btn.style.setProperty('--h', String(hueForChar(ch)));
    else btn.style.removeProperty('--h');
  });
}

function isTilePlaced(tileId) {
  return slots.includes(tileId);
}

function renderPool() {
  els.pool.innerHTML = '';
  tiles.forEach(t => {
    const placed = isTilePlaced(t.id);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.textContent = t.ch;
    b.dataset.tileId = t.id;
    b.style.setProperty('--h', String(hueForChar(t.ch)));
    b.setAttribute('aria-disabled', placed ? 'true' : 'false');
    b.disabled = placed || locked;
    if (t.id === selectedTileId && !placed && !locked) b.classList.add('selected');

    // tap-to-select fallback
    b.addEventListener('click', () => {
      if (Date.now() - lastDragAt < 260) return;
      if (locked || isTilePlaced(t.id)) return;
      if (selectedTileId === t.id) {
        clearSelection();
        return;
      }
      clearSelection();
      selectedTileId = t.id;
      b.classList.add('selected');
      toast('マスをタップして おいてね');
    });

    setupDrag(b, t.id);

    els.pool.appendChild(b);
  });
}

function firstEmptySlotIndex() {
  return slots.findIndex(x => x == null);
}

function pulseSlot(slotIndex) {
  const el = els.slots.querySelector(`.slot[data-slot="${slotIndex}"]`);
  if (!el) return;
  el.classList.remove('placed');
  // reflow to restart animation
  void el.offsetWidth;
  el.classList.add('placed');
}

function placeTileIntoSlot(tileId, slotIndex) {
  if (locked) return;
  if (slotIndex < 0 || slotIndex > 3) return;

  const fromIdx = slots.indexOf(tileId);
  const targetId = slots[slotIndex];

  // dropping onto the same slot = no-op
  if (fromIdx === slotIndex) return;

  // If the tile was already in another slot, swap them.
  // Otherwise, simply replace the target (target goes back to pool automatically).
  if (fromIdx !== -1) {
    slots[fromIdx] = targetId ?? null;
  }
  slots[slotIndex] = tileId;

  clearSelection();
  renderSlots();
  renderPool();
  pulseSlot(slotIndex);
  if (fromIdx !== -1) pulseSlot(fromIdx);
  checkIfComplete();
}

function removeTileFromSlot(slotIndex) {
  if (locked) return;
  if (slotIndex < 0 || slotIndex > 3) return;
  if (slots[slotIndex] == null) return;
  slots[slotIndex] = null;
  renderSlots();
  renderPool();
}

function currentGuess() {
  return slots.map(id => (tiles.find(t => t.id === id)?.ch ?? '')).join('');
}

function setSlotsFeedback(kind) {
  const slotEls = [...els.slots.querySelectorAll('.slot')];
  slotEls.forEach(el => el.classList.remove('correct', 'wrong'));
  slotEls.forEach(el => el.classList.add(kind));
}

function checkIfComplete() {
  if (slots.some(x => x == null)) return;
  const guess = currentGuess();
  if (guess === current.word) {
    locked = true;
    score += 1;
    streak += 1;
    els.score.textContent = String(score);
    els.streak.textContent = String(streak);
    setSlotsFeedback('correct');
    confettiBurst();
    beep('ok');
    toast('せいかい！ すごい！');
    window.setTimeout(() => newRound(), 950);
    return;
  }

  streak = 0;
  els.streak.textContent = String(streak);
  setSlotsFeedback('wrong');
  els.slots.classList.remove('shake');
  // reflow to restart animation
  void els.slots.offsetWidth;
  els.slots.classList.add('shake');
  beep('ng');
  toast('ちがうよ！ なおしてみよう');
}

function confettiBurst() {
  const colors = ['#ff7675', '#fdcb6e', '#55efc4', '#74b9ff', '#a29bfe', '#00cec9'];
  const count = 70;
  const vw = window.innerWidth;
  const startX = vw * (0.25 + Math.random() * 0.5);
  const startY = Math.min(180, window.innerHeight * 0.25);

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.background = colors[i % colors.length];
    const x0 = startX + (Math.random() * 120 - 60);
    const y0 = startY + (Math.random() * 30 - 15);
    const x1 = x0 + (Math.random() * 500 - 250);
    const y1 = y0 + (380 + Math.random() * 520);
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

function setupDrag(tileEl, tileId) {
  let dragging = false;
  let ghost = null;
  let pointerId = null;

  const slotEls = [...els.slots.querySelectorAll('.slot')];

  function updateOverState(clientX, clientY) {
    slotEls.forEach(s => s.classList.remove('over'));
    const over = slotEls.find(s => {
      const r = s.getBoundingClientRect();
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
    });
    if (!over) return -1;
    over.classList.add('over');
    return Number(over.dataset.slot);
  }

  function clearOver() {
    slotEls.forEach(s => s.classList.remove('over'));
  }

  function makeGhost(ch) {
    const g = document.createElement('div');
    g.className = 'tile drag-ghost';
    g.textContent = ch;
    g.style.setProperty('--h', String(hueForChar(ch)));
    g.style.width = `${tileEl.getBoundingClientRect().width}px`;
    g.style.height = `${tileEl.getBoundingClientRect().height}px`;
    document.body.appendChild(g);
    return g;
  }

  tileEl.addEventListener('pointerdown', e => {
    if (locked || isTilePlaced(tileId)) return;
    // don't start drag on right-click / etc
    if (e.button != null && e.button !== 0) return;

    dragging = true;
    pointerId = e.pointerId;
    tileEl.setPointerCapture(pointerId);
    ghost = makeGhost(tileEl.textContent);
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    clearSelection();
    e.preventDefault();
  });

  tileEl.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== pointerId || !ghost) return;
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    updateOverState(e.clientX, e.clientY);
  });

  function finishDrag(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    lastDragAt = Date.now();
    clearOver();
    if (ghost) ghost.remove();
    ghost = null;

    const idx = updateOverState(e.clientX, e.clientY);
    clearOver();

    if (Number.isInteger(idx) && idx >= 0 && idx <= 3) {
      placeTileIntoSlot(tileId, idx);
    } else {
      // drop anywhere else: convenience place into first empty slot
      const empty = firstEmptySlotIndex();
      if (empty !== -1) placeTileIntoSlot(tileId, empty);
      else toast('マスがいっぱい！ うえにかさねると いれかえできるよ');
    }
  }

  tileEl.addEventListener('pointerup', finishDrag);
  tileEl.addEventListener('pointercancel', e => {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    clearOver();
    if (ghost) ghost.remove();
    ghost = null;
  });
}

function setupSlotInteractions() {
  els.slots.addEventListener('click', e => {
    const slotEl = e.target.closest('.slot');
    if (!slotEl) return;
    const idx = Number(slotEl.dataset.slot);
    if (!Number.isInteger(idx)) return;

    // if a tile is selected, place it
    if (selectedTileId) {
      placeTileIntoSlot(selectedTileId, idx);
      return;
    }

    // otherwise, remove from slot
    removeTileFromSlot(idx);
  });
}

function setupControls() {
  document.querySelectorAll('input[name="mode"]').forEach(r => {
    r.addEventListener('change', () => setMode(r.value));
  });

  els.resetBtn.addEventListener('click', () => {
    clearSlots();
    toast('リセットしたよ');
  });

  els.skipBtn.addEventListener('click', () => {
    streak = 0;
    els.streak.textContent = String(streak);
    newRound();
    toast('つぎのもんだい！');
  });
}

function init() {
  loadMode();
  setupSlotInteractions();
  setupControls();
  els.score.textContent = String(score);
  els.streak.textContent = String(streak);
  newRound();
}

init();

