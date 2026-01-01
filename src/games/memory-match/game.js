import { pokemonData } from '../../data/pokemonData.js';

const grid = document.getElementById('grid');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');
const winOverlay = document.getElementById('winOverlay');

// Select 8 random pokemon
let gameDeck = [];

function initGameData() {
    const shuffledPokemon = [...pokemonData].sort(() => 0.5 - Math.random());
    const selected = shuffledPokemon.slice(0, 8);
    // Create pairs
    gameDeck = [...selected, ...selected];
}

let hasFlippedCard = false;
let lockBoard = false;
let firstCard, secondCard;
let matchesFound = 0;

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function createBoard() {
    initGameData();
    shuffle(gameDeck);
    grid.innerHTML = '';
    gameDeck.forEach(pokemon => {
        const slot = document.createElement('div');
        slot.className = 'card-slot';

        const card = document.createElement('div');
        card.className = 'memory-card';
        card.dataset.id = pokemon.id; // Use ID for matching

        const frontApi = `<img src="${pokemon.image}" alt="${pokemon.name}" style="width: 100%; height: 100%; object-fit: contain;">`;

        card.innerHTML = `
      <div class="face front" style="background: #1a1a2e; padding: 5px;">${frontApi}</div>
      <div class="face back">?</div>
    `;

        card.addEventListener('click', flipCard);

        slot.appendChild(card);
        grid.appendChild(slot);
    });
}

function flipCard() {
    if (lockBoard) return;
    if (this === firstCard) return;

    this.classList.add('flipped');

    if (!hasFlippedCard) {
        // First flip
        hasFlippedCard = true;
        firstCard = this;
        return;
    }

    // Second flip
    secondCard = this;
    checkForMatch();
}

function checkForMatch() {
    let isMatch = firstCard.dataset.id === secondCard.dataset.id;

    if (isMatch) {
        disableCards();
    } else {
        unflipCards();
    }
}

function disableCards() {
    firstCard.removeEventListener('click', flipCard);
    secondCard.removeEventListener('click', flipCard);

    matchesFound++;
    if (matchesFound === 8) { // Hardcoded 8 pairs for now
        setTimeout(() => {
            winOverlay.style.display = 'flex';
            // Fire confetti here if we had library!
        }, 500);
    }

    resetBoard();
}

function unflipCards() {
    lockBoard = true;
    setTimeout(() => {
        firstCard.classList.remove('flipped');
        secondCard.classList.remove('flipped');
        resetBoard();
    }, 1000);
}

function resetBoard() {
    [hasFlippedCard, lockBoard] = [false, false];
    [firstCard, secondCard] = [null, null];
}

startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    createBoard();
});
