/**
 * プレイヤークラス
 * 主人公「影丸」の管理
 */

import { Entity, DIR8 } from './Entity.js';
import { TILE } from '../dungeon/DungeonGenerator.js';

export class Player extends Entity {
  constructor(x, y) {
    super(x, y);

    // 初期ステータス（企画書準拠）
    this.name = '影丸';
    this.level = 1;
    this.hp = 15;
    this.maxHp = 15;
    this.strength = 8;       // ちから
    this.maxStrength = 8;
    this.satiety = 100;      // 満腹度
    this.maxSatiety = 100;
    this.exp = 0;
    this.gold = 0;

    // 装備
    this.equipment = {
      weapon: null,
      shield: null,
      ring: null
    };

    // 所持品（最大20個）
    this.inventory = [];
    this.maxInventory = 20;

    // 自然回復カウンター
    this.regenCounter = 0;

    // 攻撃力・防御力計算用キャッシュ
    this._attackPower = null;
    this._defensePower = null;

    // スプライト
    this.sprite = 'kagemaru_32';
  }

  /**
   * 攻撃力を計算
   */
  getAttackPower() {
    let power = this.strength;
    if (this.equipment.weapon) {
      power += this.equipment.weapon.attack + (this.equipment.weapon.enhancement || 0);
    }
    // ちからの指輪効果
    if (this.equipment.ring?.effect === 'strength_3') {
      power += 3;
    }
    return power;
  }

  /**
   * 防御力を計算
   */
  getDefensePower() {
    let power = 0;
    if (this.equipment.shield) {
      power += this.equipment.shield.defense + (this.equipment.shield.enhancement || 0);
    }
    return power;
  }

  /**
   * 経験値を獲得
   */
  gainExp(amount) {
    this.exp += amount;
    const requiredExp = this.level * this.level * 10;

    // レベルアップチェック
    while (this.exp >= requiredExp && this.level < 99) {
      this.exp -= requiredExp;
      this.levelUp();
    }
  }

  /**
   * レベルアップ処理
   */
  levelUp() {
    this.level++;
    this.maxHp += 5;
    this.hp = Math.min(this.hp + 5, this.maxHp);

    // ちからがランダムで上がる（0〜1）
    if (Math.random() < 0.5) {
      this.maxStrength++;
      this.strength = Math.min(this.strength + 1, this.maxStrength);
    }

    return true;
  }

  /**
   * 満腹度を減らす
   */
  decreaseSatiety(amount = 0.1) {
    // ハラヘラズの指輪チェック
    if (this.equipment.ring?.effect === 'no_hunger') {
      return;
    }

    // 重装盾効果
    if (this.equipment.shield?.effect === 'hunger_up') {
      amount *= 1.5;
    }

    this.satiety = Math.max(0, this.satiety - amount);

    // 満腹度0でHP減少
    if (this.satiety === 0) {
      this.takeDamage(1);
    }
  }

  /**
   * 自然回復処理
   */
  naturalRegen() {
    if (this.hp >= this.maxHp) return 0;

    // 回復間隔 = max(1, 50 - レベル × 2)
    let regenInterval = Math.max(1, 50 - this.level * 2);

    // 回復の指輪効果
    if (this.equipment.ring?.effect === 'regen_2x') {
      regenInterval = Math.floor(regenInterval / 2);
    }

    this.regenCounter++;
    if (this.regenCounter >= regenInterval) {
      this.regenCounter = 0;
      this.hp = Math.min(this.hp + 1, this.maxHp);
      return 1;
    }
    return 0;
  }

  /**
   * アイテムを拾う
   */
  pickupItem(item) {
    if (this.inventory.length >= this.maxInventory) {
      return false;
    }
    this.inventory.push(item);
    return true;
  }

  /**
   * アイテムを使う
   */
  useItem(index) {
    if (index < 0 || index >= this.inventory.length) return null;
    const item = this.inventory[index];
    this.inventory.splice(index, 1);
    return item;
  }

  /**
   * 装備する
   */
  equip(item) {
    if (item.type === 'weapon') {
      const old = this.equipment.weapon;
      this.equipment.weapon = item;
      return old;
    } else if (item.type === 'shield') {
      const old = this.equipment.shield;
      this.equipment.shield = item;
      return old;
    } else if (item.type === 'ring') {
      const old = this.equipment.ring;
      this.equipment.ring = item;
      return old;
    }
    return null;
  }

  /**
   * 装備を外す
   */
  unequip(slot) {
    const item = this.equipment[slot];
    if (item && item.isCursed) return null; // 呪われている場合は外せない
    this.equipment[slot] = null;
    return item;
  }

  /**
   * 移動可能かチェック
   */
  canMoveTo(tiles, x, y, monsters = []) {
    if (x < 0 || x >= tiles[0].length || y < 0 || y >= tiles.length) {
      return false;
    }
    const tile = tiles[y][x];
    if (tile === TILE.WALL) return false;

    // モンスターがいるかチェック
    if (monsters.some(m => m.isAlive && m.x === x && m.y === y)) {
      return false;
    }

    return true;
  }

  /**
   * 移動する
   */
  moveTo(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * 死亡時の処理
   */
  onDeath() {
    this.isAlive = false;
    // ローグライクでは持ち物全消失
    this.inventory = [];
    this.equipment = { weapon: null, shield: null, ring: null };
  }

  /**
   * リスタート（レベル1に戻る）
   */
  restart() {
    this.level = 1;
    this.hp = 15;
    this.maxHp = 15;
    this.strength = 8;
    this.maxStrength = 8;
    this.satiety = 100;
    this.exp = 0;
    this.gold = 0;
    this.inventory = [];
    this.equipment = { weapon: null, shield: null, ring: null };
    this.isAlive = true;
    this.statusEffects = {
      confused: 0,
      sleeping: 0,
      paralyzed: 0,
      slowed: 0,
      sealed: false,
      blind: 0
    };
  }

  /**
   * 視界内の位置を取得
   */
  getVisibleTiles(tiles, rooms) {
    const visible = new Set();

    // 現在いる部屋を探す
    const currentRoom = rooms.find(room =>
      this.x >= room.x && this.x < room.x + room.w &&
      this.y >= room.y && this.y < room.y + room.h
    );

    if (currentRoom) {
      // 部屋内なら部屋全体が見える
      for (let dy = -1; dy <= currentRoom.h; dy++) {
        for (let dx = -1; dx <= currentRoom.w; dx++) {
          const tx = currentRoom.x + dx;
          const ty = currentRoom.y + dy;
          if (tx >= 0 && tx < tiles[0].length && ty >= 0 && ty < tiles.length) {
            visible.add(`${tx},${ty}`);
          }
        }
      }
    } else {
      // 通路なら周囲1マスのみ
      for (const dir of DIR8) {
        const tx = this.x + dir.dx;
        const ty = this.y + dir.dy;
        if (tx >= 0 && tx < tiles[0].length && ty >= 0 && ty < tiles.length) {
          visible.add(`${tx},${ty}`);
        }
      }
      visible.add(`${this.x},${this.y}`);
    }

    return visible;
  }
}
