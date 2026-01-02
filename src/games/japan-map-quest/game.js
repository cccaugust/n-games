// 日本マップクエスト（最小実装）
// - タイル移動（矢印/WASD & スマホDパッド）
// - 「いま何県？」表示（ざっくり座標ベース）
// - ミッション（例: 奈良県へ行け）
// - 海の時は船っぽい見た目
// - ミニマップ

const worldCanvas = document.getElementById('worldCanvas');
const worldCtx = worldCanvas.getContext('2d');
const miniCanvas = document.getElementById('miniCanvas');
const miniCtx = miniCanvas.getContext('2d');

const currentPrefEl = document.getElementById('currentPref');
const currentTerrainEl = document.getElementById('currentTerrain');
const missionTextEl = document.getElementById('missionText');
const missionStatusEl = document.getElementById('missionStatus');
const toastEl = document.getElementById('toast');

const newMissionBtn = document.getElementById('newMissionBtn');
const resetBtn = document.getElementById('resetBtn');
const controls = document.getElementById('controls');

// ---- マップ設定 ----
const MAP_W = 100;
const MAP_H = 80;

const TILE = 16; // 描画用のタイルサイズ（論理座標）
const VIEW_COLS = 21;
const VIEW_ROWS = 15;
const LOGICAL_W = VIEW_COLS * TILE;
const LOGICAL_H = VIEW_ROWS * TILE;

// 日本のシルエット（ざっくり：楕円を重ねる）
const LAND_BLOBS = [
  // Hokkaido
  { cx: 76, cy: 12, rx: 12, ry: 9 },
  // Tohoku
  { cx: 70, cy: 26, rx: 14, ry: 10 },
  // Kanto/Chubu
  { cx: 68, cy: 42, rx: 18, ry: 11 },
  // Kansai/Chugoku
  { cx: 56, cy: 50, rx: 18, ry: 9 },
  // Shikoku
  { cx: 58, cy: 60, rx: 10, ry: 4 },
  // Kyushu
  { cx: 42, cy: 64, rx: 12, ry: 10 },
  // Okinawa
  { cx: 26, cy: 76, rx: 4, ry: 2 }
];

function inEllipse(x, y, b) {
  const dx = (x - b.cx) / b.rx;
  const dy = (y - b.cy) / b.ry;
  return dx * dx + dy * dy <= 1;
}

function isLand(x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
  return LAND_BLOBS.some(b => inEllipse(x, y, b));
}

// 県判定（ざっくり：バウンディングボックス）
// NOTE: 現状は「だいたいの位置」で判定。精度を上げたい場合は、
// - タイルごとの県IDマップ（2D配列）に差し替える
// - GeoJSON + 投影 + point-in-polygon にする
// などに発展できる。
const PREF_ZONES = [
  // 北海道
  { name: '北海道', x0: 64, x1: 90, y0: 2, y1: 20, cx: 76, cy: 12 },

  // 東北
  { name: '青森県', x0: 64, x1: 78, y0: 18, y1: 24, cx: 71, cy: 21 },
  { name: '秋田県', x0: 60, x1: 68, y0: 22, y1: 32, cx: 64, cy: 27 },
  { name: '岩手県', x0: 68, x1: 78, y0: 22, y1: 32, cx: 73, cy: 27 },
  { name: '山形県', x0: 60, x1: 68, y0: 32, y1: 38, cx: 64, cy: 35 },
  { name: '宮城県', x0: 68, x1: 78, y0: 32, y1: 38, cx: 73, cy: 35 },
  { name: '福島県', x0: 62, x1: 78, y0: 38, y1: 44, cx: 70, cy: 41 },

  // 関東
  { name: '茨城県', x0: 74, x1: 82, y0: 40, y1: 48, cx: 78, cy: 44 },
  { name: '栃木県', x0: 70, x1: 76, y0: 40, y1: 46, cx: 73, cy: 43 },
  { name: '群馬県', x0: 66, x1: 70, y0: 40, y1: 46, cx: 68, cy: 43 },
  { name: '埼玉県', x0: 66, x1: 74, y0: 46, y1: 50, cx: 70, cy: 48 },
  { name: '千葉県', x0: 74, x1: 84, y0: 48, y1: 56, cx: 79, cy: 52 },
  { name: '東京都', x0: 66, x1: 74, y0: 50, y1: 54, cx: 70, cy: 52 },
  { name: '神奈川県', x0: 66, x1: 74, y0: 54, y1: 58, cx: 70, cy: 56 },

  // 中部（だいたい）
  { name: '新潟県', x0: 60, x1: 72, y0: 34, y1: 40, cx: 66, cy: 37 },
  { name: '富山県', x0: 56, x1: 60, y0: 40, y1: 44, cx: 58, cy: 42 },
  { name: '石川県', x0: 52, x1: 58, y0: 38, y1: 44, cx: 55, cy: 41 },
  { name: '福井県', x0: 52, x1: 58, y0: 44, y1: 48, cx: 55, cy: 46 },
  { name: '山梨県', x0: 64, x1: 68, y0: 52, y1: 56, cx: 66, cy: 54 },
  { name: '長野県', x0: 58, x1: 66, y0: 44, y1: 52, cx: 62, cy: 48 },
  { name: '岐阜県', x0: 56, x1: 62, y0: 52, y1: 56, cx: 59, cy: 54 },
  { name: '静岡県', x0: 68, x1: 78, y0: 56, y1: 60, cx: 73, cy: 58 },
  { name: '愛知県', x0: 62, x1: 70, y0: 56, y1: 60, cx: 66, cy: 58 },

  // 近畿
  { name: '三重県', x0: 62, x1: 68, y0: 60, y1: 66, cx: 65, cy: 63 },
  { name: '滋賀県', x0: 58, x1: 62, y0: 56, y1: 60, cx: 60, cy: 58 },
  { name: '京都府', x0: 54, x1: 58, y0: 56, y1: 60, cx: 56, cy: 58 },
  { name: '大阪府', x0: 54, x1: 58, y0: 60, y1: 64, cx: 56, cy: 62 },
  { name: '奈良県', x0: 58, x1: 62, y0: 60, y1: 66, cx: 60, cy: 63 },
  { name: '和歌山県', x0: 54, x1: 62, y0: 66, y1: 72, cx: 58, cy: 69 },
  { name: '兵庫県', x0: 48, x1: 54, y0: 56, y1: 64, cx: 51, cy: 60 },

  // 中国
  { name: '鳥取県', x0: 46, x1: 52, y0: 54, y1: 58, cx: 49, cy: 56 },
  { name: '島根県', x0: 38, x1: 46, y0: 52, y1: 58, cx: 42, cy: 55 },
  { name: '岡山県', x0: 46, x1: 52, y0: 58, y1: 62, cx: 49, cy: 60 },
  { name: '広島県', x0: 38, x1: 46, y0: 58, y1: 62, cx: 42, cy: 60 },
  { name: '山口県', x0: 30, x1: 38, y0: 56, y1: 62, cx: 34, cy: 59 },

  // 四国
  { name: '香川県', x0: 54, x1: 62, y0: 58, y1: 60, cx: 58, cy: 59 },
  { name: '徳島県', x0: 62, x1: 66, y0: 60, y1: 64, cx: 64, cy: 62 },
  { name: '愛媛県', x0: 50, x1: 58, y0: 60, y1: 66, cx: 54, cy: 63 },
  { name: '高知県', x0: 56, x1: 66, y0: 64, y1: 70, cx: 61, cy: 67 },

  // 九州
  { name: '福岡県', x0: 36, x1: 44, y0: 56, y1: 60, cx: 40, cy: 58 },
  { name: '佐賀県', x0: 34, x1: 36, y0: 58, y1: 62, cx: 35, cy: 60 },
  { name: '長崎県', x0: 28, x1: 34, y0: 58, y1: 64, cx: 31, cy: 61 },
  { name: '大分県', x0: 44, x1: 48, y0: 58, y1: 64, cx: 46, cy: 61 },
  { name: '熊本県', x0: 34, x1: 44, y0: 62, y1: 68, cx: 39, cy: 65 },
  { name: '宮崎県', x0: 44, x1: 50, y0: 66, y1: 74, cx: 47, cy: 70 },
  { name: '鹿児島県', x0: 34, x1: 46, y0: 68, y1: 78, cx: 40, cy: 73 },

  // 沖縄
  { name: '沖縄県', x0: 20, x1: 32, y0: 72, y1: 80, cx: 26, cy: 76 }
];

function getPrefectureAt(x, y) {
  if (!isLand(x, y)) return null;
  const zone = PREF_ZONES.find(z => x >= z.x0 && x < z.x1 && y >= z.y0 && y < z.y1);
  return zone?.name ?? '？？県';
}

// ミッション用：各県の代表タイル（マップ上での目印）
const prefRepTile = new Map();
function buildRepresentativeTiles() {
  for (const z of PREF_ZONES) {
    let found = null;
    // まず中心から探す（近いところを優先）
    const candidates = [];
    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        candidates.push([z.cx + dx, z.cy + dy]);
      }
    }
    // 次にボックス内スキャン（保険）
    for (let yy = z.y0; yy < z.y1; yy++) {
      for (let xx = z.x0; xx < z.x1; xx++) {
        candidates.push([xx, yy]);
      }
    }
    for (const [xx, yy] of candidates) {
      if (isLand(xx, yy) && getPrefectureAt(xx, yy) === z.name) {
        found = { x: xx, y: yy };
        break;
      }
    }
    if (found) prefRepTile.set(z.name, found);
  }
}

function hashToHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}

function colorForPref(prefName) {
  const hue = hashToHue(prefName);
  // 子ども向けに明るめ
  return `hsl(${hue} 65% 62%)`;
}

// ---- ゲーム状態 ----
const player = { x: 70, y: 52 }; // だいたい東京
let targetPref = '奈良県';
let targetTile = { x: 60, y: 63 };

function setTarget(prefName) {
  targetPref = prefName;
  targetTile = prefRepTile.get(prefName) ?? targetTile;
  missionTextEl.textContent = `「${targetPref}」へ行け！`;
  missionStatusEl.textContent = '';
}

function pickRandomMission() {
  const candidates = Array.from(prefRepTile.keys());
  if (candidates.length === 0) return;
  // いまいる県と同じになりにくくする
  const current = getPrefectureAt(player.x, player.y);
  const pool = candidates.filter(p => p !== current);
  const list = pool.length ? pool : candidates;
  setTarget(list[Math.floor(Math.random() * list.length)]);
}

function resetToTokyo() {
  const tokyo = prefRepTile.get('東京都');
  if (tokyo) {
    player.x = tokyo.x;
    player.y = tokyo.y;
  } else {
    player.x = 70;
    player.y = 52;
  }
  showToast('東京にもどった！');
  updateHud();
}

// ---- 描画（ミニマップはベースをキャッシュ）----
const miniBase = document.createElement('canvas');
const miniBaseCtx = miniBase.getContext('2d');
const MINI_W = 200;
const MINI_H = 160;

function renderMiniBase() {
  miniBase.width = MINI_W;
  miniBase.height = MINI_H;
  miniBaseCtx.clearRect(0, 0, MINI_W, MINI_H);

  // 背景（海）
  miniBaseCtx.fillStyle = '#0b4f6c';
  miniBaseCtx.fillRect(0, 0, MINI_W, MINI_H);

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!isLand(x, y)) continue;
      const pref = getPrefectureAt(x, y) ?? '？？県';
      miniBaseCtx.fillStyle = colorForPref(pref);
      const px = Math.floor((x / MAP_W) * MINI_W);
      const py = Math.floor((y / MAP_H) * MINI_H);
      // 1pxだと見えにくいので 2px 最低確保
      miniBaseCtx.fillRect(px, py, 2, 2);
    }
  }
}

function drawMini() {
  miniCtx.clearRect(0, 0, MINI_W, MINI_H);
  miniCtx.drawImage(miniBase, 0, 0);

  const playerPx = (player.x / MAP_W) * MINI_W;
  const playerPy = (player.y / MAP_H) * MINI_H;
  const targetPx = (targetTile.x / MAP_W) * MINI_W;
  const targetPy = (targetTile.y / MAP_H) * MINI_H;

  // 目的地
  miniCtx.fillStyle = '#ff7675';
  miniCtx.beginPath();
  miniCtx.arc(targetPx, targetPy, 4, 0, Math.PI * 2);
  miniCtx.fill();

  // プレイヤー
  miniCtx.fillStyle = '#ffeaa7';
  miniCtx.beginPath();
  miniCtx.arc(playerPx, playerPy, 4, 0, Math.PI * 2);
  miniCtx.fill();
}

function drawWorld() {
  // カメラ
  const camX = player.x - Math.floor(VIEW_COLS / 2);
  const camY = player.y - Math.floor(VIEW_ROWS / 2);

  // 背景
  worldCtx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);

  for (let vy = 0; vy < VIEW_ROWS; vy++) {
    for (let vx = 0; vx < VIEW_COLS; vx++) {
      const mx = camX + vx;
      const my = camY + vy;
      const sx = vx * TILE;
      const sy = vy * TILE;

      const land = isLand(mx, my);
      if (!land) {
        worldCtx.fillStyle = '#0b4f6c';
        worldCtx.fillRect(sx, sy, TILE, TILE);
        continue;
      }
      const pref = getPrefectureAt(mx, my) ?? '？？県';
      worldCtx.fillStyle = colorForPref(pref);
      worldCtx.fillRect(sx, sy, TILE, TILE);

      // タイル境界（うっすら）
      worldCtx.strokeStyle = 'rgba(0,0,0,0.08)';
      worldCtx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
    }
  }

  // 目的地マーカー（画面内だけ）
  const tx = targetTile.x - camX;
  const ty = targetTile.y - camY;
  if (tx >= 0 && ty >= 0 && tx < VIEW_COLS && ty < VIEW_ROWS) {
    const cx = tx * TILE + TILE / 2;
    const cy = ty * TILE + TILE / 2;
    worldCtx.fillStyle = 'rgba(255, 118, 117, 0.9)';
    worldCtx.beginPath();
    worldCtx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    worldCtx.fill();
  }

  // プレイヤー
  const px = (player.x - camX) * TILE + TILE / 2;
  const py = (player.y - camY) * TILE + TILE / 2;
  const onSea = !isLand(player.x, player.y);

  if (onSea) drawBoat(px, py);
  else drawHero(px, py);
}

function drawHero(cx, cy) {
  // かんたん勇者（ドット風）
  worldCtx.fillStyle = '#2d3436';
  worldCtx.fillRect(cx - 5, cy - 7, 10, 14);
  worldCtx.fillStyle = '#ffeaa7';
  worldCtx.fillRect(cx - 4, cy - 6, 8, 6); // 顔
  worldCtx.fillStyle = '#6c5ce7';
  worldCtx.fillRect(cx - 4, cy, 8, 7); // 体
}

function drawBoat(cx, cy) {
  // かんたん船
  worldCtx.fillStyle = '#d35400';
  worldCtx.beginPath();
  worldCtx.moveTo(cx - 7, cy + 4);
  worldCtx.lineTo(cx + 7, cy + 4);
  worldCtx.lineTo(cx + 4, cy + 8);
  worldCtx.lineTo(cx - 4, cy + 8);
  worldCtx.closePath();
  worldCtx.fill();

  worldCtx.strokeStyle = '#2d3436';
  worldCtx.lineWidth = 2;
  worldCtx.beginPath();
  worldCtx.moveTo(cx, cy - 8);
  worldCtx.lineTo(cx, cy + 4);
  worldCtx.stroke();

  worldCtx.fillStyle = '#ecf0f1';
  worldCtx.beginPath();
  worldCtx.moveTo(cx, cy - 8);
  worldCtx.lineTo(cx + 8, cy - 2);
  worldCtx.lineTo(cx, cy - 2);
  worldCtx.closePath();
  worldCtx.fill();
}

// ---- UI/HUD ----
let toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-show');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.classList.remove('is-show');
  }, 1500);
}

function updateHud() {
  const pref = getPrefectureAt(player.x, player.y);
  const onLand = !!pref && pref !== null;
  currentPrefEl.textContent = pref ?? '海の上';
  currentTerrainEl.textContent = onLand ? '陸（あるける）' : '海（船）';

  const cleared = pref === targetPref;
  missionStatusEl.textContent = cleared ? '✅ クリア！' : '';
  if (cleared) {
    showToast(`${targetPref} に とうちゃく！`);
    window.setTimeout(() => pickRandomMission(), 300);
  }
}

// ---- 入力 ----
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function moveBy(dx, dy) {
  player.x = clamp(player.x + dx, 0, MAP_W - 1);
  player.y = clamp(player.y + dy, 0, MAP_H - 1);
  updateHud();
}

function dirToDelta(dir) {
  if (dir === 'up') return [0, -1];
  if (dir === 'down') return [0, 1];
  if (dir === 'left') return [-1, 0];
  if (dir === 'right') return [1, 0];
  return [0, 0];
}

document.addEventListener('keydown', (e) => {
  const key = e.key;
  if (key === 'ArrowUp' || key === 'w' || key === 'W') moveBy(0, -1);
  else if (key === 'ArrowDown' || key === 's' || key === 'S') moveBy(0, 1);
  else if (key === 'ArrowLeft' || key === 'a' || key === 'A') moveBy(-1, 0);
  else if (key === 'ArrowRight' || key === 'd' || key === 'D') moveBy(1, 0);
});

// スマホDパッド（押しっぱなし対応）
let holdInterval = null;
function startHold(dir) {
  const [dx, dy] = dirToDelta(dir);
  moveBy(dx, dy);
  holdInterval = window.setInterval(() => moveBy(dx, dy), 120);
}
function stopHold() {
  if (holdInterval) window.clearInterval(holdInterval);
  holdInterval = null;
}

controls.querySelectorAll('[data-dir]').forEach(btn => {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stopHold();
    const dir = btn.dataset.dir;
    btn.setPointerCapture?.(e.pointerId);
    startHold(dir);
  });
  btn.addEventListener('pointerup', stopHold);
  btn.addEventListener('pointercancel', stopHold);
  btn.addEventListener('pointerleave', stopHold);
});

newMissionBtn.addEventListener('click', () => {
  pickRandomMission();
  showToast('ミッション変更！');
});

resetBtn.addEventListener('click', resetToTokyo);

// ---- リサイズ ----
function fitCanvas(canvas, ctx, logicalW, logicalH, maxCssW) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const parent = canvas.parentElement;
  const parentW = parent ? parent.clientWidth : window.innerWidth;
  const cssW = Math.min(parentW, maxCssW);
  const cssH = cssW * (logicalH / logicalW);

  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;

  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);

  const scale = cssW / logicalW;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function resizeAll() {
  fitCanvas(worldCanvas, worldCtx, LOGICAL_W, LOGICAL_H, 920);
  // ミニマップは固定解像度で描いてCSSでフィット
  miniCanvas.width = MINI_W;
  miniCanvas.height = MINI_H;
  miniCanvas.style.width = '100%';
  miniCanvas.style.height = 'auto';
  miniCtx.setTransform(1, 0, 0, 1, 0, 0);
  miniCtx.imageSmoothingEnabled = false;
}

window.addEventListener('resize', resizeAll);

// ---- ループ ----
function tick() {
  drawWorld();
  drawMini();
  requestAnimationFrame(tick);
}

// ---- 初期化 ----
buildRepresentativeTiles();
renderMiniBase();
resizeAll();

// 初期位置（東京に寄せる）
resetToTokyo();

// 初期ミッション（奈良があれば奈良、なければランダム）
if (prefRepTile.has('奈良県')) setTarget('奈良県');
else pickRandomMission();

updateHud();
tick();

