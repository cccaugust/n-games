import Phaser from 'phaser';
import { pokemonData } from '../../../data/pokemonData.js';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // Load Pokemon Images
        pokemonData.forEach(pokemon => {
            this.load.image(pokemon.id, pokemon.image);
        });

        // Load Game Assets
        // NOTE:
        // Use import.meta.url so Vite bundles/copies these assets correctly for production.
        // (Plain './assets/...' can break on GitHub Pages build output.)
        this.load.image('monster_ball', new URL('../assets/monster_ball.png', import.meta.url).href);
        this.load.image('background', new URL('../assets/background.png', import.meta.url).href);
        this.load.image('heart', new URL('../assets/heart.png', import.meta.url).href);
    }

    create() {
        this.scene.start('MainScene');
        this.scene.launch('HudScene');
    }
}
