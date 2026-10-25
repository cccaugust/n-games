// ねこぐんだん大戦争 - バトルシミュレーション（描画・DOMに依存しない）
import {
  WORLD, UNIT_BY_ID, ENEMY_BY_ID, levelMult, workerStats, castleStats,
  WORKER_UPGRADE_COST, MAX_WORKER_LEVEL
} from './data.js';

let uid = 1;

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const easeOut = (t) => 1 - (1 - t) * (1 - t);

export class Entity {
  constructor(def, side, x, mult, rng) {
    this.id = uid++;
    this.def = def;
    this.side = side; // 'cat' | 'enemy'
    this.dir = side === 'cat' ? -1 : 1;
    this.x = x;
    this.maxHp = Math.round(def.hp * mult);
    this.hp = this.maxHp;
    this.atk = Math.round(def.atk * mult);
    this.state = 'walk'; // walk | attack | kb | dead
    this.t = 0;
    this.kbTaken = 0;
    this.kbFrom = x;
    this.kbTo = x;
    this.hitDone = false;
    this.slowT = 0;
    this.flashT = 0;
    this.lane = rng();          // 0..1 奥行き（描画のばらつき用）
    this.anim = rng() * 10;     // アニメ位相
    this.yOff = 0;              // ノックバック中のジャンプ
    this.deadT = 0;
    this.lastCrit = false;
    this.lastKnock = false;
  }

  get alive() { return this.state !== 'dead'; }
  get isBoss() { return !!this.def.boss; }
  get speedMul() { return this.slowT > 0 ? 0.5 : 1; }
}

export class Battle {
  /**
   * @param {object} opts
   * @param {object} opts.stage ステージ定義
   * @param {string[]} opts.deck ユニットIDの配列（最大10）
   * @param {object} opts.unitLevels { id: level }
   * @param {number} opts.castleLevel
   * @param {function} [opts.rng] 乱数（0..1）
   */
  constructor({ stage, deck, unitLevels, castleLevel, rng }) {
    this.stage = stage;
    this.rng = rng || Math.random;
    this.time = 0;
    this.result = null; // 'win' | 'lose'
    this.resultT = 0;
    this.events = [];   // 描画/音用のイベント（毎フレーム消費）
    this.shake = 0;

    const castle = castleStats(castleLevel || 1);
    this.playerBase = { hp: castle.baseHp, maxHp: castle.baseHp, x: WORLD.PLAYER_BASE_X, flashT: 0 };
    this.enemyBase = { hp: stage.enemyBaseHp, maxHp: stage.enemyBaseHp, x: WORLD.ENEMY_BASE_X, flashT: 0 };

    this.cannon = { charge: 0, cooldown: castle.cannonCooldown, damage: castle.cannonDamage, firing: 0 };

    this.workerLevel = 1;
    this.money = 0;
    this.moneyFloat = 0;

    this.slots = deck.map((id) => {
      const def = UNIT_BY_ID[id];
      const lv = (unitLevels && unitLevels[id]) || 1;
      return { id, def, level: lv, mult: levelMult(lv), cdT: 0 };
    });

    this.cats = [];
    this.enemies = [];
    this.spawnTimers = stage.spawns.map((s) => ({ ...s, spawned: 0, next: s.at }));
    this.triggers = stage.triggers.map((t) => ({ ...t, fired: false, timers: null, startedAt: 0 }));
    this.killCount = 0;
    this.deployCount = 0;
  }

  // ---------- 入力 ----------
  canDeploy(i) {
    const s = this.slots[i];
    return !!s && !this.result && s.cdT <= 0 && this.money >= s.def.cost;
  }

  deploy(i) {
    if (!this.canDeploy(i)) return false;
    const s = this.slots[i];
    this.money -= s.def.cost;
    s.cdT = s.def.cd;
    const e = new Entity(s.def, 'cat', WORLD.PLAYER_SPAWN_X + this.rng() * 20, s.mult, this.rng);
    this.cats.push(e);
    this.deployCount++;
    this.events.push({ type: 'deploy', entity: e });
    return true;
  }

  get workerUpgradeCost() {
    return this.workerLevel >= MAX_WORKER_LEVEL ? null : WORKER_UPGRADE_COST[this.workerLevel];
  }

  canUpgradeWorker() {
    const c = this.workerUpgradeCost;
    return c !== null && !this.result && this.money >= c;
  }

  upgradeWorker() {
    if (!this.canUpgradeWorker()) return false;
    this.money -= this.workerUpgradeCost;
    this.workerLevel++;
    this.events.push({ type: 'worker', level: this.workerLevel });
    return true;
  }

  canFireCannon() {
    return !this.result && this.cannon.charge >= 1;
  }

  fireCannon() {
    if (!this.canFireCannon()) return false;
    this.cannon.charge = 0;
    this.cannon.firing = 0.8;
    this.shake = Math.max(this.shake, 0.5);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      this.damage(e, this.cannon.damage, null, { knock: true });
    }
    this.events.push({ type: 'cannon' });
    return true;
  }

  // ---------- メイン更新 ----------
  update(dt) {
    if (this.result) {
      this.resultT += dt;
      this.tickVisual(dt);
      return;
    }
    // 固定ステップで安定させる
    const step = 1 / 60;
    let acc = dt;
    while (acc > 1e-6) {
      const h = Math.min(step, acc);
      this.tick(h);
      acc -= h;
      if (this.result) break;
    }
  }

  tickVisual(dt) {
    for (const e of this.cats) if (e.state === 'dead') e.deadT += dt;
    for (const e of this.enemies) if (e.state === 'dead') e.deadT += dt;
    this.cats = this.cats.filter((e) => e.state !== 'dead' || e.deadT < 0.7);
    this.enemies = this.enemies.filter((e) => e.state !== 'dead' || e.deadT < 0.7);
    this.shake = Math.max(0, this.shake - dt);
    this.cannon.firing = Math.max(0, this.cannon.firing - dt);
  }

  tick(dt) {
    this.time += dt;

    // お金
    const ws = workerStats(this.workerLevel);
    this.money = Math.min(ws.cap, this.money + ws.rate * dt);

    // キャノン充電
    this.cannon.charge = Math.min(1, this.cannon.charge + dt / this.cannon.cooldown);
    this.cannon.firing = Math.max(0, this.cannon.firing - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.playerBase.flashT = Math.max(0, this.playerBase.flashT - dt);
    this.enemyBase.flashT = Math.max(0, this.enemyBase.flashT - dt);

    // スロットのクールダウン
    for (const s of this.slots) s.cdT = Math.max(0, s.cdT - dt);

    // 敵の出現
    this.updateSpawns(dt);

    // ユニット更新
    for (const e of this.cats) this.updateEntity(e, dt);
    for (const e of this.enemies) this.updateEntity(e, dt);

    // 死体の掃除
    this.cats = this.cats.filter((e) => e.state !== 'dead' || e.deadT < 0.7);
    this.enemies = this.enemies.filter((e) => e.state !== 'dead' || e.deadT < 0.7);

    // 勝敗
    if (this.enemyBase.hp <= 0) {
      this.result = 'win';
      this.events.push({ type: 'win' });
    } else if (this.playerBase.hp <= 0) {
      this.result = 'lose';
      this.events.push({ type: 'lose' });
    }
  }

  updateSpawns(dt) {
    const run = (timers, now) => {
      for (const s of timers) {
        while (s.spawned < s.count && now >= s.next) {
          this.spawnEnemy(s.id, s.mag);
          s.spawned++;
          s.next += s.every;
          if (s.every <= 0) break;
        }
      }
    };
    run(this.spawnTimers, this.time);

    const pct = this.enemyBase.hp / this.enemyBase.maxHp;
    for (const tr of this.triggers) {
      if (!tr.fired && pct <= tr.pct) {
        tr.fired = true;
        tr.startedAt = this.time;
        tr.timers = tr.spawns.map((s) => ({ ...s, spawned: 0, next: s.at }));
      }
      if (tr.fired) run(tr.timers, this.time - tr.startedAt);
    }
  }

  spawnEnemy(id, mag) {
    const def = ENEMY_BY_ID[id];
    const mult = this.stage.mag * (mag || 1);
    const e = new Entity(def, 'enemy', WORLD.ENEMY_SPAWN_X - this.rng() * 20, mult, this.rng);
    this.enemies.push(e);
    if (def.boss) {
      this.events.push({ type: 'boss', entity: e });
      this.shake = Math.max(this.shake, 0.8);
      // 衝撃波: 全てのねこをふっとばす
      for (const c of this.cats) if (c.alive) this.knockback(c);
    } else {
      this.events.push({ type: 'spawn', entity: e });
    }
    return e;
  }

  // 射程内の標的（ユニット + 城）を返す
  targetsInRange(e, range) {
    const out = [];
    const slack = WORLD.HIT_SLACK;
    if (e.side === 'cat') {
      for (const t of this.enemies) {
        if (!t.alive) continue;
        const d = e.x - t.x;
        if (d >= -slack && d <= range) out.push(t);
      }
      const d = e.x - this.enemyBase.x;
      if (d >= -slack && d <= range) out.push(this.enemyBase);
    } else {
      for (const t of this.cats) {
        if (!t.alive) continue;
        const d = t.x - e.x;
        if (d >= -slack && d <= range) out.push(t);
      }
      const d = this.playerBase.x - e.x;
      if (d >= -slack && d <= range) out.push(this.playerBase);
    }
    return out;
  }

  nearestTarget(e, targets) {
    let best = null;
    let bestD = Infinity;
    for (const t of targets) {
      const d = Math.abs(t.x - e.x);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  updateEntity(e, dt) {
    e.flashT = Math.max(0, e.flashT - dt);
    if (e.state === 'dead') { e.deadT += dt; return; }
    e.slowT = Math.max(0, e.slowT - dt);
    e.anim += dt;

    if (e.state === 'kb') {
      e.t += dt;
      const p = clamp(e.t / WORLD.KB_DUR, 0, 1);
      e.x = e.kbFrom + (e.kbTo - e.kbFrom) * easeOut(p);
      e.yOff = Math.sin(p * Math.PI) * 28;
      if (p >= 1) { e.state = 'walk'; e.t = 0; e.yOff = 0; }
      return;
    }

    const def = e.def;
    const interval = def.atkInterval * (e.slowT > 0 ? 1.4 : 1);

    if (e.state === 'walk') {
      const targets = this.targetsInRange(e, def.range);
      if (targets.length) {
        e.state = 'attack';
        e.t = 0;
        e.hitDone = false;
      } else {
        const spd = def.speed * e.speedMul;
        e.x += e.dir * spd * dt;
        const minX = this.enemyBase.x - 10;
        const maxX = this.playerBase.x + 10;
        e.x = clamp(e.x, minX, maxX);
      }
      return;
    }

    if (e.state === 'attack') {
      e.t += dt;
      if (!e.hitDone && e.t >= def.foreswing) {
        e.hitDone = true;
        this.performAttack(e);
      }
      if (e.t >= interval) {
        const targets = this.targetsInRange(e, def.range);
        if (targets.length) { e.t = 0; e.hitDone = false; }
        else { e.state = 'walk'; e.t = 0; }
      }
    }
  }

  performAttack(e) {
    const def = e.def;
    const targets = this.targetsInRange(e, def.range);
    if (!targets.length) return; // 空振り
    let dmg = e.atk;
    let crit = false;
    if (def.crit && this.rng() < def.crit) { dmg = Math.round(dmg * 3); crit = true; }
    const knock = def.knockback ? this.rng() < def.knockback : false;
    const slow = def.slow && this.rng() < def.slow.chance ? def.slow.dur : 0;
    const opts = { crit, knock, slow, attacker: e };
    this.events.push({ type: 'attack', entity: e });
    if (def.area) {
      for (const t of targets) this.damage(t, dmg, e, opts);
    } else {
      const t = this.nearestTarget(e, targets);
      this.damage(t, dmg, e, opts);
    }
  }

  /** @param {Entity|object} target ユニット or 城 */
  damage(target, dmg, attacker, opts = {}) {
    if (target === this.playerBase || target === this.enemyBase) {
      target.hp = Math.max(0, target.hp - dmg);
      target.flashT = 0.15;
      this.events.push({ type: 'hit', x: target.x, y: WORLD.GROUND_Y - 90, dmg, crit: !!opts.crit, base: true, side: target === this.playerBase ? 'cat' : 'enemy' });
      if (target === this.playerBase) this.shake = Math.max(this.shake, 0.15);
      return;
    }
    const e = target;
    if (!e.alive) return;
    e.hp -= dmg;
    e.flashT = 0.12;
    e.lastCrit = !!opts.crit;
    if (opts.slow) e.slowT = Math.max(e.slowT, opts.slow);
    this.events.push({ type: 'hit', x: e.x, y: WORLD.GROUND_Y - 60 - e.lane * 20, dmg, crit: !!opts.crit, side: e.side, entity: e });
    if (e.hp <= 0) {
      this.kill(e);
      return;
    }
    const perKb = e.maxHp / e.def.kb;
    const stage = Math.floor((e.maxHp - e.hp) / perKb);
    if (stage > e.kbTaken) {
      e.kbTaken = stage;
      this.knockback(e);
    } else if (opts.knock) {
      this.knockback(e);
    }
  }

  knockback(e) {
    if (!e.alive) return;
    e.state = 'kb';
    e.t = 0;
    e.kbFrom = e.x;
    const back = e.side === 'cat' ? WORLD.KB_DIST : -WORLD.KB_DIST;
    const minX = this.enemyBase.x - 10;
    const maxX = this.playerBase.x + 10;
    e.kbTo = clamp(e.x + back, minX, maxX);
    e.hitDone = true;
    this.events.push({ type: 'kb', entity: e });
  }

  kill(e) {
    e.hp = 0;
    e.state = 'dead';
    e.deadT = 0;
    if (e.side === 'enemy') {
      this.killCount++;
      const ws = workerStats(this.workerLevel);
      const gain = Math.round(e.def.money * (this.stage.moneyMul || 1));
      this.money = Math.min(ws.cap, this.money + gain);
      this.events.push({ type: 'kill', entity: e, money: gain });
    } else {
      this.events.push({ type: 'catdown', entity: e });
    }
  }

  /** 最前線のX（カメラ用） */
  frontlineX() {
    let catMin = Infinity;
    let enemyMax = -Infinity;
    for (const c of this.cats) if (c.alive) catMin = Math.min(catMin, c.x);
    for (const en of this.enemies) if (en.alive) enemyMax = Math.max(enemyMax, en.x);
    if (catMin === Infinity && enemyMax === -Infinity) return WORLD.PLAYER_BASE_X - 200;
    if (catMin === Infinity) return enemyMax + 100;
    if (enemyMax === -Infinity) return catMin - 50;
    return (catMin + enemyMax) / 2;
  }

  drainEvents() {
    const ev = this.events;
    this.events = [];
    return ev;
  }
}
