
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const hpValue = document.getElementById('hpValue');
const bugValue = document.getElementById('bugValue');
const medalValue = document.getElementById('medalValue');
const dashGaugeFill = document.getElementById('dashGaugeFill');

const WIDTH = 1280;
const HEIGHT = 720;
const GROUND_Y = 610;
const WORLD_WIDTH = 4200;
const MEDAL_COUNT = 3;

const COLORS = {
  skyTop: '#f4b980',
  skyMid: '#f3dca3',
  skyBottom: '#d7eeb5',
  dirt: '#a27145',
  dirtDark: '#744a2f',
  grass: '#84b766',
  leaf: '#8fbe64',
  leafDark: '#66904c',
  stem: '#65804e',
  stone: '#a9aa9e',
  stoneDark: '#817f77',
  web: 'rgba(240, 243, 252, 0.76)',
  sun: '#ffe18e',
  uiShadow: 'rgba(71, 48, 20, 0.16)',
  warning: '#e9784b',
  warningSoft: 'rgba(233, 120, 75, 0.18)',
  good: '#6bb66a',
  white: '#fffdf7',
  ink: '#4f3520'
};

const PHYSICS = {
  gravity: 0.68,
  moveSpeed: 4.2,
  dashSpeed: 8.8,
  climbSpeed: 3.4,
  jumpVelocity: -12.8,
  maxFallSpeed: 18,
  coyoteTime: 0.12,
  jumpBuffer: 0.16,
  dashMax: 100,
  dashDrainPerSecond: 33,
  dashRecoverPerSecond: 18,
  dashRecoverSunPerSecond: 44,
  invincibleDuration: 1.5,
  slowdownDuration: 2.4,
  pushbackDuration: 0.36,
  hideFadeSpeed: 5.6,
  birdWarningDuration: 1.4,
  birdCooldownDuration: 3.8
};

const input = {
  left: false,
  right: false,
  dash: false,
  hide: false,
  jumpHeld: false,
  jumpPressed: false
};

const pointerButtons = new Map();

const level = {
  segments: [
    { x: 0, y: GROUND_Y, w: 540, h: 120, kind: 'ground' },
    { x: 630, y: GROUND_Y, w: 880, h: 120, kind: 'ground' },
    { x: 1620, y: GROUND_Y, w: 670, h: 120, kind: 'ground' },
    { x: 2390, y: GROUND_Y, w: 1040, h: 120, kind: 'ground' },
    { x: 3520, y: GROUND_Y, w: 680, h: 120, kind: 'ground' }
  ],
  holes: [
    { x: 540, w: 90 },
    { x: 1510, w: 110 },
    { x: 2290, w: 100 },
    { x: 3430, w: 90 }
  ],
  platforms: [
    { x: 255, y: 518, w: 150, h: 28, type: 'stone' },
    { x: 820, y: 498, w: 176, h: 26, type: 'stone' },
    { x: 980, y: 448, w: 120, h: 24, type: 'leaf' },
    { x: 1300, y: 496, w: 150, h: 26, type: 'stone' },
    { x: 1710, y: 542, w: 84, h: 68, type: 'boulder' },
    { x: 1860, y: 486, w: 138, h: 24, type: 'leaf' },
    { x: 2050, y: 432, w: 164, h: 26, type: 'stone' },
    { x: 2550, y: 512, w: 148, h: 26, type: 'leaf' },
    { x: 2720, y: 456, w: 140, h: 24, type: 'stone' },
    { x: 3080, y: 488, w: 164, h: 24, type: 'leaf' },
    { x: 3300, y: 428, w: 126, h: 24, type: 'stone' },
    { x: 3640, y: 504, w: 174, h: 28, type: 'stone' }
  ],
  climbables: [
    { x: 1660, y: 468, w: 52, h: 142, type: 'stone' },
    { x: 2200, y: 360, w: 52, h: 250, type: 'wall' },
    { x: 3435, y: 366, w: 50, h: 244, type: 'wall' }
  ],
  grasses: [
    { x: 104, y: 540, w: 140, h: 70 },
    { x: 1100, y: 546, w: 170, h: 64 },
    { x: 1770, y: 546, w: 150, h: 64 },
    { x: 2840, y: 544, w: 170, h: 66 },
    { x: 3720, y: 542, w: 180, h: 68 }
  ],
  sunlight: [
    { x: 700, y: 540, w: 150, h: 70 },
    { x: 1970, y: 540, w: 170, h: 70 },
    { x: 3180, y: 540, w: 190, h: 70 }
  ],
  webs: [
    { x: 912, y: 516, w: 74, h: 36 },
    { x: 2608, y: 522, w: 78, h: 38 }
  ],
  ants: [
    { x: 1435, y: 586, w: 120, h: 20, dir: -1 },
    { x: 2990, y: 586, w: 120, h: 20, dir: 1 }
  ],
  bugs: [
    { x: 220, y: 486, value: 10 },
    { x: 344, y: 482, value: 10 },
    { x: 760, y: 562, value: 10 },
    { x: 882, y: 468, value: 20 },
    { x: 1040, y: 414, value: 20 },
    { x: 1360, y: 464, value: 10 },
    { x: 1762, y: 510, value: 10 },
    { x: 1928, y: 452, value: 20 },
    { x: 2120, y: 396, value: 20 },
    { x: 2506, y: 560, value: 10 },
    { x: 2624, y: 480, value: 20 },
    { x: 2792, y: 424, value: 20 },
    { x: 3124, y: 456, value: 10 },
    { x: 3368, y: 392, value: 20 },
    { x: 3704, y: 472, value: 10 },
    { x: 3848, y: 538, value: 10 }
  ],
  medals: [
    { x: 1090, y: 390 },
    { x: 2210, y: 374 },
    { x: 3366, y: 364 }
  ],
  stones: [
    { x: 140, y: 578, r: 24 },
    { x: 884, y: 584, r: 20 },
    { x: 1974, y: 584, r: 26 },
    { x: 2750, y: 582, r: 18 },
    { x: 3620, y: 584, r: 22 }
  ],
  goal: { x: 3950, y: 430, w: 160, h: 180 }
};

const state = {
  screen: 'title',
  cameraX: 0,
  elapsed: 0,
  bestMessage: '',
  warningPulse: 0,
  particles: [],
  floatingTexts: [],
  bird: {
    cooldown: 2.4,
    warningTimer: 0,
    strikeTimer: 0,
    targetX: 760,
    shadowX: 760,
    attacking: false,
    swoopX: -200
  }
};

const player = {
  spawnX: 90,
  spawnY: 528,
  x: 90,
  y: 528,
  w: 74,
  h: 38,
  vx: 0,
  vy: 0,
  facing: 1,
  hp: 3,
  bugs: 0,
  medals: 0,
  dash: PHYSICS.dashMax,
  onGround: false,
  isHidden: false,
  hideBlend: 0,
  coyoteTimer: 0,
  jumpBufferTimer: 0,
  dashBurst: 0,
  invincibleTimer: 0,
  slowTimer: 0,
  antPushTimer: 0,
  antPushDirection: 0,
  climbTimer: 0,
  happyTimer: 0,
  blinkTime: 0
};

let lastTime = performance.now();

function resetRun() {
  state.screen = 'title';
  state.cameraX = 0;
  state.elapsed = 0;
  state.bestMessage = '';
  state.warningPulse = 0;
  state.particles = [];
  state.floatingTexts = [];
  state.bird.cooldown = 2.1;
  state.bird.warningTimer = 0;
  state.bird.strikeTimer = 0;
  state.bird.targetX = 760;
  state.bird.shadowX = 760;
  state.bird.attacking = false;
  state.bird.swoopX = -220;

  player.x = player.spawnX;
  player.y = player.spawnY;
  player.vx = 0;
  player.vy = 0;
  player.facing = 1;
  player.hp = 3;
  player.bugs = 0;
  player.medals = 0;
  player.dash = PHYSICS.dashMax;
  player.onGround = false;
  player.isHidden = false;
  player.hideBlend = 0;
  player.coyoteTimer = 0;
  player.jumpBufferTimer = 0;
  player.dashBurst = 0;
  player.invincibleTimer = 0;
  player.slowTimer = 0;
  player.antPushTimer = 0;
  player.antPushDirection = 0;
  player.climbTimer = 0;
  player.happyTimer = 0;
  player.blinkTime = 0;

  level.bugs.forEach((bug) => {
    bug.collected = false;
  });
  level.medals.forEach((medal) => {
    medal.collected = false;
  });

  updateHud();
}

function startGame() {
  resetRun();
  state.screen = 'playing';
}

function updateHud() {
  hpValue.textContent = String(player.hp);
  bugValue.textContent = String(player.bugs);
  medalValue.textContent = `${player.medals} / ${MEDAL_COUNT}`;
  dashGaugeFill.style.transform = `scaleX(${Math.max(0, player.dash / PHYSICS.dashMax)})`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function addParticle(x, y, options = {}) {
  state.particles.push({
    x,
    y,
    vx: options.vx ?? (Math.random() - 0.5) * 2,
    vy: options.vy ?? -Math.random() * 2,
    life: options.life ?? 0.5,
    maxLife: options.life ?? 0.5,
    radius: options.radius ?? 6,
    color: options.color ?? 'rgba(255,255,255,0.8)',
    gravity: options.gravity ?? 14
  });
}

function addFloatText(x, y, text, color = COLORS.ink) {
  state.floatingTexts.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

function emitDust(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    addParticle(x, y, {
      vx: (Math.random() - 0.5) * 2.4,
      vy: -0.5 - Math.random() * 1.8,
      life: 0.42 + Math.random() * 0.18,
      radius: 6 + Math.random() * 7,
      color: 'rgba(181, 138, 99, 0.45)'
    });
  }
}

function emitSparkle(x, y, count, color) {
  for (let i = 0; i < count; i += 1) {
    addParticle(x, y, {
      vx: (Math.random() - 0.5) * 70 / 60,
      vy: (Math.random() - 0.8) * 70 / 60,
      life: 0.55 + Math.random() * 0.25,
      radius: 3 + Math.random() * 3,
      color,
      gravity: 8
    });
  }
}

function getPlayerRect() {
  return { x: player.x, y: player.y, w: player.w, h: player.h };
}

function isInsideGrass() {
  const center = player.x + player.w * 0.5;
  return level.grasses.some((grass) => center > grass.x && center < grass.x + grass.w && player.y + player.h > grass.y + 10);
}

function isNearClimbable() {
  const probe = { x: player.x - 10, y: player.y - 10, w: player.w + 20, h: player.h + 18 };
  return level.climbables.some((wall) => rectsOverlap(probe, wall));
}

function spawnLandingPuff() {
  emitDust(player.x + player.w * 0.5, player.y + player.h - 2, 7);
  emitSparkle(player.x + player.w * 0.5, player.y + player.h - 3, 3, 'rgba(255,244,214,0.8)');
}

function damagePlayer(reason = 'hit') {
  if (player.invincibleTimer > 0 || state.screen !== 'playing') {
    return;
  }

  player.hp -= 1;
  player.invincibleTimer = PHYSICS.invincibleDuration;
  player.blinkTime = 0;
  player.vy = -7.6;
  player.vx = player.facing * -2.5;
  updateHud();

  emitSparkle(player.x + player.w * 0.4, player.y + player.h * 0.4, 9, 'rgba(255,165,140,0.9)');
  addFloatText(player.x + player.w * 0.5, player.y - 12, reason === 'fall' ? '-1 HP' : 'いたっ', COLORS.warning);

  if (player.hp <= 0) {
    state.screen = 'gameover';
  }
}

function recoverDash(dt, inSunlight) {
  const recoverRate = inSunlight ? PHYSICS.dashRecoverSunPerSecond : PHYSICS.dashRecoverPerSecond;
  player.dash = clamp(player.dash + recoverRate * dt, 0, PHYSICS.dashMax);
}

function handleCollectibles() {
  const rect = getPlayerRect();
  for (const bug of level.bugs) {
    if (bug.collected) continue;
    const hitBox = { x: bug.x - 18, y: bug.y - 18, w: 36, h: 36 };
    if (rectsOverlap(rect, hitBox)) {
      bug.collected = true;
      player.bugs += bug.value;
      emitSparkle(bug.x, bug.y, 10, 'rgba(255,232,135,0.95)');
      addFloatText(bug.x, bug.y - 10, `+${bug.value}`, '#8a5b14');
      updateHud();
    }
  }

  for (const medal of level.medals) {
    if (medal.collected) continue;
    const hitBox = { x: medal.x - 20, y: medal.y - 20, w: 40, h: 40 };
    if (rectsOverlap(rect, hitBox)) {
      medal.collected = true;
      player.medals += 1;
      emitSparkle(medal.x, medal.y, 14, 'rgba(147, 205, 105, 0.95)');
      addFloatText(medal.x, medal.y - 14, '葉っぱメダル', '#537833');
      updateHud();
    }
  }

  for (const web of level.webs) {
    if (rectsOverlap(rect, web)) {
      player.slowTimer = Math.max(player.slowTimer, PHYSICS.slowdownDuration);
    }
  }

  for (const ants of level.ants) {
    if (rectsOverlap(rect, ants)) {
      player.antPushTimer = PHYSICS.pushbackDuration;
      player.antPushDirection = ants.dir;
    }
  }

  if (rectsOverlap(rect, level.goal) && player.medals === MEDAL_COUNT) {
    state.screen = 'clear';
    player.happyTimer = 999;
  }

  if (rectsOverlap(rect, level.goal) && player.medals < MEDAL_COUNT) {
    state.bestMessage = '葉っぱメダルを 3 つ集めると すみかに入れるよ';
  } else {
    state.bestMessage = '';
  }
}
function updateBird(dt) {
  const bird = state.bird;
  state.warningPulse += dt * 3.4;

  if (state.screen !== 'playing') {
    return;
  }

  const hidden = player.isHidden && isInsideGrass();
  const desiredX = clamp(player.x + player.w * 0.5 + 120, 260, WORLD_WIDTH - 260);
  bird.shadowX += (desiredX - bird.shadowX) * Math.min(1, dt * 1.8);

  if (bird.warningTimer > 0) {
    bird.warningTimer -= dt;
    bird.targetX = bird.shadowX;
    if (bird.warningTimer <= 0) {
      bird.attacking = true;
      bird.strikeTimer = 0.88;
      bird.swoopX = bird.targetX - 340;
    }
    return;
  }

  if (bird.attacking) {
    bird.strikeTimer -= dt;
    bird.swoopX += 880 * dt;
    const strikeZone = { x: bird.targetX - 70, y: 0, w: 140, h: HEIGHT };
    if (!hidden && bird.strikeTimer < 0.42 && bird.strikeTimer > 0.2 && rectsOverlap(getPlayerRect(), strikeZone)) {
      damagePlayer('bird');
    }
    if (bird.strikeTimer <= 0) {
      bird.attacking = false;
      bird.cooldown = PHYSICS.birdCooldownDuration;
    }
    return;
  }

  bird.cooldown -= dt;
  if (bird.cooldown <= 0 && !hidden) {
    bird.warningTimer = PHYSICS.birdWarningDuration;
    bird.targetX = player.x + player.w * 0.5;
  }
}

function updatePlayer(dt) {
  player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
  player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
  player.invincibleTimer = Math.max(0, player.invincibleTimer - dt);
  player.slowTimer = Math.max(0, player.slowTimer - dt);
  player.antPushTimer = Math.max(0, player.antPushTimer - dt);
  player.climbTimer = Math.max(0, player.climbTimer - dt);
  player.blinkTime += dt * 12;

  if (state.screen !== 'playing') {
    player.hideBlend += ((player.isHidden ? 1 : 0) - player.hideBlend) * Math.min(1, dt * PHYSICS.hideFadeSpeed);
    return;
  }

  const moveIntent = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (moveIntent !== 0) {
    player.facing = moveIntent;
  }

  const inGrass = isInsideGrass();
  player.isHidden = input.hide && inGrass && Math.abs(moveIntent) < 0.2 && Math.abs(player.vx) < 1.5 && player.onGround;
  player.hideBlend += ((player.isHidden ? 1 : 0) - player.hideBlend) * Math.min(1, dt * PHYSICS.hideFadeSpeed);

  const inSunlight = level.sunlight.some((spot) => rectsOverlap(getPlayerRect(), spot));
  const nearClimbable = isNearClimbable();

  let speed = PHYSICS.moveSpeed;
  if (player.slowTimer > 0) {
    speed *= 0.63;
  }
  if (player.isHidden) {
    speed *= 0.26;
  }

  const wantsDash = input.dash && player.dash > 10 && moveIntent !== 0 && !player.isHidden;
  if (wantsDash) {
    speed = PHYSICS.dashSpeed;
    player.dash = clamp(player.dash - PHYSICS.dashDrainPerSecond * dt, 0, PHYSICS.dashMax);
    player.dashBurst = Math.min(1, player.dashBurst + dt * 5);
  } else {
    recoverDash(dt, inSunlight);
    player.dashBurst = Math.max(0, player.dashBurst - dt * 4);
  }

  if (player.antPushTimer > 0) {
    player.vx = player.antPushDirection * 2.4;
  } else {
    player.vx = moveIntent * speed;
  }

  const canClimb = input.hide && nearClimbable && !player.onGround;
  if (canClimb) {
    player.climbTimer = 0.7;
  }

  if (player.climbTimer > 0 && nearClimbable && !player.isHidden) {
    player.vy = clamp(player.vy, -PHYSICS.climbSpeed, PHYSICS.climbSpeed);
    if (input.jumpPressed) {
      player.vy = PHYSICS.jumpVelocity * 0.92;
      player.vx = -player.facing * 4.4;
      player.climbTimer = 0;
      emitSparkle(player.x + player.w * 0.5, player.y + player.h * 0.4, 6, 'rgba(238, 248, 255, 0.8)');
    }
  } else {
    player.vy = Math.min(PHYSICS.maxFallSpeed, player.vy + PHYSICS.gravity);
  }

  if (input.jumpPressed) {
    player.jumpBufferTimer = PHYSICS.jumpBuffer;
  }

  if (player.jumpBufferTimer > 0 && (player.onGround || player.coyoteTimer > 0 || player.climbTimer > 0)) {
    player.vy = PHYSICS.jumpVelocity;
    player.onGround = false;
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;
    emitSparkle(player.x + player.w * 0.5, player.y + player.h * 0.45, 6, 'rgba(255,255,236,0.84)');
  }

  const wasOnGround = player.onGround;
  player.onGround = false;

  player.x += player.vx;
  player.x = clamp(player.x, 0, WORLD_WIDTH - player.w);
  resolveHorizontalCollisions();

  player.y += player.vy;
  resolveVerticalCollisions();

  if (wasOnGround && !player.onGround) {
    player.coyoteTimer = PHYSICS.coyoteTime;
  }

  if (!wasOnGround && player.onGround) {
    spawnLandingPuff();
  }

  if (player.onGround && Math.abs(player.vx) > 1.4 && Math.random() < dt * (wantsDash ? 18 : 10)) {
    emitDust(player.x + player.w * 0.5, player.y + player.h - 2, wantsDash ? 2 : 1);
  }

  if (player.y > HEIGHT + 120) {
    damagePlayer('fall');
    if (player.hp > 0) {
      player.x = Math.max(20, player.x - 160);
      player.y = player.spawnY - 50;
      player.vx = 0;
      player.vy = 0;
    }
  }

  handleCollectibles();
  updateHud();
}

function resolveHorizontalCollisions() {
  const solids = [...level.segments, ...level.platforms, ...level.climbables];
  const rect = getPlayerRect();
  for (const solid of solids) {
    if (!rectsOverlap(rect, solid)) continue;
    if (player.vx > 0) {
      player.x = solid.x - player.w;
    } else if (player.vx < 0) {
      player.x = solid.x + solid.w;
    }
    rect.x = player.x;
  }
}

function resolveVerticalCollisions() {
  const solids = [...level.segments, ...level.platforms];
  const rect = getPlayerRect();
  for (const solid of solids) {
    if (!rectsOverlap(rect, solid)) continue;

    const prevY = player.y - player.vy;
    const prevBottom = prevY + player.h;
    const prevTop = prevY;

    if (player.vy >= 0 && prevBottom <= solid.y + 8) {
      player.y = solid.y - player.h;
      player.vy = 0;
      player.onGround = true;
      rect.y = player.y;
      continue;
    }

    if (player.vy < 0 && prevTop >= solid.y + solid.h - 8) {
      player.y = solid.y + solid.h;
      player.vy = 0;
      rect.y = player.y;
    }
  }
}

function updateParticles(dt) {
  state.particles = state.particles.filter((particle) => {
    particle.life -= dt;
    if (particle.life <= 0) return false;
    particle.x += particle.vx * 60 * dt;
    particle.y += particle.vy * 60 * dt;
    particle.vy += particle.gravity * dt;
    return true;
  });

  state.floatingTexts = state.floatingTexts.filter((item) => {
    item.life -= dt;
    if (item.life <= 0) return false;
    item.y -= 26 * dt;
    return true;
  });
}

function updateCamera(dt) {
  const target = clamp(player.x - WIDTH * 0.34, 0, WORLD_WIDTH - WIDTH);
  state.cameraX += (target - state.cameraX) * Math.min(1, dt * 3.5);
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}

function getRank() {
  const score = player.bugs + player.medals * 65 + Math.max(0, 140 - state.elapsed) * 1.2 + player.hp * 20;
  if (player.medals === 3 && player.bugs >= 220 && state.elapsed <= 75) return 'にわのヒーロー';
  if (score >= 320) return 'すごいカナヘビ';
  if (score >= 230) return 'すばしっこいカナヘビ';
  return 'かけだしカナヘビ';
}

function update(dt) {
  if (state.screen === 'playing') {
    state.elapsed += dt;
  }

  updateBird(dt);
  updatePlayer(dt);
  updateParticles(dt);
  updateCamera(dt);
  input.jumpPressed = false;
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground() {
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, COLORS.skyTop);
  bg.addColorStop(0.52, COLORS.skyMid);
  bg.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const warmBand = ctx.createLinearGradient(0, 120, 0, 520);
  warmBand.addColorStop(0, 'rgba(255, 187, 118, 0.20)');
  warmBand.addColorStop(1, 'rgba(255, 247, 198, 0)');
  ctx.fillStyle = warmBand;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let layer = 0; layer < 3; layer += 1) {
    const speed = 0.12 + layer * 0.11;
    const y = 180 + layer * 84;
    const color = layer === 0 ? '#eddca6' : layer === 1 ? '#d8d194' : '#b0c57b';
    for (let i = -1; i < 8; i += 1) {
      const x = ((i * 230) - state.cameraX * speed) % 1840;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, 160 - layer * 18, 40 + layer * 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const spot of level.sunlight) {
    const sx = spot.x - state.cameraX;
    const gradient = ctx.createRadialGradient(sx + spot.w * 0.5, 410, 24, sx + spot.w * 0.5, 610, 180);
    gradient.addColorStop(0, 'rgba(255, 241, 173, 0.30)');
    gradient.addColorStop(1, 'rgba(255, 241, 173, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(sx - 80, 300, 320, 360);
  }
}
function drawBushCluster(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const leaves = [
    { x: 0, y: 0, rx: 46, ry: 28 },
    { x: 36, y: -10, rx: 40, ry: 26 },
    { x: 72, y: 2, rx: 44, ry: 28 }
  ];
  leaves.forEach((leaf, index) => {
    ctx.fillStyle = index === 1 ? '#8fc26e' : '#7eb55d';
    ctx.beginPath();
    ctx.ellipse(leaf.x, leaf.y, leaf.rx, leaf.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawWorld() {
  ctx.save();
  ctx.translate(-state.cameraX, 0);

  for (let x = -120; x < WORLD_WIDTH + 160; x += 210) {
    drawBushCluster(x, 566, 1 + ((x / 210) % 2) * 0.16);
  }

  for (const segment of level.segments) {
    ctx.fillStyle = COLORS.dirt;
    drawRoundedRect(segment.x, segment.y, segment.w, segment.h, 18);
    ctx.fill();
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(segment.x + 2, segment.y - 10, segment.w - 4, 14);
    ctx.fillStyle = COLORS.dirtDark;
    ctx.fillRect(segment.x, segment.y + 18, segment.w, 8);
  }

  level.platforms.forEach((platform) => {
    const topColor = platform.type === 'leaf' ? '#90bf66' : '#b7b8af';
    const bodyColor = platform.type === 'leaf' ? '#71994f' : '#95958d';
    ctx.fillStyle = bodyColor;
    drawRoundedRect(platform.x, platform.y, platform.w, platform.h, 16);
    ctx.fill();
    ctx.fillStyle = topColor;
    ctx.fillRect(platform.x + 4, platform.y - 6, platform.w - 8, 10);
  });

  level.climbables.forEach((wall) => {
    ctx.fillStyle = wall.type === 'wall' ? '#9c9a90' : '#aaaa9c';
    drawRoundedRect(wall.x, wall.y, wall.w, wall.h, 14);
    ctx.fill();
    ctx.fillStyle = '#f0efe5';
    for (let y = wall.y + 16; y < wall.y + wall.h - 12; y += 28) {
      ctx.fillRect(wall.x + 12, y, wall.w - 24, 6);
    }
  });

  level.grasses.forEach((grass) => {
    ctx.fillStyle = 'rgba(124, 177, 89, 0.38)';
    drawRoundedRect(grass.x, grass.y + 10, grass.w, grass.h - 10, 18);
    ctx.fill();
    for (let i = 0; i < 18; i += 1) {
      const gx = grass.x + (grass.w / 17) * i;
      const height = 24 + Math.sin((i * 0.8) + state.elapsed * 2.2) * 6;
      ctx.strokeStyle = i % 2 === 0 ? '#72a556' : '#8cc06a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(gx, grass.y + grass.h);
      ctx.quadraticCurveTo(gx + 4, grass.y + grass.h - height * 0.5, gx + Math.sin(i) * 8, grass.y + grass.h - height);
      ctx.stroke();
    }
  });

  level.webs.forEach((web) => {
    ctx.strokeStyle = COLORS.web;
    ctx.lineWidth = 2;
    for (let i = 0; i <= 6; i += 1) {
      const x = web.x + (web.w / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, web.y);
      ctx.lineTo(x - 8 + i * 2, web.y + web.h);
      ctx.stroke();
    }
    for (let i = 0; i <= 4; i += 1) {
      const y = web.y + (web.h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(web.x, y);
      ctx.lineTo(web.x + web.w, y + (i % 2 === 0 ? 4 : -2));
      ctx.stroke();
    }
  });

  level.ants.forEach((ants) => {
    for (let i = 0; i < 6; i += 1) {
      const t = (state.elapsed * 2 + i * 0.18) % 1;
      const x = ants.x + t * ants.w;
      const y = ants.y + Math.sin(i + state.elapsed * 7) * 2;
      ctx.fillStyle = '#674226';
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x - 9, y, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 8, y, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  level.stones.forEach((stone) => {
    ctx.fillStyle = COLORS.stone;
    ctx.beginPath();
    ctx.arc(stone.x, GROUND_Y + 12, stone.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.stoneDark;
    ctx.beginPath();
    ctx.arc(stone.x - 8, GROUND_Y + 4, stone.r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  });

  level.bugs.forEach((bug, index) => {
    if (bug.collected) return;
    const pulse = 1 + Math.sin(state.elapsed * 5 + index) * 0.08;
    ctx.fillStyle = '#fde06d';
    ctx.beginPath();
    ctx.arc(bug.x, bug.y, 13 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6d4d1a';
    ctx.beginPath();
    ctx.ellipse(bug.x, bug.y, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6d4d1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bug.x - 8, bug.y - 1);
    ctx.lineTo(bug.x - 14, bug.y - 8);
    ctx.moveTo(bug.x + 8, bug.y - 1);
    ctx.lineTo(bug.x + 14, bug.y - 8);
    ctx.stroke();
  });

  level.medals.forEach((medal, index) => {
    if (medal.collected) return;
    const bob = Math.sin(state.elapsed * 3 + index * 0.9) * 7;
    ctx.fillStyle = '#b8d972';
    ctx.beginPath();
    ctx.moveTo(medal.x, medal.y - 16 + bob);
    ctx.quadraticCurveTo(medal.x + 22, medal.y - 4 + bob, medal.x + 6, medal.y + 18 + bob);
    ctx.quadraticCurveTo(medal.x, medal.y + 12 + bob, medal.x - 6, medal.y + 18 + bob);
    ctx.quadraticCurveTo(medal.x - 22, medal.y - 4 + bob, medal.x, medal.y - 16 + bob);
    ctx.fill();
    ctx.fillStyle = '#6f9645';
    ctx.beginPath();
    ctx.arc(medal.x, medal.y + bob, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  drawGoalHouse();
  drawBirdEffects();
  drawPlayer();
  drawParticles();
  ctx.restore();

  drawFloatingTexts();
}

function drawGoalHouse() {
  const pot = level.goal;
  ctx.save();
  ctx.translate(pot.x, pot.y);
  ctx.fillStyle = '#bf7d50';
  drawRoundedRect(12, 40, pot.w - 24, 116, 24);
  ctx.fill();
  ctx.fillStyle = '#91552f';
  drawRoundedRect(0, 0, pot.w, 54, 20);
  ctx.fill();
  ctx.fillStyle = '#734224';
  drawRoundedRect(58, 112, 44, 42, 12);
  ctx.fill();
  ctx.fillStyle = '#6d9650';
  ctx.fillRect(76, -38, 8, 48);
  ctx.beginPath();
  ctx.ellipse(60, -34, 30, 18, -0.4, 0, Math.PI * 2);
  ctx.ellipse(100, -32, 32, 20, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBirdEffects() {
  const bird = state.bird;
  const shadowAlpha = bird.warningTimer > 0 || bird.attacking ? 0.22 + Math.sin(state.warningPulse * 2) * 0.06 : 0.12;
  ctx.fillStyle = `rgba(53, 58, 67, ${shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(bird.targetX, 604, 90, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  if (bird.warningTimer > 0) {
    const pulse = 1 + Math.sin(state.warningPulse * 4) * 0.12;
    ctx.fillStyle = COLORS.warningSoft;
    ctx.beginPath();
    ctx.ellipse(bird.targetX, 594, 108 * pulse, 30 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.warning;
    ctx.font = '700 28px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('あぶない!', bird.targetX, 540);
  }

  if (bird.attacking) {
    ctx.save();
    ctx.translate(bird.swoopX, 146 + Math.sin(state.elapsed * 16) * 8);
    ctx.fillStyle = '#65433c';
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.quadraticCurveTo(0, -24, 34, 0);
    ctx.quadraticCurveTo(0, 10, -30, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(72, -22);
    ctx.lineTo(26, 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 3);
    ctx.lineTo(76, 26);
    ctx.lineTo(22, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer() {
  const hiddenAlpha = 1 - player.hideBlend * 0.55;
  const blink = player.invincibleTimer > 0 && Math.floor(player.blinkTime * 1.7) % 2 === 0;
  if (blink) return;

  const x = player.x;
  const y = player.y;
  const t = state.elapsed;
  const runCycle = Math.sin(t * (Math.abs(player.vx) > 0.1 ? 12 : 3.5));
  const tailWave = Math.sin(t * 9 + Math.abs(player.vx) * 0.4) * (12 + player.dashBurst * 8);
  const bodyColor = player.isHidden ? 'rgba(115, 171, 92, 0.78)' : `rgba(124, 186, 96, ${hiddenAlpha})`;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = hiddenAlpha;

  ctx.strokeStyle = '#5a8748';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(18, 21);
  ctx.quadraticCurveTo(-6, 28 + runCycle * 2, -26, 16 + tailWave * 0.12);
  ctx.quadraticCurveTo(-46, 8 + tailWave * 0.24, -64, 14 + tailWave * 0.18);
  ctx.stroke();

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(24, 24, 34, 18, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(58, 19, 18, 14, -0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f3f7dd';
  ctx.beginPath();
  ctx.ellipse(28, 30, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#688f51';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(26, 30);
  ctx.lineTo(16, 38 + runCycle * 2);
  ctx.moveTo(42, 30);
  ctx.lineTo(50, 38 - runCycle * 2);
  ctx.moveTo(42, 30);
  ctx.lineTo(48, 40 + runCycle * 1.5);
  ctx.moveTo(25, 30);
  ctx.lineTo(18, 41 - runCycle * 1.5);
  ctx.stroke();

  ctx.fillStyle = '#fffdf5';
  ctx.beginPath();
  ctx.arc(63, 17, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f271f';
  ctx.beginPath();
  ctx.arc(64.5, 17, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#4f3520';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(73, 18);
  ctx.lineTo(79, 16);
  ctx.moveTo(73, 22);
  ctx.lineTo(79, 24);
  ctx.stroke();

  if (state.screen === 'clear') {
    ctx.fillStyle = 'rgba(255, 235, 163, 0.9)';
    ctx.beginPath();
    ctx.arc(22, -6 + Math.sin(t * 10) * 4, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawParticles() {
  state.particles.forEach((particle) => {
    const alpha = particle.life / particle.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius * (0.6 + alpha * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawFloatingTexts() {
  state.floatingTexts.forEach((item) => {
    ctx.save();
    ctx.globalAlpha = item.life / item.maxLife;
    ctx.fillStyle = item.color;
    ctx.font = '700 24px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.text, item.x - state.cameraX, item.y);
    ctx.restore();
  });
}
function drawHudOverlay() {
  if (state.screen !== 'playing') return;

  if (state.bestMessage) {
    ctx.fillStyle = 'rgba(255, 250, 241, 0.82)';
    drawRoundedRect(372, 24, 536, 42, 18);
    ctx.fill();
    ctx.fillStyle = COLORS.warning;
    ctx.font = '700 20px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.bestMessage, WIDTH / 2, 51);
  }

  ctx.fillStyle = 'rgba(255, 250, 241, 0.68)';
  drawRoundedRect(26, 24, 182, 50, 16);
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  ctx.font = '700 24px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`TIME ${formatTime(state.elapsed)}`, 46, 56);
}

function drawTitleCard() {
  ctx.save();
  const fade = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  fade.addColorStop(0, 'rgba(255, 249, 236, 0.08)');
  fade.addColorStop(1, 'rgba(255, 245, 230, 0.48)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawRoundedRect(140, 88, 1000, 550, 36);
  ctx.fillStyle = 'rgba(255, 251, 240, 0.75)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(116, 87, 49, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#705035';
  ctx.font = '700 24px "Trebuchet MS", sans-serif';
  ctx.fillText('庭のこみちを てくてく だいぼうけん', 204, 170);
  ctx.fillStyle = '#4f3520';
  ctx.font = '700 72px "Trebuchet MS", sans-serif';
  ctx.fillText('カナヘビのこみち', 198, 248);

  const startHover = getButtonRect('start');
  ctx.fillStyle = 'rgba(122, 180, 104, 0.95)';
  drawRoundedRect(startHover.x, startHover.y, startHover.w, startHover.h, 26);
  ctx.fill();
  ctx.fillStyle = '#fffdf6';
  ctx.font = '700 34px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('はじめる', startHover.x + startHover.w / 2, startHover.y + 45);

  drawTitleLizard();

  ctx.fillStyle = 'rgba(247, 241, 226, 0.96)';
  drawRoundedRect(190, 348, 900, 208, 28);
  ctx.fill();
  ctx.fillStyle = '#705035';
  ctx.font = '700 26px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('あそびかた', 224, 394);
  ctx.font = '500 24px "Trebuchet MS", sans-serif';
  const lines = [
    '虫ポイントを集めながら、植木鉢の下のすみかを めざそう。',
    '葉っぱメダルを 3 つ集めると ゴールできるよ。',
    '鳥の影がきたら 草むらにかくれると あんしん。',
    '日なたで ダッシュ回復、石やかべでは ちょっと のぼれるよ。'
  ];
  lines.forEach((line, index) => {
    ctx.fillText(line, 224, 432 + index * 38);
  });

  ctx.fillStyle = '#826347';
  ctx.font = '600 22px "Trebuchet MS", sans-serif';
  ctx.fillText('キー: A / D または ← / → で移動、Space ジャンプ、Shift ダッシュ、S または ↓ でかくれる', 224, 590);
  ctx.restore();
}

function drawTitleLizard() {
  const baseX = 938;
  const baseY = 220;
  const bob = Math.sin(state.elapsed * 2.5) * 8;
  ctx.save();
  ctx.translate(baseX, baseY + bob);
  ctx.scale(1.8, 1.8);
  ctx.strokeStyle = '#648c51';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-34, 16);
  ctx.quadraticCurveTo(-76, 20, -100, 6 + Math.sin(state.elapsed * 5) * 10);
  ctx.quadraticCurveTo(-126, -6, -152, 8 + Math.cos(state.elapsed * 4) * 9);
  ctx.stroke();
  ctx.fillStyle = '#8bc06c';
  ctx.beginPath();
  ctx.ellipse(0, 20, 38, 20, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(42, 14, 20, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f4dc';
  ctx.beginPath();
  ctx.ellipse(4, 28, 24, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#648c51';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(2, 26);
  ctx.lineTo(-14, 44);
  ctx.moveTo(18, 26);
  ctx.lineTo(30, 44);
  ctx.moveTo(10, 26);
  ctx.lineTo(18, 42);
  ctx.moveTo(-10, 26);
  ctx.lineTo(-20, 42);
  ctx.stroke();
  ctx.fillStyle = '#fffef7';
  ctx.beginPath();
  ctx.arc(48, 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f271f';
  ctx.beginPath();
  ctx.arc(49, 12, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getButtonRect(kind) {
  if (kind === 'start' || kind === 'retry') {
    return { x: 492, y: 272, w: 296, h: 72 };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

function drawEndScreen(kind) {
  ctx.save();
  ctx.fillStyle = 'rgba(64, 44, 22, 0.26)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawRoundedRect(322, 108, 636, 504, 38);
  ctx.fillStyle = 'rgba(255, 252, 242, 0.84)';
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#4f3520';
  ctx.font = '700 58px "Trebuchet MS", sans-serif';
  ctx.fillText(kind === 'clear' ? 'ゴール!' : 'ゲームオーバー', WIDTH / 2, 198);

  if (kind === 'clear') {
    ctx.font = '500 28px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#725337';
    ctx.fillText('植木鉢の下のすみかに たどりついたよ', WIDTH / 2, 242);

    const metrics = [
      `虫ポイント ${player.bugs}`,
      `葉っぱメダル ${player.medals} / ${MEDAL_COUNT}`,
      `タイム ${formatTime(state.elapsed)}`,
      `評価 ${getRank()}`
    ];
    metrics.forEach((line, index) => {
      ctx.fillStyle = index === 3 ? '#5a8641' : '#5d4630';
      ctx.font = index === 3 ? '700 34px "Trebuchet MS", sans-serif' : '600 28px "Trebuchet MS", sans-serif';
      ctx.fillText(line, WIDTH / 2, 306 + index * 56);
    });
  } else {
    ctx.font = '500 28px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#725337';
    ctx.fillText('こみちは まだ つづいているよ', WIDTH / 2, 264);
  }

  const retry = getButtonRect('retry');
  ctx.fillStyle = kind === 'clear' ? 'rgba(111, 180, 99, 0.95)' : 'rgba(222, 140, 98, 0.95)';
  drawRoundedRect(retry.x, 470, retry.w, retry.h, 26);
  ctx.fill();
  ctx.fillStyle = '#fffdf6';
  ctx.font = '700 34px "Trebuchet MS", sans-serif';
  ctx.fillText('もう一回', retry.x + retry.w / 2, 516);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawWorld();
  drawHudOverlay();

  if (state.screen === 'title') {
    drawTitleCard();
  } else if (state.screen === 'clear') {
    drawEndScreen('clear');
  } else if (state.screen === 'gameover') {
    drawEndScreen('gameover');
  }
}

function loop(now) {
  const dt = Math.min(1 / 30, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function mapKey(code) {
  if (code === 'ArrowLeft' || code === 'KeyA') return 'left';
  if (code === 'ArrowRight' || code === 'KeyD') return 'right';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'dash';
  if (code === 'ArrowDown' || code === 'KeyS') return 'hide';
  return null;
}

function bindEvents() {
  window.addEventListener('keydown', (event) => {
    const key = mapKey(event.code);
    if (key) {
      input[key] = true;
      event.preventDefault();
    }
    if (event.code === 'Space') {
      input.jumpHeld = true;
      input.jumpPressed = true;
      event.preventDefault();
    }
    if (event.code === 'Enter' && state.screen !== 'playing') {
      startGame();
      event.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('keyup', (event) => {
    const key = mapKey(event.code);
    if (key) {
      input[key] = false;
      event.preventDefault();
    }
    if (event.code === 'Space') {
      input.jumpHeld = false;
      event.preventDefault();
    }
  }, { passive: false });

  document.querySelectorAll('[data-control]').forEach((button) => {
    const control = button.dataset.control;

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointerButtons.set(event.pointerId, { button, control });
      button.classList.add('is-active');
      setControlState(control, true);
    });

    const release = (event) => {
      const stored = pointerButtons.get(event.pointerId);
      if (!stored) return;
      stored.button.classList.remove('is-active');
      setControlState(stored.control, false);
      pointerButtons.delete(event.pointerId);
    };

    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    handleScreenTap(x, y);
  });
}

function setControlState(control, active) {
  if (control === 'jump') {
    input.jumpHeld = active;
    if (active) input.jumpPressed = true;
    return;
  }
  if (control in input) {
    input[control] = active;
  }
}

function handleScreenTap(x, y) {
  if (state.screen === 'title') {
    const start = getButtonRect('start');
    if (x >= start.x && x <= start.x + start.w && y >= start.y && y <= start.y + start.h) {
      startGame();
    }
    return;
  }

  if (state.screen === 'clear' || state.screen === 'gameover') {
    const retry = getButtonRect('retry');
    const ry = 470;
    if (x >= retry.x && x <= retry.x + retry.w && y >= ry && y <= ry + retry.h) {
      startGame();
    }
  }
}

resetRun();
bindEvents();
requestAnimationFrame(loop);
