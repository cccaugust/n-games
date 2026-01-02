// entities.js

export class Entity {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.markedForDeletion = false;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    update() { }
}

export class Player extends Entity {
    constructor(x, y) {
        super(x, y, 15, '#3498db');
        this.speed = 4;
        this.maxHp = 100;
        this.hp = 100;
        this.level = 1;
        this.xp = 0;
        this.nextLevelXp = 100;
        this.image = null; // Set via init

        // Weapons
        this.weapons = {
            orbit: {
                active: true,
                count: 1,
                radius: 80,
                speed: 0.05,
                angle: 0,
                damage: 25,
                size: 8
            },
            autoShoot: {
                active: true,
                level: 1,
                cooldown: 0,
                maxCooldown: 60, // frames
                damage: 20,
                speed: 8
            }
        };
    }

    update(input, width, height) {
        // Movement (Keyboard + Virtual Joystick)
        let mx = 0;
        let my = 0;

        if (input.keys['ArrowUp'] || input.keys['w']) my -= 1;
        if (input.keys['ArrowDown'] || input.keys['s']) my += 1;
        if (input.keys['ArrowLeft'] || input.keys['a']) mx -= 1;
        if (input.keys['ArrowRight'] || input.keys['d']) mx += 1;

        if (input.joystick) {
            mx += input.joystick.x || 0;
            my += input.joystick.y || 0;
        }

        const len = Math.hypot(mx, my);
        if (len > 1) {
            mx /= len;
            my /= len;
        }

        this.x += mx * this.speed;
        this.y += my * this.speed;

        // Boundaries
        this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));

        // Weapon Updates
        this.weapons.orbit.angle += this.weapons.orbit.speed;
        if (this.weapons.autoShoot.cooldown > 0) this.weapons.autoShoot.cooldown--;
    }

    draw(ctx) {
        // Draw Orbit Weapon
        if (this.weapons.orbit.active) {
            for (let i = 0; i < this.weapons.orbit.count; i++) {
                const angle = this.weapons.orbit.angle + (i * (Math.PI * 2 / this.weapons.orbit.count));
                const wx = this.x + Math.cos(angle) * this.weapons.orbit.radius;
                const wy = this.y + Math.sin(angle) * this.weapons.orbit.radius;

                ctx.beginPath();
                ctx.arc(wx, wy, this.weapons.orbit.size, 0, Math.PI * 2);
                ctx.fillStyle = '#f1c40f';
                ctx.fill();
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#f1c40f';
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        // Draw Player Sprite (or circle fallback)
        if (this.image) {
            ctx.drawImage(this.image, this.x - 25, this.y - 25, 50, 50);
        } else {
            super.draw(ctx);
        }
    }
}

export class Enemy extends Entity {
    constructor(x, y, player, typeData) {
        super(x, y, 12, 'red');
        this.player = player;
        this.speed = Math.random() * 1 + 1; // Random speed 1-2
        this.hp = 10 + (player.level * 5);
        this.damage = 5 + Math.floor(player.level / 2);
        this.xpValue = 10;
        this.image = typeData.image; // Shared image object
    }

    update() {
        const dx = this.player.x - this.x;
        const dy = this.player.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
    }

    draw(ctx) {
        if (this.image) {
            // Simple flip check
            if (this.x < this.player.x) {
                // Facing right
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(this.image, -20, -20, 40, 40);
                ctx.restore();
            } else {
                ctx.drawImage(this.image, this.x - 20, this.y - 20, 40, 40);
            }
        } else {
            super.draw(ctx);
        }
    }
}

export class Projectile extends Entity {
    constructor(x, y, velocity, damage) {
        super(x, y, 6, '#e74c3c');
        this.velocity = velocity;
        this.damage = damage;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Mark for deletion if out of bounds (approximate)
        if (this.x < -100 || this.x > 2000 || this.y < -100 || this.y > 2000) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

export class Particle extends Entity {
    constructor(x, y, color, velocity) {
        super(x, y, Math.random() * 3 + 2, color);
        this.velocity = velocity;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.life -= this.decay;
        this.radius *= 0.95; // Shrink

        if (this.life <= 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        super.draw(ctx);
        ctx.restore();
    }
}

export class ExperinceGem extends Entity {
    constructor(x, y, value) {
        super(x, y, 5, '#2ecc71');
        this.value = value;
        this.magnetized = false;
    }

    update(player) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);

        // Magnet range or already magnetized
        if (dist < 100) {
            this.magnetized = true;
        }

        if (this.magnetized) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const speed = 12; // Fast suck speed

            // Move towards player
            const angle = Math.atan2(dy, dx);
            this.x += Math.cos(angle) * speed;
            this.y += Math.sin(angle) * speed;

            if (dist < player.radius) {
                this.markedForDeletion = true;
                // Add XP logic handled by game manager
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(-5, -5, 10, 10);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-5, -5, 10, 10);
        ctx.restore();
    }
}

export class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.velocity = { x: (Math.random() - 0.5) * 2, y: -2 };
        this.markedForDeletion = false;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.life -= 0.02;
        if (this.life <= 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 20px "M PLUS Rounded 1c"';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}
