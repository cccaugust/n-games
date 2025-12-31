import { selectPlayer, requireAuth } from '../../js/auth.js';
import { navigateTo } from '../../js/config.js';

// Ensure family auth
requireAuth();

const playerGrid = document.getElementById('playerGrid');
const newPlayerBtn = document.getElementById('newPlayerBtn');

// Mock players for now (could be from localStorage or Supabase later)
const defaultPlayers = [
    { name: 'パパ', avatar: '👨‍💻' },
    { name: 'ママ', avatar: '👩‍🔬' },
    { name: 'リクトくん', avatar: '👦' }, // Example name
];

function renderPlayers() {
    defaultPlayers.forEach(p => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
      <div class="avatar">${p.avatar}</div>
      <div class="name">${p.name}</div>
    `;
        card.onclick = () => choosePlayer(p.name);
        playerGrid.appendChild(card);
    });
}

function choosePlayer(name) {
    selectPlayer(name);
    navigateTo('/pages/portal/portal.html');
}

renderPlayers();

newPlayerBtn.addEventListener('click', () => {
    const name = prompt('新しいプレイヤーのなまえをおしえてね！');
    if (name) {
        choosePlayer(name);
    }
});
