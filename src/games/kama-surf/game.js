import Phaser from 'phaser';
import { pokemonData } from '../../data/pokemonData.js';

const CONFIG = {
    width: 800,
    height: 450,
    backgroundColor: '#74b9ff',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        width: 800,
        height: 450
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    }
};

class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.score = 0;
        this.gameOver = false;
        this.gameSpeed = 5;
    }

    preload() {
        // Load Kamasaurus image
        const kama = pokemonData.find(p => p.id === '0004');
        if (kama) {
            this.load.image('player', kama.image);
        }
    }

    create() {
        this.gameOver = false;
        this.score = 0;
        this.gameSpeed = 5;

        // Create Sea (Graphics)
        const seaGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        seaGraphics.fillStyle(0x0984e3, 1);
        seaGraphics.fillRect(0, 0, 800, 100);
        seaGraphics.generateTexture('sea', 800, 100);

        // Add Sea (Physics floor)
        this.sea = this.add.tileSprite(400, 400, 800, 100, 'sea');
        this.physics.add.existing(this.sea);
        this.sea.body.setImmovable(true);
        this.sea.body.allowGravity = false;

        // Player
        this.player = this.physics.add.sprite(100, 300, 'player');
        this.player.setScale(0.5); // Adjust size
        this.player.setCollideWorldBounds(true);
        // Slightly smaller hitbox
        this.player.body.setSize(this.player.width * 0.7, this.player.height * 0.7);

        // Obstacles Group
        this.obstacles = this.physics.add.group();

        // Colliders
        this.physics.add.collider(this.player, this.sea);
        this.physics.add.collider(this.player, this.obstacles, this.hitObstacle, null, this);

        // Inputs
        this.input.on('pointerdown', this.jump, this);
        this.input.keyboard.on('keydown-SPACE', this.jump, this);

        // UI
        this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '32px', fill: '#fff', fontFamily: 'Zen Maru Gothic' });
        this.gameOverText = this.add.text(CONFIG.width / 2, CONFIG.height / 2, 'GAME OVER\nClick to Restart', {
            fontSize: '48px',
            fill: '#fff',
            fontFamily: 'Zen Maru Gothic',
            align: 'center',
            stroke: '#000',
            strokeThickness: 5
        }).setOrigin(0.5).setVisible(false);

        // Spawn Timer
        this.spawnTimer = this.time.addEvent({
            delay: 1500,
            callback: this.spawnObstacle,
            callbackScope: this,
            loop: true
        });
    }

    update() {
        if (this.gameOver) return;

        // Scroll sea
        this.sea.tilePositionX += this.gameSpeed;

        // Move obstacles
        this.obstacles.getChildren().forEach(obstacle => {
            obstacle.x -= this.gameSpeed;
            if (obstacle.x < -50) {
                obstacle.destroy();
                this.score += 10;
                this.scoreText.setText('Score: ' + this.score);

                // Increase speed slightly
                if (this.score % 50 === 0) {
                    this.gameSpeed += 0.5;
                }
            }
        });

        // Rotation effect on jump
        if (!this.player.body.touching.down) {
            this.player.angle -= 2;
        } else {
            this.player.angle = 0;
        }
    }

    jump() {
        if (this.gameOver) {
            this.scene.restart();
            return;
        }

        if (this.player.body.touching.down) {
            this.player.setVelocityY(-600);

            // Splash effect
            const particles = this.add.particles(this.player.x, this.player.y + 50, 'sea', { // Reuse sea texture for color
                speed: { min: 50, max: 150 },
                angle: { min: 200, max: 340 },
                scale: { start: 0.1, end: 0 },
                lifespan: 300,
                blendMode: 'ADD'
            });
            particles.explode(10);
            // Auto destroy particles? Phaser 3 particles are emitters. 
            // In v3.60+ 'explode' works on emitter.
            // We can just create a temporary emitter or manager.
            // Simplified:
            // this.add.circle(this.player.x, this.player.y+50, 10, 0xffffff) ... animation
        }
    }

    spawnObstacle() {
        if (this.gameOver) return;

        // Create random obstacle (Rock)
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x636e72, 1);
        g.fillTriangle(0, 50, 25, 0, 50, 50); // Sharp rock
        g.generateTexture('rock', 50, 50);

        // Spawn range
        const obstacle = this.obstacles.create(CONFIG.width + 50, 360, 'rock'); // Adjust Y to sit on sea
        obstacle.body.allowGravity = false;
        obstacle.body.setImmovable(true);
        // Size
        const scale = Phaser.Math.FloatBetween(0.8, 1.2);
        obstacle.setScale(scale);
    }

    hitObstacle(player, obstacle) {
        this.physics.pause();
        this.gameOver = true;
        this.player.setTint(0xff0000);
        this.gameOverText.setVisible(true);
        this.spawnTimer.remove();
    }
}

const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: CONFIG.width,
    height: CONFIG.height,
    parent: 'game-container',
    backgroundColor: CONFIG.backgroundColor,
    scale: CONFIG.scale,
    physics: CONFIG.physics,
    scene: [MainScene]
});
