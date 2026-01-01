import Phaser from 'phaser';
import { pokemonData } from '../../data/pokemonData.js';

const CONFIG = {
    width: 600,
    height: 600,
    backgroundColor: '#34495e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        width: 600,
        height: 600
    }
};

class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.score = 0;
        this.isProcessing = false;
    }

    preload() {
        // Load all pokemon images
        pokemonData.forEach(pokemon => {
            this.load.image(pokemon.id, pokemon.image);
        });
    }

    create() {
        // UI Header
        this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '32px', fill: '#fff', fontFamily: 'Zen Maru Gothic' });

        this.questionText = this.add.text(CONFIG.width / 2, 80, 'だーれだ？', {
            fontSize: '48px',
            fill: '#ffdd59',
            fontFamily: 'Zen Maru Gothic',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Container for round elements
        this.roundContainer = this.add.container(0, 0);

        this.startRound();
    }

    startRound() {
        this.isProcessing = false;
        this.roundContainer.removeAll(true); // Clear previous round

        // 1. Pick Correct Answer
        const correctIndex = Phaser.Math.Between(0, pokemonData.length - 1);
        const correctPokemon = pokemonData[correctIndex];

        // 2. Pick 3 Distractors (unique)
        const choices = [correctPokemon];
        while (choices.length < 4) {
            const index = Phaser.Math.Between(0, pokemonData.length - 1);
            const p = pokemonData[index];
            if (!choices.includes(p)) {
                choices.push(p);
            }
        }

        // 3. Shuffle Choices
        Phaser.Utils.Array.Shuffle(choices);

        // 4. Display Silhouette
        // Center image
        const imgY = 250;
        const img = this.add.image(CONFIG.width / 2, imgY, correctPokemon.id);

        // Scale to fit nicely (max 200x200)
        // Original images might vary, so let's normalize
        const maxSize = 200;
        const scale = maxSize / Math.max(img.width, img.height);
        img.setScale(scale);

        // Apply silhouette effect
        img.setTint(0x000000);

        this.roundContainer.add(img);
        this.currentImage = img; // Reference to reveal later

        // 5. Create Buttons
        const startY = 400;
        const gap = 60;

        choices.forEach((choice, index) => {
            const isCorrect = (choice.id === correctPokemon.id);
            this.createChoiceButton(CONFIG.width / 2, startY + (index * gap), choice.name, isCorrect);
        });
    }

    createChoiceButton(x, y, text, isCorrect) {
        // Button Container
        const btnContainer = this.add.container(x, y);

        // Background
        const bg = this.add.rectangle(0, 0, 400, 50, 0xffffff)
            .setInteractive({ useHandCursor: true });

        // Text
        const label = this.add.text(0, 0, text, {
            fontSize: '24px',
            fill: '#333',
            fontFamily: 'Zen Maru Gothic'
        }).setOrigin(0.5);

        btnContainer.add([bg, label]);
        this.roundContainer.add(btnContainer);

        // Hover effect
        bg.on('pointerover', () => bg.setFillStyle(0xeeeeee));
        bg.on('pointerout', () => bg.setFillStyle(0xffffff));

        // Click effect
        bg.on('pointerdown', () => {
            this.handleAnswer(isCorrect, btnContainer, label);
        });
    }

    handleAnswer(isCorrect, btnContainer, label) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const bg = btnContainer.list[0];

        if (isCorrect) {
            // Correct Logic
            bg.setFillStyle(0x2ecc71); // Green
            label.setFill('#fff');
            this.score += 10;
            this.scoreText.setText('Score: ' + this.score);

            // Reveal Pokemon
            this.currentImage.clearTint();

            // Celebration effect
            this.tweens.add({
                targets: this.currentImage,
                scaleX: this.currentImage.scaleX * 1.2,
                scaleY: this.currentImage.scaleY * 1.2,
                yoyo: true,
                duration: 200
            });

            this.add.text(CONFIG.width / 2, 250, 'せいかい！', {
                fontSize: '64px',
                fill: '#2ecc71',
                stroke: '#fff',
                strokeThickness: 6,
                fontFamily: 'Zen Maru Gothic'
            }).setOrigin(0.5);

        } else {
            // Incorrect Logic
            bg.setFillStyle(0xe74c3c); // Red
            label.setFill('#fff');

            // Reveal anyway so they learn
            this.currentImage.clearTint();

            this.add.text(CONFIG.width / 2, 250, 'ざんねん...', {
                fontSize: '64px',
                fill: '#e74c3c',
                stroke: '#fff',
                strokeThickness: 6,
                fontFamily: 'Zen Maru Gothic'
            }).setOrigin(0.5);
        }

        // Wait and next round
        this.time.delayedCall(2000, () => {
            this.startRound();
        });
    }
}

const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: CONFIG.width,
    height: CONFIG.height,
    parent: 'game-container',
    backgroundColor: CONFIG.backgroundColor,
    scale: CONFIG.scale,
    scene: [MainScene]
});
