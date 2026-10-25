/**
 * 描画（Three.js）
 * - チャンク用カスタムシェーダー（空の光 × 昼夜 + ブロックの光 + AO、フォグ、水の波）
 * - 空ドーム / 太陽と月 / 星 / 雲
 * - 選択枠、ひび割れ、パーティクル、手に持ったブロック
 */
import * as THREE from 'three';
import { getAtlas, getDef, faceTexture, tileIndex, tileUV, isBlock } from './blocks.js';
import { CHUNK } from './worldgen.js';

const CHUNK_VERT = /* glsl */`
  attribute vec3 aLight;
  uniform float uTime;
  uniform float uWave;
  varying vec2 vUv;
  varying vec3 vLight;
  varying float vDepth;
  void main() {
    vUv = uv;
    vLight = aLight;
    vec3 p = position;
    if (uWave > 0.5) {
      vec4 wp = modelMatrix * vec4(p, 1.0);
      // 水面の揺れ（上面だけ：ブロック内の高さが 0.875 の頂点）
      float frac = fract(p.y);
      if (frac > 0.8) p.y += sin(uTime * 1.6 + wp.x * 0.9 + wp.z * 0.7) * 0.04 + cos(uTime * 1.1 + wp.z * 1.3) * 0.03;
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const CHUNK_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D uMap;
  uniform float uDaylight;
  uniform vec3 uSkyTint;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uAlpha;
  uniform float uMinLight;
  uniform float uTime;
  uniform float uWave;
  varying vec2 vUv;
  varying vec3 vLight;
  varying float vDepth;
  void main() {
    vec2 uv = vUv;
    if (uWave > 0.5) uv.x += sin(uTime * 0.35) * 0.002;
    vec4 tex = texture2D(uMap, uv);
    if (tex.a < 0.5) discard;
    vec3 skyL = vec3(vLight.x * uDaylight) * uSkyTint;
    vec3 blkL = vec3(vLight.y) * vec3(1.0, 0.88, 0.66);
    vec3 light = max(skyL, blkL);
    light = max(light, vec3(uMinLight));
    vec3 col = tex.rgb * light * vLight.z;
    float f = smoothstep(uFogNear, uFogFar, vDepth);
    col = mix(col, uFogColor, f);
    gl_FragColor = vec4(col, tex.a * uAlpha);
  }
`;

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const SKY_FRAG = /* glsl */`
  precision highp float;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunGlow;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, -0.1, 1.0);
    float t = pow(1.0 - clamp(h, 0.0, 1.0), 2.2);
    vec3 col = mix(uTop, uHorizon, t);
    float d = max(dot(normalize(vDir), uSunDir), 0.0);
    col += uSunColor * pow(d, 10.0) * uSunGlow * (1.0 - clamp(h, 0.0, 1.0) * 0.6);
    if (vDir.y < 0.0) col = mix(uHorizon, uHorizon * 0.85, clamp(-vDir.y * 4.0, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const CLOUD_VERT = /* glsl */`
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mv = viewMatrix * wp;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const CLOUD_FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uDaylight;
  uniform vec3 uFogColor;
  uniform float uFogFar;
  uniform vec3 uCamPos;
  varying vec3 vWorld;
  varying float vDepth;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  void main() {
    vec2 p = (vWorld.xz + vec2(uTime * 1.5, uTime * 0.4));
    // マインクラフト風：12x12 のブロック状の雲
    vec2 cell = floor(p / 12.0);
    float n = vnoise(cell * 0.11) * 0.6 + vnoise(cell * 0.23 + 7.0) * 0.4;
    if (n < 0.58) discard;
    float hd = length(vWorld.xz - uCamPos.xz);
    float f = smoothstep(uFogFar * 1.2, uFogFar * 3.2, hd);
    vec3 col = mix(vec3(1.0) * (0.3 + 0.7 * uDaylight), uFogColor, f);
    gl_FragColor = vec4(col, 0.82 * (1.0 - f));
  }
`;

const PARTICLE_VERT = /* glsl */`
  attribute vec3 aUv;   // u0, v0, size(ブロック単位)
  attribute float aLight;
  uniform float uScale;  // 画面の高さ / (2 tan(fov/2))
  varying vec2 vUv0;
  varying float vLight;
  void main() {
    vUv0 = aUv.xy;
    vLight = aLight;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aUv.z * uScale / max(0.2, -mv.z), 1.0, 64.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const PARTICLE_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D uMap;
  uniform vec2 uTileSize;
  varying vec2 vUv0;
  varying float vLight;
  void main() {
    vec2 uv = vUv0 + gl_PointCoord * uTileSize * 0.25;
    vec4 tex = texture2D(uMap, uv);
    if (tex.a < 0.5) discard;
    gl_FragColor = vec4(tex.rgb * vLight, 1.0);
  }
`;

const DAY = { top: new THREE.Color(0.40, 0.62, 1.0), horizon: new THREE.Color(0.73, 0.85, 1.0) };
const SUNSET = { top: new THREE.Color(0.30, 0.30, 0.55), horizon: new THREE.Color(1.0, 0.56, 0.30) };
const NIGHT = { top: new THREE.Color(0.015, 0.02, 0.06), horizon: new THREE.Color(0.04, 0.06, 0.13) };

export class Renderer {
  constructor(container, { isMobile = false } = {}) {
    this.container = container;
    this.isMobile = isMobile;
    this.renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.sortObjects = true;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.08, 700);
    this.baseFov = 70;
    this.scene.add(this.camera);

    const atlas = getAtlas();
    this.atlasTex = new THREE.CanvasTexture(atlas.canvas);
    this.atlasTex.magFilter = THREE.NearestFilter;
    this.atlasTex.minFilter = THREE.NearestFilter;
    this.atlasTex.generateMipmaps = false;
    this.atlasTex.colorSpace = THREE.SRGBColorSpace;

    this.uniforms = {
      uMap: { value: this.atlasTex },
      uDaylight: { value: 1 },
      uSkyTint: { value: new THREE.Color(1, 1, 1) },
      uFogColor: { value: new THREE.Color() },
      uFogNear: { value: 60 },
      uFogFar: { value: 100 },
      uMinLight: { value: 0.05 },
      uTime: { value: 0 }
    };
    const mk = (extra) => new THREE.ShaderMaterial({
      vertexShader: CHUNK_VERT, fragmentShader: CHUNK_FRAG,
      uniforms: { ...this.uniforms, ...extra }
    });
    this.opaqueMat = mk({ uAlpha: { value: 1 }, uWave: { value: 0 } });
    this.waterMat = mk({ uAlpha: { value: 0.72 }, uWave: { value: 1 } });
    this.waterMat.transparent = true;
    this.waterMat.side = THREE.DoubleSide;
    this.waterMat.depthWrite = true;

    this.chunkGroup = new THREE.Group();
    this.scene.add(this.chunkGroup);

    this.initSky();
    this.initHighlight();
    this.initParticles();
    this.initHand();

    this.timeOfDay = 0.1;
    this.daylight = 1;
    this.underwater = false;
    this.setRenderDistance(5);
    this.resize();
  }

  /* ---------- セットアップ ---------- */
  initSky() {
    this.skyUniforms = {
      uTop: { value: DAY.top.clone() }, uHorizon: { value: DAY.horizon.clone() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color(1, 0.85, 0.6) }, uSunGlow: { value: 0.5 }
    };
    const skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: this.skyUniforms, side: THREE.BackSide, depthWrite: false });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    // 太陽と月（四角いやつ）
    this.celestial = new THREE.Group();
    const sunMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.6), depthWrite: false, fog: false });
    this.sun = new THREE.Mesh(new THREE.PlaneGeometry(46, 46), sunMat);
    this.sun.position.set(0, 0, -520);
    const moonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.88, 0.95), depthWrite: false, fog: false });
    this.moon = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), moonMat);
    this.moon.position.set(0, 0, 520);
    this.celestial.add(this.sun, this.moon);
    this.celestial.renderOrder = -9;
    this.scene.add(this.celestial);

    // 星
    const starCount = 700;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(560);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.renderOrder = -9;
    this.celestial.add(this.stars);

    // 雲
    this.cloudUniforms = { uTime: { value: 0 }, uDaylight: { value: 1 }, uFogColor: this.uniforms.uFogColor, uFogFar: this.uniforms.uFogFar, uCamPos: { value: new THREE.Vector3() } };
    const cloudMat = new THREE.ShaderMaterial({ vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG, uniforms: this.cloudUniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.clouds = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), cloudMat);
    this.clouds.rotation.x = -Math.PI / 2;
    this.clouds.position.y = 110;
    this.clouds.renderOrder = 5;
    this.clouds.frustumCulled = false;
    this.scene.add(this.clouds);
  }

  initHighlight() {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.highlight = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 }));
    this.highlight.visible = false;
    this.highlight.renderOrder = 2;
    this.scene.add(this.highlight);

    const cg = new THREE.BoxGeometry(1.006, 1.006, 1.006);
    this.crackGeo = cg;
    this.crackMat = new THREE.MeshBasicMaterial({ map: this.atlasTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.crack = new THREE.Mesh(cg, this.crackMat);
    this.crack.visible = false;
    this.crack.renderOrder = 3;
    this.scene.add(this.crack);
    this.crackStage = -1;
  }

  initParticles() {
    this.maxParticles = 600;
    const n = this.maxParticles;
    this.pPos = new Float32Array(n * 3);
    this.pVel = new Float32Array(n * 3);
    this.pUv = new Float32Array(n * 3);
    this.pLight = new Float32Array(n);
    this.pLife = new Float32Array(n);
    this.pCount = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aUv', new THREE.BufferAttribute(this.pUv, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aLight', new THREE.BufferAttribute(this.pLight, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    const atlas = getAtlas();
    const mat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT, fragmentShader: PARTICLE_FRAG,
      uniforms: { uMap: { value: this.atlasTex }, uTileSize: { value: new THREE.Vector2(1 / atlas.cols, 1 / atlas.rows) }, uScale: { value: 500 } }
    });
    this.particleMat = mat;
    this.particles = new THREE.Points(geo, mat);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  initHand() {
    this.hand = new THREE.Group();
    this.camera.add(this.hand);
    this.hand.position.set(0.8, -0.72, -1.1);
    this.handBase = this.hand.position.clone();
    this.handMat = new THREE.MeshBasicMaterial({ map: this.atlasTex, vertexColors: true, transparent: true, alphaTest: 0.5 });
    this.handMesh = null;
    this.handId = -1;
    this.swing = 0;
    this.bob = 0;
  }

  /* ---------- 設定 ---------- */
  setRenderDistance(rd) {
    this.renderDistance = rd;
    const dist = rd * CHUNK;
    this.uniforms.uFogNear.value = Math.max(16, dist * 0.55);
    this.uniforms.uFogFar.value = Math.max(32, dist * 0.98);
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /* ---------- チャンク ---------- */
  setChunkGeometry(chunk, data) {
    this.removeChunk(chunk);
    const make = (arrays, mat) => {
      if (!arrays) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arrays.position, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(arrays.uv, 2));
      geo.setAttribute('aLight', new THREE.BufferAttribute(arrays.light, 3));
      geo.setIndex(new THREE.BufferAttribute(arrays.index, 1));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(chunk.cx * CHUNK, 0, chunk.cz * CHUNK);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      return mesh;
    };
    chunk.mesh = make(data.opaque, this.opaqueMat);
    chunk.waterMesh = make(data.water, this.waterMat);
    if (chunk.waterMesh) chunk.waterMesh.renderOrder = 1;
    if (chunk.mesh) this.chunkGroup.add(chunk.mesh);
    if (chunk.waterMesh) this.chunkGroup.add(chunk.waterMesh);
  }

  removeChunk(chunk) {
    for (const k of ['mesh', 'waterMesh']) {
      const m = chunk[k];
      if (m) { this.chunkGroup.remove(m); m.geometry.dispose(); chunk[k] = null; }
    }
  }

  /* ---------- 昼夜 ---------- */
  /** t: 0..1（0 = 朝 6 時、0.25 = 正午、0.5 = 夕方 18 時、0.75 = 真夜中） */
  setTimeOfDay(t) {
    this.timeOfDay = t;
    const ang = t * Math.PI * 2;
    const sunH = Math.sin(ang);
    const dayN = THREE.MathUtils.smoothstep(sunH, -0.12, 0.25); // 0..1
    this.daylight = 0.24 + 0.76 * dayN;
    const sunsetW = Math.exp(-Math.pow(sunH / 0.22, 2)) * 0.9;

    const top = NIGHT.top.clone().lerp(DAY.top, dayN).lerp(SUNSET.top, sunsetW * 0.6);
    const horizon = NIGHT.horizon.clone().lerp(DAY.horizon, dayN).lerp(SUNSET.horizon, sunsetW);
    this.skyUniforms.uTop.value.copy(top);
    this.skyUniforms.uHorizon.value.copy(horizon);
    this.skyUniforms.uSunGlow.value = 0.25 + sunsetW * 1.2;
    this.skyUniforms.uSunColor.value.setRGB(1, 0.75 + 0.2 * dayN, 0.45 + 0.3 * dayN);

    // 太陽の方向（東から昇り西へ）。月は反対側
    const sunDir = new THREE.Vector3(0, sunH, -Math.cos(ang)).normalize();
    this.skyUniforms.uSunDir.value.copy(sunDir);
    this.sun.position.copy(sunDir).multiplyScalar(520);
    this.sun.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), sunDir.clone().negate());
    this.moon.position.copy(sunDir).multiplyScalar(-520);
    this.moon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), sunDir.clone());
    this.stars.rotation.x = ang;
    this.starMat.opacity = Math.max(0, 1 - dayN * 1.6);

    this.uniforms.uDaylight.value = this.daylight;
    const tint = new THREE.Color(0.6, 0.68, 1.0).lerp(new THREE.Color(1, 1, 1), dayN);
    this.uniforms.uSkyTint.value.copy(tint);
    this.cloudUniforms.uDaylight.value = this.daylight;

    const fog = this.underwater ? new THREE.Color(0.05, 0.22, 0.5).multiplyScalar(0.25 + 0.75 * this.daylight) : horizon;
    this.uniforms.uFogColor.value.copy(fog);
    this.renderer.setClearColor(fog, 1);
    if (this.underwater) {
      this.uniforms.uFogNear.value = 2;
      this.uniforms.uFogFar.value = 22;
    } else {
      this.setRenderDistance(this.renderDistance);
    }
    this.sky.visible = !this.underwater;
    this.celestial.visible = !this.underwater;
    this.clouds.visible = !this.underwater;
  }

  setUnderwater(flag) {
    if (this.underwater === flag) return;
    this.underwater = flag;
    this.setTimeOfDay(this.timeOfDay);
  }

  /* ---------- 選択枠 / ひび ---------- */
  setHighlight(target) {
    if (!target) { this.highlight.visible = false; return; }
    this.highlight.visible = true;
    const d = getDef(target.id);
    const h = d.height && d.shape !== 'liquid' ? d.height : 1;
    this.highlight.position.set(target.x + 0.5, target.y + h / 2, target.z + 0.5);
    this.highlight.scale.set(1, h, 1);
    if (d.shape === 'torch' || d.shape === 'cross') {
      this.highlight.scale.set(d.shape === 'torch' ? 0.3 : 0.84, d.shape === 'torch' ? 0.72 : 1, d.shape === 'torch' ? 0.3 : 0.84);
      if (d.shape === 'torch') this.highlight.position.y = target.y + 0.36 + (d.wall ? 0.2 : 0);
    }
  }

  setCrack(target, progress) {
    if (!target || progress <= 0) { this.crack.visible = false; this.crackStage = -1; return; }
    const stage = Math.min(4, Math.floor(progress * 5));
    if (stage !== this.crackStage) {
      this.crackStage = stage;
      const uv = tileUV(tileIndex('crack_' + stage));
      const attr = this.crackGeo.attributes.uv;
      for (let i = 0; i < attr.count; i++) {
        const u = (i % 4 === 1 || i % 4 === 3) ? 1 : 0;   // BoxGeometry の uv 並び: (0,1),(1,1),(0,0),(1,0)
        const v = i % 4 < 2 ? 1 : 0;
        attr.setXY(i, uv.u0 + u * (uv.u1 - uv.u0), uv.v0 + v * (uv.v1 - uv.v0));
      }
      attr.needsUpdate = true;
    }
    this.crack.visible = true;
    this.crack.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
  }

  /* ---------- パーティクル ---------- */
  spawnBlockParticles(x, y, z, id, light, count = 18) {
    const d = getDef(id);
    if (!d.tex) return;
    const texName = faceTexture(d, 4);
    const uv = tileUV(tileIndex(texName));
    const tw = uv.u1 - uv.u0, th = uv.v1 - uv.v0;
    for (let i = 0; i < count; i++) {
      if (this.pCount >= this.maxParticles) break;
      const k = this.pCount++;
      this.pPos[k * 3] = x + Math.random();
      this.pPos[k * 3 + 1] = y + Math.random();
      this.pPos[k * 3 + 2] = z + Math.random();
      this.pVel[k * 3] = (Math.random() - 0.5) * 4;
      this.pVel[k * 3 + 1] = Math.random() * 4 + 1;
      this.pVel[k * 3 + 2] = (Math.random() - 0.5) * 4;
      this.pUv[k * 3] = uv.u0 + Math.floor(Math.random() * 4) * tw * 0.25;
      this.pUv[k * 3 + 1] = uv.v0 + Math.floor(Math.random() * 4) * th * 0.25;
      this.pUv[k * 3 + 2] = 0.09 + Math.random() * 0.08;
      this.pLight[k] = light;
      this.pLife[k] = 0.6 + Math.random() * 0.6;
    }
  }

  updateParticles(dt, world) {
    let n = this.pCount;
    for (let i = 0; i < n; i++) {
      this.pLife[i] -= dt;
      if (this.pLife[i] <= 0) {
        // 末尾と入れ替え
        n--;
        for (let c = 0; c < 3; c++) {
          this.pPos[i * 3 + c] = this.pPos[n * 3 + c];
          this.pVel[i * 3 + c] = this.pVel[n * 3 + c];
          this.pUv[i * 3 + c] = this.pUv[n * 3 + c];
        }
        this.pLight[i] = this.pLight[n]; this.pLife[i] = this.pLife[n];
        i--; continue;
      }
      this.pVel[i * 3 + 1] -= 18 * dt;
      let nx = this.pPos[i * 3] + this.pVel[i * 3] * dt;
      let ny = this.pPos[i * 3 + 1] + this.pVel[i * 3 + 1] * dt;
      let nz = this.pPos[i * 3 + 2] + this.pVel[i * 3 + 2] * dt;
      if (world && getDef(world.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz))).collide) {
        // 下に落ちたら止める
        if (this.pVel[i * 3 + 1] < 0) { ny = Math.floor(this.pPos[i * 3 + 1]) + 0.01; this.pVel[i * 3 + 1] = 0; this.pVel[i * 3] *= 0.6; this.pVel[i * 3 + 2] *= 0.6; }
        else { nx = this.pPos[i * 3]; nz = this.pPos[i * 3 + 2]; }
      }
      this.pPos[i * 3] = nx; this.pPos[i * 3 + 1] = ny; this.pPos[i * 3 + 2] = nz;
    }
    this.pCount = n;
    const geo = this.particles.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aUv.needsUpdate = true;
    geo.attributes.aLight.needsUpdate = true;
    geo.setDrawRange(0, n);
  }

  /* ---------- 手に持つもの ---------- */
  setHeldItem(id) {
    if (id === this.handId) return;
    this.handId = id;
    if (this.handMesh) { this.hand.remove(this.handMesh); this.handMesh.geometry.dispose(); this.handMesh = null; }
    if (!id) return;
    const d = getDef(id);
    if (!d.tex) return;
    let geo;
    if (isBlock(id) && (d.shape === 'cube' || d.shape === 'liquid' || d.shape === 'layer')) {
      const h = d.shape === 'cube' ? 1 : (d.height || 1);
      geo = new THREE.BoxGeometry(0.32, 0.32 * h, 0.32);
      const uvAttr = geo.attributes.uv;
      const colors = new Float32Array(uvAttr.count * 3);
      const shade = [0.6, 0.6, 1.0, 0.5, 0.8, 0.8];
      for (let f = 0; f < 6; f++) {
        const uv = tileUV(tileIndex(faceTexture(d, f)));
        for (let i = 0; i < 4; i++) {
          const vi = f * 4 + i;
          const u = (i % 2 === 1) ? 1 : 0;
          const v = i < 2 ? 1 : 0;
          uvAttr.setXY(vi, uv.u0 + u * (uv.u1 - uv.u0), uv.v0 + v * (uv.v1 - uv.v0));
          colors[vi * 3] = colors[vi * 3 + 1] = colors[vi * 3 + 2] = shade[f];
        }
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      this.handMesh = new THREE.Mesh(geo, this.handMat);
      this.handMesh.rotation.set(-0.08, -0.65, 0.04);
      this.handMesh.position.y = (1 - h) * 0.16;
    } else {
      geo = new THREE.PlaneGeometry(0.36, 0.36);
      const uv = tileUV(tileIndex(typeof d.tex === 'string' ? d.tex : faceTexture(d, 4)));
      const uvAttr = geo.attributes.uv;
      const colors = new Float32Array(4 * 3).fill(1);
      for (let i = 0; i < 4; i++) {
        const u = (i % 2 === 1) ? 1 : 0;
        const v = i < 2 ? 1 : 0;
        uvAttr.setXY(i, uv.u0 + u * (uv.u1 - uv.u0), uv.v0 + v * (uv.v1 - uv.v0));
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      this.handMesh = new THREE.Mesh(geo, this.handMat);
      this.handMesh.rotation.set(-0.2, -0.9, 0.2);
    }
    this.hand.add(this.handMesh);
  }

  swingHand() { this.swing = 1; }

  /** 手の光（周囲の明るさ） */
  setHandLight(brightness) {
    this.handMat.color.setScalar(brightness);
  }

  updateHand(dt, moving) {
    if (this.swing > 0) this.swing = Math.max(0, this.swing - dt * 4.5);
    const s = Math.sin(this.swing * Math.PI);
    this.bob += dt * (moving ? 9 : 2);
    const bobX = Math.sin(this.bob) * (moving ? 0.035 : 0.006);
    const bobY = Math.abs(Math.cos(this.bob)) * (moving ? 0.03 : 0.004);
    this.hand.position.set(this.handBase.x + bobX - s * 0.25, this.handBase.y + bobY - s * 0.35, this.handBase.z + s * 0.15);
    this.hand.rotation.set(-s * 0.9, s * 0.3, 0);
  }

  /* ---------- フレーム ---------- */
  update(dt, time, world, moving) {
    this.uniforms.uTime.value = time;
    this.particleMat.uniforms.uScale.value = this.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    this.cloudUniforms.uTime.value = time;
    this.sky.position.copy(this.camera.position);
    this.celestial.position.copy(this.camera.position);
    this.clouds.position.set(this.camera.position.x, 110, this.camera.position.z);
    this.cloudUniforms.uCamPos.value.copy(this.camera.position);
    this.updateParticles(dt, world);
    this.updateHand(dt, moving);
  }

  render() { this.renderer.render(this.scene, this.camera); }

  dispose() {
    for (const c of this.chunkGroup.children) c.geometry.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
