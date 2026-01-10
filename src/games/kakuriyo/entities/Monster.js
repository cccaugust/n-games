/**
 * モンスタークラス
 * 敵キャラクターの管理とAI
 */

import { Entity, DIR8 } from './Entity.js';
import { TILE } from '../dungeon/DungeonGenerator.js';

export class Monster extends Entity {
  constructor(x, y, data) {
    super(x, y);

    this.id = data.id;
    this.name = data.name;
    this.hp = data.hp;
    this.maxHp = data.hp;
    this.attack = data.attack;
    this.defense = data.defense;
    this.exp = data.exp;
    this.special = data.special;
    this.sprite = data.sprite;
    this.isBoss = data.isBoss || false;

    // AI状態
    this.state = 'wander'; // wander, chase, immobile
    this.targetX = null;
    this.targetY = null;
    this.lastSeenPlayer = null;
    this.alertCounter = 0;

    // 特殊能力フラグ
    this.isImmobile = data.special === 'immobile';
    this.hasBeenAttacked = false;

    // 倍速フラグ
    this.isDoubleSpeed = data.special?.includes('fast') || false;
    this.turnCounter = 0;
  }

  /**
   * AIの行動決定
   */
  act(player, tiles, monsters, game) {
    if (!this.isAlive || !this.canAct()) return null;

    // ぬりかべ系: 攻撃されるまで動かない
    if (this.isImmobile && !this.hasBeenAttacked) {
      return { type: 'wait' };
    }

    // 混乱状態
    if (this.statusEffects.confused > 0) {
      return this.actConfused(tiles, monsters, player);
    }

    // プレイヤーとの距離
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    // 視界内にプレイヤーがいるか
    const canSeePlayer = this.canSeePlayer(player, tiles);

    if (canSeePlayer) {
      this.state = 'chase';
      this.lastSeenPlayer = { x: player.x, y: player.y };
    } else if (this.state === 'chase' && this.lastSeenPlayer) {
      // プレイヤーを見失っても最後の位置に向かう
      if (this.x === this.lastSeenPlayer.x && this.y === this.lastSeenPlayer.y) {
        this.state = 'wander';
        this.lastSeenPlayer = null;
      }
    }

    // 隣接している場合は攻撃
    if (dist === 1 || (Math.abs(dx) === 1 && Math.abs(dy) === 1 && dist === 2)) {
      // 隣接（斜め含む）
      const adjX = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
      if (adjX) {
        return { type: 'attack', target: player };
      }
    }

    // 2マス攻撃（槍系）
    if (this.special === 'range_2' && dist === 2 && (dx === 0 || dy === 0)) {
      return { type: 'ranged_attack', target: player };
    }

    // 炎攻撃
    if (this.special?.startsWith('fire_') && canSeePlayer && this.isInLine(player)) {
      const damage = parseInt(this.special.split('_')[1]);
      return { type: 'fire_attack', target: player, damage };
    }

    // 移動
    return this.moveTowardTarget(player, tiles, monsters);
  }

  /**
   * 混乱時の行動
   */
  actConfused(tiles, monsters, player) {
    const dir = this.getConfusedDirection();
    const nx = this.x + dir.dx;
    const ny = this.y + dir.dy;

    if (this.canMoveTo(tiles, nx, ny, monsters, player)) {
      return { type: 'move', dx: dir.dx, dy: dir.dy };
    }

    // 攻撃先にプレイヤーまたはモンスターがいれば攻撃
    if (player.x === nx && player.y === ny) {
      return { type: 'attack', target: player };
    }
    const targetMonster = monsters.find(m => m.isAlive && m !== this && m.x === nx && m.y === ny);
    if (targetMonster) {
      return { type: 'attack', target: targetMonster };
    }

    return { type: 'wait' };
  }

  /**
   * ターゲットに向かって移動
   */
  moveTowardTarget(player, tiles, monsters) {
    const target = this.state === 'chase' && this.lastSeenPlayer
      ? this.lastSeenPlayer
      : { x: player.x, y: player.y };

    // A*の簡易版: 最も近づける方向を選ぶ
    let bestDir = null;
    let bestDist = Infinity;

    for (const dir of DIR8) {
      const nx = this.x + dir.dx;
      const ny = this.y + dir.dy;

      if (!this.canMoveTo(tiles, nx, ny, monsters, player)) continue;

      const dist = Math.abs(target.x - nx) + Math.abs(target.y - ny);
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }

    if (bestDir) {
      return { type: 'move', dx: bestDir.dx, dy: bestDir.dy };
    }

    return { type: 'wait' };
  }

  /**
   * 移動可能かチェック
   */
  canMoveTo(tiles, x, y, monsters, player) {
    if (x < 0 || x >= tiles[0].length || y < 0 || y >= tiles.length) {
      return false;
    }

    const tile = tiles[y][x];

    // 壁抜け能力
    if (this.special === 'wall_pass' || this.special === 'wall_pass_fast') {
      // 壁の中でも移動可能
    } else {
      if (tile === TILE.WALL) return false;
    }

    // プレイヤーの位置
    if (player.x === x && player.y === y) return false;

    // 他のモンスターの位置
    if (monsters.some(m => m.isAlive && m !== this && m.x === x && m.y === y)) {
      return false;
    }

    return true;
  }

  /**
   * プレイヤーが見えるかチェック（簡易視界）
   */
  canSeePlayer(player, tiles) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));

    // 視界距離（部屋内10マス、通路3マス想定）
    if (dist > 10) return false;

    // 直線上に壁がないかチェック（簡易レイキャスト）
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    if (steps === 0) return true;

    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 1; i < steps; i++) {
      const checkX = Math.round(this.x + stepX * i);
      const checkY = Math.round(this.y + stepY * i);
      if (tiles[checkY]?.[checkX] === TILE.WALL) {
        return false;
      }
    }

    return true;
  }

  /**
   * プレイヤーと直線上にいるかチェック（炎攻撃用）
   */
  isInLine(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    // 縦横斜めの直線上
    return dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
  }

  /**
   * ダメージを受けた時
   */
  takeDamage(amount) {
    const result = super.takeDamage(amount);
    this.hasBeenAttacked = true;
    if (this.isImmobile && this.isAlive) {
      this.isImmobile = false; // 動き出す
    }
    return result;
  }

  /**
   * 特殊能力を発動
   */
  useSpecialAbility(player, game) {
    if (this.statusEffects.sealed) return null;

    // 特殊能力の処理はgame.jsで実装
    return this.special;
  }
}

/**
 * モンスターファクトリー
 */
export function createMonster(x, y, monsterData) {
  return new Monster(x, y, monsterData);
}
