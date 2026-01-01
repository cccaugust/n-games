import Phaser from 'phaser';
import { pokemonData } from '../../data/pokemonData.js';

const CONFIG = {
    // 16:9 Aspect Ratio for better tablet fit
    width: 960,
    height: 540,
    backgroundColor: '#74b9ff',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        width: 960,
        height: 540
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1200 }, // Heavier gravity for snappy jumps
            debug: false
        }
    }
};

class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.gameState = 'TITLE'; // TITLE, PLAYING, GAMEOVER
        this.score = 0;
        this.gameSpeed = 6;
    }

    preload() {
        // Load Kamasaurus
        const kama = pokemonData.find(p => p.id === '0004');
        if (kama) {
            this.load.image('player', kama.image);
        }

        // Generate Graphics Textures (Clouds, Stars)
        // Cloud
        const cloudG = this.make.graphics({ x: 0, y: 0, add: false });
        cloudG.fillStyle(0xffffff, 0.8);
        cloudG.fillCircle(20, 20, 20);
        cloudG.fillCircle(40, 20, 25);
        cloudG.fillCircle(60, 20, 20);
        cloudG.generateTexture('cloud', 80, 50);

        // Star (Coin)
        const starG = this.make.graphics({ x: 0, y: 0, add: false });
        starG.fillStyle(0xffdd59, 1);
        starG.fillStar(15, 15, 5, 8, 15);
        starG.generateTexture('star', 30, 30);

        // Sea Texture (Gradient-ish)
        const seaCanvas = this.make.graphics({ x: 0, y: 0, add: false });
        seaCanvas.fillStyle(0x0984e3, 1);
        seaCanvas.fillRect(0, 0, 960, 100);
        seaCanvas.fillStyle(0x74b9ff, 0.3); // Wave crest
        seaCanvas.fillRect(0, 0, 960, 10);
        seaCanvas.generateTexture('sea', 960, 100);
    }

    create() {
        this.createBackgrounds();
        this.createPlayer();
        this.createUI();

        // Input Handling
        this.input.on('pointerdown', this.handleInput, this);
        this.input.keyboard.on('keydown-SPACE', this.handleInput, this);

        // Game Groups
        this.obstacles = this.physics.add.group();
        this.stars = this.physics.add.group();

        // Colliders
        this.physics.add.collider(this.player, this.seaFloor);
        this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
        this.physics.add.overlap(this.player, this.stars, this.collectStar, null, this);

        // State Init
        this.showTitle();
    }

    createBackgrounds() {
        // Sky is bg color

        // Clouds (Parallax Layer 1) - Slow
        this.clouds = this.add.tileSprite(480, 100, 960, 200, 'cloud');
        this.clouds.setAlpha(0.6);
        this.clouds.tileScaleY = 0.8;
        this.clouds.tileScaleX = 0.8;

        // Sea (Parallax Layer 2) - Fast
        // This is visual only
        this.seaVisual = this.add.tileSprite(480, 500, 960, 100, 'sea');

        // Physics Floor (Invisible)
        this.seaFloor = this.add.rectangle(480, 500, 960, 80, 0x000000, 0);
        this.physics.add.existing(this.seaFloor, true); // Static body
    }

    createPlayer() {
        this.player = this.physics.add.sprite(150, 300, 'player');
        this.player.setScale(0.6);
        this.player.setCollideWorldBounds(true);
        // Better hitbox
        this.player.body.setCircle(this.player.width * 0.35, this.player.width * 0.15, this.player.height * 0.15);
        this.player.setDepth(10);
    }

    createUI() {
        // Score
        this.scoreText = this.add.text(30, 30, 'SCORE: 0', {
            fontSize: '32px',
            fill: '#fff',
            fontFamily: 'Zen Maru Gothic',
            stroke: '#000',
            strokeThickness: 4
        }).setDepth(20);

        // Title Screen Container
        this.titleContainer = this.add.container(CONFIG.width / 2, CONFIG.height / 2).setDepth(30);
        const titleBg = this.add.rectangle(0, 0, 600, 300, 0x000000, 0.5).setInteractive();
        const titleText = this.add.text(0, -50, 'KAMA-SURF', {
            fontSize: '80px',
            fill: '#ffdd59',
            fontFamily: 'Zen Maru Gothic',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5);
        const subText = this.add.text(0, 60, 'Tap to Start!', {
            fontSize: '40px',
            fill: '#fff',
            fontFamily: 'Zen Maru Gothic'
        }).setOrigin(0.5);

        // Tween for "Tap to Start"
        this.tweens.add({
            targets: subText,
            alpha: 0.2,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        this.titleContainer.add([titleBg, titleText, subText]);

        // Game Over Container
        this.gameOverContainer = this.add.container(CONFIG.width / 2, CONFIG.height / 2).setDepth(30).setVisible(false);
        const goBg = this.add.rectangle(0, 0, 600, 300, 0x000000, 0.7).setInteractive();
        const goText = this.add.text(0, -50, 'GAME OVER', {
            fontSize: '70px',
            fill: '#ff5555',
            fontFamily: 'Zen Maru Gothic',
            stroke: '#fff',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.finalScoreText = this.add.text(0, 40, 'Score: 0', { fontSize: '40px', fill: '#fff' }).setOrigin(0.5);

        const retryText = this.add.text(0, 100, 'Tap to Retry', { fontSize: '30px', fill: '#aaa' }).setOrigin(0.5);

        this.gameOverContainer.add([goBg, goText, this.finalScoreText, retryText]);
    }

    handleInput() {
        if (this.gameState === 'TITLE') {
            this.startGame();
        } else if (this.gameState === 'PLAYING') {
            this.jump();
        } else if (this.gameState === 'GAMEOVER') {
            this.showTitle(); // Go back to title or restart immediately
        }
    }

    showTitle() {
        this.gameState = 'TITLE';
        this.titleContainer.setVisible(true);
        this.gameOverContainer.setVisible(false);
        this.scoreText.setVisible(false);

        // Reset player for title screen
        this.player.setPosition(150, 400);
        this.player.setVelocity(0, 0);
        this.player.setAngle(0);

        this.cleanupGameObjects();
    }

    startGame() {
        this.gameState = 'PLAYING';
        this.titleContainer.setVisible(false);
        this.scoreText.setVisible(true);

        // Reset Stats
        this.score = 0;
        this.gameSpeed = 6;
        this.scoreText.setText('SCORE: 0');

        this.player.setPosition(150, 300);
        this.player.setVelocity(0, 0);
        this.player.body.checkCollision.none = false; // Re-enable collision
        this.player.setTint(0xffffff);

        // Timers
        if (this.spawnEvent) this.spawnEvent.remove();
        this.spawnEvent = this.time.addEvent({
            delay: 1500,
            callback: this.spawnLogic,
            callbackScope: this,
            loop: true
        });
    }

    spawnLogic() {
        if (this.gameState !== 'PLAYING') return;

        // 70% Obstacle, 30% Star (or both)
        if (Phaser.Math.Between(0, 100) > 30) {
            this.spawnObstacle();
        }

        if (Phaser.Math.Between(0, 100) > 60) {
            // Spawn star slightly higher
            this.spawnStar();
        }
    }

    update() {
        // Parallax updates (Always move clouds a bit)
        this.clouds.tilePositionX += 0.5;

        if (this.gameState === 'PLAYING') {
            // Fast parallax
            this.seaVisual.tilePositionX += this.gameSpeed;

            // Move objects
            const killX = -100;

            this.obstacles.getChildren().forEach(obs => {
                obs.x -= this.gameSpeed;
                if (obs.x < killX) obs.destroy();
            });

            this.stars.getChildren().forEach(star => {
                star.x -= this.gameSpeed;
                if (star.x < killX) star.destroy();
            });

            // Score by distance (slowly)
            // Or just score objects? Let's do objects to encourage play. 
            // But distance is nice.
            this.score += 0.1;
            this.scoreText.setText('SCORE: ' + Math.floor(this.score));

            // Player Rotation
            if (!this.player.body.touching.down) {
                this.player.angle -= 1.5;
            } else {
                // Landing correction
                this.player.angle = Phaser.Math.Linear(this.player.angle, 0, 0.2);

                // Bobbing effect on water
                // this.player.y = this.seaFloor.y - 40 + Math.sin(this.time.now / 200) * 5; 
                // (Might conflict with physics, better leave physics alone or use setVelocityY)
            }
        }
    }

    jump() {
        if (this.player.body.touching.down) {
            this.player.setVelocityY(-700);
            this.createSplash(this.player.x, this.player.y + 30);
        }
    }

    createSplash(x, y) {
        const emitter = this.add.particles(x, y, 'sea', {
            scale: { start: 0.2, end: 0 },
            speed: { min: 100, max: 200 },
            angle: { min: 240, max: 300 },
            gravityY: 500,
            lifespan: 400,
            quantity: 5,
            blendMode: 'ADD'
        });
        emitter.explode();
    }

    spawnObstacle() {
        // Create random driftwood or rock
        const type = Phaser.Math.Between(0, 1);
        const yPos = 460; // Just above water

        let obs;
        if (type === 0) {
            // Rock
            const r = this.make.graphics({ x: 0, y: 0, add: false });
            r.fillStyle(0x636e72);
            r.fillTriangle(0, 60, 30, 0, 60, 60);
            r.generateTexture('rock', 60, 60);
            obs = this.obstacles.create(CONFIG.width + 50, yPos, 'rock');
            obs.body.setSize(40, 40);
        } else {
            // Driftwood (Platform-ish but harmful?) -> Just obstacle for now
            const w = this.make.graphics({ x: 0, y: 0, add: false });
            w.fillStyle(0x8d6e63);
            w.fillRect(0, 0, 80, 40);
            w.generateTexture('wood', 80, 40);
            obs = this.obstacles.create(CONFIG.width + 50, yPos, 'wood');
        }

        obs.body.allowGravity = false;
        obs.body.setImmovable(true);
    }

    spawnStar() {
        // High or Low star
        const isHigh = Phaser.Math.Between(0, 1) === 0;
        const yPos = isHigh ? 300 : 400; // Jump height vs Short hop

        const star = this.stars.create(CONFIG.width + 50, yPos, 'star');
        star.body.allowGravity = false;
        star.body.setCircle(15);

        // Rotating Tween
        this.tweens.add({
            targets: star,
            angle: 360,
            duration: 1000,
            repeat: -1
        });
    }

    collectStar(player, star) {
        star.destroy();
        this.score += 50;

        // Feedback Text
        const popup = this.add.text(player.x, player.y - 50, '+50', {
            fontSize: '30px',
            fill: '#ffdd59',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.tweens.add({
            targets: popup,
            y: popup.y - 50,
            alpha: 0,
            duration: 500,
            onComplete: () => popup.destroy()
        });
    }

    hitObstacle(player, obstacle) {
        this.gameState = 'GAMEOVER';
        this.physics.pause();
        this.player.setTint(0xff5555);

        this.finalScoreText.setText('Score: ' + Math.floor(this.score));
        this.gameOverContainer.setVisible(true);
    }

    cleanupGameObjects() {
        this.obstacles.clear(true, true);
        this.stars.clear(true, true);
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
