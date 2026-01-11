/**
 * N-Games Character Models
 * 高品質なキャラクター3Dモデル生成
 */

import { Model3D } from './model-factory.js';

export class CharacterModels {
  constructor(THREE, materials, animations) {
    this.THREE = THREE;
    this.materials = materials;
    this.animations = animations;
  }

  // ==================== ロボット ====================
  createRobot(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'blue';
    const group = new THREE.Group();

    // カラーパレット
    const colors = {
      blue: { main: 0x3498db, accent: 0x2ecc71, glow: 0x00ffff },
      red: { main: 0xe74c3c, accent: 0xf39c12, glow: 0xff4444 },
      green: { main: 0x27ae60, accent: 0x16a085, glow: 0x44ff44 },
      gold: { main: 0xf1c40f, accent: 0xe67e22, glow: 0xffdd00 }
    };
    const palette = colors[variant] || colors.blue;

    // === 胴体（トルソー） ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // メインボディ
    const torsoGeo = new THREE.BoxGeometry(1.2, 1.4, 0.8, 4, 4, 4);
    // 角を丸くする変形
    this.roundEdges(torsoGeo, 0.1);
    const torsoMat = this.materials.metal({ color: palette.main, roughness: 0.4 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.castShadow = true;
    bodyGroup.add(torso);

    // 胸部パネル
    const chestPanelGeo = new THREE.BoxGeometry(0.8, 0.6, 0.1);
    const chestPanelMat = this.materials.metal({ color: 0x222222, roughness: 0.3 });
    const chestPanel = new THREE.Mesh(chestPanelGeo, chestPanelMat);
    chestPanel.position.set(0, 0.2, 0.4);
    bodyGroup.add(chestPanel);

    // コアライト
    const coreGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const coreMat = this.materials.emissive({ color: palette.glow, intensity: 1.0 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 0.2, 0.45);
    core.name = 'core';
    bodyGroup.add(core);

    // 肩装甲
    const shoulderGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const shoulderMat = this.materials.metal({ color: palette.accent, roughness: 0.3, metalness: 0.8 });
    const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    leftShoulder.position.set(-0.75, 0.5, 0);
    leftShoulder.castShadow = true;
    bodyGroup.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat.clone());
    rightShoulder.position.set(0.75, 0.5, 0);
    rightShoulder.castShadow = true;
    bodyGroup.add(rightShoulder);

    // ウエスト
    const waistGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 16);
    const waistMat = this.materials.metal({ color: 0x333333, roughness: 0.5 });
    const waist = new THREE.Mesh(waistGeo, waistMat);
    waist.position.set(0, -0.85, 0);
    bodyGroup.add(waist);

    bodyGroup.position.y = 1.5;
    bodyGroup.userData.baseY = 1.5;
    group.add(bodyGroup);

    // === 頭部 ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // ヘルメット
    const helmetGeo = new THREE.SphereGeometry(0.45, 24, 24);
    const helmetMat = this.materials.metal({ color: palette.main, roughness: 0.3 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.scale.set(1, 0.9, 1);
    helmet.castShadow = true;
    headGroup.add(helmet);

    // バイザー
    const visorGeo = new THREE.BoxGeometry(0.7, 0.2, 0.1);
    const visorMat = this.materials.physical({
      color: palette.glow,
      roughness: 0.0,
      metalness: 0.9,
      emissive: palette.glow,
      emissiveIntensity: 0.5
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.05, 0.4);
    visor.name = 'visor';
    headGroup.add(visor);

    // アンテナ
    const antennaGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
    const antennaMat = this.materials.metal({ color: palette.accent });
    const leftAntenna = new THREE.Mesh(antennaGeo, antennaMat);
    leftAntenna.position.set(-0.25, 0.5, 0);
    leftAntenna.rotation.z = 0.3;
    headGroup.add(leftAntenna);

    const rightAntenna = new THREE.Mesh(antennaGeo, antennaMat.clone());
    rightAntenna.position.set(0.25, 0.5, 0);
    rightAntenna.rotation.z = -0.3;
    headGroup.add(rightAntenna);

    // アンテナ先端の光
    const antennaTipGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const antennaTipMat = this.materials.emissive({ color: palette.glow, intensity: 1.5 });
    const leftTip = new THREE.Mesh(antennaTipGeo, antennaTipMat);
    leftTip.position.set(-0.34, 0.62, 0);
    headGroup.add(leftTip);
    const rightTip = new THREE.Mesh(antennaTipGeo, antennaTipMat.clone());
    rightTip.position.set(0.34, 0.62, 0);
    headGroup.add(rightTip);

    headGroup.position.set(0, 2.6, 0);
    group.add(headGroup);

    // === 腕 ===
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.name = isLeft ? 'leftArm' : 'rightArm';

      // 上腕
      const upperArmGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.5, 12);
      const upperArmMat = this.materials.metal({ color: palette.main, roughness: 0.4 });
      const upperArm = new THREE.Mesh(upperArmGeo, upperArmMat);
      upperArm.position.y = -0.25;
      upperArm.castShadow = true;
      armGroup.add(upperArm);

      // 肘関節
      const elbowGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const elbowMat = this.materials.metal({ color: 0x444444 });
      const elbow = new THREE.Mesh(elbowGeo, elbowMat);
      elbow.position.y = -0.5;
      armGroup.add(elbow);

      // 前腕
      const forearmGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.5, 12);
      const forearmMat = this.materials.metal({ color: palette.main, roughness: 0.4 });
      const forearm = new THREE.Mesh(forearmGeo, forearmMat);
      forearm.position.y = -0.8;
      forearm.castShadow = true;
      armGroup.add(forearm);

      // 手
      const handGeo = new THREE.BoxGeometry(0.2, 0.15, 0.1);
      const handMat = this.materials.metal({ color: 0x444444 });
      const hand = new THREE.Mesh(handGeo, handMat);
      hand.position.y = -1.1;
      armGroup.add(hand);

      const x = isLeft ? -0.75 : 0.75;
      armGroup.position.set(x, 2.0, 0);

      return armGroup;
    };

    group.add(createArm(true));
    group.add(createArm(false));

    // === 脚 ===
    const createLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      legGroup.name = isLeft ? 'leftLeg' : 'rightLeg';

      // 太もも
      const thighGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.6, 12);
      const thighMat = this.materials.metal({ color: palette.main, roughness: 0.4 });
      const thigh = new THREE.Mesh(thighGeo, thighMat);
      thigh.position.y = -0.3;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // 膝関節
      const kneeGeo = new THREE.SphereGeometry(0.15, 12, 12);
      const kneeMat = this.materials.metal({ color: 0x444444 });
      const knee = new THREE.Mesh(kneeGeo, kneeMat);
      knee.position.y = -0.6;
      legGroup.add(knee);

      // 脛
      const shinGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.6, 12);
      const shinMat = this.materials.metal({ color: palette.main, roughness: 0.4 });
      const shin = new THREE.Mesh(shinGeo, shinMat);
      shin.position.y = -0.95;
      shin.castShadow = true;
      legGroup.add(shin);

      // 足
      const footGeo = new THREE.BoxGeometry(0.25, 0.15, 0.4);
      const footMat = this.materials.metal({ color: 0x333333 });
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.set(0, -1.3, 0.05);
      foot.castShadow = true;
      legGroup.add(foot);

      const x = isLeft ? -0.3 : 0.3;
      legGroup.position.set(x, 0.65, 0);

      return legGroup;
    };

    group.add(createLeg(true));
    group.add(createLeg(false));

    // バリアント適用関数
    const applyVariant = (model, variantName) => {
      const pal = colors[variantName] || colors.blue;
      model.mesh.traverse(child => {
        if (child.material && child.material.color) {
          if (child === torso || child === helmet || child.parent?.name?.includes('Arm') || child.parent?.name?.includes('Leg')) {
            child.material.color.setHex(pal.main);
          }
        }
      });
    };

    return new Model3D(group, {
      id: 'robot',
      name: 'ロボット',
      variant: variant,
      applyVariant: applyVariant
    }, this.animations);
  }

  // ==================== スライム ====================
  createSlime(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'green';
    const group = new THREE.Group();

    const colors = {
      green: { body: 0x44dd44, core: 0x88ff88 },
      blue: { body: 0x4488dd, core: 0x88ccff },
      red: { body: 0xdd4444, core: 0xff8888 },
      gold: { body: 0xddaa44, core: 0xffdd88 },
      rainbow: { body: 0xaa44dd, core: 0xffaaff }
    };
    const palette = colors[variant] || colors.green;

    // メインボディ（半球状のスライム）
    const bodyGeo = new THREE.SphereGeometry(1, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const bodyMat = this.materials.slime({ color: palette.body });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.scale.set(1, 0.8, 1);
    body.castShadow = true;
    body.receiveShadow = true;
    body.name = 'body';
    group.add(body);

    // 内部コア（光る核）
    const coreGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const coreMat = this.materials.emissive({ color: palette.core, intensity: 0.6 });
    coreMat.transparent = true;
    coreMat.opacity = 0.8;
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 0.2, 0);
    core.name = 'core';
    group.add(core);

    // 目（大きなかわいい目）
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 白目
      const whiteGeo = new THREE.SphereGeometry(0.2, 16, 16);
      const whiteMat = this.materials.standard({ color: 0xffffff, roughness: 0.1 });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      eyeGroup.add(white);

      // 黒目
      const pupilGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const pupilMat = this.materials.standard({ color: 0x111111 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.12;
      eyeGroup.add(pupil);

      // ハイライト
      const highlightGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const highlightMat = this.materials.emissive({ color: 0xffffff, intensity: 1 });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(0.05, 0.05, 0.18);
      eyeGroup.add(highlight);

      eyeGroup.position.set(x, 0.35, 0.6);
      eyeGroup.rotation.x = -0.2;
      return eyeGroup;
    };

    const leftEye = createEye(-0.25);
    leftEye.name = 'leftEye';
    group.add(leftEye);

    const rightEye = createEye(0.25);
    rightEye.name = 'rightEye';
    group.add(rightEye);

    // 口（にっこり）
    const mouthShape = new THREE.Shape();
    mouthShape.moveTo(-0.2, 0);
    mouthShape.quadraticCurveTo(0, -0.15, 0.2, 0);

    const mouthGeo = new THREE.ShapeGeometry(mouthShape);
    const mouthMat = this.materials.standard({ color: 0x333333, side: THREE.DoubleSide });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 0.1, 0.85);
    mouth.name = 'mouth';
    group.add(mouth);

    // ハイライト（てかり）
    const highlightGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const highlightMat = this.materials.standard({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      roughness: 0
    });
    const highlight = new THREE.Mesh(highlightGeo, highlightMat);
    highlight.position.set(-0.4, 0.4, 0.5);
    highlight.scale.set(1, 0.5, 0.5);
    group.add(highlight);

    // 底面の影（接地感）
    const shadowGeo = new THREE.CircleGeometry(0.8, 32);
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

    group.userData.isSlime = true;

    return new Model3D(group, {
      id: 'slime',
      name: 'スライム',
      variant: variant,
      defaultAnimation: 'slimeIdle'
    }, this.animations);
  }

  // ==================== 騎士 ====================
  createKnight(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'silver';
    const group = new THREE.Group();

    const colors = {
      silver: { armor: 0xc0c0c0, accent: 0x4a90d9, cape: 0x2c3e50 },
      gold: { armor: 0xffd700, accent: 0xe74c3c, cape: 0x8e44ad },
      dark: { armor: 0x2c3e50, accent: 0xe74c3c, cape: 0x1a1a2e },
      royal: { armor: 0x3498db, accent: 0xf1c40f, cape: 0x9b59b6 }
    };
    const palette = colors[variant] || colors.silver;

    // === 胴体 ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // 鎧の胴体
    const torsoGeo = new THREE.BoxGeometry(1.0, 1.3, 0.6, 3, 3, 3);
    this.roundEdges(torsoGeo, 0.08);
    const torsoMat = this.materials.metal({ color: palette.armor, roughness: 0.3, metalness: 0.9 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.castShadow = true;
    bodyGroup.add(torso);

    // 胸当て装飾
    const chestPlateGeo = new THREE.BoxGeometry(0.6, 0.4, 0.1);
    const chestPlateMat = this.materials.metal({ color: palette.accent, roughness: 0.2, metalness: 0.95 });
    const chestPlate = new THREE.Mesh(chestPlateGeo, chestPlateMat);
    chestPlate.position.set(0, 0.3, 0.35);
    bodyGroup.add(chestPlate);

    // エンブレム（中央の十字）
    const emblemGeo = new THREE.BoxGeometry(0.08, 0.25, 0.02);
    const emblemMat = this.materials.gold();
    const emblemV = new THREE.Mesh(emblemGeo, emblemMat);
    emblemV.position.set(0, 0.3, 0.41);
    bodyGroup.add(emblemV);
    const emblemH = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.02), emblemMat);
    emblemH.position.set(0, 0.32, 0.41);
    bodyGroup.add(emblemH);

    // ベルト
    const beltGeo = new THREE.BoxGeometry(1.05, 0.15, 0.65);
    const beltMat = this.materials.standard({ color: 0x5d4037, roughness: 0.8 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.set(0, -0.5, 0);
    bodyGroup.add(belt);

    // バックル
    const buckleGeo = new THREE.BoxGeometry(0.2, 0.12, 0.05);
    const buckleMat = this.materials.gold();
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, -0.5, 0.35);
    bodyGroup.add(buckle);

    // マント
    const capeShape = new THREE.Shape();
    capeShape.moveTo(-0.4, 0);
    capeShape.lineTo(-0.5, -1.2);
    capeShape.quadraticCurveTo(0, -1.4, 0.5, -1.2);
    capeShape.lineTo(0.4, 0);

    const capeGeo = new THREE.ShapeGeometry(capeShape);
    const capeMat = this.materials.standard({
      color: palette.cape,
      side: THREE.DoubleSide,
      roughness: 0.9
    });
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 0.2, -0.35);
    cape.rotation.x = 0.1;
    cape.name = 'cape';
    bodyGroup.add(cape);

    bodyGroup.position.y = 1.6;
    bodyGroup.userData.baseY = 1.6;
    group.add(bodyGroup);

    // === 頭部 ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // ヘルメット本体
    const helmetGeo = new THREE.SphereGeometry(0.4, 24, 24);
    const helmetMat = this.materials.metal({ color: palette.armor, roughness: 0.3, metalness: 0.9 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.scale.set(1, 1.1, 1);
    helmet.castShadow = true;
    headGroup.add(helmet);

    // バイザー（顔面保護）
    const visorGeo = new THREE.BoxGeometry(0.5, 0.25, 0.15);
    const visorMat = this.materials.metal({ color: 0x222222, roughness: 0.1, metalness: 0.95 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0, 0.35);
    headGroup.add(visor);

    // 目の光（バイザーの隙間から）
    const eyeGlowGeo = new THREE.BoxGeometry(0.35, 0.05, 0.02);
    const eyeGlowMat = this.materials.emissive({ color: 0x88ccff, intensity: 0.8 });
    const eyeGlow = new THREE.Mesh(eyeGlowGeo, eyeGlowMat);
    eyeGlow.position.set(0, 0.05, 0.43);
    headGroup.add(eyeGlow);

    // 羽飾り
    const plumeGeo = new THREE.ConeGeometry(0.08, 0.5, 8);
    const plumeMat = this.materials.standard({ color: palette.accent, roughness: 0.7 });
    const plume = new THREE.Mesh(plumeGeo, plumeMat);
    plume.position.set(0, 0.6, 0);
    plume.rotation.x = 0.2;
    headGroup.add(plume);

    headGroup.position.set(0, 2.75, 0);
    group.add(headGroup);

    // === 腕 ===
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.name = isLeft ? 'leftArm' : 'rightArm';

      // 肩当て
      const shoulderGeo = new THREE.SphereGeometry(0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const shoulderMat = this.materials.metal({ color: palette.armor, roughness: 0.3, metalness: 0.9 });
      const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
      shoulder.rotation.x = Math.PI;
      shoulder.castShadow = true;
      armGroup.add(shoulder);

      // 上腕
      const upperArmGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.45, 12);
      const upperArmMat = this.materials.metal({ color: palette.armor, roughness: 0.4 });
      const upperArm = new THREE.Mesh(upperArmGeo, upperArmMat);
      upperArm.position.y = -0.25;
      upperArm.castShadow = true;
      armGroup.add(upperArm);

      // 肘当て
      const elbowGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const elbowMat = this.materials.metal({ color: 0x666666 });
      const elbow = new THREE.Mesh(elbowGeo, elbowMat);
      elbow.position.y = -0.5;
      armGroup.add(elbow);

      // 前腕（籠手）
      const forearmGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.45, 12);
      const forearmMat = this.materials.metal({ color: palette.armor, roughness: 0.4 });
      const forearm = new THREE.Mesh(forearmGeo, forearmMat);
      forearm.position.y = -0.75;
      forearm.castShadow = true;
      armGroup.add(forearm);

      // ガントレット（手甲）
      const gauntletGeo = new THREE.BoxGeometry(0.18, 0.2, 0.12);
      const gauntletMat = this.materials.metal({ color: palette.armor });
      const gauntlet = new THREE.Mesh(gauntletGeo, gauntletMat);
      gauntlet.position.y = -1.05;
      armGroup.add(gauntlet);

      const x = isLeft ? -0.65 : 0.65;
      armGroup.position.set(x, 2.1, 0);

      return armGroup;
    };

    group.add(createArm(true));
    group.add(createArm(false));

    // === 脚 ===
    const createLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      legGroup.name = isLeft ? 'leftLeg' : 'rightLeg';

      // 太もも装甲
      const thighGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.55, 12);
      const thighMat = this.materials.metal({ color: palette.armor, roughness: 0.4 });
      const thigh = new THREE.Mesh(thighGeo, thighMat);
      thigh.position.y = -0.28;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // 膝当て
      const kneeGeo = new THREE.SphereGeometry(0.14, 12, 12);
      const kneeMat = this.materials.metal({ color: palette.accent });
      const knee = new THREE.Mesh(kneeGeo, kneeMat);
      knee.position.y = -0.55;
      legGroup.add(knee);

      // 脛当て
      const shinGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.55, 12);
      const shinMat = this.materials.metal({ color: palette.armor, roughness: 0.4 });
      const shin = new THREE.Mesh(shinGeo, shinMat);
      shin.position.y = -0.85;
      shin.castShadow = true;
      legGroup.add(shin);

      // ブーツ
      const bootGeo = new THREE.BoxGeometry(0.22, 0.2, 0.35);
      const bootMat = this.materials.metal({ color: 0x444444, roughness: 0.5 });
      const boot = new THREE.Mesh(bootGeo, bootMat);
      boot.position.set(0, -1.2, 0.03);
      boot.castShadow = true;
      legGroup.add(boot);

      const x = isLeft ? -0.25 : 0.25;
      legGroup.position.set(x, 0.85, 0);

      return legGroup;
    };

    group.add(createLeg(true));
    group.add(createLeg(false));

    return new Model3D(group, {
      id: 'knight',
      name: '騎士',
      variant: variant
    }, this.animations);
  }

  // ==================== 魔法使い ====================
  createMage(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'blue';
    const group = new THREE.Group();

    const colors = {
      blue: { robe: 0x2c3e80, accent: 0x5dade2, magic: 0x00bfff },
      red: { robe: 0x922b21, accent: 0xe74c3c, magic: 0xff4444 },
      purple: { robe: 0x6c3483, accent: 0xaf7ac5, magic: 0xbb44ff },
      white: { robe: 0xecf0f1, accent: 0xf1c40f, magic: 0xffffaa }
    };
    const palette = colors[variant] || colors.blue;

    // === 胴体（ローブ） ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // ローブ上部
    const robeTopGeo = new THREE.CylinderGeometry(0.35, 0.5, 1.0, 16);
    const robeTopMat = this.materials.standard({ color: palette.robe, roughness: 0.8 });
    const robeTop = new THREE.Mesh(robeTopGeo, robeTopMat);
    robeTop.castShadow = true;
    bodyGroup.add(robeTop);

    // ローブ下部（スカート状）
    const robeBottomGeo = new THREE.CylinderGeometry(0.5, 0.8, 1.0, 16);
    const robeBottom = new THREE.Mesh(robeBottomGeo, robeTopMat.clone());
    robeBottom.position.y = -1.0;
    robeBottom.castShadow = true;
    bodyGroup.add(robeBottom);

    // 襟
    const collarGeo = new THREE.TorusGeometry(0.35, 0.08, 8, 16, Math.PI);
    const collarMat = this.materials.standard({ color: palette.accent, roughness: 0.6 });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.45, 0.1);
    collar.rotation.x = Math.PI / 2;
    collar.rotation.z = Math.PI;
    bodyGroup.add(collar);

    // ベルト
    const beltGeo = new THREE.TorusGeometry(0.48, 0.05, 8, 32);
    const beltMat = this.materials.standard({ color: 0x8b4513, roughness: 0.7 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = -0.3;
    belt.rotation.x = Math.PI / 2;
    bodyGroup.add(belt);

    // ベルトのバックル（魔法の宝石）
    const gemGeo = new THREE.OctahedronGeometry(0.1);
    const gemMat = this.materials.crystal({ color: palette.magic });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(0, -0.3, 0.5);
    gem.rotation.x = Math.PI / 4;
    bodyGroup.add(gem);

    // ローブの模様（星）
    for (let i = 0; i < 5; i++) {
      const starGeo = new THREE.CircleGeometry(0.05, 5);
      const starMat = this.materials.emissive({ color: palette.accent, intensity: 0.3 });
      const star = new THREE.Mesh(starGeo, starMat);
      const angle = (i / 5) * Math.PI * 2 + Math.PI / 2;
      star.position.set(
        Math.sin(angle) * 0.4,
        -0.8 + Math.random() * 0.5,
        Math.cos(angle) * 0.4 + 0.05
      );
      star.lookAt(star.position.x * 2, star.position.y, star.position.z * 2);
      bodyGroup.add(star);
    }

    bodyGroup.position.y = 1.5;
    bodyGroup.userData.baseY = 1.5;
    group.add(bodyGroup);

    // === 頭部 ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // 顔
    const faceGeo = new THREE.SphereGeometry(0.3, 24, 24);
    const faceMat = this.materials.standard({ color: 0xffd5b4, roughness: 0.8 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.scale.set(1, 1.1, 0.9);
    headGroup.add(face);

    // 目
    const createEye = (x) => {
      const eyeGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const eyeMat = this.materials.standard({ color: 0x222222 });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, 0.05, 0.25);
      return eye;
    };
    headGroup.add(createEye(-0.1));
    headGroup.add(createEye(0.1));

    // 眉毛
    const browGeo = new THREE.BoxGeometry(0.08, 0.02, 0.02);
    const browMat = this.materials.standard({ color: 0x666666 });
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.1, 0.15, 0.28);
    leftBrow.rotation.z = 0.2;
    headGroup.add(leftBrow);
    const rightBrow = new THREE.Mesh(browGeo, browMat.clone());
    rightBrow.position.set(0.1, 0.15, 0.28);
    rightBrow.rotation.z = -0.2;
    headGroup.add(rightBrow);

    // ひげ
    const beardGeo = new THREE.ConeGeometry(0.15, 0.4, 8);
    const beardMat = this.materials.standard({ color: 0xcccccc, roughness: 0.9 });
    const beard = new THREE.Mesh(beardGeo, beardMat);
    beard.position.set(0, -0.3, 0.15);
    beard.rotation.x = 0.3;
    headGroup.add(beard);

    // 魔法使いの帽子
    const hatGroup = new THREE.Group();

    // 帽子のつば
    const brimGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24);
    const brimMat = this.materials.standard({ color: palette.robe, roughness: 0.8 });
    const brim = new THREE.Mesh(brimGeo, brimMat);
    brim.position.y = 0.25;
    hatGroup.add(brim);

    // 帽子の円錐部分
    const coneGeo = new THREE.ConeGeometry(0.35, 0.8, 24);
    const coneMat = this.materials.standard({ color: palette.robe, roughness: 0.8 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 0.65;
    // 少し曲げる
    cone.rotation.z = 0.15;
    cone.rotation.x = 0.1;
    hatGroup.add(cone);

    // 帽子のバンド
    const bandGeo = new THREE.TorusGeometry(0.36, 0.03, 8, 24);
    const bandMat = this.materials.standard({ color: palette.accent });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = 0.35;
    band.rotation.x = Math.PI / 2;
    hatGroup.add(band);

    // 帽子の先端の星
    const tipStarGeo = new THREE.OctahedronGeometry(0.08);
    const tipStarMat = this.materials.emissive({ color: palette.magic, intensity: 1.0 });
    const tipStar = new THREE.Mesh(tipStarGeo, tipStarMat);
    tipStar.position.set(0.12, 1.05, 0.08);
    hatGroup.add(tipStar);

    headGroup.add(hatGroup);
    headGroup.position.set(0, 2.55, 0);
    group.add(headGroup);

    // === 腕 ===
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.name = isLeft ? 'leftArm' : 'rightArm';

      // 袖
      const sleeveGeo = new THREE.CylinderGeometry(0.15, 0.25, 0.8, 12);
      const sleeveMat = this.materials.standard({ color: palette.robe, roughness: 0.8 });
      const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
      sleeve.position.y = -0.4;
      sleeve.castShadow = true;
      armGroup.add(sleeve);

      // 手
      const handGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const handMat = this.materials.standard({ color: 0xffd5b4, roughness: 0.8 });
      const hand = new THREE.Mesh(handGeo, handMat);
      hand.position.y = -0.85;
      armGroup.add(hand);

      const x = isLeft ? -0.5 : 0.5;
      armGroup.position.set(x, 2.0, 0);

      // 右手には魔法エフェクト
      if (!isLeft) {
        const magicOrbGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const magicOrbMat = this.materials.magic({ color: palette.magic, opacity: 0.6 });
        const magicOrb = new THREE.Mesh(magicOrbGeo, magicOrbMat);
        magicOrb.position.y = -1.0;
        magicOrb.name = 'magicOrb';
        armGroup.add(magicOrb);

        // 魔法の輪
        const ringGeo = new THREE.TorusGeometry(0.2, 0.02, 8, 24);
        const ringMat = this.materials.magic({ color: palette.magic, opacity: 0.4 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = -1.0;
        ring.name = 'magicRing';
        armGroup.add(ring);
      }

      return armGroup;
    };

    group.add(createArm(true));
    group.add(createArm(false));

    return new Model3D(group, {
      id: 'mage',
      name: '魔法使い',
      variant: variant
    }, this.animations);
  }

  // ========== ユーティリティ ==========

  /**
   * ジオメトリの角を丸める
   */
  roundEdges(geometry, radius) {
    const pos = geometry.attributes.position;
    const vec = new this.THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      vec.fromBufferAttribute(pos, i);

      // 角の丸め処理（簡易版）
      const len = vec.length();
      if (len > 0) {
        vec.normalize().multiplyScalar(len - radius * 0.1);
        pos.setXYZ(i, vec.x, vec.y, vec.z);
      }
    }

    geometry.computeVertexNormals();
  }
}

export default CharacterModels;
