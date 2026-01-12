// 日本探検クエスト
// Google Mapsで日本を探検して、各地の特産物を集めるゲーム

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
  { id: 10, name: '群馬県', lat: 36.3911, lng: 139.0608, item: 'こんにゃく', emoji: '🥢' },
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
  mode: null, // 'google' | 'demo'
  apiKey: null,
  collected: new Set(),
  currentMission: null,
  currentLocation: null,
  map: null,
  streetView: null,
  markers: [],
  isStreetViewMode: false,
};

// ========== DOM要素 ==========
const elements = {
  apiKeyScreen: document.getElementById('apiKeyScreen'),
  gameScreen: document.getElementById('gameScreen'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  startBtn: document.getElementById('startBtn'),
  demoBtn: document.getElementById('demoBtn'),
  mapView: document.getElementById('map'),
  demoCanvas: document.getElementById('demoCanvas'),
  currentLocation: document.getElementById('currentLocation'),
  missionPref: document.getElementById('missionPref'),
  missionItem: document.getElementById('missionItem'),
  skipMissionBtn: document.getElementById('skipMissionBtn'),
  collectedCount: document.getElementById('collectedCount'),
  totalCount: document.getElementById('totalCount'),
  itemToast: document.getElementById('itemToast'),
  toastIcon: document.getElementById('toastIcon'),
  toastText: document.getElementById('toastText'),
  collectionBtn: document.getElementById('collectionBtn'),
  streetViewBtn: document.getElementById('streetViewBtn'),
  mapViewBtn: document.getElementById('mapViewBtn'),
  collectionModal: document.getElementById('collectionModal'),
  closeCollectionBtn: document.getElementById('closeCollectionBtn'),
  collectionGrid: document.getElementById('collectionGrid'),
  clearModal: document.getElementById('clearModal'),
  restartBtn: document.getElementById('restartBtn'),
};

// ========== 初期化 ==========
function init() {
  elements.totalCount.textContent = PREFECTURES.length;

  // イベントリスナー
  elements.startBtn.addEventListener('click', startWithGoogleMaps);
  elements.demoBtn.addEventListener('click', startDemoMode);
  elements.skipMissionBtn.addEventListener('click', pickRandomMission);
  elements.collectionBtn.addEventListener('click', showCollection);
  elements.closeCollectionBtn.addEventListener('click', hideCollection);
  elements.collectionModal.querySelector('.modal-backdrop').addEventListener('click', hideCollection);
  elements.streetViewBtn.addEventListener('click', toggleStreetView);
  elements.mapViewBtn.addEventListener('click', showMapView);
  elements.restartBtn.addEventListener('click', restartGame);

  // APIキーをlocalStorageから復元
  const savedKey = localStorage.getItem('japan-quest-api-key');
  if (savedKey) {
    elements.apiKeyInput.value = savedKey;
  }

  // 収集状況を復元
  const savedCollected = localStorage.getItem('japan-quest-collected');
  if (savedCollected) {
    try {
      gameState.collected = new Set(JSON.parse(savedCollected));
    } catch (e) {
      gameState.collected = new Set();
    }
  }

  updateCollectedCount();
}

// ========== Google Maps モード ==========
function startWithGoogleMaps() {
  const apiKey = elements.apiKeyInput.value.trim();
  if (!apiKey) {
    alert('APIキーを入力してください');
    return;
  }

  gameState.apiKey = apiKey;
  gameState.mode = 'google';
  localStorage.setItem('japan-quest-api-key', apiKey);

  // Google Maps APIを動的に読み込み
  loadGoogleMapsAPI(apiKey);
}

function loadGoogleMapsAPI(apiKey) {
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap&loading=async`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    alert('Google Maps APIの読み込みに失敗しました。APIキーを確認してください。');
  };
  document.head.appendChild(script);
}

// グローバルコールバック
window.initGoogleMap = function() {
  showGameScreen();
  initMap();
};

function initMap() {
  // 東京を中心に日本全体が見える縮尺
  const japan = { lat: 36.5, lng: 138.0 };

  gameState.map = new google.maps.Map(elements.mapView, {
    center: japan,
    zoom: 5,
    mapTypeId: 'roadmap',
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeControl: false,
    styles: [
      {
        featureType: 'poi',
        stylers: [{ visibility: 'off' }]
      }
    ]
  });

  // ストリートビュー
  gameState.streetView = new google.maps.StreetViewPanorama(elements.mapView, {
    position: japan,
    pov: { heading: 0, pitch: 0 },
    visible: false,
    addressControl: false,
    fullscreenControl: false,
  });

  gameState.map.setStreetView(gameState.streetView);

  // マーカーを配置
  createMarkers();

  // 地図の移動を監視して現在地を更新
  gameState.map.addListener('center_changed', () => {
    updateCurrentLocation(gameState.map.getCenter());
  });

  // 初期ミッション
  pickRandomMission();
  updateCurrentLocation(gameState.map.getCenter());
}

function createMarkers() {
  PREFECTURES.forEach(pref => {
    const isCollected = gameState.collected.has(pref.id);

    const marker = new google.maps.Marker({
      position: { lat: pref.lat, lng: pref.lng },
      map: gameState.map,
      title: `${pref.name} - ${pref.item}`,
      icon: {
        url: `data:image/svg+xml,${encodeURIComponent(createMarkerSVG(pref.emoji, isCollected))}`,
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 40),
      },
      animation: isCollected ? null : google.maps.Animation.DROP,
    });

    marker.prefId = pref.id;

    marker.addListener('click', () => {
      handleMarkerClick(pref, marker);
    });

    gameState.markers.push(marker);
  });
}

function createMarkerSVG(emoji, isCollected) {
  const bgColor = isCollected ? '#95a5a6' : '#e74c3c';
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="16" r="14" fill="${bgColor}" stroke="white" stroke-width="2"/>
      <text x="20" y="21" font-size="14" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
      <polygon points="20,38 12,20 28,20" fill="${bgColor}"/>
    </svg>
  `;
}

function handleMarkerClick(pref, marker) {
  if (gameState.collected.has(pref.id)) {
    // 既に収集済み
    showToast(pref.emoji, `${pref.item}は既にゲット済み！`);
    return;
  }

  // アイテム収集
  collectItem(pref, marker);
}

function collectItem(pref, marker) {
  gameState.collected.add(pref.id);
  saveProgress();
  updateCollectedCount();

  // マーカーを更新
  if (marker && gameState.mode === 'google') {
    marker.setIcon({
      url: `data:image/svg+xml,${encodeURIComponent(createMarkerSVG(pref.emoji, true))}`,
      scaledSize: new google.maps.Size(40, 40),
      anchor: new google.maps.Point(20, 40),
    });
  }

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

function updateCurrentLocation(latLng) {
  if (!latLng) return;

  const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
  const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;

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
    gameState.currentLocation = nearest;
    elements.currentLocation.textContent = nearest.name;
  }
}

function toggleStreetView() {
  if (!gameState.map || !gameState.streetView) return;

  gameState.isStreetViewMode = !gameState.isStreetViewMode;

  if (gameState.isStreetViewMode) {
    // 現在の地図の中心でストリートビューを開く
    const center = gameState.map.getCenter();
    gameState.streetView.setPosition(center);
    gameState.streetView.setVisible(true);
    elements.streetViewBtn.classList.add('active');
    elements.mapViewBtn.classList.remove('active');
  } else {
    gameState.streetView.setVisible(false);
    elements.streetViewBtn.classList.remove('active');
    elements.mapViewBtn.classList.add('active');
  }
}

function showMapView() {
  if (gameState.streetView) {
    gameState.streetView.setVisible(false);
  }
  gameState.isStreetViewMode = false;
  elements.streetViewBtn.classList.remove('active');
  elements.mapViewBtn.classList.add('active');
}

// ========== デモモード ==========
function startDemoMode() {
  gameState.mode = 'demo';
  showGameScreen();
  initDemoMap();
  pickRandomMission();
}

function initDemoMap() {
  elements.mapView.classList.add('hidden');
  elements.demoCanvas.classList.remove('hidden');

  const canvas = elements.demoCanvas;
  const ctx = canvas.getContext('2d');

  // キャンバスサイズ設定
  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(dpr, dpr);
    drawDemoMap();
  }

  window.addEventListener('resize', resize);
  resize();

  // クリックイベント
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleDemoClick(x, y, rect.width, rect.height);
  });
}

function drawDemoMap() {
  const canvas = elements.demoCanvas;
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  // 背景（海）
  ctx.fillStyle = '#0b4f6c';
  ctx.fillRect(0, 0, w, h);

  // 日本列島を簡略描画
  drawJapanShape(ctx, w, h);

  // マーカー描画
  PREFECTURES.forEach(pref => {
    const pos = latLngToScreen(pref.lat, pref.lng, w, h);
    const isCollected = gameState.collected.has(pref.id);
    const isMission = gameState.currentMission && gameState.currentMission.id === pref.id;

    // マーカー
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, isMission ? 18 : 14, 0, Math.PI * 2);
    ctx.fillStyle = isCollected ? '#95a5a6' : (isMission ? '#f39c12' : '#e74c3c');
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 絵文字
    ctx.font = isMission ? '16px sans-serif' : '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pref.emoji, pos.x, pos.y);
  });
}

function drawJapanShape(ctx, w, h) {
  // 簡略化した日本列島（塗りつぶし）
  const japanPolys = [
    // 北海道
    [[0.68, 0.06], [0.78, 0.04], [0.90, 0.10], [0.93, 0.18], [0.84, 0.26], [0.72, 0.23], [0.64, 0.14]],
    // 本州
    [[0.66, 0.22], [0.76, 0.22], [0.84, 0.30], [0.86, 0.40], [0.82, 0.55], [0.76, 0.70], [0.68, 0.78], [0.60, 0.76], [0.58, 0.68], [0.54, 0.62], [0.50, 0.64], [0.46, 0.68], [0.40, 0.70], [0.32, 0.74], [0.26, 0.72], [0.24, 0.64], [0.27, 0.58], [0.33, 0.60], [0.38, 0.56], [0.46, 0.54], [0.52, 0.50], [0.58, 0.46], [0.62, 0.38], [0.64, 0.30]],
    // 四国
    [[0.52, 0.72], [0.62, 0.72], [0.66, 0.76], [0.60, 0.82], [0.50, 0.79]],
    // 九州
    [[0.33, 0.72], [0.46, 0.70], [0.54, 0.78], [0.52, 0.92], [0.40, 0.96], [0.30, 0.89], [0.30, 0.78]],
    // 沖縄
    [[0.18, 0.92], [0.24, 0.91], [0.28, 0.94], [0.22, 0.97]],
  ];

  ctx.fillStyle = '#27ae60';
  japanPolys.forEach(poly => {
    ctx.beginPath();
    poly.forEach((p, i) => {
      const x = p[0] * w;
      const y = p[1] * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  });
}

function latLngToScreen(lat, lng, w, h) {
  // 日本の緯度経度範囲（おおよそ）
  const minLat = 24, maxLat = 46;
  const minLng = 122, maxLng = 146;

  const x = ((lng - minLng) / (maxLng - minLng)) * w;
  const y = ((maxLat - lat) / (maxLat - minLat)) * h;

  return { x, y };
}

function handleDemoClick(x, y, w, h) {
  // クリック位置に最も近いマーカーを探す
  let nearest = null;
  let minDist = Infinity;

  PREFECTURES.forEach(pref => {
    const pos = latLngToScreen(pref.lat, pref.lng, w, h);
    const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
    if (dist < minDist && dist < 30) {
      minDist = dist;
      nearest = pref;
    }
  });

  if (nearest) {
    elements.currentLocation.textContent = nearest.name;

    if (!gameState.collected.has(nearest.id)) {
      collectItem(nearest, null);
      requestAnimationFrame(() => drawDemoMap());
    } else {
      showToast(nearest.emoji, `${nearest.item}は既にゲット済み！`);
    }
  }
}

// ========== ミッション ==========
function pickRandomMission() {
  // 未収集のものからランダムに選ぶ
  const uncollected = PREFECTURES.filter(p => !gameState.collected.has(p.id));

  if (uncollected.length === 0) {
    elements.missionPref.textContent = '-';
    elements.missionItem.textContent = 'コンプリート！';
    return;
  }

  const mission = uncollected[Math.floor(Math.random() * uncollected.length)];
  gameState.currentMission = mission;

  elements.missionPref.textContent = mission.name;
  elements.missionItem.textContent = mission.item;

  // デモモードの場合は再描画
  if (gameState.mode === 'demo') {
    requestAnimationFrame(() => drawDemoMap());
  }
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
    elements.collectionGrid.appendChild(item);
  });

  elements.collectionModal.classList.remove('hidden');
}

function hideCollection() {
  elements.collectionModal.classList.add('hidden');
}

// ========== UI ==========
function showGameScreen() {
  elements.apiKeyScreen.classList.add('hidden');
  elements.gameScreen.classList.remove('hidden');
}

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

function showClearModal() {
  elements.clearModal.classList.remove('hidden');
}

function restartGame() {
  gameState.collected = new Set();
  saveProgress();
  updateCollectedCount();
  elements.clearModal.classList.add('hidden');

  if (gameState.mode === 'google') {
    // マーカーを再作成
    gameState.markers.forEach(m => m.setMap(null));
    gameState.markers = [];
    createMarkers();
  } else {
    requestAnimationFrame(() => drawDemoMap());
  }

  pickRandomMission();
}

// ========== データ保存 ==========
function saveProgress() {
  localStorage.setItem('japan-quest-collected', JSON.stringify([...gameState.collected]));
}

// ========== 起動 ==========
init();
