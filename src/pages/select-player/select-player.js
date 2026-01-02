import { selectPlayer, requireAuth } from '../../js/auth.js';
import { navigateTo } from '../../js/config.js';
import { supabase } from '../../js/supabaseClient.js';
import { isImageAvatar, makeImageAvatar, renderAvatarInto } from '../../js/avatar.js';

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
const openPixelArtMakerBtn = document.getElementById('openPixelArtMakerBtn');
const openPokedexBtn = document.getElementById('openPokedexBtn');
const useUploadedImageBtn = document.getElementById('useUploadedImageBtn');
const uploadAvatarInput = document.getElementById('uploadAvatarInput');

const AVATARS = [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙',
    '🦄', '🐲', '🦕', '🦖', '🐳', '🐬', '🐧', '🐔', '🐤', '🦅', '🦉', '🦋', '🐞', '🐝', '🐛',
    '👦', '👧', '👨‍💻', '👩‍🔬', '🧙‍♂️', '🧚‍♀️', '🧛‍♂️', '🧜‍♀️', '🧞‍♂️', '🧟‍♀️', '🤖', '👾', '👽', '👻', '💀'
];

const AVATAR_PICK_KEY = 'ngames.avatar.pick.v1';
const AVATAR_CTX_KEY = 'ngames.avatar.ctx.v1';

let editingPlayerId = null; // null means creating new
let selectedAvatar = AVATARS[0];
let activeTab = 'emoji';

function readJson(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // ignore
    }
}

function guessTabForAvatar(avatar) {
    if (!isImageAvatar(avatar)) return 'emoji';
    const src = String(avatar || '').slice('img:'.length);
    if (src.startsWith('data:image/')) return 'dot';
    if (src.includes('/pokedex/') || src.includes('pokedex')) return 'pokedex';
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

    // When switching back to emoji, ensure selection UI matches.
    if (isEmoji) updateEmojiSelectionUI();
}

// Initialize Avatar Grid
function initAvatarGrid() {
    avatarGrid.innerHTML = '';
    AVATARS.forEach(emoji => {
        const div = document.createElement('div');
        div.className = 'avatar-option';
        div.textContent = emoji;
        div.onclick = () => selectAvatarValue(emoji);
        avatarGrid.appendChild(div);
    });
}

function updateEmojiSelectionUI() {
    const options = avatarGrid.children;
    for (let bg of options) {
        if (bg.textContent === selectedAvatar) bg.classList.add('selected');
        else bg.classList.remove('selected');
    }
}

function updateAvatarPreview() {
    renderAvatarInto(avatarPreview, selectedAvatar, { size: 72, className: 'avatar-preview-visual', alt: '' });
}

function selectAvatarValue(value) {
    selectedAvatar = value;
    updateAvatarPreview();
    if (!isImageAvatar(value)) {
        setActiveTab('emoji');
        updateEmojiSelectionUI();
    } else {
        setActiveTab(guessTabForAvatar(value));
        updateEmojiSelectionUI();
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
        selectAvatarValue(player.avatar || AVATARS[0]);
    } else {
        // Create mode
        editingPlayerId = null;
        modalTitle.textContent = 'あたらしくつくる';
        // Random default avatar
        selectAvatarValue(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
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

tabEmoji.onclick = () => setActiveTab('emoji');
tabDot.onclick = () => setActiveTab('dot');
tabPokedex.onclick = () => setActiveTab('pokedex');

function startAvatarPicker(source) {
    const ctx = {
        source,
        mode: editingPlayerId ? 'edit' : 'new',
        playerId: editingPlayerId || null,
        returnTo: '/pages/select-player/select-player.html',
        at: new Date().toISOString()
    };
    writeJson(AVATAR_CTX_KEY, ctx);

    if (source === 'pixel') {
        navigateTo('/pages/pixel-art-maker/?pickAvatar=1');
        return;
    }
    if (source === 'pokedex') {
        navigateTo('/pages/pokedex/?pickAvatar=1');
        return;
    }
}

openPixelArtMakerBtn.onclick = () => startAvatarPicker('pixel');
openPokedexBtn.onclick = () => startAvatarPicker('pokedex');

useUploadedImageBtn.onclick = () => uploadAvatarInput.click();
uploadAvatarInput.addEventListener('change', async () => {
    const file = uploadAvatarInput.files?.[0] || null;
    uploadAvatarInput.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        alert('画像ファイルをえらんでね！');
        return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    }).catch(() => '');
    if (!dataUrl) {
        alert('画像の読み込みに失敗しました。別の画像で試してみてね。');
        return;
    }
    selectAvatarValue(makeImageAvatar(dataUrl));
});

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

async function applyPendingAvatarIfAny() {
    const pick = readJson(AVATAR_PICK_KEY);
    if (!pick?.avatar) return;
    const ctx = readJson(AVATAR_CTX_KEY);
    localStorage.removeItem(AVATAR_PICK_KEY);

    const avatar = String(pick.avatar || '');
    if (!avatar) return;

    // If a modal is already open, just apply.
    if (modal.style.display === 'flex') {
        selectAvatarValue(avatar);
        return;
    }

    if (ctx?.mode === 'edit' && ctx?.playerId) {
        const players = await fetchPlayers();
        const target = players.find((p) => String(p.id) === String(ctx.playerId));
        if (target) {
            openModal(target);
            selectAvatarValue(avatar);
            return;
        }
    }

    openModal(null);
    selectAvatarValue(avatar);
}

window.addEventListener('focus', () => applyPendingAvatarIfAny());
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') applyPendingAvatarIfAny();
});
applyPendingAvatarIfAny();
