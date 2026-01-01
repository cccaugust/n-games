import Phaser from 'phaser';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    init(data) {
        this.pokemonId = data.pokemonId;
        this.stats = JSON.parse(localStorage.getItem('poke-care-stats')) || {
            hunger: 100,
            happiness: 100,
            energy: 100,
            xp: 0,
            level: 1
        };
    }

    create() {
        // Background (Simple room color for now)
        this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xfdf2e9).setOrigin(0);

        // Calculate Position
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

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
    }

    createUI() {
        const style = { font: '16px Arial', fill: '#000' };

        // Top Bar - Stats
        this.statTexts = {
            level: this.add.text(20, 20, `Lv.${this.stats.level}`, { font: 'bold 24px Arial', fill: '#000' }),
            hunger: this.add.text(20, 60, `Hunger: ${this.stats.hunger}`, style),
            happiness: this.add.text(20, 80, `Happy: ${this.stats.happiness}`, style),
            energy: this.add.text(20, 100, `Energy: ${this.stats.energy}`, style)
        };

        // Bottom Bar - Actions
        const y = this.scale.height - 80;
        const btnStyle = { font: '20px Arial', fill: '#fff' };

        this.createBtn(60, y, '🍎', () => this.feedPokemon());
        this.createBtn(180, y, '⚽', () => this.playPokemon());
        this.createBtn(300, y, '💤', () => this.sleepPokemon());

        // Reset Button (Dev only mostly)
        const resetBtn = this.add.text(10, this.scale.height - 20, 'Reset', { font: '12px Arial', fill: '#999' })
            .setInteractive()
            .on('pointerdown', () => {
                localStorage.removeItem('poke-care-id');
                this.scene.start('BootScene');
            });
    }

    createBtn(x, y, icon, callback) {
        const circle = this.add.circle(x, y, 30, 0x3498db).setInteractive();
        const text = this.add.text(x, y, icon, { fontSize: '32px' }).setOrigin(0.5);

        circle.on('pointerdown', () => {
            this.tweens.add({
                targets: [circle, text],
                scale: 0.9,
                duration: 100,
                yoyo: true
            });
            callback();
        });
    }

    updateUI() {
        this.statTexts.level.setText(`Lv.${this.stats.level}`);
        this.statTexts.hunger.setText(`Hunger: ${Math.floor(this.stats.hunger)}`);
        this.statTexts.happiness.setText(`Happy: ${Math.floor(this.stats.happiness)}`);
        this.statTexts.energy.setText(`Energy: ${Math.floor(this.stats.energy)}`);

        // Save
        localStorage.setItem('poke-care-stats', JSON.stringify(this.stats));
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
        if (this.stats.hunger >= 100) return;
        this.stats.hunger = Math.min(100, this.stats.hunger + 20);
        this.stats.xp += 2;
        this.checkLevelUp();
        this.updateUI();
        this.showEmote('😋');
    }

    playPokemon() {
        if (this.stats.energy < 10) {
            this.showEmote('😴');
            return;
        }
        this.stats.happiness = Math.min(100, this.stats.happiness + 15);
        this.stats.energy -= 10;
        this.stats.hunger -= 5;
        this.stats.xp += 5;
        this.checkLevelUp();
        this.updateUI();
        this.showEmote('🎵');
    }

    sleepPokemon() {
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
    }

    checkLevelUp() {
        const xpNeeded = this.stats.level * 20;
        if (this.stats.xp >= xpNeeded) {
            this.stats.level++;
            this.stats.xp = 0;
            this.showEmote('🆙');

            // Celebration effect
            const particles = this.add.particles(0, 0, 'flare', { // Need a particle texture or null
                speed: 100,
                scale: { start: 1, end: 0 },
                blendMode: 'ADD',
                lifespan: 500
            });
            // We don't have a particle texture loaded, so skipped for now or assume simple shape
        }
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
}
