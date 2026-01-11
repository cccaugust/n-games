/**
 * N-Games Prop Models
 * 高品質な環境オブジェクト3Dモデル生成
 */

import { Model3D } from './model-factory.js';

export class PropModels {
  constructor(THREE, materials, animations) {
    this.THREE = THREE;
    this.materials = materials;
    this.animations = animations;
  }

  // ==================== 木 ====================
  createTree(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'oak';
    const group = new THREE.Group();

    const colors = {
      oak: { trunk: 0x8B4513, leaves: 0x228B22, accent: 0x32CD32 },
      pine: { trunk: 0x654321, leaves: 0x0d5c0d, accent: 0x1a8c1a },
      sakura: { trunk: 0x8B4513, leaves: 0xFFB7C5, accent: 0xFF69B4 },
      autumn: { trunk: 0x8B4513, leaves: 0xFF8C00, accent: 0xFF4500 }
    };
    const palette = colors[variant] || colors.oak;

    // 幹
    const trunkGroup = new THREE.Group();
    trunkGroup.name = 'trunk';

    // メインの幹
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 1.5, 12);
    const trunkMat = this.materials.wood({ baseColor: `#${palette.trunk.toString(16)}` });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    trunkGroup.add(trunk);

    // 枝（左）
    const branchGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.6, 8);
    const leftBranch = new THREE.Mesh(branchGeo, trunkMat.clone());
    leftBranch.position.set(-0.25, 1.2, 0);
    leftBranch.rotation.z = Math.PI / 4;
    leftBranch.castShadow = true;
    trunkGroup.add(leftBranch);

    // 枝（右）
    const rightBranch = new THREE.Mesh(branchGeo, trunkMat.clone());
    rightBranch.position.set(0.25, 1.0, 0.1);
    rightBranch.rotation.z = -Math.PI / 5;
    rightBranch.rotation.y = 0.3;
    rightBranch.castShadow = true;
    trunkGroup.add(rightBranch);

    group.add(trunkGroup);

    // 葉（フォリッジ）
    const foliageGroup = new THREE.Group();
    foliageGroup.name = 'foliage';

    if (variant === 'pine') {
      // 針葉樹（コーン形状）
      for (let i = 0; i < 3; i++) {
        const coneGeo = new THREE.ConeGeometry(0.6 - i * 0.15, 0.8, 8);
        const coneMat = this.materials.standard({
          color: palette.leaves,
          roughness: 0.8,
          flatShading: true
        });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.y = 1.5 + i * 0.5;
        cone.castShadow = true;
        foliageGroup.add(cone);
      }
    } else {
      // 広葉樹（球形の葉）
      const leafPositions = [
        { x: 0, y: 2.0, z: 0, scale: 1.0 },
        { x: -0.4, y: 1.8, z: 0.2, scale: 0.7 },
        { x: 0.4, y: 1.7, z: -0.2, scale: 0.7 },
        { x: 0, y: 1.6, z: -0.4, scale: 0.6 },
        { x: -0.3, y: 2.3, z: 0, scale: 0.5 },
        { x: 0.3, y: 2.2, z: 0.2, scale: 0.5 }
      ];

      leafPositions.forEach((pos, i) => {
        const leafGeo = new THREE.IcosahedronGeometry(0.5 * pos.scale, 1);
        const leafMat = this.materials.standard({
          color: i % 2 === 0 ? palette.leaves : palette.accent,
          roughness: 0.8,
          flatShading: true
        });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(pos.x, pos.y, pos.z);
        leaf.rotation.set(Math.random(), Math.random(), Math.random());
        leaf.castShadow = true;
        foliageGroup.add(leaf);
      });
    }

    // 桜の場合、花びらパーティクル
    if (variant === 'sakura') {
      for (let i = 0; i < 10; i++) {
        const petalGeo = new THREE.CircleGeometry(0.05, 5);
        const petalMat = this.materials.standard({
          color: 0xFFB7C5,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.position.set(
          (Math.random() - 0.5) * 1.5,
          1.5 + Math.random() * 1.5,
          (Math.random() - 0.5) * 1.5
        );
        petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        foliageGroup.add(petal);
      }
    }

    group.add(foliageGroup);

    // 根元の装飾
    const rootGeo = new THREE.TorusGeometry(0.3, 0.08, 6, 12, Math.PI);
    const rootMat = this.materials.wood({ baseColor: `#${palette.trunk.toString(16)}` });
    for (let i = 0; i < 3; i++) {
      const root = new THREE.Mesh(rootGeo, rootMat);
      root.rotation.x = Math.PI / 2;
      root.rotation.z = (i / 3) * Math.PI * 2;
      root.position.y = 0.05;
      group.add(root);
    }

    // 影
    const shadowGeo = new THREE.CircleGeometry(0.8, 16);
    const shadowMat = this.materials.standard({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    group.add(shadow);

    return new Model3D(group, {
      id: 'tree',
      name: '木',
      variant: variant,
      defaultAnimation: 'sway'
    }, this.animations);
  }

  // ==================== 岩 ====================
  createRock(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'gray';
    const group = new THREE.Group();

    const colors = {
      gray: { main: 0x666666, accent: 0x888888 },
      brown: { main: 0x8B7355, accent: 0xA08060 },
      mossy: { main: 0x556B2F, accent: 0x6B8E23 },
      crystal: { main: 0x4169E1, accent: 0x00BFFF }
    };
    const palette = colors[variant] || colors.gray;

    // メインの岩
    const rockGeo = new THREE.IcosahedronGeometry(0.6, 0);
    // 頂点をランダムに変形
    const positions = rockGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const noise = 0.85 + Math.random() * 0.3;
      positions.setXYZ(i, x * noise, y * noise * 0.8, z * noise);
    }
    rockGeo.computeVertexNormals();

    const rockMat = variant === 'crystal'
      ? this.materials.crystal({ color: palette.main })
      : this.materials.stone({ baseColor: `#${palette.main.toString(16)}` });

    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.y = 0.35;
    rock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, 0);
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);

    // 小さな岩（周囲）
    for (let i = 0; i < 3; i++) {
      const smallRockGeo = new THREE.IcosahedronGeometry(0.15 + Math.random() * 0.1, 0);
      const smallPositions = smallRockGeo.attributes.position;
      for (let j = 0; j < smallPositions.count; j++) {
        const x = smallPositions.getX(j);
        const y = smallPositions.getY(j);
        const z = smallPositions.getZ(j);
        const noise = 0.8 + Math.random() * 0.4;
        smallPositions.setXYZ(j, x * noise, y * noise, z * noise);
      }
      smallRockGeo.computeVertexNormals();

      const smallRock = new THREE.Mesh(smallRockGeo, rockMat.clone());
      const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
      smallRock.position.set(
        Math.cos(angle) * 0.6,
        0.1,
        Math.sin(angle) * 0.6
      );
      smallRock.rotation.set(Math.random(), Math.random(), Math.random());
      smallRock.castShadow = true;
      group.add(smallRock);
    }

    // 苔のバリアント
    if (variant === 'mossy') {
      const mossGeo = new THREE.SphereGeometry(0.62, 8, 8, 0, Math.PI * 2, 0, Math.PI / 3);
      const mossMat = this.materials.standard({
        color: 0x2E8B57,
        roughness: 1,
        transparent: true,
        opacity: 0.8
      });
      const moss = new THREE.Mesh(mossGeo, mossMat);
      moss.position.y = 0.35;
      moss.rotation.x = Math.PI;
      group.add(moss);
    }

    // クリスタルバリアントは発光
    if (variant === 'crystal') {
      const glowGeo = new THREE.SphereGeometry(0.7, 16, 16);
      const glowMat = this.materials.magic({
        color: palette.accent,
        opacity: 0.2
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 0.35;
      group.add(glow);
    }

    return new Model3D(group, {
      id: 'rock',
      name: '岩',
      variant: variant
    }, this.animations);
  }

  // ==================== 木箱 ====================
  createCrate(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'wood';
    const group = new THREE.Group();

    const colors = {
      wood: { main: 0x8B4513, trim: 0x654321 },
      metal: { main: 0x696969, trim: 0x2F4F4F },
      explosive: { main: 0xB22222, trim: 0x8B0000 }
    };
    const palette = colors[variant] || colors.wood;

    // 箱本体
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const boxMat = variant === 'wood'
      ? this.materials.wood({ baseColor: `#${palette.main.toString(16)}` })
      : this.materials.metal({ color: palette.main, roughness: 0.5 });

    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 0.5;
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);

    // 縁取り
    const trimMat = variant === 'wood'
      ? this.materials.wood({ baseColor: `#${palette.trim.toString(16)}` })
      : this.materials.metal({ color: palette.trim, roughness: 0.3 });

    // 横の帯
    const hBandGeo = new THREE.BoxGeometry(1.05, 0.1, 1.05);
    const topBand = new THREE.Mesh(hBandGeo, trimMat);
    topBand.position.y = 0.95;
    group.add(topBand);
    const bottomBand = new THREE.Mesh(hBandGeo, trimMat.clone());
    bottomBand.position.y = 0.05;
    group.add(bottomBand);

    // 縦の帯
    const vBandGeo = new THREE.BoxGeometry(0.1, 1.05, 0.1);
    const corners = [
      { x: -0.5, z: -0.5 },
      { x: 0.5, z: -0.5 },
      { x: -0.5, z: 0.5 },
      { x: 0.5, z: 0.5 }
    ];
    corners.forEach(corner => {
      const band = new THREE.Mesh(vBandGeo, trimMat.clone());
      band.position.set(corner.x, 0.5, corner.z);
      group.add(band);
    });

    // 爆発物の場合は警告マーク
    if (variant === 'explosive') {
      // 危険マーク（円）
      const warnGeo = new THREE.CircleGeometry(0.2, 16);
      const warnMat = this.materials.standard({
        color: 0xFFFF00,
        emissive: 0xFFFF00,
        emissiveIntensity: 0.3
      });

      // 4面に配置
      const faces = [
        { pos: [0, 0.5, 0.51], rot: [0, 0, 0] },
        { pos: [0, 0.5, -0.51], rot: [0, Math.PI, 0] },
        { pos: [0.51, 0.5, 0], rot: [0, Math.PI / 2, 0] },
        { pos: [-0.51, 0.5, 0], rot: [0, -Math.PI / 2, 0] }
      ];

      faces.forEach(face => {
        const warn = new THREE.Mesh(warnGeo, warnMat);
        warn.position.set(...face.pos);
        warn.rotation.set(...face.rot);
        group.add(warn);

        // 感嘆符
        const exclamGeo = new THREE.BoxGeometry(0.05, 0.15, 0.02);
        const exclamMat = this.materials.standard({ color: 0x000000 });
        const exclam = new THREE.Mesh(exclamGeo, exclamMat);
        exclam.position.set(face.pos[0], face.pos[1] + 0.03, face.pos[2] + 0.01 * (face.rot[1] === 0 ? 1 : -1));
        if (face.rot[1] !== 0) {
          exclam.rotation.y = face.rot[1];
          exclam.position.x += Math.sin(face.rot[1]) * 0.01;
          exclam.position.z = face.pos[2];
        }
        group.add(exclam);
      });
    }

    return new Model3D(group, {
      id: 'crate',
      name: '木箱',
      variant: variant,
      defaultAnimation: variant === 'explosive' ? 'chestShake' : null
    }, this.animations);
  }

  // ==================== クリスタル ====================
  createCrystal(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'blue';
    const group = new THREE.Group();

    const colors = {
      blue: { main: 0x4169E1, glow: 0x87CEEB },
      red: { main: 0xDC143C, glow: 0xFF6B6B },
      green: { main: 0x32CD32, glow: 0x90EE90 },
      purple: { main: 0x9370DB, glow: 0xDDA0DD },
      rainbow: { main: 0xFF69B4, glow: 0xFFFFFF }
    };
    const palette = colors[variant] || colors.blue;

    // メインクリスタル
    const crystalGeo = new THREE.ConeGeometry(0.3, 1.2, 6);
    const crystalMat = this.materials.crystal({ color: palette.main });
    crystalMat.emissive = new THREE.Color(palette.glow);
    crystalMat.emissiveIntensity = 0.4;

    const mainCrystal = new THREE.Mesh(crystalGeo, crystalMat);
    mainCrystal.position.y = 0.6;
    mainCrystal.castShadow = true;
    group.add(mainCrystal);

    // サブクリスタル
    const subPositions = [
      { x: -0.3, y: 0.3, z: 0.1, scale: 0.5, rot: -0.3 },
      { x: 0.25, y: 0.25, z: -0.15, scale: 0.4, rot: 0.4 },
      { x: 0.1, y: 0.2, z: 0.25, scale: 0.35, rot: 0.2 },
      { x: -0.15, y: 0.15, z: -0.25, scale: 0.3, rot: -0.5 }
    ];

    subPositions.forEach(pos => {
      const subCrystal = new THREE.Mesh(crystalGeo, crystalMat.clone());
      subCrystal.position.set(pos.x, pos.y, pos.z);
      subCrystal.scale.set(pos.scale, pos.scale, pos.scale);
      subCrystal.rotation.z = pos.rot;
      subCrystal.castShadow = true;
      group.add(subCrystal);
    });

    // 台座
    const baseGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.15, 8);
    const baseMat = this.materials.stone({ baseColor: '#444444' });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.075;
    base.receiveShadow = true;
    group.add(base);

    // 光のエフェクト
    const glowGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const glowMat = this.materials.magic({
      color: palette.glow,
      opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.5;
    glow.name = 'glow';
    group.add(glow);

    // 虹色の場合は色が変化するパーティクル
    if (variant === 'rainbow') {
      for (let i = 0; i < 8; i++) {
        const particleGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const hue = i / 8;
        const particleMat = this.materials.emissive({
          color: new THREE.Color().setHSL(hue, 1, 0.5).getHex(),
          intensity: 1
        });
        particleMat.transparent = true;
        particleMat.opacity = 0.8;

        const particle = new THREE.Mesh(particleGeo, particleMat);
        const angle = (i / 8) * Math.PI * 2;
        particle.position.set(
          Math.cos(angle) * 0.5,
          0.5 + Math.sin(angle * 2) * 0.3,
          Math.sin(angle) * 0.5
        );
        group.add(particle);
      }
    }

    return new Model3D(group, {
      id: 'crystal',
      name: 'クリスタル',
      variant: variant,
      defaultAnimation: 'crystalGlow'
    }, this.animations);
  }

  // ==================== 松明 ====================
  createTorch(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'standing';
    const group = new THREE.Group();

    const colors = {
      standing: { wood: 0x8B4513, fire: 0xFF4500, mount: 0x2F4F4F },
      wall: { wood: 0x654321, fire: 0xFF6600, mount: 0x696969 },
      magic: { wood: 0x4B0082, fire: 0x00FFFF, mount: 0x1a1a2e }
    };
    const palette = colors[variant] || colors.standing;

    // 柄
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.8, 12);
    const handleMat = this.materials.wood({ baseColor: `#${palette.wood.toString(16)}` });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = 0.4;
    handle.castShadow = true;
    group.add(handle);

    // 火皿
    const bowlGeo = new THREE.CylinderGeometry(0.1, 0.06, 0.12, 12);
    const bowlMat = this.materials.metal({ color: palette.mount, roughness: 0.4 });
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    bowl.position.y = 0.85;
    group.add(bowl);

    // 炎
    const flameGroup = new THREE.Group();
    flameGroup.name = 'flame';

    // メイン炎
    const flameGeo = new THREE.ConeGeometry(0.08, 0.25, 8);
    const flameMat = this.materials.fire({ color: palette.fire });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.15;
    flameGroup.add(flame);

    // サブ炎
    for (let i = 0; i < 3; i++) {
      const subFlameGeo = new THREE.ConeGeometry(0.04, 0.15, 6);
      const subFlame = new THREE.Mesh(subFlameGeo, flameMat.clone());
      const angle = (i / 3) * Math.PI * 2;
      subFlame.position.set(
        Math.cos(angle) * 0.04,
        0.1,
        Math.sin(angle) * 0.04
      );
      subFlame.rotation.z = (Math.random() - 0.5) * 0.3;
      flameGroup.add(subFlame);
    }

    flameGroup.position.y = 0.9;
    group.add(flameGroup);

    // 光源（ポイントライト用のダミー）
    const lightDummy = new THREE.Mesh(
      new THREE.SphereGeometry(0.01),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    lightDummy.position.y = 1.0;
    lightDummy.name = 'light';
    lightDummy.userData.isLight = true;
    lightDummy.userData.color = palette.fire;
    lightDummy.userData.intensity = 1;
    lightDummy.userData.distance = 5;
    group.add(lightDummy);

    // 光のグロー
    const glowGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const glowMat = this.materials.magic({
      color: palette.fire,
      opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 1.0;
    glow.name = 'glow';
    group.add(glow);

    // 壁掛けの場合
    if (variant === 'wall') {
      // 壁のブラケット
      const bracketGeo = new THREE.BoxGeometry(0.15, 0.15, 0.2);
      const bracket = new THREE.Mesh(bracketGeo, bowlMat);
      bracket.position.set(0, 0.5, -0.15);
      group.add(bracket);

      // 傾ける
      group.rotation.x = 0.3;
    }

    // 魔法の松明
    if (variant === 'magic') {
      // 魔法のルーン
      const runeGeo = new THREE.RingGeometry(0.12, 0.14, 6);
      const runeMat = this.materials.magic({
        color: palette.fire,
        opacity: 0.6
      });
      const rune = new THREE.Mesh(runeGeo, runeMat);
      rune.position.y = 0.6;
      rune.rotation.x = Math.PI / 2;
      group.add(rune);
    }

    return new Model3D(group, {
      id: 'torch',
      name: '松明',
      variant: variant,
      defaultAnimation: 'burn'
    }, this.animations);
  }

  // ==================== 草 ====================
  createGrass(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'green';
    const group = new THREE.Group();

    const colors = {
      green: { main: 0x228B22, accent: 0x32CD32 },
      tall: { main: 0x2E8B57, accent: 0x3CB371 },
      flowers: { main: 0x228B22, accent: 0xFF69B4 }
    };
    const palette = colors[variant] || colors.green;

    const bladeCount = variant === 'tall' ? 8 : 15;
    const maxHeight = variant === 'tall' ? 0.8 : 0.4;

    // 草の葉
    for (let i = 0; i < bladeCount; i++) {
      const height = maxHeight * (0.5 + Math.random() * 0.5);
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(-0.02, 0);
      bladeShape.lineTo(-0.015, height * 0.5);
      bladeShape.quadraticCurveTo(-0.01, height * 0.8, 0, height);
      bladeShape.quadraticCurveTo(0.01, height * 0.8, 0.015, height * 0.5);
      bladeShape.lineTo(0.02, 0);
      bladeShape.closePath();

      const bladeGeo = new THREE.ShapeGeometry(bladeShape);
      const bladeMat = this.materials.standard({
        color: Math.random() > 0.3 ? palette.main : palette.accent,
        side: THREE.DoubleSide,
        roughness: 0.8
      });

      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 0.3;
      blade.position.set(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      blade.rotation.y = angle;
      blade.rotation.x = -0.1 + Math.random() * 0.2;
      blade.userData.phase = Math.random() * Math.PI * 2;
      group.add(blade);
    }

    // 花のバリアント
    if (variant === 'flowers') {
      for (let i = 0; i < 5; i++) {
        const flowerGroup = new THREE.Group();

        // 花びら
        const petalGeo = new THREE.CircleGeometry(0.04, 6);
        const petalColors = [0xFF69B4, 0xFFFF00, 0x87CEEB, 0xFFFFFF, 0xFF6347];
        const petalMat = this.materials.standard({
          color: petalColors[i % petalColors.length],
          side: THREE.DoubleSide
        });

        for (let j = 0; j < 5; j++) {
          const petal = new THREE.Mesh(petalGeo, petalMat);
          const pAngle = (j / 5) * Math.PI * 2;
          petal.position.set(
            Math.cos(pAngle) * 0.03,
            0,
            Math.sin(pAngle) * 0.03
          );
          petal.rotation.x = -Math.PI / 3;
          petal.rotation.z = pAngle;
          flowerGroup.add(petal);
        }

        // 中心
        const centerGeo = new THREE.SphereGeometry(0.02, 8, 8);
        const centerMat = this.materials.standard({ color: 0xFFFF00 });
        const center = new THREE.Mesh(centerGeo, centerMat);
        flowerGroup.add(center);

        // 茎
        const stemGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.2 + Math.random() * 0.1, 4);
        const stemMat = this.materials.standard({ color: 0x228B22 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = -0.1;
        flowerGroup.add(stem);

        const angle = Math.random() * Math.PI * 2;
        const distance = 0.1 + Math.random() * 0.2;
        flowerGroup.position.set(
          Math.cos(angle) * distance,
          0.2 + Math.random() * 0.1,
          Math.sin(angle) * distance
        );
        group.add(flowerGroup);
      }
    }

    group.userData.isGrass = true;

    return new Model3D(group, {
      id: 'grass',
      name: '草',
      variant: variant,
      defaultAnimation: 'sway'
    }, this.animations);
  }

  // ==================== 柵 ====================
  createFence(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'wood';
    const group = new THREE.Group();

    const colors = {
      wood: { main: 0x8B4513, post: 0x654321 },
      stone: { main: 0x696969, post: 0x4a4a4a },
      iron: { main: 0x2F4F4F, post: 0x1a1a1a }
    };
    const palette = colors[variant] || colors.wood;

    const postCount = 3;
    const spacing = 0.8;
    const totalWidth = (postCount - 1) * spacing;

    // 支柱
    for (let i = 0; i < postCount; i++) {
      const postGeo = variant === 'wood'
        ? new THREE.BoxGeometry(0.1, 1.0, 0.1)
        : new THREE.CylinderGeometry(0.05, 0.06, 1.0, variant === 'stone' ? 6 : 12);

      const postMat = variant === 'wood'
        ? this.materials.wood({ baseColor: `#${palette.post.toString(16)}` })
        : this.materials.stone({ baseColor: `#${palette.post.toString(16)}` });

      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(i * spacing - totalWidth / 2, 0.5, 0);
      post.castShadow = true;
      group.add(post);

      // 支柱の先端
      if (variant === 'wood') {
        const topGeo = new THREE.ConeGeometry(0.06, 0.15, 4);
        const top = new THREE.Mesh(topGeo, postMat.clone());
        top.position.set(i * spacing - totalWidth / 2, 1.05, 0);
        top.rotation.y = Math.PI / 4;
        group.add(top);
      }
    }

    // 横木
    const railCount = variant === 'iron' ? 8 : 2;
    const railMat = variant === 'wood'
      ? this.materials.wood({ baseColor: `#${palette.main.toString(16)}` })
      : variant === 'iron'
        ? this.materials.metal({ color: palette.main, roughness: 0.4 })
        : this.materials.stone({ baseColor: `#${palette.main.toString(16)}` });

    for (let i = 0; i < railCount; i++) {
      const yPos = 0.3 + (i / (railCount - 1)) * 0.5;

      if (variant === 'iron') {
        // 鉄柵は細い棒
        const barGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8);
        const bar = new THREE.Mesh(barGeo, railMat);
        bar.position.set((i - railCount / 2 + 0.5) * 0.18, 0.5, 0);
        bar.castShadow = true;
        group.add(bar);
      } else {
        // 木/石は横木
        const railGeo = new THREE.BoxGeometry(totalWidth + 0.1, 0.08, 0.06);
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(0, yPos, 0);
        rail.castShadow = true;
        group.add(rail);
      }
    }

    // 鉄柵の場合は上下のレール
    if (variant === 'iron') {
      const topRailGeo = new THREE.BoxGeometry(totalWidth + 0.1, 0.04, 0.04);
      const topRail = new THREE.Mesh(topRailGeo, railMat);
      topRail.position.set(0, 0.9, 0);
      group.add(topRail);

      const bottomRail = new THREE.Mesh(topRailGeo, railMat.clone());
      bottomRail.position.set(0, 0.1, 0);
      group.add(bottomRail);
    }

    return new Model3D(group, {
      id: 'fence',
      name: '柵',
      variant: variant
    }, this.animations);
  }

  // ==================== ポータル ====================
  createPortal(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'blue';
    const group = new THREE.Group();

    const colors = {
      blue: { main: 0x4169E1, glow: 0x00BFFF, particle: 0x87CEEB },
      purple: { main: 0x8B008B, glow: 0xDA70D6, particle: 0xDDA0DD },
      gold: { main: 0xDAA520, glow: 0xFFD700, particle: 0xFFEC8B },
      dark: { main: 0x1a1a2e, glow: 0x4a0080, particle: 0x8B008B }
    };
    const palette = colors[variant] || colors.blue;

    // 外枠
    const frameGeo = new THREE.TorusGeometry(1.0, 0.12, 16, 32);
    const frameMat = this.materials.metal({
      color: 0x4a4a4a,
      roughness: 0.3,
      metalness: 0.9
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.castShadow = true;
    group.add(frame);

    // 装飾リング
    const ringGeo = new THREE.TorusGeometry(0.9, 0.04, 8, 32);
    const ringMat = this.materials.emissive({
      color: palette.main,
      intensity: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = 'ring';
    group.add(ring);

    // 内側のリング
    const innerRingGeo = new THREE.TorusGeometry(0.7, 0.03, 8, 24);
    const innerRing = new THREE.Mesh(innerRingGeo, ringMat.clone());
    innerRing.name = 'innerRing';
    group.add(innerRing);

    // 渦巻きエフェクト
    const vortexGeo = new THREE.CircleGeometry(0.8, 32);
    const vortexMat = this.materials.magic({
      color: palette.glow,
      opacity: 0.6
    });
    const vortex = new THREE.Mesh(vortexGeo, vortexMat);
    vortex.name = 'vortex';
    group.add(vortex);

    // 中心のグロー
    const centerGlowGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const centerGlowMat = this.materials.emissive({
      color: palette.glow,
      intensity: 1.0
    });
    centerGlowMat.transparent = true;
    centerGlowMat.opacity = 0.5;
    const centerGlow = new THREE.Mesh(centerGlowGeo, centerGlowMat);
    centerGlow.scale.z = 0.2;
    group.add(centerGlow);

    // 浮遊するパーティクル
    for (let i = 0; i < 20; i++) {
      const particleGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const particleMat = this.materials.emissive({
        color: palette.particle,
        intensity: 0.8
      });
      particleMat.transparent = true;
      particleMat.opacity = 0.6;

      const particle = new THREE.Mesh(particleGeo, particleMat);
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.5;
      particle.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        (Math.random() - 0.5) * 0.3
      );
      particle.userData.angle = angle;
      particle.userData.radius = radius;
      particle.userData.speed = 0.5 + Math.random() * 0.5;
      group.add(particle);
    }

    // ルーン文字（外枠の装飾）
    for (let i = 0; i < 8; i++) {
      const runeGeo = new THREE.BoxGeometry(0.08, 0.15, 0.02);
      const runeMat = this.materials.emissive({
        color: palette.main,
        intensity: 0.5
      });
      const rune = new THREE.Mesh(runeGeo, runeMat);
      const angle = (i / 8) * Math.PI * 2;
      rune.position.set(
        Math.cos(angle) * 1.15,
        Math.sin(angle) * 1.15,
        0.1
      );
      rune.rotation.z = angle;
      group.add(rune);
    }

    // 台座
    const baseGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.2, 16);
    const baseMat = this.materials.stone({ baseColor: '#333333' });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -1.1;
    base.receiveShadow = true;
    group.add(base);

    // ポータルを立てる
    group.rotation.x = Math.PI / 2;
    group.position.y = 1.2;

    return new Model3D(group, {
      id: 'portal',
      name: 'ポータル',
      variant: variant,
      defaultAnimation: 'portalIdle'
    }, this.animations);
  }

  // ==================== インク飛沫 ====================
  createInkSplat(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'orange';
    const group = new THREE.Group();

    // スプラトゥーン風カラーパレット
    const colors = {
      orange: { main: 0xff6b00, accent: 0xffaa00, glow: 0xff8844 },
      cyan: { main: 0x00d4ff, accent: 0x00ffff, glow: 0x44ddff },
      purple: { main: 0xaa00ff, accent: 0xdd66ff, glow: 0xcc44ff },
      pink: { main: 0xff4488, accent: 0xff88aa, glow: 0xff66aa },
      lime: { main: 0xaaff00, accent: 0xddff55, glow: 0xccff44 },
      yellow: { main: 0xffdd00, accent: 0xffee55, glow: 0xffee44 }
    };
    const palette = colors[variant] || colors.orange;

    // メインのインク溜まり（不規則な形状）
    const createInkBlob = (x, z, size, height) => {
      const blobGroup = new THREE.Group();

      // メイン部分（平たい円形）
      const mainGeo = new THREE.CylinderGeometry(size, size * 1.1, height, 16, 1);
      const mainMat = this.materials.physical({
        color: palette.main,
        roughness: 0.3,
        metalness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2
      });
      const main = new THREE.Mesh(mainGeo, mainMat);
      main.position.y = height / 2;
      main.receiveShadow = true;
      blobGroup.add(main);

      // 不規則な縁（周囲に小さな飛沫）
      const splashCount = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < splashCount; i++) {
        const angle = (i / splashCount) * Math.PI * 2 + Math.random() * 0.5;
        const dist = size * (0.7 + Math.random() * 0.4);
        const splashSize = size * (0.2 + Math.random() * 0.3);

        const splashGeo = new THREE.SphereGeometry(splashSize, 12, 8);
        const splashMat = mainMat.clone();
        const splash = new THREE.Mesh(splashGeo, splashMat);
        splash.position.set(
          Math.cos(angle) * dist,
          height * 0.3,
          Math.sin(angle) * dist
        );
        splash.scale.set(1, 0.3, 1);
        splash.receiveShadow = true;
        blobGroup.add(splash);
      }

      blobGroup.position.set(x, 0, z);
      return blobGroup;
    };

    // 中央の大きなインク
    group.add(createInkBlob(0, 0, 0.6, 0.08));

    // 周囲の小さなインク
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 0.5 + Math.random() * 0.3;
      const size = 0.15 + Math.random() * 0.15;
      group.add(createInkBlob(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        size,
        0.04
      ));
    }

    // 飛び散ったインクの点々
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.8 + Math.random() * 0.5;
      const dotGeo = new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 8, 8);
      const dotMat = this.materials.physical({
        color: palette.main,
        roughness: 0.3,
        clearcoat: 0.8
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(
        Math.cos(angle) * dist,
        0.02,
        Math.sin(angle) * dist
      );
      dot.scale.set(1, 0.4, 1);
      group.add(dot);
    }

    // インクの光沢ハイライト
    const highlightGeo = new THREE.CircleGeometry(0.15, 16);
    const highlightMat = this.materials.emissive({
      color: palette.glow,
      intensity: 0.2
    });
    highlightMat.transparent = true;
    highlightMat.opacity = 0.4;
    const highlight = new THREE.Mesh(highlightGeo, highlightMat);
    highlight.rotation.x = -Math.PI / 2;
    highlight.position.set(0.1, 0.09, -0.1);
    group.add(highlight);

    group.userData.isInkSplat = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'ink-splat',
      name: 'インク飛沫',
      variant: variant,
      defaultAnimation: 'none'
    }, this.animations);
  }

  // ==================== インクタンク ====================
  createInkTank(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'orange';
    const group = new THREE.Group();

    const colors = {
      orange: { main: 0xff6b00, accent: 0xffaa00, glow: 0xff8844 },
      cyan: { main: 0x00d4ff, accent: 0x00ffff, glow: 0x44ddff },
      purple: { main: 0xaa00ff, accent: 0xdd66ff, glow: 0xcc44ff },
      pink: { main: 0xff4488, accent: 0xff88aa, glow: 0xff66aa }
    };
    const palette = colors[variant] || colors.orange;

    // タンク本体（透明な容器）
    const tankGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.7, 16, 1, true);
    const tankMat = this.materials.physical({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.1,
      transparent: true,
      opacity: 0.3
    });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.y = 0.35;
    group.add(tank);

    // インク（中身）
    const inkGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.5, 16);
    const inkMat = this.materials.physical({
      color: palette.main,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.5
    });
    const ink = new THREE.Mesh(inkGeo, inkMat);
    ink.position.y = 0.3;
    ink.name = 'ink';
    group.add(ink);

    // タンク上部キャップ
    const topCapGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16);
    const capMat = this.materials.metal({ color: 0x444444, roughness: 0.4 });
    const topCap = new THREE.Mesh(topCapGeo, capMat);
    topCap.position.y = 0.74;
    topCap.castShadow = true;
    group.add(topCap);

    // タンク下部キャップ
    const bottomCapGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16);
    const bottomCap = new THREE.Mesh(bottomCapGeo, capMat.clone());
    bottomCap.position.y = 0.04;
    bottomCap.castShadow = true;
    group.add(bottomCap);

    // ストラップ金具
    const createBuckle = (y) => {
      const buckleGeo = new THREE.BoxGeometry(0.08, 0.12, 0.05);
      const buckleMat = this.materials.metal({ color: 0x888888, roughness: 0.3 });
      const buckle = new THREE.Mesh(buckleGeo, buckleMat);
      buckle.position.set(0, y, 0.28);
      return buckle;
    };
    group.add(createBuckle(0.55));
    group.add(createBuckle(0.15));

    // ストラップ
    const strapGeo = new THREE.BoxGeometry(0.06, 0.5, 0.02);
    const strapMat = this.materials.standard({ color: 0x222222, roughness: 0.9 });
    const strap = new THREE.Mesh(strapGeo, strapMat);
    strap.position.set(0, 0.35, 0.3);
    group.add(strap);

    // インク残量ゲージ
    const gaugeGeo = new THREE.BoxGeometry(0.04, 0.5, 0.02);
    const gaugeMat = this.materials.emissive({ color: palette.glow, intensity: 0.5 });
    const gauge = new THREE.Mesh(gaugeGeo, gaugeMat);
    gauge.position.set(0.27, 0.35, 0);
    gauge.name = 'gauge';
    group.add(gauge);

    // ゲージ背景
    const gaugeBgGeo = new THREE.BoxGeometry(0.06, 0.55, 0.03);
    const gaugeBgMat = this.materials.standard({ color: 0x111111, roughness: 0.8 });
    const gaugeBg = new THREE.Mesh(gaugeBgGeo, gaugeBgMat);
    gaugeBg.position.set(0.27, 0.35, -0.01);
    group.add(gaugeBg);

    group.userData.isInkTank = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'ink-tank',
      name: 'インクタンク',
      variant: variant,
      defaultAnimation: 'none'
    }, this.animations);
  }
}

export default PropModels;
