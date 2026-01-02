import { getCurrentPlayer } from '../../js/auth.js';
import { saveScore, getRankings } from '../../js/score.js';
import { avatarToHtml } from '../../js/avatar.js';

const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const timeEl = document.getElementById('time');
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

let score = 0;
let timeLeft = 60;
let isGameRunning = false;
let timerId;
let currentAnswer;

function startGame() {
    score = 0;
    timeLeft = 60;
    scoreEl.textContent = 0;
    timeEl.textContent = 60;
    isGameRunning = true;
    overlay.style.display = 'none';

    generateQuestion();

    timerId = setInterval(() => {
        timeLeft--;
        timeEl.textContent = timeLeft;
        if (timeLeft <= 0) {
            gameOver();
        }
    }, 1000);
}

function generateQuestion() {
    if (!isGameRunning) return;

    // Difficulty scales slightly?
    const op = Math.random() > 0.5 ? '+' : '-';
    let a, b, ans;

    if (op === '+') {
        a = Math.floor(Math.random() * 20) + 1;
        b = Math.floor(Math.random() * 20) + 1;
        ans = a + b;
    } else {
        a = Math.floor(Math.random() * 20) + 5;
        b = Math.floor(Math.random() * a); // ensure positive result
        ans = a - b;
    }

    currentAnswer = ans;
    questionEl.textContent = `${a} ${op} ${b} = ?`;

    // Generate Options
    let opts = [ans];
    while (opts.length < 4) {
        let fake = ans + (Math.floor(Math.random() * 10) - 5);
        if (fake !== ans && fake >= 0 && !opts.includes(fake)) {
            opts.push(fake);
        }
    }
    // Shuffle
    opts.sort(() => Math.random() - 0.5);

    optionsEl.innerHTML = '';
    opts.forEach(val => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = val;
        btn.onclick = () => checkAnswer(val, btn);
        optionsEl.appendChild(btn);
    });
}

function checkAnswer(val, btn) {
    if (!isGameRunning) return;

    const correct = val === currentAnswer;

    if (correct) {
        btn.classList.add('correct');
        score++;
        scoreEl.textContent = score;
        setTimeout(generateQuestion, 300);
    } else {
        btn.classList.add('wrong');
        // Penalty?
        timeLeft = Math.max(0, timeLeft - 2); // -2 seconds
        timeEl.textContent = timeLeft;
        // Shake
        questionEl.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-10px)' },
            { transform: 'translateX(10px)' },
            { transform: 'translateX(0)' }
        ], { duration: 300 });
    }
}


async function gameOver() {
    isGameRunning = false;
    clearInterval(timerId);

    const player = getCurrentPlayer();
    if (player) {
        await saveScore('math-quiz', player.id, score);
    }

    const rankings = await getRankings('math-quiz');
    const rankingHtml = rankings.map((r, i) => `
        <div style="display: flex; justify-content: space-between; width: 100%; padding: 5px; border-bottom: 1px solid #eee;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: bold; width: 20px;">${i + 1}.</span>
                <span>${avatarToHtml(r.avatar, { sizePx: 24 })}</span>
                <span style="overflow: hidden; text-overflow: ellipsis; max-width: 120px; white-space: nowrap;">${r.name}</span>
            </div>
            <span style="font-weight: bold;">${r.score}もん</span>
        </div>
    `).join('');

    overlay.innerHTML = `
        <h1 style="color: var(--primary-color);">おしまい！</h1>
        <p style="font-size: 2rem; color: #2d3436;">せいかい: ${score}</p>
        
        <div style="background: #f1f2f6; padding: 15px; border-radius: 12px; margin: 15px 0; width: 90%; max-width: 400px; text-align: left; color: #2d3436;">
            <h3 style="text-align: center; margin-bottom: 10px;">🏆 ランキング</h3>
            ${rankingHtml}
        </div>

        <button class="btn-primary" id="restartBtn">もういっかい</button>
        <a href="../../pages/portal/portal.html" style="color: #636e72; margin-top: 20px; display: block; text-decoration: none;">&larr; ほかのゲーム</a>
    `;
    overlay.style.display = 'flex';
    document.getElementById('restartBtn').onclick = () => window.location.reload();
}

startBtn.addEventListener('click', startGame);
