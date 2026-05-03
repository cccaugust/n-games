const sizes = ['s', 'm', 'l'];
const labels = { s: '小', m: '中', l: '大' };

let board = Array.from({ length: 9 }, () => ({ s: null, m: null, l: null }));
let current = 1;
let selectedSize = { 1: 's', 2: 's' };
let stock = { 1: { s: 3, m: 3, l: 3 }, 2: { s: 3, m: 3, l: 3 } };
let ended = false;

const statusEl = document.getElementById('status');
const boardEl = document.getElementById('board');

function setup() {
  boardEl.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.type = 'button';
    cell.setAttribute('aria-label', `マス ${i + 1}`);
    cell.addEventListener('pointerdown', () => put(i));
    boardEl.appendChild(cell);
  }
  renderPickers();
  render();
}

function renderPickers() {
  [1, 2].forEach((p) => {
    const wrap = document.getElementById(`p${p}Pickers`);
    wrap.innerHTML = '';
    sizes.forEach((s) => {
      const b = document.createElement('button');
      b.className = 'pick';
      if (selectedSize[p] === s) b.classList.add('active');
      b.textContent = `${labels[s]} (${stock[p][s]})`;
      b.disabled = stock[p][s] <= 0 || p !== current || ended;
      b.addEventListener('click', () => {
        selectedSize[p] = s;
        renderPickers();
      });
      wrap.appendChild(b);
    });
  });
}

function render() {
  [...boardEl.children].forEach((cellEl, idx) => {
    cellEl.innerHTML = '';
    sizes.forEach((s) => {
      const owner = board[idx][s];
      if (!owner) return;
      const ring = document.createElement('div');
      ring.className = `ring size-${s} p${owner}`;
      cellEl.appendChild(ring);
    });
  });
  const text = ended ? statusEl.textContent : `プレイヤー${current}の番（${labels[selectedSize[current]]}を置く）`;
  statusEl.textContent = text;
}

function put(i) {
  if (ended) return;
  const s = selectedSize[current];
  if (stock[current][s] <= 0 || board[i][s]) return;
  board[i][s] = current;
  stock[current][s] -= 1;

  const winner = checkWin(current);
  if (winner) {
    ended = true;
    statusEl.textContent = `🎉 プレイヤー${winner}の勝ち！`;
  } else if (isDraw()) {
    ended = true;
    statusEl.textContent = '引き分け！';
  } else {
    current = current === 1 ? 2 : 1;
  }
  renderPickers();
  render();
}

function checkWin(player) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]
  ];
  for (const line of lines) {
    for (const s of sizes) {
      if (line.every((idx) => board[idx][s] === player)) return player;
    }
    if (line.every((idx) => {
      const c = board[idx];
      return c.s === player || c.m === player || c.l === player;
    })) {
      // 昇順/降順サイズの直線（簡易版）
      const perms = [['s','m','l'], ['l','m','s']];
      for (const p of perms) {
        if (line.every((idx, j) => board[idx][p[j]] === player)) return player;
      }
    }
  }
  for (let i = 0; i < 9; i++) {
    const c = board[i];
    if (c.s === player && c.m === player && c.l === player) return player;
  }
  return null;
}

function isDraw() {
  return [1,2].every((p) => sizes.every((s) => stock[p][s] === 0));
}

document.getElementById('resetBtn').addEventListener('click', () => {
  board = Array.from({ length: 9 }, () => ({ s: null, m: null, l: null }));
  current = 1;
  selectedSize = { 1: 's', 2: 's' };
  stock = { 1: { s: 3, m: 3, l: 3 }, 2: { s: 3, m: 3, l: 3 } };
  ended = false;
  renderPickers();
  render();
});

setup();
