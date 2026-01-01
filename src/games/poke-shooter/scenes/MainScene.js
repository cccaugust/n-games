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
        this.pokemons = this.physics.add.group(); // This will now hold containers or sprites? 
        // Physics with containers is tricky in Phaser.
        // Better: Keep pokemons as the physics group of sprites. Add visual hearts separately?
        // Or: Use Containers and enable physics on them. 
        // Let's try Containers with Physics.

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
            if (poke.y > this.scale.height + 50 || poke.x < -150 || poke.x > this.scale.width + 150) {
                poke.destroy();
            }
        });
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

        // Container Setup
        const container = this.add.container(startX, startY);
        container.setSize(100, 100);
        this.physics.world.enable(container);
        container.body.setVelocityX(Phaser.Math.Between(100, 250) * direction);

        // Pokemon Sprite
        const pokeSprite = this.add.image(0, 0, randomKey);
        pokeSprite.setScale(0.2); // Relative to container
        pokeSprite.setOrigin(0.5);
        container.add(pokeSprite);

        // Stores ID for capture
        container.pokemonId = randomKey;

        // Health System
        const maxHp = Phaser.Math.Between(1, 5);
        container.hp = maxHp;
        container.hearts = [];

        // Add Hearts
        const gap = 20;
        const startXHeart = -((maxHp - 1) * gap) / 2;

        for (let i = 0; i < maxHp; i++) {
            const heart = this.add.image(startXHeart + (i * gap), -60, 'heart');
            heart.setScale(0.04); // Small heart
            container.add(heart);
            container.hearts.push(heart);
        }

        this.pokemons.add(container);

        // Sine wave movement (apply to body)
        this.tweens.add({
            targets: container,
            y: container.y + 50,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    hitPokemon(ball, container) {
        ball.destroy();

        container.hp--;

        if (container.hearts.length > 0) {
            const heart = container.hearts.pop();
            heart.destroy();
        }

        // Flash effect
        this.tweens.add({
            targets: container,
            alpha: 0.5,
            duration: 50,
            yoyo: true,
            repeat: 1
        });

        if (container.hp <= 0) {
            this.catchPokemon(container);
        }
    }

    catchPokemon(container) {
        // Particles - One shot
        const particles = this.add.particles(container.x, container.y, 'monster_ball', {
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
        this.events.emit('pokemonCaught', container.pokemonId);

        // Destroy
        container.destroy();
    }
}
