/**
 * レンダラー
 * キャンバスへの描画処理
 * アニメーション・エフェクト・サウンド対応
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
    this.sprites = {}; // { id: [frame0Canvas, frame1Canvas, ...] }
    this.spriteDurations = {}; // { id: [duration0, duration1, ...] }
    this.spritesLoaded = false;

    // ミニマップ
    this.minimapCanvas = document.getElementById('minimapCanvas');
    this.minimapCtx = this.minimapCanvas?.getContext('2d');

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

    // アニメーション用
    this.animationTime = 0;
    this.lastTime = performance.now();
    this.animationFrame = 0;
    this.animationInterval = 200; // 200msごとにフレーム切り替え

    // エフェクト管理
    this.effects = [];

    // 攻撃アニメーション用
    this.attackAnimation = null;

    // サウンド管理
    this.sounds = {};
    this.soundEnabled = true;

    this.resize();
    this.initSounds();
  }

  /**
   * サウンドの初期化
   */
  initSounds() {
    // Web Audio APIでサウンドを生成
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.soundEnabled = true;
    } catch (e) {
      console.warn('Web Audio API is not supported');
      this.soundEnabled = false;
    }
  }

  /**
   * サウンドを再生（Web Audio APIで簡易的に生成）
   */
  playSound(type) {
    if (!this.soundEnabled || !this.audioCtx) return;

    // AudioContextが停止中なら再開
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    switch (type) {
      case 'attack': {
        // 攻撃音: 短い「シュッ」という音
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case 'hit': {
        // ヒット音: 「ドン」という音
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'pickup': {
        // アイテム取得音: 「ピロン」という音
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now); // C5
        osc.frequency.setValueAtTime(659, now + 0.08); // E5
        osc.frequency.setValueAtTime(784, now + 0.16); // G5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }
      case 'use': {
        // アイテム使用音: 「キラーン」という音
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        osc2.frequency.setValueAtTime(1320, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);
        break;
      }
      case 'heal': {
        // 回復音: 「ポワン」という音
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
      case 'levelup': {
        // レベルアップ音: 「テレレーン」
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.1);
        osc.frequency.setValueAtTime(784, now + 0.2);
        osc.frequency.setValueAtTime(1047, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.setValueAtTime(0.15, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'stairs': {
        // 階段音: 「シュワーン」
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case 'damage': {
        // ダメージ音: 「ガッ」という音
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
    }
  }

  /**
   * アニメーションの更新
   */
  updateAnimation() {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    this.animationTime += delta;

    if (this.animationTime >= this.animationInterval) {
      this.animationTime = 0;
      this.animationFrame = (this.animationFrame + 1) % 2;
    }

    // エフェクトの更新
    this.effects = this.effects.filter(effect => {
      effect.time += delta;
      return effect.time < effect.duration;
    });

    // 攻撃アニメーションの更新
    if (this.attackAnimation) {
      this.attackAnimation.time += delta;
      if (this.attackAnimation.time >= this.attackAnimation.duration) {
        this.attackAnimation = null;
      }
    }
  }

  /**
   * エフェクトを追加
   */
  addEffect(type, x, y, options = {}) {
    const effect = {
      type,
      x, y,
      time: 0,
      duration: options.duration || 300,
      color: options.color || '#fff',
      text: options.text || '',
      size: options.size || 16,
      direction: options.direction || { dx: 0, dy: 0 }
    };
    this.effects.push(effect);
  }

  /**
   * 攻撃アニメーションを開始
   */
  startAttackAnimation(attackerX, attackerY, targetX, targetY, isPlayer = true) {
    const dx = targetX - attackerX;
    const dy = targetY - attackerY;
    this.attackAnimation = {
      isPlayer,
      attackerX, attackerY,
      dx, dy,
      time: 0,
      duration: 150
    };
    this.playSound('attack');
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
   * スプライトをロード（samples.jsonから）全フレーム対応
   */
  async loadSprites() {
    try {
      // 相対パス（GitHub Pages 対応）
      const res = await fetch('../../pages/pixel-art-maker/samples.json');
      const data = await res.json();

      for (const sample of data.samples) {
        // framesがある場合は全フレームを読み込み
        if (sample.frames && sample.frames.length > 0) {
          const frameCanvases = [];
          const frameDurations = [];

          for (const frame of sample.frames) {
            if (!frame.pixelsB64) continue;

            const pixels = this.base64ToPixels(frame.pixelsB64);
            if (!pixels) continue;

            const canvas = this.createSpriteCanvas(pixels, sample.width, sample.height);
            frameCanvases.push(canvas);
            frameDurations.push(frame.durationMs || 200);
          }

          if (frameCanvases.length > 0) {
            this.sprites[sample.id] = frameCanvases;
            this.spriteDurations[sample.id] = frameDurations;
          }
        } else if (sample.pixelsB64) {
          // 単一フレームの場合
          const pixels = this.base64ToPixels(sample.pixelsB64);
          if (!pixels) continue;

          const canvas = this.createSpriteCanvas(pixels, sample.width, sample.height);
          this.sprites[sample.id] = [canvas]; // 配列として保存
          this.spriteDurations[sample.id] = [200];
        }
      }

      this.spritesLoaded = true;
      console.log('スプライト読み込み完了:', Object.keys(this.sprites).length, '個');
    } catch (e) {
      console.warn('スプライトの読み込みに失敗:', e);
      this.spritesLoaded = true; // 失敗しても続行
    }
  }

  /**
   * ピクセルデータからキャンバスを作成
   */
  createSpriteCanvas(pixels, width, height) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    // ImageDataを作成（Uint32ArrayからUint8ClampedArrayに変換）
    const imageData = tempCtx.createImageData(width, height);
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
    return tempCanvas;
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

    // アニメーション更新
    this.updateAnimation();

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

    // エフェクト描画
    this.drawEffects();

    // ミニマップ描画
    this.drawMinimap(gameState);
  }

  /**
   * ミニマップ描画（探索済みの場所だけ表示）
   */
  drawMinimap(gameState) {
    if (!this.minimapCanvas || !this.minimapCtx || !this.explored) return;

    const { tiles, player, stairsPos } = gameState;
    const ctx = this.minimapCtx;
    const mapWidth = tiles[0].length;
    const mapHeight = tiles.length;

    // ミニマップのサイズを設定（CSSサイズと同じ）
    const displayWidth = 96;
    const displayHeight = 64;

    // 1ピクセルあたりのタイル数を計算
    const pixelSize = 2;
    const canvasWidth = mapWidth * pixelSize;
    const canvasHeight = mapHeight * pixelSize;

    this.minimapCanvas.width = canvasWidth;
    this.minimapCanvas.height = canvasHeight;

    // 背景クリア
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 探索済みタイルを描画
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        if (!this.explored[y]?.[x]) continue;

        const tile = tiles[y][x];
        let color;

        if (tile === TILE.WALL) {
          color = '#444';
        } else if (tile === TILE.FLOOR || tile === TILE.CORRIDOR) {
          color = '#666';
        } else if (tile === TILE.STAIRS_DOWN) {
          color = '#8b5cf6';
        } else {
          color = '#555';
        }

        ctx.fillStyle = color;
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    // 階段を強調表示
    if (stairsPos && this.explored[stairsPos.y]?.[stairsPos.x]) {
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(stairsPos.x * pixelSize, stairsPos.y * pixelSize, pixelSize, pixelSize);
    }

    // プレイヤー位置を描画（点滅）
    const blink = Math.floor(Date.now() / 300) % 2 === 0;
    if (blink) {
      ctx.fillStyle = '#4af';
      ctx.fillRect(player.x * pixelSize - 1, player.y * pixelSize - 1, pixelSize + 2, pixelSize + 2);
    }
  }

  /**
   * エフェクト描画
   */
  drawEffects() {
    for (const effect of this.effects) {
      const vx = effect.x - this.cameraX;
      const vy = effect.y - this.cameraY;
      if (vx < 0 || vx >= this.viewWidth || vy < 0 || vy >= this.viewHeight) continue;

      const px = vx * TILE_SIZE + TILE_SIZE / 2;
      const py = vy * TILE_SIZE + TILE_SIZE / 2;
      const progress = effect.time / effect.duration;

      switch (effect.type) {
        case 'damage': {
          // ダメージ数字が上に浮かぶ
          const offsetY = -20 * progress;
          const alpha = 1 - progress;
          this.ctx.save();
          this.ctx.globalAlpha = alpha;
          this.ctx.fillStyle = effect.color;
          this.ctx.font = `bold ${effect.size}px sans-serif`;
          this.ctx.textAlign = 'center';
          this.ctx.strokeStyle = '#000';
          this.ctx.lineWidth = 3;
          this.ctx.strokeText(effect.text, px, py + offsetY);
          this.ctx.fillText(effect.text, px, py + offsetY);
          this.ctx.restore();
          break;
        }
        case 'heal': {
          // 回復エフェクト（緑の数字が上へ）
          const offsetY = -20 * progress;
          const alpha = 1 - progress;
          this.ctx.save();
          this.ctx.globalAlpha = alpha;
          this.ctx.fillStyle = '#4f4';
          this.ctx.font = `bold ${effect.size}px sans-serif`;
          this.ctx.textAlign = 'center';
          this.ctx.strokeStyle = '#000';
          this.ctx.lineWidth = 3;
          this.ctx.strokeText(effect.text, px, py + offsetY);
          this.ctx.fillText(effect.text, px, py + offsetY);
          this.ctx.restore();
          break;
        }
        case 'slash': {
          // 攻撃エフェクト（斬撃線）
          const alpha = 1 - progress;
          this.ctx.save();
          this.ctx.globalAlpha = alpha;
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 3;
          this.ctx.lineCap = 'round';
          this.ctx.beginPath();
          // 斜め線を描く
          const len = 12 + progress * 8;
          this.ctx.moveTo(px - len, py - len);
          this.ctx.lineTo(px + len, py + len);
          this.ctx.moveTo(px + len, py - len);
          this.ctx.lineTo(px - len, py + len);
          this.ctx.stroke();
          this.ctx.restore();
          break;
        }
        case 'pickup': {
          // アイテム取得エフェクト（キラキラ）
          const alpha = 1 - progress;
          const scale = 1 + progress * 0.5;
          this.ctx.save();
          this.ctx.globalAlpha = alpha;
          this.ctx.fillStyle = '#ff0';
          // 星形を描く
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 4) * i + progress * Math.PI;
            const dist = 8 * scale;
            const sx = px + Math.cos(angle) * dist;
            const sy = py + Math.sin(angle) * dist;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, 2, 0, Math.PI * 2);
            this.ctx.fill();
          }
          this.ctx.restore();
          break;
        }
        case 'levelup': {
          // レベルアップエフェクト（上昇する光の柱）
          const alpha = 1 - progress;
          this.ctx.save();
          this.ctx.globalAlpha = alpha * 0.7;
          const gradient = this.ctx.createLinearGradient(px, py + TILE_SIZE, px, py - TILE_SIZE * 2);
          gradient.addColorStop(0, 'transparent');
          gradient.addColorStop(0.5, '#ff0');
          gradient.addColorStop(1, 'transparent');
          this.ctx.fillStyle = gradient;
          this.ctx.fillRect(px - 8, py - TILE_SIZE * (1 + progress), 16, TILE_SIZE * 2);
          this.ctx.restore();
          break;
        }
        case 'use': {
          // アイテム使用エフェクト（波紋）
          const alpha = 1 - progress;
          const radius = 10 + progress * 20;
          this.ctx.save();
          this.ctx.globalAlpha = alpha;
          this.ctx.strokeStyle = effect.color;
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(px, py, radius, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.restore();
          break;
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

    // スプライトがあれば使用（配列形式に対応）
    const frames = this.sprites['kaidan_32'];
    if (frames && frames.length > 0) {
      this.ctx.drawImage(frames[0], x, y, TILE_SIZE, TILE_SIZE);
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

    const frames = this.sprites['wana_32'];
    if (frames && frames.length > 0) {
      this.ctx.drawImage(frames[0], x, y, TILE_SIZE, TILE_SIZE);
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
    const frames = this.sprites[spriteId];
    if (frames && frames.length > 0) {
      // アニメーションフレームを取得
      const frameIndex = this.animationFrame % frames.length;
      this.ctx.drawImage(frames[frameIndex], x, y, TILE_SIZE, TILE_SIZE);
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
    let x = vx * TILE_SIZE;
    let y = vy * TILE_SIZE;

    // 攻撃アニメーション中のオフセット（モンスターがプレイヤーを攻撃中）
    if (this.attackAnimation && !this.attackAnimation.isPlayer) {
      const anim = this.attackAnimation;
      if (anim.attackerX === monster.x + this.cameraX && anim.attackerY === monster.y + this.cameraY) {
        const progress = anim.time / anim.duration;
        // 前半は前進、後半は戻る
        const offset = progress < 0.5
          ? progress * 2 * 8
          : (1 - progress) * 2 * 8;
        x += anim.dx * offset;
        y += anim.dy * offset;
      }
    }

    const spriteId = monster.sprite;
    const frames = this.sprites[spriteId];

    // 睡眠中はアニメーションしない
    const isSleeping = monster.statusEffects?.sleeping > 0;

    if (frames && frames.length > 0) {
      const frameIndex = isSleeping ? 0 : (this.animationFrame % frames.length);
      this.ctx.drawImage(frames[frameIndex], x, y, TILE_SIZE, TILE_SIZE);
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

    // 状態異常表示
    if (monster.statusEffects?.confused > 0) {
      this.ctx.fillStyle = '#ff0';
      this.ctx.font = '12px sans-serif';
      this.ctx.fillText('?', x + TILE_SIZE - 6, y + 10);
    }
    if (isSleeping) {
      this.ctx.fillStyle = '#88f';
      this.ctx.font = '10px sans-serif';
      this.ctx.fillText('Zzz', x + TILE_SIZE - 12, y + 10);
    }
  }

  /**
   * プレイヤー描画
   */
  drawPlayer(vx, vy, player) {
    let x = vx * TILE_SIZE;
    let y = vy * TILE_SIZE;

    // 攻撃アニメーション中のオフセット（プレイヤーが攻撃中）
    if (this.attackAnimation && this.attackAnimation.isPlayer) {
      const anim = this.attackAnimation;
      const progress = anim.time / anim.duration;
      // 前半は前進、後半は戻る
      const offset = progress < 0.5
        ? progress * 2 * 8
        : (1 - progress) * 2 * 8;
      x += anim.dx * offset;
      y += anim.dy * offset;
    }

    const spriteId = player.sprite;
    const frames = this.sprites[spriteId];

    // 睡眠中はアニメーションしない
    const isSleeping = player.statusEffects?.sleeping > 0;

    if (frames && frames.length > 0) {
      const frameIndex = isSleeping ? 0 : (this.animationFrame % frames.length);
      this.ctx.drawImage(frames[frameIndex], x, y, TILE_SIZE, TILE_SIZE);
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
    if (player.statusEffects?.confused > 0) {
      this.ctx.fillStyle = '#ff0';
      this.ctx.font = '16px sans-serif';
      this.ctx.fillText('?', x + TILE_SIZE - 8, y + 8);
    }
    if (isSleeping) {
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

  /**
   * アイテムのアイコンDataURLを取得
   */
  getItemIconDataURL(item, size = 32) {
    const spriteId = item.sprite;
    const frames = this.sprites[spriteId];

    if (frames && frames.length > 0) {
      // スプライトがある場合
      const sourceCanvas = frames[0];

      // 指定サイズにリサイズ
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = size;
      tempCanvas.height = size;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.imageSmoothingEnabled = false;
      tempCtx.drawImage(sourceCanvas, 0, 0, size, size);

      return tempCanvas.toDataURL();
    }

    // スプライトがない場合はタイプ別のフォールバックアイコンを生成
    return this.generateFallbackIcon(item.type, size);
  }

  /**
   * フォールバックアイコンを生成
   */
  generateFallbackIcon(type, size = 32) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const ctx = tempCanvas.getContext('2d');

    // 背景
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, size, size);

    // タイプ別の色とシンボル
    let color, symbol;
    switch (type) {
      case 'weapon':
        color = '#f88'; symbol = '剣';
        break;
      case 'shield':
        color = '#88f'; symbol = '盾';
        break;
      case 'ring':
        color = '#ff0'; symbol = '輪';
        break;
      case 'grass':
        color = '#8f8'; symbol = '草';
        break;
      case 'scroll':
        color = '#f8f'; symbol = '巻';
        break;
      case 'staff':
        color = '#fa0'; symbol = '杖';
        break;
      case 'arrow':
        color = '#aaa'; symbol = '矢';
        break;
      case 'pot':
        color = '#8af'; symbol = '壺';
        break;
      case 'food':
        color = '#fa8'; symbol = '食';
        break;
      default:
        color = '#888'; symbol = '？';
    }

    // アイコン描画
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${size / 2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, size / 2, size / 2);

    return tempCanvas.toDataURL();
  }
}
