import Phaser from 'phaser';
import { pokemonData } from '../../../data/pokemonData.js';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    init(data) {
        this.pokemonId = data.pokemonId;
        this.goalLevel = 5;
        this.stats = JSON.parse(localStorage.getItem('poke-care-stats')) || {
            hunger: 100,
            happiness: 100,
            energy: 100,
            xp: 0,
            level: 1
        };
        this.stats = this.clampStats(this.stats);
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        this.safe = this.getSafeInsetsInGame();

        // Background
        this.add.rectangle(0, 0, w, h, 0xfdf2e9).setOrigin(0);
        this.add.rectangle(0, 0, w, 90, 0x2c3e50, 0.18).setOrigin(0);

        // Calculate Position
        const centerX = w / 2;
        const centerY = h / 2 + 10;

        const pokeMeta = pokemonData.find((p) => p.id === this.pokemonId);
        const pokeName = pokeMeta?.name || `No.${this.pokemonId}`;
        this.headerName = this.add.text(centerX, 18 + this.safe.top, pokeName, { fontSize: '22px', color: '#111827', fontStyle: 'bold' }).setOrigin(0.5, 0);
        this.headerHint = this.add.text(centerX, 46 + this.safe.top, 'タップで なでる', { fontSize: '14px', color: '#374151' }).setOrigin(0.5, 0);

        // Pokemon Sprite
        this.pokemon = this.add.image(centerX, centerY, this.pokemonId);
        this.pokemon.setScale(0.8); // Make it big

        // Idle Animation (Tween)
        this.tweens.add({
            targets: this.pokemon,
            y: centerY - 10,
            scaleY: 0.85,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // UI Layer
        this.createUI();
        this.updateUI();

        // Interaction
        this.pokemon.setInteractive();
        this.pokemon.on('pointerdown', () => {
            this.petPokemon();
        });

        // Loop for stats decay
        this.time.addEvent({
            delay: 5000, // Every 5 seconds
            callback: this.decayStats,
            callbackScope: this,
            loop: true
        });

        // One-time tutorial (first run only)
        const done = localStorage.getItem('poke-care-tutorial-done') === '1';
        if (!done) {
            this.showToast('えさ🍎・あそぶ⚽・ねる💤 で そだてよう！');
            localStorage.setItem('poke-care-tutorial-done', '1');
        }

        // Re-layout on resize / orientation change
        this.scale.on('resize', () => {
            this.safe = this.getSafeInsetsInGame();
            this.layoutUI();
        });
    }

    createUI() {
        const w = this.scale.width;
        const h = this.scale.height;

        // Top HUD panel
        this.hudPanel = this.add.rectangle(w / 2, 118, w - 24, 140, 0xffffff, 0.82);
        this.hudPanel.setStrokeStyle(1, 0x000000, 0.08);
        this.hudPanel.setOrigin(0.5);

        this.levelText = this.add.text(22, 74, '', { fontSize: '22px', color: '#111827', fontStyle: 'bold' });
        this.xpText = this.add.text(22, 100, '', { fontSize: '12px', color: '#374151' });

        this.xpBarBg = this.add.rectangle(22, 120, w - 68, 10, 0x111827, 0.08).setOrigin(0, 0.5);
        this.xpBarFill = this.add.rectangle(22, 120, 10, 10, 0x8b5cf6, 1).setOrigin(0, 0.5);

        this.statRows = {
            hunger: this.createStatRow(144, 'おなか', '🍖', 0xf59e0b),
            happiness: this.createStatRow(172, 'きげん', '😊', 0xef4444),
            energy: this.createStatRow(200, 'げんき', '⚡', 0x10b981)
        };

        // Bottom Bar - Actions
        this.actionBarY = h - 78;
        this.actionBarBg = this.add.rectangle(w / 2, this.actionBarY, w - 24, 86, 0xffffff, 0.9);
        this.actionBarBg.setStrokeStyle(1, 0x000000, 0.06);

        this.actionBtns = {
            feed: this.createActionBtn(62, this.actionBarY - 10, '🍎', 'えさ', 0x3b82f6, () => this.feedPokemon()),
            play: this.createActionBtn(w / 2, this.actionBarY - 10, '⚽', 'あそぶ', 0xf59e0b, () => this.playPokemon()),
            sleep: this.createActionBtn(w - 62, this.actionBarY - 10, '💤', 'ねる', 0x10b981, () => this.sleepPokemon())
        };

        // Partner change
        this.changeBtn = this.add.text(w - 12, 72, 'パートナー変更', { fontSize: '12px', color: '#6b7280' })
            .setOrigin(1, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                localStorage.removeItem('poke-care-id');
                localStorage.removeItem('poke-care-stats');
                this.scene.start('SelectionScene');
            });

        this.layoutUI();
    }

    layoutUI() {
        const w = this.scale.width;
        const h = this.scale.height;

        // Header
        if (this.headerName) this.headerName.setPosition(w / 2, 18 + this.safe.top);
        if (this.headerHint) this.headerHint.setPosition(w / 2, 46 + this.safe.top);

        // Top HUD block (push down if notch overlaps canvas)
        const hudTop = 74 + this.safe.top;
        const panelCenterY = 118 + this.safe.top;
        this.hudPanel.setPosition(w / 2, panelCenterY);
        this.levelText.setPosition(22, hudTop);
        this.xpText.setPosition(22, hudTop + 26);
        this.xpBarBg.setPosition(22, hudTop + 46);
        this.xpBarFill.setPosition(22, hudTop + 46);

        this.setStatRowPos(this.statRows.hunger, hudTop + 70);
        this.setStatRowPos(this.statRows.happiness, hudTop + 98);
        this.setStatRowPos(this.statRows.energy, hudTop + 126);

        // Bottom action bar (lift above home indicator if it overlaps the canvas)
        this.actionBarY = h - 78 - this.safe.bottom;
        this.actionBarBg.setPosition(w / 2, this.actionBarY);
        // Reposition buttons (caption is inside the helper, so rebuild is easiest)
        // Keep existing buttons but move their internal display objects by offsetting group
        // (We created them as independent objects, so we adjust by known coordinates)
        const btnY = this.actionBarY - 10;
        this._repositionActionBtn(this.actionBtns.feed, 62, btnY);
        this._repositionActionBtn(this.actionBtns.play, w / 2, btnY);
        this._repositionActionBtn(this.actionBtns.sleep, w - 62, btnY);

        // Change button
        this.changeBtn.setPosition(w - 12, 72 + this.safe.top);

        // If toast exists, keep it above action bar
        if (this._toast) {
            const toastY = this.actionBarY - 104;
            this._toast.bg.setPosition(w / 2, toastY);
            this._toast.text.setPosition(w / 2, toastY);
        }
    }

    setStatRowPos(row, y) {
        const w = this.scale.width;
        const x = 22;
        row.name.setPosition(x, y);
        row.valueText.setPosition(w - 22, y);
        row.barBg.setPosition(x + 74, y);
        row.barFill.setPosition(x + 74, y);
    }

    _repositionActionBtn(btn, x, y) {
        // This object currently only exposes setEnabled; we can still move via internal references
        // by duck-typing known properties if present (older instances won't have them).
        if (!btn) return;
        if (btn.circle) btn.circle.setPosition(x, y);
        if (btn.text) btn.text.setPosition(x, y - 2);
        if (btn.caption) btn.caption.setPosition(x, y + 30);
    }

    createStatRow(y, label, icon, color) {
        const w = this.scale.width;
        const x = 22;
        const name = this.add.text(x, y, `${icon} ${label}`, { fontSize: '12px', color: '#374151' }).setOrigin(0, 0.5);
        const valueText = this.add.text(w - 22, y, '0', { fontSize: '12px', color: '#111827' }).setOrigin(1, 0.5);
        const barBg = this.add.rectangle(x + 74, y, w - 170, 10, 0x111827, 0.08).setOrigin(0, 0.5);
        const barFill = this.add.rectangle(x + 74, y, 10, 10, color, 1).setOrigin(0, 0.5);
        return { name, valueText, barBg, barFill, color };
    }

    createActionBtn(x, y, emoji, label, color, callback) {
        const circle = this.add.circle(x, y, 28, color, 1).setInteractive({ useHandCursor: true });
        const text = this.add.text(x, y - 2, emoji, { fontSize: '30px' }).setOrigin(0.5);
        const caption = this.add.text(x, y + 30, label, { fontSize: '12px', color: '#111827' }).setOrigin(0.5);

        circle.on('pointerdown', () => {
            this.tweens.add({ targets: [circle, text], scale: 0.92, duration: 90, yoyo: true });
            callback();
        });

        return {
            circle,
            text,
            caption,
            setEnabled: (enabled) => {
                circle.setAlpha(enabled ? 1 : 0.35);
                text.setAlpha(enabled ? 1 : 0.35);
                caption.setAlpha(enabled ? 1 : 0.35);
                circle.disableInteractive();
                if (enabled) circle.setInteractive({ useHandCursor: true });
            }
        };
    }

    updateUI() {
        this.stats = this.clampStats(this.stats);

        const xpNeeded = this.getXpNeeded();
        this.levelText.setText(`Lv.${this.stats.level}`);
        this.xpText.setText(`おせわポイント: ${this.stats.xp} / ${xpNeeded}（Lv.${this.goalLevel}でクリア）`);

        const xpRatio = xpNeeded <= 0 ? 0 : Phaser.Math.Clamp(this.stats.xp / xpNeeded, 0, 1);
        this.xpBarFill.width = Math.max(6, (this.xpBarBg.width) * xpRatio);

        this.setStatUI(this.statRows.hunger, this.stats.hunger);
        this.setStatUI(this.statRows.happiness, this.stats.happiness);
        this.setStatUI(this.statRows.energy, this.stats.energy);

        // Enable/disable action buttons
        this.actionBtns.play.setEnabled(this.stats.energy >= 10 && this.stats.hunger > 0);
        this.actionBtns.feed.setEnabled(this.stats.hunger < 100);
        this.actionBtns.sleep.setEnabled(this.stats.energy < 100);

        // Save
        localStorage.setItem('poke-care-stats', JSON.stringify(this.stats));
    }

    setStatUI(row, value) {
        const v = Phaser.Math.Clamp(Math.floor(value), 0, 100);
        row.valueText.setText(`${v}`);
        row.barFill.width = Math.max(6, row.barBg.width * (v / 100));
        // Danger tint when low
        if (v <= 20) row.barFill.setFillStyle(0xef4444, 1);
        else row.barFill.setFillStyle(row.color, 1);
    }

    clampStats(stats) {
        const s = { ...stats };
        s.hunger = Phaser.Math.Clamp(Number(s.hunger ?? 100), 0, 100);
        s.happiness = Phaser.Math.Clamp(Number(s.happiness ?? 100), 0, 100);
        s.energy = Phaser.Math.Clamp(Number(s.energy ?? 100), 0, 100);
        s.level = Math.max(1, Number(s.level ?? 1));
        s.xp = Math.max(0, Number(s.xp ?? 0));
        return s;
    }

    getXpNeeded() {
        return this.stats.level * 20;
    }

    petPokemon() {
        this.stats.happiness = Math.min(100, this.stats.happiness + 5);
        this.stats.xp += 1;
        this.checkLevelUp();
        this.updateUI();

        // Emote
        this.showEmote('❤️');

        // Jump
        this.tweens.add({
            targets: this.pokemon,
            y: this.pokemon.y - 30,
            duration: 200,
            yoyo: true
        });
    }

    feedPokemon() {
        if (this.stats.hunger >= 100) {
            this.showEmote('🫶');
            this.showToast('もう いっぱい！');
            return;
        }
        this.stats.hunger = Math.min(100, this.stats.hunger + 20);
        this.stats.xp += 2;
        this.checkLevelUp();
        this.updateUI();
        this.showEmote('😋');
    }

    playPokemon() {
        if (this.stats.hunger <= 0) {
            this.showEmote('🍖');
            this.showToast('おなかペコペコ… えさをあげよう');
            return;
        }
        if (this.stats.energy < 10) {
            this.showEmote('😴');
            this.showToast('つかれた… ねよう');
            return;
        }
        this.stats.happiness = Math.min(100, this.stats.happiness + 15);
        this.stats.energy = Math.max(0, this.stats.energy - 10);
        this.stats.hunger = Math.max(0, this.stats.hunger - 5);
        this.stats.xp += 5;
        this.checkLevelUp();
        this.updateUI();
        this.showEmote('🎵');
    }

    sleepPokemon() {
        if (this.stats.energy >= 100) {
            this.showEmote('✨');
            this.showToast('もう げんき！');
            return;
        }
        this.stats.energy = 100;
        this.updateUI();
        this.showEmote('💤');

        // Darken room briefly
        const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.5).setOrigin(0);
        this.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: 1000,
            delay: 500,
            onComplete: () => overlay.destroy()
        });
    }

    decayStats() {
        this.stats.hunger = Math.max(0, this.stats.hunger - 1);
        this.stats.happiness = Math.max(0, this.stats.happiness - 1);
        this.stats.energy = Math.max(0, this.stats.energy - 0.5);
        this.updateUI();

        if (this.stats.hunger === 0) this.showToast('おなかがすいた…');
        if (this.stats.energy === 0) this.showToast('つかれた…');
    }

    checkLevelUp() {
        const xpNeeded = this.getXpNeeded();
        if (this.stats.xp >= xpNeeded) {
            this.stats.level++;
            this.stats.xp = 0;
            this.showEmote('🆙');

            // Celebration effect
            const particles = this.add.particles(0, 0, 'flare');
            const emitter = particles.createEmitter({
                speed: { min: 60, max: 180 },
                scale: { start: 1, end: 0 },
                blendMode: 'ADD',
                lifespan: 550,
                gravityY: 120,
                quantity: 18
            });
            emitter.explode(24, this.pokemon.x, this.pokemon.y - 40);
            this.time.delayedCall(700, () => particles.destroy());

            if (this.stats.level >= this.goalLevel) {
                this.showWin();
            } else {
                this.showToast(`レベルアップ！ Lv.${this.stats.level}`);
            }
        }
    }

    showWin() {
        const w = this.scale.width;
        const h = this.scale.height;
        const overlay = this.add.rectangle(0, 0, w, h, 0x000000, 0.55).setOrigin(0);
        const box = this.add.rectangle(w / 2, h / 2, w - 48, 180, 0xffffff, 0.98);
        box.setStrokeStyle(1, 0x000000, 0.08);
        const title = this.add.text(w / 2, h / 2 - 50, 'クリア！', { fontSize: '28px', color: '#111827', fontStyle: 'bold' }).setOrigin(0.5);
        const msg = this.add.text(w / 2, h / 2 - 18, `なかよしレベル Lv.${this.goalLevel} になったよ！`, { fontSize: '14px', color: '#374151', align: 'center' })
            .setOrigin(0.5);
        const hint = this.add.text(w / 2, h / 2 + 30, 'このまま つづけてもOK！\n（パートナー変更もできるよ）', { fontSize: '12px', color: '#6b7280', align: 'center' })
            .setOrigin(0.5);

        const ok = this.add.text(w / 2, h / 2 + 78, 'つづける', { fontSize: '16px', color: '#ffffff', backgroundColor: '#6C5CE7', padding: { x: 16, y: 10 } })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                overlay.destroy();
                box.destroy();
                title.destroy();
                msg.destroy();
                hint.destroy();
                ok.destroy();
            });
    }

    showEmote(emoji) {
        const text = this.add.text(this.pokemon.x + 50, this.pokemon.y - 50, emoji, { fontSize: '40px' });
        this.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    showToast(message) {
        const w = this.scale.width;
        const y = this.actionBarY ? (this.actionBarY - 104) : (this.scale.height - 182);
        if (this._toast) {
            this._toast.bg.destroy();
            this._toast.text.destroy();
            this._toast = null;
        }
        const bg = this.add.rectangle(w / 2, y, w - 40, 34, 0x111827, 0.78);
        bg.setStrokeStyle(1, 0xffffff, 0.12);
        const text = this.add.text(w / 2, y, message, { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
        this._toast = { bg, text };
        this.tweens.add({
            targets: [bg, text],
            alpha: 0,
            duration: 280,
            delay: 1400,
            onComplete: () => {
                bg.destroy();
                text.destroy();
                this._toast = null;
            }
        });
    }

    getSafeInsetsInGame() {
        const safe = this.registry.get('safeAreaPx') || { top: 0, bottom: 0, left: 0, right: 0 };
        const canvas = this.sys.game?.canvas;
        if (!canvas) return { top: 0, bottom: 0, left: 0, right: 0 };

        const rect = canvas.getBoundingClientRect();
        const vvH = window.visualViewport?.height || window.innerHeight;
        const vvW = window.visualViewport?.width || window.innerWidth;

        const overlapTopPx = Math.max(0, (safe.top || 0) - rect.top);
        const overlapBottomPx = Math.max(0, (safe.bottom || 0) - Math.max(0, vvH - rect.bottom));
        const overlapLeftPx = Math.max(0, (safe.left || 0) - rect.left);
        const overlapRightPx = Math.max(0, (safe.right || 0) - Math.max(0, vvW - rect.right));

        const scaleX = rect.width / this.scale.width;
        const scaleY = rect.height / this.scale.height;

        const toGameX = (px) => (scaleX > 0 ? px / scaleX : 0);
        const toGameY = (px) => (scaleY > 0 ? px / scaleY : 0);

        return {
            top: Phaser.Math.Clamp(toGameY(overlapTopPx), 0, 64),
            bottom: Phaser.Math.Clamp(toGameY(overlapBottomPx), 0, 96),
            left: Phaser.Math.Clamp(toGameX(overlapLeftPx), 0, 64),
            right: Phaser.Math.Clamp(toGameX(overlapRightPx), 0, 64)
        };
    }
}
