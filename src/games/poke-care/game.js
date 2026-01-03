import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import SelectionScene from './scenes/SelectionScene.js';
import MainScene from './scenes/MainScene.js';

function readCssPxVar(name) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

const SAFE_AREA_PX = {
  top: readCssPxVar('--safe-top'),
  right: readCssPxVar('--safe-right'),
  bottom: readCssPxVar('--safe-bottom'),
  left: readCssPxVar('--safe-left')
};

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
    backgroundColor: '#2c3e50',
    callbacks: {
      postBoot: (game) => {
        // scenes can read via: this.registry.get('safeAreaPx')
        game.registry.set('safeAreaPx', SAFE_AREA_PX);
      }
    }
};

const game = new Phaser.Game(config);
