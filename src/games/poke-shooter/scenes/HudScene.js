import Phaser from 'phaser';

export default class HudScene extends Phaser.Scene {
    constructor() {
        super('HudScene');
        this.score = 0;
        this.caughtPokemon = new Set();
        this.collectionGroup = null;
    }

    create() {
        this.scoreText = this.add.text(20, 20, 'Score: 0', {
            font: '32px sans-serif',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        });

        // Collection Label
        this.add.text(20, 70, 'Captured:', {
            font: '20px sans-serif',
            fill: '#cccccc'
        });

        this.collectionGroup = this.add.group();

        const mainScene = this.scene.get('MainScene');
        mainScene.events.on('pokemonCaught', this.handleCapture, this);
    }

    handleCapture(pokemonId) {
        // Score update
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);

        // Collection update
        if (!this.caughtPokemon.has(pokemonId)) {
            this.caughtPokemon.add(pokemonId);
            this.addIcon(pokemonId);
        }
    }

    addIcon(pokemonId) {
        const count = this.caughtPokemon.size;
        const x = 30 + (count * 40);
        const y = 110;

        // Wrap if too many
        // (Simplified for now, assuming horizontal scroll or wrap logic if needed later)

        const icon = this.add.image(x, y, pokemonId);
        icon.setDisplaySize(30, 30);

        // Pop animation
        this.tweens.add({
            targets: icon,
            scale: { from: 0, to: 30 / icon.height }, // Adjust based on original size
            duration: 300,
            ease: 'Back.out'
        });
    }

    updateScore(points) {
        // Deprecated by handleCapture, but keeping for compatibility if MainScene calls it directly
        this.score += points;
        this.scoreText.setText('Score: ' + this.score);
    }
}
