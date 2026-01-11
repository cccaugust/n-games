/**
 * N-Games 3D Model Factory
 * 高品質な3Dモデルをプログラム的に生成するファクトリークラス
 *
 * 使用方法:
 * const factory = new ModelFactory(THREE);
 * const robot = await factory.create('robot', { variant: 'blue' });
 * scene.add(robot.mesh);
 * robot.animate('idle');
 */

import { CharacterModels } from './characters.js';
import { ItemModels } from './items.js';
import { PropModels } from './props.js';
import { MaterialLib } from './materials.js';
import { AnimationSystem } from './animations.js';

export class ModelFactory {
  constructor(THREE) {
    this.THREE = THREE;
    this.materials = new MaterialLib(THREE);
    this.animations = new AnimationSystem(THREE);
    this.characters = new CharacterModels(THREE, this.materials, this.animations);
    this.items = new ItemModels(THREE, this.materials, this.animations);
    this.props = new PropModels(THREE, this.materials, this.animations);

    // モデルキャッシュ（プロトタイプモデルを保持）
    this._cache = new Map();
    this._cacheEnabled = true;
    this._maxCacheSize = 50;

    // モデルレジストリ
    this.registry = {
      // キャラクター
      robot: (opts) => this.characters.createRobot(opts),
      slime: (opts) => this.characters.createSlime(opts),
      knight: (opts) => this.characters.createKnight(opts),
      mage: (opts) => this.characters.createMage(opts),
      ghost: (opts) => this.characters.createGhost(opts),
      dog: (opts) => this.characters.createDog(opts),
      cat: (opts) => this.characters.createCat(opts),
      horse: (opts) => this.characters.createHorse(opts),
      frog: (opts) => this.characters.createFrog(opts),
      // スプラトゥーン風キャラクター
      inkling: (opts) => this.characters.createInkling(opts),
      squid: (opts) => this.characters.createSquid(opts),
      octoling: (opts) => this.characters.createOctoling(opts),
      octopus: (opts) => this.characters.createOctopus(opts),
      // ゼルダ風キャラクター
      link: (opts) => this.characters.createLink(opts),
      zelda: (opts) => this.characters.createZelda(opts),

      // アイテム
      coin: (opts) => this.items.createCoin(opts),
      heart: (opts) => this.items.createHeart(opts),
      star: (opts) => this.items.createStar(opts),
      chest: (opts) => this.items.createChest(opts),
      sword: (opts) => this.items.createSword(opts),
      staff: (opts) => this.items.createStaff(opts),
      potion: (opts) => this.items.createPotion(opts),

      // プロップ
      tree: (opts) => this.props.createTree(opts),
      rock: (opts) => this.props.createRock(opts),
      crate: (opts) => this.props.createCrate(opts),
      crystal: (opts) => this.props.createCrystal(opts),
      torch: (opts) => this.props.createTorch(opts),
      grass: (opts) => this.props.createGrass(opts),
      fence: (opts) => this.props.createFence(opts),
      portal: (opts) => this.props.createPortal(opts),
      // スプラトゥーン風プロップ
      'ink-splat': (opts) => this.props.createInkSplat(opts),
      'ink-tank': (opts) => this.props.createInkTank(opts),
    };
  }

  /**
   * モデルを作成
   * @param {string} id - モデルID
   * @param {object} options - オプション
   * @returns {Model3D} 3Dモデルオブジェクト
   */
  create(id, options = {}) {
    const creator = this.registry[id];
    if (!creator) {
      console.warn(`Unknown model: ${id}`);
      return this.createPlaceholder(id);
    }

    // キャッシュを使用する場合、クローンを返す
    if (this._cacheEnabled) {
      const cacheKey = `${id}_${options.variant || 'default'}`;

      if (!this._cache.has(cacheKey)) {
        // プロトタイプを作成してキャッシュ
        const prototype = creator(options);
        this._cache.set(cacheKey, prototype);

        // キャッシュサイズ制限
        if (this._cache.size > this._maxCacheSize) {
          const firstKey = this._cache.keys().next().value;
          const oldModel = this._cache.get(firstKey);
          if (oldModel && oldModel.dispose) oldModel.dispose();
          this._cache.delete(firstKey);
        }
      }

      // キャッシュからクローンを返す
      return this._cache.get(cacheKey).clone();
    }

    return creator(options);
  }

  /**
   * キャッシュを有効/無効にする
   */
  setCacheEnabled(enabled) {
    this._cacheEnabled = enabled;
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this._cache.forEach(model => {
      if (model && model.dispose) model.dispose();
    });
    this._cache.clear();
  }

  /**
   * キャッシュを事前にウォームアップ
   * @param {Array<{id: string, variant?: string}>} models - プリロードするモデルリスト
   */
  preload(models) {
    models.forEach(({ id, variant }) => {
      const cacheKey = `${id}_${variant || 'default'}`;
      if (!this._cache.has(cacheKey)) {
        const creator = this.registry[id];
        if (creator) {
          this._cache.set(cacheKey, creator({ variant }));
        }
      }
    });
  }

  /**
   * 全モデルIDを取得
   */
  getAvailableModels() {
    return Object.keys(this.registry);
  }

  /**
   * プレースホルダーモデル（不明なモデル用）
   */
  createPlaceholder(id) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      wireframe: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    return new Model3D(group, { id: 'placeholder', name: `Unknown: ${id}` });
  }
}

/**
 * 3Dモデルラッパークラス
 * メッシュ、アニメーション、メタデータを統合管理
 */
export class Model3D {
  constructor(mesh, metadata = {}, animationController = null) {
    this.mesh = mesh;
    this.metadata = metadata;
    this.animationController = animationController;
    this.currentAnimation = null;
    this.animationTime = 0;
    this.disposed = false;

    // パーツへの参照（アニメーション用）
    this.parts = {};
    this._collectParts(mesh);
  }

  _collectParts(group, prefix = '') {
    group.children.forEach(child => {
      if (child.name) {
        this.parts[child.name] = child;
      }
      if (child.children && child.children.length > 0) {
        this._collectParts(child, child.name + '_');
      }
    });
  }

  /**
   * アニメーション再生
   */
  animate(animationName) {
    if (this.animationController) {
      this.currentAnimation = animationName;
      this.animationController.play(this, animationName);
    }
  }

  /**
   * アニメーション更新（毎フレーム呼ぶ）
   */
  update(deltaTime) {
    if (this.animationController && this.currentAnimation) {
      this.animationTime += deltaTime;
      this.animationController.update(this, this.currentAnimation, this.animationTime, deltaTime);
    }
  }

  /**
   * 位置設定
   */
  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
    return this;
  }

  /**
   * 回転設定
   */
  setRotation(x, y, z) {
    this.mesh.rotation.set(x, y, z);
    return this;
  }

  /**
   * スケール設定
   */
  setScale(s) {
    if (typeof s === 'number') {
      this.mesh.scale.set(s, s, s);
    } else {
      this.mesh.scale.set(s.x, s.y, s.z);
    }
    return this;
  }

  /**
   * バリアント変更（色替え等）
   */
  setVariant(variantName) {
    if (this.metadata.applyVariant) {
      this.metadata.applyVariant(this, variantName);
    }
    return this;
  }

  /**
   * クローン作成
   */
  clone() {
    const clonedMesh = this.mesh.clone();
    return new Model3D(clonedMesh, { ...this.metadata }, this.animationController);
  }

  /**
   * リソース解放
   */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    this.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

// デフォルトエクスポート
export default ModelFactory;
