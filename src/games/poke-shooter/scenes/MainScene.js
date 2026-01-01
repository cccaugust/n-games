import Phaser from 'phaser';
import { pokemonData } from '../../../data/pokemonData.js';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    create() {
        // Groups
        this.balls = this.physics.add.group();
        this.pokemons = this.physics.add.group();

        // Input
        this.input.on('pointerdown', this.shootBall, this);

        // Spawner
        this.time.addEvent({
            delay: 1000, // Spawn every 1s
            callback: this.spawnPokemon,
            callbackScope: this,
            loop: true
        });

        // Collisions
        this.physics.add.overlap(this.balls, this.pokemons, this.catchPokemon, null, this);

        // Player Position Visual (Launcher)
        const width = this.scale.width;
        const height = this.scale.height;
        this.playerPos = new Phaser.Math.Vector2(width / 2, height - 50);
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
            if (poke.y > this.scale.height + 50 || poke.x < -100 || poke.x > this.scale.width + 100) {
                poke.destroy();
            }
        });
    }

    shootBall(pointer) {
        const ball = this.balls.create(this.playerPos.x, this.playerPos.y, 'monster_ball');
        ball.setScale(0.1);

        // Calculate velocity
        const angle = Phaser.Math.Angle.Between(this.playerPos.x, this.playerPos.y, pointer.x, pointer.y);
        const speed = 600;

        this.physics.velocityFromRotation(angle, speed, ball.body.velocity);
    }

    spawnPokemon() {
        const keys = pokemonData.map(p => p.id);
        const randomKey = Phaser.Utils.Array.GetRandom(keys);

        // Simple spawn logic: Top or Sides
        // For vertical mobile feel, horizontal movement is best
        const startY = Phaser.Math.Between(100, this.scale.height / 2);
        const direction = Math.random() > 0.5 ? 1 : -1;
        const startX = direction === 1 ? -50 : this.scale.width + 50;

        const poke = this.pokemons.create(startX, startY, randomKey);
        poke.setScale(0.2); // Adjust scale based on original image size? Pokedex images are big.

        // Movement
        const speed = Phaser.Math.Between(100, 300);
        poke.setVelocityX(speed * direction);

        // Add some sine wave movement for fun?
        this.tweens.add({
            targets: poke,
            y: poke.y + 50,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    catchPokemon(ball, pokemon) {
        // Create fancy explosion effect
        const particles = this.add.particles(pokemon.x, pokemon.y, 'monster_ball', {
            speed: { min: 50, max: 200 },
            scale: { start: 0.1, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 800,
            quantity: 15,
            blendMode: 'ADD',
            rotate: { min: 0, max: 360 }
        });

        // Flash effect
        const circle = this.add.circle(pokemon.x, pokemon.y, 50, 0xffffff);
        this.tweens.add({
            targets: circle,
            scale: 2,
            alpha: 0,
            duration: 200,
            onComplete: () => circle.destroy()
        });

        // Score & Collection
        const pokemonId = pokemon.texture.key;
        this.events.emit('pokemonCaught', pokemonId);

        // Destroy
        ball.destroy();
        pokemon.destroy();
    }
}
