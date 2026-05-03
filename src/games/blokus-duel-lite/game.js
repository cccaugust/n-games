const COLORS = ['#4dabf7', '#ff6b6b', '#51cf66', '#ffd43b'];
const CORNERS = [[0,0],[19,19],[0,19],[19,0]];
const basePieces = [
 [[0,0]], [[0,0],[1,0]], [[0,0],[1,0],[2,0]], [[0,0],[0,1],[1,0]], [[0,0],[1,0],[2,0],[3,0]],
 [[0,0],[1,0],[0,1],[1,1]], [[0,0],[0,1],[0,2],[1,2]], [[0,0],[1,0],[2,0],[1,1]], [[0,1],[1,0],[1,1],[2,1]],
 [[0,0],[1,0],[2,0],[0,1]], [[0,0],[1,0],[2,0],[3,0],[4,0]], [[0,0],[0,1],[0,2],[0,3],[1,3]],
 [[0,0],[1,0],[2,0],[1,1],[1,2]], [[0,0],[0,1],[1,1],[1,2],[2,2]], [[0,1],[1,0],[1,1],[1,2],[2,1]],
 [[0,0],[1,0],[1,1],[2,1],[2,2]], [[0,0],[1,0],[2,0],[2,1],[3,1]], [[0,0],[1,0],[2,0],[3,0],[1,1]],
 [[0,0],[1,0],[1,1],[2,1],[3,1]], [[0,0],[1,0],[2,0],[0,1],[2,1]], [[0,0],[0,1],[1,1],[2,1],[2,2]]
];

const state = { size:20, players:4, turn:0, board:[], hands:[], firstMove:[], selected:null, rot:0, flip:false, over:false };
const boardEl = document.getElementById('board');
const piecesEl = document.getElementById('pieces');
const statusEl = document.getElementById('status');
const fx = document.getElementById('fxCanvas'); const fctx = fx.getContext('2d');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function beep(freq=500,duration=.06){const o=audioCtx.createOscillator();const g=audioCtx.createGain();o.frequency.value=freq;o.connect(g);g.connect(audioCtx.destination);g.gain.value=.05;o.start();g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+duration);o.stop(audioCtx.currentTime+duration)}
function norm(cells){const xs=cells.map(c=>c[0]), ys=cells.map(c=>c[1]);const minX=Math.min(...xs), minY=Math.min(...ys);return cells.map(([x,y])=>[x-minX,y-minY]);}
function transform(cells, rot, flip){let c=cells.map(([x,y])=>[flip?-x:x,y]);for(let i=0;i<rot;i++) c=c.map(([x,y])=>[y,-x]); return norm(c);}
function init(){state.players=Number(document.getElementById('playerCount').value);state.turn=0;state.over=false;state.board=Array.from({length:20},()=>Array(20).fill(-1));state.hands=Array.from({length:state.players},()=>basePieces.map((_,i)=>i));state.firstMove=Array(state.players).fill(true);state.selected=null;state.rot=0;state.flip=false;buildBoard();renderPieces();renderStatus();resizeFx();}
function buildBoard(){boardEl.innerHTML='';for(let y=0;y<20;y++)for(let x=0;x<20;x++){const d=document.createElement('div');d.className='cell';d.dataset.x=x;d.dataset.y=y;d.addEventListener('pointerdown',()=>placeAt(x,y));boardEl.appendChild(d);}renderBoard();}
function renderBoard(preview=[]){[...boardEl.children].forEach(cell=>{const x=+cell.dataset.x,y=+cell.dataset.y,v=state.board[y][x];cell.style.background=v===-1?'#0f1233':COLORS[v];cell.classList.toggle('preview', preview.some(([px,py])=>px===x&&py===y));});}
function renderPieces(){piecesEl.innerHTML='';const hand=state.hands[state.turn];hand.forEach(id=>{const btn=document.createElement('button');btn.className='piece';if(state.selected===id)btn.classList.add('selected');btn.style.setProperty('--c',COLORS[state.turn]);btn.innerHTML=`<div>#${id+1}</div>`;const shape=transform(basePieces[id],state.rot,state.flip);const maxX=Math.max(...shape.map(c=>c[0]))+1,maxY=Math.max(...shape.map(c=>c[1]))+1;const mini=document.createElement('div');mini.className='mini';mini.style.gridTemplateColumns=`repeat(${maxX},12px)`;for(let y=0;y<maxY;y++)for(let x=0;x<maxX;x++){const s=document.createElement('span');if(shape.some(c=>c[0]===x&&c[1]===y))s.className='on';mini.appendChild(s);}btn.appendChild(mini);btn.onclick=()=>{state.selected=id;beep(700);renderPieces();};piecesEl.appendChild(btn);});}
function cellsAt(ax,ay){if(state.selected==null)return[];return transform(basePieces[state.selected],state.rot,state.flip).map(([x,y])=>[ax+x,ay+y]);}
function valid(cells,p){if(!cells.length) return false; if(cells.some(([x,y])=>x<0||y<0||x>=20||y>=20||state.board[y][x]!==-1))return false;
 let cornerTouch=false, edgeTouch=false;
 for(const [x,y] of cells){[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<20&&ny<20&&state.board[ny][nx]===p)edgeTouch=true;});
 [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([dx,dy])=>{const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<20&&ny<20&&state.board[ny][nx]===p)cornerTouch=true;});}
 if(state.firstMove[p]){const [cx,cy]=CORNERS[p];return cells.some(([x,y])=>x===cx&&y===cy);} return cornerTouch && !edgeTouch;
}
function nextTurn(){for(let i=1;i<=state.players;i++){const np=(state.turn+i)%state.players;if(hasMove(np)){state.turn=np;state.selected=null;state.rot=0;state.flip=false;renderPieces();renderStatus();return;}}endGame();}
function hasMove(p){for(const id of state.hands[p])for(let r=0;r<4;r++)for(const f of [false,true]){const sh=transform(basePieces[id],r,f);for(let y=0;y<20;y++)for(let x=0;x<20;x++){if(valid(sh.map(([sx,sy])=>[x+sx,y+sy]),p))return true;}}return false;}
function placeAt(x,y){if(state.over||state.selected==null)return;const cells=cellsAt(x,y);renderBoard(cells);if(!valid(cells,state.turn)){beep(180,.08);return;}cells.forEach(([cx,cy])=>state.board[cy][cx]=state.turn);state.hands[state.turn]=state.hands[state.turn].filter(v=>v!==state.selected);state.firstMove[state.turn]=false;burst(x,y,COLORS[state.turn]);beep(420,.09);renderBoard();nextTurn();}
function renderStatus(){statusEl.textContent=state.over?'ゲーム終了':`手番: プレイヤー${state.turn+1}`;statusEl.style.color=COLORS[state.turn]||'#fff';}
function endGame(){state.over=true;const scores=Array.from({length:state.players},(_,p)=>20*20-state.hands[p].reduce((s,id)=>s+basePieces[id].length,0));const winner=scores.indexOf(Math.max(...scores));statusEl.textContent=`終了！勝者: プレイヤー${winner+1} (${scores.join(' / ')})`;}
function burst(x,y,color){const rect=boardEl.getBoundingClientRect();const cell=rect.width/20;const ox=rect.left+(x+0.5)*cell, oy=rect.top+(y+0.5)*cell;const p=Array.from({length:18},()=>({x:ox,y:oy,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,life:1}));const step=()=>{fctx.clearRect(0,0,fx.width,fx.height);p.forEach(pt=>{pt.x+=pt.vx;pt.y+=pt.vy;pt.vy+=0.04;pt.life-=0.03;fctx.globalAlpha=Math.max(pt.life,0);fctx.fillStyle=color;fctx.fillRect(pt.x,pt.y,5,5);});if(p.some(pt=>pt.life>0))requestAnimationFrame(step);};step();}
function resizeFx(){fx.width=innerWidth*devicePixelRatio;fx.height=innerHeight*devicePixelRatio;fctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);}

document.getElementById('newGameBtn').onclick=init;
document.getElementById('rotateBtn').onclick=()=>{state.rot=(state.rot+1)%4;beep(610,.04);renderPieces();};
document.getElementById('flipBtn').onclick=()=>{state.flip=!state.flip;beep(520,.04);renderPieces();};
document.getElementById('skipBtn').onclick=()=>{nextTurn();};
window.addEventListener('resize',resizeFx);
init();
