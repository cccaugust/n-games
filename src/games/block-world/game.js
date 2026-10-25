/**
 * ブロックワールド - ゲーム本体
 * 状態: title / worlds / newWorld / loading / playing / paused / dead
 */
import * as THREE from 'three';
import { World, WORLD_HEIGHT } from './world.js';
import { CHUNK, SEA_LEVEL } from './worldgen.js';
import { Renderer } from './renderer.js';
import { Player, EYE_HEIGHT, PLAYER_W, PLAYER_H } from './player.js';
import { Input } from './input.js';
import { MobManager } from './mobs.js';
import { Inventory, InventoryUI } from './inventory.js';
import { audio } from './audio.js';
import { getDef, getAtlas, isBlock, dropOf, B } from './blocks.js';
import { raycastBlocks, aabbIntersectsBlock } from './physics.js';
import { stringToSeed, mulberry32 } from './noise.js';
import * as Save from './save.js';

const DAY_LENGTH = 720; // 秒（12分で1日）
const $ = (id) => document.getElementById(id);

class Game {
  constructor() {
    this.settings = Save.loadSettings();
    this.isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.els = {
      scene: $('scene'), hud: $('hud'), loading: $('loading'), loadingText: $('loadingText'), loadingBar: $('loadingBar'),
      title: $('titleOverlay'), worlds: $('worldsOverlay'), newWorld: $('newWorldOverlay'), pause: $('pauseOverlay'),
      settings: $('settingsOverlay'), help: $('helpOverlay'), death: $('deathOverlay'),
      touchControls: $('touchControls'), touchLayer: $('touchLayer'), joyBase: $('joyBase'), joyKnob: $('joyKnob'),
      btnJump: $('btnJump'), btnSneak: $('btnSneak'), btnBreak: $('btnBreak'), btnPlace: $('btnPlace'),
      hearts: $('hearts'), bubbles: $('bubbles'), toast: $('toast'), timeText: $('timeText'), timeIcon: $('timeIcon'),
      coordsChip: $('coordsChip'), modeChip: $('modeChip'), pcHint: $('pcHint'),
      waterOverlay: $('waterOverlay'), hurtOverlay: $('hurtOverlay'), darkOverlay: $('darkOverlay'),
      worldList: $('worldList'), saveInfo: $('saveInfo')
    };
    getAtlas();
    this.renderer = new Renderer(this.els.scene, { isMobile: this.isTouch });
    this.input = new Input(this.renderer.renderer.domElement, this.els);
    this.input.onAction = (a) => this.onAction(a);
    this.input.onPointerLockLost = () => { if (this.state === 'playing' && !this.invUI?.isOpen()) this.pause(); };

    this.state = 'boot';
    this.world = null;
    this.player = null;
    this.mobs = null;
    this.inventory = null;
    this.invUI = null;
    this.slot = -1;
    this.worldMeta = null;
    this.time = 0;            // ワールド時間（秒）
    this.clock = 0;           // 経過時間
    this.lastFrame = performance.now();
    this.saveTimer = 0;
    this.playTime = 0;
    this.target = null;
    this.breakProgress = 0;
    this.breakTarget = null;
    this.breakCooldown = 0;
    this.placeTimer = 0;
    this.swingTimer = 0;
    this.prevBreakHeld = false;
    this.hadSavedPlayer = false;
    this.stepTimer = 0;
    this.wasInWater = false;
    this.toastTimer = null;
    this.chunkOffsets = [];
    this.loadRadius = 5;
    this.panorama = { angle: 0 };
    this.lastPlayerChunk = null;

    this.bindUI();
    this.applySettings();
    this.startTitle();
    window.addEventListener('resize', () => this.renderer.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.renderer.resize(), 200));
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'playing') { this.pause(); } });
    window.addEventListener('beforeunload', () => this.save());
    document.addEventListener('pointermove', (e) => this.invUI && this.invUI.moveCursor(e.clientX, e.clientY));
    requestAnimationFrame((t) => this.loop(t));
  }

  /* ================= UI ================= */
  bindUI() {
    const E = this.els;
    const show = (el) => el.classList.remove('is-hidden');
    const hide = (el) => el.classList.add('is-hidden');
    this.show = show; this.hide = hide;

    $('btnPlay').addEventListener('click', () => { audio.resume(); audio.click(); this.showWorlds(); });
    $('btnHelpTitle').addEventListener('click', () => { audio.resume(); show(E.help); });
    $('btnSettingsTitle').addEventListener('click', () => { audio.resume(); this.openSettings(); });
    for (const b of document.querySelectorAll('.js-back-title')) b.addEventListener('click', () => { hide(E.worlds); show(E.title); });
    for (const b of document.querySelectorAll('.js-back-worlds')) b.addEventListener('click', () => { hide(E.newWorld); this.showWorlds(); });
    for (const b of document.querySelectorAll('.js-close-settings')) b.addEventListener('click', () => this.closeSettings());
    for (const b of document.querySelectorAll('.js-close-help')) b.addEventListener('click', () => { hide(E.help); if (this.state === 'playing') this.resume(); });

    // 新しいワールド
    this.newMode = 'creative';
    for (const c of document.querySelectorAll('.mode-card')) c.addEventListener('click', () => {
      for (const o of document.querySelectorAll('.mode-card')) o.classList.toggle('is-selected', o === c);
      this.newMode = c.dataset.mode; audio.click();
    });
    $('btnCreateWorld').addEventListener('click', () => this.createWorld());

    // ポーズ
    $('btnResume').addEventListener('click', () => this.resume());
    $('btnSettingsPause').addEventListener('click', () => this.openSettings());
    $('btnHelpPause').addEventListener('click', () => { hide(E.pause); show(E.help); });
    $('btnSaveQuit').addEventListener('click', () => { this.save(true); this.quitToTitle(); });
    $('btnRespawn').addEventListener('click', () => this.respawn());
    $('btnDeathTitle').addEventListener('click', () => { this.player.respawn(this.spawn); this.save(true); this.quitToTitle(); });

    // HUD
    $('btnInv').addEventListener('click', () => this.toggleInventory());
    $('btnPause').addEventListener('click', () => this.pause());

    // 設定
    const S = this.settings;
    const setRender = $('setRender'), setFov = $('setFov'), setSens = $('setSens');
    setRender.value = String(S.renderDistance);
    setFov.value = S.fov; $('setFovOut').value = S.fov;
    setSens.value = S.sensitivity; $('setSensOut').value = Number(S.sensitivity).toFixed(1);
    $('setSound').checked = S.sound; $('setMusic').checked = S.music; $('setDay').checked = S.alwaysDay;
    $('setAutoJump').checked = S.autoJump; $('setCoords').checked = S.showCoords;
    const upd = () => {
      S.renderDistance = parseInt(setRender.value, 10) || 0;
      S.fov = parseInt(setFov.value, 10); $('setFovOut').value = S.fov;
      S.sensitivity = parseFloat(setSens.value); $('setSensOut').value = S.sensitivity.toFixed(1);
      S.sound = $('setSound').checked; S.music = $('setMusic').checked; S.alwaysDay = $('setDay').checked;
      S.autoJump = $('setAutoJump').checked; S.showCoords = $('setCoords').checked;
      Save.saveSettings(S);
      this.applySettings();
    };
    for (const el of [setRender, setFov, setSens, $('setSound'), $('setMusic'), $('setDay'), $('setAutoJump'), $('setCoords')]) el.addEventListener('input', upd);
    for (const el of [setRender, $('setSound'), $('setMusic'), $('setDay'), $('setAutoJump'), $('setCoords')]) el.addEventListener('change', upd);

    if (this.isTouch) { show(E.touchControls); hide(E.pcHint); }
    else { E.touchLayer.style.display = 'none'; }
    // タイトル画面の下にも 3D を表示するので、キャンバスクリックでポインターロック
    this.renderer.renderer.domElement.addEventListener('click', () => { if (this.state === 'playing' && !this.isTouch) this.input.requestPointerLock(); });
  }

  applySettings() {
    const S = this.settings;
    audio.enabled = S.sound;
    audio.musicEnabled = S.music;
    if (!S.music) audio.stopMusic(); else if (this.state === 'playing' && !audio.musicTimer) audio.startMusic();
    this.input.sensitivity = S.sensitivity;
    this.loadRadius = S.renderDistance || (this.isTouch ? 4 : 6);
    this.renderer.setRenderDistance(this.loadRadius);
    this.renderer.baseFov = S.fov;
    this.buildChunkOffsets();
    this.els.coordsChip.classList.toggle('is-hidden', !S.showCoords);
  }

  openSettings() { this.settingsReturn = this.state; this.show(this.els.settings); }
  closeSettings() { this.hide(this.els.settings); }

  toast(msg, ms = 1800) {
    const t = this.els.toast;
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('is-visible'), ms);
  }

  setLoading(visible, text, progress) {
    this.els.loading.classList.toggle('is-hidden', !visible);
    if (text) this.els.loadingText.textContent = text;
    if (progress !== undefined) this.els.loadingBar.style.width = Math.round(progress * 100) + '%';
  }

  /* ================= タイトル ================= */
  startTitle() {
    this.state = 'title';
    this.input.setEnabled(false);
    this.input.exitPointerLock();
    this.hide(this.els.hud);
    this.hide(this.els.pause); this.hide(this.els.death); this.hide(this.els.worlds); this.hide(this.els.newWorld);
    this.els.touchLayer.style.pointerEvents = 'none';
    audio.stopMusic();
    // タイトル用のデモワールド
    this.setupWorld({ seed: 20251025, mode: 'creative' }, null);
    const sp = this.world.gen.findSpawn();
    this.panorama = { angle: 0, cx: sp.x, cz: sp.z, cy: sp.y + 9, radius: 22 };
    this.player.pos = { x: sp.x, y: sp.y, z: sp.z };
    this.time = DAY_LENGTH * 0.12;
    this.setLoading(true, '世界をつくっています…', 0);
    this.titleLoading = true;
  }

  showWorlds() {
    const E = this.els;
    this.hide(E.title); this.hide(E.newWorld); this.show(E.worlds);
    const list = Save.listWorlds();
    E.worldList.innerHTML = '';
    list.forEach((w, i) => {
      const card = document.createElement('div');
      if (!w) {
        card.className = 'world-card empty';
        card.innerHTML = `＋ 新しいワールドをつくる（スロット ${i + 1}）`;
        card.addEventListener('click', () => { audio.click(); this.slot = i; this.showNewWorld(i); });
      } else {
        card.className = 'world-card';
        const date = w.lastPlayed ? new Date(w.lastPlayed) : null;
        const when = date ? `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '';
        const mins = Math.round((w.playTime || 0) / 60);
        card.innerHTML = `<div class="world-icon">${w.mode === 'survival' ? '⛏' : '🧱'}</div>
          <div class="world-info"><div class="world-name">${escapeHtml(w.name)} <span class="badge ${w.mode}">${w.mode === 'survival' ? 'サバイバル' : 'クリエイティブ'}</span></div>
          <div class="world-meta">さいごに遊んだ: ${when} ・ プレイ ${mins}分 ・ 変えたチャンク ${w.edits}</div></div>
          <div class="world-actions"><button class="btn primary js-play" type="button">あそぶ</button><button class="btn danger js-del" type="button">けす</button></div>`;
        card.querySelector('.js-play').addEventListener('click', () => { audio.click(); this.loadWorld(i); });
        card.querySelector('.js-del').addEventListener('click', () => {
          if (confirm(`「${w.name}」をけしますか？ もとにもどせません。`)) { Save.deleteWorld(i); this.showWorlds(); }
        });
      }
      E.worldList.appendChild(card);
    });
  }

  showNewWorld(slot) {
    this.hide(this.els.worlds); this.show(this.els.newWorld);
    $('worldName').value = `ワールド ${slot + 1}`;
    $('worldSeed').value = '';
  }

  createWorld() {
    const name = ($('worldName').value || '').trim() || `ワールド ${this.slot + 1}`;
    const seedStr = ($('worldSeed').value || '').trim();
    const seed = seedStr ? (/^\d+$/.test(seedStr) ? (parseInt(seedStr, 10) >>> 0) : stringToSeed(seedStr)) : (Math.random() * 0xffffffff) >>> 0;
    const data = { version: 1, name, seed, mode: this.newMode, time: DAY_LENGTH * 0.08, player: null, spawn: null, inventory: null, edits: {}, lastPlayed: Date.now(), playTime: 0 };
    Save.saveWorld(this.slot, data);
    audio.resume();
    this.enterWorld(this.slot, data);
  }

  loadWorld(slot) {
    const data = Save.loadWorld(slot);
    if (!data) return;
    this.slot = slot;
    audio.resume();
    this.enterWorld(slot, data);
  }

  /* ================= ワールドのセットアップ ================= */
  setupWorld(meta, data) {
    // 前のワールドを片付ける
    if (this.world) { for (const c of this.world.chunks.values()) this.renderer.removeChunk(c); }
    if (this.mobs) this.mobs.clear();
    this.world = new World(meta.seed, data ? data.edits : null);
    this.world.onBlockBroken = (x, y, z, id) => this.onSupportBroken(x, y, z, id);
    this.player = new Player(meta.mode);
    this.mobs = new MobManager(this.renderer.scene, this.world, audio);
    this.mobs.onDrop = (id, count, pos) => { if (count > 0 && this.inventory) { this.giveItem(id, count); } };
    this.mobs.onPlayerHit = (mob, dmg) => {
      this.player.damage(dmg);
      this.player.knockback(this.player.pos.x - mob.pos.x, this.player.pos.z - mob.pos.z, 7);
    };
    this.mobs.onBurn = (mob) => { if (Math.random() < 0.3) this.renderer.spawnBlockParticles(mob.pos.x - 0.5, mob.pos.y + 1, mob.pos.z - 0.5, B.GLOWSTONE, 1, 2); };
    this.inventory = new Inventory(meta.mode);
    this.worldMeta = meta;
    this.lastPlayerChunk = null;
    this.target = null;
    this.breakTarget = null;
    this.renderer.setHighlight(null); this.renderer.setCrack(null, 0);
    this.renderer.pCount = 0;
  }

  enterWorld(slot, data) {
    this.state = 'loading';
    this.hide(this.els.worlds); this.hide(this.els.newWorld); this.hide(this.els.title);
    this.setLoading(true, '世界をつくっています…', 0);
    this.setupWorld({ seed: data.seed, mode: data.mode, name: data.name }, data);
    this.time = typeof data.time === 'number' ? data.time : DAY_LENGTH * 0.08;
    this.playTime = data.playTime || 0;
    this.spawn = data.spawn || this.world.gen.findSpawn();
    this.inventory.fromJSON(data.inventory);
    this.hadSavedPlayer = !!data.player;
    if (data.player) this.player.fromJSON(data.player); else this.player.pos = { ...this.spawn };
    this.buildInventoryUI();
    this.loadingPhase = { total: 0, done: 0 };
    this.saveTimer = 0;
    this.renderer.setHeldItem(this.inventory.selectedId);
  }

  buildInventoryUI() {
    const els = {
      hotbar: $('hotbar'), panel: $('invPanel'), panelGrid: $('invGrid'), panelHotbar: $('invHotbar'), craftList: $('craftList'),
      tabs: [...document.querySelectorAll('#invPanel .tab')], closeBtn: $('invClose'), title: $('invTitle'), cursor: $('cursorItem'), itemName: $('itemName')
    };
    if (!this.invUI) {
      this.invUI = new InventoryUI(this.inventory, els, audio);
      this.invUI.onClose = () => { if (this.state === 'playing') { this.input.setEnabled(true); if (!this.isTouch) this.input.requestPointerLock(); } };
      this.invUI.onEat = (id) => this.eat(id);
    } else {
      this.invUI.setInventory(this.inventory);
    }
    this.inventory.onChange = () => { this.invUI.refresh(); this.renderer.setHeldItem(this.inventory.selectedId); };
    this.invUI.refresh();
  }

  beginPlaying() {
    this.state = 'playing';
    this.setLoading(false);
    this.show(this.els.hud);
    this.els.touchLayer.style.pointerEvents = 'auto';
    this.input.setEnabled(true);
    this.renderer.setHeldItem(this.inventory.selectedId);
    if (this.settings.music) audio.startMusic();
    this.updateHud(true);
    this.toast(this.worldMeta.mode === 'survival' ? '⛏ サバイバル：ほって あつめて つくろう！' : '🧱 クリエイティブ：ブロック無限！スペース2回で飛行', 2600);
    if (!this.isTouch) this.input.requestPointerLock();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.setEnabled(false);
    this.input.exitPointerLock();
    if (this.invUI && this.invUI.isOpen()) this.invUI.close();
    this.show(this.els.pause);
    this.els.saveInfo.textContent = this.save(true) ? '✔ セーブしました' : 'セーブできませんでした（容量不足？）';
  }

  resume() {
    this.hide(this.els.pause); this.hide(this.els.help); this.hide(this.els.settings);
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.input.setEnabled(true);
    this.lastFrame = performance.now();
    if (!this.isTouch) this.input.requestPointerLock();
  }

  quitToTitle() {
    this.hide(this.els.pause);
    this.startTitle();
    this.show(this.els.title);
  }

  respawn() {
    this.hide(this.els.death);
    this.player.respawn(this.spawn);
    this.state = 'playing';
    this.input.setEnabled(true);
    if (!this.isTouch) this.input.requestPointerLock();
  }

  toggleInventory() {
    if (this.state !== 'playing' || !this.invUI) return;
    if (this.invUI.isOpen()) this.invUI.close();
    else { this.invUI.open(); this.input.setEnabled(false); this.input.exitPointerLock(); }
  }

  onAction(a) {
    if (this.state !== 'playing') { if (a === 'pause' && this.state === 'paused') this.resume(); return; }
    if (a === 'inventory') this.toggleInventory();
    else if (a === 'pause') { if (this.invUI.isOpen()) this.invUI.close(); else this.pause(); }
    else if (a === 'fly') {
      if (this.player.mode === 'creative') {
        this.player.flying = !this.player.flying;
        if (this.player.flying) this.player.vel.y = Math.max(this.player.vel.y, 0);
        this.toast(this.player.flying ? '✈ 飛行モード ON' : '🚶 飛行モード OFF', 1200);
        audio.pop();
      }
    } else if (a.startsWith('hotbar:')) { this.inventory.select(parseInt(a.slice(7), 10)); audio.click(); }
    else if (a.startsWith('scroll:')) { this.inventory.select(this.inventory.selected + parseInt(a.slice(7), 10)); }
    else if (a === 'pick') {
      if (this.player.mode === 'creative' && this.target) {
        let id = this.target.id;
        if (getDef(id).wall) id = B.TORCH;
        this.inventory.hotbar[this.inventory.selected] = { id, count: 1 };
        this.inventory.changed();
        audio.pop();
      }
    }
  }

  /* ================= 保存 ================= */
  save(force = false) {
    if (this.slot < 0 || !this.world || this.state === 'title' || this.state === 'loading' || this.state === 'boot') return false;
    const data = {
      version: 1, name: this.worldMeta.name, seed: this.world.seed, mode: this.worldMeta.mode,
      time: this.time, player: this.player.toJSON(), spawn: this.spawn, inventory: this.inventory.toJSON(),
      edits: this.world.serializeEdits(), lastPlayed: Date.now(), playTime: this.playTime
    };
    return Save.saveWorld(this.slot, data);
  }

  /* ================= チャンク読み込み ================= */
  buildChunkOffsets() {
    const r = this.loadRadius + 1;
    const arr = [];
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) arr.push({ dx, dz, d: Math.hypot(dx, dz) });
    arr.sort((a, b) => a.d - b.d);
    this.chunkOffsets = arr;
  }

  /**
   * プレイヤー周辺のチャンクを、時間の予算内で生成 → ライト → メッシュ化
   * @returns {boolean} 近くが全部そろったか
   */
  streamChunks(budgetMs, center, radiusReady = 2) {
    const start = performance.now();
    const world = this.world;
    const pcx = Math.floor(center.x) >> 4, pcz = Math.floor(center.z) >> 4;
    const rd = this.loadRadius;
    let nearReady = true;

    // 編集で dirty になったチャンクは最優先
    let rebuilt = 0;
    for (const c of world.chunks.values()) {
      if (c.dirty && c.meshed && rebuilt < 3) {
        if (world.neighborsReady(c.cx, c.cz)) { this.renderer.setChunkGeometry(c, world.buildChunkMesh(c)); rebuilt++; }
      }
    }

    for (const o of this.chunkOffsets) {
      const cx = pcx + o.dx, cz = pcz + o.dz;
      const within = o.d <= rd + 0.01;
      const c = world.getChunk(cx, cz);
      if (!c) {
        if (performance.now() - start > budgetMs) { if (o.d <= radiusReady) nearReady = false; break; }
        world.ensureChunk(cx, cz);
        if (o.d <= radiusReady) nearReady = false;
        continue;
      }
      if (within && (!c.meshed || c.dirty)) {
        if (!world.neighborsReady(cx, cz)) {
          // 近所の生成を優先
          for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
            if (!world.getChunk(cx + dx, cz + dz)) { world.ensureChunk(cx + dx, cz + dz); if (performance.now() - start > budgetMs) break; }
          }
          if (o.d <= radiusReady) nearReady = false;
          if (performance.now() - start > budgetMs) break;
          if (!world.neighborsReady(cx, cz)) continue;
        }
        if (performance.now() - start > budgetMs) { if (o.d <= radiusReady) nearReady = false; break; }
        this.renderer.setChunkGeometry(c, world.buildChunkMesh(c));
        if (this.state === 'playing' && o.d <= rd - 1) this.mobs.spawnInChunk(c, this.player.pos);
      }
    }
    // 遠いチャンクを捨てる
    if (this.frameCount % 60 === 0) {
      for (const c of [...world.chunks.values()]) {
        if (Math.hypot(c.cx - pcx, c.cz - pcz) > rd + 3) { this.renderer.removeChunk(c); world.unloadChunk(c); }
      }
    }
    return nearReady;
  }

  countReady(center, radius) {
    const pcx = Math.floor(center.x) >> 4, pcz = Math.floor(center.z) >> 4;
    let total = 0, done = 0;
    for (const o of this.chunkOffsets) {
      if (o.d > radius) continue;
      total++;
      const c = this.world.getChunk(pcx + o.dx, pcz + o.dz);
      if (c && c.meshed) done++;
    }
    return { total, done };
  }

  /* ================= メインループ ================= */
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    let dt = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    if (dt > 0.1) dt = 0.1;
    this.frameCount = (this.frameCount || 0) + 1;
    this.clock += dt;

    if (this.state === 'title' || this.state === 'worlds') {
      this.updateTitle(dt);
    } else if (this.state === 'loading') {
      const ready = this.streamChunks(24, this.player.pos, 2);
      const { total, done } = this.countReady(this.player.pos, 2);
      this.setLoading(true, done < total ? '地形をつくっています…' : 'もうすこし…', total ? done / total : 0);
      if (ready) {
        // 地面の上に立たせる（保存データが無いとき）
        this.fixSpawnPosition();
        this.beginPlaying();
      }
    } else if (this.state === 'playing' || this.state === 'dead') {
      this.updatePlaying(dt);
    } else if (this.state === 'paused') {
      // 止まったまま描く（カメラだけ更新）
      this.updateCamera();
    }
    this.updateDayNight();
    this.renderer.update(dt, this.clock, this.world, this.player && this.state === 'playing' && Math.hypot(this.player.vel.x, this.player.vel.z) > 0.5 && this.player.onGround);
    this.renderer.render();
  }

  fixSpawnPosition() {
    const p = this.player.pos;
    const bx = Math.floor(p.x), bz = Math.floor(p.z);
    // 中に埋まっていたら上へ、浮いていたら下へ
    const top = this.world.topSolidY(bx, bz);
    if (top >= 0) {
      const feet = Math.floor(p.y);
      const inside = getDef(this.world.getBlock(bx, feet, bz)).collide || getDef(this.world.getBlock(bx, feet + 1, bz)).collide;
      if (inside) p.y = top + 1;
      if (!this.hadSavedPlayer && p.y > top + 1) p.y = top + 1;
    }
    if (!this.hadSavedPlayer) this.spawn = { ...p };
  }

  updateTitle(dt) {
    const P = this.panorama;
    if (this.titleLoading) {
      const ready = this.streamChunks(30, { x: P.cx, z: P.cz }, 2);
      const { total, done } = this.countReady({ x: P.cx, z: P.cz }, 2);
      this.setLoading(true, '世界をつくっています…', total ? done / total : 0);
      if (ready) { this.titleLoading = false; this.setLoading(false); this.show(this.els.title); }
    } else {
      this.streamChunks(8, { x: P.cx, z: P.cz }, 2);
      this.time += dt * 6; // 速めに昼夜が回る
    }
    P.angle += dt * 0.08;
    const cam = this.renderer.camera;
    const x = P.cx + Math.cos(P.angle) * P.radius, z = P.cz + Math.sin(P.angle) * P.radius;
    const groundY = this.world.topSolidY(Math.floor(x), Math.floor(z));
    const y = Math.max(P.cy, (groundY >= 0 ? groundY : P.cy) + 4);
    cam.position.set(x, y, z);
    cam.lookAt(P.cx, P.cy - 7, P.cz);
    cam.fov = 70; cam.updateProjectionMatrix();
    this.renderer.hand.visible = false;
    this.renderer.setUnderwater(false);
    if (this.mobs) this.mobs.update(dt, { pos: { x: P.cx, y: P.cy, z: P.cz }, dead: true }, this.renderer.daylight, 'creative', this.loadRadius);
  }

  updateDayNight() {
    if (!this.world) return;
    let t;
    if (this.settings.alwaysDay) t = 0.2;
    else t = (this.time / DAY_LENGTH) % 1;
    this.renderer.setTimeOfDay(t);
  }

  updatePlaying(dt) {
    const player = this.player, world = this.world;
    const inp = this.input.poll();
    if (this.state === 'playing') {
      this.time += dt;
      this.playTime += dt;
      player.look(inp.lookDx, inp.lookDy);
      player._now = this.clock;
      player.update(dt, inp, world, { autoJump: this.settings.autoJump, time: this.clock });
      this.handleEvents();
      this.interact(dt, inp);
      this.footsteps(dt);
      if (player.dead) this.onDeath();
    }

    // チャンク
    this.streamChunks(this.isTouch ? 9 : 12, player.pos, 1);
    // モブ
    this.mobs.update(dt, player, this.renderer.daylight, player.mode, this.loadRadius);
    // 定期セーブ
    this.saveTimer += dt;
    if (this.saveTimer > 25) { this.saveTimer = 0; this.save(); }

    this.updateCamera();
    this.updateHud();
  }

  handleEvents() {
    const p = this.player;
    for (const e of p.events) {
      if (e === 'jump') audio.jump();
      else if (e === 'land') audio.land();
      else if (e === 'hurt') audio.hurt();
    }
    p.events.length = 0;
    if (p.inWater !== this.wasInWater) { if (p.inWater) audio.splash(); this.wasInWater = p.inWater; }
  }

  footsteps(dt) {
    const p = this.player;
    const speed = Math.hypot(p.vel.x, p.vel.z);
    if (p.onGround && speed > 1 && !p.inWater) {
      this.stepTimer += dt * speed;
      if (this.stepTimer > 2.1) {
        this.stepTimer = 0;
        const id = this.world.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y - 0.1), Math.floor(p.pos.z));
        audio.step(getDef(id).sound);
      }
    } else this.stepTimer = 1.6;
  }

  updateCamera() {
    const p = this.player, cam = this.renderer.camera;
    const eye = p.eye();
    cam.position.set(eye.x, eye.y, eye.z);
    cam.rotation.order = 'YXZ';
    cam.rotation.set(p.pitch, p.yaw, 0);
    const targetFov = this.renderer.baseFov + p.fovBoost * 10 + (p.flying && p.sprinting ? 6 : 0);
    if (Math.abs(cam.fov - targetFov) > 0.05) { cam.fov += (targetFov - cam.fov) * 0.2; cam.updateProjectionMatrix(); }
    this.renderer.setUnderwater(p.headInWater);
    this.els.waterOverlay.classList.toggle('is-on', p.headInWater);
    this.els.hurtOverlay.classList.toggle('is-on', p.hurtTimer > 0);
    // 手の明るさ
    const [sky, blk] = this.world.getLight(Math.floor(eye.x), Math.floor(eye.y), Math.floor(eye.z));
    const bright = Math.max(0.15, Math.max(sky / 15 * this.renderer.daylight, blk / 15));
    this.renderer.setHandLight(bright);
    this.renderer.hand.visible = this.state !== 'dead';
  }

  /* ================= 操作（壊す・置く） ================= */
  interact(dt, inp) {
    const player = this.player, world = this.world;
    const eye = player.eye(), dir = player.dir();
    const reach = player.mode === 'creative' ? 6 : 5;
    const hit = raycastBlocks(world, eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, reach, (id) => { const d = getDef(id); return d.solid || d.shape === 'cross' || d.shape === 'torch' || d.shape === 'layer'; });
    this.target = hit;
    this.renderer.setHighlight(hit);
    if (this.breakCooldown > 0) this.breakCooldown -= dt;
    if (this.placeTimer > 0) this.placeTimer -= dt;

    // なぐる（押した瞬間）
    const breakPressed = inp.breakHeld && !this.prevBreakHeld;
    this.prevBreakHeld = inp.breakHeld;
    if (breakPressed) {
      const mob = this.mobs.raycast(eye, dir, hit ? Math.min(hit.dist, 3.5) : 3.5);
      if (mob) { this.mobs.hit(mob, player.pos, 4); this.renderer.swingHand(); this.breakCooldown = 0.3; return; }
    }

    // 壊す
    if (inp.breakHeld && hit && this.breakCooldown <= 0) {
      const d = getDef(hit.id);
      if (!this.breakTarget || this.breakTarget.x !== hit.x || this.breakTarget.y !== hit.y || this.breakTarget.z !== hit.z) {
        this.breakTarget = { x: hit.x, y: hit.y, z: hit.z };
        this.breakProgress = 0;
        this.swingTimer = 0;
      }
      this.swingTimer -= dt;
      if (this.swingTimer <= 0) { this.swingTimer = 0.25; this.renderer.swingHand(); audio.dig(d.sound); if (Math.random() < 0.6) this.renderer.spawnBlockParticles(hit.x, hit.y, hit.z, hit.id, this.lightAt(hit.x, hit.y + 1, hit.z), 2); }
      if (d.hardness < 0) { this.breakProgress = 0; }
      else if (player.mode === 'creative') { this.breakBlock(hit); this.breakCooldown = 0.22; }
      else {
        this.breakProgress += dt / Math.max(0.05, d.hardness);
        if (this.breakProgress >= 1) { this.breakBlock(hit); this.breakProgress = 0; this.breakCooldown = 0.12; }
      }
      this.renderer.setCrack(hit, player.mode === 'creative' ? 0 : this.breakProgress);
    } else {
      if (!inp.breakHeld) { this.breakTarget = null; this.breakProgress = 0; }
      this.renderer.setCrack(null, 0);
    }

    // 置く / 使う
    const wantPlace = inp.placeTap || (inp.placeHeld && this.placeTimer <= 0);
    if (wantPlace) {
      this.placeTimer = 0.25;
      const sel = this.inventory.selectedItem;
      if (sel && getDef(sel.id).food) { this.eat(sel.id, true); return; }
      if (hit && sel && isBlock(sel.id)) this.placeBlock(hit, sel.id);
    }
  }

  lightAt(x, y, z) {
    const [sky, blk] = this.world.getLight(x, y, z);
    return Math.max(0.1, Math.max(sky / 15 * this.renderer.daylight, blk / 15));
  }

  breakBlock(hit) {
    const id = hit.id, d = getDef(id);
    this.world.setBlock(hit.x, hit.y, hit.z, B.AIR);
    this.renderer.spawnBlockParticles(hit.x, hit.y, hit.z, id, this.lightAt(hit.x, hit.y + 1, hit.z), d.shape === 'cube' ? 20 : 8);
    audio.breakBlock(d.sound);
    this.renderer.swingHand();
    if (this.player.mode === 'survival') {
      let drop = dropOf(id);
      if (d.cutout && d.sound === 'grass' && Math.random() < 0.12) drop = B.APPLE; // 葉からりんご
      if (drop !== null) this.giveItem(drop, 1);
    }
  }

  onSupportBroken(x, y, z, id) {
    this.renderer.spawnBlockParticles(x, y, z, id, this.lightAt(x, y + 1, z), 6);
    if (this.player && this.player.mode === 'survival') { const drop = dropOf(id); if (drop !== null) this.giveItem(drop, 1); }
  }

  giveItem(id, count) {
    const left = this.inventory.add(id, count);
    if (left > 0) this.toast('🎒 もちものが いっぱい！', 1200);
    else audio.pop();
  }

  placeBlock(hit, id) {
    const world = this.world, player = this.player;
    const def = getDef(id);
    const targetDef = getDef(hit.id);
    let x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
    if (targetDef.replaceable) { x = hit.x; y = hit.y; z = hit.z; }
    if (y < 0 || y >= world.H) return;
    const cur = getDef(world.getBlock(x, y, z));
    if (!(cur.id === B.AIR || cur.id === B.WATER || cur.replaceable)) return;

    let placeId = id;
    if (def.plant) {
      const below = world.getBlock(x, y - 1, z);
      if (!(below === B.GRASS || below === B.DIRT)) { this.toast('草か土の上に置けるよ', 1000); return; }
    } else if (id === B.CACTUS) {
      const below = world.getBlock(x, y - 1, z);
      if (!(below === B.SAND || below === B.CACTUS)) { this.toast('サボテンは砂の上に', 1000); return; }
    } else if (id === B.TORCH) {
      if (hit.ny === -1) return;
      if (hit.ny === 0 && targetDef.solid && targetDef.opaque) {
        // 壁たいまつ：壁がある方向
        if (hit.nz === 1) placeId = B.TORCH_WALL_N;
        else if (hit.nz === -1) placeId = B.TORCH_WALL_S;
        else if (hit.nx === 1) placeId = B.TORCH_WALL_W;
        else if (hit.nx === -1) placeId = B.TORCH_WALL_E;
      } else if (!getDef(world.getBlock(x, y - 1, z)).solid) { this.toast('たいまつは かたいブロックに', 1000); return; }
    } else if (id === B.SNOW_LAYER) {
      if (!getDef(world.getBlock(x, y - 1, z)).solid) return;
    }
    if (def.collide) {
      const half = PLAYER_W / 2;
      if (aabbIntersectsBlock(player.pos.x, player.pos.y, player.pos.z, half, PLAYER_H, x, y, z)) return;
      for (const m of this.mobs.mobs) if (aabbIntersectsBlock(m.pos.x, m.pos.y, m.pos.z, m.info.w / 2, m.info.h, x, y, z)) return;
    }
    world.setBlock(x, y, z, placeId);
    audio.place(def.sound);
    this.renderer.swingHand();
    this.inventory.consumeSelected(1);
  }

  eat(id, fromHand = false) {
    const d = getDef(id);
    if (!d.food) return false;
    if (this.player.mode !== 'survival') { this.toast('おいしい！', 800); audio.eat(); if (fromHand) this.inventory.consumeSelected(1); return true; }
    if (this.player.health >= this.player.maxHealth) { this.toast('おなかいっぱい！', 800); return false; }
    this.player.heal(d.food);
    audio.eat();
    this.renderer.swingHand();
    if (fromHand) this.inventory.consumeSelected(1);
    return true;
  }

  onDeath() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.input.setEnabled(false);
    this.input.exitPointerLock();
    if (this.invUI.isOpen()) this.invUI.close();
    this.renderer.setCrack(null, 0);
    this.show(this.els.death);
    audio.hurt();
  }

  /* ================= HUD ================= */
  updateHud(force = false) {
    const p = this.player;
    // 時計
    const t = this.settings.alwaysDay ? 0.2 : (this.time / DAY_LENGTH) % 1;
    const hours = (6 + t * 24) % 24;
    const hh = Math.floor(hours), mm = Math.floor((hours - hh) * 60 / 10) * 10;
    const txt = `${hh}:${String(mm).padStart(2, '0')}`;
    if (this.els.timeText.textContent !== txt) {
      this.els.timeText.textContent = txt;
      this.els.timeIcon.textContent = hours >= 5.5 && hours < 18.5 ? (hours < 7 || hours > 17 ? '🌅' : '☀️') : '🌙';
    }
    if (this.settings.showCoords && this.frameCount % 6 === 0) this.els.coordsChip.textContent = `${Math.floor(p.pos.x)}, ${Math.floor(p.pos.y)}, ${Math.floor(p.pos.z)}`;
    this.els.modeChip.classList.toggle('is-hidden', !p.flying);
    // 体力
    if (p.mode === 'survival') {
      const key = p.health + ':' + Math.round(p.air * 10) + ':' + p.headInWater;
      if (key !== this.hudKey || force) {
        this.hudKey = key;
        let h = '';
        for (let i = 0; i < 10; i++) {
          const v = p.health - i * 2;
          h += `<i class="heart ${v >= 2 ? '' : v === 1 ? 'half' : 'empty'}"></i>`;
        }
        this.els.hearts.innerHTML = h;
        let b = '';
        if (p.headInWater || p.air < 1) { const n = Math.ceil(p.air * 10); for (let i = 0; i < n; i++) b += '<i class="bubble"></i>'; }
        this.els.bubbles.innerHTML = b;
      }
    } else if (force) { this.els.hearts.innerHTML = ''; this.els.bubbles.innerHTML = ''; }
    if (!this.isTouch) this.els.pcHint.classList.toggle('is-hidden', this.input.pointerLocked || this.state !== 'playing');
  }
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => { window.__blockWorld = new Game(); });
else window.__blockWorld = new Game();
