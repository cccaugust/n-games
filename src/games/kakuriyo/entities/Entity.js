/**
 * エンティティ基底クラス
 * プレイヤーとモンスターの共通処理
 */

export class Entity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.hp = 10;
    this.maxHp = 10;
    this.attack = 1;
    this.defense = 0;

    // 状態異常
    this.statusEffects = {
      confused: 0,   // 混乱ターン
      sleeping: 0,   // 睡眠ターン
      paralyzed: 0,  // 金縛りターン
      slowed: 0,     // 鈍足ターン
      sealed: false, // 特殊能力封印
      blind: 0       // 目潰しターン
    };

    this.isAlive = true;
  }

  /**
   * ダメージを受ける
   */
  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.isAlive = false;
    }
    // 睡眠解除
    if (this.statusEffects.sleeping > 0) {
      this.statusEffects.sleeping = 0;
    }
    // 金縛り解除
    if (this.statusEffects.paralyzed > 0) {
      this.statusEffects.paralyzed = 0;
    }
    return amount;
  }

  /**
   * 回復する
   */
  heal(amount) {
    const healed = Math.min(this.maxHp - this.hp, amount);
    this.hp += healed;
    return healed;
  }

  /**
   * 行動可能かチェック
   */
  canAct() {
    if (this.statusEffects.sleeping > 0) return false;
    if (this.statusEffects.paralyzed > 0) return false;
    return true;
  }

  /**
   * ターン終了時の処理
   */
  endTurn() {
    // 状態異常のターン減少
    if (this.statusEffects.confused > 0) this.statusEffects.confused--;
    if (this.statusEffects.sleeping > 0) this.statusEffects.sleeping--;
    if (this.statusEffects.slowed > 0) this.statusEffects.slowed--;
    if (this.statusEffects.blind > 0) this.statusEffects.blind--;
    // 金縛りは被ダメージで解除のためここでは減らさない
  }

  /**
   * 混乱状態のランダム方向取得
   */
  getConfusedDirection() {
    const dx = [-1, 0, 1][Math.floor(Math.random() * 3)];
    const dy = [-1, 0, 1][Math.floor(Math.random() * 3)];
    return { dx, dy };
  }

  /**
   * 鈍足チェック（2ターンに1回しか動けない）
   */
  isSlowed() {
    return this.statusEffects.slowed > 0;
  }
}

/**
 * 方向定数
 */
export const DIRECTIONS = {
  NONE: { dx: 0, dy: 0 },
  UP: { dx: 0, dy: -1 },
  DOWN: { dx: 0, dy: 1 },
  LEFT: { dx: -1, dy: 0 },
  RIGHT: { dx: 1, dy: 0 },
  UP_LEFT: { dx: -1, dy: -1 },
  UP_RIGHT: { dx: 1, dy: -1 },
  DOWN_LEFT: { dx: -1, dy: 1 },
  DOWN_RIGHT: { dx: 1, dy: 1 }
};

/**
 * 8方向配列
 */
export const DIR8 = [
  { dx: 0, dy: -1 },  // 上
  { dx: 1, dy: -1 },  // 右上
  { dx: 1, dy: 0 },   // 右
  { dx: 1, dy: 1 },   // 右下
  { dx: 0, dy: 1 },   // 下
  { dx: -1, dy: 1 },  // 左下
  { dx: -1, dy: 0 },  // 左
  { dx: -1, dy: -1 }  // 左上
];
