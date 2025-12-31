import { selectPlayer, requireAuth } from '../../js/auth.js';
import { navigateTo } from '../../js/config.js';
import { supabase } from '../../js/supabaseClient.js';

requireAuth();

const playerGrid = document.getElementById('playerGrid');
const modal = document.getElementById('playerModal');
const modalTitle = document.getElementById('modalTitle');
const nameInput = document.getElementById('playerNameInput');
const avatarGrid = document.getElementById('avatarGrid');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');

const AVATARS = [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙',
    '🦄', '🐲', '🦕', '🦖', '🐳', '🐬', '🐧', '🐔', '🐤', '🦅', '🦉', '🦋', '🐞', '🐝', '🐛',
    '👦', '👧', '👨‍💻', '👩‍🔬', '🧙‍♂️', '🧚‍♀️', '🧛‍♂️', '🧜‍♀️', '🧞‍♂️', '🧟‍♀️', '🤖', '👾', '👽', '👻', '💀'
];

let editingPlayerId = null; // null means creating new
let selectedAvatar = AVATARS[0];

// Initialize Avatar Grid
function initAvatarGrid() {
    avatarGrid.innerHTML = '';
    AVATARS.forEach(emoji => {
        const div = document.createElement('div');
        div.className = 'avatar-option';
        div.textContent = emoji;
        div.onclick = () => selectAvatar(emoji);
        avatarGrid.appendChild(div);
    });
}

function selectAvatar(emoji) {
    selectedAvatar = emoji;
    // Update UI
    const options = avatarGrid.children;
    for (let bg of options) {
        if (bg.textContent === emoji) bg.classList.add('selected');
        else bg.classList.remove('selected');
    }
}

// Modal Control
function openModal(player = null) {
    initAvatarGrid(); // Reset grid selection UI
    modal.style.display = 'flex';
    nameInput.value = '';

    if (player) {
        // Edit mode
        editingPlayerId = player.id;
        modalTitle.textContent = 'なおす';
        nameInput.value = player.name;
        selectAvatar(player.avatar);
    } else {
        // Create mode
        editingPlayerId = null;
        modalTitle.textContent = 'あたらしくつくる';
        // Random default avatar
        selectAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
    }

    nameInput.focus();
}

function closeModal() {
    modal.style.display = 'none';
}

cancelBtn.onclick = closeModal;
// Close on outside click
modal.onclick = (e) => {
    if (e.target === modal) closeModal();
};

saveBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) {
        alert('なまえをいれてね！');
        return;
    }

    // Disable button to prevent double submit
    saveBtn.disabled = true;
    saveBtn.textContent = '...';

    if (editingPlayerId) {
        await updatePlayer(editingPlayerId, name, selectedAvatar);
    } else {
        await addPlayer(name, selectedAvatar);
    }

    saveBtn.disabled = false;
    saveBtn.textContent = 'これにする！';
    closeModal();
};


/* ================= API Logic ================= */

async function fetchPlayers() {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching players:', error);
        return [];
    }
    return data;
}

async function addPlayer(name, avatar) {
    const { error } = await supabase
        .from('players')
        .insert([{ name, avatar }]);

    if (error) alert('追加できませんでした');
    else renderPlayers();
}

async function updatePlayer(id, name, avatar) {
    const { error } = await supabase
        .from('players')
        .update({ name, avatar })
        .eq('id', id);

    if (error) alert('更新できませんでした');
    else renderPlayers();
}

async function deletePlayer(id, event) {
    event.stopPropagation();
    if (!confirm('本当に消しちゃう？')) return;

    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) alert('削除できませんでした');
    else renderPlayers();
}

async function renderPlayers() {
    const players = await fetchPlayers();
    playerGrid.innerHTML = '';

    players.forEach(p => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
      <div class="action-btn delete-btn" title="削除">×</div>
      <div class="action-btn edit-btn" title="編集">✏️</div>
      <div class="avatar">${p.avatar}</div>
      <div class="name">${p.name}</div>
    `;

        card.onclick = (e) => {
            if (e.target.classList.contains('action-btn')) return;
            choosePlayer(p);
        };

        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.onclick = (e) => deletePlayer(p.id, e);

        const editBtn = card.querySelector('.edit-btn');
        editBtn.onclick = (e) => {
            e.stopPropagation();
            openModal(p);
        };

        playerGrid.appendChild(card);
    });

    const addBtn = document.createElement('div');
    addBtn.className = 'player-card add-btn';
    addBtn.innerHTML = `<div class="avatar">➕</div><div class="name">あたらしくつくる</div>`;
    addBtn.onclick = () => openModal(null);
    playerGrid.appendChild(addBtn);
}

function choosePlayer(player) {
    selectPlayer(player);
    navigateTo('/pages/portal/portal.html');
}

// Initial render
renderPlayers();
