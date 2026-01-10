/**
 * ダンジョン生成システム
 * BSP法を使用したランダムマップ生成
 */

// タイルタイプ
export const TILE = {
  WALL: 0,
  FLOOR: 1,
  CORRIDOR: 2,
  STAIRS_DOWN: 3,
  TRAP: 4,
  SHOP_FLOOR: 5
};

/**
 * ダンジョン生成クラス
 */
export class DungeonGenerator {
  constructor(width = 48, height = 32) {
    this.width = width;
    this.height = height;
  }

  /**
   * フロアを生成
   * @param {number} floor - 階層番号
   * @returns {Object} - 生成されたフロアデータ
   */
  generate(floor) {
    // タイルマップ初期化（全て壁）
    const tiles = Array(this.height).fill(null).map(() =>
      Array(this.width).fill(TILE.WALL)
    );

    // 部屋の数（階層に応じて調整）
    const roomCount = Math.min(3 + Math.floor(floor / 10), 8);

    // BSP法で空間分割
    const partitions = this.bspPartition(roomCount);

    // 各区画に部屋を生成
    const rooms = [];
    for (const partition of partitions) {
      const room = this.createRoom(partition);
      if (room) {
        rooms.push(room);
        this.carveRoom(tiles, room);
      }
    }

    // 通路で部屋を接続
    this.connectRooms(tiles, rooms);

    // 階段を配置（プレイヤーから遠い部屋）
    const stairsRoom = rooms[rooms.length - 1];
    const stairsPos = this.getRandomPosInRoom(stairsRoom);
    tiles[stairsPos.y][stairsPos.x] = TILE.STAIRS_DOWN;

    // プレイヤー開始位置（最初の部屋）
    const startRoom = rooms[0];
    const startPos = this.getRandomPosInRoom(startRoom);

    // 罠を配置（階層に応じて増加）
    const trapCount = Math.floor(floor / 5) + 1;
    const traps = this.placeTraps(tiles, rooms, trapCount, startPos, stairsPos);

    return {
      tiles,
      rooms,
      startPos,
      stairsPos,
      traps,
      width: this.width,
      height: this.height
    };
  }

  /**
   * BSP法で空間を分割
   */
  bspPartition(targetCount) {
    const MIN_SIZE = 8;
    const partitions = [{
      x: 1,
      y: 1,
      w: this.width - 2,
      h: this.height - 2
    }];

    while (partitions.length < targetCount) {
      // 最も大きい区画を分割
      partitions.sort((a, b) => (b.w * b.h) - (a.w * a.h));
      const largest = partitions[0];

      // 分割可能かチェック
      const canSplitH = largest.w >= MIN_SIZE * 2;
      const canSplitV = largest.h >= MIN_SIZE * 2;

      if (!canSplitH && !canSplitV) break;

      // 分割方向を決定
      let splitH;
      if (!canSplitH) splitH = false;
      else if (!canSplitV) splitH = true;
      else splitH = largest.w > largest.h ? true : (Math.random() < 0.5);

      // 分割実行
      partitions.shift();

      if (splitH) {
        const split = MIN_SIZE + Math.floor(Math.random() * (largest.w - MIN_SIZE * 2 + 1));
        partitions.push(
          { x: largest.x, y: largest.y, w: split, h: largest.h },
          { x: largest.x + split, y: largest.y, w: largest.w - split, h: largest.h }
        );
      } else {
        const split = MIN_SIZE + Math.floor(Math.random() * (largest.h - MIN_SIZE * 2 + 1));
        partitions.push(
          { x: largest.x, y: largest.y, w: largest.w, h: split },
          { x: largest.x, y: largest.y + split, w: largest.w, h: largest.h - split }
        );
      }
    }

    return partitions;
  }

  /**
   * 区画内に部屋を生成
   */
  createRoom(partition) {
    const MIN_ROOM = 4;
    const PADDING = 1;

    const maxW = partition.w - PADDING * 2;
    const maxH = partition.h - PADDING * 2;

    if (maxW < MIN_ROOM || maxH < MIN_ROOM) return null;

    const w = MIN_ROOM + Math.floor(Math.random() * (maxW - MIN_ROOM + 1));
    const h = MIN_ROOM + Math.floor(Math.random() * (maxH - MIN_ROOM + 1));
    const x = partition.x + PADDING + Math.floor(Math.random() * (maxW - w + 1));
    const y = partition.y + PADDING + Math.floor(Math.random() * (maxH - h + 1));

    return { x, y, w, h, centerX: x + Math.floor(w / 2), centerY: y + Math.floor(h / 2) };
  }

  /**
   * タイルマップに部屋を刻む
   */
  carveRoom(tiles, room) {
    for (let dy = 0; dy < room.h; dy++) {
      for (let dx = 0; dx < room.w; dx++) {
        const ty = room.y + dy;
        const tx = room.x + dx;
        if (ty >= 0 && ty < this.height && tx >= 0 && tx < this.width) {
          tiles[ty][tx] = TILE.FLOOR;
        }
      }
    }
  }

  /**
   * 部屋同士を通路で接続
   */
  connectRooms(tiles, rooms) {
    for (let i = 0; i < rooms.length - 1; i++) {
      const roomA = rooms[i];
      const roomB = rooms[i + 1];
      this.carveCorridor(tiles, roomA.centerX, roomA.centerY, roomB.centerX, roomB.centerY);
    }
  }

  /**
   * L字型の通路を刻む
   */
  carveCorridor(tiles, x1, y1, x2, y2) {
    let x = x1, y = y1;

    // まず水平に移動
    while (x !== x2) {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        if (tiles[y][x] === TILE.WALL) {
          tiles[y][x] = TILE.CORRIDOR;
        }
      }
      x += x < x2 ? 1 : -1;
    }

    // 次に垂直に移動
    while (y !== y2) {
      if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        if (tiles[y][x] === TILE.WALL) {
          tiles[y][x] = TILE.CORRIDOR;
        }
      }
      y += y < y2 ? 1 : -1;
    }

    // 最後のタイル
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      if (tiles[y][x] === TILE.WALL) {
        tiles[y][x] = TILE.CORRIDOR;
      }
    }
  }

  /**
   * 部屋内のランダムな位置を取得
   */
  getRandomPosInRoom(room) {
    return {
      x: room.x + 1 + Math.floor(Math.random() * (room.w - 2)),
      y: room.y + 1 + Math.floor(Math.random() * (room.h - 2))
    };
  }

  /**
   * 罠を配置
   */
  placeTraps(tiles, rooms, count, startPos, stairsPos) {
    const traps = [];
    let attempts = 0;

    while (traps.length < count && attempts < 100) {
      attempts++;
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      const pos = this.getRandomPosInRoom(room);

      // 開始位置と階段を避ける
      if ((pos.x === startPos.x && pos.y === startPos.y) ||
          (pos.x === stairsPos.x && pos.y === stairsPos.y)) {
        continue;
      }

      // 既存の罠を避ける
      if (traps.some(t => t.x === pos.x && t.y === pos.y)) {
        continue;
      }

      // 罠の種類をランダムに選択
      const trapTypes = [
        'pitfall', 'mine', 'poison', 'sleep', 'spin',
        'alert', 'rock', 'curse', 'rot', 'disarm'
      ];
      const trapType = trapTypes[Math.floor(Math.random() * trapTypes.length)];

      traps.push({ x: pos.x, y: pos.y, type: trapType, visible: false });
      tiles[pos.y][pos.x] = TILE.TRAP;
    }

    return traps;
  }
}

/**
 * 罠の効果定義
 */
export const TRAP_EFFECTS = {
  pitfall: { name: '落とし穴', effect: 'next_floor' },
  mine: { name: '地雷', effect: 'explode_50' },
  poison: { name: '毒矢の罠', effect: 'reduce_str' },
  sleep: { name: '眠りガス', effect: 'sleep_5' },
  spin: { name: '回転板', effect: 'confuse_10' },
  alert: { name: '鳴子', effect: 'alert_enemies' },
  rock: { name: '落石の罠', effect: 'damage_15' },
  curse: { name: '呪いの罠', effect: 'curse_equip' },
  rot: { name: 'おにぎりの罠', effect: 'rot_food' },
  disarm: { name: '装備外しの罠', effect: 'unequip' }
};
