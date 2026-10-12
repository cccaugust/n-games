/**
 * シティチェイス - 3Dレンダラー（Three.js）
 *
 * 夜の街の盤面（5×5のビル・16の交差点）、ヘリコプター3機とサーチライト、赤い車、痕跡コマ、
 * ブルーム・パーティクル・カメラ演出を担当する。ゲームのルールは一切持たない（game.js が指示する）。
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  GRID, IGRID, NUM_BUILDINGS, NUM_INTERSECTIONS, HELIS, TRACE_CSS, bRow, bCol, iRow, iCol,
} from './rules.js';

// ---------- 盤面の寸法 ----------
export const PITCH = 1.6;           // ビル中心の間隔
const FOOT = 1.0;                   // ビルの敷地
const LOT_W = 0.88;                 // ビル本体の幅
const ROAD_W = PITCH - FOOT;        // 道路幅 0.6
const MARGIN = 0.95;                // 外周（外側道路 + 歩道）
const BOARD_HALF = (GRID * PITCH) / 2 + MARGIN; // 4.95
const HELI_ALT = 2.75;              // ヘリのホバリング高度
const H_TALL = 2.35;
const H_SHORT = 1.3;
const LIFT_H = 1.45;                // 捜索時にビルを持ち上げる高さ

export const buildingPos = (b) => ({ x: (bCol(b) - 2) * PITCH, z: (bRow(b) - 2) * PITCH });
export const intersectionPos = (i) => ({ x: (iCol(i) - 1.5) * PITCH, z: (iRow(i) - 1.5) * PITCH });

const TRACE_HEX = { yellow: 0xffd23f, red: 0xff5a36, blue: 0x38bdf8 };
const COLOR = {
  bg: 0x070b1a,
  building: 0x2546c8,
  buildingDark: 0x182f8f,
  roof: 0x1d379b,
  car: 0xe11d2e,
};

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/** 簡易トゥイーン（実時間ベース。フレームレートが落ちても所要時間は一定） */
class Tweens {
  constructor() { this.list = []; }
  add(duration, onUpdate, easing = easeInOut, delay = 0) {
    return new Promise((resolve) => {
      this.list.push({ start: performance.now() / 1000 + delay, duration, onUpdate, easing, resolve });
    });
  }
  update() {
    const now = performance.now() / 1000;
    for (let k = this.list.length - 1; k >= 0; k--) {
      const tw = this.list[k];
      if (now < tw.start) continue;
      const p = clamp01((now - tw.start) / tw.duration);
      tw.onUpdate(tw.easing(p), p);
      if (p >= 1) { this.list.splice(k, 1); tw.resolve(); }
    }
  }
  clear() { for (const tw of this.list) tw.resolve(); this.list.length = 0; }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- テクスチャ生成（Canvas） ----------
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function srgbTexture(canvas, repeat = false) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** 盤面テクスチャ（道路・敷地・横断歩道・駐車中の車・街灯の光） */
function createBoardTextures(size, rng) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const e = makeCanvas(size, size);
  const ectx = e.getContext('2d');
  const S = size / (BOARD_HALF * 2); // px per unit
  const toPx = (v) => (v + BOARD_HALF) * S;

  // ベース: アスファルト
  ctx.fillStyle = '#2b3345';
  ctx.fillRect(0, 0, size, size);
  // ノイズ
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let k = 0; k < d.length; k += 4) {
    const n = (rng() - 0.5) * 18;
    d[k] += n; d[k + 1] += n; d[k + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // 外周の緑地
  ctx.fillStyle = '#20392e';
  const edge = BOARD_HALF - MARGIN + ROAD_W + FOOT / 2 - FOOT / 2; // 外側道路の外縁
  const greenInner = toPx(-BOARD_HALF + MARGIN - ROAD_W * 0.5 - 0.05);
  ctx.fillRect(0, 0, size, greenInner);
  ctx.fillRect(0, 0, greenInner, size);
  ctx.fillRect(size - greenInner, 0, greenInner, size);
  ctx.fillRect(0, size - greenInner, size, greenInner);
  // 外周の木
  for (let k = 0; k < 160; k++) {
    const side = k % 4;
    const t = rng() * (BOARD_HALF * 2) - BOARD_HALF;
    const off = -BOARD_HALF + 0.08 + rng() * 0.22;
    let x, z;
    if (side === 0) { x = t; z = off; } else if (side === 1) { x = t; z = -off; } else if (side === 2) { x = off; z = t; } else { x = -off; z = t; }
    const r = (0.07 + rng() * 0.06) * S;
    const g = ctx.createRadialGradient(toPx(x) - r * 0.3, toPx(z) - r * 0.3, r * 0.1, toPx(x), toPx(z), r);
    g.addColorStop(0, '#5fae63'); g.addColorStop(1, '#1f4a2a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(toPx(x), toPx(z), r, 0, Math.PI * 2); ctx.fill();
  }

  // 道路の中央線（黄色の破線）: 内側 4本 + 外側 2本 ×2方向
  const roadCenters = [];
  for (let k = 0; k < IGRID; k++) roadCenters.push((k - 1.5) * PITCH);
  const outer = (GRID / 2) * PITCH - FOOT / 2 + ROAD_W / 2; // 外周道路の中心
  const allRoads = roadCenters.concat([-outer, outer]);
  ctx.setLineDash([0.18 * S, 0.14 * S]);
  ctx.lineWidth = 0.025 * S;
  ctx.strokeStyle = '#d8b53a';
  for (const rc of allRoads) {
    ctx.beginPath(); ctx.moveTo(toPx(rc), toPx(-BOARD_HALF + 0.2)); ctx.lineTo(toPx(rc), toPx(BOARD_HALF - 0.2)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(toPx(-BOARD_HALF + 0.2), toPx(rc)); ctx.lineTo(toPx(BOARD_HALF - 0.2), toPx(rc)); ctx.stroke();
  }
  ctx.setLineDash([]);

  // 敷地（ビルの区画）+ 歩道 + 植え込み + 車のソケット
  for (let b = 0; b < NUM_BUILDINGS; b++) {
    const { x, z } = buildingPos(b);
    const half = FOOT / 2;
    // 歩道
    ctx.fillStyle = '#6b7488';
    ctx.fillRect(toPx(x - half), toPx(z - half), FOOT * S, FOOT * S);
    // 区画
    ctx.fillStyle = '#1a2132';
    const inner = half - 0.1;
    ctx.fillRect(toPx(x - inner), toPx(z - inner), inner * 2 * S, inner * 2 * S);
    // 植え込み（四隅）
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const px = toPx(x + dx * (half - 0.07)), pz = toPx(z + dz * (half - 0.07));
      const r = 0.045 * S;
      ctx.fillStyle = '#2f6b3a'; ctx.beginPath(); ctx.arc(px, pz, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4e9a55'; ctx.beginPath(); ctx.arc(px - r * 0.25, pz - r * 0.25, r * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    // ソケット（車が隠れる穴）
    const g = ctx.createRadialGradient(toPx(x), toPx(z), 0.02 * S, toPx(x), toPx(z), 0.3 * S);
    g.addColorStop(0, '#05070d'); g.addColorStop(0.8, '#0b0f1a'); g.addColorStop(1, '#1a2132');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(toPx(x), toPx(z), 0.3 * S, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3b4660'; ctx.lineWidth = 0.012 * S;
    ctx.beginPath(); ctx.arc(toPx(x), toPx(z), 0.27 * S, 0, Math.PI * 2); ctx.stroke();
  }

  // 横断歩道（内側の交差点の4方向）
  ctx.fillStyle = '#e6e9f0';
  for (let i = 0; i < NUM_INTERSECTIONS; i++) {
    const { x, z } = intersectionPos(i);
    const stripes = 5, sw = ROAD_W / (stripes * 2);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cx = x + dx * (ROAD_W / 2 + 0.12), cz = z + dz * (ROAD_W / 2 + 0.12);
      for (let s = 0; s < stripes; s++) {
        const off = (s - (stripes - 1) / 2) * sw * 2;
        if (dx !== 0) ctx.fillRect(toPx(cx - 0.07), toPx(cz + off - sw / 2), 0.14 * S, sw * S);
        else ctx.fillRect(toPx(cx + off - sw / 2), toPx(cz - 0.07), sw * S, 0.14 * S);
      }
    }
    // 交差点のマーク（ヘリの着地点）
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.014 * S;
    ctx.beginPath(); ctx.arc(toPx(x), toPx(z), 0.2 * S, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(toPx(x), toPx(z), 0.05 * S, 0, Math.PI * 2); ctx.stroke();
  }

  // 座標ラベル（列 A〜E / 行 1〜5）: 盤の外周に描く
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `bold ${Math.round(0.26 * S)}px Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let c = 0; c < GRID; c++) {
    const x = (c - 2) * PITCH;
    const label = String.fromCharCode(65 + c);
    ctx.fillText(label, toPx(x), toPx(-BOARD_HALF + 0.22));
    ctx.fillText(label, toPx(x), toPx(BOARD_HALF - 0.22));
  }
  for (let r = 0; r < GRID; r++) {
    const z = (r - 2) * PITCH;
    ctx.fillText(String(r + 1), toPx(-BOARD_HALF + 0.22), toPx(z));
    ctx.fillText(String(r + 1), toPx(BOARD_HALF - 0.22), toPx(z));
  }

  // 駐車している車（外周道路）
  const carColors = ['#e74c3c', '#f1c40f', '#ecf0f1', '#3498db', '#95a5a6', '#2ecc71', '#e67e22'];
  for (let k = 0; k < 44; k++) {
    const side = k % 4;
    const t = rng() * (BOARD_HALF * 2 - 1.2) - (BOARD_HALF - 0.6);
    const lane = (rng() < 0.5 ? -1 : 1) * 0.17;
    let x, z, horiz;
    if (side === 0) { x = t; z = -outer + lane; horiz = true; } else if (side === 1) { x = t; z = outer + lane; horiz = true; } else if (side === 2) { x = -outer + lane; z = t; horiz = false; } else { x = outer + lane; z = t; horiz = false; }
    ctx.fillStyle = carColors[Math.floor(rng() * carColors.length)];
    const L = 0.22 * S, W = 0.11 * S;
    ctx.save(); ctx.translate(toPx(x), toPx(z)); if (!horiz) ctx.rotate(Math.PI / 2);
    ctx.fillRect(-L / 2, -W / 2, L, W);
    ctx.fillStyle = 'rgba(10,15,30,0.7)'; ctx.fillRect(-L * 0.2, -W / 2 + 1, L * 0.4, W - 2);
    ctx.restore();
    // ヘッドライトの光（発光マップ）
    ectx.fillStyle = 'rgba(255,240,200,0.9)';
    ectx.save(); ectx.translate(toPx(x), toPx(z)); if (!horiz) ectx.rotate(Math.PI / 2);
    ectx.fillRect(L / 2 - 2, -W / 2, 2, 2); ectx.fillRect(L / 2 - 2, W / 2 - 2, 2, 2);
    ectx.restore();
  }

  // 発光マップ: 街灯（歩道の角）
  ectx.fillStyle = '#000';
  for (let b = 0; b < NUM_BUILDINGS; b++) {
    const { x, z } = buildingPos(b);
    for (const [dx, dz] of [[-1, 1], [1, -1]]) {
      const px = toPx(x + dx * (FOOT / 2 - 0.02)), pz = toPx(z + dz * (FOOT / 2 - 0.02));
      const r = 0.11 * S;
      const g = ectx.createRadialGradient(px, pz, 0, px, pz, r);
      g.addColorStop(0, 'rgba(255,214,140,0.5)'); g.addColorStop(0.35, 'rgba(255,190,110,0.12)'); g.addColorStop(1, 'rgba(255,170,90,0)');
      ectx.fillStyle = g; ectx.beginPath(); ectx.arc(px, pz, r, 0, Math.PI * 2); ectx.fill();
    }
  }
  return { map: srgbTexture(c), emissive: srgbTexture(e) };
}

/** ビルの窓テクスチャ（発光マップ用） */
function createWindowTexture(rng, cols = 4, rows = 9, litRatio = 0.55) {
  const w = 128, h = 256;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  const cw = w / cols, ch = h / rows;
  const palette = ['#ffe9a8', '#fff3c4', '#bfe9ff', '#ffd27a', '#a8f0ff'];
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      if (rng() > litRatio) continue;
      const alpha = 0.55 + rng() * 0.45;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = palette[Math.floor(rng() * palette.length)];
      const pad = 5;
      ctx.fillRect(col * cw + pad, r * ch + pad, cw - pad * 2, ch - pad * 2 - 2);
    }
  }
  ctx.globalAlpha = 1;
  const tex = srgbTexture(c, true);
  return tex;
}

/** ヘリポートの「H」 */
function createHeliportTexture() {
  const s = 256;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 14, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 150px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('H', s / 2, s / 2 + 6);
  const tex = srgbTexture(c);
  return tex;
}

/** 痕跡コマの表面（色 + 「!」 or 番号） */
function createTraceTexture(color, label) {
  const s = 256;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  const base = TRACE_CSS[color] || '#38bdf8';
  const g = ctx.createRadialGradient(s * 0.4, s * 0.35, 10, s / 2, s / 2, s / 2);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, base); g.addColorStop(1, base);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); ctx.fill();
  // 放射状の模様
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 6;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(s / 2 + Math.cos(a) * s * 0.3, s / 2 + Math.sin(a) * s * 0.3);
    ctx.lineTo(s / 2 + Math.cos(a) * s * 0.47, s / 2 + Math.sin(a) * s * 0.47); ctx.stroke();
  }
  ctx.fillStyle = color === 'yellow' ? '#1a1a1a' : '#ffffff';
  ctx.font = 'bold 170px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, s / 2, s / 2 + 10);
  return srgbTexture(c);
}

/** 丸いグロー（スプライト/床の光） */
function createGlowTexture(inner = 0.0, soft = 1.0) {
  const s = 256;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(inner, 'rgba(255,255,255,1)');
  g.addColorStop(Math.min(1, inner + (1 - inner) * 0.45 * soft), 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function createRingTexture() {
  const s = 256;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 22;
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 16, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.35; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 42, 0, Math.PI * 2); ctx.stroke();
  return new THREE.CanvasTexture(c);
}

/** ラベル用スプライト（ラウンド番号など） */
function createLabelSprite(text, bg, fg = '#fff') {
  const s = 128;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = fg; ctx.font = 'bold 64px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, s / 2, s / 2 + 4);
  const tex = srgbTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(0.5, 0.5, 1);
  sp.renderOrder = 20;
  return sp;
}

// ---------- パーティクル ----------
class ParticleSystem {
  constructor(scene, max = 700) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: createGlowTexture(0.1, 1) }, uScale: { value: 300 } },
      vertexShader: `
        attribute float aSize; attribute float aAlpha; varying vec3 vColor; varying float vAlpha;
        uniform float uScale;
        void main() {
          vColor = color; vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uTex; varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          gl_FragColor = vec4(vColor, t.a * vAlpha);
        }`,
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 15;
    scene.add(this.points);
    this.cursor = 0;
    this.active = 0;
  }

  emit({ x, y, z, count = 20, color = 0xffffff, colors = null, speed = 1, up = 1, spread = 0.2, life = 0.8, size = 0.08, gravity = 0, drag = 1 }) {
    const c = new THREE.Color();
    for (let k = 0; k < count; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * spread;
      this.pos[i * 3] = x + Math.cos(a) * r;
      this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * spread * 0.5;
      this.pos[i * 3 + 2] = z + Math.sin(a) * r;
      const sp = speed * (0.4 + Math.random() * 0.8);
      const el = Math.random() * Math.PI * 2;
      this.vel[i * 3] = Math.cos(el) * sp;
      this.vel[i * 3 + 1] = up * sp * (0.3 + Math.random());
      this.vel[i * 3 + 2] = Math.sin(el) * sp;
      c.set(colors ? colors[Math.floor(Math.random() * colors.length)] : color);
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      this.size[i] = size * (0.6 + Math.random() * 0.8);
      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.6);
      this.alpha[i] = 1;
      this.grav[i] = gravity;
      this.drag[i] = drag;
    }
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      any = true;
      this.life[i] -= dt;
      const f = Math.pow(this.drag[i], dt * 60);
      this.vel[i * 3] *= f; this.vel[i * 3 + 2] *= f;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * f - this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.02 && this.grav[i] > 0) { this.pos[i * 3 + 1] = 0.02; this.vel[i * 3 + 1] *= -0.3; }
      this.alpha[i] = clamp01(this.life[i] / this.maxLife[i]) * (this.life[i] < 0.15 ? this.life[i] / 0.15 : 1);
    }
    if (any) {
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.color.needsUpdate = true;
      this.geo.attributes.aSize.needsUpdate = true;
      this.geo.attributes.aAlpha.needsUpdate = true;
    }
    this.points.visible = any;
  }
}

// ---------- モデル生成 ----------
function createCar() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: COLOR.car, roughness: 0.28, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.15, emissive: 0x7a0c18, emissiveIntensity: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.6, metalness: 0.2 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x8ab6ff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.55 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.25, metalness: 0.9 });

  const body = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.11, 0.6, 3, 0.04), bodyMat);
  body.position.y = 0.1; body.castShadow = true;
  g.add(body);
  const hood = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.05, 0.2, 2, 0.02), bodyMat);
  hood.position.set(0, 0.165, -0.16); hood.rotation.x = 0.12;
  g.add(hood);
  const cabin = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.1, 0.26, 3, 0.05), glassMat);
  cabin.position.set(0, 0.2, 0.02);
  g.add(cabin);
  const roof = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.03, 0.18, 2, 0.01), bodyMat);
  roof.position.set(0, 0.255, 0.03);
  g.add(roof);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.07), darkMat);
  spoiler.position.set(0, 0.2, 0.27);
  g.add(spoiler);
  for (const s of [-1, 1]) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.03), darkMat);
    stand.position.set(s * 0.11, 0.17, 0.27); g.add(stand);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.05, 18);
  const hubGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.052, 12);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.rotation.z = Math.PI / 2; w.position.set(sx * 0.15, 0.055, sz * 0.19); w.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, chrome); hub.rotation.z = Math.PI / 2; hub.position.copy(w.position);
    g.add(w, hub);
  }
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6d5, emissive: 0xfff2c0, emissiveIntensity: 2.2 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2a2a, emissiveIntensity: 1.6 });
  const headlights = [];
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), headMat);
    hl.position.set(s * 0.1, 0.12, -0.3); g.add(hl); headlights.push(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.01), tailMat);
    tl.position.set(s * 0.1, 0.12, 0.3); g.add(tl);
  }
  // ヘッドライトの光芒（スプライト）
  const glowTex = createGlowTexture(0.05, 1);
  const glows = [];
  for (const s of [-1, 1]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1c8, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.set(0.28, 0.28, 1); sp.position.set(s * 0.1, 0.12, -0.33);
    g.add(sp); glows.push(sp);
  }
  // 足元の赤い光（夜でも車の位置が分かる）
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff3b4a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.012; floor.renderOrder = 4;
  g.add(floor);
  g.scale.setScalar(1.35);
  g.userData = { headMat, glows, floor };
  return g;
}

function createHelicopter(hex) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.scale.setScalar(1.5);
  g.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.32, metalness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b1e27, roughness: 0.55, metalness: 0.3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fd3ff, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf5f7fa, roughness: 0.4, metalness: 0.1 });

  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 18), paint);
  cab.scale.set(0.95, 0.8, 1.25); cab.position.y = 0.02; cab.castShadow = true;
  body.add(cab);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), glass);
  cockpit.scale.set(0.95, 0.9, 1.0); cockpit.position.set(0, 0.03, -0.2); cockpit.rotation.x = -Math.PI / 2 - 0.3;
  body.add(cockpit);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.012, 8, 32), white);
  stripe.rotation.x = Math.PI / 2; stripe.scale.set(0.95, 1.25, 1); stripe.position.y = 0.02;
  body.add(stripe);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.065, 0.62, 12), paint);
  boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.06, 0.52);
  body.add(boom);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.12), paint);
  fin.position.set(0, 0.16, 0.8); fin.rotation.x = -0.3;
  body.add(fin);
  const hfin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.08), white);
  hfin.position.set(0, 0.09, 0.72);
  body.add(hfin);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.03, 0.18, 0.84);
  for (let k = 0; k < 2; k++) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.2, 0.025), dark);
    bl.rotation.x = (k * Math.PI) / 2; tailRotor.add(bl);
  }
  body.add(tailRotor);
  // メインローター
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.1, 10), dark);
  mast.position.y = 0.26; body.add(mast);
  const rotor = new THREE.Group(); rotor.position.y = 0.3;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), dark); rotor.add(hub);
  for (let k = 0; k < 4; k++) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.012, 0.05), dark);
    bl.position.x = 0.0; bl.rotation.y = (k * Math.PI) / 2; rotor.add(bl);
  }
  const blur = new THREE.Mesh(new THREE.CircleGeometry(0.38, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }));
  blur.rotation.x = -Math.PI / 2; rotor.add(blur);
  body.add(rotor);
  // スキッド
  for (const s of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), dark);
    skid.rotation.x = Math.PI / 2; skid.position.set(s * 0.17, -0.2, 0.02); body.add(skid);
    for (const z of [-0.12, 0.14]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6), dark);
      strut.position.set(s * 0.15, -0.12, z); strut.rotation.z = s * 0.25; body.add(strut);
    }
  }
  // ライト
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: 3 }));
  beacon.position.set(0, 0.26, 0.85); body.add(beacon);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.5 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), lampMat);
  lamp.position.set(0, -0.2, -0.1); body.add(lamp);

  // サーチライトのコーン（頂点 = ヘリ、底面 = 地面）
  const coneH = HELI_ALT;
  const coneGeo = new THREE.ConeGeometry(0.72, coneH, 40, 1, true);
  const coneMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.55) }, uIntensity: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uIntensity; uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float h = vUv.y; // 1 = 頂点(ヘリ) 0 = 地面
        float fres = pow(1.0 - abs(dot(vN, vV)), 1.4);
        float a = (0.10 + 0.26 * fres) * (0.35 + 0.65 * (1.0 - h)) * uIntensity;
        float flicker = 0.92 + 0.08 * sin(uTime * 9.0 + h * 20.0);
        gl_FragColor = vec4(uColor * (0.9 + 0.5 * (1.0 - h)), a * flicker);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = -coneH / 2 - 0.2;
  cone.renderOrder = 5;
  g.add(cone);
  // 地面の光のプール
  const poolTex = createGlowTexture(0.15, 1);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40), new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.15), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = -coneH - 0.2 + 0.03; pool.renderOrder = 4;
  g.add(pool);
  // 実際の光源（周囲のビルを照らす）
  const spot = new THREE.SpotLight(new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.5), 28, 7.5, 0.42, 0.7, 1.4);
  spot.position.set(0, -0.1, 0);
  spot.target.position.set(0, -coneH - 0.2, 0);
  g.add(spot); g.add(spot.target);
  // 選択リング（地面）
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.8, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = pool.position.y + 0.01; ring.renderOrder = 6;
  g.add(ring);
  // 当たり判定（見えない球）
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.1;
  g.add(hit);
  g.userData = { body, rotor, tailRotor, cone, coneMat, pool, spot, ring, hit, beacon, lampMat, paint };
  return g;
}

function createTraceToken(color, label) {
  const topTex = createTraceTexture(color, label);
  const side = new THREE.MeshStandardMaterial({ color: TRACE_HEX[color], roughness: 0.4, metalness: 0.1 });
  const top = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.35, metalness: 0.05, emissive: TRACE_HEX[color], emissiveMap: topTex, emissiveIntensity: 0.35 });
  const geo = new THREE.CylinderGeometry(0.19, 0.19, 0.05, 36);
  const mesh = new THREE.Mesh(geo, [side, top, side]);
  mesh.castShadow = true;
  mesh.userData.color = color;
  return mesh;
}

function createFrameGeometry(outerHalf, innerHalf) {
  const shape = new THREE.Shape();
  shape.moveTo(-outerHalf, -outerHalf); shape.lineTo(outerHalf, -outerHalf); shape.lineTo(outerHalf, outerHalf); shape.lineTo(-outerHalf, outerHalf); shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-innerHalf, -innerHalf); hole.lineTo(innerHalf, -innerHalf); hole.lineTo(innerHalf, innerHalf); hole.lineTo(-innerHalf, innerHalf); hole.closePath();
  shape.holes.push(hole);
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

// ---------- レンダラー本体 ----------
export class CityRenderer {
  /**
   * @param {HTMLElement} container
   * @param {object} opts { rng, onTap(hit), onHover(hit|null), bloom }
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.onTap = opts.onTap || (() => {});
    this.onHover = opts.onHover || (() => {});
    this.rng = opts.rng || Math.random;
    this.tweens = new Tweens();
    this.clock = new THREE.Clock();
    this.time = 0;
    this.shake = 0;
    this.buildings = [];
    this.intersections = [];
    this.helis = [];
    this.tokens = [];
    this.routeObjects = [];
    this.pathMarkers = [];
    this.pickable = { intersections: new Set(), buildings: new Set(), helis: new Set() };
    this.hover = null;
    this.titleMode = false;
    this.frameTimes = [];
    this.bloomEnabled = opts.bloom !== false;
    this.bloomUser = this.bloomEnabled;
    this.isSmall = Math.min(window.innerWidth, window.innerHeight) < 500;

    this._initRenderer();
    this._initScene();
    this._initBoard();
    this._initHelis();
    this._initCar();
    this._initPost();
    this._initPointer();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  // ----- 初期化 -----
  _initRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isSmall ? 1.75 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    this.container.appendChild(renderer.domElement);
    this.renderer = renderer;
  }

  _initScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLOR.bg);
    scene.fog = new THREE.FogExp2(COLOR.bg, 0.03);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 120);
    camera.position.set(0, 9.5, 10.5);
    this.camera = camera;

    const controls = new OrbitControls(camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 6.5;
    controls.maxDistance = 22;
    controls.minPolarAngle = 0.22;
    controls.maxPolarAngle = 1.28;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.7;
    controls.target.set(0, 0.2, 0.1);
    controls.autoRotateSpeed = 0.6;
    this.controls = controls;

    // ライティング（夜）
    scene.add(new THREE.AmbientLight(0x4a5a9a, 0.55));
    const hemi = new THREE.HemisphereLight(0x5b6fd6, 0x0b0f1e, 0.55);
    scene.add(hemi);
    const moon = new THREE.DirectionalLight(0xbfd2ff, 1.25);
    moon.position.set(-6, 12, 4);
    moon.castShadow = true;
    moon.shadow.mapSize.set(this.isSmall ? 1024 : 2048, this.isSmall ? 1024 : 2048);
    moon.shadow.camera.left = -7; moon.shadow.camera.right = 7;
    moon.shadow.camera.top = 7; moon.shadow.camera.bottom = -7;
    moon.shadow.camera.near = 1; moon.shadow.camera.far = 40;
    moon.shadow.bias = -0.0008;
    moon.shadow.normalBias = 0.02;
    scene.add(moon);
    const rim = new THREE.DirectionalLight(0xff8fb0, 0.35);
    rim.position.set(8, 6, -8);
    scene.add(rim);
    this.moon = moon;

    // 星空
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(500 * 3);
    for (let k = 0; k < 500; k++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * 0.9 + 0.1, r = 60;
      starPos[k * 3] = Math.cos(a) * Math.cos(e) * r;
      starPos[k * 3 + 1] = Math.sin(e) * r;
      starPos[k * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.22, transparent: true, opacity: 0.8, fog: false }));
    scene.add(stars);
    this.stars = stars;

    // 遠景のビル群（シルエット）
    const farGroup = new THREE.Group();
    const winTex = createWindowTexture(Math.random, 6, 14, 0.35);
    const farMat = new THREE.MeshStandardMaterial({ color: 0x0f1733, roughness: 0.9, emissive: 0xffe3a0, emissiveMap: winTex, emissiveIntensity: 0.35 });
    for (let k = 0; k < 70; k++) {
      const a = (k / 70) * Math.PI * 2 + Math.random() * 0.08;
      const r = 13 + Math.random() * 9;
      const h = 2 + Math.random() * 7;
      const w = 1 + Math.random() * 1.6;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), farMat);
      m.position.set(Math.cos(a) * r, h / 2 - 0.5, Math.sin(a) * r);
      m.rotation.y = Math.random() * Math.PI;
      farGroup.add(m);
    }
    scene.add(farGroup);
    this.particles = new ParticleSystem(scene);
  }

  _initBoard() {
    const { map, emissive } = createBoardTextures(this.isSmall ? 1024 : 2048, this.rng);
    const boardMat = new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0.0, emissive: 0xffffff, emissiveMap: emissive, emissiveIntensity: 0.9 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(BOARD_HALF * 2, 0.16, BOARD_HALF * 2), [
      new THREE.MeshStandardMaterial({ color: 0x3b2f22, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: 0x3b2f22, roughness: 0.9 }),
      boardMat, new THREE.MeshStandardMaterial({ color: 0x1a1410 }),
      new THREE.MeshStandardMaterial({ color: 0x3b2f22, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: 0x3b2f22, roughness: 0.9 }),
    ]);
    board.position.y = -0.08;
    board.receiveShadow = true;
    this.scene.add(board);
    this.board = board;
    // テーブル（盤の下の床）
    const table = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: 0x0a0e1c, roughness: 1 }));
    table.rotation.x = -Math.PI / 2; table.position.y = -0.17; table.receiveShadow = true;
    this.scene.add(table);

    // 交差点（ハイライト + 当たり判定）
    const discGeo = new THREE.CircleGeometry(0.4, 40);
    const ringTex = createRingTexture();
    const hitGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.5, 12);
    for (let i = 0; i < NUM_INTERSECTIONS; i++) {
      const { x, z } = intersectionPos(i);
      const disc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      disc.rotation.x = -Math.PI / 2; disc.position.set(x, 0.015, z); disc.renderOrder = 3;
      const ring = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: ringTex, color: 0x7dd3fc, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.02, z); ring.renderOrder = 3;
      const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(x, 0.25, z);
      hit.userData.pick = { type: 'intersection', index: i };
      this.scene.add(disc, ring, hit);
      this.intersections.push({ disc, ring, hit, active: false, color: 0x7dd3fc });
    }

    // ビル
    this.heliportTex = createHeliportTexture();
    this.windowTextures = [];
    for (let k = 0; k < 5; k++) this.windowTextures.push(createWindowTexture(this.rng, 4, 9, 0.45 + k * 0.08));
    this.frameGeo = createFrameGeometry(0.66, 0.5);
    this.heatGeo = createFrameGeometry(0.5, 0.44);
    this.buildings = [];
    for (let b = 0; b < NUM_BUILDINGS; b++) this.buildings.push(null);
  }

  /** ビルの高さ配置を反映して25棟を作る（再生成可） */
  setHeights(heights) {
    for (let b = 0; b < NUM_BUILDINGS; b++) {
      const old = this.buildings[b];
      if (old) { this.scene.remove(old.group); }
      const tall = heights[b] === 'tall';
      const h = tall ? H_TALL : H_SHORT;
      const { x, z } = buildingPos(b);
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      const winTex = this.windowTextures[Math.floor(this.rng() * this.windowTextures.length)].clone();
      winTex.needsUpdate = true;
      winTex.repeat.set(1, tall ? 2 : 1);
      winTex.offset.set(this.rng(), 0);
      const mat = new THREE.MeshPhysicalMaterial({
        color: COLOR.building, roughness: 0.38, metalness: 0.08, clearcoat: 0.55, clearcoatRoughness: 0.35,
        emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.5,
      });
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(LOT_W, h, LOT_W, 3, 0.05), mat);
      mesh.position.y = h / 2;
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.pick = { type: 'building', index: b };
      group.add(mesh);
      // 縦のリブ（実物のビルの溝）
      const ribMat = new THREE.MeshStandardMaterial({ color: COLOR.buildingDark, roughness: 0.5, metalness: 0.1 });
      for (const [rx, rz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(rx ? 0.03 : 0.12, h * 0.86, rz ? 0.03 : 0.12), ribMat);
        rib.position.set(rx * (LOT_W / 2 + 0.005), h / 2, rz * (LOT_W / 2 + 0.005));
        group.add(rib);
      }
      // 屋上
      const roof = new THREE.Mesh(new RoundedBoxGeometry(LOT_W + 0.04, 0.08, LOT_W + 0.04, 2, 0.02), new THREE.MeshStandardMaterial({ color: COLOR.roof, roughness: 0.5, metalness: 0.1 }));
      roof.position.y = h + 0.02; roof.castShadow = true;
      group.add(roof);
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ map: this.heliportTex, transparent: true, opacity: 0.85, depthWrite: false }));
      pad.rotation.x = -Math.PI / 2; pad.position.y = h + 0.065;
      group.add(pad);
      // 下面（持ち上げた時に見える底）
      const base = new THREE.Mesh(new THREE.BoxGeometry(LOT_W, 0.06, LOT_W), new THREE.MeshStandardMaterial({ color: 0x0e1430, roughness: 0.8 }));
      base.position.y = 0.03;
      group.add(base);
      // 屋上マーカー（候補の目印: リング + 下向きの矢印）
      const marker = new THREE.Group();
      const mkMat = new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0, depthWrite: false });
      const mkRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 10, 40), mkMat);
      mkRing.rotation.x = Math.PI / 2;
      const mkArrow = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 16), mkMat);
      mkArrow.rotation.x = Math.PI; mkArrow.position.y = 0.28;
      marker.add(mkRing, mkArrow);
      marker.position.y = h + 0.42;
      marker.renderOrder = 8;
      group.add(marker);
      // 地面のハイライト枠（持ち上げには追従しない）
      const frame = new THREE.Mesh(this.frameGeo, new THREE.MeshBasicMaterial({ color: 0xffa94d, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      frame.position.set(x, 0.012, z); frame.renderOrder = 3;
      const heat = new THREE.Mesh(this.heatGeo, new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      heat.position.set(x, 0.011, z); heat.renderOrder = 2;
      this.scene.add(group, frame, heat);
      this.buildings[b] = { group, mesh, mat, roof, frame, heat, marker, mkMat, height: h, lift: 0, token: null, highlight: null, baseEmissive: 0.5 };
    }
  }

  _initHelis() {
    for (const h of HELIS) {
      const heli = createHelicopter(h.color);
      heli.visible = false;
      heli.position.y = HELI_ALT;
      heli.userData.hit.userData.pick = { type: 'heli', index: h.id };
      heli.userData.phase = Math.random() * Math.PI * 2;
      heli.userData.moving = false;
      this.scene.add(heli);
      this.helis.push(heli);
    }
  }

  _initCar() {
    this.car = createCar();
    this.car.visible = false;
    this.scene.add(this.car);
    this.strobeRed = new THREE.PointLight(0xff2030, 0, 6, 1.6);
    this.strobeBlue = new THREE.PointLight(0x2050ff, 0, 6, 1.6);
    this.scene.add(this.strobeRed, this.strobeBlue);
    this.strobe = null;
  }

  _initPost() {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.55, 0.82);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    this.composer = composer;
    this.bloomPass = bloom;
  }

  _initPointer() {
    const el = this.renderer.domElement;
    this.raycaster = new THREE.Raycaster();
    this._pd = null;
    el.addEventListener('pointerdown', (e) => { this._pd = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', (e) => {
      const pd = this._pd; this._pd = null;
      if (!pd) return;
      const d = Math.hypot(e.clientX - pd.x, e.clientY - pd.y);
      if (d > 10 || performance.now() - pd.t > 700) return;
      const hit = this._pick(e.clientX, e.clientY);
      if (hit) this.onTap(hit);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || this._pd) return;
      const hit = this._pick(e.clientX, e.clientY);
      const key = hit ? `${hit.type}:${hit.index}` : null;
      const prevKey = this.hover ? `${this.hover.type}:${this.hover.index}` : null;
      if (key !== prevKey) {
        this.hover = hit;
        el.style.cursor = hit ? 'pointer' : 'default';
        this.onHover(hit);
      }
    });
  }

  _pick(cx, cy) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const list = [];
    for (const i of this.pickable.intersections) list.push(this.intersections[i].hit);
    for (const b of this.pickable.buildings) if (this.buildings[b]) list.push(this.buildings[b].mesh);
    for (const h of this.pickable.helis) list.push(this.helis[h].userData.hit);
    if (!list.length) return null;
    const hits = this.raycaster.intersectObjects(list, false);
    if (!hits.length) return null;
    return hits[0].object.userData.pick;
  }

  // ----- 公開API: 選択・ハイライト -----
  setPickable({ intersections = [], buildings = [], helis = [] } = {}) {
    this.pickable = { intersections: new Set(intersections), buildings: new Set(buildings), helis: new Set(helis) };
    if (this.hover) { this.hover = null; this.renderer.domElement.style.cursor = 'default'; }
  }

  clearHighlights() {
    for (const it of this.intersections) it.active = false;
    for (const b of this.buildings) if (b) b.highlight = null;
    for (const h of this.helis) h.userData.selected = false;
  }

  highlightIntersections(list, hex = 0x7dd3fc) {
    for (const i of list) { const it = this.intersections[i]; it.active = true; it.color = hex; it.disc.material.color.set(hex); it.ring.material.color.set(hex); }
  }

  highlightBuildings(list, hex = 0xffa94d, mode = 'frame') {
    for (const b of list) { const bd = this.buildings[b]; if (!bd) continue; bd.highlight = { hex, mode }; bd.frame.material.color.set(hex); bd.mkMat.color.set(hex); }
  }

  setSelectedHeli(id) {
    for (const h of this.helis) h.userData.selected = false;
    if (id !== null && id !== undefined) this.helis[id].userData.selected = true;
  }

  /** 推理ヒート（0..1 の配列 or null） */
  setHeat(values) {
    for (let b = 0; b < NUM_BUILDINGS; b++) {
      const bd = this.buildings[b]; if (!bd) continue;
      const v = values ? values[b] : 0;
      bd.heatTarget = v;
    }
  }

  // ----- 公開API: ヘリ -----
  placeHeli(id, i, animate = true) {
    const heli = this.helis[id];
    const { x, z } = intersectionPos(i);
    heli.visible = true;
    heli.userData.cell = i;
    if (!animate) { heli.position.set(x, HELI_ALT, z); return Promise.resolve(); }
    heli.position.set(x, HELI_ALT + 6, z);
    heli.userData.body.rotation.set(0, 0, 0);
    return this.tweens.add(0.9, (t) => { heli.position.y = HELI_ALT + 6 * (1 - t); heli.userData.coneMat.uniforms.uIntensity.value = t; }, easeOutCubic);
  }

  moveHeli(id, i) {
    const heli = this.helis[id];
    const from = heli.position.clone();
    const { x, z } = intersectionPos(i);
    const to = new THREE.Vector3(x, HELI_ALT, z);
    const dir = to.clone().sub(from);
    heli.userData.cell = i;
    heli.userData.moving = true;
    const yaw = Math.atan2(dir.x, dir.z);
    const body = heli.userData.body;
    const startYaw = body.rotation.y;
    let dyaw = yaw - startYaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    return this.tweens.add(0.85, (t, raw) => {
      heli.position.lerpVectors(from, to, t);
      heli.position.y = HELI_ALT + Math.sin(raw * Math.PI) * 0.35;
      body.rotation.y = startYaw + dyaw * Math.min(1, raw * 3);
      body.rotation.x = Math.sin(raw * Math.PI) * 0.32; // 前傾
    }, easeInOut).then(() => { heli.userData.moving = false; body.rotation.x = 0; });
  }

  hideHelis() { for (const h of this.helis) h.visible = false; }

  // ----- 公開API: ビルの持ち上げ -----
  /**
   * ビルを持ち上げる。shift > 0 ならカメラ側へずらし少し傾けて、足元（ソケット）が上から見えるようにする
   */
  liftBuilding(b, height = LIFT_H, duration = 0.5, easing = easeOutCubic, shift = 0) {
    const bd = this.buildings[b];
    const { x, z } = buildingPos(b);
    const camDir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
    camDir.y = 0;
    if (camDir.lengthSq() < 1e-6) camDir.set(0, 0, 1);
    camDir.normalize();
    const axis = new THREE.Vector3(camDir.z, 0, -camDir.x).normalize();
    const from = { lift: bd.lift, sx: bd.sx || 0, sz: bd.sz || 0, tilt: bd.tilt || 0 };
    const to = { lift: height, sx: camDir.x * shift, sz: camDir.z * shift, tilt: shift > 0 ? -0.2 : 0 };
    if (shift > 0) bd.axis = axis;
    const ax = bd.axis || axis;
    return this.tweens.add(duration, (t) => {
      bd.lift = from.lift + (to.lift - from.lift) * t;
      bd.sx = from.sx + (to.sx - from.sx) * t;
      bd.sz = from.sz + (to.sz - from.sz) * t;
      bd.tilt = from.tilt + (to.tilt - from.tilt) * t;
      bd.group.position.set(x + bd.sx, bd.lift, z + bd.sz);
      bd.group.quaternion.setFromAxisAngle(ax, bd.tilt);
    }, easing);
  }

  lowerBuilding(b, duration = 0.4) {
    return this.liftBuilding(b, 0, duration, easeInCubic, 0).then(() => {
      const { x, z } = buildingPos(b);
      this.particles.emit({ x, y: 0.05, z, count: 10, color: 0x9aa3b5, speed: 0.6, up: 0.4, spread: 0.45, life: 0.5, size: 0.1, gravity: 0.2, drag: 0.9 });
    });
  }

  lowerAll(duration = 0.35) {
    const ps = [];
    for (let b = 0; b < NUM_BUILDINGS; b++) if (this.buildings[b] && this.buildings[b].lift > 0) ps.push(this.liftBuilding(b, 0, duration, easeInCubic, 0));
    return Promise.all(ps);
  }

  // ----- 公開API: 車 -----
  showCarAt(b, headlights = false) {
    const { x, z } = buildingPos(b);
    this.car.visible = true;
    this.car.position.set(x, 0.0, z);
    this.setHeadlights(headlights);
  }

  hideCar() { this.car.visible = false; this.setHeadlights(false); }

  setHeadlights(on) {
    const { headMat, glows } = this.car.userData;
    headMat.emissiveIntensity = on ? 3.5 : 0.4;
    for (const g of glows) g.material.opacity = on ? 0.9 : 0;
  }

  // ----- 公開API: 痕跡 -----
  _tokenLabel(color, round) {
    if (color === 'yellow') return '1';
    if (round && round !== 6) return String(round);
    return '!';
  }

  /** ビルの屋上に痕跡コマを置く（発見済みの表示） */
  placeTokenOnRoof(b, color, label = null, animateFrom = null) {
    const bd = this.buildings[b];
    if (bd.token) { bd.group.remove(bd.token); bd.token = null; }
    const token = createTraceToken(color, label || this._tokenLabel(color));
    token.position.set(0, bd.height + 0.11, 0);
    bd.group.add(token);
    bd.token = token;
    this.tokens.push(token);
    if (animateFrom) {
      const start = animateFrom.clone();
      const end = token.position.clone();
      bd.group.worldToLocal(start);
      return this.tweens.add(0.65, (t, raw) => {
        token.position.lerpVectors(start, end, t);
        token.position.y += Math.sin(raw * Math.PI) * 0.9;
        token.rotation.x = raw * Math.PI * 2;
        token.rotation.y = raw * Math.PI;
      }, easeInOut).then(() => { token.rotation.set(0, 0, 0); });
    }
    return Promise.resolve();
  }

  clearTokens() {
    for (const bd of this.buildings) if (bd && bd.token) { bd.group.remove(bd.token); bd.token = null; }
    this.tokens = [];
    this.clearRoute();
  }

  /** 犯人フェーズ用: 通った場所のマーカー（犯人本人だけが見る） */
  showPathMarkers(path) {
    this.clearPathMarkers();
    path.forEach((b, k) => {
      const color = k === 0 ? 'yellow' : k === 5 ? 'red' : 'blue';
      const { x, z } = buildingPos(b);
      const sp = createLabelSprite(String(k + 1), TRACE_CSS[color], color === 'yellow' ? '#222' : '#fff');
      const bd = this.buildings[b];
      sp.position.set(x, bd.height + 0.45, z);
      sp.scale.set(0.42, 0.42, 1);
      this.scene.add(sp);
      this.pathMarkers.push(sp);
    });
  }

  clearPathMarkers() {
    for (const sp of this.pathMarkers) this.scene.remove(sp);
    this.pathMarkers = [];
  }

  // ----- 演出シーケンス -----
  /** 捜索: ビルを持ち上げて中を確認する */
  async animateSearch({ heliId, building, result, color, onLower = null }) {
    const heli = this.helis[heliId];
    const { x, z } = buildingPos(building);
    const bd = this.buildings[building];
    const coneU = heli.userData.coneMat.uniforms.uIntensity;
    this.tweens.add(0.3, (t) => { coneU.value = 1 + t * 1.3; });
    heli.userData.spot.intensity = 60;
    await this.liftBuilding(building, LIFT_H, 0.55, easeOutBack, 0.95);
    this.particles.emit({ x, y: 0.06, z, count: 14, color: 0xb8c0d0, speed: 0.8, up: 0.5, spread: 0.5, life: 0.6, size: 0.12, gravity: 0.3, drag: 0.9 });
    if (result === 'trace') {
      const token = createTraceToken(color, this._tokenLabel(color));
      token.position.set(x, 0.03, z);
      token.scale.setScalar(0.01);
      this.scene.add(token);
      await this.tweens.add(0.35, (t) => { token.scale.setScalar(0.01 + 0.99 * t); token.rotation.y = t * Math.PI * 2; }, easeOutBack);
      this.particles.emit({ x, y: 0.2, z, count: 40, color: TRACE_HEX[color], speed: 1.6, up: 1.2, spread: 0.2, life: 0.9, size: 0.1, gravity: 0.6, drag: 0.94 });
      await wait(550);
      const worldStart = token.position.clone();
      this.scene.remove(token);
      await this.placeTokenOnRoof(building, color, null, worldStart);
      this.particles.emit({ x, y: bd.height + LIFT_H + 0.2, z, count: 24, color: TRACE_HEX[color], speed: 1.2, up: 0.8, spread: 0.15, life: 0.7, size: 0.08, gravity: 0.4, drag: 0.93 });
      await wait(250);
    } else if (result === 'car') {
      this.showCarAt(building, false);
      this.car.rotation.y = 0;
      await wait(250);
      this.setHeadlights(true);
      this.particles.emit({ x, y: 0.2, z, count: 50, colors: [0xff3b3b, 0x3b6bff, 0xffffff], speed: 2.2, up: 1.5, spread: 0.25, life: 1.2, size: 0.12, gravity: 0.8, drag: 0.95 });
      this.startStrobe(building);
      this.shake = 0.6;
      await wait(900);
      // 逮捕: ビルは持ち上げたまま（結果画面へ）
      this.tweens.add(0.4, (t) => { coneU.value = 2.3 - t * 1.3; });
      heli.userData.spot.intensity = 28;
      return;
    } else {
      await wait(520);
    }
    this.tweens.add(0.4, (t) => { coneU.value = 2.3 - t * 1.3; });
    heli.userData.spot.intensity = 28;
    if (onLower) onLower();
    await this.lowerBuilding(building, 0.4);
  }

  /** 犯人の移動（犯人本人が見る演出） */
  async animateThiefMove({ from, to, color, round }) {
    const toP = buildingPos(to);
    if (from === null || from === undefined) {
      // 1ラウンド目: 盤の外から走ってくる
      const r = bRow(to), c = bCol(to);
      const edge = Math.min(r, c, GRID - 1 - r, GRID - 1 - c);
      let sx = toP.x, sz = toP.z;
      if (edge === r) sz = -BOARD_HALF - 1.5; else if (edge === GRID - 1 - r) sz = BOARD_HALF + 1.5; else if (edge === c) sx = -BOARD_HALF - 1.5; else sx = BOARD_HALF + 1.5;
      this.car.visible = true;
      this.car.position.set(sx, 0, sz);
      this.car.rotation.y = Math.atan2(toP.x - sx, toP.z - sz) + Math.PI;
      this.setHeadlights(true);
      const lift = this.liftBuilding(to, 1.2, 0.45, easeOutCubic, 0.95);
      await this.tweens.add(0.9, (t) => {
        this.car.position.x = sx + (toP.x - sx) * t;
        this.car.position.z = sz + (toP.z - sz) * t;
      }, easeInOut);
      await lift;
      this.setHeadlights(false);
      await wait(200);
      await this.lowerBuilding(to, 0.4);
      return;
    }
    const fromP = buildingPos(from);
    await Promise.all([this.liftBuilding(from, 1.2, 0.4, easeOutCubic, 0.95), this.liftBuilding(to, 1.2, 0.4, easeOutCubic, 0.95)]);
    // 出発地に痕跡コマを残す（持ち上げている間だけ見える）
    const prevColor = round - 1 === 1 ? 'yellow' : round - 1 === 6 ? 'red' : 'blue';
    const token = createTraceToken(prevColor, this._tokenLabel(prevColor, round - 1));
    token.position.set(fromP.x, 0.03, fromP.z);
    this.scene.add(token);
    this.car.visible = true;
    this.car.position.set(fromP.x, 0, fromP.z);
    this.car.rotation.y = Math.atan2(toP.x - fromP.x, toP.z - fromP.z) + Math.PI;
    this.setHeadlights(true);
    await this.tweens.add(0.6, (t, raw) => {
      this.car.position.x = fromP.x + (toP.x - fromP.x) * t;
      this.car.position.z = fromP.z + (toP.z - fromP.z) * t;
      this.car.position.y = Math.abs(Math.sin(raw * Math.PI * 3)) * 0.02;
    }, easeInOut);
    this.particles.emit({ x: toP.x, y: 0.05, z: toP.z, count: 10, color: 0x9aa3b5, speed: 0.5, up: 0.3, spread: 0.3, life: 0.5, size: 0.08, gravity: 0.2, drag: 0.9 });
    this.setHeadlights(false);
    await wait(220);
    await Promise.all([this.lowerBuilding(from, 0.4), this.lowerBuilding(to, 0.4)]);
    this.scene.remove(token);
    this.car.position.y = 0;
  }

  /** 犯人フェーズの表示: 今いるビルを少し持ち上げて車を見せる */
  async showThiefPosition(b) {
    this.showCarAt(b, false);
    await this.liftBuilding(b, 1.2, 0.45, easeOutCubic, 0.95);
  }

  async hideThiefPosition() {
    await this.lowerAll(0.35);
    this.hideCar();
  }

  startStrobe(b) {
    const { x, z } = buildingPos(b);
    this.strobeRed.position.set(x - 0.6, 1.6, z);
    this.strobeBlue.position.set(x + 0.6, 1.6, z);
    this.strobe = { t: 0 };
  }

  stopStrobe() { this.strobe = null; this.strobeRed.intensity = 0; this.strobeBlue.intensity = 0; }

  /** 逃走成功: 車がヘッドライトを点けて街から走り去る */
  async animateEscape(b) {
    const { x, z } = buildingPos(b);
    await this.liftBuilding(b, LIFT_H, 0.5, easeOutBack, 0.95);
    this.showCarAt(b, false);
    await wait(300);
    this.setHeadlights(true);
    const r = bRow(b), c = bCol(b);
    const dists = [r, GRID - 1 - c, GRID - 1 - r, c]; // 上 右 下 左
    const dirIdx = dists.indexOf(Math.min(...dists));
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const [dx, dz] = dirs[dirIdx];
    const ex = x + dx * (BOARD_HALF + 4), ez = z + dz * (BOARD_HALF + 4);
    this.car.rotation.y = Math.atan2(dx, dz) + Math.PI;
    await wait(250);
    this.particles.emit({ x, y: 0.05, z, count: 30, color: 0xffffff, speed: 1.5, up: 0.4, spread: 0.25, life: 0.6, size: 0.1, gravity: 0.3, drag: 0.92 });
    await this.tweens.add(1.3, (t) => {
      this.car.position.x = x + (ex - x) * t;
      this.car.position.z = z + (ez - z) * t;
      if (t > 0.1 && Math.random() < 0.7) this.particles.emit({ x: this.car.position.x, y: 0.1, z: this.car.position.z, count: 2, color: 0xff5a5a, speed: 0.2, up: 0.1, spread: 0.08, life: 0.5, size: 0.14 });
    }, easeInCubic);
    this.hideCar();
  }

  /** 逃走経路の公開（全ビルを持ち上げてコマと線を見せる） */
  async revealRoute(path) {
    this.clearRoute();
    const pts = [];
    for (let k = 0; k < path.length; k++) {
      const b = path[k];
      const color = k === 0 ? 'yellow' : k === 5 ? 'red' : 'blue';
      const { x, z } = buildingPos(b);
      pts.push(new THREE.Vector3(x, 0.07, z));
      this.liftBuilding(b, 1.0, 0.4);
      const bd = this.buildings[b];
      if (!bd.token) this.placeTokenOnRoof(b, color, String(k + 1));
      const sp = createLabelSprite(String(k + 1), TRACE_CSS[color], color === 'yellow' ? '#222' : '#fff');
      sp.position.set(x, bd.height + 1.0 + 0.5, z);
      sp.scale.set(0.46, 0.46, 1);
      this.scene.add(sp);
      this.routeObjects.push(sp);
      await wait(140);
    }
    if (pts.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 8, 0.045, 8, false), new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      tube.renderOrder = 7;
      this.scene.add(tube);
      this.routeObjects.push(tube);
    }
  }

  clearRoute() {
    for (const o of this.routeObjects) this.scene.remove(o);
    this.routeObjects = [];
  }

  /** 盤面を初期状態へ */
  resetBoard() {
    this.tweens.clear();
    this.stopStrobe();
    this.clearTokens();
    this.clearPathMarkers();
    this.clearHighlights();
    this.setPickable({});
    this.hideCar();
    for (const bd of this.buildings) if (bd) { bd.lift = 0; bd.sx = 0; bd.sz = 0; bd.tilt = 0; bd.group.position.y = 0; bd.group.position.x = buildingPos(this.buildings.indexOf(bd)).x; bd.group.position.z = buildingPos(this.buildings.indexOf(bd)).z; bd.group.quaternion.identity(); bd.heatTarget = 0; }
    for (const h of this.helis) { h.visible = false; h.userData.cell = null; h.userData.coneMat.uniforms.uIntensity.value = 1; h.userData.spot.intensity = 28; }
  }

  // ----- カメラ -----
  /** 画面サイズに応じたカメラ距離（盤全体が収まる距離） */
  _fitDistance() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const aspect = w / Math.max(1, h);
    let d = 11.5;
    if (aspect < 1) d = 12.5;
    else if (h < 560) d = 11.5 * Math.min(1.45, 560 / h);
    return d;
  }

  _playTarget() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const aspect = w / Math.max(1, h);
    return new THREE.Vector3(0, 0.2, aspect < 1 ? -1.1 : 0.1);
  }

  setTitleMode(on) {
    this.titleMode = on;
    this.controls.autoRotate = on;
    this.controls.enabled = !on;
    if (on) {
      this.controls.target.set(0, 0.3, 0);
      this._flyTo(new THREE.Vector3(7, 7.5, 9.5), 1.2);
    } else {
      this.resize();
      const dist = this._fitDistance();
      const tg = this._playTarget();
      this.controls.target.copy(tg);
      this._flyTo(new THREE.Vector3(tg.x, tg.y + dist * 0.78, tg.z + dist * 0.72), 1.1);
    }
  }

  _flyTo(pos, duration) {
    const from = this.camera.position.clone();
    return this.tweens.add(duration, (t) => { this.camera.position.lerpVectors(from, pos, t); }, easeInOut);
  }

  /** 指定ビルの方へカメラのターゲットを寄せる（控えめ） */
  focusBuilding(b, strength = 0.35) {
    const { x, z } = buildingPos(b);
    const from = this.controls.target.clone();
    const base = this._playTarget();
    const to = new THREE.Vector3(base.x + x * strength, 0.2, base.z + z * strength);
    return this.tweens.add(0.6, (t) => { this.controls.target.lerpVectors(from, to, t); }, easeInOut);
  }

  resetFocus() {
    const from = this.controls.target.clone();
    const to = this._playTarget();
    return this.tweens.add(0.6, (t) => { this.controls.target.lerpVectors(from, to, t); }, easeInOut);
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const aspect = w / Math.max(1, h);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.composer.setSize(w, h);
    this.camera.aspect = aspect;
    const baseFov = 46;
    if (aspect >= 1) this.camera.fov = baseFov;
    else this.camera.fov = Math.min(95, (2 * Math.atan(Math.tan((baseFov * Math.PI) / 360) / aspect) * 180) / Math.PI);
    this.camera.updateProjectionMatrix();
    if (!this.titleMode) {
      // 回転/リサイズ時は盤全体が収まる距離に合わせ直す
      const tg = this._playTarget();
      this.controls.target.copy(tg);
      const d = this._fitDistance();
      this.controls.maxDistance = Math.max(22, d + 3);
      const dir = this.camera.position.clone().sub(tg);
      if (dir.lengthSq() > 1e-6) { dir.normalize(); this.camera.position.copy(tg).add(dir.multiplyScalar(d)); }
    }
  }

  setBloom(on) {
    this.bloomUser = on;
    this.bloomEnabled = on;
  }

  // ----- ループ -----
  _loop() {
    this._raf = requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    const t = this.time;
    this.tweens.update();
    this.controls.update();

    // ヘリ
    for (const heli of this.helis) {
      if (!heli.visible) continue;
      const u = heli.userData;
      u.rotor.rotation.y += dt * 26;
      u.tailRotor.rotation.x += dt * 40;
      u.body.position.y = Math.sin(t * 2.1 + u.phase) * 0.05 + (u.selected ? 0.25 : 0);
      if (!u.moving) u.body.rotation.z = Math.sin(t * 1.3 + u.phase) * 0.03;
      u.beacon.material.emissiveIntensity = (Math.sin(t * 6 + u.phase) > 0.6 ? 4 : 0.3);
      u.coneMat.uniforms.uTime.value = t;
      u.pool.material.opacity = 0.42 + Math.sin(t * 3 + u.phase) * 0.06 + (u.selected ? 0.25 : 0);
      const targetRing = u.selected ? 0.9 : 0;
      u.ring.material.opacity += (targetRing - u.ring.material.opacity) * Math.min(1, dt * 8);
      if (u.selected) u.ring.rotation.z += dt * 1.5;
      u.cone.scale.setScalar(u.selected ? 1.08 : 1);
    }

    // 交差点ハイライト
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    for (let i = 0; i < this.intersections.length; i++) {
      const it = this.intersections[i];
      const hovered = this.hover && this.hover.type === 'intersection' && this.hover.index === i;
      const target = it.active ? (hovered ? 0.95 : 0.45 + pulse * 0.3) : 0;
      it.disc.material.opacity += (target - it.disc.material.opacity) * Math.min(1, dt * 10);
      it.ring.material.opacity = it.disc.material.opacity;
      it.ring.rotation.z += dt * (it.active ? 0.8 : 0);
      const s = it.active ? 1 + pulse * 0.08 : 1;
      it.ring.scale.set(s, s, 1);
    }

    // ビル: ハイライト枠・発光・ヒート
    for (let b = 0; b < this.buildings.length; b++) {
      const bd = this.buildings[b];
      if (!bd) continue;
      const hovered = this.hover && this.hover.type === 'building' && this.hover.index === b;
      const hl = bd.highlight;
      const targetFrame = hl ? (hovered ? 1 : 0.5 + pulse * 0.35) : 0;
      bd.frame.material.opacity += (targetFrame - bd.frame.material.opacity) * Math.min(1, dt * 10);
      const mkTarget = hl ? (hovered ? 1 : 0.75 + pulse * 0.25) : 0;
      bd.mkMat.opacity += (mkTarget - bd.mkMat.opacity) * Math.min(1, dt * 10);
      bd.marker.visible = bd.mkMat.opacity > 0.02;
      bd.marker.position.y = bd.height + 0.42 + Math.sin(t * 3.2 + b) * 0.07;
      bd.marker.rotation.y = t * 1.2;
      const targetEm = hl ? (hovered ? 1.5 : 0.9 + pulse * 0.25) : bd.baseEmissive;
      bd.mat.emissiveIntensity += (targetEm - bd.mat.emissiveIntensity) * Math.min(1, dt * 8);
      if (hl) bd.mat.emissive.set(0xffffff).lerp(new THREE.Color(hl.hex), 0.35); else bd.mat.emissive.set(0xffffff);
      const heatT = bd.heatTarget || 0;
      const heatOp = heatT > 0.001 ? Math.min(0.95, 0.15 + heatT * 1.1) : 0;
      bd.heat.material.opacity += (heatOp - bd.heat.material.opacity) * Math.min(1, dt * 6);
      if (heatT > 0.001) bd.heat.material.color.setHSL(0.12 - Math.min(0.12, heatT * 0.25), 1, 0.55);
    }

    // 車の足元の光
    if (this.car.visible) this.car.userData.floor.material.opacity = 0.45 + Math.sin(t * 5) * 0.15;

    // ストロボ（逮捕）
    if (this.strobe) {
      this.strobe.t += dt;
      const phase = Math.floor(this.strobe.t * 7) % 2;
      this.strobeRed.intensity = phase === 0 ? 45 : 0;
      this.strobeBlue.intensity = phase === 1 ? 45 : 0;
    }

    // 星のまたたき
    this.stars.material.opacity = 0.7 + Math.sin(t * 0.8) * 0.1;

    this.particles.update(dt);

    // カメラシェイク
    if (this.shake > 0.001) {
      this.shake *= Math.pow(0.02, dt);
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.25;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.25;
    }

    const t0 = performance.now();
    if (this.bloomEnabled) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    // 重い端末ではブルームを自動オフ
    if (this.bloomEnabled && this.bloomUser) {
      this.frameTimes.push(performance.now() - t0 + dt * 1000 * 0.0);
      if (this.frameTimes.length > 90) {
        const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        this.frameTimes = [];
        if (avg > 34 && dt > 0.04) { this.bloomEnabled = false; }
      }
    }
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    this.renderer.dispose();
  }
}
