import Phaser from 'phaser';
import { requireAuth } from '../../js/auth.js';
import { resolvePath } from '../../js/config.js';

requireAuth();

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function isTouchLike() {
  return (
    window.matchMedia?.('(pointer: coarse)')?.matches ||
    navigator.maxTouchPoints > 0 ||
    'ontouchstart' in window
  );
}

const ui = {
  backLink: document.getElementById('backLink'),
  helpBtn: document.getElementById('helpBtn'),
  helpModal: document.getElementById('helpModal'),
  closeHelpBtn: document.getElementById('closeHelpBtn'),
  roundOverlay: document.getElementById('roundOverlay'),
  startBtn: document.getElementById('startBtn'),
  restartBtn: document.getElementById('restartBtn'),
  p1Percent: document.getElementById('p1Percent'),
  p2Percent: document.getElementById('p2Percent'),
  p1Stocks: document.getElementById('p1Stocks'),
  p2Stocks: document.getElementById('p2Stocks'),
  touchControls: document.getElementById('touchControls')
};

ui.backLink.href = resolvePath('/pages/portal/portal.html');

const input = {
  p1: { left: false, right: false, jump: false, attack: false, strong: false },
  p2: { left: false, right: false, jump: false, attack: false, strong: false }
};

function setAction(playerKey, action, on) {
  const p = input[playerKey];
  if (!p) return;
  p[action] = on;
}

function wireTouchControls() {
  if (!ui.touchControls) return;
  if (!isTouchLike()) return;
  ui.touchControls.style.display = 'grid';

  const buttons = ui.touchControls.querySelectorAll('button[data-player][data-action]');
  buttons.forEach((btn) => {
    const playerKey = btn.getAttribute('data-player');
    const action = btn.getAttribute('data-action');
    if (!playerKey || !action) return;

    const down = (e) => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      setAction(playerKey, action, true);
    };
    const up = (e) => {
      e.preventDefault();
      setAction(playerKey, action, false);
    };

    btn.addEventListener('pointerdown', down, { passive: false });
    btn.addEventListener('pointerup', up, { passive: false });
    btn.addEventListener('pointercancel', up, { passive: false });
    btn.addEventListener('pointerleave', up, { passive: false });
  });
}

function wireKeyboard() {
  const keyMap = new Map([
    // P1
    ['KeyA', ['p1', 'left']],
    ['KeyD', ['p1', 'right']],
    ['KeyW', ['p1', 'jump']],
    ['KeyF', ['p1', 'attack']],
    ['KeyG', ['p1', 'strong']],
    // P2
    ['ArrowLeft', ['p2', 'left']],
    ['ArrowRight', ['p2', 'right']],
    ['ArrowUp', ['p2', 'jump']],
    ['KeyK', ['p2', 'attack']],
    ['KeyL', ['p2', 'strong']]
  ]);

  const prevent = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space']);

  window.addEventListener('keydown', (e) => {
    if (prevent.has(e.code)) e.preventDefault();
    if (e.repeat) return;

    if (e.code === 'KeyR') {
      window.dispatchEvent(new CustomEvent('ba-restart'));
      return;
    }

    const m = keyMap.get(e.code);
    if (!m) return;
    const [playerKey, action] = m;
    setAction(playerKey, action, true);
  });

  window.addEventListener('keyup', (e) => {
    if (prevent.has(e.code)) e.preventDefault();
    const m = keyMap.get(e.code);
    if (!m) return;
    const [playerKey, action] = m;
    setAction(playerKey, action, false);
  });
}

function wireHelpModal() {
  const open = () => {
    ui.helpModal.classList.remove('hidden');
    ui.helpModal.setAttribute('aria-hidden', 'false');
  };
  const close = () => {
    ui.helpModal.classList.add('hidden');
    ui.helpModal.setAttribute('aria-hidden', 'true');
  };

  ui.helpBtn?.addEventListener('click', open);
  ui.closeHelpBtn?.addEventListener('click', close);
  ui.helpModal?.addEventListener('click', (e) => {
    if (e.target === ui.helpModal) close();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') close();
  });
}

wireTouchControls();
wireKeyboard();
wireHelpModal();

class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle');
    this.started = false;
    this.roundOver = false;

    this.platforms = null;
    this.p1 = null;
    this.p2 = null;
    this.hitboxes = null;

    this.p1Spawn = { x: 260, y: 200 };
    this.p2Spawn = { x: 700, y: 200 };

    this._lastUiSyncAt = 0;
  }

  preload() {
    // No external assets (textures are generated at runtime)
  }

  create() {
    this.physics.world.gravity.y = 1400;
    this.physics.world.setBounds(-420, -320, 1800, 1200);

    this._buildTexturesOnce();
    this._buildStage();
    this._spawnPlayers();
    this._wireColliders();
    this._syncHud(true);
  }

  _buildTexturesOnce() {
    const addTex = (key, w, h, color, border) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, w, h, 10);
      g.lineStyle(3, border, 1);
      g.strokeRoundedRect(0, 0, w, h, 10);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    addTex('p1-body', 44, 64, 0x5eead4, 0x0f766e);
    addTex('p2-body', 44, 64, 0xfda4af, 0x9f1239);
    addTex('plat', 220, 20, 0x334155, 0x0f172a);
    addTex('ground', 860, 30, 0x1f2937, 0x0b1220);
    addTex('hitbox', 10, 10, 0xffffff, 0xffffff);
  }

  _buildStage() {
    // Background
    this.add.rectangle(480, 270, 960, 540, 0x0b1020, 1);
    this.add.rectangle(480, 90, 960, 240, 0x111b3a, 0.55);

    this.platforms = this.physics.add.staticGroup();
    const ground = this.platforms.create(480, 470, 'ground');
    ground.refreshBody();

    const pA = this.platforms.create(320, 320, 'plat');
    const pB = this.platforms.create(640, 320, 'plat');
    pA.refreshBody();
    pB.refreshBody();

    // Decorative edges
    const edgeColor = 0xffffff;
    this.add.rectangle(480, 470 - 15, 860, 2, edgeColor, 0.15);
    this.add.rectangle(320, 320 - 10, 220, 2, edgeColor, 0.18);
    this.add.rectangle(640, 320 - 10, 220, 2, edgeColor, 0.18);
  }

  _spawnPlayers() {
    const spawn = (key, x, y) => {
      const s = this.physics.add.sprite(x, y, key);
      s.setDepth(3);
      s.setCollideWorldBounds(false);
      s.setDragX(1100);
      s.setMaxVelocity(420, 1000);
      s.setFriction(0, 0);
      s.setBounce(0);
      s.body.setSize(36, 58, true);

      s.ba = {
        facing: 1,
        onGround: false,
        jumpsUsed: 0,
        percent: 0,
        stocks: 3,
        invincibleMs: 900,
        invincibleUntil: 0,
        hitstunUntil: 0,
        atkCooldownUntil: 0,
        strongCooldownUntil: 0
      };
      return s;
    };

    this.p1 = spawn('p1-body', this.p1Spawn.x, this.p1Spawn.y);
    this.p2 = spawn('p2-body', this.p2Spawn.x, this.p2Spawn.y);
    this.p2.ba.facing = -1;
    this.p2.setFlipX(true);

    // Subtle glow when invincible
    this.p1.postFX?.addGlow?.(0x5eead4, 2, 0, false, 0.25, 12);
    this.p2.postFX?.addGlow?.(0xfda4af, 2, 0, false, 0.25, 12);

    this.hitboxes = this.physics.add.group({ allowGravity: false, immovable: true });
  }

  _wireColliders() {
    this.physics.add.collider(this.p1, this.platforms, () => this._onGroundCollide(this.p1));
    this.physics.add.collider(this.p2, this.platforms, () => this._onGroundCollide(this.p2));

    const onOverlap = (hb, target) => {
      const srcKey = hb.getData('src');
      const targetKey = target === this.p1 ? 'p1' : 'p2';
      if (srcKey === targetKey) return;

      const already = hb.getData('hit') || {};
      if (already[targetKey]) return;

      const now = this.time.now;
      if (now < target.ba.invincibleUntil) return;

      already[targetKey] = true;
      hb.setData('hit', already);

      const atk = hb.getData('atk');
      if (!atk) return;

      this._applyHit({ attackerKey: srcKey, target, atk });
    };

    this.physics.add.overlap(this.hitboxes, this.p1, onOverlap);
    this.physics.add.overlap(this.hitboxes, this.p2, onOverlap);
  }

  _onGroundCollide(player) {
    if (!player?.body) return;
    if (player.body.blocked.down || player.body.touching.down) {
      if (!player.ba.onGround) {
        player.ba.onGround = true;
        player.ba.jumpsUsed = 0;
      }
    }
  }

  _tryJump(player, pressed) {
    if (!pressed) return;
    const now = this.time.now;
    if (now < player.ba.hitstunUntil) return;

    const grounded = player.body.blocked.down || player.body.touching.down;
    if (grounded) {
      player.ba.jumpsUsed = 0;
      player.ba.onGround = true;
    }

    const maxJumps = 2;
    if (grounded || player.ba.jumpsUsed < maxJumps) {
      player.setVelocityY(-560);
      player.ba.jumpsUsed += 1;
      player.ba.onGround = false;
    }
  }

  _spawnHitbox({ attacker, attackerKey, kind }) {
    const now = this.time.now;
    const isStrong = kind === 'strong';
    const isAir = !(attacker.body.blocked.down || attacker.body.touching.down);

    const cdUntil = isStrong ? attacker.ba.strongCooldownUntil : attacker.ba.atkCooldownUntil;
    if (now < cdUntil) return;
    if (now < attacker.ba.hitstunUntil) return;

    const facing = attacker.ba.facing;
    const base = isStrong ? 44 : 38;
    const w = isStrong ? 66 : base;
    const h = isStrong ? 42 : isAir ? 44 : 34;

    const x = attacker.x + facing * (36 + w * 0.35);
    const y = attacker.y + (isAir ? 10 : 16);

    const hb = this.add.rectangle(x, y, w, h, 0xffffff, 0.03);
    this.physics.add.existing(hb, false);
    hb.body.setAllowGravity(false);
    hb.body.setImmovable(true);
    hb.body.setSize(w, h);

    const damage = isStrong ? 11 : isAir ? 7 : 6;
    const baseKb = isStrong ? 280 : isAir ? 200 : 170;
    const scaleKb = isStrong ? 2.4 : isAir ? 1.9 : 1.6;
    const dirY = isStrong ? -0.55 : isAir ? -0.35 : -0.2;

    hb.setData('src', attackerKey);
    hb.setData('atk', { damage, baseKb, scaleKb, dir: { x: facing, y: dirY } });
    hb.setData('hit', {});

    this.hitboxes.add(hb);

    const ttl = isStrong ? 130 : 110;
    this.time.delayedCall(ttl, () => {
      hb.destroy();
    });

    const cooldown = isStrong ? 520 : 250;
    if (isStrong) attacker.ba.strongCooldownUntil = now + cooldown;
    else attacker.ba.atkCooldownUntil = now + cooldown;
  }

  _applyHit({ attackerKey, target, atk }) {
    const now = this.time.now;
    target.ba.percent = clamp(target.ba.percent + atk.damage, 0, 999);

    const percentFactor = 1 + target.ba.percent / 100;
    const kb = atk.baseKb + atk.scaleKb * 85 * (percentFactor - 1);

    const dx = atk.dir.x;
    const dy = atk.dir.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;

    target.setVelocity(nx * kb, ny * kb);
    target.ba.hitstunUntil = now + 180;

    // Tiny camera shake on strong
    if (atk.damage >= 10) this.cameras.main.shake(70, 0.004);

    this._syncHud(true);
  }

  _checkBlastAndRespawn(player, playerKey) {
    if (!player?.active) return;
    if (this.roundOver) return;

    const x = player.x;
    const y = player.y;
    const out =
      x < -240 || x > 960 + 240 || y < -240 || y > 540 + 240 || !Number.isFinite(x) || !Number.isFinite(y);

    if (!out) return;

    player.ba.stocks -= 1;
    this._syncHud(true);

    if (player.ba.stocks <= 0) {
      this.roundOver = true;
      const winner = playerKey === 'p1' ? 'P2' : 'P1';
      window.dispatchEvent(new CustomEvent('ba-round-over', { detail: { winner } }));
      return;
    }

    const spawn = playerKey === 'p1' ? this.p1Spawn : this.p2Spawn;
    player.setPosition(spawn.x, spawn.y);
    player.setVelocity(0, 0);
    player.ba.invincibleUntil = this.time.now + player.ba.invincibleMs;
    player.ba.jumpsUsed = 0;
  }

  _syncHud(force) {
    const now = this.time.now;
    if (!force && now - this._lastUiSyncAt < 60) return;
    this._lastUiSyncAt = now;

    ui.p1Percent.textContent = String(Math.round(this.p1.ba.percent));
    ui.p2Percent.textContent = String(Math.round(this.p2.ba.percent));
    ui.p1Stocks.textContent = '●'.repeat(Math.max(0, this.p1.ba.stocks));
    ui.p2Stocks.textContent = '●'.repeat(Math.max(0, this.p2.ba.stocks));
  }

  update() {
    if (!this.started || this.roundOver) {
      this._syncHud(false);
      return;
    }

    this._stepPlayer(this.p1, input.p1, 'p1');
    this._stepPlayer(this.p2, input.p2, 'p2');

    this._checkBlastAndRespawn(this.p1, 'p1');
    this._checkBlastAndRespawn(this.p2, 'p2');

    this._syncHud(false);
  }

  _stepPlayer(player, inp, playerKey) {
    const now = this.time.now;
    const inHitstun = now < player.ba.hitstunUntil;

    const grounded = player.body.blocked.down || player.body.touching.down;
    if (grounded) {
      player.ba.onGround = true;
      player.ba.jumpsUsed = 0;
    }

    // Facing
    if (inp.left && !inp.right) {
      player.ba.facing = -1;
      player.setFlipX(true);
    } else if (inp.right && !inp.left) {
      player.ba.facing = 1;
      player.setFlipX(false);
    }

    // Horizontal move
    const moveSpeed = grounded ? 265 : 240;
    if (!inHitstun) {
      if (inp.left && !inp.right) {
        player.setVelocityX(-moveSpeed);
      } else if (inp.right && !inp.left) {
        player.setVelocityX(moveSpeed);
      } else {
        player.setVelocityX(player.body.velocity.x * (grounded ? 0.72 : 0.92));
      }
    }

    // Jump edge-trigger
    const wantJump = !!inp.jump;
    const prevJump = player.ba._prevJump || false;
    if (wantJump && !prevJump) this._tryJump(player, true);
    player.ba._prevJump = wantJump;

    // Attack edge-trigger
    const wantAtk = !!inp.attack;
    const prevAtk = player.ba._prevAtk || false;
    if (wantAtk && !prevAtk) this._spawnHitbox({ attacker: player, attackerKey: playerKey, kind: 'attack' });
    player.ba._prevAtk = wantAtk;

    const wantStrong = !!inp.strong;
    const prevStrong = player.ba._prevStrong || false;
    if (wantStrong && !prevStrong) this._spawnHitbox({ attacker: player, attackerKey: playerKey, kind: 'strong' });
    player.ba._prevStrong = wantStrong;

    // Invincible visual
    const inv = now < player.ba.invincibleUntil;
    player.setAlpha(inv ? 0.75 : 1);
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0b1020',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  },
  scene: [BattleScene]
});

function showOverlay({ title, subtitle, showRestart }) {
  ui.roundOverlay.classList.remove('hidden');
  const titleEl = ui.roundOverlay.querySelector('.ba-overlay-title');
  const subEl = ui.roundOverlay.querySelector('.ba-overlay-sub');
  if (titleEl && title) titleEl.textContent = title;
  if (subEl && subtitle) subEl.textContent = subtitle;
  ui.restartBtn.style.display = showRestart ? '' : 'none';
}

function hideOverlay() {
  ui.roundOverlay.classList.add('hidden');
}

function restartRound() {
  game.scene.stop('Battle');
  game.scene.start('Battle');
  showOverlay({ title: 'バトルアリーナ', subtitle: 'ふっとばして、場外に落とそう！', showRestart: false });
}

function startRound() {
  hideOverlay();
  const scene = game.scene.getScene('Battle');
  scene.started = true;
}

ui.startBtn?.addEventListener('click', startRound);
ui.restartBtn?.addEventListener('click', () => {
  restartRound();
});

window.addEventListener('ba-restart', () => {
  restartRound();
});

window.addEventListener('ba-round-over', (e) => {
  const winner = e?.detail?.winner || '???';
  showOverlay({ title: `${winner} の かち！`, subtitle: 'もう一回やる？', showRestart: true });
});

