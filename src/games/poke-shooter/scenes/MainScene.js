import Phaser from 'phaser';
import { pokemonData } from '../../../data/pokemonData.js';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    create() {
        // Background (always match viewport)
        this.bg = this.add.image(0, 0, 'background');
        this.bg.setOrigin(0.5, 0.5);
        this.bg.setScrollFactor(0);

        // Groups
        this.balls = this.physics.add.group();
        // NOTE: Arcade Physics + Container is fragile across Phaser versions/builds.
        // Keep pokemons as Arcade Sprites, and render hearts as separate images that follow.
        this.pokemons = this.physics.add.group();

        // Input
        this.input.on('pointerdown', this.shootBall, this);

        // Spawner
        this.time.addEvent({
            delay: 1000,
            callback: this.spawnPokemon,
            callbackScope: this,
            loop: true
        });

        // Collisions - Note: we need to overlap with the Container's body
        this.physics.add.overlap(this.balls, this.pokemons, this.hitPokemon, null, this);

        // Player Position Visual (Launcher)
        this.playerPos = new Phaser.Math.Vector2(0, 0);
        this.launcherDot = this.add.circle(0, 0, 10, 0xffffff);

        // Initial responsive layout + follow-up on resize
        this.applyResponsiveLayout({ width: this.scale.width, height: this.scale.height });
        this.scale.on('resize', this.applyResponsiveLayout, this);
    }

    applyResponsiveLayout(gameSize) {
        if (!gameSize) return;

        const width = gameSize.width ?? this.scale.width;
        const height = gameSize.height ?? this.scale.height;

        // Update physics world bounds to match the resized viewport
        if (this.physics?.world) {
            this.physics.world.setBounds(0, 0, width, height);
        }

        // Background: stretch to fill (no letterboxing, no gaps)
        if (this.bg && this.bg.active) {
            this.bg.setPosition(width / 2, height / 2);
            this.bg.setDisplaySize(width, height);
        }

        // Responsive sizes (tuned for mobile readability)
        // - Ball: clearly visible but not too large
        // - Heart: readable above pokemon, with spacing that scales with size
        this.ballSize = Phaser.Math.Clamp(width * 0.085, 44, 84);
        this.heartSize = Phaser.Math.Clamp(width * 0.045, 20, 42);
        this.heartGap = this.heartSize + Phaser.Math.Clamp(width * 0.01, 6, 12);
        this.heartYOffset = Phaser.Math.Clamp(height * 0.05, 44, 74);

        // Launcher position
        this.playerPos.set(width / 2, height - Phaser.Math.Clamp(height * 0.055, 60, 86));
        if (this.launcherDot && this.launcherDot.active) {
            this.launcherDot.setPosition(this.playerPos.x, this.playerPos.y);
        }
    }

    update() {
        // Cleanup off-screen
        this.balls.children.each(ball => {
            if (ball.y < -50 || ball.x < -50 || ball.x > this.scale.width + 50) {
                ball.destroy();
            }
        });

        this.pokemons.children.each(poke => {
            // Group iteration can include destroyed/null entries depending on timing;
            // guard before accessing position/properties.
            if (!poke || !poke.active) return;

            // Keep UI hearts following the pokemon sprite
            if (poke.hearts) {
                const gap = this.heartGap ?? 20;
                const startXHeart = -((poke.maxHp - 1) * gap) / 2;
                for (let i = 0; i < poke.hearts.length; i++) {
                    const heart = poke.hearts[i];
                    if (!heart || !heart.active) continue;
                    heart.x = poke.x + startXHeart + (i * gap);
                    heart.y = poke.y - (this.heartYOffset ?? 60);
                }
            }

            if (poke.y > this.scale.height + 50 || poke.x < -150 || poke.x > this.scale.width + 150) {
                poke.destroy();
            }
        }, this);
    }

    shootBall(pointer) {
        const ball = this.balls.create(this.playerPos.x, this.playerPos.y, 'monster_ball');
        const size = this.ballSize ?? 64;
        ball.setDisplaySize(size, size);
        // Make the physics body match the displayed size
        if (ball.body) {
            ball.body.setSize(size, size, true);
        }

        // Calculate velocity
        const angle = Phaser.Math.Angle.Between(this.playerPos.x, this.playerPos.y, pointer.x, pointer.y);
        const speed = 800; // Increased speed for better feel

        this.physics.velocityFromRotation(angle, speed, ball.body.velocity);
    }

    spawnPokemon() {
        const keys = pokemonData.map(p => p.id);
        const randomKey = Phaser.Utils.Array.GetRandom(keys);

        const startY = Phaser.Math.Between(100, this.scale.height / 2);
        const direction = Math.random() > 0.5 ? 1 : -1;
        const startX = direction === 1 ? -100 : this.scale.width + 100;

        // Pokemon Physics Sprite
        const poke = this.pokemons.create(startX, startY, randomKey);
        // Scale + body for reliable overlaps
        poke.setScale(0.2);
        poke.setCircle(Math.min(poke.width, poke.height) * 0.25);
        poke.setOffset(poke.width * 0.25, poke.height * 0.25);
        poke.setVelocityX(Phaser.Math.Between(100, 250) * direction);
        poke.setImmovable(true);

        // Stores ID for capture
        poke.pokemonId = randomKey;

        // Health System
        const maxHp = Phaser.Math.Between(1, 5);
        poke.maxHp = maxHp;
        poke.hp = maxHp;
        poke.hearts = [];

        // Hearts (non-physics, follow in update)
        for (let i = 0; i < maxHp; i++) {
            const heart = this.add.image(poke.x, poke.y - (this.heartYOffset ?? 60), 'heart');
            const h = this.heartSize ?? 28;
            heart.setDisplaySize(h, h);
            heart.setDepth(10);
            poke.hearts.push(heart);
        }

        // Cleanup hearts when pokemon is destroyed
        poke.once(Phaser.GameObjects.Events.DESTROY, () => {
            if (poke.hearts) {
                poke.hearts.forEach(h => h && h.destroy());
                poke.hearts = [];
            }
        });

        // Sine wave movement for the sprite
        this.tweens.add({
            targets: poke,
            y: poke.y + 50,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    hitPokemon(ball, poke) {
        ball.destroy();

        poke.hp--;

        if (poke.hearts && poke.hearts.length > 0) {
            const heart = poke.hearts.pop();
            heart.destroy();
        }

        // Flash effect
        this.tweens.add({
            targets: poke,
            alpha: 0.5,
            duration: 50,
            yoyo: true,
            repeat: 1
        });

        if (poke.hp <= 0) {
            this.catchPokemon(poke);
        }
    }

    catchPokemon(poke) {
        // Particles - One shot
        const size = this.ballSize ?? 64;
        const tex = this.textures.get('monster_ball');
        const source = tex?.getSourceImage?.();
        const baseW = source?.width || 1024;
        const startScale = Phaser.Math.Clamp((size / baseW) * 1.25, 0.22, 0.75);

        const particles = this.add.particles(poke.x, poke.y, 'monster_ball', {
            speed: { min: 160, max: 480 },
            // Make the effect clearly visible on mobile/high-DPI screens
            scale: { start: startScale, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 700,
            quantity: 28,
            blendMode: 'ADD',
            emitting: false
        });

        particles.explode(28);

        // Score & Collection
        this.events.emit('pokemonCaught', poke.pokemonId);

        // Destroy
        poke.destroy();
    }
}
