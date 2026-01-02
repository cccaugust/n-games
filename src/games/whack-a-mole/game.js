import { getCurrentPlayer } from '../../js/auth.js';
import { saveScore, getRankings } from '../../js/score.js';
import { avatarToHtml } from '../../js/avatar.js';

let score = 0;
let timeLeft = 30;
let isGameRunning = false;
let gameTimer;
let moleTimer;
let lastHole;

const holes = document.querySelectorAll('.hole');
const scoreBoard = document.getElementById('score');
const timeBoard = document.getElementById('time');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');
const resultOverlay = document.getElementById('resultOverlay');

function randomTime(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

function randomHole(holes) {
    const idx = Math.floor(Math.random() * holes.length);
    const hole = holes[idx];
    if (hole === lastHole) {
        return randomHole(holes);
    }
    lastHole = hole;
    return hole;
}

function peep() {
    const time = randomTime(400, 1000);
    const hole = randomHole(holes);
    hole.classList.add('up');

    setTimeout(() => {
        hole.classList.remove('up');
        if (isGameRunning) peep();
    }, time);
}

function startGame() {
    scoreBoard.textContent = 0;
    timeBoard.textContent = 30;
    score = 0;
    timeLeft = 30;
    isGameRunning = true;
    overlay.style.display = 'none';

    peep();

    gameTimer = setInterval(() => {
        timeLeft--;
        timeBoard.textContent = timeLeft;
        if (timeLeft <= 0) {
            gameOver();
        }
    }, 1000);
}

function bonk(e) {
    if (!e.isTrusted) return; // cheater!
    if (!this.classList.contains('up')) return;

    this.classList.remove('up');
    this.classList.add('bonk');
    setTimeout(() => this.classList.remove('bonk'), 300);

    score++;
    scoreBoard.textContent = score;
}

holes.forEach(hole => hole.addEventListener('mousedown', bonk));
holes.forEach(hole => hole.addEventListener('touchstart', bonk));

startBtn.addEventListener('click', startGame);

async function gameOver() {
    isGameRunning = false;
    clearInterval(gameTimer);

    // Save Score
    const player = getCurrentPlayer();
    if (player) {
        await saveScore('whack-a-mole', player.id, score);
    }

    // Get Rankings
    const rankings = await getRankings('whack-a-mole');
    const rankingHtml = rankings.map((r, i) => `
        <div style="display: flex; justify-content: space-between; width: 100%; padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.2);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: bold; width: 20px;">${i + 1}.</span>
                <span>${avatarToHtml(r.avatar, { sizePx: 24 })}</span>
                <span style="overflow: hidden; text-overflow: ellipsis; max-width: 120px; white-space: nowrap;">${r.name}</span>
            </div>
            <span style="font-weight: bold;">${r.score}点</span>
        </div>
    `).join('');

    resultOverlay.innerHTML = `
    <h1>おしまい！</h1>
    <p style="font-size: 2rem;">スコア: ${score}</p>
    
    <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 12px; margin: 15px 0; width: 90%; max-width: 400px; text-align: left;">
        <h3 style="text-align: center; margin-bottom: 10px;">🏆 ランキング</h3>
        ${rankingHtml}
    </div>

    <button class="btn-primary" onclick="window.location.reload()">もういっかい</button>
    <a href="../../pages/portal/portal.html" style="color: white; margin-top: 20px; display: block;">&larr; ほかのゲーム</a>
  `;
    resultOverlay.style.display = 'flex';
}
