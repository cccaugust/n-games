import Phaser from 'phaser';
import { pokemonData } from '../../../data/pokemonData.js';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
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

        if (savedPokemonId) {
            this.scene.start('MainScene', { pokemonId: savedPokemonId });
        } else {
            this.scene.start('SelectionScene');
        }
    }
}
