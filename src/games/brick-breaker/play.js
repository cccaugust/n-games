import { getCurrentPlayer } from '../../js/auth.js';
import { getRankings, saveScore } from '../../js/score.js';
import { avatarToHtml } from '../../js/avatar.js';
import { initOverlay } from './overlay.js';
import { applyCanvasDpr, clamp, ensureStages, escapeHtml, fitStageToWrap, normalizeStage, refreshStageCacheFromSupabase, TILE, STAGE_COLS, STAGE_ROWS, tileParam, tileType } from './shared.js';

// =========================================================
// Play page (fullscreen) - Brick Breaker
// =========================================================

function qs(id) {
  return document.getElementById(id);
}

function getStageFromUrl() {
  const sp = new URLSearchParams(location.search);
  const s = sp.get('stage');
  return typeof s === 'string' && s.trim() ? s.trim() : null;
}

// --------------------
// DOM
// --------------------
const canvas = qs('gameCanvas');
const ctx = canvas.getContext('2d');
const wrap = canvas?.closest('.bb-canvas-wrap');
const stageBox = qs('gameStage');
const stageLabel = qs('stageLabel');

const scoreEl = qs('score');
const livesEl = qs('lives');
const ballsEl = qs('balls');
const continuesEl = qs('continues');

const pauseBtn = qs('pauseBtn');
const resetBtn = qs('resetBtn');

const { showOverlay, closeOverlay } = initOverlay();

// --------------------
// Canvas Resize (DPR対応)
// --------------------
let viewW = 600;
let viewH = 500;

function getDesignSize() {
  // HTMLの width/height（設計比率）を基準に、画面に収まる最大サイズでフィットさせる
  const dw = Number(canvas?.getAttribute('width')) || 600;
  const dh = Number(canvas?.getAttribute('height')) || 500;
  return { dw, dh };
}

function resizeGameCanvas() {
  const { dw, dh } = getDesignSize();
  if (wrap && stageBox) {
    fitStageToWrap({ wrapEl: wrap, stageEl: stageBox, designW: dw, designH: dh });
  }
  const { w, h } = applyCanvasDpr(canvas, ctx);
  viewW = w;
  viewH = h;
  layoutPaddleToBottom();
}

window.addEventListener('resize', () => {
  resizeGameCanvas();
  drawGame();
});

// --------------------
// Game (Play)
// --------------------
const paddle = {
  x: 0,
  y: 0,
  w: 100,
  h: 14,
  color: '#74b9ff'
};

// 🙃 さかさ操作（残り秒）
let reverseTimeLeft = 0;

function layoutPaddleToBottom() {
  paddle.w = clamp(viewW * 0.18, 70, 130);
  paddle.h = clamp(viewH * 0.028, 12, 18);
  paddle.y = viewH - clamp(viewH * 0.08, 36, 52);
  paddle.x = clamp(paddle.x, 0, Math.max(0, viewW - paddle.w));
}

function makeBall(x, y, speed, angleRad) {
  const r = clamp(viewW * 0.013, 6, 9);
  return {
    x,
    y,
    r,
    vx: Math.cos(angleRad) * speed,
    vy: Math.sin(angleRad) * speed,
    color: '#ffffff',
    portalCd: 0, // 🌀 連続ワープ防止（秒）
    bigTimeLeft: 0,
    baseR: r
  };
}

function getBrickMetrics() {
  const pad = clamp(viewW * 0.02, 8, 16);
  const gap = clamp(viewW * 0.012, 5, 12);
  const top = clamp(viewH * 0.12, 54, 74);
  const brickH = clamp(viewH * 0.045, 16, 24);
  const areaW = viewW - pad * 2;
  const brickW = (areaW - gap * (STAGE_COLS + 1)) / STAGE_COLS;
  return { pad, gap, top, brickW, brickH };
}

function brickRect(brick) {
  const { pad, gap, top, brickW, brickH } = getBrickMetrics();
  const x = pad + gap + brick.col * (brickW + gap);
  const y = top + brick.row * (brickH + gap);
  return { x, y, w: brickW, h: brickH };
}

function gridIndex(x, y) {
  return y * STAGE_COLS + x;
}

function makeBricksFromStage(stage) {
  const s = normalizeStage(stage);
  const bricks = [];
  for (let row = 0; row < STAGE_ROWS; row++) {
    for (let col = 0; col < STAGE_COLS; col++) {
      const v = s.grid[gridIndex(col, row)];
      const t = tileType(v);
      const p = tileParam(v);
      if (t === TILE.EMPTY) continue;
      const hp =
        t === TILE.TOUGH ? (p || 3)
          : (t === TILE.WALL || t === TILE.PORTAL ? Number.POSITIVE_INFINITY : 1);
      bricks.push({
        col,
        row,
        type: t,
        param: p,
        hp,
        alive: true
      });
    }
  }
  return bricks;
}

function circleRectHit(ballObj, rect) {
  const cx = clamp(ballObj.x, rect.x, rect.x + rect.w);
  const cy = clamp(ballObj.y, rect.y, rect.y + rect.h);
  const dx = ballObj.x - cx;
  const dy = ballObj.y - cy;
  return (dx * dx + dy * dy) <= (ballObj.r * ballObj.r);
}

function brickBaseColor(brick) {
  if (brick.type === TILE.SPLIT) return '#00cec9';
  if (brick.type === TILE.TOUGH) return '#a29bfe';
  if (brick.type === TILE.SOFT) return '#ffeaa7';
  if (brick.type === TILE.WALL) return '#636e72';
  if (brick.type === TILE.BOMB) return '#ff7675';
  if (brick.type === TILE.PORTAL) return '#74f8ff';
  if (brick.type === TILE.REVERSE) return '#55efc4';
  if (brick.type === TILE.BIG) return '#81ecec';
  if (brick.type === TILE.ONE_WAY) return '#fab1a0';
  return '#74b9ff';
}

function brickPoints(brick) {
  if (brick.type === TILE.SPLIT) return 25;
  if (brick.type === TILE.TOUGH) return 35;
  if (brick.type === TILE.BOMB) return 20;
  if (brick.type === TILE.REVERSE) return 15;
  if (brick.type === TILE.BIG) return 18;
  if (brick.type === TILE.ONE_WAY) return 8;
  if (brick.type === TILE.WALL) return 0;
  if (brick.type === TILE.PORTAL) return 0;
  return 10;
}

let isRunning = false;
let isPaused = false;
let lastT = 0;

let score = 0;
let lives = 3;
let continueCount = 0;

let playingStageName = null;
let bricks = [];
let balls = [];

function resetRunStats() {
  score = 0;
  lives = 3;
  continueCount = 0;
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
  ballsEl.textContent = String(balls.length);
  continuesEl.textContent = String(continueCount);
}

function setPaused(paused) {
  isPaused = paused;
  pauseBtn.textContent = paused ? '再開' : '一時停止';
}

function stopGameLoop() {
  isRunning = false;
  setPaused(false);
}

function ballSpeed() {
  return clamp(viewW * 0.75, 420, 760); // px/s
}

function resetPaddleAndBall({ keepBricks = true } = {}) {
  layoutPaddleToBottom();
  paddle.x = viewW / 2 - paddle.w / 2;
  balls = [];
  const speed = ballSpeed();
  const angle = (-Math.PI / 2) + (Math.random() * 0.55 - 0.275);
  balls.push(makeBall(viewW / 2, paddle.y - 18, speed, angle));
  if (!keepBricks) {
    const list = ensureStages();
    const s = list.find(x => x.name === playingStageName) ?? list[0];
    bricks = makeBricksFromStage(s);
  }
  updateHud();
}

function setStageLabel(name) {
  if (stageLabel) stageLabel.textContent = `ステージ：${name || '—'}`;
}

function startStage(stageName, { resetStats = true } = {}) {
  const list = ensureStages();
  const stage = list.find(x => x.name === stageName) ?? list[0];
  if (!stage) return;

  playingStageName = stage.name;
  setStageLabel(stage.name);

  if (resetStats) resetRunStats();

  bricks = makeBricksFromStage(stage);
  resetPaddleAndBall({ keepBricks: true });
  resizeGameCanvas();
  setPaused(false);
  isRunning = true;
  lastT = performance.now();
  requestAnimationFrame(loop);
}

function nextStageName() {
  const list = ensureStages();
  const names = list.map(s => s.name);
  const idx = Math.max(0, names.indexOf(playingStageName));
  return names[(idx + 1) % names.length] ?? names[0];
}

function spawnSplitBalls(fromBall, atX, atY, { desiredTotal = 5 } = {}) {
  // ぶんれつ: 1つのボールが「合計Nこ」になる（= +N-1）
  const MAX_BALLS = 15;
  if (balls.length >= MAX_BALLS) return;

  const speed = Math.max(ballSpeed() * 0.95, Math.hypot(fromBall.vx, fromBall.vy));
  const base = Math.atan2(fromBall.vy, fromBall.vx);

  // 最大5方向にばらける（全部ちがう角度）
  const dtot = clamp(Number(desiredTotal) || 5, 2, 50);
  const canAdd = Math.max(0, Math.min(dtot - 1, MAX_BALLS - balls.length));
  const total = 1 + canAdd;
  if (total <= 1) return;

  const spread = 1.6; // rad（左右に約±0.8）
  const offsets = Array.from({ length: total }, (_, i) => {
    if (total === 1) return 0;
    const t = i / (total - 1);
    return (-spread / 2) + spread * t;
  });
  const mid = Math.floor(total / 2);

  // 元のボールも方向を変えて「分裂した感」を出す
  {
    const a = base + offsets[mid];
    fromBall.x = atX;
    fromBall.y = atY;
    fromBall.vx = Math.cos(a) * speed;
    fromBall.vy = Math.sin(a) * speed;
  }

  for (let i = 0; i < offsets.length; i++) {
    if (i === mid) continue;
    if (balls.length >= MAX_BALLS) break;
    const jitter = (Math.random() * 0.06) - 0.03;
    const a = base + offsets[i] + jitter;
    const b = makeBall(atX, atY, speed, a);
    // 重なり/連続ヒットを減らすため、少しだけ前に出す
    b.x += Math.cos(a) * (b.r * 1.2);
    b.y += Math.sin(a) * (b.r * 1.2);
    balls.push(b);
  }
}

function onAllBallsLost() {
  lives = Math.max(0, lives - 1);
  updateHud();

  stopGameLoop();

  if (lives > 0) {
    showOverlay(
      'ミス！',
      `のこりLIFE: ${lives}。いまの状態からつづけられるよ。`,
      `
        <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap; margin-top: 10px;">
          <button class="btn-primary" id="ovContinue">つづける</button>
          <button class="bb-tool-btn" id="ovToSelect">ステージ選択へ</button>
        </div>
      `,
      { closable: false }
    );
    qs('ovContinue').onclick = () => {
      closeOverlay();
      resetPaddleAndBall({ keepBricks: true });
      isRunning = true;
      lastT = performance.now();
      requestAnimationFrame(loop);
    };
    qs('ovToSelect').onclick = () => {
      closeOverlay();
      location.href = './stage-select.html';
    };
    return;
  }

  showOverlay(
    'ゲームオーバー…',
    `SCORE: ${score}（CONTINUE: ${continueCount}）`,
    `
      <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap; margin-top: 10px;">
        <button class="btn-primary" id="ovRevive">コンティニュー</button>
        <button class="bb-tool-btn" id="ovFinish">おしまい（ランキング）</button>
      </div>
    `,
    { closable: false }
  );
  qs('ovRevive').onclick = () => {
    closeOverlay();
    continueCount += 1;
    lives = 1;
    updateHud();
    resetPaddleAndBall({ keepBricks: true });
    isRunning = true;
    lastT = performance.now();
    requestAnimationFrame(loop);
  };
  qs('ovFinish').onclick = () => {
    void finishRunAndShowRanking();
  };
}

async function finishRunAndShowRanking() {
  stopGameLoop();
  closeOverlay();

  const player = getCurrentPlayer();
  if (player?.id) {
    await saveScore('brick-breaker', player.id, score);
  }

  const rankings = await getRankings('brick-breaker');
  const rankingHtml = rankings.map((r, i) => `
    <div style="display: flex; justify-content: space-between; width: 100%; padding: 8px 6px; border-bottom: 1px solid rgba(255,255,255,0.15);">
      <div style="display: flex; align-items: center; gap: 8px; min-width:0;">
        <span style="font-weight: 900; width: 26px;">${i + 1}.</span>
        <span style="display:inline-flex; align-items:center;">${avatarToHtml(r.avatar || '👤', { size: 24, className: 'ng-avatar', alt: '' })}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; max-width: 160px; white-space: nowrap;">${escapeHtml(r.name || '')}</span>
      </div>
      <span style="font-weight: 900;">${escapeHtml(r.score || '')}</span>
    </div>
  `).join('');

  showOverlay(
    'おしまい！',
    `SCORE: ${score}`,
    `
      <div style="background: rgba(255,255,255,0.12); padding: 14px; border-radius: 14px; margin: 14px 0; width: 100%; max-width: 440px; text-align: left;">
        <h3 style="text-align: center; margin-bottom: 10px; color: white;">🏆 ランキング</h3>
        ${rankingHtml || '<div style="opacity:0.9; text-align:center;">まだランキングがないよ</div>'}
      </div>
      <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap;">
        <button class="btn-primary" id="ovRestart">もういっかい</button>
        <a href="./stage-select.html" style="color: white; display:inline-block; padding: 12px 14px;">&larr; ステージ選択</a>
      </div>
    `,
    { closable: false }
  );
  qs('ovRestart').onclick = () => {
    closeOverlay();
    startStage(playingStageName ?? getStageFromUrl(), { resetStats: true });
  };
}

function stageCleared() {
  stopGameLoop();
  showOverlay(
    'ステージクリア！',
    `「${playingStageName}」 クリア！`,
    `
      <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap; margin-top: 10px;">
        <button class="btn-primary" id="ovNext">つぎへ</button>
        <button class="bb-tool-btn" id="ovSelect">ステージ選択へ</button>
      </div>
    `,
    { closable: false }
  );
  qs('ovNext').onclick = () => {
    closeOverlay();
    startStage(nextStageName(), { resetStats: false });
  };
  qs('ovSelect').onclick = () => {
    closeOverlay();
    location.href = './stage-select.html';
  };
}

function updateGame(dt) {
  if (isPaused) return;
  reverseTimeLeft = Math.max(0, reverseTimeLeft - dt);

  const aliveBricks = bricks.filter(b => b.alive);

  const portals = aliveBricks.filter(b => b.type === TILE.PORTAL);
  function portalCenter(p) {
    const rect = brickRect(p);
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, rect };
  }
  function tryWarp(ballObj, hitPortal) {
    if (portals.length < 2) return false;
    if ((ballObj.portalCd || 0) > 0) return false;
    const others = portals.filter(p => !(p.col === hitPortal.col && p.row === hitPortal.row));
    if (others.length === 0) return false;
    const target = others[Math.floor(Math.random() * others.length)];
    const { x, y } = portalCenter(target);

    // 少しだけ前に出して「はまり」を防ぐ
    const vlen = Math.max(60, Math.hypot(ballObj.vx, ballObj.vy));
    const nx = ballObj.vx / vlen;
    const ny = ballObj.vy / vlen;
    ballObj.x = x + nx * (ballObj.r * 2.2);
    ballObj.y = y + ny * (ballObj.r * 2.2);

    // ちょいシュールに：角度を少しだけランダム回転
    const a = Math.atan2(ballObj.vy, ballObj.vx) + ((Math.random() * 0.6) - 0.3);
    ballObj.vx = Math.cos(a) * vlen;
    ballObj.vy = Math.sin(a) * vlen;

    ballObj.portalCd = 0.35;
    return true;
  }

  function killBrick(brick, fromBall) {
    if (!brick.alive) return false;
    if (brick.type === TILE.WALL || brick.type === TILE.PORTAL) return false;
    brick.hp -= 1;
    if (brick.hp <= 0) {
      brick.alive = false;
      score += brickPoints(brick);
      if (brick.type === TILE.SPLIT) {
        const rect = brickRect(brick);
        spawnSplitBalls(fromBall, rect.x + rect.w / 2, rect.y + rect.h / 2, { desiredTotal: brick.param || 5 });
      }
      if (brick.type === TILE.REVERSE) {
        reverseTimeLeft = Math.max(reverseTimeLeft, 6.0);
      }
      return true;
    }
    // かたいブロックは当てるだけでも少し加点
    if (brick.type === TILE.TOUGH) score += 2;
    return true;
  }

  function explodeAt(centerBrick, fromBall) {
    // 3x3（周りも巻きこむ）。かべ/ポータルは無視。
    let spawnedFromSplit = false;
    for (const b of aliveBricks) {
      if (!b.alive) continue;
      if (b.type === TILE.WALL || b.type === TILE.PORTAL) continue;
      const dx = Math.abs(b.col - centerBrick.col);
      const dy = Math.abs(b.row - centerBrick.row);
      if (dx > 1 || dy > 1) continue;

      // tough は爆風で少し強めに削る（2ダメ）
      if (b.type === TILE.TOUGH) {
        b.hp -= 2;
      } else {
        b.hp -= 99;
      }
      if (b.hp <= 0) {
        b.alive = false;
        score += brickPoints(b);
        if (!spawnedFromSplit && b.type === TILE.SPLIT) {
          const rect = brickRect(b);
          spawnSplitBalls(fromBall, rect.x + rect.w / 2, rect.y + rect.h / 2, { desiredTotal: b.param || 5 });
          spawnedFromSplit = true;
        }
        if (b.type === TILE.REVERSE) reverseTimeLeft = Math.max(reverseTimeLeft, 6.0);
      }
    }
  }

  const nextBalls = [];
  for (const b of balls) {
    if ((b.portalCd || 0) > 0) b.portalCd = Math.max(0, b.portalCd - dt);
    if ((b.bigTimeLeft || 0) > 0) {
      b.bigTimeLeft = Math.max(0, b.bigTimeLeft - dt);
      const targetR = (b.baseR || b.r) * 1.9;
      b.r = clamp(targetR, 8, 18);
      if (b.bigTimeLeft <= 0) {
        b.r = b.baseR || b.r;
      }
    } else {
      b.baseR = b.baseR || b.r;
    }

    const prevX = b.x;
    const prevY = b.y;

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Wall
    if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
    if (b.x + b.r > viewW) { b.x = viewW - b.r; b.vx = -Math.abs(b.vx); }
    if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }

    // Paddle
    const hitPaddle =
      b.vy > 0 &&
      b.y + b.r >= paddle.y &&
      b.y - b.r <= paddle.y + paddle.h &&
      b.x >= paddle.x - 2 &&
      b.x <= paddle.x + paddle.w + 2;

    if (hitPaddle) {
      b.y = paddle.y - b.r;
      const speed = Math.max(ballSpeed() * 0.85, Math.hypot(b.vx, b.vy));
      const center = paddle.x + paddle.w / 2;
      const rel = clamp((b.x - center) / (paddle.w / 2), -1, 1);
      const vx = rel * speed * 0.92;
      const vy = -Math.sqrt(Math.max(60, speed * speed - vx * vx));
      b.vx = vx;
      b.vy = vy;
    }

    // Bricks
    let hitSomething = false;
    for (const brick of aliveBricks) {
      if (!brick.alive) continue;
      const rect = brickRect(brick);
      if (!circleRectHit(b, rect)) continue;

      const isSoft = brick.type === TILE.SOFT;
      const isWall = brick.type === TILE.WALL;
      const isPortal = brick.type === TILE.PORTAL;
      const isOneWay = brick.type === TILE.ONE_WAY;
      const isBigBall = (b.bigTimeLeft || 0) > 0;

      // Reflect (ざっくり) ※やわらかは反射しない
      if (!isSoft && !isPortal && !isOneWay) {
        const cameFromTop = prevY + b.r <= rect.y && b.y + b.r > rect.y;
        const cameFromBottom = prevY - b.r >= rect.y + rect.h && b.y - b.r < rect.y + rect.h;
        const cameFromLeft = prevX + b.r <= rect.x && b.x + b.r > rect.x;
        const cameFromRight = prevX - b.r >= rect.x + rect.w && b.x - b.r < rect.x + rect.w;

        if (cameFromTop) b.vy = -Math.abs(b.vy);
        else if (cameFromBottom) b.vy = Math.abs(b.vy);
        else if (cameFromLeft) b.vx = -Math.abs(b.vx);
        else if (cameFromRight) b.vx = Math.abs(b.vx);
        else b.vy = -b.vy;
      }

      // ⬇️ 片方向壁：
      // - 上から（落下中 vy>0）は通れない＝壁として反射
      // - 下から（上昇中 vy<0）は倒れる＝壊れて通過
      if (isOneWay) {
        if (b.vy > 0) {
          b.vy = -Math.abs(b.vy);
        } else {
          brick.alive = false;
          score += brickPoints(brick);
        }
        hitSomething = true;
        break;
      }

      // Portal: warp (壊れない)
      if (isPortal) {
        if (tryWarp(b, brick)) {
          hitSomething = true;
          break;
        }
        // ワープできないときは普通の壁っぽく反射しておく
        b.vy = -b.vy;
        hitSomething = true;
        break;
      }

      // Hit brick
      if (!isWall) {
        if (brick.type === TILE.BIG) {
          // 🔵 でかボール（5秒）
          brick.alive = false;
          score += brickPoints(brick);
          b.baseR = b.baseR || b.r;
          b.bigTimeLeft = Math.max(b.bigTimeLeft || 0, 5.0);
        } else if (isBigBall && brick.type === TILE.TOUGH) {
          // でかボールは「硬いブロックだけ反射」＆一気に2減る
          b.vy = -b.vy;
          brick.hp -= 2;
          if (brick.hp <= 0) {
            brick.alive = false;
            score += brickPoints(brick);
          } else {
            score += 2;
          }
        } else if (isBigBall && (
          brick.type === TILE.NORMAL ||
          brick.type === TILE.SOFT ||
          brick.type === TILE.SPLIT ||
          brick.type === TILE.BOMB ||
          brick.type === TILE.REVERSE
        )) {
          // 普通ブロックは貫通（反射しない）
          if (brick.type === TILE.BOMB) {
            brick.alive = false;
            score += brickPoints(brick);
            explodeAt(brick, b);
          } else {
            killBrick(brick, b);
          }
        } else if (brick.type === TILE.BOMB) {
          // 💣 ばくはつ：自分＋周りをまとめて
          brick.alive = false;
          score += brickPoints(brick);
          explodeAt(brick, b);
        } else {
          killBrick(brick, b);
        }
      }
      hitSomething = true;
      break;
    }

    if (b.y - b.r > viewH) {
      continue;
    }

    nextBalls.push(b);
    if (hitSomething) {
      b.x += b.vx * (dt * 0.35);
      b.y += b.vy * (dt * 0.35);
    }
  }

  balls = nextBalls;
  updateHud();

  if (balls.length === 0) {
    onAllBallsLost();
    return;
  }

  // かべ（壊れない）はクリア判定から除外
  const remaining = bricks.some(b => b.alive && b.type !== TILE.WALL && b.type !== TILE.PORTAL);
  if (!remaining) {
    stageCleared();
  }
}

function drawGame() {
  ctx.clearRect(0, 0, viewW, viewH);

  // 背景グラデ
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, '#2d3436');
  g.addColorStop(1, '#111827');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  // Bricks
  for (const brick of bricks) {
    if (!brick.alive) continue;
    const rect = brickRect(brick);
    ctx.fillStyle = brickBaseColor(brick);
    ctx.globalAlpha = 1;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    if (brick.type === TILE.TOUGH) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.72))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(brick.hp), rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.SPLIT) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.72))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const n = clamp(brick.param || 5, 2, 50);
      ctx.fillText(`✶${n}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.SOFT) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.72))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('≈', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.WALL) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.72))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('■', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.BOMB) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.72))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.PORTAL) {
      // ちょいアニメ（リングがくるくる）
      const t = performance.now() / 1000;
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const r = Math.max(6, Math.min(rect.w, rect.h) * 0.32);
      const a0 = t * 2.4;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(2, rect.h * 0.12);
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a0 + 1.6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.70))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌀', cx, cy);
    }

    if (brick.type === TILE.REVERSE) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.70))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🙃', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.BIG) {
      ctx.fillStyle = 'rgba(0,0,0,0.40)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.70))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔵', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.ONE_WAY) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.70))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⬇', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
  }
  ctx.globalAlpha = 1;

  // Paddle
  ctx.fillStyle = paddle.color;
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

  // Balls
  for (const b of balls) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (reverseTimeLeft > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `${Math.max(12, Math.floor(viewH * 0.032))}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`🙃 さかさ中… ${reverseTimeLeft.toFixed(1)}s`, viewW / 2, 12);
  }

  if (balls.some(bb => (bb.bigTimeLeft || 0) > 0)) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `${Math.max(12, Math.floor(viewH * 0.030))}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('🔵 でかボール中！', viewW / 2, reverseTimeLeft > 0 ? 42 : 12);
  }
}

function loop(t) {
  if (!isRunning) return;
  const dt = Math.min(0.033, (t - lastT) / 1000);
  lastT = t;
  updateGame(dt);
  drawGame();
  requestAnimationFrame(loop);
}

// --------------------
// Input (Paddle)
// --------------------
let paddlePointerId = null;
function movePaddleFromClientX(clientX) {
  const rect = canvas.getBoundingClientRect();
  let x = (clientX - rect.left);
  if (reverseTimeLeft > 0) {
    x = viewW - x;
  }
  paddle.x = clamp(x - paddle.w / 2, 0, Math.max(0, viewW - paddle.w));
}

canvas.addEventListener('pointerdown', (e) => {
  paddlePointerId = e.pointerId;
  canvas.setPointerCapture?.(e.pointerId);
  movePaddleFromClientX(e.clientX);
  e.preventDefault();
});
canvas.addEventListener('pointermove', (e) => {
  if (paddlePointerId == null) return;
  if (e.pointerId !== paddlePointerId) return;
  movePaddleFromClientX(e.clientX);
  e.preventDefault();
});
function endPaddle(e) {
  if (paddlePointerId == null) return;
  if (e?.pointerId != null && e.pointerId !== paddlePointerId) return;
  paddlePointerId = null;
}
canvas.addEventListener('pointerup', endPaddle);
canvas.addEventListener('pointercancel', endPaddle);
canvas.addEventListener('pointerleave', endPaddle);

// --------------------
// UI
// --------------------
pauseBtn.addEventListener('click', () => {
  if (!playingStageName) {
    showOverlay('まだだよ', '先に始まってないみたい。');
    return;
  }
  if (!isRunning) {
    showOverlay('止まってるよ', '「最初から」で始めてね。');
    return;
  }
  setPaused(!isPaused);
});

resetBtn.addEventListener('click', () => {
  closeOverlay();
  startStage(playingStageName ?? getStageFromUrl(), { resetStats: true });
});

// --------------------
// Init
// --------------------
async function init() {
  // キャッシュ準備
  ensureStages();

  resizeGameCanvas();
  updateHud();

  // URL指定のステージ（なければ先頭）
  const desired = getStageFromUrl();
  const initial = ensureStages();
  const stageName = (desired && initial.some(s => s.name === desired)) ? desired : (initial[0]?.name ?? null);
  if (stageName) startStage(stageName, { resetStats: true });

  // Supabaseから最新を取り込み（失敗してもキャッシュで動く）
  await refreshStageCacheFromSupabase({
    showError: false
  });

  // 取り込み後に、指定ステージが見つかるならラベル更新（プレイ中は変えない）
  if (!playingStageName) {
    const list = ensureStages();
    const name2 = (desired && list.some(s => s.name === desired)) ? desired : (list[0]?.name ?? null);
    if (name2) startStage(name2, { resetStats: true });
  }
}

init();

