/**
 * レンダラー
 * キャンバスへの描画処理
 */

import { TILE } from '../dungeon/DungeonGenerator.js';

// タイルサイズ
const TILE_SIZE = 32;

// カラーパレット
const COLORS = {
  wall: '#2a2a3a',
  wallLight: '#3a3a4a',
  floor: '#4a4a3a',
  floorLight: '#5a5a4a',
  corridor: '#3a3a2a',
  stairs: '#6a6a5a',
  stairsArrow: '#aaa',
  trap: '#4a3a3a',
  trapVisible: '#6a4a4a',
  fog: 'rgba(0,0,0,0.7)',
  explored: 'rgba(0,0,0,0.4)'
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprites = {};
    this.spritesLoaded = false;

    // カメラ位置
    this.cameraX = 0;
    this.cameraY = 0;

    // 表示サイズ
    this.viewWidth = 15;
    this.viewHeight = 11;

    // 探索済みマップ
    this.explored = null;

    // 現在のフェーズ（色テーマ用）
    this.currentPhase = null;
    this.phaseColors = { ...COLORS };

    this.resize();
  }

  /**
   * フェーズを設定（色テーマを変更）
   */
  setPhase(phase) {
    this.currentPhase = phase;
    if (phase) {
      this.phaseColors = {
        ...COLORS,
        wall: phase.wallColor || COLORS.wall,
        wallLight: this.lightenColor(phase.wallColor || COLORS.wall, 20),
        floor: phase.floorColor || COLORS.floor,
        floorLight: this.lightenColor(phase.floorColor || COLORS.floor, 20),
        corridor: this.darkenColor(phase.floorColor || COLORS.floor, 10),
        fog: phase.fogColor || COLORS.fog,
        ambient: phase.ambientColor || 'transparent'
      };
    } else {
      this.phaseColors = { ...COLORS };
    }
  }

  /**
   * 色を明るくする
   */
  lightenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * 色を暗くする
   */
  darkenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * キャンバスのリサイズ
   */
  resize() {
    const container = this.canvas.parentElement;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    // アスペクト比を維持しつつ最大サイズに
    const targetW = this.viewWidth * TILE_SIZE;
    const targetH = this.viewHeight * TILE_SIZE;

    const scale = Math.min(containerW / targetW, containerH / targetH);

    this.canvas.width = targetW;
    this.canvas.height = targetH;
    this.canvas.style.width = `${Math.floor(targetW * scale)}px`;
    this.canvas.style.height = `${Math.floor(targetH * scale)}px`;

    // ピクセルパーフェクト
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * スプライトをロード（samples.jsonから）
   */
  async loadSprites() {
    try {
      const res = await fetch('/pages/pixel-art-maker/samples.json');
      const data = await res.json();

      for (const sample of data.samples) {
        // Base64からピクセルデータを復元
        // framesがある場合はframes[0].pixelsB64を使用
        let pixelsB64 = null;
        if (sample.frames && sample.frames.length > 0 && sample.frames[0].pixelsB64) {
          pixelsB64 = sample.frames[0].pixelsB64;
        } else if (sample.pixelsB64) {
          pixelsB64 = sample.pixelsB64;
        }

        if (!pixelsB64) continue;

        const pixels = this.base64ToPixels(pixelsB64);
        if (!pixels) continue;

        // キャンバスを作成してピクセルデータを描画
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sample.width;
        tempCanvas.height = sample.height;
        const tempCtx = tempCanvas.getContext('2d');

        // ImageDataを作成（Uint32ArrayからUint8ClampedArrayに変換）
        const imageData = tempCtx.createImageData(sample.width, sample.height);
        const uint8 = new Uint8Array(pixels.buffer);

        // samples.jsonは0xAARRGGBB形式（リトルエンディアン）
        // バイト順: [B, G, R, A] → 必要な順: [R, G, B, A]
        for (let i = 0; i < uint8.length; i += 4) {
          imageData.data[i] = uint8[i + 2];     // R
          imageData.data[i + 1] = uint8[i + 1]; // G
          imageData.data[i + 2] = uint8[i];     // B
          imageData.data[i + 3] = uint8[i + 3]; // A
        }

        tempCtx.putImageData(imageData, 0, 0);
        this.sprites[sample.id] = tempCanvas;
      }

      this.spritesLoaded = true;
      console.log('スプライト読み込み完了:', Object.keys(this.sprites).length, '個');
    } catch (e) {
      console.warn('スプライトの読み込みに失敗:', e);
      this.spritesLoaded = true; // 失敗しても続行
    }
  }

  /**
   * Base64をUint32Arrayに変換
   */
  base64ToPixels(base64) {
    if (!base64) return null;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Uint32Array(bytes.buffer);
    } catch (e) {
      return null;
    }
  }

  /**
   * 探索済みマップを初期化
   */
  initExplored(width, height) {
    this.explored = Array(height).fill(null).map(() => Array(width).fill(false));
  }

  /**
   * カメラをプレイヤーに追従
   */
  updateCamera(player, mapWidth, mapHeight) {
    // プレイヤーを中心に
    this.cameraX = player.x - Math.floor(this.viewWidth / 2);
    this.cameraY = player.y - Math.floor(this.viewHeight / 2);

    // マップ外にはみ出さないように
    this.cameraX = Math.max(0, Math.min(this.cameraX, mapWidth - this.viewWidth));
    this.cameraY = Math.max(0, Math.min(this.cameraY, mapHeight - this.viewHeight));
  }

  /**
   * フレーム描画
   */
  render(gameState) {
    const { tiles, player, monsters, items, traps, rooms, floor } = gameState;

    // カメラ更新
    this.updateCamera(player, tiles[0].length, tiles.length);

    // 視界計算
    const visible = player.getVisibleTiles(tiles, rooms);

    // 探索済み更新
    for (const key of visible) {
      const [x, y] = key.split(',').map(Number);
      if (this.explored && this.explored[y]) {
        this.explored[y][x] = true;
      }
    }

    // クリア
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // タイル描画
    for (let vy = 0; vy < this.viewHeight; vy++) {
      for (let vx = 0; vx < this.viewWidth; vx++) {
        const tx = this.cameraX + vx;
        const ty = this.cameraY + vy;

        if (tx < 0 || tx >= tiles[0].length || ty < 0 || ty >= tiles.length) continue;

        const isVisible = visible.has(`${tx},${ty}`);
        const isExplored = this.explored?.[ty]?.[tx];

        // 未探索は描画しない
        if (!isExplored && !isVisible) continue;

        const tile = tiles[ty][tx];
        this.drawTile(vx, vy, tile, isVisible);
      }
    }

    // 罠描画（可視のもののみ）
    for (const trap of traps) {
      if (!trap.visible) continue;
      const vx = trap.x - this.cameraX;
      const vy = trap.y - this.cameraY;
      if (vx < 0 || vx >= this.viewWidth || vy < 0 || vy >= this.viewHeight) continue;
      if (!visible.has(`${trap.x},${trap.y}`)) continue;
      this.drawTrap(vx, vy, trap);
    }

    // 階段描画
    const stairs = gameState.stairsPos;
    if (stairs && visible.has(`${stairs.x},${stairs.y}`)) {
      const vx = stairs.x - this.cameraX;
      const vy = stairs.y - this.cameraY;
      if (vx >= 0 && vx < this.viewWidth && vy >= 0 && vy < this.viewHeight) {
        this.drawStairs(vx, vy);
      }
    }

    // アイテム描画
    for (const item of items) {
      const vx = item.x - this.cameraX;
      const vy = item.y - this.cameraY;
      if (vx < 0 || vx >= this.viewWidth || vy < 0 || vy >= this.viewHeight) continue;
      if (!visible.has(`${item.x},${item.y}`)) continue;
      this.drawItem(vx, vy, item);
    }

    // モンスター描画
    for (const monster of monsters) {
      if (!monster.isAlive) continue;
      const vx = monster.x - this.cameraX;
      const vy = monster.y - this.cameraY;
      if (vx < 0 || vx >= this.viewWidth || vy < 0 || vy >= this.viewHeight) continue;
      if (!visible.has(`${monster.x},${monster.y}`)) continue;
      this.drawMonster(vx, vy, monster);
    }

    // プレイヤー描画
    const pvx = player.x - this.cameraX;
    const pvy = player.y - this.cameraY;
    if (pvx >= 0 && pvx < this.viewWidth && pvy >= 0 && pvy < this.viewHeight) {
      this.drawPlayer(pvx, pvy, player);
    }

    // 暗闘処理（未視界は暗く）
    for (let vy = 0; vy < this.viewHeight; vy++) {
      for (let vx = 0; vx < this.viewWidth; vx++) {
        const tx = this.cameraX + vx;
        const ty = this.cameraY + vy;

        const isVisible = visible.has(`${tx},${ty}`);
        const isExplored = this.explored?.[ty]?.[tx];

        if (isExplored && !isVisible) {
          // 探索済みだが視界外
          this.ctx.fillStyle = this.phaseColors.fog || COLORS.explored;
          this.ctx.fillRect(vx * TILE_SIZE, vy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  /**
   * タイル描画
   */
  drawTile(vx, vy, tile, isVisible) {
    const x = vx * TILE_SIZE;
    const y = vy * TILE_SIZE;
    const colors = this.phaseColors;

    let color;
    switch (tile) {
      case TILE.WALL:
        color = isVisible ? colors.wallLight : colors.wall;
        break;
      case TILE.FLOOR:
        color = isVisible ? colors.floorLight : colors.floor;
        break;
      case TILE.CORRIDOR:
        color = colors.corridor;
        break;
      case TILE.STAIRS_DOWN:
        color = colors.stairs || COLORS.stairs;
        break;
      case TILE.TRAP:
        color = colors.floor; // 罠は別途描画
        break;
      default:
        color = colors.floor;
    }

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // 壁のハイライト
    if (tile === TILE.WALL && isVisible) {
      this.ctx.fillStyle = 'rgba(255,255,255,0.05)';
      this.ctx.fillRect(x, y, TILE_SIZE, 2);
    }

    // 床のパターン
    if ((tile === TILE.FLOOR || tile === TILE.CORRIDOR) && isVisible) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
      for (let py = 0; py < TILE_SIZE; py += 4) {
        for (let px = ((py / 4) % 2) * 2; px < TILE_SIZE; px += 4) {
          this.ctx.fillRect(x + px, y + py, 2, 2);
        }
      }
    }

    // 環境光（フェーズの雰囲気）
    if (isVisible && colors.ambient) {
      this.ctx.fillStyle = colors.ambient;
      this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }

  /**
   * 階段描画
   */
  drawStairs(vx, vy) {
    const x = vx * TILE_SIZE;
    const y = vy * TILE_SIZE;

    // スプライトがあれば使用
    if (this.sprites['kaidan_32']) {
      this.ctx.drawImage(this.sprites['kaidan_32'], x, y, TILE_SIZE, TILE_SIZE);
    } else {
      // フォールバック: シンプルな階段表示
      this.ctx.fillStyle = COLORS.stairs;
      this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      this.ctx.fillStyle = COLORS.stairsArrow;
      this.ctx.beginPath();
      this.ctx.moveTo(x + TILE_SIZE / 2, y + TILE_SIZE - 6);
      this.ctx.lineTo(x + 6, y + 6);
      this.ctx.lineTo(x + TILE_SIZE - 6, y + 6);
      this.ctx.fill();
    }
  }

  /**
   * 罠描画
   */
  drawTrap(vx, vy, trap) {
    const x = vx * TILE_SIZE;
    const y = vy * TILE_SIZE;

    if (this.sprites['wana_32']) {
      this.ctx.drawImage(this.sprites['wana_32'], x, y, TILE_SIZE, TILE_SIZE);
    } else {
      this.ctx.fillStyle = COLORS.trapVisible;
      this.ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      this.ctx.strokeStyle = '#a55';
      this.ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    }
  }

  /**
   * アイテム描画
   */
  drawItem(vx, vy, item) {
    const x = vx * TILE_SIZE;
    const y = vy * TILE_SIZE;

    const spriteId = item.sprite;
    if (this.sprites[spriteId]) {
      this.ctx.drawImage(this.sprites[spriteId], x, y, TILE_SIZE, TILE_SIZE);
    } else {
      // フォールバック
      this.ctx.fillStyle = '#8f8';
      this.ctx.beginPath();
      this.ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 8, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * モンスター描画
   */
  drawMonster(vx, vy, monster) {
    const x = vx * TILE_SIZE;
    const y = vy * TILE_SIZE;

    const spriteId = monster.sprite;
    if (this.sprites[spriteId]) {
      this.ctx.drawImage(this.sprites[spriteId], x, y, TILE_SIZE, TILE_SIZE);
    } else {
      // フォールバック: 赤い円
      this.ctx.fillStyle = monster.isBoss ? '#f44' : '#c44';
      this.ctx.beginPath();
      this.ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(monster.name[0], x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 4);
    }

    // HPバー（ボスのみ）
    if (monster.isBoss) {
      const hpRatio = monster.hp / monster.maxHp;
      this.ctx.fillStyle = '#300';
      this.ctx.fillRect(x + 2, y - 6, TILE_SIZE - 4, 4);
      this.ctx.fillStyle = '#f44';
      this.ctx.fillRect(x + 2, y - 6, (TILE_SIZE - 4) * hpRatio, 4);
    }
  }

  /**
   * プレイヤー描画
   */
  drawPlayer(vx, vy, player) {
    const x = vx * TILE_SIZE;
    const y = vy * TILE_SIZE;

    const spriteId = player.sprite;
    if (this.sprites[spriteId]) {
      this.ctx.drawImage(this.sprites[spriteId], x, y, TILE_SIZE, TILE_SIZE);
    } else {
      // フォールバック: 青い円
      this.ctx.fillStyle = '#48f';
      this.ctx.beginPath();
      this.ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('影', x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 4);
    }

    // 状態異常表示
    if (player.statusEffects.confused > 0) {
      this.ctx.fillStyle = '#ff0';
      this.ctx.font = '16px sans-serif';
      this.ctx.fillText('?', x + TILE_SIZE - 8, y + 8);
    }
    if (player.statusEffects.sleeping > 0) {
      this.ctx.fillStyle = '#88f';
      this.ctx.font = '12px sans-serif';
      this.ctx.fillText('Zzz', x + TILE_SIZE - 12, y + 8);
    }
  }

  /**
   * ダメージエフェクト
   */
  showDamageEffect(x, y, amount, isPlayer = false) {
    // 簡易的なダメージ表示（実際にはアニメーション）
    const vx = x - this.cameraX;
    const vy = y - this.cameraY;
    if (vx < 0 || vx >= this.viewWidth || vy < 0 || vy >= this.viewHeight) return;

    const px = vx * TILE_SIZE + TILE_SIZE / 2;
    const py = vy * TILE_SIZE;

    this.ctx.fillStyle = isPlayer ? '#f44' : '#ff0';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`-${amount}`, px, py);
  }
}
