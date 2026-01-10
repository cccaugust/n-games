/**
 * カマサーフ - 爽快イルカアクション
 * Phaser 3 で実装
 */
import Phaser from 'phaser';

// ゲーム設定
const CONFIG = {
    WIDTH: 960,
    HEIGHT: 540,
    DOLPHIN: {
        START_X: 150,
        START_Y: 300,
        SPEED: 350,
        DASH_SPEED: 900,
        DASH_DURATION: 250,
        DASH_COOLDOWN: 400,
    },
    PHYSICS: {
        WATER_LINE: 340,
    },
    SPAWN: {
        ENEMY_INTERVAL: 1200,
        ITEM_INTERVAL: 1800,
        OBSTACLE_INTERVAL: 2500,
    },
    DIFFICULTY: {
        SPEED_INCREASE: 0.8,
        MAX_SPEED_MULTIPLIER: 3.5,
    }
};

// 効果音生成クラス
class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.log('Web Audio API not supported');
            this.enabled = false;
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    play(type) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        switch(type) {
            case 'jump':
                this.playTone(400, 0.1, 'sine', 0.3, 700);
                break;
            case 'dash':
                this.playNoise(0.12, 0.4);
                this.playTone(250, 0.08, 'sawtooth', 0.25, 500);
                break;
            case 'hit':
                this.playTone(800, 0.04, 'square', 0.4);
                this.playTone(600, 0.04, 'square', 0.3, 0, 0.04);
                this.playTone(400, 0.08, 'square', 0.2, 0, 0.08);
                break;
            case 'coin':
                this.playTone(880, 0.08, 'sine', 0.3);
                this.playTone(1320, 0.12, 'sine', 0.3, 0, 0.06);
                break;
            case 'star':
                this.playTone(523, 0.08, 'sine', 0.4);
                this.playTone(659, 0.08, 'sine', 0.4, 0, 0.08);
                this.playTone(784, 0.12, 'sine', 0.4, 0, 0.16);
                break;
            case 'powerup':
                for (let i = 0; i < 5; i++) {
                    this.playTone(400 + i * 120, 0.06, 'sine', 0.3, 0, i * 0.05);
                }
                break;
            case 'damage':
                this.playTone(150, 0.15, 'sawtooth', 0.5, 80);
                this.playNoise(0.15, 0.25);
                break;
            case 'combo':
                this.playTone(523, 0.04, 'sine', 0.35);
                this.playTone(659, 0.04, 'sine', 0.35, 0, 0.04);
                this.playTone(784, 0.04, 'sine', 0.35, 0, 0.08);
                this.playTone(1047, 0.1, 'sine', 0.45, 0, 0.12);
                break;
            case 'splash':
                this.playNoise(0.1, 0.15);
                this.playTone(120, 0.08, 'sine', 0.15, 60);
                break;
            case 'gameover':
                this.playTone(400, 0.25, 'sawtooth', 0.35, 200);
                this.playTone(300, 0.25, 'sawtooth', 0.28, 150, 0.25);
                this.playTone(200, 0.4, 'sawtooth', 0.25, 100, 0.5);
                break;
            case 'start':
                this.playTone(262, 0.08, 'sine', 0.3);
                this.playTone(330, 0.08, 'sine', 0.3, 0, 0.08);
                this.playTone(392, 0.08, 'sine', 0.3, 0, 0.16);
                this.playTone(523, 0.15, 'sine', 0.4, 0, 0.24);
                break;
        }
    }

    playTone(freq, duration, type = 'sine', volume = 0.3, freqEnd = 0, delay = 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
        if (freqEnd) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, this.ctx.currentTime + delay + duration);
        }

        gain.gain.setValueAtTime(volume, this.ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + delay + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + delay);
        osc.stop(this.ctx.currentTime + delay + duration);
    }

    playNoise(duration, volume = 0.3) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const noise = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();

        noise.buffer = buffer;
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);

        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }
}

const soundManager = new SoundManager();

// メインシーン
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.createTextures();
    }

    createTextures() {
        this.createDolphinTexture();
        this.createSharkTexture();
        this.createSeagullTexture();
        this.createJellyfishTexture();
        this.createPufferfishTexture();
        this.createStarTexture();
        this.createFishTexture();
        this.createShieldTexture();
        this.createCrystalTexture();
        this.createHeartTexture();
        this.createCoinTexture();
        this.createRockTexture();
        this.createParticleTexture();
        this.createSparkTexture();
        this.createBubbleTexture();
        this.createWaveTexture();
        this.createSpeedLineTexture();
    }

    createDolphinTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        // 体（メイン）
        g.fillStyle(0x4a90d9);
        g.beginPath();
        g.moveTo(75, 28);
        g.bezierCurveTo(75, 12, 55, 6, 35, 10);
        g.bezierCurveTo(15, 14, 5, 24, 8, 32);
        g.bezierCurveTo(5, 42, 18, 50, 35, 48);
        g.bezierCurveTo(55, 52, 75, 46, 75, 28);
        g.closePath();
        g.fillPath();

        // お腹
        g.fillStyle(0xa8d4f5);
        g.beginPath();
        g.moveTo(65, 32);
        g.bezierCurveTo(58, 42, 30, 46, 18, 38);
        g.bezierCurveTo(25, 34, 48, 32, 65, 32);
        g.closePath();
        g.fillPath();

        // くちばし
        g.fillStyle(0x4a90d9);
        g.beginPath();
        g.moveTo(75, 25);
        g.lineTo(90, 28);
        g.lineTo(75, 31);
        g.closePath();
        g.fillPath();

        // 背びれ
        g.fillStyle(0x3a7bc8);
        g.beginPath();
        g.moveTo(40, 10);
        g.lineTo(48, -8);
        g.lineTo(55, 12);
        g.closePath();
        g.fillPath();

        // 尾びれ
        g.fillStyle(0x3a7bc8);
        g.beginPath();
        g.moveTo(8, 28);
        g.lineTo(-12, 12);
        g.lineTo(-2, 28);
        g.lineTo(-12, 44);
        g.lineTo(8, 34);
        g.closePath();
        g.fillPath();

        // 胸びれ
        g.fillStyle(0x3a7bc8);
        g.beginPath();
        g.moveTo(45, 38);
        g.lineTo(38, 55);
        g.lineTo(55, 42);
        g.closePath();
        g.fillPath();

        // 目
        g.fillStyle(0x1a1a2e);
        g.fillCircle(62, 22, 5);
        g.fillStyle(0xffffff);
        g.fillCircle(64, 20, 2.5);

        // 口（笑顔）
        g.lineStyle(2, 0x2a5a8a);
        g.beginPath();
        g.arc(70, 30, 6, 0.3, 1.3);
        g.strokePath();

        g.generateTexture('dolphin', 100, 65);
        g.destroy();
    }

    createSharkTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0x5a6275);
        g.beginPath();
        g.moveTo(85, 32);
        g.bezierCurveTo(82, 15, 55, 8, 28, 14);
        g.bezierCurveTo(8, 20, 0, 32, 2, 40);
        g.bezierCurveTo(5, 52, 28, 58, 55, 52);
        g.bezierCurveTo(78, 48, 88, 42, 85, 32);
        g.closePath();
        g.fillPath();

        g.fillStyle(0xbdc3c7);
        g.beginPath();
        g.moveTo(75, 40);
        g.bezierCurveTo(55, 52, 22, 52, 12, 44);
        g.bezierCurveTo(28, 44, 60, 44, 75, 40);
        g.closePath();
        g.fillPath();

        g.fillStyle(0x485063);
        g.beginPath();
        g.moveTo(45, 10);
        g.lineTo(38, -12);
        g.lineTo(58, 14);
        g.closePath();
        g.fillPath();

        g.fillStyle(0x485063);
        g.beginPath();
        g.moveTo(2, 35);
        g.lineTo(-18, 18);
        g.lineTo(-5, 35);
        g.lineTo(-18, 52);
        g.lineTo(6, 42);
        g.closePath();
        g.fillPath();

        g.fillStyle(0x1a1a1a);
        g.fillCircle(70, 28, 6);
        g.fillStyle(0xe74c3c);
        g.fillCircle(72, 26, 3);

        g.fillStyle(0xffffff);
        for (let i = 0; i < 5; i++) {
            g.fillTriangle(76 + i * 5, 38, 78 + i * 5, 46, 81 + i * 5, 38);
        }

        g.generateTexture('shark', 110, 70);
        g.destroy();
    }

    createSeagullTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0xffffff);
        g.fillEllipse(32, 28, 38, 22);
        g.fillCircle(55, 22, 14);

        g.fillStyle(0xecf0f1);
        g.beginPath();
        g.moveTo(28, 22);
        g.lineTo(8, 0);
        g.lineTo(42, 18);
        g.closePath();
        g.fillPath();

        g.beginPath();
        g.moveTo(28, 34);
        g.lineTo(8, 56);
        g.lineTo(42, 36);
        g.closePath();
        g.fillPath();

        g.fillStyle(0xf39c12);
        g.beginPath();
        g.moveTo(62, 20);
        g.lineTo(80, 24);
        g.lineTo(62, 28);
        g.closePath();
        g.fillPath();

        g.fillStyle(0x1a1a1a);
        g.fillCircle(58, 18, 4);

        g.generateTexture('seagull', 85, 60);
        g.destroy();
    }

    createJellyfishTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0xe056fd);
        g.fillEllipse(35, 22, 48, 30);

        g.fillStyle(0xbe2edd);
        g.fillCircle(22, 20, 6);
        g.fillCircle(40, 16, 5);
        g.fillCircle(48, 24, 4);

        g.lineStyle(4, 0xe056fd, 0.75);
        for (let i = 0; i < 6; i++) {
            const x = 15 + i * 9;
            g.beginPath();
            g.moveTo(x, 35);
            g.bezierCurveTo(x - 6, 52, x + 6, 65, x - 2, 80);
            g.strokePath();
        }

        g.fillStyle(0xffffff);
        g.setAlpha(0.6);
        g.fillEllipse(28, 16, 14, 8);

        g.generateTexture('jellyfish', 70, 85);
        g.destroy();
    }

    createPufferfishTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0xfdcb6e);
        g.fillCircle(40, 40, 35);

        g.fillStyle(0xe17055);
        const spikes = 14;
        for (let i = 0; i < spikes; i++) {
            const angle = (i / spikes) * Math.PI * 2;
            const x = 40 + Math.cos(angle) * 32;
            const y = 40 + Math.sin(angle) * 32;
            const tx = 40 + Math.cos(angle) * 50;
            const ty = 40 + Math.sin(angle) * 50;
            const perpX = Math.cos(angle + Math.PI/2) * 4;
            const perpY = Math.sin(angle + Math.PI/2) * 4;
            g.fillTriangle(x - perpX, y - perpY, tx, ty, x + perpX, y + perpY);
        }

        g.fillStyle(0xe17055);
        g.fillCircle(28, 32, 6);
        g.fillCircle(48, 28, 5);
        g.fillCircle(35, 52, 5);

        g.fillStyle(0xffffff);
        g.fillCircle(52, 34, 10);
        g.fillStyle(0x1a1a1a);
        g.fillCircle(55, 34, 5);

        g.fillStyle(0x1a1a1a);
        g.fillEllipse(62, 48, 8, 6);

        g.generateTexture('pufferfish', 95, 95);
        g.destroy();
    }

    createStarTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0xf1c40f);
        const points = [];
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? 22 : 10;
            const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
            points.push(28 + Math.cos(angle) * radius);
            points.push(28 + Math.sin(angle) * radius);
        }
        g.fillPoints(points, true);

        g.fillStyle(0xf9e79f);
        g.fillCircle(24, 22, 6);

        g.generateTexture('star', 56, 56);
        g.destroy();
    }

    createFishTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0xff6b6b);
        g.fillEllipse(28, 22, 36, 22);

        g.fillStyle(0xff6b6b);
        g.fillTriangle(5, 22, -8, 10, -8, 34);

        g.fillStyle(0xee5a5a);
        g.fillTriangle(28, 8, 22, -2, 34, 6);

        g.fillStyle(0xffffff);
        g.fillCircle(40, 20, 6);
        g.fillStyle(0x1a1a1a);
        g.fillCircle(42, 20, 3);

        g.generateTexture('fish', 52, 45);
        g.destroy();
    }

    createShieldTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0x3498db);
        g.beginPath();
        g.moveTo(28, 5);
        g.lineTo(52, 14);
        g.lineTo(52, 35);
        g.lineTo(28, 52);
        g.lineTo(4, 35);
        g.lineTo(4, 14);
        g.closePath();
        g.fillPath();

        g.fillStyle(0x5dade2);
        g.beginPath();
        g.moveTo(28, 12);
        g.lineTo(44, 18);
        g.lineTo(44, 32);
        g.lineTo(28, 44);
        g.lineTo(12, 32);
        g.lineTo(12, 18);
        g.closePath();
        g.fillPath();

        g.fillStyle(0xffffff);
        const starPts = [];
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? 8 : 4;
            const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
            starPts.push(28 + Math.cos(angle) * radius);
            starPts.push(28 + Math.sin(angle) * radius);
        }
        g.fillPoints(starPts, true);

        g.generateTexture('shield', 56, 58);
        g.destroy();
    }

    createCrystalTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0x9b59b6);
        g.fillTriangle(28, 0, 48, 30, 28, 60);
        g.fillTriangle(28, 0, 8, 30, 28, 60);

        g.fillStyle(0xd2b4de);
        g.fillTriangle(28, 6, 42, 30, 28, 54);

        g.fillStyle(0xffffff);
        g.setAlpha(0.8);
        g.fillTriangle(20, 12, 28, 8, 24, 24);

        g.generateTexture('crystal', 56, 65);
        g.destroy();
    }

    createHeartTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0xe74c3c);
        g.beginPath();
        g.moveTo(28, 50);
        g.bezierCurveTo(5, 32, 5, 10, 28, 18);
        g.bezierCurveTo(51, 10, 51, 32, 28, 50);
        g.closePath();
        g.fillPath();

        g.fillStyle(0xffffff);
        g.setAlpha(0.7);
        g.fillCircle(18, 20, 6);

        g.generateTexture('heart', 56, 56);
        g.destroy();
    }

    createCoinTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0xf39c12);
        g.fillCircle(22, 22, 20);

        g.fillStyle(0xf1c40f);
        g.fillCircle(22, 22, 16);

        g.fillStyle(0xf39c12);
        g.fillRect(20, 12, 4, 20);
        g.fillRect(14, 15, 16, 4);
        g.fillRect(14, 25, 16, 4);

        g.generateTexture('coin', 44, 44);
        g.destroy();
    }

    createRockTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0x7f8c8d);
        g.beginPath();
        g.moveTo(35, 5);
        g.lineTo(62, 18);
        g.lineTo(68, 48);
        g.lineTo(52, 65);
        g.lineTo(18, 65);
        g.lineTo(2, 48);
        g.lineTo(8, 18);
        g.closePath();
        g.fillPath();

        g.fillStyle(0x636e72);
        g.beginPath();
        g.moveTo(35, 25);
        g.lineTo(58, 38);
        g.lineTo(50, 60);
        g.lineTo(22, 60);
        g.lineTo(15, 42);
        g.closePath();
        g.fillPath();

        g.generateTexture('rock', 75, 70);
        g.destroy();
    }

    createParticleTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff);
        g.fillCircle(10, 10, 10);
        g.generateTexture('particle', 20, 20);
        g.destroy();
    }

    createSparkTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffff00);
        const points = [];
        for (let i = 0; i < 8; i++) {
            const radius = i % 2 === 0 ? 12 : 5;
            const angle = (i / 8) * Math.PI * 2;
            points.push(12 + Math.cos(angle) * radius);
            points.push(12 + Math.sin(angle) * radius);
        }
        g.fillPoints(points, true);
        g.generateTexture('spark', 24, 24);
        g.destroy();
    }

    createBubbleTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.lineStyle(2, 0xffffff, 0.6);
        g.strokeCircle(12, 12, 10);
        g.fillStyle(0xffffff);
        g.setAlpha(0.8);
        g.fillCircle(8, 8, 3);
        g.generateTexture('bubble', 24, 24);
        g.destroy();
    }

    createWaveTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const w = 240, h = 120;

        g.fillStyle(0x0984e3);
        g.fillRect(0, 50, w, 70);

        g.fillStyle(0x74b9ff);
        g.beginPath();
        g.moveTo(0, 55);
        for (let x = 0; x <= w; x += 8) {
            const y = 55 + Math.sin(x * 0.04) * 18;
            g.lineTo(x, y);
        }
        g.lineTo(w, 120);
        g.lineTo(0, 120);
        g.closePath();
        g.fillPath();

        g.fillStyle(0xffffff);
        g.setAlpha(0.3);
        g.beginPath();
        g.moveTo(0, 58);
        for (let x = 0; x <= w; x += 8) {
            const y = 58 + Math.sin(x * 0.04) * 18;
            g.lineTo(x, y);
        }
        g.lineTo(w, 65);
        g.lineTo(0, 65);
        g.closePath();
        g.fillPath();

        g.generateTexture('wave', w, h);
        g.destroy();
    }

    createSpeedLineTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff);
        g.fillRect(0, 0, 60, 3);
        g.generateTexture('speedline', 60, 3);
        g.destroy();
    }

    create() {
        soundManager.init();

        this.gameState = 'TITLE';
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('kamaSurfHighScore') || '0');
        this.combo = 0;
        this.maxCombo = 0;
        this.hp = 3;
        this.maxHp = 3;
        this.speedMultiplier = 1;
        this.playTime = 0;
        this.isInvincible = false;
        this.hasShield = false;

        this.createBackground();

        this.enemies = this.physics.add.group();
        this.items = this.physics.add.group();
        this.obstacles = this.physics.add.group();

        this.createPlayer();
        this.createParticleSystems();
        this.createUI();
        this.setupInput();
        this.setupCollisions();

        this.spawnTimers = [];
        this.speedLines = [];
    }

    createBackground() {
        const { WIDTH, HEIGHT } = CONFIG;

        const skyGradient = this.add.graphics();
        skyGradient.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x5dade2, 0x5dade2, 1);
        skyGradient.fillRect(0, 0, WIDTH, HEIGHT);

        this.clouds = [];
        for (let i = 0; i < 10; i++) {
            const cloud = this.add.ellipse(
                Math.random() * WIDTH,
                40 + Math.random() * 120,
                70 + Math.random() * 100,
                35 + Math.random() * 25,
                0xffffff,
                0.85
            );
            cloud.speed = 0.4 + Math.random() * 0.6;
            this.clouds.push(cloud);
        }

        this.sea = this.add.tileSprite(
            WIDTH / 2,
            CONFIG.PHYSICS.WATER_LINE + 100,
            WIDTH,
            200,
            'wave'
        );
        this.sea.setDepth(5);

        this.bubbleEmitter = this.add.particles(0, 0, 'bubble', {
            x: { min: 0, max: WIDTH },
            y: CONFIG.PHYSICS.WATER_LINE + 20,
            lifespan: 2500,
            speedY: { min: -40, max: -80 },
            speedX: { min: -25, max: 25 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.5, end: 0 },
            frequency: 150,
            emitting: false
        });
        this.bubbleEmitter.setDepth(6);
    }

    createPlayer() {
        const { START_X, START_Y } = CONFIG.DOLPHIN;

        this.player = this.physics.add.sprite(START_X, START_Y, 'dolphin');
        this.player.setScale(1.1);
        this.player.setDepth(10);
        this.player.body.setSize(65, 40);
        this.player.body.setOffset(15, 12);

        this.player.isDashing = false;
        this.player.canDash = true;
        this.player.verticalInput = 0;
    }

    createParticleSystems() {
        this.splashEmitter = this.add.particles(0, 0, 'particle', {
            speed: { min: 120, max: 350 },
            angle: { min: 225, max: 315 },
            scale: { start: 0.9, end: 0 },
            lifespan: 450,
            tint: 0x74b9ff,
            emitting: false
        });
        this.splashEmitter.setDepth(15);

        this.hitEmitter = this.add.particles(0, 0, 'spark', {
            speed: { min: 180, max: 450 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 },
            lifespan: 350,
            tint: [0xff6b6b, 0xfeca57, 0xff9ff3, 0xffffff],
            emitting: false
        });
        this.hitEmitter.setDepth(20);

        this.collectEmitter = this.add.particles(0, 0, 'spark', {
            speed: { min: 60, max: 180 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.9, end: 0 },
            lifespan: 280,
            tint: 0xf1c40f,
            emitting: false
        });
        this.collectEmitter.setDepth(20);

        this.trailEmitter = this.add.particles(0, 0, 'particle', {
            speed: { min: 15, max: 60 },
            angle: { min: 165, max: 195 },
            scale: { start: 0.7, end: 0 },
            lifespan: 180,
            tint: 0x74b9ff,
            alpha: { start: 0.85, end: 0 },
            emitting: false
        });
        this.trailEmitter.setDepth(9);
    }

    createUI() {
        const { WIDTH } = CONFIG;

        this.scoreText = this.add.text(WIDTH - 25, 22, 'SCORE: 0', {
            fontSize: '30px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 5
        }).setOrigin(1, 0).setDepth(100);

        this.highScoreText = this.add.text(WIDTH - 25, 58, `HI: ${this.highScore}`, {
            fontSize: '20px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: '#ffd700',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(1, 0).setDepth(100);

        this.comboText = this.add.text(WIDTH / 2, 85, '', {
            fontSize: '40px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: '#ff6b6b',
            stroke: '#000',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(100).setAlpha(0);

        this.hpContainer = this.add.container(25, 25).setDepth(100);
        this.updateHPDisplay();

        this.createTitleScreen();
        this.createGameOverScreen();
    }

    updateHPDisplay() {
        this.hpContainer.removeAll(true);

        for (let i = 0; i < this.maxHp; i++) {
            const heart = this.add.image(i * 45, 0, 'heart');
            heart.setScale(0.65);
            heart.setAlpha(i < this.hp ? 1 : 0.25);
            this.hpContainer.add(heart);
        }
    }

    createTitleScreen() {
        this.titleContainer = this.add.container(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2).setDepth(200);

        const bg = this.add.rectangle(0, 0, 520, 380, 0x000000, 0.75);
        bg.setStrokeStyle(5, 0x74b9ff);
        this.titleContainer.add(bg);

        const title = this.add.text(0, -110, '🐬 カマサーフ', {
            fontSize: '52px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: '#74b9ff'
        }).setOrigin(0.5);
        this.titleContainer.add(title);

        const subtitle = this.add.text(0, -45, '爽快イルカアクション！', {
            fontSize: '26px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: '#fff'
        }).setOrigin(0.5);
        this.titleContainer.add(subtitle);

        const controls = this.add.text(0, 35, '【操作方法】\n↑↓ / W S : 上下移動\nスペース / タップ : ダッシュ攻撃', {
            fontSize: '19px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: '#bdc3c7',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5);
        this.titleContainer.add(controls);

        const startBtn = this.add.text(0, 135, '▶ タップでスタート', {
            fontSize: '30px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: '#2ecc71'
        }).setOrigin(0.5);
        this.titleContainer.add(startBtn);

        this.tweens.add({
            targets: startBtn,
            alpha: 0.4,
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    createGameOverScreen() {
        this.gameOverContainer = this.add.container(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2).setDepth(200);
        this.gameOverContainer.setVisible(false);

        const bg = this.add.rectangle(0, 0, 480, 380, 0x000000, 0.85);
        bg.setStrokeStyle(5, 0xe74c3c);
        this.gameOverContainer.add(bg);

        this.gameOverTitle = this.add.text(0, -110, 'GAME OVER', {
            fontSize: '52px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: '#e74c3c'
        }).setOrigin(0.5);
        this.gameOverContainer.add(this.gameOverTitle);

        this.finalScoreText = this.add.text(0, -35, 'SCORE: 0', {
            fontSize: '36px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: '#fff'
        }).setOrigin(0.5);
        this.gameOverContainer.add(this.finalScoreText);

        this.maxComboText = this.add.text(0, 20, 'MAX COMBO: 0', {
            fontSize: '26px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: '#f39c12'
        }).setOrigin(0.5);
        this.gameOverContainer.add(this.maxComboText);

        this.newRecordText = this.add.text(0, 65, '🎉 NEW RECORD!', {
            fontSize: '30px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: '#f1c40f'
        }).setOrigin(0.5).setVisible(false);
        this.gameOverContainer.add(this.newRecordText);

        const retryText = this.add.text(0, 130, 'タップでリトライ', {
            fontSize: '26px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: '#2ecc71'
        }).setOrigin(0.5);
        this.gameOverContainer.add(retryText);

        this.tweens.add({
            targets: retryText,
            alpha: 0.4,
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S
        });

        this.input.on('pointerdown', (pointer) => {
            soundManager.init();
            soundManager.resume();

            if (this.gameState === 'TITLE') {
                this.startGame();
            } else if (this.gameState === 'GAMEOVER') {
                this.restartGame();
            } else if (this.gameState === 'PLAYING') {
                this.dash();
            }
        });

        this.input.keyboard.on('keydown-SPACE', () => {
            soundManager.init();
            soundManager.resume();

            if (this.gameState === 'TITLE') {
                this.startGame();
            } else if (this.gameState === 'GAMEOVER') {
                this.restartGame();
            } else if (this.gameState === 'PLAYING') {
                this.dash();
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (this.gameState === 'PLAYING' && pointer.isDown) {
                const diff = pointer.y - this.player.y;
                if (Math.abs(diff) > 25) {
                    this.player.verticalInput = diff > 0 ? 1 : -1;
                }
            }
        });
    }

    setupCollisions() {
        this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.items, this.collectItem, null, this);
        this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
    }

    startGame() {
        this.gameState = 'PLAYING';
        this.titleContainer.setVisible(false);
        this.gameOverContainer.setVisible(false);

        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.hp = 3;
        this.speedMultiplier = 1;
        this.playTime = 0;
        this.isInvincible = false;
        this.hasShield = false;

        this.updateHPDisplay();
        this.bubbleEmitter.start();

        this.startSpawning();

        soundManager.play('start');
    }

    restartGame() {
        this.enemies.clear(true, true);
        this.items.clear(true, true);
        this.obstacles.clear(true, true);

        this.spawnTimers.forEach(timer => timer.destroy());
        this.spawnTimers = [];

        this.player.setPosition(CONFIG.DOLPHIN.START_X, CONFIG.DOLPHIN.START_Y);
        this.player.setAlpha(1);
        this.player.clearTint();
        this.player.isDashing = false;
        this.player.canDash = true;
        this.player.angle = 0;

        this.startGame();
    }

    startSpawning() {
        const enemyTimer = this.time.addEvent({
            delay: CONFIG.SPAWN.ENEMY_INTERVAL,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });
        this.spawnTimers.push(enemyTimer);

        const itemTimer = this.time.addEvent({
            delay: CONFIG.SPAWN.ITEM_INTERVAL,
            callback: this.spawnItem,
            callbackScope: this,
            loop: true
        });
        this.spawnTimers.push(itemTimer);

        const obstacleTimer = this.time.addEvent({
            delay: CONFIG.SPAWN.OBSTACLE_INTERVAL,
            callback: this.spawnObstacle,
            callbackScope: this,
            loop: true
        });
        this.spawnTimers.push(obstacleTimer);
    }

    spawnEnemy() {
        if (this.gameState !== 'PLAYING') return;

        const types = ['shark', 'seagull', 'jellyfish', 'pufferfish'];
        const weights = [38, 28, 24, 10];
        const type = this.weightedRandom(types, weights);

        let y;
        let speed = 220 + this.speedMultiplier * 55;

        switch (type) {
            case 'shark':
                y = CONFIG.PHYSICS.WATER_LINE + 55 + Math.random() * 110;
                speed *= 1.25;
                break;
            case 'seagull':
                y = 70 + Math.random() * 160;
                speed *= 0.95;
                break;
            case 'jellyfish':
                y = CONFIG.PHYSICS.WATER_LINE - 40 + Math.random() * 90;
                speed *= 0.55;
                break;
            case 'pufferfish':
                y = CONFIG.PHYSICS.WATER_LINE + Math.random() * 70;
                speed *= 0.75;
                break;
        }

        const enemy = this.enemies.create(CONFIG.WIDTH + 60, y, type);
        enemy.setVelocityX(-speed);
        enemy.enemyType = type;
        enemy.setDepth(8);
        enemy.body.setSize(enemy.width * 0.75, enemy.height * 0.75);

        if (type === 'jellyfish') {
            this.tweens.add({
                targets: enemy,
                y: enemy.y + 45,
                duration: 1100,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        if (type === 'pufferfish') {
            this.tweens.add({
                targets: enemy,
                angle: 360,
                duration: 1800,
                repeat: -1
            });
        }

        if (type === 'seagull') {
            this.tweens.add({
                targets: enemy,
                y: enemy.y + 25,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    spawnItem() {
        if (this.gameState !== 'PLAYING') return;

        const types = ['coin', 'star', 'fish', 'heart', 'shield', 'crystal'];
        const weights = [42, 28, 14, 8, 4, 4];
        const type = this.weightedRandom(types, weights);

        const y = 90 + Math.random() * (CONFIG.PHYSICS.WATER_LINE + 60);
        const item = this.items.create(CONFIG.WIDTH + 35, y, type);
        item.setVelocityX(-160 - this.speedMultiplier * 35);
        item.itemType = type;
        item.setDepth(7);

        this.tweens.add({
            targets: item,
            angle: 360,
            duration: 1800,
            repeat: -1
        });

        this.tweens.add({
            targets: item,
            y: item.y - 18,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    spawnObstacle() {
        if (this.gameState !== 'PLAYING') return;

        const y = CONFIG.PHYSICS.WATER_LINE + 35 + Math.random() * 90;
        const rock = this.obstacles.create(CONFIG.WIDTH + 45, y, 'rock');
        rock.setVelocityX(-110 - this.speedMultiplier * 45);
        rock.body.setSize(rock.width * 0.65, rock.height * 0.65);
        rock.setDepth(7);
    }

    weightedRandom(items, weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * total;

        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) return items[i];
        }
        return items[0];
    }

    dash() {
        if (!this.player.canDash || this.player.isDashing) return;

        this.player.isDashing = true;
        this.player.canDash = false;

        soundManager.play('dash');

        this.trailEmitter.setPosition(this.player.x - 35, this.player.y);
        this.trailEmitter.explode(25);

        this.player.setVelocityX(CONFIG.DOLPHIN.DASH_SPEED);

        this.tweens.add({
            targets: this.player,
            scaleX: 1.6,
            scaleY: 0.9,
            duration: 80,
            yoyo: true
        });

        this.addSpeedLines();

        this.time.delayedCall(CONFIG.DOLPHIN.DASH_DURATION, () => {
            this.player.isDashing = false;
            this.player.setVelocityX(0);
        });

        this.time.delayedCall(CONFIG.DOLPHIN.DASH_COOLDOWN, () => {
            this.player.canDash = true;
        });
    }

    addSpeedLines() {
        for (let i = 0; i < 8; i++) {
            const line = this.add.image(
                this.player.x - 40 - Math.random() * 30,
                this.player.y - 30 + Math.random() * 60,
                'speedline'
            );
            line.setAlpha(0.7);
            line.setDepth(9);

            this.tweens.add({
                targets: line,
                x: line.x - 150,
                alpha: 0,
                duration: 200,
                onComplete: () => line.destroy()
            });
        }
    }

    hitEnemy(player, enemy) {
        if (player.isDashing) {
            this.defeatEnemy(enemy);
        } else if (!this.isInvincible) {
            this.takeDamage();
        }
    }

    defeatEnemy(enemy) {
        this.hitEmitter.setPosition(enemy.x, enemy.y);
        this.hitEmitter.explode(18);

        this.cameras.main.shake(80, 0.012);

        this.combo++;
        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }

        const baseScore = { shark: 120, seagull: 90, jellyfish: 70, pufferfish: 180 };
        const score = (baseScore[enemy.enemyType] || 60) * (1 + this.combo * 0.15);
        this.addScore(Math.floor(score));

        this.showCombo();

        if (this.combo >= 5) {
            soundManager.play('combo');
        } else {
            soundManager.play('hit');
        }

        enemy.destroy();

        if (this.comboTimer) {
            this.comboTimer.destroy();
        }
        this.comboTimer = this.time.delayedCall(1800, () => {
            this.combo = 0;
            this.tweens.add({
                targets: this.comboText,
                alpha: 0,
                duration: 200
            });
        });
    }

    showCombo() {
        if (this.combo < 2) return;

        this.comboText.setText(`${this.combo} COMBO!`);
        this.comboText.setAlpha(1);
        this.comboText.setScale(1.6);

        const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'];
        this.comboText.setFill(colors[Math.min(this.combo - 2, colors.length - 1)]);

        this.tweens.add({
            targets: this.comboText,
            scale: 1,
            duration: 180,
            ease: 'Back.easeOut'
        });
    }

    takeDamage() {
        if (this.hasShield) {
            this.hasShield = false;
            this.player.clearTint();
            soundManager.play('hit');
            this.showFloatingText(this.player.x, this.player.y - 40, 'シールド消滅！', '#3498db');
            return;
        }

        this.hp--;
        this.updateHPDisplay();
        this.combo = 0;

        soundManager.play('damage');
        this.cameras.main.shake(180, 0.025);
        this.cameras.main.flash(150, 255, 100, 100);

        this.isInvincible = true;
        this.tweens.add({
            targets: this.player,
            alpha: 0.25,
            duration: 80,
            yoyo: true,
            repeat: 12,
            onComplete: () => {
                this.isInvincible = false;
                this.player.setAlpha(1);
            }
        });

        if (this.hp <= 0) {
            this.gameOver();
        }
    }

    hitObstacle(player, obstacle) {
        if (player.isDashing) {
            this.hitEmitter.setPosition(obstacle.x, obstacle.y);
            this.hitEmitter.explode(12);
            obstacle.destroy();
            this.addScore(40);
            soundManager.play('hit');
        } else if (!this.isInvincible) {
            this.takeDamage();
        }
    }

    collectItem(player, item) {
        const type = item.itemType;

        this.collectEmitter.setPosition(item.x, item.y);
        this.collectEmitter.explode(12);

        switch (type) {
            case 'coin':
                this.addScore(15);
                soundManager.play('coin');
                break;
            case 'star':
                this.addScore(60);
                soundManager.play('star');
                break;
            case 'fish':
                this.speedMultiplier = Math.min(this.speedMultiplier + 0.25, CONFIG.DIFFICULTY.MAX_SPEED_MULTIPLIER);
                this.addScore(25);
                soundManager.play('powerup');
                this.showFloatingText(item.x, item.y, 'SPEED UP!', '#ff6b6b');
                break;
            case 'heart':
                if (this.hp < this.maxHp) {
                    this.hp++;
                    this.updateHPDisplay();
                    this.showFloatingText(item.x, item.y, '+1 HP!', '#e74c3c');
                } else {
                    this.addScore(100);
                    this.showFloatingText(item.x, item.y, '+100!', '#e74c3c');
                }
                soundManager.play('powerup');
                break;
            case 'shield':
                this.hasShield = true;
                this.player.setTint(0x74b9ff);
                soundManager.play('powerup');
                this.showFloatingText(item.x, item.y, 'SHIELD!', '#3498db');
                break;
            case 'crystal':
                this.addScore(250);
                soundManager.play('star');
                this.cameras.main.flash(180, 180, 100, 255);
                this.showFloatingText(item.x, item.y, '+250!', '#9b59b6');
                break;
        }

        item.destroy();
    }

    showFloatingText(x, y, text, color) {
        const floatText = this.add.text(x, y, text, {
            fontSize: '26px',
            fontFamily: 'Zen Maru Gothic, sans-serif',
            fill: color,
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(50);

        this.tweens.add({
            targets: floatText,
            y: y - 60,
            alpha: 0,
            scale: 1.3,
            duration: 700,
            onComplete: () => floatText.destroy()
        });
    }

    addScore(points) {
        this.score += points;
        this.scoreText.setText(`SCORE: ${this.score}`);

        this.tweens.add({
            targets: this.scoreText,
            scale: 1.15,
            duration: 80,
            yoyo: true
        });
    }

    gameOver() {
        this.gameState = 'GAMEOVER';

        this.spawnTimers.forEach(timer => timer.destroy());
        this.spawnTimers = [];
        this.bubbleEmitter.stop();

        const isNewRecord = this.score > this.highScore;
        if (isNewRecord) {
            this.highScore = this.score;
            localStorage.setItem('kamaSurfHighScore', this.highScore.toString());
            this.highScoreText.setText(`HI: ${this.highScore}`);
        }

        this.finalScoreText.setText(`SCORE: ${this.score}`);
        this.maxComboText.setText(`MAX COMBO: ${this.maxCombo}`);
        this.newRecordText.setVisible(isNewRecord);
        this.gameOverContainer.setVisible(true);

        soundManager.play('gameover');
    }

    update(time, delta) {
        if (this.gameState !== 'PLAYING') return;

        const dt = delta / 1000;
        this.playTime += dt;

        this.speedMultiplier = Math.min(
            1 + this.playTime * CONFIG.DIFFICULTY.SPEED_INCREASE / 60,
            CONFIG.DIFFICULTY.MAX_SPEED_MULTIPLIER
        );

        this.updatePlayer();
        this.updateBackground();

        this.score += Math.floor(dt * 12 * this.speedMultiplier);
        this.scoreText.setText(`SCORE: ${this.score}`);

        this.cleanupOffscreen();
    }

    updatePlayer() {
        const { SPEED } = CONFIG.DOLPHIN;
        let vy = 0;

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            vy = -SPEED;
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            vy = SPEED;
        }

        if (this.player.verticalInput !== 0) {
            vy = this.player.verticalInput * SPEED;
            this.player.verticalInput = 0;
        }

        this.player.setVelocityY(vy);

        const minY = 55;
        const maxY = CONFIG.HEIGHT - 55;
        this.player.y = Phaser.Math.Clamp(this.player.y, minY, maxY);

        const targetAngle = (vy / SPEED) * 25;
        this.player.angle = Phaser.Math.Linear(this.player.angle, targetAngle, 0.15);

        if (!this.player.isDashing) {
            this.player.x = Phaser.Math.Linear(this.player.x, CONFIG.DOLPHIN.START_X, 0.08);
        }

        if (Math.abs(this.player.y - CONFIG.PHYSICS.WATER_LINE) < 35) {
            if (Math.random() < 0.12) {
                this.splashEmitter.setPosition(this.player.x, CONFIG.PHYSICS.WATER_LINE);
                this.splashEmitter.explode(4);
                if (Math.random() < 0.3) {
                    soundManager.play('splash');
                }
            }
        }
    }

    updateBackground() {
        this.sea.tilePositionX += 2.5 * this.speedMultiplier;

        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed * this.speedMultiplier;
            if (cloud.x < -60) {
                cloud.x = CONFIG.WIDTH + 60;
                cloud.y = 40 + Math.random() * 120;
            }
        });
    }

    cleanupOffscreen() {
        const cleanup = (group) => {
            group.children.each(child => {
                if (child.x < -120) {
                    child.destroy();
                }
            });
        };

        cleanup(this.enemies);
        cleanup(this.items);
        cleanup(this.obstacles);
    }
}

// ゲーム起動
const config = {
    type: Phaser.AUTO,
    width: CONFIG.WIDTH,
    height: CONFIG.HEIGHT,
    parent: 'game-container',
    backgroundColor: '#87ceeb',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: { width: 320, height: 180 },
        max: { width: 960, height: 540 }
    },
    scene: GameScene
};

window.addEventListener('load', () => {
    new Phaser.Game(config);
});
