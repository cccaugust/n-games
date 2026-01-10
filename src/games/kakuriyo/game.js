/**
 * 幽世の試練（かくりよのしれん）
 * メインゲームモジュール
 */

import { DungeonGenerator, TILE, TRAP_EFFECTS } from './dungeon/DungeonGenerator.js';
import { Player } from './entities/Player.js';
import { Monster, createMonster } from './entities/Monster.js';
import { Renderer } from './ui/Renderer.js';
import { MONSTERS, getRandomMonster } from './data/monsters.js';
import { ALL_ITEMS, getRandomItem } from './data/items.js';

// ゲーム状態
const STATE = {
  TITLE: 'title',
  PLAYING: 'playing',
  MENU: 'menu',
  INVENTORY: 'inventory',
  DEAD: 'dead',
  CLEAR: 'clear'
};

class Game {
  constructor() {
    this.state = STATE.TITLE;
    this.floor = 1;
    this.maxFloor = 100;

    // ダンジョンデータ
    this.dungeon = null;
    this.tiles = null;
    this.rooms = null;
    this.stairsPos = null;
    this.traps = [];

    // エンティティ
    this.player = null;
    this.monsters = [];
    this.items = [];

    // レンダラー
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Renderer(this.canvas);

    // 入力
    this.inputEnabled = true;
    this.lastMoveTime = 0;
    this.moveDelay = 150;

    // メッセージログ
    this.messages = [];

    // ターンカウンター
    this.turnCount = 0;

    // 初期化
    this.init();
  }

  async init() {
    // スプライトロード
    await this.renderer.loadSprites();

    // イベントリスナー設定
    this.setupEventListeners();

    // UI更新
    this.updateUI();

    // 初回描画
    this.renderTitle();
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // キーボード入力
    document.addEventListener('keydown', e => this.handleKeyDown(e));

    // タッチ操作（モバイルDパッド）
    document.querySelectorAll('.d-pad button').forEach(btn => {
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        const dir = parseInt(btn.dataset.dir);
        this.handleDpadInput(dir);
      });
    });

    // メニューボタン
    document.getElementById('btnMenu')?.addEventListener('click', () => this.openMenu());
    document.getElementById('btnWait')?.addEventListener('click', () => this.playerWait());
    document.getElementById('btnDash')?.addEventListener('click', () => this.playerDash());

    // タイトル画面
    document.getElementById('btnNewGame')?.addEventListener('click', () => this.startNewGame());
    document.getElementById('btnContinue')?.addEventListener('click', () => this.continueGame());
    document.getElementById('btnHowTo')?.addEventListener('click', () => this.showHowTo());

    // メニュー項目
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        this.handleMenuAction(action);
      });
    });

    // インベントリ
    document.getElementById('btnCloseInventory')?.addEventListener('click', () => this.closeInventory());

    // 死亡画面
    document.getElementById('btnRetry')?.addEventListener('click', () => this.restartGame());

    // ウィンドウリサイズ
    window.addEventListener('resize', () => {
      if (this.renderer) this.renderer.resize();
      if (this.state === STATE.PLAYING) this.render();
    });
  }

  /**
   * キーボード入力処理
   */
  handleKeyDown(e) {
    if (!this.inputEnabled) return;

    // メニュー中
    if (this.state === STATE.MENU || this.state === STATE.INVENTORY) {
      if (e.key === 'Escape' || e.key === ' ') {
        this.closeMenu();
        this.closeInventory();
      }
      return;
    }

    // プレイ中
    if (this.state !== STATE.PLAYING) return;

    const now = Date.now();
    if (now - this.lastMoveTime < this.moveDelay) return;

    let dx = 0, dy = 0;
    let acted = false;

    switch (e.key) {
      // 移動（矢印キー・WASD・テンキー）
      case 'ArrowUp': case 'w': case 'W': case '8':
        dy = -1; break;
      case 'ArrowDown': case 's': case 'S': case '2':
        dy = 1; break;
      case 'ArrowLeft': case 'a': case 'A': case '4':
        dx = -1; break;
      case 'ArrowRight': case 'd': case 'D': case '6':
        dx = 1; break;
      case '7': case 'Home':
        dx = -1; dy = -1; break;
      case '9': case 'PageUp':
        dx = 1; dy = -1; break;
      case '1': case 'End':
        dx = -1; dy = 1; break;
      case '3': case 'PageDown':
        dx = 1; dy = 1; break;
      case '5': case '.': case 'z': case 'Z':
        // 足踏み
        acted = true;
        this.playerWait();
        break;
      case 'Escape': case ' ':
        // メニュー
        this.openMenu();
        return;
      case 'i': case 'I':
        // アイテム
        this.openInventory();
        return;
      default:
        return;
    }

    if (dx !== 0 || dy !== 0) {
      acted = this.movePlayer(dx, dy);
    }

    if (acted) {
      this.lastMoveTime = now;
    }
  }

  /**
   * Dパッド入力処理
   */
  handleDpadInput(dir) {
    if (this.state !== STATE.PLAYING) return;

    const dirs = {
      7: { dx: -1, dy: -1 },
      8: { dx: 0, dy: -1 },
      9: { dx: 1, dy: -1 },
      4: { dx: -1, dy: 0 },
      5: { dx: 0, dy: 0 }, // 足踏み
      6: { dx: 1, dy: 0 },
      1: { dx: -1, dy: 1 },
      2: { dx: 0, dy: 1 },
      3: { dx: 1, dy: 1 }
    };

    const d = dirs[dir];
    if (!d) return;

    if (d.dx === 0 && d.dy === 0) {
      this.playerWait();
    } else {
      this.movePlayer(d.dx, d.dy);
    }
  }

  /**
   * 新しいゲームを開始
   */
  startNewGame() {
    this.floor = 1;
    this.player = new Player(0, 0);
    this.messages = [];
    this.turnCount = 0;

    this.generateFloor();

    this.state = STATE.PLAYING;
    this.hideOverlay('titleScreen');

    this.addMessage('幽世塔の探索を開始した...');
    this.render();
    this.updateUI();
  }

  /**
   * コンテニュー（セーブデータから）
   */
  continueGame() {
    const saveData = localStorage.getItem('kakuriyo_save');
    if (saveData) {
      // TODO: セーブデータのロード
      this.addMessage('セーブデータを読み込みました');
    } else {
      this.addMessage('セーブデータがありません');
    }
    // とりあえず新規ゲーム
    this.startNewGame();
  }

  /**
   * 遊び方表示
   */
  showHowTo() {
    alert(`【幽世の試練 - 操作説明】

移動: 矢印キー / WASD / テンキー
足踏み: Z / ピリオド / テンキー5
メニュー: ESC / スペース
アイテム: I

【目的】
100階の幽世塔を踏破して現世に戻る

【ルール】
- ターン制: 動くと敵も動く
- 死亡するとレベル1・持ち物全消失
- 階段を降りて次の階へ`);
  }

  /**
   * フロア生成
   */
  generateFloor() {
    const generator = new DungeonGenerator(48, 32);
    const floor = generator.generate(this.floor);

    this.tiles = floor.tiles;
    this.rooms = floor.rooms;
    this.stairsPos = floor.stairsPos;
    this.traps = floor.traps;

    // プレイヤー配置
    this.player.moveTo(floor.startPos.x, floor.startPos.y);

    // モンスター配置
    this.monsters = [];
    const monsterCount = 3 + Math.floor(this.floor / 5);
    for (let i = 0; i < monsterCount; i++) {
      this.spawnMonster();
    }

    // アイテム配置
    this.items = [];
    const itemCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < itemCount; i++) {
      this.spawnItem();
    }

    // 探索済みマップ初期化
    this.renderer.initExplored(floor.width, floor.height);
  }

  /**
   * モンスターをスポーン
   */
  spawnMonster() {
    const monsterData = getRandomMonster(this.floor);
    let attempts = 0;

    while (attempts < 50) {
      const room = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      const x = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
      const y = room.y + 1 + Math.floor(Math.random() * (room.h - 2));

      // プレイヤーや他のモンスターと重ならないか
      if (x === this.player.x && y === this.player.y) {
        attempts++;
        continue;
      }
      if (this.monsters.some(m => m.x === x && m.y === y)) {
        attempts++;
        continue;
      }

      const monster = createMonster(x, y, monsterData);
      this.monsters.push(monster);
      return;
    }
  }

  /**
   * アイテムをスポーン
   */
  spawnItem() {
    const itemData = getRandomItem(this.floor);
    let attempts = 0;

    while (attempts < 50) {
      const room = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      const x = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
      const y = room.y + 1 + Math.floor(Math.random() * (room.h - 2));

      // 階段やプレイヤーと重ならないか
      if (x === this.stairsPos.x && y === this.stairsPos.y) {
        attempts++;
        continue;
      }
      if (x === this.player.x && y === this.player.y) {
        attempts++;
        continue;
      }
      if (this.items.some(i => i.x === x && i.y === y)) {
        attempts++;
        continue;
      }

      const item = {
        ...itemData,
        x, y,
        enhancement: 0,
        identified: false
      };
      this.items.push(item);
      return;
    }
  }

  /**
   * プレイヤー移動
   */
  movePlayer(dx, dy) {
    if (!this.player.canAct()) {
      this.processTurn();
      return true;
    }

    // 混乱時はランダム方向
    if (this.player.statusEffects.confused > 0) {
      const conf = this.player.getConfusedDirection();
      dx = conf.dx;
      dy = conf.dy;
    }

    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    // モンスターがいれば攻撃
    const target = this.monsters.find(m => m.isAlive && m.x === nx && m.y === ny);
    if (target) {
      this.attackMonster(target);
      this.processTurn();
      return true;
    }

    // 移動可能かチェック
    if (!this.player.canMoveTo(this.tiles, nx, ny, this.monsters)) {
      return false;
    }

    // 移動実行
    this.player.moveTo(nx, ny);

    // 罠チェック
    this.checkTrap();

    // アイテム拾得チェック
    this.checkItemPickup();

    // 階段チェック
    if (nx === this.stairsPos.x && ny === this.stairsPos.y) {
      this.addMessage('階段がある。降りますか？（足踏みで降りる）');
    }

    this.processTurn();
    return true;
  }

  /**
   * 足踏み
   */
  playerWait() {
    if (!this.player.canAct()) {
      this.processTurn();
      return;
    }

    // 階段の上なら降りる
    if (this.player.x === this.stairsPos.x && this.player.y === this.stairsPos.y) {
      this.descendStairs();
      return;
    }

    // 足踏み（HP回復待ち）
    this.processTurn();
  }

  /**
   * ダッシュ（自動移動）
   */
  playerDash() {
    // TODO: 実装
    this.addMessage('ダッシュは未実装です');
  }

  /**
   * モンスターを攻撃
   */
  attackMonster(monster) {
    const damage = this.calculateDamage(this.player, monster);
    monster.takeDamage(damage);

    this.addMessage(`${monster.name}に${damage}のダメージ！`);

    // ドレイン効果
    if (this.player.equipment.weapon?.effect === 'drain_25') {
      const heal = Math.floor(damage * 0.25);
      if (heal > 0) {
        this.player.heal(heal);
        this.addMessage(`HPを${heal}回復した`);
      }
    }

    // 撃破
    if (!monster.isAlive) {
      this.addMessage(`${monster.name}を倒した！`);
      this.player.gainExp(monster.exp);

      // 爆発系
      if (monster.special?.startsWith('explode_')) {
        const explosionDamage = parseInt(monster.special.split('_')[1]);
        const dist = Math.abs(this.player.x - monster.x) + Math.abs(this.player.y - monster.y);
        if (dist <= 1) {
          this.player.takeDamage(explosionDamage);
          this.addMessage(`爆発で${explosionDamage}のダメージ！`);
        }
      }
    }
  }

  /**
   * ダメージ計算
   */
  calculateDamage(attacker, defender) {
    const attackPower = attacker.getAttackPower?.() ?? attacker.attack;
    const defensePower = defender.getDefensePower?.() ?? defender.defense;

    // 基本ダメージ = (攻撃力²) / (攻撃力 + 防御力)
    let baseDamage = (attackPower * attackPower) / (attackPower + defensePower + 1);

    // 乱数（87.5% ～ 112.5%）
    baseDamage *= 0.875 + Math.random() * 0.25;

    // 会心の一撃（1/32）
    if (Math.random() < 1 / 32) {
      baseDamage *= 2;
      this.addMessage('会心の一撃！');
    }

    return Math.max(1, Math.floor(baseDamage));
  }

  /**
   * 罠チェック
   */
  checkTrap() {
    const trap = this.traps.find(t => t.x === this.player.x && t.y === this.player.y);
    if (!trap) return;

    // 罠を可視化
    trap.visible = true;

    // 転ばぬ先の杖効果
    if (this.player.inventory.some(i => i.effect === 'trip_proof')) {
      this.addMessage('罠を回避した！');
      return;
    }

    const effect = TRAP_EFFECTS[trap.type];
    this.addMessage(`${effect.name}を踏んだ！`);

    switch (trap.type) {
      case 'pitfall':
        this.descendStairs();
        break;
      case 'mine':
        this.player.takeDamage(50);
        this.addMessage('50ダメージ！');
        break;
      case 'poison':
        this.player.strength = Math.max(1, this.player.strength - 1);
        this.addMessage('ちからが下がった...');
        break;
      case 'sleep':
        this.player.statusEffects.sleeping = 5;
        this.addMessage('眠ってしまった...');
        break;
      case 'spin':
        this.player.statusEffects.confused = 10;
        this.addMessage('目が回る...');
        break;
      case 'alert':
        // 全モンスターがプレイヤー位置を認識
        for (const m of this.monsters) {
          m.state = 'chase';
          m.lastSeenPlayer = { x: this.player.x, y: this.player.y };
        }
        this.addMessage('モンスターに気づかれた！');
        break;
      case 'rock':
        this.player.takeDamage(15);
        this.addMessage('15ダメージ！');
        break;
      case 'curse':
        // 装備呪い（未実装）
        this.addMessage('装備が呪われた...');
        break;
      case 'rot':
        // おにぎり腐る（未実装）
        this.addMessage('おにぎりが腐った...');
        break;
      case 'disarm':
        // 装備外れ（未実装）
        this.addMessage('装備が外れた！');
        break;
    }
  }

  /**
   * アイテム拾得チェック
   */
  checkItemPickup() {
    const item = this.items.find(i => i.x === this.player.x && i.y === this.player.y);
    if (!item) return;

    if (this.player.pickupItem(item)) {
      this.items = this.items.filter(i => i !== item);
      this.addMessage(`${item.name}を拾った`);
    } else {
      this.addMessage('持ち物がいっぱいだ');
    }
  }

  /**
   * 階段を降りる
   */
  descendStairs() {
    this.floor++;

    if (this.floor > this.maxFloor) {
      // クリア
      this.state = STATE.CLEAR;
      this.addMessage('幽世塔を踏破した！現世への道が開いた...');
      return;
    }

    this.addMessage(`B${this.floor}Fに降りた`);
    this.generateFloor();
    this.render();
    this.updateUI();
  }

  /**
   * ターン処理
   */
  processTurn() {
    this.turnCount++;

    // プレイヤーの状態異常処理
    this.player.endTurn();

    // 満腹度減少
    this.player.decreaseSatiety(0.1);

    // 自然回復
    this.player.naturalRegen();

    // プレイヤー死亡チェック
    if (!this.player.isAlive) {
      this.onPlayerDeath();
      return;
    }

    // モンスター行動
    for (const monster of this.monsters) {
      if (!monster.isAlive) continue;

      // 鈍足チェック
      if (monster.isSlowed()) {
        monster.turnCounter++;
        if (monster.turnCounter % 2 === 0) continue;
      }

      // 倍速チェック
      const actCount = monster.isDoubleSpeed ? 2 : 1;
      for (let i = 0; i < actCount; i++) {
        if (!monster.isAlive || !this.player.isAlive) break;
        this.processMonsterAction(monster);
      }
    }

    // プレイヤー死亡チェック（モンスター行動後）
    if (!this.player.isAlive) {
      this.onPlayerDeath();
      return;
    }

    this.render();
    this.updateUI();
  }

  /**
   * モンスター行動処理
   */
  processMonsterAction(monster) {
    const action = monster.act(this.player, this.tiles, this.monsters, this);
    if (!action) return;

    switch (action.type) {
      case 'move':
        monster.x += action.dx;
        monster.y += action.dy;
        break;

      case 'attack':
        const damage = this.calculateDamage(monster, this.player);
        this.player.takeDamage(damage);
        this.addMessage(`${monster.name}の攻撃！${damage}のダメージ`);

        // 特殊能力
        this.processMonsterSpecial(monster, action.target);
        break;

      case 'ranged_attack':
        const rDamage = this.calculateDamage(monster, this.player);
        this.player.takeDamage(rDamage);
        this.addMessage(`${monster.name}の槍攻撃！${rDamage}のダメージ`);
        break;

      case 'fire_attack':
        this.player.takeDamage(action.damage);
        this.addMessage(`${monster.name}の炎！${action.damage}のダメージ`);
        break;

      case 'wait':
        break;
    }

    monster.endTurn();
  }

  /**
   * モンスター特殊能力処理
   */
  processMonsterSpecial(monster, target) {
    if (!monster.special || monster.statusEffects.sealed) return;

    // 混乱付与
    if (monster.special.startsWith('confuse_')) {
      const chance = parseInt(monster.special.split('_')[1]) / 100;
      if (Math.random() < chance) {
        this.player.statusEffects.confused = 10;
        this.addMessage('混乱してしまった！');
      }
    }

    // ちから低下
    if (monster.special.startsWith('reduce_str_')) {
      const amount = parseInt(monster.special.split('_')[2]);
      this.player.strength = Math.max(1, this.player.strength - amount);
      this.addMessage(`ちからが${amount}下がった...`);
    }

    // 鈍足
    if (monster.special.startsWith('slow_')) {
      const turns = parseInt(monster.special.split('_')[1]);
      this.player.statusEffects.slowed = turns;
      this.addMessage('足が重い...');
    }

    // 金縛り
    if (monster.special.startsWith('paralyze_')) {
      const turns = parseInt(monster.special.split('_')[1]);
      this.player.statusEffects.paralyzed = turns;
      this.addMessage('動けない！');
    }

    // アイテム盗み
    if (monster.special.startsWith('steal_item_')) {
      const count = parseInt(monster.special.split('_')[2]);
      for (let i = 0; i < count && this.player.inventory.length > 0; i++) {
        const idx = Math.floor(Math.random() * this.player.inventory.length);
        const stolen = this.player.inventory.splice(idx, 1)[0];
        this.addMessage(`${stolen.name}を盗まれた！`);
      }
    }

    // 金盗み
    if (monster.special.startsWith('steal_gold_')) {
      const max = parseInt(monster.special.split('_')[2]);
      const amount = Math.min(this.player.gold, Math.floor(Math.random() * max) + 10);
      this.player.gold -= amount;
      this.addMessage(`${amount}Gを盗まれた！`);
    }
  }

  /**
   * プレイヤー死亡処理
   */
  onPlayerDeath() {
    this.player.onDeath();
    this.state = STATE.DEAD;

    document.getElementById('deathFloor').textContent = `B${this.floor}F`;
    document.getElementById('deathLevel').textContent = this.player.level;
    document.getElementById('deathExp').textContent = this.player.exp;

    this.showOverlay('deathScreen');
    this.addMessage('力尽きた...');
  }

  /**
   * リスタート
   */
  restartGame() {
    this.hideOverlay('deathScreen');
    this.player.restart();
    this.floor = 1;
    this.messages = [];
    this.turnCount = 0;

    this.generateFloor();
    this.state = STATE.PLAYING;

    this.addMessage('幽世塔の探索を再開した...');
    this.render();
    this.updateUI();
  }

  /**
   * メニューを開く
   */
  openMenu() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.MENU;
    this.showOverlay('gameMenu');
  }

  /**
   * メニューを閉じる
   */
  closeMenu() {
    if (this.state !== STATE.MENU) return;
    this.state = STATE.PLAYING;
    this.hideOverlay('gameMenu');
  }

  /**
   * メニューアクション処理
   */
  handleMenuAction(action) {
    switch (action) {
      case 'inventory':
        this.closeMenu();
        this.openInventory();
        break;
      case 'ground':
        this.closeMenu();
        this.checkGround();
        break;
      case 'status':
        this.closeMenu();
        this.showStatus();
        break;
      case 'help':
        this.closeMenu();
        this.showHowTo();
        break;
      case 'giveup':
        if (confirm('本当に冒険をあきらめますか？')) {
          this.closeMenu();
          this.onPlayerDeath();
        }
        break;
      case 'close':
        this.closeMenu();
        break;
    }
  }

  /**
   * インベントリを開く
   */
  openInventory() {
    this.state = STATE.INVENTORY;
    this.renderInventory();
    this.showOverlay('inventoryPanel');
  }

  /**
   * インベントリを閉じる
   */
  closeInventory() {
    if (this.state !== STATE.INVENTORY) return;
    this.state = STATE.PLAYING;
    this.hideOverlay('inventoryPanel');
  }

  /**
   * インベントリ描画
   */
  renderInventory() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = '';

    if (this.player.inventory.length === 0) {
      list.innerHTML = '<p style="color:#888;text-align:center;">持ち物がありません</p>';
      return;
    }

    for (let i = 0; i < this.player.inventory.length; i++) {
      const item = this.player.inventory[i];
      const div = document.createElement('div');
      div.className = 'inventory-item';
      div.innerHTML = `
        <div class="icon"></div>
        <div class="info">
          <div class="name">${item.name}${item.enhancement > 0 ? `+${item.enhancement}` : ''}</div>
          <div class="desc">${this.getItemDescription(item)}</div>
        </div>
      `;
      div.addEventListener('click', () => this.useInventoryItem(i));
      list.appendChild(div);
    }
  }

  /**
   * アイテム説明取得
   */
  getItemDescription(item) {
    switch (item.type) {
      case 'weapon': return `攻撃力+${item.attack}`;
      case 'shield': return `防御力+${item.defense}`;
      case 'grass': return '草';
      case 'scroll': return '巻物';
      case 'staff': return `杖[${item.uses?.[0] ?? '?'}]`;
      case 'arrow': return '矢';
      case 'pot': return `壺[${item.capacity?.[0] ?? '?'}]`;
      case 'ring': return '指輪';
      case 'food': return '食べ物';
      default: return '';
    }
  }

  /**
   * インベントリアイテム使用
   */
  useInventoryItem(index) {
    const item = this.player.inventory[index];
    if (!item) return;

    // 簡易的な使用処理
    switch (item.type) {
      case 'weapon':
      case 'shield':
      case 'ring':
        // 装備
        this.player.inventory.splice(index, 1);
        const old = this.player.equip(item);
        if (old) this.player.inventory.push(old);
        this.addMessage(`${item.name}を装備した`);
        break;

      case 'grass':
        this.player.inventory.splice(index, 1);
        this.useGrass(item);
        break;

      case 'scroll':
        this.player.inventory.splice(index, 1);
        this.useScroll(item);
        break;

      case 'food':
        this.player.inventory.splice(index, 1);
        this.useFood(item);
        break;

      default:
        this.addMessage('このアイテムは使えません');
        return;
    }

    this.closeInventory();
    this.processTurn();
  }

  /**
   * 草を使用
   */
  useGrass(item) {
    switch (item.effect) {
      case 'heal_30':
        this.player.heal(30);
        this.addMessage('HPが30回復した');
        break;
      case 'heal_100':
        this.player.heal(100);
        this.addMessage('HPが100回復した');
        break;
      case 'max_hp_up':
        this.player.maxHp += 5;
        this.player.hp += 5;
        this.addMessage('最大HPが5上がった！');
        break;
      case 'strength_up':
        this.player.maxStrength++;
        this.player.strength++;
        this.addMessage('ちからが1上がった！');
        break;
      case 'cure_poison':
        this.player.strength = this.player.maxStrength;
        this.addMessage('ちからが回復した');
        break;
      case 'confuse':
        this.player.statusEffects.confused = 10;
        this.addMessage('混乱してしまった...');
        break;
      case 'sleep':
        this.player.statusEffects.sleeping = 5;
        this.addMessage('眠ってしまった...');
        break;
      default:
        this.addMessage(`${item.name}を飲んだ`);
    }
  }

  /**
   * 巻物を使用
   */
  useScroll(item) {
    switch (item.effect) {
      case 'reveal_map':
        // マップ全開示
        for (let y = 0; y < this.renderer.explored.length; y++) {
          for (let x = 0; x < this.renderer.explored[0].length; x++) {
            this.renderer.explored[y][x] = true;
          }
        }
        this.addMessage('マップ全体が見えるようになった');
        break;
      case 'confuse_all':
        for (const m of this.monsters) {
          if (m.isAlive) m.statusEffects.confused = 10;
        }
        this.addMessage('モンスターたちが混乱した');
        break;
      default:
        this.addMessage(`${item.name}を読んだ`);
    }
  }

  /**
   * 食べ物を使用
   */
  useFood(item) {
    switch (item.effect) {
      case 'satiety_50':
        this.player.satiety = Math.min(this.player.maxSatiety, this.player.satiety + 50);
        this.addMessage('満腹度が回復した');
        break;
      case 'satiety_100':
        this.player.satiety = Math.min(this.player.maxSatiety, this.player.satiety + 100);
        this.addMessage('満腹度が大きく回復した');
        break;
    }
  }

  /**
   * 足元チェック
   */
  checkGround() {
    const item = this.items.find(i => i.x === this.player.x && i.y === this.player.y);
    if (item) {
      this.addMessage(`足元に${item.name}がある`);
    } else if (this.player.x === this.stairsPos.x && this.player.y === this.stairsPos.y) {
      this.addMessage('足元に階段がある');
    } else {
      this.addMessage('足元には何もない');
    }
  }

  /**
   * ステータス表示
   */
  showStatus() {
    const p = this.player;
    alert(`【${p.name}】
Lv.${p.level}
HP: ${p.hp}/${p.maxHp}
ちから: ${p.strength}/${p.maxStrength}
満腹度: ${Math.floor(p.satiety)}/${p.maxSatiety}
経験値: ${p.exp}/${p.level * p.level * 10}
所持金: ${p.gold}G

武器: ${p.equipment.weapon?.name ?? 'なし'}
盾: ${p.equipment.shield?.name ?? 'なし'}
指輪: ${p.equipment.ring?.name ?? 'なし'}`);
  }

  /**
   * メッセージ追加
   */
  addMessage(text, type = '') {
    this.messages.push({ text, type });
    if (this.messages.length > 100) {
      this.messages.shift();
    }
    this.updateMessageLog();
  }

  /**
   * メッセージログ更新
   */
  updateMessageLog() {
    const log = document.getElementById('messageLog');
    // 最新5件を表示
    const recent = this.messages.slice(-5);
    log.innerHTML = recent.map(m =>
      `<p class="${m.type}">${m.text}</p>`
    ).join('');
    log.scrollTop = log.scrollHeight;
  }

  /**
   * UI更新
   */
  updateUI() {
    const p = this.player;
    if (!p) return;

    document.getElementById('floorDisplay').textContent = `B${this.floor}F`;
    document.getElementById('hpText').textContent = `${p.hp}/${p.maxHp}`;
    document.getElementById('hpBar').style.width = `${(p.hp / p.maxHp) * 100}%`;
    document.getElementById('satietyBar').style.width = `${(p.satiety / p.maxSatiety) * 100}%`;
    document.getElementById('levelText').textContent = p.level;
    document.getElementById('strengthText').textContent = p.strength;
    document.getElementById('goldText').textContent = p.gold;
  }

  /**
   * 描画
   */
  render() {
    if (this.state === STATE.TITLE) {
      this.renderTitle();
      return;
    }

    this.renderer.render({
      tiles: this.tiles,
      player: this.player,
      monsters: this.monsters,
      items: this.items,
      traps: this.traps,
      rooms: this.rooms,
      stairsPos: this.stairsPos,
      floor: this.floor
    });
  }

  /**
   * タイトル画面描画
   */
  renderTitle() {
    const ctx = this.renderer.ctx;
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
  }

  /**
   * オーバーレイ表示
   */
  showOverlay(id) {
    document.getElementById(id)?.classList.remove('hidden');
  }

  /**
   * オーバーレイ非表示
   */
  hideOverlay(id) {
    document.getElementById(id)?.classList.add('hidden');
  }
}

// ゲーム開始
const game = new Game();
