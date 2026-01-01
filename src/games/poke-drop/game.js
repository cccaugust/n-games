import Phaser from 'phaser';
import { pokemonData } from '../../data/pokemonData.js';

const CONFIG = {
    width: 600,
    height: 800,
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            debug: false
        }
    }
};

class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.nextPokemonIndex = 0;
        this.canDrop = true;
        this.score = 0;
        this.gameOver = false;
        
        // Define sizes for each evolution stage (radius)
        // Dynamically calculate based on index to support infinite lists
        // Starts small, gets bigger
        this.sizes = pokemonData.map((_, index) => {
            return 25 + (index * 8); // 25, 33, 41, 49...
        });
    }

    preload() {
        // Load all pokemon images
        pokemonData.forEach(pokemon => {
            this.load.image(pokemon.id, pokemon.image);
        });
    }

    create() {
        // Boundaries
        this.matter.world.setBounds(0, 0, CONFIG.width, CONFIG.height, 32, true, true, false, true);

        // UI
        this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '32px', fill: '#fff' });
        
        // Input
        this.input.on('pointermove', (pointer) => {
            if (this.currentBall && !this.currentBall.isDropped && !this.gameOver) {
                let x = Phaser.Math.Clamp(pointer.x, 50, CONFIG.width - 50);
                this.currentBall.x = x;
            }
        });

        this.input.on('pointerdown', (pointer) => {
            if (this.canDrop && !this.gameOver) {
                this.dropBall();
            }
        });

        // Collision Handling
        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach((pair) => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;

                if (bodyA.gameObject && bodyB.gameObject) {
                    this.handleCollision(bodyA.gameObject, bodyB.gameObject);
                }
            });
        });

        // Spawn first ball
        this.spawnNextBall();
    }

    spawnNextBall() {
        if (this.gameOver) return;

        // Randomize next pokemon (only low level ones)
        // Limit to first 3 types to keep it playable
        const maxSpawnIndex = Math.min(3, pokemonData.length - 1);
        this.nextPokemonIndex = Phaser.Math.Between(0, maxSpawnIndex); // 0 to 3
        
        const pokemon = pokemonData[this.nextPokemonIndex];
        const radius = this.sizes[this.nextPokemonIndex];

        // Create a 'ghost' or 'preview' ball at the top
        this.currentBall = this.add.image(CONFIG.width / 2, 50, pokemon.id);
        this.currentBall.setDisplaySize(radius * 2, radius * 2);
        this.currentBall.isDropped = false;
        this.canDrop = true;
    }

    dropBall() {
        this.canDrop = false;
        this.currentBall.isDropped = true;

        // Create the actual physics object
        const x = this.currentBall.x;
        const y = this.currentBall.y;
        const index = this.nextPokemonIndex;
        const pokemon = pokemonData[index];
        const radius = this.sizes[index];

        this.currentBall.destroy(); // Remove preview

        const ball = this.matter.add.image(x, y, pokemon.id);
        ball.setCircle(radius);
        ball.setBounce(0.3);
        ball.setFriction(0.005);
        ball.setDisplaySize(radius * 2, radius * 2);
        ball.pokemonIndex = index;
        ball.pokemonId = pokemon.id;
        
        // Tag for collision
        ball.setData('type', 'pokemon');

        // Prepare next turn after a delay
        this.time.delayedCall(1000, () => {
            this.spawnNextBall();
        });
    }

    handleCollision(objA, objB) {
        // Check if both are pokemon and same type
        if (objA.pokemonIndex !== undefined && 
            objB.pokemonIndex !== undefined && 
            objA.pokemonIndex === objB.pokemonIndex) {
            
            // Allow merge only if not max level
            if (objA.pokemonIndex < pokemonData.length - 1) {
                // Ensure we handle this pair only once
                if (!objA.active || !objB.active) return;

                const newIndex = objA.pokemonIndex + 1;
                const midX = (objA.x + objB.x) / 2;
                const midY = (objA.y + objB.y) / 2;

                // Remove old bodies
                objA.destroy();
                objB.destroy();

                // Create new evolved body
                this.createNewBall(midX, midY, newIndex);

                // Score update
                this.score += (newIndex + 1) * 10;
                this.scoreText.setText('Score: ' + this.score);
            }
        }
    }

    createNewBall(x, y, index) {
        const pokemon = pokemonData[index];
        const radius = this.sizes[index];

        const ball = this.matter.add.image(x, y, pokemon.id);
        ball.setCircle(radius);
        ball.setBounce(0.3);
        ball.setFriction(0.005);
        ball.setDisplaySize(radius * 2, radius * 2);
        ball.pokemonIndex = index;
        ball.pokemonId = pokemon.id;
        
        // Add a little pop effect
        this.tweens.add({
            targets: ball,
            scaleX: { from: 0, to: (radius * 2) / ball.width }, // Adjust scale calculation
            scaleY: { from: 0, to: (radius * 2) / ball.height },
            duration: 200,
            ease: 'Back.out'
        });
    }
}

const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: CONFIG.width,
    height: CONFIG.height,
    parent: 'game-container',
    backgroundColor: CONFIG.backgroundColor,
    physics: CONFIG.physics,
    scene: [MainScene]
});
