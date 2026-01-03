import Phaser from 'phaser';
import { pokemonData } from '../../../data/pokemonData.js';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const w = this.scale.width;
        const h = this.scale.height;

        const title = this.add.text(w / 2, h / 2 - 40, 'ポケモンのおせわ', {
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const loadingText = this.add.text(w / 2, h / 2 - 6, 'よみこみ中…', {
            fontSize: '16px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const box = this.add.graphics();
        box.fillStyle(0x000000, 0.25);
        box.fillRoundedRect(w * 0.12, h / 2 + 20, w * 0.76, 18, 9);
        box.lineStyle(1, 0xffffff, 0.2);
        box.strokeRoundedRect(w * 0.12, h / 2 + 20, w * 0.76, 18, 9);

        const bar = this.add.graphics();
        const drawProgress = (value) => {
            bar.clear();
            bar.fillStyle(0xffffff, 0.9);
            bar.fillRoundedRect(w * 0.12, h / 2 + 20, (w * 0.76) * value, 18, 9);
        };

        this.load.on('progress', drawProgress);
        this.load.on('complete', () => {
            bar.destroy();
            box.destroy();
            loadingText.destroy();
            title.destroy();
        });
        this.load.on('loaderror', (file) => {
            // eslint-disable-next-line no-console
            console.warn('[poke-care] asset load error:', file?.key, file?.src);
            loadingText.setText('よみこみ失敗…（もう一度ためしてね）');
        });

        // Load Pokemon Images
        pokemonData.forEach(p => {
            this.load.image(p.id, p.image);
        });

        // Load Icons (using emojis or placeholders if no assets yet, 
        // but for now let's use some simple shapes or check if we have shared assets)
        // We can use the 'monster_ball' from poke-shooter if we want.
        // For UI, we might just draw shapes or use text for now.
    }

    create() {
        // Create a flare texture programmatically
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('flare', 8, 8);

        // Check if we have a saved Pokemon
        const savedPokemonId = localStorage.getItem('poke-care-id');
        const isValidId = !!pokemonData.find((p) => p.id === savedPokemonId);

        if (savedPokemonId && isValidId) {
            this.scene.start('MainScene', { pokemonId: savedPokemonId });
        } else {
            if (savedPokemonId && !isValidId) {
                localStorage.removeItem('poke-care-id');
                localStorage.removeItem('poke-care-stats');
            }
            this.scene.start('SelectionScene');
        }
    }
}
