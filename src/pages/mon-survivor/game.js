import { pokemonData } from '../../data/pokemonData.js';
import { getPixelAsset, listPixelAssets, pixelsToImageData } from '../../js/pixelAssets.js';
import samplePack from '../../pages/pixel-art-maker/samples.json';
import { Player, Enemy, Projectile, Particle, ExperienceGem, FloatingText, PowerUpItem, ShockWave } from './entities.js';

// --- Constants ---
const PLAYER_SKIN_KEY = 'ngames.mon_survivor.player_skin.v1';

// --- Sound Effects (Web Audio API) ---
class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio not supported');
            this.enabled = false;
        }
    }

    play(type) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            const now = this.ctx.currentTime;

            switch (type) {
                case 'hit':
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    osc.start(now);
                    osc.stop(now + 0.1);
                    break;
                case 'shoot':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                    osc.start(now);
                    osc.stop(now + 0.08);
                    break;
                case 'kill':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    osc.start(now);
                    osc.stop(now + 0.15);
                    break;
                case 'levelup':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(523, now);
                    osc.frequency.setValueAtTime(659, now + 0.1);
                    osc.frequency.setValueAtTime(784, now + 0.2);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                    osc.start(now);
                    osc.stop(now + 0.4);
                    break;
                case 'pickup':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    osc.start(now);
                    osc.stop(now + 0.1);
                    break;
                case 'guard':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(300, now);
                    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    osc.start(now);
                    osc.stop(now + 0.15);
                    break;
                case 'powerup':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.2);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                    osc.start(now);
                    osc.stop(now + 0.25);
                    break;
                case 'damage':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(150, now);
                    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
            }
        } catch (e) {
            // Ignore sound errors
        }
    }
}

const sound = new SoundManager();

// --- Sample Data Handling ---
function normalizeSampleList() {
    const list = Array.isArray(samplePack?.samples) ? samplePack.samples : [];
    return list.filter((s) => s?.kind === 'character');
}

function base64ToArrayBuffer(b64) {
    const binary = atob(String(b64 || ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

function decodePixelsB64(b64) {
    try {
        return new Uint32Array(base64ToArrayBuffer(b64));
    } catch {
        return new Uint32Array();
    }
}

function getSampleFrames(sample) {
    const frames = Array.isArray(sample?.frames) ? sample.frames : [];
    if (frames.length > 0) {
        return frames.map(f => ({
            pixels: decodePixelsB64(f.pixelsB64),
            durationMs: f.durationMs || 100,
            width: sample.width,
            height: sample.height
        }));
    }
    if (typeof sample?.pixelsB64 === 'string') {
        return [{
            pixels: decodePixelsB64(sample.pixelsB64),
            durationMs: 100,
            width: sample.width,
            height: sample.height
        }];
    }
    return [];
}

function pixelsToImage(pixels, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(pixelsToImageData(pixels, width, height), 0, 0);
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}

function framesToImages(frames) {
    return frames.map(f => ({
        image: pixelsToImage(f.pixels, f.width, f.height),
        durationMs: f.durationMs
    }));
}

// --- Assets ---
const images = {};
const sampleImages = {}; // { sampleId: { frames: [{image, durationMs}], width, height } }
let playerSkinData = null;
let enemySources = []; // { type: 'pokemon'|'sample', data, image?, frames? }

function preloadImages() {
    pokemonData.forEach(p => {
        const img = new Image();
        img.src = p.image;
        images[p.id] = img;
    });
}

function preloadSamples() {
    const samples = normalizeSampleList();
    samples.forEach(s => {
        const frames = getSampleFrames(s);
        if (frames.length > 0) {
            sampleImages[s.id] = {
                id: s.id,
                name: s.name,
                frames: framesToImages(frames),
                width: s.width,
                height: s.height
            };
        }
    });
}

function readJson(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

async function loadPlayerSkin() {
    const sel = readJson(PLAYER_SKIN_KEY);

    if (!sel) {
        // Default: Godangiru
        playerSkinData = { type: 'pokemon', image: images['0002'], id: '0002' };
        return;
    }

    if (sel.source === 'pokemon') {
        const poke = pokemonData.find(p => p.id === sel.pokemonId);
        if (poke && images[poke.id]) {
            playerSkinData = { type: 'pokemon', image: images[poke.id], id: poke.id };
            return;
        }
    }

    if (sel.source === 'sample') {
        const sample = sampleImages[sel.sampleId];
        if (sample) {
            playerSkinData = { type: 'sample', frames: sample.frames, id: sel.sampleId, width: sample.width, height: sample.height };
            return;
        }
    }

    if (sel.source === 'asset') {
        try {
            const asset = await getPixelAsset(sel.assetId);
            if (asset) {
                const frames = (asset.frames && asset.frames.length > 0)
                    ? asset.frames.map(f => ({
                        pixels: f.pixels,
                        durationMs: f.durationMs || 100,
                        width: f.width,
                        height: f.height
                    }))
                    : [{ pixels: asset.pixels, durationMs: 100, width: asset.width, height: asset.height }];
                playerSkinData = {
                    type: 'asset',
                    frames: framesToImages(frames),
                    id: sel.assetId,
                    width: asset.width,
                    height: asset.height
                };
                return;
            }
        } catch (e) {
            console.warn('Failed to load player asset:', e);
        }
    }

    // Fallback
    playerSkinData = { type: 'pokemon', image: images['0002'], id: '0002' };
}

function buildEnemySources() {
    enemySources = [];

    // Add all pokemon except player's chosen pokemon
    pokemonData.forEach(p => {
        if (playerSkinData?.id !== p.id) {
            enemySources.push({
                type: 'pokemon',
                id: p.id,
                name: p.name,
                image: images[p.id]
            });
        }
    });

    // Add all sample characters except player's chosen sample
    Object.values(sampleImages).forEach(s => {
        if (playerSkinData?.id !== s.id) {
            enemySources.push({
                type: 'sample',
                id: s.id,
                name: s.name,
                frames: s.frames,
                width: s.width,
                height: s.height
            });
        }
    });
}

preloadImages();
preloadSamples();

// --- Game State ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const joystickZone = document.getElementById('joystick-zone');

// UI Elements
const uiLayer = {
    level: document.getElementById('level-display'),
    xpBar: document.getElementById('xp-bar-fill'),
    timer: document.getElementById('timer-display'),
    hpBar: document.getElementById('hp-bar-fill'),
    currentHp: document.getElementById('current-hp'),
    maxHp: document.getElementById('max-hp'),
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    upgradeScreen: document.getElementById('upgrade-screen'),
    upgradeOptions: document.getElementById('upgrade-options'),
    finalTime: document.getElementById('final-time'),
    killCount: document.getElementById('kill-count'),
    playBtn: document.getElementById('start-btn'),
    retryBtn: document.getElementById('retry-btn')
};

// Game Variables
let player;
let enemies = [];
let projectiles = [];
let particles = [];
let gems = [];
let floatingTexts = [];
let powerUps = [];
let shockWaves = [];
let frame = 0;
let score = 0;
let isGameOver = true;
let isPaused = false;
let startTime = 0;
let gameTime = 0;
let screenShake = 0;

// Input State
const input = {
    keys: {},
    mouse: { x: 0, y: 0, down: false },
    joystick: { x: 0, y: 0, active: false },
    guardPressed: false
};

window.addEventListener('keydown', e => {
    input.keys[e.key] = true;
    if (e.key === ' ' || e.key === 'Shift') {
        input.guardPressed = true;
    }
});
window.addEventListener('keyup', e => {
    input.keys[e.key] = false;
    if (e.key === ' ' || e.key === 'Shift') {
        input.guardPressed = false;
    }
});

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

// --- Touch Controls (Virtual Joystick) ---
const joystick = {
    pointerId: null,
    centerX: 0,
    centerY: 0,
    maxRadius: 70,
    deadZone: 0.12,
    stickEl: null
};

function resetJoystick() {
    input.joystick.x = 0;
    input.joystick.y = 0;
    input.joystick.active = false;
    joystick.pointerId = null;
    if (joystick.stickEl) {
        joystick.stickEl.style.transform = 'translate(-50%, -50%)';
    }
}

function updateJoystickFromPointer(clientX, clientY) {
    const dx = clientX - joystick.centerX;
    const dy = clientY - joystick.centerY;

    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(joystick.maxRadius, dist);
    const angle = Math.atan2(dy, dx);

    const px = Math.cos(angle) * (dist === 0 ? 0 : clamped);
    const py = Math.sin(angle) * (dist === 0 ? 0 : clamped);

    if (joystick.stickEl) {
        joystick.stickEl.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
    }

    let nx = px / joystick.maxRadius;
    let ny = py / joystick.maxRadius;

    const nLen = Math.hypot(nx, ny);
    if (nLen > 1) {
        nx /= nLen;
        ny /= nLen;
    }

    if (nLen < joystick.deadZone) {
        nx = 0;
        ny = 0;
    }

    input.joystick.x = clamp(nx, -1, 1);
    input.joystick.y = clamp(ny, -1, 1);
}

function setupJoystick() {
    if (!joystickZone) return;
    if (joystickZone.dataset.ready === '1') return;
    joystickZone.dataset.ready = '1';

    joystickZone.innerHTML = `
        <div class="joystick-base" aria-hidden="true">
            <div class="joystick-stick" aria-hidden="true"></div>
        </div>
    `;
    joystick.stickEl = joystickZone.querySelector('.joystick-stick');

    joystickZone.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (joystick.pointerId !== null) return;
        joystick.pointerId = e.pointerId;
        input.joystick.active = true;

        const rect = joystickZone.getBoundingClientRect();
        joystick.centerX = rect.left + rect.width / 2;
        joystick.centerY = rect.top + rect.height / 2;

        updateJoystickFromPointer(e.clientX, e.clientY);
        joystickZone.setPointerCapture(e.pointerId);
    });

    joystickZone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== joystick.pointerId) return;
        e.preventDefault();
        updateJoystickFromPointer(e.clientX, e.clientY);
    });

    function onEnd(e) {
        if (e.pointerId !== joystick.pointerId) return;
        e.preventDefault();
        resetJoystick();
    }
    joystickZone.addEventListener('pointerup', onEnd);
    joystickZone.addEventListener('pointercancel', onEnd);
}

// Guard button for mobile
let guardBtn = null;
function setupGuardButton() {
    if (guardBtn) return;
    guardBtn = document.createElement('button');
    guardBtn.id = 'guard-btn';
    guardBtn.textContent = 'GUARD';
    guardBtn.style.cssText = `
        position: absolute;
        right: 20px;
        bottom: calc(80px + env(safe-area-inset-bottom));
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(52, 152, 219, 0.7);
        border: 3px solid white;
        color: white;
        font-weight: 800;
        font-size: 0.9rem;
        font-family: 'M PLUS Rounded 1c', sans-serif;
        z-index: 50;
        display: none;
        touch-action: none;
    `;
    document.getElementById('ui-layer').appendChild(guardBtn);

    guardBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        input.guardPressed = true;
        guardBtn.style.background = 'rgba(52, 152, 219, 1)';
    });
    guardBtn.addEventListener('pointerup', (e) => {
        e.preventDefault();
        input.guardPressed = false;
        guardBtn.style.background = 'rgba(52, 152, 219, 0.7)';
    });
    guardBtn.addEventListener('pointercancel', (e) => {
        input.guardPressed = false;
        guardBtn.style.background = 'rgba(52, 152, 219, 0.7)';
    });

    // Show on touch devices
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
        guardBtn.style.display = 'block';
    }
}

// Resize handling
function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width));
    canvas.height = Math.max(1, Math.floor(rect.height));
}
window.addEventListener('resize', resize);
resize();
setupJoystick();
setupGuardButton();

// --- Game Functions ---

async function initGame() {
    sound.init();

    // Load player skin
    await loadPlayerSkin();
    buildEnemySources();

    // Reset State
    player = new Player(canvas.width / 2, canvas.height / 2);

    // Apply player skin
    if (playerSkinData) {
        if (playerSkinData.type === 'pokemon') {
            player.image = playerSkinData.image;
        } else if (playerSkinData.frames) {
            player.spriteFrames = playerSkinData.frames;
            player.spriteWidth = playerSkinData.width;
            player.spriteHeight = playerSkinData.height;
        }
    }

    enemies = [];
    projectiles = [];
    particles = [];
    gems = [];
    floatingTexts = [];
    powerUps = [];
    shockWaves = [];
    frame = 0;
    score = 0;
    isGameOver = false;
    isPaused = false;
    startTime = Date.now();
    screenShake = 0;
    resetJoystick();

    // UI Reset
    uiLayer.startScreen.classList.add('hidden');
    uiLayer.gameOverScreen.classList.add('hidden');
    updateUI();

    loop();
}

function getRandomEnemySource() {
    if (enemySources.length === 0) return null;
    return enemySources[Math.floor(Math.random() * enemySources.length)];
}

// Enemy AI Types
const ENEMY_BEHAVIORS = ['chase', 'chase', 'chase', 'zigzag', 'orbit', 'dash', 'shy'];

function spawnEnemy() {
    // Spawn rate increases with time
    const baseRate = Math.max(15, 80 - Math.floor(frame / 500));
    const spawnRate = baseRate;

    if (frame % spawnRate === 0) {
        // Random position outside screen
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -50 : canvas.width + 50;
            y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width;
            y = Math.random() < 0.5 ? -50 : canvas.height + 50;
        }

        const source = getRandomEnemySource();
        if (!source) return;

        // Pick behavior based on game progress
        const behaviorPool = frame < 1800 ? ['chase', 'chase', 'zigzag'] : ENEMY_BEHAVIORS;
        const behavior = behaviorPool[Math.floor(Math.random() * behaviorPool.length)];

        const enemy = new Enemy(x, y, player, {
            image: source.type === 'pokemon' ? source.image : null,
            spriteFrames: source.type === 'sample' ? source.frames : null,
            spriteWidth: source.width,
            spriteHeight: source.height,
            behavior: behavior
        });

        // Scale difficulty
        const difficultyMult = 1 + Math.floor(frame / 1800) * 0.2;
        enemy.hp = Math.floor(enemy.hp * difficultyMult);
        enemy.speed *= (1 + Math.random() * 0.3);

        enemies.push(enemy);
    }
}

function spawnPowerUp() {
    // Rare spawn
    if (frame % 600 === 0 && Math.random() < 0.4) {
        const types = ['heal', 'speed', 'attack', 'magnet'];
        const type = types[Math.floor(Math.random() * types.length)];
        const x = Math.random() * (canvas.width - 100) + 50;
        const y = Math.random() * (canvas.height - 100) + 50;
        powerUps.push(new PowerUpItem(x, y, type));
    }
}

function createExplosion(x, y, count = 5, color = '#fff') {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
        particles.push(new Particle(x, y, color, vel));
    }
}

function createSparkle(x, y, count = 3) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 0.5;
        const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
        const colors = ['#fff', '#ffd700', '#ff69b4', '#00ffff'];
        particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)], vel, 'sparkle'));
    }
}

function showDamage(x, y, amount, isCrit = false) {
    const color = isCrit ? '#ffeb3b' : '#fff';
    const text = isCrit ? `${Math.floor(amount)}!` : Math.floor(amount);
    floatingTexts.push(new FloatingText(x, y, text, color));
}

function checkCollisions() {
    // Player vs Enemies
    enemies.forEach(enemy => {
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < player.radius + enemy.radius) {
            if (player.isGuarding) {
                // Perfect guard - knockback enemy and damage
                const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                enemy.x += Math.cos(angle) * 40;
                enemy.y += Math.sin(angle) * 40;
                enemy.hp -= player.guardDamage;
                createExplosion(enemy.x, enemy.y, 5, '#3498db');
                showDamage(enemy.x, enemy.y - 10, player.guardDamage, true);
                sound.play('guard');
                player.guardCooldown = 30;
                shockWaves.push(new ShockWave(player.x, player.y, '#3498db'));
            } else if (!player.invincible) {
                // Take damage
                const damage = 0.5 + (player.level * 0.1);
                player.hp -= damage;
                createExplosion(player.x, player.y, 2, '#ff0000');
                sound.play('damage');
                player.invincible = true;
                player.invincibleTimer = 30;
                screenShake = 5;
            }
        }
    });

    // Sword Orbit Hitbox
    if (player.weapons.orbit.active) {
        for (let i = 0; i < player.weapons.orbit.count; i++) {
            const angle = player.weapons.orbit.angle + (i * (Math.PI * 2 / player.weapons.orbit.count));
            const wx = player.x + Math.cos(angle) * player.weapons.orbit.radius;
            const wy = player.y + Math.sin(angle) * player.weapons.orbit.radius;
            const wRadius = player.weapons.orbit.size;

            enemies.forEach(enemy => {
                const dist = Math.hypot(wx - enemy.x, wy - enemy.y);
                if (dist < wRadius + enemy.radius && !enemy.hitThisFrame) {
                    enemy.hitThisFrame = true;
                    const dmg = player.weapons.orbit.damage * player.attackMult;
                    enemy.hp -= dmg;
                    createExplosion(enemy.x, enemy.y, 2, '#f1c40f');
                    showDamage(enemy.x, enemy.y - 10, dmg);
                    sound.play('hit');

                    // Knockback
                    const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                    enemy.x += Math.cos(angleToEnemy) * 8;
                    enemy.y += Math.sin(angleToEnemy) * 8;
                }
            });
        }
    }

    // Projectiles vs Enemies
    projectiles.forEach(proj => {
        enemies.forEach(enemy => {
            const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
            if (dist < proj.radius + enemy.radius) {
                const dmg = proj.damage * player.attackMult;
                enemy.hp -= dmg;
                proj.markedForDeletion = true;
                createExplosion(enemy.x, enemy.y, 4, '#ffa502');
                showDamage(enemy.x, enemy.y - 10, dmg);
                sound.play('hit');
            }
        });
    });

    // Player vs PowerUps
    powerUps.forEach(pu => {
        const dist = Math.hypot(player.x - pu.x, player.y - pu.y);
        if (dist < player.radius + pu.radius) {
            pu.markedForDeletion = true;
            applyPowerUp(pu.type);
            createSparkle(pu.x, pu.y, 8);
            sound.play('powerup');
        }
    });

    // ShockWaves vs Enemies
    shockWaves.forEach(wave => {
        enemies.forEach(enemy => {
            const dist = Math.hypot(wave.x - enemy.x, wave.y - enemy.y);
            if (dist < wave.radius && dist > wave.radius - 20 && !enemy.hitByWave) {
                enemy.hitByWave = true;
                enemy.hp -= 15;
                const angle = Math.atan2(enemy.y - wave.y, enemy.x - wave.x);
                enemy.x += Math.cos(angle) * 20;
                enemy.y += Math.sin(angle) * 20;
            }
        });
    });
}

function applyPowerUp(type) {
    switch (type) {
        case 'heal':
            player.hp = Math.min(player.maxHp, player.hp + 30);
            floatingTexts.push(new FloatingText(player.x, player.y - 20, '+30 HP', '#2ecc71'));
            break;
        case 'speed':
            player.speedBuff = 180; // 3 seconds
            player.speed = player.baseSpeed * 1.5;
            floatingTexts.push(new FloatingText(player.x, player.y - 20, 'SPEED UP!', '#3498db'));
            break;
        case 'attack':
            player.attackMult = Math.min(3, player.attackMult + 0.3);
            floatingTexts.push(new FloatingText(player.x, player.y - 20, 'ATK UP!', '#e74c3c'));
            break;
        case 'magnet':
            player.magnetRange = 300;
            player.magnetBuff = 300; // 5 seconds
            floatingTexts.push(new FloatingText(player.x, player.y - 20, 'MAGNET!', '#9b59b6'));
            break;
    }
}

function checkAutoShoot() {
    if (player.weapons.autoShoot.cooldown <= 0) {
        // Find nearest enemy
        let nearest = null;
        let minDist = Infinity;

        enemies.forEach(e => {
            const d = Math.hypot(player.x - e.x, player.y - e.y);
            if (d < minDist) {
                minDist = d;
                nearest = e;
            }
        });

        if (nearest && minDist < 500) { // Range check
            const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
            const speed = player.weapons.autoShoot.speed;
            const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };

            projectiles.push(new Projectile(player.x, player.y, vel, player.weapons.autoShoot.damage));
            player.weapons.autoShoot.cooldown = player.weapons.autoShoot.maxCooldown;
            sound.play('shoot');
        }
    }
}

function handleLevelUp() {
    isPaused = true;
    sound.play('levelup');
    uiLayer.upgradeScreen.classList.remove('hidden');

    // Generate Options
    const allOptions = [
        {
            icon: '⚔️',
            title: '周回軌道：ソード追加',
            desc: '守りを固める剣をもう1本追加します。',
            action: () => {
                player.weapons.orbit.count++;
            }
        },
        {
            icon: '💫',
            title: '周回軌道：範囲拡大',
            desc: '剣の回転半径が広がります。',
            action: () => {
                player.weapons.orbit.radius += 20;
            }
        },
        {
            icon: '🏹',
            title: '射撃：連射速度アップ',
            desc: '自動射撃の間隔が短くなります。',
            action: () => {
                player.weapons.autoShoot.maxCooldown = Math.max(15, player.weapons.autoShoot.maxCooldown * 0.75);
            }
        },
        {
            icon: '🎯',
            title: '射撃：威力アップ',
            desc: '自動射撃の威力が上がります。',
            action: () => {
                player.weapons.autoShoot.damage *= 1.3;
            }
        },
        {
            icon: '💪',
            title: '攻撃力アップ',
            desc: '全ての武器の威力が上がります。',
            action: () => {
                player.weapons.orbit.damage *= 1.2;
                player.weapons.autoShoot.damage *= 1.2;
            }
        },
        {
            icon: '❤️',
            title: '最大HPアップ',
            desc: '最大HPが増加し、全回復します。',
            action: () => {
                player.maxHp += 30;
                player.hp = player.maxHp;
            }
        },
        {
            icon: '👟',
            title: '移動速度アップ',
            desc: '移動が速くなります。',
            action: () => {
                player.baseSpeed += 0.5;
                player.speed = player.baseSpeed;
            }
        },
        {
            icon: '🛡️',
            title: 'ガード強化',
            desc: 'ガード時のダメージと範囲が増加します。',
            action: () => {
                player.guardDamage += 10;
            }
        }
    ];

    // Pick 3 random options
    const shuffled = allOptions.sort(() => Math.random() - 0.5);
    const options = shuffled.slice(0, 3);

    uiLayer.upgradeOptions.innerHTML = '';
    options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'upgrade-card';
        div.innerHTML = `
            <div class="upgrade-icon">${opt.icon}</div>
            <div class="upgrade-title">${opt.title}</div>
            <div class="upgrade-desc">${opt.desc}</div>
        `;
        div.onclick = () => {
            opt.action();
            player.level++;
            // Heal slightly on level up
            player.hp = Math.min(player.maxHp, player.hp + 15);

            // Xp curve
            player.nextLevelXp = Math.floor(player.nextLevelXp * 1.15);
            player.xp = 0;

            uiLayer.upgradeScreen.classList.add('hidden');
            isPaused = false;
            requestAnimationFrame(loop);
        };
        uiLayer.upgradeOptions.appendChild(div);
    });
}

function updateUI() {
    // XP Bar
    const xpPercent = (player.xp / player.nextLevelXp) * 100;
    uiLayer.xpBar.style.width = `${xpPercent}%`;
    uiLayer.level.textContent = player.level;

    // Timer
    const now = Date.now();
    const diff = Math.floor((now - startTime) / 1000);
    const m = Math.floor(diff / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    uiLayer.timer.textContent = `${m}:${s}`;
    gameTime = `${m}:${s}`;

    // HP
    const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
    uiLayer.hpBar.style.width = `${hpPercent}%`;
    uiLayer.currentHp.textContent = Math.floor(player.hp);
    uiLayer.maxHp.textContent = player.maxHp;
}

function gameOver() {
    isGameOver = true;
    uiLayer.gameOverScreen.classList.remove('hidden');
    uiLayer.finalTime.textContent = gameTime;
    uiLayer.killCount.textContent = score;
    resetJoystick();
}

// Game Loop
function loop() {
    if (isGameOver || isPaused) return;

    // Screen shake
    let shakeX = 0, shakeY = 0;
    if (screenShake > 0) {
        shakeX = (Math.random() - 0.5) * screenShake * 2;
        shakeY = (Math.random() - 0.5) * screenShake * 2;
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Clear
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);

    // Reset hit flags
    enemies.forEach(e => {
        e.hitThisFrame = false;
        e.hitByWave = false;
    });

    // Update Player
    player.update(input, canvas.width, canvas.height);
    player.draw(ctx);

    // Guard visual
    if (player.isGuarding) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 15, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    // Auto Shoot
    checkAutoShoot();

    // Spawn
    frame++;
    spawnEnemy();
    spawnPowerUp();

    // Update Enemies
    enemies.forEach((enemy) => {
        enemy.update(canvas.width, canvas.height);
        enemy.draw(ctx);

        if (enemy.hp <= 0) {
            enemy.markedForDeletion = true;
            createExplosion(enemy.x, enemy.y, 10, '#ff6b6b');
            gems.push(new ExperienceGem(enemy.x, enemy.y, enemy.xpValue));
            score++;
            sound.play('kill');
            screenShake = 3;
        }
    });

    // Update Projectiles
    projectiles.forEach(p => {
        p.update();
        p.draw(ctx);
    });

    // Update Gems
    const magnetRange = player.magnetBuff > 0 ? player.magnetRange : 100;
    gems.forEach(gem => {
        gem.update(player, magnetRange);
        gem.draw(ctx);
        if (gem.markedForDeletion) {
            player.xp += gem.value;
            sound.play('pickup');
            if (player.xp >= player.nextLevelXp) {
                handleLevelUp();
            }
        }
    });

    // Update PowerUps
    powerUps.forEach(pu => {
        pu.update();
        pu.draw(ctx);
    });

    // Update ShockWaves
    shockWaves.forEach(wave => {
        wave.update();
        wave.draw(ctx);
    });

    // Update Particles
    particles.forEach(p => {
        p.update();
        p.draw(ctx);
    });

    // Update Text
    floatingTexts.forEach(t => {
        t.update();
        t.draw(ctx);
    });

    checkCollisions();

    // Cleanup
    enemies = enemies.filter(e => !e.markedForDeletion);
    projectiles = projectiles.filter(p => !p.markedForDeletion);
    particles = particles.filter(p => !p.markedForDeletion);
    gems = gems.filter(g => !g.markedForDeletion);
    floatingTexts = floatingTexts.filter(t => !t.markedForDeletion);
    powerUps = powerUps.filter(p => !p.markedForDeletion);
    shockWaves = shockWaves.filter(w => !w.markedForDeletion);

    ctx.restore();

    updateUI();

    if (player.hp <= 0) {
        gameOver();
        return;
    }

    requestAnimationFrame(loop);
}

// Start Listeners
uiLayer.playBtn.onclick = initGame;
uiLayer.retryBtn.onclick = initGame;
