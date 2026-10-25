/**
 * プレイヤー：移動の物理、体力、空気、落下ダメージ
 */
import { moveWithCollision, inWater, collides } from './physics.js';
import { getDef } from './blocks.js';

export const PLAYER_W = 0.6;
export const PLAYER_H = 1.8;
export const EYE_HEIGHT = 1.62;
const GRAVITY = 32;
const JUMP_VEL = 8.6;

export class Player {
  constructor(mode) {
    this.mode = mode; // 'creative' | 'survival'
    this.pos = { x: 0, y: 70, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.yaw = 0;      // 左右（ラジアン）
    this.pitch = 0;    // 上下
    this.onGround = false;
    this.inWater = false;
    this.headInWater = false;
    this.flying = false;
    this.sneaking = false;
    this.sprinting = false;
    this.health = 20;
    this.maxHealth = 20;
    this.air = 1;        // 0..1
    this.fallStart = null;
    this.hurtTimer = 0;  // ダメージ演出
    this.regenTimer = 0;
    this.lastDamageTime = -99;
    this.autoJumpCooldown = 0;
    this.dead = false;
    this.fovBoost = 0;
    this.events = [];
  }

  eye() { return { x: this.pos.x, y: this.pos.y + (this.sneaking ? EYE_HEIGHT - 0.3 : EYE_HEIGHT), z: this.pos.z }; }

  /** 視線ベクトル */
  dir() {
    const cp = Math.cos(this.pitch);
    return { x: -Math.sin(this.yaw) * cp, y: Math.sin(this.pitch), z: -Math.cos(this.yaw) * cp };
  }

  look(dx, dy) {
    this.yaw -= dx;
    this.pitch -= dy;
    const lim = Math.PI / 2 - 0.01;
    if (this.pitch > lim) this.pitch = lim;
    if (this.pitch < -lim) this.pitch = -lim;
  }

  /**
   * @param {number} dt
   * @param {{move:{x:number,z:number}, jump:boolean, sneak:boolean, sprint:boolean}} input
   * @param {import('./world.js').World} world
   * @param {{autoJump:boolean, time:number}} opts
   */
  update(dt, input, world, opts) {
    if (this.dead) return;
    const half = PLAYER_W / 2;
    this.inWater = inWater(world, this.pos.x, this.pos.y, this.pos.z, half, PLAYER_H);
    const eye = this.eye();
    this.headInWater = world.getBlock(Math.floor(eye.x), Math.floor(eye.y), Math.floor(eye.z)) === 14;
    this.sneaking = !!input.sneak && !this.flying;
    this.sprinting = !!input.sprint && (input.move.z < -0.3) && !this.sneaking;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.autoJumpCooldown > 0) this.autoJumpCooldown -= dt;

    // 移動方向（カメラの向き基準）
    const mx = input.move.x, mz = input.move.z; // x: 右 +、z: 前 -
    const len = Math.hypot(mx, mz);
    let fx = 0, fz = 0;
    if (len > 0.001) {
      const nx = mx / Math.max(1, len), nz = mz / Math.max(1, len);
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      // 前方ベクトル (-sin yaw, -cos yaw)、右ベクトル (cos yaw, -sin yaw)
      fx = c * nx + (-s) * nz;
      fz = -s * nx + (-c) * nz;
    }

    let speed;
    if (this.flying) speed = this.sprinting ? 21 : 10.5;
    else if (this.inWater) speed = 2.6;
    else if (this.sneaking) speed = 1.4;
    else if (this.sprinting) speed = 5.6;
    else speed = 4.3;

    const targetVx = fx * speed, targetVz = fz * speed;
    const control = this.flying ? 10 : this.onGround ? 14 : this.inWater ? 6 : 4;
    const k = 1 - Math.exp(-dt * control);
    this.vel.x += (targetVx - this.vel.x) * k;
    this.vel.z += (targetVz - this.vel.z) * k;

    // 縦
    if (this.flying) {
      let ty = 0;
      if (input.jump) ty = this.sprinting ? 14 : 8;
      if (input.sneak) ty = -(this.sprinting ? 14 : 8);
      this.vel.y += (ty - this.vel.y) * (1 - Math.exp(-dt * 10));
    } else if (this.inWater) {
      this.vel.y -= 10 * dt;
      if (input.jump) this.vel.y += 24 * dt;
      this.vel.y *= Math.exp(-dt * 2.4);
      if (this.vel.y < -3.5) this.vel.y = -3.5;
      if (this.vel.y > 3.2) this.vel.y = 3.2;
      this.fallStart = null;
      // 水面で縁に上がる
      if (input.jump && (input.move.x !== 0 || input.move.z !== 0)) {
        const aheadX = this.pos.x + fx * 0.5, aheadZ = this.pos.z + fz * 0.5;
        if (collides(world, aheadX, this.pos.y + 0.1, aheadZ, half, 0.6) && !collides(world, aheadX, this.pos.y + 1.05, aheadZ, half, PLAYER_H)) this.vel.y = 5.5;
      }
    } else {
      this.vel.y -= GRAVITY * dt;
      if (this.vel.y < -78) this.vel.y = -78;
      if (input.jump && this.onGround) {
        this.vel.y = JUMP_VEL;
        this.onGround = false;
        this.events.push('jump');
      }
    }

    // スニーク中は端から落ちない
    if (this.sneaking && this.onGround && !this.inWater) {
      const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
      if (!collides(world, nx, this.pos.y - 0.6, this.pos.z, half, 0.6)) this.vel.x = 0;
      if (!collides(world, this.pos.x, this.pos.y - 0.6, nz, half, 0.6)) this.vel.z = 0;
    }

    const wasOnGround = this.onGround;
    const prevY = this.pos.y;
    const res = moveWithCollision(world, this.pos, this.vel, PLAYER_W, PLAYER_H, dt);
    this.onGround = res.onGround;

    // 落下ダメージ
    if (!this.flying && !this.inWater) {
      if (!this.onGround && this.fallStart === null && this.vel.y < 0) this.fallStart = prevY;
      if (this.onGround && this.fallStart !== null) {
        const dist = this.fallStart - this.pos.y;
        this.fallStart = null;
        if (dist > 3.2 && this.mode === 'survival') this.damage(Math.round(dist - 3), 'fall');
        if (dist > 1.2) this.events.push('land');
      }
    } else this.fallStart = null;
    if (this.onGround && this.fallStart !== null && this.vel.y >= 0) this.fallStart = null;
    if (this.flying && this.onGround && input.sneak) this.flying = false;

    // オートジャンプ（段差を自動で上る）
    if (opts.autoJump && (res.hitX || res.hitZ) && this.onGround && !this.sneaking && !this.flying && this.autoJumpCooldown <= 0 && len > 0.3) {
      const stepX = this.pos.x + fx * 0.45, stepZ = this.pos.z + fz * 0.45;
      if (!collides(world, stepX, this.pos.y + 1.02, stepZ, half, PLAYER_H)) {
        this.vel.y = JUMP_VEL; this.onGround = false; this.autoJumpCooldown = 0.3; this.events.push('jump');
      }
    }

    // 息
    if (this.headInWater && this.mode === 'survival') {
      this.air -= dt / 15;
      if (this.air <= 0) { this.air = 0; this.drownTimer = (this.drownTimer || 0) + dt; if (this.drownTimer > 1) { this.drownTimer = 0; this.damage(2, 'drown'); } }
    } else { this.air = Math.min(1, this.air + dt / 3); this.drownTimer = 0; }

    // 回復（ダメージを受けてから少し待つ）
    if (this.mode === 'survival' && this.health < this.maxHealth && opts.time - this.lastDamageTime > 6) {
      this.regenTimer += dt;
      if (this.regenTimer > 4) { this.regenTimer = 0; this.health = Math.min(this.maxHealth, this.health + 1); }
    }

    // 奈落
    if (this.pos.y < -10) this.damage(100, 'void');

    // 視野ブースト
    const targetFov = this.sprinting && len > 0.3 ? 1 : 0;
    this.fovBoost += (targetFov - this.fovBoost) * (1 - Math.exp(-dt * 8));
  }

  damage(amount, cause, time = 0) {
    if (this.mode !== 'survival' || this.dead || amount <= 0) return;
    this.health -= amount;
    this.hurtTimer = 0.5;
    this.regenTimer = 0;
    this.lastDamageTime = this._now || 0;
    this.events.push('hurt');
    if (this.health <= 0) { this.health = 0; this.dead = true; this.events.push('death'); }
  }

  heal(amount) { this.health = Math.min(this.maxHealth, this.health + amount); }

  knockback(dx, dz, power = 6) {
    const l = Math.hypot(dx, dz) || 1;
    this.vel.x += dx / l * power; this.vel.z += dz / l * power; this.vel.y = Math.max(this.vel.y, 4.5);
  }

  respawn(spawn) {
    this.pos = { ...spawn };
    this.vel = { x: 0, y: 0, z: 0 };
    this.health = this.maxHealth;
    this.air = 1;
    this.dead = false;
    this.fallStart = null;
    this.flying = false;
  }

  toJSON() {
    return { x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw, pitch: this.pitch, health: this.health, flying: this.flying };
  }

  fromJSON(d) {
    if (!d) return;
    this.pos = { x: d.x, y: d.y, z: d.z };
    this.yaw = d.yaw || 0; this.pitch = d.pitch || 0;
    if (typeof d.health === 'number') this.health = d.health;
    this.flying = !!d.flying && this.mode === 'creative';
  }
}
