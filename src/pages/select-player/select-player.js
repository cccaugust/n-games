import { selectPlayer, requireAuth } from '../../js/auth.js';
import { navigateTo } from '../../js/config.js';
import { supabase } from '../../js/supabaseClient.js';
import { pokemonData } from '../../data/pokemonData.js';
import { listPixelAssets, assetPreviewDataUrl } from '../../js/pixelAssets.js';
import { avatarToHtml, parseAvatar } from '../../js/avatar.js';

requireAuth();

const playerGrid = document.getElementById('playerGrid');
const modal = document.getElementById('playerModal');
const modalTitle = document.getElementById('modalTitle');
const nameInput = document.getElementById('playerNameInput');
const avatarGrid = document.getElementById('avatarGrid');
const avatarTabs = document.getElementById('avatarTabs');
const avatarHint = document.getElementById('avatarHint');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');

const AVATARS = [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙',
    '🦄', '🐲', '🦕', '🦖', '🐳', '🐬', '🐧', '🐔', '🐤', '🦅', '🦉', '🦋', '🐞', '🐝', '🐛',
    '👦', '👧', '👨‍💻', '👩‍🔬', '🧙‍♂️', '🧚‍♀️', '🧛‍♂️', '🧜‍♀️', '🧞‍♂️', '🧟‍♀️', '🤖', '👾', '👽', '👻', '💀'
];

let editingPlayerId = null; // null means creating new
let selectedAvatar = AVATARS[0];
let selectedTab = 'emoji';

function setAvatarTab(tab) {
    selectedTab = tab;
    if (avatarTabs) {
        avatarTabs.querySelectorAll('.avatar-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
    }
}

function clearAvatarGrid() {
    avatarGrid.innerHTML = '';
}

function renderAvatarOption({ value, html, title }) {
    const div = document.createElement('div');
    div.className = 'avatar-option';
    div.dataset.avatarValue = value;
    if (title) div.title = title;
    div.innerHTML = html;
    div.onclick = () => selectAvatar(value);
    avatarGrid.appendChild(div);
}

function selectAvatar(value) {
    selectedAvatar = value;
    // Update UI selection
    avatarGrid.querySelectorAll('.avatar-option').forEach((el) => {
        el.classList.toggle('selected', el.dataset.avatarValue === value);
    });
}

function getTabForAvatar(avatar) {
    const parsed = parseAvatar(avatar);
    if (parsed.type === 'pokedex') return 'pokedex';
    if (parsed.type === 'image') return 'dot';
    return 'emoji';
}

function initEmojiGrid() {
    clearAvatarGrid();
    AVATARS.forEach(emoji => {
        renderAvatarOption({
            value: emoji,
            html: avatarToHtml(emoji, { sizePx: 32 }),
            title: 'えもじ'
        });
    });
    avatarHint.textContent = 'えもじからえらべるよ';
    selectAvatar(selectedAvatar);
}

function initPokedexGrid() {
    clearAvatarGrid();
    pokemonData.forEach((p) => {
        const value = `pokedex:${p.id}`;
        renderAvatarOption({
            value,
            html: avatarToHtml(value, { sizePx: 40, title: p.name }),
            title: `${p.name}（No.${p.id}）`
        });
    });
    avatarHint.textContent = 'ポケモンずかんの かおからえらべるよ';
    selectAvatar(selectedAvatar);
}

async function initDotGrid() {
    clearAvatarGrid();

    if (!editingPlayerId) {
        avatarHint.textContent = '※ まずプレイヤーを作ってから「ドット絵メーカー」で作品を作ると、ここからえらべるよ';
        const note = document.createElement('div');
        note.className = 'avatar-hint';
        note.textContent = '（いまは まだ えらべないよ）';
        avatarGrid.appendChild(note);
        return;
    }

    avatarHint.textContent = 'ドット絵メーカーの作品からえらべるよ';
    const ownerId = String(editingPlayerId);
    let list = [];
    try {
        list = await listPixelAssets({ ownerId });
    } catch (e) {
        console.warn('Failed to load pixel assets:', e);
    }

    if (!list.length) {
        const note = document.createElement('div');
        note.className = 'avatar-hint';
        note.textContent = 'まだ作品がないよ。ドット絵メーカーで作ってから来てね！';
        avatarGrid.appendChild(note);
        return;
    }

    list.forEach((asset) => {
        const dataUrl = assetPreviewDataUrl(asset, 64);
        renderAvatarOption({
            value: dataUrl,
            html: avatarToHtml(dataUrl, { sizePx: 40, title: asset.name }),
            title: asset.name
        });
    });
    selectAvatar(selectedAvatar);
}

// Modal Control
function openModal(player = null) {
    modal.style.display = 'flex';
    nameInput.value = '';

    if (player) {
        // Edit mode
        editingPlayerId = player.id;
        modalTitle.textContent = 'なおす';
        nameInput.value = player.name;
        selectedAvatar = player.avatar;
    } else {
        // Create mode
        editingPlayerId = null;
        modalTitle.textContent = 'あたらしくつくる';
        // Random default avatar
        selectedAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    }

    // pick tab by current avatar and render
    const tab = getTabForAvatar(selectedAvatar);
    setAvatarTab(tab);
    void renderAvatarGridForTab(tab);

    nameInput.focus();
}

async function renderAvatarGridForTab(tab) {
    if (tab === 'pokedex') {
        initPokedexGrid();
        return;
    }
    if (tab === 'dot') {
        await initDotGrid();
        return;
    }
    initEmojiGrid();
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

// Tabs
if (avatarTabs) {
    avatarTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.avatar-tab');
        if (!btn) return;
        const tab = btn.dataset.tab;
        if (!tab) return;
        setAvatarTab(tab);
        void renderAvatarGridForTab(tab);
    });
}


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
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.title = '削除';
        deleteBtn.textContent = '×';

        const editBtn = document.createElement('div');
        editBtn.className = 'action-btn edit-btn';
        editBtn.title = '編集';
        editBtn.textContent = '✏️';

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = avatarToHtml(p.avatar || '👤', { sizePx: 64, title: p.name });

        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = p.name;

        card.appendChild(deleteBtn);
        card.appendChild(editBtn);
        card.appendChild(avatar);
        card.appendChild(name);

        card.onclick = (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('action-btn')) return;
            choosePlayer(p);
        };

        deleteBtn.onclick = (e) => deletePlayer(p.id, e);

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
