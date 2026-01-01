import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import SelectionScene from './scenes/SelectionScene.js';
import MainScene from './scenes/MainScene.js';

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 360, // Mobile portrait resolution
        height: 640
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, SelectionScene, MainScene],
    backgroundColor: '#2c3e50'
};

const game = new Phaser.Game(config);
