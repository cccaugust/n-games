import Phaser from 'phaser';
import { resolvePath } from '../../../js/config.js';
import { requireAuth } from '../../../js/auth.js';

requireAuth();

const backLink = document.querySelector('.back-link');
if (backLink) {
    backLink.href = resolvePath('/debug/index.html');
}

// Default Actions (Timelines)
const defaultAnims = [
    { key: 'idle', name: 'Wait / Idle', fps: 8 },
    { key: 'walk', name: 'Walk', fps: 8 },
    { key: 'attack', name: 'Attack', fps: 12 },
    { key: 'damage', name: 'Damage', fps: 8 },
    { key: 'jump', name: 'Jump', fps: 4 },
    { key: 'crouch', name: 'Crouch', fps: 4 }
];

class EmulatorScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EmulatorScene' });
        this.sprite = null;
        this.currentTextureKey = null;
        this.gridGraphics = null;
    }

    create() {
        this.createGrid();
        this.cameras.main.centerOn(0, 0);
        this.add.text(0, -100, 'Preview Area', { fontSize: '16px', color: '#666' }).setOrigin(0.5);

        window.addEventListener('emulator-play-anim', (e) => this.playAnim(e.detail));
        window.addEventListener('emulator-load-image', (e) => this.loadImage(e.detail));

        this.scale.on('resize', this.resize, this);
    }

    createGrid() {
        if (this.gridGraphics) this.gridGraphics.destroy();
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x333333);
        const size = 2000;
        const step = 50;
        for (let x = -size; x <= size; x += step) {
            graphics.moveTo(x, -size);
            graphics.lineTo(x, size);
        }
        for (let y = -size; y <= size; y += step) {
            graphics.moveTo(-size, y);
            graphics.lineTo(size, y);
        }
        graphics.lineStyle(2, 0x555555);
        graphics.moveTo(-size, 0);
        graphics.lineTo(size, 0);
        graphics.moveTo(0, -size);
        graphics.lineTo(0, size);
        graphics.strokePath();
        this.gridGraphics = graphics;
    }

    loadImage({ dataUrl, frameWidth, frameHeight }) {
        const key = 'sprite-sheet-' + Date.now();
        this.currentTextureKey = key;

        const loader = this.load;
        loader.spritesheet(key, dataUrl, {
            frameWidth: frameWidth,
            frameHeight: frameHeight
        });

        loader.once(Phaser.Loader.Events.COMPLETE, () => {
            this.createSprite(key);
        });

        loader.start();
    }

    createSprite(key) {
        if (this.sprite) this.sprite.destroy();
        this.sprite = this.add.sprite(0, 0, key, 0);
        // Ensure 1x scale as requested
        this.sprite.setScale(1);
        this.cameras.main.centerOn(0, 0);
    }

    playAnim({ key, frames, fps, loop }) {
        if (!this.sprite || !this.currentTextureKey) return;

        const animKey = `${this.currentTextureKey}-${key}`;

        const animConfig = {
            key: animKey,
            frames: this.anims.generateFrameNumbers(this.currentTextureKey, { frames: frames }),
            frameRate: fps,
            repeat: loop ? -1 : 0
        };

        if (this.anims.exists(animKey)) {
            this.anims.remove(animKey);
        }
        this.anims.create(animConfig);
        this.sprite.play(animKey);
    }

    resize(gameSize) {
        this.cameras.main.setSize(gameSize.width, gameSize.height);
    }
}

// --- UI Logic & Slicing ---

let currentImageObj = null;

function initUI() {
    renderAnimList();

    // File Upload
    document.getElementById('spriteUpload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                currentImageObj = img;
                // Auto update? Maybe wait for button click.
                // sliceFrames(); 
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Update / Slice
    document.getElementById('applyGridBtn').addEventListener('click', () => {
        if (currentImageObj) {
            sliceFrames();
            // Also notify Phaser
            const frameWidth = parseInt(document.getElementById('frameWidth').value) || 32;
            const frameHeight = parseInt(document.getElementById('frameHeight').value) || 32;
            window.dispatchEvent(new CustomEvent('emulator-load-image', {
                detail: {
                    dataUrl: currentImageObj.src,
                    frameWidth,
                    frameHeight
                }
            }));
        }
    });
}

function renderAnimList() {
    const list = document.getElementById('anim-list');
    list.innerHTML = '';

    defaultAnims.forEach((anim) => {
        const div = document.createElement('div');
        div.className = 'anim-item';
        div.dataset.key = anim.key;
        div.innerHTML = `
            <div class="anim-header">
                <span class="anim-title">${anim.name}</span>
            </div>
            <div class="anim-timeline drop-zone" data-key="${anim.key}"></div>
            <div class="row" style="margin-top:5px">
                <div class="col"><label style="font-size:0.7em">FPS</label><input type="number" class="anim-fps" value="${anim.fps}"></div>
                <div class="col" style="display:flex; align-items:end"><button class="play-btn">▶ Play</button></div>
            </div>
        `;

        setupDropZone(div.querySelector('.drop-zone'));

        const btn = div.querySelector('.play-btn');
        btn.onclick = () => {
            const fps = parseInt(div.querySelector('.anim-fps').value);
            const timeline = div.querySelector('.drop-zone');
            // Collect frame indices from timeline
            const frameIndices = Array.from(timeline.children).map(child => parseInt(child.dataset.index));

            if (frameIndices.length === 0) return;

            window.dispatchEvent(new CustomEvent('emulator-play-anim', {
                detail: {
                    key: anim.key,
                    frames: frameIndices,
                    fps: fps,
                    loop: true
                }
            }));
        };

        list.appendChild(div);
    });
}

function sliceFrames() {
    const frameWidth = parseInt(document.getElementById('frameWidth').value) || 32;
    const frameHeight = parseInt(document.getElementById('frameHeight').value) || 32;
    const container = document.getElementById('source-frames-container');
    container.innerHTML = '';

    const cols = Math.floor(currentImageObj.width / frameWidth);
    const rows = Math.floor(currentImageObj.height / frameHeight);
    let index = 0;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            // Cut canvas
            const canvas = document.createElement('canvas');
            canvas.width = frameWidth;
            canvas.height = frameHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(currentImageObj, x * frameWidth, y * frameHeight, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

            const frameDiv = document.createElement('div');
            frameDiv.className = 'frame-item';
            frameDiv.draggable = true;
            frameDiv.dataset.index = index;
            frameDiv.style.backgroundImage = `url(${canvas.toDataURL()})`;
            frameDiv.style.backgroundSize = 'contain';

            frameDiv.addEventListener('dragstart', handleDragStart);

            container.appendChild(frameDiv);
            index++;
        }
    }
}

// Drag and Drop Logic
function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.index);
    e.dataTransfer.setData('image-src', e.target.style.backgroundImage); // Keep background for visual
    e.dataTransfer.effectAllowed = 'copy';
}

function setupDropZone(el) {
    el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        el.classList.add('drag-over');
    });

    el.addEventListener('dragleave', () => {
        el.classList.remove('drag-over');
    });

    el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const frameIndex = e.dataTransfer.getData('text/plain');

        // Find source image to copy style
        // For simplicity, we can regenerate it or pass it. 
        // We can just grab it from the source container by index since we know it exists.
        const sourceFrame = document.querySelector(`.frame-item[data-index="${frameIndex}"]`);
        if (!sourceFrame) return;

        const newItem = document.createElement('div');
        newItem.className = 'timeline-frame';
        newItem.style.backgroundImage = sourceFrame.style.backgroundImage;
        newItem.dataset.index = frameIndex;

        // Remove button
        const removeBtn = document.createElement('div');
        removeBtn.className = 'remove-btn';
        removeBtn.innerText = 'x';
        removeBtn.onclick = () => newItem.remove();
        newItem.appendChild(removeBtn);

        el.appendChild(newItem);
    });
}

// Init Phaser
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
    },
    backgroundColor: '#111',
    pixelArt: true,
    scene: EmulatorScene
};

new Phaser.Game(config);
initUI();
