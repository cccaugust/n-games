import Phaser from 'phaser';
import { pokemonData } from '../../../data/pokemonData.js';

export default class SelectionScene extends Phaser.Scene {
    constructor() {
        super('SelectionScene');
    }

    create() {
        this.add.text(180, 50, 'パートナーをえらんでね', {
            fontSize: '24px',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Grid Layout
        const cols = 3;
        const startX = 60;
        const startY = 100;
        const gap = 120;

        pokemonData.forEach((p, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;

            const x = startX + (col * gap);
            const y = startY + (row * gap);

            // Container for interaction
            const container = this.add.container(x, y);
            container.setSize(100, 100);
            container.setInteractive(new Phaser.Geom.Rectangle(-50, -50, 100, 100), Phaser.Geom.Rectangle.Contains);

            // Background circle
            const circle = this.add.circle(0, 0, 45, 0xffffff, 0.2);
            container.add(circle);

            // Pokemon Sprite
            const sprite = this.add.image(0, 0, p.id);
            const scale = 80 / Math.max(sprite.width, sprite.height);
            sprite.setScale(scale);
            container.add(sprite);

            // Click Event
            container.on('pointerdown', () => {
                this.selectPokemon(p.id);
            });

            // Hover effect
            container.on('pointerover', () => circle.setFillStyle(0xffffff, 0.5));
            container.on('pointerout', () => circle.setFillStyle(0xffffff, 0.2));
        });
    }

    selectPokemon(id) {
        // Save selection
        localStorage.setItem('poke-care-id', id);

        // Initial Stats
        const initialStats = {
            hunger: 100,
            happiness: 100,
            energy: 100,
            xp: 0,
            level: 1
        };
        localStorage.setItem('poke-care-stats', JSON.stringify(initialStats));

        this.scene.start('MainScene', { pokemonId: id });
    }
}
