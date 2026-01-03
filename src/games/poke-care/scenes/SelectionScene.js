import Phaser from 'phaser';
import { pokemonData } from '../../../data/pokemonData.js';

export default class SelectionScene extends Phaser.Scene {
    constructor() {
        super('SelectionScene');
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.page = 0;
        this.perPage = 9;
        this.cols = 3;

        this.add.text(w / 2, 44, 'パートナーをえらんでね', {
            fontSize: '24px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(w / 2, 74, 'タップでけってい（◀ ▶ でページ）', {
            fontSize: '14px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5).setAlpha(0.9);

        // Page container
        this.gridRoot = this.add.container(0, 0);

        // Navigation
        const navY = h - 56;
        this.prevBtn = this.createNavBtn(70, navY, '◀', () => this.setPage(this.page - 1));
        this.nextBtn = this.createNavBtn(w - 70, navY, '▶', () => this.setPage(this.page + 1));
        this.pageText = this.add.text(w / 2, navY, '', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);

        // Swipe navigation (mobile-friendly)
        this._swipeStart = null;
        this.input.on('pointerdown', (pointer) => {
            this._swipeStart = { x: pointer.x, y: pointer.y, t: performance.now() };
        });
        this.input.on('pointerup', (pointer) => {
            if (!this._swipeStart) return;
            const dx = pointer.x - this._swipeStart.x;
            const dy = pointer.y - this._swipeStart.y;
            const dt = performance.now() - this._swipeStart.t;
            this._swipeStart = null;
            if (dt > 600) return;
            if (Math.abs(dx) < 60) return;
            if (Math.abs(dy) > 90) return;
            if (dx < 0) this.setPage(this.page + 1);
            else this.setPage(this.page - 1);
        });

        this.setPage(0);
    }

    createNavBtn(x, y, label, onClick) {
        const bg = this.add.circle(x, y, 22, 0x000000, 0.22).setInteractive({ useHandCursor: true });
        const text = this.add.text(x, y, label, { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
        bg.on('pointerdown', () => {
            this.tweens.add({ targets: [bg, text], scale: 0.92, duration: 90, yoyo: true });
            onClick();
        });
        return { bg, text, setVisible: (v) => { bg.setVisible(v); text.setVisible(v); } };
    }

    setPage(next) {
        const totalPages = Math.max(1, Math.ceil((pokemonData?.length || 0) / this.perPage));
        this.page = Phaser.Math.Clamp(next, 0, totalPages - 1);
        this.renderPage();
        this.pageText.setText(`${this.page + 1} / ${totalPages}`);
        this.prevBtn.setVisible(this.page > 0);
        this.nextBtn.setVisible(this.page < totalPages - 1);
    }

    renderPage() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.gridRoot.removeAll(true);

        const start = this.page * this.perPage;
        const end = start + this.perPage;
        const list = (pokemonData || []).slice(start, end);

        const rows = 3;
        const top = 110;
        const bottom = h - 110;
        const gridH = Math.max(200, bottom - top);
        const cellW = w / this.cols;
        const cellH = gridH / rows;

        list.forEach((p, index) => {
            const row = Math.floor(index / this.cols);
            const col = index % this.cols;

            const x = (cellW * col) + (cellW / 2);
            const y = top + (cellH * row) + (cellH / 2) - 8;

            const container = this.add.container(x, y);
            container.setSize(cellW, cellH);

            const hitW = Math.min(116, cellW - 10);
            const hitH = Math.min(124, cellH - 10);
            container.setInteractive(new Phaser.Geom.Rectangle(-hitW / 2, -hitH / 2, hitW, hitH), Phaser.Geom.Rectangle.Contains);

            const circle = this.add.circle(0, -8, 44, 0xffffff, 0.18);
            container.add(circle);

            const sprite = this.add.image(0, -8, p.id);
            const scale = 78 / Math.max(sprite.width, sprite.height);
            sprite.setScale(scale);
            container.add(sprite);

            const name = this.add.text(0, 46, p.name || `No.${p.id}`, {
                fontSize: '12px',
                color: '#ffffff',
                align: 'center'
            }).setOrigin(0.5);
            name.setWordWrapWidth(cellW - 16, true);
            container.add(name);

            container.on('pointerdown', () => this.selectPokemon(p.id));
            container.on('pointerover', () => circle.setFillStyle(0xffffff, 0.34));
            container.on('pointerout', () => circle.setFillStyle(0xffffff, 0.18));

            this.gridRoot.add(container);
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
