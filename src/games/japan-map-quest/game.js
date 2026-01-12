// 日本探検クエスト
// Leaflet + OpenStreetMap版（完全無料・APIキー不要）

// ========== 47都道府県データ ==========
const PREFECTURES = [
  // 北海道・東北
  { id: 1, name: '北海道', lat: 43.0646, lng: 141.3469, item: 'メロン', emoji: '🍈' },
  { id: 2, name: '青森県', lat: 40.8246, lng: 140.7400, item: 'りんご', emoji: '🍎' },
  { id: 3, name: '岩手県', lat: 39.7036, lng: 141.1527, item: 'わんこそば', emoji: '🍜' },
  { id: 4, name: '宮城県', lat: 38.2688, lng: 140.8721, item: '牛タン', emoji: '🥩' },
  { id: 5, name: '秋田県', lat: 39.7186, lng: 140.1024, item: 'きりたんぽ', emoji: '🍢' },
  { id: 6, name: '山形県', lat: 38.2404, lng: 140.3633, item: 'さくらんぼ', emoji: '🍒' },
  { id: 7, name: '福島県', lat: 37.7500, lng: 140.4678, item: '桃', emoji: '🍑' },

  // 関東
  { id: 8, name: '茨城県', lat: 36.3418, lng: 140.4468, item: '納豆', emoji: '🫘' },
  { id: 9, name: '栃木県', lat: 36.5657, lng: 139.8836, item: 'いちご', emoji: '🍓' },
  { id: 10, name: '群馬県', lat: 36.3911, lng: 139.0608, item: 'こんにゃく', emoji: '🍡' },
  { id: 11, name: '埼玉県', lat: 35.8569, lng: 139.6489, item: '草加せんべい', emoji: '🍘' },
  { id: 12, name: '千葉県', lat: 35.6046, lng: 140.1233, item: '落花生', emoji: '🥜' },
  { id: 13, name: '東京都', lat: 35.6762, lng: 139.6503, item: '江戸前寿司', emoji: '🍣' },
  { id: 14, name: '神奈川県', lat: 35.4478, lng: 139.6425, item: 'シウマイ', emoji: '🥟' },

  // 中部
  { id: 15, name: '新潟県', lat: 37.9026, lng: 139.0236, item: 'コシヒカリ', emoji: '🍚' },
  { id: 16, name: '富山県', lat: 36.6953, lng: 137.2113, item: 'ブリ', emoji: '🐟' },
  { id: 17, name: '石川県', lat: 36.5947, lng: 136.6256, item: '金箔ソフト', emoji: '🍦' },
  { id: 18, name: '福井県', lat: 36.0652, lng: 136.2216, item: '越前ガニ', emoji: '🦀' },
  { id: 19, name: '山梨県', lat: 35.6642, lng: 138.5684, item: 'ぶどう', emoji: '🍇' },
  { id: 20, name: '長野県', lat: 36.6513, lng: 138.1810, item: 'そば', emoji: '🍝' },
  { id: 21, name: '岐阜県', lat: 35.3912, lng: 136.7223, item: '飛騨牛', emoji: '🥓' },
  { id: 22, name: '静岡県', lat: 34.9769, lng: 138.3831, item: 'お茶', emoji: '🍵' },
  { id: 23, name: '愛知県', lat: 35.1802, lng: 136.9066, item: '味噌カツ', emoji: '🍖' },

  // 近畿
  { id: 24, name: '三重県', lat: 34.7303, lng: 136.5086, item: '松阪牛', emoji: '🥩' },
  { id: 25, name: '滋賀県', lat: 35.0045, lng: 135.8686, item: '近江牛', emoji: '🐄' },
  { id: 26, name: '京都府', lat: 35.0116, lng: 135.7681, item: '八つ橋', emoji: '🍡' },
  { id: 27, name: '大阪府', lat: 34.6863, lng: 135.5200, item: 'たこ焼き', emoji: '🐙' },
  { id: 28, name: '兵庫県', lat: 34.6913, lng: 135.1830, item: '神戸牛', emoji: '🥩' },
  { id: 29, name: '奈良県', lat: 34.6851, lng: 135.8329, item: '柿の葉寿司', emoji: '🍃' },
  { id: 30, name: '和歌山県', lat: 34.2261, lng: 135.1675, item: 'みかん', emoji: '🍊' },

  // 中国
  { id: 31, name: '鳥取県', lat: 35.5039, lng: 134.2378, item: '梨', emoji: '🍐' },
  { id: 32, name: '島根県', lat: 35.4723, lng: 133.0505, item: '出雲そば', emoji: '🍜' },
  { id: 33, name: '岡山県', lat: 34.6618, lng: 133.9344, item: 'マスカット', emoji: '🍇' },
  { id: 34, name: '広島県', lat: 34.3966, lng: 132.4596, item: '牡蠣', emoji: '🦪' },
  { id: 35, name: '山口県', lat: 34.1860, lng: 131.4705, item: 'ふぐ', emoji: '🐡' },

  // 四国
  { id: 36, name: '徳島県', lat: 34.0658, lng: 134.5593, item: 'すだち', emoji: '🍋' },
  { id: 37, name: '香川県', lat: 34.3401, lng: 134.0434, item: 'うどん', emoji: '🍜' },
  { id: 38, name: '愛媛県', lat: 33.8416, lng: 132.7657, item: 'みかん', emoji: '🍊' },
  { id: 39, name: '高知県', lat: 33.5597, lng: 133.5311, item: 'カツオ', emoji: '🐟' },

  // 九州・沖縄
  { id: 40, name: '福岡県', lat: 33.5904, lng: 130.4017, item: '明太子', emoji: '🐟' },
  { id: 41, name: '佐賀県', lat: 33.2494, lng: 130.2988, item: '佐賀牛', emoji: '🐄' },
  { id: 42, name: '長崎県', lat: 32.7448, lng: 129.8737, item: 'カステラ', emoji: '🍰' },
  { id: 43, name: '熊本県', lat: 32.7898, lng: 130.7417, item: '馬刺し', emoji: '🐴' },
  { id: 44, name: '大分県', lat: 33.2382, lng: 131.6126, item: 'とり天', emoji: '🍗' },
  { id: 45, name: '宮崎県', lat: 31.9111, lng: 131.4239, item: 'マンゴー', emoji: '🥭' },
  { id: 46, name: '鹿児島県', lat: 31.5602, lng: 130.5581, item: '黒豚', emoji: '🐷' },
  { id: 47, name: '沖縄県', lat: 26.2124, lng: 127.6809, item: 'サーターアンダギー', emoji: '🍩' },
];

// ========== ゲーム状態 ==========
let gameState = {
  collected: new Set(),
  currentMission: null,
  map: null,
  markers: new Map(),
  startTime: null,
};

// ========== DOM要素 ==========
const elements = {
  titleScreen: document.getElementById('titleScreen'),
  gameScreen: document.getElementById('gameScreen'),
  startBtn: document.getElementById('startBtn'),
  mapView: document.getElementById('map'),
  currentLocation: document.getElementById('currentLocation'),
  missionPref: document.getElementById('missionPref'),
  missionItem: document.getElementById('missionItem'),
  flyToMissionBtn: document.getElementById('flyToMissionBtn'),
  skipMissionBtn: document.getElementById('skipMissionBtn'),
  collectedCount: document.getElementById('collectedCount'),
  totalCount: document.getElementById('totalCount'),
  itemToast: document.getElementById('itemToast'),
  toastIcon: document.getElementById('toastIcon'),
  toastText: document.getElementById('toastText'),
  collectionBtn: document.getElementById('collectionBtn'),
  zoomJapanBtn: document.getElementById('zoomJapanBtn'),
  resetBtn: document.getElementById('resetBtn'),
  collectionModal: document.getElementById('collectionModal'),
  closeCollectionBtn: document.getElementById('closeCollectionBtn'),
  collectionGrid: document.getElementById('collectionGrid'),
  clearModal: document.getElementById('clearModal'),
  clearTime: document.getElementById('clearTime'),
  restartBtn: document.getElementById('restartBtn'),
  resetModal: document.getElementById('resetModal'),
  cancelResetBtn: document.getElementById('cancelResetBtn'),
  confirmResetBtn: document.getElementById('confirmResetBtn'),
};

// ========== 初期化 ==========
function init() {
  elements.totalCount.textContent = PREFECTURES.length;

  // イベントリスナー
  elements.startBtn.addEventListener('click', startGame);
  elements.flyToMissionBtn.addEventListener('click', flyToMission);
  elements.skipMissionBtn.addEventListener('click', pickRandomMission);
  elements.collectionBtn.addEventListener('click', showCollection);
  elements.closeCollectionBtn.addEventListener('click', hideCollection);
  elements.collectionModal.querySelector('.modal-backdrop').addEventListener('click', hideCollection);
  elements.zoomJapanBtn.addEventListener('click', zoomToJapan);
  elements.resetBtn.addEventListener('click', showResetConfirm);
  elements.cancelResetBtn.addEventListener('click', hideResetConfirm);
  elements.confirmResetBtn.addEventListener('click', confirmReset);
  elements.resetModal.querySelector('.modal-backdrop').addEventListener('click', hideResetConfirm);
  elements.restartBtn.addEventListener('click', restartGame);
  elements.clearModal.querySelector('.modal-backdrop').addEventListener('click', hideClearModal);

  // 収集状況を復元
  loadProgress();
  updateCollectedCount();
}

// ========== ゲーム開始 ==========
function startGame() {
  elements.titleScreen.classList.add('hidden');
  elements.gameScreen.classList.remove('hidden');

  // 開始時間を記録（未設定の場合のみ）
  if (!gameState.startTime) {
    const saved = localStorage.getItem('japan-quest-start-time');
    gameState.startTime = saved ? parseInt(saved) : Date.now();
    localStorage.setItem('japan-quest-start-time', gameState.startTime);
  }

  initMap();
}

// ========== 地図初期化 ==========
function initMap() {
  // 日本全体が見えるビュー
  const japanCenter = [36.5, 138.0];
  const defaultZoom = 5;

  gameState.map = L.map('map', {
    center: japanCenter,
    zoom: defaultZoom,
    zoomControl: true,
    attributionControl: true,
  });

  // OpenStreetMapタイル
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(gameState.map);

  // マーカーを配置
  createMarkers();

  // 地図移動時に現在地を更新
  gameState.map.on('moveend', () => {
    updateCurrentLocation();
  });

  // 初期ミッション
  pickRandomMission();
  updateCurrentLocation();
}

// ========== マーカー作成 ==========
function createMarkers() {
  PREFECTURES.forEach(pref => {
    const marker = createMarker(pref);
    gameState.markers.set(pref.id, marker);
  });
}

function createMarker(pref) {
  const isCollected = gameState.collected.has(pref.id);
  const isMission = gameState.currentMission && gameState.currentMission.id === pref.id;

  // カスタムアイコン
  const icon = L.divIcon({
    className: 'custom-marker-wrapper',
    html: `<div class="custom-marker ${isCollected ? 'collected' : ''} ${isMission ? 'mission' : ''}">${pref.emoji}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });

  const marker = L.marker([pref.lat, pref.lng], { icon }).addTo(gameState.map);

  // ポップアップ
  const popupContent = createPopupContent(pref, isCollected);
  marker.bindPopup(popupContent, { closeButton: true });

  // クリックイベント
  marker.on('click', () => {
    // ポップアップが開いたらボタンにイベントを設定
    setTimeout(() => {
      const btn = document.querySelector(`.popup-btn-${pref.id}`);
      if (btn && !isCollected) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          collectItem(pref);
          marker.closePopup();
        });
      }
    }, 100);
  });

  return marker;
}

function createPopupContent(pref, isCollected) {
  return `
    <div class="marker-popup">
      <span class="marker-popup-emoji">${pref.emoji}</span>
      <div class="marker-popup-pref">${pref.name}</div>
      <div class="marker-popup-item">${pref.item}</div>
      <button class="marker-popup-btn popup-btn-${pref.id}" ${isCollected ? 'disabled' : ''}>
        ${isCollected ? 'ゲット済み' : 'ゲットする！'}
      </button>
    </div>
  `;
}

function updateMarker(pref) {
  const marker = gameState.markers.get(pref.id);
  if (!marker) return;

  const isCollected = gameState.collected.has(pref.id);
  const isMission = gameState.currentMission && gameState.currentMission.id === pref.id;

  // アイコン更新
  const icon = L.divIcon({
    className: 'custom-marker-wrapper',
    html: `<div class="custom-marker ${isCollected ? 'collected' : ''} ${isMission ? 'mission' : ''}">${pref.emoji}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
  marker.setIcon(icon);

  // ポップアップ更新
  const popupContent = createPopupContent(pref, isCollected);
  marker.setPopupContent(popupContent);
}

// ========== アイテム収集 ==========
function collectItem(pref) {
  if (gameState.collected.has(pref.id)) return;

  gameState.collected.add(pref.id);
  saveProgress();
  updateCollectedCount();

  // マーカー更新
  updateMarker(pref);

  // トースト表示
  showToast(pref.emoji, `${pref.item}をゲット！`);

  // ミッションクリアチェック
  if (gameState.currentMission && gameState.currentMission.id === pref.id) {
    setTimeout(() => {
      pickRandomMission();
    }, 1500);
  }

  // 全収集チェック
  if (gameState.collected.size >= PREFECTURES.length) {
    setTimeout(() => {
      showClearModal();
    }, 2000);
  }
}

// ========== 現在地更新 ==========
function updateCurrentLocation() {
  if (!gameState.map) return;

  const center = gameState.map.getCenter();
  const lat = center.lat;
  const lng = center.lng;

  // 最も近い都道府県を探す
  let nearest = null;
  let minDist = Infinity;

  PREFECTURES.forEach(pref => {
    const dist = Math.sqrt(
      Math.pow(lat - pref.lat, 2) + Math.pow(lng - pref.lng, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = pref;
    }
  });

  if (nearest) {
    elements.currentLocation.textContent = nearest.name;
  }
}

// ========== ミッション ==========
function pickRandomMission() {
  // 前のミッションのマーカーを更新
  if (gameState.currentMission) {
    updateMarker(gameState.currentMission);
  }

  // 未収集のものからランダムに選ぶ
  const uncollected = PREFECTURES.filter(p => !gameState.collected.has(p.id));

  if (uncollected.length === 0) {
    elements.missionPref.textContent = '-';
    elements.missionItem.textContent = 'コンプリート！';
    gameState.currentMission = null;
    return;
  }

  const mission = uncollected[Math.floor(Math.random() * uncollected.length)];
  gameState.currentMission = mission;

  elements.missionPref.textContent = mission.name;
  elements.missionItem.textContent = mission.item;

  // 新しいミッションのマーカーを更新
  updateMarker(mission);
}

function flyToMission() {
  if (!gameState.currentMission || !gameState.map) return;

  const mission = gameState.currentMission;
  gameState.map.flyTo([mission.lat, mission.lng], 8, {
    duration: 1.5,
  });
}

// ========== 日本全体表示 ==========
function zoomToJapan() {
  if (!gameState.map) return;
  gameState.map.flyTo([36.5, 138.0], 5, {
    duration: 1,
  });
}

// ========== コレクション ==========
function showCollection() {
  elements.collectionGrid.innerHTML = '';

  PREFECTURES.forEach(pref => {
    const isCollected = gameState.collected.has(pref.id);
    const item = document.createElement('div');
    item.className = `collection-item ${isCollected ? '' : 'locked'}`;
    item.innerHTML = `
      <span class="collection-emoji">${isCollected ? pref.emoji : '❓'}</span>
      <span class="collection-pref">${pref.name}</span>
      <span class="collection-name">${isCollected ? pref.item : '？？？'}</span>
    `;

    // 収集済みの場合、クリックでその場所へ移動
    if (isCollected) {
      item.addEventListener('click', () => {
        hideCollection();
        gameState.map.flyTo([pref.lat, pref.lng], 8, { duration: 1 });
      });
    }

    elements.collectionGrid.appendChild(item);
  });

  elements.collectionModal.classList.remove('hidden');
}

function hideCollection() {
  elements.collectionModal.classList.add('hidden');
}

// ========== リセット ==========
function showResetConfirm() {
  elements.resetModal.classList.remove('hidden');
}

function hideResetConfirm() {
  elements.resetModal.classList.add('hidden');
}

function confirmReset() {
  gameState.collected = new Set();
  gameState.startTime = Date.now();
  localStorage.setItem('japan-quest-start-time', gameState.startTime);
  saveProgress();
  updateCollectedCount();
  hideResetConfirm();

  // マーカーを更新
  PREFECTURES.forEach(pref => updateMarker(pref));

  pickRandomMission();
  showToast('🔄', 'リセットしました！');
}

// ========== クリア ==========
function showClearModal() {
  // プレイ時間を計算
  if (gameState.startTime) {
    const elapsed = Date.now() - gameState.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    elements.clearTime.textContent = `クリアタイム: ${minutes}分${seconds}秒`;
  }

  elements.clearModal.classList.remove('hidden');
}

function hideClearModal() {
  elements.clearModal.classList.add('hidden');
}

function restartGame() {
  gameState.collected = new Set();
  gameState.startTime = Date.now();
  localStorage.setItem('japan-quest-start-time', gameState.startTime);
  saveProgress();
  updateCollectedCount();
  hideClearModal();

  // マーカーを更新
  PREFECTURES.forEach(pref => updateMarker(pref));

  pickRandomMission();
  zoomToJapan();
}

// ========== UI ==========
function updateCollectedCount() {
  elements.collectedCount.textContent = gameState.collected.size;
}

function showToast(emoji, text) {
  elements.toastIcon.textContent = emoji;
  elements.toastText.textContent = text;
  elements.itemToast.classList.remove('hidden');
  elements.itemToast.classList.add('show');

  setTimeout(() => {
    elements.itemToast.classList.remove('show');
    setTimeout(() => {
      elements.itemToast.classList.add('hidden');
    }, 300);
  }, 1500);
}

// ========== データ保存・読み込み ==========
function saveProgress() {
  localStorage.setItem('japan-quest-collected', JSON.stringify([...gameState.collected]));
}

function loadProgress() {
  const savedCollected = localStorage.getItem('japan-quest-collected');
  if (savedCollected) {
    try {
      gameState.collected = new Set(JSON.parse(savedCollected));
    } catch (e) {
      gameState.collected = new Set();
    }
  }

  const savedStartTime = localStorage.getItem('japan-quest-start-time');
  if (savedStartTime) {
    gameState.startTime = parseInt(savedStartTime);
  }
}

// ========== 起動 ==========
init();
