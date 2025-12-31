import { selectPlayer, requireAuth } from '../../js/auth.js';
import { navigateTo } from '../../js/config.js';
import { supabase } from '../../js/supabaseClient.js';

// Ensure family auth
requireAuth();

const playerGrid = document.getElementById('playerGrid');
const newPlayerBtn = document.getElementById('newPlayerBtn');

// Emojis for random avatar
const AVATARS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙'];

async function fetchPlayers() {
    // Show loading state if needed, or just wait
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching players:', error);
        alert('プレイヤーの読み込みに失敗しました');
        return [];
    }
    return data;
}

async function addPlayer(name) {
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const { error } = await supabase
        .from('players')
        .insert([{ name, avatar }]);

    if (error) {
        console.error('Error adding player:', error);
        alert('追加できませんでした');
    } else {
        renderPlayers();
    }
}

async function deletePlayer(id, event) {
    event.stopPropagation(); // Prevent card click
    if (!confirm('本当に削除しますか？')) return;

    const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting player:', error);
        alert('削除できませんでした');
    } else {
        renderPlayers();
    }
}

async function renderPlayers() {
    // Keep the "Add" button, remove others
    // Actually simpler to clear all and append "Add" button again or just clear logic

    const players = await fetchPlayers();

    // Clear grid
    playerGrid.innerHTML = '';

    // Render players
    players.forEach(p => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
      <div class="delete-btn" title="削除">×</div>
      <div class="avatar">${p.avatar}</div>
      <div class="name">${p.name}</div>
    `;

        // Click card to select
        card.onclick = () => choosePlayer(p);

        // Delete button
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.onclick = (e) => deletePlayer(p.id, e);

        playerGrid.appendChild(card);
    });

    // Append "Add New" button at the end
    const addBtn = document.createElement('div');
    addBtn.className = 'player-card add-btn';
    addBtn.innerHTML = `
    <div class="avatar">➕</div>
    <div class="name">あたらしくつくる</div>
  `;
    addBtn.onclick = handleAddClick;
    playerGrid.appendChild(addBtn);
}

function choosePlayer(player) {
    selectPlayer(player);
    navigateTo('/pages/portal/portal.html');
}

function handleAddClick() {
    const name = prompt('新しいプレイヤーのなまえをおしえてね！');
    if (name) {
        addPlayer(name);
    }
}

// Initial render
renderPlayers();
