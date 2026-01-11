/**
 * N-Games Material Library
 * 高品質なマテリアル生成ヘルパー
 */

export class MaterialLib {
  constructor(THREE) {
    this.THREE = THREE;
    this.textureCache = new Map();
  }

  /**
   * 標準的なPBRマテリアル
   */
  standard(options = {}) {
    const THREE = this.THREE;
    return new THREE.MeshStandardMaterial({
      color: options.color || 0xffffff,
      roughness: options.roughness ?? 0.5,
      metalness: options.metalness ?? 0.0,
      emissive: options.emissive || 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      side: options.side || THREE.FrontSide,
      flatShading: options.flatShading ?? false,
      ...options
    });
  }

  /**
   * 物理ベースマテリアル（より高品質）
   */
  physical(options = {}) {
    const THREE = this.THREE;
    return new THREE.MeshPhysicalMaterial({
      color: options.color || 0xffffff,
      roughness: options.roughness ?? 0.5,
      metalness: options.metalness ?? 0.0,
      clearcoat: options.clearcoat ?? 0,
      clearcoatRoughness: options.clearcoatRoughness ?? 0,
      transmission: options.transmission ?? 0,
      thickness: options.thickness ?? 0,
      ior: options.ior ?? 1.5,
      emissive: options.emissive || 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1,
      ...options
    });
  }

  /**
   * トゥーン（アニメ調）マテリアル
   */
  toon(options = {}) {
    const THREE = this.THREE;
    const gradientMap = this.createToonGradient(options.steps || 4);

    return new THREE.MeshToonMaterial({
      color: options.color || 0xffffff,
      gradientMap: gradientMap,
      emissive: options.emissive || 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      ...options
    });
  }

  /**
   * 発光マテリアル
   */
  emissive(options = {}) {
    const THREE = this.THREE;
    const color = options.color || 0xffffff;
    return new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: options.intensity ?? 0.8,
      roughness: 0.3,
      metalness: 0.1,
      ...options
    });
  }

  /**
   * ガラス/透明マテリアル
   */
  glass(options = {}) {
    const THREE = this.THREE;
    return new THREE.MeshPhysicalMaterial({
      color: options.color || 0xffffff,
      roughness: 0.0,
      metalness: 0.0,
      transmission: options.transmission ?? 0.9,
      thickness: options.thickness ?? 0.5,
      ior: options.ior ?? 1.5,
      transparent: true,
      opacity: options.opacity ?? 0.3,
      ...options
    });
  }

  /**
   * メタル（金属）マテリアル
   */
  metal(options = {}) {
    const THREE = this.THREE;
    return new THREE.MeshStandardMaterial({
      color: options.color || 0xcccccc,
      roughness: options.roughness ?? 0.2,
      metalness: options.metalness ?? 0.9,
      envMapIntensity: 1.0,
      ...options
    });
  }

  /**
   * ゴールドマテリアル
   */
  gold(options = {}) {
    return this.metal({
      color: 0xffd700,
      roughness: 0.3,
      metalness: 0.95,
      ...options
    });
  }

  /**
   * シルバーマテリアル
   */
  silver(options = {}) {
    return this.metal({
      color: 0xc0c0c0,
      roughness: 0.2,
      metalness: 0.95,
      ...options
    });
  }

  /**
   * ブロンズマテリアル
   */
  bronze(options = {}) {
    return this.metal({
      color: 0xcd7f32,
      roughness: 0.4,
      metalness: 0.85,
      ...options
    });
  }

  /**
   * 木材マテリアル
   */
  wood(options = {}) {
    const THREE = this.THREE;
    const texture = this.createWoodTexture(options);

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.0,
      bumpMap: texture,
      bumpScale: 0.02,
      ...options
    });
  }

  /**
   * 石材マテリアル
   */
  stone(options = {}) {
    const THREE = this.THREE;
    const texture = this.createStoneTexture(options);

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.0,
      bumpMap: texture,
      bumpScale: 0.05,
      ...options
    });
  }

  /**
   * スライム（半透明ゼリー）マテリアル
   */
  slime(options = {}) {
    const THREE = this.THREE;
    const color = options.color || 0x44ff44;

    return new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.6,
      thickness: 1.5,
      ior: 1.4,
      transparent: true,
      opacity: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      ...options
    });
  }

  /**
   * クリスタルマテリアル
   */
  crystal(options = {}) {
    const THREE = this.THREE;
    const color = options.color || 0x88ccff;

    return new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.0,
      metalness: 0.1,
      transmission: 0.95,
      thickness: 2.0,
      ior: 2.0,
      transparent: true,
      opacity: 0.6,
      emissive: color,
      emissiveIntensity: 0.2,
      ...options
    });
  }

  /**
   * 炎マテリアル（パーティクル用）
   */
  fire(options = {}) {
    const THREE = this.THREE;
    return new THREE.MeshBasicMaterial({
      color: options.color || 0xff6600,
      transparent: true,
      opacity: options.opacity ?? 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      ...options
    });
  }

  /**
   * 魔法エフェクトマテリアル
   */
  magic(options = {}) {
    const THREE = this.THREE;
    const color = options.color || 0x8844ff;

    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: options.opacity ?? 0.6,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      ...options
    });
  }

  // ========== テクスチャ生成 ==========

  /**
   * トゥーングラデーション生成
   */
  createToonGradient(steps = 4) {
    const THREE = this.THREE;
    const size = steps;
    const data = new Uint8Array(size);

    for (let i = 0; i < size; i++) {
      data[i] = Math.floor((i / (size - 1)) * 255);
    }

    const texture = new THREE.DataTexture(data, size, 1, THREE.RedFormat);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * 木目テクスチャ生成
   */
  createWoodTexture(options = {}) {
    const THREE = this.THREE;
    const cacheKey = `wood_${options.color || 'default'}`;

    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // ベースカラー
    const baseColor = options.baseColor || '#8B4513';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    // 木目パターン
    const grainColor = options.grainColor || '#654321';
    ctx.strokeStyle = grainColor;
    ctx.lineWidth = 2;

    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      const y = Math.random() * 256;
      ctx.moveTo(0, y);

      for (let x = 0; x < 256; x += 20) {
        ctx.lineTo(x, y + Math.sin(x * 0.05) * 5 + Math.random() * 3);
      }
      ctx.stroke();
    }

    // ノイズ追加
    const imageData = ctx.getImageData(0, 0, 256, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      imageData.data[i] += noise;
      imageData.data[i + 1] += noise;
      imageData.data[i + 2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  /**
   * 石テクスチャ生成
   */
  createStoneTexture(options = {}) {
    const THREE = this.THREE;
    const cacheKey = `stone_${options.color || 'gray'}`;

    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // ベースカラー
    const baseColor = options.baseColor || '#666666';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 256, 256);

    // ランダムな石のパターン
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 30 + 10;
      const brightness = Math.random() * 60 - 30;

      ctx.fillStyle = this.adjustBrightness(baseColor, brightness);
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // ひび割れ
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      let x = Math.random() * 256;
      let y = Math.random() * 256;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += Math.random() * 40 - 20;
        y += Math.random() * 40 - 20;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  /**
   * グラデーションテクスチャ生成
   */
  createGradientTexture(colors, direction = 'vertical') {
    const THREE = this.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    let gradient;
    if (direction === 'vertical') {
      gradient = ctx.createLinearGradient(0, 0, 0, 256);
    } else if (direction === 'horizontal') {
      gradient = ctx.createLinearGradient(0, 0, 256, 0);
    } else {
      gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    }

    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * ノイズテクスチャ生成
   */
  createNoiseTexture(options = {}) {
    const THREE = this.THREE;
    const size = options.size || 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const value = Math.random() * 255;
      imageData.data[i] = value;
      imageData.data[i + 1] = value;
      imageData.data[i + 2] = value;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * 明るさ調整ヘルパー
   */
  adjustBrightness(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
    return `rgb(${r},${g},${b})`;
  }

  /**
   * リソース解放
   */
  dispose() {
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
  }
}

export default MaterialLib;
