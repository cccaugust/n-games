const COLS = 6;
const ROWS = 12;
const HIDDEN_ROWS = 2;
const CELL = 60;

const COLORS = [
  { id: 'ruby', fill: '#ff6b8a', edge: '#a31f58', glyph: '❤' },
  { id: 'sun', fill: '#ffd166', edge: '#b47700', glyph: '★' },
  { id: 'leaf', fill: '#7ee081', edge: '#2f7b37', glyph: '✿' },
  { id: 'aqua', fill: '#63d8ff', edge: '#15658e', glyph: '◆' },
  { id: 'violet', fill: '#b690ff', edge: '#5e35a6', glyph: '☾' }
];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const chainEl = document.getElementById('chain');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const retryBtn = document.getElementById('retryBtn');

class PanelPop {
  constructor() {
    this.keys = new Set();
    this.lastTime = performance.now();
    this.lastMoveX = 0;
    this.lastMoveY = 0;
    this.lastSwap = 0;

    this.cursor = { x: 2, y: ROWS - 3 };
    this.score = 0;
    this.level = 1;
    this.chain = 0;
    this.risingOffset = 0;
    this.baseRiseSpeed = 18;
    this.gameOver = false;
    this.swapCooldown = 0;
    this.clearTimer = 0;
    this.currentClear = null;
    this.chainWindow = 0;
    this.board = [];
    this.popBursts = [];
    this.bufferRow = this.generateRow([]);

    this.resetBoard();
    this.bindEvents();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resetBoard() {
    this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (let y = ROWS - 1; y >= ROWS - 6; y -= 1) {
      this.board[y] = this.generateRow(this.board, y);
    }

    this.cursor = { x: 2, y: ROWS - 3 };
    this.score = 0;
    this.level = 1;
    this.chain = 0;
    this.risingOffset = 0;
    this.baseRiseSpeed = 18;
    this.swapCooldown = 0;
    this.clearTimer = 0;
    this.currentClear = null;
    this.chainWindow = 0;
    this.gameOver = false;
    this.bufferRow = this.generateRow(this.board, ROWS - 1);
    this.popBursts = [];
    overlay.classList.add('hidden');
    this.updateHud();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Shift'].includes(e.key)) {
        e.preventDefault();
      }

      const map = e.key === ' ' ? 'Space' : e.key;
      this.keys.add(map);

      if (this.gameOver && (map === 'Space' || map === 'Enter')) {
        this.resetBoard();
      }

      if (!e.repeat) this.handleTapInput(map);
    });

    window.addEventListener('keyup', (e) => {
      const map = e.key === ' ' ? 'Space' : e.key;
      this.keys.delete(map);
    });

    retryBtn.addEventListener('click', () => this.resetBoard());

    document.querySelectorAll('.touch-controls button').forEach((btn) => {
      const key = btn.dataset.key;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.keys.add(key);
        this.handleTapInput(key);
      });
      const up = () => this.keys.delete(key);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });
  }

  handleTapInput(key) {
    if (this.gameOver) return;
    if (key === 'ArrowLeft') this.cursor.x = Math.max(0, this.cursor.x - 1);
    if (key === 'ArrowRight') this.cursor.x = Math.min(COLS - 2, this.cursor.x + 1);
    if (key === 'ArrowUp') this.cursor.y = Math.max(HIDDEN_ROWS, this.cursor.y - 1);
    if (key === 'ArrowDown') this.cursor.y = Math.min(ROWS - 1, this.cursor.y + 1);
    if (key === 'Space') this.swap();
  }

  generateRow(refBoard = this.board, y = ROWS - 1) {
    const row = [];
    for (let x = 0; x < COLS; x += 1) {
      const options = COLORS.map((c) => c.id).filter((color) => {
        if (x >= 2 && row[x - 1]?.color === color && row[x - 2]?.color === color) return false;
        if (refBoard[y + 1]?.[x]?.color === color && refBoard[y + 2]?.[x]?.color === color) return false;
        return true;
      });
      const color = options[Math.floor(Math.random() * options.length)] ?? COLORS[0].id;
      row.push({ color });
    }
    return row;
  }

  swap() {
    if (this.swapCooldown > 0 || this.clearTimer > 0) return;
    const { x, y } = this.cursor;
    const a = this.board[y][x];
    const b = this.board[y][x + 1];
    if (!a && !b) return;
    this.board[y][x] = b;
    this.board[y][x + 1] = a;
    this.swapCooldown = 0.09;
  }

  applyGravity() {
    let moved = false;
    for (let y = ROWS - 2; y >= 0; y -= 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (this.board[y][x] && !this.board[y + 1][x]) {
          this.board[y + 1][x] = this.board[y][x];
          this.board[y][x] = null;
          moved = true;
        }
      }
    }
    return moved;
  }

  detectMatches() {
    const marks = new Set();

    for (let y = 0; y < ROWS; y += 1) {
      let run = 1;
      for (let x = 1; x <= COLS; x += 1) {
        const curr = this.board[y][x]?.color;
        const prev = this.board[y][x - 1]?.color;
        if (curr && curr === prev) run += 1;
        else {
          if (run >= 3 && prev) for (let k = 0; k < run; k += 1) marks.add(`${y}:${x - 1 - k}`);
          run = 1;
        }
      }
    }

    for (let x = 0; x < COLS; x += 1) {
      let run = 1;
      for (let y = 1; y <= ROWS; y += 1) {
        const curr = this.board[y]?.[x]?.color;
        const prev = this.board[y - 1]?.[x]?.color;
        if (curr && curr === prev) run += 1;
        else {
          if (run >= 3 && prev) for (let k = 0; k < run; k += 1) marks.add(`${y - 1 - k}:${x}`);
          run = 1;
        }
      }
    }

    return [...marks].map((it) => it.split(':').map(Number));
  }

  clearPanels(cells) {
    cells.forEach(([y, x]) => {
      this.spawnBurst(x, y);
      this.board[y][x] = null;
    });
  }

  spawnBurst(x, y) {
    const px = x * CELL + CELL / 2;
    const py = (y - HIDDEN_ROWS) * CELL - this.risingOffset + CELL / 2;
    this.popBursts.push({ x: px, y: py, t: 0, life: 0.35 });
  }

  riseOneStep() {
    for (let y = 0; y < ROWS - 1; y += 1) this.board[y] = this.board[y + 1];
    this.board[ROWS - 1] = this.bufferRow.map((p) => ({ ...p }));
    this.bufferRow = this.generateRow(this.board, ROWS - 1);

    if (this.cursor.y > HIDDEN_ROWS) this.cursor.y -= 1;

    for (let y = 0; y < HIDDEN_ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (this.board[y][x]) return this.triggerGameOver();
      }
    }
  }

  triggerGameOver() {
    this.gameOver = true;
    overlay.classList.remove('hidden');
  }

  update(dt) {
    if (this.gameOver) return;

    const now = performance.now();
    if (this.keys.has('ArrowLeft') && now - this.lastMoveX > 140) {
      this.cursor.x = Math.max(0, this.cursor.x - 1);
      this.lastMoveX = now;
    }
    if (this.keys.has('ArrowRight') && now - this.lastMoveX > 140) {
      this.cursor.x = Math.min(COLS - 2, this.cursor.x + 1);
      this.lastMoveX = now;
    }
    if (this.keys.has('ArrowUp') && now - this.lastMoveY > 140) {
      this.cursor.y = Math.max(HIDDEN_ROWS, this.cursor.y - 1);
      this.lastMoveY = now;
    }
    if (this.keys.has('ArrowDown') && now - this.lastMoveY > 140) {
      this.cursor.y = Math.min(ROWS - 1, this.cursor.y + 1);
      this.lastMoveY = now;
    }
    if (this.keys.has('Space') && now - this.lastSwap > 180) {
      this.swap();
      this.lastSwap = now;
    }

    this.popBursts = this.popBursts
      .map((b) => ({ ...b, t: b.t + dt }))
      .filter((b) => b.t < b.life);

    this.swapCooldown = Math.max(0, this.swapCooldown - dt);

    if (this.clearTimer > 0) {
      this.clearTimer -= dt;
      if (this.clearTimer <= 0 && this.currentClear) {
        this.clearPanels(this.currentClear);
        const gained = this.currentClear.length * 30 * (this.chain + 1);
        this.score += gained;
        this.chainWindow = 0.55;
        this.currentClear = null;
      }
      this.updateHud();
      return;
    }

    let moved;
    do moved = this.applyGravity(); while (moved);

    const matches = this.detectMatches();
    if (matches.length > 0) {
      this.chain = this.chainWindow > 0 ? this.chain + 1 : 1;
      this.currentClear = matches;
      this.clearTimer = 0.18;
    } else {
      this.chain = this.chainWindow > 0 ? this.chain : 0;
      this.chainWindow = Math.max(0, this.chainWindow - dt);
    }

    const raiseBoost = this.keys.has('Shift') ? 4.8 : 1;
    this.risingOffset += this.baseRiseSpeed * raiseBoost * dt;

    while (this.risingOffset >= CELL) {
      this.risingOffset -= CELL;
      this.riseOneStep();
      if (this.gameOver) break;
    }

    this.level = 1 + Math.floor(this.score / 2500);
    this.baseRiseSpeed = 18 + this.level * 2.2;
    this.updateHud();
  }

  updateHud() {
    scoreEl.textContent = String(this.score);
    chainEl.textContent = `x${this.chain}`;
    levelEl.textContent = String(this.level);
  }

  drawPanel(x, y, panel, flashing) {
    const color = COLORS.find((c) => c.id === panel.color) ?? COLORS[0];
    const px = x * CELL + 5;
    const py = (y - HIDDEN_ROWS) * CELL - this.risingOffset + 5;
    if (py < -CELL || py > canvas.height) return;

    const w = CELL - 10;
    const h = CELL - 10;

    const base = ctx.createLinearGradient(px, py, px, py + h);
    base.addColorStop(0, '#ffffffaa');
    base.addColorStop(0.18, color.fill);
    base.addColorStop(1, color.edge);

    ctx.fillStyle = flashing ? '#ffffff' : base;
    ctx.strokeStyle = '#ffffffc0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, w, h, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff88';
    ctx.beginPath();
    ctx.roundRect(px + 6, py + 6, w - 22, 14, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffffef';
    ctx.font = '900 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(color.glyph, px + w / 2, py + h / 2 + 1);

    ctx.fillStyle = '#00000033';
    ctx.beginPath();
    ctx.ellipse(px + w / 2, py + h - 8, w * 0.3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBursts() {
    this.popBursts.forEach((b) => {
      const p = b.t / b.life;
      const alpha = 1 - p;
      const radius = 8 + p * 24;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  render() {
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#ff90d8');
    bg.addColorStop(0.5, '#7db0ff');
    bg.addColorStop(1, '#7af3cb');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = HIDDEN_ROWS; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const gx = x * CELL;
        const gy = (y - HIDDEN_ROWS) * CELL - this.risingOffset;
        ctx.strokeStyle = '#ffffff52';
        ctx.strokeRect(gx, gy, CELL, CELL);
      }
    }

    const flashOn = this.clearTimer > 0 && Math.floor(performance.now() / 80) % 2 === 0;

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const panel = this.board[y][x];
        if (!panel) continue;
        const flashing = flashOn && this.currentClear?.some(([my, mx]) => my === y && mx === x);
        this.drawPanel(x, y, panel, flashing);
      }
    }

    this.drawBursts();

    const cx = this.cursor.x * CELL;
    const cy = (this.cursor.y - HIDDEN_ROWS) * CELL - this.risingOffset;
    const pulse = 0.6 + Math.sin(performance.now() / 120) * 0.4;
    ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
    ctx.lineWidth = 5;
    ctx.strokeRect(cx + 2, cy + 2, CELL * 2 - 4, CELL - 4);

    if (this.keys.has('Shift')) {
      ctx.fillStyle = '#ff2e76';
      ctx.font = '900 26px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('RAISE!!', 12, 8);
    }

    if (this.gameOver) {
      ctx.fillStyle = '#00000077';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  loop(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.033);
    this.lastTime = now;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  }
}

new PanelPop();
