/**
 * モブ：ブタ / ヒツジ / ニワトリ（おとなしい）、ゾンビ（夜のサバイバルだけ）
 * - 箱を組み合わせたモデル。顔などは Canvas で描く
 * - 簡単な AI（うろうろ / 逃げる / 追いかける）
 */
import * as THREE from 'three';
import { moveWithCollision, inWater } from './physics.js';
import { getDef, B } from './blocks.js';
import { mulberry32 } from './noise.js';

const PX = 1 / 16;

/* ---------- テクスチャ付きの箱 ---------- */
const texCache = new Map();
function faceTexture(key, w, h, painter) {
  const k = key + ':' + w + 'x' + h;
  if (texCache.has(k)) return texCache.get(k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  painter(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(k, t);
  return t;
}
const rnd = mulberry32(1234);
function noisy(ctx, w, h, base, v) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = (rnd() - 0.5) * 2 * v;
    ctx.fillStyle = `rgb(${base[0] + n | 0},${base[1] + n | 0},${base[2] + n | 0})`;
    ctx.fillRect(x, y, 1, 1);
  }
}
const FACE_SHADE = [0.8, 0.8, 1.0, 0.5, 0.85, 0.7]; // +x -x +y -y +z -z

/**
 * @param {string} name
 * @param {number} w,h,d  ピクセル単位（1 ブロック = 16）
 * @param {(face:number, ctx, W, H)=>void} paint  face: 0:+x 1:-x 2:+y 3:-y 4:+z(前) 5:-z(後)
 */
function makeBox(name, w, h, d, paint) {
  const geo = new THREE.BoxGeometry(w * PX, h * PX, d * PX);
  const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  const mats = [];
  for (let f = 0; f < 6; f++) {
    const [fw, fh] = sizes[f];
    const tex = faceTexture(name + f, fw, fh, (ctx, W, H) => paint(f, ctx, W, H));
    mats.push(new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color().setScalar(FACE_SHADE[f]) }));
  }
  return { geo, mats };
}

/* ---------- モブの定義 ---------- */
const PINK = [238, 160, 160], PINK_D = [220, 130, 140];
const WOOL = [235, 235, 235], SHEEP_FACE = [210, 190, 170];
const CHICK = [245, 245, 245];
const ZOMBIE_SKIN = [78, 140, 80], ZOMBIE_SHIRT = [60, 150, 170], ZOMBIE_PANTS = [60, 70, 150];

function eyes(ctx, W, H, x, y, color = [255, 255, 255], pupil = [40, 40, 60]) {
  ctx.fillStyle = `rgb(${color})`; ctx.fillRect(x, y, 2, 1); ctx.fillRect(W - x - 2, y, 2, 1);
  ctx.fillStyle = `rgb(${pupil})`; ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(W - x - 2, y, 1, 1);
}

const MODELS = {
  pig: () => {
    const body = makeBox('pig_body', 10, 8, 16, (f, ctx, W, H) => noisy(ctx, W, H, PINK, 6));
    const head = makeBox('pig_head', 8, 8, 8, (f, ctx, W, H) => {
      noisy(ctx, W, H, PINK, 6);
      if (f === 4) { eyes(ctx, W, H, 1, 3); ctx.fillStyle = `rgb(${PINK_D})`; ctx.fillRect(2, 5, 4, 3); ctx.fillStyle = 'rgb(150,80,90)'; ctx.fillRect(3, 6, 1, 1); ctx.fillRect(5, 6, 1, 1); }
    });
    const leg = makeBox('pig_leg', 4, 6, 4, (f, ctx, W, H) => { noisy(ctx, W, H, PINK, 6); if (f !== 2) { ctx.fillStyle = `rgb(${PINK_D})`; ctx.fillRect(0, H - 1, W, 1); } });
    return build([
      { part: 'body', box: body, pos: [0, 10, 0] },
      { part: 'head', box: head, pos: [0, 12, 10] },
      { part: 'leg0', box: leg, pos: [-3, 3, 5], pivot: [0, 3, 0] }, { part: 'leg1', box: leg, pos: [3, 3, 5], pivot: [0, 3, 0] },
      { part: 'leg2', box: leg, pos: [-3, 3, -5], pivot: [0, 3, 0] }, { part: 'leg3', box: leg, pos: [3, 3, -5], pivot: [0, 3, 0] }
    ]);
  },
  sheep: () => {
    const body = makeBox('sheep_body', 12, 10, 16, (f, ctx, W, H) => { noisy(ctx, W, H, WOOL, 14); });
    const head = makeBox('sheep_head', 6, 6, 8, (f, ctx, W, H) => {
      noisy(ctx, W, H, SHEEP_FACE, 8);
      if (f === 4) { eyes(ctx, W, H, 0, 2, [255, 255, 255], [40, 40, 60]); ctx.fillStyle = 'rgb(230,170,170)'; ctx.fillRect(2, 4, 2, 2); }
      else if (f !== 3) { ctx.fillStyle = `rgb(${WOOL})`; ctx.fillRect(0, 0, W, 2); }
    });
    const leg = makeBox('sheep_leg', 4, 8, 4, (f, ctx, W, H) => { noisy(ctx, W, H, SHEEP_FACE, 6); ctx.fillStyle = `rgb(${WOOL})`; ctx.fillRect(0, 0, W, 3); });
    return build([
      { part: 'body', box: body, pos: [0, 11, 0] },
      { part: 'head', box: head, pos: [0, 14, 10] },
      { part: 'leg0', box: leg, pos: [-3, 4, 5], pivot: [0, 4, 0] }, { part: 'leg1', box: leg, pos: [3, 4, 5], pivot: [0, 4, 0] },
      { part: 'leg2', box: leg, pos: [-3, 4, -5], pivot: [0, 4, 0] }, { part: 'leg3', box: leg, pos: [3, 4, -5], pivot: [0, 4, 0] }
    ]);
  },
  chicken: () => {
    const body = makeBox('chk_body', 6, 6, 8, (f, ctx, W, H) => noisy(ctx, W, H, CHICK, 8));
    const head = makeBox('chk_head', 4, 6, 3, (f, ctx, W, H) => { noisy(ctx, W, H, CHICK, 8); if (f === 4) { eyes(ctx, W, H, 0, 1, [255, 255, 255], [30, 30, 40]); } });
    const beak = makeBox('chk_beak', 4, 2, 2, (f, ctx, W, H) => { ctx.fillStyle = 'rgb(240,170,40)'; ctx.fillRect(0, 0, W, H); });
    const wattle = makeBox('chk_wattle', 2, 2, 2, (f, ctx, W, H) => { ctx.fillStyle = 'rgb(210,40,40)'; ctx.fillRect(0, 0, W, H); });
    const leg = makeBox('chk_leg', 1, 5, 3, (f, ctx, W, H) => { ctx.fillStyle = 'rgb(240,170,40)'; ctx.fillRect(0, 0, W, H); });
    const wing = makeBox('chk_wing', 1, 4, 6, (f, ctx, W, H) => noisy(ctx, W, H, CHICK, 10));
    return build([
      { part: 'body', box: body, pos: [0, 8, 0] },
      { part: 'head', box: head, pos: [0, 12, 4] },
      { part: 'beak', box: beak, pos: [0, 11, 6.5] },
      { part: 'wattle', box: wattle, pos: [0, 9, 6] },
      { part: 'leg0', box: leg, pos: [-1.5, 2.5, 0], pivot: [0, 2.5, 0] }, { part: 'leg1', box: leg, pos: [1.5, 2.5, 0], pivot: [0, 2.5, 0] },
      { part: 'wing0', box: wing, pos: [-3.5, 9, 0], pivot: [0, 2, 0] }, { part: 'wing1', box: wing, pos: [3.5, 9, 0], pivot: [0, 2, 0] }
    ]);
  },
  zombie: () => {
    const head = makeBox('zmb_head', 8, 8, 8, (f, ctx, W, H) => {
      noisy(ctx, W, H, ZOMBIE_SKIN, 10);
      if (f === 4) { ctx.fillStyle = 'rgb(20,30,20)'; ctx.fillRect(1, 3, 2, 1); ctx.fillRect(5, 3, 2, 1); ctx.fillRect(3, 6, 2, 1); ctx.fillRect(2, 5, 1, 1); ctx.fillRect(5, 5, 1, 1); }
      else if (f !== 3) { ctx.fillStyle = 'rgb(40,80,40)'; ctx.fillRect(0, 0, W, 1); }
    });
    const body = makeBox('zmb_body', 8, 12, 4, (f, ctx, W, H) => { noisy(ctx, W, H, ZOMBIE_SHIRT, 8); if (f !== 2 && f !== 3) { ctx.fillStyle = `rgb(${ZOMBIE_PANTS})`; ctx.fillRect(0, H - 1, W, 1); } });
    const arm = makeBox('zmb_arm', 4, 12, 4, (f, ctx, W, H) => { noisy(ctx, W, H, ZOMBIE_SKIN, 8); if (f !== 2 && f !== 3) { ctx.fillStyle = `rgb(${ZOMBIE_SHIRT})`; ctx.fillRect(0, 0, W, 4); } });
    const leg = makeBox('zmb_leg', 4, 12, 4, (f, ctx, W, H) => noisy(ctx, W, H, ZOMBIE_PANTS, 8));
    return build([
      { part: 'body', box: body, pos: [0, 18, 0] },
      { part: 'head', box: head, pos: [0, 28, 0] },
      { part: 'arm0', box: arm, pos: [-6, 18, 0], pivot: [0, 5, 0] }, { part: 'arm1', box: arm, pos: [6, 18, 0], pivot: [0, 5, 0] },
      { part: 'leg0', box: leg, pos: [-2, 6, 0], pivot: [0, 6, 0] }, { part: 'leg1', box: leg, pos: [2, 6, 0], pivot: [0, 6, 0] }
    ]);
  }
};

/** パーツの定義 → 生成関数（インスタンスごとにマテリアルを複製して明るさを別々に変える） */
function build(parts) {
  return () => {
    const group = new THREE.Group();
    const map = {};
    const mats = [];
    for (const p of parts) {
      const pivot = new THREE.Group();
      pivot.position.set(p.pos[0] * PX, p.pos[1] * PX, p.pos[2] * PX);
      const m = p.box.mats.map(mm => mm.clone());
      mats.push(...m);
      const mesh = new THREE.Mesh(p.box.geo, m);
      if (p.pivot) { pivot.position.y += p.pivot[1] * PX; mesh.position.y = -p.pivot[1] * PX; }
      pivot.add(mesh);
      group.add(pivot);
      map[p.part] = pivot;
    }
    return { group, parts: map, mats };
  };
}

const MOB_INFO = {
  pig: { w: 0.9, h: 0.9, speed: 1.6, hp: 10, voice: 0.012 },
  sheep: { w: 0.9, h: 1.3, speed: 1.4, hp: 8, voice: 0.012 },
  chicken: { w: 0.4, h: 0.7, speed: 1.3, hp: 4, voice: 0.02 },
  zombie: { w: 0.6, h: 1.95, speed: 2.4, hp: 12, voice: 0.01 }
};

export class MobManager {
  constructor(scene, world, audio) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    this.mobs = [];
    this.factories = {};
    this.time = 0;
    this.zombieSpawnTimer = 0;
    this.onDrop = null;
    this.onPlayerHit = null;
  }

  factory(type) {
    if (!this.factories[type]) this.factories[type] = MODELS[type]();
    return this.factories[type];
  }

  spawn(type, x, y, z) {
    const info = MOB_INFO[type];
    const { group, parts, mats } = this.factory(type)();
    group.position.set(x, y, z);
    this.scene.add(group);
    const mob = {
      type, info, group, parts, mats,
      pos: { x, y, z }, vel: { x: 0, y: 0, z: 0 },
      yaw: Math.random() * Math.PI * 2, targetYaw: 0,
      state: 'idle', timer: 1 + Math.random() * 3,
      hp: info.hp, onGround: false, walkPhase: Math.random() * 6, hurt: 0,
      sheared: false, regrow: 0, burning: 0, attackCd: 0, dead: false, deathTimer: 0,
      legAmp: 0
    };
    mob.targetYaw = mob.yaw;
    this.mobs.push(mob);
    return mob;
  }

  remove(mob) {
    this.scene.remove(mob.group);
    for (const m of mob.mats) m.dispose();
    const i = this.mobs.indexOf(mob);
    if (i >= 0) this.mobs.splice(i, 1);
  }

  clear() { for (const m of [...this.mobs]) this.remove(m); }

  /** 新しく読み込んだチャンクに動物を出す */
  spawnInChunk(chunk, playerPos) {
    if (chunk.mobsSpawned) return;
    chunk.mobsSpawned = true;
    const passive = this.mobs.filter(m => m.type !== 'zombie').length;
    if (passive >= 14) return;
    if (Math.random() > 0.28) return;
    const type = ['pig', 'sheep', 'chicken'][Math.floor(Math.random() * 3)];
    const n = 2 + Math.floor(Math.random() * 2);
    const bx = chunk.cx * 16 + 4 + Math.floor(Math.random() * 8), bz = chunk.cz * 16 + 4 + Math.floor(Math.random() * 8);
    for (let i = 0; i < n; i++) {
      const x = bx + Math.floor(Math.random() * 4) - 2, z = bz + Math.floor(Math.random() * 4) - 2;
      const y = this.world.topSolidY(x, z);
      if (y < 0) continue;
      const top = this.world.getBlock(x, y, z);
      if (top !== B.GRASS && top !== B.SNOW_LAYER && top !== B.SAND) continue;
      if (this.world.getBlock(x, y + 1, z) === B.WATER) continue;
      this.spawn(type, x + 0.5, y + 1, z + 0.5);
    }
  }

  /** 夜：暗い場所にゾンビ */
  trySpawnZombie(playerPos, daylight) {
    const zombies = this.mobs.filter(m => m.type === 'zombie').length;
    if (zombies >= 5 || daylight > 0.3) return;
    const ang = Math.random() * Math.PI * 2, r = 16 + Math.random() * 12;
    const x = Math.floor(playerPos.x + Math.cos(ang) * r), z = Math.floor(playerPos.z + Math.sin(ang) * r);
    const y = this.world.topSolidY(x, z);
    if (y < 0 || y > this.world.H - 3) return;
    if (this.world.getBlock(x, y + 1, z) === B.WATER) return;
    const [sky, blk] = this.world.getLight(x, y + 1, z);
    if (blk > 4) return;
    this.spawn('zombie', x + 0.5, y + 1, z + 0.5);
    this.audio.mob('zombie');
  }

  /** プレイヤーの視線とモブの当たり */
  raycast(origin, dir, maxDist) {
    let best = null, bestT = maxDist;
    for (const m of this.mobs) {
      if (m.dead) continue;
      const half = m.info.w / 2;
      const t = rayAABB(origin, dir, m.pos.x - half, m.pos.y, m.pos.z - half, m.pos.x + half, m.pos.y + m.info.h, m.pos.z + half);
      if (t !== null && t < bestT) { bestT = t; best = m; }
    }
    return best;
  }

  hit(mob, from, dmg = 4) {
    if (mob.dead) return;
    mob.hp -= dmg;
    mob.hurt = 0.4;
    const dx = mob.pos.x - from.x, dz = mob.pos.z - from.z;
    const l = Math.hypot(dx, dz) || 1;
    mob.vel.x += dx / l * 7; mob.vel.z += dz / l * 7; mob.vel.y = 5;
    this.audio.punch();
    if (mob.type === 'sheep' && !mob.sheared) {
      mob.sheared = true; mob.regrow = 90;
      if (this.onDrop) this.onDrop(B.WOOL_WHITE, 1 + Math.floor(Math.random() * 2), mob.pos);
      for (const m of mob.mats) m.color.multiplyScalar(0.85);
    }
    if (mob.type !== 'zombie') { mob.state = 'flee'; mob.timer = 3; mob.fleeFrom = { ...from }; this.audio.mob(mob.type); }
    if (mob.hp <= 0) { mob.dead = true; mob.deathTimer = 0.6; this.audio.mob(mob.type); if (mob.type === 'chicken' && this.onDrop) this.onDrop(B.APPLE, 0, mob.pos); }
  }

  update(dt, player, daylight, mode, loadedRadius) {
    this.time += dt;
    const world = this.world;
    // ゾンビ出現（サバイバルの夜）
    if (mode === 'survival') {
      this.zombieSpawnTimer -= dt;
      if (this.zombieSpawnTimer <= 0) { this.zombieSpawnTimer = 4 + Math.random() * 4; this.trySpawnZombie(player.pos, daylight); }
    }
    for (const mob of [...this.mobs]) {
      const dxp = player.pos.x - mob.pos.x, dzp = player.pos.z - mob.pos.z;
      const distP = Math.hypot(dxp, dzp);
      if (distP > loadedRadius * 16 + 8 || (mob.type === 'zombie' && distP > 48 && Math.random() < 0.01)) { this.remove(mob); continue; }
      if (mode === 'creative' && mob.type === 'zombie') { this.remove(mob); continue; }

      if (mob.dead) {
        mob.deathTimer -= dt;
        mob.group.rotation.z = (0.6 - Math.max(0, mob.deathTimer)) / 0.6 * Math.PI / 2;
        mob.group.scale.setScalar(Math.max(0.01, mob.deathTimer / 0.6));
        if (mob.deathTimer <= 0) this.remove(mob);
        continue;
      }
      if (mob.hurt > 0) mob.hurt -= dt;

      // AI
      mob.timer -= dt;
      let wantMove = 0;
      if (mob.type === 'zombie') {
        if (distP < 26) {
          mob.state = 'chase';
          mob.targetYaw = Math.atan2(-dxp, -dzp);
          wantMove = distP > 1.0 ? 1 : 0;
          mob.attackCd -= dt;
          if (distP < 1.5 && Math.abs(player.pos.y - mob.pos.y) < 1.6 && mob.attackCd <= 0 && !player.dead) {
            mob.attackCd = 1.1;
            if (this.onPlayerHit) this.onPlayerHit(mob, 3);
          }
        } else if (mob.timer <= 0) {
          mob.state = mob.state === 'walk' ? 'idle' : 'walk';
          mob.timer = 1 + Math.random() * 3;
          if (mob.state === 'walk') mob.targetYaw = Math.random() * Math.PI * 2;
        }
        if (mob.state === 'walk') wantMove = 0.5;
        // 日光で燃える
        const [sky] = world.getLight(Math.floor(mob.pos.x), Math.floor(mob.pos.y + 1), Math.floor(mob.pos.z));
        if (daylight > 0.75 && sky >= 13) {
          mob.burning += dt;
          if (mob.burning > 1) { mob.burning = 0; mob.hp -= 3; mob.hurt = 0.3; if (mob.hp <= 0) { mob.dead = true; mob.deathTimer = 0.6; } }
          if (this.onBurn) this.onBurn(mob);
        }
        if (Math.random() < dt * mob.info.voice && distP < 20) this.audio.mob('zombie');
      } else {
        if (mob.state === 'flee') {
          const fx = mob.pos.x - mob.fleeFrom.x, fz = mob.pos.z - mob.fleeFrom.z;
          mob.targetYaw = Math.atan2(-fx, -fz) + Math.PI;
          wantMove = 1.8;
          if (mob.timer <= 0) { mob.state = 'idle'; mob.timer = 1 + Math.random() * 2; }
        } else if (mob.timer <= 0) {
          if (mob.state === 'walk') { mob.state = 'idle'; mob.timer = 1.5 + Math.random() * 4; }
          else { mob.state = 'walk'; mob.timer = 1.5 + Math.random() * 3; mob.targetYaw = Math.random() * Math.PI * 2; }
        }
        if (mob.state === 'walk') wantMove = 1;
        if (mob.sheared) { mob.regrow -= dt; if (mob.regrow <= 0) { mob.sheared = false; for (const m of mob.mats) m.color.multiplyScalar(1 / 0.85); } }
        if (Math.random() < dt * mob.info.voice && distP < 24) this.audio.mob(mob.type);
      }

      // 向きをなめらかに
      let dyaw = mob.targetYaw - mob.yaw;
      dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      mob.yaw += dyaw * Math.min(1, dt * 6);

      // 物理
      const inW = inWater(world, mob.pos.x, mob.pos.y, mob.pos.z, mob.info.w / 2, mob.info.h);
      const speed = mob.info.speed * wantMove * (inW ? 0.6 : 1);
      const tvx = -Math.sin(mob.yaw) * speed, tvz = -Math.cos(mob.yaw) * speed;
      const k = 1 - Math.exp(-dt * (mob.onGround ? 8 : 2));
      mob.vel.x += (tvx - mob.vel.x) * k;
      mob.vel.z += (tvz - mob.vel.z) * k;
      if (inW) { mob.vel.y += (2.5 - mob.vel.y) * (1 - Math.exp(-dt * 3)); }
      else { mob.vel.y -= 32 * dt; if (mob.vel.y < -60) mob.vel.y = -60; }
      // 崖から落ちない（おとなしいモブ）
      if (mob.type !== 'zombie' && mob.onGround && wantMove > 0) {
        const ax = mob.pos.x + tvx * 0.4, az = mob.pos.z + tvz * 0.4;
        let drop = 0;
        for (let k2 = 1; k2 <= 4; k2++) { if (getDef(world.getBlock(Math.floor(ax), Math.floor(mob.pos.y) - k2, Math.floor(az))).collide) break; drop = k2; }
        if (drop >= 4) { mob.targetYaw += Math.PI * (0.5 + Math.random()); mob.vel.x *= 0.2; mob.vel.z *= 0.2; }
      }
      const res = moveWithCollision(world, mob.pos, mob.vel, mob.info.w, mob.info.h, dt);
      mob.onGround = res.onGround;
      if ((res.hitX || res.hitZ) && mob.onGround && wantMove > 0) mob.vel.y = 8.2;
      if (mob.pos.y < -5) { this.remove(mob); continue; }

      // 表示
      mob.group.position.set(mob.pos.x, mob.pos.y, mob.pos.z);
      mob.group.rotation.y = mob.yaw;
      const moving = Math.hypot(mob.vel.x, mob.vel.z);
      mob.walkPhase += dt * Math.min(12, moving * 7);
      const amp = Math.min(0.7, moving * 0.35);
      const s = Math.sin(mob.walkPhase);
      const p = mob.parts;
      if (p.leg0) p.leg0.rotation.x = s * amp;
      if (p.leg1) p.leg1.rotation.x = -s * amp;
      if (p.leg2) p.leg2.rotation.x = -s * amp;
      if (p.leg3) p.leg3.rotation.x = s * amp;
      if (p.arm0) { p.arm0.rotation.x = -Math.PI / 2 + Math.sin(this.time * 2) * 0.1; p.arm1.rotation.x = -Math.PI / 2 - Math.sin(this.time * 2) * 0.1; }
      if (p.wing0) { const flap = !mob.onGround && !inW ? Math.sin(this.time * 30) * 0.9 : 0; p.wing0.rotation.z = flap; p.wing1.rotation.z = -flap; }
      if (p.head && mob.type !== 'zombie') p.head.rotation.x = mob.state === 'idle' && Math.sin(this.time * 0.7 + mob.walkPhase) > 0.6 ? 0.5 : 0;

      // 明るさ
      const [sky, blk] = world.getLight(Math.floor(mob.pos.x), Math.floor(mob.pos.y + 0.5), Math.floor(mob.pos.z));
      const bright = Math.max(0.06, Math.max(sky / 15 * daylight, blk / 15 * 0.95));
      const hurtTint = mob.hurt > 0 ? 1 : 0;
      for (let i = 0; i < mob.mats.length; i++) {
        const m = mob.mats[i];
        const base = FACE_SHADE[i % 6] * (mob.sheared && mob.type === 'sheep' ? 0.85 : 1);
        m.color.setRGB(base * bright + hurtTint * 0.5, base * bright * (1 - hurtTint * 0.6), base * bright * (1 - hurtTint * 0.6));
      }
    }
  }
}

function rayAABB(o, d, x0, y0, z0, x1, y1, z1) {
  let tmin = 0, tmax = Infinity;
  const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z], lo = [x0, y0, z0], hi = [x1, y1, z1];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dd[i]) < 1e-8) { if (oo[i] < lo[i] || oo[i] > hi[i]) return null; continue; }
    let t1 = (lo[i] - oo[i]) / dd[i], t2 = (hi[i] - oo[i]) / dd[i];
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}
