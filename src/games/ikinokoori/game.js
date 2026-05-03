const boardSize = 9;
const colors = ["#ff7aa8", "#6ad1ff", "#ffd166", "#7ce38b"];
const names = ["うさぎ", "ぺんぎん", "ねこ", "こぐま"];
const icons = ["🐰", "🐧", "🐱", "🐻"];
let players = [];
let current = 0;
let tiles = [];
let particles = [];
let over = false;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const panelEl = document.getElementById('playerPanel');
const countEl = document.getElementById('playerCount');
const ruleDialog = document.getElementById('ruleDialog');

document.getElementById('resetBtn').onclick = init;
document.getElementById('ruleBtn').onclick = () => ruleDialog.showModal();
document.getElementById('closeRuleBtn').onclick = () => ruleDialog.close();
countEl.onchange = init;
canvas.addEventListener('pointerdown', onTap);

const ac = new (window.AudioContext || window.webkitAudioContext)();
const beep = (f = 440, d = 0.09) => {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  o.connect(g); g.connect(ac.destination); g.gain.value = 0.03;
  o.start(); o.stop(ac.currentTime + d);
};

function init() {
  over = false; particles = [];
  tiles = Array.from({ length: boardSize }, () => Array(boardSize).fill(1));
  const count = Number(countEl.value);
  players = Array.from({ length: count }, (_, i) => ({ id: i, x: i % 2 ? boardSize - 1 : 0, y: i < 2 ? 0 : boardSize - 1, alive: true }));
  current = 0;
  draw(); renderPanel();
  statusEl.textContent = `${icons[current]} ${names[current]} の番！近くのマスへ移動しよう`;
}

function onTap(e) {
  if (over) return;
  const p = players[current]; if (!p?.alive) return nextTurn();
  const rect = canvas.getBoundingClientRect();
  const s = rect.width / boardSize;
  const x = Math.floor((e.clientX - rect.left) / s), y = Math.floor((e.clientY - rect.top) / s);
  const dist = Math.abs(x - p.x) + Math.abs(y - p.y);
  if (dist !== 1 || !tiles[y]?.[x]) return;
  tiles[p.y][p.x] = 0;
  spawn((p.x + .5) * s, (p.y + .5) * s, p.id);
  p.x = x; p.y = y;
  beep(520 + current * 80);
  checkFalls();
  nextTurn();
}

function checkFalls() {
  for (const pl of players) {
    if (!pl.alive) continue;
    if (!tiles[pl.y][pl.x] || !hasMove(pl)) { pl.alive = false; beep(180, .2); }
  }
}

function hasMove(pl) {
  return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => tiles[pl.y+dy]?.[pl.x+dx]);
}

function nextTurn() {
  const alive = players.filter(p => p.alive);
  if (alive.length <= 1) {
    over = true;
    statusEl.textContent = alive[0] ? `🎉 ${icons[alive[0].id]} ${names[alive[0].id]} の勝ち！` : 'みんな落ちちゃった！引き分け';
    renderPanel(); draw();
    return;
  }
  do { current = (current + 1) % players.length; } while (!players[current].alive);
  statusEl.textContent = `${icons[current]} ${names[current]} の番！`;
  renderPanel(); draw();
}

function renderPanel() {
  panelEl.innerHTML = players.map((p, i) => `<div class="player-card ${i===current&&!over?'active':''} ${p.alive?'':'out'}" style="border-color:${p.alive?colors[i]:'transparent'}">${icons[i]} ${names[i]}<br>${p.alive?'生存中':'脱落'}</div>`).join('');
}

function spawn(x,y,id){ for(let i=0;i<16;i++) particles.push({x,y,vx:(Math.random()-.5)*3,vy:(Math.random()-.5)*3,life:30,c:colors[id]}); }
function tick(){
  const s = canvas.width / boardSize;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<boardSize;y++) for(let x=0;x<boardSize;x++){
    if(!tiles[y][x]) continue;
    ctx.fillStyle = (x+y)%2? '#c8f0ff' : '#dbf6ff';
    roundRect(ctx, x*s+3,y*s+3,s-6,s-6,12); ctx.fill();
  }
  players.forEach((p,i)=>{ if(!p.alive)return; ctx.fillStyle=colors[i]; ctx.beginPath(); ctx.arc((p.x+.5)*s,(p.y+.5)*s,s*.28,0,7); ctx.fill(); ctx.font=`${s*.32}px sans-serif`; ctx.textAlign='center'; ctx.fillText(icons[i],(p.x+.5)*s,(p.y+.6)*s); });
  particles = particles.filter(p=>(p.x+=p.vx,p.y+=p.vy,p.life--)>0);
  for(const p of particles){ ctx.globalAlpha=p.life/30; ctx.fillStyle=p.c; ctx.fillRect(p.x,p.y,5,5); }
  ctx.globalAlpha = 1;
  requestAnimationFrame(tick);
}
function draw(){ }
function roundRect(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
init(); tick();
