import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MainScene from './scenes/MainScene.js';
import HudScene from './scenes/HudScene.js';
// import CollectionScene from './scenes/CollectionScene.js';

const config = {
    type: Phaser.AUTO,
    scale: {
        // Match the actual viewport size to avoid letterboxing issues on mobile.
        // (We handle responsive positioning/sizing inside scenes on resize.)
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 720,
        height: 1280
    },
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [BootScene, MainScene, HudScene]
};

const game = new Phaser.Game(config);
