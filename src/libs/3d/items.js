/**
 * N-Games Item Models
 * 高品質なアイテム3Dモデル生成
 */

import { Model3D } from './model-factory.js';

export class ItemModels {
  constructor(THREE, materials, animations) {
    this.THREE = THREE;
    this.materials = materials;
    this.animations = animations;
  }

  // ==================== コイン ====================
  createCoin(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'gold';
    const group = new THREE.Group();

    const colors = {
      gold: { main: 0xffd700, shine: 0xffec8b },
      silver: { main: 0xc0c0c0, shine: 0xe8e8e8 },
      bronze: { main: 0xcd7f32, shine: 0xdaa06d }
    };
    const palette = colors[variant] || colors.gold;

    // コイン本体
    const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 32);
    const coinMat = this.materials.metal({
      color: palette.main,
      roughness: 0.3,
      metalness: 0.95
    });
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    group.add(coin);

    // 表面の模様（星マーク）
    const starShape = this.createStarShape(0.25, 0.12, 5);
    const starGeo = new THREE.ShapeGeometry(starShape);
    const starMat = this.materials.metal({
      color: palette.shine,
      roughness: 0.2,
      metalness: 0.98
    });

    const frontStar = new THREE.Mesh(starGeo, starMat);
    frontStar.position.z = 0.041;
    group.add(frontStar);

    const backStar = new THREE.Mesh(starGeo, starMat.clone());
    backStar.position.z = -0.041;
    backStar.rotation.y = Math.PI;
    group.add(backStar);

    // 縁のディテール
    const edgeGeo = new THREE.TorusGeometry(0.48, 0.02, 8, 32);
    const edgeMat = this.materials.metal({
      color: palette.shine,
      roughness: 0.2,
      metalness: 0.98
    });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.rotation.x = Math.PI / 2;
    group.add(edge);

    // 輝きエフェクト
    const glowGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const glowMat = this.materials.magic({
      color: palette.main,
      opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.name = 'glow';
    group.add(glow);

    group.userData.baseY = 0;

    return new Model3D(group, {
      id: 'coin',
      name: 'コイン',
      variant: variant,
      defaultAnimation: 'spin'
    }, this.animations);
  }

  // ==================== ハート ====================
  createHeart(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'red';
    const group = new THREE.Group();

    const colors = {
      red: { main: 0xff3366, glow: 0xff6699 },
      pink: { main: 0xff69b4, glow: 0xffb6c1 },
      gold: { main: 0xffd700, glow: 0xffec8b }
    };
    const palette = colors[variant] || colors.red;

    // ハート形状を作成
    const heartShape = new THREE.Shape();
    const x = 0, y = 0;

    heartShape.moveTo(x, y + 0.35);
    heartShape.bezierCurveTo(x, y + 0.35, x - 0.05, y, x - 0.35, y);
    heartShape.bezierCurveTo(x - 0.7, y, x - 0.7, y + 0.5, x - 0.7, y + 0.5);
    heartShape.bezierCurveTo(x - 0.7, y + 0.8, x - 0.35, y + 1.05, x, y + 1.2);
    heartShape.bezierCurveTo(x + 0.35, y + 1.05, x + 0.7, y + 0.8, x + 0.7, y + 0.5);
    heartShape.bezierCurveTo(x + 0.7, y + 0.5, x + 0.7, y, x + 0.35, y);
    heartShape.bezierCurveTo(x + 0.05, y, x, y + 0.35, x, y + 0.35);

    const extrudeSettings = {
      depth: 0.3,
      bevelEnabled: true,
      bevelSegments: 8,
      bevelSize: 0.08,
      bevelThickness: 0.08
    };

    const heartGeo = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
    const heartMat = this.materials.physical({
      color: palette.main,
      roughness: 0.2,
      metalness: 0.3,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      emissive: palette.glow,
      emissiveIntensity: 0.2
    });

    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.rotation.x = Math.PI;
    heart.rotation.z = Math.PI;
    heart.position.y = 0.6;
    heart.position.z = 0.15;
    heart.scale.set(0.8, 0.8, 0.8);
    heart.castShadow = true;
    heart.name = 'heart';
    group.add(heart);

    // ハイライト（てかり）
    const highlightGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const highlightMat = this.materials.standard({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      roughness: 0
    });
    const highlight = new THREE.Mesh(highlightGeo, highlightMat);
    highlight.position.set(-0.2, 0.7, 0.35);
    group.add(highlight);

    // 内側の光
    const innerGlowGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const innerGlowMat = this.materials.emissive({
      color: palette.glow,
      intensity: 0.5
    });
    innerGlowMat.transparent = true;
    innerGlowMat.opacity = 0.4;
    const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    innerGlow.position.set(0, 0.55, 0.15);
    innerGlow.name = 'innerGlow';
    group.add(innerGlow);

    group.userData.baseY = 0;

    return new Model3D(group, {
      id: 'heart',
      name: 'ハート',
      variant: variant,
      defaultAnimation: 'beat'
    }, this.animations);
  }

  // ==================== 星 ====================
  createStar(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'gold';
    const group = new THREE.Group();

    const colors = {
      gold: { main: 0xffd700, glow: 0xffff00 },
      silver: { main: 0xc0c0c0, glow: 0xffffff },
      rainbow: { main: 0xff69b4, glow: 0xffaaff }
    };
    const palette = colors[variant] || colors.gold;

    // 星の形状
    const starShape = this.createStarShape(0.5, 0.2, 5);
    const extrudeSettings = {
      depth: 0.15,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.05,
      bevelThickness: 0.05
    };

    const starGeo = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    const starMat = this.materials.physical({
      color: palette.main,
      roughness: 0.1,
      metalness: 0.8,
      emissive: palette.glow,
      emissiveIntensity: 0.4
    });

    const star = new THREE.Mesh(starGeo, starMat);
    star.position.z = -0.075;
    star.castShadow = true;
    star.name = 'star';
    group.add(star);

    // 輝きの光芒
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const rayGeo = new THREE.BoxGeometry(0.03, 0.3, 0.02);
      const rayMat = this.materials.emissive({
        color: palette.glow,
        intensity: 0.8
      });
      rayMat.transparent = true;
      rayMat.opacity = 0.6;

      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set(
        Math.cos(angle) * 0.6,
        Math.sin(angle) * 0.6,
        0
      );
      ray.rotation.z = angle + Math.PI / 2;
      group.add(ray);
    }

    // 中心の光
    const coreGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const coreMat = this.materials.emissive({
      color: 0xffffff,
      intensity: 1.2
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.name = 'core';
    group.add(core);

    // 外周の輝き
    const glowGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const glowMat = this.materials.magic({
      color: palette.glow,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.name = 'glow';
    group.add(glow);

    group.userData.baseY = 0;

    return new Model3D(group, {
      id: 'star',
      name: 'スター',
      variant: variant,
      defaultAnimation: 'twinkle'
    }, this.animations);
  }

  // ==================== 宝箱 ====================
  createChest(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'wood';
    const group = new THREE.Group();

    const colors = {
      wood: { body: 0x8B4513, trim: 0xffd700, lock: 0xffd700 },
      iron: { body: 0x4a4a4a, trim: 0x888888, lock: 0xaaaaaa },
      gold: { body: 0xdaa520, trim: 0xffd700, lock: 0xffffff },
      legendary: { body: 0x4b0082, trim: 0xffd700, lock: 0x00ffff }
    };
    const palette = colors[variant] || colors.wood;

    // 箱の本体
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // 底部
    const baseGeo = new THREE.BoxGeometry(1.2, 0.6, 0.8);
    const baseMat = variant === 'wood'
      ? this.materials.wood({ baseColor: '#8B4513' })
      : this.materials.metal({ color: palette.body, roughness: 0.4 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.3;
    base.castShadow = true;
    bodyGroup.add(base);

    // 縁取り（横）
    const trimHGeo = new THREE.BoxGeometry(1.25, 0.08, 0.85);
    const trimMat = this.materials.metal({ color: palette.trim, roughness: 0.3, metalness: 0.9 });
    const trimTop = new THREE.Mesh(trimHGeo, trimMat);
    trimTop.position.y = 0.6;
    bodyGroup.add(trimTop);
    const trimBottom = new THREE.Mesh(trimHGeo, trimMat.clone());
    trimBottom.position.y = 0.04;
    bodyGroup.add(trimBottom);

    // 縁取り（縦）
    const trimVGeo = new THREE.BoxGeometry(0.08, 0.6, 0.85);
    const trimLeft = new THREE.Mesh(trimVGeo, trimMat.clone());
    trimLeft.position.set(-0.58, 0.3, 0);
    bodyGroup.add(trimLeft);
    const trimRight = new THREE.Mesh(trimVGeo, trimMat.clone());
    trimRight.position.set(0.58, 0.3, 0);
    bodyGroup.add(trimRight);

    group.add(bodyGroup);

    // 蓋
    const lidGroup = new THREE.Group();
    lidGroup.name = 'lid';

    // 蓋本体（半円柱）
    const lidGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16, 1, false, 0, Math.PI);
    const lidMat = variant === 'wood'
      ? this.materials.wood({ baseColor: '#8B4513' })
      : this.materials.metal({ color: palette.body, roughness: 0.4 });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.rotation.z = Math.PI / 2;
    lid.rotation.y = -Math.PI / 2;
    lid.position.z = 0;
    lid.castShadow = true;
    lidGroup.add(lid);

    // 蓋の縁取り
    const lidTrimGeo = new THREE.TorusGeometry(0.4, 0.04, 8, 16, Math.PI);
    const lidTrimLeft = new THREE.Mesh(lidTrimGeo, trimMat.clone());
    lidTrimLeft.rotation.y = Math.PI / 2;
    lidTrimLeft.position.x = -0.58;
    lidGroup.add(lidTrimLeft);
    const lidTrimRight = new THREE.Mesh(lidTrimGeo, trimMat.clone());
    lidTrimRight.rotation.y = Math.PI / 2;
    lidTrimRight.position.x = 0.58;
    lidGroup.add(lidTrimRight);

    lidGroup.position.set(0, 0.6, -0.4);
    group.add(lidGroup);

    // 錠前
    const lockGroup = new THREE.Group();
    lockGroup.name = 'lock';

    const lockBaseGeo = new THREE.BoxGeometry(0.2, 0.25, 0.08);
    const lockBaseMat = this.materials.metal({ color: palette.lock, roughness: 0.2, metalness: 0.95 });
    const lockBase = new THREE.Mesh(lockBaseGeo, lockBaseMat);
    lockGroup.add(lockBase);

    const lockHoleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8);
    const lockHoleMat = this.materials.standard({ color: 0x111111 });
    const lockHole = new THREE.Mesh(lockHoleGeo, lockHoleMat);
    lockHole.rotation.x = Math.PI / 2;
    lockHole.position.set(0, -0.05, 0.04);
    lockGroup.add(lockHole);

    lockGroup.position.set(0, 0.45, 0.44);
    group.add(lockGroup);

    // 内部の光（開いたときに見える）
    const glowGeo = new THREE.BoxGeometry(1.0, 0.4, 0.6);
    const glowMat = this.materials.emissive({
      color: variant === 'legendary' ? 0x00ffff : 0xffd700,
      intensity: 0.8
    });
    glowMat.transparent = true;
    glowMat.opacity = 0;
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.4;
    glow.name = 'glow';
    group.add(glow);

    return new Model3D(group, {
      id: 'chest',
      name: '宝箱',
      variant: variant,
      defaultAnimation: 'chestShake'
    }, this.animations);
  }

  // ==================== 剣 ====================
  createSword(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'iron';
    const group = new THREE.Group();

    const colors = {
      iron: { blade: 0x888888, hilt: 0x8B4513, gem: 0x3498db },
      steel: { blade: 0xc0c0c0, hilt: 0x2c3e50, gem: 0x2ecc71 },
      gold: { blade: 0xffd700, hilt: 0x8e44ad, gem: 0xe74c3c },
      legendary: { blade: 0x00bfff, hilt: 0x1a1a2e, gem: 0xff00ff }
    };
    const palette = colors[variant] || colors.iron;

    // 刀身
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.lineTo(0.08, 0.1);
    bladeShape.lineTo(0.06, 1.4);
    bladeShape.lineTo(0, 1.6);
    bladeShape.lineTo(-0.06, 1.4);
    bladeShape.lineTo(-0.08, 0.1);
    bladeShape.closePath();

    const bladeExtrudeSettings = {
      depth: 0.02,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.01,
      bevelThickness: 0.01
    };

    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, bladeExtrudeSettings);
    const bladeMat = variant === 'legendary'
      ? this.materials.emissive({ color: palette.blade, intensity: 0.6 })
      : this.materials.metal({ color: palette.blade, roughness: 0.2, metalness: 0.95 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.z = -0.01;
    blade.castShadow = true;
    blade.name = 'blade';
    group.add(blade);

    // 刀身の中央線（フラー）
    const fullerGeo = new THREE.BoxGeometry(0.02, 1.2, 0.005);
    const fullerMat = this.materials.metal({
      color: variant === 'legendary' ? 0xffffff : 0x666666,
      roughness: 0.1
    });
    const fuller = new THREE.Mesh(fullerGeo, fullerMat);
    fuller.position.set(0, 0.7, 0.02);
    group.add(fuller);

    // 鍔（つば）
    const guardGeo = new THREE.BoxGeometry(0.4, 0.08, 0.06);
    const guardMat = this.materials.metal({ color: palette.hilt, roughness: 0.4, metalness: 0.8 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = 0.04;
    guard.castShadow = true;
    group.add(guard);

    // 鍔の装飾
    const guardDecorGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const guardDecorMat = this.materials.metal({ color: palette.gem });
    const leftDecor = new THREE.Mesh(guardDecorGeo, guardDecorMat);
    leftDecor.position.set(-0.18, 0.04, 0);
    group.add(leftDecor);
    const rightDecor = new THREE.Mesh(guardDecorGeo, guardDecorMat.clone());
    rightDecor.position.set(0.18, 0.04, 0);
    group.add(rightDecor);

    // 柄（グリップ）
    const gripGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.35, 12);
    const gripMat = this.materials.standard({ color: palette.hilt, roughness: 0.8 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.y = -0.18;
    group.add(grip);

    // 柄巻き
    for (let i = 0; i < 6; i++) {
      const wrapGeo = new THREE.TorusGeometry(0.042, 0.008, 4, 12);
      const wrapMat = this.materials.standard({ color: 0x1a1a1a });
      const wrap = new THREE.Mesh(wrapGeo, wrapMat);
      wrap.position.y = -0.08 - i * 0.05;
      wrap.rotation.x = Math.PI / 2;
      group.add(wrap);
    }

    // 柄頭（ポンメル）
    const pommelGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const pommelMat = this.materials.metal({ color: palette.hilt, roughness: 0.3, metalness: 0.9 });
    const pommel = new THREE.Mesh(pommelGeo, pommelMat);
    pommel.position.y = -0.38;
    pommel.scale.y = 0.7;
    group.add(pommel);

    // 宝石
    const gemGeo = new THREE.OctahedronGeometry(0.05);
    const gemMat = this.materials.crystal({ color: palette.gem });
    gemMat.emissive = new THREE.Color(palette.gem);
    gemMat.emissiveIntensity = 0.5;
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.y = -0.38;
    gem.rotation.x = Math.PI / 4;
    gem.name = 'gem';
    group.add(gem);

    // 伝説の剣は光のエフェクト
    if (variant === 'legendary') {
      const auraGeo = new THREE.CylinderGeometry(0.15, 0.05, 1.6, 8, 1, true);
      const auraMat = this.materials.magic({
        color: palette.blade,
        opacity: 0.3
      });
      const aura = new THREE.Mesh(auraGeo, auraMat);
      aura.position.y = 0.8;
      aura.name = 'aura';
      group.add(aura);
    }

    // 回転して剣を立てる
    group.rotation.x = -Math.PI / 6;

    return new Model3D(group, {
      id: 'sword',
      name: '剣',
      variant: variant,
      defaultAnimation: 'float'
    }, this.animations);
  }

  // ==================== 魔法の杖 ====================
  createStaff(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'fire';
    const group = new THREE.Group();

    const colors = {
      fire: { wood: 0x5d4037, gem: 0xff4500, glow: 0xff6600 },
      ice: { wood: 0x607d8b, gem: 0x00bfff, glow: 0x88ddff },
      lightning: { wood: 0x4a4a4a, gem: 0xffff00, glow: 0xffffaa },
      arcane: { wood: 0x4b0082, gem: 0xaa00ff, glow: 0xdd88ff }
    };
    const palette = colors[variant] || colors.fire;

    // 杖の柄
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.05, 2.0, 12);
    const shaftMat = this.materials.wood({ baseColor: `#${palette.wood.toString(16)}` });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 1.0;
    shaft.castShadow = true;
    group.add(shaft);

    // ねじれ装飾
    const spiralGeo = new THREE.TorusGeometry(0.06, 0.015, 4, 16, Math.PI * 6);
    const spiralMat = this.materials.metal({ color: palette.gem, roughness: 0.3 });
    const spiral = new THREE.Mesh(spiralGeo, spiralMat);
    spiral.rotation.y = Math.PI / 2;
    spiral.position.y = 1.0;
    spiral.scale.y = 3;
    group.add(spiral);

    // 先端の台座
    const crownGroup = new THREE.Group();

    // 台座のフレーム
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const frameGeo = new THREE.BoxGeometry(0.02, 0.3, 0.02);
      const frameMat = this.materials.metal({ color: palette.wood, roughness: 0.4 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(
        Math.cos(angle) * 0.08,
        0.15,
        Math.sin(angle) * 0.08
      );
      frame.rotation.z = Math.sin(angle) * 0.3;
      frame.rotation.x = Math.cos(angle) * 0.3;
      crownGroup.add(frame);
    }

    crownGroup.position.y = 2.0;
    group.add(crownGroup);

    // メインの宝石
    const gemGeo = new THREE.OctahedronGeometry(0.15);
    const gemMat = this.materials.crystal({ color: palette.gem });
    gemMat.emissive = new THREE.Color(palette.glow);
    gemMat.emissiveIntensity = 0.8;
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.y = 2.2;
    gem.rotation.x = Math.PI / 4;
    gem.name = 'gem';
    group.add(gem);

    // 宝石の光
    const glowGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const glowMat = this.materials.magic({
      color: palette.glow,
      opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 2.2;
    glow.name = 'glow';
    group.add(glow);

    // 浮遊するルーン（装飾）
    for (let i = 0; i < 3; i++) {
      const runeGeo = new THREE.RingGeometry(0.08, 0.1, 6);
      const runeMat = this.materials.magic({
        color: palette.glow,
        opacity: 0.5
      });
      const rune = new THREE.Mesh(runeGeo, runeMat);
      const angle = (i / 3) * Math.PI * 2;
      rune.position.set(
        Math.cos(angle) * 0.2,
        2.2 + Math.sin(i) * 0.1,
        Math.sin(angle) * 0.2
      );
      rune.lookAt(group.position.x, 2.2, group.position.z);
      group.add(rune);
    }

    // 底部の装飾
    const endCapGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const endCapMat = this.materials.metal({ color: palette.wood });
    const endCap = new THREE.Mesh(endCapGeo, endCapMat);
    endCap.position.y = 0;
    endCap.scale.y = 1.5;
    group.add(endCap);

    // 杖を少し傾ける
    group.rotation.z = 0.1;

    return new Model3D(group, {
      id: 'staff',
      name: '魔法の杖',
      variant: variant,
      defaultAnimation: 'float'
    }, this.animations);
  }

  // ==================== ポーション ====================
  createPotion(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'health';
    const group = new THREE.Group();

    const colors = {
      health: { liquid: 0xff3333, glow: 0xff6666, label: 0xcc0000 },
      mana: { liquid: 0x3333ff, glow: 0x6666ff, label: 0x0000cc },
      speed: { liquid: 0x33ff33, glow: 0x66ff66, label: 0x00cc00 },
      power: { liquid: 0xff8800, glow: 0xffaa44, label: 0xcc6600 }
    };
    const palette = colors[variant] || colors.health;

    // ビンの本体
    const bottleGroup = new THREE.Group();

    // ビンの下部（球形）
    const bulbGeo = new THREE.SphereGeometry(0.3, 24, 24);
    const glassMat = this.materials.glass({
      color: 0xffffff,
      transmission: 0.9,
      thickness: 0.5,
      opacity: 0.3
    });
    const bulb = new THREE.Mesh(bulbGeo, glassMat);
    bulb.scale.y = 1.2;
    bulb.castShadow = true;
    bottleGroup.add(bulb);

    // ビンの首
    const neckGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.25, 16);
    const neck = new THREE.Mesh(neckGeo, glassMat.clone());
    neck.position.y = 0.4;
    bottleGroup.add(neck);

    // 液体
    const liquidGeo = new THREE.SphereGeometry(0.25, 24, 24);
    const liquidMat = this.materials.physical({
      color: palette.liquid,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.5,
      thickness: 1.0,
      emissive: palette.glow,
      emissiveIntensity: 0.3
    });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.scale.set(0.9, 1.0, 0.9);
    liquid.name = 'liquid';
    bottleGroup.add(liquid);

    // 泡
    for (let i = 0; i < 5; i++) {
      const bubbleGeo = new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 8, 8);
      const bubbleMat = this.materials.standard({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4
      });
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
      bubble.position.set(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.2
      );
      bubble.name = `bubble_${i}`;
      bottleGroup.add(bubble);
    }

    // コルク栓
    const corkGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.12, 12);
    const corkMat = this.materials.standard({ color: 0xd2691e, roughness: 0.9 });
    const cork = new THREE.Mesh(corkGeo, corkMat);
    cork.position.y = 0.55;
    bottleGroup.add(cork);

    // ラベル
    const labelGeo = new THREE.PlaneGeometry(0.25, 0.15);
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 64;
    labelCanvas.height = 32;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(0, 0, 64, 32);
    ctx.fillStyle = `#${palette.label.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 16px serif';
    ctx.textAlign = 'center';
    const labelText = {
      health: 'HP',
      mana: 'MP',
      speed: 'SPD',
      power: 'PWR'
    };
    ctx.fillText(labelText[variant] || '?', 32, 22);

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTexture,
      transparent: true
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(0, 0.05, 0.31);
    bottleGroup.add(label);

    group.add(bottleGroup);

    // 光のエフェクト
    const glowGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const glowMat = this.materials.magic({
      color: palette.glow,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.name = 'glow';
    group.add(glow);

    group.userData.baseY = 0;

    return new Model3D(group, {
      id: 'potion',
      name: 'ポーション',
      variant: variant,
      defaultAnimation: 'float'
    }, this.animations);
  }

  // ========== ユーティリティ ==========

  /**
   * 星形状を作成
   */
  createStarShape(outerRadius, innerRadius, points) {
    const THREE = this.THREE;
    const shape = new THREE.Shape();

    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();

    return shape;
  }
}

export default ItemModels;
