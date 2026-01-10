import * as THREE from 'three';

// ============================================
// 逃走サバイバル - 3D Chase Game
// ============================================

// ゲーム設定
const CONFIG = {
  easy: {
    hunterSpeed: 3.5,
    hunterAddInterval: 45,
    maxHunters: 4,
    moneyPerSecond: 1000,
    itemSpawnRate: 8,
  },
  normal: {
    hunterSpeed: 4.5,
    hunterAddInterval: 30,
    maxHunters: 6,
    moneyPerSecond: 2000,
    itemSpawnRate: 10,
  },
  hard: {
    hunterSpeed: 5.5,
    hunterAddInterval: 20,
    maxHunters: 10,
    moneyPerSecond: 5000,
    itemSpawnRate: 12,
  },
};

const FIELD_SIZE = 100;
const PLAYER_SPEED = 6;
const DASH_SPEED = 12;
const DASH_DURATION = 1.5;
const DASH_COOLDOWN = 5;

// ゲーム状態
let gameState = {
  isPlaying: false,
  isPaused: false,
  difficulty: 'easy',
  time: 0,
  money: 0,
  distance: 0,
  itemsCollected: 0,
  hunterCount: 1,
  nextHunterTime: 30,
};

// Three.js コンポーネント
let scene, camera, renderer;
let player, playerMesh;
let hunters = [];
let obstacles = [];
let items = [];
let ground;

// 入力状態
const input = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  dash: false,
  joystickX: 0,
  joystickY: 0,
};

// プレイヤー状態
let playerState = {
  velocity: new THREE.Vector3(),
  rotation: 0,
  isDashing: false,
  dashCooldown: 0,
  effects: {
    speed: 0,
    shield: 0,
    invisible: 0,
    freeze: 0,
  },
};

// オーディオコンテキスト
let audioCtx = null;

// DOM要素
const elements = {};

// ============================================
// 初期化
// ============================================

function init() {
  // DOM要素を取得
  cacheElements();

  // Three.js初期化
  initThree();

  // イベントリスナー設定
  setupEventListeners();

  // ゲームループ開始
  animate();
}

function cacheElements() {
  elements.canvasContainer = document.getElementById('canvas-container');
  elements.hud = document.getElementById('hud');
  elements.minimap = document.getElementById('minimap');
  elements.minimapCanvas = document.getElementById('minimap-canvas');
  elements.controls = document.getElementById('controls');
  elements.joystickStick = document.getElementById('joystick-stick');
  elements.dashBtn = document.getElementById('dash-btn');
  elements.moneyDisplay = document.getElementById('money-display');
  elements.hunterCount = document.getElementById('hunter-count');
  elements.timeDisplay = document.getElementById('time-display');
  elements.nextHunter = document.getElementById('next-hunter');
  elements.dashStatus = document.getElementById('dash-status');
  elements.activeEffects = document.getElementById('active-effects');
  elements.warningFlash = document.getElementById('warning-flash');
  elements.itemPopup = document.getElementById('item-popup');
  elements.hunterWarning = document.getElementById('hunter-warning');
  elements.titleScreen = document.getElementById('title-screen');
  elements.gameoverScreen = document.getElementById('gameover-screen');
  elements.pauseScreen = document.getElementById('pause-screen');
  elements.startBtn = document.getElementById('start-btn');
  elements.retryBtn = document.getElementById('retry-btn');
  elements.titleBtn = document.getElementById('title-btn');
  elements.resumeBtn = document.getElementById('resume-btn');
  elements.pauseTitleBtn = document.getElementById('pause-title-btn');
  elements.keyboardHint = document.getElementById('keyboard-hint');
}

function initThree() {
  // シーン
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 30, 80);

  // カメラ（3人称視点）
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 15, 20);
  camera.lookAt(0, 0, 0);

  // レンダラー
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  elements.canvasContainer.appendChild(renderer.domElement);

  // ライティング
  setupLighting();

  // グラウンド
  createGround();

  // ウィンドウリサイズ対応
  window.addEventListener('resize', onWindowResize);
}

function setupLighting() {
  // 環境光
  const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
  scene.add(ambientLight);

  // メインライト
  const mainLight = new THREE.DirectionalLight(0xffffff, 1);
  mainLight.position.set(30, 50, 30);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 1;
  mainLight.shadow.camera.far = 150;
  mainLight.shadow.camera.left = -60;
  mainLight.shadow.camera.right = 60;
  mainLight.shadow.camera.top = 60;
  mainLight.shadow.camera.bottom = -60;
  scene.add(mainLight);

  // 補助ライト
  const fillLight = new THREE.DirectionalLight(0x8080ff, 0.3);
  fillLight.position.set(-20, 20, -20);
  scene.add(fillLight);

  // スポットライト（演出用）
  const spotLight = new THREE.SpotLight(0xff8800, 0.5);
  spotLight.position.set(0, 40, 0);
  spotLight.angle = Math.PI / 4;
  spotLight.penumbra = 0.5;
  scene.add(spotLight);
}

function createGround() {
  // グラウンドのグリッドテクスチャを作成
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // ベースカラー
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(0, 0, 512, 512);

  // グリッドライン
  ctx.strokeStyle = '#3d4446';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 16; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 32, 0);
    ctx.lineTo(i * 32, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * 32);
    ctx.lineTo(512, i * 32);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(FIELD_SIZE / 10, FIELD_SIZE / 10);

  const groundGeometry = new THREE.PlaneGeometry(FIELD_SIZE, FIELD_SIZE);
  const groundMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    metalness: 0.1,
  });

  ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // フィールド境界の壁
  createFieldBoundaries();
}

function createFieldBoundaries() {
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a90d9,
    emissive: 0x1a3050,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.7,
  });

  const wallHeight = 5;
  const wallGeometry = new THREE.BoxGeometry(FIELD_SIZE, wallHeight, 0.5);

  // 4辺の壁
  const walls = [
    { pos: [0, wallHeight / 2, -FIELD_SIZE / 2], rot: 0 },
    { pos: [0, wallHeight / 2, FIELD_SIZE / 2], rot: 0 },
    { pos: [-FIELD_SIZE / 2, wallHeight / 2, 0], rot: Math.PI / 2 },
    { pos: [FIELD_SIZE / 2, wallHeight / 2, 0], rot: Math.PI / 2 },
  ];

  walls.forEach(({ pos, rot }) => {
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(...pos);
    wall.rotation.y = rot;
    scene.add(wall);
  });
}

// ============================================
// プレイヤー
// ============================================

function createPlayer() {
  // プレイヤーのボディ（球体）
  const bodyGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00aa44,
    emissiveIntensity: 0.3,
    metalness: 0.3,
    roughness: 0.5,
  });

  playerMesh = new THREE.Group();

  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.5;
  body.castShadow = true;
  playerMesh.add(body);

  // 顔の表現（目）
  const eyeGeometry = new THREE.SphereGeometry(0.1, 16, 16);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

  [-0.2, 0.2].forEach(x => {
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(x, 0.6, 0.4);
    eye.scale.set(1, 1.2, 0.5);
    playerMesh.add(eye);

    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      pupilMaterial
    );
    pupil.position.set(x, 0.6, 0.47);
    playerMesh.add(pupil);
  });

  // 発光リング（演出）
  const ringGeometry = new THREE.TorusGeometry(0.7, 0.05, 8, 32);
  const ringMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ffaa,
    emissive: 0x00ff88,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.6,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  playerMesh.add(ring);

  playerMesh.position.set(0, 0, 0);
  scene.add(playerMesh);

  player = {
    mesh: playerMesh,
    position: playerMesh.position,
    radius: 0.5,
  };
}

// ============================================
// ハンター
// ============================================

function createHunter(x, z) {
  const hunterGroup = new THREE.Group();

  // ボディ（黒いカプセル形状）
  const bodyGeometry = new THREE.CapsuleGeometry(0.4, 0.8, 16, 32);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    emissive: 0xff0000,
    emissiveIntensity: 0.2,
    metalness: 0.5,
    roughness: 0.3,
  });

  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.8;
  body.castShadow = true;
  hunterGroup.add(body);

  // 赤い目（威圧感）
  const eyeGeometry = new THREE.SphereGeometry(0.12, 16, 16);
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 1,
  });

  [-0.15, 0.15].forEach(offsetX => {
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.position.set(offsetX, 1.0, 0.35);
    hunterGroup.add(eye);
  });

  // サングラス風の装飾
  const glassGeometry = new THREE.BoxGeometry(0.5, 0.15, 0.05);
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    metalness: 0.9,
    roughness: 0.1,
  });
  const glass = new THREE.Mesh(glassGeometry, glassMaterial);
  glass.position.set(0, 1.0, 0.4);
  hunterGroup.add(glass);

  // 危険オーラ
  const auraGeometry = new THREE.RingGeometry(0.6, 0.8, 32);
  const auraMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const aura = new THREE.Mesh(auraGeometry, auraMaterial);
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.05;
  hunterGroup.add(aura);

  hunterGroup.position.set(x, 0, z);
  scene.add(hunterGroup);

  return {
    mesh: hunterGroup,
    position: hunterGroup.position,
    velocity: new THREE.Vector3(),
    radius: 0.4,
    aura: aura,
    targetPosition: new THREE.Vector3(x, 0, z),
    state: 'patrol', // 'patrol', 'chase', 'frozen'
    frozenTime: 0,
  };
}

function updateHunters(delta) {
  const config = CONFIG[gameState.difficulty];

  hunters.forEach(hunter => {
    // 凍結状態のチェック
    if (hunter.frozenTime > 0) {
      hunter.frozenTime -= delta;
      hunter.mesh.children[0].material.emissive.setHex(0x00aaff);
      return;
    }
    hunter.mesh.children[0].material.emissive.setHex(0xff0000);

    // プレイヤーが透明なら追跡しない
    if (playerState.effects.invisible > 0) {
      hunter.state = 'patrol';
    } else {
      // プレイヤーとの距離をチェック
      const distToPlayer = hunter.position.distanceTo(player.position);
      if (distToPlayer < 30) {
        hunter.state = 'chase';
      } else {
        hunter.state = 'patrol';
      }
    }

    let targetPos;
    let speed = config.hunterSpeed;

    if (hunter.state === 'chase') {
      // プレイヤーを追跡
      targetPos = player.position.clone();

      // 近づくと加速
      const distToPlayer = hunter.position.distanceTo(player.position);
      if (distToPlayer < 10) {
        speed *= 1.2;
      }
    } else {
      // パトロール（ランダムに移動）
      if (hunter.position.distanceTo(hunter.targetPosition) < 2) {
        hunter.targetPosition = new THREE.Vector3(
          (Math.random() - 0.5) * (FIELD_SIZE - 10),
          0,
          (Math.random() - 0.5) * (FIELD_SIZE - 10)
        );
      }
      targetPos = hunter.targetPosition;
      speed *= 0.6;
    }

    // 移動方向を計算
    const direction = new THREE.Vector3()
      .subVectors(targetPos, hunter.position)
      .normalize();

    // 障害物回避
    const avoidance = calculateObstacleAvoidance(hunter.position, direction, 3);
    direction.add(avoidance).normalize();

    // 移動
    hunter.velocity.lerp(direction.multiplyScalar(speed), 0.1);
    hunter.position.add(hunter.velocity.clone().multiplyScalar(delta));

    // フィールド境界内に制限
    hunter.position.x = Math.max(-FIELD_SIZE / 2 + 2, Math.min(FIELD_SIZE / 2 - 2, hunter.position.x));
    hunter.position.z = Math.max(-FIELD_SIZE / 2 + 2, Math.min(FIELD_SIZE / 2 - 2, hunter.position.z));

    // 向きを更新
    if (hunter.velocity.length() > 0.1) {
      hunter.mesh.rotation.y = Math.atan2(hunter.velocity.x, hunter.velocity.z);
    }

    // オーラのアニメーション
    hunter.aura.rotation.z += delta * 2;
    hunter.aura.material.opacity = 0.2 + Math.sin(Date.now() * 0.005) * 0.1;
  });
}

function calculateObstacleAvoidance(position, direction, lookAhead) {
  const avoidance = new THREE.Vector3();

  obstacles.forEach(obstacle => {
    const toObstacle = new THREE.Vector3().subVectors(obstacle.position, position);
    const distance = toObstacle.length();

    if (distance < lookAhead + obstacle.radius) {
      // 障害物から離れる方向
      const away = toObstacle.normalize().multiplyScalar(-1);
      const strength = 1 - distance / (lookAhead + obstacle.radius);
      avoidance.add(away.multiplyScalar(strength * 2));
    }
  });

  return avoidance;
}

function checkHunterCollision() {
  if (playerState.effects.shield > 0) return false;

  for (const hunter of hunters) {
    if (hunter.frozenTime > 0) continue;

    const distance = player.position.distanceTo(hunter.position);
    if (distance < player.radius + hunter.radius + 0.3) {
      return true;
    }
  }
  return false;
}

// ============================================
// 障害物
// ============================================

function createObstacles() {
  obstacles = [];

  // ビルディング
  const buildingPositions = [
    { x: -20, z: -20, w: 8, h: 12, d: 8, color: 0x4a5568 },
    { x: 20, z: -25, w: 10, h: 15, d: 6, color: 0x2d3748 },
    { x: -25, z: 20, w: 6, h: 10, d: 10, color: 0x4a5568 },
    { x: 25, z: 25, w: 8, h: 8, d: 8, color: 0x2d3748 },
    { x: 0, z: -30, w: 12, h: 6, d: 6, color: 0x4a5568 },
    { x: -30, z: 0, w: 6, h: 14, d: 6, color: 0x2d3748 },
    { x: 30, z: 5, w: 8, h: 10, d: 8, color: 0x4a5568 },
    { x: 15, z: -10, w: 5, h: 8, d: 5, color: 0x2d3748 },
    { x: -15, z: 10, w: 6, h: 6, d: 6, color: 0x4a5568 },
    { x: 10, z: 30, w: 10, h: 12, d: 8, color: 0x2d3748 },
  ];

  buildingPositions.forEach(({ x, z, w, h, d, color }) => {
    createBuilding(x, z, w, h, d, color);
  });

  // 木（円柱）
  const treePositions = [
    { x: -10, z: -35 },
    { x: 35, z: -15 },
    { x: -35, z: 15 },
    { x: 5, z: 15 },
    { x: -8, z: -8 },
    { x: 12, z: 8 },
    { x: -18, z: 35 },
    { x: 38, z: 35 },
  ];

  treePositions.forEach(({ x, z }) => {
    createTree(x, z);
  });

  // コンテナ/ボックス
  const boxPositions = [
    { x: 5, z: -20 },
    { x: -12, z: -25 },
    { x: 18, z: 18 },
    { x: -28, z: -10 },
    { x: 35, z: -35 },
    { x: -35, z: -35 },
  ];

  boxPositions.forEach(({ x, z }) => {
    createBox(x, z);
  });
}

function createBuilding(x, z, width, height, depth, color) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.8,
    metalness: 0.2,
  });

  const building = new THREE.Mesh(geometry, material);
  building.position.set(x, height / 2, z);
  building.castShadow = true;
  building.receiveShadow = true;
  scene.add(building);

  // 窓の追加
  addWindowsToBuilding(building, width, height, depth);

  obstacles.push({
    mesh: building,
    position: building.position,
    radius: Math.max(width, depth) / 2 + 0.5,
    width: width,
    depth: depth,
    type: 'building',
  });
}

function addWindowsToBuilding(building, width, height, depth) {
  const windowGeometry = new THREE.PlaneGeometry(1, 1.5);
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff88,
    emissive: 0xffff44,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.8,
  });

  // 各面に窓を配置
  const faces = [
    { axis: 'z', sign: 1, rot: 0 },
    { axis: 'z', sign: -1, rot: Math.PI },
    { axis: 'x', sign: 1, rot: Math.PI / 2 },
    { axis: 'x', sign: -1, rot: -Math.PI / 2 },
  ];

  faces.forEach(({ axis, sign, rot }) => {
    const faceWidth = axis === 'z' ? width : depth;
    const windowsPerRow = Math.floor((faceWidth - 2) / 2.5);
    const windowsPerCol = Math.floor((height - 2) / 3);

    for (let row = 0; row < windowsPerCol; row++) {
      for (let col = 0; col < windowsPerRow; col++) {
        const win = new THREE.Mesh(windowGeometry, windowMaterial.clone());

        const xOffset = (col - (windowsPerRow - 1) / 2) * 2.5;
        const yOffset = (row - (windowsPerCol - 1) / 2) * 3;

        if (axis === 'z') {
          win.position.set(
            building.position.x + xOffset,
            building.position.y + yOffset,
            building.position.z + sign * (depth / 2 + 0.01)
          );
        } else {
          win.position.set(
            building.position.x + sign * (width / 2 + 0.01),
            building.position.y + yOffset,
            building.position.z + xOffset
          );
        }
        win.rotation.y = rot;

        // ランダムに点灯/消灯
        if (Math.random() > 0.3) {
          win.material.emissiveIntensity = 0.3 + Math.random() * 0.5;
        } else {
          win.material.emissiveIntensity = 0;
          win.material.color.setHex(0x333333);
        }

        scene.add(win);
      }
    }
  });
}

function createTree(x, z) {
  const treeGroup = new THREE.Group();

  // 幹
  const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 8);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.9,
  });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.y = 1.5;
  trunk.castShadow = true;
  treeGroup.add(trunk);

  // 葉（複数の球体）
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x228b22,
    roughness: 0.8,
  });

  const leafPositions = [
    { y: 3.5, scale: 1.5 },
    { y: 4.5, scale: 1.2 },
    { y: 5.3, scale: 0.8 },
  ];

  leafPositions.forEach(({ y, scale }) => {
    const leafGeometry = new THREE.SphereGeometry(scale, 8, 8);
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf.position.y = y;
    leaf.castShadow = true;
    treeGroup.add(leaf);
  });

  treeGroup.position.set(x, 0, z);
  scene.add(treeGroup);

  obstacles.push({
    mesh: treeGroup,
    position: treeGroup.position,
    radius: 1.5,
    type: 'tree',
  });
}

function createBox(x, z) {
  const width = 2 + Math.random() * 2;
  const height = 1.5 + Math.random() * 1.5;
  const depth = 2 + Math.random() * 2;

  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color: 0xcd853f,
    roughness: 0.7,
  });

  const box = new THREE.Mesh(geometry, material);
  box.position.set(x, height / 2, z);
  box.rotation.y = Math.random() * Math.PI;
  box.castShadow = true;
  box.receiveShadow = true;
  scene.add(box);

  obstacles.push({
    mesh: box,
    position: box.position,
    radius: Math.max(width, depth) / 2 + 0.3,
    type: 'box',
  });
}

// ============================================
// アイテム
// ============================================

const ITEM_TYPES = [
  { type: 'speed', color: 0x00d4ff, emoji: '⚡', name: 'スピードアップ', duration: 5 },
  { type: 'shield', color: 0xffd700, emoji: '🛡️', name: 'シールド', duration: 5 },
  { type: 'invisible', color: 0xcccccc, emoji: '👻', name: '透明化', duration: 4 },
  { type: 'freeze', color: 0x88ccff, emoji: '❄️', name: 'ハンター凍結', duration: 3 },
  { type: 'money', color: 0x00ff00, emoji: '💰', name: 'ボーナス', duration: 0 },
];

function createItem() {
  const itemType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];

  // ランダムな位置（障害物から離れた場所）
  let x, z;
  let attempts = 0;
  do {
    x = (Math.random() - 0.5) * (FIELD_SIZE - 10);
    z = (Math.random() - 0.5) * (FIELD_SIZE - 10);
    attempts++;
  } while (isNearObstacle(x, z, 3) && attempts < 50);

  const itemGroup = new THREE.Group();

  // アイテム本体（輝く球体）
  const geometry = new THREE.OctahedronGeometry(0.5, 0);
  const material = new THREE.MeshStandardMaterial({
    color: itemType.color,
    emissive: itemType.color,
    emissiveIntensity: 0.6,
    metalness: 0.8,
    roughness: 0.2,
  });

  const itemMesh = new THREE.Mesh(geometry, material);
  itemMesh.position.y = 1;
  itemMesh.castShadow = true;
  itemGroup.add(itemMesh);

  // 光のリング
  const ringGeometry = new THREE.TorusGeometry(0.8, 0.05, 8, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: itemType.color,
    transparent: true,
    opacity: 0.5,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  itemGroup.add(ring);

  // 上向きの光柱
  const pillarGeometry = new THREE.CylinderGeometry(0.1, 0.3, 3, 8);
  const pillarMaterial = new THREE.MeshBasicMaterial({
    color: itemType.color,
    transparent: true,
    opacity: 0.2,
  });
  const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
  pillar.position.y = 2.5;
  itemGroup.add(pillar);

  itemGroup.position.set(x, 0, z);
  scene.add(itemGroup);

  items.push({
    mesh: itemGroup,
    position: itemGroup.position,
    type: itemType.type,
    name: itemType.name,
    duration: itemType.duration,
    emoji: itemType.emoji,
    radius: 1,
    rotationSpeed: 2 + Math.random(),
  });
}

function isNearObstacle(x, z, minDist) {
  const pos = new THREE.Vector3(x, 0, z);
  for (const obstacle of obstacles) {
    if (pos.distanceTo(obstacle.position) < minDist + obstacle.radius) {
      return true;
    }
  }
  return false;
}

function updateItems(delta) {
  items.forEach((item, index) => {
    // 回転アニメーション
    item.mesh.children[0].rotation.y += delta * item.rotationSpeed;
    item.mesh.children[1].rotation.z += delta;

    // 上下に浮遊
    item.mesh.children[0].position.y = 1 + Math.sin(Date.now() * 0.003) * 0.2;

    // プレイヤーとの衝突判定
    const distance = player.position.distanceTo(item.position);
    if (distance < player.radius + item.radius) {
      collectItem(item, index);
    }
  });
}

function collectItem(item, index) {
  // エフェクトを適用
  switch (item.type) {
    case 'speed':
      playerState.effects.speed = item.duration;
      break;
    case 'shield':
      playerState.effects.shield = item.duration;
      break;
    case 'invisible':
      playerState.effects.invisible = item.duration;
      applyInvisibility(true);
      break;
    case 'freeze':
      hunters.forEach(hunter => {
        hunter.frozenTime = item.duration;
      });
      break;
    case 'money':
      gameState.money += 10000;
      break;
  }

  gameState.itemsCollected++;

  // ポップアップ表示
  showItemPopup(`${item.emoji} ${item.name}`);

  // 効果音
  playSound('item');

  // アイテムを削除
  scene.remove(item.mesh);
  items.splice(index, 1);

  // エフェクト表示を更新
  updateActiveEffects();
}

function applyInvisibility(isInvisible) {
  if (isInvisible) {
    playerMesh.traverse(child => {
      if (child.material) {
        child.material.transparent = true;
        child.material.opacity = 0.3;
      }
    });
  } else {
    playerMesh.traverse(child => {
      if (child.material) {
        child.material.transparent = false;
        child.material.opacity = 1;
      }
    });
  }
}

// ============================================
// 入力処理
// ============================================

function setupEventListeners() {
  // 難易度選択
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      gameState.difficulty = btn.dataset.difficulty;
    });
  });

  // ゲーム開始
  elements.startBtn.addEventListener('click', startGame);
  elements.retryBtn.addEventListener('click', startGame);
  elements.titleBtn.addEventListener('click', showTitleScreen);
  elements.pauseTitleBtn.addEventListener('click', showTitleScreen);
  elements.resumeBtn.addEventListener('click', resumeGame);

  // キーボード入力
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // タッチ操作（ジョイスティック）
  setupJoystick();

  // ダッシュボタン
  elements.dashBtn.addEventListener('pointerdown', () => {
    if (!playerState.isDashing && playerState.dashCooldown <= 0) {
      activateDash();
    }
  });

  // ESCキーで一時停止
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameState.isPlaying) {
      if (gameState.isPaused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
  });
}

function onKeyDown(e) {
  if (!gameState.isPlaying || gameState.isPaused) return;

  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      input.forward = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      input.backward = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      input.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      input.right = true;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      if (!playerState.isDashing && playerState.dashCooldown <= 0) {
        activateDash();
      }
      break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      input.forward = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      input.backward = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      input.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      input.right = false;
      break;
  }
}

function setupJoystick() {
  const joystickZone = document.getElementById('joystick-zone');
  const joystickStick = elements.joystickStick;
  let isJoystickActive = false;
  let joystickCenter = { x: 0, y: 0 };

  joystickZone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    isJoystickActive = true;
    const rect = joystickZone.getBoundingClientRect();
    joystickCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    joystickZone.setPointerCapture(e.pointerId);
  });

  joystickZone.addEventListener('pointermove', (e) => {
    if (!isJoystickActive) return;
    e.preventDefault();

    const rect = joystickZone.getBoundingClientRect();
    const maxDist = rect.width / 2 - 30;

    let dx = e.clientX - joystickCenter.x;
    let dy = e.clientY - joystickCenter.y;

    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    joystickStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    input.joystickX = dx / maxDist;
    input.joystickY = -dy / maxDist;
  });

  const endJoystick = () => {
    isJoystickActive = false;
    joystickStick.style.transform = 'translate(-50%, -50%)';
    input.joystickX = 0;
    input.joystickY = 0;
  };

  joystickZone.addEventListener('pointerup', endJoystick);
  joystickZone.addEventListener('pointercancel', endJoystick);
}

// ============================================
// ゲームロジック
// ============================================

function startGame() {
  // 状態リセット
  gameState = {
    isPlaying: true,
    isPaused: false,
    difficulty: gameState.difficulty,
    time: 0,
    money: 0,
    distance: 0,
    itemsCollected: 0,
    hunterCount: 1,
    nextHunterTime: CONFIG[gameState.difficulty].hunterAddInterval,
  };

  playerState = {
    velocity: new THREE.Vector3(),
    rotation: 0,
    isDashing: false,
    dashCooldown: 0,
    effects: {
      speed: 0,
      shield: 0,
      invisible: 0,
      freeze: 0,
    },
  };

  // 既存オブジェクトをクリア
  clearGameObjects();

  // ゲームオブジェクト作成
  createPlayer();
  createObstacles();

  // 初期ハンター
  const hunter = createHunter(
    (Math.random() - 0.5) * 40 + (Math.random() > 0.5 ? 20 : -20),
    (Math.random() - 0.5) * 40 + (Math.random() > 0.5 ? 20 : -20)
  );
  hunters.push(hunter);

  // 初期アイテム
  for (let i = 0; i < 5; i++) {
    createItem();
  }

  // UI表示
  elements.titleScreen.classList.remove('active');
  elements.gameoverScreen.classList.remove('active');
  elements.pauseScreen.classList.remove('active');
  elements.hud.style.display = '';
  elements.minimap.style.display = '';
  elements.controls.style.display = '';

  // オーディオ初期化
  initAudio();

  updateUI();
}

function clearGameObjects() {
  // プレイヤー削除
  if (playerMesh) {
    scene.remove(playerMesh);
  }

  // ハンター削除
  hunters.forEach(h => scene.remove(h.mesh));
  hunters = [];

  // 障害物削除
  obstacles.forEach(o => scene.remove(o.mesh));
  obstacles = [];

  // アイテム削除
  items.forEach(i => scene.remove(i.mesh));
  items = [];
}

function pauseGame() {
  gameState.isPaused = true;
  elements.pauseScreen.classList.add('active');
}

function resumeGame() {
  gameState.isPaused = false;
  elements.pauseScreen.classList.remove('active');
}

function showTitleScreen() {
  gameState.isPlaying = false;
  gameState.isPaused = false;
  elements.titleScreen.classList.add('active');
  elements.gameoverScreen.classList.remove('active');
  elements.pauseScreen.classList.remove('active');
  elements.hud.style.display = 'none';
  elements.minimap.style.display = 'none';
  elements.controls.style.display = 'none';
}

function gameOver() {
  gameState.isPlaying = false;

  // 結果表示
  document.getElementById('result-time').textContent = formatTime(gameState.time);
  document.getElementById('result-money').textContent = `¥${gameState.money.toLocaleString()}`;
  document.getElementById('result-distance').textContent = `${Math.floor(gameState.distance)}m`;
  document.getElementById('result-items').textContent = `${gameState.itemsCollected}個`;

  elements.gameoverScreen.classList.add('active');
  elements.hud.style.display = 'none';
  elements.controls.style.display = 'none';

  playSound('gameover');
}

function activateDash() {
  if (playerState.dashCooldown > 0) return;

  playerState.isDashing = true;
  playerState.dashCooldown = DASH_COOLDOWN;

  setTimeout(() => {
    playerState.isDashing = false;
  }, DASH_DURATION * 1000);

  playSound('dash');
}

// ============================================
// 更新ループ
// ============================================

let lastTime = 0;
let itemSpawnTimer = 0;

function animate(currentTime = 0) {
  requestAnimationFrame(animate);

  const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  if (gameState.isPlaying && !gameState.isPaused) {
    update(delta);
  }

  renderer.render(scene, camera);
}

function update(delta) {
  // 時間更新
  gameState.time += delta;

  // 賞金加算
  const config = CONFIG[gameState.difficulty];
  gameState.money += Math.floor(config.moneyPerSecond * delta);

  // プレイヤー更新
  updatePlayer(delta);

  // ハンター更新
  updateHunters(delta);

  // アイテム更新
  updateItems(delta);

  // アイテムスポーン
  itemSpawnTimer += delta;
  if (itemSpawnTimer >= config.itemSpawnRate && items.length < 8) {
    createItem();
    itemSpawnTimer = 0;
  }

  // ハンター追加チェック
  gameState.nextHunterTime -= delta;
  if (gameState.nextHunterTime <= 0 && hunters.length < config.maxHunters) {
    addHunter();
  }

  // エフェクト時間減少
  updateEffects(delta);

  // 衝突判定
  if (checkHunterCollision()) {
    gameOver();
    return;
  }

  // カメラ更新
  updateCamera();

  // ミニマップ更新
  updateMinimap();

  // UI更新
  updateUI();
}

function updatePlayer(delta) {
  // 移動入力を取得（ワールド座標基準）
  let moveX = 0;
  let moveZ = 0;

  // キーボード入力
  if (input.forward) moveZ -= 1;
  if (input.backward) moveZ += 1;
  if (input.left) moveX -= 1;
  if (input.right) moveX += 1;

  // ジョイスティック入力（キーボードより優先）
  if (Math.abs(input.joystickX) > 0.1 || Math.abs(input.joystickY) > 0.1) {
    moveX = input.joystickX;
    moveZ = -input.joystickY; // 上方向が負のZ
  }

  // 速度計算
  let speed = PLAYER_SPEED;
  if (playerState.isDashing) {
    speed = DASH_SPEED;
  }
  if (playerState.effects.speed > 0) {
    speed *= 1.5;
  }

  // 移動方向を正規化してワールド座標で直接移動
  const direction = new THREE.Vector3(moveX, 0, moveZ).normalize();
  if (direction.length() > 0) {
    // プレイヤーの向きを移動方向に合わせる
    playerState.rotation = Math.atan2(direction.x, direction.z);

    const targetVelocity = direction.multiplyScalar(speed);
    playerState.velocity.lerp(targetVelocity, 0.15);
  } else {
    playerState.velocity.lerp(new THREE.Vector3(), 0.2);
  }

  // 位置更新
  const newPosition = player.position.clone().add(
    playerState.velocity.clone().multiplyScalar(delta)
  );

  // 障害物との衝突判定（複数パスで確実に押し戻す）
  // 位置の押し戻しは複数パスで行い、速度修正は最後に1回だけ行う
  const collisionNormals = [];

  for (let pass = 0; pass < 3; pass++) {
    for (const obstacle of obstacles) {
      const dx = newPosition.x - obstacle.position.x;
      const dz = newPosition.z - obstacle.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = player.radius + obstacle.radius;

      if (dist < minDist && dist > 0.001) {
        // 押し戻し
        const pushDir = new THREE.Vector3(dx, 0, dz).normalize();
        const pushDist = minDist - dist + 0.1;
        newPosition.add(pushDir.clone().multiplyScalar(pushDist));

        // 最初のパスでのみ衝突法線を記録
        if (pass === 0) {
          collisionNormals.push(pushDir.clone());
        }
      }
    }
  }

  // 衝突があった場合、速度を壁に沿った方向に修正
  if (collisionNormals.length > 0) {
    // 全ての衝突法線を平均して、主要な押し戻し方向を決定
    const avgNormal = new THREE.Vector3();
    collisionNormals.forEach(n => avgNormal.add(n));
    avgNormal.normalize();

    // 壁に向かう速度成分のみを除去（壁に沿った移動は維持）
    const velocityDot = playerState.velocity.dot(avgNormal);
    if (velocityDot < 0) {
      playerState.velocity.sub(avgNormal.clone().multiplyScalar(velocityDot));
    }
  }

  // フィールド境界（壁に当たったら速度をキャンセル）
  const boundaryMin = -FIELD_SIZE / 2 + 1;
  const boundaryMax = FIELD_SIZE / 2 - 1;

  if (newPosition.x < boundaryMin) {
    newPosition.x = boundaryMin;
    if (playerState.velocity.x < 0) playerState.velocity.x = 0;
  } else if (newPosition.x > boundaryMax) {
    newPosition.x = boundaryMax;
    if (playerState.velocity.x > 0) playerState.velocity.x = 0;
  }

  if (newPosition.z < boundaryMin) {
    newPosition.z = boundaryMin;
    if (playerState.velocity.z < 0) playerState.velocity.z = 0;
  } else if (newPosition.z > boundaryMax) {
    newPosition.z = boundaryMax;
    if (playerState.velocity.z > 0) playerState.velocity.z = 0;
  }

  // 移動距離を記録
  gameState.distance += player.position.distanceTo(newPosition);

  // 位置適用
  player.position.copy(newPosition);

  // プレイヤーの向きを更新
  playerMesh.rotation.y = playerState.rotation;

  // ダッシュクールダウン
  if (playerState.dashCooldown > 0) {
    playerState.dashCooldown -= delta;
  }
}

function updateEffects(delta) {
  // 各エフェクトの残り時間を減少
  Object.keys(playerState.effects).forEach(effect => {
    if (playerState.effects[effect] > 0) {
      playerState.effects[effect] -= delta;
      if (playerState.effects[effect] <= 0) {
        playerState.effects[effect] = 0;
        if (effect === 'invisible') {
          applyInvisibility(false);
        }
      }
    }
  });

  updateActiveEffects();
}

function updateActiveEffects() {
  const effectsContainer = elements.activeEffects;
  effectsContainer.innerHTML = '';

  const effectInfo = {
    speed: { emoji: '⚡', name: 'スピード', class: 'speed' },
    shield: { emoji: '🛡️', name: 'シールド', class: 'shield' },
    invisible: { emoji: '👻', name: '透明', class: 'invisible' },
  };

  Object.entries(playerState.effects).forEach(([effect, time]) => {
    if (time > 0 && effectInfo[effect]) {
      const badge = document.createElement('div');
      badge.className = `effect-badge ${effectInfo[effect].class}`;
      badge.innerHTML = `${effectInfo[effect].emoji} ${Math.ceil(time)}s`;
      effectsContainer.appendChild(badge);
    }
  });
}

function addHunter() {
  const config = CONFIG[gameState.difficulty];

  // プレイヤーから離れた位置にスポーン
  let x, z;
  let attempts = 0;
  do {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 15;
    x = player.position.x + Math.cos(angle) * dist;
    z = player.position.z + Math.sin(angle) * dist;
    attempts++;
  } while ((Math.abs(x) > FIELD_SIZE / 2 - 5 || Math.abs(z) > FIELD_SIZE / 2 - 5) && attempts < 20);

  x = Math.max(-FIELD_SIZE / 2 + 5, Math.min(FIELD_SIZE / 2 - 5, x));
  z = Math.max(-FIELD_SIZE / 2 + 5, Math.min(FIELD_SIZE / 2 - 5, z));

  const hunter = createHunter(x, z);
  hunters.push(hunter);
  gameState.hunterCount = hunters.length;
  gameState.nextHunterTime = config.hunterAddInterval;

  // 警告表示
  showHunterWarning();
  playSound('warning');
}

function updateCamera() {
  // 3人称視点カメラ（固定角度でプレイヤーを追従）
  const cameraOffset = new THREE.Vector3(0, 15, 20);

  const targetPosition = player.position.clone().add(cameraOffset);
  camera.position.lerp(targetPosition, 0.08);

  const lookTarget = player.position.clone();
  lookTarget.y += 1;
  camera.lookAt(lookTarget);
}

function updateMinimap() {
  const canvas = elements.minimapCanvas;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const scale = size / FIELD_SIZE;

  // 背景クリア
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, size, size);

  // グリッド
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    ctx.beginPath();
    ctx.moveTo(i * size / 5, 0);
    ctx.lineTo(i * size / 5, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * size / 5);
    ctx.lineTo(size, i * size / 5);
    ctx.stroke();
  }

  // 障害物
  ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
  obstacles.forEach(obs => {
    const x = (obs.position.x + FIELD_SIZE / 2) * scale;
    const z = (obs.position.z + FIELD_SIZE / 2) * scale;
    const r = obs.radius * scale;
    ctx.beginPath();
    ctx.arc(x, z, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // アイテム
  ctx.fillStyle = '#00ff88';
  items.forEach(item => {
    const x = (item.position.x + FIELD_SIZE / 2) * scale;
    const z = (item.position.z + FIELD_SIZE / 2) * scale;
    ctx.beginPath();
    ctx.arc(x, z, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // ハンター
  ctx.fillStyle = '#ff4444';
  hunters.forEach(hunter => {
    const x = (hunter.position.x + FIELD_SIZE / 2) * scale;
    const z = (hunter.position.z + FIELD_SIZE / 2) * scale;
    ctx.beginPath();
    ctx.arc(x, z, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // プレイヤー
  const px = (player.position.x + FIELD_SIZE / 2) * scale;
  const pz = (player.position.z + FIELD_SIZE / 2) * scale;

  // 視野範囲
  ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
  ctx.beginPath();
  ctx.moveTo(px, pz);
  ctx.arc(px, pz, 15, playerState.rotation - Math.PI / 4, playerState.rotation + Math.PI / 4);
  ctx.closePath();
  ctx.fill();

  // プレイヤー本体
  ctx.fillStyle = '#00ff88';
  ctx.beginPath();
  ctx.arc(px, pz, 5, 0, Math.PI * 2);
  ctx.fill();

  // 方向インジケーター
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, pz);
  ctx.lineTo(
    px + Math.sin(playerState.rotation) * 10,
    pz + Math.cos(playerState.rotation) * 10
  );
  ctx.stroke();
}

function updateUI() {
  elements.moneyDisplay.textContent = `💰 ¥${gameState.money.toLocaleString()}`;
  elements.hunterCount.textContent = `🕵️ ハンター: ${hunters.length}`;
  elements.timeDisplay.textContent = formatTime(gameState.time);

  // 次のハンター表示
  if (gameState.nextHunterTime > 0 && hunters.length < CONFIG[gameState.difficulty].maxHunters) {
    elements.nextHunter.style.display = '';
    elements.nextHunter.textContent = `次のハンター: ${Math.ceil(gameState.nextHunterTime)}秒後`;
  } else {
    elements.nextHunter.style.display = 'none';
  }

  // ダッシュ状態
  if (playerState.dashCooldown > 0) {
    elements.dashStatus.textContent = `⚡ ${Math.ceil(playerState.dashCooldown)}s`;
    elements.dashStatus.classList.remove('power');
    elements.dashBtn.classList.add('cooldown');
  } else {
    elements.dashStatus.textContent = '⚡ ダッシュ OK';
    elements.dashStatus.classList.add('power');
    elements.dashBtn.classList.remove('cooldown');
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// エフェクト表示
// ============================================

function showItemPopup(text) {
  elements.itemPopup.textContent = text;
  elements.itemPopup.classList.add('active');

  setTimeout(() => {
    elements.itemPopup.classList.remove('active');
  }, 1500);
}

function showHunterWarning() {
  elements.hunterWarning.classList.add('active');
  elements.warningFlash.classList.add('active');

  setTimeout(() => {
    elements.hunterWarning.classList.remove('active');
    elements.warningFlash.classList.remove('active');
  }, 2000);
}

// ============================================
// オーディオ
// ============================================

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  switch (type) {
    case 'item':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
      break;

    case 'dash':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
      break;

    case 'warning':
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);

      // ビープ音を2回
      for (let i = 0; i < 2; i++) {
        const t = audioCtx.currentTime + i * 0.3;
        gainNode.gain.setValueAtTime(0.25, t);
        gainNode.gain.setValueAtTime(0, t + 0.15);
      }

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.6);
      break;

    case 'gameover':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
      break;
  }
}

// ============================================
// ウィンドウリサイズ
// ============================================

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// 起動
// ============================================

init();
