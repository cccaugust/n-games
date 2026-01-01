import Phaser from 'phaser';
import { pokemonData } from '../../data/pokemonData.js';

const CONFIG = {
    width: 400,
    height: 600,
    backgroundColor: '#1a1a2e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        width: 400,
        height: 600
    },
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
        // Define sizes for each evolution stage (radius)
        // Dynamically calculate based on index to support infinite lists
        // Starts small, gets bigger
        this.sizes = pokemonData.map((_, index) => {
            return 35 + (index * 10); // Check fit: Max index ~18 -> 215 radius (430 diam) > 400 width? 
            // Wait, 18 * 10 = 180 + 35 = 215. 215 * 2 = 430. Too big for 400 width.
            // Let's adjust slightly: 30 + (index * 9)
            // Index 0: 30
            // Index 10: 120
            // Index 18: 192 (Diameter 384) -> Fits tight. Good.
        });

        // Re-calculate sizes to be safe but larger
        this.sizes = pokemonData.map((_, index) => {
            return 30 + (index * 9);
        });
    }

    preload() {
        // Load all pokemon images
        pokemonData.forEach(pokemon => {
            this.load.image(pokemon.id, pokemon.image);
        });
    }

    create() {
        // Create particle texture on the fly
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('particle', 8, 8);

        // Boundaries
        this.matter.world.setBounds(0, 0, CONFIG.width, CONFIG.height, 32, true, true, false, true);

        // UI
        this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '32px', fill: '#fff', fontFamily: 'Zen Maru Gothic' });

        // NEXT Preview UI
        this.add.text(CONFIG.width - 90, 20, 'NEXT', { fontSize: '20px', fill: '#aaa', fontFamily: 'Zen Maru Gothic' });
        this.nextPreviewBg = this.add.circle(CONFIG.width - 50, 60, 30, 0xffffff, 0.1);

        // Game Over Warning Line (Dotted)
        this.warningLine = this.add.graphics();
        this.warningLineY = 150; // Y position for game over check
        this.drawWarningLine();

        // Input
        // Track pointer for moving the current ball
        this.input.on('pointermove', (pointer) => {
            if (this.currentBall && !this.currentBall.isDropped && !this.gameOver) {
                // Ensure dragging works on touch same as mouse
                if (pointer.isDown || !this.sys.game.device.os.desktop) {
                    let x = Phaser.Math.Clamp(pointer.x, 30, CONFIG.width - 30);
                    this.currentBall.x = x;
                }
            }
        });

        // Drop on pointer UP (release), not down (start)
        this.input.on('pointerup', (pointer) => {
            if (this.canDrop && !this.gameOver) {
                // Only drop if we were actually interacting
                this.dropBall();
            }
        });

        // Add visual guide line for dropping
        this.guideLine = this.add.graphics();

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

        this.events.on('update', this.update, this);
    }

    drawWarningLine() {
        this.warningLine.clear();
        this.warningLine.lineStyle(2, 0xff5555, 0.5);
        // Draw dotted line
        for (let x = 0; x < CONFIG.width; x += 20) {
            this.warningLine.moveTo(x, this.warningLineY);
            this.warningLine.lineTo(x + 10, this.warningLineY);
        }
        this.warningLine.strokePath();
    }

    update() {
        this.updateGuideLine();

        // Simple game over check logic (if any body stays above line too long)
        // For now, just visualizing the line is enough as per request
    }

    updateGuideLine() {
        this.guideLine.clear();
        if (this.currentBall && !this.currentBall.isDropped && !this.gameOver) {
            this.guideLine.lineStyle(2, 0xffffff, 0.3);
            this.guideLine.fillStyle(0xffffff, 0.1);
            this.guideLine.beginPath();
            this.guideLine.moveTo(this.currentBall.x, this.currentBall.y);
            this.guideLine.lineTo(this.currentBall.x, CONFIG.height);
            this.guideLine.strokePath();
        }
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

        // Update NEXT preview for the NEXT turn (pre-calculate)
        // Note: For now, let's just show what IS currently waiting if we don't have a queue system
        // But better: Generate the NEXT one now
        if (this.nextQueuedIndex === undefined) {
            const maxSpawnIndex = Math.min(3, pokemonData.length - 1);
            this.nextQueuedIndex = Phaser.Math.Between(0, maxSpawnIndex);
        }

        // Show the queued one in the UI
        if (this.nextPreviewSprite) this.nextPreviewSprite.destroy();
        const nextPoke = pokemonData[this.nextQueuedIndex];
        this.nextPreviewSprite = this.add.image(CONFIG.width - 50, 60, nextPoke.id);
        const nextScale = 50 / this.nextPreviewSprite.width; // Fit in 50px box
        this.nextPreviewSprite.setScale(nextScale);

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

        // Fix scaling issue:
        // 1. Calculate the scale required to reach target size
        const originalWidth = ball.width;
        const scale = (radius * 2) / originalWidth;

        // 2. Set the body to the simpler circle shape based on ORIGINAL texture size
        // Use slightly smaller radius (0.95) to allow slight visual overlap/tight packing (avoid gaps)
        ball.setCircle((originalWidth / 2) * 0.95);

        // 3. Apply scale
        ball.setScale(scale);

        ball.setBounce(0.2);
        ball.setFriction(0.005);
        ball.setFrictionAir(0.005); // Reduced air friction slightly
        ball.setDensity(0.005); // Increased density for stability

        ball.pokemonIndex = index;
        ball.pokemonId = pokemon.id;

        // Tag for collision
        ball.setData('type', 'pokemon');

        // Prepare next turn after a delay
        this.time.delayedCall(1000, () => {
            // Use the queued index for the next spawn
            this.nextPokemonIndex = this.nextQueuedIndex;

            // Generate distinct next for the queue
            const maxSpawnIndex = Math.min(3, pokemonData.length - 1);
            this.nextQueuedIndex = Phaser.Math.Between(0, maxSpawnIndex);

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

                // Particle explosion
                const emitter = this.add.particles(midX, midY, 'particle', {
                    speed: { min: 50, max: 150 },
                    scale: { start: 1, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 500,
                    gravityY: 100
                });
                emitter.explode(15);

                // Score update
                const addScore = (newIndex + 1) * 10;
                this.score += addScore;
                this.scoreText.setText('Score: ' + this.score);

                // Shake effect
                this.cameras.main.shake(100, 0.005);

                // Combo Pop-up Text
                const popup = this.add.text(midX, midY, `+${addScore}`, {
                    fontSize: '24px',
                    fill: '#ffdd59',
                    fontFamily: 'Zen Maru Gothic',
                    stroke: '#000',
                    strokeThickness: 2
                }).setOrigin(0.5);

                this.tweens.add({
                    targets: popup,
                    y: midY - 50,
                    alpha: 0,
                    duration: 800,
                    onComplete: () => popup.destroy()
                });
            }
        }
    }

    createNewBall(x, y, index) {
        const pokemon = pokemonData[index];
        const radius = this.sizes[index];

        const ball = this.matter.add.image(x, y, pokemon.id);

        const originalWidth = ball.width;
        const scale = (radius * 2) / originalWidth;

        ball.setCircle((originalWidth / 2) * 0.95);
        ball.setScale(scale);

        ball.setBounce(0.2);
        ball.setFriction(0.005);
        ball.setFrictionAir(0.005);
        ball.setDensity(0.005);

        ball.pokemonIndex = index;
        ball.pokemonId = pokemon.id;

        // Add a little pop effect (using scale property since we are scaling)
        this.tweens.add({
            targets: ball,
            scaleX: { from: 0, to: scale },
            scaleY: { from: 0, to: scale },
            duration: 400,
            ease: 'Elastic.out'
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
