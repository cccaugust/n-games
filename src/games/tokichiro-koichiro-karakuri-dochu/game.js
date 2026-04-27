const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ui = {
  hp: document.getElementById('hpText'),
  coins: document.getElementById('coinText'),
  shachi: document.getElementById('shachiText'),
  letters: document.getElementById('letterText'),
  mission: document.getElementById('missionText'),
  skillFill: document.getElementById('skillFill'),
  face: document.getElementById('faceIcon')
};

const W = 1280;
const H = 720;
const WORLD_W = 5850;
const GROUND_Y = 612;
const MAX_HP = 5;

const ASSETS = {
  bg: new URL('./assets/castle-town-bg.png', import.meta.url).href,
  atlas: new URL('./assets/sprite-atlas-source.png', import.meta.url).href
};

const COLORS = {
  ink: '#3c2414',
  white: '#fff9df',
  gold: '#ffd45a',
  red: '#df4f37',
  blue: '#234c74',
  green: '#2f7f64',
  shadow: 'rgba(42, 20, 9, 0.22)'
};

const PHYS = {
  gravity: 0.78,
  maxFall: 18,
  friction: 0.82,
  coyote: 0.12,
  jumpBuffer: 0.15,
  invincible: 1.2,
  skillDuration: 5.2
};

const HEROES = {
  toki: {
    name: '藤吉郎',
    speed: 5.6,
    jump: -15.4,
    color: '#f17b2d',
    pose: 'tokiIdle',
    face: 'tokiFace',
    lines: {
      start: 'よし小一郎、ここで手柄を立てるぞ！',
      change: '藤吉郎、ひらりと行くぞ！',
      damage: 'うひゃっ、まだまだ！'
    }
  },
  koi: {
    name: '小一郎',
    speed: 4.35,
    jump: -12.8,
    color: '#2d5c78',
    pose: 'koiIdle',
    face: 'koiFace',
    lines: {
      start: '兄者、まずは人の話を聞きましょう。',
      change: '小一郎、落ち着いて進みます。',
      damage: '油断しました。立て直します。'
    }
  }
};

const SPRITES = {
  tokiIdle: [28, 30, 190, 302],
  tokiRun: [245, 64, 244, 260],
  tokiJump: [497, 10, 170, 315],
  tokiReach: [692, 60, 150, 270],
  koiIdle: [882, 56, 164, 276],
  koiBlock: [1265, 52, 220, 282],
  koiPush: [1055, 100, 190, 226],
  tokiFace: [1490, 62, 142, 150],
  koiFace: [898, 58, 120, 132],
  coin: [52, 374, 92, 146],
  dango: [193, 390, 126, 128],
  hyotan: [361, 394, 118, 126],
  letter: [532, 386, 104, 134],
  shachi: [700, 374, 132, 134],
  crate: [870, 386, 164, 142],
  bridgeBroken: [1060, 386, 246, 142],
  bridgeFixed: [1372, 386, 238, 132],
  grandma: [44, 552, 170, 236],
  carpenter: [287, 548, 175, 252],
  child: [520, 558, 138, 232],
  ashigaru: [734, 552, 156, 244],
  bale: [982, 600, 185, 140],
  dog: [1245, 612, 150, 134],
  warn: [1446, 650, 148, 106],
  sparkle: [210, 828, 160, 104],
  smoke: [468, 812, 260, 126],
  petals: [826, 816, 260, 110],
  glow: [1202, 820, 340, 96]
};

const level = {
  platforms: [
    { x: 0, y: GROUND_Y, w: 1160, h: 120 },
    { x: 1240, y: GROUND_Y, w: 780, h: 120 },
    { x: 2180, y: GROUND_Y, w: 900, h: 120 },
    { x: 3190, y: GROUND_Y, w: 760, h: 120 },
    { x: 4100, y: GROUND_Y, w: 1750, h: 120 },
    { x: 610, y: 492, w: 185, h: 28, high: true },
    { x: 820, y: 405, w: 180, h: 28, high: true },
    { x: 1790, y: 498, w: 230, h: 30 },
    { x: 2460, y: 450, w: 180, h: 28, high: true },
    { x: 2685, y: 372, w: 172, h: 28, high: true },
    { x: 3450, y: 508, w: 190, h: 30 },
    { x: 4540, y: 470, w: 260, h: 30 }
  ],
  bridge: { x: 3080, y: 612, w: 135, h: 70, fixed: false },
  crate: { x: 1518, y: 522, w: 86, h: 90, vx: 0 },
  gate: { x: 5480, y: 402, w: 230, h: 210 },
  dogGateX: 3900
};

const input = {
  left: false,
  right: false,
  jump: false,
  action: false,
  change: false,
  skill: false,
  jumpPressed: false,
  actionPressed: false,
  changePressed: false,
  skillPressed: false
};

const state = {
  screen: 'title',
  cameraX: 0,
  elapsed: 0,
  particles: [],
  floaters: [],
  message: '',
  messageTimer: 0,
  skillTimer: 0,
  lastTime: performance.now(),
  assetsReady: false,
  rescued: 0,
  heldDango: false,
  pinwheel: false,
  bridgeHelped: false,
  result: null
};

const player = {
  x: 96,
  y: 420,
  w: 58,
  h: 88,
  vx: 0,
  vy: 0,
  facing: 1,
  hero: 'toki',
  hp: MAX_HP,
  coins: 0,
  shachi: 0,
  letters: 0,
  skill: 18,
  onGround: false,
  coyote: 0,
  jumpBuffer: 0,
  invincible: 0,
  spawnX: 96,
  spawnY: 420
};

let bgImage;
let atlasImage;
let atlasCanvas;

const entities = {};

function makeImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

Promise.all([makeImage(ASSETS.bg), makeImage(ASSETS.atlas)]).then(([bg, atlas]) => {
  bgImage = bg;
  atlasImage = atlas;
  atlasCanvas = removeGreen(atlasImage);
  state.assetsReady = true;
  updateFace();
});

function removeGreen(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i] < 40 && p[i + 1] > 185 && p[i + 2] < 55) p[i + 3] = 0;
  }
  g.putImageData(data, 0, 0);
  return c;
}

function resetGame(startNow = false) {
  Object.assign(player, {
    x: 96,
    y: 420,
    w: 58,
    h: 88,
    vx: 0,
    vy: 0,
    facing: 1,
    hero: 'toki',
    hp: MAX_HP,
    coins: 0,
    shachi: 0,
    letters: 0,
    skill: 18,
    onGround: false,
    coyote: 0,
    jumpBuffer: 0,
    invincible: 0,
    spawnX: 96,
    spawnY: 420
  });
  state.screen = startNow ? 'play' : 'title';
  state.cameraX = 0;
  state.elapsed = 0;
  state.particles = [];
  state.floaters = [];
  state.skillTimer = 0;
  state.rescued = 0;
  state.heldDango = false;
  state.pinwheel = false;
  state.bridgeHelped = false;
  state.result = null;
  level.bridge.fixed = false;
  level.crate.x = 1518;
  level.crate.vx = 0;
  buildEntities();
  say(HEROES.toki.lines.start, 3.4);
  updateFace();
}

function buildEntities() {
  entities.coins = [
    ...lineCoins(260, 552, 8, 60),
    ...lineCoins(630, 455, 4, 54),
    ...lineCoins(830, 365, 4, 54),
    ...lineCoins(1420, 560, 7, 58),
    ...lineCoins(1850, 455, 4, 54),
    ...lineCoins(2320, 560, 8, 58),
    ...lineCoins(2490, 410, 5, 54),
    ...lineCoins(3450, 468, 5, 54),
    ...lineCoins(4300, 560, 8, 58),
    ...lineCoins(4580, 430, 5, 52),
    ...lineCoins(5060, 560, 6, 58)
  ];
  entities.hiddenCoins = lineCoins(2920, 330, 6, 42).map(c => ({ ...c, hidden: true }));
  entities.letters = [
    { x: 995, y: 345, got: false },
    { x: 2865, y: 312, got: false },
    { x: 4875, y: 410, got: false }
  ];
  entities.shachi = [
    { x: 790, y: 334, got: false, hidden: true },
    { x: 2998, y: 535, got: false, hidden: true },
    { x: 4690, y: 392, got: false, hidden: true }
  ];
  entities.items = [
    { type: 'dango', x: 1190, y: 560, got: false },
    { type: 'hyotan', x: 2110, y: 548, got: false },
    { type: 'dango', x: 3700, y: 560, got: false },
    { type: 'hyotan', x: 4185, y: 548, got: false }
  ];
  entities.npcs = [
    { id: 'grandma', x: 520, y: 495, w: 86, h: 116, helped: false, msg: '団子を見つけたら持ってきておくれ。' },
    { id: 'carpenter', x: 3005, y: 480, w: 90, h: 132, helped: false, msg: '橋は小一郎なら直せそうだ！' },
    { id: 'child', x: 2505, y: 492, w: 72, h: 120, helped: false, msg: '屋根の風車、藤吉郎なら届くかな？' }
  ];
  entities.enemies = [
    { type: 'ashigaru', x: 1740, y: 500, w: 58, h: 92, vx: 1.05, min: 1660, max: 1930, alive: true },
    { type: 'ashigaru', x: 3340, y: 500, w: 58, h: 92, vx: -1.2, min: 3260, max: 3660, alive: true },
    { type: 'dog', x: 3850, y: 522, w: 82, h: 70, vx: 0, alive: true, friendly: false }
  ];
  entities.bales = [
    { x: 2220, y: 220, r: 44, vx: -3.0, vy: 0, active: false, reset: 0 }
  ];
  entities.falling = [
    { x: 4285, y: 80, w: 88, h: 76, vy: 0, timer: 1.3, reset: 0 }
  ];
}

function lineCoins(x, y, count, gap) {
  return Array.from({ length: count }, (_, i) => ({ x: x + i * gap, y, got: false }));
}

resetGame(false);

function rects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function centerRect(x, y, w, h) {
  return { x: x - w / 2, y: y - h / 2, w, h };
}

function say(text, time = 2.2) {
  state.message = text;
  state.messageTimer = time;
}

function addText(text, x, y, color = COLORS.gold) {
  state.floaters.push({ text, x, y, vy: -36, life: 1, color });
}

function burst(x, y, color, count = 14) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 190;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 40,
      life: 0.55 + Math.random() * 0.55,
      size: 4 + Math.random() * 9,
      color
    });
  }
}

function startSkill() {
  if (player.skill < 100 || state.skillTimer > 0 || state.screen !== 'play') return;
  player.skill = 0;
  state.skillTimer = PHYS.skillDuration;
  say('兄弟いっしん！ からくり道を照らすぞ！', 2.2);
  burst(player.x + player.w / 2, player.y + 30, '#ff6aa2', 42);
  for (const e of entities.enemies) {
    if (e.alive && Math.abs(e.x - player.x) < 360) {
      e.alive = false;
      addText('どーん！', e.x, e.y, '#fff0a0');
      burst(e.x + 40, e.y + 40, '#ffd35b', 24);
    }
  }
}

function changeHero() {
  player.hero = player.hero === 'toki' ? 'koi' : 'toki';
  say(HEROES[player.hero].lines.change, 1.8);
  burst(player.x + player.w / 2, player.y + player.h / 2, '#f4f0de', 18);
  updateFace();
}

function updateFace() {
  const key = HEROES[player.hero].face;
  const sprite = Array.isArray(SPRITES[key]) ? SPRITES[key] : [1490, 62, 142, 150];
  const [sx, sy, sw, sh] = sprite;
  ui.face.style.backgroundImage = `url(${ASSETS.atlas})`;
  ui.face.style.backgroundSize = `${(atlasImage?.width || 1659) / sw * 54}px ${(atlasImage?.height || 948) / sh * 54}px`;
  ui.face.style.backgroundPosition = `-${sx / sw * 54}px -${sy / sh * 54}px`;
  ui.face.style.borderColor = player.hero === 'toki' ? '#ffcf69' : '#9fd7ff';
}

function currentHero() {
  return HEROES[player.hero];
}

function update(dt) {
  if (!state.assetsReady) return;
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  state.particles = state.particles.filter(p => (p.life -= dt) > 0);
  state.floaters = state.floaters.filter(f => {
    f.life -= dt;
    f.y += f.vy * dt;
    return f.life > 0;
  });

  if (state.screen !== 'play') return;
  state.elapsed += dt;
  state.skillTimer = Math.max(0, state.skillTimer - dt);
  player.invincible = Math.max(0, player.invincible - dt);
  if (state.skillTimer > 0) player.skill = Math.min(100, player.skill + 7 * dt);

  if (input.changePressed) changeHero();
  if (input.skillPressed) startSkill();
  if (input.jumpPressed) player.jumpBuffer = PHYS.jumpBuffer;
  player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
  player.coyote = player.onGround ? PHYS.coyote : Math.max(0, player.coyote - dt);

  const hero = currentHero();
  const skillBoost = state.skillTimer > 0 ? 1.32 : 1;
  const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (move) {
    player.vx += move * hero.speed * 0.22 * skillBoost;
    player.facing = move;
  } else {
    player.vx *= PHYS.friction;
  }
  player.vx = clamp(player.vx, -hero.speed * skillBoost, hero.speed * skillBoost);

  if (player.jumpBuffer > 0 && player.coyote > 0) {
    player.vy = hero.jump;
    player.jumpBuffer = 0;
    player.coyote = 0;
    player.onGround = false;
    burst(player.x + 30, player.y + player.h, '#fff1b0', 8);
  }

  player.vy = Math.min(PHYS.maxFall, player.vy + PHYS.gravity);
  movePlayer(dt);
  updateWorld(dt);
  collectThings();
  handleAction();
  updateMission();

  state.cameraX = clamp(player.x - W * 0.42, 0, WORLD_W - W);
  if (player.y > H + 120) hurt(1, true);
  if (player.hp <= 0) state.screen = 'gameover';
}

function movePlayer(dt) {
  player.x += player.vx;
  collideX(level.crate);
  if (player.hero === 'koi' && rects(player, level.crate) && Math.abs(player.vx) > 0.2) {
    level.crate.x += player.vx;
    level.crate.x = clamp(level.crate.x, 1395, 1675);
  }
  player.x = clamp(player.x, 0, WORLD_W - player.w);

  player.y += player.vy;
  player.onGround = false;
  for (const p of solidPlatforms()) {
    if (rects(player, p) && player.vy >= 0 && player.y + player.h - player.vy <= p.y + 12) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.spawnX = player.x;
      player.spawnY = player.y;
    }
  }
}

function solidPlatforms() {
  const list = [...level.platforms, level.crate];
  if (level.bridge.fixed) list.push(level.bridge);
  return list;
}

function collideX(obj) {
  if (!rects(player, obj)) return;
  if (player.vx > 0) player.x = obj.x - player.w;
  if (player.vx < 0) player.x = obj.x + obj.w;
  player.vx = 0;
}

function updateWorld(dt) {
  for (const e of entities.enemies) {
    if (!e.alive) continue;
    if (e.type === 'ashigaru') {
      e.x += e.vx;
      if (e.x < e.min || e.x > e.max) e.vx *= -1;
    }
    if (e.type === 'dog') {
      e.friendly = state.heldDango || e.x - player.x > 160;
      if (!e.friendly && player.x > e.x - 210 && player.x < e.x) {
        say('見張り犬「わん！ 団子があれば通すよ！」', 1.4);
        player.x = Math.min(player.x, e.x - player.w - 8);
      }
    }
    if (rects(player, e) && !e.friendly) hurt(player.hero === 'koi' && input.action ? 0 : 1);
  }

  for (const b of entities.bales) {
    if (!b.active && player.x > 2010) b.active = true;
    if (b.active) {
      b.vy += PHYS.gravity;
      b.x += b.vx;
      b.y += b.vy;
      if (b.y + b.r > GROUND_Y) {
        b.y = GROUND_Y - b.r;
        b.vy *= -0.36;
      }
      if (circleRect(b, player)) hurt(1);
      if (b.x < 1700) {
        b.x = 2260;
        b.y = 230;
        b.vy = 0;
        b.active = false;
      }
    }
  }

  for (const f of entities.falling) {
    if (f.reset > 0) {
      f.reset -= dt;
      if (f.reset <= 0) {
        f.y = 80;
        f.vy = 0;
        f.timer = 1.3;
      }
      continue;
    }
    if (Math.abs(player.x - f.x) < 260) f.timer -= dt;
    if (f.timer <= 0) {
      f.vy += PHYS.gravity * 1.15;
      f.y += f.vy;
      if (rects(player, f)) hurt(1);
      if (f.y > GROUND_Y - 70) f.reset = 2.2;
    }
  }
}

function circleRect(c, r) {
  const x = clamp(c.x, r.x, r.x + r.w);
  const y = clamp(c.y, r.y, r.y + r.h);
  return (c.x - x) ** 2 + (c.y - y) ** 2 < c.r ** 2;
}

function collectThings() {
  for (const c of [...entities.coins, ...entities.hiddenCoins]) {
    if (c.got || (c.hidden && state.skillTimer <= 0)) continue;
    if (rects(player, centerRect(c.x, c.y, 34, 34))) {
      c.got = true;
      player.coins += c.hidden ? 5 : 1;
      player.skill = Math.min(100, player.skill + 3);
      addText(c.hidden ? '+5' : '+1', c.x, c.y);
      burst(c.x, c.y, '#ffd34c', 8);
    }
  }
  for (const l of entities.letters) {
    if (!l.got && rects(player, centerRect(l.x, l.y, 52, 52))) {
      l.got = true;
      player.letters += 1;
      player.skill = Math.min(100, player.skill + 18);
      say(`書状の切れはし ${player.letters}/3 を見つけた！`, 2);
      burst(l.x, l.y, '#ffe9a6', 18);
    }
  }
  for (const s of entities.shachi) {
    if (!s.got && (!s.hidden || state.skillTimer > 0 || state.pinwheel) && rects(player, centerRect(s.x, s.y, 58, 58))) {
      s.got = true;
      player.shachi += 1;
      player.skill = Math.min(100, player.skill + 25);
      say(`金しゃち発見！ ${player.shachi}/3`, 2);
      burst(s.x, s.y, '#ffdf55', 28);
    }
  }
  for (const item of entities.items) {
    if (item.got || !rects(player, centerRect(item.x, item.y, 50, 50))) continue;
    item.got = true;
    if (item.type === 'dango') {
      state.heldDango = true;
      player.hp = Math.min(MAX_HP, player.hp + 1);
      say('団子を手に入れた。犬も町人もよろこびそう！', 2);
    } else {
      player.skill = Math.min(100, player.skill + 38);
      say('ひょうたんで兄弟わざゲージ回復！', 1.6);
    }
    burst(item.x, item.y, '#fff1a8', 12);
  }
  if (player.letters >= 3 && rects(player, level.gate)) clearGame();
}

function handleAction() {
  if (!input.actionPressed) return;
  const near = entities.npcs.find(n => Math.abs((player.x + player.w / 2) - (n.x + n.w / 2)) < 115 && Math.abs(player.y - n.y) < 130);
  if (near) {
    if (near.id === 'grandma' && state.heldDango && !near.helped) {
      near.helped = true;
      state.rescued += 1;
      player.hp = MAX_HP;
      say('おばあさん「助かったよ。団子で元気をお出し！」', 2.5);
      burst(near.x + 45, near.y + 44, '#ffb6c8', 20);
    } else if (near.id === 'carpenter' && player.hero === 'koi' && !level.bridge.fixed) {
      near.helped = true;
      level.bridge.fixed = true;
      state.bridgeHelped = true;
      state.rescued += 1;
      say('小一郎「橋、直りました。安全に渡れます。」', 2.4);
      burst(level.bridge.x + 60, level.bridge.y, '#b9f3ff', 24);
    } else if (near.id === 'child' && player.hero === 'toki' && player.y < 430 && !near.helped) {
      near.helped = true;
      state.pinwheel = true;
      state.rescued += 1;
      say('子ども「ありがとう！金しゃちは屋根の上だよ！」', 2.4);
      burst(near.x + 36, near.y + 30, '#aaf3ff', 22);
    } else {
      say(near.msg, 1.9);
    }
    return;
  }
  if (player.hero === 'koi' && Math.abs(player.x - level.bridge.x) < 145 && !level.bridge.fixed) {
    say('小一郎なら大工さんと直せそうです。', 1.7);
  } else if (player.hero === 'toki') {
    say('藤吉郎「小判じゃ！ 出世のにおいがするぞ！」', 1.6);
  } else {
    say('小一郎「落とし物かもしれませんよ。」', 1.6);
  }
}

function hurt(amount, fell = false) {
  if (amount <= 0) {
    say('小一郎「盾で受けます！」', 1.1);
    return;
  }
  if (player.invincible > 0) return;
  player.hp -= amount;
  player.invincible = PHYS.invincible;
  player.vx = -player.facing * 6;
  player.vy = -8;
  say(fell ? '足をすべらせた！ 少し戻るぞ。' : HEROES[player.hero].lines.damage, 1.5);
  burst(player.x + player.w / 2, player.y + 32, '#ff695d', 18);
  if (fell) {
    player.x = Math.max(60, player.spawnX - 60);
    player.y = player.spawnY;
    player.vx = 0;
    player.vy = 0;
  }
}

function clearGame() {
  const time = state.elapsed;
  const score = player.coins + player.shachi * 12 + state.rescued * 10 + Math.max(0, 80 - time) * 0.4;
  let rank = 'かけだし足軽';
  if (score > 72) rank = '町の人気者';
  if (score > 105) rank = '出世の星';
  if (score > 135 && player.shachi === 3 && state.rescued === 3) rank = '天下の兄弟';
  state.result = { time, rank };
  state.screen = 'clear';
  say('藤吉郎「見たか、これが兄弟の力じゃ！」', 2.4);
}

function updateMission() {
  let text = '書状を3つ集めて清洲城の門へ届けよう';
  if (player.letters < 1) text = '高い屋根へ。藤吉郎のジャンプが役に立つ';
  else if (!state.bridgeHelped && player.x > 2350) text = '大工を助けて、小一郎で橋を直そう';
  else if (!state.heldDango && player.x > 3450) text = '見張り犬には団子を見せよう';
  else if (player.letters >= 3) text = '書状がそろった。清洲城の門へ！';
  ui.mission.textContent = text;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  if (!state.assetsReady) {
    ctx.fillStyle = '#75c9f5';
    ctx.fillRect(0, 0, W, H);
    drawCentered('からくり準備中...', 58, H / 2);
    return;
  }
  drawBackground();
  drawLevel();
  drawEntities();
  drawPlayer();
  drawParticles();
  drawDialogue();
  if (state.screen === 'title') drawTitle();
  if (state.screen === 'clear') drawClear();
  if (state.screen === 'gameover') drawGameOver();
  updateHud();
  clearPressed();
}

function drawBackground() {
  const sx = (state.cameraX / (WORLD_W - W)) * Math.max(0, bgImage.width - W);
  ctx.drawImage(bgImage, sx, 0, Math.min(W, bgImage.width - sx), bgImage.height, 0, 0, W, H);
  ctx.fillStyle = 'rgba(255, 230, 145, 0.18)';
  ctx.fillRect(0, 0, W, H);
}

function drawLevel() {
  const cam = state.cameraX;
  ctx.save();
  ctx.translate(-cam, 0);
  for (const p of level.platforms) drawPlatform(p);
  drawBridge(level.bridge);
  drawAtlas('crate', level.crate.x - 18, level.crate.y - 18, 124, 108);
  drawGateMarker();
  drawArrow();
  ctx.restore();
}

function drawPlatform(p) {
  ctx.fillStyle = '#8e6241';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = '#d9b16d';
  ctx.fillRect(p.x, p.y, p.w, 12);
  ctx.fillStyle = 'rgba(70, 38, 18, 0.28)';
  for (let x = p.x; x < p.x + p.w; x += 52) ctx.fillRect(x, p.y + 8, 28, 7);
  if (p.high) {
    ctx.fillStyle = '#fff1a8';
    ctx.fillRect(p.x + 12, p.y - 5, p.w - 24, 5);
  }
}

function drawBridge(b) {
  if (b.fixed) drawAtlas('bridgeFixed', b.x - 42, b.y - 68, 230, 126);
  else drawAtlas('bridgeBroken', b.x - 42, b.y - 72, 230, 132);
}

function drawGateMarker() {
  const g = level.gate;
  ctx.strokeStyle = player.letters >= 3 ? '#fff17b' : 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 5;
  ctx.strokeRect(g.x, g.y, g.w, g.h);
  ctx.fillStyle = 'rgba(48, 26, 13, 0.75)';
  roundRect(g.x + 20, g.y - 48, 190, 40, 12, true);
  ctx.fillStyle = '#fff6c8';
  ctx.font = '900 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('清洲城の門', g.x + 115, g.y - 20);
}

function drawArrow() {
  const targetX = player.letters >= 3 ? level.gate.x : nextTargetX();
  const x = clamp(targetX, state.cameraX + 120, state.cameraX + W - 120);
  const y = 112 + Math.sin(state.elapsed * 5) * 8;
  ctx.fillStyle = '#ffdf4d';
  ctx.strokeStyle = '#7a3b13';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 28, y - 34);
  ctx.lineTo(x - 8, y - 34);
  ctx.lineTo(x - 8, y - 74);
  ctx.lineTo(x + 8, y - 74);
  ctx.lineTo(x + 8, y - 34);
  ctx.lineTo(x + 28, y - 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function nextTargetX() {
  const letter = entities.letters.find(l => !l.got);
  if (letter) return letter.x;
  return level.gate.x;
}

function drawEntities() {
  const cam = state.cameraX;
  ctx.save();
  ctx.translate(-cam, 0);
  for (const c of entities.coins) if (!c.got) drawAtlas('coin', c.x - 16, c.y - 24, 32, 48);
  for (const c of entities.hiddenCoins) {
    if (!c.got && state.skillTimer > 0) {
      drawGlow(c.x, c.y, 38);
      drawAtlas('coin', c.x - 16, c.y - 24, 32, 48);
    }
  }
  for (const item of entities.items) if (!item.got) drawAtlas(item.type, item.x - 24, item.y - 28, 48, 54);
  for (const l of entities.letters) if (!l.got) {
    drawGlow(l.x, l.y, 54);
    drawAtlas('letter', l.x - 26, l.y - 34, 52, 66);
  }
  for (const s of entities.shachi) if (!s.got && (!s.hidden || state.skillTimer > 0 || state.pinwheel)) {
    drawGlow(s.x, s.y, 64);
    drawAtlas('shachi', s.x - 34, s.y - 32, 68, 58);
  }
  for (const n of entities.npcs) {
    const key = n.id === 'grandma' ? 'grandma' : n.id === 'carpenter' ? 'carpenter' : 'child';
    drawAtlas(key, n.x - 28, n.y - 42, n.w + 48, n.h + 42);
    if (!n.helped) drawBubble(n.x + n.w / 2, n.y - 20, '!');
  }
  for (const e of entities.enemies) {
    if (!e.alive) continue;
    if (e.type === 'ashigaru') drawAtlas('ashigaru', e.x - 44, e.y - 50, 142, 142);
    if (e.type === 'dog') {
      drawAtlas('dog', e.x - 30, e.y - 36, 132, 104);
      if (!e.friendly && Math.abs(player.x - e.x) < 260) drawBubble(e.x + 42, e.y - 24, 'わん');
    }
  }
  for (const b of entities.bales) if (b.active) drawAtlas('bale', b.x - b.r, b.y - b.r, b.r * 2.2, b.r * 1.75);
  for (const f of entities.falling) {
    if (f.reset <= 0) {
      if (f.timer > 0) drawAtlas('warn', f.x - 20, GROUND_Y - 96, 100, 72);
      drawAtlas('crate', f.x, f.y, f.w, f.h);
    }
  }
  ctx.restore();
}

function drawPlayer() {
  const cam = state.cameraX;
  if (player.invincible > 0 && Math.floor(state.elapsed * 18) % 2 === 0) return;
  const hero = currentHero();
  let key = hero.pose;
  if (!player.onGround) key = player.hero === 'toki' ? 'tokiJump' : 'koiIdle';
  else if (Math.abs(player.vx) > 1) key = player.hero === 'toki' ? 'tokiRun' : 'koiPush';
  if (player.hero === 'koi' && input.action) key = 'koiBlock';
  if (player.hero === 'toki' && input.action) key = 'tokiReach';

  ctx.save();
  ctx.translate(player.x + player.w / 2 - cam, player.y + player.h);
  if (player.facing < 0) ctx.scale(-1, 1);
  drawAtlasAt(key, -58, -126, 116, 138);
  if (state.skillTimer > 0) {
    ctx.globalAlpha = 0.55 + Math.sin(state.elapsed * 18) * 0.2;
    drawAtlasAt('glow', -78, -128, 156, 146);
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  ctx.translate(-state.cameraX, 0);
  for (const p of state.particles) {
    p.x += p.vx / 60;
    p.y += p.vy / 60;
    p.vy += 5;
    ctx.globalAlpha = clamp(p.life * 1.8, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const f of state.floaters) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.fillStyle = f.color;
    ctx.strokeStyle = '#5b2a12';
    ctx.lineWidth = 4;
    ctx.font = '900 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawDialogue() {
  if (state.messageTimer <= 0 || !state.message) return;
  const alpha = clamp(state.messageTimer, 0, 1);
  ctx.globalAlpha = alpha;
  roundRect(270, 96, 740, 58, 18, true, 'rgba(54, 31, 17, 0.82)');
  ctx.strokeStyle = '#ffe2a0';
  ctx.lineWidth = 3;
  roundRect(270, 96, 740, 58, 18, false);
  ctx.fillStyle = COLORS.white;
  ctx.font = '900 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.message, 640, 133);
  ctx.globalAlpha = 1;
}

function drawTitle() {
  ctx.fillStyle = 'rgba(38, 21, 11, 0.48)';
  ctx.fillRect(0, 0, W, H);
  drawAtlas('tokiRun', 250 + Math.sin(state.elapsed * 4) * 18, 358, 155, 154);
  drawAtlas('koiBlock', 865 - Math.sin(state.elapsed * 3.2) * 12, 354, 160, 154);
  drawAtlas('petals', 510, 488, 260, 110);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a2410';
  ctx.strokeStyle = '#fff1a8';
  ctx.lineWidth = 12;
  ctx.font = '900 72px serif';
  ctx.strokeText('藤吉郎と小一郎', 640, 175);
  ctx.fillText('藤吉郎と小一郎', 640, 175);
  ctx.font = '900 58px serif';
  ctx.strokeText('からくり道中', 640, 250);
  ctx.fillText('からくり道中', 640, 250);
  ctx.fillStyle = '#fff8d8';
  ctx.font = '900 24px sans-serif';
  ctx.fillText('城下町どたばた道中', 640, 302);
  drawButton(505, 545, 270, 70, 'はじめる');
  ctx.font = '700 18px sans-serif';
  ctx.fillStyle = '#fff2c2';
  ctx.fillText('A/D・←/→ 移動  Space ジャンプ  E 動作  Q 交代  Shift 兄弟わざ', 640, 648);
}

function drawClear() {
  overlayPanel('任務達成！', '#ffe27a');
  const r = state.result || { time: state.elapsed, rank: '町の人気者' };
  const rows = [
    `小判数  ${player.coins}`,
    `金しゃち  ${player.shachi}/3`,
    `助けた町人  ${state.rescued}/3`,
    `タイム  ${formatTime(r.time)}`,
    `評価  ${r.rank}`
  ];
  drawRows(rows);
  drawButton(520, 566, 240, 64, 'もう一回');
  ctx.font = '900 22px sans-serif';
  ctx.fillStyle = '#fff8df';
  ctx.fillText('小一郎「半分くらいは町のみなさんのおかげです。」', 640, 520);
}

function drawGameOver() {
  overlayPanel('ゲームオーバー', '#ff9b87');
  ctx.font = '900 24px sans-serif';
  ctx.fillStyle = '#fff8df';
  ctx.textAlign = 'center';
  ctx.fillText('少し休んで、もう一回挑戦しよう。', 640, 360);
  drawButton(520, 465, 240, 64, 'もう一回');
}

function overlayPanel(title, color) {
  ctx.fillStyle = 'rgba(30, 16, 8, 0.62)';
  ctx.fillRect(0, 0, W, H);
  roundRect(360, 120, 560, 500, 24, true, 'rgba(64, 37, 19, 0.9)');
  ctx.strokeStyle = '#ffe1a0';
  ctx.lineWidth = 4;
  roundRect(360, 120, 560, 500, 24, false);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = '900 54px sans-serif';
  ctx.fillText(title, 640, 205);
}

function drawRows(rows) {
  ctx.font = '900 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff8df';
  rows.forEach((row, i) => ctx.fillText(row, 485, 290 + i * 44));
}

function drawButton(x, y, w, h, text) {
  roundRect(x, y, w, h, 20, true, '#d9532d');
  ctx.strokeStyle = '#fff1a6';
  ctx.lineWidth = 4;
  roundRect(x, y, w, h, 20, false);
  ctx.fillStyle = '#fff8d8';
  ctx.font = '900 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + w / 2, y + h / 2 + 11);
}

function drawCentered(text, size, y) {
  ctx.fillStyle = COLORS.white;
  ctx.font = `900 ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, y);
}

function drawBubble(x, y, text) {
  roundRect(x - 30, y - 42, 60, 34, 12, true, 'rgba(255, 250, 219, 0.94)');
  ctx.fillStyle = COLORS.ink;
  ctx.font = '900 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 18);
}

function drawGlow(x, y, r) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,245,139,0.75)');
  g.addColorStop(1, 'rgba(255,245,139,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawAtlas(key, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  drawAtlasAt(key, 0, 0, w, h);
  ctx.restore();
}

function drawAtlasAt(key, x, y, w, h) {
  const s = SPRITES[key];
  if (!s || !atlasCanvas) return;
  ctx.drawImage(atlasCanvas, s[0], s[1], s[2], s[3], x, y, w, h);
}

function roundRect(x, y, w, h, r, fill, color) {
  if (color) ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  else ctx.stroke();
}

function updateHud() {
  ui.hp.textContent = player.hp;
  ui.coins.textContent = player.coins;
  ui.shachi.textContent = `${player.shachi}/3`;
  ui.letters.textContent = `${player.letters}/3`;
  ui.skillFill.style.width = `${Math.round(player.skill)}%`;
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function clearPressed() {
  input.jumpPressed = false;
  input.actionPressed = false;
  input.changePressed = false;
  input.skillPressed = false;
}

function frame(now) {
  const dt = Math.min(0.033, (now - state.lastTime) / 1000);
  state.lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

window.addEventListener('keydown', e => {
  if (['Space', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  setKey(e.code, true);
});

window.addEventListener('keyup', e => setKey(e.code, false));

function setKey(code, down) {
  if (code === 'ArrowLeft' || code === 'KeyA') input.left = down;
  if (code === 'ArrowRight' || code === 'KeyD') input.right = down;
  if (code === 'Space') press('jump', down);
  if (code === 'KeyE') press('action', down);
  if (code === 'KeyQ') press('change', down);
  if (code === 'ShiftLeft' || code === 'ShiftRight') press('skill', down);
}

function press(name, down) {
  const was = input[name];
  input[name] = down;
  if (down && !was) input[`${name}Pressed`] = true;
}

const pointerMap = new Map();
document.querySelectorAll('[data-control]').forEach(btn => {
  const control = btn.dataset.control;
  const onDown = e => {
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    pointerMap.set(e.pointerId, control);
    btn.classList.add('is-down');
    if (['jump', 'action', 'change', 'skill'].includes(control)) press(control, true);
    else input[control] = true;
  };
  const onUp = e => {
    e.preventDefault();
    btn.classList.remove('is-down');
    const mapped = pointerMap.get(e.pointerId) || control;
    pointerMap.delete(e.pointerId);
    if (['jump', 'action', 'change', 'skill'].includes(mapped)) press(mapped, false);
    else input[mapped] = false;
  };
  btn.addEventListener('pointerdown', onDown);
  btn.addEventListener('pointerup', onUp);
  btn.addEventListener('pointercancel', onUp);
  btn.addEventListener('pointerleave', e => {
    if (pointerMap.has(e.pointerId)) onUp(e);
  });
});

canvas.addEventListener('pointerdown', e => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * W;
  const y = (e.clientY - rect.top) / rect.height * H;
  if (state.screen === 'title' && x >= 505 && x <= 775 && y >= 545 && y <= 615) resetGame(true);
  if ((state.screen === 'clear' || state.screen === 'gameover') && x >= 520 && x <= 760 && y >= 465 && y <= 630) resetGame(true);
});
