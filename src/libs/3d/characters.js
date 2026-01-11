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

  // ==================== ゴースト ====================
  createGhost(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'white';
    const group = new THREE.Group();

    const colors = {
      white: { body: 0xeeeeff, glow: 0xaabbff, eye: 0x4444ff },
      blue: { body: 0x4488dd, glow: 0x66ccff, eye: 0x00ffff },
      red: { body: 0xdd4455, glow: 0xff6666, eye: 0xff0000 },
      shadow: { body: 0x333344, glow: 0x6644aa, eye: 0xaa00ff }
    };
    const palette = colors[variant] || colors.white;

    // === メインボディ（幽霊らしい形状） ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // 頭部〜胴体（スムーズにつながった形状）
    const bodyPoints = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      // 頭は丸く、下に行くほど細くなり、裾は広がる
      let radius;
      if (t < 0.3) {
        // 頭部（球状）
        radius = 0.8 * Math.sin(t / 0.3 * Math.PI / 2);
      } else if (t < 0.7) {
        // 胴体（くびれ）
        radius = 0.8 - (t - 0.3) * 0.5;
      } else {
        // 裾（広がる）
        radius = 0.6 + (t - 0.7) * 1.5;
      }
      bodyPoints.push(new THREE.Vector2(radius, (1 - t) * 2.5 - 0.5));
    }

    const bodyGeo = new THREE.LatheGeometry(bodyPoints, 32);
    const bodyMat = this.materials.ghost({ color: palette.body, glowColor: palette.glow });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = false; // ゴーストは影を落とさない
    body.name = 'mainBody';
    bodyGroup.add(body);

    // 内部の光るコア
    const coreGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const coreMat = this.materials.emissive({ color: palette.glow, intensity: 0.8 });
    coreMat.transparent = true;
    coreMat.opacity = 0.6;
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 1.2, 0);
    core.name = 'core';
    bodyGroup.add(core);

    // ふわふわした裾の装飾（波打つエフェクト用のパーツ）
    for (let i = 0; i < 6; i++) {
      const tailGeo = new THREE.ConeGeometry(0.3, 0.8, 8);
      const tailMat = this.materials.ghost({ color: palette.body, glowColor: palette.glow });
      const tail = new THREE.Mesh(tailGeo, tailMat);
      const angle = (i / 6) * Math.PI * 2;
      tail.position.set(
        Math.cos(angle) * 0.8,
        -0.8,
        Math.sin(angle) * 0.8
      );
      tail.rotation.x = Math.PI;
      tail.rotation.z = Math.cos(angle) * 0.3;
      tail.rotation.x += Math.sin(angle) * 0.3;
      tail.name = `tail_${i}`;
      bodyGroup.add(tail);
    }

    bodyGroup.position.y = 0.5;
    bodyGroup.userData.baseY = 0.5;
    group.add(bodyGroup);

    // === 顔 ===
    const faceGroup = new THREE.Group();
    faceGroup.name = 'face';

    // 目（大きな光る目）
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 目の本体（楕円形の光）
      const eyeGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const eyeMat = this.materials.emissive({ color: palette.eye, intensity: 1.2 });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.scale.set(0.8, 1.2, 0.5);
      eyeGroup.add(eye);

      // 瞳孔（中心の暗い部分）
      const pupilGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const pupilMat = this.materials.standard({ color: 0x000011 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.1;
      pupil.scale.set(0.8, 1.2, 0.5);
      eyeGroup.add(pupil);

      // 光の反射
      const glowGeo = new THREE.SphereGeometry(0.05, 8, 8);
      const glowMat = this.materials.emissive({ color: 0xffffff, intensity: 2 });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(0.05, 0.08, 0.15);
      eyeGroup.add(glow);

      eyeGroup.position.set(x, 1.6, 0.6);
      return eyeGroup;
    };

    const leftEye = createEye(-0.25);
    leftEye.name = 'leftEye';
    faceGroup.add(leftEye);

    const rightEye = createEye(0.25);
    rightEye.name = 'rightEye';
    faceGroup.add(rightEye);

    // 口（不気味に開いた口）
    const mouthShape = new THREE.Shape();
    mouthShape.moveTo(-0.2, 0);
    mouthShape.quadraticCurveTo(-0.15, -0.15, 0, -0.2);
    mouthShape.quadraticCurveTo(0.15, -0.15, 0.2, 0);
    mouthShape.quadraticCurveTo(0.1, 0.05, 0, 0.03);
    mouthShape.quadraticCurveTo(-0.1, 0.05, -0.2, 0);

    const mouthGeo = new THREE.ShapeGeometry(mouthShape);
    const mouthMat = this.materials.standard({
      color: 0x111122,
      side: THREE.DoubleSide
    });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 1.2, 0.75);
    mouth.name = 'mouth';
    faceGroup.add(mouth);

    // 口の中の暗闘
    const innerMouthGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const innerMouthMat = this.materials.standard({ color: 0x000011 });
    const innerMouth = new THREE.Mesh(innerMouthGeo, innerMouthMat);
    innerMouth.position.set(0, 1.15, 0.65);
    innerMouth.scale.set(1, 0.5, 0.3);
    faceGroup.add(innerMouth);

    group.add(faceGroup);

    // === 腕（幽霊らしい曖昧な腕） ===
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.name = isLeft ? 'leftArm' : 'rightArm';

      // 腕の形状（テーパー状）
      const armPoints = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const radius = 0.15 * (1 - t * 0.6);
        armPoints.push(new THREE.Vector2(radius, t * 0.8));
      }

      const armGeo = new THREE.LatheGeometry(armPoints, 12);
      const armMat = this.materials.ghost({ color: palette.body, glowColor: palette.glow });
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.rotation.z = isLeft ? 0.8 : -0.8;
      arm.rotation.x = -0.3;
      armGroup.add(arm);

      // 指先の光
      const fingerGlowGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const fingerGlowMat = this.materials.emissive({ color: palette.glow, intensity: 0.5 });
      fingerGlowMat.transparent = true;
      fingerGlowMat.opacity = 0.7;
      const fingerGlow = new THREE.Mesh(fingerGlowGeo, fingerGlowMat);
      fingerGlow.position.set(isLeft ? -0.5 : 0.5, 0.3, 0);
      armGroup.add(fingerGlow);

      const x = isLeft ? -0.6 : 0.6;
      armGroup.position.set(x, 1.3, 0.2);

      return armGroup;
    };

    group.add(createArm(true));
    group.add(createArm(false));

    // === オーラエフェクト（周囲のぼんやりした光） ===
    const auraGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const auraMat = this.materials.standard({
      color: palette.glow,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.y = 1.0;
    aura.scale.set(1, 1.5, 1);
    aura.name = 'aura';
    group.add(aura);

    // 浮遊する粒子エフェクト用マーカー
    group.userData.isGhost = true;
    group.userData.floatOffset = Math.random() * Math.PI * 2;

    return new Model3D(group, {
      id: 'ghost',
      name: 'ゴースト',
      variant: variant,
      defaultAnimation: 'ghostFloat'
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

  // ==================== 犬 ====================
  createDog(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'shiba';
    const group = new THREE.Group();

    // カラーパレット（犬種ごと）
    const colors = {
      shiba: {
        body: 0xd4a574,
        belly: 0xf5e6d3,
        nose: 0x2c2c2c,
        eye: 0x3d2314,
        tongue: 0xff6b8a,
        collar: 0xe74c3c
      },
      husky: {
        body: 0x6c7a89,
        belly: 0xffffff,
        nose: 0x2c2c2c,
        eye: 0x5dade2,
        tongue: 0xff6b8a,
        collar: 0x3498db
      },
      golden: {
        body: 0xdaa520,
        belly: 0xf4d03f,
        nose: 0x2c2c2c,
        eye: 0x5d4e37,
        tongue: 0xff6b8a,
        collar: 0x27ae60
      },
      dalmatian: {
        body: 0xffffff,
        belly: 0xffffff,
        nose: 0x2c2c2c,
        eye: 0x2c3e50,
        tongue: 0xff6b8a,
        collar: 0x9b59b6,
        spots: 0x2c2c2c
      }
    };
    const palette = colors[variant] || colors.shiba;

    // === 胴体 ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // メインボディ（楕円形の胴体）
    const torsoGeo = new THREE.SphereGeometry(0.6, 24, 24);
    const torsoMat = this.materials.standard({ color: palette.body, roughness: 0.8 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.scale.set(1, 0.8, 1.4);
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    // お腹（下側の明るい部分）
    const bellyGeo = new THREE.SphereGeometry(0.45, 20, 20);
    const bellyMat = this.materials.standard({ color: palette.belly, roughness: 0.85 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.scale.set(0.9, 0.6, 1.2);
    belly.position.set(0, -0.15, 0);
    bodyGroup.add(belly);

    // ダルメシアンの場合、斑点を追加
    if (variant === 'dalmatian') {
      const spotPositions = [
        { x: 0.3, y: 0.2, z: 0.4, size: 0.12 },
        { x: -0.25, y: 0.25, z: 0.3, size: 0.1 },
        { x: 0.35, y: 0.1, z: -0.3, size: 0.15 },
        { x: -0.3, y: 0.15, z: -0.4, size: 0.11 },
        { x: 0.15, y: 0.35, z: 0.1, size: 0.09 },
        { x: -0.1, y: 0.3, z: -0.2, size: 0.13 },
        { x: 0.4, y: -0.05, z: 0, size: 0.1 },
        { x: -0.35, y: 0, z: 0.2, size: 0.12 }
      ];

      spotPositions.forEach((spot, i) => {
        const spotGeo = new THREE.SphereGeometry(spot.size, 12, 12);
        const spotMat = this.materials.standard({ color: palette.spots, roughness: 0.8 });
        const spotMesh = new THREE.Mesh(spotGeo, spotMat);
        spotMesh.position.set(spot.x, spot.y, spot.z);
        spotMesh.scale.set(1, 0.3, 1);
        bodyGroup.add(spotMesh);
      });
    }

    // 首輪
    const collarGeo = new THREE.TorusGeometry(0.35, 0.04, 8, 24);
    const collarMat = this.materials.standard({ color: palette.collar, roughness: 0.5 });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.1, 0.65);
    collar.rotation.x = Math.PI / 2;
    collar.rotation.y = 0.2;
    bodyGroup.add(collar);

    // 首輪のタグ
    const tagGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12);
    const tagMat = this.materials.gold();
    const tag = new THREE.Mesh(tagGeo, tagMat);
    tag.position.set(0, -0.05, 0.95);
    tag.rotation.x = Math.PI / 2;
    bodyGroup.add(tag);

    bodyGroup.position.y = 0.8;
    bodyGroup.userData.baseY = 0.8;
    group.add(bodyGroup);

    // === 頭部 ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // 頭のベース
    const headGeo = new THREE.SphereGeometry(0.4, 24, 24);
    const headMat = this.materials.standard({ color: palette.body, roughness: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.scale.set(1, 0.9, 1);
    head.castShadow = true;
    headGroup.add(head);

    // 顔の白い部分（マズル周り）
    const faceMaskGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const faceMaskMat = this.materials.standard({ color: palette.belly, roughness: 0.85 });
    const faceMask = new THREE.Mesh(faceMaskGeo, faceMaskMat);
    faceMask.position.set(0, -0.1, 0.25);
    faceMask.scale.set(1, 0.8, 0.8);
    headGroup.add(faceMask);

    // マズル（鼻先）
    const muzzleGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const muzzleMat = this.materials.standard({ color: palette.body, roughness: 0.8 });
    const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.position.set(0, -0.12, 0.35);
    muzzle.scale.set(0.8, 0.6, 1);
    headGroup.add(muzzle);

    // 鼻
    const noseGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const noseMat = this.materials.standard({ color: palette.nose, roughness: 0.3 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.08, 0.52);
    nose.scale.set(1.2, 0.8, 0.8);
    headGroup.add(nose);

    // 目
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 白目
      const whiteGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const whiteMat = this.materials.standard({ color: 0xffffff, roughness: 0.1 });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      eyeGroup.add(white);

      // 瞳
      const irisGeo = new THREE.SphereGeometry(0.07, 12, 12);
      const irisMat = this.materials.standard({ color: palette.eye, roughness: 0.2 });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.05;
      eyeGroup.add(iris);

      // 瞳孔
      const pupilGeo = new THREE.SphereGeometry(0.035, 8, 8);
      const pupilMat = this.materials.standard({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.08;
      eyeGroup.add(pupil);

      // ハイライト
      const highlightGeo = new THREE.SphereGeometry(0.02, 8, 8);
      const highlightMat = this.materials.emissive({ color: 0xffffff, intensity: 0.8 });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(0.02, 0.03, 0.09);
      eyeGroup.add(highlight);

      eyeGroup.position.set(x, 0.08, 0.3);
      return eyeGroup;
    };

    const leftEye = createEye(-0.15);
    leftEye.name = 'leftEye';
    headGroup.add(leftEye);

    const rightEye = createEye(0.15);
    rightEye.name = 'rightEye';
    headGroup.add(rightEye);

    // 眉毛（表情用）
    const createBrow = (x) => {
      const browGeo = new THREE.BoxGeometry(0.12, 0.03, 0.03);
      const browMat = this.materials.standard({ color: palette.body, roughness: 0.8 });
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(x, 0.18, 0.32);
      return brow;
    };
    headGroup.add(createBrow(-0.15));
    headGroup.add(createBrow(0.15));

    // 口
    const mouthShape = new THREE.Shape();
    mouthShape.moveTo(-0.1, 0);
    mouthShape.quadraticCurveTo(0, 0.05, 0.1, 0);

    const mouthGeo = new THREE.ShapeGeometry(mouthShape);
    const mouthMat = this.materials.standard({ color: 0x222222, side: THREE.DoubleSide });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.2, 0.45);
    mouth.name = 'mouth';
    headGroup.add(mouth);

    // 舌（任意で見える）
    const tongueGeo = new THREE.BoxGeometry(0.08, 0.02, 0.12);
    const tongueMat = this.materials.standard({ color: palette.tongue, roughness: 0.6 });
    const tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, -0.23, 0.48);
    tongue.rotation.x = 0.3;
    tongue.name = 'tongue';
    tongue.visible = true;
    headGroup.add(tongue);

    // 耳
    const createEar = (x, isLeft) => {
      const earGroup = new THREE.Group();
      earGroup.name = isLeft ? 'leftEar' : 'rightEar';

      // 柴犬タイプ（立ち耳）かそれ以外（垂れ耳）
      const isPointyEar = variant === 'shiba' || variant === 'husky';

      if (isPointyEar) {
        // 立ち耳
        const earGeo = new THREE.ConeGeometry(0.12, 0.25, 12);
        const earMat = this.materials.standard({ color: palette.body, roughness: 0.8 });
        const ear = new THREE.Mesh(earGeo, earMat);
        ear.castShadow = true;
        earGroup.add(ear);

        // 耳の内側（ピンク）
        const innerEarGeo = new THREE.ConeGeometry(0.08, 0.18, 12);
        const innerEarMat = this.materials.standard({ color: 0xffcccc, roughness: 0.7 });
        const innerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
        innerEar.position.z = 0.02;
        innerEar.position.y = -0.02;
        earGroup.add(innerEar);

        earGroup.position.set(x, 0.35, 0);
        earGroup.rotation.z = isLeft ? 0.2 : -0.2;
        earGroup.rotation.x = 0.1;
      } else {
        // 垂れ耳（ゴールデン、ダルメシアン）
        const earGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const earMat = this.materials.standard({ color: palette.body, roughness: 0.8 });
        const ear = new THREE.Mesh(earGeo, earMat);
        ear.scale.set(0.6, 1.2, 0.3);
        ear.castShadow = true;
        earGroup.add(ear);

        earGroup.position.set(x * 1.1, 0.15, -0.1);
        earGroup.rotation.z = isLeft ? 0.5 : -0.5;
        earGroup.rotation.x = 0.3;
      }

      return earGroup;
    };

    headGroup.add(createEar(-0.25, true));
    headGroup.add(createEar(0.25, false));

    // ダルメシアンの場合、頭にも斑点
    if (variant === 'dalmatian') {
      const headSpots = [
        { x: 0.2, y: 0.2, z: 0.15, size: 0.08 },
        { x: -0.25, y: 0.15, z: 0.1, size: 0.07 }
      ];
      headSpots.forEach(spot => {
        const spotGeo = new THREE.SphereGeometry(spot.size, 8, 8);
        const spotMat = this.materials.standard({ color: palette.spots, roughness: 0.8 });
        const spotMesh = new THREE.Mesh(spotGeo, spotMat);
        spotMesh.position.set(spot.x, spot.y, spot.z);
        spotMesh.scale.set(1, 0.5, 1);
        headGroup.add(spotMesh);
      });
    }

    headGroup.position.set(0, 1.0, 0.7);
    group.add(headGroup);

    // === 脚 ===
    const createLeg = (x, z, isFront) => {
      const legGroup = new THREE.Group();
      const legName = `${isFront ? 'front' : 'back'}${x < 0 ? 'Left' : 'Right'}Leg`;
      legGroup.name = legName;

      // 上部の脚
      const upperLegGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.4, 12);
      const upperLegMat = this.materials.standard({ color: palette.body, roughness: 0.8 });
      const upperLeg = new THREE.Mesh(upperLegGeo, upperLegMat);
      upperLeg.position.y = -0.2;
      upperLeg.castShadow = true;
      legGroup.add(upperLeg);

      // 下部の脚
      const lowerLegGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.35, 12);
      const lowerLegMat = this.materials.standard({ color: palette.body, roughness: 0.8 });
      const lowerLeg = new THREE.Mesh(lowerLegGeo, lowerLegMat);
      lowerLeg.position.y = -0.55;
      lowerLeg.castShadow = true;
      legGroup.add(lowerLeg);

      // 足先（肉球付き）
      const pawGeo = new THREE.SphereGeometry(0.09, 12, 12);
      const pawMat = this.materials.standard({ color: palette.body, roughness: 0.8 });
      const paw = new THREE.Mesh(pawGeo, pawMat);
      paw.position.set(0, -0.75, 0.02);
      paw.scale.set(1, 0.6, 1.2);
      paw.castShadow = true;
      legGroup.add(paw);

      // 肉球
      const padGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const padMat = this.materials.standard({ color: 0x4a3728, roughness: 0.9 });
      const mainPad = new THREE.Mesh(padGeo, padMat);
      mainPad.position.set(0, -0.8, 0.02);
      mainPad.scale.set(1.5, 0.5, 1.2);
      legGroup.add(mainPad);

      legGroup.position.set(x, 0.75, z);

      return legGroup;
    };

    // 前脚
    group.add(createLeg(-0.25, 0.5, true));
    group.add(createLeg(0.25, 0.5, true));
    // 後脚
    group.add(createLeg(-0.25, -0.5, false));
    group.add(createLeg(0.25, -0.5, false));

    // === しっぽ ===
    const tailGroup = new THREE.Group();
    tailGroup.name = 'tail';

    // しっぽの形状（犬種によって異なる）
    const isCurlyTail = variant === 'shiba' || variant === 'husky';

    if (isCurlyTail) {
      // 巻き尾（柴犬・ハスキー）
      const tailSegments = 8;
      for (let i = 0; i < tailSegments; i++) {
        const t = i / tailSegments;
        const segGeo = new THREE.SphereGeometry(0.06 - t * 0.02, 8, 8);
        const segMat = this.materials.standard({ color: palette.body, roughness: 0.8 });
        const seg = new THREE.Mesh(segGeo, segMat);

        // 巻きの曲線
        const angle = t * Math.PI * 0.8;
        const radius = 0.15 + t * 0.1;
        seg.position.set(
          0,
          Math.sin(angle) * radius + t * 0.15,
          -Math.cos(angle) * radius - t * 0.05
        );
        seg.castShadow = true;
        tailGroup.add(seg);
      }
    } else {
      // 垂れ尾（ゴールデン・ダルメシアン）
      const tailGeo = new THREE.CylinderGeometry(0.06, 0.03, 0.5, 12);
      const tailMat = this.materials.standard({ color: palette.body, roughness: 0.8 });
      const tail = new THREE.Mesh(tailGeo, tailMat);
      tail.position.set(0, -0.1, -0.15);
      tail.rotation.x = 0.8;
      tail.castShadow = true;
      tailGroup.add(tail);

      // しっぽの先のふさふさ（ゴールデン用）
      if (variant === 'golden') {
        const fluffGeo = new THREE.SphereGeometry(0.08, 12, 12);
        const fluffMat = this.materials.standard({ color: palette.body, roughness: 0.9 });
        const fluff = new THREE.Mesh(fluffGeo, fluffMat);
        fluff.position.set(0, -0.35, -0.35);
        fluff.scale.set(0.8, 1.2, 0.8);
        tailGroup.add(fluff);
      }
    }

    tailGroup.position.set(0, 0.85, -0.7);
    group.add(tailGroup);

    // === 影 ===
    const shadowGeo = new THREE.CircleGeometry(0.6, 32);
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

    // userData
    group.userData.isDog = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'dog',
      name: '犬',
      variant: variant,
      defaultAnimation: 'dogIdle'
    }, this.animations);
  }

  // ==================== 猫 ====================
  createCat(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'tabby';
    const group = new THREE.Group();

    // カラーパレット（猫種ごと）
    const colors = {
      tabby: {
        body: 0x8b6914,
        belly: 0xd4a574,
        stripes: 0x4a3000,
        nose: 0xffb6c1,
        eye: 0x90b030,
        collar: 0xe74c3c
      },
      black: {
        body: 0x1a1a1a,
        belly: 0x2a2a2a,
        stripes: null,
        nose: 0x333333,
        eye: 0xf1c40f,
        collar: 0xf39c12
      },
      white: {
        body: 0xffffff,
        belly: 0xf5f5f5,
        stripes: null,
        nose: 0xffb6c1,
        eye: 0x5dade2,
        collar: 0x3498db
      },
      calico: {
        body: 0xffffff,
        belly: 0xfff5ee,
        patches: [0xf39c12, 0x1a1a1a],
        nose: 0xffb6c1,
        eye: 0x27ae60,
        collar: 0x9b59b6
      }
    };
    const palette = colors[variant] || colors.tabby;

    // === 胴体 ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // メインボディ（猫は犬より細長い）
    const torsoGeo = new THREE.SphereGeometry(0.45, 24, 24);
    const torsoMat = this.materials.standard({ color: palette.body, roughness: 0.85 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.scale.set(0.8, 0.7, 1.3);
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    // お腹
    const bellyGeo = new THREE.SphereGeometry(0.35, 20, 20);
    const bellyMat = this.materials.standard({ color: palette.belly, roughness: 0.9 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.scale.set(0.7, 0.5, 1.1);
    belly.position.set(0, -0.12, 0);
    bodyGroup.add(belly);

    // キジトラの縞模様
    if (variant === 'tabby' && palette.stripes) {
      for (let i = 0; i < 5; i++) {
        const stripeGeo = new THREE.BoxGeometry(0.5, 0.03, 0.08);
        const stripeMat = this.materials.standard({ color: palette.stripes, roughness: 0.9 });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, 0.15 + i * 0.02, -0.3 + i * 0.15);
        stripe.rotation.x = 0.1;
        stripe.rotation.z = Math.sin(i * 0.5) * 0.1;
        bodyGroup.add(stripe);
      }
    }

    // 三毛猫のパッチ
    if (variant === 'calico' && palette.patches) {
      const patchPositions = [
        { x: 0.25, y: 0.15, z: 0.2, size: 0.15, color: palette.patches[0] },
        { x: -0.2, y: 0.1, z: -0.2, size: 0.18, color: palette.patches[1] },
        { x: 0.15, y: 0.2, z: -0.35, size: 0.12, color: palette.patches[0] },
        { x: -0.25, y: 0.18, z: 0.3, size: 0.14, color: palette.patches[1] }
      ];
      patchPositions.forEach(patch => {
        const patchGeo = new THREE.SphereGeometry(patch.size, 12, 12);
        const patchMat = this.materials.standard({ color: patch.color, roughness: 0.85 });
        const patchMesh = new THREE.Mesh(patchGeo, patchMat);
        patchMesh.position.set(patch.x, patch.y, patch.z);
        patchMesh.scale.set(1, 0.4, 1);
        bodyGroup.add(patchMesh);
      });
    }

    // 首輪
    const collarGeo = new THREE.TorusGeometry(0.28, 0.025, 8, 24);
    const collarMat = this.materials.standard({ color: palette.collar, roughness: 0.5 });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.set(0, 0.05, 0.45);
    collar.rotation.x = Math.PI / 2;
    bodyGroup.add(collar);

    // 鈴
    const bellGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const bellMat = this.materials.gold();
    const bell = new THREE.Mesh(bellGeo, bellMat);
    bell.position.set(0, -0.08, 0.7);
    bell.name = 'bell';
    bodyGroup.add(bell);

    bodyGroup.position.y = 0.65;
    bodyGroup.userData.baseY = 0.65;
    group.add(bodyGroup);

    // === 頭部 ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // 頭のベース（猫は丸い）
    const headGeo = new THREE.SphereGeometry(0.35, 24, 24);
    const headMat = this.materials.standard({ color: palette.body, roughness: 0.85 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.scale.set(1, 0.95, 0.95);
    head.castShadow = true;
    headGroup.add(head);

    // 顔の白い部分
    const faceMaskGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const faceMaskMat = this.materials.standard({ color: palette.belly, roughness: 0.9 });
    const faceMask = new THREE.Mesh(faceMaskGeo, faceMaskMat);
    faceMask.position.set(0, -0.08, 0.22);
    faceMask.scale.set(1, 0.7, 0.6);
    headGroup.add(faceMask);

    // マズル（猫は小さい）
    const muzzleGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const muzzleMat = this.materials.standard({ color: palette.belly, roughness: 0.85 });
    const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.position.set(0, -0.12, 0.28);
    muzzle.scale.set(1, 0.6, 0.8);
    headGroup.add(muzzle);

    // 鼻（三角形）
    const noseGeo = new THREE.ConeGeometry(0.04, 0.05, 3);
    const noseMat = this.materials.standard({ color: palette.nose, roughness: 0.4 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.1, 0.34);
    nose.rotation.x = Math.PI;
    headGroup.add(nose);

    // 目（猫は大きくてアーモンド形）
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 白目
      const whiteGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const whiteMat = this.materials.standard({ color: 0xffffff, roughness: 0.1 });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      white.scale.set(1, 1.3, 0.8);
      eyeGroup.add(white);

      // 虹彩
      const irisGeo = new THREE.SphereGeometry(0.08, 16, 16);
      const irisMat = this.materials.standard({
        color: palette.eye,
        roughness: 0.2,
        emissive: palette.eye,
        emissiveIntensity: 0.1
      });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.04;
      iris.scale.set(1, 1.3, 0.6);
      eyeGroup.add(iris);

      // 縦長の瞳孔（猫特有）
      const pupilGeo = new THREE.BoxGeometry(0.02, 0.12, 0.02);
      const pupilMat = this.materials.standard({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.08;
      eyeGroup.add(pupil);

      // ハイライト
      const highlightGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const highlightMat = this.materials.emissive({ color: 0xffffff, intensity: 1 });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(0.02, 0.04, 0.09);
      eyeGroup.add(highlight);

      eyeGroup.position.set(x, 0.05, 0.25);
      return eyeGroup;
    };

    const leftEye = createEye(-0.12);
    leftEye.name = 'leftEye';
    headGroup.add(leftEye);

    const rightEye = createEye(0.12);
    rightEye.name = 'rightEye';
    headGroup.add(rightEye);

    // ヒゲ
    const createWhiskers = (x) => {
      const whiskerGroup = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const whiskerGeo = new THREE.CylinderGeometry(0.003, 0.001, 0.2, 4);
        const whiskerMat = this.materials.standard({ color: 0xffffff, roughness: 0.8 });
        const whisker = new THREE.Mesh(whiskerGeo, whiskerMat);
        whisker.position.set(0.08 * (x > 0 ? 1 : -1), (i - 1) * 0.03, 0);
        whisker.rotation.z = Math.PI / 2 + (i - 1) * 0.15 * (x > 0 ? 1 : -1);
        whiskerGroup.add(whisker);
      }
      whiskerGroup.position.set(x, -0.08, 0.3);
      return whiskerGroup;
    };

    headGroup.add(createWhiskers(-0.08));
    headGroup.add(createWhiskers(0.08));

    // 口
    const mouthShape = new THREE.Shape();
    mouthShape.moveTo(-0.04, 0);
    mouthShape.lineTo(0, -0.03);
    mouthShape.lineTo(0.04, 0);

    const mouthGeo = new THREE.ShapeGeometry(mouthShape);
    const mouthMat = this.materials.standard({ color: 0x333333, side: THREE.DoubleSide });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.16, 0.32);
    mouth.name = 'mouth';
    headGroup.add(mouth);

    // 耳（三角形の立ち耳）
    const createEar = (x, isLeft) => {
      const earGroup = new THREE.Group();
      earGroup.name = isLeft ? 'leftEar' : 'rightEar';

      // 外耳
      const earGeo = new THREE.ConeGeometry(0.1, 0.2, 3);
      const earMat = this.materials.standard({ color: palette.body, roughness: 0.85 });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.rotation.y = Math.PI / 6 * (isLeft ? -1 : 1);
      ear.castShadow = true;
      earGroup.add(ear);

      // 内耳（ピンク）
      const innerEarGeo = new THREE.ConeGeometry(0.06, 0.15, 3);
      const innerEarMat = this.materials.standard({ color: 0xffcccc, roughness: 0.8 });
      const innerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
      innerEar.position.set(0, -0.02, 0.02);
      innerEar.rotation.y = Math.PI / 6 * (isLeft ? -1 : 1);
      earGroup.add(innerEar);

      earGroup.position.set(x, 0.3, -0.05);
      earGroup.rotation.x = -0.15;
      earGroup.rotation.z = isLeft ? 0.25 : -0.25;

      return earGroup;
    };

    headGroup.add(createEar(-0.18, true));
    headGroup.add(createEar(0.18, false));

    // 三毛猫の場合、頭にもパッチ
    if (variant === 'calico' && palette.patches) {
      const patchGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const patchMat = this.materials.standard({ color: palette.patches[0], roughness: 0.85 });
      const patch = new THREE.Mesh(patchGeo, patchMat);
      patch.position.set(0.15, 0.15, 0.1);
      patch.scale.set(1, 0.5, 1);
      headGroup.add(patch);
    }

    headGroup.position.set(0, 0.85, 0.55);
    group.add(headGroup);

    // === 脚 ===
    const createLeg = (x, z, isFront) => {
      const legGroup = new THREE.Group();
      const legName = `${isFront ? 'front' : 'back'}${x < 0 ? 'Left' : 'Right'}Leg`;
      legGroup.name = legName;

      // 上部の脚（猫は細い）
      const upperLegGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.35, 12);
      const upperLegMat = this.materials.standard({ color: palette.body, roughness: 0.85 });
      const upperLeg = new THREE.Mesh(upperLegGeo, upperLegMat);
      upperLeg.position.y = -0.18;
      upperLeg.castShadow = true;
      legGroup.add(upperLeg);

      // 下部の脚
      const lowerLegGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.3, 12);
      const lowerLegMat = this.materials.standard({ color: palette.body, roughness: 0.85 });
      const lowerLeg = new THREE.Mesh(lowerLegGeo, lowerLegMat);
      lowerLeg.position.y = -0.48;
      lowerLeg.castShadow = true;
      legGroup.add(lowerLeg);

      // 足先
      const pawGeo = new THREE.SphereGeometry(0.06, 12, 12);
      const pawMat = this.materials.standard({ color: palette.body, roughness: 0.85 });
      const paw = new THREE.Mesh(pawGeo, pawMat);
      paw.position.set(0, -0.65, 0.02);
      paw.scale.set(1, 0.5, 1.2);
      paw.castShadow = true;
      legGroup.add(paw);

      // 肉球（ピンク）
      const padGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const padMat = this.materials.standard({ color: 0xffb6c1, roughness: 0.8 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(0, -0.68, 0.02);
      pad.scale.set(1.3, 0.4, 1);
      legGroup.add(pad);

      legGroup.position.set(x, 0.65, z);

      return legGroup;
    };

    // 前脚
    group.add(createLeg(-0.18, 0.35, true));
    group.add(createLeg(0.18, 0.35, true));
    // 後脚
    group.add(createLeg(-0.2, -0.4, false));
    group.add(createLeg(0.2, -0.4, false));

    // === しっぽ（猫は長くてしなやか） ===
    const tailGroup = new THREE.Group();
    tailGroup.name = 'tail';

    // しっぽをセグメントで構成（曲がりやすく）
    const tailSegments = 12;
    for (let i = 0; i < tailSegments; i++) {
      const t = i / tailSegments;
      const segRadius = 0.045 - t * 0.025;
      const segGeo = new THREE.SphereGeometry(segRadius, 8, 8);
      const segMat = this.materials.standard({ color: palette.body, roughness: 0.85 });
      const seg = new THREE.Mesh(segGeo, segMat);

      // S字カーブ
      const curve = Math.sin(t * Math.PI * 0.8) * 0.15;
      seg.position.set(
        curve,
        t * 0.4 + Math.sin(t * Math.PI) * 0.1,
        -t * 0.5
      );
      seg.castShadow = true;
      seg.name = `tailSeg_${i}`;
      tailGroup.add(seg);
    }

    // キジトラのしっぽの縞
    if (variant === 'tabby' && palette.stripes) {
      for (let i = 2; i < tailSegments; i += 3) {
        const stripeSeg = tailGroup.children[i];
        if (stripeSeg) {
          stripeSeg.material = this.materials.standard({ color: palette.stripes, roughness: 0.85 });
        }
      }
    }

    tailGroup.position.set(0, 0.6, -0.55);
    group.add(tailGroup);

    // === 影 ===
    const shadowGeo = new THREE.CircleGeometry(0.45, 32);
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

    // userData
    group.userData.isCat = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'cat',
      name: '猫',
      variant: variant,
      defaultAnimation: 'catIdle'
    }, this.animations);
  }

  // ==================== 馬 ====================
  createHorse(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'bay';
    const group = new THREE.Group();

    // カラーパレット（毛色ごと）
    const colors = {
      bay: {
        body: 0x8b4513,      // 鹿毛（赤茶色）
        belly: 0xa0522d,     // やや明るい茶
        mane: 0x1a1a1a,      // 黒いたてがみ
        tail: 0x1a1a1a,      // 黒い尾
        hoof: 0x2c2c2c,      // 蹄
        nose: 0x3d2817,      // 鼻
        eye: 0x2c1810
      },
      white: {
        body: 0xf5f5f5,      // 白毛
        belly: 0xffffff,
        mane: 0xfaf0e6,      // クリーム色のたてがみ
        tail: 0xfaf0e6,
        hoof: 0x4a4a4a,
        nose: 0xffb6c1,      // ピンクの鼻
        eye: 0x4a3728
      },
      black: {
        body: 0x1a1a1a,      // 黒毛
        belly: 0x2d2d2d,
        mane: 0x0a0a0a,
        tail: 0x0a0a0a,
        hoof: 0x1a1a1a,
        nose: 0x2c2c2c,
        eye: 0x1a1208
      },
      palomino: {
        body: 0xdaa520,      // 月毛（金色）
        belly: 0xe6be8a,
        mane: 0xfaf0e6,      // 白いたてがみ
        tail: 0xfaf0e6,
        hoof: 0x4a4a4a,
        nose: 0xd4a574,
        eye: 0x4a3728
      }
    };
    const palette = colors[variant] || colors.bay;

    // === 胴体 ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // メインボディ（筋肉質な胴体）
    const torsoGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const torsoMat = this.materials.standard({ color: palette.body, roughness: 0.75 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.scale.set(0.9, 0.85, 1.6);
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    // 胸部（前側の膨らみ）
    const chestGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const chestMat = this.materials.standard({ color: palette.body, roughness: 0.75 });
    const chest = new THREE.Mesh(chestGeo, chestMat);
    chest.position.set(0, 0.1, 0.9);
    chest.scale.set(0.9, 0.85, 0.8);
    chest.castShadow = true;
    bodyGroup.add(chest);

    // 腹部（下側）
    const bellyGeo = new THREE.SphereGeometry(0.55, 24, 24);
    const bellyMat = this.materials.standard({ color: palette.belly, roughness: 0.8 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, -0.25, 0);
    belly.scale.set(0.75, 0.5, 1.3);
    bodyGroup.add(belly);

    // 臀部（後ろの膨らみ）
    const haunchGeo = new THREE.SphereGeometry(0.55, 24, 24);
    const haunchMat = this.materials.standard({ color: palette.body, roughness: 0.75 });
    const haunch = new THREE.Mesh(haunchGeo, haunchMat);
    haunch.position.set(0, 0, -0.9);
    haunch.scale.set(0.85, 0.8, 0.7);
    haunch.castShadow = true;
    bodyGroup.add(haunch);

    bodyGroup.position.y = 1.5;
    bodyGroup.userData.baseY = 1.5;
    group.add(bodyGroup);

    // === 首 ===
    const neckGroup = new THREE.Group();
    neckGroup.name = 'neck';

    // 首のセグメント（滑らかな曲線）
    const neckSegments = 6;
    for (let i = 0; i < neckSegments; i++) {
      const t = i / neckSegments;
      const segRadius = 0.25 - t * 0.05;
      const segGeo = new THREE.SphereGeometry(segRadius, 16, 16);
      const segMat = this.materials.standard({ color: palette.body, roughness: 0.75 });
      const seg = new THREE.Mesh(segGeo, segMat);

      // 首の曲線（前上方向へ）
      seg.position.set(
        0,
        t * 0.6 + t * t * 0.3,
        t * 0.5
      );
      seg.scale.set(0.9, 1, 0.85);
      seg.castShadow = true;
      neckGroup.add(seg);
    }

    neckGroup.position.set(0, 1.7, 1.1);
    neckGroup.rotation.x = -0.3;
    group.add(neckGroup);

    // === たてがみ ===
    const maneGroup = new THREE.Group();
    maneGroup.name = 'mane';

    // たてがみのセグメント
    const maneSegments = 10;
    for (let i = 0; i < maneSegments; i++) {
      const t = i / maneSegments;
      const maneGeo = new THREE.BoxGeometry(0.04, 0.18 - t * 0.04, 0.08);
      const maneMat = this.materials.standard({ color: palette.mane, roughness: 0.9 });
      const maneSeg = new THREE.Mesh(maneGeo, maneMat);

      maneSeg.position.set(
        0,
        0.25 + t * 0.55,
        0.35 + t * 0.45
      );
      maneSeg.rotation.z = Math.sin(t * Math.PI) * 0.15;
      maneSeg.name = `maneSeg_${i}`;
      maneGroup.add(maneSeg);
    }

    // 額のたてがみ（前髪）
    const forelock = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const forelockGeo = new THREE.BoxGeometry(0.03, 0.12, 0.04);
      const forelockMat = this.materials.standard({ color: palette.mane, roughness: 0.9 });
      const forelockSeg = new THREE.Mesh(forelockGeo, forelockMat);
      forelockSeg.position.set((i - 2) * 0.04, 0, i % 2 * 0.02);
      forelock.add(forelockSeg);
    }
    forelock.position.set(0, 0.95, 0.95);
    forelock.rotation.x = 0.5;
    maneGroup.add(forelock);

    maneGroup.position.set(0, 1.55, 1.1);
    maneGroup.rotation.x = -0.3;
    group.add(maneGroup);

    // === 頭部 ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // 頭のベース（長い顔）
    const headGeo = new THREE.SphereGeometry(0.25, 24, 24);
    const headMat = this.materials.standard({ color: palette.body, roughness: 0.75 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.scale.set(0.8, 0.9, 1.2);
    head.castShadow = true;
    headGroup.add(head);

    // 顔の長い部分（鼻先）
    const muzzleGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.45, 16);
    const muzzleMat = this.materials.standard({ color: palette.body, roughness: 0.75 });
    const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.position.set(0, -0.1, 0.4);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.castShadow = true;
    headGroup.add(muzzle);

    // 鼻先の丸み
    const noseTipGeo = new THREE.SphereGeometry(0.13, 16, 16);
    const noseTipMat = this.materials.standard({ color: palette.nose, roughness: 0.6 });
    const noseTip = new THREE.Mesh(noseTipGeo, noseTipMat);
    noseTip.position.set(0, -0.1, 0.62);
    noseTip.scale.set(1, 0.8, 0.6);
    headGroup.add(noseTip);

    // 鼻の穴
    const createNostril = (x) => {
      const nostrilGeo = new THREE.SphereGeometry(0.035, 8, 8);
      const nostrilMat = this.materials.standard({ color: 0x1a1a1a, roughness: 0.3 });
      const nostril = new THREE.Mesh(nostrilGeo, nostrilMat);
      nostril.position.set(x, -0.12, 0.68);
      nostril.scale.set(0.8, 1, 0.5);
      return nostril;
    };
    headGroup.add(createNostril(-0.06));
    headGroup.add(createNostril(0.06));

    // 目
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 白目
      const whiteGeo = new THREE.SphereGeometry(0.065, 16, 16);
      const whiteMat = this.materials.standard({ color: 0xffffff, roughness: 0.1 });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      eyeGroup.add(white);

      // 瞳
      const irisGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const irisMat = this.materials.standard({ color: palette.eye, roughness: 0.2 });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.03;
      eyeGroup.add(iris);

      // 瞳孔（横長）
      const pupilGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const pupilMat = this.materials.standard({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.045;
      pupil.scale.set(1.5, 0.8, 1);
      eyeGroup.add(pupil);

      // ハイライト
      const highlightGeo = new THREE.SphereGeometry(0.015, 8, 8);
      const highlightMat = this.materials.emissive({ color: 0xffffff, intensity: 0.8 });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(0.015, 0.02, 0.055);
      eyeGroup.add(highlight);

      eyeGroup.position.set(x, 0.08, 0.12);
      return eyeGroup;
    };

    const leftEye = createEye(-0.14);
    leftEye.name = 'leftEye';
    headGroup.add(leftEye);

    const rightEye = createEye(0.14);
    rightEye.name = 'rightEye';
    headGroup.add(rightEye);

    // 耳
    const createEar = (x, isLeft) => {
      const earGroup = new THREE.Group();
      earGroup.name = isLeft ? 'leftEar' : 'rightEar';

      // 耳本体（先が尖った形）
      const earGeo = new THREE.ConeGeometry(0.06, 0.18, 12);
      const earMat = this.materials.standard({ color: palette.body, roughness: 0.75 });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.castShadow = true;
      earGroup.add(ear);

      // 耳の内側（ピンク）
      const innerEarGeo = new THREE.ConeGeometry(0.04, 0.12, 12);
      const innerEarMat = this.materials.standard({ color: 0xffcccc, roughness: 0.7 });
      const innerEar = new THREE.Mesh(innerEarGeo, innerEarMat);
      innerEar.position.z = 0.015;
      innerEar.position.y = -0.02;
      earGroup.add(innerEar);

      earGroup.position.set(x, 0.3, -0.05);
      earGroup.rotation.z = isLeft ? 0.15 : -0.15;
      earGroup.rotation.x = 0.1;

      return earGroup;
    };

    headGroup.add(createEar(-0.12, true));
    headGroup.add(createEar(0.12, false));

    // 口
    const mouthGeo = new THREE.BoxGeometry(0.15, 0.01, 0.02);
    const mouthMat = this.materials.standard({ color: 0x2c2c2c, roughness: 0.5 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.2, 0.58);
    mouth.name = 'mouth';
    headGroup.add(mouth);

    headGroup.position.set(0, 2.55, 1.75);
    headGroup.rotation.x = 0.15;
    group.add(headGroup);

    // === 脚 ===
    const createLeg = (x, z, isFront) => {
      const legGroup = new THREE.Group();
      const legName = `${isFront ? 'front' : 'back'}${x < 0 ? 'Left' : 'Right'}Leg`;
      legGroup.name = legName;

      // 上部の脚（太もも/肩）
      const upperLegGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.55, 16);
      const upperLegMat = this.materials.standard({ color: palette.body, roughness: 0.75 });
      const upperLeg = new THREE.Mesh(upperLegGeo, upperLegMat);
      upperLeg.position.y = -0.28;
      upperLeg.castShadow = true;
      upperLeg.name = 'upperLeg';
      legGroup.add(upperLeg);

      // 膝/関節
      const kneeGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const kneeMat = this.materials.standard({ color: palette.body, roughness: 0.75 });
      const knee = new THREE.Mesh(kneeGeo, kneeMat);
      knee.position.y = -0.55;
      knee.name = 'knee';
      legGroup.add(knee);

      // 下部の脚（すね）
      const lowerLegGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.55, 12);
      const lowerLegMat = this.materials.standard({ color: palette.body, roughness: 0.75 });
      const lowerLeg = new THREE.Mesh(lowerLegGeo, lowerLegMat);
      lowerLeg.position.y = -0.85;
      lowerLeg.castShadow = true;
      lowerLeg.name = 'lowerLeg';
      legGroup.add(lowerLeg);

      // 足首
      const ankleGeo = new THREE.SphereGeometry(0.06, 10, 10);
      const ankleMat = this.materials.standard({ color: palette.body, roughness: 0.75 });
      const ankle = new THREE.Mesh(ankleGeo, ankleMat);
      ankle.position.y = -1.1;
      legGroup.add(ankle);

      // 蹄
      const hoofGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.12, 16);
      const hoofMat = this.materials.standard({ color: palette.hoof, roughness: 0.4 });
      const hoof = new THREE.Mesh(hoofGeo, hoofMat);
      hoof.position.y = -1.2;
      hoof.castShadow = true;
      hoof.name = 'hoof';
      legGroup.add(hoof);

      legGroup.position.set(x, 1.5, z);

      return legGroup;
    };

    // 前脚
    group.add(createLeg(-0.3, 0.85, true));
    group.add(createLeg(0.3, 0.85, true));
    // 後脚
    group.add(createLeg(-0.32, -0.85, false));
    group.add(createLeg(0.32, -0.85, false));

    // === しっぽ ===
    const tailGroup = new THREE.Group();
    tailGroup.name = 'tail';

    // しっぽの付け根
    const tailBaseGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.2, 12);
    const tailBaseMat = this.materials.standard({ color: palette.body, roughness: 0.75 });
    const tailBase = new THREE.Mesh(tailBaseGeo, tailBaseMat);
    tailBase.rotation.x = 0.8;
    tailBase.castShadow = true;
    tailGroup.add(tailBase);

    // しっぽの毛（複数のセグメント）
    const tailHairSegments = 15;
    for (let i = 0; i < tailHairSegments; i++) {
      const t = i / tailHairSegments;
      const hairGeo = new THREE.BoxGeometry(0.02, 0.25 + t * 0.15, 0.02);
      const hairMat = this.materials.standard({ color: palette.tail, roughness: 0.9 });
      const hair = new THREE.Mesh(hairGeo, hairMat);

      // 自然な垂れ下がり
      const angle = t * 0.3;
      hair.position.set(
        Math.sin(i * 0.7) * 0.03,
        -0.15 - t * 0.4,
        -0.08 - t * 0.25
      );
      hair.rotation.x = 0.3 + t * 0.2;
      hair.rotation.z = Math.sin(i * 1.2) * 0.1;
      hair.name = `tailHair_${i}`;
      tailGroup.add(hair);
    }

    tailGroup.position.set(0, 1.55, -1.45);
    group.add(tailGroup);

    // === 影 ===
    const shadowGeo = new THREE.CircleGeometry(0.9, 32);
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

    // userData
    group.userData.isHorse = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'horse',
      name: '馬',
      variant: variant,
      defaultAnimation: 'horseIdle'
    }, this.animations);
  }

  // ==================== カエル ====================
  createFrog(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'green';
    const group = new THREE.Group();

    // カラーパレット（種類ごと）
    const colors = {
      green: {
        body: 0x228b22,       // フォレストグリーン
        belly: 0x90ee90,      // ライトグリーン
        spots: 0x006400,      // ダークグリーン
        eye: 0xffd700,        // 金色の目
        pupil: 0x000000,
        throat: 0xf0e68c      // 喉袋
      },
      blue: {
        body: 0x1e90ff,       // ドジャーブルー（ヤドクガエル風）
        belly: 0x87ceeb,      // スカイブルー
        spots: 0x00008b,      // ダークブルー
        eye: 0xff4500,        // オレンジレッド
        pupil: 0x000000,
        throat: 0xadd8e6
      },
      red: {
        body: 0xdc143c,       // クリムゾン
        belly: 0xffa07a,      // ライトサーモン
        spots: 0x8b0000,      // ダークレッド
        eye: 0xffd700,
        pupil: 0x000000,
        throat: 0xffb6c1
      },
      golden: {
        body: 0xffd700,       // ゴールド
        belly: 0xfffacd,      // レモンシフォン
        spots: 0xdaa520,      // ゴールデンロッド
        eye: 0xff6347,        // トマト
        pupil: 0x000000,
        throat: 0xffe4b5
      }
    };
    const palette = colors[variant] || colors.green;

    // === 胴体 ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // メインボディ（丸みのある体）
    const torsoGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const torsoMat = this.materials.standard({ color: palette.body, roughness: 0.6 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.scale.set(1.1, 0.8, 1.3);
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    // お腹（明るい部分）
    const bellyGeo = new THREE.SphereGeometry(0.4, 24, 24);
    const bellyMat = this.materials.standard({ color: palette.belly, roughness: 0.7 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, -0.15, 0.1);
    belly.scale.set(0.9, 0.6, 1.1);
    bodyGroup.add(belly);

    // 背中の模様（斑点）
    const spotPositions = [
      { x: 0.2, y: 0.25, z: 0.3, size: 0.08 },
      { x: -0.15, y: 0.28, z: 0.15, size: 0.06 },
      { x: 0.25, y: 0.2, z: -0.1, size: 0.07 },
      { x: -0.2, y: 0.22, z: -0.2, size: 0.09 },
      { x: 0.05, y: 0.3, z: 0.0, size: 0.05 },
      { x: -0.25, y: 0.18, z: 0.25, size: 0.06 }
    ];

    spotPositions.forEach((spot) => {
      const spotGeo = new THREE.SphereGeometry(spot.size, 12, 12);
      const spotMat = this.materials.standard({ color: palette.spots, roughness: 0.6 });
      const spotMesh = new THREE.Mesh(spotGeo, spotMat);
      spotMesh.position.set(spot.x, spot.y, spot.z);
      spotMesh.scale.set(1, 0.4, 1);
      bodyGroup.add(spotMesh);
    });

    bodyGroup.position.y = 0.35;
    bodyGroup.userData.baseY = 0.35;
    group.add(bodyGroup);

    // === 頭部 ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // 頭のベース（幅広い頭）
    const headGeo = new THREE.SphereGeometry(0.35, 24, 24);
    const headMat = this.materials.standard({ color: palette.body, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.scale.set(1.3, 0.8, 1.1);
    head.castShadow = true;
    headGroup.add(head);

    // 大きな目（横に張り出す）
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.name = x < 0 ? 'leftEye' : 'rightEye';

      // 目の球体（大きい）
      const eyeBallGeo = new THREE.SphereGeometry(0.15, 20, 20);
      const eyeBallMat = this.materials.standard({ color: palette.eye, roughness: 0.2 });
      const eyeBall = new THREE.Mesh(eyeBallGeo, eyeBallMat);
      eyeBall.castShadow = true;
      eyeGroup.add(eyeBall);

      // 瞳孔（縦長）
      const pupilGeo = new THREE.SphereGeometry(0.07, 12, 12);
      const pupilMat = this.materials.standard({ color: palette.pupil });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.1;
      pupil.scale.set(0.6, 1.2, 0.5);
      pupil.name = 'pupil';
      eyeGroup.add(pupil);

      // ハイライト
      const highlightGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const highlightMat = this.materials.emissive({ color: 0xffffff, intensity: 0.8 });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(0.03, 0.05, 0.12);
      eyeGroup.add(highlight);

      // まぶた（アニメーション用）
      const eyelidGeo = new THREE.SphereGeometry(0.16, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const eyelidMat = this.materials.standard({ color: palette.body, roughness: 0.6 });
      const eyelid = new THREE.Mesh(eyelidGeo, eyelidMat);
      eyelid.rotation.x = Math.PI;
      eyelid.position.y = 0.02;
      eyelid.visible = false;
      eyelid.name = 'eyelid';
      eyeGroup.add(eyelid);

      eyeGroup.position.set(x, 0.2, 0.15);
      return eyeGroup;
    };

    headGroup.add(createEye(-0.25));
    headGroup.add(createEye(0.25));

    // 大きな口
    const mouthGeo = new THREE.TorusGeometry(0.2, 0.03, 8, 24, Math.PI);
    const mouthMat = this.materials.standard({ color: 0x2c2c2c, roughness: 0.5 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.12, 0.3);
    mouth.rotation.x = Math.PI;
    mouth.rotation.z = Math.PI;
    mouth.name = 'mouth';
    headGroup.add(mouth);

    // 鼻の穴
    const createNostril = (x) => {
      const nostrilGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const nostrilMat = this.materials.standard({ color: 0x1a1a1a, roughness: 0.3 });
      const nostril = new THREE.Mesh(nostrilGeo, nostrilMat);
      nostril.position.set(x, 0.02, 0.35);
      nostril.scale.set(1, 0.5, 0.5);
      return nostril;
    };
    headGroup.add(createNostril(-0.08));
    headGroup.add(createNostril(0.08));

    // 喉袋（膨らむ部分）
    const throatGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const throatMat = this.materials.standard({
      color: palette.throat,
      roughness: 0.5,
      transparent: true,
      opacity: 0.9
    });
    const throat = new THREE.Mesh(throatGeo, throatMat);
    throat.position.set(0, -0.2, 0.25);
    throat.scale.set(1, 0.6, 0.8);
    throat.name = 'throat';
    headGroup.add(throat);

    // 舌（隠れている）
    const tongueGroup = new THREE.Group();
    tongueGroup.name = 'tongue';

    const tongueBaseGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.4, 12);
    const tongueMat = this.materials.standard({ color: 0xff6b8a, roughness: 0.6 });
    const tongueBase = new THREE.Mesh(tongueBaseGeo, tongueMat);
    tongueBase.rotation.x = Math.PI / 2;
    tongueBase.position.z = 0.2;
    tongueGroup.add(tongueBase);

    // 舌の先（丸い）
    const tongueTipGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const tongueTip = new THREE.Mesh(tongueTipGeo, tongueMat);
    tongueTip.position.z = 0.4;
    tongueGroup.add(tongueTip);

    tongueGroup.position.set(0, -0.1, 0.2);
    tongueGroup.visible = false;
    headGroup.add(tongueGroup);

    headGroup.position.set(0, 0.5, 0.45);
    group.add(headGroup);

    // === 前脚（短い） ===
    const createFrontLeg = (x) => {
      const legGroup = new THREE.Group();
      legGroup.name = x < 0 ? 'frontLeftLeg' : 'frontRightLeg';

      // 上腕
      const upperArmGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.2, 12);
      const armMat = this.materials.standard({ color: palette.body, roughness: 0.6 });
      const upperArm = new THREE.Mesh(upperArmGeo, armMat);
      upperArm.position.y = -0.1;
      upperArm.rotation.z = x < 0 ? 0.3 : -0.3;
      upperArm.castShadow = true;
      legGroup.add(upperArm);

      // 前腕
      const forearmGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.18, 12);
      const forearm = new THREE.Mesh(forearmGeo, armMat);
      forearm.position.set(x < 0 ? -0.08 : 0.08, -0.25, 0);
      forearm.castShadow = true;
      legGroup.add(forearm);

      // 手（4本指の水かき）
      const handGroup = new THREE.Group();
      handGroup.name = 'hand';

      for (let i = 0; i < 4; i++) {
        const fingerGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.1, 8);
        const finger = new THREE.Mesh(fingerGeo, armMat);
        const angle = (i - 1.5) * 0.25;
        finger.position.set(Math.sin(angle) * 0.05, -0.05, Math.cos(angle) * 0.03);
        finger.rotation.z = angle * 0.5;
        finger.rotation.x = 0.3;
        handGroup.add(finger);

        // 指先の吸盤
        const padGeo = new THREE.SphereGeometry(0.025, 8, 8);
        const padMat = this.materials.standard({ color: palette.belly, roughness: 0.4 });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(Math.sin(angle) * 0.05, -0.1, Math.cos(angle) * 0.03 + 0.02);
        pad.scale.set(1, 0.6, 1);
        handGroup.add(pad);
      }

      handGroup.position.set(x < 0 ? -0.1 : 0.1, -0.35, 0.05);
      legGroup.add(handGroup);

      legGroup.position.set(x, 0.3, 0.35);
      return legGroup;
    };

    group.add(createFrontLeg(-0.35));
    group.add(createFrontLeg(0.35));

    // === 後脚（長くて強い） ===
    const createBackLeg = (x) => {
      const legGroup = new THREE.Group();
      legGroup.name = x < 0 ? 'backLeftLeg' : 'backRightLeg';

      // 太もも（太い）
      const thighGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const legMat = this.materials.standard({ color: palette.body, roughness: 0.6 });
      const thigh = new THREE.Mesh(thighGeo, legMat);
      thigh.scale.set(0.8, 1.2, 1);
      thigh.castShadow = true;
      legGroup.add(thigh);

      // すね
      const shinGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.35, 12);
      const shin = new THREE.Mesh(shinGeo, legMat);
      shin.position.set(x < 0 ? -0.1 : 0.1, -0.1, 0.15);
      shin.rotation.x = -0.8;
      shin.rotation.z = x < 0 ? 0.2 : -0.2;
      shin.castShadow = true;
      shin.name = 'shin';
      legGroup.add(shin);

      // 足（大きな水かき付き）
      const footGroup = new THREE.Group();
      footGroup.name = 'foot';

      // 水かき付きの足（5本指）
      for (let i = 0; i < 5; i++) {
        const toeGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.18, 8);
        const toe = new THREE.Mesh(toeGeo, legMat);
        const angle = (i - 2) * 0.3;
        toe.position.set(Math.sin(angle) * 0.12, 0, Math.cos(angle) * 0.08);
        toe.rotation.x = Math.PI / 2 - 0.2;
        toe.rotation.z = angle * 0.3;
        footGroup.add(toe);

        // 指先の丸み
        const toeTipGeo = new THREE.SphereGeometry(0.025, 8, 8);
        const toeTip = new THREE.Mesh(toeTipGeo, legMat);
        toeTip.position.set(
          Math.sin(angle) * 0.12,
          0.02,
          Math.cos(angle) * 0.08 + 0.09
        );
        footGroup.add(toeTip);
      }

      // 水かき
      const webShape = new THREE.Shape();
      webShape.moveTo(-0.15, 0);
      webShape.quadraticCurveTo(-0.08, 0.12, 0, 0.15);
      webShape.quadraticCurveTo(0.08, 0.12, 0.15, 0);
      webShape.lineTo(-0.15, 0);

      const webGeo = new THREE.ShapeGeometry(webShape);
      const webMat = this.materials.standard({
        color: palette.belly,
        roughness: 0.5,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      const web = new THREE.Mesh(webGeo, webMat);
      web.rotation.x = -Math.PI / 2 + 0.2;
      web.position.set(0, -0.02, 0.05);
      footGroup.add(web);

      footGroup.position.set(x < 0 ? -0.2 : 0.2, -0.25, 0.35);
      legGroup.add(footGroup);

      legGroup.position.set(x * 0.8, 0.25, -0.35);
      return legGroup;
    };

    group.add(createBackLeg(-0.4));
    group.add(createBackLeg(0.4));

    // === 影 ===
    const shadowGeo = new THREE.CircleGeometry(0.5, 32);
    const shadowMat = this.materials.standard({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    shadow.name = 'shadow';
    group.add(shadow);

    // userData
    group.userData.isFrog = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'frog',
      name: 'カエル',
      variant: variant,
      defaultAnimation: 'frogIdle'
    }, this.animations);
  }

  // ==================== インクリング ====================
  createInkling(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'orange';
    const group = new THREE.Group();

    // スプラトゥーン風カラーパレット
    const colors = {
      orange: { main: 0xff6b00, accent: 0xffaa00, skin: 0xffe4c4, eyes: 0x222222 },
      cyan: { main: 0x00d4ff, accent: 0x00ffff, skin: 0xffe4c4, eyes: 0x222222 },
      purple: { main: 0xaa00ff, accent: 0xdd66ff, skin: 0xffe4c4, eyes: 0x222222 },
      pink: { main: 0xff4488, accent: 0xff88aa, skin: 0xffe4c4, eyes: 0x222222 },
      lime: { main: 0xaaff00, accent: 0xddff55, skin: 0xffe4c4, eyes: 0x222222 },
      yellow: { main: 0xffdd00, accent: 0xffee55, skin: 0xffe4c4, eyes: 0x222222 }
    };
    const palette = colors[variant] || colors.orange;

    // === 胴体 ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // メインボディ（丸っこい体）
    const torsoGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const torsoMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.scale.set(0.9, 1.0, 0.7);
    torso.castShadow = true;
    torso.receiveShadow = true;
    bodyGroup.add(torso);

    // インク色のTシャツ
    const shirtGeo = new THREE.SphereGeometry(0.52, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const shirtMat = this.materials.standard({ color: palette.main, roughness: 0.8 });
    const shirt = new THREE.Mesh(shirtGeo, shirtMat);
    shirt.scale.set(0.88, 0.95, 0.68);
    shirt.position.y = -0.05;
    shirt.castShadow = true;
    bodyGroup.add(shirt);

    bodyGroup.position.y = 1.2;
    bodyGroup.userData.baseY = 1.2;
    group.add(bodyGroup);

    // === 頭部 ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // 頭（大きめで丸い）
    const headGeo = new THREE.SphereGeometry(0.55, 24, 24);
    const headMat = this.materials.standard({ color: palette.skin, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.scale.set(1.0, 0.9, 0.95);
    head.castShadow = true;
    headGroup.add(head);

    // イカの触手風ヘア（特徴的な後ろ髪）
    const createTentacleHair = (xOffset, length, curveFactor) => {
      const tentacleGroup = new THREE.Group();
      const segments = 6;
      const segmentLength = length / segments;

      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const radius = 0.12 - t * 0.04;
        const segGeo = new THREE.SphereGeometry(radius, 12, 12);
        const segMat = this.materials.standard({ color: palette.main, roughness: 0.5 });
        const seg = new THREE.Mesh(segGeo, segMat);

        // 曲線的な配置
        const angle = t * curveFactor;
        seg.position.set(
          xOffset * (1 + t * 0.3),
          -t * segmentLength * 0.5,
          -0.3 - t * segmentLength * Math.cos(angle)
        );
        seg.scale.set(1.2, 0.8, 1.0);
        seg.castShadow = true;
        tentacleGroup.add(seg);
      }

      // 触手の先端（丸い）
      const tipGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const tipMat = this.materials.standard({ color: palette.accent, roughness: 0.4 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(
        xOffset * 1.3,
        -length * 0.5,
        -0.3 - length * 0.8
      );
      tentacleGroup.add(tip);

      return tentacleGroup;
    };

    // 複数の触手髪
    headGroup.add(createTentacleHair(-0.3, 0.8, 0.5));
    headGroup.add(createTentacleHair(0.0, 0.9, 0.3));
    headGroup.add(createTentacleHair(0.3, 0.8, 0.5));
    headGroup.add(createTentacleHair(-0.15, 0.7, 0.4));
    headGroup.add(createTentacleHair(0.15, 0.7, 0.4));

    // 前髪
    const bangsGeo = new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI, 0, Math.PI * 0.5);
    const bangsMat = this.materials.standard({ color: palette.main, roughness: 0.5 });
    const bangs = new THREE.Mesh(bangsGeo, bangsMat);
    bangs.position.set(0, 0.2, 0.35);
    bangs.rotation.x = -0.3;
    bangs.scale.set(1.5, 0.8, 0.6);
    headGroup.add(bangs);

    // 目（スプラトゥーン特有の大きな目）
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 白目（大きい）
      const whiteGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const whiteMat = this.materials.standard({ color: 0xffffff, roughness: 0.1 });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      white.scale.set(1.2, 1.0, 0.8);
      eyeGroup.add(white);

      // 黒目（大きくて印象的）
      const pupilGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const pupilMat = this.materials.standard({ color: palette.eyes });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.1;
      pupil.scale.set(1.1, 1.2, 0.6);
      eyeGroup.add(pupil);

      // ハイライト（2つ）
      const highlightGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const highlightMat = this.materials.emissive({ color: 0xffffff, intensity: 1 });
      const highlight1 = new THREE.Mesh(highlightGeo, highlightMat);
      highlight1.position.set(0.04, 0.04, 0.15);
      eyeGroup.add(highlight1);
      const highlight2 = new THREE.Mesh(highlightGeo.clone(), highlightMat.clone());
      highlight2.scale.set(0.6, 0.6, 0.6);
      highlight2.position.set(-0.02, -0.03, 0.15);
      eyeGroup.add(highlight2);

      eyeGroup.position.set(x, 0.0, 0.4);
      return eyeGroup;
    };

    headGroup.add(createEye(-0.18));
    headGroup.add(createEye(0.18));

    // 眉毛（インク色）
    const createBrow = (x, rotZ) => {
      const browGeo = new THREE.BoxGeometry(0.15, 0.04, 0.05);
      const browMat = this.materials.standard({ color: palette.main, roughness: 0.5 });
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(x, 0.22, 0.45);
      brow.rotation.z = rotZ;
      return brow;
    };
    headGroup.add(createBrow(-0.15, 0.1));
    headGroup.add(createBrow(0.15, -0.1));

    // 口（小さなニッコリ）
    const mouthGeo = new THREE.TorusGeometry(0.06, 0.02, 8, 12, Math.PI);
    const mouthMat = this.materials.standard({ color: 0x333333, roughness: 0.9 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.2, 0.48);
    mouth.rotation.x = Math.PI;
    headGroup.add(mouth);

    // 耳（小さなイカ風の突起）
    const createEar = (x) => {
      const earGeo = new THREE.ConeGeometry(0.08, 0.2, 8);
      const earMat = this.materials.standard({ color: palette.skin, roughness: 0.6 });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(x * 0.5, 0.0, 0.1);
      ear.rotation.z = x > 0 ? -0.5 : 0.5;
      ear.rotation.x = 0.2;
      ear.castShadow = true;
      return ear;
    };
    headGroup.add(createEar(-1));
    headGroup.add(createEar(1));

    headGroup.position.set(0, 2.0, 0);
    group.add(headGroup);

    // === 腕 ===
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.name = isLeft ? 'leftArm' : 'rightArm';

      // 上腕
      const upperArmGeo = new THREE.CapsuleGeometry(0.1, 0.25, 8, 12);
      const upperArmMat = this.materials.standard({ color: palette.main, roughness: 0.8 });
      const upperArm = new THREE.Mesh(upperArmGeo, upperArmMat);
      upperArm.position.y = -0.2;
      upperArm.castShadow = true;
      armGroup.add(upperArm);

      // 前腕
      const forearmGeo = new THREE.CapsuleGeometry(0.08, 0.2, 8, 12);
      const forearmMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
      const forearm = new THREE.Mesh(forearmGeo, forearmMat);
      forearm.position.y = -0.5;
      forearm.castShadow = true;
      armGroup.add(forearm);

      // 手（丸っこい）
      const handGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const handMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
      const hand = new THREE.Mesh(handGeo, handMat);
      hand.position.y = -0.7;
      hand.scale.set(1.0, 0.8, 0.8);
      armGroup.add(hand);

      const x = isLeft ? -0.55 : 0.55;
      armGroup.position.set(x, 1.35, 0);

      return armGroup;
    };

    group.add(createArm(true));
    group.add(createArm(false));

    // === 脚 ===
    const createLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      legGroup.name = isLeft ? 'leftLeg' : 'rightLeg';

      // 短パン
      const shortsGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.2, 12);
      const shortsMat = this.materials.standard({ color: 0x333333, roughness: 0.9 });
      const shorts = new THREE.Mesh(shortsGeo, shortsMat);
      shorts.position.y = -0.1;
      shorts.castShadow = true;
      legGroup.add(shorts);

      // 脚
      const legGeo = new THREE.CapsuleGeometry(0.1, 0.3, 8, 12);
      const legMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.y = -0.4;
      leg.castShadow = true;
      legGroup.add(leg);

      // スニーカー（インク色）
      const shoeGeo = new THREE.BoxGeometry(0.18, 0.12, 0.28);
      const shoeMat = this.materials.standard({ color: palette.main, roughness: 0.6 });
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(0, -0.7, 0.04);
      shoe.castShadow = true;
      legGroup.add(shoe);

      // 靴底
      const soleGeo = new THREE.BoxGeometry(0.19, 0.04, 0.29);
      const soleMat = this.materials.standard({ color: 0xffffff, roughness: 0.5 });
      const sole = new THREE.Mesh(soleGeo, soleMat);
      sole.position.set(0, -0.78, 0.04);
      legGroup.add(sole);

      const x = isLeft ? -0.2 : 0.2;
      legGroup.position.set(x, 0.65, 0);

      return legGroup;
    };

    group.add(createLeg(true));
    group.add(createLeg(false));

    // === 影 ===
    const shadowGeo = new THREE.CircleGeometry(0.4, 32);
    const shadowMat = this.materials.standard({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    shadow.name = 'shadow';
    group.add(shadow);

    // userData
    group.userData.isInkling = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'inkling',
      name: 'インクリング',
      variant: variant,
      defaultAnimation: 'inklingIdle'
    }, this.animations);
  }

  // ==================== イカ ====================
  createSquid(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'orange';
    const group = new THREE.Group();

    // カラーパレット
    const colors = {
      orange: { main: 0xff6b00, accent: 0xffaa00, glow: 0xff8844 },
      cyan: { main: 0x00d4ff, accent: 0x00ffff, glow: 0x44ddff },
      purple: { main: 0xaa00ff, accent: 0xdd66ff, glow: 0xcc44ff },
      pink: { main: 0xff4488, accent: 0xff88aa, glow: 0xff66aa },
      lime: { main: 0xaaff00, accent: 0xddff55, glow: 0xccff44 },
      yellow: { main: 0xffdd00, accent: 0xffee55, glow: 0xffee44 }
    };
    const palette = colors[variant] || colors.orange;

    // === メインボディ ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // イカの頭（つるっとした半透明風）
    const mantleGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const mantleMat = this.materials.physical({
      color: palette.main,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.5
    });
    const mantle = new THREE.Mesh(mantleGeo, mantleMat);
    mantle.scale.set(0.8, 1.2, 0.7);
    mantle.castShadow = true;
    mantle.receiveShadow = true;
    bodyGroup.add(mantle);

    // 模様（ドット）
    const createSpot = (x, y, z, size) => {
      const spotGeo = new THREE.SphereGeometry(size, 12, 12);
      const spotMat = this.materials.standard({ color: palette.accent, roughness: 0.3 });
      const spot = new THREE.Mesh(spotGeo, spotMat);
      spot.position.set(x, y, z);
      return spot;
    };
    bodyGroup.add(createSpot(0.2, 0.3, 0.3, 0.08));
    bodyGroup.add(createSpot(-0.25, 0.2, 0.25, 0.06));
    bodyGroup.add(createSpot(0.15, 0.0, 0.35, 0.05));

    bodyGroup.position.y = 0.8;
    bodyGroup.userData.baseY = 0.8;
    group.add(bodyGroup);

    // === 目 ===
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 白目
      const whiteGeo = new THREE.SphereGeometry(0.2, 16, 16);
      const whiteMat = this.materials.standard({ color: 0xffffff, roughness: 0.1 });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      white.scale.set(1.0, 1.2, 0.6);
      eyeGroup.add(white);

      // 黒目（特徴的な形状）
      const pupilGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const pupilMat = this.materials.standard({ color: 0x111111 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.08;
      pupil.scale.set(0.8, 1.4, 0.5);
      eyeGroup.add(pupil);

      // ハイライト
      const highlightGeo = new THREE.SphereGeometry(0.05, 8, 8);
      const highlightMat = this.materials.emissive({ color: 0xffffff, intensity: 1.5 });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(0.04, 0.06, 0.12);
      eyeGroup.add(highlight);

      eyeGroup.position.set(x * 0.35, 0.75, 0.35);
      return eyeGroup;
    };

    group.add(createEye(-1));
    group.add(createEye(1));

    // === 触手 ===
    const createTentacle = (index, total) => {
      const tentacleGroup = new THREE.Group();
      const angle = (index / total) * Math.PI * 2;
      const segments = 5;

      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const radius = 0.1 - t * 0.04;
        const segGeo = new THREE.SphereGeometry(radius, 12, 8);
        const segMat = this.materials.physical({
          color: palette.main,
          roughness: 0.3,
          metalness: 0.05
        });
        const seg = new THREE.Mesh(segGeo, segMat);

        const wave = Math.sin(t * Math.PI + index) * 0.1;
        seg.position.set(
          Math.sin(angle) * (0.15 + t * 0.2) + wave,
          -t * 0.4,
          Math.cos(angle) * (0.15 + t * 0.2) + wave * 0.5
        );
        seg.scale.set(1.0, 0.7, 1.0);
        seg.castShadow = true;
        tentacleGroup.add(seg);
      }

      // 触手の先端（光る吸盤風）
      const tipGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const tipMat = this.materials.emissive({ color: palette.glow, intensity: 0.5 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(
        Math.sin(angle) * 0.35,
        -0.45,
        Math.cos(angle) * 0.35
      );
      tentacleGroup.add(tip);

      tentacleGroup.position.y = 0.3;
      return tentacleGroup;
    };

    for (let i = 0; i < 6; i++) {
      group.add(createTentacle(i, 6));
    }

    // === 影 ===
    const shadowGeo = new THREE.CircleGeometry(0.35, 32);
    const shadowMat = this.materials.standard({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    shadow.name = 'shadow';
    group.add(shadow);

    // userData
    group.userData.isSquid = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'squid',
      name: 'イカ',
      variant: variant,
      defaultAnimation: 'squidIdle'
    }, this.animations);
  }

  // ==================== オクトリング ====================
  createOctoling(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'pink';
    const group = new THREE.Group();

    // カラーパレット（タコ風）
    const colors = {
      pink: { main: 0xff4488, accent: 0xff88aa, skin: 0xffe4c4, eyes: 0x222222, sucker: 0xcc3366 },
      teal: { main: 0x00aaaa, accent: 0x44dddd, skin: 0xffe4c4, eyes: 0x222222, sucker: 0x008888 },
      purple: { main: 0x8844aa, accent: 0xaa66cc, skin: 0xffe4c4, eyes: 0x222222, sucker: 0x663388 },
      gold: { main: 0xddaa00, accent: 0xffcc44, skin: 0xffe4c4, eyes: 0x222222, sucker: 0xbb8800 }
    };
    const palette = colors[variant] || colors.pink;

    // === 胴体 ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    const torsoGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const torsoMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.scale.set(0.85, 1.0, 0.65);
    torso.castShadow = true;
    bodyGroup.add(torso);

    // クロップトップ
    const topGeo = new THREE.SphereGeometry(0.48, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const topMat = this.materials.standard({ color: palette.main, roughness: 0.7 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.scale.set(0.87, 0.9, 0.67);
    top.position.y = 0.05;
    top.castShadow = true;
    bodyGroup.add(top);

    bodyGroup.position.y = 1.2;
    bodyGroup.userData.baseY = 1.2;
    group.add(bodyGroup);

    // === 頭部 ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    const headGeo = new THREE.SphereGeometry(0.55, 24, 24);
    const headMat = this.materials.standard({ color: palette.skin, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.scale.set(1.0, 0.9, 0.9);
    head.castShadow = true;
    headGroup.add(head);

    // タコの吸盤付き触手ヘア
    const createOctoHair = (xOffset, length, curve) => {
      const hairGroup = new THREE.Group();
      const segments = 8;

      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const radius = 0.1 - t * 0.03;
        const segGeo = new THREE.SphereGeometry(radius, 12, 12);
        const segMat = this.materials.standard({ color: palette.main, roughness: 0.4 });
        const seg = new THREE.Mesh(segGeo, segMat);

        const waveX = Math.sin(t * Math.PI * 2) * curve * 0.3;
        const waveZ = Math.cos(t * Math.PI) * 0.1;
        seg.position.set(
          xOffset + waveX,
          -t * length,
          -0.25 - t * 0.3 + waveZ
        );
        seg.scale.set(1.3, 0.7, 1.0);
        seg.castShadow = true;
        hairGroup.add(seg);

        // 吸盤（内側に）
        if (i > 1 && i < segments - 1) {
          const suckerGeo = new THREE.SphereGeometry(0.03, 8, 8);
          const suckerMat = this.materials.standard({ color: palette.sucker, roughness: 0.5 });
          const sucker = new THREE.Mesh(suckerGeo, suckerMat);
          sucker.position.set(
            xOffset + waveX,
            -t * length + 0.02,
            -0.15 - t * 0.2 + waveZ
          );
          hairGroup.add(sucker);
        }
      }

      // 先端のカール
      const tipGeo = new THREE.TorusGeometry(0.05, 0.025, 8, 12, Math.PI);
      const tipMat = this.materials.standard({ color: palette.accent, roughness: 0.4 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(xOffset, -length, -0.55);
      tip.rotation.x = Math.PI / 2;
      tip.rotation.y = xOffset > 0 ? 0.5 : -0.5;
      hairGroup.add(tip);

      return hairGroup;
    };

    headGroup.add(createOctoHair(-0.35, 0.9, -1));
    headGroup.add(createOctoHair(-0.15, 0.85, -0.5));
    headGroup.add(createOctoHair(0.15, 0.85, 0.5));
    headGroup.add(createOctoHair(0.35, 0.9, 1));

    // フロントバング（丸みのある前髪）
    const bangGeo = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI, 0, Math.PI * 0.5);
    const bangMat = this.materials.standard({ color: palette.main, roughness: 0.4 });
    const bang = new THREE.Mesh(bangGeo, bangMat);
    bang.position.set(0, 0.15, 0.35);
    bang.rotation.x = -0.4;
    bang.scale.set(1.4, 0.8, 0.5);
    headGroup.add(bang);

    // 目（やや鋭い）
    const createOctoEye = (x) => {
      const eyeGroup = new THREE.Group();

      const whiteGeo = new THREE.SphereGeometry(0.16, 16, 16);
      const whiteMat = this.materials.standard({ color: 0xffffff, roughness: 0.1 });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      white.scale.set(1.2, 0.9, 0.7);
      eyeGroup.add(white);

      const pupilGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const pupilMat = this.materials.standard({ color: palette.eyes });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.08;
      pupil.scale.set(0.9, 1.1, 0.5);
      eyeGroup.add(pupil);

      // アイライン風
      const lineGeo = new THREE.BoxGeometry(0.22, 0.03, 0.02);
      const lineMat = this.materials.standard({ color: 0x111111, roughness: 0.9 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(0, 0.1, 0.1);
      line.rotation.z = x > 0 ? -0.15 : 0.15;
      eyeGroup.add(line);

      const highlightGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const highlightMat = this.materials.emissive({ color: 0xffffff, intensity: 1 });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(0.03, 0.03, 0.12);
      eyeGroup.add(highlight);

      eyeGroup.position.set(x, 0.0, 0.4);
      return eyeGroup;
    };

    headGroup.add(createOctoEye(-0.18));
    headGroup.add(createOctoEye(0.18));

    // 小さな口
    const mouthGeo = new THREE.TorusGeometry(0.04, 0.015, 8, 12, Math.PI);
    const mouthMat = this.materials.standard({ color: 0x333333, roughness: 0.9 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.18, 0.5);
    mouth.rotation.x = Math.PI;
    headGroup.add(mouth);

    headGroup.position.set(0, 2.0, 0);
    group.add(headGroup);

    // === 腕 ===
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.name = isLeft ? 'leftArm' : 'rightArm';

      const upperArmGeo = new THREE.CapsuleGeometry(0.09, 0.25, 8, 12);
      const upperArmMat = this.materials.standard({ color: palette.main, roughness: 0.7 });
      const upperArm = new THREE.Mesh(upperArmGeo, upperArmMat);
      upperArm.position.y = -0.2;
      upperArm.castShadow = true;
      armGroup.add(upperArm);

      const forearmGeo = new THREE.CapsuleGeometry(0.07, 0.2, 8, 12);
      const forearmMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
      const forearm = new THREE.Mesh(forearmGeo, forearmMat);
      forearm.position.y = -0.5;
      forearm.castShadow = true;
      armGroup.add(forearm);

      const handGeo = new THREE.SphereGeometry(0.09, 12, 12);
      const handMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
      const hand = new THREE.Mesh(handGeo, handMat);
      hand.position.y = -0.7;
      hand.scale.set(1.0, 0.75, 0.75);
      armGroup.add(hand);

      armGroup.position.set(isLeft ? -0.5 : 0.5, 1.35, 0);
      return armGroup;
    };

    group.add(createArm(true));
    group.add(createArm(false));

    // === 脚 ===
    const createLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      legGroup.name = isLeft ? 'leftLeg' : 'rightLeg';

      const shortsGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.18, 12);
      const shortsMat = this.materials.standard({ color: 0x222222, roughness: 0.9 });
      const shorts = new THREE.Mesh(shortsGeo, shortsMat);
      shorts.position.y = -0.1;
      shorts.castShadow = true;
      legGroup.add(shorts);

      const legGeo = new THREE.CapsuleGeometry(0.09, 0.32, 8, 12);
      const legMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.y = -0.42;
      leg.castShadow = true;
      legGroup.add(leg);

      // ブーツ
      const bootGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.2, 12);
      const bootMat = this.materials.standard({ color: palette.main, roughness: 0.6 });
      const boot = new THREE.Mesh(bootGeo, bootMat);
      boot.position.set(0, -0.68, 0);
      boot.castShadow = true;
      legGroup.add(boot);

      const soleGeo = new THREE.BoxGeometry(0.16, 0.05, 0.24);
      const soleMat = this.materials.standard({ color: 0x111111, roughness: 0.8 });
      const sole = new THREE.Mesh(soleGeo, soleMat);
      sole.position.set(0, -0.8, 0.02);
      legGroup.add(sole);

      legGroup.position.set(isLeft ? -0.18 : 0.18, 0.65, 0);
      return legGroup;
    };

    group.add(createLeg(true));
    group.add(createLeg(false));

    // === 影 ===
    const shadowGeo = new THREE.CircleGeometry(0.4, 32);
    const shadowMat = this.materials.standard({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    shadow.name = 'shadow';
    group.add(shadow);

    group.userData.isOctoling = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'octoling',
      name: 'オクトリング',
      variant: variant,
      defaultAnimation: 'inklingIdle'
    }, this.animations);
  }

  // ==================== タコ ====================
  createOctopus(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'pink';
    const group = new THREE.Group();

    // カラーパレット
    const colors = {
      pink: { main: 0xff4488, accent: 0xff88aa, sucker: 0xcc3366, glow: 0xff66aa },
      teal: { main: 0x00aaaa, accent: 0x44dddd, sucker: 0x008888, glow: 0x44ffff },
      purple: { main: 0x8844aa, accent: 0xaa66cc, sucker: 0x663388, glow: 0xaa66ff },
      red: { main: 0xcc3333, accent: 0xff6666, sucker: 0x992222, glow: 0xff4444 }
    };
    const palette = colors[variant] || colors.pink;

    // === 頭部（マントル） ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // 丸いタコの頭
    const mantleGeo = new THREE.SphereGeometry(0.6, 24, 24);
    const mantleMat = this.materials.physical({
      color: palette.main,
      roughness: 0.3,
      metalness: 0.05,
      clearcoat: 0.4
    });
    const mantle = new THREE.Mesh(mantleGeo, mantleMat);
    mantle.scale.set(1.0, 0.85, 0.9);
    mantle.castShadow = true;
    mantle.receiveShadow = true;
    bodyGroup.add(mantle);

    // 頭のドット模様
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spotGeo = new THREE.SphereGeometry(0.06, 12, 12);
      const spotMat = this.materials.standard({ color: palette.accent, roughness: 0.4 });
      const spot = new THREE.Mesh(spotGeo, spotMat);
      spot.position.set(
        Math.sin(angle) * 0.45,
        0.2 + Math.random() * 0.2,
        Math.cos(angle) * 0.4
      );
      bodyGroup.add(spot);
    }

    bodyGroup.position.y = 0.9;
    bodyGroup.userData.baseY = 0.9;
    group.add(bodyGroup);

    // === 目 ===
    const createOctoEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 白目（横長）
      const whiteGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const whiteMat = this.materials.standard({ color: 0xffffff, roughness: 0.1 });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      white.scale.set(1.3, 1.0, 0.6);
      eyeGroup.add(white);

      // 黒目（縦長、特徴的）
      const pupilGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const pupilMat = this.materials.standard({ color: 0x111111 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.1;
      pupil.scale.set(0.7, 1.4, 0.5);
      eyeGroup.add(pupil);

      // ハイライト
      const highlightGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const highlightMat = this.materials.emissive({ color: 0xffffff, intensity: 1.2 });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(0.03, 0.05, 0.14);
      eyeGroup.add(highlight);

      eyeGroup.position.set(x * 0.4, 0.85, 0.4);
      return eyeGroup;
    };

    group.add(createOctoEye(-1));
    group.add(createOctoEye(1));

    // === 8本の触手 ===
    const createTentacle = (index) => {
      const tentacleGroup = new THREE.Group();
      tentacleGroup.name = `tentacle${index}`;
      const angle = (index / 8) * Math.PI * 2;
      const segments = 8;
      const baseLength = 0.7;

      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const radius = 0.12 - t * 0.06;
        const segGeo = new THREE.SphereGeometry(radius, 12, 10);
        const segMat = this.materials.physical({
          color: palette.main,
          roughness: 0.35,
          metalness: 0.02
        });
        const seg = new THREE.Mesh(segGeo, segMat);

        // 触手のうねり
        const wave = Math.sin(t * Math.PI * 2 + index * 0.5) * 0.15;
        const spread = 0.2 + t * 0.4;
        seg.position.set(
          Math.sin(angle) * spread + wave * Math.cos(angle),
          -t * baseLength,
          Math.cos(angle) * spread + wave * Math.sin(angle)
        );
        seg.scale.set(1.0, 0.65, 1.0);
        seg.castShadow = true;
        tentacleGroup.add(seg);

        // 吸盤
        if (i > 0 && i < segments - 1) {
          const suckerGeo = new THREE.SphereGeometry(0.035, 8, 8);
          const suckerMat = this.materials.standard({ color: palette.sucker, roughness: 0.5 });
          const sucker = new THREE.Mesh(suckerGeo, suckerMat);
          sucker.position.set(
            Math.sin(angle) * (spread - 0.05) + wave * Math.cos(angle),
            -t * baseLength,
            Math.cos(angle) * (spread - 0.05) + wave * Math.sin(angle)
          );
          tentacleGroup.add(sucker);
        }
      }

      // 先端の光る部分
      const tipGeo = new THREE.SphereGeometry(0.05, 8, 8);
      const tipMat = this.materials.emissive({ color: palette.glow, intensity: 0.4 });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      const finalSpread = 0.2 + 0.4;
      tip.position.set(
        Math.sin(angle) * finalSpread,
        -baseLength,
        Math.cos(angle) * finalSpread
      );
      tentacleGroup.add(tip);

      tentacleGroup.position.y = 0.4;
      return tentacleGroup;
    };

    for (let i = 0; i < 8; i++) {
      group.add(createTentacle(i));
    }

    // === 影 ===
    const shadowGeo = new THREE.CircleGeometry(0.5, 32);
    const shadowMat = this.materials.standard({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    shadow.name = 'shadow';
    group.add(shadow);

    group.userData.isOctopus = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'octopus',
      name: 'タコ',
      variant: variant,
      defaultAnimation: 'octopusIdle'
    }, this.animations);
  }

  // ==================== リンク（ゼルダ風勇者） ====================
  createLink(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'green';
    const group = new THREE.Group();

    // カラーパレット
    const colors = {
      green: { tunic: 0x228b22, undershirt: 0xf5f5dc, hair: 0xf4d03f, belt: 0x8b4513, boots: 0x5d4037, skin: 0xffd5b4, eyes: 0x4169e1 },
      blue: { tunic: 0x1e90ff, undershirt: 0xf5f5dc, hair: 0xf4d03f, belt: 0x2c3e50, boots: 0x34495e, skin: 0xffd5b4, eyes: 0x00bfff },
      red: { tunic: 0xcc0000, undershirt: 0xf5f5dc, hair: 0xf4d03f, belt: 0x5d4037, boots: 0x8b4513, skin: 0xffd5b4, eyes: 0xff6347 },
      dark: { tunic: 0x1a1a2e, undershirt: 0x2d2d44, hair: 0x4a4a4a, belt: 0x333333, boots: 0x1a1a1a, skin: 0x888899, eyes: 0xff0000 }
    };
    const palette = colors[variant] || colors.green;

    // === 胴体（チュニック） ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // チュニック上部
    const tunicTopGeo = new THREE.BoxGeometry(0.8, 0.9, 0.5, 3, 3, 3);
    this.roundEdges(tunicTopGeo, 0.05);
    const tunicMat = this.materials.standard({ color: palette.tunic, roughness: 0.8 });
    const tunicTop = new THREE.Mesh(tunicTopGeo, tunicMat);
    tunicTop.castShadow = true;
    bodyGroup.add(tunicTop);

    // チュニックスカート部分
    const skirtGeo = new THREE.CylinderGeometry(0.35, 0.5, 0.5, 8);
    const skirt = new THREE.Mesh(skirtGeo, tunicMat.clone());
    skirt.position.y = -0.7;
    skirt.castShadow = true;
    bodyGroup.add(skirt);

    // アンダーシャツ（首元から見える）
    const collarGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.15, 12);
    const collarMat = this.materials.standard({ color: palette.undershirt, roughness: 0.9 });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.y = 0.5;
    bodyGroup.add(collar);

    // Vネックライン
    const vNeckShape = new THREE.Shape();
    vNeckShape.moveTo(-0.15, 0);
    vNeckShape.lineTo(0, -0.2);
    vNeckShape.lineTo(0.15, 0);
    const vNeckGeo = new THREE.ShapeGeometry(vNeckShape);
    const vNeckMat = this.materials.standard({ color: palette.undershirt, roughness: 0.9, side: THREE.DoubleSide });
    const vNeck = new THREE.Mesh(vNeckGeo, vNeckMat);
    vNeck.position.set(0, 0.35, 0.26);
    bodyGroup.add(vNeck);

    // ベルト
    const beltGeo = new THREE.BoxGeometry(0.85, 0.12, 0.55);
    const beltMat = this.materials.standard({ color: palette.belt, roughness: 0.7 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = -0.35;
    bodyGroup.add(belt);

    // ベルトバックル
    const buckleGeo = new THREE.BoxGeometry(0.15, 0.1, 0.05);
    const buckleMat = this.materials.gold();
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, -0.35, 0.3);
    bodyGroup.add(buckle);

    // 剣の鞘（背中）
    const scabbardGeo = new THREE.CylinderGeometry(0.05, 0.04, 1.0, 8);
    const scabbardMat = this.materials.standard({ color: 0x4a2810, roughness: 0.6 });
    const scabbard = new THREE.Mesh(scabbardGeo, scabbardMat);
    scabbard.position.set(0.15, 0.1, -0.35);
    scabbard.rotation.x = 0.3;
    scabbard.rotation.z = 0.2;
    bodyGroup.add(scabbard);

    // 剣の柄
    const hiltGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8);
    const hiltMat = this.materials.standard({ color: 0x2c1810, roughness: 0.5 });
    const hilt = new THREE.Mesh(hiltGeo, hiltMat);
    hilt.position.set(0.15, 0.65, -0.35);
    hilt.rotation.x = 0.3;
    hilt.rotation.z = 0.2;
    bodyGroup.add(hilt);

    // 剣の鍔
    const guardGeo = new THREE.BoxGeometry(0.15, 0.03, 0.06);
    const guardMat = this.materials.metal({ color: 0x4169e1, roughness: 0.3, metalness: 0.8 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.set(0.15, 0.58, -0.35);
    guard.rotation.x = 0.3;
    guard.rotation.z = 0.2;
    bodyGroup.add(guard);

    // 盾（背中）
    const shieldGroup = new THREE.Group();
    shieldGroup.name = 'shield';

    // 盾本体（ハイリアの盾風）
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 0.4);
    shieldShape.lineTo(0.25, 0.2);
    shieldShape.lineTo(0.25, -0.2);
    shieldShape.lineTo(0, -0.4);
    shieldShape.lineTo(-0.25, -0.2);
    shieldShape.lineTo(-0.25, 0.2);
    shieldShape.closePath();

    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 };
    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
    const shieldMat = this.materials.metal({ color: 0x4169e1, roughness: 0.3, metalness: 0.7 });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.castShadow = true;
    shieldGroup.add(shieldMesh);

    // 盾の縁
    const rimGeo = new THREE.TorusGeometry(0.28, 0.02, 8, 6);
    const rimMat = this.materials.gold();
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.z = 0.04;
    shieldGroup.add(rim);

    // 盾中央のトライフォース模様
    const triforceGroup = new THREE.Group();
    const createTriangle = (x, y) => {
      const triShape = new THREE.Shape();
      triShape.moveTo(0, 0.06);
      triShape.lineTo(0.05, -0.03);
      triShape.lineTo(-0.05, -0.03);
      triShape.closePath();
      const triGeo = new THREE.ShapeGeometry(triShape);
      const triMat = this.materials.gold();
      const tri = new THREE.Mesh(triGeo, triMat);
      tri.position.set(x, y, 0.1);
      return tri;
    };
    triforceGroup.add(createTriangle(0, 0.08));
    triforceGroup.add(createTriangle(-0.055, -0.02));
    triforceGroup.add(createTriangle(0.055, -0.02));
    shieldGroup.add(triforceGroup);

    shieldGroup.position.set(-0.15, 0.1, -0.35);
    shieldGroup.rotation.y = Math.PI;
    shieldGroup.rotation.x = 0.2;
    bodyGroup.add(shieldGroup);

    bodyGroup.position.y = 1.5;
    bodyGroup.userData.baseY = 1.5;
    group.add(bodyGroup);

    // === 頭部 ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // 顔
    const faceGeo = new THREE.SphereGeometry(0.32, 24, 24);
    const faceMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.scale.set(1, 1.05, 0.95);
    face.castShadow = true;
    headGroup.add(face);

    // エルフ耳（左）
    const createEar = (isLeft) => {
      const earGroup = new THREE.Group();
      const earGeo = new THREE.ConeGeometry(0.08, 0.25, 8);
      const earMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.rotation.z = isLeft ? Math.PI / 2 + 0.3 : -Math.PI / 2 - 0.3;
      ear.rotation.x = 0.2;
      earGroup.add(ear);
      earGroup.position.set(isLeft ? -0.32 : 0.32, 0, 0);
      return earGroup;
    };
    headGroup.add(createEar(true));
    headGroup.add(createEar(false));

    // 髪（ブロンドヘア）
    const hairGroup = new THREE.Group();
    hairGroup.name = 'hair';

    // 前髪（斜めに流れる）
    const bangsGeo = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const hairMat = this.materials.standard({ color: palette.hair, roughness: 0.9 });
    const bangs = new THREE.Mesh(bangsGeo, hairMat);
    bangs.position.y = 0.1;
    bangs.scale.set(1, 0.6, 1);
    hairGroup.add(bangs);

    // サイドヘア（左右）
    for (let i = 0; i < 6; i++) {
      const strandGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.2 + Math.random() * 0.15, 6);
      const strand = new THREE.Mesh(strandGeo, hairMat.clone());
      const angle = (i / 6) * Math.PI - Math.PI / 2;
      strand.position.set(
        Math.sin(angle) * 0.28,
        0.15,
        Math.cos(angle) * 0.25
      );
      strand.rotation.z = Math.sin(angle) * 0.4;
      strand.rotation.x = -0.2;
      hairGroup.add(strand);
    }

    headGroup.add(hairGroup);

    // 帽子（緑の三角帽）
    const hatGroup = new THREE.Group();
    hatGroup.name = 'hat';

    // 帽子本体
    const hatGeo = new THREE.ConeGeometry(0.25, 0.4, 16);
    const hatMat = this.materials.standard({ color: palette.tunic, roughness: 0.8 });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 0.35;
    hat.rotation.x = 0.3;
    hat.castShadow = true;
    hatGroup.add(hat);

    // 帽子の垂れ部分（後ろに流れる長い部分）
    const tailGroup = new THREE.Group();
    const segments = 5;
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const tailSegGeo = new THREE.CylinderGeometry(
        0.12 * (1 - t * 0.6),
        0.1 * (1 - t * 0.7),
        0.2,
        8
      );
      const tailSeg = new THREE.Mesh(tailSegGeo, hatMat.clone());
      tailSeg.position.set(
        0,
        0.15 - i * 0.15,
        -0.15 - i * 0.12
      );
      tailSeg.rotation.x = -0.3 - i * 0.15;
      tailSeg.name = `hatTail_${i}`;
      tailGroup.add(tailSeg);
    }
    hatGroup.add(tailGroup);

    // 帽子の縁
    const brimGeo = new THREE.TorusGeometry(0.28, 0.03, 8, 24);
    const brimMat = this.materials.standard({ color: palette.tunic, roughness: 0.8 });
    const brim = new THREE.Mesh(brimGeo, brimMat);
    brim.position.y = 0.18;
    brim.rotation.x = Math.PI / 2 + 0.2;
    hatGroup.add(brim);

    headGroup.add(hatGroup);

    // 目
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 白目
      const whiteGeo = new THREE.SphereGeometry(0.065, 12, 12);
      const whiteMat = this.materials.standard({ color: 0xffffff, roughness: 0.1 });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      white.scale.set(0.8, 1, 0.6);
      eyeGroup.add(white);

      // 虹彩
      const irisGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const irisMat = this.materials.standard({ color: palette.eyes, roughness: 0.3 });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.04;
      eyeGroup.add(iris);

      // 瞳孔
      const pupilGeo = new THREE.SphereGeometry(0.02, 8, 8);
      const pupilMat = this.materials.standard({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.055;
      eyeGroup.add(pupil);

      // ハイライト
      const highlightGeo = new THREE.SphereGeometry(0.012, 6, 6);
      const highlightMat = this.materials.emissive({ color: 0xffffff, intensity: 1 });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(0.015, 0.015, 0.065);
      eyeGroup.add(highlight);

      eyeGroup.position.set(x, 0.02, 0.28);
      return eyeGroup;
    };

    const leftEye = createEye(-0.1);
    leftEye.name = 'leftEye';
    headGroup.add(leftEye);

    const rightEye = createEye(0.1);
    rightEye.name = 'rightEye';
    headGroup.add(rightEye);

    // 眉毛
    const browGeo = new THREE.BoxGeometry(0.08, 0.015, 0.02);
    const browMat = this.materials.standard({ color: palette.hair, roughness: 0.9 });
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.1, 0.12, 0.3);
    leftBrow.rotation.z = 0.15;
    headGroup.add(leftBrow);
    const rightBrow = new THREE.Mesh(browGeo, browMat.clone());
    rightBrow.position.set(0.1, 0.12, 0.3);
    rightBrow.rotation.z = -0.15;
    headGroup.add(rightBrow);

    // 鼻
    const noseGeo = new THREE.ConeGeometry(0.025, 0.06, 8);
    const noseMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.02, 0.32);
    nose.rotation.x = -Math.PI / 2;
    headGroup.add(nose);

    // 口
    const mouthShape = new THREE.Shape();
    mouthShape.moveTo(-0.04, 0);
    mouthShape.quadraticCurveTo(0, -0.015, 0.04, 0);
    const mouthGeo = new THREE.ShapeGeometry(mouthShape);
    const mouthMat = this.materials.standard({ color: 0x994444, side: THREE.DoubleSide });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.1, 0.3);
    mouth.name = 'mouth';
    headGroup.add(mouth);

    headGroup.position.set(0, 2.55, 0);
    group.add(headGroup);

    // === 腕 ===
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.name = isLeft ? 'leftArm' : 'rightArm';

      // 袖（チュニックの袖）
      const sleeveGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.35, 12);
      const sleeveMat = this.materials.standard({ color: palette.tunic, roughness: 0.8 });
      const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
      sleeve.position.y = -0.18;
      sleeve.castShadow = true;
      armGroup.add(sleeve);

      // 前腕（肌色）
      const forearmGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.35, 12);
      const forearmMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
      const forearm = new THREE.Mesh(forearmGeo, forearmMat);
      forearm.position.y = -0.53;
      forearm.castShadow = true;
      armGroup.add(forearm);

      // 手
      const handGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const handMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
      const hand = new THREE.Mesh(handGeo, handMat);
      hand.position.y = -0.75;
      hand.scale.set(0.8, 1, 0.6);
      armGroup.add(hand);

      // 腕輪（手首のガード）
      const bracerGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.1, 12);
      const bracerMat = this.materials.standard({ color: palette.belt, roughness: 0.6 });
      const bracer = new THREE.Mesh(bracerGeo, bracerMat);
      bracer.position.y = -0.38;
      armGroup.add(bracer);

      const x = isLeft ? -0.5 : 0.5;
      armGroup.position.set(x, 1.9, 0);

      return armGroup;
    };

    group.add(createArm(true));
    group.add(createArm(false));

    // === 脚 ===
    const createLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      legGroup.name = isLeft ? 'leftLeg' : 'rightLeg';

      // 太もも（白いタイツ/ズボン）
      const thighGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.5, 12);
      const thighMat = this.materials.standard({ color: palette.undershirt, roughness: 0.8 });
      const thigh = new THREE.Mesh(thighGeo, thighMat);
      thigh.position.y = -0.25;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // 膝
      const kneeGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const knee = new THREE.Mesh(kneeGeo, thighMat.clone());
      knee.position.y = -0.5;
      legGroup.add(knee);

      // 脛
      const shinGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.45, 12);
      const shin = new THREE.Mesh(shinGeo, thighMat.clone());
      shin.position.y = -0.75;
      shin.castShadow = true;
      legGroup.add(shin);

      // ブーツ
      const bootGroup = new THREE.Group();

      // ブーツ本体
      const bootGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.3, 12);
      const bootMat = this.materials.standard({ color: palette.boots, roughness: 0.7 });
      const boot = new THREE.Mesh(bootGeo, bootMat);
      boot.position.y = -1.1;
      boot.castShadow = true;
      bootGroup.add(boot);

      // ブーツのつま先
      const toeGeo = new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const toe = new THREE.Mesh(toeGeo, bootMat.clone());
      toe.position.set(0, -1.25, 0.05);
      toe.rotation.x = Math.PI / 2;
      toe.scale.set(1, 1.5, 1);
      bootGroup.add(toe);

      // ブーツの縁
      const bootRimGeo = new THREE.TorusGeometry(0.1, 0.02, 8, 24);
      const bootRim = new THREE.Mesh(bootRimGeo, bootMat.clone());
      bootRim.position.y = -0.96;
      bootRim.rotation.x = Math.PI / 2;
      bootGroup.add(bootRim);

      legGroup.add(bootGroup);

      const x = isLeft ? -0.18 : 0.18;
      legGroup.position.set(x, 0.7, 0);

      return legGroup;
    };

    group.add(createLeg(true));
    group.add(createLeg(false));

    group.userData.isLink = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'link',
      name: 'リンク',
      variant: variant,
      defaultAnimation: 'linkIdle'
    }, this.animations);
  }

  // ==================== ゼルダ姫（ゼルダ風プリンセス） ====================
  createZelda(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'pink';
    const group = new THREE.Group();

    // カラーパレット
    const colors = {
      pink: { dress: 0xffb6c1, accent: 0xffd700, hair: 0xf4d03f, skin: 0xffd5b4, eyes: 0x4169e1, jewelry: 0xffd700 },
      white: { dress: 0xfaf0e6, accent: 0x9370db, hair: 0xf4d03f, skin: 0xffd5b4, eyes: 0x6495ed, jewelry: 0xc0c0c0 },
      blue: { dress: 0x87ceeb, accent: 0xffd700, hair: 0xf4d03f, skin: 0xffd5b4, eyes: 0x00bfff, jewelry: 0xffd700 },
      goddess: { dress: 0xfffaf0, accent: 0xffd700, hair: 0xffefd5, skin: 0xffe4c4, eyes: 0x87ceeb, jewelry: 0xffd700 }
    };
    const palette = colors[variant] || colors.pink;

    // === 胴体（ドレス） ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // ドレス上部（胴体）
    const bodiceGeo = new THREE.CylinderGeometry(0.28, 0.35, 0.7, 16);
    const dressMatTop = this.materials.standard({ color: palette.dress, roughness: 0.7 });
    const bodice = new THREE.Mesh(bodiceGeo, dressMatTop);
    bodice.castShadow = true;
    bodyGroup.add(bodice);

    // ドレス装飾（胸元のV字）
    const vDecorShape = new THREE.Shape();
    vDecorShape.moveTo(-0.12, 0);
    vDecorShape.lineTo(0, -0.2);
    vDecorShape.lineTo(0.12, 0);
    vDecorShape.lineTo(0.08, 0);
    vDecorShape.lineTo(0, -0.12);
    vDecorShape.lineTo(-0.08, 0);
    vDecorShape.closePath();
    const vDecorGeo = new THREE.ShapeGeometry(vDecorShape);
    const vDecorMat = this.materials.standard({ color: palette.accent, roughness: 0.5, side: THREE.DoubleSide });
    const vDecor = new THREE.Mesh(vDecorGeo, vDecorMat);
    vDecor.position.set(0, 0.25, 0.29);
    bodyGroup.add(vDecor);

    // 肩装飾（パフスリーブ風）
    const shoulderGeo = new THREE.SphereGeometry(0.15, 12, 12);
    const shoulderMat = this.materials.standard({ color: palette.dress, roughness: 0.7 });
    const leftShoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
    leftShoulder.position.set(-0.35, 0.25, 0);
    leftShoulder.scale.set(1.2, 0.8, 1);
    bodyGroup.add(leftShoulder);
    const rightShoulder = new THREE.Mesh(shoulderGeo, shoulderMat.clone());
    rightShoulder.position.set(0.35, 0.25, 0);
    rightShoulder.scale.set(1.2, 0.8, 1);
    bodyGroup.add(rightShoulder);

    // ウエストベルト
    const waistGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.1, 16);
    const waistMat = this.materials.standard({ color: palette.accent, roughness: 0.4, metalness: 0.3 });
    const waist = new THREE.Mesh(waistGeo, waistMat);
    waist.position.y = -0.3;
    bodyGroup.add(waist);

    // ベルト中央の宝石
    const gemGeo = new THREE.OctahedronGeometry(0.06);
    const gemMat = this.materials.crystal({ color: palette.eyes });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(0, -0.3, 0.34);
    gem.rotation.x = Math.PI / 4;
    bodyGroup.add(gem);

    // ドレススカート（広がる形状）
    const skirtGeo = new THREE.CylinderGeometry(0.35, 0.8, 1.4, 24);
    const skirtMat = this.materials.standard({ color: palette.dress, roughness: 0.7, side: THREE.DoubleSide });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = -1.05;
    skirt.castShadow = true;
    bodyGroup.add(skirt);

    // スカートの波打つ裾
    for (let i = 0; i < 12; i++) {
      const ruffleGeo = new THREE.TorusGeometry(0.08, 0.03, 8, 12, Math.PI);
      const ruffleMat = this.materials.standard({ color: palette.dress, roughness: 0.8 });
      const ruffle = new THREE.Mesh(ruffleGeo, ruffleMat);
      const angle = (i / 12) * Math.PI * 2;
      ruffle.position.set(
        Math.sin(angle) * 0.75,
        -1.72,
        Math.cos(angle) * 0.75
      );
      ruffle.rotation.x = Math.PI / 2;
      ruffle.rotation.z = angle;
      bodyGroup.add(ruffle);
    }

    // スカートの装飾ライン
    for (let i = 0; i < 6; i++) {
      const lineGeo = new THREE.BoxGeometry(0.02, 1.2, 0.02);
      const lineMat = this.materials.standard({ color: palette.accent, roughness: 0.5 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      const angle = (i / 6) * Math.PI * 2;
      line.position.set(
        Math.sin(angle) * 0.55,
        -1.0,
        Math.cos(angle) * 0.55
      );
      bodyGroup.add(line);
    }

    bodyGroup.position.y = 1.8;
    bodyGroup.userData.baseY = 1.8;
    group.add(bodyGroup);

    // === 頭部 ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // 顔
    const faceGeo = new THREE.SphereGeometry(0.3, 24, 24);
    const faceMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.scale.set(1, 1.08, 0.95);
    face.castShadow = true;
    headGroup.add(face);

    // エルフ耳
    const createEar = (isLeft) => {
      const earGroup = new THREE.Group();
      const earGeo = new THREE.ConeGeometry(0.06, 0.22, 8);
      const earMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.rotation.z = isLeft ? Math.PI / 2 + 0.25 : -Math.PI / 2 - 0.25;
      ear.rotation.x = 0.15;
      earGroup.add(ear);

      // イヤリング
      const earringGeo = new THREE.SphereGeometry(0.03, 8, 8);
      const earringMat = this.materials.gold();
      const earring = new THREE.Mesh(earringGeo, earringMat);
      earring.position.set(isLeft ? -0.08 : 0.08, -0.08, 0);
      earGroup.add(earring);

      earGroup.position.set(isLeft ? -0.3 : 0.3, 0, 0);
      return earGroup;
    };
    headGroup.add(createEar(true));
    headGroup.add(createEar(false));

    // 髪（長い金髪）
    const hairGroup = new THREE.Group();
    hairGroup.name = 'hair';

    // 頭頂部の髪
    const topHairGeo = new THREE.SphereGeometry(0.33, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hairMat = this.materials.standard({ color: palette.hair, roughness: 0.9 });
    const topHair = new THREE.Mesh(topHairGeo, hairMat);
    topHair.position.y = 0.08;
    topHair.scale.set(1, 0.7, 1);
    hairGroup.add(topHair);

    // 前髪（ふんわり）
    for (let i = 0; i < 5; i++) {
      const bangGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const bang = new THREE.Mesh(bangGeo, hairMat.clone());
      const offset = (i - 2) * 0.12;
      bang.position.set(offset, 0.15, 0.25);
      bang.scale.set(1, 1.3, 0.8);
      hairGroup.add(bang);
    }

    // サイドの髪（長く垂れる）
    const createSideHair = (isLeft) => {
      const sideGroup = new THREE.Group();
      const segments = 8;
      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const segGeo = new THREE.SphereGeometry(0.08 * (1 - t * 0.4), 8, 8);
        const seg = new THREE.Mesh(segGeo, hairMat.clone());
        seg.position.set(
          isLeft ? -0.25 - t * 0.05 : 0.25 + t * 0.05,
          -t * 0.9,
          -0.05 - t * 0.1
        );
        seg.scale.set(0.8, 1.2, 0.8);
        sideGroup.add(seg);
      }
      return sideGroup;
    };
    hairGroup.add(createSideHair(true));
    hairGroup.add(createSideHair(false));

    // 後ろ髪（長く流れる）
    const backHairGroup = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const offsetX = (j - 1) * 0.1;
      const segments = 12;
      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const segGeo = new THREE.SphereGeometry(0.1 * (1 - t * 0.5), 8, 8);
        const seg = new THREE.Mesh(segGeo, hairMat.clone());
        seg.position.set(
          offsetX,
          -t * 1.5,
          -0.25 - t * 0.15
        );
        seg.scale.set(0.9, 1.1, 0.8);
        backHairGroup.add(seg);
      }
    }
    hairGroup.add(backHairGroup);

    headGroup.add(hairGroup);

    // ティアラ（王冠）
    const tiaraGroup = new THREE.Group();
    tiaraGroup.name = 'tiara';

    // ティアラ本体（半円形）
    const tiaraBaseGeo = new THREE.TorusGeometry(0.25, 0.02, 8, 24, Math.PI);
    const tiaraMat = this.materials.gold();
    const tiaraBase = new THREE.Mesh(tiaraBaseGeo, tiaraMat);
    tiaraBase.position.set(0, 0.22, 0.1);
    tiaraBase.rotation.x = -0.3;
    tiaraGroup.add(tiaraBase);

    // ティアラの装飾（三角形のポイント）
    for (let i = 0; i < 5; i++) {
      const pointGeo = new THREE.ConeGeometry(0.02, 0.08 + (i === 2 ? 0.06 : 0), 6);
      const point = new THREE.Mesh(pointGeo, tiaraMat.clone());
      const angle = (i / 4) * Math.PI - Math.PI / 2;
      point.position.set(
        Math.sin(angle) * 0.22,
        0.28 + (i === 2 ? 0.03 : 0),
        Math.cos(angle) * 0.08 + 0.1
      );
      tiaraGroup.add(point);
    }

    // 中央の宝石（トライフォース風）
    const centerGemGeo = new THREE.OctahedronGeometry(0.04);
    const centerGemMat = this.materials.crystal({ color: 0x00ff88 });
    const centerGem = new THREE.Mesh(centerGemGeo, centerGemMat);
    centerGem.position.set(0, 0.32, 0.15);
    centerGem.rotation.x = Math.PI / 4;
    tiaraGroup.add(centerGem);

    headGroup.add(tiaraGroup);

    // 目
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 白目
      const whiteGeo = new THREE.SphereGeometry(0.06, 12, 12);
      const whiteMat = this.materials.standard({ color: 0xffffff, roughness: 0.1 });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      white.scale.set(0.9, 1.1, 0.5);
      eyeGroup.add(white);

      // 虹彩
      const irisGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const irisMat = this.materials.standard({ color: palette.eyes, roughness: 0.3 });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.03;
      eyeGroup.add(iris);

      // 瞳孔
      const pupilGeo = new THREE.SphereGeometry(0.018, 8, 8);
      const pupilMat = this.materials.standard({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.05;
      eyeGroup.add(pupil);

      // ハイライト
      const highlightGeo = new THREE.SphereGeometry(0.01, 6, 6);
      const highlightMat = this.materials.emissive({ color: 0xffffff, intensity: 1 });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(0.012, 0.015, 0.055);
      eyeGroup.add(highlight);

      // まつげ
      const lashGeo = new THREE.BoxGeometry(0.08, 0.01, 0.01);
      const lashMat = this.materials.standard({ color: 0x333333 });
      const lash = new THREE.Mesh(lashGeo, lashMat);
      lash.position.set(0, 0.055, 0.03);
      lash.rotation.z = x > 0 ? -0.1 : 0.1;
      eyeGroup.add(lash);

      eyeGroup.position.set(x, 0.02, 0.26);
      return eyeGroup;
    };

    const leftEye = createEye(-0.09);
    leftEye.name = 'leftEye';
    headGroup.add(leftEye);

    const rightEye = createEye(0.09);
    rightEye.name = 'rightEye';
    headGroup.add(rightEye);

    // 眉毛（細くアーチ状）
    const browShape = new THREE.Shape();
    browShape.moveTo(-0.04, 0);
    browShape.quadraticCurveTo(0, 0.015, 0.04, 0);
    const browGeo = new THREE.ShapeGeometry(browShape);
    const browMat = this.materials.standard({ color: palette.hair, roughness: 0.9, side: THREE.DoubleSide });
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.09, 0.11, 0.28);
    headGroup.add(leftBrow);
    const rightBrow = new THREE.Mesh(browGeo, browMat.clone());
    rightBrow.position.set(0.09, 0.11, 0.28);
    headGroup.add(rightBrow);

    // 鼻
    const noseGeo = new THREE.ConeGeometry(0.018, 0.04, 8);
    const noseMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.02, 0.3);
    nose.rotation.x = -Math.PI / 2;
    headGroup.add(nose);

    // 唇（やや赤め）
    const lipShape = new THREE.Shape();
    lipShape.moveTo(-0.04, 0);
    lipShape.quadraticCurveTo(-0.02, 0.015, 0, 0.01);
    lipShape.quadraticCurveTo(0.02, 0.015, 0.04, 0);
    lipShape.quadraticCurveTo(0.02, -0.01, 0, -0.005);
    lipShape.quadraticCurveTo(-0.02, -0.01, -0.04, 0);
    const lipGeo = new THREE.ShapeGeometry(lipShape);
    const lipMat = this.materials.standard({ color: 0xcc6666, roughness: 0.5, side: THREE.DoubleSide });
    const lips = new THREE.Mesh(lipGeo, lipMat);
    lips.position.set(0, -0.1, 0.28);
    lips.name = 'mouth';
    headGroup.add(lips);

    headGroup.position.set(0, 2.95, 0);
    group.add(headGroup);

    // === 腕 ===
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.name = isLeft ? 'leftArm' : 'rightArm';

      // 上腕（肌色、パフスリーブから出る）
      const upperArmGeo = new THREE.CylinderGeometry(0.06, 0.055, 0.35, 12);
      const armMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
      const upperArm = new THREE.Mesh(upperArmGeo, armMat);
      upperArm.position.y = -0.18;
      upperArm.castShadow = true;
      armGroup.add(upperArm);

      // 肘
      const elbowGeo = new THREE.SphereGeometry(0.055, 10, 10);
      const elbow = new THREE.Mesh(elbowGeo, armMat.clone());
      elbow.position.y = -0.38;
      armGroup.add(elbow);

      // 前腕
      const forearmGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.3, 12);
      const forearm = new THREE.Mesh(forearmGeo, armMat.clone());
      forearm.position.y = -0.55;
      forearm.castShadow = true;
      armGroup.add(forearm);

      // 手
      const handGeo = new THREE.SphereGeometry(0.06, 12, 12);
      const hand = new THREE.Mesh(handGeo, armMat.clone());
      hand.position.y = -0.72;
      hand.scale.set(0.75, 1, 0.6);
      armGroup.add(hand);

      // ブレスレット
      const braceletGeo = new THREE.TorusGeometry(0.055, 0.015, 8, 24);
      const braceletMat = this.materials.gold();
      const bracelet = new THREE.Mesh(braceletGeo, braceletMat);
      bracelet.position.y = -0.42;
      bracelet.rotation.x = Math.PI / 2;
      armGroup.add(bracelet);

      const x = isLeft ? -0.42 : 0.42;
      armGroup.position.set(x, 2.0, 0);

      return armGroup;
    };

    group.add(createArm(true));
    group.add(createArm(false));

    // === 脚（ドレスで隠れているが、足先は見える） ===
    const createFoot = (isLeft) => {
      const footGroup = new THREE.Group();

      // ヒールシューズ
      const shoeGeo = new THREE.SphereGeometry(0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const shoeMat = this.materials.standard({ color: palette.jewelry, roughness: 0.4, metalness: 0.2 });
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.rotation.x = Math.PI / 2;
      shoe.scale.set(0.8, 1.2, 1);
      shoe.castShadow = true;
      footGroup.add(shoe);

      // ヒール
      const heelGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.08, 8);
      const heel = new THREE.Mesh(heelGeo, shoeMat.clone());
      heel.position.set(0, -0.04, -0.06);
      footGroup.add(heel);

      const x = isLeft ? -0.15 : 0.15;
      footGroup.position.set(x, 0.08, 0.05);

      return footGroup;
    };

    group.add(createFoot(true));
    group.add(createFoot(false));

    group.userData.isZelda = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'zelda',
      name: 'ゼルダ姫',
      variant: variant,
      defaultAnimation: 'zeldaIdle'
    }, this.animations);
  }

  // ==================== ガノンドロフ（ゼルダ風魔王） ====================
  createGanondorf(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'dark';
    const group = new THREE.Group();

    // カラーパレット
    const colors = {
      dark: { skin: 0x5d6d3a, hair: 0xcc3300, armor: 0x1a1a2e, cape: 0x4a0e0e, eyes: 0xffcc00, gem: 0x00ff00 },
      beast: { skin: 0x2d4a1a, hair: 0x881100, armor: 0x0d0d1a, cape: 0x2a0505, eyes: 0xff0000, gem: 0xff4400 },
      calamity: { skin: 0x1a0a2e, hair: 0xff4400, armor: 0x0a0a15, cape: 0x330011, eyes: 0xff00ff, gem: 0xff0066 },
      gerudo: { skin: 0x8b6914, hair: 0xcc3300, armor: 0x2c1810, cape: 0x6b1a1a, eyes: 0xffd700, gem: 0x00ff88 }
    };
    const palette = colors[variant] || colors.dark;

    // === 胴体（重厚な鎧） ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // 鎧の胴体（大きめ）
    const torsoGeo = new THREE.BoxGeometry(1.4, 1.5, 0.9, 4, 4, 4);
    this.roundEdges(torsoGeo, 0.08);
    const armorMat = this.materials.metal({ color: palette.armor, roughness: 0.4, metalness: 0.8 });
    const torso = new THREE.Mesh(torsoGeo, armorMat);
    torso.castShadow = true;
    bodyGroup.add(torso);

    // 胸部装飾（邪悪なシンボル）
    const chestPlateGeo = new THREE.BoxGeometry(0.8, 0.5, 0.12);
    const chestPlateMat = this.materials.metal({ color: 0x4a0e0e, roughness: 0.3, metalness: 0.9 });
    const chestPlate = new THREE.Mesh(chestPlateGeo, chestPlateMat);
    chestPlate.position.set(0, 0.3, 0.46);
    bodyGroup.add(chestPlate);

    // 胸部中央の宝石（トライフォース風）
    const chestGemGeo = new THREE.OctahedronGeometry(0.12);
    const chestGemMat = this.materials.crystal({ color: palette.gem });
    const chestGem = new THREE.Mesh(chestGemGeo, chestGemMat);
    chestGem.position.set(0, 0.3, 0.55);
    chestGem.rotation.x = Math.PI / 4;
    chestGem.name = 'chestGem';
    bodyGroup.add(chestGem);

    // 肩鎧（大きく威圧的）
    const createShoulderArmor = (isLeft) => {
      const shoulderGroup = new THREE.Group();

      // メインパッド
      const padGeo = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const padMat = this.materials.metal({ color: palette.armor, roughness: 0.3, metalness: 0.85 });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.rotation.x = Math.PI;
      pad.scale.set(1.2, 1, 1.1);
      pad.castShadow = true;
      shoulderGroup.add(pad);

      // スパイク
      for (let i = 0; i < 3; i++) {
        const spikeGeo = new THREE.ConeGeometry(0.06, 0.25, 8);
        const spikeMat = this.materials.metal({ color: 0x333333, roughness: 0.2, metalness: 0.9 });
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        const angle = (i - 1) * 0.5;
        spike.position.set(
          Math.sin(angle) * 0.25,
          0.15,
          Math.cos(angle) * 0.15 - 0.1
        );
        spike.rotation.x = -0.3;
        spike.rotation.z = isLeft ? 0.3 : -0.3;
        shoulderGroup.add(spike);
      }

      shoulderGroup.position.set(isLeft ? -0.85 : 0.85, 0.55, 0);
      return shoulderGroup;
    };
    bodyGroup.add(createShoulderArmor(true));
    bodyGroup.add(createShoulderArmor(false));

    // ベルト
    const beltGeo = new THREE.BoxGeometry(1.45, 0.2, 0.95);
    const beltMat = this.materials.standard({ color: 0x2c1810, roughness: 0.7 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = -0.65;
    bodyGroup.add(belt);

    // ベルトバックル（大きな宝石）
    const buckleGeo = new THREE.BoxGeometry(0.25, 0.18, 0.08);
    const buckleMat = this.materials.gold();
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, -0.65, 0.5);
    bodyGroup.add(buckle);

    // マント
    const capeGroup = new THREE.Group();
    capeGroup.name = 'cape';

    // マント本体
    const capeShape = new THREE.Shape();
    capeShape.moveTo(-0.6, 0);
    capeShape.lineTo(-0.8, -1.8);
    capeShape.quadraticCurveTo(0, -2.2, 0.8, -1.8);
    capeShape.lineTo(0.6, 0);
    capeShape.closePath();

    const capeGeo = new THREE.ShapeGeometry(capeShape);
    const capeMat = this.materials.standard({
      color: palette.cape,
      side: THREE.DoubleSide,
      roughness: 0.9
    });
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, 0.4, -0.5);
    cape.rotation.x = 0.15;
    capeGroup.add(cape);

    // マントの裏地
    const liningMat = this.materials.standard({
      color: 0x1a0a0a,
      side: THREE.DoubleSide,
      roughness: 0.95
    });
    const lining = new THREE.Mesh(capeGeo.clone(), liningMat);
    lining.position.set(0, 0.4, -0.52);
    lining.rotation.x = 0.15;
    capeGroup.add(lining);

    // マント留め具
    const claspGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const claspMat = this.materials.gold();
    const leftClasp = new THREE.Mesh(claspGeo, claspMat);
    leftClasp.position.set(-0.55, 0.5, -0.35);
    capeGroup.add(leftClasp);
    const rightClasp = new THREE.Mesh(claspGeo, claspMat.clone());
    rightClasp.position.set(0.55, 0.5, -0.35);
    capeGroup.add(rightClasp);

    bodyGroup.add(capeGroup);

    bodyGroup.position.y = 1.8;
    bodyGroup.userData.baseY = 1.8;
    group.add(bodyGroup);

    // === 頭部 ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // 顔（ゲルド族特有の緑がかった肌）
    const faceGeo = new THREE.SphereGeometry(0.4, 24, 24);
    const faceMat = this.materials.standard({ color: palette.skin, roughness: 0.75 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.scale.set(1, 1.15, 1);
    face.castShadow = true;
    headGroup.add(face);

    // 額の宝石（力のトライフォース）
    const foreheadGemGeo = new THREE.OctahedronGeometry(0.06);
    const foreheadGemMat = this.materials.crystal({ color: palette.gem });
    const foreheadGem = new THREE.Mesh(foreheadGemGeo, foreheadGemMat);
    foreheadGem.position.set(0, 0.25, 0.38);
    foreheadGem.rotation.x = Math.PI / 4;
    headGroup.add(foreheadGem);

    // 眉骨（険しい表情）
    const browRidgeGeo = new THREE.BoxGeometry(0.6, 0.08, 0.15);
    const browRidgeMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
    const browRidge = new THREE.Mesh(browRidgeGeo, browRidgeMat);
    browRidge.position.set(0, 0.12, 0.35);
    browRidge.rotation.x = 0.2;
    headGroup.add(browRidge);

    // 目（光る邪悪な目）
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 目の窪み
      const socketGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const socketMat = this.materials.standard({ color: 0x1a1a1a });
      const socket = new THREE.Mesh(socketGeo, socketMat);
      socket.scale.set(1, 0.8, 0.5);
      eyeGroup.add(socket);

      // 光る瞳
      const pupilGeo = new THREE.SphereGeometry(0.04, 12, 12);
      const pupilMat = this.materials.emissive({ color: palette.eyes, intensity: 1.2 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.04;
      pupil.name = 'pupil';
      eyeGroup.add(pupil);

      eyeGroup.position.set(x, 0.05, 0.35);
      return eyeGroup;
    };

    const leftEye = createEye(-0.12);
    leftEye.name = 'leftEye';
    headGroup.add(leftEye);

    const rightEye = createEye(0.12);
    rightEye.name = 'rightEye';
    headGroup.add(rightEye);

    // 鼻（大きく厳つい）
    const noseGeo = new THREE.BoxGeometry(0.1, 0.15, 0.12);
    const noseMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.05, 0.4);
    headGroup.add(nose);

    // 口（への字）
    const mouthShape = new THREE.Shape();
    mouthShape.moveTo(-0.12, 0);
    mouthShape.quadraticCurveTo(0, -0.04, 0.12, 0);
    const mouthGeo = new THREE.ShapeGeometry(mouthShape);
    const mouthMat = this.materials.standard({ color: 0x2a1a1a, side: THREE.DoubleSide });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.2, 0.38);
    mouth.name = 'mouth';
    headGroup.add(mouth);

    // 顎髭
    const beardGeo = new THREE.ConeGeometry(0.15, 0.25, 8);
    const beardMat = this.materials.standard({ color: palette.hair, roughness: 0.9 });
    const beard = new THREE.Mesh(beardGeo, beardMat);
    beard.position.set(0, -0.4, 0.2);
    beard.rotation.x = 0.3;
    headGroup.add(beard);

    // 髪（燃えるような赤髪）
    const hairGroup = new THREE.Group();
    hairGroup.name = 'hair';

    // メインヘア（後ろに流れる）
    const mainHairGeo = new THREE.SphereGeometry(0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.7);
    const hairMat = this.materials.standard({ color: palette.hair, roughness: 0.85 });
    const mainHair = new THREE.Mesh(mainHairGeo, hairMat);
    mainHair.position.set(0, 0.1, -0.05);
    mainHair.scale.set(1.1, 0.9, 1.2);
    hairGroup.add(mainHair);

    // 逆立った髪（炎のような形状）
    for (let i = 0; i < 8; i++) {
      const flameGeo = new THREE.ConeGeometry(0.08, 0.3 + Math.random() * 0.15, 6);
      const flame = new THREE.Mesh(flameGeo, hairMat.clone());
      const angle = (i / 8) * Math.PI * 2;
      flame.position.set(
        Math.sin(angle) * 0.3,
        0.35 + Math.random() * 0.1,
        Math.cos(angle) * 0.25 - 0.1
      );
      flame.rotation.x = -0.2 + Math.cos(angle) * 0.3;
      flame.rotation.z = Math.sin(angle) * 0.3;
      hairGroup.add(flame);
    }

    // 後ろに流れる長い髪
    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      const strandGeo = new THREE.CylinderGeometry(0.06 * (1 - t * 0.5), 0.04 * (1 - t * 0.5), 0.25, 8);
      const strand = new THREE.Mesh(strandGeo, hairMat.clone());
      strand.position.set(
        (Math.random() - 0.5) * 0.3,
        -t * 0.5,
        -0.35 - t * 0.15
      );
      strand.rotation.x = -0.4 - t * 0.2;
      hairGroup.add(strand);
    }

    headGroup.add(hairGroup);

    // 冠（魔王の冠）
    const crownGroup = new THREE.Group();
    crownGroup.name = 'crown';

    // 冠のベース
    const crownBaseGeo = new THREE.TorusGeometry(0.35, 0.04, 8, 24);
    const crownMat = this.materials.gold();
    const crownBase = new THREE.Mesh(crownBaseGeo, crownMat);
    crownBase.position.y = 0.35;
    crownBase.rotation.x = Math.PI / 2;
    crownGroup.add(crownBase);

    // 冠のスパイク
    for (let i = 0; i < 5; i++) {
      const spikeGeo = new THREE.ConeGeometry(0.04, 0.2, 6);
      const spike = new THREE.Mesh(spikeGeo, crownMat.clone());
      const angle = (i / 5) * Math.PI - Math.PI / 2;
      spike.position.set(
        Math.sin(angle) * 0.32,
        0.45,
        Math.cos(angle) * 0.32
      );
      crownGroup.add(spike);
    }

    headGroup.add(crownGroup);

    // 耳（ゲルド族、やや尖っている）
    const createEar = (isLeft) => {
      const earGeo = new THREE.ConeGeometry(0.06, 0.18, 8);
      const earMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.rotation.z = isLeft ? Math.PI / 2 + 0.2 : -Math.PI / 2 - 0.2;
      ear.position.set(isLeft ? -0.4 : 0.4, 0.05, 0);
      return ear;
    };
    headGroup.add(createEar(true));
    headGroup.add(createEar(false));

    headGroup.position.set(0, 3.15, 0);
    group.add(headGroup);

    // === 腕 ===
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.name = isLeft ? 'leftArm' : 'rightArm';

      // 上腕装甲
      const upperArmGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.55, 12);
      const upperArmMat = this.materials.metal({ color: palette.armor, roughness: 0.4, metalness: 0.8 });
      const upperArm = new THREE.Mesh(upperArmGeo, upperArmMat);
      upperArm.position.y = -0.28;
      upperArm.castShadow = true;
      armGroup.add(upperArm);

      // 肘
      const elbowGeo = new THREE.SphereGeometry(0.14, 12, 12);
      const elbowMat = this.materials.metal({ color: 0x333333, roughness: 0.3, metalness: 0.9 });
      const elbow = new THREE.Mesh(elbowGeo, elbowMat);
      elbow.position.y = -0.55;
      armGroup.add(elbow);

      // 前腕装甲（籠手）
      const forearmGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.5, 12);
      const forearm = new THREE.Mesh(forearmGeo, upperArmMat.clone());
      forearm.position.y = -0.85;
      forearm.castShadow = true;
      armGroup.add(forearm);

      // 籠手のスパイク
      const gauntletSpikeGeo = new THREE.ConeGeometry(0.04, 0.15, 6);
      const gauntletSpikeMat = this.materials.metal({ color: 0x333333, roughness: 0.2, metalness: 0.9 });
      const gauntletSpike = new THREE.Mesh(gauntletSpikeGeo, gauntletSpikeMat);
      gauntletSpike.position.set(isLeft ? -0.15 : 0.15, -0.75, 0);
      gauntletSpike.rotation.z = isLeft ? -Math.PI / 2 : Math.PI / 2;
      armGroup.add(gauntletSpike);

      // 手
      const handGeo = new THREE.BoxGeometry(0.2, 0.18, 0.12);
      const handMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
      const hand = new THREE.Mesh(handGeo, handMat);
      hand.position.y = -1.15;
      armGroup.add(hand);

      const x = isLeft ? -0.85 : 0.85;
      armGroup.position.set(x, 2.3, 0);

      return armGroup;
    };

    group.add(createArm(true));
    group.add(createArm(false));

    // === 脚 ===
    const createLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      legGroup.name = isLeft ? 'leftLeg' : 'rightLeg';

      // 太もも装甲
      const thighGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.65, 12);
      const thighMat = this.materials.metal({ color: palette.armor, roughness: 0.4, metalness: 0.8 });
      const thigh = new THREE.Mesh(thighGeo, thighMat);
      thigh.position.y = -0.33;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // 膝当て
      const kneeGeo = new THREE.SphereGeometry(0.16, 12, 12);
      const kneeMat = this.materials.metal({ color: 0x333333, roughness: 0.3, metalness: 0.9 });
      const knee = new THREE.Mesh(kneeGeo, kneeMat);
      knee.position.y = -0.65;
      legGroup.add(knee);

      // 脛装甲
      const shinGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.6, 12);
      const shin = new THREE.Mesh(shinGeo, thighMat.clone());
      shin.position.y = -1.0;
      shin.castShadow = true;
      legGroup.add(shin);

      // ブーツ
      const bootGeo = new THREE.BoxGeometry(0.3, 0.25, 0.45);
      const bootMat = this.materials.standard({ color: 0x1a1a1a, roughness: 0.6 });
      const boot = new THREE.Mesh(bootGeo, bootMat);
      boot.position.set(0, -1.4, 0.05);
      boot.castShadow = true;
      legGroup.add(boot);

      const x = isLeft ? -0.35 : 0.35;
      legGroup.position.set(x, 0.95, 0);

      return legGroup;
    };

    group.add(createLeg(true));
    group.add(createLeg(false));

    // 全体を少し大きくする（威圧感）
    group.scale.set(1.15, 1.15, 1.15);

    group.userData.isGanondorf = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'ganondorf',
      name: 'ガノンドロフ',
      variant: variant,
      defaultAnimation: 'ganondorfIdle'
    }, this.animations);
  }

  // ==================== ボコブリン（ゼルダ風ゴブリン） ====================
  createBokoblin(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'red';
    const group = new THREE.Group();

    // カラーパレット
    const colors = {
      red: { skin: 0xcc4444, belly: 0xddaa88, hair: 0x442222, eyes: 0xffff00, horn: 0xddccaa },
      blue: { skin: 0x4466aa, belly: 0x99aabb, hair: 0x222244, eyes: 0xff8800, horn: 0xccccdd },
      black: { skin: 0x333344, belly: 0x555566, hair: 0x111122, eyes: 0xff0000, horn: 0x666677 },
      silver: { skin: 0xaaaaaa, belly: 0xcccccc, hair: 0x666666, eyes: 0x00ffff, horn: 0xeeeeee }
    };
    const palette = colors[variant] || colors.red;

    // === 胴体 ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // メイン胴体（ずんぐりした形）
    const torsoGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const torsoMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.scale.set(1, 1.1, 0.9);
    torso.castShadow = true;
    bodyGroup.add(torso);

    // お腹（明るい色）
    const bellyGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const bellyMat = this.materials.standard({ color: palette.belly, roughness: 0.85 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, -0.1, 0.25);
    belly.scale.set(1, 1.1, 0.8);
    bodyGroup.add(belly);

    // 腰布（原始的な服）
    const loinclothGeo = new THREE.ConeGeometry(0.4, 0.35, 8);
    const loinclothMat = this.materials.standard({ color: 0x8b6914, roughness: 0.9 });
    const loincloth = new THREE.Mesh(loinclothGeo, loinclothMat);
    loincloth.position.set(0, -0.55, 0.1);
    loincloth.rotation.x = Math.PI;
    bodyGroup.add(loincloth);

    // ベルト（紐）
    const beltGeo = new THREE.TorusGeometry(0.42, 0.03, 8, 24);
    const beltMat = this.materials.standard({ color: 0x5d4037, roughness: 0.8 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = -0.35;
    belt.rotation.x = Math.PI / 2;
    bodyGroup.add(belt);

    bodyGroup.position.y = 1.0;
    bodyGroup.userData.baseY = 1.0;
    group.add(bodyGroup);

    // === 頭部（大きめで豚顔） ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // 頭（大きい）
    const headGeo = new THREE.SphereGeometry(0.45, 24, 24);
    const headMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.scale.set(1, 0.95, 1);
    head.castShadow = true;
    headGroup.add(head);

    // 鼻（豚鼻）
    const snoutGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.2, 12);
    const snoutMat = this.materials.standard({ color: palette.skin, roughness: 0.75 });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, -0.1, 0.4);
    snout.rotation.x = Math.PI / 2;
    headGroup.add(snout);

    // 鼻の穴
    const createNostril = (x) => {
      const nostrilGeo = new THREE.SphereGeometry(0.05, 8, 8);
      const nostrilMat = this.materials.standard({ color: 0x1a1a1a });
      const nostril = new THREE.Mesh(nostrilGeo, nostrilMat);
      nostril.position.set(x, -0.1, 0.52);
      return nostril;
    };
    headGroup.add(createNostril(-0.07));
    headGroup.add(createNostril(0.07));

    // 目（黄色く光る、邪悪な目）
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 白目部分（黄色がかった）
      const whiteGeo = new THREE.SphereGeometry(0.1, 12, 12);
      const whiteMat = this.materials.standard({ color: 0xffeecc, roughness: 0.3 });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      white.scale.set(1, 0.8, 0.6);
      eyeGroup.add(white);

      // 瞳
      const pupilGeo = new THREE.SphereGeometry(0.05, 10, 10);
      const pupilMat = this.materials.emissive({ color: palette.eyes, intensity: 0.8 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.06;
      pupil.name = 'pupil';
      eyeGroup.add(pupil);

      // 黒目の中心
      const centerGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const centerMat = this.materials.standard({ color: 0x000000 });
      const center = new THREE.Mesh(centerGeo, centerMat);
      center.position.z = 0.08;
      eyeGroup.add(center);

      eyeGroup.position.set(x, 0.1, 0.35);
      return eyeGroup;
    };

    const leftEye = createEye(-0.15);
    leftEye.name = 'leftEye';
    headGroup.add(leftEye);

    const rightEye = createEye(0.15);
    rightEye.name = 'rightEye';
    headGroup.add(rightEye);

    // 眉骨（怒った表情）
    const browGeo = new THREE.BoxGeometry(0.12, 0.04, 0.06);
    const browMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.15, 0.22, 0.38);
    leftBrow.rotation.z = 0.3;
    headGroup.add(leftBrow);
    const rightBrow = new THREE.Mesh(browGeo, browMat.clone());
    rightBrow.position.set(0.15, 0.22, 0.38);
    rightBrow.rotation.z = -0.3;
    headGroup.add(rightBrow);

    // 耳（長くて垂れた耳）
    const createEar = (isLeft) => {
      const earGroup = new THREE.Group();

      const earGeo = new THREE.ConeGeometry(0.12, 0.35, 8);
      const earMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.rotation.z = isLeft ? Math.PI / 2 + 0.5 : -Math.PI / 2 - 0.5;
      ear.rotation.x = 0.3;
      earGroup.add(ear);

      // 耳の内側
      const innerGeo = new THREE.ConeGeometry(0.06, 0.2, 6);
      const innerMat = this.materials.standard({ color: palette.belly, roughness: 0.85 });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.rotation.z = isLeft ? Math.PI / 2 + 0.5 : -Math.PI / 2 - 0.5;
      inner.rotation.x = 0.3;
      inner.position.z = 0.02;
      earGroup.add(inner);

      earGroup.position.set(isLeft ? -0.4 : 0.4, 0.1, -0.1);
      return earGroup;
    };
    headGroup.add(createEar(true));
    headGroup.add(createEar(false));

    // 角（小さな角）
    const createHorn = (x) => {
      const hornGeo = new THREE.ConeGeometry(0.05, 0.15, 8);
      const hornMat = this.materials.standard({ color: palette.horn, roughness: 0.6 });
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(x, 0.4, 0);
      horn.rotation.z = x > 0 ? -0.3 : 0.3;
      return horn;
    };
    headGroup.add(createHorn(-0.15));
    headGroup.add(createHorn(0.15));

    // 口（への字、牙付き）
    const mouthShape = new THREE.Shape();
    mouthShape.moveTo(-0.15, 0);
    mouthShape.quadraticCurveTo(0, -0.08, 0.15, 0);
    const mouthGeo = new THREE.ShapeGeometry(mouthShape);
    const mouthMat = this.materials.standard({ color: 0x331111, side: THREE.DoubleSide });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.25, 0.4);
    mouth.name = 'mouth';
    headGroup.add(mouth);

    // 牙
    const createFang = (x) => {
      const fangGeo = new THREE.ConeGeometry(0.03, 0.1, 6);
      const fangMat = this.materials.standard({ color: 0xffffee, roughness: 0.4 });
      const fang = new THREE.Mesh(fangGeo, fangMat);
      fang.position.set(x, -0.28, 0.38);
      fang.rotation.x = Math.PI;
      return fang;
    };
    headGroup.add(createFang(-0.08));
    headGroup.add(createFang(0.08));

    // 髪（まばらな毛）
    const hairGroup = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const hairGeo = new THREE.ConeGeometry(0.03, 0.12 + Math.random() * 0.08, 6);
      const hairMat = this.materials.standard({ color: palette.hair, roughness: 0.95 });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      const angle = (i / 6) * Math.PI * 2;
      hair.position.set(
        Math.sin(angle) * 0.2,
        0.4,
        Math.cos(angle) * 0.15 - 0.1
      );
      hair.rotation.x = -0.3;
      hair.rotation.z = Math.sin(angle) * 0.3;
      hairGroup.add(hair);
    }
    headGroup.add(hairGroup);

    headGroup.position.set(0, 1.85, 0);
    group.add(headGroup);

    // === 腕 ===
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.name = isLeft ? 'leftArm' : 'rightArm';

      // 上腕
      const upperArmGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.35, 10);
      const armMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
      const upperArm = new THREE.Mesh(upperArmGeo, armMat);
      upperArm.position.y = -0.18;
      upperArm.castShadow = true;
      armGroup.add(upperArm);

      // 肘
      const elbowGeo = new THREE.SphereGeometry(0.08, 10, 10);
      const elbow = new THREE.Mesh(elbowGeo, armMat.clone());
      elbow.position.y = -0.38;
      armGroup.add(elbow);

      // 前腕
      const forearmGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 10);
      const forearm = new THREE.Mesh(forearmGeo, armMat.clone());
      forearm.position.y = -0.55;
      forearm.castShadow = true;
      armGroup.add(forearm);

      // 手（大きめ）
      const handGeo = new THREE.SphereGeometry(0.1, 10, 10);
      const hand = new THREE.Mesh(handGeo, armMat.clone());
      hand.position.y = -0.72;
      hand.scale.set(1, 0.8, 0.7);
      armGroup.add(hand);

      // 指（3本）
      for (let i = 0; i < 3; i++) {
        const fingerGeo = new THREE.CylinderGeometry(0.025, 0.02, 0.1, 6);
        const finger = new THREE.Mesh(fingerGeo, armMat.clone());
        finger.position.set((i - 1) * 0.05, -0.82, 0.03);
        finger.rotation.x = 0.3;
        armGroup.add(finger);
      }

      const x = isLeft ? -0.5 : 0.5;
      armGroup.position.set(x, 1.3, 0);
      armGroup.rotation.z = isLeft ? 0.2 : -0.2;

      return armGroup;
    };

    group.add(createArm(true));
    group.add(createArm(false));

    // === 脚 ===
    const createLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      legGroup.name = isLeft ? 'leftLeg' : 'rightLeg';

      // 太もも
      const thighGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.35, 10);
      const legMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
      const thigh = new THREE.Mesh(thighGeo, legMat);
      thigh.position.y = -0.18;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // 膝
      const kneeGeo = new THREE.SphereGeometry(0.1, 10, 10);
      const knee = new THREE.Mesh(kneeGeo, legMat.clone());
      knee.position.y = -0.38;
      legGroup.add(knee);

      // 脛
      const shinGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.3, 10);
      const shin = new THREE.Mesh(shinGeo, legMat.clone());
      shin.position.y = -0.55;
      shin.castShadow = true;
      legGroup.add(shin);

      // 足（大きくて平たい）
      const footGeo = new THREE.BoxGeometry(0.18, 0.1, 0.25);
      const foot = new THREE.Mesh(footGeo, legMat.clone());
      foot.position.set(0, -0.75, 0.05);
      foot.castShadow = true;
      legGroup.add(foot);

      // 爪（3本）
      for (let i = 0; i < 3; i++) {
        const clawGeo = new THREE.ConeGeometry(0.025, 0.08, 6);
        const clawMat = this.materials.standard({ color: palette.horn, roughness: 0.5 });
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set((i - 1) * 0.06, -0.78, 0.18);
        claw.rotation.x = Math.PI / 2;
        legGroup.add(claw);
      }

      const x = isLeft ? -0.2 : 0.2;
      legGroup.position.set(x, 0.55, 0);

      return legGroup;
    };

    group.add(createLeg(true));
    group.add(createLeg(false));

    // 全体を少し小さくする（小型敵キャラ）
    group.scale.set(0.9, 0.9, 0.9);

    group.userData.isBokoblin = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'bokoblin',
      name: 'ボコブリン',
      variant: variant,
      defaultAnimation: 'bokoblinIdle'
    }, this.animations);
  }

  // ==================== リザルフォス（ゼルダ風トカゲ戦士） ====================
  createLizalfos(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'green';
    const group = new THREE.Group();

    // カラーパレット
    const colors = {
      green: { skin: 0x4a7c4e, belly: 0x8fbc8f, accent: 0x2d5a30, eyes: 0xffcc00, crest: 0xff6600 },
      blue: { skin: 0x4a6a8c, belly: 0x87ceeb, accent: 0x2d4a6a, eyes: 0x00ffff, crest: 0x0088ff },
      black: { skin: 0x2a2a3a, belly: 0x4a4a5a, accent: 0x1a1a2a, eyes: 0xff0000, crest: 0x880088 },
      fire: { skin: 0x8c4a2a, belly: 0xdaa520, accent: 0x6a2a1a, eyes: 0xff4400, crest: 0xff0000 }
    };
    const palette = colors[variant] || colors.green;

    // === 胴体 ===
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'body';

    // 胴体（細長くしなやか）
    const torsoGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.9, 12);
    const torsoMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.scale.set(1, 1, 0.8);
    torso.castShadow = true;
    bodyGroup.add(torso);

    // お腹（明るい鱗）
    const bellyGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.75, 12, 1, false, -Math.PI / 2, Math.PI);
    const bellyMat = this.materials.standard({ color: palette.belly, roughness: 0.65 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.z = 0.08;
    belly.scale.set(1, 1, 0.6);
    bodyGroup.add(belly);

    // 背中の棘
    for (let i = 0; i < 5; i++) {
      const spineGeo = new THREE.ConeGeometry(0.04, 0.15 - i * 0.015, 6);
      const spineMat = this.materials.standard({ color: palette.accent, roughness: 0.6 });
      const spine = new THREE.Mesh(spineGeo, spineMat);
      spine.position.set(0, 0.3 - i * 0.15, -0.28);
      spine.rotation.x = -0.3;
      bodyGroup.add(spine);
    }

    // 腰の装備（革ベルト）
    const beltGeo = new THREE.TorusGeometry(0.32, 0.04, 8, 24);
    const beltMat = this.materials.standard({ color: 0x5d4037, roughness: 0.8 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = -0.35;
    belt.rotation.x = Math.PI / 2;
    bodyGroup.add(belt);

    bodyGroup.position.y = 1.4;
    bodyGroup.userData.baseY = 1.4;
    group.add(bodyGroup);

    // === 頭部（トカゲ頭） ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // 頭（細長い）
    const headGeo = new THREE.SphereGeometry(0.28, 24, 24);
    const headMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.scale.set(0.9, 1, 1.3);
    head.castShadow = true;
    headGroup.add(head);

    // 口吻（長いくちばし状の口）
    const snoutGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.35, 12);
    const snoutMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, -0.08, 0.4);
    snout.rotation.x = Math.PI / 2 - 0.2;
    snout.scale.set(1, 0.7, 1);
    headGroup.add(snout);

    // 下顎
    const jawGeo = new THREE.BoxGeometry(0.2, 0.06, 0.25);
    const jawMat = this.materials.standard({ color: palette.belly, roughness: 0.7 });
    const jaw = new THREE.Mesh(jawGeo, jawMat);
    jaw.position.set(0, -0.18, 0.35);
    headGroup.add(jaw);

    // 鼻の穴
    const createNostril = (x) => {
      const nostrilGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const nostrilMat = this.materials.standard({ color: 0x1a1a1a });
      const nostril = new THREE.Mesh(nostrilGeo, nostrilMat);
      nostril.position.set(x, -0.05, 0.58);
      return nostril;
    };
    headGroup.add(createNostril(-0.05));
    headGroup.add(createNostril(0.05));

    // 目（爬虫類の縦長瞳孔）
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      // 眼球
      const eyeGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const eyeMat = this.materials.standard({ color: 0xffffcc, roughness: 0.2 });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.scale.set(1.2, 1, 0.8);
      eyeGroup.add(eye);

      // 虹彩
      const irisGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const irisMat = this.materials.emissive({ color: palette.eyes, intensity: 0.6 });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.05;
      eyeGroup.add(iris);

      // 縦長の瞳孔
      const pupilGeo = new THREE.BoxGeometry(0.015, 0.06, 0.01);
      const pupilMat = this.materials.standard({ color: 0x000000 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.07;
      eyeGroup.add(pupil);

      eyeGroup.position.set(x, 0.08, 0.2);
      eyeGroup.rotation.y = x > 0 ? 0.3 : -0.3;
      return eyeGroup;
    };

    const leftEye = createEye(-0.18);
    leftEye.name = 'leftEye';
    headGroup.add(leftEye);

    const rightEye = createEye(0.18);
    rightEye.name = 'rightEye';
    headGroup.add(rightEye);

    // トサカ（頭の飾り）
    const crestGroup = new THREE.Group();
    crestGroup.name = 'crest';

    for (let i = 0; i < 4; i++) {
      const crestGeo = new THREE.ConeGeometry(0.04, 0.2 + i * 0.05, 6);
      const crestMat = this.materials.standard({ color: palette.crest, roughness: 0.6 });
      const crest = new THREE.Mesh(crestGeo, crestMat);
      crest.position.set(0, 0.22 + i * 0.03, -0.1 - i * 0.08);
      crest.rotation.x = -0.5 - i * 0.1;
      crestGroup.add(crest);
    }
    headGroup.add(crestGroup);

    // 歯
    for (let i = 0; i < 6; i++) {
      const toothGeo = new THREE.ConeGeometry(0.015, 0.05, 6);
      const toothMat = this.materials.standard({ color: 0xffffee, roughness: 0.4 });
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.set((i - 2.5) * 0.05, -0.14, 0.5);
      tooth.rotation.x = Math.PI;
      headGroup.add(tooth);
    }

    // 舌（二股）
    const tongueGroup = new THREE.Group();
    const tongueBaseGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.15, 8);
    const tongueMat = this.materials.standard({ color: 0xff6688, roughness: 0.5 });
    const tongueBase = new THREE.Mesh(tongueBaseGeo, tongueMat);
    tongueBase.rotation.x = Math.PI / 2 - 0.3;
    tongueGroup.add(tongueBase);

    // 二股の先
    const forkGeo = new THREE.ConeGeometry(0.015, 0.08, 6);
    const leftFork = new THREE.Mesh(forkGeo, tongueMat.clone());
    leftFork.position.set(-0.02, -0.02, 0.1);
    leftFork.rotation.x = Math.PI / 2;
    tongueGroup.add(leftFork);
    const rightFork = new THREE.Mesh(forkGeo, tongueMat.clone());
    rightFork.position.set(0.02, -0.02, 0.1);
    rightFork.rotation.x = Math.PI / 2;
    tongueGroup.add(rightFork);

    tongueGroup.position.set(0, -0.15, 0.55);
    tongueGroup.name = 'tongue';
    headGroup.add(tongueGroup);

    headGroup.position.set(0, 2.25, 0.1);
    headGroup.rotation.x = -0.1;
    group.add(headGroup);

    // === 腕 ===
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.name = isLeft ? 'leftArm' : 'rightArm';

      // 上腕
      const upperArmGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 10);
      const armMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
      const upperArm = new THREE.Mesh(upperArmGeo, armMat);
      upperArm.position.y = -0.2;
      upperArm.castShadow = true;
      armGroup.add(upperArm);

      // 肘の棘
      const elbowSpikeGeo = new THREE.ConeGeometry(0.03, 0.1, 6);
      const elbowSpikeMat = this.materials.standard({ color: palette.accent, roughness: 0.6 });
      const elbowSpike = new THREE.Mesh(elbowSpikeGeo, elbowSpikeMat);
      elbowSpike.position.set(isLeft ? -0.1 : 0.1, -0.4, -0.05);
      elbowSpike.rotation.z = isLeft ? -Math.PI / 2 : Math.PI / 2;
      armGroup.add(elbowSpike);

      // 前腕
      const forearmGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.35, 10);
      const forearm = new THREE.Mesh(forearmGeo, armMat.clone());
      forearm.position.y = -0.58;
      forearm.castShadow = true;
      armGroup.add(forearm);

      // 手
      const handGeo = new THREE.SphereGeometry(0.08, 10, 10);
      const hand = new THREE.Mesh(handGeo, armMat.clone());
      hand.position.y = -0.78;
      hand.scale.set(1, 0.7, 0.8);
      armGroup.add(hand);

      // 爪（3本）
      for (let i = 0; i < 3; i++) {
        const clawGeo = new THREE.ConeGeometry(0.02, 0.1, 6);
        const clawMat = this.materials.standard({ color: 0x333333, roughness: 0.4 });
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set((i - 1) * 0.04, -0.88, 0.02);
        claw.rotation.x = 0.4;
        armGroup.add(claw);
      }

      const x = isLeft ? -0.4 : 0.4;
      armGroup.position.set(x, 1.75, 0);
      armGroup.rotation.z = isLeft ? 0.15 : -0.15;

      return armGroup;
    };

    group.add(createArm(true));
    group.add(createArm(false));

    // === 脚 ===
    const createLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      legGroup.name = isLeft ? 'leftLeg' : 'rightLeg';

      // 太もも
      const thighGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.45, 10);
      const legMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
      const thigh = new THREE.Mesh(thighGeo, legMat);
      thigh.position.y = -0.23;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // 膝
      const kneeGeo = new THREE.SphereGeometry(0.1, 10, 10);
      const knee = new THREE.Mesh(kneeGeo, legMat.clone());
      knee.position.y = -0.48;
      legGroup.add(knee);

      // 脛
      const shinGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 10);
      const shin = new THREE.Mesh(shinGeo, legMat.clone());
      shin.position.y = -0.72;
      shin.castShadow = true;
      legGroup.add(shin);

      // 足（爬虫類風、3本爪）
      const footGeo = new THREE.BoxGeometry(0.15, 0.08, 0.3);
      const foot = new THREE.Mesh(footGeo, legMat.clone());
      foot.position.set(0, -0.98, 0.08);
      foot.castShadow = true;
      legGroup.add(foot);

      // 爪
      for (let i = 0; i < 3; i++) {
        const clawGeo = new THREE.ConeGeometry(0.025, 0.12, 6);
        const clawMat = this.materials.standard({ color: 0x333333, roughness: 0.4 });
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set((i - 1) * 0.06, -1.0, 0.25);
        claw.rotation.x = Math.PI / 2;
        legGroup.add(claw);
      }

      const x = isLeft ? -0.2 : 0.2;
      legGroup.position.set(x, 0.95, 0);

      return legGroup;
    };

    group.add(createLeg(true));
    group.add(createLeg(false));

    // === 尻尾（長い） ===
    const tailGroup = new THREE.Group();
    tailGroup.name = 'tail';

    const tailSegments = 10;
    for (let i = 0; i < tailSegments; i++) {
      const t = i / tailSegments;
      const segGeo = new THREE.SphereGeometry(0.12 * (1 - t * 0.7), 10, 10);
      const segMat = this.materials.standard({ color: palette.skin, roughness: 0.7 });
      const seg = new THREE.Mesh(segGeo, segMat);
      seg.position.set(
        0,
        -t * 0.4,
        -0.35 - t * 0.8
      );
      seg.scale.set(0.8, 1, 1.2);
      tailGroup.add(seg);

      // 尻尾の棘（先端に向かって）
      if (i > 3 && i < tailSegments - 1) {
        const tailSpineGeo = new THREE.ConeGeometry(0.025, 0.08, 6);
        const tailSpineMat = this.materials.standard({ color: palette.accent, roughness: 0.6 });
        const tailSpine = new THREE.Mesh(tailSpineGeo, tailSpineMat);
        tailSpine.position.set(0, -t * 0.4 + 0.08, -0.35 - t * 0.8);
        tailSpine.rotation.x = -0.3;
        tailGroup.add(tailSpine);
      }
    }

    // 尻尾の先端
    const tailTipGeo = new THREE.ConeGeometry(0.04, 0.2, 8);
    const tailTipMat = this.materials.standard({ color: palette.crest, roughness: 0.6 });
    const tailTip = new THREE.Mesh(tailTipGeo, tailTipMat);
    tailTip.position.set(0, -0.45, -1.2);
    tailTip.rotation.x = Math.PI / 2 + 0.3;
    tailGroup.add(tailTip);

    tailGroup.position.set(0, 1.2, 0);
    group.add(tailGroup);

    group.userData.isLizalfos = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'lizalfos',
      name: 'リザルフォス',
      variant: variant,
      defaultAnimation: 'lizalfosIdle'
    }, this.animations);
  }

  // ==================== ライネル（ゼルダ風ケンタウロス） ====================
  createLynel(options = {}) {
    const THREE = this.THREE;
    const variant = options.variant || 'red';
    const group = new THREE.Group();

    // カラーパレット
    const colors = {
      red: { fur: 0x8b2500, mane: 0x4a1a00, skin: 0xdaa520, armor: 0x333333, eyes: 0xff4400 },
      blue: { fur: 0x2a4a7a, mane: 0x1a2a4a, skin: 0x87ceeb, armor: 0x444466, eyes: 0x00ccff },
      white: { fur: 0xe8e8e8, mane: 0xc0c0c0, skin: 0xffffff, armor: 0x666688, eyes: 0x88ffff },
      gold: { fur: 0xdaa520, mane: 0x8b6914, skin: 0xffd700, armor: 0x555544, eyes: 0xffff00 }
    };
    const palette = colors[variant] || colors.red;

    // === 馬体（後ろ半分） ===
    const horseBodyGroup = new THREE.Group();
    horseBodyGroup.name = 'horseBody';

    // 胴体（馬の部分）
    const horseTorsoGeo = new THREE.CylinderGeometry(0.5, 0.45, 1.4, 16);
    const furMat = this.materials.standard({ color: palette.fur, roughness: 0.85 });
    const horseTorso = new THREE.Mesh(horseTorsoGeo, furMat);
    horseTorso.rotation.x = Math.PI / 2;
    horseTorso.position.z = -0.5;
    horseTorso.castShadow = true;
    horseBodyGroup.add(horseTorso);

    // 臀部
    const rumpGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const rump = new THREE.Mesh(rumpGeo, furMat.clone());
    rump.position.set(0, 0, -1.1);
    rump.scale.set(1, 0.9, 1.2);
    rump.castShadow = true;
    horseBodyGroup.add(rump);

    // 後ろ脚（2本）
    const createBackLeg = (isLeft) => {
      const legGroup = new THREE.Group();

      // 太もも
      const thighGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.6, 10);
      const thigh = new THREE.Mesh(thighGeo, furMat.clone());
      thigh.position.y = -0.3;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // 膝
      const kneeGeo = new THREE.SphereGeometry(0.12, 10, 10);
      const knee = new THREE.Mesh(kneeGeo, furMat.clone());
      knee.position.y = -0.6;
      legGroup.add(knee);

      // 脛
      const shinGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.55, 10);
      const shin = new THREE.Mesh(shinGeo, furMat.clone());
      shin.position.y = -0.9;
      shin.castShadow = true;
      legGroup.add(shin);

      // 蹄
      const hoofGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.15, 10);
      const hoofMat = this.materials.standard({ color: 0x2a2a2a, roughness: 0.5 });
      const hoof = new THREE.Mesh(hoofGeo, hoofMat);
      hoof.position.y = -1.25;
      hoof.castShadow = true;
      legGroup.add(hoof);

      legGroup.position.set(isLeft ? -0.3 : 0.3, 0, -1.2);
      return legGroup;
    };

    horseBodyGroup.add(createBackLeg(true));
    horseBodyGroup.add(createBackLeg(false));

    // 前脚（2本）
    const createFrontLeg = (isLeft) => {
      const legGroup = new THREE.Group();

      // 太もも
      const thighGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.55, 10);
      const thigh = new THREE.Mesh(thighGeo, furMat.clone());
      thigh.position.y = -0.28;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // 膝
      const kneeGeo = new THREE.SphereGeometry(0.11, 10, 10);
      const knee = new THREE.Mesh(kneeGeo, furMat.clone());
      knee.position.y = -0.55;
      legGroup.add(knee);

      // 脛
      const shinGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.5, 10);
      const shin = new THREE.Mesh(shinGeo, furMat.clone());
      shin.position.y = -0.83;
      shin.castShadow = true;
      legGroup.add(shin);

      // 蹄
      const hoofGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.14, 10);
      const hoofMat = this.materials.standard({ color: 0x2a2a2a, roughness: 0.5 });
      const hoof = new THREE.Mesh(hoofGeo, hoofMat);
      hoof.position.y = -1.15;
      hoof.castShadow = true;
      legGroup.add(hoof);

      legGroup.position.set(isLeft ? -0.28 : 0.28, 0, 0.2);
      return legGroup;
    };

    horseBodyGroup.add(createFrontLeg(true));
    horseBodyGroup.add(createFrontLeg(false));

    // 尻尾
    const tailGroup = new THREE.Group();
    const tailSegments = 8;
    for (let i = 0; i < tailSegments; i++) {
      const t = i / tailSegments;
      const tailGeo = new THREE.SphereGeometry(0.08 * (1 - t * 0.5), 8, 8);
      const tailMat = this.materials.standard({ color: palette.mane, roughness: 0.9 });
      const tail = new THREE.Mesh(tailGeo, tailMat);
      tail.position.set(0, -t * 0.6, -1.5 - t * 0.3);
      tailGroup.add(tail);
    }
    horseBodyGroup.add(tailGroup);

    horseBodyGroup.position.y = 1.3;
    group.add(horseBodyGroup);

    // === 人体（上半身） ===
    const upperBodyGroup = new THREE.Group();
    upperBodyGroup.name = 'upperBody';

    // 胴体（筋肉質）
    const torsoGeo = new THREE.CylinderGeometry(0.45, 0.5, 1.0, 16);
    const skinMat = this.materials.standard({ color: palette.skin, roughness: 0.75 });
    const torso = new THREE.Mesh(torsoGeo, skinMat);
    torso.castShadow = true;
    upperBodyGroup.add(torso);

    // 胸筋
    const createPec = (x) => {
      const pecGeo = new THREE.SphereGeometry(0.2, 12, 12);
      const pec = new THREE.Mesh(pecGeo, skinMat.clone());
      pec.position.set(x, 0.15, 0.3);
      pec.scale.set(1, 0.8, 0.6);
      return pec;
    };
    upperBodyGroup.add(createPec(-0.15));
    upperBodyGroup.add(createPec(0.15));

    // 腹筋の線
    for (let i = 0; i < 3; i++) {
      const absGeo = new THREE.BoxGeometry(0.3, 0.12, 0.05);
      const absMat = this.materials.standard({ color: palette.skin, roughness: 0.8 });
      const abs = new THREE.Mesh(absGeo, absMat);
      abs.position.set(0, -0.1 - i * 0.15, 0.4);
      upperBodyGroup.add(abs);
    }

    // 肩鎧
    const createShoulderArmor = (isLeft) => {
      const armorGeo = new THREE.SphereGeometry(0.22, 12, 12);
      const armorMat = this.materials.metal({ color: palette.armor, roughness: 0.4, metalness: 0.7 });
      const armor = new THREE.Mesh(armorGeo, armorMat);
      armor.position.set(isLeft ? -0.55 : 0.55, 0.35, 0);
      armor.scale.set(1.2, 1, 1);
      armor.castShadow = true;
      return armor;
    };
    upperBodyGroup.add(createShoulderArmor(true));
    upperBodyGroup.add(createShoulderArmor(false));

    upperBodyGroup.position.set(0, 1.8, 0.3);
    group.add(upperBodyGroup);

    // === 頭部（ライオン風） ===
    const headGroup = new THREE.Group();
    headGroup.name = 'head';

    // 頭
    const headGeo = new THREE.SphereGeometry(0.35, 24, 24);
    const headMat = this.materials.standard({ color: palette.fur, roughness: 0.85 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.scale.set(1, 1.1, 1.2);
    head.castShadow = true;
    headGroup.add(head);

    // 口吻
    const snoutGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.25, 12);
    const snout = new THREE.Mesh(snoutGeo, headMat.clone());
    snout.position.set(0, -0.1, 0.35);
    snout.rotation.x = Math.PI / 2 - 0.2;
    headGroup.add(snout);

    // 鼻
    const noseGeo = new THREE.SphereGeometry(0.08, 10, 10);
    const noseMat = this.materials.standard({ color: 0x1a1a1a, roughness: 0.3 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.05, 0.5);
    headGroup.add(nose);

    // 目（威圧的な目）
    const createEye = (x) => {
      const eyeGroup = new THREE.Group();

      const whiteGeo = new THREE.SphereGeometry(0.07, 12, 12);
      const whiteMat = this.materials.standard({ color: 0xffffcc, roughness: 0.2 });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      white.scale.set(1.2, 0.9, 0.6);
      eyeGroup.add(white);

      const pupilGeo = new THREE.SphereGeometry(0.04, 10, 10);
      const pupilMat = this.materials.emissive({ color: palette.eyes, intensity: 1.0 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.04;
      pupil.name = 'pupil';
      eyeGroup.add(pupil);

      eyeGroup.position.set(x, 0.1, 0.28);
      return eyeGroup;
    };

    const leftEye = createEye(-0.14);
    leftEye.name = 'leftEye';
    headGroup.add(leftEye);

    const rightEye = createEye(0.14);
    rightEye.name = 'rightEye';
    headGroup.add(rightEye);

    // たてがみ
    const maneGroup = new THREE.Group();
    maneGroup.name = 'mane';

    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const maneGeo = new THREE.ConeGeometry(0.08, 0.3 + Math.random() * 0.15, 6);
      const maneMat = this.materials.standard({ color: palette.mane, roughness: 0.95 });
      const mane = new THREE.Mesh(maneGeo, maneMat);
      mane.position.set(
        Math.sin(angle) * 0.35,
        0.1 + Math.cos(angle) * 0.1,
        Math.cos(angle) * 0.25 - 0.15
      );
      mane.rotation.x = -0.5 + Math.cos(angle) * 0.3;
      mane.rotation.z = Math.sin(angle) * 0.4;
      maneGroup.add(mane);
    }
    headGroup.add(maneGroup);

    // 角（大きな曲がった角）
    const createHorn = (isLeft) => {
      const hornGroup = new THREE.Group();

      const segments = 6;
      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const hornGeo = new THREE.CylinderGeometry(
          0.06 * (1 - t * 0.6),
          0.07 * (1 - t * 0.5),
          0.15,
          8
        );
        const hornMat = this.materials.standard({ color: 0x3a3a3a, roughness: 0.4 });
        const horn = new THREE.Mesh(hornGeo, hornMat);
        horn.position.set(
          (isLeft ? -1 : 1) * (0.1 + t * 0.15),
          0.4 + t * 0.2,
          -t * 0.2
        );
        horn.rotation.z = (isLeft ? 1 : -1) * (0.3 + t * 0.4);
        horn.rotation.x = -0.2 - t * 0.3;
        hornGroup.add(horn);
      }

      hornGroup.position.x = isLeft ? -0.2 : 0.2;
      return hornGroup;
    };

    headGroup.add(createHorn(true));
    headGroup.add(createHorn(false));

    // 耳
    const createEar = (isLeft) => {
      const earGeo = new THREE.ConeGeometry(0.08, 0.15, 8);
      const earMat = this.materials.standard({ color: palette.fur, roughness: 0.85 });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(isLeft ? -0.3 : 0.3, 0.25, 0);
      ear.rotation.z = isLeft ? 0.5 : -0.5;
      return ear;
    };
    headGroup.add(createEar(true));
    headGroup.add(createEar(false));

    // 牙
    const createFang = (x) => {
      const fangGeo = new THREE.ConeGeometry(0.03, 0.12, 6);
      const fangMat = this.materials.standard({ color: 0xffffee, roughness: 0.3 });
      const fang = new THREE.Mesh(fangGeo, fangMat);
      fang.position.set(x, -0.22, 0.4);
      fang.rotation.x = Math.PI;
      return fang;
    };
    headGroup.add(createFang(-0.08));
    headGroup.add(createFang(0.08));

    headGroup.position.set(0, 2.9, 0.3);
    group.add(headGroup);

    // === 腕 ===
    const createArm = (isLeft) => {
      const armGroup = new THREE.Group();
      armGroup.name = isLeft ? 'leftArm' : 'rightArm';

      // 上腕（筋肉質）
      const upperArmGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.5, 12);
      const upperArm = new THREE.Mesh(upperArmGeo, skinMat.clone());
      upperArm.position.y = -0.25;
      upperArm.castShadow = true;
      armGroup.add(upperArm);

      // 二頭筋
      const bicepGeo = new THREE.SphereGeometry(0.1, 10, 10);
      const bicep = new THREE.Mesh(bicepGeo, skinMat.clone());
      bicep.position.set(isLeft ? 0.08 : -0.08, -0.15, 0.05);
      bicep.scale.set(0.8, 1.2, 0.8);
      armGroup.add(bicep);

      // 肘
      const elbowGeo = new THREE.SphereGeometry(0.1, 10, 10);
      const elbow = new THREE.Mesh(elbowGeo, skinMat.clone());
      elbow.position.y = -0.52;
      armGroup.add(elbow);

      // 前腕装甲
      const forearmGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.45, 12);
      const armorMat = this.materials.metal({ color: palette.armor, roughness: 0.4, metalness: 0.7 });
      const forearm = new THREE.Mesh(forearmGeo, armorMat);
      forearm.position.y = -0.78;
      forearm.castShadow = true;
      armGroup.add(forearm);

      // 手
      const handGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const hand = new THREE.Mesh(handGeo, skinMat.clone());
      hand.position.y = -1.05;
      hand.scale.set(1, 0.8, 0.7);
      armGroup.add(hand);

      // 爪
      for (let i = 0; i < 4; i++) {
        const clawGeo = new THREE.ConeGeometry(0.02, 0.1, 6);
        const clawMat = this.materials.standard({ color: 0x2a2a2a, roughness: 0.4 });
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set((i - 1.5) * 0.04, -1.15, 0.04);
        claw.rotation.x = 0.4;
        armGroup.add(claw);
      }

      const x = isLeft ? -0.6 : 0.6;
      armGroup.position.set(x, 2.2, 0.3);
      armGroup.rotation.z = isLeft ? 0.1 : -0.1;

      return armGroup;
    };

    group.add(createArm(true));
    group.add(createArm(false));

    // 全体を大きくする（ボスキャラ）
    group.scale.set(1.3, 1.3, 1.3);

    group.userData.isLynel = true;
    group.userData.variant = variant;

    return new Model3D(group, {
      id: 'lynel',
      name: 'ライネル',
      variant: variant,
      defaultAnimation: 'lynelIdle'
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
