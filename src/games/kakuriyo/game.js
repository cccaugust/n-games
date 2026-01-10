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
import { PHASES, getPhaseForFloor, checkPhaseChange } from './data/phases.js';

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

    // フェーズ管理
    this.currentPhase = null;

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

    // ダッシュ用
    this.lastDirection = { dx: 0, dy: 0 };
    this.isDashing = false;

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

    // アニメーションループ開始
    this.startAnimationLoop();
  }

  /**
   * アニメーションループを開始
   */
  startAnimationLoop() {
    const loop = () => {
      if (this.state === STATE.PLAYING) {
        this.render();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
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

    // ステータスパネル
    document.getElementById('btnCloseStatus')?.addEventListener('click', () => this.closeStatus());

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

    // フェーズ初期化
    this.currentPhase = getPhaseForFloor(this.floor);
    this.renderer.setPhase(this.currentPhase);

    this.generateFloor();

    this.state = STATE.PLAYING;
    this.hideOverlay('titleScreen');

    this.addMessage('幽世塔の探索を開始した...');
    this.addMessage(`【${this.currentPhase.name}】${this.currentPhase.description}`);
    this.render();
    this.updateUI();
  }

  /**
   * コンテニュー（セーブデータから）
   */
  continueGame() {
    const saveData = localStorage.getItem('kakuriyo_save');
    if (!saveData) {
      alert('セーブデータがありません');
      return;
    }

    try {
      const data = JSON.parse(saveData);
      this.loadGame(data);
      this.state = STATE.PLAYING;
      this.hideOverlay('titleScreen');
      this.addMessage('セーブデータを読み込みました');
      this.render();
      this.updateUI();
    } catch (e) {
      console.error('セーブデータの読み込みに失敗:', e);
      alert('セーブデータの読み込みに失敗しました');
    }
  }

  /**
   * ゲームをセーブ
   */
  saveGame() {
    const data = {
      version: 1,
      floor: this.floor,
      turnCount: this.turnCount,
      currentPhaseId: this.currentPhase?.id,

      // プレイヤー情報
      player: {
        x: this.player.x,
        y: this.player.y,
        level: this.player.level,
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        strength: this.player.strength,
        maxStrength: this.player.maxStrength,
        satiety: this.player.satiety,
        maxSatiety: this.player.maxSatiety,
        exp: this.player.exp,
        gold: this.player.gold,
        equipment: this.player.equipment,
        inventory: this.player.inventory,
        statusEffects: this.player.statusEffects,
        regenCounter: this.player.regenCounter
      },

      // ダンジョンデータ
      tiles: this.tiles,
      rooms: this.rooms,
      stairsPos: this.stairsPos,
      traps: this.traps,

      // モンスター情報
      monsters: this.monsters.map(m => ({
        id: m.id,
        name: m.name,
        x: m.x,
        y: m.y,
        hp: m.hp,
        maxHp: m.maxHp,
        attack: m.attack,
        defense: m.defense,
        exp: m.exp,
        special: m.special,
        sprite: m.sprite,
        isBoss: m.isBoss,
        isAlive: m.isAlive,
        state: m.state,
        lastSeenPlayer: m.lastSeenPlayer,
        statusEffects: m.statusEffects,
        isDoubleSpeed: m.isDoubleSpeed,
        turnCounter: m.turnCounter,
        hasBeenAttacked: m.hasBeenAttacked,
        isImmobile: m.isImmobile
      })),

      // アイテム情報
      items: this.items,

      // メッセージ（最新20件）
      messages: this.messages.slice(-20),

      // 探索済みマップ
      explored: this.renderer.explored
    };

    localStorage.setItem('kakuriyo_save', JSON.stringify(data));
  }

  /**
   * ゲームをロード
   */
  loadGame(data) {
    this.floor = data.floor;
    this.turnCount = data.turnCount;

    // フェーズ復元
    this.currentPhase = getPhaseForFloor(this.floor);
    this.renderer.setPhase(this.currentPhase);

    // プレイヤー復元
    this.player = new Player(data.player.x, data.player.y);
    Object.assign(this.player, {
      level: data.player.level,
      hp: data.player.hp,
      maxHp: data.player.maxHp,
      strength: data.player.strength,
      maxStrength: data.player.maxStrength,
      satiety: data.player.satiety,
      maxSatiety: data.player.maxSatiety,
      exp: data.player.exp,
      gold: data.player.gold,
      equipment: data.player.equipment,
      inventory: data.player.inventory,
      statusEffects: data.player.statusEffects,
      regenCounter: data.player.regenCounter
    });

    // ダンジョンデータ復元
    this.tiles = data.tiles;
    this.rooms = data.rooms;
    this.stairsPos = data.stairsPos;
    this.traps = data.traps;

    // モンスター復元
    this.monsters = data.monsters.map(mData => {
      const monster = createMonster(mData.x, mData.y, {
        id: mData.id,
        name: mData.name,
        hp: mData.maxHp,
        attack: mData.attack,
        defense: mData.defense,
        exp: mData.exp,
        special: mData.special,
        sprite: mData.sprite,
        isBoss: mData.isBoss
      });
      monster.hp = mData.hp;
      monster.isAlive = mData.isAlive;
      monster.state = mData.state;
      monster.lastSeenPlayer = mData.lastSeenPlayer;
      monster.statusEffects = mData.statusEffects;
      monster.isDoubleSpeed = mData.isDoubleSpeed;
      monster.turnCounter = mData.turnCounter;
      monster.hasBeenAttacked = mData.hasBeenAttacked;
      monster.isImmobile = mData.isImmobile;
      return monster;
    });

    // アイテム復元
    this.items = data.items;

    // メッセージ復元
    this.messages = data.messages || [];
    this.updateMessageLog();

    // 探索済みマップ復元
    if (data.explored) {
      this.renderer.explored = data.explored;
    } else {
      this.renderer.initExplored(this.tiles[0].length, this.tiles.length);
    }
  }

  /**
   * セーブデータを削除
   */
  deleteSave() {
    localStorage.removeItem('kakuriyo_save');
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
    this.isBossFloor = floor.isBossFloor || false;
    this.monsterHouseRoom = floor.monsterHouseRoom || null;
    this.monsterHouseTriggered = false;

    // プレイヤー配置
    this.player.moveTo(floor.startPos.x, floor.startPos.y);

    // モンスター配置
    this.monsters = [];

    if (this.isBossFloor) {
      // ボスフロア: ボスのみ配置
      this.spawnBoss(floor.bossPos);
    } else {
      // 通常フロア
      const monsterCount = 3 + Math.floor(this.floor / 5);
      for (let i = 0; i < monsterCount; i++) {
        this.spawnMonster();
      }
    }

    // アイテム配置（ボスフロアはなし）
    this.items = [];
    if (!this.isBossFloor) {
      const itemCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < itemCount; i++) {
        this.spawnItem();
      }
    }

    // モンスターハウスセットアップ
    if (this.monsterHouseRoom) {
      this.setupMonsterHouse(this.monsterHouseRoom);
    }

    // 探索済みマップ初期化
    this.renderer.initExplored(floor.width, floor.height);
  }

  /**
   * ボスをスポーン
   */
  spawnBoss(pos) {
    const bossData = MONSTERS.rinnemori;
    const boss = createMonster(pos.x, pos.y, bossData);
    boss.bossPhase = 1; // ボスのフェーズ（形態変化用）
    this.monsters.push(boss);
    this.addMessage('【輪廻守】が現れた！');
  }

  /**
   * モンスターハウスをセットアップ
   */
  setupMonsterHouse(room) {
    // モンスターハウスには多くのモンスターとアイテムを配置
    const monsterCount = 8 + Math.floor(this.floor / 10);
    const itemCount = 5 + Math.floor(this.floor / 15);

    // モンスター配置
    for (let i = 0; i < monsterCount; i++) {
      const monsterData = getRandomMonster(this.floor);
      let attempts = 0;

      while (attempts < 30) {
        const x = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
        const y = room.y + 1 + Math.floor(Math.random() * (room.h - 2));

        if (this.monsters.some(m => m.x === x && m.y === y)) {
          attempts++;
          continue;
        }

        const monster = createMonster(x, y, monsterData);
        monster.state = 'wander'; // 最初は徘徊状態
        this.monsters.push(monster);
        break;
      }
    }

    // アイテム配置
    for (let i = 0; i < itemCount; i++) {
      const itemData = getRandomItem(this.floor);
      let attempts = 0;

      while (attempts < 30) {
        const x = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
        const y = room.y + 1 + Math.floor(Math.random() * (room.h - 2));

        if (this.items.some(it => it.x === x && it.y === y)) {
          attempts++;
          continue;
        }
        if (x === this.stairsPos.x && y === this.stairsPos.y) {
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
        break;
      }
    }
  }

  /**
   * モンスターハウス発動チェック
   */
  checkMonsterHouse() {
    if (!this.monsterHouseRoom || this.monsterHouseTriggered) return;

    const room = this.monsterHouseRoom;
    const px = this.player.x;
    const py = this.player.y;

    // プレイヤーがモンスターハウスの部屋に入ったか
    if (px >= room.x && px < room.x + room.w &&
        py >= room.y && py < room.y + room.h) {
      this.triggerMonsterHouse();
    }
  }

  /**
   * モンスターハウス発動
   */
  triggerMonsterHouse() {
    this.monsterHouseTriggered = true;

    // 警告メッセージ
    this.addMessage('【モンスターハウスだ！】', 'important');

    // モンスターハウス内のモンスターを全て覚醒
    for (const monster of this.monsters) {
      const room = this.monsterHouseRoom;
      if (monster.x >= room.x && monster.x < room.x + room.w &&
          monster.y >= room.y && monster.y < room.y + room.h) {
        monster.state = 'chase';
        monster.lastSeenPlayer = { x: this.player.x, y: this.player.y };
      }
    }
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
  movePlayer(dx, dy, fromDash = false) {
    if (!this.player.canAct()) {
      this.processTurn();
      return true;
    }

    // 混乱時はランダム方向（ダッシュ中は解除）
    if (this.player.statusEffects.confused > 0) {
      this.isDashing = false;
      const conf = this.player.getConfusedDirection();
      dx = conf.dx;
      dy = conf.dy;
    }

    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    // モンスターがいれば攻撃（ダッシュ停止）
    const target = this.monsters.find(m => m.isAlive && m.x === nx && m.y === ny);
    if (target) {
      this.isDashing = false;
      this.attackMonster(target);
      this.processTurn();
      return true;
    }

    // 移動可能かチェック
    if (!this.player.canMoveTo(this.tiles, nx, ny, this.monsters)) {
      this.isDashing = false;
      return false;
    }

    // 移動方向を記録
    this.lastDirection = { dx, dy };

    // 移動実行
    this.player.moveTo(nx, ny);

    // 罠チェック（踏んだらダッシュ停止）
    const trap = this.traps.find(t => t.x === this.player.x && t.y === this.player.y);
    if (trap) {
      this.isDashing = false;
    }
    this.checkTrap();

    // アイテム拾得チェック
    this.checkItemPickup();

    // モンスターハウスチェック
    this.checkMonsterHouse();

    // 階段チェック
    if (nx === this.stairsPos.x && ny === this.stairsPos.y) {
      this.isDashing = false;
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
    if (!this.player.canAct()) {
      this.addMessage('動けない！');
      return;
    }

    // 前回移動していない場合は通路方向を探す
    let dx = this.lastDirection.dx;
    let dy = this.lastDirection.dy;

    if (dx === 0 && dy === 0) {
      // 通路方向を自動検出
      const passageDir = this.findPassageDirection();
      if (passageDir) {
        dx = passageDir.dx;
        dy = passageDir.dy;
      } else {
        this.addMessage('ダッシュできる方向がない');
        return;
      }
    }

    // ダッシュ開始
    this.isDashing = true;
    this.continueDash(dx, dy);
  }

  /**
   * ダッシュを継続
   */
  continueDash(dx, dy) {
    if (!this.isDashing || !this.player.isAlive) return;

    // 敵が視界内にいるか確認
    const visibleMonster = this.monsters.find(m => {
      if (!m.isAlive) return false;
      const distX = Math.abs(m.x - this.player.x);
      const distY = Math.abs(m.y - this.player.y);
      return distX <= 2 && distY <= 2;
    });

    if (visibleMonster) {
      this.isDashing = false;
      this.addMessage('敵を発見！');
      return;
    }

    // 移動先チェック
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;

    // 移動できないなら停止
    if (!this.player.canMoveTo(this.tiles, nx, ny, this.monsters)) {
      this.isDashing = false;
      return;
    }

    // 分岐点チェック（通路で複数方向に行ける場合）
    if (this.isAtJunction(dx, dy)) {
      this.isDashing = false;
      this.addMessage('分岐点で停止');
      return;
    }

    // 移動実行
    this.movePlayer(dx, dy, true);

    // まだダッシュ中なら続行
    if (this.isDashing) {
      setTimeout(() => this.continueDash(dx, dy), 80);
    }
  }

  /**
   * 通路方向を探す
   */
  findPassageDirection() {
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    const passable = dirs.filter(d => {
      const nx = this.player.x + d.dx;
      const ny = this.player.y + d.dy;
      return this.player.canMoveTo(this.tiles, nx, ny, this.monsters);
    });

    // 1方向だけ進めるなら自動でその方向へ
    if (passable.length === 1) {
      return passable[0];
    }

    return null;
  }

  /**
   * 分岐点にいるかチェック
   */
  isAtJunction(currentDx, currentDy) {
    // 現在の部屋を確認
    const inRoom = this.rooms.some(room =>
      this.player.x >= room.x && this.player.x < room.x + room.w &&
      this.player.y >= room.y && this.player.y < room.y + room.h
    );

    // 部屋に入ったら停止
    if (inRoom) {
      return true;
    }

    // 通路で左右（または前後）に分岐があるか
    const perpDirs = currentDx !== 0
      ? [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }]
      : [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

    for (const d of perpDirs) {
      const nx = this.player.x + d.dx;
      const ny = this.player.y + d.dy;
      if (this.player.canMoveTo(this.tiles, nx, ny, this.monsters)) {
        return true;
      }
    }

    return false;
  }

  /**
   * モンスターを攻撃
   */
  attackMonster(monster) {
    // 攻撃アニメーション開始
    this.renderer.startAttackAnimation(this.player.x, this.player.y, monster.x, monster.y, true);

    const damage = this.calculateDamage(this.player, monster);
    monster.takeDamage(damage);

    // ダメージエフェクトと効果音
    this.renderer.addEffect('slash', monster.x, monster.y, { duration: 200 });
    this.renderer.addEffect('damage', monster.x, monster.y, {
      text: `-${damage}`,
      color: '#ff4',
      duration: 600
    });
    this.renderer.playSound('hit');

    this.addMessage(`${monster.name}に${damage}のダメージ！`);

    // ドレイン効果
    if (this.player.equipment.weapon?.effect === 'drain_25') {
      const heal = Math.floor(damage * 0.25);
      if (heal > 0) {
        this.player.heal(heal);
        this.addMessage(`HPを${heal}回復した`);
        this.renderer.addEffect('heal', this.player.x, this.player.y, {
          text: `+${heal}`,
          duration: 600
        });
        this.renderer.playSound('heal');
      }
    }

    // 撃破
    if (!monster.isAlive) {
      this.addMessage(`${monster.name}を倒した！`);
      const prevLevel = this.player.level;
      this.player.gainExp(monster.exp);

      // レベルアップチェック
      if (this.player.level > prevLevel) {
        this.renderer.addEffect('levelup', this.player.x, this.player.y, { duration: 800 });
        this.renderer.playSound('levelup');
        this.addMessage(`レベルアップ！ Lv.${this.player.level}になった！`);
      }

      // 爆発系
      if (monster.special?.startsWith('explode_')) {
        const explosionDamage = parseInt(monster.special.split('_')[1]);
        const dist = Math.abs(this.player.x - monster.x) + Math.abs(this.player.y - monster.y);
        if (dist <= 1) {
          this.player.takeDamage(explosionDamage);
          this.addMessage(`爆発で${explosionDamage}のダメージ！`);
          this.renderer.addEffect('damage', this.player.x, this.player.y, {
            text: `-${explosionDamage}`,
            color: '#f44',
            duration: 600
          });
          this.renderer.playSound('damage');
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

      // エフェクトと効果音
      this.renderer.addEffect('pickup', this.player.x, this.player.y, { duration: 400 });
      this.renderer.playSound('pickup');
    } else {
      this.addMessage('持ち物がいっぱいだ');
    }
  }

  /**
   * 階段を降りる
   */
  descendStairs() {
    // 効果音
    this.renderer.playSound('stairs');

    const prevFloor = this.floor;
    this.floor++;

    if (this.floor > this.maxFloor) {
      // クリア
      this.state = STATE.CLEAR;
      this.addMessage('幽世塔を踏破した！現世への道が開いた...');
      this.deleteSave(); // クリア時はセーブデータを削除
      this.showClearScreen();
      return;
    }

    // フェーズ変更チェック
    const newPhase = checkPhaseChange(prevFloor, this.floor);
    if (newPhase) {
      this.currentPhase = newPhase;
      this.renderer.setPhase(this.currentPhase);
      this.showPhaseTransition(newPhase);
    } else {
      this.addMessage(`B${this.floor}Fに降りた`);
    }

    this.generateFloor();

    // 自動セーブ
    this.saveGame();

    this.render();
    this.updateUI();
  }

  /**
   * フェーズ移行演出を表示
   */
  showPhaseTransition(phase) {
    this.inputEnabled = false;

    // フェーズ移行オーバーレイを表示
    const overlay = document.getElementById('phaseTransition');
    const phaseName = document.getElementById('phaseName');
    const phaseSubtitle = document.getElementById('phaseSubtitle');
    const phaseDesc = document.getElementById('phaseDesc');
    const phaseFloor = document.getElementById('phaseFloor');

    if (overlay && phaseName && phaseSubtitle && phaseDesc && phaseFloor) {
      phaseName.textContent = phase.name;
      phaseSubtitle.textContent = phase.subtitle;
      phaseDesc.textContent = phase.description;
      phaseFloor.textContent = `B${this.floor}F ～ B${phase.floors[1]}F`;

      overlay.classList.remove('hidden');
      overlay.style.background = phase.bgColor;

      // 3秒後に自動で閉じる
      setTimeout(() => {
        overlay.classList.add('hidden');
        this.inputEnabled = true;
        this.addMessage(`【${phase.name}】に足を踏み入れた...`);
        this.addMessage(phase.description);
      }, 2500);
    } else {
      // オーバーレイがない場合はメッセージのみ
      this.addMessage(`B${this.floor}Fに降りた`);
      this.addMessage(`【${phase.name}】に足を踏み入れた...`);
      this.addMessage(phase.description);
      this.inputEnabled = true;
    }
  }

  /**
   * クリア画面を表示
   */
  showClearScreen() {
    const overlay = document.getElementById('clearScreen');
    if (overlay) {
      document.getElementById('clearLevel').textContent = this.player.level;
      document.getElementById('clearTurns').textContent = this.turnCount;
      overlay.classList.remove('hidden');
    }
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
    // ボス専用処理
    if (monster.isBoss) {
      this.processBossAction(monster);
      return;
    }

    const action = monster.act(this.player, this.tiles, this.monsters, this);
    if (!action) return;

    switch (action.type) {
      case 'move':
        monster.x += action.dx;
        monster.y += action.dy;
        break;

      case 'attack': {
        // 攻撃アニメーション
        this.renderer.startAttackAnimation(monster.x, monster.y, this.player.x, this.player.y, false);
        const damage = this.calculateDamage(monster, this.player);
        this.player.takeDamage(damage);
        this.addMessage(`${monster.name}の攻撃！${damage}のダメージ`);

        // エフェクトと効果音
        this.renderer.addEffect('slash', this.player.x, this.player.y, { duration: 200 });
        this.renderer.addEffect('damage', this.player.x, this.player.y, {
          text: `-${damage}`,
          color: '#f44',
          duration: 600
        });
        this.renderer.playSound('damage');

        // 特殊能力
        this.processMonsterSpecial(monster, action.target);
        break;
      }

      case 'ranged_attack': {
        const rDamage = this.calculateDamage(monster, this.player);
        this.player.takeDamage(rDamage);
        this.addMessage(`${monster.name}の槍攻撃！${rDamage}のダメージ`);

        // エフェクトと効果音
        this.renderer.addEffect('slash', this.player.x, this.player.y, { duration: 200 });
        this.renderer.addEffect('damage', this.player.x, this.player.y, {
          text: `-${rDamage}`,
          color: '#f44',
          duration: 600
        });
        this.renderer.playSound('damage');
        break;
      }

      case 'fire_attack': {
        this.player.takeDamage(action.damage);
        this.addMessage(`${monster.name}の炎！${action.damage}のダメージ`);

        // エフェクトと効果音
        this.renderer.addEffect('use', this.player.x, this.player.y, {
          color: '#f80',
          duration: 400
        });
        this.renderer.addEffect('damage', this.player.x, this.player.y, {
          text: `-${action.damage}`,
          color: '#f80',
          duration: 600
        });
        this.renderer.playSound('damage');
        break;
      }

      case 'wait':
        break;
    }

    monster.endTurn();
  }

  /**
   * ボス専用行動処理
   */
  processBossAction(boss) {
    if (!boss.isAlive || !boss.canAct()) return;

    const dx = this.player.x - boss.x;
    const dy = this.player.y - boss.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    // フェーズ移行チェック（HPに応じて）
    const hpRatio = boss.hp / boss.maxHp;
    if (hpRatio <= 0.3 && boss.bossPhase < 3) {
      boss.bossPhase = 3;
      this.addMessage('【輪廻守】が最終形態へ変化した！', 'important');
      // フェーズ3: 攻撃力アップ
      boss.attack = Math.floor(boss.attack * 1.5);
    } else if (hpRatio <= 0.6 && boss.bossPhase < 2) {
      boss.bossPhase = 2;
      this.addMessage('【輪廻守】が形態を変化させた！', 'important');
    }

    // 隣接時は攻撃
    if (dist <= 2) {
      // 特殊攻撃選択
      const attackType = Math.random();

      if (attackType < 0.2) {
        // 範囲攻撃（8方向）
        const areaDamage = 20 + boss.bossPhase * 10;
        this.player.takeDamage(areaDamage);
        this.addMessage(`【輪廻守】の輪廻波動！${areaDamage}のダメージ！`, 'damage');
      } else if (attackType < 0.35 && boss.bossPhase >= 2) {
        // 状態異常攻撃
        if (Math.random() < 0.5) {
          this.player.statusEffects.confused = 5;
          this.addMessage('【輪廻守】の幻惑！混乱した！', 'damage');
        } else {
          this.player.statusEffects.slowed = 5;
          this.addMessage('【輪廻守】の呪縛！体が重い...', 'damage');
        }
      } else {
        // 通常攻撃
        const damage = this.calculateDamage(boss, this.player);
        this.player.takeDamage(damage);
        this.addMessage(`【輪廻守】の攻撃！${damage}のダメージ`, 'damage');
      }
    } else {
      // 遠距離時の行動
      if (boss.bossPhase >= 2 && Math.random() < 0.3) {
        // 遠距離攻撃（黄泉の炎）
        const fireDamage = 15 + boss.bossPhase * 5;
        this.player.takeDamage(fireDamage);
        this.addMessage(`【輪廻守】の黄泉火！${fireDamage}のダメージ！`, 'damage');
      } else {
        // 接近移動
        const moveX = dx > 0 ? 1 : (dx < 0 ? -1 : 0);
        const moveY = dy > 0 ? 1 : (dy < 0 ? -1 : 0);

        const nx = boss.x + moveX;
        const ny = boss.y + moveY;

        if (this.tiles[ny]?.[nx] !== 0) {
          boss.x = nx;
          boss.y = ny;
        }
      }
    }

    boss.endTurn();
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

    // 死亡時はセーブデータを削除
    this.deleteSave();

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

    // フェーズ初期化
    this.currentPhase = getPhaseForFloor(this.floor);
    this.renderer.setPhase(this.currentPhase);

    this.generateFloor();
    this.state = STATE.PLAYING;

    this.addMessage('幽世塔の探索を再開した...');
    this.addMessage(`【${this.currentPhase.name}】${this.currentPhase.description}`);
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
    // 使用エフェクトと効果音
    this.renderer.addEffect('use', this.player.x, this.player.y, {
      color: '#8f8',
      duration: 400
    });
    this.renderer.playSound('use');

    switch (item.effect) {
      case 'heal_30':
        this.player.heal(30);
        this.addMessage('HPが30回復した');
        this.renderer.addEffect('heal', this.player.x, this.player.y, {
          text: '+30',
          duration: 600
        });
        this.renderer.playSound('heal');
        break;
      case 'heal_100':
        this.player.heal(100);
        this.addMessage('HPが100回復した');
        this.renderer.addEffect('heal', this.player.x, this.player.y, {
          text: '+100',
          duration: 600
        });
        this.renderer.playSound('heal');
        break;
      case 'max_hp_up':
        this.player.maxHp += 5;
        this.player.hp += 5;
        this.addMessage('最大HPが5上がった！');
        this.renderer.addEffect('levelup', this.player.x, this.player.y, { duration: 600 });
        break;
      case 'strength_up':
        this.player.maxStrength++;
        this.player.strength++;
        this.addMessage('ちからが1上がった！');
        this.renderer.addEffect('levelup', this.player.x, this.player.y, { duration: 600 });
        break;
      case 'cure_poison':
        this.player.strength = this.player.maxStrength;
        this.addMessage('ちからが回復した');
        this.renderer.playSound('heal');
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
    // 使用エフェクトと効果音
    this.renderer.addEffect('use', this.player.x, this.player.y, {
      color: '#88f',
      duration: 400
    });
    this.renderer.playSound('use');

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
    // 使用エフェクトと効果音
    this.renderer.addEffect('use', this.player.x, this.player.y, {
      color: '#fa8',
      duration: 400
    });
    this.renderer.playSound('use');

    switch (item.effect) {
      case 'satiety_50':
        this.player.satiety = Math.min(this.player.maxSatiety, this.player.satiety + 50);
        this.addMessage('満腹度が回復した');
        this.renderer.playSound('heal');
        break;
      case 'satiety_100':
        this.player.satiety = Math.min(this.player.maxSatiety, this.player.satiety + 100);
        this.addMessage('満腹度が大きく回復した');
        this.renderer.playSound('heal');
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

    // ステータスパネルを更新
    document.getElementById('statusName').textContent = p.name;
    document.getElementById('statusLevel').textContent = p.level;
    document.getElementById('statusHp').textContent = `${p.hp}/${p.maxHp}`;
    document.getElementById('statusStrength').textContent = `${p.strength}/${p.maxStrength}`;
    document.getElementById('statusSatiety').textContent = `${Math.floor(p.satiety)}/${p.maxSatiety}`;
    document.getElementById('statusExp').textContent = `${p.exp}/${p.level * p.level * 10}`;
    document.getElementById('statusGold').textContent = `${p.gold}G`;

    // 装備
    const weaponName = p.equipment.weapon
      ? `${p.equipment.weapon.name}${p.equipment.weapon.enhancement > 0 ? `+${p.equipment.weapon.enhancement}` : ''}`
      : 'なし';
    const shieldName = p.equipment.shield
      ? `${p.equipment.shield.name}${p.equipment.shield.enhancement > 0 ? `+${p.equipment.shield.enhancement}` : ''}`
      : 'なし';
    const ringName = p.equipment.ring?.name ?? 'なし';

    document.getElementById('statusWeapon').textContent = weaponName;
    document.getElementById('statusShield').textContent = shieldName;
    document.getElementById('statusRing').textContent = ringName;

    // 状態異常
    const effects = [];
    if (p.statusEffects.confused > 0) effects.push('混乱');
    if (p.statusEffects.sleeping > 0) effects.push('睡眠');
    if (p.statusEffects.paralyzed > 0) effects.push('金縛り');
    if (p.statusEffects.slowed > 0) effects.push('鈍足');
    if (p.statusEffects.blind > 0) effects.push('目潰し');
    if (p.statusEffects.sealed) effects.push('封印');

    const effectsSection = document.getElementById('statusEffectsSection');
    const effectsDiv = document.getElementById('statusEffects');

    if (effects.length > 0) {
      effectsSection.style.display = 'block';
      effectsDiv.innerHTML = effects.map(e =>
        `<span class="status-effect-badge">${e}</span>`
      ).join('');
    } else {
      effectsSection.style.display = 'none';
    }

    this.showOverlay('statusPanel');
  }

  /**
   * ステータスパネルを閉じる
   */
  closeStatus() {
    this.hideOverlay('statusPanel');
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

    // フェーズ名を更新
    const phaseDisplay = document.getElementById('phaseDisplay');
    if (phaseDisplay && this.currentPhase) {
      phaseDisplay.textContent = this.currentPhase.name;
    }
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
