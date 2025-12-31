import { pokemonData } from '../../data/pokemonData.js';
import { Player, Enemy, Projectile, Particle, ExperinceGem, FloatingText } from './entities.js';

// --- Assets ---
// Preload images
const images = {};
function preloadImages() {
    pokemonData.forEach(p => {
        const img = new Image();
        img.src = p.image;
        images[p.id] = img;
    });
}
preloadImages();

// --- Game State ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
let frame = 0;
let score = 0;
let isGameOver = true;
let isPaused = false;
let startTime = 0;
let gameTime = 0;

// Input State
const input = {
    keys: {},
    mouse: { x: 0, y: 0, down: false }
};

window.addEventListener('keydown', e => input.keys[e.key] = true);
window.addEventListener('keyup', e => input.keys[e.key] = false);

// Resize handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Game Functions ---

function initGame() {
    // Reset State
    player = new Player(canvas.width / 2, canvas.height / 2);
    // Assign Godangiru image to player (ID: 0002) - Or user choice, defaulting to Godangiru for now as per request
    if (images['0002']) player.image = images['0002'];

    enemies = [];
    projectiles = [];
    particles = [];
    gems = [];
    floatingTexts = [];
    frame = 0;
    score = 0;
    isGameOver = false;
    isPaused = false;
    startTime = Date.now();

    // UI Reset
    uiLayer.startScreen.classList.add('hidden');
    uiLayer.gameOverScreen.classList.add('hidden');
    updateUI();

    loop();
}

function spawnEnemy() {
    // Spawn rate increases with time
    const spawnRate = Math.max(20, 100 - Math.floor(frame / 600));

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

        // Random enemy type from Pokedex (excluding Godangiru/Player)
        const enemyList = pokemonData.filter(p => p.id !== '0002');
        const randomPoke = enemyList[Math.floor(Math.random() * enemyList.length)];

        const enemy = new Enemy(x, y, player, {
            image: images[randomPoke.id]
        });
        enemies.push(enemy);
    }
}

function createExplosion(x, y, count = 5, color = '#fff') {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
        particles.push(new Particle(x, y, color, vel));
    }
}

function showDamage(x, y, amount, isCrit = false) {
    const color = isCrit ? '#ffeb3b' : '#fff';
    const text = isCrit ? `${amount}!` : amount;
    floatingTexts.push(new FloatingText(x, y, text, color));
}

function checkCollisions() {
    // Player vs Enemies
    enemies.forEach(enemy => {
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < player.radius + enemy.radius) {
            // Hit Player
            player.hp -= 0.5; // Drains HP slowly on contact
            createExplosion(player.x, player.y, 1, '#ff0000');

            // Push back slightly?
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
                // Determine if already hit this frame? (Simplification: just pure distance)
                const dist = Math.hypot(wx - enemy.x, wy - enemy.y);
                if (dist < wRadius + enemy.radius) {
                    enemy.hp -= player.weapons.orbit.damage;
                    createExplosion(enemy.x, enemy.y, 1, '#fff');
                    showDamage(enemy.x, enemy.y - 10, player.weapons.orbit.damage);

                    // Knockback
                    const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                    enemy.x += Math.cos(angleToEnemy) * 5;
                    enemy.y += Math.sin(angleToEnemy) * 5;
                }
            });
        }
    }

    // Projectiles vs Enemies
    projectiles.forEach(proj => {
        enemies.forEach(enemy => {
            const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
            if (dist < proj.radius + enemy.radius) {
                enemy.hp -= proj.damage;
                proj.markedForDeletion = true;
                createExplosion(enemy.x, enemy.y, 3, '#ffa502');
                showDamage(enemy.x, enemy.y - 10, proj.damage);
            }
        });
    });
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

        if (nearest && minDist < 400) { // Range check
            const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
            const speed = player.weapons.autoShoot.speed;
            const vel = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };

            projectiles.push(new Projectile(player.x, player.y, vel, player.weapons.autoShoot.damage));
            player.weapons.autoShoot.cooldown = player.weapons.autoShoot.maxCooldown;
        }
    }
}

function handleLevelUp() {
    isPaused = true;
    uiLayer.upgradeScreen.classList.remove('hidden');

    // Generate Options
    const options = [
        {
            icon: '⚔️',
            title: '周回軌道：ソード追加',
            desc: '守りを固める剣をもう1本追加します。',
            action: () => {
                player.weapons.orbit.count++;
            }
        },
        {
            icon: '🏹',
            title: '射撃：連射速度アップ',
            desc: '自動射撃の間隔が短くなります。',
            action: () => {
                player.weapons.autoShoot.maxCooldown *= 0.8;
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
        }
    ];

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
            player.hp = Math.min(player.maxHp, player.hp + 20);

            // Xp curve
            player.nextLevelXp = Math.floor(player.nextLevelXp * 1.2);
            player.xp = 0;

            uiLayer.upgradeScreen.classList.add('hidden');
            isPaused = false;
            requestAnimationFrame(loop); // Resume
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
}

// Stats Loop
function loop() {
    if (isGameOver || isPaused) return;

    // Clear
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update Player
    player.update(input, canvas.width, canvas.height);
    player.draw(ctx);

    // Auto Shoot
    checkAutoShoot();

    // Spawn
    frame++;
    spawnEnemy();

    // Update Enemies
    enemies.forEach((enemy, index) => {
        enemy.update();
        enemy.draw(ctx);

        if (enemy.hp <= 0) {
            enemy.markedForDeletion = true;
            createExplosion(enemy.x, enemy.y, 8, enemy.color);
            gems.push(new ExperinceGem(enemy.x, enemy.y, enemy.xpValue));
            score++;
        }
    });

    // Update Projectiles
    projectiles.forEach(p => {
        p.update();
        p.draw(ctx);
    });

    // Update Gems
    gems.forEach(gem => {
        gem.update(player);
        gem.draw(ctx);
        if (gem.markedForDeletion) {
            // Collected
            player.xp += gem.value;
            if (player.xp >= player.nextLevelXp) {
                handleLevelUp();
            }
        }
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
