// ねこぐんだん大戦争 - バトル描画（Canvas 2D）
import { WORLD, THEMES } from './data.js';
import { drawSprite, drawPlayerCastle, drawEnemyCastle, drawDeco, SPRITE_HEIGHT, SPRITE_HALF_W, circle, roundRect } from './sprites.js';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./battle.js').Battle} battle
   * @param {string} themeName
   */
  constructor(canvas, battle, themeName) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.battle = battle;
    this.theme = THEMES[themeName] || THEMES.grass;
    this.themeName = themeName;
    this.dpr = 1;
    this.cssW = 1;
    this.cssH = 1;
    this.scale = 1;
    this.viewW = 1;
    this.groundY = 1; // 地面のスクリーンY(css px)
    this.camX = WORLD.W - 600;
    this.follow = true;
    this.followHold = 0;
    this.particles = [];
    this.numbers = [];
    this.rings = [];
    this.time = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.fx = document.createElement('canvas');
    this.fxCtx = this.fx.getContext('2d');
    // 背景の飾りの配置（固定）
    this.decos = [];
    let x = 260;
    let seed = 1;
    while (x < WORLD.W - 260) {
      seed += 1;
      const r = (Math.sin(seed * 78.233) + 1) / 2;
      this.decos.push({ x, seed, scale: 0.7 + r * 0.5, depth: r > 0.5 ? 1 : 0.85 });
      x += 150 + r * 160;
    }
    this.clouds = Array.from({ length: 6 }, (_, i) => ({ x: i * 420 + 100, y: 40 + (i % 3) * 30, w: 60 + (i % 4) * 20, speed: 6 + (i % 3) * 3 }));
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(1, rect.width);
    this.cssH = Math.max(1, rect.height);
    this.dpr = Math.min(3, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.cssW * this.dpr);
    this.canvas.height = Math.round(this.cssH * this.dpr);
    // 最低でも横 640 ワールドpx は見えるようにする（スマホ縦向き対策）
    // 地面より上 300 ワールドpx（城の旗とHPバーまで）が見えれば十分。空を切ってユニットを大きく見せる
    const byH = (this.cssH - 28) / 300;
    const byW = this.cssW / (this.cssW < 600 ? 500 : 640);
    this.scale = Math.min(byH, byW);
    this.scale = Math.max(0.35, this.scale);
    this.viewW = this.cssW / this.scale;
    this.groundY = this.cssH - 26;
    this.fx.width = Math.min(2048, Math.round(400 * this.scale * this.dpr));
    this.fx.height = this.fx.width;
    this.camX = this.clampCam(this.camX);
  }

  clampCam(x) {
    const minX = -60;
    const maxX = WORLD.W + 60 - this.viewW;
    if (maxX < minX) return (minX + maxX) / 2;
    return clamp(x, minX, maxX);
  }

  /** 画面を指でドラッグ（css px） */
  pan(dxCss) {
    this.camX = this.clampCam(this.camX - dxCss / this.scale);
    this.follow = false;
    this.followHold = 3.0;
  }

  centerOnFront() {
    this.follow = true;
    this.followHold = 0;
  }

  showBase() {
    this.camX = this.clampCam(WORLD.W + 60 - this.viewW);
    this.follow = false;
    this.followHold = 2.0;
  }

  sx(wx) { return (wx - this.camX) * this.scale; }
  sy(wy) { return this.groundY + (wy - WORLD.GROUND_Y) * this.scale; }

  // ---------- イベント→演出 ----------
  handleEvents(events) {
    for (const ev of events) {
      switch (ev.type) {
        case 'hit': {
          const col = ev.crit ? '#ffd166' : ev.side === 'enemy' ? '#fff' : '#ff8fa3';
          this.numbers.push({ x: ev.x + (Math.random() - 0.5) * 20, y: ev.y, text: String(ev.dmg), life: 0, max: ev.crit ? 1.1 : 0.8, color: col, crit: ev.crit, vy: -60 });
          for (let i = 0; i < (ev.crit ? 10 : 4); i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 60 + Math.random() * 120;
            this.particles.push({ x: ev.x, y: ev.y + 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0, max: 0.35, size: ev.crit ? 4 : 2.5, color: ev.crit ? '#ffd166' : '#fff', type: 'spark' });
          }
          break;
        }
        case 'kill': {
          const e = ev.entity;
          const h = (SPRITE_HEIGHT[e.def.id] || 50) / 2;
          for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 30 + Math.random() * 60;
            this.particles.push({ x: e.x, y: WORLD.GROUND_Y - h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0, max: 0.6 + Math.random() * 0.3, size: 8 + Math.random() * 8, color: 'rgba(255,255,255,0.9)', type: 'puff' });
          }
          this.numbers.push({ x: e.x, y: WORLD.GROUND_Y - h - 30, text: `+¥${ev.money}`, life: 0, max: 1.1, color: '#ffd166', crit: false, vy: -40, money: true });
          break;
        }
        case 'catdown': {
          const e = ev.entity;
          const h = (SPRITE_HEIGHT[e.def.id] || 50) / 2;
          for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 30 + Math.random() * 50;
            this.particles.push({ x: e.x, y: WORLD.GROUND_Y - h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0, max: 0.6, size: 6 + Math.random() * 6, color: 'rgba(255,255,255,0.85)', type: 'puff' });
          }
          break;
        }
        case 'deploy': {
          const e = ev.entity;
          for (let i = 0; i < 6; i++) {
            this.particles.push({ x: e.x + (Math.random() - 0.5) * 30, y: WORLD.GROUND_Y - Math.random() * 10, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, life: 0, max: 0.4, size: 4 + Math.random() * 4, color: 'rgba(255,255,255,0.7)', type: 'puff' });
          }
          break;
        }
        case 'boss': {
          this.rings.push({ x: ev.entity.x, y: WORLD.GROUND_Y - 40, r: 10, life: 0, max: 1.2, color: 'rgba(255,80,80,0.9)' });
          this.rings.push({ x: ev.entity.x, y: WORLD.GROUND_Y - 40, r: 10, life: -0.2, max: 1.2, color: 'rgba(255,200,80,0.8)' });
          break;
        }
        case 'cannon': {
          for (let i = 0; i < 40; i++) {
            this.particles.push({ x: WORLD.PLAYER_BASE_X - 60 - Math.random() * (WORLD.PLAYER_BASE_X - 200), y: WORLD.GROUND_Y - 40 - Math.random() * 50, vx: -200 - Math.random() * 200, vy: (Math.random() - 0.5) * 80, life: 0, max: 0.5 + Math.random() * 0.4, size: 4 + Math.random() * 8, color: Math.random() > 0.5 ? '#ffd166' : '#ff9f1c', type: 'spark' });
          }
          break;
        }
        case 'kb': {
          const e = ev.entity;
          for (let i = 0; i < 3; i++) this.particles.push({ x: e.x, y: WORLD.GROUND_Y, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, life: 0, max: 0.4, size: 4, color: 'rgba(200,180,150,0.8)', type: 'puff' });
          break;
        }
        default:
          break;
      }
    }
  }

  // ---------- 更新 ----------
  update(dt) {
    this.time += dt;
    const b = this.battle;
    // カメラ
    if (this.followHold > 0) {
      this.followHold -= dt;
      if (this.followHold <= 0) this.follow = true;
    }
    if (this.follow) {
      const target = this.clampCam(b.frontlineX() - this.viewW * 0.5);
      const k = 1 - Math.exp(-dt * 2.5);
      this.camX += (target - this.camX) * k;
    }
    // パーティクル
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'spark') p.vy += 300 * dt;
      if (p.type === 'puff') { p.vx *= 0.96; p.vy *= 0.96; }
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const n of this.numbers) { n.life += dt; n.y += n.vy * dt; n.vy *= 0.94; }
    this.numbers = this.numbers.filter((n) => n.life < n.max);
    for (const r of this.rings) r.life += dt;
    this.rings = this.rings.filter((r) => r.life < r.max);
    for (const c of this.clouds) { c.x -= c.speed * dt; if (c.x < -200) c.x = WORLD.W + 200; }
    // シェイク
    if (b.shake > 0) {
      const amp = Math.min(10, b.shake * 14);
      this.shakeX = (Math.random() - 0.5) * amp;
      this.shakeY = (Math.random() - 0.5) * amp;
    } else { this.shakeX = 0; this.shakeY = 0; }
  }

  // ---------- 描画 ----------
  draw() {
    const ctx = this.ctx;
    const b = this.battle;
    const th = this.theme;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    // 空
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, th.sky[0]);
    sky.addColorStop(1, th.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    this.drawBackdrop(ctx);

    // 地面
    const gy = this.groundY;
    ctx.fillStyle = th.ground;
    ctx.fillRect(-20, gy - 2, this.cssW + 40, this.cssH - gy + 20);
    ctx.fillStyle = th.groundDark;
    ctx.fillRect(-20, gy + 10 * this.scale, this.cssW + 40, this.cssH);
    ctx.fillStyle = th.dirt;
    ctx.fillRect(-20, gy + 22 * this.scale, this.cssW + 40, this.cssH);
    // 地面の模様（カメラに合わせて流れる）
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    const stripe = 90;
    const off = ((-this.camX % stripe) + stripe) % stripe;
    for (let x = off * this.scale - stripe * this.scale; x < this.cssW + stripe; x += stripe * this.scale) {
      ctx.fillRect(x, gy + 3 * this.scale, 40 * this.scale, 3 * this.scale);
    }

    // 城
    this.drawCastles(ctx);

    // ユニット（奥→手前）
    const ents = [...b.cats, ...b.enemies].sort((p, q) => p.lane - q.lane);
    for (const e of ents) this.drawEntity(ctx, e);

    // キャノン
    if (b.cannon.firing > 0) this.drawCannonBeam(ctx);

    // リング（ボス登場）
    for (const r of this.rings) {
      if (r.life < 0) continue;
      const p = r.life / r.max;
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.beginPath();
      ctx.ellipse(this.sx(r.x), this.sy(r.y), (r.r + p * 900) * this.scale, (r.r + p * 900) * this.scale * 0.35, 0, 0, Math.PI * 2);
      ctx.lineWidth = (14 - p * 10) * this.scale;
      ctx.strokeStyle = r.color;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // パーティクル
    for (const p of this.particles) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(this.sx(p.x), this.sy(p.y), p.size * this.scale * (p.type === 'puff' ? 1 + p.life : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ダメージ数字
    for (const n of this.numbers) {
      const p = n.life / n.max;
      const fs = (n.crit ? 22 : n.money ? 15 : 14) * Math.max(0.6, this.scale) * (p < 0.15 ? 0.7 + p * 2 : 1);
      ctx.globalAlpha = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
      ctx.font = `900 ${fs}px "M PLUS Rounded 1c", "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineJoin = 'round';
      ctx.strokeText(n.text, this.sx(n.x), this.sy(n.y));
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, this.sx(n.x), this.sy(n.y));
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    this.drawMinimap(ctx);
  }

  drawBackdrop(ctx) {
    const th = this.theme;
    const gy = this.groundY;
    // 太陽 / 月
    const sunX = this.cssW * 0.8 - this.camX * 0.02;
    circle(ctx, sunX, 60, 28, th.night ? '#f1f3f8' : 'rgba(255,240,180,0.95)', null);
    if (th.night) {
      circle(ctx, sunX + 10, 52, 22, th.sky[0], null);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 40; i++) {
        const x = ((i * 137.5 - this.camX * 0.05) % (this.cssW + 40) + this.cssW + 40) % (this.cssW + 40) - 20;
        const y = (i * 61.7) % Math.max(1, gy * 0.6);
        ctx.fillRect(x, y, 2, 2);
      }
    }
    // 雲
    ctx.fillStyle = th.night ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)';
    for (const c of this.clouds) {
      const x = this.sx(c.x) * 0.3 + this.cssW * 0.2;
      const y = c.y;
      ctx.beginPath();
      ctx.ellipse(x, y, c.w, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(x - c.w * 0.5, y + 6, c.w * 0.6, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(x + c.w * 0.5, y + 6, c.w * 0.6, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 遠景の丘
    ctx.fillStyle = th.far;
    ctx.beginPath();
    ctx.moveTo(-20, gy);
    for (let x = -20; x <= this.cssW + 20; x += 20) {
      const wx = x / this.scale + this.camX * 0.3;
      const h = 70 + Math.sin(wx * 0.004) * 40 + Math.sin(wx * 0.011 + 1) * 20;
      ctx.lineTo(x, gy - h * this.scale);
    }
    ctx.lineTo(this.cssW + 20, gy);
    ctx.closePath();
    ctx.fill();
    // 中景
    ctx.fillStyle = th.mid;
    ctx.beginPath();
    ctx.moveTo(-20, gy);
    for (let x = -20; x <= this.cssW + 20; x += 16) {
      const wx = x / this.scale + this.camX * 0.6;
      const h = 34 + Math.sin(wx * 0.008 + 2) * 18 + Math.sin(wx * 0.021) * 8;
      ctx.lineTo(x, gy - h * this.scale);
    }
    ctx.lineTo(this.cssW + 20, gy);
    ctx.closePath();
    ctx.fill();
    // 飾り
    for (const d of this.decos) {
      const x = this.sx(d.x);
      if (x < -120 || x > this.cssW + 120) continue;
      ctx.globalAlpha = 0.9;
      drawDeco(ctx, th.deco, x, gy - 4 * this.scale, this.scale * d.scale, d.seed);
      ctx.globalAlpha = 1;
    }
  }

  drawCastles(ctx) {
    const b = this.battle;
    // 敵城
    ctx.save();
    ctx.translate(this.sx(b.enemyBase.x - 50), this.sy(WORLD.GROUND_Y));
    ctx.scale(this.scale, this.scale);
    drawEnemyCastle(ctx, b.enemyBase.hp / b.enemyBase.maxHp, this.time, b.enemyBase.flashT > 0, this.theme);
    if (b.result === 'win') this.drawRubble(ctx, b.resultT);
    ctx.restore();
    this.drawBaseBar(ctx, b.enemyBase, b.enemyBase.x - 50, '#ff6b6b');
    // ねこ城
    ctx.save();
    ctx.translate(this.sx(b.playerBase.x + 50), this.sy(WORLD.GROUND_Y));
    ctx.scale(this.scale, this.scale);
    drawPlayerCastle(ctx, b.playerBase.hp / b.playerBase.maxHp, this.time, b.playerBase.flashT > 0);
    if (b.result === 'lose') this.drawRubble(ctx, b.resultT);
    ctx.restore();
    this.drawBaseBar(ctx, b.playerBase, b.playerBase.x + 50, '#4cc9f0');
  }

  drawRubble(ctx, t) {
    // 崩れる演出: 煙
    const p = Math.min(1, t / 1.5);
    ctx.globalAlpha = 0.8 * (1 - p * 0.5);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      circle(ctx, Math.cos(a) * (30 + p * 60), -80 + Math.sin(a) * (20 + p * 40) - p * 40, 20 + p * 20, 'rgba(220,220,220,0.9)', null);
    }
    ctx.globalAlpha = 1;
  }

  drawBaseBar(ctx, base, wx, color) {
    const w = 150 * this.scale;
    const h = Math.max(8, 10 * this.scale);
    const x = this.sx(wx) - w / 2;
    const y = this.sy(WORLD.GROUND_Y - 262);
    roundRect(ctx, x, y, w, h, h / 2, 'rgba(0,0,0,0.45)', null);
    const r = Math.max(0, base.hp / base.maxHp);
    if (r > 0) roundRect(ctx, x, y, Math.max(h, w * r), h, h / 2, color, null);
    ctx.font = `800 ${Math.max(10, 13 * this.scale)}px "M PLUS Rounded 1c", "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    const txt = `${Math.ceil(base.hp)} / ${base.maxHp}`;
    ctx.strokeText(txt, x + w / 2, y - 4);
    ctx.fillText(txt, x + w / 2, y - 4);
  }

  animFor(e) {
    const def = e.def;
    const a = { t: e.anim, bob: 0, step: 0, swing: 0, attacking: false, hurt: e.flashT > 0 ? 1 : 0, dead: 0, squash: 0 };
    if (e.state === 'walk') {
      const ph = e.anim * (def.speed / 12 + 5);
      a.bob = Math.abs(Math.sin(ph));
      a.step = Math.sin(ph);
    } else if (e.state === 'attack') {
      const fs = def.foreswing;
      if (e.t < fs) {
        a.attacking = true;
        const p = e.t / fs;
        a.swing = p < 0.55 ? -0.3 * (p / 0.55) : (p - 0.55) / 0.45;
      } else if (e.t < fs + 0.3) {
        a.attacking = true;
        a.swing = Math.max(0, 1 - (e.t - fs) / 0.3);
      }
    } else if (e.state === 'kb') {
      a.squash = Math.sin(Math.min(1, e.t / WORLD.KB_DUR) * Math.PI);
    } else if (e.state === 'dead') {
      a.dead = Math.min(1, e.deadT / 0.7);
    }
    return a;
  }

  drawEntity(ctx, e) {
    const a = this.animFor(e);
    const id = e.def.id;
    const laneY = (e.lane - 0.5) * 22;
    const x = this.sx(e.x);
    const y = this.sy(WORLD.GROUND_Y + laneY);
    const sc = this.scale * (0.92 + e.lane * 0.08);
    const halfW = SPRITE_HALF_W[id] || 24;
    const h = SPRITE_HEIGHT[id] || 50;
    if (x < -halfW * 3 * sc || x > this.cssW + halfW * 3 * sc) return;

    // かげ
    ctx.globalAlpha = 0.25 * (1 - a.dead);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y, halfW * 0.9 * sc, 5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const flip = e.side === 'cat';
    const yOff = (e.yOff || 0) + (a.dead ? a.dead * 40 : 0);

    ctx.save();
    ctx.translate(x, y - yOff * sc);
    ctx.scale(flip ? -sc : sc, sc);
    if (e.state === 'kb') ctx.rotate(-0.25 * a.squash);
    if (a.dead) { ctx.globalAlpha = 1 - a.dead; ctx.rotate(-a.dead * 0.8); }
    if (e.slowT > 0) {
      // 鈍足: 青いもや
      ctx.globalAlpha *= 1;
      circle(ctx, 0, -h / 2, halfW * 1.1, 'rgba(80,160,255,0.22)', null);
    }
    drawSprite(ctx, id, a);
    ctx.restore();

    // ダメージ時の白フラッシュ（オフスクリーンで塗る）
    if (e.flashT > 0 && !a.dead) {
      const fx = this.fx;
      const fctx = this.fxCtx;
      const size = fx.width;
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.clearRect(0, 0, size, size);
      const k = sc * this.dpr;
      fctx.setTransform(flip ? -k : k, 0, 0, k, size / 2, size * 0.82);
      if (e.state === 'kb') fctx.rotate(-0.25 * a.squash);
      drawSprite(fctx, id, a);
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.globalCompositeOperation = 'source-atop';
      fctx.fillStyle = 'rgba(255,255,255,1)';
      fctx.fillRect(0, 0, size, size);
      fctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(1, e.flashT / 0.12) * 0.75;
      const css = size / this.dpr;
      ctx.drawImage(fx, x - css / 2, y - yOff * sc - css * 0.82, css, css);
      ctx.globalAlpha = 1;
    }

    // HPバー（ダメージを受けたときだけ）
    if (!a.dead && e.hp < e.maxHp) {
      const w = Math.max(26, halfW * 1.6) * sc;
      const bh = Math.max(3, 4 * sc);
      const bx = x - w / 2;
      const by = y - (h + 14) * sc - yOff * sc;
      roundRect(ctx, bx, by, w, bh, bh / 2, 'rgba(0,0,0,0.5)', null);
      const r = Math.max(0, e.hp / e.maxHp);
      roundRect(ctx, bx, by, Math.max(bh, w * r), bh, bh / 2, e.side === 'cat' ? '#4cc9f0' : e.isBoss ? '#ff6b6b' : '#ffb703', null);
    }
  }

  drawCannonBeam(ctx) {
    const b = this.battle;
    const p = 1 - b.cannon.firing / 0.8; // 0→1
    const y = this.sy(WORLD.GROUND_Y - 70);
    const x1 = this.sx(b.playerBase.x - 30);
    const reach = Math.min(1, p * 2.2);
    const x0 = this.sx(b.playerBase.x - 30 - (b.playerBase.x - 100) * reach);
    const fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
    ctx.globalAlpha = fade;
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.15, 'rgba(255,220,120,0.9)');
    grad.addColorStop(1, 'rgba(255,120,60,0.95)');
    ctx.fillStyle = grad;
    const th = (26 + Math.sin(this.time * 40) * 6) * this.scale;
    ctx.beginPath();
    ctx.roundRect(Math.min(x0, x1), y - th / 2, Math.abs(x1 - x0), th, th / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.roundRect(Math.min(x0, x1), y - th / 6, Math.abs(x1 - x0), th / 3, th / 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawMinimap(ctx) {
    const b = this.battle;
    const h = 10;
    const y = this.cssH - h - 6;
    const pad = 12;
    const w = this.cssW - pad * 2;
    const mx = (wx) => pad + ((wx + 60) / (WORLD.W + 120)) * w;
    roundRect(ctx, pad, y, w, h, h / 2, 'rgba(0,0,0,0.45)', null);
    // 見えている範囲
    const vx0 = mx(this.camX);
    const vx1 = mx(this.camX + this.viewW);
    roundRect(ctx, vx0, y, Math.max(6, vx1 - vx0), h, h / 2, 'rgba(255,255,255,0.22)', null);
    // 城
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(mx(b.enemyBase.x - 50) - 3, y - 2, 6, h + 4);
    ctx.fillStyle = '#4cc9f0';
    ctx.fillRect(mx(b.playerBase.x + 50) - 3, y - 2, 6, h + 4);
    for (const c of b.cats) if (c.alive) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(mx(c.x), y + h / 2, 2.2, 0, Math.PI * 2); ctx.fill(); }
    for (const e of b.enemies) if (e.alive) { ctx.fillStyle = e.isBoss ? '#ff3b3b' : '#ffb703'; ctx.beginPath(); ctx.arc(mx(e.x), y + h / 2, e.isBoss ? 3.5 : 2.2, 0, Math.PI * 2); ctx.fill(); }
  }
}

/** ユニットカード用のアイコンを描く（静止） */
export function renderIcon(canvas, id, size, t = 0) {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const h = SPRITE_HEIGHT[id] || 50;
  const hw = SPRITE_HALF_W[id] || 24;
  const s = Math.min((size * 0.82) / h, (size * 0.82) / (hw * 2));
  ctx.translate(size / 2, size * 0.9);
  ctx.scale(s, s);
  drawSprite(ctx, id, { t, bob: 0, step: 0, swing: 0, attacking: false, hurt: 0, dead: 0, squash: 0 });
}
