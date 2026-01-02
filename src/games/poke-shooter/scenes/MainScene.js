import Phaser from 'phaser';
import { pokemonData } from '../../../data/pokemonData.js';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    create() {
        // Background
        const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'background');
        // Scale background to cover screen
        const scaleX = this.scale.width / bg.width;
        const scaleY = this.scale.height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setScrollFactor(0);

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
        const width = this.scale.width;
        const height = this.scale.height;
        this.playerPos = new Phaser.Math.Vector2(width / 2, height - 70);
        this.add.circle(this.playerPos.x, this.playerPos.y, 10, 0xffffff);
    }

    update() {
        // Cleanup off-screen
        this.balls.children.each(ball => {
            if (ball.y < -50 || ball.x < -50 || ball.x > this.scale.width + 50) {
                ball.destroy();
            }
        });

        this.pokemons.children.each(poke => {
            // Keep UI hearts following the pokemon sprite
            if (poke && poke.hearts && poke.active) {
                const gap = 20;
                const startXHeart = -((poke.maxHp - 1) * gap) / 2;
                for (let i = 0; i < poke.hearts.length; i++) {
                    const heart = poke.hearts[i];
                    if (!heart || !heart.active) continue;
                    heart.x = poke.x + startXHeart + (i * gap);
                    heart.y = poke.y - 60;
                }
            }

            if (poke.y > this.scale.height + 50 || poke.x < -150 || poke.x > this.scale.width + 150) {
                poke.destroy();
            }
        }, this);
    }

    shootBall(pointer) {
        const ball = this.balls.create(this.playerPos.x, this.playerPos.y, 'monster_ball');
        ball.setScale(0.1);

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
            const heart = this.add.image(poke.x, poke.y - 60, 'heart');
            heart.setScale(0.04);
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
        const particles = this.add.particles(poke.x, poke.y, 'monster_ball', {
            speed: { min: 100, max: 300 },
            scale: { start: 0.1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 600,
            quantity: 20,
            blendMode: 'ADD',
            emitting: false
        });

        particles.explode(20);

        // Score & Collection
        this.events.emit('pokemonCaught', poke.pokemonId);

        // Destroy
        poke.destroy();
    }
}
