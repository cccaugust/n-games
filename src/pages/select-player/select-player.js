import { selectPlayer, requireAuth } from '../../js/auth.js';
import { supabase } from '../../js/supabaseClient.js';
import { isImageAvatar, makeImageAvatar, renderAvatarInto } from '../../js/avatar.js';
import { pokemonData } from '../../data/pokemonData.js';
import { assetPreviewDataUrl, listPixelAssets } from '../../js/pixelAssets.js';

requireAuth();

const playerGrid = document.getElementById('playerGrid');
const modal = document.getElementById('playerModal');
const modalTitle = document.getElementById('modalTitle');
const nameInput = document.getElementById('playerNameInput');
const avatarGrid = document.getElementById('avatarGrid');
const avatarPreview = document.getElementById('avatarPreview');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');

const tabEmoji = document.getElementById('tabEmoji');
const tabDot = document.getElementById('tabDot');
const tabPokedex = document.getElementById('tabPokedex');
const panelEmoji = document.getElementById('panelEmoji');
const panelDot = document.getElementById('panelDot');
const panelPokedex = document.getElementById('panelPokedex');
const dotAvatarGrid = document.getElementById('dotAvatarGrid');
const pokemonAvatarGrid = document.getElementById('pokemonAvatarGrid');

const AVATARS = [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙',
    '🦄', '🐲', '🦕', '🦖', '🐳', '🐬', '🐧', '🐔', '🐤', '🦅', '🦉', '🦋', '🐞', '🐝', '🐛',
    '👦', '👧', '👨‍💻', '👩‍🔬', '🧙‍♂️', '🧚‍♀️', '🧛‍♂️', '🧜‍♀️', '🧞‍♂️', '🧟‍♀️', '🤖', '👾', '👽', '👻', '💀'
];

const POKEMON_IMAGE_SET = new Set((pokemonData || []).map((p) => String(p.image || '')));

let editingPlayerId = null; // null means creating new
let selectedAvatar = AVATARS[0];
let activeTab = 'emoji';

function guessTabForAvatar(avatar) {
    if (!isImageAvatar(avatar)) return 'emoji';
    const src = String(avatar || '').slice('img:'.length);
    if (POKEMON_IMAGE_SET.has(src)) return 'pokedex';
    if (src.startsWith('data:image/')) return 'dot';
    return 'dot';
}

function setActiveTab(tab) {
    activeTab = tab;
    const isEmoji = tab === 'emoji';
    const isDot = tab === 'dot';
    const isDex = tab === 'pokedex';

    tabEmoji.classList.toggle('active', isEmoji);
    tabDot.classList.toggle('active', isDot);
    tabPokedex.classList.toggle('active', isDex);
    tabEmoji.setAttribute('aria-selected', String(isEmoji));
    tabDot.setAttribute('aria-selected', String(isDot));
    tabPokedex.setAttribute('aria-selected', String(isDex));

    panelEmoji.hidden = !isEmoji;
    panelDot.hidden = !isDot;
    panelPokedex.hidden = !isDex;

    updateAllSelectionUI();
}

// Initialize Avatar Grid
function initAvatarGrid() {
    avatarGrid.innerHTML = '';
    AVATARS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'avatar-option';
        btn.textContent = emoji;
        btn.dataset.value = emoji;
        btn.onclick = () => selectAvatarValue(emoji);
        avatarGrid.appendChild(btn);
    });
}

function updateSelectionUI(gridEl) {
    if (!gridEl) return;
    gridEl.querySelectorAll('.avatar-option').forEach((el) => {
        const v = el.dataset.value || '';
        el.classList.toggle('selected', v === selectedAvatar);
    });
}

function updateAllSelectionUI() {
    updateSelectionUI(avatarGrid);
    updateSelectionUI(dotAvatarGrid);
    updateSelectionUI(pokemonAvatarGrid);
}

function updateAvatarPreview() {
    renderAvatarInto(avatarPreview, selectedAvatar, { size: 72, className: 'avatar-preview-visual', alt: '' });
}

function selectAvatarValue(value) {
    selectedAvatar = value;
    updateAvatarPreview();
    setActiveTab(guessTabForAvatar(value));
    updateAllSelectionUI();
}

function renderImageOption(gridEl, { value, title = '', pixelated = false }) {
    if (!gridEl || !value) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'avatar-option';
    btn.dataset.value = value;
    btn.title = title;
    btn.onclick = () => selectAvatarValue(value);
    renderAvatarInto(btn, value, { size: 44, className: 'avatar-option-visual', alt: '' });
    if (pixelated) {
        const img = btn.querySelector('img');
        if (img) img.style.imageRendering = 'pixelated';
    }
    gridEl.appendChild(btn);
}

function initPokemonAvatarGrid() {
    if (!pokemonAvatarGrid) return;
    pokemonAvatarGrid.innerHTML = '';
    (pokemonData || []).forEach((p) => {
        const value = makeImageAvatar(p.image);
        renderImageOption(pokemonAvatarGrid, { value, title: p.name || '', pixelated: false });
    });
}

async function refreshDotAvatarGrid() {
    if (!dotAvatarGrid) return;
    dotAvatarGrid.innerHTML = '';
    const note = document.createElement('div');
    note.className = 'tiny-help';
    note.textContent = '読み込み中…';
    dotAvatarGrid.appendChild(note);

    let assets = [];
    try {
        assets = await listPixelAssets();
    } catch (e) {
        console.warn('Failed to load dot avatars:', e);
        assets = [];
    }

    dotAvatarGrid.innerHTML = '';
    if (!assets.length) {
        const empty = document.createElement('div');
        empty.className = 'tiny-help';
        empty.textContent = 'まだドット絵がないよ。ドット絵メーカーで作ってみてね。';
        dotAvatarGrid.appendChild(empty);
        return;
    }

    assets.slice(0, 60).forEach((asset) => {
        const preview = assetPreviewDataUrl(asset, 72);
        const value = makeImageAvatar(preview);
        renderImageOption(dotAvatarGrid, { value, title: asset.name || '', pixelated: true });
    });
    updateAllSelectionUI();
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
        selectAvatarValue(player.avatar || AVATARS[0]);
    } else {
        // Create mode
        editingPlayerId = null;
        modalTitle.textContent = 'あたらしくつくる';
        // Random default avatar
        selectAvatarValue(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
    }

    // Make sure the other grids are ready (and dot-art is up-to-date).
    initPokemonAvatarGrid();
    refreshDotAvatarGrid();

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

tabEmoji.onclick = () => setActiveTab('emoji');
tabDot.onclick = () => setActiveTab('dot');
tabPokedex.onclick = () => setActiveTab('pokedex');

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
      <div class="avatar" data-avatar></div>
      <div class="name">${p.name}</div>
    `;

        renderAvatarInto(card.querySelector('[data-avatar]'), p.avatar, { size: 72, className: 'avatar-visual', alt: '' });

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
// Ensure auxiliary grids are ready even before opening modal.
initPokemonAvatarGrid();
