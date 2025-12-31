import { selectPlayer, requireAuth } from '../../js/auth.js';
import { navigateTo } from '../../js/config.js';
import { supabase } from '../../js/supabaseClient.js';

requireAuth();

const playerGrid = document.getElementById('playerGrid');
const AVATARS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙'];

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

async function addPlayer(name) {
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
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
    if (!confirm('本当に削除しますか？')) return;

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
            // Prevent click if clicking buttons
            if (e.target.classList.contains('action-btn')) return;
            choosePlayer(p);
        };

        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.onclick = (e) => deletePlayer(p.id, e);

        const editBtn = card.querySelector('.edit-btn');
        editBtn.onclick = (e) => openEditModal(p, e);

        playerGrid.appendChild(card);
    });

    const addBtn = document.createElement('div');
    addBtn.className = 'player-card add-btn';
    addBtn.innerHTML = `<div class="avatar">➕</div><div class="name">あたらしくつくる</div>`;
    addBtn.onclick = handleAddClick;
    playerGrid.appendChild(addBtn);
}

function choosePlayer(player) {
    selectPlayer(player);
    navigateTo('/pages/portal/portal.html');
}

function handleAddClick() {
    const name = prompt('新しいプレイヤーのなまえをおしえてね！');
    if (name) addPlayer(name);
}

// Edit Modal Logic
function openEditModal(player, event) {
    event.stopPropagation();
    const newName = prompt('名前を変更:', player.name);
    if (newName === null) return; // Cancelled

    // Simple avatar cycle for now or prompt? 
    // Let's implement a simple "Keep or Randomize" prompt or just random for now to keep it simple as requested "change".
    // Better: Prompt for emoji?

    let newAvatar = player.avatar;
    if (confirm('アイコンも変更しますか？ (OKでランダムに変更)')) {
        newAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    }

    if (newName !== player.name || newAvatar !== player.avatar) {
        updatePlayer(player.id, newName || player.name, newAvatar);
    }
}

renderPlayers();
