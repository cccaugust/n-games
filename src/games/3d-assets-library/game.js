/**
 * 3D Assets Library - 箱庭ゲーム
 * 3Dモデルを自由に配置して遊べるプレイグラウンド
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ModelFactory } from '../../libs/3d/model-factory.js';

class AssetLibraryGame {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.factory = null;

    // 状態管理
    this.currentTool = 'place';
    this.selectedAssetId = null;
    this.selectedVariant = null;
    this.currentCategory = 'characters';
    this.placedObjects = [];
    this.selectedObject = null;
    this.previewModel = null;
    this.isDragging = false;
    this.dragStartPos = new THREE.Vector2();

    // グリッド
    this.gridSize = 20;
    this.gridHelper = null;

    // レイキャスト
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // カタログデータ
    this.catalog = null;

    this.init();
  }

  async init() {
    await this.loadCatalog();
    this.setupScene();
    this.setupLighting();
    this.setupGround();
    this.setupControls();
    this.setupFactory();
    this.setupUI();
    this.setupEvents();

    // ローディング完了
    document.getElementById('loading').classList.add('hidden');

    this.animate();
  }

  async loadCatalog() {
    try {
      const res = await fetch('/assets/3d/catalog.json');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      this.catalog = await res.json();
      console.log('カタログ読み込み成功:', this.catalog.assets?.length || 0, 'アセット');
    } catch (e) {
      console.error('カタログ読み込みエラー:', e);
      this.catalog = { assets: [] };
    }
  }

  setupScene() {
    const container = document.getElementById('canvas-container');
    const canvas = document.getElementById('game-canvas');

    // シーン
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 20, 60);

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(10, 8, 10);
    this.camera.lookAt(0, 0, 0);

    // レンダラー
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  setupLighting() {
    // 環境光
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    // メインライト（太陽）
    const sunLight = new THREE.DirectionalLight(0xffffee, 1.2);
    sunLight.position.set(15, 30, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // 補助ライト
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);

    // ヘミスフィアライト（空と地面の反射）
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3d5c3d, 0.4);
    this.scene.add(hemiLight);
  }

  setupGround() {
    // 地面
    const groundGeo = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3d5c3d,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    this.scene.add(ground);

    // グリッド
    this.gridHelper = new THREE.GridHelper(this.gridSize, this.gridSize, 0x444444, 0x333333);
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);

    // 外周のエッジ
    const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(this.gridSize, 0.1, this.gridSize));
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x666666 });
    const edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
    edgeLine.position.y = 0.05;
    this.scene.add(edgeLine);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 50;
    this.controls.target.set(0, 0, 0);
  }

  setupFactory() {
    this.factory = new ModelFactory(THREE);
  }

  setupUI() {
    this.renderAssetGrid();
  }

  renderAssetGrid() {
    const grid = document.getElementById('asset-grid');
    const placedList = document.getElementById('placed-list');
    const variantSelector = document.getElementById('variant-selector');

    if (!grid) {
      console.error('asset-grid element not found');
      return;
    }

    // 配置済みタブ
    if (this.currentCategory === 'placed') {
      grid.style.display = 'none';
      placedList.style.display = 'flex';
      variantSelector.style.display = 'none';
      this.renderPlacedList();
      return;
    }

    grid.style.display = 'grid';
    placedList.style.display = 'none';

    // カテゴリに応じたアセットをフィルター
    const assets = this.catalog?.assets?.filter(a => a.category === this.currentCategory) || [];

    if (assets.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;">アセットがありません</div>';
      return;
    }

    grid.innerHTML = assets.map(asset => `
      <div class="asset-card ${this.selectedAssetId === asset.id ? 'selected' : ''}"
           data-id="${asset.id}">
        <div class="asset-preview" data-preview="${asset.id}"></div>
        <div class="asset-name">${asset.name}</div>
      </div>
    `).join('');

    // プレビュー生成
    assets.forEach(asset => {
      this.generatePreview(asset.id);
    });

    // バリアント表示
    if (this.selectedAssetId) {
      const asset = this.catalog.assets.find(a => a.id === this.selectedAssetId);
      if (asset && asset.variants && asset.variants.length > 1) {
        variantSelector.style.display = 'block';
        const variantList = document.getElementById('variant-list');
        variantList.innerHTML = asset.variants.map(v => `
          <button class="variant-btn ${this.selectedVariant === v ? 'active' : ''}"
                  data-variant="${v}">${v}</button>
        `).join('');
      } else {
        variantSelector.style.display = 'none';
      }
    } else {
      variantSelector.style.display = 'none';
    }
  }

  renderPlacedList() {
    const list = document.getElementById('placed-list');

    if (this.placedObjects.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">配置済みのオブジェクトはありません</div>';
      return;
    }

    list.innerHTML = this.placedObjects.map((obj, i) => `
      <div class="placed-item ${this.selectedObject === obj ? 'selected' : ''}"
           data-index="${i}">
        <div class="placed-icon">${this.getAssetIcon(obj.assetId)}</div>
        <div class="placed-info">
          <div class="placed-name">${obj.name}</div>
          <div class="placed-variant">${obj.variant || 'default'}</div>
        </div>
        <button class="placed-delete" data-delete="${i}">×</button>
      </div>
    `).join('');
  }

  getAssetIcon(id) {
    const icons = {
      robot: '🤖', slime: '🟢', knight: '⚔️', mage: '🧙',
      coin: '🪙', heart: '❤️', star: '⭐', chest: '📦',
      sword: '🗡️', staff: '🪄', potion: '🧪',
      tree: '🌳', rock: '🪨', crate: '📦', crystal: '💎',
      torch: '🔥', grass: '🌿', fence: '🚧', portal: '🌀'
    };
    return icons[id] || '📦';
  }

  generatePreview(assetId) {
    const container = document.querySelector(`[data-preview="${assetId}"]`);
    if (!container) return;

    // 簡易プレビュー（アイコン表示）
    container.textContent = this.getAssetIcon(assetId);
  }

  setupEvents() {
    // リサイズ
    window.addEventListener('resize', () => this.onResize());

    // キャンバスクリック/タップ
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));

    // カテゴリタブ
    document.getElementById('category-tabs').addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-btn')) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentCategory = e.target.dataset.category;
        this.selectedAssetId = null;
        this.selectedVariant = null;
        this.renderAssetGrid();
      }
    });

    // アセットグリッド
    document.getElementById('asset-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.asset-card');
      if (card) {
        this.selectedAssetId = card.dataset.id;
        const asset = this.catalog.assets.find(a => a.id === this.selectedAssetId);
        this.selectedVariant = asset?.variants?.[0] || null;
        this.renderAssetGrid();
        this.showAssetInfo(this.selectedAssetId);
        this.updatePreviewModel();
      }
    });

    // バリアント選択
    document.getElementById('variant-list').addEventListener('click', (e) => {
      if (e.target.classList.contains('variant-btn')) {
        this.selectedVariant = e.target.dataset.variant;
        document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.updatePreviewModel();
      }
    });

    // 配置済みリスト
    document.getElementById('placed-list').addEventListener('click', (e) => {
      const item = e.target.closest('.placed-item');
      const deleteBtn = e.target.closest('.placed-delete');

      if (deleteBtn) {
        const index = parseInt(deleteBtn.dataset.delete);
        this.deletePlacedObject(index);
      } else if (item) {
        const index = parseInt(item.dataset.index);
        this.selectPlacedObject(index);
      }
    });

    // ツールバー
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.dataset.tool;
        this.updateHint();
      });
    });

    // ヘッダーボタン
    document.getElementById('btn-clear').addEventListener('click', () => this.clearAll());
    document.getElementById('btn-screenshot').addEventListener('click', () => this.takeScreenshot());
    document.getElementById('btn-panel-toggle').addEventListener('click', () => {
      document.getElementById('side-panel').classList.toggle('closed');
    });
  }

  onResize() {
    const container = document.getElementById('canvas-container');
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  onPointerDown(e) {
    this.isDragging = false;
    this.dragStartPos.set(e.clientX, e.clientY);
  }

  onPointerMove(e) {
    const dx = e.clientX - this.dragStartPos.x;
    const dy = e.clientY - this.dragStartPos.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      this.isDragging = true;
    }

    // プレビューモデルの位置更新
    if (this.previewModel && this.currentTool === 'place') {
      const pos = this.getGroundPosition(e);
      if (pos) {
        this.previewModel.mesh.position.copy(pos);
      }
    }
  }

  onPointerUp(e) {
    if (this.isDragging) return;

    const pos = this.getGroundPosition(e);
    if (!pos) return;

    switch (this.currentTool) {
      case 'place':
        this.placeObject(pos);
        break;
      case 'move':
      case 'rotate':
      case 'scale':
        this.selectObjectAt(e);
        break;
      case 'delete':
        this.deleteObjectAt(e);
        break;
    }
  }

  getGroundPosition(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersectPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint)) {
      // グリッドにスナップ
      intersectPoint.x = Math.round(intersectPoint.x * 2) / 2;
      intersectPoint.z = Math.round(intersectPoint.z * 2) / 2;

      // 範囲制限
      const halfGrid = this.gridSize / 2 - 0.5;
      intersectPoint.x = Math.max(-halfGrid, Math.min(halfGrid, intersectPoint.x));
      intersectPoint.z = Math.max(-halfGrid, Math.min(halfGrid, intersectPoint.z));

      return intersectPoint;
    }
    return null;
  }

  placeObject(position) {
    if (!this.selectedAssetId) {
      this.showHint('右のパネルからアセットを選択してください');
      return;
    }

    let model;
    try {
      model = this.factory.create(this.selectedAssetId, {
        variant: this.selectedVariant
      });
    } catch (e) {
      console.error('モデル作成エラー:', this.selectedAssetId, e);
      this.showHint('モデルの作成に失敗しました');
      return;
    }

    if (!model || !model.mesh) {
      console.error('モデルまたはメッシュが無効:', this.selectedAssetId);
      this.showHint('モデルが無効です');
      return;
    }

    model.mesh.position.copy(position);
    model.mesh.userData.placedIndex = this.placedObjects.length;
    model.mesh.userData.assetId = this.selectedAssetId;

    this.scene.add(model.mesh);

    this.placedObjects.push({
      model,
      assetId: this.selectedAssetId,
      name: this.catalog.assets.find(a => a.id === this.selectedAssetId)?.name || this.selectedAssetId,
      variant: this.selectedVariant,
      position: position.clone()
    });

    // アニメーション開始
    const asset = this.catalog.assets.find(a => a.id === this.selectedAssetId);
    if (asset?.animations?.[0]) {
      model.animate(asset.animations[0]);
    }

    this.showHint(`${this.catalog.assets.find(a => a.id === this.selectedAssetId)?.name}を配置しました`);
  }

  selectObjectAt(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.placedObjects.map(o => o.model.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !obj.userData.placedIndex && obj.userData.placedIndex !== 0) {
        obj = obj.parent;
      }

      const index = obj.userData.placedIndex;
      if (index !== undefined) {
        this.selectPlacedObject(index);
      }
    }
  }

  selectPlacedObject(index) {
    // 前の選択を解除
    if (this.selectedObject) {
      this.highlightObject(this.selectedObject, false);
    }

    this.selectedObject = this.placedObjects[index];
    this.highlightObject(this.selectedObject, true);

    // カメラをオブジェクトに向ける
    const pos = this.selectedObject.model.mesh.position;
    this.controls.target.copy(pos);

    if (this.currentCategory === 'placed') {
      this.renderPlacedList();
    }
  }

  highlightObject(obj, highlight) {
    obj.model.mesh.traverse(child => {
      if (child.material) {
        if (highlight) {
          child.material.emissive = child.material.emissive || new THREE.Color(0);
          child.userData.originalEmissive = child.material.emissive.clone();
          child.material.emissive.set(0x444444);
        } else if (child.userData.originalEmissive) {
          child.material.emissive.copy(child.userData.originalEmissive);
        }
      }
    });
  }

  deleteObjectAt(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.placedObjects.map(o => o.model.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !obj.userData.placedIndex && obj.userData.placedIndex !== 0) {
        obj = obj.parent;
      }

      const index = obj.userData.placedIndex;
      if (index !== undefined) {
        this.deletePlacedObject(index);
      }
    }
  }

  deletePlacedObject(index) {
    const obj = this.placedObjects[index];
    if (!obj) return;

    this.scene.remove(obj.model.mesh);
    obj.model.dispose();

    this.placedObjects.splice(index, 1);

    // インデックス更新
    this.placedObjects.forEach((o, i) => {
      o.model.mesh.userData.placedIndex = i;
    });

    if (this.selectedObject === obj) {
      this.selectedObject = null;
    }

    this.showHint('削除しました');

    if (this.currentCategory === 'placed') {
      this.renderPlacedList();
    }
  }

  updatePreviewModel() {
    // 既存のプレビューを削除
    if (this.previewModel) {
      this.scene.remove(this.previewModel.mesh);
      this.previewModel.dispose();
      this.previewModel = null;
    }

    if (!this.selectedAssetId || this.currentTool !== 'place') return;

    // プレビューモデル作成
    this.previewModel = this.factory.create(this.selectedAssetId, {
      variant: this.selectedVariant
    });

    // 半透明に
    this.previewModel.mesh.traverse(child => {
      if (child.material) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.5;
      }
    });

    this.scene.add(this.previewModel.mesh);
  }

  showAssetInfo(assetId) {
    const asset = this.catalog.assets.find(a => a.id === assetId);
    if (!asset) return;

    document.getElementById('info-title').textContent = asset.name;
    document.getElementById('info-desc').textContent = asset.description;
    document.getElementById('info-tags').innerHTML = asset.tags
      .map(t => `<span class="info-tag">${t}</span>`)
      .join('');
    document.getElementById('info-panel').classList.add('visible');

    setTimeout(() => {
      document.getElementById('info-panel').classList.remove('visible');
    }, 3000);
  }

  showHint(message) {
    const hint = document.getElementById('hint');
    hint.textContent = message;
    hint.classList.add('visible');
    setTimeout(() => hint.classList.remove('visible'), 2000);
  }

  updateHint() {
    const hints = {
      place: 'クリックしてモデルを配置',
      move: 'オブジェクトをクリックして選択',
      rotate: 'オブジェクトをクリックして選択',
      scale: 'オブジェクトをクリックして選択',
      delete: 'オブジェクトをクリックして削除'
    };
    this.showHint(hints[this.currentTool] || '');
  }

  clearAll() {
    if (this.placedObjects.length === 0) return;

    if (confirm('配置したオブジェクトをすべて削除しますか？')) {
      this.placedObjects.forEach(obj => {
        this.scene.remove(obj.model.mesh);
        obj.model.dispose();
      });
      this.placedObjects = [];
      this.selectedObject = null;
      this.showHint('すべてクリアしました');

      if (this.currentCategory === 'placed') {
        this.renderPlacedList();
      }
    }
  }

  takeScreenshot() {
    // UIを一時的に非表示
    this.gridHelper.visible = false;

    this.renderer.render(this.scene, this.camera);

    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    // ダウンロード
    const link = document.createElement('a');
    link.download = `3d-scene-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    this.gridHelper.visible = true;
    this.showHint('スクリーンショットを保存しました');
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const deltaTime = 1 / 60;

    // コントロール更新
    this.controls.update();

    // 配置オブジェクトのアニメーション更新
    this.placedObjects.forEach(obj => {
      obj.model.update(deltaTime);
    });

    // プレビューモデルのアニメーション
    if (this.previewModel) {
      this.previewModel.update(deltaTime);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
  new AssetLibraryGame();
});
