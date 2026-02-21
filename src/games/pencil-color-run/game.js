import * as THREE from 'three';

const COLORS = {
  red: { hex: 0xff4d6d, name: 'あか' },
  blue: { hex: 0x4d96ff, name: 'あお' },
  green: { hex: 0x55d187, name: 'みどり' },
  yellow: { hex: 0xffd166, name: 'きいろ' }
};
const COLOR_KEYS = Object.keys(COLORS);

let scene, camera, renderer, playerRoot, pencilBody, pencilTip, ground;
let length = 10;
let laneX = 0;
let speed = 10;
let distance = 0;
let gameOver = false;
let currentColor = 'red';
const input = { left: false, right: false };
const obstacles = [];
const pickups = [];
const colorGates = [];
const trail = [];
const particles = [];

const app = document.getElementById('app');
const overlay = document.getElementById('overlay');
const card = document.getElementById('card');
const lengthChip = document.getElementById('length-chip');
const distanceChip = document.getElementById('distance-chip');
const colorChip = document.getElementById('color-chip');

setup();
showStart();

function setup() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x90a1ff, 35, 120);

  camera = new THREE.PerspectiveCamera(63, window.innerWidth / window.innerHeight, 0.1, 250);
  camera.position.set(0, 8, 14);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  app.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(15, 30, 18);
  sun.castShadow = true;
  scene.add(sun);

  const groundMat = new THREE.MeshStandardMaterial({ color: 0xeaf3ff, roughness: 0.95, metalness: 0 });
  ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 600), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -220;
  ground.receiveShadow = true;
  scene.add(ground);

  for (let i = 0; i < 50; i++) {
    spawnGroup(-20 - i * 11);
  }
  createPlayer();

  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'a') input.left = true; if (e.key === 'ArrowRight' || e.key === 'd') input.right = true; });
  window.addEventListener('keyup', e => { if (e.key === 'ArrowLeft' || e.key === 'a') input.left = false; if (e.key === 'ArrowRight' || e.key === 'd') input.right = false; });

  bindTouch('left-btn', true);
  bindTouch('right-btn', false);
}

function bindTouch(id, isLeft) {
  const btn = document.getElementById(id);
  btn.addEventListener('pointerdown', () => isLeft ? input.left = true : input.right = true);
  const off = () => isLeft ? input.left = false : input.right = false;
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointercancel', off);
  btn.addEventListener('pointerleave', off);
}

function createPlayer() {
  playerRoot = new THREE.Group();
  scene.add(playerRoot);
  const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS[currentColor].hex, roughness: 0.4, metalness: 0.2, emissive: COLORS[currentColor].hex, emissiveIntensity: 0.25 });
  pencilBody = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.58, length, 7), bodyMat);
  pencilBody.castShadow = true;
  pencilBody.position.y = length / 2;

  const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.5, 0.7, 7), new THREE.MeshStandardMaterial({ color: 0xd4a373 }));
  wood.position.y = length + 0.32;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.45, 7), new THREE.MeshStandardMaterial({ color: 0x444444 }));
  tip.position.y = length + 0.84;

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5 }));
  cap.position.y = 0.4;

  pencilTip = tip;
  playerRoot.add(pencilBody, wood, tip, cap);
  playerRoot.position.set(0, 0, 0);
}

function setLength(nextLength) {
  length = Math.max(1.8, nextLength);
  const bodyGeo = new THREE.CylinderGeometry(0.48, 0.58, length, 7);
  pencilBody.geometry.dispose();
  pencilBody.geometry = bodyGeo;
  pencilBody.position.y = length / 2;
  playerRoot.children[1].position.y = length + 0.32;
  pencilTip.position.y = length + 0.84;
}

function setColor(colorKey) {
  currentColor = colorKey;
  const c = COLORS[colorKey].hex;
  pencilBody.material.color.setHex(c);
  pencilBody.material.emissive.setHex(c);
  colorChip.textContent = `いろ: ${COLORS[colorKey].name}`;
}

function spawnGroup(z) {
  const rand = Math.random();
  if (rand < 0.45) {
    const colorKey = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    const x = (Math.floor(Math.random() * 3) - 1) * 4;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 12), new THREE.MeshStandardMaterial({ color: COLORS[colorKey].hex, emissive: COLORS[colorKey].hex, emissiveIntensity: 0.35 }));
    mesh.position.set(x, 1.3, z);
    mesh.rotation.z = Math.PI / 2.8;
    scene.add(mesh);
    pickups.push({ mesh, colorKey });
  } else if (rand < 0.8) {
    const h = 2 + Math.random() * 8;
    const x = (Math.floor(Math.random() * 3) - 1) * 4;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.8, h, 1.2), new THREE.MeshStandardMaterial({ color: 0x7d8597 }));
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    scene.add(mesh);
    obstacles.push({ mesh, height: h });
  } else {
    const colorKey = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(11.5, 5, 0.8), new THREE.MeshStandardMaterial({ color: COLORS[colorKey].hex, transparent: true, opacity: 0.35, emissive: COLORS[colorKey].hex, emissiveIntensity: 0.45 }));
    mesh.position.set(0, 2.5, z);
    scene.add(mesh);
    colorGates.push({ mesh, colorKey });
  }
}

function paintTrail() {
  if (distance % 1.6 > 0.2) return;
  const mat = new THREE.MeshStandardMaterial({ color: COLORS[currentColor].hex, transparent: true, opacity: 0.85 });
  const splat = new THREE.Mesh(new THREE.CircleGeometry(0.75 + Math.random() * 0.35, 18), mat);
  splat.rotation.x = -Math.PI / 2;
  splat.position.set(playerRoot.position.x + (Math.random() - 0.5) * 0.4, 0.02, playerRoot.position.z + 0.6);
  scene.add(splat);
  trail.push(splat);
  if (trail.length > 200) {
    const old = trail.shift();
    old.geometry.dispose();
    old.material.dispose();
    scene.remove(old);
  }
}

function burst(pos, color, count = 16) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color }));
    m.position.copy(pos);
    const vel = new THREE.Vector3((Math.random() - 0.5) * 0.18, Math.random() * 0.18 + 0.05, (Math.random() - 0.5) * 0.18);
    scene.add(m);
    particles.push({ m, vel, life: 0.8 + Math.random() * 0.5 });
  }
}

function collide(a, b, xzPad = 1) {
  return Math.abs(a.x - b.x) < xzPad && Math.abs(a.z - b.z) < 0.9;
}

let last = performance.now();
function animate(now = performance.now()) {
  const dt = Math.min((now - last) / 1000, 0.033);
  last = now;

  if (!gameOver && overlay.style.display === 'none') {
    distance += speed * dt;
    playerRoot.position.z -= speed * dt;

    const dir = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    laneX = THREE.MathUtils.clamp(laneX + dir * dt * 10, -4, 4);
    playerRoot.position.x = THREE.MathUtils.damp(playerRoot.position.x, laneX, 9, dt);

    camera.position.x = THREE.MathUtils.damp(camera.position.x, playerRoot.position.x * 0.38, 6, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, playerRoot.position.z + 14, 6, dt);
    camera.lookAt(playerRoot.position.x, Math.max(1.4, length * 0.5), playerRoot.position.z - 8);

    paintTrail();
    recycleAndCollide();
    updateHud();
  }

  particles.forEach((p, i) => {
    p.life -= dt;
    p.m.position.addScaledVector(p.vel, dt * 60);
    p.vel.y -= dt * 0.45;
    p.m.material.opacity = Math.max(0, p.life);
    p.m.material.transparent = true;
    if (p.life <= 0) {
      scene.remove(p.m);
      p.m.geometry.dispose();
      p.m.material.dispose();
      particles.splice(i, 1);
    }
  });

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

function recycleAndCollide() {
  const front = playerRoot.position.z - 560;
  [...pickups, ...obstacles, ...colorGates].forEach(item => {
    if (item.mesh.position.z > playerRoot.position.z + 12) {
      item.mesh.position.z = front - Math.random() * 36;
      item.mesh.position.x = (Math.floor(Math.random() * 3) - 1) * 4;
      if ('height' in item) {
        item.height = 2 + Math.random() * 8;
        item.mesh.scale.y = 1;
        item.mesh.geometry.dispose();
        item.mesh.geometry = new THREE.BoxGeometry(2.8, item.height, 1.2);
        item.mesh.position.y = item.height / 2;
      }
      if ('colorKey' in item) {
        const c = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
        item.colorKey = c;
        item.mesh.material.color.setHex(COLORS[c].hex);
        if (item.mesh.material.emissive) item.mesh.material.emissive.setHex(COLORS[c].hex);
      }
    }
  });

  pickups.forEach(p => {
    if (!p.hit && collide(playerRoot.position, p.mesh.position, 1.1)) {
      p.hit = true;
      const ok = p.colorKey === currentColor;
      burst(p.mesh.position, COLORS[p.colorKey].hex, 20);
      if (ok) {
        setLength(length + 1.6);
      } else {
        endGame(`ざんねん！\n${COLORS[p.colorKey].name}の色鉛筆を取っちゃった！`);
      }
      p.mesh.position.z -= 45;
      p.hit = false;
    }
  });

  obstacles.forEach(o => {
    if (!o.hit && collide(playerRoot.position, o.mesh.position, 1.5)) {
      o.hit = true;
      if (length <= o.height + 0.3) {
        endGame(`かべが高すぎる！\n必要: ${o.height.toFixed(1)} / いま: ${length.toFixed(1)}`);
      } else {
        setLength(length - o.height);
        burst(new THREE.Vector3(playerRoot.position.x, 1.2, playerRoot.position.z), 0xffffff, 14);
      }
      o.mesh.position.z -= 34;
      o.hit = false;
    }
  });

  colorGates.forEach(g => {
    if (Math.abs(playerRoot.position.z - g.mesh.position.z) < 0.8) {
      setColor(g.colorKey);
      burst(new THREE.Vector3(playerRoot.position.x, 1.8, playerRoot.position.z), COLORS[g.colorKey].hex, 26);
      g.mesh.position.z -= 60;
    }
  });
}

function updateHud() {
  lengthChip.textContent = `ながさ: ${length.toFixed(1)}`;
  distanceChip.textContent = `きょり: ${Math.floor(distance)}m`;
}

function showStart() {
  overlay.style.display = 'grid';
  card.innerHTML = `
    <h1>✏️ えんぴつカラーダッシュ</h1>
    <p>えんぴつは前へオートで進みます！左右だけ動かしてね。</p>
    <p>同じ色の色鉛筆を取ると長くなる！ちがう色を取るとゲームオーバー！</p>
    <p>半透明の色ゲートで色チェンジ。壁は高さぶんだけ削れるよ！</p>
    <button class="play-btn" id="start-btn">スタート！</button>
  `;
  document.getElementById('start-btn').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
}

function endGame(message) {
  gameOver = true;
  overlay.style.display = 'grid';
  card.innerHTML = `
    <h1>🏁 ゴール！ ${Math.floor(distance)}m</h1>
    <p style="white-space: pre-line">${message}</p>
    <p>さいこう記録をめざそう！</p>
    <button class="play-btn" id="retry-btn">もう一回！</button>
  `;
  document.getElementById('retry-btn').addEventListener('click', () => window.location.reload());
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
