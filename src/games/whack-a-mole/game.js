const holes = document.querySelectorAll('.hole');
const scoreBoard = document.getElementById('score');
const timeBoard = document.getElementById('time');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

let lastHole;
let timeUp = false;
let score = 0;
let timeLeft = 30;
let timerId;

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
    const time = randomTime(400, 1000); // Speed
    const hole = randomHole(holes);
    hole.classList.add('up');
    setTimeout(() => {
        hole.classList.remove('up');
        if (!timeUp) peep();
    }, time);
}

function startGame() {
    scoreBoard.textContent = 0;
    timeBoard.textContent = 30;
    score = 0;
    timeLeft = 30;
    timeUp = false;

    overlay.style.display = 'none';

    peep();

    timerId = setInterval(() => {
        timeLeft--;
        timeBoard.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            timeUp = true;
            showResult();
        }
    }, 1000);
}

function bonk(e) {
    if (!e.isTrusted) return; // cheater!

    // Use currentTarget or parentNode because click might be on mole or mole::after (pseudo)
    // Actually event is on hole? No, logic is better on hole.
    // But wait, if I click hole but mole is not up?
    // I should check if 'up' class is present.

    // Logic: Listener on hole.
    const hole = this;
    if (!hole.classList.contains('up')) return;

    if (hole.classList.contains('bonk')) return; // Already hit

    score++;
    scoreBoard.textContent = score;
    hole.classList.remove('up');
    hole.classList.add('bonk'); // Animation for hit
    setTimeout(() => hole.classList.remove('bonk'), 300); // Reset
}

function showResult() {
    overlay.innerHTML = `
    <h1>おしまい！</h1>
    <p style="font-size: 2rem;">スコア: ${score}</p>
    <button class="btn-primary" onclick="window.location.reload()">もういっかい</button>
    <a href="/pages/portal/portal.html" style="color: white; margin-top: 20px; display: block;">&larr; ほかのゲーム</a>
  `;
    overlay.style.display = 'flex';
}

holes.forEach(hole => hole.addEventListener('click', bonk));
startBtn.addEventListener('click', startGame);
